import { Request, Response } from "express";
import { Server } from "socket.io";
import { AuthenticatedRequest } from "../middlewares/auth";
import { youtubeService } from "../services/youtube.service";
import { videoProcessingService } from "../services/videoProcessing.service";
import { mlInferenceService } from "../services/mlInference.service";
import { googleDriveService } from "../services/googleDrive.service";

type VideoSource = "upload" | "youtube" | "stream";
type VideoStatus = "ready" | "processing" | "done";

interface VideoEntity {
    _id: string;
    title: string;
    source: VideoSource;
    url: string;
    status: VideoStatus;
    createdAt: string;
    startTime?: number;
    endTime?: number;
}

export interface ActionEvent {
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

const SUMMARIZATION_MODELS = [
    "summary-v1",
    "summary-v2",
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

export const uploadVideo = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "No video file uploaded" });
            return;
        }

        const title = String(req.body.title ?? req.file.originalname);
        const startTime = Number(req.body.startTime ?? 0);
        const endTime = Number(req.body.endTime ?? 0);

        // Store video metadata
        const video: VideoEntity = {
            _id: Date.now().toString(),
            title,
            source: "upload",
            url: req.file.path, // Local file path
            status: "ready",
            createdAt: new Date().toISOString(),
            startTime,
            endTime,
        };

        videos.push(video);

        // Optionally upload to Google Drive for storage
        if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
            try {
                const fs = require('fs');
                const fileBuffer = fs.readFileSync(req.file.path);
                const driveFile = await googleDriveService.uploadFile(
                    req.file.originalname,
                    req.file.mimetype,
                    fileBuffer
                );
                
                // Update video with Google Drive URL
                video.url = driveFile.webContentLink;
                console.log(`Video uploaded to Google Drive: ${driveFile.id}`);
            } catch (driveError) {
                console.error('Failed to upload to Google Drive:', driveError);
                // Continue with local storage even if Google Drive fails
            }
        }

        res.json(video);
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ message: "Failed to upload video" });
    }
};

export const addYoutube = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            res.status(400).json({ message: "YouTube URL is required" });
            return;
        }

        // Validate YouTube URL and get video info
        const isAvailable = await youtubeService.isVideoAvailable(url);
        if (!isAvailable) {
            res.status(400).json({ message: "YouTube video is not available or invalid URL" });
            return;
        }

        const videoInfo = await youtubeService.getVideoInfo(url);

        const video: VideoEntity = {
            _id: Date.now().toString(),
            title: videoInfo.title,
            source: "youtube",
            url: url,
            status: "ready",
            createdAt: new Date().toISOString(),
        };

        videos.push(video);
        res.json({ ...video, videoInfo });
    } catch (error) {
        console.error('Error adding YouTube video:', error);
        res.status(500).json({ message: "Failed to add YouTube video" });
    }
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

export const listSummarizationModels = (_req: Request, res: Response) => {
    res.json(SUMMARIZATION_MODELS);
};

export const startInference = (req: AuthenticatedRequest, res: Response) => {
    const user = req.appUser;
    if (!user) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }

    const { videoId, selectedClasses, modelName, chunkDuration, inferenceType } = req.body as {
        videoId?: string;
        selectedClasses?: string[];
        modelName?: string;
        chunkDuration?: number;
        inferenceType?: "action-spotting" | "summarization";
    };

    const isActionSpotting = inferenceType !== "summarization";
    if (!videoId || (isActionSpotting && (!Array.isArray(selectedClasses) || selectedClasses.length === 0))) {
        res.status(400).json({ message: "videoId and at least one selected class are required for action spotting" });
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

        if (isActionSpotting) {
            const shouldEmitAction = tick % 2 === 0;
            if (shouldEmitAction) {
                const chosen = selectedClasses![Math.floor(Math.random() * selectedClasses!.length)] ?? "action";
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
        } else {
            // For summarization, emit summary at the end
            if (tick === maxTicks) {
                const summary = "This is a generated summary of the soccer video.";
                ioRef?.emit("inference:summary", { jobId, videoId, summary });
            }
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

export const setUserQuota = (req: Request, res: Response) => {
    const { email } = req.params;
    if (typeof email !== 'string') {
        res.status(400).json({ message: "Invalid email" });
        return;
    }
    const { dailyLimit, weeklyLimit, monthlyLimit } = req.body as {
        dailyLimit?: number;
        weeklyLimit?: number;
        monthlyLimit?: number;
    };

    const quota = getOrCreateQuota(email.toLowerCase());
    if (dailyLimit !== undefined) quota.dailyLimit = dailyLimit;
    if (weeklyLimit !== undefined) quota.weeklyLimit = weeklyLimit;
    if (monthlyLimit !== undefined) quota.monthlyLimit = monthlyLimit;

    res.json(quota);
};

export const getAllQuotas = (_req: Request, res: Response) => {
    const quotas = Array.from(quotaByEmail.entries()).map(([email, quota]) => ({ email, ...quota }));
    res.json(quotas);
};