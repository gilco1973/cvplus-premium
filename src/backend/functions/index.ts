/**
 * CVPlus Premium Firebase Functions
 * 
 * Exports all Firebase Functions for premium functionality including
 * subscription management, webhook handling, feature access control,
 * advanced analytics, enterprise management, and ML-driven predictions.
 * 
 * @author Gil Klainert
 * @version 4.0.0 - CVPlus Premium Module (Post-Migration)
  */

// Subscription Management
export { manageSubscription } from './manageSubscription';
export type { 
  ManageSubscriptionRequest, 
  ManageSubscriptionResponse 
} from './manageSubscription';

// Webhook Handling
export { handleStripeWebhook } from './handleStripeWebhook';

// Feature Access Control
export { 
  checkFeatureAccess, 
  checkMultipleFeatureAccess 
} from './checkFeatureAccess';
export type { 
  CheckFeatureAccessRequest, 
  CheckFeatureAccessResponse 
} from './checkFeatureAccess';

// Advanced Analytics Functions
export { 
  advancedAnalytics,
  createCustomReport,
  generateReportData,
  createDashboard,
  scheduleReportDelivery,
  generateWhiteLabelReport,
  exportReport,
  getDataSources,
  getReportTemplates,
  validateReportConfig,
  analyticsHealthCheck
} from './advancedAnalytics';
export type { 
  AdvancedAnalyticsRequest, 
  AdvancedAnalyticsResponse 
} from './advancedAnalytics';

// Dynamic Pricing Functions
export { 
  dynamicPricing, 
  getOptimizedPricing,
  createPricingTest,
  getPricingAnalytics,
  optimizePricingStrategy,
  getPricingTestResults,
  recordPricingConversion,
  pricingHealthCheck
} from './dynamicPricing';
export type { 
  DynamicPricingRequest, 
  DynamicPricingResponse 
} from './dynamicPricing';

// Enterprise Management Functions
export { 
  enterpriseManagement, 
  createEnterpriseAccount,
  getEnterpriseAccount,
  assignUserRole,
  checkPermission,
  createCustomRole,
  configureSAMLSSO,
  configureOAuthSSO,
  processSSOLogin,
  getEnterpriseAnalytics,
  auditUserAccess,
  getSSOMetrics,
  getRoleTemplates,
  enterpriseHealthCheck
} from './enterpriseManagement';
export type { 
  EnterpriseManagementRequest, 
  EnterpriseManagementResponse 
} from './enterpriseManagement';

// Batch Tracking Events
export { batchTrackingEvents } from './batchTrackingEvents';
export type { 
  BatchTrackingRequest, 
  BatchTrackingResponse 
} from './batchTrackingEvents';

// Realtime Usage Statistics
export { getRealtimeUsageStats } from './getRealtimeUsageStats';
export type { 
  RealtimeUsageRequest, 
  RealtimeUsageResponse 
} from './getRealtimeUsageStats';

// ML Prediction Functions
export { predictChurn } from './predictChurn';
export type {
  PredictChurnRequest,
  PredictChurnResponse
} from './predictChurn';

// Global Payment Infrastructure Functions
export {
  getLocalizedPricing,
  getSupportedRegions,
  validateVATNumber,
  assessFraudRisk,
  convertCurrency,
  globalPaymentsHealthCheck,
  generateTaxReport,
  getFraudStatistics,
  currencyManager,
  taxCompliance,
  paymentMethods,
  fraudPrevention
} from './globalPayments';

// Package metadata
export const PREMIUM_FUNCTIONS_VERSION = '4.0.0';