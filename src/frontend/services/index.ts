/**
 * CVPlus Premium Module - Service Index
 * Central export file for all premium services and components
 * Author: Gil Klainert
 * Date: August 27, 2025
  */

// Core Services
export { FeatureRegistry, CV_FEATURES, PREMIUM_TIERS } from './featureRegistry';
export { FeatureGatingService, featureGatingService } from './featureGatingService';
export { UsageTracker, usageTracker } from './usageTracker';
export { SubscriptionCache, subscriptionCache } from './subscriptionCache';

// Service Types
export type {
  CVFeature,
  PremiumTier,
  FeatureAccessResult,
  GatedResult,
  FeatureContext,
  GracePeriod,
  UsageLimitCheck
} from './featureGatingService';

export type {
  AnalyticsEvent,
  UsageMetrics,
  FeatureUsageEvent,
  FeatureAccessEvent
} from './usageTracker';

export type {
  CachedSubscription,
  CacheEntry
} from './subscriptionCache';

// Service Instances (Singletons)
export const premiumServices = {
  featureGating: featureGatingService,
  usageTracker: usageTracker,
  subscriptionCache: subscriptionCache,
  featureRegistry: FeatureRegistry
} as const;

// Utility Functions
export const premiumUtils = {
  /**
   * Check if a feature requires premium access
    */
  isPremiumFeature: (featureId: string): boolean => {
    const feature = FeatureRegistry.getFeature(featureId);
    return feature ? feature.tier !== 'free' : false;
  },

  /**
   * Get upgrade URL for a specific feature
    */
  getUpgradeUrl: (featureId: string, reason?: string): string => {
    const params = new URLSearchParams({ feature: featureId });
    if (reason) params.set('reason', reason);
    return `/pricing?${params.toString()}`;
  },

  /**
   * Format usage limits for display
    */
  formatUsageLimit: (limit: number): string => {
    if (limit === -1) return 'Unlimited';
    return limit.toString();
  },

  /**
   * Calculate usage percentage
    */
  calculateUsagePercentage: (current: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return Math.min(100, (current / limit) * 100);
  },

  /**
   * Get tier display name
    */
  getTierDisplayName: (tier: string): string => {
    const names: Record<string, string> = {
      free: 'Free',
      premium: 'Premium',
      enterprise: 'Enterprise'
    };
    return names[tier] || tier;
  },

  /**
   * Get tier color for UI
    */
  getTierColor: (tier: string): string => {
    const colors: Record<string, string> = {
      free: 'gray',
      premium: 'purple',
      enterprise: 'gold'
    };
    return colors[tier] || 'gray';
  }
} as const;

// Constants
export const PREMIUM_CONSTANTS = {
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  BATCH_SIZE: 50,
  BATCH_INTERVAL: 30000, // 30 seconds
  GRACE_PERIOD_DAYS: 7,
  MAX_RATE_LIMIT: 100,
  
  // Feature Categories
  FEATURE_CATEGORIES: {
    CORE: 'core',
    AI_POWERED: 'ai-powered',
    INTERACTIVE: 'interactive',
    MEDIA: 'media',
    VISUAL: 'visual',
    ANALYTICS: 'analytics'
  },
  
  // Subscription Tiers
  TIERS: {
    FREE: 'free',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise'
  },
  
  // Access Result Reasons
  ACCESS_REASONS: {
    AUTHORIZED: 'authorized',
    INSUFFICIENT_PLAN: 'insufficient_plan',
    USAGE_LIMIT_EXCEEDED: 'usage_limit_exceeded',
    GRACE_PERIOD: 'grace_period',
    SYSTEM_ERROR: 'system_error'
  },
  
  // Event Types
  EVENT_TYPES: {
    FEATURE_VIEW: 'feature_view',
    FEATURE_USAGE: 'feature_usage',
    FEATURE_BLOCKED: 'feature_blocked',
    FEATURE_ERROR: 'feature_error'
  }
} as const;

// Version Information
export const PREMIUM_MODULE_INFO = {
  version: '2.0.0',
  phase: 'Phase 2 - Feature Gating & Usage Tracking',
  author: 'Gil Klainert',
  lastUpdated: '2025-08-27',
  features: [
    'Comprehensive feature gating',
    'Real-time usage tracking',
    'Subscription caching',
    'Premium dashboard',
    'Backend API protection',
    'Grace period handling',
    'Conversion analytics'
  ]
} as const;

export default premiumServices;