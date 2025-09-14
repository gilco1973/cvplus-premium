/**
 * CVPlus Premium Module - Services Index
 * 
 * Centralized export point for all premium services including
 * the new consolidated Phase 2 services that eliminate duplication
 * across Firebase Functions.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-28
 * @category Premium Services
 */

// =============================================================================
// EXISTING PREMIUM SERVICES
// =============================================================================

export * from './billing.service';
export * from './features.service';
export * from './premium-security-monitor';
export * from './stripe.service';
export * from './subscription.service';
export * from './usage.service';

// =============================================================================
// PHASE 2 CONSOLIDATED SERVICES - DEDUPLICATION
// =============================================================================

/**
 * Feature Access Service - Consolidates 120+ lines of duplicated
 * premium feature validation logic from Firebase Functions
 */
export { 
  FeatureAccessService,
  requirePremiumTier,
  requireFeatureAccess,
  enforceFeatureGate
} from './feature-access';

/**
 * Tier Validation Service - Centralizes tier checking logic
 * extracted from individual Firebase Functions
 */
export {
  TierValidationService,
  requireTier,
  requirePremium,
  requireEnterprise
} from './tier-validation';

/**
 * Subscription Utils Service - Common subscription status
 * and billing utilities extracted from duplicated Firebase Functions
 */
export {
  SubscriptionUtilsService,
  requireActiveSubscription,
  getSubscriptionStatus,
  SubscriptionStatusType
} from './subscription-utils';

// =============================================================================
// SERVICE REGISTRY
// =============================================================================

/**
 * Available premium services for dependency injection
 */
export const PremiumServices = {
  // Existing services
  BillingService: () => import('./billing.service'),
  FeaturesService: () => import('./features.service'),
  StripeService: () => import('./stripe.service'),
  SubscriptionService: () => import('./subscription.service'),
  UsageService: () => import('./usage.service'),
  
  // Consolidated Phase 2 services
  FeatureAccessService: () => import('./feature-access'),
  TierValidationService: () => import('./tier-validation'),
  SubscriptionUtilsService: () => import('./subscription-utils')
} as const;

/**
 * Service initialization helper
 */
export async function initializePremiumServices(): Promise<{
  featureAccess: import('./feature-access').FeatureAccessService;
  tierValidation: import('./tier-validation').TierValidationService;
  subscriptionUtils: import('./subscription-utils').SubscriptionUtilsService;
}> {
  const [
    { FeatureAccessService },
    { TierValidationService },
    { SubscriptionUtilsService }
  ] = await Promise.all([
    import('./feature-access'),
    import('./tier-validation'),
    import('./subscription-utils')
  ]);

  return {
    featureAccess: FeatureAccessService.getInstance(),
    tierValidation: TierValidationService.getInstance(),
    subscriptionUtils: SubscriptionUtilsService.getInstance()
  };
}