/**
 * Billing-specific types for the Premium module
 */

/**
 * Billing address
 */
export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * Tax information
 */
export interface TaxInfo {
  type: 'vat' | 'gst' | 'sales_tax';
  rate: number;
  amount: number;
  taxId?: string;
  region?: string;
}

/**
 * Discount information
 */
export interface Discount {
  type: 'percentage' | 'fixed_amount';
  value: number;
  code?: string;
  description?: string;
}

/**
 * Detailed invoice item with tax and discount support
 */
export interface DetailedInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  tax?: TaxInfo;
  discount?: Discount;
  metadata?: Record<string, any>;
}

/**
 * Payment method details
 */
export interface PaymentMethodDetails {
  id: string;
  type: 'card' | 'bank_account' | 'wallet';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  };
  bankAccount?: {
    bankName: string;
    last4: string;
    accountType: 'checking' | 'savings';
  };
  wallet?: {
    type: 'paypal' | 'apple_pay' | 'google_pay';
    email?: string;
  };
  isDefault: boolean;
  billingAddress?: BillingAddress;
}

/**
 * Refund request
 */
export interface RefundRequest {
  paymentId: string;
  amount?: number; // partial refund if specified
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Refund response
 */
export interface RefundResponse {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  reason: string;
  description?: string;
  processedAt: Date;
}

/**
 * Billing cycle configuration
 */
export interface BillingCycleConfig {
  type: 'monthly' | 'yearly' | 'lifetime';
  interval: number; // 1 for monthly, 12 for yearly
  intervalUnit: 'month' | 'year';
  gracePeriod: number; // days
  retryAttempts: number;
  retryInterval: number; // hours
}

/**
 * Billing preferences
 */
export interface BillingPreferences {
  userId: string;
  currency: string;
  timezone: string;
  invoiceEmail?: string;
  autoRenew: boolean;
  preferredPaymentMethod?: string;
  billingAddress?: BillingAddress;
  taxInfo?: {
    taxId?: string;
    exemptionReason?: string;
  };
  notifications: {
    invoiceCreated: boolean;
    paymentSucceeded: boolean;
    paymentFailed: boolean;
    subscriptionExpiring: boolean;
  };
}

/**
 * Revenue analytics data
 */
export interface RevenueAnalytics {
  period: string; // YYYY-MM format
  totalRevenue: number;
  currency: string;
  subscriptionRevenue: number;
  oneTimeRevenue: number;
  refunds: number;
  netRevenue: number;
  customerCount: number;
  averageRevenuePerUser: number;
  conversionRate: number;
  churnRate: number;
  metrics: {
    newSubscriptions: number;
    cancelledSubscriptions: number;
    upgrades: number;
    downgrades: number;
  };
}