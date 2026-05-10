import mongoose from 'mongoose';

// System schema for storing system-wide data
const SystemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  type: {
    type: String,
    enum: ['setting', 'metric', 'log', 'config', 'quota'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better performance
SystemSchema.index({ name: 1, type: 1, category: 1, timestamp: -1 });

export const System = mongoose.model('System', SystemSchema);
