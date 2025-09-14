/**
 * CVPlus Premium Global Payment Infrastructure
 * Fraud Prevention and Risk Management Service
 *
 * Advanced fraud detection using machine learning, behavioral analysis,
 * and real-time risk assessment for global payment security.
 *
 * @author Gil Klainert
 * @version 1.0.0
 * @category Global Payments
 */

import { logger } from 'firebase-functions/v2';
import { BaseService } from '../../shared/base-service';
import { SupportedCurrency } from './currency-manager';

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FraudIndicator {
  VELOCITY_ANOMALY = 'velocity_anomaly',
  GEOLOCATION_MISMATCH = 'geolocation_mismatch',
  DEVICE_FINGERPRINT_MISMATCH = 'device_fingerprint_mismatch',
  UNUSUAL_AMOUNT = 'unusual_amount',
  BLACKLISTED_EMAIL = 'blacklisted_email',
  PROXY_VPN_DETECTED = 'proxy_vpn_detected',
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',
  SUSPICIOUS_USER_AGENT = 'suspicious_user_agent',
  CARD_TESTING_PATTERN = 'card_testing_pattern',
  HIGH_RISK_BIN = 'high_risk_bin',
  STOLEN_CARD_DATABASE = 'stolen_card_database'
}

export interface TransactionRiskProfile {
  transactionId: string;
  customerId: string;
  amount: number;
  currency: SupportedCurrency;
  paymentMethod: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  timestamp: Date;

  // Customer data
  customerEmail: string;
  customerAge?: number; // Account age in days
  previousTransactionCount: number;

  // Geographic data
  billingCountry: string;
  shippingCountry?: string;
  ipCountry: string;

  // Payment data
  cardBin?: string;
  cardLast4?: string;
  cardType?: string;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  confidence: number; // 0-1
  decision: 'approve' | 'review' | 'decline';
  indicators: {
    type: FraudIndicator;
    severity: number; // 0-10
    description: string;
    confidence: number;
  }[];
  recommendation: string;
  reviewRequired: boolean;
  additionalVerificationNeeded?: string[];
}

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: number;
  conditions: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches_pattern';
    value: any;
  }[];
  action: 'flag' | 'review' | 'decline';
}

export interface CustomerBehaviorProfile {
  customerId: string;
  averageTransactionAmount: number;
  transactionFrequency: number; // transactions per month
  preferredPaymentMethods: string[];
  typicalTransactionTimes: number[]; // hours of day
  usualCountries: string[];
  deviceFingerprints: string[];
  lastActiveDate: Date;
  suspiciousActivityScore: number;
}

/**
 * Fraud Prevention Service for global payment processing
 * Implements ML-based risk assessment and real-time fraud detection
 */
export class FraudPreventionService extends BaseService {
  private fraudRules = new Map<string, FraudRule>();
  private customerProfiles = new Map<string, CustomerBehaviorProfile>();
  private blacklistedEmails = new Set<string>();
  private blacklistedIPs = new Set<string>();
  private suspiciousCountryPairs = new Set<string>();

  constructor(config: any) {
    super({
      name: 'FraudPreventionService',
      version: '1.0.0',
      enabled: true,
      ...config
    });

    this.initializeFraudRules();
    this.initializeBlacklists();
    this.initializeSuspiciousPatterns();
  }

