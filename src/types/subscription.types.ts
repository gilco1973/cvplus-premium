/**
 * Subscription-specific types for the Premium module
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Subscription lifecycle events
 */
export type SubscriptionEvent = 
  | 'created'
  | 'activated' 
  | 'upgraded'
  | 'downgraded'
  | 'cancelled'
  | 'expired'
  | 'suspended'
  | 'reactivated'
  | 'renewed';

/**
 * Subscription change reason
 */
export type SubscriptionChangeReason = 
  | 'user_requested'
  | 'payment_failed'
  | 'admin_action'
  | 'system_upgrade'
  | 'billing_issue'
  | 'policy_violation';

/**
 * Subscription metadata for tracking changes
 */
export interface SubscriptionMetadata {
  source?: string;
  campaign?: string;
  referrer?: string;
  device?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  [key: string]: any;
}

/**
 * Subscription change log entry
 */
export interface SubscriptionChangeLog {
  id: string;
  userId: string;
  event: SubscriptionEvent;
  fromStatus?: string;
  toStatus: string;
  reason: SubscriptionChangeReason;
  metadata?: SubscriptionMetadata;
  performedBy?: string; // User ID of admin who made the change
  timestamp: Timestamp | Date;
}

/**
 * Trial period configuration
 */
export interface TrialConfig {
  enabled: boolean;
  duration: number; // days
  features: string[];
  autoConvert: boolean;
}

/**
 * Subscription plan configuration
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  tier: string;
  price: {
    amount: number;
    currency: string;
    cycle: 'monthly' | 'yearly' | 'lifetime';
  };
  features: string[];
  limits: Record<string, number>;
  trial?: TrialConfig;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Subscription validation result
 */
export interface SubscriptionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  subscription?: any;
}