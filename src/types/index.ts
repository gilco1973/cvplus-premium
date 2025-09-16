/**
 * CVPlus Premium Module - TypeScript Types
 * 
 * Comprehensive type definitions for subscription, billing, premium features,
 * advanced analytics, enterprise management, and ML-driven predictions
 * 
 * @author Gil Klainert
 * @version 4.0.0 - Post-Migration
  */

import { Timestamp } from 'firebase-admin/firestore';
import { PremiumFeature, PremiumTier } from './premium-features';
import { PaymentStatus } from './payments.types';

// =============================================================================
// CORE PREMIUM FEATURE TYPES - MIGRATED
// =============================================================================

/**
 * Premium feature flags - MASTER DEFINITION IMPORTED
  */
export { PremiumFeature, PremiumTier } from './premium-features';
export { 
  isValidPremiumFeature,
  requiresSubscription,
  getMinimumTier,
  getFeatureDefinition
} from './premium-features';
export type { FeatureAccess } from './premium-features';

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

/**
 * Supported subscription tiers
  */
export type SubscriptionTier = 'FREE' | 'PREMIUM';

/**
 * Subscription status enum
  */
export type SubscriptionStatus = 
  | 'free'
  | 'premium_lifetime' 
  | 'premium_active'
  | 'premium_cancelled'
  | 'premium_expired'
  | 'premium_suspended';

/**
 * Feature access map - Aligned with PremiumFeature enum
  */
export interface PremiumFeatures {
  [PremiumFeature.ADVANCED_CV_GENERATION]: boolean;
  [PremiumFeature.PORTFOLIO_GALLERY]: boolean;
  [PremiumFeature.VIDEO_INTRODUCTION]: boolean;
  [PremiumFeature.PODCAST_GENERATION]: boolean;
  [PremiumFeature.ANALYTICS_DASHBOARD]: boolean;
  [PremiumFeature.CUSTOM_BRANDING]: boolean;
  [PremiumFeature.API_ACCESS]: boolean;
  [PremiumFeature.PRIORITY_SUPPORT]: boolean;
  [PremiumFeature.UNLIMITED_CVS]: boolean;
  [PremiumFeature.TEAM_COLLABORATION]: boolean;
  // Additional modern features used throughout the codebase
  webPortal: boolean;
  aiChat: boolean;
  podcast: boolean;
  advancedAnalytics: boolean;
  videoIntroduction: boolean;
  roleDetection: boolean;
  externalData: boolean;
}

/**
 * Complete user subscription data structure
  */
export interface UserSubscriptionData {
  userId: string;
  email: string;
  googleId: string;
  subscriptionStatus: SubscriptionStatus;
  tier: PremiumTier;
  status: string;
  paymentMethod?: 'stripe' | 'paypal' | 'other';
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  lifetimeAccess: boolean;
  features: PremiumFeatures;
  purchasedAt?: Timestamp | Date;
  expiresAt?: Timestamp | Date;
  currentPeriodStart?: Timestamp | Date;
  currentPeriodEnd?: Timestamp | Date;
  metadata: {
    paymentAmount?: number;
    currency?: string;
    accountVerification?: {
      googleEmail: string;
      googleId: string;
      verifiedAt: Timestamp | Date;
    };
    activatedAt?: Date;
    activationType?: string;
    deactivatedAt?: Date;
    deactivationReason?: string;
    lastFeaturesUpdate?: Date;
    updatedFeatures?: string[];
    [key: string]: any;
  };
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// =============================================================================
// CONSOLIDATED PREMIUM ACCESS TYPES - PHASE 2 IMPLEMENTATION
// =============================================================================

/**
 * Feature access context for validation
  */
export interface FeatureAccessContext {
  teamId?: string;
  sessionId?: string;
  apiCall?: boolean;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: any;
}

/**
 * Feature access validation result
  */
export interface FeatureAccessResult {
  hasAccess: boolean;
  subscriptionStatus?: string;
  lifetimeAccess?: boolean;
  currentTier?: PremiumTier;
  requiredTier?: PremiumTier;
  message?: string;
  upgradeRequired?: boolean;
  currentUsage?: number;
  maxUsage?: number;
  resetDate?: Date;
}

/**
 * Tier validation result
  */
export interface TierValidationResult {
  hasAccess: boolean;
  userTier: PremiumTier;
  requiredTier: PremiumTier;
  message: string;
  upgradeRequired: boolean;
}

/**
 * Subscription validation result
  */
export interface SubscriptionValidationResult {
  isValid: boolean;
  status: string;
  tier: PremiumTier;
  message: string;
  requiresAction: boolean;
  actionType?: 'subscribe' | 'renew' | 'resubscribe' | 'update_billing' | 'contact_support';
  subscription?: UserSubscriptionData;
  expirationDate?: Date;
  billingIssue?: string;
}

/**
 * Billing status information
  */
export interface BillingStatus {
  isHealthy: boolean;
  message: string;
  issue?: 'payment_failed' | 'card_expired' | 'insufficient_funds' | 'other';
  lastAttempt?: Date;
}

/**
 * Tier feature matrix for UI display
  */
export interface TierFeatureMatrix {
  [PremiumTier.FREE]: TierFeatures;
  [PremiumTier.BASIC]: TierFeatures;
  [PremiumTier.PRO]: TierFeatures;
  [PremiumTier.ENTERPRISE]: TierFeatures;
}

/**
 * Features available in each tier
  */
export interface TierFeatures {
  cvGeneration: FeatureLimits;
  templates: FeatureLimits;
  analytics: FeatureLimits & { basic?: boolean; advanced?: boolean; custom?: boolean };
  customBranding: FeatureLimits & { whiteLabel?: boolean };
  apiAccess: FeatureLimits;
  prioritySupport: FeatureLimits & { dedicated?: boolean };
  teamCollaboration: FeatureLimits;
}

/**
 * Feature limits configuration
  */
export interface FeatureLimits {
  enabled: boolean;
  limit?: number; // -1 for unlimited
  resetPeriod?: 'daily' | 'weekly' | 'monthly' | 'unlimited';
}

/**
 * Tier limits for specific feature
  */
export interface TierLimits {
  tier: PremiumTier;
  feature: string;
  limits: FeatureLimits;
  hasAccess: boolean;
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

/**
 * Supported currencies
  */
export type Currency = 'USD' | 'EUR' | 'GBP';

// PaymentStatus is imported from payments.types.ts as enum

/**
 * Payment method types
  */
export interface PaymentMethodType {
  type: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

/**
 * Payment history record
  */
export interface PaymentHistory {
  paymentId: string;
  userId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentMethod: PaymentMethodType;
  failureReason?: string;
  refundReason?: string;
  refundAmount?: number;
  metadata?: Record<string, any>;
  createdAt: Timestamp | Date;
  processedAt?: Timestamp | Date;
  failedAt?: Timestamp | Date;
  refundedAt?: Timestamp | Date;
}

// =============================================================================
// STRIPE INTEGRATION TYPES
// =============================================================================

/**
 * Environment types
  */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Stripe price configuration
  */
export interface StripePriceConfig {
  development: string;
  staging: string;
  production: string;
}

/**
 * Price configuration with multiple currency support
  */
export interface PriceConfig {
  cents: number;
  dollars: number;
  currency: Currency;
  stripeConfig: StripePriceConfig;
}

/**
 * Complete tier configuration
  */
export interface TierConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: PriceConfig;
  isActive: boolean;
  features: PremiumFeatures;
}

/**
 * Stripe webhook event data
  */
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Create payment intent request
  */
export interface CreatePaymentIntentRequest {
  userId: string;
  email: string;
  googleId: string;
  amount?: number;
}

/**
 * Create payment intent response
  */
export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  customerId: string;
  amount: number;
}

/**
 * Confirm payment request
  */
export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  userId: string;
  googleId: string;
}

