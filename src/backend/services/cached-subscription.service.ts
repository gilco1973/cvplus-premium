import { logger } from 'firebase-functions';
import { db } from '../config/firebase';
import { subscriptionCache } from './subscription-cache.service';

// Import the proper UserSubscriptionData from types
import { UserSubscriptionData } from '../../types';

export class CachedSubscriptionService {
  /**
   * Get user subscription with caching
    */
  async getUserSubscription(userId: string): Promise<UserSubscriptionData> {
    try {
      // Try to get from cache first
      const cachedData = subscriptionCache.get(userId);
      if (cachedData) {
        logger.debug('Retrieved subscription from cache', { userId });
        return cachedData;
      }

      // Cache miss - fetch from database
      logger.debug('Cache miss - fetching subscription from database', { userId });
      const subscriptionData = await this.fetchFromDatabase(userId);

      // Cache the result for future requests
      subscriptionCache.set(userId, subscriptionData);

      return subscriptionData;
    } catch (error) {
      logger.error('Error getting cached user subscription', { error, userId });
      
      // Fallback to direct database access on any error
      logger.warn('Falling back to direct database access', { userId });
      return await this.fetchFromDatabase(userId);
    }
  }

  /**
   * Invalidate cached subscription data (call when subscription changes)
    */
  invalidateUserSubscription(userId: string): void {
    try {
      const invalidated = subscriptionCache.invalidate(userId);
      logger.info('Subscription cache invalidated', { userId, invalidated });
    } catch (error) {
      logger.error('Error invalidating subscription cache', { error, userId });
    }
  }

  /**
   * Update subscription and invalidate cache
    */
  async updateUserSubscription(userId: string, subscriptionData: Partial<UserSubscriptionData>): Promise<void> {
    try {
      // Update in database
      await db
        .collection('userSubscriptions')
        .doc(userId)
        .set(subscriptionData, { merge: true });

      // Invalidate cache to ensure fresh data on next read
      this.invalidateUserSubscription(userId);

      logger.info('User subscription updated and cache invalidated', { 
        userId,
        updatedFields: Object.keys(subscriptionData)
      });
    } catch (error) {
      logger.error('Error updating user subscription', { error, userId });
      throw error;
    }
  }

  /**
   * Get cache statistics for monitoring
    */
  getCacheStats() {
    return subscriptionCache.getStats();
  }

  /**
   * Clear all cached subscriptions (for maintenance)
    */
  clearAllCache(): void {
    subscriptionCache.clearAll();
    logger.info('All subscription cache cleared');
  }

  private async fetchFromDatabase(userId: string): Promise<UserSubscriptionData> {
    try {
      const subscriptionDoc = await db
        .collection('userSubscriptions')
        .doc(userId)
        .get();

      if (!subscriptionDoc.exists) {
        // Return default free subscription
        const defaultSubscription: UserSubscriptionData = {
          subscriptionStatus: 'free',
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

        logger.debug('No subscription found, returning default', { userId });
        return defaultSubscription;
      }

      const data = subscriptionDoc.data() as UserSubscriptionData;
      logger.debug('Fetched subscription from database', { 
        userId,
        subscriptionStatus: data.subscriptionStatus,
        lifetimeAccess: data.lifetimeAccess
      });

      return data;
    } catch (error) {
      logger.error('Error fetching subscription from database', { error, userId });
      throw error;
    }
  }
}

// Singleton instance
export const cachedSubscriptionService = new CachedSubscriptionService();