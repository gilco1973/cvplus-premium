/**
 * CVPlus Premium Performance & Monitoring Tests
 * Performance Monitor Service Tests
 *
 * @author Gil Klainert
 * @version 4.0.0
 * @category Performance Monitoring Testing
 */

import {
  PerformanceMonitor,
  MetricType,
  AlertSeverity,
  PerformanceMetric,
  SLAStatus
} from '../performance-monitor';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: jest.fn(),
      where: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(() => ({
              docs: []
            }))
          }))
        }))
      }))
    }))
  }))
}));

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  const mockConfig = {
    name: 'PerformanceMonitor',
    version: '1.0.0',
    enabled: true
  };

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor(mockConfig);
    jest.clearAllMocks();
  });

  describe('recordMetric', () => {
    test('should record response time metric', async () => {
      const metric: PerformanceMetric = {
        type: MetricType.RESPONSE_TIME,
        value: 150,
        timestamp: new Date(),
        service: 'cvplus-api',
        endpoint: '/api/cv/analyze',
        metadata: {
          userId: 'user123',
          requestId: 'req456'
        }
      };

      await expect(
        performanceMonitor.recordMetric(metric)
      ).resolves.not.toThrow();
    });

    test('should record throughput metric', async () => {
      const metric: PerformanceMetric = {
        type: MetricType.THROUGHPUT,
        value: 1000,
        timestamp: new Date(),
        service: 'cvplus-functions',
        endpoint: '/functions/processCV',
        metadata: {
          requestsPerMinute: 1000
        }
      };

      await expect(
        performanceMonitor.recordMetric(metric)
      ).resolves.not.toThrow();
    });

    test('should record error rate metric', async () => {
      const metric: PerformanceMetric = {
        type: MetricType.ERROR_RATE,
        value: 2.5,
        timestamp: new Date(),
        service: 'cvplus-payment',
        endpoint: '/payment/process',
        metadata: {
          errorCount: 25,
          totalRequests: 1000
        }
      };

      await expect(
        performanceMonitor.recordMetric(metric)
      ).resolves.not.toThrow();
    });
  });

  describe('getMetrics', () => {
    test('should retrieve metrics for time range', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');

      const metrics = await performanceMonitor.getMetrics(
        MetricType.RESPONSE_TIME,
        'cvplus-api',
        startTime,
        endTime
      );

      expect(Array.isArray(metrics)).toBe(true);
    });

    test('should filter metrics by service', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');

      const metrics = await performanceMonitor.getMetrics(
        MetricType.THROUGHPUT,
        'cvplus-functions',
        startTime,
        endTime
      );

      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('generateSLAReport', () => {
    test('should generate SLA report for service', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');

      const report = await performanceMonitor.generateSLAReport(
        'cvplus-api',
        startTime,
        endTime
      );

      expect(report).toHaveProperty('service');
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('slaTargets');
      expect(report).toHaveProperty('actualMetrics');
      expect(report).toHaveProperty('compliance');
      expect(report).toHaveProperty('violations');

      expect(report.service).toBe('cvplus-api');
      expect(report.slaTargets.availability).toBe(99.99);
      expect(report.slaTargets.responseTime).toBe(500);
      expect(report.slaTargets.errorRate).toBe(0.1);
    });

    test('should calculate accurate compliance percentages', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');

      const report = await performanceMonitor.generateSLAReport(
        'cvplus-payment',
        startTime,
        endTime
      );

      expect(report.compliance.availability).toBeGreaterThanOrEqual(0);
      expect(report.compliance.availability).toBeLessThanOrEqual(100);
      expect(report.compliance.responseTime).toBeGreaterThanOrEqual(0);
      expect(report.compliance.responseTime).toBeLessThanOrEqual(100);
      expect(report.compliance.errorRate).toBeGreaterThanOrEqual(0);
      expect(report.compliance.errorRate).toBeLessThanOrEqual(100);
    });
  });

  describe('checkSLACompliance', () => {
    test('should return compliant status for good metrics', async () => {
      const goodMetrics = [
        {
          type: MetricType.RESPONSE_TIME,
          value: 200, // Under 500ms target
          timestamp: new Date(),
          service: 'cvplus-api',
          endpoint: '/api/cv/analyze'
        },
        {
          type: MetricType.ERROR_RATE,
          value: 0.05, // Under 0.1% target
          timestamp: new Date(),
          service: 'cvplus-api',
          endpoint: '/api/cv/analyze'
        }
      ];

      for (const metric of goodMetrics) {
        await performanceMonitor.recordMetric(metric);
      }

      const compliance = await performanceMonitor.checkSLACompliance('cvplus-api');

      expect(compliance.status).toBe(SLAStatus.COMPLIANT);
      expect(compliance.violations).toHaveLength(0);
    });

    test('should return violation status for poor metrics', async () => {
      const poorMetrics = [
        {
          type: MetricType.RESPONSE_TIME,
          value: 2000, // Over 500ms target
          timestamp: new Date(),
          service: 'cvplus-slow',
          endpoint: '/api/slow-endpoint'
        },
        {
          type: MetricType.ERROR_RATE,
          value: 5.0, // Over 0.1% target
          timestamp: new Date(),
          service: 'cvplus-slow',
          endpoint: '/api/slow-endpoint'
        }
      ];

      for (const metric of poorMetrics) {
        await performanceMonitor.recordMetric(metric);
      }

      const compliance = await performanceMonitor.checkSLACompliance('cvplus-slow');

      expect(compliance.status).toBe(SLAStatus.VIOLATION);
      expect(compliance.violations.length).toBeGreaterThan(0);
    });
  });

  describe('alerting system', () => {
    test('should trigger critical alert for high response time', async () => {
      const criticalMetric: PerformanceMetric = {
        type: MetricType.RESPONSE_TIME,
        value: 5000, // 5 seconds - critical
        timestamp: new Date(),
        service: 'cvplus-api',
        endpoint: '/api/cv/analyze'
      };

      const alerts = await performanceMonitor.checkAlerts([criticalMetric]);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe(AlertSeverity.CRITICAL);
      expect(alerts[0].message).toContain('Response time exceeded critical threshold');
    });

    test('should trigger warning alert for elevated error rate', async () => {
      const warningMetric: PerformanceMetric = {
        type: MetricType.ERROR_RATE,
        value: 2.0, // 2% - warning level
        timestamp: new Date(),
        service: 'cvplus-payment',
        endpoint: '/payment/process'
      };

      const alerts = await performanceMonitor.checkAlerts([warningMetric]);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe(AlertSeverity.WARNING);
      expect(alerts[0].message).toContain('Error rate above warning threshold');
    });

    test('should trigger info alert for high CPU usage', async () => {
      const infoMetric: PerformanceMetric = {
        type: MetricType.CPU_USAGE,
        value: 75, // 75% - info level
        timestamp: new Date(),
        service: 'cvplus-functions',
        endpoint: '/functions/processCV'
      };

      const alerts = await performanceMonitor.checkAlerts([infoMetric]);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe(AlertSeverity.INFO);
      expect(alerts[0].message).toContain('CPU usage elevated');
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status', async () => {
      const health = await performanceMonitor.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('PerformanceMonitor');
      expect(health.version).toBe('1.0.0');
      expect(health.details).toHaveProperty('metricsCollection');
      expect(health.details).toHaveProperty('alerting');
      expect(health.details).toHaveProperty('slaTracking');
    });
  });

  describe('error handling', () => {
    test('should handle invalid metric types', async () => {
      const invalidMetric = {
        type: 'INVALID_TYPE',
        value: 100,
        timestamp: new Date(),
        service: 'test-service',
        endpoint: '/test'
      } as any;

      await expect(
        performanceMonitor.recordMetric(invalidMetric)
      ).rejects.toThrow('Invalid metric type');
    });

    test('should handle negative metric values appropriately', async () => {
      const negativeMetric: PerformanceMetric = {
        type: MetricType.RESPONSE_TIME,
        value: -100,
        timestamp: new Date(),
        service: 'test-service',
        endpoint: '/test'
      };

      await expect(
        performanceMonitor.recordMetric(negativeMetric)
      ).rejects.toThrow('Invalid metric value');
    });

    test('should handle invalid date ranges', async () => {
      const endTime = new Date('2024-01-01');
      const startTime = new Date('2024-01-31'); // Start after end

      await expect(
        performanceMonitor.getMetrics(
          MetricType.RESPONSE_TIME,
          'test-service',
          startTime,
          endTime
        )
      ).rejects.toThrow('Invalid date range');
    });
  });

  describe('performance aggregation', () => {
    test('should calculate accurate averages', async () => {
      const metrics = [
        {
          type: MetricType.RESPONSE_TIME,
          value: 100,
          timestamp: new Date(),
          service: 'test-service',
          endpoint: '/test'
        },
        {
          type: MetricType.RESPONSE_TIME,
          value: 200,
          timestamp: new Date(),
          service: 'test-service',
          endpoint: '/test'
        },
        {
          type: MetricType.RESPONSE_TIME,
          value: 300,
          timestamp: new Date(),
          service: 'test-service',
          endpoint: '/test'
        }
      ];

      const average = await performanceMonitor.calculateAverage(metrics);

      expect(average).toBe(200);
    });

    test('should calculate accurate percentiles', async () => {
      const values = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550];

      const p50 = await performanceMonitor.calculatePercentile(values, 50);
      const p95 = await performanceMonitor.calculatePercentile(values, 95);
      const p99 = await performanceMonitor.calculatePercentile(values, 99);

      expect(p50).toBeGreaterThan(200);
      expect(p50).toBeLessThan(400);
      expect(p95).toBeGreaterThan(p50);
      expect(p99).toBeGreaterThan(p95);
    });
  });
});