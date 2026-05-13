import { User, defaultQuota, type UserQuota, type UserRecord, type UserRole } from "../models/User";

export type { UserRole };

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    picture?: string;
    role: UserRole;
    blocked: boolean;
}

export type Quota = UserQuota;

const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
);

const approvedEmails = new Set(
    (process.env.APPROVED_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
);

const approvedDomain = (process.env.APPROVED_DOMAIN ?? "").trim().toLowerCase();
const hasConfiguredAdminEmails = adminEmails.size > 0;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const normalizeQuota = (quota?: Partial<UserQuota> | null): UserQuota => {
    const defaults = defaultQuota();
    return {
        dailyLimit: Number.isFinite(quota?.dailyLimit) ? Number(quota?.dailyLimit) : defaults.dailyLimit,
        weeklyLimit: Number.isFinite(quota?.weeklyLimit) ? Number(quota?.weeklyLimit) : defaults.weeklyLimit,
        monthlyLimit: Number.isFinite(quota?.monthlyLimit) ? Number(quota?.monthlyLimit) : defaults.monthlyLimit,
        dailyUsed: Number.isFinite(quota?.dailyUsed) ? Number(quota?.dailyUsed) : 0,
        weeklyUsed: Number.isFinite(quota?.weeklyUsed) ? Number(quota?.weeklyUsed) : 0,
        monthlyUsed: Number.isFinite(quota?.monthlyUsed) ? Number(quota?.monthlyUsed) : 0,
    };
};

const toAuthUser = (user: Pick<UserRecord, "_id" | "email" | "name" | "role" | "blocked"> & { picture?: string | null }): AuthUser => {
    const authUser: AuthUser = {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        blocked: user.blocked,
    };

    if (user.picture) {
        authUser.picture = user.picture;
    }

    return authUser;
};

const isApprovedByConfiguration = (email: string): boolean => {
    if (approvedEmails.size > 0) {
        return approvedEmails.has(email);
    }
    if (approvedDomain) {
        return email.endsWith(`@${approvedDomain}`);
    }
    return true;
};

export const isApprovedEmail = async (email: string): Promise<boolean> => {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
        return false;
    }

    if (isApprovedByConfiguration(normalized)) {
        return true;
    }

    const existingUser = await User.exists({ email: normalized });
    return Boolean(existingUser);
};

export const upsertUser = async (payload: { email: string; name: string; picture?: string }): Promise<AuthUser> => {
    const email = normalizeEmail(payload.email);
    if (!isValidEmail(email)) {
        throw new Error("Invalid email address");
    }

    const existing = await User.findOne({ email }).exec();
    const hasAdminUser = Boolean(await User.exists({ role: "admin" }));
    const role: UserRole =
        existing?.role ??
        (hasConfiguredAdminEmails
            ? (adminEmails.has(email) ? "admin" : "user")
            : (hasAdminUser ? "user" : "admin"));

    const update: Partial<UserRecord> = {
        email,
        name: payload.name.trim(),
        role,
        blocked: existing?.blocked ?? false,
        quota: normalizeQuota(existing?.quota),
        lastLoginAt: new Date(),
    };

    if (payload.picture) {
        update.picture = payload.picture;
    } else if (existing?.picture) {
        update.picture = existing.picture;
    }

    const user = await User.findOneAndUpdate(
        { email },
        { $set: update },
        { new: true, upsert: true, runValidators: true }
    ).exec();

    if (!user) {
        throw new Error("Unable to save user");
    }

    return toAuthUser(user);
};

export const createUser = async (payload: {
    email: string;
    name: string;
    role: UserRole;
    picture?: string;
    createdBy?: string;
}): Promise<AuthUser> => {
    const email = normalizeEmail(payload.email);
    const name = payload.name.trim();

    if (!isValidEmail(email)) {
        throw new Error("Invalid email address");
    }

    if (!name) {
        throw new Error("Name is required");
    }

    const existing = await User.findOne({ email }).exec();
    const update: Partial<UserRecord> = {
        email,
        name,
        role: payload.role,
        blocked: existing?.blocked ?? false,
        quota: normalizeQuota(existing?.quota),
    };

    if (payload.picture) {
        update.picture = payload.picture;
    }
    if (payload.createdBy) {
        update.createdBy = payload.createdBy;
    }

    const user = await User.findOneAndUpdate(
        { email },
        {
            $set: update,
            $setOnInsert: { createdAt: new Date() },
        },
        { new: true, upsert: true, runValidators: true }
    ).exec();

    if (!user) {
        throw new Error("Unable to create user");
    }

    return toAuthUser(user);
};

