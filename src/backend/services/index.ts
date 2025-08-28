/**
 * CVPlus Premium Backend Services
 * 
 * Re-exports core premium services for backend use with advanced
 * analytics, enterprise management, and pricing services.
 * 
 * @author Gil Klainert
 * @version 4.0.0 - CVPlus Premium Module (Post-Migration)
 */

// Re-export core services from the main services directory
export { StripeService } from '../../services/stripe.service';
export { SubscriptionService } from '../../services/subscription.service';
export { BillingService } from '../../services/billing.service';
export { FeatureService } from '../../services/features.service';
export { UsageService } from '../../services/usage.service';

// Advanced Analytics Services
export { PricingAnalyticsService } from './analytics/pricingAnalytics';
export { ReportBuilderService } from './analytics/reportBuilder';

// Enterprise Services
export { RBACService } from './enterprise/rbac';
export { SSOManager } from './enterprise/ssoManager';
export { TenantManager } from './enterprise/tenantManager';

// Pricing Services
export { DynamicPricingEngine } from './pricing/dynamicEngine';
export { MarketIntelligenceService } from './pricing/marketIntelligence';

// Feature Registry
export { FeatureRegistry } from './featureRegistry';

// Package metadata
export const PREMIUM_BACKEND_SERVICES_VERSION = '4.0.0';