/**
 * Feature Access Cache Service for CVPlus Performance Optimization
 * 
 * High-performance caching for premium feature access validation,
 * reducing response times from >100ms to <10ms with intelligent
 * batch operations and real-time invalidation.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-28
  */

import { logger } from 'firebase-functions';
import { cacheService } from './cache.service';
import { subscriptionCache } from './subscription-cache.service';
import { UserSubscriptionData } from '../../types';

export type FeatureKey = keyof UserSubscriptionData['features'];

export interface FeatureAccessRequest {
  userId: string;
  feature: FeatureKey;
  context?: {
    requestId?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason: string;
  cached: boolean;
  responseTime: number;
  subscriptionTier: string;
  usageRemaining?: number;
}

export interface BatchFeatureAccessResult {
  results: Record<string, boolean>;
  cached: Record<string, boolean>;
  responseTime: number;
  hitRate: number;
  subscriptionTier: string;
}

export interface FeatureAccessMetrics {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  deniedRequests: number;
  averageResponseTime: number;
  errorRate: number;
}

class FeatureAccessCacheService {
  private readonly CACHE_TTL = 1800; // 30 minutes in seconds
  private readonly CACHE_NAMESPACE = 'feature_access';
  private metrics: FeatureAccessMetrics = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    deniedRequests: 0,
    averageResponseTime: 0,
    errorRate: 0
  };

