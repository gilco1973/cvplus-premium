/**
 * CVPlus Premium Global Payment Infrastructure
 * Regional Payment Methods Service
 *
 * Handles region-specific payment methods like SEPA, iDEAL, Bancontact,
 * and other local payment solutions for global customer coverage.
 *
 * @author Gil Klainert
 * @version 1.0.0
 * @category Global Payments
 */

import { logger } from 'firebase-functions/v2';
import { BaseService } from '../../shared/base-service';
import { SupportedCurrency } from './currency-manager';

export enum RegionalPaymentMethod {
  // European Methods
  SEPA_DEBIT = 'sepa_debit',
  IDEAL = 'ideal',
  BANCONTACT = 'bancontact',
  SOFORT = 'sofort',
  GIROPAY = 'giropay',
  EPS = 'eps',
  P24 = 'p24',
  MULTIBANCO = 'multibanco',

  // UK Methods
  BACS_DEBIT = 'bacs_debit',

  // Nordic Methods
  KLARNA = 'klarna',
  SWISH = 'swish',

  // North America
  INTERAC = 'interac',
  ACH = 'ach',

  // Asia-Pacific
  BECS_DEBIT = 'becs_debit',
  KONBINI = 'konbini',

  // Universal Methods
  CARD = 'card',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay'
}

export interface PaymentMethodConfig {
  method: RegionalPaymentMethod;
  displayName: string;
  description: string;
  supportedCurrencies: SupportedCurrency[];
  supportedCountries: string[];
  processingTime: string; // e.g., "instant", "1-3 days"
  fees: {
    fixed?: number;      // Fixed fee in cents
    percentage?: number; // Percentage fee
  };
  requirements: {
    customerVerification?: boolean;
    bankAccount?: boolean;
    address?: boolean;
  };
  provider: 'stripe' | 'paypal' | 'adyen';
  enabled: boolean;
  popularity: number; // 1-10 scale
}

export interface PaymentMethodAvailability {
  region: string;
  availableMethods: RegionalPaymentMethod[];
  recommendedMethod: RegionalPaymentMethod;
  localPreferences: {
    method: RegionalPaymentMethod;
    marketShare: number;
  }[];
}

export interface PaymentMethodValidation {
  method: RegionalPaymentMethod;
  valid: boolean;
  requirements: {
    name: string;
    required: boolean;
    satisfied: boolean;
    description: string;
  }[];
  estimatedCompletionTime: string;
  fees: {
    amount: number;
    currency: SupportedCurrency;
    description: string;
  };
}

/**
 * Regional Payment Methods Service
 * Manages availability and configuration of region-specific payment methods
 */
export class RegionalPaymentMethodsService extends BaseService {
  private paymentMethods = new Map<RegionalPaymentMethod, PaymentMethodConfig>();
  private regionalAvailability = new Map<string, PaymentMethodAvailability>();

  constructor(config: any) {
    super({
      name: 'RegionalPaymentMethodsService',
      version: '1.0.0',
      enabled: true,
      ...config
    });

    this.initializePaymentMethods();
    this.initializeRegionalAvailability();
  }

