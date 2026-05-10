import mongoose from 'mongoose';

// Analytics schema for storing system analytics and metrics
const AnalyticsSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ['user_login', 'user_logout', 'video_upload', 'video_analysis', 'quota_update', 'system_error', 'user_registration']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for analytics queries
AnalyticsSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsSchema.index({ userId: 1, timestamp: -1 });

export const Analytics = mongoose.model('Analytics', AnalyticsSchema);
