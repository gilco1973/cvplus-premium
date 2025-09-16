/**
 * CVPlus Enhanced Feature Gating Service
 * Comprehensive access control and usage tracking for premium features
 * Author: Gil Klainert
 * Date: August 27, 2025
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import { FeatureRegistry, CV_FEATURES } from './featureRegistry';
import { UsageTracker } from './usageTracker';
import { SubscriptionCache } from './subscriptionCache';

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason: 'authorized' | 'insufficient_plan' | 'usage_limit_exceeded' | 'grace_period' | 'system_error';
  details?: {
    currentPlan?: string;
    requiredPlans?: string[];
    currentUsage?: number;
    usageLimit?: number;
    resetDate?: Date;
    gracePeriodEnd?: Date;
    remainingDays?: number;
    upgradeUrl?: string;
    errorMessage?: string;
  };
  metadata?: {
    checkedAt: Date;
    userId: string;
    featureId: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export interface GatedResult<T> {
  success: boolean;
  blocked: boolean;
  result?: T;
  error?: string;
  accessResult: FeatureAccessResult;
  executionTime?: number;
}

export interface FeatureContext {
  userAgent?: string;
  sessionId?: string;
  ipAddress?: string;
  referrer?: string;
  experimentGroup?: string;
  metadata?: Record<string, any>;
}

export interface GracePeriod {
  inGracePeriod: boolean;
  endDate?: Date;
  remainingDays?: number;
  reason?: 'trial_expired' | 'payment_failed' | 'subscription_cancelled';
}

export interface UsageLimitCheck {
  withinLimits: boolean;
  currentUsage: number;
  limit: number;
  resetDate: Date;
  upgradeOptions?: {
    tier: string;
    newLimit: number;
    price: number;
  }[];
}

/**
 * Enhanced Feature Gating Service
 * Provides comprehensive access control with real-time subscription validation,
 * usage tracking, grace period handling, and analytics integration
 */
export class FeatureGatingService {
  private static instance: FeatureGatingService;
  private subscriptionCache: SubscriptionCache;
  private usageTracker: UsageTracker;

  private constructor() {
    this.subscriptionCache = SubscriptionCache.getInstance();
    this.usageTracker = UsageTracker.getInstance();
  }

  static getInstance(): FeatureGatingService {
    if (!FeatureGatingService.instance) {
      FeatureGatingService.instance = new FeatureGatingService();
    }
    return FeatureGatingService.instance;
  }

