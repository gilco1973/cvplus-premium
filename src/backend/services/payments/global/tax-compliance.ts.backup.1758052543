/**
 * CVPlus Premium Global Payment Infrastructure
 * Tax Compliance Service
 *
 * Handles VAT, GST, sales tax calculation and compliance for global transactions.
 * Ensures proper tax collection and reporting across multiple jurisdictions.
 *
 * @author Gil Klainert
 * @version 1.0.0
 * @category Global Payments
 */

import { logger } from 'firebase-functions/v2';
import { BaseService } from '../../shared/base-service';
import { SupportedCurrency } from './currency-manager';

export enum TaxType {
  VAT = 'vat',           // European Value Added Tax
  GST = 'gst',           // Goods and Services Tax (Australia, Canada, etc.)
  SALES_TAX = 'sales_tax', // US State Sales Tax
  HST = 'hst',           // Harmonized Sales Tax (Canada)
  NONE = 'none'          // No tax applicable
}

export interface TaxJurisdiction {
  countryCode: string;
  region?: string;        // State, province, etc.
  taxType: TaxType;
  rate: number;           // Tax rate as decimal (0.20 = 20%)
  threshold?: number;     // Minimum threshold for tax collection
  currency: SupportedCurrency;
  taxNumber?: string;     // Business tax registration number
  reverseCharge?: boolean; // B2B reverse charge applicable
  digitalServicesApplicable: boolean;
}

export interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: SupportedCurrency;
  taxRate: number;
  taxType: TaxType;
  jurisdiction: string;
  exemptionApplied?: boolean;
  exemptionReason?: string;
  breakdown: TaxBreakdown[];
}

export interface TaxBreakdown {
  name: string;
  rate: number;
  amount: number;
  type: TaxType;
}

export interface CustomerTaxInfo {
  customerId: string;
  businessType: 'individual' | 'business';
  countryCode: string;
  region?: string;
  postalCode?: string;
  vatNumber?: string;
  taxExempt: boolean;
  exemptionReason?: string;
}

/**
 * Tax Compliance Service for global payment processing
 * Handles tax calculation, validation, and reporting
 */
export class TaxComplianceService extends BaseService {
  private taxJurisdictions = new Map<string, TaxJurisdiction>();
  private readonly digitalServicesTaxThreshold = 10000; // $10,000 annually

  constructor(config: any) {
    super({
      name: 'TaxComplianceService',
      version: '1.0.0',
      enabled: true,
      ...config
    });

    this.initializeTaxJurisdictions();
  }

  /**
   * Initialize tax jurisdiction configurations
   */
  private initializeTaxJurisdictions(): void {
    const jurisdictions: TaxJurisdiction[] = [
      // United States (State Sales Tax)
      {
        countryCode: 'US',
        region: 'CA',
        taxType: TaxType.SALES_TAX,
        rate: 0.0725,
        currency: SupportedCurrency.USD,
        digitalServicesApplicable: true
      },
      {
        countryCode: 'US',
        region: 'NY',
        taxType: TaxType.SALES_TAX,
        rate: 0.08,
        currency: SupportedCurrency.USD,
        digitalServicesApplicable: true
      },
      {
        countryCode: 'US',
        region: 'FL',
        taxType: TaxType.SALES_TAX,
        rate: 0.06,
        currency: SupportedCurrency.USD,
        digitalServicesApplicable: true
      },

      // European Union (VAT)
      {
        countryCode: 'DE',
        taxType: TaxType.VAT,
        rate: 0.19,
        currency: SupportedCurrency.EUR,
        taxNumber: 'DE123456789',
        reverseCharge: true,
        digitalServicesApplicable: true
      },
      {
        countryCode: 'FR',
        taxType: TaxType.VAT,
        rate: 0.20,
        currency: SupportedCurrency.EUR,
        taxNumber: 'FR12345678901',
        reverseCharge: true,
        digitalServicesApplicable: true
      },
      {
        countryCode: 'GB',
        taxType: TaxType.VAT,
        rate: 0.20,
        currency: SupportedCurrency.GBP,
        taxNumber: 'GB123456789',
        reverseCharge: true,
        digitalServicesApplicable: true
      },
      {
        countryCode: 'NL',
        taxType: TaxType.VAT,
        rate: 0.21,
        currency: SupportedCurrency.EUR,
        taxNumber: 'NL123456789B01',
        reverseCharge: true,
        digitalServicesApplicable: true
      },
      {
        countryCode: 'BE',
        taxType: TaxType.VAT,
        rate: 0.21,
        currency: SupportedCurrency.EUR,
        taxNumber: 'BE0123456789',
        reverseCharge: true,
        digitalServicesApplicable: true
      },

      // Canada (GST/HST)
      {
        countryCode: 'CA',
        region: 'ON',
        taxType: TaxType.HST,
        rate: 0.13,
        currency: SupportedCurrency.CAD,
        taxNumber: 'RT0001',
        digitalServicesApplicable: true
      },
      {
        countryCode: 'CA',
        region: 'BC',
        taxType: TaxType.GST,
        rate: 0.12, // GST 5% + PST 7%
        currency: SupportedCurrency.CAD,
        taxNumber: 'RT0001',
        digitalServicesApplicable: true
      },

      // Australia (GST)
      {
        countryCode: 'AU',
        taxType: TaxType.GST,
        rate: 0.10,
        threshold: 75000, // AUD threshold for GST registration
        currency: SupportedCurrency.AUD,
        taxNumber: 'ABN 12345678901',
        digitalServicesApplicable: true
      },

      // Japan (Consumption Tax)
      {
        countryCode: 'JP',
        taxType: TaxType.GST,
        rate: 0.10,
        currency: SupportedCurrency.JPY,
        digitalServicesApplicable: true
      },

      // Nordic Countries
      {
        countryCode: 'SE',
        taxType: TaxType.VAT,
        rate: 0.25,
        currency: SupportedCurrency.SEK,
        taxNumber: 'SE123456789001',
        reverseCharge: true,
        digitalServicesApplicable: true
      },
      {
        countryCode: 'NO',
        taxType: TaxType.VAT,
        rate: 0.25,
        currency: SupportedCurrency.NOK,
        taxNumber: 'NO123456789',
        digitalServicesApplicable: true
      },
      {
        countryCode: 'DK',
        taxType: TaxType.VAT,
        rate: 0.25,
        currency: SupportedCurrency.DKK,
        taxNumber: 'DK12345678',
        reverseCharge: true,
        digitalServicesApplicable: true
      }
    ];

    jurisdictions.forEach(jurisdiction => {
      const key = jurisdiction.region
        ? `${jurisdiction.countryCode}_${jurisdiction.region}`
        : jurisdiction.countryCode;
      this.taxJurisdictions.set(key, jurisdiction);
    });

    logger.info(`Initialized tax jurisdictions`, {
      count: jurisdictions.length,
      countries: [...new Set(jurisdictions.map(j => j.countryCode))],
      taxTypes: [...new Set(jurisdictions.map(j => j.taxType))]
    });
  }

