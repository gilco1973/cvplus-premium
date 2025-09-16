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

// Cache Service and Types
export { cacheService } from './cache.service';
export type { CacheStats } from './cache.service';

// Global Payment Services
export { CurrencyManager } from './payments/global/currency-manager';
export { TaxComplianceService } from './payments/global/tax-compliance';
export { RegionalPaymentMethodsService } from './payments/global/regional-payment-methods';
export { FraudPreventionService } from './payments/global/fraud-prevention';

// Performance & Monitoring Services
export { PerformanceMonitor } from './monitoring/performance-monitor';
export { AutoScalingService } from './monitoring/auto-scaling';
export { CDNOptimizer } from './monitoring/cdn-optimizer';

// Package metadata
export const PREMIUM_BACKEND_SERVICES_VERSION = '4.0.0';