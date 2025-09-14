/**
 * Core Integration Services
 * Implements Core interfaces for dependency injection
 * Author: Gil Klainert
 * Date: 2025-08-29
 */

import {
  IPremiumGuard,
  IRateLimitGuard,
  IFeatureRegistry,
  ISubscriptionService,
  ISecurityMonitor,
  MiddlewareResult,
  RateLimitResult,
  Feature,
  UserSubscription,
  UsageCheckResult,
  SecurityEvent,
  PremiumGuardOptions,
  RateLimitOptions,
  IMiddleware
} from '@cvplus/core';
import { PremiumGuardService } from '../middleware/premium-guard';
import { SecureRateLimitGuard } from '../backend/services/security/rate-limit-guard.service';
import { SecurityMonitorService } from '../backend/services/security/security-monitor.service';
import { FeatureRegistry } from './feature-registry';
import { logger } from 'firebase-functions';

/**
 * Premium Guard Service Implementation
 * Implements IPremiumGuard interface from Core
 */
export class CorePremiumGuardService implements IPremiumGuard {
  private premiumGuard: PremiumGuardService;

  constructor() {
    this.premiumGuard = new PremiumGuardService();
  }

  async checkPremiumAccess(
    userId: string,
    featureId: string,
    options?: PremiumGuardOptions
  ): Promise<MiddlewareResult> {
    return this.premiumGuard.checkPremiumAccess(userId, featureId, options);
  }

  createMiddleware(featureId: string, options?: PremiumGuardOptions): IMiddleware {
    return this.premiumGuard.createMiddleware(featureId, options);
  }
}

/**
 * Rate Limit Guard Service Implementation
 * Implements IRateLimitGuard interface from Core
 */
export class CoreRateLimitGuardService implements IRateLimitGuard {
  private rateLimitGuard: SecureRateLimitGuard;

  constructor() {
    this.rateLimitGuard = new SecureRateLimitGuard();
  }

  async checkRateLimit(
    userId: string,
    featureId: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    try {
      const result = await this.rateLimitGuard.checkRateLimit(userId, featureId, options);
      return {
        allowed: result.allowed,
        retryAfter: result.retryAfter,
        currentCount: result.currentCount,
        limit: options.limitPerMinute || options.limitPerHour || options.limitPerDay,
        resetTime: result.resetTime
      };
    } catch (error) {
      logger.error('Rate limit check failed', { error, userId, featureId });
      // Fail closed for security
      return {
        allowed: false,
        retryAfter: 60,
        currentCount: -1,
        limit: 0
      };
    }
  }

  createMiddleware(featureId: string, options: RateLimitOptions): IMiddleware {
    return async (req: any, res: any, next: any) => {
      const userId = req.auth?.uid || req.user?.uid;
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const result = await this.checkRateLimit(userId, featureId, options);
      if (!result.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter,
          details: {
            featureId,
            currentCount: result.currentCount,
            limit: result.limit,
            resetTime: result.resetTime
          }
        });
      }

      next();
    };
  }
}

/**
 * Feature Registry Service Implementation
 * Implements IFeatureRegistry interface from Core
 */
export class CoreFeatureRegistryService implements IFeatureRegistry {
  private featureRegistry: FeatureRegistry;

  constructor() {
    this.featureRegistry = new FeatureRegistry();
  }

  getFeature(featureId: string): Feature | undefined {
    return this.featureRegistry.getFeature(featureId);
  }

  registerFeature(feature: Feature): void {
    this.featureRegistry.registerFeature(feature);
  }

  getAllFeatures(): Feature[] {
    return this.featureRegistry.getAllFeatures();
  }

  getFeaturesForTier(tier: string): Feature[] {
    return this.featureRegistry.getFeaturesForTier(tier);
  }
}

/**
 * Subscription Service Implementation
 * Implements ISubscriptionService interface from Core
 */
export class CoreSubscriptionService implements ISubscriptionService {
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // Import at runtime to avoid circular dependencies
      const { getUserSubscriptionInternal } = await import('../backend/functions/payments/core/getUserSubscription');
      const subscription = await getUserSubscriptionInternal(userId);
      
