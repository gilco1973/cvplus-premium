/**
 * CVPlus Premium Module - Feature Access Service
 * 
 * Centralized feature access validation logic eliminating duplication
 * across Firebase Functions. Consolidates 120+ lines of duplicated
 * premium feature validation patterns.
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
  PremiumFeature, 
  PremiumTier, 
  UserSubscriptionData, 
  FeatureAccessResult,
  FeatureAccessContext
} from '../types';
import { 
  FEATURE_DEFINITIONS,
  PREMIUM_ERROR_CODES,
  ERROR_MESSAGES
} from '../constants/premium.constants';

/**
 * Centralized Feature Access Service
 * Eliminates duplicated validation logic across Firebase Functions
  */
export class FeatureAccessService {
  private static instance: FeatureAccessService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Singleton instance
    */
  public static getInstance(): FeatureAccessService {
    if (!FeatureAccessService.instance) {
      FeatureAccessService.instance = new FeatureAccessService();
    }
    return FeatureAccessService.instance;
  }

  /**
   * Primary feature access validation
   * Replaces duplicated validation logic in multiple Firebase Functions
    */
  async checkFeatureAccess(
    userId: string,
    feature: PremiumFeature,
    context: FeatureAccessContext = {}
  ): Promise<FeatureAccessResult> {
    try {
      logger.info('Checking feature access', { userId, feature, context });

      // Get feature definition
      const featureDefinition = FEATURE_DEFINITIONS[feature];
      if (!featureDefinition) {
        throw new HttpsError('invalid-argument', `Unknown feature: ${feature}`);
      }

      // Get user subscription with caching
      const subscription = await this.getUserSubscriptionCached(userId);

      // Check basic access
      const basicAccessResult = this.checkBasicAccess(subscription, featureDefinition);
      if (!basicAccessResult.hasAccess) {
        return basicAccessResult;
      }

      // Check usage limits if applicable
      if (featureDefinition.limits) {
        const usageResult = await this.checkUsageLimits(userId, feature, featureDefinition.limits);
        if (!usageResult.hasAccess) {
          return usageResult;
        }
      }

      // Check billing status
      const billingResult = this.checkBillingStatus(subscription);
      if (!billingResult.hasAccess) {
        return billingResult;
      }

      // Check feature-specific conditions
      const conditionsResult = await this.checkFeatureConditions(userId, feature, context);
      if (!conditionsResult.hasAccess) {
        return conditionsResult;
      }

      return {
        hasAccess: true,
        subscriptionStatus: subscription?.tier || PremiumTier.FREE,
        currentTier: subscription?.tier || PremiumTier.FREE,
        message: 'Access granted'
      };

    } catch (error) {
      logger.error('Feature access check failed', { error, userId, feature });
      throw new HttpsError('internal', 'Feature access check failed');
    }
  }

  /**
   * Validate premium tier access (replaces scattered tier validation)
    */
  async validatePremiumTier(
    userId: string,
    requiredTier: PremiumTier
  ): Promise<FeatureAccessResult> {
    try {
      const subscription = await this.getUserSubscriptionCached(userId);
      
      if (!subscription || subscription.tier === PremiumTier.FREE) {
        return {
          hasAccess: false,
          subscriptionStatus: 'free',
          currentTier: PremiumTier.FREE,
          requiredTier,
          message: 'Premium subscription required',
          upgradeRequired: true
        };
      }

      const tierHierarchy = {
        [PremiumTier.FREE]: 0,
        [PremiumTier.BASIC]: 1,
        [PremiumTier.PRO]: 2,
        [PremiumTier.ENTERPRISE]: 3
      };

      const hasAccess = tierHierarchy[subscription.tier] >= tierHierarchy[requiredTier];

      return {
        hasAccess,
        subscriptionStatus: subscription.tier,
        currentTier: subscription.tier,
        requiredTier,
        message: hasAccess ? 'Access granted' : 'Higher tier required',
        upgradeRequired: !hasAccess
      };

    } catch (error) {
      logger.error('Tier validation failed', { error, userId, requiredTier });
      throw new HttpsError('internal', 'Tier validation failed');
    }
  }

