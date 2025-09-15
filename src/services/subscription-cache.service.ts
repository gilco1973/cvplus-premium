/**
 * Subscription Cache Service for CVPlus Performance Optimization
 * 
 * High-performance caching for user subscription status with real-time
 * invalidation and sub-5-minute TTL for accuracy.
 * 
 * @author Gil Klainert
 * @version 1.0.0  
 * @created 2025-08-28
 */

import { logger } from 'firebase-functions';
import { cacheService } from '../../../services/cache/cache.service';
import { UserSubscriptionData } from '../../../patterns/service-interfaces';
import { db } from '../../../config/firebase';

export interface SubscriptionCacheMetrics {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  invalidations: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface SubscriptionCacheResult {
  subscription: UserSubscriptionData;
  cached: boolean;
  responseTime: number;
  dataAge: number; // milliseconds since cached
}

class SubscriptionCacheService {
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly CACHE_NAMESPACE = 'subscription';
  private metrics: SubscriptionCacheMetrics = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    invalidations: 0,
    averageResponseTime: 0,
    errorRate: 0
  };

  /**
   * Get user subscription with caching
   */
  async getUserSubscription(userId: string): Promise<SubscriptionCacheResult> {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      const cacheKey = this.buildSubscriptionKey(userId);
      
      const result = await cacheService.get<{
        subscription: UserSubscriptionData;
        cachedAt: number;
      }>(
        cacheKey,
        () => this.fetchSubscriptionFromDatabase(userId),
        {
          ttl: this.CACHE_TTL,
          namespace: this.CACHE_NAMESPACE,
          serialize: true
        }
      );

      // Update metrics
      const responseTime = Date.now() - startTime;
      if (result.cached) {
        this.metrics.cacheHits++;
        logger.debug('Subscription cache hit', { userId, responseTime });
      } else {
        this.metrics.cacheMisses++;
        logger.debug('Subscription cache miss', { userId, responseTime });
      }

      this.updateAverageResponseTime(responseTime);

      if (!result.value) {
        throw new Error('Failed to fetch user subscription');
      }

      const dataAge = Date.now() - result.value.cachedAt;

      return {
        subscription: result.value.subscription,
        cached: result.cached,
        responseTime,
        dataAge
      };

    } catch (error) {
      this.metrics.errorRate++;
      logger.error('Subscription cache error', { userId, error });
      throw error;
    }
  }

  /**
   * Get multiple user subscriptions in batch
   */
  async getBatchSubscriptions(userIds: string[]): Promise<Record<string, SubscriptionCacheResult>> {
    const startTime = Date.now();
    
    if (userIds.length === 0) {
      return {};
    }

    try {
      const keys = userIds.map(userId => this.buildSubscriptionKey(userId));
      
      const batchResult = await cacheService.getBatch<{
        subscription: UserSubscriptionData;
        cachedAt: number;
      }>(
        keys,
        async (missedKeys) => {
          const missedUserIds = missedKeys.map(key => this.parseKeyToUserId(key));
          const results: Record<string, { subscription: UserSubscriptionData; cachedAt: number }> = {};
          
          // Fetch missing subscriptions from database
          const fetchPromises = missedUserIds.map(async userId => {
            if (userId) {
              try {
                const data = await this.fetchSubscriptionFromDatabase(userId);
                results[this.buildSubscriptionKey(userId)] = data;
              } catch (error) {
                logger.error('Batch subscription fetch error', { userId, error });
              }
            }
          });
          
          await Promise.allSettled(fetchPromises);
          return results;
        },
        {
          ttl: this.CACHE_TTL,
          namespace: this.CACHE_NAMESPACE,
          serialize: true
        }
      );

      // Update metrics
      this.metrics.requests += userIds.length;
      const hitCount = Math.round(batchResult.hitRate * userIds.length);
      this.metrics.cacheHits += hitCount;
      this.metrics.cacheMisses += (userIds.length - hitCount);

      // Convert results back to user-friendly format
      const results: Record<string, SubscriptionCacheResult> = {};
      const responseTime = Date.now() - startTime;
      
      for (const userId of userIds) {
        const key = this.buildSubscriptionKey(userId);
        const result = batchResult.results[key];
        const cached = batchResult.cached[key] ?? false;
        
        if (result) {
          const dataAge = Date.now() - result.cachedAt;
          results[userId] = {
            subscription: result.subscription,
            cached,
            responseTime,
            dataAge
          };
        }
      }

      logger.info('Batch subscription fetch completed', {
        requestCount: userIds.length,
        hitRate: batchResult.hitRate,
        responseTime
      });

      return results;

    } catch (error) {
      logger.error('Batch subscription error', { userIds: userIds.length, error });
      throw error;
    }
  }

  /**
   * Update user subscription and invalidate cache
   */
  async updateSubscription(userId: string, updates: Partial<UserSubscriptionData>): Promise<boolean> {
    try {
      // Update database first
      const userDoc = db.collection('users').doc(userId);
      await userDoc.update({
        subscriptionData: updates,
        updatedAt: new Date()
      });

      // Invalidate cache
      await this.invalidateSubscription(userId);
      
      logger.info('Subscription updated and cache invalidated', { 
        userId, 
        updates: Object.keys(updates) 
      });
      
      return true;

    } catch (error) {
      logger.error('Subscription update error', { userId, updates, error });
      return false;
    }
  }

  /**
   * Invalidate subscription cache for specific user or all users
   */
  async invalidateSubscription(userId?: string): Promise<number> {
    this.metrics.invalidations++;
    
    try {
      let deleted: number;
      
      if (userId) {
        // Specific user
        const key = this.buildSubscriptionKey(userId);
        deleted = await cacheService.delete(key, {
          namespace: this.CACHE_NAMESPACE
        }) ? 1 : 0;
        
        logger.debug('User subscription cache invalidated', { userId });
      } else {
        // All subscriptions
        deleted = await cacheService.deletePattern('*', {
          namespace: this.CACHE_NAMESPACE
        });
        
        logger.info('All subscription cache invalidated', { deleted });
      }

      return deleted;

    } catch (error) {
      logger.error('Subscription cache invalidation error', { userId, error });
      return 0;
    }
  }

  /**
   * Check if user has specific feature with caching
   */
  async hasFeature(userId: string, featureKey: string): Promise<{
    hasFeature: boolean;
    cached: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await this.getUserSubscription(userId);
      const hasFeature = result.subscription.features[featureKey] === true;
      
      return {
        hasFeature,
        cached: result.cached,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Feature check error', { userId, featureKey, error });
      return {
        hasFeature: false,
        cached: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check multiple features for user with single cache lookup
   */
  async hasFeatures(
    userId: string, 
    featureKeys: string[]
  ): Promise<{
    features: Record<string, boolean>;
    cached: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await this.getUserSubscription(userId);
      const features: Record<string, boolean> = {};
      
      for (const featureKey of featureKeys) {
        features[featureKey] = result.subscription.features[featureKey] === true;
      }

      return {
        features,
        cached: result.cached,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Multi-feature check error', { userId, featureKeys, error });
      const features: Record<string, boolean> = {};
      for (const featureKey of featureKeys) {
        features[featureKey] = false;
      }
      
      return {
        features,
        cached: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Pre-warm cache for active users
   */
  async warmCache(userIds: string[]): Promise<void> {
    logger.info('Starting subscription cache warm-up', { users: userIds.length });
    
    try {
      const results = await this.getBatchSubscriptions(userIds);
      const successCount = Object.keys(results).length;
      
      logger.info('Subscription cache warm-up completed', {
        attempted: userIds.length,
        successful: successCount,
        successRate: successCount / userIds.length
      });
      
    } catch (error) {
      logger.error('Subscription cache warm-up error', { error });
    }
  }

  /**
   * Fetch subscription from database (fallback)
   */
  private async fetchSubscriptionFromDatabase(userId: string): Promise<{
    subscription: UserSubscriptionData;
    cachedAt: number;
  }> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      
      let subscriptionData: UserSubscriptionData;
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        subscriptionData = userData?.subscriptionData || this.getDefaultSubscription();
      } else {
        // Create default subscription for new user
        subscriptionData = this.getDefaultSubscription();
        
        // Store default subscription in database
        await db.collection('users').doc(userId).set({
          subscriptionData,
          createdAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });
      }

      // Ensure subscription has all required fields
      subscriptionData = this.normalizeSubscriptionData(subscriptionData);

      return {
        subscription: subscriptionData,
        cachedAt: Date.now()
      };

    } catch (error) {
      logger.error('Database subscription fetch error', { userId, error });
      throw error;
    }
  }

  /**
   * Get default subscription for new users
   */
  private getDefaultSubscription(): UserSubscriptionData {
    return {
      userId: '',
      subscriptionStatus: 'free',
      tier: 'free',
      active: true,
      lifetimeAccess: false,
      features: {
        webPortal: false,
        aiChat: false,
        podcast: false,
        advancedAnalytics: false,
        videoIntroduction: false,
        roleDetection: false,
        externalData: false
      }
    };
  }

  /**
   * Normalize subscription data to ensure consistency
   */
  private normalizeSubscriptionData(data: any): UserSubscriptionData {
    const normalized: UserSubscriptionData = {
      userId: data.userId || '',
      subscriptionStatus: data.subscriptionStatus || 'free',
      tier: data.tier || 'free',
      active: Boolean(data.active ?? true),
      lifetimeAccess: Boolean(data.lifetimeAccess),
      features: {
        webPortal: Boolean(data.features?.webPortal),
        aiChat: Boolean(data.features?.aiChat),
        podcast: Boolean(data.features?.podcast),
        advancedAnalytics: Boolean(data.features?.advancedAnalytics),
        videoIntroduction: Boolean(data.features?.videoIntroduction),
        roleDetection: Boolean(data.features?.roleDetection),
        externalData: Boolean(data.features?.externalData)
      },
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      billingCycle: data.billingCycle || undefined
      // Note: usage, limits, and metadata are not part of UserSubscriptionData interface
      // These should be handled by the consuming module if needed
    };

    return normalized;
  }

  /**
   * Build cache key for subscription
   */
  private buildSubscriptionKey(userId: string): string {
    return userId;
  }

  /**
   * Parse cache key back to user ID
   */
  private parseKeyToUserId(key: string): string | null {
    return key || null;
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
   * Get subscription cache performance metrics
   */
  getMetrics(): SubscriptionCacheMetrics {
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
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      invalidations: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
  }
}

// Singleton instance
export const subscriptionCacheService = new SubscriptionCacheService();