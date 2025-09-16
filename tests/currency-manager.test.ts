/**
 * CVPlus Premium Global Payment Infrastructure Tests
 * Currency Manager Service Tests
 *
 * @author Gil Klainert
 * @version 4.0.0
 * @category Payment Infrastructure Testing
  */

import { CurrencyManager, SupportedCurrency, CurrencyConversion } from '../currency-manager';

// Mock external API calls
jest.mock('axios', () => ({
  get: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn()
  }))
}));

describe('CurrencyManager', () => {
  let currencyManager: CurrencyManager;
  const mockConfig = {
    name: 'CurrencyManager',
    version: '1.0.0',
    enabled: true
  };

  beforeEach(() => {
    currencyManager = new CurrencyManager(mockConfig);
    jest.clearAllMocks();
  });

  describe('getSupportedCurrencies', () => {
    test('should return all supported currencies', () => {
      const currencies = currencyManager.getSupportedCurrencies();

      expect(currencies).toHaveLength(17);
      expect(currencies).toContain(SupportedCurrency.USD);
      expect(currencies).toContain(SupportedCurrency.EUR);
      expect(currencies).toContain(SupportedCurrency.GBP);
    });
  });

  describe('convertCurrency', () => {
    test('should convert currency successfully', async () => {
      const mockConversion: CurrencyConversion = {
        fromCurrency: SupportedCurrency.USD,
        toCurrency: SupportedCurrency.EUR,
        amount: 100,
        convertedAmount: 85,
        exchangeRate: 0.85,
        fees: 0,
        timestamp: new Date()
      };

      // Mock exchange rate API response
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          rates: {
            EUR: 0.85
          }
        }
      });

      const result = await currencyManager.convertCurrency(
        100,
        SupportedCurrency.USD,
        SupportedCurrency.EUR
      );

      expect(result.fromCurrency).toBe(SupportedCurrency.USD);
      expect(result.toCurrency).toBe(SupportedCurrency.EUR);
      expect(result.amount).toBe(100);
      expect(result.convertedAmount).toBeCloseTo(85, 2);
      expect(result.exchangeRate).toBeCloseTo(0.85, 4);
    });

    test('should handle same currency conversion', async () => {
      const result = await currencyManager.convertCurrency(
        100,
        SupportedCurrency.USD,
        SupportedCurrency.USD
      );

      expect(result.fromCurrency).toBe(SupportedCurrency.USD);
      expect(result.toCurrency).toBe(SupportedCurrency.USD);
      expect(result.amount).toBe(100);
      expect(result.convertedAmount).toBe(100);
      expect(result.exchangeRate).toBe(1);
    });

    test('should apply fees when requested', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          rates: {
            EUR: 0.85
          }
        }
      });

      const result = await currencyManager.convertCurrency(
        100,
        SupportedCurrency.USD,
        SupportedCurrency.EUR,
        true
      );

      expect(result.fees).toBeGreaterThan(0);
      expect(result.convertedAmount).toBeLessThan(85); // After fees
    });
  });

  describe('calculateLocalizedPrice', () => {
    test('should calculate localized pricing for supported region', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          rates: {
            EUR: 0.85
          }
        }
      });

      const result = await currencyManager.calculateLocalizedPrice(
        100,
        SupportedCurrency.USD,
        'DE'
      );

      expect(result.currency).toBe(SupportedCurrency.EUR);
      expect(result.price).toBeGreaterThan(0);
      expect(result.adjustmentReason).toContain('Purchasing power');
    });

    test('should handle unsupported region gracefully', async () => {
      const result = await currencyManager.calculateLocalizedPrice(
        100,
        SupportedCurrency.USD,
        'ZZ' // Unsupported country code
      );

      expect(result.currency).toBe(SupportedCurrency.USD);
      expect(result.price).toBe(100);
      expect(result.adjustmentReason).toBe('No regional data available');
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status when service is operational', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          rates: {
            EUR: 0.85
          }
        }
      });

      const health = await currencyManager.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('CurrencyManager');
      expect(health.version).toBe('1.0.0');
      expect(health.details).toHaveProperty('exchangeRateProvider');
    });

    test('should return degraded status when external service fails', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('API unavailable'));

      const health = await currencyManager.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.details.exchangeRateProvider).toBe('unavailable');
    });
  });

  describe('error handling', () => {
    test('should handle invalid currency codes', async () => {
      await expect(
        currencyManager.convertCurrency(
          100,
          'INVALID' as SupportedCurrency,
          SupportedCurrency.USD
        )
      ).rejects.toThrow('Unsupported currency');
    });

    test('should handle network errors gracefully', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        currencyManager.convertCurrency(
          100,
          SupportedCurrency.USD,
          SupportedCurrency.EUR
        )
      ).rejects.toThrow('Failed to fetch exchange rates');
    });

    test('should handle negative amounts', async () => {
      await expect(
        currencyManager.convertCurrency(
          -100,
          SupportedCurrency.USD,
          SupportedCurrency.EUR
        )
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('caching', () => {
    test('should cache exchange rates', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          rates: {
            EUR: 0.85
          }
        }
      });

      // First call
      await currencyManager.convertCurrency(
        100,
        SupportedCurrency.USD,
        SupportedCurrency.EUR
      );

      // Second call should use cache
      await currencyManager.convertCurrency(
        200,
        SupportedCurrency.USD,
        SupportedCurrency.EUR
      );

      // Should only make one API call due to caching
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });
});