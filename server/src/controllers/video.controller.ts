import fs from "fs";
import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { Server } from "socket.io";
import { AuthenticatedRequest } from "../middlewares/auth";
import { youtubeService } from "../services/youtube.service";
import { googleDriveService } from "../services/googleDrive.service";
import { Video, type VideoRecord, type VideoSource, type VideoStatus } from "../models/Video";
import { User } from "../models/User";
import {
    consumeInferenceQuota,
    getAllQuotas as getStoredQuotas,
    getOrCreateQuota,
    setUserQuota as updateStoredUserQuota,
} from "../auth/auth.store";

interface VideoEntity {
    _id: string;
    title: string;
    source: VideoSource;
    url: string;
    status: VideoStatus;
    createdAt: string;
    thumbnail?: string;
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

const activeStreams = new Map<string, NodeJS.Timeout>();
let ioRef: Server | null = null;

export const initRealtime = (io: Server) => {
    ioRef = io;
};

const parseOptionalNumber = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const serializeVideo = (video: VideoRecord): VideoEntity => {
    const result: VideoEntity = {
        _id: String(video._id),
        title: video.title,
        source: video.source,
        url: video.url,
        status: video.status,
        createdAt: video.createdAt?.toISOString() ?? new Date().toISOString(),
    };

    if (video.thumbnail) {
        result.thumbnail = video.thumbnail;
    }
    if (video.startTime !== undefined) {
        result.startTime = video.startTime;
    }
    if (video.endTime !== undefined) {
        result.endTime = video.endTime;
    }

    return result;
};

export const getVideos = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const videos = await Video.find({}).sort({ createdAt: -1 }).exec();
        res.json(videos.map(serializeVideo));
    } catch (error) {
        next(error);
    }
};

export const uploadVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const bodyUrl = typeof req.body.url === "string" ? req.body.url.trim() : "";
        if (!req.file && !bodyUrl) {
            res.status(400).json({ message: "No video file or URL provided" });
            return;
        }

        const title = String(req.body.title ?? req.file?.originalname ?? bodyUrl).trim();
        const startTime = parseOptionalNumber(req.body.startTime);
        const endTime = parseOptionalNumber(req.body.endTime);
        let url = req.file?.path ?? bodyUrl;
        const metadata: Record<string, unknown> = {};

        if (process.env.GOOGLE_DRIVE_FOLDER_ID && req.file) {
            try {
                const fileBuffer = fs.readFileSync(req.file.path);
                const driveFile = await googleDriveService.uploadFile(
                    req.file.originalname,
                    req.file.mimetype,
                    fileBuffer
                );

                if (driveFile.webContentLink) {
                    url = driveFile.webContentLink;
                }
                metadata.googleDriveFileId = driveFile.id;
            } catch (driveError) {
                console.error("Failed to upload to Google Drive:", driveError);
            }
        }

        const videoInput: Partial<VideoRecord> = {
            title,
            source: "upload",
            url,
            status: "ready",
            metadata,
        };

        if (req.appUser?.email) {
            videoInput.ownerEmail = req.appUser.email.toLowerCase();
        }
        if (startTime !== undefined) {
            videoInput.startTime = startTime;
        }
        if (endTime !== undefined) {
            videoInput.endTime = endTime;
        }

        const video = await Video.create(videoInput);
        res.status(201).json(serializeVideo(video));
    } catch (error) {
        next(error);
    }
};

export const addYoutube = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { url } = req.body as { url?: string };

        if (!url) {
            res.status(400).json({ message: "YouTube URL is required" });
            return;
        }

        const isAvailable = await youtubeService.isVideoAvailable(url);
        if (!isAvailable) {
            res.status(400).json({ message: "YouTube video is not available or invalid URL" });
            return;
        }

        const videoInfo = await youtubeService.getVideoInfo(url);
        const videoInput: Partial<VideoRecord> = {
            title: videoInfo.title,
            source: "youtube",
            url,
            status: "ready",
            metadata: { videoInfo },
        };
        if (req.appUser?.email) {
            videoInput.ownerEmail = req.appUser.email.toLowerCase();
        }

        const video = await Video.create(videoInput);

        res.status(201).json({ ...serializeVideo(video), videoInfo });
    } catch (error) {
        next(error);
    }
};

