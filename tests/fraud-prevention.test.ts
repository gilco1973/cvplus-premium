/**
 * CVPlus Premium Global Payment Infrastructure Tests
 * Fraud Prevention Service Tests
 *
 * @author Gil Klainert
 * @version 4.0.0
 * @category Payment Security Testing
  */

import {
  FraudPreventionService,
  TransactionRiskProfile,
  RiskLevel,
  FraudIndicator,
  RiskAssessment
} from '../fraud-prevention';

describe('FraudPreventionService', () => {
  let fraudService: FraudPreventionService;
  const mockConfig = {
    name: 'FraudPreventionService',
    version: '1.0.0',
    enabled: true
  };

  beforeEach(() => {
    fraudService = new FraudPreventionService(mockConfig);
    jest.clearAllMocks();
  });

  describe('assessTransactionRisk', () => {
    test('should assess low risk transaction', async () => {
      const lowRiskProfile: TransactionRiskProfile = {
        transactionId: 'txn_123',
        customerId: 'cust_123',
        amount: 50,
        currency: 'USD',
        paymentMethod: 'card',
        customerHistory: {
          totalTransactions: 10,
          successfulTransactions: 10,
          accountAgeInDays: 365,
          previousChargebacks: 0,
          paymentMethodChanges: 0
        },
        transactionContext: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          deviceFingerprint: 'stable_device_123',
          location: {
            country: 'US',
            region: 'CA',
            city: 'San Francisco'
          },
          sessionId: 'session_123',
          referrer: 'direct'
        },
        timestamp: new Date()
      };

      const assessment = await fraudService.assessTransactionRisk(lowRiskProfile);

      expect(assessment.riskLevel).toBe(RiskLevel.LOW);
      expect(assessment.decision).toBe('approve');
      expect(assessment.reviewRequired).toBe(false);
      expect(assessment.additionalVerificationNeeded).toBe(false);
      expect(assessment.indicators).toHaveLength(0);
    });

    test('should assess high risk transaction', async () => {
      const highRiskProfile: TransactionRiskProfile = {
        transactionId: 'txn_456',
        customerId: 'cust_456',
        amount: 5000, // High amount
        currency: 'USD',
        paymentMethod: 'card',
        customerHistory: {
          totalTransactions: 1, // New customer
          successfulTransactions: 0,
          accountAgeInDays: 1, // Very new account
          previousChargebacks: 0,
          paymentMethodChanges: 3 // Multiple payment method changes
        },
        transactionContext: {
          ipAddress: '10.0.0.1', // Different IP
          userAgent: 'UnknownBot/1.0',
          deviceFingerprint: 'new_device_456',
          location: {
            country: 'RU', // High-risk country
            region: 'Unknown',
            city: 'Unknown'
          },
          sessionId: 'session_456',
          referrer: 'suspicious-site.com'
        },
        timestamp: new Date()
      };

      const assessment = await fraudService.assessTransactionRisk(highRiskProfile);

      expect(assessment.riskLevel).toBe(RiskLevel.HIGH);
      expect(assessment.decision).toBe('decline');
      expect(assessment.reviewRequired).toBe(true);
      expect(assessment.indicators.length).toBeGreaterThan(0);
      expect(assessment.indicators).toContain(FraudIndicator.HIGH_AMOUNT_ANOMALY);
      expect(assessment.indicators).toContain(FraudIndicator.NEW_ACCOUNT);
    });

    test('should assess medium risk transaction requiring review', async () => {
      const mediumRiskProfile: TransactionRiskProfile = {
        transactionId: 'txn_789',
        customerId: 'cust_789',
        amount: 200,
        currency: 'USD',
        paymentMethod: 'card',
        customerHistory: {
          totalTransactions: 5,
          successfulTransactions: 4,
          accountAgeInDays: 90,
          previousChargebacks: 1, // Previous chargeback
          paymentMethodChanges: 2
        },
        transactionContext: {
          ipAddress: '203.0.113.1', // Different from usual
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          deviceFingerprint: 'different_device_789',
          location: {
            country: 'US',
            region: 'NY',
            city: 'New York'
          },
          sessionId: 'session_789',
          referrer: 'google.com'
        },
        timestamp: new Date()
      };

      const assessment = await fraudService.assessTransactionRisk(mediumRiskProfile);

      expect(assessment.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(assessment.decision).toBe('review');
      expect(assessment.reviewRequired).toBe(true);
      expect(assessment.additionalVerificationNeeded).toBe(true);
      expect(assessment.indicators).toContain(FraudIndicator.GEOLOCATION_MISMATCH);
    });
  });

  describe('getFraudStatistics', () => {
    test('should return fraud statistics for date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const statistics = await fraudService.getFraudStatistics({
        start: startDate,
        end: endDate
      });

      expect(statistics).toHaveProperty('totalTransactions');
      expect(statistics).toHaveProperty('flaggedTransactions');
      expect(statistics).toHaveProperty('falsePositives');
      expect(statistics).toHaveProperty('actualFraud');
      expect(statistics).toHaveProperty('riskDistribution');
      expect(statistics.riskDistribution).toHaveProperty('low');
      expect(statistics.riskDistribution).toHaveProperty('medium');
      expect(statistics.riskDistribution).toHaveProperty('high');
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status', async () => {
      const health = await fraudService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('FraudPreventionService');
      expect(health.version).toBe('1.0.0');
      expect(health.details).toHaveProperty('mlModel');
      expect(health.details).toHaveProperty('riskEngine');
    });
  });

  describe('fraud indicators', () => {
    test('should detect velocity anomaly', async () => {
      const profile: TransactionRiskProfile = {
        transactionId: 'txn_velocity',
        customerId: 'cust_velocity',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'card',
        customerHistory: {
          totalTransactions: 50, // High transaction count
          successfulTransactions: 48,
          accountAgeInDays: 7, // But very new account
          previousChargebacks: 0,
          paymentMethodChanges: 0
        },
        transactionContext: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          deviceFingerprint: 'device_123',
          location: {
            country: 'US',
            region: 'CA',
            city: 'San Francisco'
          },
          sessionId: 'session_velocity',
          referrer: 'direct'
        },
        timestamp: new Date()
      };

      const assessment = await fraudService.assessTransactionRisk(profile);

      expect(assessment.indicators).toContain(FraudIndicator.VELOCITY_ANOMALY);
    });

    test('should detect suspicious user agent', async () => {
      const profile: TransactionRiskProfile = {
        transactionId: 'txn_bot',
        customerId: 'cust_bot',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'card',
        customerHistory: {
          totalTransactions: 5,
          successfulTransactions: 5,
          accountAgeInDays: 30,
          previousChargebacks: 0,
          paymentMethodChanges: 0
        },
        transactionContext: {
          ipAddress: '192.168.1.1',
          userAgent: 'Bot/1.0', // Suspicious user agent
          deviceFingerprint: 'device_123',
          location: {
            country: 'US',
            region: 'CA',
            city: 'San Francisco'
          },
          sessionId: 'session_bot',
          referrer: 'direct'
        },
        timestamp: new Date()
      };

      const assessment = await fraudService.assessTransactionRisk(profile);

      expect(assessment.indicators).toContain(FraudIndicator.SUSPICIOUS_USER_AGENT);
    });
  });

  describe('error handling', () => {
    test('should handle missing transaction data', async () => {
      const invalidProfile = {
        transactionId: 'txn_invalid'
        // Missing required fields
      } as any;

      await expect(
        fraudService.assessTransactionRisk(invalidProfile)
      ).rejects.toThrow('Invalid transaction profile');
    });

    test('should handle invalid date range in statistics', async () => {
      const endDate = new Date('2024-01-01');
      const startDate = new Date('2024-01-31'); // Start after end

      await expect(
        fraudService.getFraudStatistics({
          start: startDate,
          end: endDate
        })
      ).rejects.toThrow('Invalid date range');
    });
  });

  describe('risk scoring', () => {
    test('should calculate accurate risk scores', async () => {
      const profile: TransactionRiskProfile = {
        transactionId: 'txn_score',
        customerId: 'cust_score',
        amount: 1000,
        currency: 'USD',
        paymentMethod: 'card',
        customerHistory: {
          totalTransactions: 20,
          successfulTransactions: 18,
          accountAgeInDays: 180,
          previousChargebacks: 1,
          paymentMethodChanges: 1
        },
        transactionContext: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          deviceFingerprint: 'device_123',
          location: {
            country: 'US',
            region: 'CA',
            city: 'San Francisco'
          },
          sessionId: 'session_score',
          referrer: 'direct'
        },
        timestamp: new Date()
      };

      const assessment = await fraudService.assessTransactionRisk(profile);

      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskScore).toBeLessThanOrEqual(100);
      expect(typeof assessment.riskScore).toBe('number');
    });
  });
});