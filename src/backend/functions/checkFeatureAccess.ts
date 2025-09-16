/**
 * CVPlus Payment Feature Access Check
 * Migrated from premium module
  */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '@cvplus/core/config/firebase';
import { corsOptions } from '@cvplus/core/config/cors';

// Import types from the main functions (where they actually exist)
import type { PremiumFeature } from '@cvplus/premium/types';
import { isValidPremiumFeature, requiresSubscription, getMinimumTier } from '@cvplus/premium/types';

interface CheckFeatureAccessData {
  feature: PremiumFeature;
  context?: {
    planId?: string;
    subscriptionStatus?: string;
    userId?: string;
  };
}

interface FeatureAccessResult {
  hasAccess: boolean;
  feature: PremiumFeature;
  reason?: string;
  requiredTier?: string;
  currentTier?: string;
  upgradeUrl?: string;
  gracePeriodEnd?: Date;
  usageLimit?: {
    current: number;
    limit: number;
    resetDate: Date;
  };
}

export const checkFeatureAccess = onCall<CheckFeatureAccessData>(
  {
    cors: corsOptions,
    enforceAppCheck: false,
    memory: '512MiB',
    timeoutSeconds: 30,
  },
  async (request): Promise<FeatureAccessResult> => {
    const { auth, data } = request;

    try {
      // Authentication check
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { feature, context } = data;

      // Input validation
      if (!feature || !isValidPremiumFeature(feature)) {
        throw new HttpsError('invalid-argument', 'Valid premium feature required');
      }

      logger.info(`Checking feature access for user ${auth.uid}`, {
        feature,
        context: context || 'no_context',
      });

      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(auth.uid).get();
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
      }

      const userData = userDoc.data();
      const subscription = userData?.subscription;

      // Check if feature requires subscription
      if (!requiresSubscription(feature)) {
        return {
          hasAccess: true,
          feature,
          reason: 'free_feature',
        };
      }

      // Check if user has active subscription
      if (!subscription || subscription.status !== 'active') {
        // Check for grace period
        const gracePeriod = await checkGracePeriod(auth.uid, feature);
        if (gracePeriod.hasGracePeriod) {
          return {
            hasAccess: true,
            feature,
            reason: 'grace_period',
            gracePeriodEnd: gracePeriod.endDate,
          };
        }

        return {
          hasAccess: false,
          feature,
          reason: 'no_subscription',
          requiredTier: getMinimumTier(feature),
          upgradeUrl: generateUpgradeUrl(feature),
        };
      }

      // Check subscription tier compatibility
      const requiredTier = getMinimumTier(feature);
      const currentTier = subscription.planId || 'free';

      const hasValidTier = checkTierCompatibility(currentTier, requiredTier);
      if (!hasValidTier) {
        return {
          hasAccess: false,
          feature,
          reason: 'insufficient_tier',
          requiredTier,
          currentTier,
          upgradeUrl: generateUpgradeUrl(feature),
        };
      }

      // Check usage limits for the feature
      const usageCheck = await checkUsageLimits(auth.uid, feature, currentTier);
      if (!usageCheck.withinLimits) {
        return {
          hasAccess: false,
          feature,
          reason: 'usage_limit_exceeded',
          usageLimit: {
            current: usageCheck.currentUsage,
            limit: usageCheck.limit,
            resetDate: usageCheck.resetDate,
          },
          upgradeUrl: generateUpgradeUrl(feature),
        };
      }

      // Check subscription expiry
      if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd.toDate()) {
        return {
          hasAccess: false,
          feature,
          reason: 'subscription_expired',
          upgradeUrl: generateUpgradeUrl(feature),
        };
      }

      // All checks passed
      logger.info(`Feature access granted for user ${auth.uid}`, {
        feature,
        tier: currentTier,
        usageRemaining: usageCheck.limit - usageCheck.currentUsage,
      });

      return {
        hasAccess: true,
        feature,
        reason: 'subscription_access',
        currentTier,
        usageLimit: usageCheck.limit > 0 ? {
          current: usageCheck.currentUsage,
          limit: usageCheck.limit,
          resetDate: usageCheck.resetDate,
        } : undefined,
      };

    } catch (error) {
      logger.error('Failed to check feature access', {
        userId: auth?.uid,
        feature: data.feature,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', 'Failed to check feature access');
    }
  }
);

// Helper functions - imported from main functions

/**
 * Check if user has grace period for a feature
  */
async function checkGracePeriod(
  userId: string, 
  feature: PremiumFeature
): Promise<{ hasGracePeriod: boolean; endDate?: Date }> {
  try {
    const gracePeriodDoc = await db
      .collection('users')
      .doc(userId)
      .collection('grace_periods')
      .doc(feature)
      .get();

    if (!gracePeriodDoc.exists) {
      return { hasGracePeriod: false };
    }

    const gracePeriodData = gracePeriodDoc.data();
    const endDate = gracePeriodData?.endDate?.toDate();

    if (!endDate || new Date() > endDate) {
      // Grace period expired, clean up
      await gracePeriodDoc.ref.delete();
      return { hasGracePeriod: false };
    }

    return {
      hasGracePeriod: true,
      endDate,
    };

  } catch (error) {
    logger.error('Failed to check grace period', {
      userId,
      feature,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { hasGracePeriod: false };
  }
}

/**
 * Check if current tier is compatible with required tier
  */
function checkTierCompatibility(currentTier: string, requiredTier: string): boolean {
  const tierHierarchy = ['free', 'basic', 'pro', 'enterprise'];
  
  const currentIndex = tierHierarchy.indexOf(currentTier);
  const requiredIndex = tierHierarchy.indexOf(requiredTier);

  // If either tier is not found, be permissive for now
  if (currentIndex === -1 || requiredIndex === -1) {
    return true;
  }

  return currentIndex >= requiredIndex;
}

/**
 * Check usage limits for a feature
  */
async function checkUsageLimits(
  userId: string, 
  feature: PremiumFeature, 
  planId: string
): Promise<{
  withinLimits: boolean;
  currentUsage: number;
  limit: number;
  resetDate: Date;
}> {
  try {
    // Get plan limits
    const planDoc = await db.collection('subscription_plans').doc(planId).get();
    const planData = planDoc.data();
    const featureLimits = planData?.features?.[feature]?.limits;

    if (!featureLimits) {
      // No limits defined, allow unlimited usage
      return {
        withinLimits: true,
        currentUsage: 0,
        limit: -1, // -1 indicates unlimited
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };
    }

    // Get current month's usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usageQuery = await db
      .collection('feature_usage')
      .where('userId', '==', userId)
      .where('feature', '==', feature)
      .where('timestamp', '>=', startOfMonth)
      .where('timestamp', '<=', endOfMonth)
      .get();

    const currentUsage = usageQuery.size;
    const limit = featureLimits.monthly || featureLimits.total || 0;

    return {
      withinLimits: limit === -1 || currentUsage < limit,
      currentUsage,
      limit,
      resetDate: endOfMonth,
    };

  } catch (error) {
    logger.error('Failed to check usage limits', {
      userId,
      feature,
      planId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // On error, be permissive
    return {
      withinLimits: true,
      currentUsage: 0,
      limit: -1,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}

/**
 * Generate upgrade URL for feature
  */
function generateUpgradeUrl(feature: PremiumFeature): string {
  const baseUrl = process.env.FRONTEND_URL || 'https://cvplus-webapp.web.app';
  const requiredTier = getMinimumTier(feature);
  
  return `${baseUrl}/billing/upgrade?feature=${feature}&tier=${requiredTier}`;
}