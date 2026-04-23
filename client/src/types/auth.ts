export type UserRole = "user" | "admin";

export interface AppUser {
    email: string;
    name: string;
    picture?: string;
    role: UserRole;
    blocked: boolean;
}
