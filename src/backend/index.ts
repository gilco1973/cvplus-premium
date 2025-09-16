/**
 * CVPlus Premium Backend Services
 * 
 * Backend services and Firebase Functions for premium functionality including
 * subscription management, billing operations, feature access control,
 * advanced analytics, enterprise management, and dynamic pricing.
 * 
 * @author Gil Klainert
 * @version 4.0.0 - CVPlus Premium Module (Post-Migration Complete)
  */

// Export Firebase Functions
export * from './functions';

// Export backend services  
export * from './services';

// Middleware exports - MIGRATION PHASE 3 COMPLETE
export * from './middleware/premiumGuard';
export * from './middleware/enhancedPremiumGuard';

// Core payment functions for internal use
export { 
  getUserSubscriptionInternal,
  invalidateUserSubscriptionCache 
} from './functions/payments/core';

// Specific service exports for external consumption
export { PricingAnalyticsService } from './services/analytics/pricingAnalytics';
export { ReportBuilderService } from './services/analytics/reportBuilder';

// Subscription services - MIGRATION PHASE 2 COMPLETE
export { SubscriptionManagementService } from './services/subscription-management.service';
export { CachedSubscriptionService } from './services/cached-subscription.service';
export { SubscriptionCacheService } from './services/subscription-cache.service';

// Feature access services - MIGRATION PHASE 2 COMPLETE  
export { featureAccessCacheService } from './services/feature-access-cache.service';

// Billing services - MIGRATION PHASE 2 COMPLETE
export { AdvancedBillingService } from './services/billing/advanced-billing.service';
export { EnterpriseRBACService } from './services/enterprise/rbac';
export { SSOManager } from './services/enterprise/ssoManager';
export { EnterpriseAccountManager } from './services/enterprise/tenantManager';
export { DynamicPricingEngine } from './services/pricing/dynamicEngine';
export { MarketIntelligenceService } from './services/pricing/marketIntelligence';
export { FeatureRegistry } from './services/featureRegistry';
export { FeatureRegistryAdapter, featureRegistryInstance } from './services/featureRegistryAdapter';

// Security services
export * from './services/security';

// Package metadata
export const PREMIUM_BACKEND_VERSION = '4.0.0';
export const PREMIUM_BACKEND_NAME = '@cvplus/premium/backend';