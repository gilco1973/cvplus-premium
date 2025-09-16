/**
 * Premium Guard Middleware
 * Moved from Core module to maintain architectural compliance
 * Author: Gil Klainert
 * Date: 2025-08-29
  */

import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { 
  IPremiumGuard, 
  AuthenticatedRequest, 
  PremiumGuardOptions,
  MiddlewareResult,
  IMiddleware,
  FeatureAccessError
} from '@cvplus/core';
import { SubscriptionManagementService } from '../backend/services/subscription-management.service';

// Import from payments module for internal subscription logic
// TEMPORARILY DISABLED FOR DEPLOYMENT

// Temporary placeholder function for deployment
const getUserSubscriptionInternal = async (userId: string) => {
  return { subscriptionStatus: 'free', lifetimeAccess: false };
};

type PremiumFeature = 
  | 'webPortal' 
  | 'aiChat' 
  | 'podcast' 
  | 'advancedAnalytics' 
  | 'videoIntroduction' 
  | 'roleDetection' 
  | 'externalData';

/**
 * Premium Guard Implementation
 * Implements the IPremiumGuard interface from Core
  */
export class PremiumGuardService implements IPremiumGuard {
  private subscriptionManagementService: SubscriptionManagementService;

  constructor() {
    this.subscriptionManagementService = new SubscriptionManagementService();
  }

  /**
   * Check premium access for a user and feature
    */
  async checkPremiumAccess(
    userId: string,
    featureId: string,
    options: PremiumGuardOptions = {}
  ): Promise<MiddlewareResult> {
    try {
      logger.debug('Premium access check initiated', { userId, featureId, options });

      // Get user subscription with caching for improved performance
      const subscription = await getUserSubscriptionInternal(userId);
      
      logger.debug('Subscription data retrieved from cache', {
        userId,
        hasSubscription: !!subscription,
        lifetimeAccess: subscription?.lifetimeAccess,
        subscriptionStatus: subscription?.subscriptionStatus,
        hasRequestedFeature: subscription?.features?.[featureId]
      });

      // Check for lifetime premium access
      if (!subscription?.lifetimeAccess) {
        logger.warn('Premium access denied: No lifetime access', {
          userId,
          featureId,
          subscriptionStatus: subscription?.subscriptionStatus,
          hasSubscription: !!subscription
        });

        return {
          allowed: false,
          reason: 'no-lifetime-access',
          details: {
            featureId,
            upgradeUrl: '/pricing',
            accessType: 'lifetime',
            currentStatus: subscription?.subscriptionStatus || 'free'
          }
        };
      }

      // Check specific feature access
      if (!subscription?.features?.[featureId]) {
        logger.warn('Premium access denied: Feature not included', {
          userId,
          featureId,
          availableFeatures: subscription.features ? Object.keys(subscription.features) : [],
          lifetimeAccess: subscription.lifetimeAccess
        });

        return {
          allowed: false,
          reason: 'feature-not-included',
          details: {
            featureId,
            upgradeUrl: '/pricing',
            availableFeatures: subscription.features || {}
          }
        };
      }

      logger.debug('Premium access granted', {
        userId,
        featureId,
        subscriptionStatus: subscription.subscriptionStatus
      });

      return {
        allowed: true,
        details: {
          subscriptionStatus: subscription.subscriptionStatus,
          lifetimeAccess: subscription.lifetimeAccess
        }
      };

    } catch (error) {
      logger.error('Premium guard error', { 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        userId, 
        featureId 
      });
      
      return {
        allowed: false,
        reason: 'system-error',
        details: {
          featureId,
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Create Express middleware for premium access control
    */
  createMiddleware(featureId: string, options: PremiumGuardOptions = {}): IMiddleware {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      try {
        // Ensure we have authentication
        if (!req.auth?.uid) {
          throw new FeatureAccessError(
            'Authentication required for premium features',
            { featureId, reason: 'not-authenticated' }
          );
        }

        logger.debug('Premium function execution started', {
          featureId,
          userId: req.auth.uid,
          hasData: !!req.data
        });

        // Check premium access
        const result = await this.checkPremiumAccess(req.auth.uid, featureId, options);
        
        if (!result.allowed) {
          const executionTime = Date.now() - startTime;
          logger.warn('Premium function execution failed with access denied', {
            featureId,
            userId: req.auth.uid,
            executionTime,
            reason: result.reason
          });

          throw new FeatureAccessError(
            options.customErrorMessage || `This feature requires premium access: ${featureId}`,
            {
              featureId,
              upgradeUrl: '/pricing',
              accessType: 'lifetime',
              reason: result.reason,
              ...result.details
            }
          );
        }
        
        const executionTime = Date.now() - startTime;
        logger.debug('Premium access check completed successfully', {
          featureId,
          userId: req.auth.uid,
          executionTime
        });
        
        next();
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        if (error instanceof FeatureAccessError) {
          logger.warn('Premium function execution failed with known error', {
            featureId,
            userId: req.auth?.uid,
            executionTime,
            errorMessage: error.message
          });

          return res.status(403).json({
            error: error.message,
            code: error.code,
            details: error.details
          });
        }
        
        logger.error('Premium function execution failed with unknown error', {
          featureId,
          userId: req.auth?.uid,
          executionTime,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error
        });
        
        return res.status(500).json({
          error: `Failed to verify premium access: ${featureId}`,
          code: 'SYSTEM_ERROR',
          details: {
            featureId,
            originalError: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    };
  }
}

// Create singleton instance
export const premiumGuardService = new PremiumGuardService();

// Legacy function-based interface for backward compatibility
export const premiumGuard = (feature: PremiumFeature) => {
  return premiumGuardService.createMiddleware(feature);
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

      // Check premium access
      const result = await premiumGuardService.checkPremiumAccess(
        request.auth?.uid,
        feature
      );

      if (!result.allowed) {
        throw new HttpsError(
          'permission-denied',
          `This feature requires premium access: ${feature}`,
          {
            feature,
            upgradeUrl: '/pricing',
            accessType: 'lifetime',
            reason: result.reason,
            ...result.details
          }
        );
      }
      
      // Execute the original handler
      const handlerResult = await handler(request, context);
      
      const executionTime = Date.now() - startTime;
      logger.debug('Premium function execution completed', {
        feature,
        uid: request.auth.uid,
        executionTime,
        hasResult: !!handlerResult
      });
      
      return handlerResult;
      
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
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = request.auth.uid;

    try {
      logger.debug('Multiple premium features check initiated', { userId, features });
      
      // Check each feature until one is found
      for (const feature of features) {
        const result = await premiumGuardService.checkPremiumAccess(userId, feature);
        if (result.allowed) {
          logger.debug('Multiple premium features access granted', {
            userId,
            requiredFeatures: features,
            grantedFeature: feature
          });
          return request; // Return early on first success
        }
      }

      // None of the features are available
      logger.warn('Multiple premium features access denied', {
        userId,
        requiredFeatures: features
      });

      throw new HttpsError(
        'permission-denied',
        `Access denied. Requires one of: ${features.join(', ')}`,
        { 
          requiredFeatures: features,
          upgradeUrl: '/pricing',
          reason: 'insufficient-features'
        }
      );
      
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Error checking multiple premium features', { 
        error: error instanceof Error ? error.message : error,
        userId, 
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