  /**
   * Initialize payment method configurations
   */
  private initializePaymentMethods(): void {
    const methods: PaymentMethodConfig[] = [
      // Universal Payment Methods
      {
        method: RegionalPaymentMethod.CARD,
        displayName: 'Credit/Debit Card',
        description: 'Visa, Mastercard, American Express, and other major cards',
        supportedCurrencies: Object.values(SupportedCurrency),
        supportedCountries: ['*'], // All countries
        processingTime: 'instant',
        fees: { percentage: 0.029, fixed: 30 }, // 2.9% + 30¢
        requirements: {},
        provider: 'stripe',
        enabled: true,
        popularity: 10
      },
      {
        method: RegionalPaymentMethod.PAYPAL,
        displayName: 'PayPal',
        description: 'Pay with your PayPal account',
        supportedCurrencies: Object.values(SupportedCurrency),
        supportedCountries: ['*'],
        processingTime: 'instant',
        fees: { percentage: 0.034, fixed: 0 }, // 3.4%
        requirements: {},
        provider: 'paypal',
        enabled: true,
        popularity: 9
      },

      // European Payment Methods
      {
        method: RegionalPaymentMethod.SEPA_DEBIT,
        displayName: 'SEPA Direct Debit',
        description: 'Direct debit from your European bank account',
        supportedCurrencies: [SupportedCurrency.EUR],
        supportedCountries: ['DE', 'FR', 'NL', 'BE', 'AT', 'IT', 'ES', 'PT'],
        processingTime: '1-3 business days',
        fees: { fixed: 35 }, // 0.35€
        requirements: {
          customerVerification: true,
          bankAccount: true,
          address: true
        },
        provider: 'stripe',
        enabled: true,
        popularity: 8
      },
      {
        method: RegionalPaymentMethod.IDEAL,
        displayName: 'iDEAL',
        description: 'Pay directly from your Dutch bank account',
        supportedCurrencies: [SupportedCurrency.EUR],
        supportedCountries: ['NL'],
        processingTime: 'instant',
        fees: { fixed: 29 }, // €0.29
        requirements: { bankAccount: true },
        provider: 'stripe',
        enabled: true,
        popularity: 10
      },
      {
        method: RegionalPaymentMethod.BANCONTACT,
        displayName: 'Bancontact',
        description: 'Belgium\'s most popular payment method',
        supportedCurrencies: [SupportedCurrency.EUR],
        supportedCountries: ['BE'],
        processingTime: 'instant',
        fees: { fixed: 29 }, // €0.29
        requirements: { bankAccount: true },
        provider: 'stripe',
        enabled: true,
        popularity: 10
      },
      {
        method: RegionalPaymentMethod.SOFORT,
        displayName: 'Sofort',
        description: 'Instant bank transfer for DACH region',
        supportedCurrencies: [SupportedCurrency.EUR],
        supportedCountries: ['DE', 'AT', 'CH', 'BE', 'NL'],
        processingTime: 'instant',
        fees: { percentage: 0.014 }, // 1.4%
        requirements: { bankAccount: true },
        provider: 'stripe',
        enabled: true,
        popularity: 8
      },
      {
        method: RegionalPaymentMethod.GIROPAY,
        displayName: 'Giropay',
        description: 'German online banking payment method',
        supportedCurrencies: [SupportedCurrency.EUR],
        supportedCountries: ['DE'],
        processingTime: 'instant',
        fees: { percentage: 0.014 }, // 1.4%
        requirements: { bankAccount: true },
        provider: 'stripe',
        enabled: true,
        popularity: 7
      },

      // UK Payment Methods
      {
        method: RegionalPaymentMethod.BACS_DEBIT,
        displayName: 'BACS Direct Debit',
        description: 'Direct debit from UK bank accounts',
        supportedCurrencies: [SupportedCurrency.GBP],
        supportedCountries: ['GB'],
        processingTime: '1-3 business days',
        fees: { fixed: 20 }, // 20p
        requirements: {
          customerVerification: true,
          bankAccount: true,
          address: true
        },
        provider: 'stripe',
        enabled: true,
        popularity: 8
      },

      // Nordic Payment Methods
      {
        method: RegionalPaymentMethod.KLARNA,
        displayName: 'Klarna',
        description: 'Buy now, pay later with Klarna',
        supportedCurrencies: [SupportedCurrency.SEK, SupportedCurrency.NOK, SupportedCurrency.DKK, SupportedCurrency.EUR],
        supportedCountries: ['SE', 'NO', 'DK', 'FI', 'DE', 'AT', 'NL'],
        processingTime: 'instant',
        fees: { percentage: 0.033 }, // 3.3%
        requirements: { customerVerification: true },
        provider: 'stripe',
        enabled: true,
        popularity: 9
      },

      // North American Methods
      {
        method: RegionalPaymentMethod.INTERAC,
        displayName: 'Interac',
        description: 'Canada\'s national debit network',
        supportedCurrencies: [SupportedCurrency.CAD],
        supportedCountries: ['CA'],
        processingTime: 'instant',
        fees: { fixed: 85 }, // CAD $0.85
        requirements: { bankAccount: true },
        provider: 'stripe',
        enabled: true,
        popularity: 9
      },
      {
        method: RegionalPaymentMethod.ACH,
        displayName: 'ACH Bank Transfer',
        description: 'Direct bank transfer in the United States',
        supportedCurrencies: [SupportedCurrency.USD],
        supportedCountries: ['US'],
        processingTime: '1-3 business days',
        fees: { fixed: 80 }, // $0.80
        requirements: {
          customerVerification: true,
          bankAccount: true
        },
        provider: 'stripe',
        enabled: true,
        popularity: 7
      },

      // Asia-Pacific Methods
      {
        method: RegionalPaymentMethod.BECS_DEBIT,
        displayName: 'BECS Direct Debit',
        description: 'Direct debit from Australian bank accounts',
        supportedCurrencies: [SupportedCurrency.AUD],
        supportedCountries: ['AU'],
        processingTime: '1-3 business days',
        fees: { fixed: 100 }, // AUD $1.00
        requirements: {
          customerVerification: true,
          bankAccount: true
        },
        provider: 'stripe',
        enabled: true,
        popularity: 8
      },
      {
        method: RegionalPaymentMethod.KONBINI,
        displayName: 'Konbini',
        description: 'Pay at Japanese convenience stores',
        supportedCurrencies: [SupportedCurrency.JPY],
        supportedCountries: ['JP'],
        processingTime: '1-3 days',
        fees: { fixed: 108 }, // ¥108
        requirements: {},
        provider: 'stripe',
        enabled: true,
        popularity: 8
      }
    ];

    methods.forEach(method => {
      this.paymentMethods.set(method.method, method);
    });

    logger.info('Initialized regional payment methods', {
      count: methods.length,
      providers: [...new Set(methods.map(m => m.provider))],
      currencies: [...new Set(methods.flatMap(m => m.supportedCurrencies))]
    });
  }

