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
        return JSON.parse(raw) as AppUser;
    } catch {
        return null;
    }
};
