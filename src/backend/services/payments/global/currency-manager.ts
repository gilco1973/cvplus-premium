/**
 * CVPlus Premium Global Payment Infrastructure
 * Multi-Currency Management Service
 *
 * Handles currency conversion, regional pricing, and exchange rate management
 * for global payment processing across 15+ supported currencies.
 *
 * @author Gil Klainert
 * @version 1.0.0
 * @category Global Payments
 */

import { logger } from 'firebase-functions/v2';
import { BaseService } from '../../shared/base-service';

export enum SupportedCurrency {
  // Major Currencies
  USD = 'USD', // US Dollar
  EUR = 'EUR', // Euro
  GBP = 'GBP', // British Pound
  JPY = 'JPY', // Japanese Yen
  CAD = 'CAD', // Canadian Dollar
  AUD = 'AUD', // Australian Dollar
  CHF = 'CHF', // Swiss Franc

  // Regional Currencies
  SEK = 'SEK', // Swedish Krona
  NOK = 'NOK', // Norwegian Krone
  DKK = 'DKK', // Danish Krone
  PLN = 'PLN', // Polish Zloty
  CZK = 'CZK', // Czech Koruna

  // Asia-Pacific
  SGD = 'SGD', // Singapore Dollar
  HKD = 'HKD', // Hong Kong Dollar
  NZD = 'NZD', // New Zealand Dollar

  // Latin America
  MXN = 'MXN', // Mexican Peso
  BRL = 'BRL', // Brazilian Real
}

export interface CurrencyRate {
  currency: SupportedCurrency;
  rate: number;
  lastUpdated: Date;
  source: 'stripe' | 'paypal' | 'xe' | 'fixer';
  confidence: number; // 0-1 confidence score
}

export interface RegionalPricing {
  region: string;
  currency: SupportedCurrency;
  basePrice: number;
  adjustedPrice: number;
  purchasingPowerFactor: number;
  taxRate: number;
  popularPaymentMethods: string[];
}

export interface CurrencyConversion {
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  amount: number;
  convertedAmount: number;
  exchangeRate: number;
  fees: number;
  timestamp: Date;
}

/**
 * Currency Manager for global payment processing
 * Handles exchange rates, regional pricing, and currency conversions
 */
export class CurrencyManager extends BaseService {
  private exchangeRates = new Map<string, CurrencyRate>();
  private regionalPricing = new Map<string, RegionalPricing>();
  private readonly baseCurrency = SupportedCurrency.USD;
  private readonly updateInterval = 1000 * 60 * 60; // 1 hour
  private lastUpdateTime = 0;

  constructor(config: any) {
    super({
      name: 'CurrencyManager',
      version: '1.0.0',
      enabled: true,
      ...config
    });

    this.initializeRegionalPricing();
    this.scheduleRateUpdates();
  }

  /**
   * Initialize regional pricing configurations
   */
  private initializeRegionalPricing(): void {
    const regions: RegionalPricing[] = [
      // North America
      {
        region: 'US',
        currency: SupportedCurrency.USD,
        basePrice: 29,
        adjustedPrice: 29,
        purchasingPowerFactor: 1.0,
        taxRate: 0.08,
        popularPaymentMethods: ['card', 'paypal', 'apple_pay', 'google_pay']
      },
      {
        region: 'CA',
        currency: SupportedCurrency.CAD,
        basePrice: 29,
        adjustedPrice: 38,
        purchasingPowerFactor: 0.95,
        taxRate: 0.13,
        popularPaymentMethods: ['card', 'paypal', 'interac']
      },

      // Europe
      {
        region: 'GB',
        currency: SupportedCurrency.GBP,
        basePrice: 29,
        adjustedPrice: 23,
        purchasingPowerFactor: 1.05,
        taxRate: 0.20,
        popularPaymentMethods: ['card', 'paypal', 'bacs_debit']
      },
      {
        region: 'DE',
        currency: SupportedCurrency.EUR,
        basePrice: 29,
        adjustedPrice: 25,
        purchasingPowerFactor: 1.02,
        taxRate: 0.19,
        popularPaymentMethods: ['card', 'sepa_debit', 'sofort', 'giropay']
      },
      {
        region: 'NL',
        currency: SupportedCurrency.EUR,
        basePrice: 29,
        adjustedPrice: 25,
        purchasingPowerFactor: 1.08,
        taxRate: 0.21,
        popularPaymentMethods: ['card', 'ideal', 'sepa_debit']
      },
      {
        region: 'BE',
        currency: SupportedCurrency.EUR,
        basePrice: 29,
        adjustedPrice: 25,
        purchasingPowerFactor: 1.03,
        taxRate: 0.21,
        popularPaymentMethods: ['card', 'bancontact', 'sepa_debit']
      },

      // Asia-Pacific
      {
        region: 'JP',
        currency: SupportedCurrency.JPY,
        basePrice: 29,
        adjustedPrice: 3200,
        purchasingPowerFactor: 0.98,
        taxRate: 0.10,
        popularPaymentMethods: ['card', 'konbini', 'bank_transfer']
      },
      {
        region: 'AU',
        currency: SupportedCurrency.AUD,
        basePrice: 29,
        adjustedPrice: 42,
        purchasingPowerFactor: 0.92,
        taxRate: 0.10,
        popularPaymentMethods: ['card', 'paypal', 'becs_debit']
      },

      // Nordics
      {
        region: 'SE',
        currency: SupportedCurrency.SEK,
        basePrice: 29,
        adjustedPrice: 280,
        purchasingPowerFactor: 1.01,
        taxRate: 0.25,
        popularPaymentMethods: ['card', 'klarna', 'swish']
      }
    ];

    regions.forEach(region => {
      this.regionalPricing.set(region.region, region);
    });

    logger.info(`Initialized regional pricing for ${regions.length} regions`, {
      regions: regions.map(r => r.region),
      currencies: [...new Set(regions.map(r => r.currency))]
    });
  }