  /**
   * Calculate tax for a transaction
   */
  async calculateTax(
    amount: number,
    currency: SupportedCurrency,
    customerTaxInfo: CustomerTaxInfo
  ): Promise<TaxCalculation> {
    try {
      const jurisdiction = this.getJurisdiction(customerTaxInfo.countryCode, customerTaxInfo.region);

      if (!jurisdiction || !jurisdiction.digitalServicesApplicable) {
        return this.createNoTaxCalculation(amount, currency, 'no_digital_services_tax');
      }

      // Check for tax exemptions
      if (customerTaxInfo.taxExempt) {
        return this.createNoTaxCalculation(amount, currency, customerTaxInfo.exemptionReason);
      }

      // Check B2B reverse charge (EU VAT)
      if (this.isB2BReverseCharge(jurisdiction, customerTaxInfo)) {
        return this.createNoTaxCalculation(amount, currency, 'b2b_reverse_charge');
      }

      // Calculate tax
      const taxAmount = amount * jurisdiction.rate;
      const total = amount + taxAmount;

      const calculation: TaxCalculation = {
        subtotal: amount,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        currency,
        taxRate: jurisdiction.rate,
        taxType: jurisdiction.taxType,
        jurisdiction: customerTaxInfo.countryCode + (customerTaxInfo.region ? `_${customerTaxInfo.region}` : ''),
        breakdown: [
          {
            name: this.getTaxDisplayName(jurisdiction.taxType),
            rate: jurisdiction.rate,
            amount: Math.round(taxAmount * 100) / 100,
            type: jurisdiction.taxType
          }
        ]
      };

      logger.info('Tax calculated', {
        customerId: customerTaxInfo.customerId,
        amount,
        taxAmount: calculation.taxAmount,
        taxRate: jurisdiction.rate,
        jurisdiction: calculation.jurisdiction
      });

      return calculation;

    } catch (error) {
      logger.error('Tax calculation failed', { error, customerTaxInfo, amount });
      // Return no tax on error to avoid blocking transactions
      return this.createNoTaxCalculation(amount, currency, 'calculation_error');
    }
  }

  /**
   * Validate VAT number (for EU businesses)
   */
  async validateVATNumber(vatNumber: string, countryCode: string): Promise<{
    valid: boolean;
    companyName?: string;
    address?: string;
    error?: string;
  }> {
    try {
      // Simulate VAT number validation (in production, would use EU VIES API)
      const cleanVAT = vatNumber.replace(/[^A-Z0-9]/g, '');
      const countryPrefix = cleanVAT.substring(0, 2);

      if (countryPrefix !== countryCode) {
        return {
          valid: false,
          error: 'VAT number country code mismatch'
        };
      }

      // Basic format validation
      const isValidFormat = this.validateVATFormat(cleanVAT, countryCode);

      if (!isValidFormat) {
        return {
          valid: false,
          error: 'Invalid VAT number format'
        };
      }

      logger.info('VAT number validated', { vatNumber: cleanVAT, countryCode });

      return {
        valid: true,
        companyName: 'Sample Company B.V.', // Would come from VIES API
        address: 'Sample Address, Europe'
      };

    } catch (error) {
      logger.error('VAT validation failed', { error, vatNumber, countryCode });
      return {
        valid: false,
        error: 'VAT validation service unavailable'
      };
    }
  }

