import { Router } from "express";
import {
    encodeToken,
    getAllUsers,
    getUserByEmail,
    isApprovedEmail,
    setUserBlocked,
    upsertUser,
} from "./auth.store";
import { AuthenticatedRequest, requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

router.post("/google", (req, res) => {
    const { email, name, picture } = req.body as {
        email?: string;
        name?: string;
        picture?: string;
    };

    if (!email || !name) {
        res.status(400).json({ message: "email and name are required" });
        return;
    }

    if (!isApprovedEmail(email)) {
        res.status(403).json({ message: "Email is not approved" });
        return;
    }

    const user = upsertUser({ email, name, picture });
    if (user.blocked) {
        res.status(403).json({ message: "User is blocked" });
        return;
    }

    res.json({
        token: encodeToken(user),
        user,
    });
});

router.get("/me", requireAuth, (req, res) => {
    const request = req as AuthenticatedRequest;
    res.json({ user: request.appUser });
});

router.get("/users", requireAuth, requireAdmin, (_req, res) => {
    res.json(getAllUsers());
});

router.patch("/users/:email/block", requireAuth, requireAdmin, (req, res) => {
    const user = setUserBlocked(String(req.params.email), true);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    res.json(user);
});

router.patch("/users/:email/unblock", requireAuth, requireAdmin, (req, res) => {
    const user = setUserBlocked(String(req.params.email), false);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    res.json(user);
});

router.post("/logout", requireAuth, (req, res) => {
    const request = req as AuthenticatedRequest;
    const user = request.appUser ? getUserByEmail(request.appUser.email) : null;
    res.json({ message: "Logged out", user });
});

export default router;