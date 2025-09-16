/**
 * CVPlus Premium Module - Usage Tracking Service
 * 
 * Simplified usage tracking implementation with basic functionality
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { logger } from '../utils/logger';
import {
  UsageMetricType,
  UsageRecord,
  UsageLimit,
  UsageSummary,
  LiveUsageData,
  UsageAnalytics,
  BatchUsageUpdate,
  FlexibleUsageLimit
} from '../types';
import {
  FREE_TIER_LIMITS,
  PREMIUM_TIER_LIMITS,
  USAGE_WARNING_THRESHOLDS,
  CACHE_TTL,
  CACHE_KEYS
} from '../constants/premium.constants';

/**
 * Usage service configuration
 */
interface UsageServiceConfig {
  cache: {
    enabled: boolean;
    ttl: number;
  };
  batchProcessing: {
    enabled: boolean;
    interval: number;
    maxBatchSize: number;
  };
  realTimeUpdates: boolean;
  alertThresholds: number[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: UsageServiceConfig = {
  cache: {
    enabled: true,
    ttl: CACHE_TTL.USAGE_DATA
  },
  batchProcessing: {
    enabled: true,
    interval: 5000, // 5 seconds
    maxBatchSize: 100
  },
  realTimeUpdates: true,
  alertThresholds: USAGE_WARNING_THRESHOLDS as unknown as number[]
};

/**
 * Usage tracking and management service
 */
export class UsageService {
  private config: UsageServiceConfig;
  private cache: Map<string, any> = new Map();
  private usageData: Map<string, Record<UsageMetricType, number>> = new Map();
  private limits: Map<string, Record<UsageMetricType, number>> = new Map();

  constructor(config: Partial<UsageServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Usage service initialized', {
      cacheEnabled: this.config.cache.enabled,
      batchEnabled: this.config.batchProcessing.enabled
    });
  }