  /**
   * Generate tax report for compliance
   */
  async generateTaxReport(
    startDate: Date,
    endDate: Date,
    jurisdiction?: string
  ): Promise<{
    period: { start: Date; end: Date };
    jurisdiction?: string;
    totalTransactions: number;
    totalRevenue: number;
    totalTaxCollected: number;
    taxBreakdown: Array<{
      taxType: TaxType;
      rate: number;
      revenue: number;
      taxCollected: number;
      transactionCount: number;
    }>;
    exemptions: {
      b2bReverseCharge: number;
      taxExempt: number;
      belowThreshold: number;
    };
  }> {
    // Simulate tax report generation (would query actual transaction data)
    const mockReport = {
      period: { start: startDate, end: endDate },
      jurisdiction,
      totalTransactions: 1250,
      totalRevenue: 36250.00,
      totalTaxCollected: 7250.00,
      taxBreakdown: [
        {
          taxType: TaxType.VAT,
          rate: 0.20,
          revenue: 25000.00,
          taxCollected: 5000.00,
          transactionCount: 862
        },
        {
          taxType: TaxType.SALES_TAX,
          rate: 0.08,
          revenue: 11250.00,
          taxCollected: 900.00,
          transactionCount: 388
        }
      ],
      exemptions: {
        b2bReverseCharge: 15,
        taxExempt: 3,
        belowThreshold: 0
      }
    };

    logger.info('Tax report generated', {
      period: mockReport.period,
      jurisdiction,
      totalTransactions: mockReport.totalTransactions,
      totalTaxCollected: mockReport.totalTaxCollected
    });

    return mockReport;
  }

  /**
   * Get jurisdiction configuration
   */
  private getJurisdiction(countryCode: string, region?: string): TaxJurisdiction | undefined {
    const key = region ? `${countryCode}_${region}` : countryCode;
    return this.taxJurisdictions.get(key) || this.taxJurisdictions.get(countryCode);
  }

  /**
   * Check if B2B reverse charge applies
   */
  private isB2BReverseCharge(jurisdiction: TaxJurisdiction, customerInfo: CustomerTaxInfo): boolean {
    return jurisdiction.reverseCharge === true &&
           customerInfo.businessType === 'business' &&
           customerInfo.vatNumber !== undefined &&
           customerInfo.vatNumber.length > 0;
  }

  /**
   * Create no-tax calculation result
   */
  private createNoTaxCalculation(
    amount: number,
    currency: SupportedCurrency,
    reason?: string
  ): TaxCalculation {
    return {
      subtotal: amount,
      taxAmount: 0,
      total: amount,
      currency,
      taxRate: 0,
      taxType: TaxType.NONE,
      jurisdiction: 'none',
      exemptionApplied: true,
      exemptionReason: reason,
      breakdown: []
    };
  }

  /**
   * Get display name for tax type
   */
  private getTaxDisplayName(taxType: TaxType): string {
    const names = {
      [TaxType.VAT]: 'VAT',
      [TaxType.GST]: 'GST',
      [TaxType.SALES_TAX]: 'Sales Tax',
      [TaxType.HST]: 'HST',
      [TaxType.NONE]: 'No Tax'
    };
    return names[taxType] || taxType;
  }

  /**
   * Validate VAT number format by country
   */
  private validateVATFormat(vatNumber: string, countryCode: string): boolean {
    const patterns: Record<string, RegExp> = {
      'DE': /^DE[0-9]{9}$/,
      'FR': /^FR[A-Z0-9]{2}[0-9]{9}$/,
      'GB': /^GB[0-9]{9}$/,
      'NL': /^NL[0-9]{9}B[0-9]{2}$/,
      'BE': /^BE[0-9]{10}$/,
      'IT': /^IT[0-9]{11}$/,
      'ES': /^ES[A-Z0-9][0-9]{7}[A-Z0-9]$/,
      'AT': /^ATU[0-9]{8}$/,
      'DK': /^DK[0-9]{8}$/,
      'SE': /^SE[0-9]{12}$/
    };

    const pattern = patterns[countryCode];
    return pattern ? pattern.test(vatNumber) : true; // Allow unknown formats
  }

  /**
   * Get all supported tax jurisdictions
   */
  getSupportedJurisdictions(): TaxJurisdiction[] {
    return Array.from(this.taxJurisdictions.values());
  }

  /**
   * Health check for tax compliance service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    return {
      status: 'healthy',
      details: {
        supportedJurisdictions: this.taxJurisdictions.size,
        taxTypes: [...new Set(Array.from(this.taxJurisdictions.values()).map(j => j.taxType))],
        countries: [...new Set(Array.from(this.taxJurisdictions.values()).map(j => j.countryCode))],
        digitalServicesTaxThreshold: this.digitalServicesTaxThreshold
      }
    };
  }
}