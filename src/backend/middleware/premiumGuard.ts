import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
// TEMPORARILY DISABLED FOR DEPLOYMENT

// Temporary placeholder function for deployment
const getUserSubscriptionInternal = async (userId: string) => {
  return { subscriptionStatus: 'free', lifetimeAccess: false };
};
import { subscriptionManagementService } from '../services/subscription-management.service';
import { requireAuth, AuthenticatedRequest } from './authGuard';

type PremiumFeature = 'webPortal' | 'aiChat' | 'podcast' | 'advancedAnalytics' | 'videoIntroduction' | 'roleDetection' | 'externalData';

export const premiumGuard = (feature: PremiumFeature) => {
  return async (request: any): Promise<AuthenticatedRequest> => {
    // First ensure user is authenticated
    const authenticatedRequest = await requireAuth(request);
    const { uid } = authenticatedRequest.auth;

    try {
      logger.debug('Premium access check initiated', { uid, feature });

      // Get user subscription with caching for improved performance
      const subscription = await getUserSubscriptionInternal(uid);
      
      logger.debug('Subscription data retrieved from cache', {
        uid,
        hasSubscription: !!subscription,
        lifetimeAccess: subscription?.lifetimeAccess,
        subscriptionStatus: subscription?.subscriptionStatus,
        hasRequestedFeature: subscription?.features?.[feature]
      });

      // Check for lifetime premium access
      if (!subscription?.lifetimeAccess) {
        logger.warn('Premium access denied: No lifetime access', {
          uid,
          feature,
          subscriptionStatus: subscription?.subscriptionStatus,
          hasSubscription: !!subscription
        });

        throw new HttpsError(
          'permission-denied',
          `This feature requires lifetime premium access. Please upgrade to access '${feature}'.`,
          {
            feature,
            upgradeUrl: '/pricing',
            accessType: 'lifetime',
            currentStatus: subscription?.subscriptionStatus || 'free',
            reason: 'no-lifetime-access'
          }
        );
      }

      // Check specific feature access
      if (!subscription?.features?.[feature]) {
        logger.warn('Premium access denied: Feature not included', {
          uid,
          feature,
          availableFeatures: subscription.features ? Object.keys(subscription.features) : [],
          lifetimeAccess: subscription.lifetimeAccess
        });

        throw new HttpsError(
          'permission-denied',
          `Your premium subscription does not include access to '${feature}'. Please upgrade your plan.`,
          {
            feature,
            upgradeUrl: '/pricing',
            availableFeatures: subscription.features || {},
            reason: 'feature-not-included'
          }
        );
      }

      logger.debug('Premium access granted', {
        uid,
        feature,
        subscriptionStatus: subscription.subscriptionStatus
      });

      return authenticatedRequest;

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Premium guard error', { 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        uid, 
        feature 
      });
      
      throw new HttpsError(
        'internal',
        'Failed to verify premium access',
        { 
          feature, 
          originalError: error instanceof Error ? error.message : 'Unknown error',
          uid
        }
      );
    }
  };
};

// Enhanced wrapper with better error context and request handling
export const withPremiumAccess = (feature: PremiumFeature, handler: Function) => {
  return async (request: any, context?: any) => {
    const startTime = Date.now();
    
    try {
      logger.debug('Premium function execution started', {
        feature,
        uid: request.auth?.uid,
        hasData: !!request.data
      });

      // Check premium access and authenticate
      const authenticatedRequest = await premiumGuard(feature)(request);
      
      // Execute the original handler with authenticated request
      const result = await handler(authenticatedRequest, context);
      
      const executionTime = Date.now() - startTime;
      logger.debug('Premium function execution completed', {
        feature,
        uid: authenticatedRequest.auth.uid,
        executionTime,
        hasResult: !!result
      });
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (error instanceof HttpsError) {
        logger.warn('Premium function execution failed with known error', {
          feature,
          uid: request.auth?.uid,
          executionTime,
          errorCode: error.code,
          errorMessage: error.message
        });
        throw error;
      }
      
      logger.error('Premium function execution failed with unknown error', {
        feature,
        uid: request.auth?.uid,
        executionTime,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      });
      
      throw new HttpsError(
        'internal',
        `Failed to execute premium function: ${feature}`,
        {
          feature,
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    }
  };
};

// Helper to check multiple features
export const requireAnyPremiumFeature = (features: PremiumFeature[]) => {
  return async (request: any) => {
    const authenticatedRequest = await requireAuth(request);
    const { uid } = authenticatedRequest.auth;

    try {
      logger.debug('Multiple premium features check initiated', { uid, features });
      
      // Use cached subscription service for better performance
      const subscription = await getUserSubscriptionInternal(uid);

      if (!subscription?.lifetimeAccess) {
        throw new HttpsError(
          'permission-denied',
          'Lifetime premium access required',
          { 
            upgradeUrl: '/pricing',
            requiredFeatures: features,
            reason: 'no-lifetime-access'
          }
        );
      }

      // Check if user has access to any of the required features
      const availableFeatures = Object.keys(subscription.features || {});
      const hasAnyFeature = features.some(feature => 
        subscription.features?.[feature] === true
      );

      if (!hasAnyFeature) {
        logger.warn('Multiple premium features access denied', {
          uid,
          requiredFeatures: features,
          availableFeatures
        });
        
        throw new HttpsError(
          'permission-denied',
          `Access denied. Requires one of: ${features.join(', ')}`,
          { 
            requiredFeatures: features,
            availableFeatures: subscription.features || {},
            reason: 'insufficient-features'
          }
        );
      }

      logger.debug('Multiple premium features access granted', {
        uid,
        requiredFeatures: features,
        grantedFeatures: availableFeatures
      });

      return authenticatedRequest;
      
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Error checking multiple premium features', { 
        error: error instanceof Error ? error.message : error,
        uid, 
        features 
      });
      
      throw new HttpsError(
        'internal', 
        'Failed to verify premium access',
        {
          requiredFeatures: features,
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    }
  };
};