  /**
   * Initialize regional availability mappings
   */
  private initializeRegionalAvailability(): void {
    const availability: PaymentMethodAvailability[] = [
      // Netherlands
      {
        region: 'NL',
        availableMethods: [
          RegionalPaymentMethod.IDEAL,
          RegionalPaymentMethod.CARD,
          RegionalPaymentMethod.PAYPAL,
          RegionalPaymentMethod.SEPA_DEBIT
        ],
        recommendedMethod: RegionalPaymentMethod.IDEAL,
        localPreferences: [
          { method: RegionalPaymentMethod.IDEAL, marketShare: 0.65 },
          { method: RegionalPaymentMethod.CARD, marketShare: 0.25 },
          { method: RegionalPaymentMethod.PAYPAL, marketShare: 0.10 }
        ]
      },

      // Belgium
      {
        region: 'BE',
        availableMethods: [
          RegionalPaymentMethod.BANCONTACT,
          RegionalPaymentMethod.CARD,
          RegionalPaymentMethod.PAYPAL,
          RegionalPaymentMethod.SEPA_DEBIT
        ],
        recommendedMethod: RegionalPaymentMethod.BANCONTACT,
        localPreferences: [
          { method: RegionalPaymentMethod.BANCONTACT, marketShare: 0.60 },
          { method: RegionalPaymentMethod.CARD, marketShare: 0.30 },
          { method: RegionalPaymentMethod.PAYPAL, marketShare: 0.10 }
        ]
      },

      // Germany
      {
        region: 'DE',
        availableMethods: [
          RegionalPaymentMethod.SOFORT,
          RegionalPaymentMethod.GIROPAY,
          RegionalPaymentMethod.CARD,
          RegionalPaymentMethod.PAYPAL,
          RegionalPaymentMethod.SEPA_DEBIT,
          RegionalPaymentMethod.KLARNA
        ],
        recommendedMethod: RegionalPaymentMethod.SOFORT,
        localPreferences: [
          { method: RegionalPaymentMethod.SOFORT, marketShare: 0.30 },
          { method: RegionalPaymentMethod.CARD, marketShare: 0.25 },
          { method: RegionalPaymentMethod.PAYPAL, marketShare: 0.20 },
          { method: RegionalPaymentMethod.SEPA_DEBIT, marketShare: 0.15 },
          { method: RegionalPaymentMethod.GIROPAY, marketShare: 0.10 }
        ]
      },

      // United Kingdom
      {
        region: 'GB',
        availableMethods: [
          RegionalPaymentMethod.CARD,
          RegionalPaymentMethod.PAYPAL,
          RegionalPaymentMethod.BACS_DEBIT
        ],
        recommendedMethod: RegionalPaymentMethod.CARD,
        localPreferences: [
          { method: RegionalPaymentMethod.CARD, marketShare: 0.70 },
          { method: RegionalPaymentMethod.PAYPAL, marketShare: 0.25 },
          { method: RegionalPaymentMethod.BACS_DEBIT, marketShare: 0.05 }
        ]
      },

      // Sweden
      {
        region: 'SE',
        availableMethods: [
          RegionalPaymentMethod.KLARNA,
          RegionalPaymentMethod.CARD,
          RegionalPaymentMethod.PAYPAL
        ],
        recommendedMethod: RegionalPaymentMethod.KLARNA,
        localPreferences: [
          { method: RegionalPaymentMethod.KLARNA, marketShare: 0.55 },
          { method: RegionalPaymentMethod.CARD, marketShare: 0.35 },
          { method: RegionalPaymentMethod.PAYPAL, marketShare: 0.10 }
        ]
      },

      // Canada
      {
        region: 'CA',
        availableMethods: [
          RegionalPaymentMethod.CARD,
          RegionalPaymentMethod.PAYPAL,
          RegionalPaymentMethod.INTERAC
        ],
        recommendedMethod: RegionalPaymentMethod.CARD,
        localPreferences: [
          { method: RegionalPaymentMethod.CARD, marketShare: 0.60 },
          { method: RegionalPaymentMethod.INTERAC, marketShare: 0.25 },
          { method: RegionalPaymentMethod.PAYPAL, marketShare: 0.15 }
        ]
      },

      // Australia
      {
        region: 'AU',
        availableMethods: [
          RegionalPaymentMethod.CARD,
          RegionalPaymentMethod.PAYPAL,
          RegionalPaymentMethod.BECS_DEBIT
        ],
        recommendedMethod: RegionalPaymentMethod.CARD,
        localPreferences: [
          { method: RegionalPaymentMethod.CARD, marketShare: 0.75 },
          { method: RegionalPaymentMethod.PAYPAL, marketShare: 0.20 },
          { method: RegionalPaymentMethod.BECS_DEBIT, marketShare: 0.05 }
        ]
      },

      // Japan
      {
        region: 'JP',
        availableMethods: [
          RegionalPaymentMethod.CARD,
          RegionalPaymentMethod.KONBINI,
          RegionalPaymentMethod.PAYPAL
        ],
        recommendedMethod: RegionalPaymentMethod.CARD,
        localPreferences: [
          { method: RegionalPaymentMethod.CARD, marketShare: 0.50 },
          { method: RegionalPaymentMethod.KONBINI, marketShare: 0.35 },
          { method: RegionalPaymentMethod.PAYPAL, marketShare: 0.15 }
        ]
      }
    ];

    availability.forEach(region => {
      this.regionalAvailability.set(region.region, region);
    });

    logger.info('Initialized regional payment availability', {
      regions: availability.length,
      averageMethodsPerRegion: availability.reduce((sum, r) => sum + r.availableMethods.length, 0) / availability.length
    });
  }