  /**
   * Check if user has access to a specific feature
   * Includes subscription validation, usage limits, and grace period handling
   */
  async checkFeatureAccess(
    userId: string,
    featureId: string,
    context: FeatureContext = {}
  ): Promise<FeatureAccessResult> {
    const startTime = Date.now();

    try {
      // Get feature configuration
      const feature = FeatureRegistry.getFeature(featureId);
      if (!feature) {
        return this.createAccessResult(false, 'system_error', {
          errorMessage: `Feature '${featureId}' not found in registry`
        }, userId, featureId, context);
      }

      // Get user subscription with caching
      const subscription = await this.subscriptionCache.getUserSubscription(userId);
      if (!subscription) {
        return this.createAccessResult(false, 'insufficient_plan', {
          currentPlan: 'none',
          requiredPlans: [feature.tier],
          upgradeUrl: this.generateUpgradeUrl(featureId)
        }, userId, featureId, context);
      }

      // Check basic permission based on subscription tier
      const hasPermission = FeatureRegistry.hasFeatureAccess(featureId, subscription.tier);
      
      if (!hasPermission) {
        // Check if user is in grace period
        const gracePeriod = await this.checkGracePeriod(userId, featureId);
        
        if (gracePeriod.inGracePeriod) {
          await this.usageTracker.trackFeatureAccess(userId, featureId, {
            ...context,
            accessType: 'grace_period',
            executionTime: Date.now() - startTime
          });

          return this.createAccessResult(true, 'grace_period', {
            gracePeriodEnd: gracePeriod.endDate,
            remainingDays: gracePeriod.remainingDays
          }, userId, featureId, context);
        }

        await this.usageTracker.trackFeatureBlocked(userId, featureId, 'subscription', context);

        return this.createAccessResult(false, 'insufficient_plan', {
          currentPlan: subscription.tier,
          requiredPlans: [feature.tier],
          upgradeUrl: this.generateUpgradeUrl(featureId)
        }, userId, featureId, context);
      }

      // Check usage limits if feature has limits
      if (feature.usageLimits) {
        const usageCheck = await this.checkUsageLimits(
          userId,
          featureId,
          subscription.tier,
          context
        );

        if (!usageCheck.withinLimits) {
          await this.usageTracker.trackFeatureBlocked(userId, featureId, 'usage_limit', context);

          return this.createAccessResult(false, 'usage_limit_exceeded', {
            currentUsage: usageCheck.currentUsage,
            usageLimit: usageCheck.limit,
            resetDate: usageCheck.resetDate,
            upgradeUrl: this.generateUpgradeUrl(featureId, 'usage_limit')
          }, userId, featureId, context);
        }
      }

      // Track successful access
      await this.usageTracker.trackFeatureAccess(userId, featureId, {
        ...context,
        accessType: 'authorized',
        executionTime: Date.now() - startTime
      });

      return this.createAccessResult(true, 'authorized', {
        currentPlan: subscription.tier,
        currentUsage: feature.usageLimits ? await this.getCurrentUsage(userId, featureId) : undefined,
        usageLimit: feature.usageLimits ? FeatureRegistry.getUsageLimit(featureId, subscription.tier) : undefined
      }, userId, featureId, context);

    } catch (error) {
      console.error('Feature access check failed:', error);
      
      await this.usageTracker.trackFeatureError(userId, featureId, error as Error, context);

      return this.createAccessResult(false, 'system_error', {
        errorMessage: (error as Error).message
      }, userId, featureId, context);
    }
  }