      if (!subscription) {
        return null;
      }

      return {
        tier: subscription.tier || 'free',
        status: subscription.status || 'active',
        features: subscription.features || [],
        expiresAt: subscription.expiresAt,
        gracePeriodEnd: subscription.gracePeriodEnd,
        limits: subscription.limits || {
          monthlyUploads: 3,
          cvGenerations: 5,
          featuresPerCV: 2,
          apiCallsPerMonth: 20
        },
        stripeSubscriptionId: subscription.stripeSubscriptionId
      };
    } catch (error) {
      logger.error('Failed to get user subscription', { error, userId });
      return null;
    }
  }

  async checkFeatureAccess(userId: string, featureId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      const feature = this.featureRegistry.getFeature(featureId);
      
      if (!feature) {
        return false;
      }

      if (!subscription) {
        return feature.tier === 'free';
      }

      const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
      const userLevel = tierHierarchy[subscription.tier];
      const requiredLevel = tierHierarchy[feature.tier as keyof typeof tierHierarchy];

      return userLevel >= requiredLevel;
    } catch (error) {
      logger.error('Failed to check feature access', { error, userId, featureId });
      return false;
    }
  }

  async getUsageStats(userId: string, featureId: string): Promise<UsageCheckResult> {
    // This would integrate with the usage tracking service
    // For now, return basic implementation
    return {
      withinLimits: true,
      currentUsage: 0,
      limit: -1,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      upgradeOptions: []
    };
  }
}

/**
 * Security Monitor Service Implementation
 * Implements ISecurityMonitor interface from Core
 */
export class CoreSecurityMonitorService implements ISecurityMonitor {
  private securityMonitor: SecurityMonitorService;

  constructor() {
    this.securityMonitor = new SecurityMonitorService();
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    return this.securityMonitor.logSecurityEvent(event);
  }
}

/**
 * Service Factory for Core Integration
 */
export class CoreIntegrationServiceFactory {
  private static instance: CoreIntegrationServiceFactory;
  private services: {
    premiumGuard?: CorePremiumGuardService;
    rateLimitGuard?: CoreRateLimitGuardService;
    featureRegistry?: CoreFeatureRegistryService;
    subscriptionService?: CoreSubscriptionService;
    securityMonitor?: CoreSecurityMonitorService;
  } = {};

  static getInstance(): CoreIntegrationServiceFactory {
    if (!this.instance) {
      this.instance = new CoreIntegrationServiceFactory();
    }
    return this.instance;
  }

  getPremiumGuardService(): IPremiumGuard {
    if (!this.services.premiumGuard) {
      this.services.premiumGuard = new CorePremiumGuardService();
    }
    return this.services.premiumGuard;
  }

  getRateLimitGuardService(): IRateLimitGuard {
    if (!this.services.rateLimitGuard) {
      this.services.rateLimitGuard = new CoreRateLimitGuardService();
    }
    return this.services.rateLimitGuard;
  }

  getFeatureRegistryService(): IFeatureRegistry {
    if (!this.services.featureRegistry) {
      this.services.featureRegistry = new CoreFeatureRegistryService();
    }
    return this.services.featureRegistry;
  }

  getSubscriptionService(): ISubscriptionService {
    if (!this.services.subscriptionService) {
      this.services.subscriptionService = new CoreSubscriptionService();
    }
    return this.services.subscriptionService;
  }

  getSecurityMonitorService(): ISecurityMonitor {
    if (!this.services.securityMonitor) {
      this.services.securityMonitor = new CoreSecurityMonitorService();
    }
    return this.services.securityMonitor;
  }
}

// Export singleton factory
export const coreIntegrationFactory = CoreIntegrationServiceFactory.getInstance();

// Export individual services for direct use
export const corePremiumGuardService = coreIntegrationFactory.getPremiumGuardService();
export const coreRateLimitGuardService = coreIntegrationFactory.getRateLimitGuardService();
export const coreFeatureRegistryService = coreIntegrationFactory.getFeatureRegistryService();
export const coreSubscriptionService = coreIntegrationFactory.getSubscriptionService();
export const coreSecurityMonitorService = coreIntegrationFactory.getSecurityMonitorService();