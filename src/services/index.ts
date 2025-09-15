/**
 * Premium Services Export Index
 *
 * Centralizes all premium-related services including subscription management,
 * pricing, feature access, usage tracking, and tier management.
 *
 * Domain: Subscriptions, Billing, Premium Features, Usage Tracking, Tier Management
 * Architecture Layer: Layer 3 (Business Services)
 */

// Premium cache services - only export what actually exists
export { subscriptionCacheService } from './subscription-cache.service';
export { pricingCacheService } from './pricing-cache.service';
export { featureAccessCacheService } from './feature-access-cache.service';
export { usageBatchCacheService } from './usage-batch-cache.service';

// Type exports - only export what actually exists
export type {
  SubscriptionCacheMetrics,
  SubscriptionCacheResult
} from './subscription-cache.service';

export type {
  PricingRequest,
  PricingResult
} from './pricing-cache.service';

export type {
  FeatureAccessCacheMetrics,
  FeatureAccessResult
} from './feature-access-cache.service';

export type {
  UsageEvent,
  BatchedUsageData
} from './usage-batch-cache.service';

// Tier Management Services (migrated from core)
export { TierManager } from './tier-management/TierManager';
export type {
  UserTier,
  TierConfig,
  UserTierInfo,
  TierLimits,
  TierCheckResult,
  FeatureAccessRequest,
  FeatureAccessResponse,
  UsageStats,
  SubscriptionStatus
} from './tier-management/types';