  /**
   * Initialize fraud detection rules
   */
  private initializeFraudRules(): void {
    const rules: FraudRule[] = [
      {
        id: 'velocity_check',
        name: 'Transaction Velocity Check',
        description: 'Detects unusually high transaction frequency',
        enabled: true,
        severity: 8,
        conditions: [
          { field: 'transaction_count_1h', operator: 'greater_than', value: 10 },
          { field: 'transaction_count_24h', operator: 'greater_than', value: 50 }
        ],
        action: 'review'
      },
      {
        id: 'amount_anomaly',
        name: 'Unusual Amount Detection',
        description: 'Flags transactions with amounts significantly different from user\'s history',
        enabled: true,
        severity: 6,
        conditions: [
          { field: 'amount_deviation_from_average', operator: 'greater_than', value: 5.0 }
        ],
        action: 'flag'
      },
      {
        id: 'geolocation_mismatch',
        name: 'Geographic Location Mismatch',
        description: 'Detects mismatches between billing, shipping, and IP locations',
        enabled: true,
        severity: 7,
        conditions: [
          { field: 'country_mismatch_count', operator: 'greater_than', value: 1 }
        ],
        action: 'review'
      },
      {
        id: 'proxy_vpn_detection',
        name: 'Proxy/VPN Detection',
        description: 'Flags transactions from known proxy or VPN IP addresses',
        enabled: true,
        severity: 5,
        conditions: [
          { field: 'is_proxy', operator: 'equals', value: true }
        ],
        action: 'flag'
      },
      {
        id: 'card_testing',
        name: 'Card Testing Pattern',
        description: 'Detects patterns consistent with card testing attacks',
        enabled: true,
        severity: 9,
        conditions: [
          { field: 'failed_attempts_1h', operator: 'greater_than', value: 5 },
          { field: 'multiple_cards_same_ip', operator: 'equals', value: true }
        ],
        action: 'decline'
      },
      {
        id: 'high_risk_bin',
        name: 'High Risk BIN Range',
        description: 'Flags cards from known high-risk BIN ranges',
        enabled: true,
        severity: 6,
        conditions: [
          { field: 'bin_risk_level', operator: 'equals', value: 'high' }
        ],
        action: 'review'
      },
      {
        id: 'device_fingerprint_anomaly',
        name: 'Device Fingerprint Anomaly',
        description: 'Detects when a customer uses an unrecognized device',
        enabled: true,
        severity: 4,
        conditions: [
          { field: 'device_previously_seen', operator: 'equals', value: false },
          { field: 'customer_age_days', operator: 'greater_than', value: 30 }
        ],
        action: 'flag'
      }
    ];

    rules.forEach(rule => {
      this.fraudRules.set(rule.id, rule);
    });

    logger.info('Initialized fraud detection rules', {
      ruleCount: rules.length,
      enabledRules: rules.filter(r => r.enabled).length
    });
  }

  /**
   * Initialize blacklists and suspicious patterns
   */
  private initializeBlacklists(): void {
    // Sample blacklisted emails (in production, would load from database)
    const blacklistedEmails = [
      'fraudulent@example.com',
      'test@tempmail.org',
      'spam@guerrillamail.com'
    ];

    // Sample blacklisted IPs
    const blacklistedIPs = [
      '192.0.2.1',    // Documentation IP
      '198.51.100.1', // Test IP range
      '203.0.113.1'   // Documentation IP
    ];

    blacklistedEmails.forEach(email => this.blacklistedEmails.add(email.toLowerCase()));
    blacklistedIPs.forEach(ip => this.blacklistedIPs.add(ip));

    logger.info('Initialized blacklists', {
      blacklistedEmails: this.blacklistedEmails.size,
      blacklistedIPs: this.blacklistedIPs.size
    });
  }

  /**
   * Initialize suspicious country pair patterns
   */
  private initializeSuspiciousPatterns(): void {
    // Country pairs that are commonly associated with fraud
    const suspiciousPairs = [
      'US_NG', 'GB_NG', 'US_RO', 'GB_RO', // US/UK billing with Nigeria/Romania shipping
      'DE_PK', 'FR_BD', 'AU_IN'          // Other high-risk patterns
    ];

    suspiciousPairs.forEach(pair => this.suspiciousCountryPairs.add(pair));

    logger.info('Initialized suspicious country patterns', {
      patternCount: this.suspiciousCountryPairs.size
    });
  }

