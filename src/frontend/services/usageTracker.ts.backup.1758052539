/**
 * CVPlus Usage Tracking Service
 * Real-time feature usage analytics and monitoring
 * Author: Gil Klainert
 * Date: August 27, 2025
 */

import { httpsCallable } from 'firebase/functions';
import { logEvent } from 'firebase/analytics';
import { functions, analytics } from '../../lib/firebase';

export interface AnalyticsEvent {
  userId: string;
  featureId: string;
  timestamp: number;
  type: 'feature_view' | 'feature_usage' | 'feature_blocked' | 'feature_error';
  metadata: Record<string, any>;
}

export interface UsageMetrics {
  dailyUsage: Record<string, number>;
  monthlyUsage: Record<string, number>;
  popularFeatures: Array<{ featureId: string; count: number }>;
  blockedAttempts: Array<{ featureId: string; reason: string; count: number }>;
  conversionMetrics: {
    blockedToUpgrade: number;
    viewToUsage: number;
    errorRate: number;
  };
}

export interface FeatureUsageEvent {
  userId: string;
  featureId: string;
  success: boolean;
  executionTime: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface FeatureAccessEvent {
  userId: string;
  featureId: string;
  accessType: 'authorized' | 'grace_period' | 'blocked';
  executionTime: number;
  metadata?: Record<string, any>;
}

/**
 * Real-time Usage Tracking Service
 * Tracks feature usage, access patterns, and conversion metrics
 */
export class UsageTracker {
  private static instance: UsageTracker;
  private analyticsBuffer: AnalyticsEvent[] = [];
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL = 30000; // 30 seconds
  private batchTimer: NodeJS.Timeout | null = null;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeBatching();
    this.setupBeforeUnloadHandler();
  }

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  /**
   * Track feature view/access attempt
   */
  trackFeatureAccess(
    userId: string, 
    featureId: string, 
    data: Partial<FeatureAccessEvent> = {}
  ): void {
    const event: AnalyticsEvent = {
      userId,
      featureId,
      timestamp: Date.now(),
      type: 'feature_view',
      metadata: {
        ...data.metadata,
        accessType: data.accessType || 'authorized',
        executionTime: data.executionTime,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        url: window.location.href,
        referrer: document.referrer
      }
    };

    this.addEvent(event);
    
    // Also track in Firebase Analytics for dashboard
    if (analytics) {
      logEvent(analytics, 'feature_access', {
        feature_id: featureId,
        access_type: data.accessType || 'authorized',
        execution_time: data.executionTime
      });
    }
  }

