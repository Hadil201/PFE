import mongoose from 'mongoose';

// Activity log schema for tracking all system activities
const ActivityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'user_created', 'user_updated', 'user_deleted', 'user_blocked', 'user_unblocked',
      'quota_updated', 'quota_applied', 'system_started', 'system_stopped',
      'video_uploaded', 'video_processed', 'video_deleted', 'video_analyzed',
      'analysis_completed', 'analysis_failed', 'login_attempt', 'login_success',
      'login_failed', 'logout', 'session_expired', 'permission_changed',
      'settings_updated', 'backup_created', 'backup_restored',
      'error_occurred', 'warning_generated', 'info_logged'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  targetType: {
    type: String,
    enum: ['user', 'video', 'system', 'quota', 'settings', 'analytics'],
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  sessionId: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
ActivityLogSchema.index({ action: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });
ActivityLogSchema.index({ severity: 1, timestamp: -1 });

export const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