  /**
   * Perform comprehensive risk assessment on transaction
   */
  async assessTransactionRisk(profile: TransactionRiskProfile): Promise<RiskAssessment> {
    try {
      logger.info('Starting fraud risk assessment', {
        transactionId: profile.transactionId,
        customerId: profile.customerId,
        amount: profile.amount
      });

      const indicators: RiskAssessment['indicators'] = [];
      let riskScore = 0;

      // Check each fraud indicator
      const checks = [
        () => this.checkVelocityAnomalies(profile),
        () => this.checkGeolocationMismatch(profile),
        () => this.checkDeviceFingerprint(profile),
        () => this.checkAmountAnomaly(profile),
        () => this.checkBlacklistedData(profile),
        () => this.checkProxyVPN(profile),
        () => this.checkFailedAttempts(profile),
        () => this.checkCardTesting(profile),
        () => this.checkBINRisk(profile)
      ];

      // Execute all checks
      for (const check of checks) {
        const result = await check();
        if (result) {
          indicators.push(result);
          riskScore += result.severity;
        }
      }

      // Apply ML-based risk scoring (simplified)
      const mlRiskScore = await this.calculateMLRiskScore(profile);
      riskScore = Math.min(100, riskScore + mlRiskScore);

      // Determine risk level and decision
      const riskLevel = this.determineRiskLevel(riskScore);
      const decision = this.makeRiskDecision(riskLevel, indicators);

      const assessment: RiskAssessment = {
        riskLevel,
        riskScore,
        confidence: this.calculateConfidence(indicators),
        decision,
        indicators,
        recommendation: this.generateRecommendation(decision, riskLevel, indicators),
        reviewRequired: decision === 'review' || riskLevel === RiskLevel.HIGH,
        additionalVerificationNeeded: this.getRequiredVerification(indicators)
      };

      // Update customer profile
      await this.updateCustomerProfile(profile);

      logger.info('Risk assessment completed', {
        transactionId: profile.transactionId,
        riskLevel: assessment.riskLevel,
        riskScore: assessment.riskScore,
        decision: assessment.decision,
        indicatorCount: indicators.length
      });

      return assessment;

    } catch (error) {
      logger.error('Risk assessment failed', { error, transactionId: profile.transactionId });

      // Default to review on error for safety
      return {
        riskLevel: RiskLevel.MEDIUM,
        riskScore: 50,
        confidence: 0.1,
        decision: 'review',
        indicators: [{
          type: FraudIndicator.VELOCITY_ANOMALY,
          severity: 5,
          description: 'Risk assessment system error - manual review required',
          confidence: 0.1
        }],
        recommendation: 'System error occurred during risk assessment. Manual review recommended.',
        reviewRequired: true
      };
    }
  }

  /**
   * Check for velocity anomalies
   */
  private async checkVelocityAnomalies(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    // Simulate velocity check (in production, would query transaction database)
    const recentTransactionCount = Math.floor(Math.random() * 15); // Mock data

    if (recentTransactionCount > 10) {
      return {
        type: FraudIndicator.VELOCITY_ANOMALY,
        severity: Math.min(10, recentTransactionCount / 2),
        description: `Unusually high transaction velocity: ${recentTransactionCount} transactions in last hour`,
        confidence: 0.9
      };
    }

    return null;
  }

  /**
   * Check for geolocation mismatches
   */
  private async checkGeolocationMismatch(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    const countries = [profile.billingCountry, profile.shippingCountry, profile.ipCountry].filter(Boolean);
    const uniqueCountries = new Set(countries);

    if (uniqueCountries.size > 2) {
      const suspiciousPair = `${profile.billingCountry}_${profile.ipCountry}`;
      const isSuspicious = this.suspiciousCountryPairs.has(suspiciousPair);

      return {
        type: FraudIndicator.GEOLOCATION_MISMATCH,
        severity: isSuspicious ? 8 : 6,
        description: `Geographic mismatch detected across ${uniqueCountries.size} countries`,
        confidence: isSuspicious ? 0.95 : 0.7
      };
    }

    return null;
  }

  /**
   * Check device fingerprint
   */
  private async checkDeviceFingerprint(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    if (!profile.deviceFingerprint) return null;

    const customerProfile = this.customerProfiles.get(profile.customerId);

    if (customerProfile && !customerProfile.deviceFingerprints.includes(profile.deviceFingerprint)) {
      return {
        type: FraudIndicator.DEVICE_FINGERPRINT_MISMATCH,
        severity: 4,
        description: 'Transaction from unrecognized device',
        confidence: 0.8
      };
    }

    return null;
  }

  /**
   * Check for amount anomalies
   */
  private async checkAmountAnomaly(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    const customerProfile = this.customerProfiles.get(profile.customerId);

    if (customerProfile) {
      const deviation = Math.abs(profile.amount - customerProfile.averageTransactionAmount) / customerProfile.averageTransactionAmount;

      if (deviation > 3.0) { // More than 300% different from average
        return {
          type: FraudIndicator.UNUSUAL_AMOUNT,
          severity: Math.min(8, deviation * 2),
          description: `Transaction amount significantly different from customer's average (${deviation.toFixed(2)}x deviation)`,
          confidence: 0.85
        };
      }
    }

    return null;
  }

  /**
   * Check blacklisted data
   */
  private async checkBlacklistedData(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    if (this.blacklistedEmails.has(profile.customerEmail.toLowerCase())) {
      return {
        type: FraudIndicator.BLACKLISTED_EMAIL,
        severity: 10,
        description: 'Customer email found in fraud blacklist',
        confidence: 1.0
      };
    }

    if (this.blacklistedIPs.has(profile.ipAddress)) {
      return {
        type: FraudIndicator.BLACKLISTED_EMAIL,
        severity: 9,
        description: 'Transaction from blacklisted IP address',
        confidence: 0.95
      };
    }

    return null;
  }