/**
 * Confirm payment response
  */
export interface ConfirmPaymentResponse {
  success: boolean;
  subscriptionStatus: SubscriptionStatus;
  lifetimeAccess: boolean;
  features: PremiumFeatures;
  purchasedAt: Timestamp | Date;
  message: string;
}

/**
 * Feature access check request
  */
export interface CheckFeatureAccessRequest {
  userId: string;
  googleId: string;
  feature: PremiumFeature;
}

/**
 * Feature access check response
  */
export interface CheckFeatureAccessResponse {
  hasAccess: boolean;
  subscriptionStatus: SubscriptionStatus;
  lifetimeAccess: boolean;
  features?: PremiumFeatures;
  purchasedAt?: Timestamp | Date;
  googleAccountVerified?: any;
  message: string;
}

/**
 * Get user subscription request
  */
export interface GetUserSubscriptionRequest {
  userId: string;
}

/**
 * Get user subscription response
  */
export interface GetUserSubscriptionResponse {
  subscriptionStatus: SubscriptionStatus;
  lifetimeAccess: boolean;
  features: PremiumFeatures;
  purchasedAt?: Timestamp | Date;
  paymentAmount?: number;
  currency?: Currency;
  googleAccountVerified?: any;
  stripeCustomerId?: string;
  message: string;
}

// =============================================================================
// BILLING TYPES
// =============================================================================

/**
 * Billing cycle
  */
export type BillingCycle = 'monthly' | 'yearly' | 'lifetime';

/**
 * Invoice status
  */
export type InvoiceStatus = 
  | 'draft'
  | 'open'
  | 'paid'
  | 'uncollectible'
  | 'void';

/**
 * Invoice item
  */
export interface InvoiceItem {
  description: string;
  amount: number;
  currency: Currency;
  quantity: number;
  unitPrice: number;
}

/**
 * Invoice data
  */
