/**
 * Premium Services - Staging for Migration
 *
 * This staging area contains subscription, pricing, and premium feature services
 * that will be moved to the @cvplus/premium submodule.
 *
 * Domain: Subscriptions, Billing, Premium Features, Usage Tracking
 * Target Submodule: @cvplus/premium
 * Migration Phase: 4B
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

// Note: Utility functions will be exported once they are properly implemented in the services