  /**
   * Check billing status (replaces scattered billing checks)
    */
  private checkBillingStatus(subscription: UserSubscriptionData | null): FeatureAccessResult {
    if (!subscription) {
      return {
        hasAccess: false,
        subscriptionStatus: 'free',
        message: 'No subscription found'
      };
    }

    // Check if subscription is active
    if (subscription.status !== 'active') {
      return {
        hasAccess: false,
        subscriptionStatus: subscription.status || 'inactive',
        currentTier: subscription.tier,
        message: 'Active subscription required',
        upgradeRequired: true
      };
    }

    // Check if subscription is expired
    if (subscription.currentPeriodEnd && new Date() > new Date(subscription.currentPeriodEnd)) {
      return {
        hasAccess: false,
        subscriptionStatus: 'expired',
        currentTier: subscription.tier,
        message: 'Subscription expired',
        upgradeRequired: true
      };
    }

    return {
      hasAccess: true,
      subscriptionStatus: subscription.status || 'active',
      currentTier: subscription.tier
    };
  }

  /**
   * Check basic feature access against user's tier
    */
  private checkBasicAccess(
    subscription: UserSubscriptionData | null,
    featureDefinition: any
  ): FeatureAccessResult {
    const userTier = subscription?.tier || PremiumTier.FREE;
    
    if (!featureDefinition.requiresSubscription) {
      return { hasAccess: true, currentTier: userTier };
    }

    const tierHierarchy = {
      [PremiumTier.FREE]: 0,
      [PremiumTier.BASIC]: 1,
      [PremiumTier.PRO]: 2,
      [PremiumTier.ENTERPRISE]: 3
    };

    const hasAccess = tierHierarchy[userTier] >= tierHierarchy[featureDefinition.requiredTier];

    return {
      hasAccess,
      currentTier: userTier,
      requiredTier: featureDefinition.requiredTier,
      message: hasAccess ? 'Access granted' : 'Higher tier required',
      upgradeRequired: !hasAccess
    };
  }

  /**
   * Check usage limits for features with restrictions
    */
  private async checkUsageLimits(
    userId: string,
    feature: PremiumFeature,
    limits: any
  ): Promise<FeatureAccessResult> {
    try {
      if (!limits.maxUsage) {
        return { hasAccess: true };
      }

      // Calculate period start based on reset period
      const now = new Date();
      let periodStart: Date;

      switch (limits.resetPeriod) {
        case 'daily':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          const weekStart = now.getDate() - now.getDay();
          periodStart = new Date(now.getFullYear(), now.getMonth(), weekStart);
          break;
        case 'monthly':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          periodStart = new Date(0); // No limit
      }

      // Query usage count
      const usageSnapshot = await db
        .collection('featureUsage')
        .where('userId', '==', userId)
        .where('feature', '==', feature)
        .where('timestamp', '>=', periodStart)
        .count()
        .get();

      const currentUsage = usageSnapshot.data().count;
      const hasAccess = currentUsage < limits.maxUsage;

      return {
        hasAccess,
        message: hasAccess ? 'Within usage limits' : 'Usage limit exceeded',
        currentUsage,
        maxUsage: limits.maxUsage,
        resetDate: this.getNextResetDate(limits.resetPeriod)
      };

    } catch (error) {
      logger.error('Usage limit check failed', { error, userId, feature });
      return { hasAccess: true }; // Fail open to avoid blocking users
    }
  }

  /**
   * Check feature-specific conditions
    */
  private async checkFeatureConditions(
    userId: string,
    feature: PremiumFeature,
    context: FeatureAccessContext
  ): Promise<FeatureAccessResult> {
    // Feature-specific validation logic
    switch (feature) {
      case PremiumFeature.TEAM_COLLABORATION:
        return this.checkTeamAccess(userId, context);
      case PremiumFeature.API_ACCESS:
        return this.checkApiLimits(userId);
      default:
        return { hasAccess: true };
    }
  }