export const addStream = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { url } = req.body as { url?: string };
        if (!url) {
            res.status(400).json({ message: "Stream URL is required" });
            return;
        }

        const videoInput: Partial<VideoRecord> = {
            title: url,
            source: "stream",
            url,
            status: "processing",
        };
        if (req.appUser?.email) {
            videoInput.ownerEmail = req.appUser.email.toLowerCase();
        }

        const video = await Video.create(videoInput);

        res.status(201).json(serializeVideo(video));
    } catch (error) {
        next(error);
    }
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const videoId = String(req.params.id ?? "");
        if (!Types.ObjectId.isValid(videoId)) {
            res.status(404).json({ message: "Video not found" });
            return;
        }

        const result = await Video.deleteOne({ _id: videoId }).exec();
        if (result.deletedCount === 0) {
            res.status(404).json({ message: "Video not found" });
            return;
        }

        res.json({ message: "deleted" });
    } catch (error) {
        next(error);
    }
};

export const listActionClasses = (_req: Request, res: Response) => {
    res.json(ACTION_CLASSES);
};

export const listSummarizationModels = (_req: Request, res: Response) => {
    res.json(SUMMARIZATION_MODELS);
};

export const startInference = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
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
        const classes = Array.isArray(selectedClasses) && selectedClasses.length > 0 ? selectedClasses : ACTION_CLASSES;
        if (!videoId || !Types.ObjectId.isValid(videoId)) {
            res.status(400).json({ message: "A valid videoId is required" });
            return;
        }

        const quotaResult = await consumeInferenceQuota(user.email.toLowerCase());
        if (!quotaResult.ok) {
            res.status(429).json({ message: quotaResult.message, quota: quotaResult.quota });
            return;
        }

        const video = await Video.findByIdAndUpdate(
            videoId,
            { $set: { status: "processing" } },
            { new: true, runValidators: true }
        ).exec();

        if (!video) {
            res.status(404).json({ message: "Video not found" });
            return;
        }

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
                    const chosen = classes[Math.floor(Math.random() * classes.length)] ?? "action";
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
            } else if (tick === maxTicks) {
                const summary = "This is a generated summary of the soccer video.";
                ioRef?.emit("inference:summary", { jobId, videoId, summary });
            }

            ioRef?.emit("inference:playhead", { jobId, videoId, position: playhead });

            if (tick >= maxTicks) {
                clearInterval(interval);
                activeStreams.delete(jobId);
                void Video.findByIdAndUpdate(videoId, {
                    $set: {
                        status: "done",
                        "metadata.lastInference": {
                            jobId,
                            modelName,
                            inferenceType: inferenceType ?? "action-spotting",
                            events,
                            completedAt: new Date(),
                        },
                    },
                }).exec();
                ioRef?.emit("inference:completed", { jobId, videoId, events });
            }
        }, 1000);

        activeStreams.set(jobId, interval);

        res.json({
            jobId,
            status: "processing",
            quota: quotaResult.quota,
        });
    } catch (error) {
        next(error);
    }
};

export const getQuotaStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.appUser;
        if (!user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        res.json(await getOrCreateQuota(user.email.toLowerCase()));
    } catch (error) {
        next(error);
    }
};

export const getAdminOverview = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const [usersCount, videosCount, processingVideos] = await Promise.all([
            User.countDocuments().exec(),
            Video.countDocuments().exec(),
            Video.countDocuments({ status: "processing" }).exec(),
        ]);

        res.json({
            usersCount,
            videosCount,
            activeStreams: activeStreams.size,
            processingVideos,
        });
    } catch (error) {
        next(error);
    }
};

export const setUserQuota = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.params;
        const { dailyLimit, weeklyLimit, monthlyLimit } = req.body as {
            dailyLimit?: number;
            weeklyLimit?: number;
            monthlyLimit?: number;
        };

        const limits: { dailyLimit?: number; weeklyLimit?: number; monthlyLimit?: number } = {};
        if (dailyLimit !== undefined) {
            limits.dailyLimit = dailyLimit;
        }
        if (weeklyLimit !== undefined) {
            limits.weeklyLimit = weeklyLimit;
        }
        if (monthlyLimit !== undefined) {
            limits.monthlyLimit = monthlyLimit;
        }

        const quota = await updateStoredUserQuota(String(email), limits);

        if (!quota) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json(quota);
    } catch (error) {
        next(error);
    }
};

export const getAllQuotas = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        res.json(await getStoredQuotas());
    } catch (error) {
        next(error);
    }
};
