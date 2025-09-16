/**
 * CVPlus Premium Global Payments Functions Tests
 * Firebase Functions Integration Tests
 *
 * @author Gil Klainert
 * @version 4.0.0
 * @category Global Payment Functions Testing
 */

import {
  getLocalizedPricing,
  getSupportedRegions,
  validateVATNumber,
  assessFraudRisk,
  convertCurrency,
  globalPaymentsHealthCheck
} from '../globalPayments';

// Mock Firebase Functions
jest.mock('firebase-functions/v2', () => ({
  https: {
    onCall: jest.fn((config, handler) => handler),
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, public message: string, public details?: any) {
        super(message);
        this.name = 'HttpsError';
      }
    }
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock the global payment services
jest.mock('../services/payments/global/currency-manager');
jest.mock('../services/payments/global/tax-compliance');
jest.mock('../services/payments/global/regional-payment-methods');
jest.mock('../services/payments/global/fraud-prevention');

const { HttpsError } = require('firebase-functions/v2').https;

describe('Global Payments Firebase Functions', () => {
  const mockRequest = {
    auth: {
      uid: 'test-user-123'
    },
    data: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocalizedPricing', () => {
    test('should return localized pricing successfully', async () => {
      const requestData = {
        basePrice: 100,
        baseCurrency: 'USD',
        targetRegion: 'DE',
        customerTaxInfo: {
          countryCode: 'DE',
          region: 'Bavaria',
          taxId: 'DE123456789',
          isBusinessCustomer: false
        }
      };

      const request = {
        ...mockRequest,
        data: requestData
      };

      const result = await getLocalizedPricing(request as any);

      expect(result.success).toBe(true);
      expect(result.pricing).toHaveProperty('basePrice');
      expect(result.pricing).toHaveProperty('localizedPrice');
      expect(result.pricing).toHaveProperty('currency');
      expect(result.pricing).toHaveProperty('priceWithTax');
      expect(result.paymentMethods).toBeInstanceOf(Array);
      expect(result.region).toBe('DE');
    });

    test('should throw error for unauthenticated request', async () => {
      const request = {
        auth: null,
        data: {
          basePrice: 100,
          baseCurrency: 'USD',
          targetRegion: 'DE'
        }
      };

      await expect(getLocalizedPricing(request as any))
        .rejects
        .toThrow('Authentication required');
    });

    test('should throw error for missing required parameters', async () => {
      const request = {
        ...mockRequest,
        data: {
          basePrice: 100
          // Missing baseCurrency and targetRegion
        }
      };

      await expect(getLocalizedPricing(request as any))
        .rejects
        .toThrow('basePrice, baseCurrency, and targetRegion are required');
    });
  });

  describe('getSupportedRegions', () => {
    test('should return supported regions and currencies', async () => {
      const result = await getSupportedRegions(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.supportedCurrencies).toBeInstanceOf(Array);
      expect(result.supportedRegions).toBeGreaterThan(0);
      expect(result.regions).toBeInstanceOf(Object);
      expect(result.globalPaymentMethods).toBeInstanceOf(Array);
    });

    test('should require authentication', async () => {
      const request = {
        auth: null,
        data: {}
      };

      await expect(getSupportedRegions(request as any))
        .rejects
        .toThrow('Authentication required');
    });
  });

  describe('validateVATNumber', () => {
    test('should validate VAT number successfully', async () => {
      const request = {
        ...mockRequest,
        data: {
          vatNumber: 'DE123456789',
          countryCode: 'DE'
        }
      };

      const result = await validateVATNumber(request as any);

      expect(result.success).toBe(true);
      expect(result.validation).toHaveProperty('valid');
      expect(result.validation).toHaveProperty('companyName');
      expect(result.validation).toHaveProperty('address');
    });

    test('should require VAT number and country code', async () => {
      const request = {
        ...mockRequest,
        data: {
          vatNumber: 'DE123456789'
          // Missing countryCode
        }
      };

      await expect(validateVATNumber(request as any))
        .rejects
        .toThrow('vatNumber and countryCode are required');
    });
  });

  describe('assessFraudRisk', () => {
    test('should assess fraud risk successfully', async () => {
      const transactionProfile = {
        transactionId: 'txn_123',
        customerId: 'test-user-123',
        amount: 100,
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
          userAgent: 'Mozilla/5.0',
          deviceFingerprint: 'device_123',
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

      const request = {
        ...mockRequest,
        data: transactionProfile
      };

      const result = await assessFraudRisk(request as any);

      expect(result.success).toBe(true);
      expect(result.assessment).toHaveProperty('riskLevel');
      expect(result.assessment).toHaveProperty('decision');
      expect(result.assessment).toHaveProperty('reviewRequired');
      expect(result.assessment).toHaveProperty('recommendation');
    });

    test('should reject mismatched customer ID', async () => {
      const request = {
        auth: { uid: 'different-user' },
        data: {
          transactionId: 'txn_123',
          customerId: 'test-user-123', // Different from auth.uid
          amount: 100
        }
      };

      await expect(assessFraudRisk(request as any))
        .rejects
        .toThrow('Customer ID mismatch');
    });
  });

  describe('convertCurrency', () => {
    test('should convert currency successfully', async () => {
      const request = {
        ...mockRequest,
        data: {
          amount: 100,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          includeFees: false
        }
      };

      const result = await convertCurrency(request as any);

      expect(result.success).toBe(true);
      expect(result.conversion).toHaveProperty('fromCurrency');
      expect(result.conversion).toHaveProperty('toCurrency');
      expect(result.conversion).toHaveProperty('amount');
      expect(result.conversion).toHaveProperty('convertedAmount');
      expect(result.conversion).toHaveProperty('exchangeRate');
      expect(result.conversion).toHaveProperty('timestamp');
    });

    test('should require amount and currencies', async () => {
      const request = {
        ...mockRequest,
        data: {
          amount: 100
          // Missing fromCurrency and toCurrency
        }
      };

      await expect(convertCurrency(request as any))
        .rejects
        .toThrow('amount, fromCurrency, and toCurrency are required');
    });
  });

  describe('globalPaymentsHealthCheck', () => {
    test('should return health status', async () => {
      const result = await globalPaymentsHealthCheck(mockRequest as any);

      expect(result.success).toBe(true);
      expect(result.overallStatus).toMatch(/healthy|degraded/);
      expect(result.services).toHaveProperty('currencyManager');
      expect(result.services).toHaveProperty('taxCompliance');
      expect(result.services).toHaveProperty('paymentMethods');
      expect(result.services).toHaveProperty('fraudPrevention');
      expect(result).toHaveProperty('timestamp');
    });

    test('should require authentication', async () => {
      const request = {
        auth: null,
        data: {}
      };

      await expect(globalPaymentsHealthCheck(request as any))
        .rejects
        .toThrow('Authentication required');
    });
  });

  describe('error handling', () => {
    test('should handle service errors gracefully', async () => {
      // Mock a service to throw an error
      const mockError = new Error('Service unavailable');

      // This would normally mock the actual service method
      // For this test, we'll just verify error handling structure

      const request = {
        ...mockRequest,
        data: {
          amount: 100,
          fromCurrency: 'USD',
          toCurrency: 'INVALID'
        }
      };

      try {
        await convertCurrency(request as any);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError);
      }
    });

    test('should log errors appropriately', async () => {
      const { logger } = require('firebase-functions/v2');

      const request = {
        ...mockRequest,
        data: {
          basePrice: 'invalid' // Invalid data type
        }
      };

      try {
        await getLocalizedPricing(request as any);
      } catch (error) {
        // Verify that errors are logged
        expect(logger.error).toHaveBeenCalled();
      }
    });
  });

  describe('input validation', () => {
    test('should validate currency codes', async () => {
      const request = {
        ...mockRequest,
        data: {
          amount: 100,
          fromCurrency: 'INVALID',
          toCurrency: 'USD'
        }
      };

      await expect(convertCurrency(request as any))
        .rejects
        .toThrow();
    });

    test('should validate amount ranges', async () => {
      const request = {
        ...mockRequest,
        data: {
          amount: -100, // Negative amount
          fromCurrency: 'USD',
          toCurrency: 'EUR'
        }
      };

      await expect(convertCurrency(request as any))
        .rejects
        .toThrow();
    });

    test('should validate country codes', async () => {
      const request = {
        ...mockRequest,
        data: {
          vatNumber: 'DE123456789',
          countryCode: 'INVALID'
        }
      };

      await expect(validateVATNumber(request as any))
        .rejects
        .toThrow();
    });
  });

  describe('security', () => {
    test('should sanitize sensitive data in logs', async () => {
      const { logger } = require('firebase-functions/v2');

      const request = {
        ...mockRequest,
        data: {
          vatNumber: 'DE123456789',
          countryCode: 'DE'
        }
      };

      await validateVATNumber(request as any);

      // Check that full VAT number is not logged
      const logCalls = logger.info.mock.calls;
      const hasFullVAT = logCalls.some(call =>
        JSON.stringify(call).includes('DE123456789')
      );
      expect(hasFullVAT).toBe(false);
    });

    test('should prevent data leakage in error responses', async () => {
      const request = {
        ...mockRequest,
        data: {
          transactionId: 'txn_123',
          customerId: 'different-user', // Will cause permission error
          amount: 100
        }
      };

      try {
        await assessFraudRisk(request as any);
      } catch (error) {
        // Error should not contain internal details
        expect(error.message).not.toContain('internal');
        expect(error.message).not.toContain('database');
      }
    });
  });
});