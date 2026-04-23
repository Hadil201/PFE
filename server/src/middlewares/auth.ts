import { NextFunction, Request, Response } from "express";
import { decodeToken, getUserByEmail } from "../auth/auth.store";

export interface RequestUser {
    email: string;
    name: string;
    picture?: string | undefined;
    role: "user" | "admin";
    blocked: boolean;
}

export interface AuthenticatedRequest extends Request {
    appUser?: RequestUser;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const request = req as AuthenticatedRequest;
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
        ? authorization.replace("Bearer ", "")
        : "";

    if (!token) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
        res.status(401).json({ message: "Invalid token" });
        return;
    }

    const user = getUserByEmail(decoded.email);
    if (!user) {
        res.status(401).json({ message: "Unknown user" });
        return;
    }

    if (user.blocked) {
        res.status(403).json({ message: "User is blocked" });
        return;
    }

    request.appUser = user;
    next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const request = req as AuthenticatedRequest;
    if (!request.appUser) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    if (request.appUser.role !== "admin") {
        res.status(403).json({ message: "Admin access required" });
        return;
    }
    next();
};
