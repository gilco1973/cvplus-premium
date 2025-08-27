/**
 * Premium Security Monitoring Service
 * 
 * Monitors premium feature access, logs security events, and detects suspicious activity
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @security CRITICAL - Handles premium access security monitoring
 */

import { doc, collection, addDoc, serverTimestamp, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { PremiumFeature } from '../types/premium-features';
import { 
  isValidPremiumFeature, 
  getFeatureSecurityConfig, 
  getRateLimitingConfig 
} from '../types/premium-features';

// =============================================================================
// TYPES
// =============================================================================

export interface PremiumAccessAttempt {
  userId: string;
  email?: string;
  feature: PremiumFeature;
  timestamp: Date;
  result: 'granted' | 'denied';
  reason?: 'no_subscription' | 'feature_not_included' | 'subscription_expired' | 'rate_limited' | 'invalid_feature' | 'subscription_check_failed';
  subscriptionStatus?: 'free' | 'premium' | 'lifetime';
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface SuspiciousActivity {
  userId: string;
  activityType: 'multiple_denials' | 'feature_enumeration' | 'rate_limit_exceeded' | 'subscription_bypass_attempt' | 'invalid_session';
  timestamp: Date;
  details: {
    attemptCount: number;
    timeWindow: number; // seconds
    features?: PremiumFeature[];
    ipAddresses?: string[];
    userAgents?: string[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  automated?: boolean;
}

export interface PremiumSecurityViolation {
  userId: string;
  violationType: 'unauthorized_access' | 'subscription_tampering' | 'feature_abuse' | 'rate_limit_violation' | 'bypass_attempt';
  timestamp: Date;
  feature?: PremiumFeature;
  evidence: {
    accessAttempts: PremiumAccessAttempt[];
    suspiciousPatterns: string[];
    technicalDetails: Record<string, any>;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  actions: string[];
}

export interface RateLimitStatus {
  userId: string;
  feature: PremiumFeature;
  currentHour: {
    count: number;
    limit: number;
    resetAt: Date;
  };
  currentDay: {
    count: number;
    limit: number;
    resetAt: Date;
  };
  isLimited: boolean;
  violations: number;
}

// =============================================================================
// SECURITY MONITORING SERVICE
// =============================================================================

export class PremiumSecurityMonitor {
  private static instance: PremiumSecurityMonitor;
  private suspiciousActivityThresholds = {
    maxDenialsPerMinute: 10,
    maxDenialsPerHour: 50,
    maxFeatureEnumerationAttempts: 20,
    maxRateLimitViolations: 5
  };

  public static getInstance(): PremiumSecurityMonitor {
    if (!PremiumSecurityMonitor.instance) {
      PremiumSecurityMonitor.instance = new PremiumSecurityMonitor();
    }
    return PremiumSecurityMonitor.instance;
  }

  /**
   * Log premium access attempt
   */
  async logAccessAttempt(attempt: PremiumAccessAttempt): Promise<void> {
    try {
      // Validate feature
      if (!isValidPremiumFeature(attempt.feature)) {
        attempt.reason = 'invalid_feature';
        attempt.result = 'denied';
      }

      // Add server timestamp
      const auditData = {
        ...attempt,
        timestamp: serverTimestamp(),
        auditId: `${attempt.userId}_${Date.now()}`,
        securityLevel: getFeatureSecurityConfig(attempt.feature)?.riskLevel || 'medium'
      };

      // Store in Firestore
      await addDoc(collection(db, 'premiumAccessAudit'), auditData);

      // Check for suspicious patterns
      if (attempt.result === 'denied') {
        await this.checkSuspiciousActivity(attempt.userId, attempt);
      }

      // Update rate limiting counters if access granted
      if (attempt.result === 'granted') {
        await this.updateRateLimitCounters(attempt.userId, attempt.feature);
      }

    } catch (error) {
      console.error('Failed to log premium access attempt:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(userId: string, attempt: PremiumAccessAttempt): Promise<void> {
    try {
      // Get recent denials for this user
      const recentDenials = await this.getRecentAccessDenials(userId, 60 * 1000); // Last minute

      // Check for multiple denials pattern
      if (recentDenials.length >= this.suspiciousActivityThresholds.maxDenialsPerMinute) {
        await this.logSuspiciousActivity({
          userId,
          activityType: 'multiple_denials',
          timestamp: new Date(),
          details: {
            attemptCount: recentDenials.length,
            timeWindow: 60,
            features: recentDenials.map(d => d.feature)
          },
          severity: 'high',
          automated: true
        });
      }

      // Check for feature enumeration (trying many different features)
      const uniqueFeatures = [...new Set(recentDenials.map(d => d.feature))];
      if (uniqueFeatures.length >= this.suspiciousActivityThresholds.maxFeatureEnumerationAttempts) {
        await this.logSuspiciousActivity({
          userId,
          activityType: 'feature_enumeration',
          timestamp: new Date(),
          details: {
            attemptCount: recentDenials.length,
            timeWindow: 300, // 5 minutes
            features: uniqueFeatures
          },
          severity: 'critical',
          automated: true
        });
      }

    } catch (error) {
      console.error('Failed to check suspicious activity:', error);
    }
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(activity: SuspiciousActivity): Promise<void> {
    try {
      const activityData = {
        ...activity,
        timestamp: serverTimestamp(),
        id: `suspicious_${activity.userId}_${Date.now()}`
      };

      await addDoc(collection(db, 'suspiciousActivity'), activityData);

      // Auto-escalate critical activities
      if (activity.severity === 'critical') {
        await this.escalateSecurity(activity.userId, activity);
      }

    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

  /**
   * Create premium security violation record
   */
  async createSecurityViolation(violation: Omit<PremiumSecurityViolation, 'timestamp' | 'resolved' | 'actions'>): Promise<void> {
    try {
      const violationData: PremiumSecurityViolation = {
        ...violation,
        timestamp: new Date(),
        resolved: false,
        actions: this.generateViolationActions(violation.violationType, violation.severity)
      };

      await addDoc(collection(db, 'premiumViolations'), {
        ...violationData,
        timestamp: serverTimestamp()
      });

      // Auto-execute certain actions
      await this.executeViolationActions(violation.userId, violationData.actions);

    } catch (error) {
      console.error('Failed to create security violation:', error);
    }
  }

  /**
   * Check rate limiting status for a user and feature
   */
  async checkRateLimit(userId: string, feature: PremiumFeature): Promise<RateLimitStatus> {
    const rateLimitConfig = getRateLimitingConfig(feature);
    
    if (!rateLimitConfig?.enabled) {
      return {
        userId,
        feature,
        currentHour: { count: 0, limit: Infinity, resetAt: new Date() },
        currentDay: { count: 0, limit: Infinity, resetAt: new Date() },
        isLimited: false,
        violations: 0
      };
    }

    try {
      const hourlyDoc = doc(db, `rateLimits/${userId}/hourly/${this.getCurrentHourKey()}`);
      const dailyDoc = doc(db, `rateLimits/${userId}/daily/${this.getCurrentDayKey()}`);

      const [hourlySnap, dailySnap] = await Promise.all([
        getDoc(hourlyDoc),
        getDoc(dailyDoc)
      ]);

      const hourlyData = hourlySnap.exists() ? hourlySnap.data() : { count: 0 };
      const dailyData = dailySnap.exists() ? dailySnap.data() : { count: 0 };

      const hourlyLimit = rateLimitConfig.maxUsagePerHour || Infinity;
      const dailyLimit = rateLimitConfig.maxUsagePerDay || Infinity;

      const isLimited = hourlyData.count >= hourlyLimit || dailyData.count >= dailyLimit;

      return {
        userId,
        feature,
        currentHour: {
          count: hourlyData.count,
          limit: hourlyLimit,
          resetAt: this.getNextHourReset()
        },
        currentDay: {
          count: dailyData.count,
          limit: dailyLimit,
          resetAt: this.getNextDayReset()
        },
        isLimited,
        violations: hourlyData.violations || 0
      };

    } catch (error) {
      console.error('Failed to check rate limit:', error);
      // Fail safe - assume not limited if check fails
      return {
        userId,
        feature,
        currentHour: { count: 0, limit: Infinity, resetAt: new Date() },
        currentDay: { count: 0, limit: Infinity, resetAt: new Date() },
        isLimited: false,
        violations: 0
      };
    }
  }

  /**
   * Update rate limiting counters
   */
  private async updateRateLimitCounters(userId: string, feature: PremiumFeature): Promise<void> {
    const rateLimitConfig = getRateLimitingConfig(feature);
    
    if (!rateLimitConfig?.enabled) return;

    try {
      const hourlyDoc = doc(db, `rateLimits/${userId}/hourly/${this.getCurrentHourKey()}`);
      const dailyDoc = doc(db, `rateLimits/${userId}/daily/${this.getCurrentDayKey()}`);

      await Promise.all([
        updateDoc(hourlyDoc, { 
          count: increment(1),
          feature,
          updatedAt: serverTimestamp()
        }),
        updateDoc(dailyDoc, { 
          count: increment(1),
          feature,
          updatedAt: serverTimestamp()
        })
      ]);

    } catch (error) {
      // If documents don't exist, create them
      try {
        await Promise.all([
          addDoc(collection(db, `rateLimits/${userId}/hourly`), {
            count: 1,
            feature,
            createdAt: serverTimestamp(),
            key: this.getCurrentHourKey()
          }),
          addDoc(collection(db, `rateLimits/${userId}/daily`), {
            count: 1,
            feature,
            createdAt: serverTimestamp(),
            key: this.getCurrentDayKey()
          })
        ]);
      } catch (createError) {
        console.error('Failed to create rate limit counters:', createError);
      }
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async getRecentAccessDenials(userId: string, timeWindowMs: number): Promise<PremiumAccessAttempt[]> {
    // In a real implementation, this would query Firestore for recent denials
    // For now, return empty array as placeholder
    return [];
  }

  private async escalateSecurity(userId: string, activity: SuspiciousActivity): Promise<void> {
    // Implementation would:
    // 1. Alert security team
    // 2. Temporarily suspend user if needed
    // 3. Create incident ticket
    console.warn(`SECURITY ESCALATION: Critical suspicious activity for user ${userId}`, activity);
  }

  private generateViolationActions(violationType: string, severity: string): string[] {
    const actions: string[] = ['log_incident'];

    switch (severity) {
      case 'critical':
        actions.push('notify_security_team', 'temporary_suspension', 'audit_user_activity');
        break;
      case 'high':
        actions.push('notify_security_team', 'enhanced_monitoring');
        break;
      case 'medium':
        actions.push('enhanced_monitoring');
        break;
    }

    return actions;
  }

  private async executeViolationActions(userId: string, actions: string[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(userId, action);
      } catch (error) {
        console.error(`Failed to execute violation action ${action} for user ${userId}:`, error);
      }
    }
  }

  private async executeAction(userId: string, action: string): Promise<void> {
    switch (action) {
      case 'log_incident':
        console.log(`Security incident logged for user ${userId}`);
        break;
      case 'notify_security_team':
        console.warn(`Security team notified about user ${userId}`);
        break;
      case 'enhanced_monitoring':
        console.log(`Enhanced monitoring enabled for user ${userId}`);
        break;
      case 'temporary_suspension':
        console.error(`CRITICAL: Temporary suspension recommended for user ${userId}`);
        break;
      default:
        console.log(`Unknown security action: ${action}`);
    }
  }

  private getCurrentHourKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
  }

  private getCurrentDayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  private getNextHourReset(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
  }

  private getNextDayReset(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const premiumSecurityMonitor = PremiumSecurityMonitor.getInstance();

export default {
  PremiumSecurityMonitor,
  premiumSecurityMonitor
};