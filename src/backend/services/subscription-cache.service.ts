import { logger } from 'firebase-functions';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  size: number;
}

export class SubscriptionCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly MAX_CACHE_SIZE = 1000; // Prevent memory leaks
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    size: 0
  };

  /**
   * Get cached subscription data for a user
   */
  get(userId: string): any | null {
    try {
      const key = this.generateKey(userId);
      const entry = this.cache.get(key);

      if (!entry) {
        this.stats.misses++;
        logger.debug('Cache miss for user subscription', { userId });
        return null;
      }

      // Check if cache entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.misses++;
        this.stats.size = this.cache.size;
        logger.debug('Cache expired for user subscription', { 
          userId, 
          age: Date.now() - entry.timestamp 
        });
        return null;
      }

      this.stats.hits++;
      logger.debug('Cache hit for user subscription', { 
        userId, 
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl 
      });
      
      return entry.data;
    } catch (error) {
      logger.error('Error getting cached subscription', { error, userId });
      return null; // Fail gracefully, caller will fetch from database
    }
  }

  /**
   * Store subscription data in cache
   */
  set(userId: string, data: any, customTtl?: number): void {
    try {
      const key = this.generateKey(userId);
      const ttl = customTtl || this.DEFAULT_TTL;

      // Implement cache size limit to prevent memory leaks
      if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
        this.evictOldestEntries(Math.floor(this.MAX_CACHE_SIZE * 0.1)); // Remove 10% of entries
      }

      const entry: CacheEntry = {
        data: JSON.parse(JSON.stringify(data)), // Deep clone to prevent mutations
        timestamp: Date.now(),
        ttl
      };

      this.cache.set(key, entry);
      this.stats.size = this.cache.size;

      logger.debug('Cached user subscription', { 
        userId, 
        ttl: ttl / 1000, 
        cacheSize: this.cache.size 
      });
    } catch (error) {
      logger.error('Error caching subscription', { error, userId });
      // Don't throw error - caching is optional
    }
  }

  /**
   * Invalidate cached subscription for a user
   */
  invalidate(userId: string): boolean {
    try {
      const key = this.generateKey(userId);
      const deleted = this.cache.delete(key);
      
      if (deleted) {
        this.stats.invalidations++;
        this.stats.size = this.cache.size;
        logger.info('Invalidated cached subscription', { userId });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error invalidating cached subscription', { error, userId });
      return false;
    }
  }

  /**
   * Clear all cached subscriptions
   */
  clearAll(): void {
    try {
      const previousSize = this.cache.size;
      this.cache.clear();
      this.stats.size = 0;
      
      logger.info('Cleared all cached subscriptions', { previousSize });
    } catch (error) {
      logger.error('Error clearing subscription cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size
    };
  }

  /**
   * Clean up expired entries manually
   */
  cleanupExpired(): number {
    try {
      let removedCount = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry)) {
          this.cache.delete(key);
          removedCount++;
        }
      }

      this.stats.size = this.cache.size;
      
      if (removedCount > 0) {
        logger.debug('Cleaned up expired cache entries', { 
          removedCount, 
          remainingSize: this.cache.size 
        });
      }

      return removedCount;
    } catch (error) {
      logger.error('Error cleaning up expired cache entries', { error });
      return 0;
    }
  }

  private generateKey(userId: string): string {
    return `user_subscription:${userId}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}

// Singleton instance
export const subscriptionCache = new SubscriptionCacheService();

// Periodic cleanup (runs every 10 minutes)
setInterval(() => {
  subscriptionCache.cleanupExpired();
}, 10 * 60 * 1000);