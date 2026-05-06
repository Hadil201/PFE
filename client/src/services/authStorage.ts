import type { AppUser } from "../types/auth";

const TOKEN_KEY = "soccer.auth.token";
const USER_KEY = "soccer.auth.user";

export const setSession = (token: string, user: AppUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? "";

export const getUser = (): AppUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
        return null;
    }
    try {
        const stored = JSON.parse(raw) as Partial<AppUser>;
        const role = typeof stored.role === "string" ? stored.role.toLowerCase() : "user";
        return {
            email: stored.email ?? "",
            name: stored.name ?? "",
            picture: stored.picture,
            role: role === "admin" ? "admin" : "user",
            blocked: stored.blocked ?? false,
        };
    } catch {
        return null;
    }
};
