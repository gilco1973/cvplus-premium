/**
 * CVPlus Premium Advanced Payment Request Validation System
 * Phase 2: Comprehensive validation with currency, geographic, and compliance checks
 */

import {
  PaymentProviderName,
  PaymentMethod,
  PaymentRequest,
  PaymentError,
  CustomerInfo,
} from '../../../../types/payments.types';

import {
  PaymentContext,
  ProviderError,
  ProviderErrorCode,
  CreateProviderError,
  ComplianceFeatures,
} from '../../../../types/providers.types';

import { providerRegistry } from '../provider-registry';

/**
 * Advanced Payment Request Validator with comprehensive validation rules,
 * currency support checks, geographic restrictions, and compliance validation
 */
export class PaymentRequestValidator {
  private static instance: PaymentRequestValidator;
  
  private readonly currencySupport: Record<PaymentProviderName, string[]> = {
    stripe: ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'nok', 'sek', 'dkk'],
    paypal: ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'],
  };
  
  private readonly regionRestrictions: Record<PaymentProviderName, RegionRestriction> = {
    stripe: {
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'IE', 'AT', 'BE', 'CH', 'PT'],
      restricted_countries: ['IR', 'KP', 'SY', 'CU'],
      sanctioned_regions: ['Crimea', 'Donetsk', 'Luhansk'],
    },
    paypal: {
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL'],
      restricted_countries: ['IR', 'KP', 'SY', 'CU', 'AF', 'BY', 'MM'],
      sanctioned_regions: ['Crimea'],
    },
  };
  
  private readonly amountLimits: Record<PaymentProviderName, CurrencyLimits> = {
    stripe: {
      'usd': { min: 50, max: 99999999 }, // $0.50 to $999,999.99
      'eur': { min: 50, max: 99999999 },
      'gbp': { min: 30, max: 99999999 },
      'cad': { min: 50, max: 99999999 },
      'aud': { min: 50, max: 99999999 },
      'jpy': { min: 50, max: 99999999 }, // ¥50 minimum
    },
    paypal: {
      'usd': { min: 100, max: 1000000000 }, // $1.00 to $10,000,000.00
      'eur': { min: 100, max: 1000000000 },
      'gbp': { min: 100, max: 1000000000 },
    },
  };
  
  private readonly createError: CreateProviderError;

  private constructor() {
    this.createError = this.createProviderError.bind(this);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PaymentRequestValidator {
    if (!PaymentRequestValidator.instance) {
      PaymentRequestValidator.instance = new PaymentRequestValidator();
    }
    return PaymentRequestValidator.instance;
  }

  // =============================================================================
  // COMPREHENSIVE REQUEST VALIDATION
  // =============================================================================

  /**
   * Validate payment request with comprehensive checks
   */
  async validatePaymentRequest(
    request: PaymentRequest,
    context: PaymentContext,
    provider: PaymentProviderName
  ): Promise<ValidationResult> {
    const validationId = this.generateValidationId();
    
    try {
      this.logValidationEvent('validation.started', provider, {
        validation_id: validationId,
        amount: request.amount,
        currency: request.currency,
        provider,
      });

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      
      // Basic request structure validation
      const structureErrors = await this.validateRequestStructure(request, provider);
      errors.push(...structureErrors);

      // Currency support validation
      const currencyErrors = await this.validateCurrencySupport(request, provider);
      errors.push(...currencyErrors);

      // Amount limits validation
      const amountErrors = await this.validateAmountLimits(request, provider);
      errors.push(...amountErrors);

      // Geographic restrictions validation
      const geoErrors = await this.validateGeographicRestrictions(request, context, provider);
      errors.push(...geoErrors);

      // Compliance validation
      const complianceResults = await this.validateCompliance(request, context, provider);
      errors.push(...complianceResults.errors);
      warnings.push(...complianceResults.warnings);

      // Payment method validation
      const methodErrors = await this.validatePaymentMethod(request, provider);
      errors.push(...methodErrors);

      // Customer information validation
      if (request.customerId) {
        const customerErrors = await this.validateCustomerInformation(request, provider);
        errors.push(...customerErrors);
      }

      // Risk assessment warnings
      const riskWarnings = await this.assessTransactionRisk(request, context);
      warnings.push(...riskWarnings);

      const isValid = errors.length === 0;
      
      const result: ValidationResult = {
        valid: isValid,
        errors,
        warnings,
        validation_metadata: {
          validation_id: validationId,
          provider,
          timestamp: new Date(),
          checks_performed: [
            'structure',
            'currency',
            'amount_limits',
            'geographic',
            'compliance',
            'payment_method',
            'customer',
            'risk_assessment',
          ],
        },
      };

      this.logValidationEvent('validation.completed', provider, {
        validation_id: validationId,
        valid: isValid,
        error_count: errors.length,
        warning_count: warnings.length,
      });

      return result;
    } catch (error) {
      this.logValidationEvent('validation.failed', provider, {
        validation_id: validationId,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      });

      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_SYSTEM_ERROR',
          message: 'Validation system encountered an error',
          field: 'system',
          severity: 'critical',
        }],
        warnings: [],
        validation_metadata: {
          validation_id: validationId,
          provider,
          timestamp: new Date(),
          checks_performed: [],
        },
      };
    }
  }

  // =============================================================================
  // SPECIFIC VALIDATION METHODS
  // =============================================================================

  /**
   * Validate basic request structure
   */
  async validateRequestStructure(
    request: PaymentRequest,
    provider: PaymentProviderName
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Required fields
    if (!request.amount) {
      errors.push({
        code: 'AMOUNT_REQUIRED',
        message: 'Payment amount is required',
        field: 'amount',
        severity: 'critical',
      });
    }

    if (!request.currency) {
      errors.push({
        code: 'CURRENCY_REQUIRED',
        message: 'Payment currency is required',
        field: 'currency',
        severity: 'critical',
      });
    }

    if (!request.customerId) {
      errors.push({
        code: 'CUSTOMER_ID_REQUIRED',
        message: 'Customer ID is required',
        field: 'customerId',
        severity: 'critical',
      });
    }

    // Type validations
    if (request.amount && (typeof request.amount !== 'number' || request.amount <= 0)) {
      errors.push({
        code: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number',
        field: 'amount',
        severity: 'high',
      });
    }

    if (request.currency && (typeof request.currency !== 'string' || request.currency.length !== 3)) {
      errors.push({
        code: 'INVALID_CURRENCY_FORMAT',
        message: 'Currency must be a 3-letter ISO code',
        field: 'currency',
        severity: 'high',
      });
    }

    // Metadata validation
    if (request.metadata && typeof request.metadata !== 'object') {
      errors.push({
        code: 'INVALID_METADATA',
        message: 'Metadata must be an object',
        field: 'metadata',
        severity: 'medium',
      });
    }

    return errors;
  }

  /**
   * Validate currency support across providers
   */
  async validateCurrencySupport(
    request: PaymentRequest,
    provider: PaymentProviderName
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!request.currency) {
      return errors; // Already handled in structure validation
    }

    const normalizedCurrency = request.currency.toLowerCase();
    const supportedCurrencies = this.currencySupport[provider] || [];

    if (!supportedCurrencies.includes(normalizedCurrency)) {
      errors.push({
        code: 'CURRENCY_NOT_SUPPORTED',
        message: `Currency '${request.currency}' is not supported by ${provider}`,
        field: 'currency',
        severity: 'critical',
        context: {
          provider,
          supported_currencies: supportedCurrencies,
        },
      });
    }

    return errors;
  }

  /**
   * Validate amount limits per provider and currency
   */
  async validateAmountLimits(
    request: PaymentRequest,
    provider: PaymentProviderName
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!request.amount || !request.currency) {
      return errors; // Already handled in structure validation
    }

    const normalizedCurrency = request.currency.toLowerCase();
    const limits = this.amountLimits[provider]?.[normalizedCurrency];

    if (!limits) {
      // If no limits defined, use conservative defaults
      if (request.amount < 50) {
        errors.push({
          code: 'AMOUNT_TOO_SMALL',
          message: 'Payment amount is below minimum threshold',
          field: 'amount',
          severity: 'high',
          context: {
            amount: request.amount,
            currency: request.currency,
            minimum_amount: 50,
          },
        });
      }

      if (request.amount > 99999999) {
        errors.push({
          code: 'AMOUNT_TOO_LARGE',
          message: 'Payment amount exceeds maximum threshold',
          field: 'amount',
          severity: 'high',
          context: {
            amount: request.amount,
            currency: request.currency,
            maximum_amount: 99999999,
          },
        });
      }

      return errors;
    }

    // Check against provider-specific limits
    if (request.amount < limits.min) {
      errors.push({
        code: 'AMOUNT_TOO_SMALL',
        message: `Amount is below minimum for ${provider} (${this.formatAmount(limits.min, request.currency)})`,
        field: 'amount',
        severity: 'high',
        context: {
          amount: request.amount,
          currency: request.currency,
          minimum_amount: limits.min,
          provider,
        },
      });
    }

    if (request.amount > limits.max) {
      errors.push({
        code: 'AMOUNT_TOO_LARGE',
        message: `Amount exceeds maximum for ${provider} (${this.formatAmount(limits.max, request.currency)})`,
        field: 'amount',
        severity: 'high',
        context: {
          amount: request.amount,
          currency: request.currency,
          maximum_amount: limits.max,
          provider,
        },
      });
    }

    return errors;
  }

  /**
   * Validate geographic restrictions
   */
  async validateGeographicRestrictions(
    request: PaymentRequest,
    context: PaymentContext,
    provider: PaymentProviderName
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const restrictions = this.regionRestrictions[provider];

    if (!restrictions) {
      return errors; // No restrictions defined for provider
    }

    const billingCountry = request.billing_address?.country || context.billing_country;
    const shippingCountry = request.shipping_address?.country;

    // Check billing country restrictions
    if (billingCountry) {
      if (restrictions.restricted_countries.includes(billingCountry)) {
        errors.push({
          code: 'REGION_RESTRICTED',
          message: `Payments are restricted from ${billingCountry}`,
          field: 'billing_address.country',
          severity: 'critical',
          context: {
            country: billingCountry,
            provider,
            restriction_type: 'billing',
          },
        });
      } else if (restrictions.allowed_countries.length > 0 && 
                 !restrictions.allowed_countries.includes(billingCountry)) {
        errors.push({
          code: 'REGION_NOT_SUPPORTED',
          message: `Payments are not supported in ${billingCountry}`,
          field: 'billing_address.country',
          severity: 'critical',
          context: {
            country: billingCountry,
            provider,
            supported_countries: restrictions.allowed_countries,
          },
        });
      }
    }

    // Check shipping country restrictions
    if (shippingCountry && shippingCountry !== billingCountry) {
      if (restrictions.restricted_countries.includes(shippingCountry)) {
        errors.push({
          code: 'SHIPPING_REGION_RESTRICTED',
          message: `Shipping is restricted to ${shippingCountry}`,
          field: 'shipping_address.country',
          severity: 'high',
          context: {
            country: shippingCountry,
            provider,
            restriction_type: 'shipping',
          },
        });
      }
    }

    return errors;
  }

  /**
   * Validate compliance requirements
   */
  async validateCompliance(
    request: PaymentRequest,
    context: PaymentContext,
    provider: PaymentProviderName
  ): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get provider compliance features
    const providerInstance = providerRegistry.get(provider);
    if (!providerInstance) {
      errors.push({
        code: 'PROVIDER_NOT_AVAILABLE',
        message: `Provider ${provider} is not available for compliance validation`,
        field: 'provider',
        severity: 'critical',
      });
      return { errors, warnings };
    }

    const features = providerInstance.getFeatures();

    // PCI DSS compliance check
    if (request.paymentMethod?.card && !features.fraud_detection) {
      warnings.push({
        code: 'PCI_COMPLIANCE_WARNING',
        message: 'Card payments without fraud detection may not meet PCI DSS requirements',
        severity: 'medium',
        context: {
          provider,
          payment_method: 'card',
        },
      });
    }

    // Large transaction compliance (potential AML requirements)
    if (request.amount > 1000000) { // $10,000 equivalent
      warnings.push({
        code: 'AML_REVIEW_REQUIRED',
        message: 'Large transactions may require additional AML compliance review',
        severity: 'medium',
        context: {
          amount: request.amount,
          currency: request.currency,
          threshold: 1000000,
        },
      });
    }

    // Cross-border transaction compliance
    const billingCountry = request.billing_address?.country || context.billing_country;
    const shippingCountry = request.shipping_address?.country;
    
    if (billingCountry && shippingCountry && billingCountry !== shippingCountry) {
      warnings.push({
        code: 'CROSS_BORDER_COMPLIANCE',
        message: 'Cross-border transactions may require additional compliance checks',
        severity: 'low',
        context: {
          billing_country: billingCountry,
          shipping_country: shippingCountry,
        },
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate payment method support
   */
  async validatePaymentMethod(
    request: PaymentRequest,
    provider: PaymentProviderName
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    const providerInstance = providerRegistry.get(provider);
    if (!providerInstance) {
      return errors; // Provider validation handled elsewhere
    }

    const supportedMethods = providerInstance.getSupportedPaymentMethods();

    // Check if payment method is specified and supported
    if (request.paymentMethod?.type) {
      if (!supportedMethods.includes(request.paymentMethod.type)) {
        errors.push({
          code: 'PAYMENT_METHOD_NOT_SUPPORTED',
          message: `Payment method '${request.paymentMethod.type}' is not supported by ${provider}`,
          field: 'paymentMethod.type',
          severity: 'critical',
          context: {
            provider,
            payment_method: request.paymentMethod.type,
            supported_methods: supportedMethods,
          },
        });
      }
    }

    // Validate card-specific information
    if (request.paymentMethod?.card) {
      const cardErrors = this.validateCardInformation(request.paymentMethod.card);
      errors.push(...cardErrors);
    }

    return errors;
  }

  /**
   * Validate customer information
   */
  async validateCustomerInformation(
    request: PaymentRequest,
    provider: PaymentProviderName
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Customer ID format validation
    if (request.customerId && typeof request.customerId !== 'string') {
      errors.push({
        code: 'INVALID_CUSTOMER_ID',
        message: 'Customer ID must be a string',
        field: 'customerId',
        severity: 'high',
      });
    }

    // Billing address validation
    if (request.billing_address) {
      const addressErrors = this.validateAddress(request.billing_address, 'billing_address');
      errors.push(...addressErrors);
    }

    // Shipping address validation
    if (request.shipping_address) {
      const addressErrors = this.validateAddress(request.shipping_address, 'shipping_address');
      errors.push(...addressErrors);
    }

    return errors;
  }

  /**
   * Assess transaction risk and generate warnings
   */
  async assessTransactionRisk(
    request: PaymentRequest,
    context: PaymentContext
  ): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    // High-value transaction risk
    if (request.amount > 500000) { // $5,000 equivalent
      warnings.push({
        code: 'HIGH_VALUE_TRANSACTION',
        message: 'High-value transactions have increased risk of fraud',
        severity: 'medium',
        context: {
          amount: request.amount,
          currency: request.currency,
        },
      });
    }

    // Velocity check (placeholder - would integrate with actual fraud detection)
    if (context.metadata?.recent_transaction_count && 
        context.metadata.recent_transaction_count > 5) {
      warnings.push({
        code: 'HIGH_TRANSACTION_VELOCITY',
        message: 'Customer has high transaction velocity, monitor for fraud',
        severity: 'medium',
        context: {
          customer_id: context.userId,
          transaction_count: context.metadata.recent_transaction_count,
        },
      });
    }

    // International transaction risk
    const billingCountry = request.billing_address?.country || context.billing_country;
    if (billingCountry && !['US', 'CA', 'GB', 'AU', 'DE', 'FR'].includes(billingCountry)) {
      warnings.push({
        code: 'INTERNATIONAL_TRANSACTION_RISK',
        message: 'International transactions may have higher fraud risk',
        severity: 'low',
        context: {
          billing_country: billingCountry,
        },
      });
    }

    return warnings;
  }

  // =============================================================================
  // HELPER VALIDATION METHODS
  // =============================================================================

  /**
   * Validate card information
   */
  private validateCardInformation(card: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (card.exp_month && (card.exp_month < 1 || card.exp_month > 12)) {
      errors.push({
        code: 'INVALID_EXPIRY_MONTH',
        message: 'Card expiry month must be between 1 and 12',
        field: 'paymentMethod.card.exp_month',
        severity: 'high',
      });
    }

    if (card.exp_year && card.exp_year < new Date().getFullYear()) {
      errors.push({
        code: 'CARD_EXPIRED',
        message: 'Card has expired',
        field: 'paymentMethod.card.exp_year',
        severity: 'critical',
      });
    }

    return errors;
  }

  /**
   * Validate address information
   */
  private validateAddress(address: any, fieldPrefix: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!address.line1) {
      errors.push({
        code: 'ADDRESS_LINE1_REQUIRED',
        message: 'Address line 1 is required',
        field: `${fieldPrefix}.line1`,
        severity: 'high',
      });
    }

    if (!address.city) {
      errors.push({
        code: 'CITY_REQUIRED',
        message: 'City is required',
        field: `${fieldPrefix}.city`,
        severity: 'high',
      });
    }

    if (!address.country) {
      errors.push({
        code: 'COUNTRY_REQUIRED',
        message: 'Country is required',
        field: `${fieldPrefix}.country`,
        severity: 'high',
      });
    }

    if (address.country && address.country.length !== 2) {
      errors.push({
        code: 'INVALID_COUNTRY_CODE',
        message: 'Country must be a 2-letter ISO code',
        field: `${fieldPrefix}.country`,
        severity: 'medium',
      });
    }

    return errors;
  }

  /**
   * Format amount for display
   */
  private formatAmount(amount: number, currency: string): string {
    const divisor = ['jpy', 'krw'].includes(currency.toLowerCase()) ? 1 : 100;
    const formattedAmount = (amount / divisor).toFixed(divisor === 1 ? 0 : 2);
    return `${formattedAmount} ${currency.toUpperCase()}`;
  }

  /**
   * Generate unique validation ID
   */
  private generateValidationId(): string {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create provider error
   */
  private createProviderError<P extends PaymentProviderName>(
    provider: P,
    code: ProviderErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      context?: Record<string, any>;
      original_error?: unknown;
    } = {}
  ): ProviderError {
    const error = new Error(message) as ProviderError;
    error.code = code;
    error.provider = provider;
    error.retryable = options.retryable ?? false;
    error.context = options.context;
    error.original_error = options.original_error;
    
    return error;
  }

  /**
   * Log validation events
   */
  private logValidationEvent(
    type: string,
    provider: PaymentProviderName,
    data: Record<string, any> = {}
  ): void {
    console.log(`[PaymentRequestValidator] ${type}:`, {
      provider,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validation_metadata: {
    validation_id: string;
    provider: PaymentProviderName;
    timestamp: Date;
    checks_performed: string[];
  };
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  context?: Record<string, any>;
}

interface RegionRestriction {
  allowed_countries: string[];
  restricted_countries: string[];
  sanctioned_regions: string[];
}

interface CurrencyLimits {
  [currency: string]: {
    min: number;
    max: number;
  };
}

// Export singleton instance
export const paymentRequestValidator = PaymentRequestValidator.getInstance();