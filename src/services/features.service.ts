/**
 * CVPlus Premium Module - Feature Gating Service
 * 
 * Comprehensive feature access control with caching, validation,
 * and usage tracking
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { logger } from '../utils/logger';
import {
  PremiumFeature,
  PremiumFeatures,
  UserSubscriptionData,
  SubscriptionTier,
  PremiumError,
  PremiumErrorCode
} from '../types';
import { SubscriptionService } from './subscription.service';
import {
  FREE_TIER_FEATURES,
  PREMIUM_TIER_FEATURES,
  FEATURE_DISPLAY_NAMES,
  FEATURE_DESCRIPTIONS,
  CACHE_TTL,
  CACHE_KEYS,
  PREMIUM_ERROR_CODES,
  ERROR_MESSAGES
} from '../constants/premium.constants';

/**
 * Feature access result
 */
interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentTier?: SubscriptionTier;
  requiredTier?: SubscriptionTier;
}

/**
 * Feature usage tracking
 */
interface FeatureUsage {
  userId: string;
  feature: PremiumFeature;
  timestamp: Date;
  granted: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Feature gate configuration
 */
interface FeatureGateConfig {
  feature: PremiumFeature;
  enabledTiers: SubscriptionTier[];
  gracePeriod?: number; // days
  softLaunch?: boolean;
  rolloutPercentage?: number; // 0-100
  requiredFlags?: string[];
}

/**
 * Feature service configuration
 */
interface FeatureServiceConfig {
  cache: {
    enabled: boolean;
    ttl: number;
  };
  usage: {
    trackUsage: boolean;
    maxHistorySize: number;
  };
  gates: FeatureGateConfig[];
  rollout: {
    enabled: boolean;
    defaultPercentage: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: FeatureServiceConfig = {
  cache: {
    enabled: true,
    ttl: CACHE_TTL.FEATURES
  },
  usage: {
    trackUsage: true,
    maxHistorySize: 1000
  },
  gates: [],
  rollout: {
    enabled: false,
    defaultPercentage: 100
  }
};

/**
 * Comprehensive feature gating and access control service
 */
export class FeatureService {
  private config: FeatureServiceConfig;
  private subscriptionService: SubscriptionService;
  private cache: Map<string, any> = new Map();
  private usageHistory: Map<string, FeatureUsage[]> = new Map();
  private featureGates: Map<PremiumFeature, FeatureGateConfig> = new Map();

  constructor(
    subscriptionService: SubscriptionService,
    config: Partial<FeatureServiceConfig> = {}
  ) {
    this.subscriptionService = subscriptionService;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize feature gates
    this.initializeFeatureGates();
    
    logger.info('Feature service initialized', {
      cacheEnabled: this.config.cache.enabled,
      usageTracking: this.config.usage.trackUsage,
      featureGates: this.featureGates.size
    });
  }

  // =============================================================================
  // FEATURE ACCESS CONTROL
  // =============================================================================

  /**
   * Check if user has access to a specific feature
   */
  async hasFeatureAccess(userId: string, feature: PremiumFeature): Promise<FeatureAccessResult> {
    try {
      const cacheKey = `${CACHE_KEYS.FEATURES}${userId}:${feature}`;
      
      // Check cache
      if (this.config.cache.enabled) {
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.data;
        }
      }

      // Get user subscription
      const subscription = await this.subscriptionService.getUserSubscription(userId);
      
      // Check feature gate configuration
      const gateResult = await this.checkFeatureGate(userId, feature, subscription);
      if (!gateResult.hasAccess) {
        return gateResult;
      }

      // Check subscription-based access
      const subscriptionResult = this.checkSubscriptionAccess(feature, subscription);
      
      // Track usage
      if (this.config.usage.trackUsage) {
        await this.trackFeatureUsage({
          userId,
          feature,
          timestamp: new Date(),
          granted: subscriptionResult.hasAccess,
          reason: subscriptionResult.reason
        });
      }

      // Cache the result
      if (this.config.cache.enabled) {
        this.cache.set(cacheKey, {
          data: subscriptionResult,
          expiresAt: Date.now() + (this.config.cache.ttl * 1000)
        });
      }

      return subscriptionResult;
    } catch (error) {
      logger.error('Failed to check feature access', {
        error: error instanceof Error ? error.message : error,
        userId,
        feature
      });

      // Return safe default (no access)
      return {
        hasAccess: false,
        reason: 'Error checking access',
        upgradeRequired: true
      };
    }
  }

  /**
   * Check access to multiple features at once
   */
  async hasMultipleFeatureAccess(
    userId: string,
    features: PremiumFeature[]
  ): Promise<Map<PremiumFeature, FeatureAccessResult>> {
    const results = new Map<PremiumFeature, FeatureAccessResult>();
    
    // Check each feature (could be optimized to batch subscription lookup)
    for (const feature of features) {
      try {
        const result = await this.hasFeatureAccess(userId, feature);
        results.set(feature, result);
      } catch (error) {
        logger.warn('Failed to check individual feature access', {
          userId,
          feature,
          error: error instanceof Error ? error.message : error
        });
        
        results.set(feature, {
          hasAccess: false,
          reason: 'Error checking access'
        });
      }
    }
    
    return results;
  }

  /**
   * Get all available features for a user
   */
  async getAvailableFeatures(userId: string): Promise<PremiumFeature[]> {
    try {
      const subscription = await this.subscriptionService.getUserSubscription(userId);
      const features: PremiumFeature[] = [];
      
      for (const feature of Object.keys(subscription.features) as PremiumFeature[]) {
        const result = await this.hasFeatureAccess(userId, feature);
        if (result.hasAccess) {
          features.push(feature);
        }
      }
      
      return features;
    } catch (error) {
      logger.error('Failed to get available features', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      return [];
    }
  }

  /**
   * Validate feature access and throw error if denied
   */
  async validateFeatureAccess(userId: string, feature: PremiumFeature): Promise<void> {
    const result = await this.hasFeatureAccess(userId, feature);
    
    if (!result.hasAccess) {
      const error = new Error(ERROR_MESSAGES[PREMIUM_ERROR_CODES.FEATURE_ACCESS_DENIED]) as PremiumError;
      error.code = PREMIUM_ERROR_CODES.FEATURE_ACCESS_DENIED;
      error.details = {
        feature,
        reason: result.reason,
        upgradeRequired: result.upgradeRequired,
        currentTier: result.currentTier,
        requiredTier: result.requiredTier
      };
      
      throw error;
    }
  }

  // =============================================================================
  // FEATURE GATES AND ROLLOUTS
  // =============================================================================

  /**
   * Configure feature gate
   */
  configureFeatureGate(config: FeatureGateConfig): void {
    this.featureGates.set(config.feature, config);
    
    logger.info('Feature gate configured', {
      feature: config.feature,
      enabledTiers: config.enabledTiers,
      rolloutPercentage: config.rolloutPercentage
    });
  }

  /**
   * Enable feature for specific tiers
   */
  enableFeatureForTiers(feature: PremiumFeature, tiers: SubscriptionTier[]): void {
    this.configureFeatureGate({
      feature,
      enabledTiers: tiers
    });
  }

  /**
   * Set feature rollout percentage
   */
  setFeatureRollout(feature: PremiumFeature, percentage: number): void {
    const existingConfig = this.featureGates.get(feature) || {
      feature,
      enabledTiers: ['PREMIUM']
    };
    
    this.configureFeatureGate({
      ...existingConfig,
      rolloutPercentage: Math.max(0, Math.min(100, percentage))
    });
  }

  /**
   * Check if user is in rollout group
   */
  private isUserInRollout(userId: string, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;
    
    // Deterministic rollout based on user ID hash
    const hash = this.hashUserId(userId);
    return (hash % 100) < percentage;
  }

  /**
   * Simple hash function for deterministic rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // =============================================================================
  // FEATURE METADATA AND DISCOVERY
  // =============================================================================

  /**
   * Get feature information
   */
  getFeatureInfo(feature: PremiumFeature): {
    name: string;
    description: string;
    requiredTier: SubscriptionTier[];
  } {
    // Determine required tier based on default configurations
    let requiredTier: SubscriptionTier[] = ['PREMIUM'];
    
    if (FREE_TIER_FEATURES[feature]) {
      requiredTier = ['FREE', 'PREMIUM'];
    }

    return {
      name: FEATURE_DISPLAY_NAMES[feature] || feature,
      description: FEATURE_DESCRIPTIONS[feature] || 'No description available',
      requiredTier
    };
  }

  /**
   * Get all feature information
   */
  getAllFeatureInfo(): Record<PremiumFeature, ReturnType<typeof this.getFeatureInfo>> {
    const features = Object.keys(FEATURE_DISPLAY_NAMES) as PremiumFeature[];
    const featureInfo = {} as Record<PremiumFeature, ReturnType<typeof this.getFeatureInfo>>;
    
    for (const feature of features) {
      featureInfo[feature] = this.getFeatureInfo(feature);
    }
    
    return featureInfo;
  }

  /**
   * Get upgrade suggestions for user
   */
  async getUpgradeSuggestions(userId: string): Promise<{
    currentTier: SubscriptionTier;
    availableFeatures: PremiumFeature[];
    blockedFeatures: PremiumFeature[];
    recommendedTier?: SubscriptionTier;
  }> {
    try {
      const subscription = await this.subscriptionService.getUserSubscription(userId);
      const currentTier = subscription.lifetimeAccess ? 'PREMIUM' : 'FREE';
      
      const availableFeatures: PremiumFeature[] = [];
      const blockedFeatures: PremiumFeature[] = [];
      
      for (const feature of Object.keys(FEATURE_DISPLAY_NAMES) as PremiumFeature[]) {
        const result = await this.hasFeatureAccess(userId, feature);
        if (result.hasAccess) {
          availableFeatures.push(feature);
        } else {
          blockedFeatures.push(feature);
        }
      }
      
      return {
        currentTier,
        availableFeatures,
        blockedFeatures,
        recommendedTier: blockedFeatures.length > 0 ? 'PREMIUM' : undefined
      };
    } catch (error) {
      logger.error('Failed to get upgrade suggestions', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      
      return {
        currentTier: 'FREE',
        availableFeatures: [],
        blockedFeatures: [],
        recommendedTier: 'PREMIUM'
      };
    }
  }

  // =============================================================================
  // USAGE TRACKING AND ANALYTICS
  // =============================================================================

  /**
   * Get feature usage history for user
   */
  getFeatureUsageHistory(userId: string, limit: number = 50): FeatureUsage[] {
    const history = this.usageHistory.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * Get feature usage statistics
   */
  getFeatureUsageStats(userId: string): {
    totalAttempts: number;
    grantedAttempts: number;
    deniedAttempts: number;
    mostUsedFeatures: Array<{ feature: PremiumFeature; count: number }>;
  } {
    const history = this.usageHistory.get(userId) || [];
    
    const stats = {
      totalAttempts: history.length,
      grantedAttempts: history.filter(usage => usage.granted).length,
      deniedAttempts: history.filter(usage => !usage.granted).length,
      mostUsedFeatures: [] as Array<{ feature: PremiumFeature; count: number }>
    };
    
    // Calculate most used features
    const featureCounts = new Map<PremiumFeature, number>();
    for (const usage of history) {
      featureCounts.set(usage.feature, (featureCounts.get(usage.feature) || 0) + 1);
    }
    
    stats.mostUsedFeatures = Array.from(featureCounts.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return stats;
  }

  // =============================================================================
  // CACHE MANAGEMENT
  // =============================================================================

  /**
   * Invalidate feature cache for user
   */
  invalidateUserFeatureCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${CACHE_KEYS.FEATURES}${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    logger.debug('Feature cache invalidated for user', { userId, keysCleared: keysToDelete.length });
  }

  /**
   * Clear all feature cache
   */
  clearFeatureCache(): void {
    this.cache.clear();
    logger.info('All feature cache cleared');
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Initialize default feature gates
   */
  private initializeFeatureGates(): void {
    // Configure gates based on default tier features
    const premiumFeatures = Object.keys(PREMIUM_TIER_FEATURES) as PremiumFeature[];
    
    for (const feature of premiumFeatures) {
      if (PREMIUM_TIER_FEATURES[feature] && !FREE_TIER_FEATURES[feature]) {
        // Premium-only feature
        this.configureFeatureGate({
          feature,
          enabledTiers: ['PREMIUM']
        });
      } else if (FREE_TIER_FEATURES[feature]) {
        // Available to all tiers
        this.configureFeatureGate({
          feature,
          enabledTiers: ['FREE', 'PREMIUM']
        });
      }
    }
  }

  /**
   * Check feature gate configuration
   */
  private async checkFeatureGate(
    userId: string,
    feature: PremiumFeature,
    subscription: UserSubscriptionData
  ): Promise<FeatureAccessResult> {
    const gate = this.featureGates.get(feature);
    
    if (!gate) {
      // No specific gate configuration, allow access
      return { hasAccess: true };
    }

    // Check rollout percentage
    if (gate.rolloutPercentage !== undefined && gate.rolloutPercentage < 100) {
      if (!this.isUserInRollout(userId, gate.rolloutPercentage)) {
        return {
          hasAccess: false,
          reason: 'Feature not available in your rollout group',
          upgradeRequired: false
        };
      }
    }

    // Check required flags (if any)
    if (gate.requiredFlags && gate.requiredFlags.length > 0) {
      // This would integrate with a feature flag service
      // For now, assume all flags are enabled
    }

    return { hasAccess: true };
  }

  /**
   * Check subscription-based feature access
   */
  private checkSubscriptionAccess(
    feature: PremiumFeature,
    subscription: UserSubscriptionData
  ): FeatureAccessResult {
    const currentTier: SubscriptionTier = subscription.lifetimeAccess ? 'PREMIUM' : 'FREE';
    
    // Check if feature is enabled in subscription
    if (!subscription.features[feature]) {
      return {
        hasAccess: false,
        reason: `Feature '${feature}' not enabled in current subscription`,
        upgradeRequired: !subscription.lifetimeAccess,
        currentTier,
        requiredTier: 'PREMIUM'
      };
    }

    // Check subscription status
    if (subscription.subscriptionStatus === 'free' && PREMIUM_TIER_FEATURES[feature] && !FREE_TIER_FEATURES[feature]) {
      return {
        hasAccess: false,
        reason: 'Premium feature requires subscription upgrade',
        upgradeRequired: true,
        currentTier: 'FREE',
        requiredTier: 'PREMIUM'
      };
    }

    // Check expiration
    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      return {
        hasAccess: false,
        reason: 'Subscription has expired',
        upgradeRequired: true,
        currentTier
      };
    }

    return {
      hasAccess: true,
      currentTier
    };
  }

  /**
   * Track feature usage
   */
  private async trackFeatureUsage(usage: FeatureUsage): Promise<void> {
    if (!this.config.usage.trackUsage) return;

    let userHistory = this.usageHistory.get(usage.userId) || [];
    userHistory.push(usage);
    
    // Keep only recent usage within limit
    if (userHistory.length > this.config.usage.maxHistorySize) {
      userHistory = userHistory.slice(-this.config.usage.maxHistorySize);
    }
    
    this.usageHistory.set(usage.userId, userHistory);
    
    // In production, this would be persisted to database
    logger.debug('Feature usage tracked', {
      userId: usage.userId,
      feature: usage.feature,
      granted: usage.granted
    });
  }
}