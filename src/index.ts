/**
 * CVPlus Premium Module - Main Export
 * 
 * Self-contained premium subscription and billing module with Stripe integration
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

// Core types
export * from './types';
export * from './types/subscription.types';
export * from './types/billing.types';
export * from './types/stripe.types';
export * from './types/usage.types';

// =============================================================================
// CONSTANTS
// =============================================================================

export * from './constants/premium.constants';

// =============================================================================
// SERVICES
// =============================================================================

// Core services
export { StripeService } from './services/stripe.service';
export { SubscriptionService } from './services/subscription.service';
export { BillingService } from './services/billing.service';
export { FeatureService } from './services/features.service';
export { UsageService } from './services/usage.service';

// =============================================================================
// REACT COMPONENTS
// =============================================================================

// Main components
export { SubscriptionPlans } from './components/SubscriptionPlans';
export { BillingHistory } from './components/BillingHistory';
export { FeatureGate, InlineFeatureGate } from './components/FeatureGate';
export { UpgradePrompt, CompactUpgradePrompt } from './components/UpgradePrompt';

// =============================================================================
// REACT HOOKS
// =============================================================================

// Subscription hooks
export {
  useSubscription,
  useSubscriptionStatus,
  useFeatureAccess,
  useSubscriptionMetrics
} from './hooks/useSubscription';

// Billing hooks
export {
  useBilling,
  useBillingStats,
  useRecentBillingActivity,
  usePaymentMethods
} from './hooks/useBilling';

// Feature gate hooks
export {
  useFeatureGate,
  useMultipleFeatureGates,
  useFeatureGateWithRetry,
  useConditionalFeature,
  useFeatureGateAnalytics
} from './hooks/useFeatureGate';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format currency amount for display
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 100); // Convert from cents
};

/**
 * Format date for billing display
 */
export const formatBillingDate = (
  date: Date,
  locale: string = 'en-US'
): string => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Calculate subscription age in days
 */
export const getSubscriptionAge = (createdAt: Date): number => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get feature utilization percentage
 */
export const getFeatureUtilization = (features: Record<string, boolean>): number => {
  const totalFeatures = Object.keys(features).length;
  const enabledFeatures = Object.values(features).filter(Boolean).length;
  return totalFeatures > 0 ? (enabledFeatures / totalFeatures) * 100 : 0;
};

/**
 * Create Stripe idempotency key
 */
export const createIdempotencyKey = (operation: string, params: any): string => {
  const hash = require('crypto')
    .createHash('sha256')
    .update(`${operation}:${JSON.stringify(params)}`)
    .digest('hex')
    .substring(0, 16);
  return `cvplus:${operation}:${hash}`;
};

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Check if error is a Stripe error
 */
export const isStripeError = (error: any): boolean => {
  return error?.type && error.type.startsWith('Stripe');
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  const retryableCodes = ['rate_limit', 'api_connection_error', 'api_error'];
  const retryableTypes = [
    'StripeConnectionError',
    'StripeAPIError',
    'StripeRateLimitError'
  ];
  
  return retryableCodes.includes(error?.code) || retryableTypes.includes(error?.type);
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred';

  // Stripe-specific errors
  if (isStripeError(error)) {
    switch (error.code) {
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method.';
      case 'insufficient_funds':
        return 'Your card has insufficient funds. Please try a different payment method.';
      case 'expired_card':
        return 'Your card has expired. Please update your payment information.';
      case 'incorrect_cvc':
        return 'Your card\'s security code is incorrect. Please check and try again.';
      case 'processing_error':
        return 'We encountered an error processing your payment. Please try again.';
      case 'rate_limit':
        return 'Too many requests. Please wait a moment and try again.';
      default:
        return 'Payment failed. Please check your payment information and try again.';
    }
  }

  // Generic errors
  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Create default premium configuration
 */
export const createDefaultPremiumConfig = (environment: 'development' | 'staging' | 'production') => {
  return {
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      apiVersion: '2025-07-30.basil' as const
    },
    features: {
      enabled: [
        'webPortal',
        'aiChat',
        'podcast',
        'advancedAnalytics',
        'videoIntroduction',
        'roleDetection',
        'externalData'
      ] as const,
      limits: {
        webPortal: { limit: -1, period: 'monthly' as const, resetAt: new Date() },
        aiChat: { limit: -1, period: 'monthly' as const, resetAt: new Date() },
        podcast: { limit: 5, period: 'monthly' as const, resetAt: new Date() },
        advancedAnalytics: { limit: -1, period: 'monthly' as const, resetAt: new Date() },
        videoIntroduction: { limit: 10, period: 'monthly' as const, resetAt: new Date() },
        roleDetection: { limit: -1, period: 'monthly' as const, resetAt: new Date() },
        externalData: { limit: -1, period: 'monthly' as const, resetAt: new Date() }
      }
    },
    pricing: {
      tiers: {
        FREE: {
          tier: 'FREE' as const,
          name: 'Free',
          description: 'Everything you need to create a professional CV',
          price: {
            cents: 0,
            dollars: 0,
            currency: 'USD' as const,
            stripeConfig: {
              development: '',
              staging: '',
              production: ''
            }
          },
          isActive: true,
          features: {
            webPortal: false,
            aiChat: false,
            podcast: false,
            advancedAnalytics: false,
            videoIntroduction: false,
            roleDetection: false,
            externalData: false
          }
        },
        PREMIUM: {
          tier: 'PREMIUM' as const,
          name: 'Premium',
          description: 'Unlock all premium features with lifetime access',
          price: {
            cents: 4900,
            dollars: 49,
            currency: 'USD' as const,
            stripeConfig: {
              development: process.env.STRIPE_PRICE_ID_DEV || '',
              staging: process.env.STRIPE_PRICE_ID_STAGING || '',
              production: process.env.STRIPE_PRICE_ID_PROD || ''
            }
          },
          isActive: true,
          features: {
            webPortal: true,
            aiChat: true,
            podcast: true,
            advancedAnalytics: true,
            videoIntroduction: true,
            roleDetection: true,
            externalData: true
          }
        }
      },
      defaultCurrency: 'USD' as const
    },
    billing: {
      invoicePrefix: 'CVPLUS',
      gracePeriod: 3,
      retryAttempts: 3
    },
    cache: {
      ttl: 300, // 5 minutes
      maxSize: 1000
    }
  };
};

/**
 * Version information
 */
export const PREMIUM_MODULE_VERSION = '1.0.0';
export const PREMIUM_MODULE_NAME = '@cvplus/premium';

/**
 * Module information
 */
export const getPremiumModuleInfo = () => ({
  name: PREMIUM_MODULE_NAME,
  version: PREMIUM_MODULE_VERSION,
  description: 'CVPlus Premium subscription and billing module with Stripe integration',
  author: 'Gil Klainert',
  features: [
    'Stripe payment processing',
    'Subscription management',
    'Feature gating',
    'Usage tracking',
    'Billing history',
    'React components',
    'TypeScript support',
    'Comprehensive error handling'
  ]
});

// Module is fully self-contained with named exports