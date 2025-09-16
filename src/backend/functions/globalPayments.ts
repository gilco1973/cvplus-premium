/**
 * CVPlus Premium Phase 4: Global Payments Cloud Functions
 * Comprehensive global payment infrastructure with multi-currency support,
 * regional payment methods, tax compliance, and fraud prevention.
 *
 * @author Gil Klainert
 * @version 4.0.0
 * @category Global Payment Infrastructure
  */

import { https } from 'firebase-functions/v2';
import { logger } from 'firebase-functions/v2';

import { CurrencyManager, SupportedCurrency } from '../services/payments/global/currency-manager';
import { TaxComplianceService, CustomerTaxInfo } from '../services/payments/global/tax-compliance';
import { RegionalPaymentMethodsService, RegionalPaymentMethod } from '../services/payments/global/regional-payment-methods';
import { FraudPreventionService, TransactionRiskProfile, RiskLevel } from '../services/payments/global/fraud-prevention';

import { requireAuth } from '../../middleware/authGuard';
import { enhancedPremiumGuard } from '../../middleware/enhancedPremiumGuard';

// Initialize global payment services
const currencyManager = new CurrencyManager({
  name: 'CurrencyManager',
  version: '1.0.0',
  enabled: true
});

const taxCompliance = new TaxComplianceService({
  name: 'TaxComplianceService',
  version: '1.0.0',
  enabled: true
});

const paymentMethods = new RegionalPaymentMethodsService({
  name: 'RegionalPaymentMethodsService',
  version: '1.0.0',
  enabled: true
});

const fraudPrevention = new FraudPreventionService({
  name: 'FraudPreventionService',
  version: '1.0.0',
  enabled: true
});

/**
 * Get localized pricing for a region with tax calculation
  */
