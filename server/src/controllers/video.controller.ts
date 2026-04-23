import { Request, Response } from "express";
import { Server } from "socket.io";
import { AuthenticatedRequest } from "../middlewares/auth";

type VideoSource = "upload" | "youtube" | "stream";
type VideoStatus = "ready" | "processing" | "done";

interface VideoEntity {
    _id: string;
    title: string;
    source: VideoSource;
    url: string;
    status: VideoStatus;
    createdAt: string;
}

interface ActionEvent {
    id: string;
    label: string;
    start: number;
    end: number;
    confidence: number;
}

interface Quota {
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    weeklyUsed: number;
    monthlyUsed: number;
}

const ACTION_CLASSES = [
    "goal",
    "penalty",
    "corner",
    "offside",
    "foul",
    "yellow-card",
    "red-card",
    "free-kick",
    "throw-in",
    "shot-on-target",
    "save",
    "substitution",
    "kick-off",
    "half-time",
    "full-time",
    "dribble",
    "tackle",
];

let videos: VideoEntity[] = [];
const quotaByEmail = new Map<string, Quota>();
const activeStreams = new Map<string, NodeJS.Timeout>();
let ioRef: Server | null = null;

export const initRealtime = (io: Server) => {
    ioRef = io;
};

const getOrCreateQuota = (email: string): Quota => {
    const existing = quotaByEmail.get(email);
    if (existing) {
        return existing;
    }

    const quota: Quota = {
        dailyLimit: Number(process.env.DAILY_QUOTA ?? 10),
        weeklyLimit: Number(process.env.WEEKLY_QUOTA ?? 40),
        monthlyLimit: Number(process.env.MONTHLY_QUOTA ?? 120),
        dailyUsed: 0,
        weeklyUsed: 0,
        monthlyUsed: 0,
    };
    quotaByEmail.set(email, quota);
    return quota;
};

const consumeInferenceQuota = (email: string): { ok: boolean; message?: string; quota: Quota } => {
    const quota = getOrCreateQuota(email);
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
    return { ok: true, quota };
};

export const getVideos = (_req: Request, res: Response) => {
    res.json(videos);
};

export const uploadVideo = (req: Request, res: Response) => {
    const title = String(req.body.title ?? "Uploaded Video");
    const video: VideoEntity = {
        _id: Date.now().toString(),
        title,
        source: "upload",
        url: req.body.url ?? "",
        status: "ready",
        createdAt: new Date().toISOString(),
    };

    videos.push(video);
    res.json(video);
};

export const addYoutube = (req: Request, res: Response) => {
    const video: VideoEntity = {
        _id: Date.now().toString(),
        title: req.body.url,
        source: "youtube",
        url: req.body.url,
        status: "ready",
        createdAt: new Date().toISOString(),
    };

    videos.push(video);
    res.json(video);
};

export const addStream = (req: Request, res: Response) => {
    const video: VideoEntity = {
        _id: Date.now().toString(),
        title: req.body.url,
        source: "stream",
        url: req.body.url,
        status: "processing",
        createdAt: new Date().toISOString(),
    };

    videos.push(video);
    res.json(video);
};

export const deleteVideo = (req: Request, res: Response) => {
    videos = videos.filter(v => v._id !== req.params.id);
    res.json({ message: "deleted" });
};

export const listActionClasses = (_req: Request, res: Response) => {
    res.json(ACTION_CLASSES);
};

export const startInference = (req: AuthenticatedRequest, res: Response) => {
    const user = req.appUser;
    if (!user) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }

    const { videoId, selectedClasses, modelName, chunkDuration } = req.body as {
        videoId?: string;
        selectedClasses?: string[];
        modelName?: string;
        chunkDuration?: number;
    };

    if (!videoId || !Array.isArray(selectedClasses) || selectedClasses.length === 0) {
        res.status(400).json({ message: "videoId and at least one selected class are required" });
        return;
    }

    const quotaResult = consumeInferenceQuota(user.email.toLowerCase());
    if (!quotaResult.ok) {
        res.status(429).json({ message: quotaResult.message, quota: quotaResult.quota });
        return;
    }

    const video = videos.find((item) => item._id === videoId);
    if (!video) {
        res.status(404).json({ message: "Video not found" });
        return;
    }
    video.status = "processing";

    const jobId = `${videoId}-${Date.now()}`;
    const safeChunkDuration = Number(chunkDuration ?? 5);
    let tick = 0;
    const maxTicks = 20;
    const events: ActionEvent[] = [];

    ioRef?.emit("inference:started", {
        jobId,
        videoId,
        modelName: modelName ?? "spotting-v1",
        chunkDuration: safeChunkDuration,
    });

    const interval = setInterval(() => {
        tick += 1;
        const playhead = tick * safeChunkDuration;

        const shouldEmitAction = tick % 2 === 0;
        if (shouldEmitAction) {
            const chosen = selectedClasses[Math.floor(Math.random() * selectedClasses.length)] ?? "action";
            const event: ActionEvent = {
                id: `${jobId}-${tick}`,
                label: chosen,
                start: Math.max(0, playhead - safeChunkDuration),
                end: playhead,
                confidence: Number((0.6 + Math.random() * 0.4).toFixed(2)),
            };
            events.push(event);
            ioRef?.emit("inference:event", { jobId, videoId, event });
        }

        ioRef?.emit("inference:playhead", { jobId, videoId, position: playhead });

        if (tick >= maxTicks) {
            clearInterval(interval);
            activeStreams.delete(jobId);
            video.status = "done";
            ioRef?.emit("inference:completed", { jobId, videoId, events });
        }
    }, 1000);

    activeStreams.set(jobId, interval);

    res.json({
        jobId,
        status: "processing",
        quota: quotaResult.quota,
    });
};

export const getQuotaStatus = (req: AuthenticatedRequest, res: Response) => {
    const user = req.appUser;
    if (!user) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    res.json(getOrCreateQuota(user.email.toLowerCase()));
};

export const getAdminOverview = (_req: Request, res: Response) => {
    const users = Array.from(quotaByEmail.keys());
    return res.json({
        usersCount: users.length,
        videosCount: videos.length,
        activeStreams: activeStreams.size,
        processingVideos: videos.filter((v) => v.status === "processing").length,
    });
};