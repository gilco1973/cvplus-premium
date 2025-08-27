/**
 * CVPlus Premium Module - Subscription Management Service
 * 
 * Comprehensive subscription management with caching, validation,
 * and lifecycle management
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { logger } from '../utils/logger';
import {
  UserSubscriptionData,
  SubscriptionStatus,
  PremiumFeature,
  PremiumFeatures,
  SubscriptionEvent,
  SubscriptionChangeReason,
  SubscriptionChangeLog,
  SubscriptionValidation
} from '../types';
import {
  FREE_TIER_FEATURES,
  PREMIUM_TIER_FEATURES,
  CACHE_TTL,
  CACHE_KEYS,
  PREMIUM_ERROR_CODES,
  ERROR_MESSAGES
} from '../constants/premium.constants';

/**
 * Cache entry for subscription data
 */
interface SubscriptionCacheEntry {
  data: UserSubscriptionData;
  expiresAt: number;
  lastUpdated: number;
}

/**
 * Subscription service configuration
 */
interface SubscriptionServiceConfig {
  cache: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number;
  };
  validation: {
    strict: boolean;
    requireVerification: boolean;
  };
  events: {
    enabled: boolean;
    maxHistorySize: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SubscriptionServiceConfig = {
  cache: {
    enabled: true,
    ttl: CACHE_TTL.SUBSCRIPTION,
    maxSize: 1000
  },
  validation: {
    strict: true,
    requireVerification: false
  },
  events: {
    enabled: true,
    maxHistorySize: 100
  }
};

/**
 * Comprehensive subscription management service
 */
export class SubscriptionService {
  private cache: Map<string, SubscriptionCacheEntry> = new Map();
  private changeLog: Map<string, SubscriptionChangeLog[]> = new Map();
  private config: SubscriptionServiceConfig;
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0
  };

  constructor(config: Partial<SubscriptionServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Set up cache cleanup interval
    if (this.config.cache.enabled) {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }

    logger.info('Subscription service initialized', {
      cacheEnabled: this.config.cache.enabled,
      cacheTTL: this.config.cache.ttl,
      strictValidation: this.config.validation.strict
    });
  }

  // =============================================================================
  // SUBSCRIPTION RETRIEVAL
  // =============================================================================

  /**
   * Get user subscription with caching and validation
   */
  async getUserSubscription(userId: string): Promise<UserSubscriptionData> {
    try {
      // Check cache first
      if (this.config.cache.enabled) {
        const cached = this.getCachedSubscription(userId);
        if (cached) {
          this.cacheStats.hits++;
          return cached;
        }
        this.cacheStats.misses++;
      }

      // Load from database (implementation would depend on your database choice)
      const subscription = await this.loadSubscriptionFromDatabase(userId);
      
      if (!subscription) {
        // Create default free subscription
        const defaultSubscription = this.createDefaultSubscription(userId);
        await this.saveSubscriptionToDatabase(defaultSubscription);
        
        // Cache the default subscription
        if (this.config.cache.enabled) {
          this.setCachedSubscription(userId, defaultSubscription);
        }
        
        return defaultSubscription;
      }

      // Validate subscription
      const validation = this.validateSubscription(subscription);
      if (!validation.isValid && this.config.validation.strict) {
        throw new Error(`Invalid subscription: ${validation.errors.join(', ')}`);
      }

      // Cache the subscription
      if (this.config.cache.enabled) {
        this.setCachedSubscription(userId, subscription);
      }

      return subscription;
    } catch (error) {
      logger.error('Failed to get user subscription', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Get multiple user subscriptions efficiently
   */
  async getUserSubscriptions(userIds: string[]): Promise<Map<string, UserSubscriptionData>> {
    const results = new Map<string, UserSubscriptionData>();
    const uncachedUserIds: string[] = [];

    // Check cache for each user
    if (this.config.cache.enabled) {
      for (const userId of userIds) {
        const cached = this.getCachedSubscription(userId);
        if (cached) {
          results.set(userId, cached);
          this.cacheStats.hits++;
        } else {
          uncachedUserIds.push(userId);
          this.cacheStats.misses++;
        }
      }
    } else {
      uncachedUserIds.push(...userIds);
    }

    // Load uncached subscriptions from database
    if (uncachedUserIds.length > 0) {
      const subscriptions = await this.loadSubscriptionsFromDatabase(uncachedUserIds);
      
      for (const userId of uncachedUserIds) {
        let subscription = subscriptions.get(userId);
        
        if (!subscription) {
          // Create default subscription for users without one
          subscription = this.createDefaultSubscription(userId);
          await this.saveSubscriptionToDatabase(subscription);
        }

        results.set(userId, subscription);
        
        // Cache the subscription
        if (this.config.cache.enabled) {
          this.setCachedSubscription(userId, subscription);
        }
      }
    }

    return results;
  }

  // =============================================================================
  // SUBSCRIPTION MODIFICATION
  // =============================================================================

  /**
   * Activate lifetime premium access
   */
  async activateLifetimeAccess(
    userId: string,
    metadata?: Record<string, any>
  ): Promise<UserSubscriptionData> {
    try {
      const currentSubscription = await this.getUserSubscription(userId);
      
      // Check if already has lifetime access
      if (currentSubscription.lifetimeAccess) {
        logger.warn('User already has lifetime access', { userId });
        return currentSubscription;
      }

      const updatedSubscription: UserSubscriptionData = {
        ...currentSubscription,
        subscriptionStatus: 'premium_lifetime',
        lifetimeAccess: true,
        features: { ...PREMIUM_TIER_FEATURES },
        purchasedAt: new Date(),
        metadata: {
          ...currentSubscription.metadata,
          ...metadata,
          activatedAt: new Date(),
          activationType: 'lifetime'
        },
        updatedAt: new Date()
      };

      // Save to database
      await this.saveSubscriptionToDatabase(updatedSubscription);

      // Update cache
      if (this.config.cache.enabled) {
        this.setCachedSubscription(userId, updatedSubscription);
      }

      // Log the change
      await this.logSubscriptionChange(
        userId,
        'activated',
        'user_requested',
        currentSubscription.subscriptionStatus,
        'premium_lifetime'
      );

      logger.info('Lifetime premium access activated', {
        userId,
        previousStatus: currentSubscription.subscriptionStatus,
        features: Object.keys(PREMIUM_TIER_FEATURES)
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Failed to activate lifetime access', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Deactivate premium access (revert to free)
   */
  async deactivatePremiumAccess(
    userId: string,
    reason: SubscriptionChangeReason = 'user_requested'
  ): Promise<UserSubscriptionData> {
    try {
      const currentSubscription = await this.getUserSubscription(userId);
      
      // Check if already free
      if (currentSubscription.subscriptionStatus === 'free') {
        logger.warn('User already has free subscription', { userId });
        return currentSubscription;
      }

      const updatedSubscription: UserSubscriptionData = {
        ...currentSubscription,
        subscriptionStatus: 'free',
        lifetimeAccess: false,
        features: { ...FREE_TIER_FEATURES },
        expiresAt: undefined,
        metadata: {
          ...currentSubscription.metadata,
          deactivatedAt: new Date(),
          deactivationReason: reason,
          previousStatus: currentSubscription.subscriptionStatus
        },
        updatedAt: new Date()
      };

      // Save to database
      await this.saveSubscriptionToDatabase(updatedSubscription);

      // Update cache
      if (this.config.cache.enabled) {
        this.setCachedSubscription(userId, updatedSubscription);
      }

      // Log the change
      await this.logSubscriptionChange(
        userId,
        'cancelled',
        reason,
        currentSubscription.subscriptionStatus,
        'free'
      );

      logger.info('Premium access deactivated', {
        userId,
        reason,
        previousStatus: currentSubscription.subscriptionStatus
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Failed to deactivate premium access', {
        error: error instanceof Error ? error.message : error,
        userId,
        reason
      });
      throw error;
    }
  }

  /**
   * Update specific premium features
   */
  async updatePremiumFeatures(
    userId: string,
    featureUpdates: Partial<PremiumFeatures>
  ): Promise<UserSubscriptionData> {
    try {
      const currentSubscription = await this.getUserSubscription(userId);
      
      const updatedSubscription: UserSubscriptionData = {
        ...currentSubscription,
        features: {
          ...currentSubscription.features,
          ...featureUpdates
        },
        metadata: {
          ...currentSubscription.metadata,
          lastFeaturesUpdate: new Date(),
          updatedFeatures: Object.keys(featureUpdates)
        },
        updatedAt: new Date()
      };

      // Validate the updated subscription
      const validation = this.validateSubscription(updatedSubscription);
      if (!validation.isValid && this.config.validation.strict) {
        throw new Error(`Invalid feature update: ${validation.errors.join(', ')}`);
      }

      // Save to database
      await this.saveSubscriptionToDatabase(updatedSubscription);

      // Update cache
      if (this.config.cache.enabled) {
        this.setCachedSubscription(userId, updatedSubscription);
      }

      // Log the change
      await this.logSubscriptionChange(
        userId,
        'upgraded',
        'user_requested',
        currentSubscription.subscriptionStatus,
        updatedSubscription.subscriptionStatus
      );

      logger.info('Premium features updated', {
        userId,
        updatedFeatures: Object.keys(featureUpdates),
        newFeatureStates: featureUpdates
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Failed to update premium features', {
        error: error instanceof Error ? error.message : error,
        userId,
        featureUpdates
      });
      throw error;
    }
  }

  // =============================================================================
  // FEATURE ACCESS CHECKING
  // =============================================================================

  /**
   * Check if user has access to a specific feature
   */
  async hasFeature(userId: string, feature: PremiumFeature): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription.features[feature] === true;
    } catch (error) {
      logger.error('Failed to check feature access', {
        error: error instanceof Error ? error.message : error,
        userId,
        feature
      });
      // Fail safe to false
      return false;
    }
  }

  /**
   * Check if user has any of the specified features
   */
  async hasAnyFeatures(userId: string, features: PremiumFeature[]): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return features.some(feature => subscription.features[feature] === true);
    } catch (error) {
      logger.error('Failed to check multiple feature access', {
        error: error instanceof Error ? error.message : error,
        userId,
        features
      });
      // Fail safe to false
      return false;
    }
  }

  /**
   * Check if user has all specified features
   */
  async hasAllFeatures(userId: string, features: PremiumFeature[]): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return features.every(feature => subscription.features[feature] === true);
    } catch (error) {
      logger.error('Failed to check all features access', {
        error: error instanceof Error ? error.message : error,
        userId,
        features
      });
      // Fail safe to false
      return false;
    }
  }

  /**
   * Get list of enabled features for user
   */
  async getEnabledFeatures(userId: string): Promise<PremiumFeature[]> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return Object.entries(subscription.features)
        .filter(([, enabled]) => enabled === true)
        .map(([feature]) => feature as PremiumFeature);
    } catch (error) {
      logger.error('Failed to get enabled features', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      return [];
    }
  }

  // =============================================================================
  // CACHE MANAGEMENT
  // =============================================================================

  /**
   * Invalidate user subscription cache
   */
  invalidateUserSubscription(userId: string): void {
    if (this.config.cache.enabled) {
      const deleted = this.cache.delete(userId);
      if (deleted) {
        this.cacheStats.evictions++;
        this.cacheStats.size--;
        logger.debug('Subscription cache invalidated', { userId });
      }
    }
  }

  /**
   * Force refresh subscription from database
   */
  async forceRefreshSubscription(userId: string): Promise<UserSubscriptionData> {
    // Invalidate cache first
    this.invalidateUserSubscription(userId);
    
    // Fetch fresh data (will be automatically cached)
    const subscription = await this.getUserSubscription(userId);
    
    logger.info('Subscription force refreshed', { userId });
    return subscription;
  }

  /**
   * Get cache performance statistics
   */
  getCacheStats(): typeof this.cacheStats & { hitRate: number } {
    return {
      ...this.cacheStats,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
    };
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheStats.evictions += size;
    this.cacheStats.size = 0;
    
    logger.info('Subscription cache cleared', { evictedEntries: size });
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  /**
   * Validate subscription data structure and business rules
   */
  validateSubscription(subscription: UserSubscriptionData): SubscriptionValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!subscription.userId) {
      errors.push('User ID is required');
    }
    
    if (!subscription.email) {
      errors.push('Email is required');
    }

    if (!subscription.subscriptionStatus) {
      errors.push('Subscription status is required');
    }

    // Business logic validation
    if (subscription.lifetimeAccess && subscription.subscriptionStatus === 'free') {
      errors.push('Free subscription cannot have lifetime access');
    }

    if (subscription.subscriptionStatus === 'premium_lifetime' && !subscription.lifetimeAccess) {
      warnings.push('Premium lifetime status should have lifetime access flag');
    }

    // Feature validation
    if (subscription.subscriptionStatus === 'free') {
      const hasPremiumFeatures = Object.entries(subscription.features)
        .some(([feature, enabled]) => enabled && !(feature in FREE_TIER_FEATURES) || FREE_TIER_FEATURES[feature as keyof PremiumFeatures] !== enabled);
      
      if (hasPremiumFeatures) {
        errors.push('Free subscription cannot have premium features enabled');
      }
    }

    // Date validation
    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      warnings.push('Subscription has expired');
    }

    if (subscription.createdAt && subscription.updatedAt && subscription.createdAt > subscription.updatedAt) {
      warnings.push('Created date is after updated date');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      subscription
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Get subscription from cache
   */
  private getCachedSubscription(userId: string): UserSubscriptionData | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(userId);
      this.cacheStats.evictions++;
      this.cacheStats.size--;
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set subscription in cache
   */
  private setCachedSubscription(userId: string, subscription: UserSubscriptionData): void {
    // Check cache size limit
    if (this.cache.size >= this.config.cache.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.cacheStats.evictions++;
      }
    } else {
      this.cacheStats.size++;
    }

    const entry: SubscriptionCacheEntry = {
      data: subscription,
      expiresAt: Date.now() + (this.config.cache.ttl * 1000),
      lastUpdated: Date.now()
    };

    this.cache.set(userId, entry);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [userId, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(userId);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.cacheStats.evictions += removed;
      this.cacheStats.size -= removed;
      logger.debug('Cache cleanup completed', { removedEntries: removed });
    }
  }

  /**
   * Create default free subscription
   */
  private createDefaultSubscription(userId: string): UserSubscriptionData {
    const now = new Date();
    
    return {
      userId,
      email: '', // Would need to be set from user data
      googleId: '', // Would need to be set from user data
      subscriptionStatus: 'free',
      lifetimeAccess: false,
      features: { ...FREE_TIER_FEATURES },
      metadata: {
        createdBy: 'system',
        creationType: 'default'
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Log subscription change for auditing
   */
  private async logSubscriptionChange(
    userId: string,
    event: SubscriptionEvent,
    reason: SubscriptionChangeReason,
    fromStatus?: SubscriptionStatus,
    toStatus?: SubscriptionStatus
  ): Promise<void> {
    if (!this.config.events.enabled) return;

    const changeEntry: SubscriptionChangeLog = {
      id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      event,
      fromStatus,
      toStatus: toStatus!,
      reason,
      timestamp: new Date()
    };

    // Store in memory (in production, this would go to a database)
    let userLogs = this.changeLog.get(userId) || [];
    userLogs.push(changeEntry);
    
    // Keep only recent entries
    if (userLogs.length > this.config.events.maxHistorySize) {
      userLogs = userLogs.slice(-this.config.events.maxHistorySize);
    }
    
    this.changeLog.set(userId, userLogs);

    logger.info('Subscription change logged', {
      userId,
      event,
      reason,
      fromStatus,
      toStatus
    });
  }

  // These methods would be implemented based on your database choice
  private async loadSubscriptionFromDatabase(userId: string): Promise<UserSubscriptionData | null> {
    // Implementation depends on database (Firestore, PostgreSQL, etc.)
    throw new Error('loadSubscriptionFromDatabase must be implemented');
  }

  private async loadSubscriptionsFromDatabase(userIds: string[]): Promise<Map<string, UserSubscriptionData>> {
    // Implementation depends on database
    throw new Error('loadSubscriptionsFromDatabase must be implemented');
  }

  private async saveSubscriptionToDatabase(subscription: UserSubscriptionData): Promise<void> {
    // Implementation depends on database
    throw new Error('saveSubscriptionToDatabase must be implemented');
  }
}