  /**
   * Get current exchange rate for currency pair
   */
  async getExchangeRate(
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency
  ): Promise<number> {
    if (fromCurrency === toCurrency) return 1.0;

    await this.ensureRatesUpdated();

    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = this.exchangeRates.get(rateKey);

    if (!rate) {
      // Calculate via base currency if direct rate not available
      const fromRate = this.exchangeRates.get(`${this.baseCurrency}_${fromCurrency}`)?.rate || 1;
      const toRate = this.exchangeRates.get(`${this.baseCurrency}_${toCurrency}`)?.rate || 1;
      return toRate / fromRate;
    }

    return rate.rate;
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency,
    includeFees: boolean = false
  ): Promise<CurrencyConversion> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate;

    // Calculate conversion fees (typically 0.5-2%)
    const feeRate = includeFees ? 0.015 : 0; // 1.5% fee
    const fees = convertedAmount * feeRate;

    const conversion: CurrencyConversion = {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount: convertedAmount - fees,
      exchangeRate,
      fees,
      timestamp: new Date()
    };

    logger.info('Currency conversion performed', {
      conversion,
      includeFees
    });

    return conversion;
  }

  /**
   * Get regional pricing for a specific region
   */
  getRegionalPricing(region: string): RegionalPricing | null {
    return this.regionalPricing.get(region) || null;
  }

  /**
   * Calculate localized price based on region and purchasing power
   */
  async calculateLocalizedPrice(
    basePrice: number,
    baseCurrency: SupportedCurrency,
    targetRegion: string
  ): Promise<{
    price: number;
    currency: SupportedCurrency;
    priceWithTax: number;
    taxAmount: number;
    adjustmentReason: string[];
  }> {
    const regionalData = this.getRegionalPricing(targetRegion);

    if (!regionalData) {
      // Default to US pricing
      return {
        price: basePrice,
        currency: baseCurrency,
        priceWithTax: basePrice * 1.08, // Default 8% tax
        taxAmount: basePrice * 0.08,
        adjustmentReason: ['default_pricing']
      };
    }

    // Convert base price to target currency
    const conversion = await this.convertCurrency(
      basePrice,
      baseCurrency,
      regionalData.currency
    );

    // Apply purchasing power adjustment
    const adjustedPrice = conversion.convertedAmount * regionalData.purchasingPowerFactor;

    // Calculate tax
    const taxAmount = adjustedPrice * regionalData.taxRate;
    const priceWithTax = adjustedPrice + taxAmount;

    const adjustmentReasons = [];
    if (regionalData.purchasingPowerFactor !== 1.0) {
      adjustmentReasons.push('purchasing_power_adjusted');
    }
    if (regionalData.taxRate > 0) {
      adjustmentReasons.push('tax_included');
    }

    return {
      price: Math.round(adjustedPrice * 100) / 100, // Round to 2 decimals
      currency: regionalData.currency,
      priceWithTax: Math.round(priceWithTax * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      adjustmentReason: adjustmentReasons
    };
  }

  /**
   * Get supported payment methods for a region
   */
  getSupportedPaymentMethods(region: string): string[] {
    const regionalData = this.getRegionalPricing(region);
    return regionalData?.popularPaymentMethods || ['card', 'paypal'];
  }

  /**
   * Update exchange rates from multiple sources
   */
  private async updateExchangeRates(): Promise<void> {
    try {
      logger.info('Updating exchange rates from external sources');

      // Simulate exchange rate updates (in production, would fetch from real APIs)
      const mockRates: CurrencyRate[] = [
        // USD base rates
        { currency: SupportedCurrency.EUR, rate: 0.85, lastUpdated: new Date(), source: 'stripe', confidence: 0.99 },
        { currency: SupportedCurrency.GBP, rate: 0.73, lastUpdated: new Date(), source: 'stripe', confidence: 0.99 },
        { currency: SupportedCurrency.JPY, rate: 110.25, lastUpdated: new Date(), source: 'stripe', confidence: 0.98 },
        { currency: SupportedCurrency.CAD, rate: 1.31, lastUpdated: new Date(), source: 'paypal', confidence: 0.99 },
        { currency: SupportedCurrency.AUD, rate: 1.45, lastUpdated: new Date(), source: 'paypal', confidence: 0.97 },
        { currency: SupportedCurrency.CHF, rate: 0.92, lastUpdated: new Date(), source: 'xe', confidence: 0.98 },
        { currency: SupportedCurrency.SEK, rate: 9.65, lastUpdated: new Date(), source: 'fixer', confidence: 0.96 },
        { currency: SupportedCurrency.NOK, rate: 8.75, lastUpdated: new Date(), source: 'fixer', confidence: 0.95 },
        { currency: SupportedCurrency.DKK, rate: 6.34, lastUpdated: new Date(), source: 'fixer', confidence: 0.96 },
        { currency: SupportedCurrency.SGD, rate: 1.35, lastUpdated: new Date(), source: 'stripe', confidence: 0.98 },
        { currency: SupportedCurrency.HKD, rate: 7.85, lastUpdated: new Date(), source: 'paypal', confidence: 0.97 },
        { currency: SupportedCurrency.MXN, rate: 20.15, lastUpdated: new Date(), source: 'xe', confidence: 0.94 },
        { currency: SupportedCurrency.BRL, rate: 5.23, lastUpdated: new Date(), source: 'fixer', confidence: 0.93 }
      ];

      // Store rates with USD as base
      mockRates.forEach(rate => {
        const rateKey = `${this.baseCurrency}_${rate.currency}`;
        this.exchangeRates.set(rateKey, rate);

        // Also store reverse rate
        const reverseRateKey = `${rate.currency}_${this.baseCurrency}`;
        this.exchangeRates.set(reverseRateKey, {
          ...rate,
          rate: 1 / rate.rate
        });
      });

      this.lastUpdateTime = Date.now();

      logger.info(`Updated exchange rates for ${mockRates.length} currencies`, {
        baseCurrency: this.baseCurrency,
        currencies: mockRates.map(r => r.currency),
        sources: [...new Set(mockRates.map(r => r.source))]
      });

    } catch (error) {
      logger.error('Failed to update exchange rates', { error });
      throw error;
    }
  }

  /**
   * Ensure exchange rates are up to date
   */
  private async ensureRatesUpdated(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdateTime > this.updateInterval) {
      await this.updateExchangeRates();
    }
  }

  /**
   * Schedule periodic rate updates
   */
  private scheduleRateUpdates(): void {
    // Initial update
    this.updateExchangeRates().catch(error => {
      logger.error('Initial exchange rate update failed', { error });
    });

    // Schedule periodic updates
    setInterval(() => {
      this.updateExchangeRates().catch(error => {
        logger.error('Scheduled exchange rate update failed', { error });
      });
    }, this.updateInterval);

    logger.info('Scheduled exchange rate updates', {
      intervalMinutes: this.updateInterval / (1000 * 60)
    });
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): SupportedCurrency[] {
    return Object.values(SupportedCurrency);
  }

  /**
   * Validate if currency is supported
   */
  isCurrencySupported(currency: string): boolean {
    return Object.values(SupportedCurrency).includes(currency as SupportedCurrency);
  }

  /**
   * Health check for currency manager
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const now = Date.now();
    const rateAge = now - this.lastUpdateTime;
    const isStale = rateAge > this.updateInterval * 2; // 2x update interval

    return {
      status: isStale ? 'degraded' : 'healthy',
      details: {
        supportedCurrencies: this.getSupportedCurrencies().length,
        supportedRegions: this.regionalPricing.size,
        exchangeRatesCount: this.exchangeRates.size,
        lastUpdateAge: rateAge,
        isStale,
        baseCurrency: this.baseCurrency
      }
    };
  }
}