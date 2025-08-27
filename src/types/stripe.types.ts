/**
 * Stripe-specific types for the Premium module
 */

import { Stripe } from 'stripe';

/**
 * Stripe webhook event types we handle
 */
export type StripeWebhookEventType = 
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'charge.dispute.created'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.created'
  | 'customer.updated';

/**
 * Stripe customer data
 */
export interface StripeCustomerData {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: Stripe.Address;
  metadata: {
    userId: string;
    googleId: string;
    platform: string;
    [key: string]: string;
  };
  paymentMethods: string[]; // Payment method IDs
  defaultPaymentMethod?: string;
  created: number;
}

/**
 * Stripe payment intent configuration
 */
export interface StripePaymentIntentConfig {
  amount: number;
  currency: string;
  customer?: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
  automaticPaymentMethods?: {
    enabled: boolean;
    allowRedirects?: 'always' | 'never';
  };
  confirmationMethod?: 'automatic' | 'manual';
  captureMethod?: 'automatic' | 'manual';
  receiptEmail?: string;
  statementDescriptor?: string;
}

/**
 * Stripe subscription configuration
 */
export interface StripeSubscriptionConfig {
  customer: string;
  items: Array<{
    price: string;
    quantity?: number;
  }>;
  paymentBehavior?: 'default_incomplete' | 'pending_if_incomplete' | 'error_if_incomplete';
  collectionMethod?: 'charge_automatically' | 'send_invoice';
  daysUntilDue?: number;
  defaultPaymentMethod?: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

/**
 * Stripe price configuration for different environments
 */
export interface StripeEnvironmentConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  prices: {
    [key: string]: string; // tier -> price ID
  };
}

/**
 * Stripe configuration per environment
 */
export interface StripeConfiguration {
  development: StripeEnvironmentConfig;
  staging: StripeEnvironmentConfig;
  production: StripeEnvironmentConfig;
  apiVersion: string;
}

/**
 * Stripe webhook handler result
 */
export interface StripeWebhookHandlerResult {
  processed: boolean;
  error?: string;
  data?: any;
  actions?: string[];
}

/**
 * Stripe error with additional context
 */
export interface StripeErrorContext extends Error {
  type: 'StripeCardError' | 'StripeRateLimitError' | 'StripeInvalidRequestError' | 'StripeAPIError' | 'StripeConnectionError' | 'StripeAuthenticationError';
  code?: string;
  decline_code?: string;
  charge?: string;
  payment_intent?: string;
  payment_method?: string;
  setup_intent?: string;
  source?: string;
  request_id?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  retryable?: boolean;
}

/**
 * Stripe payment method types supported
 */
export type SupportedPaymentMethodType = 
  | 'card'
  | 'bank_account' 
  | 'sepa_debit'
  | 'ideal'
  | 'sofort'
  | 'giropay'
  | 'bancontact'
  | 'eps'
  | 'p24'
  | 'alipay'
  | 'wechat_pay';

/**
 * Stripe checkout session configuration
 */
export interface StripeCheckoutConfig {
  mode: 'payment' | 'subscription' | 'setup';
  customer?: string;
  customerEmail?: string;
  lineItems: Array<{
    price: string;
    quantity: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  paymentMethodTypes: SupportedPaymentMethodType[];
  metadata?: Record<string, string>;
  subscriptionData?: {
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  };
  allowPromotionCodes?: boolean;
  billingAddressCollection?: 'auto' | 'required';
  shippingAddressCollection?: {
    allowedCountries: string[];
  };
  taxIdCollection?: {
    enabled: boolean;
  };
}

/**
 * Stripe retry configuration
 */
export interface StripeRetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrorCodes: string[];
  retryableErrorTypes: string[];
}

/**
 * Stripe idempotency configuration
 */
export interface StripeIdempotencyConfig {
  enabled: boolean;
  keyPrefix: string;
  keyGenerator: (operation: string, params: any) => string;
  timeout: number; // milliseconds
}