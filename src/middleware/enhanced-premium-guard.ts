/**
 * Enhanced Premium Guard Middleware
 * Comprehensive backend protection for premium features
 * Moved from Core module to maintain architectural compliance
 * Author: Gil Klainert
 * Date: 2025-08-29
  */

import { Request, Response, NextFunction } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import {
  AuthenticatedRequest,
  UserSubscription,
  Feature,
  UsageCheckResult,
  UpgradeOption,
  SecurityEvent,
  IMiddleware
} from '@cvplus/core';
import { SecureRateLimitGuard, SecurityMonitorService } from '../backend/services/security';
import { FeatureRegistry } from '../services/feature-registry';

const rateLimitGuard = new SecureRateLimitGuard();
const securityMonitor = new SecurityMonitorService();
const featureRegistry = new FeatureRegistry();

interface PremiumGuardOptions {
  requiredFeature: string;
  gracePeriodDays?: number;
  customErrorMessage?: string;
  trackUsage?: boolean;
  allowGracePeriod?: boolean;
  rateLimitPerMinute?: number;
}

interface UsageRecord {
  userId: string;
  featureId: string;
  timestamp: number;
  apiEndpoint: string;
  success: boolean;
  executionTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced Premium Guard Middleware Factory
  */
export function enhancedPremiumGuard(options: PremiumGuardOptions): IMiddleware {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    try {
      // Extract user information from request
      const userId = req.user?.uid || req.auth?.uid;
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          featureId: options.requiredFeature,
          upgradeUrl: `/pricing?feature=${options.requiredFeature}`
        });
      }

      // Get feature configuration
      const feature = featureRegistry.getFeature(options.requiredFeature);
      if (!feature) {
        logger.error(`Feature not found: ${options.requiredFeature}`);
        return res.status(500).json({
          error: 'Internal server error',
          code: 'FEATURE_NOT_FOUND'
        });
      }

      // Check rate limiting first - using secure service
      if (options.rateLimitPerMinute) {
        const rateLimitCheck = await rateLimitGuard.checkRateLimit(userId, options.requiredFeature, {
          limitPerMinute: options.rateLimitPerMinute
        });
        if (!rateLimitCheck.allowed) {
          await trackUsageEvent({
            userId,
            featureId: options.requiredFeature,
            timestamp: Date.now(),
            apiEndpoint: req.path,
            success: false,
            error: 'Rate limit exceeded',
            metadata: {
              rateLimitInfo: rateLimitCheck,
              userAgent: req.headers['user-agent'],
              ip: req.ip
            }
          });

          return res.status(429).json({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: rateLimitCheck.retryAfter,
            featureId: options.requiredFeature
          });
        }
      }

      // Get user subscription with caching
      const subscription = await getUserSubscription(userId);
      
      // Check basic feature access
      const hasBasicAccess = checkBasicFeatureAccess(feature, subscription);
      
      if (!hasBasicAccess.allowed) {
        // Check grace period if enabled
        if (options.allowGracePeriod && subscription) {
          const gracePeriodCheck = await checkGracePeriod(subscription, options.gracePeriodDays || 7);
          
          if (gracePeriodCheck.inGracePeriod) {
            logger.info(`Grace period access granted for user ${userId}, feature ${options.requiredFeature}`);
            
            // Track grace period usage
            await trackUsageEvent({
              userId,
              featureId: options.requiredFeature,
              timestamp: Date.now(),
              apiEndpoint: req.path,
              success: true,
              metadata: {
                accessType: 'grace_period',
                gracePeriodEnd: gracePeriodCheck.endDate,
                remainingDays: gracePeriodCheck.remainingDays
              }
            });

            // Add grace period info to request for downstream processing
            req.user = {
              ...req.user,
              gracePeriodAccess: true,
              gracePeriodEnd: gracePeriodCheck.endDate
            };

            return next();
          }
        }

        // Track blocked access attempt with security monitoring
        await trackUsageEvent({
          userId,
          featureId: options.requiredFeature,
          timestamp: Date.now(),
          apiEndpoint: req.path,
          success: false,
          error: hasBasicAccess.reason,
          metadata: {
            currentTier: subscription?.tier || 'none',
            requiredTier: feature.tier,
            userAgent: req.headers['user-agent'],
            ip: req.ip
          }
        });

        // Log security event for unauthorized access attempt
        await securityMonitor.logSecurityEvent({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          severity: 'HIGH',
          userId,
          featureId: options.requiredFeature,
          service: 'EnhancedPremiumGuard',
          message: `Unauthorized access attempt to premium feature: ${options.requiredFeature}`,
          details: {
            reason: hasBasicAccess.reason,
            currentTier: subscription?.tier || 'none',
            requiredTier: feature.tier,
            endpoint: req.path,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
          }
        });

        return res.status(403).json({
          error: options.customErrorMessage || 'Premium feature required',
          code: 'PREMIUM_REQUIRED',
          featureId: options.requiredFeature,
          details: {
            featureName: feature.name,
            featureDescription: feature.description,
            currentPlan: subscription?.tier || 'free',
            requiredPlan: feature.tier,
            reason: hasBasicAccess.reason
          },
          upgradeUrl: `/pricing?feature=${options.requiredFeature}&reason=${hasBasicAccess.reason}`
        });
      }

      // Check usage limits
      if (subscription && feature.usageLimits) {
        const usageCheck = await checkUsageLimits(userId, options.requiredFeature, subscription);
        
        if (!usageCheck.withinLimits) {
          await trackUsageEvent({
            userId,
            featureId: options.requiredFeature,
            timestamp: Date.now(),
            apiEndpoint: req.path,
            success: false,
            error: 'Usage limit exceeded',
            metadata: {
              currentUsage: usageCheck.currentUsage,
              limit: usageCheck.limit,
              resetDate: usageCheck.resetDate
            }
          });

          return res.status(429).json({
            error: 'Usage limit exceeded',
            code: 'USAGE_LIMIT_EXCEEDED',
            featureId: options.requiredFeature,
            details: {
              currentUsage: usageCheck.currentUsage,
              limit: usageCheck.limit,
              resetDate: usageCheck.resetDate,
              upgradeOptions: usageCheck.upgradeOptions
            },
            upgradeUrl: `/pricing?feature=${options.requiredFeature}&reason=usage_limit`
          });
        }
      }

      // Track successful access
      if (options.trackUsage !== false) {
        await trackUsageEvent({
          userId,
          featureId: options.requiredFeature,
          timestamp: Date.now(),
          apiEndpoint: req.path,
          success: true,
          executionTime: Date.now() - startTime,
          metadata: {
            tier: subscription?.tier,
            userAgent: req.headers['user-agent'],
            ip: req.ip
          }
        });
      }

      // Add subscription info to request for downstream use
      req.user = {
        ...req.user,
        subscription,
        premiumAccess: true
      };

      next();

    } catch (error) {
      logger.error('Premium guard error:', error);
      
      // Track error
      if (req.user?.uid || req.auth?.uid) {
        await trackUsageEvent({
          userId: req.user?.uid || req.auth?.uid || 'unknown',
          featureId: options.requiredFeature,
          timestamp: Date.now(),
          apiEndpoint: req.path,
          success: false,
          error: (error as Error).message,
          metadata: {
            errorType: 'system_error',
            stack: (error as Error).stack
          }
        });
      }

      return res.status(500).json({
        error: 'Internal server error during access check',
        code: 'SYSTEM_ERROR',
        featureId: options.requiredFeature
      });
    }
  };
}

