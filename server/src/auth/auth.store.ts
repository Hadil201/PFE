export type UserRole = "user" | "admin";

export interface AuthUser {
    email: string;
    name: string;
    picture?: string | undefined;
    role: UserRole;
    blocked: boolean;
}

const users = new Map<string, AuthUser>();

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

export const isApprovedEmail = (email: string): boolean => {
    const normalized = email.toLowerCase();
    if (approvedEmails.size > 0) {
        return approvedEmails.has(normalized);
    }
    if (approvedDomain) {
        return normalized.endsWith(`@${approvedDomain}`);
    }
    return true;
};

export const upsertUser = (payload: { email: string; name: string; picture?: string | undefined }): AuthUser => {
    const key = payload.email.toLowerCase();
    const existing = users.get(key);
    const role: UserRole = adminEmails.has(key) ? "admin" : "user";

    const next: AuthUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        role,
        blocked: existing?.blocked ?? false,
    };
    users.set(key, next);
    return next;
};

export const getUserByEmail = (email: string): AuthUser | undefined => {
    return users.get(email.toLowerCase());
};

export const getAllUsers = (): AuthUser[] => {
    return Array.from(users.values());
};

export const setUserBlocked = (email: string, blocked: boolean): AuthUser | undefined => {
    const existing = users.get(email.toLowerCase());
    if (!existing) {
        return undefined;
    }
    const updated: AuthUser = { ...existing, blocked };
    users.set(email.toLowerCase(), updated);
    return updated;
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
