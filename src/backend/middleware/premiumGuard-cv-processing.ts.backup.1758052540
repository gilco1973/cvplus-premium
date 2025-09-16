/**
 * Premium Feature Guard Middleware for CV Processing Functions
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from './authGuard';

export interface PremiumFeature {
  id: string;
  tier: 'basic' | 'premium' | 'enterprise';
  requiredPlan?: string;
}

/**
 * Check if user has access to premium features
 */
export const requirePremium = (feature: PremiumFeature) => {
  return async (req: AuthenticatedRequest, res: functions.Response, next: () => void) => {
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
    console.error('Error getting user tier:', error);
    return 'basic';
  }
};

/**
 * Higher-order function to wrap handlers with premium access checking
 */
export const withPremiumAccess = (feature: PremiumFeature) => {
  return (handler: (req: AuthenticatedRequest, res: functions.Response) => Promise<void>) => {
    return async (req: AuthenticatedRequest, res: functions.Response) => {
      const premiumMiddleware = requirePremium(feature);
      
      return new Promise<void>((resolve, reject) => {
        premiumMiddleware(req, res, () => {
          handler(req, res).then(resolve).catch(reject);
        });
      });
    };
  };
};