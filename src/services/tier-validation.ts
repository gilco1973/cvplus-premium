/**
 * CVPlus Premium Module - Tier Validation Service
 * 
 * Centralized tier checking logic extracted from individual Firebase Functions.
 * Eliminates duplicated premium tier validation patterns and provides
 * consistent tier-based access control.
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
  TierValidationResult,
  TierFeatureMatrix,
  TierLimits
} from '../types';

/**
 * Tier hierarchy for comparison
  */
const TIER_HIERARCHY: Record<PremiumTier, number> = {
  [PremiumTier.FREE]: 0,
  [PremiumTier.BASIC]: 1,
  [PremiumTier.PRO]: 2,
  [PremiumTier.ENTERPRISE]: 3
};

/**
 * Feature matrix defining what each tier can access
  */
const TIER_FEATURE_MATRIX: TierFeatureMatrix = {
  [PremiumTier.FREE]: {
    cvGeneration: { limit: 3, resetPeriod: 'monthly' },
    templates: { limit: 3, resetPeriod: 'unlimited' },
    analytics: { enabled: false },
    customBranding: { enabled: false },
    apiAccess: { enabled: false },
    prioritySupport: { enabled: false },
    teamCollaboration: { enabled: false }
  },
  [PremiumTier.BASIC]: {
    cvGeneration: { limit: 25, resetPeriod: 'monthly' },
    templates: { limit: 50, resetPeriod: 'unlimited' },
    analytics: { enabled: true, basic: true },
    customBranding: { enabled: false },
    apiAccess: { enabled: false },
    prioritySupport: { enabled: false },
    teamCollaboration: { enabled: false }
  },
  [PremiumTier.PRO]: {
    cvGeneration: { limit: 100, resetPeriod: 'monthly' },
    templates: { limit: -1, resetPeriod: 'unlimited' }, // unlimited
    analytics: { enabled: true, advanced: true },
    customBranding: { enabled: true },
    apiAccess: { enabled: true, limit: 1000, resetPeriod: 'monthly' },
    prioritySupport: { enabled: true },
    teamCollaboration: { enabled: true, limit: 5 }
  },
  [PremiumTier.ENTERPRISE]: {
    cvGeneration: { limit: -1, resetPeriod: 'unlimited' }, // unlimited
    templates: { limit: -1, resetPeriod: 'unlimited' }, // unlimited
    analytics: { enabled: true, advanced: true, custom: true },
    customBranding: { enabled: true, whiteLabel: true },
    apiAccess: { enabled: true, limit: 10000, resetPeriod: 'monthly' },
    prioritySupport: { enabled: true, dedicated: true },
    teamCollaboration: { enabled: true, limit: -1 } // unlimited
  }
};

/**
 * Centralized Tier Validation Service
  */
export class TierValidationService {
  private static instance: TierValidationService;
  private cache = new Map<string, { tier: PremiumTier; timestamp: number }>();
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  /**
   * Singleton instance
    */
  public static getInstance(): TierValidationService {
    if (!TierValidationService.instance) {
      TierValidationService.instance = new TierValidationService();
    }
    return TierValidationService.instance;
  }

  /**
   * Validate if user's tier meets minimum requirement
   * Replaces scattered tier validation across Firebase Functions
    */
  async validateMinimumTier(
    userId: string,
    requiredTier: PremiumTier
  ): Promise<TierValidationResult> {
    try {
      const userTier = await this.getUserTierCached(userId);
      const hasAccess = this.compareTiers(userTier, requiredTier) >= 0;

      return {
        hasAccess,
        userTier,
        requiredTier,
        message: hasAccess 
          ? 'Tier requirement met' 
          : `Requires ${requiredTier} tier or higher`,
        upgradeRequired: !hasAccess
      };

    } catch (error) {
      logger.error('Tier validation failed', { error, userId, requiredTier });
      throw new HttpsError('internal', 'Tier validation failed');
    }
  }