  /**
   * Enforce feature gate around an operation
   * Executes operation only if user has access, with comprehensive tracking
   */
  async enforceFeatureGate<T>(
    userId: string,
    featureId: string,
    operation: () => Promise<T>,
    context: FeatureContext = {}
  ): Promise<GatedResult<T>> {
    const startTime = Date.now();

    // Check access first
    const accessResult = await this.checkFeatureAccess(userId, featureId, context);
    
    if (!accessResult.hasAccess) {
      return {
        success: false,
        blocked: true,
        accessResult,
        executionTime: Date.now() - startTime
      };
    }

    try {
      // Execute the gated operation
      const result = await operation();
      const executionTime = Date.now() - startTime;

      // Track successful feature usage
      await this.usageTracker.trackFeatureUsage(userId, featureId, {
        ...context,
        success: true,
        executionTime
      });

      // Update usage statistics
      await this.updateUsageStatistics(userId, featureId);

      return {
        success: true,
        blocked: false,
        result,
        accessResult,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Track failed feature usage
      await this.usageTracker.trackFeatureUsage(userId, featureId, {
        ...context,
        success: false,
        error: (error as Error).message,
        executionTime
      });

      return {
        success: false,
        blocked: false,
        error: (error as Error).message,
        accessResult,
        executionTime
      };
    }
  }

  /**
   * Batch check multiple features for efficient permission validation
   */
  async batchCheckFeatureAccess(
    userId: string,
    featureIds: string[],
    context: FeatureContext = {}
  ): Promise<Record<string, FeatureAccessResult>> {
    const results: Record<string, FeatureAccessResult> = {};
    
    // Get user subscription once for efficiency
    const subscription = await this.subscriptionCache.getUserSubscription(userId);
    
    // Process features in parallel for better performance
    await Promise.all(
      featureIds.map(async (featureId) => {
        results[featureId] = await this.checkFeatureAccess(userId, featureId, context);
      })
    );

    return results;
  }

  /**
   * Get user's feature access matrix for dashboard display
   */
  async getUserFeatureMatrix(userId: string): Promise<{
    tier: string;
    features: Record<string, {
      hasAccess: boolean;
      usageRemaining?: number;
      popularityScore?: number;
    }>;
  }> {
    const subscription = await this.subscriptionCache.getUserSubscription(userId);
    const features: Record<string, any> = {};

    for (const feature of CV_FEATURES) {
      const hasAccess = subscription ? 
        FeatureRegistry.hasFeatureAccess(feature.id, subscription.tier) : 
        feature.tier === 'free';

      features[feature.id] = {
        hasAccess,
        usageRemaining: feature.usageLimits && subscription ? 
          await this.getRemainingUsage(userId, feature.id, subscription.tier) : 
          undefined,
        popularityScore: feature.popularityScore
      };
    }

    return {
      tier: subscription?.tier || 'free',
      features
    };
  }

  /**
   * Private helper methods
   */
  private async checkGracePeriod(userId: string, featureId: string): Promise<GracePeriod> {
    try {
      const checkGracePeriod = httpsCallable(functions, 'checkGracePeriod');
      const result = await checkGracePeriod({ userId, featureId });
      
      return result.data as GracePeriod;
    } catch (error) {
      console.error('Grace period check failed:', error);
      return { inGracePeriod: false };
    }
  }

  private async checkUsageLimits(
    userId: string,
    featureId: string,
    userTier: string,
    context: FeatureContext
  ): Promise<UsageLimitCheck> {
    const limit = FeatureRegistry.getUsageLimit(featureId, userTier as any);
    if (limit === -1) {
      return {
        withinLimits: true,
        currentUsage: 0,
        limit: -1,
        resetDate: new Date()
      };
    }

    const currentUsage = await this.getCurrentUsage(userId, featureId);
    const resetDate = this.getUsageResetDate();

    return {
      withinLimits: currentUsage < limit,
      currentUsage,
      limit,
      resetDate,
      upgradeOptions: currentUsage >= limit ? await this.getUpgradeOptions(featureId) : undefined
    };
  }

  private async getCurrentUsage(userId: string, featureId: string): Promise<number> {
    try {
      const getUserUsage = httpsCallable(functions, 'getUserFeatureUsage');
      const result = await getUserUsage({ userId, featureId });
      
      return (result.data as any)?.currentUsage || 0;
    } catch (error) {
      console.error('Failed to get current usage:', error);
      return 0;
    }
  }

  private async getRemainingUsage(
    userId: string, 
    featureId: string, 
    userTier: string
  ): Promise<number | undefined> {
    const limit = FeatureRegistry.getUsageLimit(featureId, userTier as any);
    if (limit === -1) return undefined; // Unlimited

    const currentUsage = await this.getCurrentUsage(userId, featureId);
    return Math.max(0, limit - currentUsage);
  }

  private getUsageResetDate(): Date {
    // Reset on first day of next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  private async getUpgradeOptions(featureId: string): Promise<any[]> {
    // Return upgrade tier options that would increase the limit
    const feature = FeatureRegistry.getFeature(featureId);
    if (!feature?.usageLimits) return [];

    return [
      {
        tier: 'premium',
        newLimit: feature.usageLimits.premium || -1,
        price: 29
      },
      {
        tier: 'enterprise', 
        newLimit: feature.usageLimits.enterprise || -1,
        price: 99
      }
    ];
  }

  private generateUpgradeUrl(featureId: string, reason?: string): string {
    const baseUrl = '/pricing';
    const params = new URLSearchParams({
      feature: featureId,
      ...(reason && { reason })
    });

    return `${baseUrl}?${params.toString()}`;
  }

  private async updateUsageStatistics(userId: string, featureId: string): Promise<void> {
    try {
      const updateUsage = httpsCallable(functions, 'updateFeatureUsage');
      await updateUsage({ userId, featureId, timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to update usage statistics:', error);
      // Non-blocking error - don't throw
    }
  }

  private createAccessResult(
    hasAccess: boolean,
    reason: FeatureAccessResult['reason'],
    details: FeatureAccessResult['details'] = {},
    userId: string,
    featureId: string,
    context: FeatureContext
  ): FeatureAccessResult {
    return {
      hasAccess,
      reason,
      details,
      metadata: {
        checkedAt: new Date(),
        userId,
        featureId,
        userAgent: context.userAgent,
        sessionId: context.sessionId
      }
    };
  }
}

// Export singleton instance
export const featureGatingService = FeatureGatingService.getInstance();
export default FeatureGatingService;