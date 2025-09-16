/**
 * CVPlus Premium Security: Security Monitoring Service
 * 
 * Provides comprehensive security monitoring for premium endpoints including
 * threat detection, anomaly monitoring, and security alerting.
 * 
 * @author Gil Klainert
 * @version 4.0.0 - CVPlus Premium Module
  */

import { logger } from 'firebase-functions/v2';
import { BaseService } from '../../shared/base-service';

export interface SecurityEvent {
  timestamp: number;
  type: 'rate_limit' | 'authentication' | 'authorization' | 'suspicious_activity' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  details?: Record<string, any>;
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: number;
  affectedUsers?: string[];
  metadata?: Record<string, any>;
}

export class SecurityMonitorService extends BaseService {
  private eventHistory: SecurityEvent[];
  private alertThresholds: Map<string, { count: number; timeWindow: number }>;

  constructor() {
    super({
      name: 'SecurityMonitorService',
      version: '4.0.0',
      enabled: true,
    });
    
    this.eventHistory = [];
    this.alertThresholds = new Map([
      ['rate_limit', { count: 10, timeWindow: 5 * 60 * 1000 }], // 10 events in 5 minutes
      ['authentication', { count: 5, timeWindow: 2 * 60 * 1000 }], // 5 events in 2 minutes
      ['suspicious_activity', { count: 3, timeWindow: 10 * 60 * 1000 }], // 3 events in 10 minutes
    ]);
  }

  /**
   * Log a security event
    */
  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.eventHistory.push(securityEvent);
    
    // Keep only recent events (last 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.eventHistory = this.eventHistory.filter(e => e.timestamp > cutoff);

    // Log the event
    logger.warn('Security event recorded', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      endpoint: event.endpoint,
      details: event.details,
    });

    // Check for alert conditions
    await this.checkAlertConditions(securityEvent);
  }

  /**
   * Check if recent events warrant an alert
    */
  private async checkAlertConditions(latestEvent: SecurityEvent): Promise<void> {
    const threshold = this.alertThresholds.get(latestEvent.type);
    if (!threshold) return;

    const cutoff = Date.now() - threshold.timeWindow;
    const recentEvents = this.eventHistory.filter(
      e => e.type === latestEvent.type && e.timestamp > cutoff
    );

    if (recentEvents.length >= threshold.count) {
      await this.generateAlert({
        type: latestEvent.type,
        severity: this.calculateAlertSeverity(recentEvents),
        description: `High frequency of ${latestEvent.type} events detected`,
        affectedUsers: [...new Set(recentEvents.map(e => e.userId).filter(Boolean))],
        metadata: {
          eventCount: recentEvents.length,
          timeWindow: threshold.timeWindow,
          threshold: threshold.count,
          recentEvents: recentEvents.slice(-5), // Last 5 events
        },
      });
    }
  }

  /**
   * Generate a security alert
    */
  private async generateAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp'>): Promise<void> {
    const securityAlert: SecurityAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    logger.error('Security alert generated', securityAlert);

    // In a real implementation, this would:
    // - Store alert in database
    // - Send notifications to security team
    // - Trigger automated response if configured
    // - Update security dashboards
  }

  /**
   * Calculate alert severity based on events
    */
  private calculateAlertSeverity(events: SecurityEvent[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityCounts = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (severityCounts.critical > 0) return 'critical';
    if (severityCounts.high > 2) return 'high';
    if (severityCounts.medium > 5) return 'medium';
    return 'low';
  }

  /**
   * Get security statistics
    */
  async getSecurityStatistics(timeRange: number = 24 * 60 * 60 * 1000): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    uniqueUsers: number;
    uniqueIPs: number;
  }> {
    const cutoff = Date.now() - timeRange;
    const recentEvents = this.eventHistory.filter(e => e.timestamp > cutoff);

    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueUsers = new Set(
      recentEvents.map(e => e.userId).filter(Boolean)
    ).size;

    const uniqueIPs = new Set(
      recentEvents.map(e => e.ip).filter(Boolean)
    ).size;

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      uniqueUsers,
      uniqueIPs,
    };
  }

  /**
   * Check for suspicious patterns in user behavior
    */
  async analyzeSuspiciousActivity(userId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
    recommendations: string[];
  }> {
    const userEvents = this.eventHistory.filter(e => e.userId === userId);
    const indicators: string[] = [];
    const recommendations: string[] = [];

    // Check for rapid sequential requests
    const recentEvents = userEvents.filter(e => e.timestamp > Date.now() - 5 * 60 * 1000);
    if (recentEvents.length > 20) {
      indicators.push('High frequency of requests in short time period');
      recommendations.push('Consider implementing stricter rate limiting');
    }

    // Check for multiple IPs
    const uniqueIPs = new Set(userEvents.map(e => e.ip).filter(Boolean));
    if (uniqueIPs.size > 5) {
      indicators.push('Access from multiple IP addresses');
      recommendations.push('Monitor for account sharing or compromise');
    }

    // Check for failed authentication attempts
    const authFailures = userEvents.filter(e => 
      e.type === 'authentication' && e.severity !== 'low'
    );
    if (authFailures.length > 3) {
      indicators.push('Multiple authentication failures');
      recommendations.push('Require additional verification');
    }

    const riskLevel = indicators.length >= 3 ? 'high' : 
                     indicators.length >= 2 ? 'medium' : 'low';

    return {
      riskLevel,
      indicators,
      recommendations,
    };
  }

  /**
   * Get recent security events for a user
    */
  async getUserSecurityEvents(
    userId: string,
    limit: number = 50
  ): Promise<SecurityEvent[]> {
    return this.eventHistory
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitorService();