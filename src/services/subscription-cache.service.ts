/**
 * Subscription Cache Service
 *
 * Cache management for subscription data and user access patterns.
 * Optimizes subscription verification and premium feature access.
  */

export interface SubscriptionCacheData {
  userId: string;
  isPremium: boolean;
  subscriptionStatus: string;
  validUntil: Date;
  cachedAt: Date;
  features: string[];
}

export class SubscriptionCacheService {
  private cache = new Map<string, { data: SubscriptionCacheData; expiry: number }>();
  private cacheTTL = 300000; // 5 minutes in milliseconds
  private hits = 0;
  private misses = 0;

  /**
   * Get subscription data from cache
    */
  async getSubscriptionCache(userId: string): Promise<SubscriptionCacheData | null> {
    try {
      const cacheEntry = this.cache.get(userId);
      if (!cacheEntry || Date.now() > cacheEntry.expiry) {
        this.misses++;
        if (cacheEntry) this.cache.delete(userId);
        return null;
      }
      this.hits++;
      return cacheEntry.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set subscription data in cache
    */
  async setSubscriptionCache(userId: string, data: SubscriptionCacheData): Promise<void> {
    try {
      const expiry = Date.now() + this.cacheTTL;
      this.cache.set(userId, { data: { ...data, cachedAt: new Date() }, expiry });
    } catch (error) {
      // Handle cache set error
    }
  }

  /**
   * Clear subscription cache for user
    */
  async clearSubscriptionCache(userId: string): Promise<void> {
    try {
      this.cache.delete(userId);
    } catch (error) {
      // Handle cache clear error
    }
  }

  /**
   * Get cache statistics
    */
  async getCacheStats(): Promise<{
    totalEntries: number;
    hitRate: number;
    averageResponseTime: number;
  }> {
    const total = this.hits + this.misses;
    return {
      totalEntries: this.cache.size,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      averageResponseTime: 0
    };
  }

  /**
   * Get cache statistics (alias for getCacheStats)
    */
  async getStats(): Promise<{
    totalEntries: number;
    hitRate: number;
    averageResponseTime: number;
  }> {
    return this.getCacheStats();
  }

  /**
   * Clean up expired cache entries
    */
  async cleanupExpired(): Promise<void> {
    try {
      const now = Date.now();
      for (const [userId, entry] of this.cache.entries()) {
        if (now > entry.expiry) {
          this.cache.delete(userId);
        }
      }
    } catch (error) {
      // Handle cleanup error
    }
  }
}

// Export default instance for convenience
export const subscriptionCache = new SubscriptionCacheService();