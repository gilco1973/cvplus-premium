/**
 * CVPlus Premium Backend Services
 * 
 * Backend services and Firebase Functions for premium functionality including
 * subscription management, billing operations, feature access control,
 * advanced analytics, enterprise management, and dynamic pricing.
 * 
 * @author Gil Klainert
 * @version 4.0.0 - CVPlus Premium Module (Post-Migration)
 */

// Export Firebase Functions
export * from './functions';

// Export backend services  
export * from './services';

// Payment functionality - Phase 1 additions
export * from './functions/payments';
export * from './services/payments';

// Core payment functions for internal use
export { 
  getUserSubscriptionInternal,
  invalidateUserSubscriptionCache 
} from './functions/payments/core';

// Specific service exports for external consumption
export { PricingAnalyticsService } from './services/analytics/pricingAnalytics';
export { ReportBuilderService } from './services/analytics/reportBuilder';
export { RBACService } from './services/enterprise/rbac';
export { SSOManager } from './services/enterprise/ssoManager';
export { TenantManager } from './services/enterprise/tenantManager';
export { DynamicPricingEngine } from './services/pricing/dynamicEngine';
export { MarketIntelligenceService } from './services/pricing/marketIntelligence';
export { FeatureRegistry } from './services/featureRegistry';

// Package metadata
export const PREMIUM_BACKEND_VERSION = '4.0.0';
export const PREMIUM_BACKEND_NAME = '@cvplus/premium/backend';