  /**
   * Get user subscription with caching to reduce database calls
    */
  private async getUserSubscriptionCached(userId: string): Promise<UserSubscriptionData | null> {
    const cacheKey = `subscription:${userId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const subscriptionDoc = await db
        .collection('userSubscriptions')
        .doc(userId)
        .get();

      const subscription = subscriptionDoc.exists ? subscriptionDoc.data() as UserSubscriptionData : null;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: subscription,
        timestamp: Date.now()
      });

      return subscription;

    } catch (error) {
      logger.error('Failed to fetch subscription', { error, userId });
      return null;
    }
  }

  /**
   * Clear cache for user (call when subscription changes)
    */
  public clearUserCache(userId: string): void {
    const cacheKey = `subscription:${userId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Record feature usage for analytics and limits
    */
  async recordFeatureUsage(
    userId: string,
    feature: PremiumFeature,
    granted: boolean,
    context: FeatureAccessContext = {}
  ): Promise<void> {
    try {
      await db.collection('featureUsage').add({
        userId,
        feature,
        granted,
        timestamp: new Date(),
        context,
        createdAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to record feature usage', { error, userId, feature });
      // Don't throw - this is analytics only
    }
  }

  private async checkTeamAccess(userId: string, context: FeatureAccessContext): Promise<FeatureAccessResult> {
    // Team collaboration specific checks
    if (context.teamId) {
      const teamDoc = await db.collection('teams').doc(context.teamId).get();
      if (!teamDoc.exists || !teamDoc.data()?.members?.includes(userId)) {
        return {
          hasAccess: false,
          message: 'Not a team member'
        };
      }
    }
    return { hasAccess: true };
  }

  private async checkApiLimits(userId: string): Promise<FeatureAccessResult> {
    // API access specific rate limiting
    const rateLimitDoc = await db.collection('apiRateLimits').doc(userId).get();
    if (rateLimitDoc.exists) {
      const limits = rateLimitDoc.data();
      if (limits?.requestsToday >= limits?.dailyLimit) {
        return {
          hasAccess: false,
          message: 'API rate limit exceeded'
        };
      }
    }
    return { hasAccess: true };
  }

  private getNextResetDate(resetPeriod: string): Date {
    const now = new Date();
    switch (resetPeriod) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'weekly':
        const daysUntilWeekEnd = 7 - now.getDay();
        return new Date(now.getTime() + daysUntilWeekEnd * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}

/**
 * Convenience functions for common access patterns
  */

/**
 * Quick premium tier validation (replaces scattered validation)
  */
export async function requirePremiumTier(userId: string, tier: PremiumTier): Promise<void> {
  const service = FeatureAccessService.getInstance();
  const result = await service.validatePremiumTier(userId, tier);
  
  if (!result.hasAccess) {
    throw new HttpsError('permission-denied', result.message || 'Premium subscription required');
  }
}

/**
 * Quick feature access check (replaces duplicated checks)
  */
export async function requireFeatureAccess(
  userId: string, 
  feature: PremiumFeature,
  context: FeatureAccessContext = {}
): Promise<void> {
  const service = FeatureAccessService.getInstance();
  const result = await service.checkFeatureAccess(userId, feature, context);
  
  if (!result.hasAccess) {
    throw new HttpsError('permission-denied', result.message || 'Feature access denied');
  }
}

/**
 * Enforce feature gate (replaces boilerplate in functions)
  */
export async function enforceFeatureGate<T>(
  userId: string,
  feature: PremiumFeature,
  action: () => Promise<T>,
  context: FeatureAccessContext = {}
): Promise<T> {
  const service = FeatureAccessService.getInstance();
  
  // Check access first
  const accessResult = await service.checkFeatureAccess(userId, feature, context);
  if (!accessResult.hasAccess) {
    throw new HttpsError('permission-denied', accessResult.message || 'Feature access denied');
  }
  
  // Record usage
  await service.recordFeatureUsage(userId, feature, true, context);
  
  try {
    // Execute action
    const result = await action();
    return result;
  } catch (error) {
    // Record failure
    await service.recordFeatureUsage(userId, feature, false, { ...context, error: error.message });
    throw error;
  }
}