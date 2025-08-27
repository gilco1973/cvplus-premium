/**
 * CVPlus Premium Module - Constants
 * 
 * Centralized constants for subscription, billing, and premium features
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { PremiumFeatures, SubscriptionTier, Currency } from '../types';

// =============================================================================
// SUBSCRIPTION CONSTANTS
// =============================================================================

/**
 * Default subscription tiers
 */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, string> = {
  FREE: 'Free',
  PREMIUM: 'Premium'
} as const;

/**
 * Free tier features
 */
export const FREE_TIER_FEATURES: PremiumFeatures = {
  webPortal: false,
  aiChat: false,
  podcast: false,
  advancedAnalytics: false,
  videoIntroduction: false,
  roleDetection: false,
  externalData: false
} as const;

/**
 * Premium tier features
 */
export const PREMIUM_TIER_FEATURES: PremiumFeatures = {
  webPortal: true,
  aiChat: true,
  podcast: true,
  advancedAnalytics: true,
  videoIntroduction: true,
  roleDetection: true,
  externalData: true
} as const;

/**
 * Feature display names
 */
export const FEATURE_DISPLAY_NAMES: Record<keyof PremiumFeatures, string> = {
  webPortal: 'Personal Web Portal',
  aiChat: 'AI Chat Assistant',
  podcast: 'AI Career Podcast',
  advancedAnalytics: 'Advanced Analytics',
  videoIntroduction: 'Video Introduction',
  roleDetection: 'AI Role Detection',
  externalData: 'External Data Integration'
} as const;

/**
 * Feature descriptions
 */
export const FEATURE_DESCRIPTIONS: Record<keyof PremiumFeatures, string> = {
  webPortal: 'Create a personalized web portal to showcase your professional profile',
  aiChat: 'Get personalized career advice and CV improvement suggestions from AI',
  podcast: 'Generate AI-powered career podcasts with personalized insights',
  advancedAnalytics: 'Access detailed analytics and insights about your career profile',
  videoIntroduction: 'Create professional AI-generated video introductions',
  roleDetection: 'Automatically detect and optimize for specific job roles',
  externalData: 'Integrate data from LinkedIn, GitHub, and other professional platforms'
} as const;

// =============================================================================
// PRICING CONSTANTS
// =============================================================================

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP'] as const;

/**
 * Currency symbols
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£'
} as const;

/**
 * Default pricing configuration
 */
export const DEFAULT_PRICING = {
  FREE: {
    cents: 0,
    dollars: 0,
    currency: 'USD' as Currency
  },
  PREMIUM: {
    cents: 4900,
    dollars: 49,
    currency: 'USD' as Currency
  }
} as const;

// =============================================================================
// BILLING CONSTANTS
// =============================================================================

/**
 * Payment status display names
 */
export const PAYMENT_STATUS_DISPLAY: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  succeeded: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed'
} as const;

/**
 * Invoice status display names
 */
export const INVOICE_STATUS_DISPLAY: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  paid: 'Paid',
  uncollectible: 'Uncollectible',
  void: 'Void'
} as const;

/**
 * Billing cycle display names
 */
export const BILLING_CYCLE_DISPLAY: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  lifetime: 'Lifetime'
} as const;

// =============================================================================
// USAGE TRACKING CONSTANTS
// =============================================================================

/**
 * Default usage limits for free tier
 */
export const FREE_TIER_LIMITS = {
  cv_uploads: 5,
  ai_analyses: 2,
  template_downloads: 10,
  video_generations: 0,
  podcast_generations: 0,
  portal_views: 0,
  api_calls: 100
} as const;

/**
 * Default usage limits for premium tier
 */
export const PREMIUM_TIER_LIMITS = {
  cv_uploads: -1, // unlimited
  ai_analyses: -1, // unlimited
  template_downloads: -1, // unlimited
  video_generations: 10,
  podcast_generations: 5,
  portal_views: -1, // unlimited
  api_calls: 1000
} as const;

/**
 * Usage warning thresholds (percentages)
 */
export const USAGE_WARNING_THRESHOLDS = [75, 90, 100] as const;

// =============================================================================
// STRIPE CONSTANTS
// =============================================================================

/**
 * Stripe API version
 */
export const STRIPE_API_VERSION = '2025-07-30.basil' as const;

/**
 * Supported payment methods
 */
export const SUPPORTED_PAYMENT_METHODS = [
  'card',
  'bank_account',
  'sepa_debit',
  'ideal',
  'sofort',
  'giropay',
  'bancontact'
] as const;

/**
 * Webhook event types we handle
 */
export const HANDLED_WEBHOOK_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'charge.dispute.created',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed'
] as const;

/**
 * Retryable Stripe error codes
 */
export const RETRYABLE_STRIPE_ERRORS = [
  'rate_limit',
  'api_connection_error',
  'api_error'
] as const;

// =============================================================================
// CACHE CONSTANTS
// =============================================================================

