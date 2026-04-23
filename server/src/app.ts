import express from "express";
import cors from "cors";
import videoRoutes from "./routes/video.routes";
import authRoutes from "./auth/auth.controller";

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

export default app;