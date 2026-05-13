import mongoose, { Schema, Types } from "mongoose";

export type UserRole = "user" | "admin";

export interface UserQuota {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  weeklyUsed: number;
  monthlyUsed: number;
}

export interface UserRecord {
  _id: Types.ObjectId;
  email: string;
  name: string;
  picture?: string;
  googleId?: string;
  role: UserRole;
  blocked: boolean;
  quota: UserQuota;
  lastLoginAt?: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const numberFromEnv = (key: string, fallback: number) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const defaultQuota = (): UserQuota => ({
  dailyLimit: numberFromEnv("DAILY_QUOTA", 10),
  weeklyLimit: numberFromEnv("WEEKLY_QUOTA", 40),
  monthlyLimit: numberFromEnv("MONTHLY_QUOTA", 120),
  dailyUsed: 0,
  weeklyUsed: 0,
  monthlyUsed: 0,
});

const quotaSchema = new Schema<UserQuota>(
  {
    dailyLimit: { type: Number, default: () => defaultQuota().dailyLimit, min: 0 },
    weeklyLimit: { type: Number, default: () => defaultQuota().weeklyLimit, min: 0 },
    monthlyLimit: { type: Number, default: () => defaultQuota().monthlyLimit, min: 0 },
    dailyUsed: { type: Number, default: 0, min: 0 },
    weeklyUsed: { type: Number, default: 0, min: 0 },
    monthlyUsed: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const userSchema = new Schema<UserRecord>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    picture: { type: String, trim: true },
    googleId: { type: String, trim: true, sparse: true },
    role: { type: String, enum: ["user", "admin"], default: "user", required: true },
    blocked: { type: Boolean, default: false },
    quota: { type: quotaSchema, default: defaultQuota },
    lastLoginAt: { type: Date },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ blocked: 1 });

export const User =
  (mongoose.models.User as mongoose.Model<UserRecord> | undefined) ??
  mongoose.model<UserRecord>("User", userSchema);