/**
 * Helper Functions
  */

async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const db = getFirestore();
    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get();
    
    if (!subscriptionDoc.exists) {
      return null;
    }

    const data = subscriptionDoc.data();
    return {
      tier: data?.tier || 'free',
      status: data?.status || 'active',
      features: data?.features || [],
      expiresAt: data?.expiresAt?.toDate(),
      gracePeriodEnd: data?.gracePeriodEnd?.toDate(),
      limits: data?.limits || {
        monthlyUploads: 3,
        cvGenerations: 5,
        featuresPerCV: 2,
        apiCallsPerMonth: 20
      },
      stripeSubscriptionId: data?.stripeSubscriptionId
    };
  } catch (error) {
    logger.error('Error fetching subscription:', error);
    return null;
  }
}

function checkBasicFeatureAccess(feature: Feature, subscription: UserSubscription | null): {
  allowed: boolean;
  reason?: string;
} {
  if (!subscription) {
    return {
      allowed: feature.tier === 'free',
      reason: feature.tier !== 'free' ? 'no_subscription' : undefined
    };
  }

  // Check tier access
  const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
  const requiredLevel = tierHierarchy[feature.tier as keyof typeof tierHierarchy];
  const userLevel = tierHierarchy[subscription.tier];

  if (userLevel < requiredLevel) {
    return {
      allowed: false,
      reason: 'insufficient_tier'
    };
  }

  // Check subscription status
  if (subscription.status === 'expired') {
    return {
      allowed: false,
      reason: 'subscription_expired'
    };
  }

  if (subscription.status === 'cancelled' && subscription.expiresAt && subscription.expiresAt < new Date()) {
    return {
      allowed: false,
      reason: 'subscription_cancelled'
    };
  }

  return { allowed: true };
}

