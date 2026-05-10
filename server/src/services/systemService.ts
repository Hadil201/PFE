import { System } from '../models/System';
import { Analytics } from '../models/Analytics';
import { ActivityLog } from '../models/ActivityLog';
import { User } from '../models/User';

// System service for managing all system-wide data and analytics
class SystemService {
  // System settings and configuration
  static async getSystemSetting(name: string) {
    try {
      const setting = await System.findOne({ name });
      return setting ? setting.value : null;
    } catch (error) {
      console.error('Error getting system setting:', error);
      return null;
    }
  }

  static async updateSystemSetting(name: string, value: any) {
    try {
      await System.findOneAndUpdate(
        { name },
        { value, timestamp: new Date() },
        { upsert: true, new: true }
      );
      
      // Log the setting change
      await this.logActivity('settings_updated', 'system', 'system', {
        setting: name,
        oldValue: await this.getSystemSetting(name),
        newValue: value
      });
      
      return true;
    } catch (error) {
      console.error('Error updating system setting:', error);
      return false;
    }
  }

  static async getAllSystemSettings() {
    try {
      const settings = await System.find({});
      return settings.reduce((acc, setting) => {
        acc[setting.name] = setting.value;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error getting all system settings:', error);
      return {};
    }
  }

  // Analytics and metrics
  static async logAnalytics(eventType: string, userId?: string, metadata: any = {}) {
    try {
      const analytics = new Analytics({
        eventType,
        userId,
        metadata,
        timestamp: new Date()
      });
      
      await analytics.save();
      return true;
    } catch (error) {
      console.error('Error logging analytics:', error);
      return false;
    }
  }

  static async getAnalytics(eventType?: string, userId?: string, startDate?: Date, endDate?: Date, limit: number = 100) {
    try {
      const query: any = {};
      
      if (eventType) query.eventType = eventType;
      if (userId) query.userId = userId;
      if (startDate) query.timestamp = { $gte: startDate };
      if (endDate) query.timestamp = { ...query.timestamp, $lte: endDate };
      
      const analytics = await Analytics.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
        
      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }

  // Activity logging
  static async logActivity(action: string, targetType: string, targetId?: string, details: any = {}, severity: string = 'info') {
    try {
      const activity = new ActivityLog({
        action,
        targetType,
        targetId,
        details,
        severity,
        timestamp: new Date()
      });
      
      await activity.save();
      return true;
    } catch (error) {
      console.error('Error logging activity:', error);
      return false;
    }
  }

  static async getActivityLog(userId?: string, action?: string, targetType?: string, limit: number = 100) {
    try {
      const query: any = {};
      
      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (targetType) query.targetType = targetType;
      
      const activities = await ActivityLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
        
      return activities;
    } catch (error) {
      console.error('Error getting activity log:', error);
      return [];
    }
  }

  // System metrics and statistics
  static async getSystemMetrics() {
    try {
      const [
        totalUsers,
        activeUsers,
        totalVideos,
        processedVideos,
        systemUptime,
        lastBackup
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ blocked: false }),
        this.getSystemSetting('total_videos'),
        this.getSystemSetting('processed_videos'),
        this.getSystemSetting('system_uptime'),
        this.getSystemSetting('last_backup')
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          blocked: totalUsers - activeUsers
        },
        videos: {
          total: totalVideos || 0,
          processed: processedVideos || 0
        },
        system: {
          uptime: systemUptime?.value || 'unknown',
          lastBackup: lastBackup?.value || null
        }
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return null;
    }
  }

  // User activity tracking
  static async getUserActivity(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const activities = await ActivityLog.find({
        userId,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: -1 });
      
      return activities;
    } catch (error) {
      console.error('Error getting user activity:', error);
      return [];
    }
  }

  // Error tracking and reporting
  static async logError(error: Error, context?: any) {
    try {
      await this.logActivity('error_occurred', 'system', undefined, {
        message: error.message,
        stack: error.stack,
        context
      }, 'critical');
      
      // Also log to analytics
      await this.logAnalytics('system_error', undefined, {
        errorType: error.name,
        message: error.message
      });
      
      return true;
    } catch (e) {
      console.error('Error logging system error:', e);
      return false;
    }
  }

  // Backup and restore operations
  static async createBackup(type: string = 'full') {
    try {
      const backup = {
        type,
        timestamp: new Date(),
        status: 'started'
      };
      
      await System.create({
        name: `backup_${type}_${Date.now()}`,
        value: backup
      });
      
      await this.logActivity('backup_created', 'system', undefined, {
        backupType: type
      });
      
      return backup;
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  }

  // Cleanup operations
  static async cleanupOldRecords(daysToKeep: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const [deletedAnalytics, deletedActivities] = await Promise.all([
        Analytics.deleteMany({ timestamp: { $lt: cutoffDate } }),
        ActivityLog.deleteMany({ timestamp: { $lt: cutoffDate } })
      ]);
      
      await this.logActivity('cleanup_completed', 'system', undefined, {
        deletedAnalytics: deletedAnalytics.deletedCount,
        deletedActivities: deletedActivities.deletedCount,
        cutoffDate
      });
      
      return {
        analyticsDeleted: deletedAnalytics.deletedCount,
        activitiesDeleted: deletedActivities.deletedCount
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
      return null;
    }
  }
}

export default SystemService;