/**
 * Cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  SUBSCRIPTION: 300, // 5 minutes
  PAYMENT_HISTORY: 600, // 10 minutes
  USAGE_DATA: 60, // 1 minute
  BILLING_INFO: 1800, // 30 minutes
  FEATURES: 300 // 5 minutes
} as const;

/**
 * Cache key prefixes
 */
export const CACHE_KEYS = {
  SUBSCRIPTION: 'premium:subscription:',
  PAYMENT: 'premium:payment:',
  USAGE: 'premium:usage:',
  BILLING: 'premium:billing:',
  FEATURES: 'premium:features:'
} as const;

// =============================================================================
// ERROR CONSTANTS
// =============================================================================

/**
 * Premium error codes
 */
export const PREMIUM_ERROR_CODES = {
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
  FEATURE_ACCESS_DENIED: 'FEATURE_ACCESS_DENIED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  STRIPE_ERROR: 'STRIPE_ERROR',
  USAGE_LIMIT_EXCEEDED: 'USAGE_LIMIT_EXCEEDED',
  BILLING_ERROR: 'BILLING_ERROR',
  WEBHOOK_ERROR: 'WEBHOOK_ERROR',
  INVALID_SUBSCRIPTION: 'INVALID_SUBSCRIPTION',
  EXPIRED_SUBSCRIPTION: 'EXPIRED_SUBSCRIPTION'
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  [PREMIUM_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: 'Subscription not found',
  [PREMIUM_ERROR_CODES.FEATURE_ACCESS_DENIED]: 'Access to this feature is not allowed',
  [PREMIUM_ERROR_CODES.PAYMENT_FAILED]: 'Payment processing failed',
  [PREMIUM_ERROR_CODES.STRIPE_ERROR]: 'Payment provider error',
  [PREMIUM_ERROR_CODES.USAGE_LIMIT_EXCEEDED]: 'Usage limit exceeded',
  [PREMIUM_ERROR_CODES.BILLING_ERROR]: 'Billing system error',
  [PREMIUM_ERROR_CODES.WEBHOOK_ERROR]: 'Webhook processing error',
  [PREMIUM_ERROR_CODES.INVALID_SUBSCRIPTION]: 'Invalid subscription data',
  [PREMIUM_ERROR_CODES.EXPIRED_SUBSCRIPTION]: 'Subscription has expired'
} as const;

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

/**
 * Minimum and maximum values for validation
 */
export const VALIDATION_LIMITS = {
  PAYMENT_AMOUNT: {
    MIN: 100, // $1.00 in cents
    MAX: 100000 // $1,000.00 in cents
  },
  METADATA_SIZE: {
    MAX_KEYS: 20,
    MAX_VALUE_LENGTH: 500
  },
  DESCRIPTION: {
    MAX_LENGTH: 200
  }
} as const;

/**
 * Regex patterns for validation
 */
export const VALIDATION_PATTERNS = {
  CURRENCY_CODE: /^[A-Z]{3}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  STRIPE_ID: /^(pi|sub|cus|price|prod)_[a-zA-Z0-9]{14,}$/
} as const;

// =============================================================================
// RATE LIMITING CONSTANTS
// =============================================================================

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  PAYMENT_ATTEMPTS: {
    MAX_ATTEMPTS: 3,
    WINDOW_MINUTES: 15
  },
  SUBSCRIPTION_UPDATES: {
    MAX_ATTEMPTS: 5,
    WINDOW_MINUTES: 60
  },
  WEBHOOK_PROCESSING: {
    MAX_ATTEMPTS: 3,
    WINDOW_MINUTES: 5
  }
} as const;

// =============================================================================
// NOTIFICATION CONSTANTS
// =============================================================================

/**
 * Notification templates
 */
export const NOTIFICATION_TEMPLATES = {
  PAYMENT_SUCCESS: {
    title: 'Payment Successful',
    message: 'Your payment has been processed successfully. Welcome to CVPlus Premium!'
  },
  PAYMENT_FAILED: {
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please try again or contact support.'
  },
  SUBSCRIPTION_ACTIVATED: {
    title: 'Premium Activated',
    message: 'Your premium subscription is now active. Enjoy all premium features!'
  },
  USAGE_LIMIT_WARNING: {
    title: 'Usage Limit Warning',
    message: 'You are approaching your usage limit. Consider upgrading to premium.'
  },
  USAGE_LIMIT_EXCEEDED: {
    title: 'Usage Limit Exceeded',
    message: 'You have exceeded your usage limit. Please upgrade to continue using this feature.'
  }
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature flags for gradual rollout
 */
export const FEATURE_FLAGS = {
  STRIPE_CHECKOUT: true,
  USAGE_TRACKING: true,
  REAL_TIME_ANALYTICS: true,
  WEBHOOK_RETRIES: true,
  SUBSCRIPTION_UPGRADES: true,
  REFUND_PROCESSING: false, // Disabled by default
  MULTI_CURRENCY: false // Disabled by default
} as const;