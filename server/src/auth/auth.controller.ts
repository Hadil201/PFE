import { Router } from "express";
import {
    createUser,
    encodeToken,
    getAllUsers,
    getUserByEmail,
    isApprovedEmail,
    setUserBlocked,
    upsertUser,
    type UserRole,
} from "./auth.store";
import { AuthenticatedRequest, requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

const isUserRole = (role: unknown): role is UserRole => role === "admin" || role === "user";

router.post("/google", async (req, res, next) => {
    try {
        const { email, name, picture } = req.body as {
            email?: string;
            name?: string;
            picture?: string;
        };

        if (!email || !name) {
            res.status(400).json({ message: "email and name are required" });
            return;
        }

        if (!(await isApprovedEmail(email))) {
            res.status(403).json({ message: "Email is not approved" });
            return;
        }

        const loginPayload: { email: string; name: string; picture?: string } = { email, name };
        if (picture) {
            loginPayload.picture = picture;
        }

        const user = await upsertUser(loginPayload);
        if (user.blocked) {
            res.status(403).json({ message: "User is blocked" });
            return;
        }

        res.json({
            token: encodeToken(user),
            user,
        });
    } catch (error) {
        next(error);
    }
});

router.get("/me", requireAuth, (req, res) => {
    const request = req as AuthenticatedRequest;
    res.json({ user: request.appUser });
});

router.get("/users", requireAuth, requireAdmin, async (_req, res, next) => {
    try {
        res.json(await getAllUsers());
    } catch (error) {
        next(error);
    }
});

router.post("/users", requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const request = req as AuthenticatedRequest;
        const { email, name, role } = req.body as {
            email?: string;
            name?: string;
            role?: string;
        };

        if (!email || !name || !isUserRole(role)) {
            res.status(400).json({ message: "name, email and role are required" });
            return;
        }

        const createPayload: { email: string; name: string; role: UserRole; createdBy?: string } = {
            email,
            name,
            role,
        };
        if (request.appUser?.email) {
            createPayload.createdBy = request.appUser.email;
        }

        const user = await createUser(createPayload);

        res.status(201).json(user);
    } catch (error) {
        if (error instanceof Error && error.message.includes("Invalid email")) {
            res.status(400).json({ message: error.message });
            return;
        }
        next(error);
    }
});

router.patch("/users/:email/block", requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const user = await setUserBlocked(String(req.params.email), true);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
});

router.patch("/users/:email/unblock", requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const user = await setUserBlocked(String(req.params.email), false);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
});

router.post("/logout", requireAuth, async (req, res, next) => {
    try {
        const request = req as AuthenticatedRequest;
        const user = request.appUser ? await getUserByEmail(request.appUser.email) : null;
        res.json({ message: "Logged out", user });
    } catch (error) {
        next(error);
    }
});

export default router;