  /**
   * Track actual feature usage/execution
   */
  trackFeatureUsage(
    userId: string,
    featureId: string, 
    data: Partial<FeatureUsageEvent> = {}
  ): void {
    const event: AnalyticsEvent = {
      userId,
      featureId,
      timestamp: Date.now(),
      type: 'feature_usage',
      metadata: {
        ...data.metadata,
        success: data.success ?? true,
        executionTime: data.executionTime,
        error: data.error,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        url: window.location.href
      }
    };

    this.addEvent(event);

    // Track in Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'feature_usage', {
        feature_id: featureId,
        success: data.success ?? true,
        execution_time: data.executionTime,
        has_error: !!data.error
      });
    }
  }

  /**
   * Track blocked feature access attempts
   */
  trackFeatureBlocked(
    userId: string,
    featureId: string, 
    reason: 'subscription' | 'usage_limit' | 'grace_expired',
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      userId,
      featureId,
      timestamp: Date.now(),
      type: 'feature_blocked',
      metadata: {
        ...metadata,
        reason,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        url: window.location.href,
        potentialRevenue: this.calculatePotentialRevenue(featureId)
      }
    };

    this.addEvent(event);

    // Track conversion opportunity in Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'feature_blocked', {
        feature_id: featureId,
        block_reason: reason,
        potential_revenue: this.calculatePotentialRevenue(featureId)
      });
    }
  }

  /**
   * Track feature-related errors
   */
  trackFeatureError(
    userId: string,
    featureId: string,
    error: Error,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      userId,
      featureId,
      timestamp: Date.now(),
      type: 'feature_error',
      metadata: {
        ...metadata,
        error: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        url: window.location.href
      }
    };

    this.addEvent(event);

    // Track in Firebase Analytics for error monitoring
    if (analytics) {
      logEvent(analytics, 'feature_error', {
        feature_id: featureId,
        error_message: error.message
      });
    }
  }

  /**
   * Get usage analytics for a user
   */
  async getUserUsageAnalytics(
    userId: string,
    timeRange: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<UsageMetrics> {
    try {
      const getUserAnalytics = httpsCallable(functions, 'getUserUsageAnalytics');
      const result = await getUserAnalytics({ userId, timeRange });
      
      return result.data as UsageMetrics;
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get feature popularity metrics
   */
  async getFeaturePopularityMetrics(): Promise<{
    mostUsed: Array<{ featureId: string; count: number; tier: string }>;
    leastUsed: Array<{ featureId: string; count: number; tier: string }>;
    conversionRates: Record<string, number>;
  }> {
    try {
      const getPopularityMetrics = httpsCallable(functions, 'getFeaturePopularityMetrics');
      const result = await getPopularityMetrics();
      
      return result.data as any;
    } catch (error) {
      console.error('Failed to get popularity metrics:', error);
      return {
        mostUsed: [],
        leastUsed: [],
        conversionRates: {}
      };
    }
  }

  /**
   * Track conversion from blocked access to upgrade
   */
  trackUpgradeConversion(
    userId: string,
    featureId: string,
    fromTier: string,
    toTier: string,
    revenue: number
  ): void {
    const event: AnalyticsEvent = {
      userId,
      featureId,
      timestamp: Date.now(),
      type: 'feature_view', // Using existing type but with conversion metadata
      metadata: {
        conversion: true,
        fromTier,
        toTier,
        revenue,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    this.addEvent(event);

    // Track conversion in Firebase Analytics
    if (analytics) {
      logEvent(analytics, 'purchase', {
        currency: 'USD',
        value: revenue,
        feature_trigger: featureId,
        upgrade_from: fromTier,
        upgrade_to: toTier
      });
    }
  }

  /**
   * Get real-time usage statistics for dashboard
   */
  async getRealtimeUsageStats(userId: string): Promise<{
    todayUsage: Record<string, number>;
    monthlyUsage: Record<string, number>;
    remainingLimits: Record<string, number>;
    topFeatures: string[];
  }> {
    try {
      const getRealtimeStats = httpsCallable(functions, 'getRealtimeUsageStats');
      const result = await getRealtimeStats({ userId });
      
      return result.data as any;
    } catch (error) {
      console.error('Failed to get realtime stats:', error);
      return {
        todayUsage: {},
        monthlyUsage: {},
        remainingLimits: {},
        topFeatures: []
      };
    }
  }

  /**
   * Private helper methods
   */
  private addEvent(event: AnalyticsEvent): void {
    this.analyticsBuffer.push(event);
    
    // Trigger immediate batch if buffer is full
    if (this.analyticsBuffer.length >= this.BATCH_SIZE) {
      this.batchTrackingEvents();
    }
  }

  private initializeBatching(): void {
    this.batchTimer = setInterval(() => {
      this.batchTrackingEvents();
    }, this.BATCH_INTERVAL);
  }

  private async batchTrackingEvents(): Promise<void> {
    if (this.analyticsBuffer.length === 0) return;

    const events = this.analyticsBuffer.splice(0, this.BATCH_SIZE);
    
    try {
      const batchTrackingEvents = httpsCallable(functions, 'batchTrackingEvents');
      await batchTrackingEvents({ events });
    } catch (error) {
      console.error('Failed to batch tracking events:', error);
      // Re-add failed events to buffer for retry
      this.analyticsBuffer.unshift(...events);
    }
  }

  private setupBeforeUnloadHandler(): void {
    // Flush remaining events before page unload
    window.addEventListener('beforeunload', () => {
      if (this.analyticsBuffer.length > 0) {
        // Use sendBeacon for reliable delivery
        const payload = JSON.stringify({ events: this.analyticsBuffer });
        navigator.sendBeacon('/api/analytics/batch', payload);
      }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculatePotentialRevenue(featureId: string): number {
    // Estimate potential revenue based on feature tier
    // This helps track conversion opportunities
    const feature = featureId; // Would map to actual feature config
    
    // Simple mapping - in production this would be more sophisticated
    const revenueMap: Record<string, number> = {
      premium: 29,
      enterprise: 99
    };

    return revenueMap.premium || 0; // Default to premium tier value
  }

  private getEmptyMetrics(): UsageMetrics {
    return {
      dailyUsage: {},
      monthlyUsage: {},
      popularFeatures: [],
      blockedAttempts: [],
      conversionMetrics: {
        blockedToUpgrade: 0,
        viewToUsage: 0,
        errorRate: 0
      }
    };
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Flush any remaining events
    this.batchTrackingEvents();
  }
}

// Export singleton instance
export const usageTracker = UsageTracker.getInstance();
export default UsageTracker;