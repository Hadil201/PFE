import mongoose, { Schema, Types } from "mongoose";

export type VideoSource = "upload" | "youtube" | "stream";
export type VideoStatus = "ready" | "processing" | "done";

export interface VideoRecord {
  _id: Types.ObjectId;
  title: string;
  source: VideoSource;
  url: string;
  status: VideoStatus;
  thumbnail?: string;
  ownerEmail?: string;
  startTime?: number;
  endTime?: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const videoSchema = new Schema<VideoRecord>(
  {
    title: { type: String, required: true, trim: true },
    source: { type: String, enum: ["upload", "youtube", "stream"], required: true },
    url: { type: String, required: true, trim: true },
    status: { type: String, enum: ["ready", "processing", "done"], default: "ready" },
    thumbnail: { type: String, trim: true },
    ownerEmail: { type: String, lowercase: true, trim: true },
    startTime: { type: Number, min: 0 },
    endTime: { type: Number, min: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

videoSchema.index({ ownerEmail: 1, createdAt: -1 });
videoSchema.index({ status: 1 });

export const Video =
  (mongoose.models.Video as mongoose.Model<VideoRecord> | undefined) ??
  mongoose.model<VideoRecord>("Video", videoSchema);