  /**
   * Check if user has exact tier match
    */
  async validateExactTier(
    userId: string,
    requiredTier: PremiumTier
  ): Promise<TierValidationResult> {
    try {
      const userTier = await this.getUserTierCached(userId);
      const hasAccess = userTier === requiredTier;

      return {
        hasAccess,
        userTier,
        requiredTier,
        message: hasAccess 
          ? 'Exact tier match' 
          : `Requires exactly ${requiredTier} tier`,
        upgradeRequired: !hasAccess
      };

    } catch (error) {
      logger.error('Exact tier validation failed', { error, userId, requiredTier });
      throw new HttpsError('internal', 'Tier validation failed');
    }
  }

  /**
   * Get feature limits for user's tier
    */
  async getTierFeatureLimits(
    userId: string,
    feature: keyof TierFeatureMatrix[PremiumTier]
  ): Promise<TierLimits> {
    try {
      const userTier = await this.getUserTierCached(userId);
      const featureLimits = TIER_FEATURE_MATRIX[userTier][feature];

      return {
        tier: userTier,
        feature,
        limits: featureLimits,
        hasAccess: featureLimits.enabled !== false
      };

    } catch (error) {
      logger.error('Failed to get tier limits', { error, userId, feature });
      throw new HttpsError('internal', 'Failed to retrieve tier limits');
    }
  }

  /**
   * Check if user can upgrade to target tier
    */
  async canUpgradeTo(
    userId: string,
    targetTier: PremiumTier
  ): Promise<{ canUpgrade: boolean; reason?: string }> {
    try {
      const currentTier = await this.getUserTierCached(userId);
      const currentLevel = TIER_HIERARCHY[currentTier];
      const targetLevel = TIER_HIERARCHY[targetTier];

      if (targetLevel <= currentLevel) {
        return {
          canUpgrade: false,
          reason: targetLevel === currentLevel 
            ? 'Already on target tier' 
            : 'Cannot downgrade'
        };
      }

      // Check if upgrade path is valid
      const validUpgradePaths = this.getValidUpgradePaths(currentTier);
      const canUpgrade = validUpgradePaths.includes(targetTier);

      return {
        canUpgrade,
        reason: canUpgrade 
          ? 'Upgrade available' 
          : 'Invalid upgrade path'
      };

    } catch (error) {
      logger.error('Upgrade validation failed', { error, userId, targetTier });
      return { canUpgrade: false, reason: 'Validation failed' };
    }
  }

  /**
   * Get recommended tier for user based on usage patterns
    */
  async getRecommendedTier(userId: string): Promise<{
    recommendedTier: PremiumTier;
    reason: string;
    costSavings?: number;
  }> {
    try {
      // Analyze user usage patterns
      const usageData = await this.getUserUsageData(userId);
      const currentTier = await this.getUserTierCached(userId);

      // Simple recommendation logic based on usage
      if (usageData.cvGenerationsPerMonth > 50) {
        return {
          recommendedTier: PremiumTier.PRO,
          reason: 'High CV generation usage detected'
        };
      }

      if (usageData.hasTeamCollaboration) {
        return {
          recommendedTier: PremiumTier.PRO,
          reason: 'Team collaboration features needed'
        };
      }

      if (usageData.needsApiAccess) {
        return {
          recommendedTier: PremiumTier.PRO,
          reason: 'API access required for integration'
        };
      }

      return {
        recommendedTier: currentTier,
        reason: 'Current tier meets your needs'
      };

    } catch (error) {
      logger.error('Tier recommendation failed', { error, userId });
      return {
        recommendedTier: PremiumTier.BASIC,
        reason: 'Unable to analyze usage - Basic tier recommended'
      };
    }
  }

