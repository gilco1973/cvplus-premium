/**
 * Premium Feature Guard Middleware for CVPlus Functions
 * Moved from i18n submodule to correct premium domain
  */
import * as functions from 'firebase-functions';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

export interface PremiumFeature {
  id: string;
  tier: 'basic' | 'premium' | 'enterprise';
  requiredPlan?: string;
}

// Legacy HTTP Request interface for backward compatibility
export interface AuthenticatedHTTPRequest extends functions.https.Request {
  user?: admin.auth.DecodedIdToken;
  uid?: string;
}

// Modern Callable Request interface
export interface AuthenticatedRequest extends CallableRequest {
  auth: {
    uid: string;
    token: admin.auth.DecodedIdToken;
  };
}

/**
 * Modern premium guard for v2 callable functions
  */
export const requirePremium = async (
  request: CallableRequest,
  featureId: string,
  requiredTier: 'basic' | 'premium' | 'enterprise' = 'premium'
): Promise<AuthenticatedRequest> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required for premium features');
  }

  try {
    const { uid } = request.auth;

    // Get user subscription data
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      logger.error('Premium guard: User not found', { uid, featureId });
      throw new HttpsError('not-found', 'User profile not found');
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    // Check if user has active subscription
    if (!subscription || !subscription.active) {
      logger.info('Premium feature access denied: No active subscription', {
        uid,
        featureId,
        requiredTier,
        hasSubscription: !!subscription,
        subscriptionActive: subscription?.active
      });

      throw new HttpsError('permission-denied', 'Premium subscription required', {
        feature: featureId,
        requiredTier,
        currentTier: 'basic',
        upgradeRequired: true
      });
    }

    // Verify subscription tier meets requirements
    const userTier = subscription.tier || 'basic';
    if (!hasRequiredTier(userTier, requiredTier)) {
      logger.info('Premium feature access denied: Insufficient tier', {
        uid,
        featureId,
        userTier,
        requiredTier
      });

      throw new HttpsError('permission-denied', 'Insufficient subscription tier', {
        feature: featureId,
        userTier,
        requiredTier,
        upgradeRequired: true
      });
    }

    // Check subscription expiry
    if (subscription.expiresAt && new Date(subscription.expiresAt.toDate()) < new Date()) {
      logger.warn('Premium feature access denied: Subscription expired', {
        uid,
        featureId,
        expiresAt: subscription.expiresAt.toDate()
      });

      throw new HttpsError('permission-denied', 'Subscription has expired', {
        feature: featureId,
        expired: true,
        renewalRequired: true
      });
    }

    logger.info('Premium feature access granted', {
      uid,
      featureId,
      userTier,
      requiredTier
    });

    return {
      ...request,
      auth: request.auth
    } as AuthenticatedRequest;

  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error('Premium guard validation failed', {
      error: error instanceof Error ? error.message : error,
      uid: request.auth.uid,
      featureId,
      stack: error instanceof Error ? error.stack : undefined
    });

    throw new HttpsError('internal', 'Premium feature validation failed');
  }
};

/**
 * Legacy HTTP premium guard for backward compatibility
  */
export const requirePremiumHTTP = (feature: PremiumFeature) => {
  return async (req: AuthenticatedHTTPRequest, res: functions.Response, next: () => void) => {
    try {
      if (!req.uid) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get user subscription data
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(req.uid)
        .get();

      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userData = userDoc.data();
      const subscription = userData?.subscription;

      // Check if user has required subscription tier
      if (!subscription || !subscription.active) {
        res.status(403).json({
          error: 'Premium subscription required',
          feature: feature.id,
          requiredTier: feature.tier
        });
        return;
      }

      // Verify subscription tier meets requirements
      const userTier = subscription.tier || 'basic';
      if (!hasRequiredTier(userTier, feature.tier)) {
        res.status(403).json({
          error: 'Insufficient subscription tier',
          userTier,
          requiredTier: feature.tier,
          feature: feature.id
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Premium guard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Check if user tier meets minimum requirement
  */
function hasRequiredTier(userTier: string, requiredTier: string): boolean {
  const tierHierarchy = ['basic', 'premium', 'enterprise'];
  const userLevel = tierHierarchy.indexOf(userTier);
  const requiredLevel = tierHierarchy.indexOf(requiredTier);

  return userLevel >= requiredLevel;
}

/**
 * Get user's current subscription tier
  */
export const getUserTier = async (userId: string): Promise<string> => {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const userData = userDoc.data();
    return userData?.subscription?.tier || 'basic';
  } catch (error) {
    logger.error('Error getting user tier', { error, userId });
    return 'basic';
  }
};

/**
 * Get detailed subscription information
  */
export const getSubscriptionInfo = async (userId: string) => {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    const subscription = userData?.subscription;

    if (!subscription) {
      return {
        tier: 'basic',
        active: false,
        features: []
      };
    }

    return {
      tier: subscription.tier || 'basic',
      active: subscription.active || false,
      expiresAt: subscription.expiresAt,
      features: subscription.features || [],
      plan: subscription.plan,
      status: subscription.status
    };
  } catch (error) {
    logger.error('Error getting subscription info', { error, userId });
    return null;
  }
};

/**
 * Higher-order function to wrap handlers with premium access checking
  */
export const withPremiumAccess = (feature: PremiumFeature) => {
  return (handler: (req: AuthenticatedHTTPRequest, res: functions.Response) => Promise<void>) => {
    return async (req: AuthenticatedHTTPRequest, res: functions.Response) => {
      const premiumMiddleware = requirePremiumHTTP(feature);

      return new Promise<void>((resolve, reject) => {
        premiumMiddleware(req, res, () => {
          handler(req, res).then(resolve).catch(reject);
        });
      });
    };
  };
};

/**
 * Check specific premium feature access
  */
export const checkFeatureAccess = async (
  userId: string,
  featureId: string
): Promise<{ hasAccess: boolean; reason?: string; upgradeRequired?: boolean }> => {
  try {
    const subscriptionInfo = await getSubscriptionInfo(userId);

    if (!subscriptionInfo) {
      return { hasAccess: false, reason: 'User not found', upgradeRequired: true };
    }

    if (!subscriptionInfo.active) {
      return { hasAccess: false, reason: 'No active subscription', upgradeRequired: true };
    }

    // Check if feature is included in current tier
    const tierFeatures = getTierFeatures(subscriptionInfo.tier);
    if (!tierFeatures.includes(featureId)) {
      return {
        hasAccess: false,
        reason: `Feature requires higher tier than ${subscriptionInfo.tier}`,
        upgradeRequired: true
      };
    }

    return { hasAccess: true };
  } catch (error) {
    logger.error('Error checking feature access', { error, userId, featureId });
    return { hasAccess: false, reason: 'Internal error' };
  }
};

/**
 * Get features available for a tier
  */
function getTierFeatures(tier: string): string[] {
  const featureMap: Record<string, string[]> = {
    basic: ['basicCV', 'basicExport'],
    premium: ['basicCV', 'basicExport', 'premiumTemplates', 'aiEnhancement', 'analytics'],
    enterprise: ['basicCV', 'basicExport', 'premiumTemplates', 'aiEnhancement', 'analytics', 'teamCollaboration', 'customBranding', 'apiAccess']
  };

  return featureMap[tier] || featureMap.basic;
}

/**
 * Legacy aliases for backward compatibility
  */
export const premiumGuard = requirePremiumHTTP;