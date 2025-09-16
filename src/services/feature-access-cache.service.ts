/**
 * Feature Access Cache Service for CVPlus
 * 
 * High-performance caching for premium feature access validation
 * with optimized response times for subscription checks.
 * 
 * @author Gil Klainert
 * @version 1.0.0  
 * @created 2025-08-29
  */

import { logger } from 'firebase-functions';
import { cacheService } from '../../../services/cache/cache.service';

export interface FeatureAccessCacheMetrics {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  invalidations: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason: string;
  tier: 'free' | 'premium' | 'enterprise';
  cached: boolean;
  responseTime: number;
}

class FeatureAccessCacheService {
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly CACHE_NAMESPACE = 'feature_access';
  private metrics: FeatureAccessCacheMetrics = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    invalidations: 0,
    averageResponseTime: 0,
    errorRate: 0
  };

  /**
   * Check if user has access to specific feature
    */
  async checkFeatureAccess(userId: string, featureId: string): Promise<FeatureAccessResult> {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      const cacheKey = `${this.CACHE_NAMESPACE}:${userId}:${featureId}`;
      const cached = await cacheService.get<FeatureAccessResult>(cacheKey);

      if (cached.cached && cached.value) {
        this.metrics.cacheHits++;
        const responseTime = Date.now() - startTime;
        this.updateAverageResponseTime(responseTime);
        
        return {
          hasAccess: cached.value.hasAccess,
          reason: cached.value.reason,
          tier: cached.value.tier,
          cached: true,
          responseTime
        };
      }

      this.metrics.cacheMisses++;
      
      // TODO: Implement actual feature access logic
      // For now, return a default response
      const result: FeatureAccessResult = {
        hasAccess: true, // Default to true for basic functionality
        reason: 'Default access granted',
        tier: 'free',
        cached: false,
        responseTime: Date.now() - startTime
      };

      // Cache the result
      await cacheService.set(cacheKey, result, { ttl: this.CACHE_TTL });
      
      this.updateAverageResponseTime(result.responseTime);
      return result;

    } catch (error) {
      this.metrics.errorRate++;
      logger.error('Feature access cache error', { userId, featureId, error });
      
      return {
        hasAccess: false,
        reason: 'Cache error - access denied',
        tier: 'free',
        cached: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Warm cache for common users
    */
  async warmCache(userIds: string[]): Promise<void> {
    try {
      const commonFeatures = ['cv_generation', 'export_pdf', 'basic_templates'];
      const promises = [];

      for (const userId of userIds) {
        for (const featureId of commonFeatures) {
          promises.push(this.checkFeatureAccess(userId, featureId));
        }
      }

      await Promise.allSettled(promises);
      logger.info('Feature access cache warmed', { userCount: userIds.length });
      
    } catch (error) {
      logger.error('Feature access cache warm-up error', { error });
    }
  }

  /**
   * Get cache hit rate
    */
  getHitRate(): number {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    return totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0;
  }

  /**
   * Get performance metrics
    */
  getMetrics(): FeatureAccessCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Invalidate cache for user
    */
  async invalidateUser(userId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_NAMESPACE}:${userId}:*`;
      await cacheService.deletePattern(pattern);
      this.metrics.invalidations++;
      
    } catch (error) {
      logger.error('Feature access cache invalidation error', { userId, error });
    }
  }

  /**
   * Clear all feature access cache
    */
  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.CACHE_NAMESPACE}:*`;
      await cacheService.deletePattern(pattern);
      logger.info('Feature access cache cleared');
      
    } catch (error) {
      logger.error('Feature access cache clear error', { error });
    }
  }

  /**
   * Update average response time metric
    */
  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metrics.requests;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  /**
   * Reset metrics
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

// Export singleton instance
export const featureAccessCacheService = new FeatureAccessCacheService();