export const getUserByEmail = async (email: string): Promise<AuthUser | null> => {
    const user = await User.findOne({ email: normalizeEmail(email) }).exec();
    return user ? toAuthUser(user) : null;
};

export const getAllUsers = async (): Promise<AuthUser[]> => {
    const users = await User.find({}).sort({ createdAt: -1, email: 1 }).exec();
    return users.map(toAuthUser);
};

export const setUserBlocked = async (email: string, blocked: boolean): Promise<AuthUser | null> => {
    const user = await User.findOneAndUpdate(
        { email: normalizeEmail(email) },
        { $set: { blocked } },
        { new: true, runValidators: true }
    ).exec();

    return user ? toAuthUser(user) : null;
};

export const getOrCreateQuota = async (email: string): Promise<Quota> => {
    const normalized = normalizeEmail(email);
    let user = await User.findOne({ email: normalized }).exec();

    if (!user) {
        user = await User.create({
            email: normalized,
            name: normalized.split("@")[0] || normalized,
            role: "user",
            blocked: false,
            quota: defaultQuota(),
        });
    }

    const quota = normalizeQuota(user.quota);
    user.quota = quota;
    await user.save();
    return quota;
};

export const consumeInferenceQuota = async (email: string): Promise<{ ok: boolean; message?: string; quota: Quota }> => {
    const normalized = normalizeEmail(email);
    const user = await User.findOne({ email: normalized }).exec();

    if (!user) {
        return { ok: false, message: "Unknown user", quota: defaultQuota() };
    }

    const quota = normalizeQuota(user.quota);
    if (
        quota.dailyUsed >= quota.dailyLimit ||
        quota.weeklyUsed >= quota.weeklyLimit ||
        quota.monthlyUsed >= quota.monthlyLimit
    ) {
        return { ok: false, message: "Quota exceeded for inference requests", quota };
    }

    quota.dailyUsed += 1;
    quota.weeklyUsed += 1;
    quota.monthlyUsed += 1;
    user.quota = quota;
    await user.save();

    return { ok: true, quota };
};

export const setUserQuota = async (
    email: string,
    limits: { dailyLimit?: number; weeklyLimit?: number; monthlyLimit?: number }
): Promise<Quota | null> => {
    const user = await User.findOne({ email: normalizeEmail(email) }).exec();
    if (!user) {
        return null;
    }

    const quota = normalizeQuota(user.quota);
    if (limits.dailyLimit !== undefined) {
        quota.dailyLimit = Math.max(0, Number(limits.dailyLimit));
    }
    if (limits.weeklyLimit !== undefined) {
        quota.weeklyLimit = Math.max(0, Number(limits.weeklyLimit));
    }
    if (limits.monthlyLimit !== undefined) {
        quota.monthlyLimit = Math.max(0, Number(limits.monthlyLimit));
    }

    user.quota = quota;
    await user.save();
    return quota;
};

export const getAllQuotas = async (): Promise<Array<{ email: string } & Quota>> => {
    const users = await User.find({}).sort({ email: 1 }).exec();
    return users.map((user) => ({
        email: user.email,
        ...normalizeQuota(user.quota),
    }));
};

export const encodeToken = (user: AuthUser): string => {
    const payload = JSON.stringify({ email: user.email, role: user.role });
    return Buffer.from(payload, "utf8").toString("base64");
};

export const decodeToken = (token: string): { email: string; role: UserRole } | null => {
    try {
        const decoded = Buffer.from(token, "base64").toString("utf8");
        const parsed = JSON.parse(decoded) as { email: string; role: UserRole };
        if (!parsed.email || !parsed.role) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};