  /**
   * Bulk tier validation for multiple users
    */
  async validateMultipleUsers(
    userIds: string[],
    requiredTier: PremiumTier
  ): Promise<Map<string, TierValidationResult>> {
    const results = new Map<string, TierValidationResult>();

    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchPromises = batch.map(userId =>
        this.validateMinimumTier(userId, requiredTier)
          .then(result => ({ userId, result }))
          .catch(error => ({ userId, result: { 
            hasAccess: false, 
            userTier: PremiumTier.FREE, 
            requiredTier,
            message: 'Validation failed',
            upgradeRequired: true
          } as TierValidationResult }))
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ userId, result }) => {
        results.set(userId, result);
      });
    }

    return results;
  }

  /**
   * Get user tier with caching
    */
  private async getUserTierCached(userId: string): Promise<PremiumTier> {
    const cacheKey = `tier:${userId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.tier;
    }

    try {
      const subscriptionDoc = await db
        .collection('userSubscriptions')
        .doc(userId)
        .get();

      const tier = subscriptionDoc.exists 
        ? (subscriptionDoc.data()?.tier || PremiumTier.FREE)
        : PremiumTier.FREE;

      // Cache the result
      this.cache.set(cacheKey, {
        tier,
        timestamp: Date.now()
      });

      return tier;

    } catch (error) {
      logger.error('Failed to fetch user tier', { error, userId });
      return PremiumTier.FREE; // Fail safe
    }
  }

  /**
   * Compare two tiers (-1: lower, 0: equal, 1: higher)
    */
  private compareTiers(userTier: PremiumTier, requiredTier: PremiumTier): number {
    const userLevel = TIER_HIERARCHY[userTier];
    const requiredLevel = TIER_HIERARCHY[requiredTier];
    return userLevel - requiredLevel;
  }

  /**
   * Get valid upgrade paths from current tier
    */
  private getValidUpgradePaths(currentTier: PremiumTier): PremiumTier[] {
    switch (currentTier) {
      case PremiumTier.FREE:
        return [PremiumTier.BASIC, PremiumTier.PRO, PremiumTier.ENTERPRISE];
      case PremiumTier.BASIC:
        return [PremiumTier.PRO, PremiumTier.ENTERPRISE];
      case PremiumTier.PRO:
        return [PremiumTier.ENTERPRISE];
      case PremiumTier.ENTERPRISE:
        return []; // Already at top tier
      default:
        return [];
    }
  }

  /**
   * Get user usage data for recommendation engine
    */
  private async getUserUsageData(userId: string): Promise<{
    cvGenerationsPerMonth: number;
    hasTeamCollaboration: boolean;
    needsApiAccess: boolean;
  }> {
    try {
      // Query usage data from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const usageSnapshot = await db
        .collection('featureUsage')
        .where('userId', '==', userId)
        .where('timestamp', '>=', thirtyDaysAgo)
        .get();

      let cvGenerations = 0;
      let hasTeamCollaboration = false;
      let needsApiAccess = false;

      usageSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.feature === 'advanced_cv_generation') {
          cvGenerations++;
        }
        if (data.feature === 'team_collaboration') {
          hasTeamCollaboration = true;
        }
        if (data.context?.apiCall) {
          needsApiAccess = true;
        }
      });

      return {
        cvGenerationsPerMonth: cvGenerations,
        hasTeamCollaboration,
        needsApiAccess
      };

    } catch (error) {
      logger.error('Failed to get usage data', { error, userId });
      return {
        cvGenerationsPerMonth: 0,
        hasTeamCollaboration: false,
        needsApiAccess: false
      };
    }
  }

  /**
   * Clear cache for user
    */
  public clearUserCache(userId: string): void {
    const cacheKey = `tier:${userId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Get tier comparison matrix for frontend
    */
  public static getTierComparisonMatrix(): TierFeatureMatrix {
    return TIER_FEATURE_MATRIX;
  }
}

/**
 * Convenience functions for common tier validations
  */

/**
 * Quick tier requirement enforcement
  */
export async function requireTier(userId: string, tier: PremiumTier): Promise<void> {
  const service = TierValidationService.getInstance();
  const result = await service.validateMinimumTier(userId, tier);
  
  if (!result.hasAccess) {
    throw new HttpsError('permission-denied', result.message);
  }
}

/**
 * Check if user is premium (any paid tier)
  */
export async function requirePremium(userId: string): Promise<void> {
  await requireTier(userId, PremiumTier.BASIC);
}

/**
 * Check if user is enterprise
  */
export async function requireEnterprise(userId: string): Promise<void> {
  await requireTier(userId, PremiumTier.ENTERPRISE);
}