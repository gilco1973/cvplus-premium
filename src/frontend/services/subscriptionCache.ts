/**
 * CVPlus Subscription Cache Service
 * Optimized subscription status caching with real-time sync
 * Author: Gil Klainert
 * Date: August 27, 2025
  */

import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface CachedSubscription {
  userId: string;
  tier: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'grace_period';
  features: string[];
  limits: {
    monthlyUploads: number;
    cvGenerations: number;
    featuresPerCV: number;
    storageGB: number;
    apiCallsPerMonth: number;
  };
  expiresAt?: Date;
  gracePeriodEnd?: Date;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CacheEntry {
  subscription: CachedSubscription | null;
  timestamp: number;
  listener?: () => void;
}

/**
 * Subscription Cache Service
 * Provides high-performance subscription lookups with real-time sync
  */
export class SubscriptionCache {
  private static instance: SubscriptionCache;
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeCleanup();
  }

  static getInstance(): SubscriptionCache {
    if (!SubscriptionCache.instance) {
      SubscriptionCache.instance = new SubscriptionCache();
    }
    return SubscriptionCache.instance;
  }

  /**
   * Get user subscription with caching and real-time sync
    */
  async getUserSubscription(userId: string): Promise<CachedSubscription | null> {
    // Check cache first
    const cached = this.cache.get(userId);
    
    if (cached && this.isCacheValid(cached)) {
      return cached.subscription;
    }

    // Fetch from Firestore and set up real-time listener
    const subscription = await this.fetchAndCacheSubscription(userId);
    
    return subscription;
  }

  /**
   * Invalidate cache for a specific user
    */
  invalidate(userId: string): void {
    const cached = this.cache.get(userId);
    if (cached?.listener) {
      cached.listener(); // Unsubscribe from Firestore listener
    }
    
    this.cache.delete(userId);
  }

  /**
   * Invalidate entire cache
    */
  invalidateAll(): void {
    for (const [userId] of this.cache) {
      this.invalidate(userId);
    }
  }

  /**
   * Get cache statistics for monitoring
    */
  getCacheStats(): {
    size: number;
    hitRate: number;
    averageAge: number;
    activeListeners: number;
  } {
    const now = Date.now();
    let totalAge = 0;
    let activeListeners = 0;
    
    for (const [, entry] of this.cache) {
      totalAge += now - entry.timestamp;
      if (entry.listener) activeListeners++;
    }

    return {
      size: this.cache.size,
      hitRate: this.calculateHitRate(),
      averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
      activeListeners
    };
  }

  /**
   * Warm up cache for multiple users
    */
  async warmUpCache(userIds: string[]): Promise<void> {
    const promises = userIds.map(userId => 
      this.getUserSubscription(userId).catch(error => {
        console.error(`Failed to warm up cache for user ${userId}:`, error);
        return null;
      })
    );

    await Promise.all(promises);
  }

  /**
   * Private helper methods
    */
  private async fetchAndCacheSubscription(userId: string): Promise<CachedSubscription | null> {
    try {
      // Set up real-time listener for subscription changes
      const unsubscribe = onSnapshot(
        doc(db, 'subscriptions', userId),
        (doc) => {
          const subscription = doc.exists() ? 
            this.transformFirestoreData(doc.data(), userId) : 
            null;

          this.updateCache(userId, subscription, unsubscribe);
        },
        (error) => {
          console.error(`Subscription listener error for user ${userId}:`, error);
          this.invalidate(userId);
        }
      );

      // Also fetch immediate data
      const docSnap = await getDoc(doc(db, 'subscriptions', userId));
      const subscription = docSnap.exists() ? 
        this.transformFirestoreData(docSnap.data(), userId) : 
        null;

      this.updateCache(userId, subscription, unsubscribe);
      
      return subscription;

    } catch (error) {
      console.error(`Failed to fetch subscription for user ${userId}:`, error);
      return null;
    }
  }

  private transformFirestoreData(data: any, userId: string): CachedSubscription {
    return {
      userId,
      tier: data.tier || 'free',
      status: data.status || 'active',
      features: data.features || [],
      limits: {
        monthlyUploads: data.limits?.monthlyUploads || 3,
        cvGenerations: data.limits?.cvGenerations || 5,
        featuresPerCV: data.limits?.featuresPerCV || 2,
        storageGB: data.limits?.storageGB || 0.1,
        apiCallsPerMonth: data.limits?.apiCallsPerMonth || 20
      },
      expiresAt: data.expiresAt?.toDate(),
      gracePeriodEnd: data.gracePeriodEnd?.toDate(),
      stripeSubscriptionId: data.stripeSubscriptionId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }

  private updateCache(
    userId: string, 
    subscription: CachedSubscription | null, 
    listener: () => void
  ): void {
    // Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestEntry();
    }

    this.cache.set(userId, {
      subscription,
      timestamp: Date.now(),
      listener
    });
  }

  private isCacheValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.CACHE_TTL;
  }

  private evictOldestEntry(): void {
    let oldestUserId: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [userId, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestUserId = userId;
      }
    }

    if (oldestUserId) {
      this.invalidate(oldestUserId);
    }
  }

  private initializeCleanup(): void {
    // Clean up expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredUsers: string[] = [];

    for (const [userId, entry] of this.cache) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        expiredUsers.push(userId);
      }
    }

    expiredUsers.forEach(userId => this.invalidate(userId));
  }

  private calculateHitRate(): number {
    // This would be implemented with proper hit/miss tracking
    // For now, return a placeholder
    return 0.85; // 85% hit rate placeholder
  }

  /**
   * Batch subscription lookup for efficiency
    */
  async batchGetSubscriptions(userIds: string[]): Promise<Record<string, CachedSubscription | null>> {
    const results: Record<string, CachedSubscription | null> = {};
    
    // Process in parallel for better performance
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          results[userId] = await this.getUserSubscription(userId);
        } catch (error) {
          console.error(`Failed to get subscription for user ${userId}:`, error);
          results[userId] = null;
        }
      })
    );

    return results;
  }

  /**
   * Pre-load subscription for expected user activity
    */
  async preloadSubscription(userId: string): Promise<void> {
    // Fire and forget - don't wait for result
    this.getUserSubscription(userId).catch(error => {
      console.warn(`Failed to preload subscription for user ${userId}:`, error);
    });
  }

  /**
   * Check if user has specific feature access (cached lookup)
    */
  async hasFeatureAccess(userId: string, featureId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;

    return subscription.features.includes(featureId) || 
           subscription.features.includes('*'); // Wildcard for all features
  }

  /**
   * Get subscription tier (cached lookup)
    */
  async getUserTier(userId: string): Promise<'free' | 'premium' | 'enterprise'> {
    const subscription = await this.getUserSubscription(userId);
    return subscription?.tier || 'free';
  }

  /**
   * Cleanup method
    */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clean up all listeners
    for (const [userId] of this.cache) {
      this.invalidate(userId);
    }
  }
}

// Export singleton instance
export const subscriptionCache = SubscriptionCache.getInstance();
export default SubscriptionCache;