/**
 * CVPlus Premium Payment Provider Types
 * Comprehensive payment provider abstraction types
 */

// Provider Names
export type PaymentProviderName = 'stripe' | 'paypal';

// Payment Method Types
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  BANK_TRANSFER = 'bank_transfer',
}

// Payment Status
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  REQUIRES_ACTION = 'requires_action',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

// Customer Information
export interface CustomerInfo {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  metadata?: Record<string, string>;
}

// Payment Method Details
export interface PaymentMethodInfo {
  id: string;
  type: PaymentMethod;
  card?: {
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details: {
    email?: string;
    name?: string;
    phone?: string;
    address?: CustomerInfo['address'];
  };
  metadata?: Record<string, string>;
}

// Payment Request
export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethodDetails;
  paymentMethodId?: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
  billing_address?: CustomerInfo['address'];
  shipping_address?: CustomerInfo['address'];
  automatic_payment_methods?: {
    enabled: boolean;
    allow_redirects?: 'always' | 'never';
  };
}

// Payment Intent
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  client_secret?: string;
  payment_method?: PaymentMethodDetails;
  customer_id: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, string>;
}

// Payment Result
export interface PaymentResult {
  success: boolean;
  payment_intent?: PaymentIntent;
  client_secret?: string;
  requires_action?: boolean;
  redirect_url?: string;
  error?: PaymentError;
  transaction_id?: string;
  provider_response?: Record<string, any>;
}

// Payment Error
export interface PaymentError {
  code: string;
  message: string;
  type: 'api_error' | 'card_error' | 'idempotency_error' | 'invalid_request_error' | 'authentication_error' | 'rate_limit_error';
  decline_code?: string;
  charge_id?: string;
  payment_intent_id?: string;
  payment_method_id?: string;
  source?: string;
}

// Payment Event (for webhooks)
export interface PaymentEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: any;
  };
  provider: PaymentProviderName;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id: string;
    idempotency_key?: string;
  };
}

// Webhook Result
export interface WebhookResult {
  received: boolean;
  processed: boolean;
  event_id: string;
  event_type: string;
  error?: string;
  actions_taken?: string[];
  timestamp: Date;
}

// Refund Request
export interface RefundRequest {
  payment_intent_id: string;
  amount?: number; // If not provided, refunds the full amount
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

// Refund Result
export interface RefundResult {
  success: boolean;
  refund_id?: string;
  amount?: number;
  currency?: string;
  status?: 'pending' | 'succeeded' | 'failed' | 'canceled';
  failure_reason?: string;
  created_at?: Date;
  error?: PaymentError;
}

// Payment Session (for checkout sessions)
export interface PaymentSession {
  id: string;
  url: string;
  payment_status: PaymentStatus;
  amount_total: number;
  currency: string;
  customer_id?: string;
  expires_at: Date;
  metadata?: Record<string, string>;
}

// Payment Session Request
export interface PaymentSessionRequest {
  line_items: Array<{
    price_data: {
      currency: string;
      product_data: {
        name: string;
        description?: string;
      };
      unit_amount: number;
    };
    quantity: number;
  }>;
  customer_id?: string;
  success_url: string;
  cancel_url: string;
  mode: 'payment' | 'subscription' | 'setup';
  metadata?: Record<string, string>;
  allow_promotion_codes?: boolean;
  billing_address_collection?: 'auto' | 'required';
  shipping_address_collection?: {
    allowed_countries: string[];
  };
}

// Payment Configuration
export interface PaymentConfiguration {
  provider: PaymentProviderName;
  public_key: string;
  secret_key: string;
  webhook_secret: string;
  environment: 'sandbox' | 'production';
  api_version?: string;
  timeout?: number;
  retry_attempts?: number;
  supported_currencies: string[];
  supported_payment_methods: PaymentMethod[];
  features: {
    webhooks: boolean;
    refunds: boolean;
    subscriptions: boolean;
    saved_payment_methods: boolean;
    multi_currency: boolean;
  };
}