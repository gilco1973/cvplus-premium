import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '../../config/firebase';

import type { PremiumFeature } from '../../types/premium-features';
import { isValidPremiumFeature, requiresSubscription, getMinimumTier } from '../../types/premium-features';

interface CheckFeatureAccessData {
  userId: string;
  googleId: string;
  feature: PremiumFeature;
}

export const checkFeatureAccess = onCall<CheckFeatureAccessData>(
  {
    cors: true
  },
  async (request) => {
    const { data, auth } = request;

    // Verify authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Verify user matches the authenticated user
    if (auth.uid !== data.userId) {
      throw new HttpsError('permission-denied', 'User ID mismatch');
    }

    const { userId, googleId, feature } = data;

    try {
      // Get user subscription from Firestore
      const subscriptionDoc = await db
        .collection('userSubscriptions')
        .doc(userId)
        .get();

      if (!subscriptionDoc.exists) {
        return {
          hasAccess: false,
          subscriptionStatus: 'free',
          lifetimeAccess: false,
          message: 'No subscription found'
        };
      }

      const subscriptionData = subscriptionDoc.data()!;

      // Verify Google account matches (security check)
      if (subscriptionData.googleId !== googleId) {
        logger.warn('Google ID mismatch for premium access', {
          userId,
          expectedGoogleId: subscriptionData.googleId,
          providedGoogleId: googleId
        });
        
        throw new HttpsError(
          'permission-denied',
          'Google account verification failed'
        );
      }

      // Check if user has lifetime access
      if (!subscriptionData.lifetimeAccess) {
        return {
          hasAccess: false,
          subscriptionStatus: subscriptionData.subscriptionStatus || 'free',
          lifetimeAccess: false,
          message: 'Lifetime premium access required'
        };
      }

      // Check if specific feature is included
      const hasFeatureAccess = subscriptionData.features?.[feature] === true;

      logger.info('Feature access checked', {
        userId,
        feature,
        hasAccess: hasFeatureAccess,
        lifetimeAccess: subscriptionData.lifetimeAccess
      });

      return {
        hasAccess: hasFeatureAccess,
        subscriptionStatus: subscriptionData.subscriptionStatus,
        lifetimeAccess: subscriptionData.lifetimeAccess,
        features: subscriptionData.features,
        purchasedAt: subscriptionData.purchasedAt,
        googleAccountVerified: subscriptionData.metadata?.accountVerification?.verifiedAt,
        message: hasFeatureAccess 
          ? 'Access granted - lifetime premium user'
          : `Feature '${feature}' not included in subscription`
      };

    } catch (error) {
      logger.error(null, { error: (error as Error), userId, feature });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to check feature access',
        error
      );
    }
  }
);