export interface Invoice {
  id: string;
  userId: string;
  stripeInvoiceId?: string;
  number: string;
  status: InvoiceStatus;
  amount: number;
  currency: Currency;
  items: InvoiceItem[];
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// USAGE TRACKING TYPES
// =============================================================================

/**
 * Usage metric types
  */
export type UsageMetricType = 
  | 'cv_uploads'
  | 'ai_analyses'
  | 'template_downloads'
  | 'video_generations'
  | 'podcast_generations'
  | 'portal_views'
  | 'api_calls';

/**
 * Usage limit configuration
  */
export interface UsageLimit {
  metricType: UsageMetricType;
  limit: number;
  period: 'daily' | 'weekly' | 'monthly';
  resetAt: Date;
}

/**
 * Usage tracking record
  */
export interface UsageRecord {
  id: string;
  userId: string;
  metricType: UsageMetricType;
  count: number;
  period: string; // YYYY-MM-DD format
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Batch usage update request
  */
export interface BatchUsageUpdate {
  userId: string;
  updates: Array<{
    metricType: UsageMetricType;
    increment: number;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Flexible usage limit with policy
  */
export interface FlexibleUsageLimit extends UsageLimit {
  overagePolicy?: {
    allowed: boolean;
    maxOverage?: number;
    overagePrice?: number;
  };
}

/**
 * Usage period configuration
  */
export interface UsagePeriod {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start: Date;
  end: Date;
}

/**
 * Usage metrics constant definition
  */
export const USAGE_METRICS = {
  cv_uploads: 'CV Uploads',
  ai_analyses: 'AI Analyses', 
  template_downloads: 'Template Downloads',
  video_generations: 'Video Generations',
  podcast_generations: 'Podcast Generations',
  portal_views: 'Portal Views',
  api_calls: 'API Calls'
} as const;

/**
 * Live usage data for real-time monitoring
  */
export interface LiveUsageData {
  userId: string;
  metrics: Record<UsageMetricType, {
    current: number;
    limit: number;
    percentage: number;
  }>;
  lastUpdated: Date;
}

/**
 * Usage analytics with trends and insights
  */
export interface UsageAnalytics {
  userId: string;
  period: string;
  metrics: Record<UsageMetricType, {
    total: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
  }>;
  insights: string[];
  recommendations: string[];
}

/**
 * Usage summary for a user
  */
export interface UsageSummary {
  userId: string;
  period: string;
  metrics: Record<UsageMetricType, number>;
  limits: Record<UsageMetricType, UsageLimit>;
  overages: Record<UsageMetricType, number>;
  calculatedAt: Date;
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

/**
 * Premium gate component props
  */
export interface PremiumGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  upgradeUrl?: string;
  className?: string;
}

/**
 * Subscription plan card props
  */
export interface SubscriptionPlanProps {
  tier: SubscriptionTier;
  config: TierConfig;
  currentTier?: SubscriptionTier;
  onSelect?: (tier: SubscriptionTier) => void;
  isSelected?: boolean;
  isLoading?: boolean;
  className?: string;
}

/**
 * Billing history props
  */
export interface BillingHistoryProps {
  userId: string;
  limit?: number;
  className?: string;
}

/**
 * Upgrade prompt props
  */
export interface UpgradePromptProps {
  feature: PremiumFeature;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'modal' | 'inline' | 'banner';
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/**
 * UseSubscription hook return type
  */
export interface UseSubscriptionReturn {
  subscription: UserSubscriptionData | null;
  isLoading: boolean;
  error: string | null;
  hasFeature: (feature: PremiumFeature) => boolean;
  hasAnyFeature: (features: PremiumFeature[]) => boolean;
  refresh: () => Promise<void>;
}

/**
 * UseBilling hook return type
  */
export interface UseBillingReturn {
  paymentHistory: PaymentHistory[];
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * UseFeatureGate hook return type
  */
export interface UseFeatureGateReturn {
  hasAccess: boolean;
  isLoading: boolean;
  error: string | null;
  upgrade: () => void;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Premium module specific error types
  */
export type PremiumErrorCode = 
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'FEATURE_ACCESS_DENIED'
  | 'PAYMENT_FAILED'
  | 'STRIPE_ERROR'
  | 'USAGE_LIMIT_EXCEEDED'
  | 'BILLING_ERROR'
  | 'WEBHOOK_ERROR'
  | 'INVALID_SUBSCRIPTION'
  | 'EXPIRED_SUBSCRIPTION';

/**
 * Premium error interface
  */
export interface PremiumError extends Error {
  code: PremiumErrorCode;
  details?: Record<string, any>;
  retryable?: boolean;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Premium module configuration
  */
export interface PremiumConfig {
  stripe: {
    publishableKey: string;
    secretKey?: string;
    webhookSecret?: string;
    apiVersion: string;
  };
  features: {
    enabled: PremiumFeature[];
    limits: Record<PremiumFeature, UsageLimit>;
  };
  pricing: {
    tiers: Record<SubscriptionTier, TierConfig>;
    defaultCurrency: Currency;
  };
  billing: {
    invoicePrefix: string;
    gracePeriod: number; // days
    retryAttempts: number;
  };
  cache: {
    ttl: number; // seconds
    maxSize: number;
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export * from './subscription.types';
export type {
  BillingAddress,
  BillingCycleConfig,
  TaxInfo,
  Discount,
  DetailedInvoiceItem,
  PaymentMethodDetails,
  BillingPreferences,
  RevenueAnalytics
} from './billing.types';
export * from './stripe.types';
export * from './usage.types';

// Payment Provider Types - Phase 1 Gap Closure
// Export enum separately and types with export type
export { PaymentStatus } from './payments.types';
export type {
  PaymentMethod,
  PaymentIntent,
  PaymentSession,
  PaymentResult
} from './payments.types';
export * from './providers.types';export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
