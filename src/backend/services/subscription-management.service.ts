import { logger } from 'firebase-functions';
import { cachedSubscriptionService, UserSubscriptionData } from './cached-subscription.service';
// TEMPORARILY DISABLED FOR DEPLOYMENT

// Temporary placeholder function for deployment
const invalidateUserSubscriptionCache = async (userId: string) => {
  // No-op during deployment
  return;
};

export class SubscriptionManagementService {
  /**
   * Activate lifetime premium access for user
    */
  async activateLifetimeAccess(userId: string, metadata?: any): Promise<void> {
    try {
      const subscriptionUpdate: Partial<UserSubscriptionData> = {
        subscriptionStatus: 'premium_lifetime',
        lifetimeAccess: true,
        features: {
          webPortal: true,
          aiChat: true,
          podcast: true,
          advancedAnalytics: true,
          videoIntroduction: true,
          roleDetection: true,
          externalData: true
        },
        purchasedAt: new Date(),
        metadata: {
          ...metadata,
          activatedAt: new Date(),
          activationType: 'lifetime'
        }
      };

      await cachedSubscriptionService.updateUserSubscription(userId, subscriptionUpdate);
      
      logger.info('Lifetime access activated and cache invalidated', { 
        userId,
        features: Object.keys(subscriptionUpdate.features || {})
      });
    } catch (error) {
      logger.error('Error activating lifetime access', { error, userId });
      throw error;
    }
  }

  /**
   * Deactivate premium access (revert to free)
    */
  async deactivatePremiumAccess(userId: string, reason?: string): Promise<void> {
    try {
      const subscriptionUpdate: Partial<UserSubscriptionData> = {
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
        },
        metadata: {
          deactivatedAt: new Date(),
          deactivationReason: reason || 'manual'
        }
      };

      await cachedSubscriptionService.updateUserSubscription(userId, subscriptionUpdate);
      
      logger.info('Premium access deactivated and cache invalidated', { 
        userId,
        reason
      });
    } catch (error) {
      logger.error('Error deactivating premium access', { error, userId });
      throw error;
    }
  }

  /**
   * Update specific premium features for user
    */
  async updatePremiumFeatures(userId: string, features: Partial<UserSubscriptionData['features']>): Promise<void> {
    try {
      // Get current subscription to merge features
      const currentSubscription = await cachedSubscriptionService.getUserSubscription(userId);
      
      const subscriptionUpdate: Partial<UserSubscriptionData> = {
        features: {
          ...currentSubscription.features,
          ...features
        },
        metadata: {
          ...currentSubscription.metadata,
          lastFeaturesUpdate: new Date(),
          updatedFeatures: Object.keys(features)
        }
      };

      await cachedSubscriptionService.updateUserSubscription(userId, subscriptionUpdate);
      
      logger.info('Premium features updated and cache invalidated', { 
        userId,
        updatedFeatures: Object.keys(features),
        newFeatureStates: features
      });
    } catch (error) {
      logger.error('Error updating premium features', { error, userId });
      throw error;
    }
  }

  /**
   * Get current subscription status (uses cached service)
    */
  async getSubscriptionStatus(userId: string): Promise<UserSubscriptionData> {
    return await cachedSubscriptionService.getUserSubscription(userId);
  }

  /**
   * Check if user has specific premium feature (with caching)
    */
  async hasFeature(userId: string, feature: keyof UserSubscriptionData['features']): Promise<boolean> {
    try {
      const subscription = await cachedSubscriptionService.getUserSubscription(userId);
      return subscription.features[feature] === true;
    } catch (error) {
      logger.error('Error checking feature access', { error, userId, feature });
      return false; // Fail safe to false
    }
  }

  /**
   * Bulk feature check (with caching)
    */
  async hasAnyFeatures(userId: string, features: (keyof UserSubscriptionData['features'])[]): Promise<boolean> {
    try {
      const subscription = await cachedSubscriptionService.getUserSubscription(userId);
      return features.some(feature => subscription.features[feature] === true);
    } catch (error) {
      logger.error('Error checking multiple feature access', { error, userId, features });
      return false; // Fail safe to false
    }
  }

  /**
   * Force refresh subscription from database (bypasses cache)
    */
  async forceRefreshSubscription(userId: string): Promise<UserSubscriptionData> {
    try {
      // Invalidate cache first
      cachedSubscriptionService.invalidateUserSubscription(userId);
      
      // Fetch fresh data (will be automatically cached)
      const subscription = await cachedSubscriptionService.getUserSubscription(userId);
      
      logger.info('Subscription force refreshed', { userId });
      return subscription;
    } catch (error) {
      logger.error('Error force refreshing subscription', { error, userId });
      throw error;
    }
  }

  /**
   * Get cache statistics for monitoring
    */
  getCachePerformanceStats() {
    return cachedSubscriptionService.getCacheStats();
  }
}

// Singleton instance
export const subscriptionManagementService = new SubscriptionManagementService();