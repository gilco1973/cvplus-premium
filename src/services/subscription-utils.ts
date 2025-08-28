/**
 * CVPlus Premium Module - Subscription Utilities Service
 * 
 * Common subscription status and billing utilities extracted from
 * duplicated Firebase Functions. Provides centralized subscription
 * management and billing status checking.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-28
 * @category Premium Services
 */

import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { 
  PremiumTier, 
  UserSubscriptionData, 
  SubscriptionStatus,
  BillingStatus,
  SubscriptionValidationResult
} from '../types';

/**
 * Subscription status definitions
 */
export enum SubscriptionStatusType {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  TRIALING = 'trialing',
  EXPIRED = 'expired',
  PAUSED = 'paused'
}

/**
 * Centralized Subscription Utilities Service
 */
export class SubscriptionUtilsService {
  private static instance: SubscriptionUtilsService;
  private subscriptionCache = new Map<string, { data: UserSubscriptionData | null; timestamp: number }>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes for subscription data

  /**
   * Singleton instance
   */
  public static getInstance(): SubscriptionUtilsService {
    if (!SubscriptionUtilsService.instance) {
      SubscriptionUtilsService.instance = new SubscriptionUtilsService();
    }
    return SubscriptionUtilsService.instance;
  }

  /**
   * Get user subscription with caching
   * Replaces duplicated subscription fetching across Firebase Functions
   */
  async getUserSubscription(userId: string): Promise<UserSubscriptionData | null> {
    const cacheKey = `subscription:${userId}`;
    const cached = this.subscriptionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const subscriptionDoc = await db
        .collection('userSubscriptions')
        .doc(userId)
        .get();

      const subscription = subscriptionDoc.exists 
        ? (subscriptionDoc.data() as UserSubscriptionData)
        : null;

      // Cache the result
      this.subscriptionCache.set(cacheKey, {
        data: subscription,
        timestamp: Date.now()
      });

      return subscription;

    } catch (error) {
      logger.error('Failed to fetch user subscription', { error, userId });
      return null;
    }
  }

  /**
   * Validate subscription status
   * Replaces scattered subscription validation logic
   */
  async validateSubscriptionStatus(userId: string): Promise<SubscriptionValidationResult> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        return {
          isValid: false,
          status: 'none',
          tier: PremiumTier.FREE,
          message: 'No subscription found',
          requiresAction: true,
          actionType: 'subscribe'
        };
      }

      // Check if subscription is active
      const isActive = this.isSubscriptionActive(subscription);
      if (!isActive.valid) {
        return {
          isValid: false,
          status: subscription.status,
          tier: subscription.tier,
          message: isActive.reason,
          requiresAction: true,
          actionType: isActive.actionType || 'renew'
        };
      }

      // Check if subscription is expired
      const isExpired = this.isSubscriptionExpired(subscription);
      if (isExpired.expired) {
        return {
          isValid: false,
          status: 'expired',
          tier: subscription.tier,
          message: 'Subscription expired',
          requiresAction: true,
          actionType: 'renew',
          expirationDate: isExpired.expirationDate
        };
      }

      // Check billing status
      const billingStatus = await this.checkBillingStatus(userId, subscription);
      if (!billingStatus.isHealthy) {
        return {
          isValid: false,
          status: subscription.status,
          tier: subscription.tier,
          message: billingStatus.message,
          requiresAction: true,
          actionType: 'update_billing',
          billingIssue: billingStatus.issue
        };
      }

      return {
        isValid: true,
        status: subscription.status,
        tier: subscription.tier,
        message: 'Subscription is active and valid',
        requiresAction: false,
        subscription
      };

    } catch (error) {
      logger.error('Subscription validation failed', { error, userId });
      return {
        isValid: false,
        status: 'error',
        tier: PremiumTier.FREE,
        message: 'Validation failed',
        requiresAction: true,
        actionType: 'contact_support'
      };
    }
  }

  /**
   * Check if user has active subscription
   * Replaces duplicated active subscription checks
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const validation = await this.validateSubscriptionStatus(userId);
      return validation.isValid && validation.tier !== PremiumTier.FREE;
    } catch (error) {
      logger.error('Active subscription check failed', { error, userId });
      return false;
    }
  }

  /**
   * Get subscription expiration info
   */
  async getSubscriptionExpiration(userId: string): Promise<{
    expiresAt: Date | null;
    daysRemaining: number;
    isExpiring: boolean;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || !subscription.currentPeriodEnd) {
        return {
          expiresAt: null,
          daysRemaining: 0,
          isExpiring: false
        };
      }

      const expiresAt = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpiring = daysRemaining <= 7 && daysRemaining > 0; // Expiring in 7 days

      return {
        expiresAt,
        daysRemaining,
        isExpiring
      };

    } catch (error) {
      logger.error('Failed to get expiration info', { error, userId });
      return {
        expiresAt: null,
        daysRemaining: 0,
        isExpiring: false
      };
    }
  }

  /**
   * Get subscription usage stats
   */
  async getSubscriptionUsage(userId: string): Promise<{
    tier: PremiumTier;
    usage: Record<string, { current: number; limit: number; percentage: number }>;
  }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const tier = subscription?.tier || PremiumTier.FREE;

      // Get usage data for current billing period
      const usageData = await this.getCurrentPeriodUsage(userId);
      
      return {
        tier,
        usage: usageData
      };

    } catch (error) {
      logger.error('Failed to get usage stats', { error, userId });
      return {
        tier: PremiumTier.FREE,
        usage: {}
      };
    }
  }

  /**
   * Check if subscription allows specific feature
   * Consolidates feature-specific subscription checks
   */
  async allowsFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) return false;

      const validation = await this.validateSubscriptionStatus(userId);
      if (!validation.isValid) return false;

      // Feature-specific logic based on tier
      return this.tierAllowsFeature(subscription.tier, feature);

    } catch (error) {
      logger.error('Feature allowance check failed', { error, userId, feature });
      return false;
    }
  }

  /**
   * Update subscription cache when subscription changes
   */
  async refreshSubscriptionCache(userId: string): Promise<UserSubscriptionData | null> {
    const cacheKey = `subscription:${userId}`;
    this.subscriptionCache.delete(cacheKey);
    return this.getUserSubscription(userId);
  }

  /**
   * Bulk subscription validation for multiple users
   */
  async validateMultipleSubscriptions(userIds: string[]): Promise<Map<string, SubscriptionValidationResult>> {
    const results = new Map<string, SubscriptionValidationResult>();

    // Process in parallel batches
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async userId => {
        try {
          const result = await this.validateSubscriptionStatus(userId);
          return { userId, result };
        } catch (error) {
          return {
            userId,
            result: {
              isValid: false,
              status: 'error',
              tier: PremiumTier.FREE,
              message: 'Validation failed',
              requiresAction: true,
              actionType: 'contact_support'
            } as SubscriptionValidationResult
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ userId, result }) => {
        results.set(userId, result);
      });
    }

    return results;
  }

  /**
   * Private helper: Check if subscription is active
   */
  private isSubscriptionActive(subscription: UserSubscriptionData): {
    valid: boolean;
    reason?: string;
    actionType?: string;
  } {
    const activeStatuses = [
      SubscriptionStatusType.ACTIVE,
      SubscriptionStatusType.TRIALING
    ];

    if (!activeStatuses.includes(subscription.status as SubscriptionStatusType)) {
      return {
        valid: false,
        reason: `Subscription is ${subscription.status}`,
        actionType: subscription.status === SubscriptionStatusType.CANCELED ? 'resubscribe' : 'renew'
      };
    }

    return { valid: true };
  }

  /**
   * Private helper: Check if subscription is expired
   */
  private isSubscriptionExpired(subscription: UserSubscriptionData): {
    expired: boolean;
    expirationDate?: Date;
  } {
    if (!subscription.currentPeriodEnd) {
      return { expired: false };
    }

    const expirationDate = new Date(subscription.currentPeriodEnd);
    const now = new Date();

    return {
      expired: now > expirationDate,
      expirationDate
    };
  }

  /**
   * Private helper: Check billing status
   */
  private async checkBillingStatus(
    userId: string,
    subscription: UserSubscriptionData
  ): Promise<BillingStatus> {
    try {
      // Check for recent billing failures
      const billingDoc = await db
        .collection('billingHistory')
        .doc(userId)
        .get();

      if (billingDoc.exists) {
        const billingData = billingDoc.data();
        const lastPaymentFailed = billingData?.lastPaymentStatus === 'failed';
        const lastFailedDate = billingData?.lastFailedDate;

        if (lastPaymentFailed && lastFailedDate) {
          const daysSinceFailure = Math.floor(
            (Date.now() - new Date(lastFailedDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceFailure <= 7) {
            return {
              isHealthy: false,
              message: 'Recent payment failure detected',
              issue: 'payment_failed',
              lastAttempt: new Date(lastFailedDate)
            };
          }
        }
      }

      return {
        isHealthy: true,
        message: 'Billing is healthy'
      };

    } catch (error) {
      logger.error('Billing status check failed', { error, userId });
      return {
        isHealthy: true, // Fail open
        message: 'Unable to verify billing status'
      };
    }
  }

  /**
   * Private helper: Get current period usage
   */
  private async getCurrentPeriodUsage(
    userId: string
  ): Promise<Record<string, { current: number; limit: number; percentage: number }>> {
    try {
      // Calculate current billing period
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) return {};

      const periodStart = subscription.currentPeriodStart 
        ? new Date(subscription.currentPeriodStart)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days fallback

      // Query usage data
      const usageSnapshot = await db
        .collection('featureUsage')
        .where('userId', '==', userId)
        .where('timestamp', '>=', periodStart)
        .get();

      const usageCounts = new Map<string, number>();
      usageSnapshot.forEach(doc => {
        const feature = doc.data().feature;
        usageCounts.set(feature, (usageCounts.get(feature) || 0) + 1);
      });

      // Convert to usage format with limits
      const usage: Record<string, { current: number; limit: number; percentage: number }> = {};
      const tierLimits = this.getTierLimits(subscription.tier);

      for (const [feature, limit] of Object.entries(tierLimits)) {
        const current = usageCounts.get(feature) || 0;
        const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
        
        usage[feature] = {
          current,
          limit,
          percentage
        };
      }

      return usage;

    } catch (error) {
      logger.error('Failed to get usage data', { error, userId });
      return {};
    }
  }

  /**
   * Private helper: Get tier limits
   */
  private getTierLimits(tier: PremiumTier): Record<string, number> {
    const limits: Record<PremiumTier, Record<string, number>> = {
      [PremiumTier.FREE]: {
        'advanced_cv_generation': 3,
        'portfolio_gallery': 1,
        'video_introduction': 0
      },
      [PremiumTier.BASIC]: {
        'advanced_cv_generation': 25,
        'portfolio_gallery': 10,
        'video_introduction': 5
      },
      [PremiumTier.PRO]: {
        'advanced_cv_generation': 100,
        'portfolio_gallery': -1, // unlimited
        'video_introduction': -1
      },
      [PremiumTier.ENTERPRISE]: {
        'advanced_cv_generation': -1,
        'portfolio_gallery': -1,
        'video_introduction': -1
      }
    };

    return limits[tier] || limits[PremiumTier.FREE];
  }

  /**
   * Private helper: Check if tier allows feature
   */
  private tierAllowsFeature(tier: PremiumTier, feature: string): boolean {
    const tierFeatures: Record<PremiumTier, string[]> = {
      [PremiumTier.FREE]: [
        'basic_cv_generation',
        'basic_templates'
      ],
      [PremiumTier.BASIC]: [
        'basic_cv_generation',
        'basic_templates',
        'advanced_cv_generation',
        'portfolio_gallery'
      ],
      [PremiumTier.PRO]: [
        'basic_cv_generation',
        'basic_templates',
        'advanced_cv_generation',
        'portfolio_gallery',
        'video_introduction',
        'analytics_dashboard',
        'custom_branding'
      ],
      [PremiumTier.ENTERPRISE]: [
        'basic_cv_generation',
        'basic_templates',
        'advanced_cv_generation',
        'portfolio_gallery',
        'video_introduction',
        'analytics_dashboard',
        'custom_branding',
        'api_access',
        'team_collaboration',
        'priority_support'
      ]
    };

    return tierFeatures[tier]?.includes(feature) || false;
  }

  /**
   * Clear all caches for user
   */
  public clearUserCaches(userId: string): void {
    this.subscriptionCache.delete(`subscription:${userId}`);
  }
}

/**
 * Convenience functions for common subscription patterns
 */

/**
 * Quick active subscription requirement
 */
export async function requireActiveSubscription(userId: string): Promise<UserSubscriptionData> {
  const service = SubscriptionUtilsService.getInstance();
  const validation = await service.validateSubscriptionStatus(userId);
  
  if (!validation.isValid) {
    throw new HttpsError('permission-denied', validation.message);
  }

  if (validation.tier === PremiumTier.FREE) {
    throw new HttpsError('permission-denied', 'Premium subscription required');
  }

  return validation.subscription!;
}

/**
 * Quick subscription status check
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  hasSubscription: boolean;
  tier: PremiumTier;
  status: string;
  isActive: boolean;
}> {
  const service = SubscriptionUtilsService.getInstance();
  const subscription = await service.getUserSubscription(userId);
  
  if (!subscription) {
    return {
      hasSubscription: false,
      tier: PremiumTier.FREE,
      status: 'none',
      isActive: false
    };
  }

  const validation = await service.validateSubscriptionStatus(userId);
  
  return {
    hasSubscription: true,
    tier: subscription.tier,
    status: subscription.status,
    isActive: validation.isValid
  };
}