  /**
   * Get available payment methods for a region
   */
  getAvailablePaymentMethods(region: string): PaymentMethodAvailability | null {
    return this.regionalAvailability.get(region) || null;
  }

  /**
   * Get payment method configuration
   */
  getPaymentMethodConfig(method: RegionalPaymentMethod): PaymentMethodConfig | null {
    return this.paymentMethods.get(method) || null;
  }

  /**
   * Get recommended payment methods for region and currency
   */
  getRecommendedMethods(
    region: string,
    currency: SupportedCurrency,
    limit: number = 3
  ): PaymentMethodConfig[] {
    const availability = this.getAvailablePaymentMethods(region);

    if (!availability) {
      // Default to universal methods
      return [
        this.paymentMethods.get(RegionalPaymentMethod.CARD)!,
        this.paymentMethods.get(RegionalPaymentMethod.PAYPAL)!
      ].filter(Boolean);
    }

    // Filter by currency support and sort by local preference
    const availableMethods = availability.availableMethods
      .map(method => this.paymentMethods.get(method)!)
      .filter(config =>
        config &&
        config.enabled &&
        (config.supportedCurrencies.includes(currency) || config.supportedCountries.includes('*'))
      )
      .sort((a, b) => {
        // Sort by local market share preference
        const aPreference = availability.localPreferences.find(p => p.method === a.method)?.marketShare || 0;
        const bPreference = availability.localPreferences.find(p => p.method === b.method)?.marketShare || 0;
        return bPreference - aPreference;
      })
      .slice(0, limit);

    logger.info('Retrieved recommended payment methods', {
      region,
      currency,
      methodCount: availableMethods.length,
      methods: availableMethods.map(m => m.method)
    });

    return availableMethods;
  }

