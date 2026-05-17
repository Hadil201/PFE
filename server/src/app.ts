import express from "express";
import cors from "cors";
import path from "path";
import videoRoutes from "./routes/video.routes";
import authRoutes from "./auth/auth.controller";

const app = express();

app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    })
);
app.use(express.json());

// Serve static files from the temp directory with CORS enabled
app.use("/temp", cors(), express.static(path.resolve(process.cwd(), "temp")));

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled API error:", error);
    res.status(500).json({ message: "Internal server error" });
});

export default app;