  /**
   * Check feature access with caching
    */
  async checkFeatureAccess(request: FeatureAccessRequest): Promise<FeatureAccessResult> {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      const cacheKey = this.buildFeatureAccessKey(request.userId, request.feature);
      
      const result = await cacheService.get<{
        hasAccess: boolean;
        reason: string;
        subscriptionTier: string;
        usageRemaining?: number;
        cachedAt: number;
      }>(
        cacheKey,
        () => this.validateFeatureAccess(request),
        {
          ttl: this.CACHE_TTL,
          namespace: this.CACHE_NAMESPACE,
          serialize: true
        }
      );

      const responseTime = Date.now() - startTime;
      
      // Update metrics
      if (result.cached) {
        this.metrics.cacheHits++;
        logger.debug('Feature access cache hit', { 
          userId: request.userId,
          feature: request.feature,
          responseTime
        });
      } else {
        this.metrics.cacheMisses++;
        logger.debug('Feature access cache miss', { 
          userId: request.userId,
          feature: request.feature,
          responseTime
        });
      }

      if (!result.value?.hasAccess) {
        this.metrics.deniedRequests++;
      }

      this.updateAverageResponseTime(responseTime);

      if (!result.value) {
        throw new Error('Failed to validate feature access');
      }

      return {
        hasAccess: result.value.hasAccess,
        reason: result.value.reason,
        cached: result.cached,
        responseTime,
        subscriptionTier: result.value.subscriptionTier,
        usageRemaining: result.value.usageRemaining
      };

    } catch (error) {
      this.metrics.errorRate++;
      logger.error('Feature access cache error', { 
        userId: request.userId,
        feature: request.feature,
        error
      });
      
      // Fail securely - deny access on error
      return {
        hasAccess: false,
        reason: 'System error - access denied for security',
        cached: false,
        responseTime: Date.now() - startTime,
        subscriptionTier: 'unknown'
      };
    }
  }

  /**
   * Check multiple features for user in batch
    */
  async checkBatchFeatureAccess(
    userId: string, 
    features: FeatureKey[]
  ): Promise<BatchFeatureAccessResult> {
    const startTime = Date.now();
    
    if (features.length === 0) {
      return {
        results: {},
        cached: {},
        responseTime: 0,
        hitRate: 0,
        subscriptionTier: 'unknown'
      };
    }

    try {
      // Build cache keys for all features
      const keys = features.map(feature => this.buildFeatureAccessKey(userId, feature));
      
      // Get cached results
      const batchResult = await cacheService.getBatch<{
        hasAccess: boolean;
        reason: string;
        subscriptionTier: string;
        usageRemaining?: number;
        cachedAt: number;
      }>(
        keys,
        async (missedKeys) => {
          // Validate features for cache misses
          const missedResults: Record<string, any> = {};
          
          // Get user subscription once for all missed features
          const subscriptionResult = await subscriptionCache.getUserSubscription(userId);
          const subscription = subscriptionResult.subscription;
          
          for (const missedKey of missedKeys) {
            const feature = this.parseKeyToFeature(missedKey);
            if (feature) {
              try {
                const validation = this.validateFeatureFromSubscription(
                  { userId, feature },
                  subscription
                );
                missedResults[missedKey] = {
                  ...validation,
                  cachedAt: Date.now()
                };
              } catch (error) {
                logger.error('Batch feature validation error', { 
                  userId,
                  feature,
                  error 
                });
                missedResults[missedKey] = {
                  hasAccess: false,
                  reason: 'Validation error',
                  subscriptionTier: 'unknown',
                  cachedAt: Date.now()
                };
              }
            }
          }
          
          return missedResults;
        },
        {
          ttl: this.CACHE_TTL,
          namespace: this.CACHE_NAMESPACE,
          serialize: true
        }
      );

      // Update metrics
      this.metrics.requests += features.length;
      const hitCount = Math.round(batchResult.hitRate * features.length);
      this.metrics.cacheHits += hitCount;
      this.metrics.cacheMisses += (features.length - hitCount);

      // Process results
      const results: Record<string, boolean> = {};
      const cached: Record<string, boolean> = {};
      let subscriptionTier = 'unknown';
      
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const key = keys[i];
        const result = batchResult.results[key];
        
        if (result) {
          results[feature] = result.hasAccess;
          cached[feature] = batchResult.cached[key];
          subscriptionTier = result.subscriptionTier; // Use last valid tier
          
          if (!result.hasAccess) {
            this.metrics.deniedRequests++;
          }
        } else {
          results[feature] = false;
          cached[feature] = false;
          this.metrics.deniedRequests++;
        }
      }

      const responseTime = Date.now() - startTime;
      
      logger.info('Batch feature access completed', {
        userId,
        features: features.length,
        hitRate: batchResult.hitRate,
        responseTime
      });

      return {
        results,
        cached,
        responseTime,
        hitRate: batchResult.hitRate,
        subscriptionTier
      };

    } catch (error) {
      logger.error('Batch feature access error', { userId, features, error });
      
      // Fail securely - deny all access on error
      const results: Record<string, boolean> = {};
      const cached: Record<string, boolean> = {};
      for (const feature of features) {
        results[feature] = false;
        cached[feature] = false;
        this.metrics.deniedRequests++;
      }

      return {
        results,
        cached,
        responseTime: Date.now() - startTime,
        hitRate: 0,
        subscriptionTier: 'unknown'
      };
    }
  }

  /**
   * Invalidate feature access cache for user
    */
  async invalidateUserFeatures(userId: string, feature?: FeatureKey): Promise<number> {
    try {
      let pattern: string;
      
      if (feature) {
        // Specific user and feature
        pattern = this.buildFeatureAccessKey(userId, feature);
        const deleted = await cacheService.delete(pattern, {
          namespace: this.CACHE_NAMESPACE
        });
        return deleted ? 1 : 0;
      } else {
        // All features for specific user
        pattern = `${userId}:*`;
        const deleted = await cacheService.deletePattern(pattern, {
          namespace: this.CACHE_NAMESPACE
        });
        
        logger.info('User feature cache invalidated', { 
          userId,
          deleted
        });
        
        return deleted;
      }

    } catch (error) {
      logger.error('Feature cache invalidation error', { userId, feature, error });
      return 0;
    }
  }

  /**
   * Pre-warm feature access cache for active users
    */
  async warmCache(
    userIds: string[], 
    features: FeatureKey[] = ['webPortal', 'aiChat', 'podcast', 'advancedAnalytics']
  ): Promise<void> {
    logger.info('Starting feature access cache warm-up', { 
      users: userIds.length, 
      features: features.length 
    });

    try {
      const warmupPromises = userIds.map(async userId => {
        try {
          await this.checkBatchFeatureAccess(userId, features);
        } catch (error) {
          logger.error('Feature cache warm-up error for user', { userId, error });
        }
      });

      await Promise.allSettled(warmupPromises);
      
      logger.info('Feature access cache warm-up completed', {
        users: userIds.length,
        features: features.length
      });
      
    } catch (error) {
      logger.error('Feature access cache warm-up error', { error });
    }
  }

  /**
   * Validate feature access from subscription data
    */
  private validateFeatureFromSubscription(
    request: FeatureAccessRequest,
    subscription: UserSubscriptionData
  ): {
    hasAccess: boolean;
    reason: string;
    subscriptionTier: string;
    usageRemaining?: number;
  } {
    const { feature } = request;
    
    // Check if user has the feature enabled
    const hasFeature = subscription.features[feature] === true;
    
    if (!hasFeature) {
      return {
        hasAccess: false,
        reason: `Feature '${feature}' not available in current subscription tier`,
        subscriptionTier: subscription.subscriptionStatus
      };
    }

    // Check usage limits for certain features
    const usageCheck = this.checkUsageLimits(feature, subscription);
    if (!usageCheck.allowed) {
      return {
        hasAccess: false,
        reason: usageCheck.reason,
        subscriptionTier: subscription.subscriptionStatus,
        usageRemaining: usageCheck.remaining
      };
    }

    return {
      hasAccess: true,
      reason: 'Access granted',
      subscriptionTier: subscription.subscriptionStatus,
      usageRemaining: usageCheck.remaining
    };
  }

  /**
   * Validate feature access (fallback when not cached)
    */
  private async validateFeatureAccess(request: FeatureAccessRequest): Promise<{
    hasAccess: boolean;
    reason: string;
    subscriptionTier: string;
    usageRemaining?: number;
    cachedAt: number;
  }> {
    try {
      // Get user subscription
      const subscriptionResult = await subscriptionCache.getUserSubscription(request.userId);
      const subscription = subscriptionResult.subscription;
      
      const validation = this.validateFeatureFromSubscription(request, subscription);
      
      return {
        ...validation,
        cachedAt: Date.now()
      };

    } catch (error) {
      logger.error('Feature validation error', { request, error });
      return {
        hasAccess: false,
        reason: 'Validation error - access denied',
        subscriptionTier: 'unknown',
        cachedAt: Date.now()
      };
    }
  }

  /**
   * Check usage limits for features that have them
    */
  private checkUsageLimits(feature: FeatureKey, subscription: UserSubscriptionData): {
    allowed: boolean;
    reason: string;
    remaining?: number;
  } {
    const { usage, limits } = subscription;

    switch (feature) {
      case 'podcast':
        if (limits.podcastsPerMonth !== -1 && usage.podcastsCreated >= limits.podcastsPerMonth) {
          return {
            allowed: false,
            reason: 'Monthly podcast creation limit reached',
            remaining: 0
          };
        }
        return {
          allowed: true,
          reason: 'Usage within limits',
          remaining: limits.podcastsPerMonth === -1 ? -1 : limits.podcastsPerMonth - usage.podcastsCreated
        };

      case 'videoIntroduction':
        if (limits.videosPerMonth !== -1 && usage.videosGenerated >= limits.videosPerMonth) {
          return {
            allowed: false,
            reason: 'Monthly video generation limit reached',
            remaining: 0
          };
        }
        return {
          allowed: true,
          reason: 'Usage within limits',
          remaining: limits.videosPerMonth === -1 ? -1 : limits.videosPerMonth - usage.videosGenerated
        };

      case 'webPortal':
        if (limits.cvGenerations !== -1 && usage.cvGenerations >= limits.cvGenerations) {
          return {
            allowed: false,
            reason: 'CV generation limit reached',
            remaining: 0
          };
        }
        return {
          allowed: true,
          reason: 'Usage within limits',
          remaining: limits.cvGenerations === -1 ? -1 : limits.cvGenerations - usage.cvGenerations
        };

      default:
        // Features without usage limits
        return {
          allowed: true,
          reason: 'Feature available'
        };
    }
  }

  /**
   * Build cache key for feature access
    */
  private buildFeatureAccessKey(userId: string, feature: FeatureKey): string {
    return `${userId}:${feature}`;
  }

  /**
   * Parse cache key to extract feature
    */
  private parseKeyToFeature(key: string): FeatureKey | null {
    const parts = key.split(':');
    if (parts.length !== 2) return null;
    
    return parts[1] as FeatureKey;
  }

  /**
   * Update average response time metric
    */
  private updateAverageResponseTime(responseTime: number): void {
    if (this.metrics.requests === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * 0.9) + (responseTime * 0.1);
    }
  }

  /**
   * Get feature access cache performance metrics
    */
  getMetrics(): FeatureAccessMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache hit rate
    */
  getHitRate(): number {
    if (this.metrics.requests === 0) return 0;
    return this.metrics.cacheHits / this.metrics.requests;
  }

  /**
   * Get access denial rate
    */
  getDenialRate(): number {
    if (this.metrics.requests === 0) return 0;
    return this.metrics.deniedRequests / this.metrics.requests;
  }

  /**
   * Reset metrics (for testing)
    */
  resetMetrics(): void {
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      deniedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
  }
}

// Singleton instance
export const featureAccessCacheService = new FeatureAccessCacheService();