  /**
   * Validate payment method requirements for customer
   */
  async validatePaymentMethod(
    method: RegionalPaymentMethod,
    customerData: {
      country: string;
      hasVerifiedIdentity?: boolean;
      hasBankAccount?: boolean;
      hasAddress?: boolean;
    }
  ): Promise<PaymentMethodValidation> {
    const config = this.getPaymentMethodConfig(method);

    if (!config) {
      return {
        method,
        valid: false,
        requirements: [],
        estimatedCompletionTime: 'unknown',
        fees: { amount: 0, currency: SupportedCurrency.USD, description: 'Method not found' }
      };
    }

    const requirements = [
      {
        name: 'Country Support',
        required: true,
        satisfied: config.supportedCountries.includes('*') || config.supportedCountries.includes(customerData.country),
        description: `Available in: ${config.supportedCountries.includes('*') ? 'All countries' : config.supportedCountries.join(', ')}`
      }
    ];

    if (config.requirements.customerVerification) {
      requirements.push({
        name: 'Identity Verification',
        required: true,
        satisfied: customerData.hasVerifiedIdentity || false,
        description: 'Customer identity must be verified'
      });
    }

    if (config.requirements.bankAccount) {
      requirements.push({
        name: 'Bank Account',
        required: true,
        satisfied: customerData.hasBankAccount || false,
        description: 'Valid bank account required'
      });
    }

    if (config.requirements.address) {
      requirements.push({
        name: 'Address',
        required: true,
        satisfied: customerData.hasAddress || false,
        description: 'Verified address required'
      });
    }

    const allSatisfied = requirements.every(req => !req.required || req.satisfied);

    return {
      method,
      valid: allSatisfied,
      requirements,
      estimatedCompletionTime: config.processingTime,
      fees: {
        amount: (config.fees.fixed || 0) + (config.fees.percentage || 0) * 100, // Estimate for $1
        currency: SupportedCurrency.USD,
        description: `${config.fees.percentage ? `${config.fees.percentage * 100}%` : ''}${config.fees.percentage && config.fees.fixed ? ' + ' : ''}${config.fees.fixed ? `${config.fees.fixed}¢` : ''}`
      }
    };
  }

  /**
   * Get payment method fees for amount
   */
  calculateFees(
    method: RegionalPaymentMethod,
    amount: number,
    currency: SupportedCurrency
  ): { amount: number; description: string } {
    const config = this.getPaymentMethodConfig(method);

    if (!config) {
      return { amount: 0, description: 'Method not found' };
    }

    const fixedFee = config.fees.fixed || 0; // in cents
    const percentageFee = (config.fees.percentage || 0) * amount;
    const totalFee = (fixedFee / 100) + percentageFee; // Convert cents to currency units

    const description = [
      config.fees.percentage ? `${config.fees.percentage * 100}%` : '',
      config.fees.fixed ? `${config.fees.fixed}¢` : ''
    ].filter(Boolean).join(' + ');

    return {
      amount: Math.round(totalFee * 100) / 100,
      description: description || 'No fees'
    };
  }

  /**
   * Get all supported payment methods
   */
  getAllPaymentMethods(): PaymentMethodConfig[] {
    return Array.from(this.paymentMethods.values()).filter(method => method.enabled);
  }

  /**
   * Health check for regional payment methods service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const allMethods = this.getAllPaymentMethods();
    const enabledMethods = allMethods.filter(m => m.enabled);
    const supportedRegions = Array.from(this.regionalAvailability.keys());

    return {
      status: 'healthy',
      details: {
        totalPaymentMethods: allMethods.length,
        enabledPaymentMethods: enabledMethods.length,
        supportedRegions: supportedRegions.length,
        providers: [...new Set(allMethods.map(m => m.provider))],
        mostPopularGlobal: allMethods.sort((a, b) => b.popularity - a.popularity)[0]?.method,
        regionsWithMostMethods: supportedRegions
          .map(region => ({
            region,
            methodCount: this.regionalAvailability.get(region)?.availableMethods.length || 0
          }))
          .sort((a, b) => b.methodCount - a.methodCount)
          .slice(0, 3)
      }
    };
  }
}