async function checkGracePeriod(subscription: UserSubscription, gracePeriodDays: number): Promise<{
  inGracePeriod: boolean;
  endDate?: Date;
  remainingDays?: number;
}> {
  if (!subscription.gracePeriodEnd) {
    return { inGracePeriod: false };
  }

  const now = new Date();
  const gracePeriodEnd = subscription.gracePeriodEnd;

  if (gracePeriodEnd < now) {
    return { inGracePeriod: false };
  }

  const remainingDays = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    inGracePeriod: true,
    endDate: gracePeriodEnd,
    remainingDays
  };
}

async function checkUsageLimits(userId: string, featureId: string, subscription: UserSubscription): Promise<UsageCheckResult> {
  try {
    const db = getFirestore();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get current month usage
    const usageQuery = db.collection('usage_tracking')
      .where('userId', '==', userId)
      .where('featureId', '==', featureId)
      .where('timestamp', '>=', startOfMonth.getTime())
      .where('success', '==', true);

    const usageSnapshot = await usageQuery.get();
    const currentUsage = usageSnapshot.size;

    // Get limit from feature configuration
    const feature = featureRegistry.getFeature(featureId);
    const limit = feature?.usageLimits?.[subscription.tier] ?? -1;

    return {
      withinLimits: limit === -1 || currentUsage < limit,
      currentUsage,
      limit,
      resetDate,
      upgradeOptions: limit !== -1 && currentUsage >= limit ? 
        generateUpgradeOptions(featureId) : 
        undefined
    };
  } catch (error) {
    // CRITICAL SECURITY FIX: Fail closed to prevent revenue bypass
    logger.error('CRITICAL: Usage limits check failed - DENYING ACCESS', error);
    
    // Log security event
    await securityMonitor.logSecurityEvent({
      eventType: 'USAGE_SERVICE_FAILURE',
      severity: 'CRITICAL',
      userId,
      featureId,
      service: 'EnhancedPremiumGuard',
      message: 'Usage limits verification failed - access denied',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        securityPolicy: 'FAIL_CLOSED',
        action: 'DENY_ACCESS'
      }
    });
    
    return {
      withinLimits: false, // SECURITY FIX: FAIL CLOSED
      currentUsage: -1,    // Error indicator
      limit: 0,           // Force limit exceeded state
      resetDate: new Date(),
      upgradeOptions: []
    };
  }
}

async function trackUsageEvent(event: UsageRecord): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection('usage_tracking').add(event);
  } catch (error) {
    logger.error('Error tracking usage event:', error);
    // Non-blocking error
  }
}

function generateUpgradeOptions(featureId: string): UpgradeOption[] {
  const feature = featureRegistry.getFeature(featureId);
  if (!feature?.usageLimits) return [];

  return [
    {
      tier: 'premium',
      newLimit: feature.usageLimits.premium || -1,
      price: 29,
      billingPeriod: 'month'
    },
    {
      tier: 'enterprise',
      newLimit: feature.usageLimits.enterprise || -1,
      price: 99,
      billingPeriod: 'month'
    }
  ].filter(option => option.newLimit > (feature.usageLimits?.free || 0));
}

/**
 * Convenience wrapper for common premium features
  */
export const premiumFeatureGuard = (featureId: string, options?: Partial<PremiumGuardOptions>) =>
  enhancedPremiumGuard({
    requiredFeature: featureId,
    trackUsage: true,
    allowGracePeriod: true,
    gracePeriodDays: 7,
    ...options
  });

/**
 * Wrapper for enterprise-only features
  */
export const enterpriseFeatureGuard = (featureId: string, options?: Partial<PremiumGuardOptions>) =>
  enhancedPremiumGuard({
    requiredFeature: featureId,
    trackUsage: true,
    allowGracePeriod: false,
    customErrorMessage: 'Enterprise feature - upgrade required',
    ...options
  });

export default enhancedPremiumGuard;