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
export { advancedAnalytics } from './advancedAnalytics';
export type { 
  AdvancedAnalyticsRequest, 
  AdvancedAnalyticsResponse 
} from './advancedAnalytics';

// Dynamic Pricing Functions
export { dynamicPricing } from './dynamicPricing';
export type { 
  DynamicPricingRequest, 
  DynamicPricingResponse 
} from './dynamicPricing';

// Enterprise Management Functions
export { enterpriseManagement } from './enterpriseManagement';
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

// Package metadata
export const PREMIUM_FUNCTIONS_VERSION = '4.0.0';