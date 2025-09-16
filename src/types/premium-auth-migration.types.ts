/**
 * Premium Types
 * 
 * Type definitions for premium subscription and feature management.
  */

export interface PremiumSubscription {
  userId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
  tier: PremiumTier;
  features: PremiumFeatures;
  billing: BillingInfo;
  usage: UsageMetrics;
  metadata: SubscriptionMetadata;
}

export type SubscriptionStatus = 
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'suspended'
  | 'pending'
  | 'trial'
  | 'lifetime';

export type PremiumTier = 
  | 'free'
  | 'basic'
  | 'premium'
  | 'professional'
  | 'enterprise'
  | 'lifetime';

export interface PremiumFeatures {
  // Core Features
  cvGeneration: FeatureAccess;
  templatesAccess: FeatureAccess;
  
  // Premium Features
  webPortal: FeatureAccess;
  aiChat: FeatureAccess;
  podcastGeneration: FeatureAccess;
  videoIntroduction: FeatureAccess;
  advancedAnalytics: FeatureAccess;
  
  // Advanced Features
  customBranding: FeatureAccess;
  apiAccess: FeatureAccess;
  prioritySupport: FeatureAccess;
  teamCollaboration: FeatureAccess;
  
  // Limits
  cvLimit: FeatureLimit;
  storageLimit: FeatureLimit;
  exportLimit: FeatureLimit;
  apiCallLimit: FeatureLimit;
}

export interface FeatureAccess {
  enabled: boolean;
  restrictions?: FeatureRestriction[];
  metadata?: Record<string, any>;
}

export interface FeatureLimit {
  current: number;
  maximum: number;
  resetPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  resetDate?: number;
  overage?: {
    allowed: boolean;
    pricePerUnit?: number;
  };
}

export interface FeatureRestriction {
  type: 'usage_limit' | 'time_limit' | 'geographic' | 'functional';
  value: any;
  message?: string;
}

export interface BillingInfo {
  customerId?: string;
  paymentMethod?: PaymentMethod;
  billingCycle: BillingCycle;
  amount: MonetaryAmount;
  currency: string;
  nextBillingDate?: number;
  lastPaymentDate?: number;
  invoiceHistory: Invoice[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'paypal' | 'crypto';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export type BillingCycle = 'monthly' | 'yearly' | 'lifetime' | 'custom';

export interface MonetaryAmount {
  value: number;
  currency: string;
  formatted: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: number;
  dueDate: number;
  amount: MonetaryAmount;
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  downloadUrl?: string;
}

export interface UsageMetrics {
  periodStart: number;
  periodEnd: number;
  metrics: {
    cvGenerated: number;
    storageUsed: number; // in bytes
    apiCalls: number;
    portalViews: number;
    podcastsGenerated: number;
    videosGenerated: number;
  };
  dailyBreakdown?: DailyUsage[];
}

export interface DailyUsage {
  date: number;
  cvGenerated: number;
  apiCalls: number;
  storageUsed: number;
}

export interface SubscriptionMetadata {
  createdAt: number;
  updatedAt: number;
  activatedAt?: number;
  cancelledAt?: number;
  expiredAt?: number;
  source: string; // 'stripe', 'paypal', 'manual', etc.
  campaign?: string;
  discountCode?: string;
  referralCode?: string;
  customFields?: Record<string, any>;
}

export interface PremiumPlan {
  id: string;
  name: string;
  description: string;
  tier: PremiumTier;
  price: {
    monthly: MonetaryAmount;
    yearly: MonetaryAmount;
    lifetime?: MonetaryAmount;
  };
  features: PremiumFeatures;
  limits: PlanLimits;
  popular?: boolean;
  deprecated?: boolean;
  metadata?: Record<string, any>;
}

export interface PlanLimits {
  maxCVs: number;
  maxStorage: number; // in bytes
  maxApiCalls: number;
  maxTeamMembers?: number;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
}

export interface SubscriptionChange {
  subscriptionId: string;
  fromTier: PremiumTier;
  toTier: PremiumTier;
  effectiveDate: number;
  prorationAmount?: MonetaryAmount;
  reason: 'upgrade' | 'downgrade' | 'renewal' | 'cancellation' | 'expiration';
  metadata?: Record<string, any>;
}

export interface FeatureUsageEvent {
  userId: string;
  feature: keyof PremiumFeatures;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PremiumStatus {
  isPremium: boolean;
  isLifetime: boolean;
  tier: PremiumTier;
  status: SubscriptionStatus;
  features: PremiumFeatures;
  usage: UsageMetrics;
  billing?: BillingInfo;
  expiresAt?: number;
  gracePeriodEnd?: number;
}

export interface FeatureGateConfig {
  feature: keyof PremiumFeatures;
  required: {
    tier: PremiumTier;
    status: SubscriptionStatus[];
  };
  fallback?: {
    message: string;
    action?: 'upgrade' | 'login' | 'contact';
    ctaText?: string;
    ctaUrl?: string;
  };
}

export interface UsageAlert {
  feature: keyof PremiumFeatures;
  threshold: number; // percentage of limit
  currentUsage: number;
  limit: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}