  /**
   * Track usage for a specific metric
   */
  async trackUsage(
    userId: string,
    metricType: UsageMetricType,
    increment: number = 1,
    metadata?: Record<string, any>
  ): Promise<UsageRecord> {
    try {
      // Get current usage
      const userUsage = this.usageData.get(userId) || {} as Record<UsageMetricType, number>;
      const currentValue = userUsage[metricType] || 0;
      const newValue = currentValue + increment;

      // Update usage
      userUsage[metricType] = newValue;
      this.usageData.set(userId, userUsage);

      // Create usage record
      const record: UsageRecord = {
        id: `${userId}-${metricType}-${Date.now()}`,
        userId,
        metricType,
        count: increment,
        period: this.getCurrentPeriod(),
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Clear cache
      this.clearUserCache(userId);
      
      logger.info('Usage tracked', { 
        userId, 
        metricType, 
        increment, 
        newTotal: newValue 
      });

      return record;
    } catch (error) {
      logger.error('Failed to track usage', { userId, metricType, increment, error });
      throw error;
    }
  }

  /**
   * Get current usage for a user and metric
   */
  async getCurrentUsage(userId: string, metricType: UsageMetricType): Promise<number> {
    try {
      const userUsage = this.usageData.get(userId) || {} as Record<UsageMetricType, number>;
      return userUsage[metricType] || 0;
    } catch (error) {
      logger.error('Failed to get current usage', { userId, metricType, error });
      return 0;
    }
  }

  /**
   * Get usage summary for a user
   */
  async getUsageSummary(userId: string, period?: string): Promise<UsageSummary> {
    try {
      const currentPeriod = period || this.getCurrentPeriod();
      const userUsage = this.usageData.get(userId) || {} as Record<UsageMetricType, number>;
      const userLimits = this.getUserLimits(userId);

      // Calculate overages
      const overages = {} as Record<UsageMetricType, number>;
      for (const metricType of Object.keys(userUsage) as UsageMetricType[]) {
        const usage = userUsage[metricType];
        const limit = userLimits[metricType];
        if (limit > 0 && usage > limit) {
          overages[metricType] = usage - limit;
        } else {
          overages[metricType] = 0;
        }
      }

      return {
        userId,
        period: currentPeriod,
        metrics: userUsage,
        limits: this.convertLimitsToUsageLimit(userLimits),
        overages,
        calculatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get usage summary', { userId, period, error });
      throw error;
    }
  }

  /**
   * Check if user has exceeded usage limit
   */
  async checkUsageLimit(
    userId: string,
    metricType: UsageMetricType,
    requestedAmount: number = 1
  ): Promise<{
    allowed: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
    wouldExceed: boolean;
  }> {
    try {
      const currentUsage = await this.getCurrentUsage(userId, metricType);
      const userLimits = this.getUserLimits(userId);
      const limit = userLimits[metricType];
      
      const wouldExceed = currentUsage + requestedAmount > limit;
      const remaining = Math.max(0, limit - currentUsage);
      const allowed = limit === -1 || currentUsage + requestedAmount <= limit;

      return {
        allowed,
        currentUsage,
        limit,
        remaining,
        wouldExceed
      };
    } catch (error) {
      logger.error('Failed to check usage limit', { userId, metricType, requestedAmount, error });
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        wouldExceed: true
      };
    }
  }

  /**
   * Get live usage data for monitoring
   */
  async getLiveUsageData(userId: string): Promise<LiveUsageData> {
    try {
      const userUsage = this.usageData.get(userId) || {} as Record<UsageMetricType, number>;
      const userLimits = this.getUserLimits(userId);
      
      const metrics = {} as Record<UsageMetricType, { current: number; limit: number; percentage: number; }>;
      
      // Build metrics for all metric types
      const allMetrics: UsageMetricType[] = ['cv_uploads', 'ai_analyses', 'template_downloads', 'video_generations', 'podcast_generations', 'portal_views', 'api_calls'];
      
      for (const metricType of allMetrics) {
        const current = userUsage[metricType] || 0;
        const limit = userLimits[metricType];
        const percentage = limit > 0 ? (current / limit) * 100 : 0;
        
        metrics[metricType] = {
          current,
          limit,
          percentage
        };
      }

      return {
        userId,
        metrics,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Failed to get live usage data', { userId, error });
      throw error;
    }
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(userId: string, period?: string): Promise<UsageAnalytics> {
    try {
      const currentPeriod = period || this.getCurrentPeriod();
      const userUsage = this.usageData.get(userId) || {} as Record<UsageMetricType, number>;
      
      // Build metrics analytics
      const metrics = {} as Record<UsageMetricType, {
        total: number;
        average: number;
        trend: 'up' | 'down' | 'stable';
        percentageChange: number;
      }>;

      const allMetrics: UsageMetricType[] = ['cv_uploads', 'ai_analyses', 'template_downloads', 'video_generations', 'podcast_generations', 'portal_views', 'api_calls'];
      
      for (const metricType of allMetrics) {
        const total = userUsage[metricType] || 0;
        metrics[metricType] = {
          total,
          average: total / 30, // Rough daily average for month
          trend: 'stable',
          percentageChange: 0
        };
      }

      return {
        userId,
        period: currentPeriod,
        metrics,
        insights: ['Usage tracking is active'],
        recommendations: ['Consider upgrading for more features']
      };
    } catch (error) {
      logger.error('Failed to get usage analytics', { userId, period, error });
      throw error;
    }
  }

  /**
   * Track batch usage
   */
  async trackBatchUsage(batchUpdate: BatchUsageUpdate): Promise<UsageRecord[]> {
    try {
      const records: UsageRecord[] = [];
      
      for (const update of batchUpdate.updates) {
        const record = await this.trackUsage(
          batchUpdate.userId,
          update.metricType,
          update.increment,
          update.metadata
        );
        records.push(record);
      }

      logger.info('Batch usage tracked', { 
        userId: batchUpdate.userId, 
        updates: batchUpdate.updates.length 
      });

      return records;
    } catch (error) {
      logger.error('Failed to track batch usage', { batchUpdate, error });
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Get current period string (YYYY-MM format)
   */
  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get user limits based on tier
   */
  private getUserLimits(userId: string): Record<UsageMetricType, number> {
    // For now, return premium limits for all users
    // In real implementation, would check user's subscription tier
    return {
      cv_uploads: PREMIUM_TIER_LIMITS.cv_uploads,
      ai_analyses: PREMIUM_TIER_LIMITS.ai_analyses,
      template_downloads: PREMIUM_TIER_LIMITS.template_downloads,
      video_generations: PREMIUM_TIER_LIMITS.video_generations,
      podcast_generations: PREMIUM_TIER_LIMITS.podcast_generations,
      portal_views: PREMIUM_TIER_LIMITS.portal_views,
      api_calls: PREMIUM_TIER_LIMITS.api_calls
    };
  }

  /**
   * Convert limits to UsageLimit objects
   */
  private convertLimitsToUsageLimit(limits: Record<UsageMetricType, number>): Record<UsageMetricType, UsageLimit> {
    const result = {} as Record<UsageMetricType, UsageLimit>;
    
    for (const metricType of Object.keys(limits) as UsageMetricType[]) {
      result[metricType] = {
        metricType,
        limit: limits[metricType],
        period: 'monthly',
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
    }

    return result;
  }

  /**
   * Clear cache for a user
   */
  private clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}