/**
 * Tier Management Types
 * Defines the types and interfaces for the tier management system
 */

export enum UserTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export interface TierConfig {
  tier: UserTier;
  features: Set<string>;
  limits: TierLimits;
  metadata?: Record<string, any>;
}

export interface TierLimits {
  maxCVProcessing: number;
  maxATSOptimizations: number;
  maxMLPredictions: number;
  maxEnterpriseIntegrations: number;
  maxMonthlyRequests: number;
  dataRetentionDays: number;
}

export interface TierCheckResult {
  tier: UserTier;
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  suggestedTier?: UserTier;
}

export interface UserTierInfo {
  userId: string;
  currentTier: UserTier;
  subscriptionStatus: SubscriptionStatus;
  usageStats: UsageStats;
  tierExpiry?: Date;
  customFeatures?: Set<string>;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  isEnterprise: boolean;
  subscriptionId?: string;
  billingCycle?: 'monthly' | 'yearly' | 'lifetime';
  nextBillingDate?: Date;
}

export interface UsageStats {
  cvProcessed: number;
  atsOptimizations: number;
  mlPredictions: number;
  enterpriseIntegrations: number;
  totalRequests: number;
  currentMonth: string;
  lastResetDate: Date;
}

export interface FeatureAccessRequest {
  userId: string;
  feature: string;
  tier?: UserTier;
  metadata?: Record<string, any>;
}

export interface FeatureAccessResponse {
  hasAccess: boolean;
  tier: UserTier;
  feature: string;
  reason?: string;
  upgradeLink?: string;
  alternativeFeatures?: string[];
}