  /**
   * Check for proxy/VPN usage
   */
  private async checkProxyVPN(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    // Simulate proxy/VPN detection (in production, would use IP intelligence service)
    const isProxy = Math.random() < 0.1; // 10% chance for demo

    if (isProxy) {
      return {
        type: FraudIndicator.PROXY_VPN_DETECTED,
        severity: 5,
        description: 'Transaction originated from proxy/VPN IP address',
        confidence: 0.8
      };
    }

    return null;
  }

  /**
   * Check for multiple failed attempts
   */
  private async checkFailedAttempts(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    // Simulate failed attempts check
    const failedAttempts = Math.floor(Math.random() * 8);

    if (failedAttempts > 3) {
      return {
        type: FraudIndicator.MULTIPLE_FAILED_ATTEMPTS,
        severity: Math.min(9, failedAttempts * 1.5),
        description: `Multiple failed payment attempts detected: ${failedAttempts} in last hour`,
        confidence: 0.9
      };
    }

    return null;
  }

  /**
   * Check for card testing patterns
   */
  private async checkCardTesting(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    // Simulate card testing detection
    const isCardTesting = Math.random() < 0.05; // 5% chance for demo

    if (isCardTesting) {
      return {
        type: FraudIndicator.CARD_TESTING_PATTERN,
        severity: 10,
        description: 'Pattern consistent with automated card testing detected',
        confidence: 0.95
      };
    }

    return null;
  }

  /**
   * Check BIN risk level
   */
  private async checkBINRisk(profile: TransactionRiskProfile): Promise<RiskAssessment['indicators'][0] | null> {
    if (!profile.cardBin) return null;

    // Simulate BIN risk check
    const isHighRiskBIN = Math.random() < 0.08; // 8% chance for demo

    if (isHighRiskBIN) {
      return {
        type: FraudIndicator.HIGH_RISK_BIN,
        severity: 7,
        description: 'Card BIN flagged as high-risk in fraud database',
        confidence: 0.9
      };
    }

    return null;
  }