export const getLocalizedPricing = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { basePrice, baseCurrency, targetRegion, customerTaxInfo } = request.data;

      if (!basePrice || !baseCurrency || !targetRegion) {
        throw new https.HttpsError('invalid-argument', 'basePrice, baseCurrency, and targetRegion are required');
      }

      logger.info('Localized pricing request', {
        userId: request.auth.uid,
        basePrice,
        baseCurrency,
        targetRegion
      });

      // Get regional pricing
      const localizedPrice = await currencyManager.calculateLocalizedPrice(
        basePrice,
        baseCurrency as SupportedCurrency,
        targetRegion
      );

      // Calculate tax if customer info provided
      let taxCalculation = null;
      if (customerTaxInfo) {
        taxCalculation = await taxCompliance.calculateTax(
          localizedPrice.price,
          localizedPrice.currency,
          customerTaxInfo as CustomerTaxInfo
        );
      }

      // Get available payment methods
      const availablePaymentMethods = paymentMethods.getRecommendedMethods(
        targetRegion,
        localizedPrice.currency,
        5
      );

      const response = {
        success: true,
        pricing: {
          basePrice,
          baseCurrency,
          localizedPrice: localizedPrice.price,
          currency: localizedPrice.currency,
          priceWithTax: taxCalculation?.total || localizedPrice.priceWithTax,
          taxAmount: taxCalculation?.taxAmount || localizedPrice.taxAmount,
          adjustmentReason: localizedPrice.adjustmentReason,
          taxBreakdown: taxCalculation?.breakdown || []
        },
        paymentMethods: availablePaymentMethods.map(method => ({
          method: method.method,
          displayName: method.displayName,
          description: method.description,
          processingTime: method.processingTime,
          popularity: method.popularity,
          fees: paymentMethods.calculateFees(method.method, localizedPrice.price, localizedPrice.currency)
        })),
        region: targetRegion,
        currency: localizedPrice.currency
      };

      logger.info('Localized pricing calculated', {
        userId: request.auth.uid,
        targetRegion,
        localizedPrice: response.pricing.localizedPrice,
        currency: response.pricing.currency,
        paymentMethodsCount: response.paymentMethods.length
      });

      return response;

    } catch (error) {
      logger.error('Localized pricing calculation failed', { error, data: request.data });

      if (error instanceof https.HttpsError) {
        throw error;
      }

      throw new https.HttpsError(
        'internal',
        'Failed to calculate localized pricing',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get supported currencies and regions
  */
export const getSupportedRegions = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      logger.info('Supported regions request', { userId: request.auth.uid });

      const currencies = currencyManager.getSupportedCurrencies();
      const taxJurisdictions = taxCompliance.getSupportedJurisdictions();
      const allPaymentMethods = paymentMethods.getAllPaymentMethods();

      // Group by region
      const regionData = taxJurisdictions.reduce((acc, jurisdiction) => {
        const key = jurisdiction.region ? `${jurisdiction.countryCode}_${jurisdiction.region}` : jurisdiction.countryCode;

        acc[key] = {
          countryCode: jurisdiction.countryCode,
          region: jurisdiction.region,
          currency: jurisdiction.currency,
          taxType: jurisdiction.taxType,
          taxRate: jurisdiction.rate,
          paymentMethods: paymentMethods.getAvailablePaymentMethods(jurisdiction.countryCode)?.availableMethods || []
        };

        return acc;
      }, {} as Record<string, any>);

      const response = {
        success: true,
        supportedCurrencies: currencies,
        supportedRegions: Object.keys(regionData).length,
        regions: regionData,
        globalPaymentMethods: allPaymentMethods.map(method => ({
          method: method.method,
          displayName: method.displayName,
          description: method.description,
          supportedCurrencies: method.supportedCurrencies,
          supportedCountries: method.supportedCountries.length > 10 ? ['*'] : method.supportedCountries,
          provider: method.provider
        }))
      };

      logger.info('Supported regions data retrieved', {
        userId: request.auth.uid,
        currencyCount: currencies.length,
        regionCount: Object.keys(regionData).length,
        paymentMethodCount: allPaymentMethods.length
      });

      return response;

    } catch (error) {
      logger.error('Failed to get supported regions', { error });

      if (error instanceof https.HttpsError) {
        throw error;
      }

      throw new https.HttpsError(
        'internal',
        'Failed to retrieve supported regions',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Validate VAT number for EU businesses
  */
export const validateVATNumber = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { vatNumber, countryCode } = request.data;

      if (!vatNumber || !countryCode) {
        throw new https.HttpsError('invalid-argument', 'vatNumber and countryCode are required');
      }

      logger.info('VAT validation request', {
        userId: request.auth.uid,
        countryCode,
        vatNumber: vatNumber.substring(0, 4) + '***' // Log partial VAT for privacy
      });

      const validation = await taxCompliance.validateVATNumber(vatNumber, countryCode);

      logger.info('VAT validation completed', {
        userId: request.auth.uid,
        countryCode,
        valid: validation.valid
      });

      return {
        success: true,
        validation: {
          valid: validation.valid,
          companyName: validation.companyName,
          address: validation.address,
          error: validation.error
        }
      };

    } catch (error) {
      logger.error('VAT validation failed', { error, data: request.data });

      if (error instanceof https.HttpsError) {
        throw error;
      }

      throw new https.HttpsError(
        'internal',
        'Failed to validate VAT number',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Assess transaction fraud risk
  */
export const assessFraudRisk = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const transactionProfile = request.data as TransactionRiskProfile;

      if (!transactionProfile.transactionId || !transactionProfile.amount) {
        throw new https.HttpsError('invalid-argument', 'transactionId and amount are required');
      }

      // Ensure the authenticated user matches the profile
      if (transactionProfile.customerId !== request.auth.uid) {
        throw new https.HttpsError('permission-denied', 'Customer ID mismatch');
      }

      logger.info('Fraud risk assessment request', {
        transactionId: transactionProfile.transactionId,
        customerId: transactionProfile.customerId,
        amount: transactionProfile.amount
      });

      const riskAssessment = await fraudPrevention.assessTransactionRisk(transactionProfile);

      // Don't return sensitive fraud detection details to client
      const safeAssessment = {
        riskLevel: riskAssessment.riskLevel,
        decision: riskAssessment.decision,
        reviewRequired: riskAssessment.reviewRequired,
        additionalVerificationNeeded: riskAssessment.additionalVerificationNeeded,
        recommendation: riskAssessment.decision === 'decline'
          ? 'Transaction cannot be processed at this time'
          : riskAssessment.decision === 'review'
          ? 'Additional verification may be required'
          : 'Transaction approved for processing'
      };

      logger.info('Fraud risk assessment completed', {
        transactionId: transactionProfile.transactionId,
        riskLevel: riskAssessment.riskLevel,
        decision: riskAssessment.decision,
        indicatorCount: riskAssessment.indicators.length
      });

      return {
        success: true,
        assessment: safeAssessment
      };

    } catch (error) {
      logger.error('Fraud risk assessment failed', { error });

      if (error instanceof https.HttpsError) {
        throw error;
      }

      throw new https.HttpsError(
        'internal',
        'Failed to assess fraud risk',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Convert currency amounts
  */
export const convertCurrency = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { amount, fromCurrency, toCurrency, includeFees = false } = request.data;

      if (!amount || !fromCurrency || !toCurrency) {
        throw new https.HttpsError('invalid-argument', 'amount, fromCurrency, and toCurrency are required');
      }

      logger.info('Currency conversion request', {
        userId: request.auth.uid,
        amount,
        fromCurrency,
        toCurrency,
        includeFees
      });

      const conversion = await currencyManager.convertCurrency(
        amount,
        fromCurrency as SupportedCurrency,
        toCurrency as SupportedCurrency,
        includeFees
      );

      logger.info('Currency conversion completed', {
        userId: request.auth.uid,
        fromAmount: conversion.amount,
        toAmount: conversion.convertedAmount,
        exchangeRate: conversion.exchangeRate
      });

      return {
        success: true,
        conversion: {
          fromCurrency: conversion.fromCurrency,
          toCurrency: conversion.toCurrency,
          amount: conversion.amount,
          convertedAmount: conversion.convertedAmount,
          exchangeRate: conversion.exchangeRate,
          fees: conversion.fees,
          timestamp: conversion.timestamp
        }
      };

    } catch (error) {
      logger.error('Currency conversion failed', { error, data: request.data });

      if (error instanceof https.HttpsError) {
        throw error;
      }

      throw new https.HttpsError(
        'internal',
        'Failed to convert currency',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get global payment system health status
  */
export const globalPaymentsHealthCheck = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      // Admin-only function
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      // In production, would check admin permissions
      logger.info('Global payments health check request', {
        userId: request.auth.uid
      });

      const [currencyHealth, taxHealth, paymentMethodsHealth, fraudHealth] = await Promise.all([
        currencyManager.healthCheck(),
        taxCompliance.healthCheck(),
        paymentMethods.healthCheck(),
        fraudPrevention.healthCheck()
      ]);

      const overallStatus = [currencyHealth, taxHealth, paymentMethodsHealth, fraudHealth]
        .every(h => h.status === 'healthy') ? 'healthy' : 'degraded';

      const response = {
        success: true,
        overallStatus,
        services: {
          currencyManager: currencyHealth,
          taxCompliance: taxHealth,
          paymentMethods: paymentMethodsHealth,
          fraudPrevention: fraudHealth
        },
        timestamp: new Date().toISOString()
      };

      logger.info('Global payments health check completed', {
        userId: request.auth.uid,
        overallStatus
      });

      return response;

    } catch (error) {
      logger.error('Global payments health check failed', { error });

      if (error instanceof https.HttpsError) {
        throw error;
      }

      throw new https.HttpsError(
        'internal',
        'Failed to perform health check',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Generate tax compliance report (Admin only)
  */
export const generateTaxReport = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { startDate, endDate, jurisdiction } = request.data;

      if (!startDate || !endDate) {
        throw new https.HttpsError('invalid-argument', 'startDate and endDate are required');
      }

      logger.info('Tax report generation request', {
        userId: request.auth.uid,
        startDate,
        endDate,
        jurisdiction
      });

      const report = await taxCompliance.generateTaxReport(
        new Date(startDate),
        new Date(endDate),
        jurisdiction
      );

      logger.info('Tax report generated', {
        userId: request.auth.uid,
        totalTransactions: report.totalTransactions,
        totalTaxCollected: report.totalTaxCollected
      });

      return {
        success: true,
        report
      };

    } catch (error) {
      logger.error('Tax report generation failed', { error, data: request.data });

      if (error instanceof https.HttpsError) {
        throw error;
      }

      throw new https.HttpsError(
        'internal',
        'Failed to generate tax report',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get fraud statistics (Admin only)
  */
export const getFraudStatistics = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { startDate, endDate } = request.data;

      if (!startDate || !endDate) {
        throw new https.HttpsError('invalid-argument', 'startDate and endDate are required');
      }

      logger.info('Fraud statistics request', {
        userId: request.auth.uid,
        startDate,
        endDate
      });

      const statistics = await fraudPrevention.getFraudStatistics({
        start: new Date(startDate),
        end: new Date(endDate)
      });

      logger.info('Fraud statistics retrieved', {
        userId: request.auth.uid,
        totalTransactions: statistics.totalTransactions,
        flaggedTransactions: statistics.flaggedTransactions
      });

      return {
        success: true,
        statistics
      };

    } catch (error) {
      logger.error('Failed to get fraud statistics', { error, data: request.data });

      if (error instanceof https.HttpsError) {
        throw error;
      }

      throw new https.HttpsError(
        'internal',
        'Failed to retrieve fraud statistics',
        { originalError: error.message }
      );
    }
  }
);

// Export service instances for testing
export { currencyManager, taxCompliance, paymentMethods, fraudPrevention };