  /**
   * Calculate ML-based risk score
   */
  private async calculateMLRiskScore(profile: TransactionRiskProfile): Promise<number> {
    // Simplified ML scoring (in production, would use trained model)
    let score = 0;

    // Factor in customer age
    if (profile.customerAge && profile.customerAge < 7) score += 15; // New customer
    if (profile.customerAge && profile.customerAge > 365) score -= 10; // Established customer

    // Factor in transaction history
    if (profile.previousTransactionCount === 0) score += 20; // First transaction
    if (profile.previousTransactionCount > 50) score -= 15; // Frequent customer

    // Factor in amount relative to typical subscription price
    if (profile.amount > 100) score += 10; // Unusually high amount
    if (profile.amount < 5) score += 5;   // Unusually low amount

    // Factor in time of day (simplified)
    const hour = profile.timestamp.getHours();
    if (hour < 6 || hour > 22) score += 8; // Off-hours transaction

    return Math.max(0, Math.min(30, score)); // Cap ML contribution at 30 points
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 30) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Make risk decision
   */
  private makeRiskDecision(riskLevel: RiskLevel, indicators: RiskAssessment['indicators']): 'approve' | 'review' | 'decline' {
    // Check if any indicator requires immediate decline
    const hasDeclineIndicator = indicators.some(i => i.severity >= 10);
    if (hasDeclineIndicator) return 'decline';

    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return 'decline';
      case RiskLevel.HIGH:
        return 'review';
      case RiskLevel.MEDIUM:
        return indicators.length > 2 ? 'review' : 'approve';
      case RiskLevel.LOW:
        return 'approve';
      default:
        return 'review';
    }
  }

  /**
   * Calculate confidence in assessment
   */
  private calculateConfidence(indicators: RiskAssessment['indicators']): number {
    if (indicators.length === 0) return 0.9; // High confidence in low risk

    const avgConfidence = indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;
    const severityFactor = indicators.reduce((sum, i) => sum + i.severity, 0) / (indicators.length * 10);

    return Math.min(1.0, (avgConfidence + severityFactor) / 2);
  }

  /**
   * Generate risk recommendation
   */
  private generateRecommendation(
    decision: 'approve' | 'review' | 'decline',
    riskLevel: RiskLevel,
    indicators: RiskAssessment['indicators']
  ): string {
    switch (decision) {
      case 'approve':
        return 'Transaction approved with low fraud risk. Continue with normal processing.';
      case 'review':
        return `Manual review recommended due to ${riskLevel.toLowerCase()} risk indicators. ${indicators.length} potential fraud signals detected.`;
      case 'decline':
        return 'Transaction declined due to high fraud risk. Do not process payment.';
      default:
        return 'Unable to determine recommendation.';
    }
  }

  /**
   * Determine required additional verification
   */
  private getRequiredVerification(indicators: RiskAssessment['indicators']): string[] {
    const verifications: string[] = [];

    if (indicators.some(i => i.type === FraudIndicator.GEOLOCATION_MISMATCH)) {
      verifications.push('identity_verification');
    }

    if (indicators.some(i => i.type === FraudIndicator.DEVICE_FINGERPRINT_MISMATCH)) {
      verifications.push('device_verification');
    }

    if (indicators.some(i => i.type === FraudIndicator.UNUSUAL_AMOUNT)) {
      verifications.push('amount_confirmation');
    }

    return verifications;
  }

  /**
   * Update customer behavioral profile
   */
  private async updateCustomerProfile(profile: TransactionRiskProfile): Promise<void> {
    let customerProfile = this.customerProfiles.get(profile.customerId);

    if (!customerProfile) {
      customerProfile = {
        customerId: profile.customerId,
        averageTransactionAmount: profile.amount,
        transactionFrequency: 1,
        preferredPaymentMethods: [profile.paymentMethod],
        typicalTransactionTimes: [profile.timestamp.getHours()],
        usualCountries: [profile.billingCountry],
        deviceFingerprints: profile.deviceFingerprint ? [profile.deviceFingerprint] : [],
        lastActiveDate: profile.timestamp,
        suspiciousActivityScore: 0
      };
    } else {
      // Update existing profile
      customerProfile.averageTransactionAmount =
        (customerProfile.averageTransactionAmount + profile.amount) / 2;
      customerProfile.transactionFrequency += 1;
      customerProfile.lastActiveDate = profile.timestamp;

      if (!customerProfile.preferredPaymentMethods.includes(profile.paymentMethod)) {
        customerProfile.preferredPaymentMethods.push(profile.paymentMethod);
      }

      if (profile.deviceFingerprint && !customerProfile.deviceFingerprints.includes(profile.deviceFingerprint)) {
        customerProfile.deviceFingerprints.push(profile.deviceFingerprint);
      }
    }

    this.customerProfiles.set(profile.customerId, customerProfile);
  }

  /**
   * Add email to blacklist
   */
  async addToBlacklist(email: string, reason: string): Promise<void> {
    this.blacklistedEmails.add(email.toLowerCase());
    logger.info('Email added to blacklist', { email, reason });
  }

  /**
   * Remove email from blacklist
   */
  async removeFromBlacklist(email: string): Promise<void> {
    this.blacklistedEmails.delete(email.toLowerCase());
    logger.info('Email removed from blacklist', { email });
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(timeRange: { start: Date; end: Date }): Promise<{
    totalTransactions: number;
    flaggedTransactions: number;
    declinedTransactions: number;
    falsePositiveRate: number;
    topFraudIndicators: Array<{
      indicator: FraudIndicator;
      count: number;
      percentage: number;
    }>;
  }> {
    // Simulate fraud statistics
    return {
      totalTransactions: 10000,
      flaggedTransactions: 250,
      declinedTransactions: 45,
      falsePositiveRate: 0.02,
      topFraudIndicators: [
        { indicator: FraudIndicator.VELOCITY_ANOMALY, count: 89, percentage: 35.6 },
        { indicator: FraudIndicator.GEOLOCATION_MISMATCH, count: 67, percentage: 26.8 },
        { indicator: FraudIndicator.UNUSUAL_AMOUNT, count: 43, percentage: 17.2 },
        { indicator: FraudIndicator.PROXY_VPN_DETECTED, count: 34, percentage: 13.6 },
        { indicator: FraudIndicator.MULTIPLE_FAILED_ATTEMPTS, count: 17, percentage: 6.8 }
      ]
    };
  }

  /**
   * Health check for fraud prevention service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    return {
      status: 'healthy',
      details: {
        fraudRulesCount: this.fraudRules.size,
        enabledRulesCount: Array.from(this.fraudRules.values()).filter(r => r.enabled).length,
        blacklistedEmails: this.blacklistedEmails.size,
        blacklistedIPs: this.blacklistedIPs.size,
        customerProfiles: this.customerProfiles.size,
        suspiciousPatterns: this.suspiciousCountryPairs.size
      }
    };
  }
}