/**
 * Backend Pricing Configuration System for CVPlus Firebase Functions
 * 
 * This module provides backend pricing configuration that mirrors the frontend
 * pricing system, ensuring consistency across client and server-side pricing.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-20
 */

import { logger } from 'firebase-functions';
import { config } from './environment';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Supported subscription tiers
 */
export type SubscriptionTier = 'FREE' | 'PREMIUM';

/**
 * Supported currencies
 */
export type Currency = 'USD' | 'EUR' | 'GBP';

/**
 * Environment types for different pricing configurations
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Stripe price configuration for different environments
 */
export interface StripePriceConfig {
  /** Development environment price ID */
  development: string;
  /** Staging environment price ID */
  staging: string;
  /** Production environment price ID */
  production: string;
}

/**
 * Price configuration with multiple currency support
 */
export interface PriceConfig {
  /** Price in cents (to avoid floating point issues) */
  cents: number;
  /** Price in dollars (for display) */
  dollars: number;
  /** Currency code */
  currency: Currency;
  /** Stripe price IDs for different environments */
  stripeConfig: StripePriceConfig;
}

/**
 * Complete tier configuration
 */
export interface TierConfig {
  /** Tier identifier */
  tier: SubscriptionTier;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Price configuration */
  price: PriceConfig;
  /** Whether this tier is currently available */
  isActive: boolean;
}

/**
 * Complete pricing configuration
 */
export interface PricingConfig {
  /** All available tiers */
  tiers: Record<SubscriptionTier, TierConfig>;
  /** Default currency */
  defaultCurrency: Currency;
  /** Current environment */
  environment: Environment;
  /** Configuration metadata */
  metadata: {
    version: string;
    lastUpdated: string;
    author: string;
  };
}

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Get current environment from environment variables
 */
const getCurrentEnvironment = (): Environment => {
  const nodeEnv = process.env.NODE_ENV;
  const functionsEmulator = process.env.FUNCTIONS_EMULATOR;
  
  // If running in Firebase emulator
  if (functionsEmulator === 'true' || functionsEmulator === '1') {
    return 'development';
  }
  
  // Standard NODE_ENV mapping
  switch (nodeEnv) {
    case 'development':
      return 'development';
    case 'staging':
      return 'staging';
    case 'production':
      return 'production';
    default:
      return 'development'; // Default fallback
  }
};

/**
 * Stripe Price IDs from secure environment configuration
 */
const getStripePriceIds = (): StripePriceConfig => {
  return {
    development: config.stripe.pricing.priceIdDev || 'price_dev_placeholder',
    staging: config.stripe.pricing.priceIdStaging || 'price_staging_placeholder',
    production: config.stripe.pricing.priceIdProd || 'price_14AfZ9bna72qfXvfxX4F200'
  };
};

// =============================================================================
// PRICING CONFIGURATION
// =============================================================================

/**
 * Main pricing configuration - Single source of truth for backend
 */
export const BACKEND_PRICING_CONFIG: PricingConfig = {
  defaultCurrency: 'USD',
  environment: getCurrentEnvironment(),
  
  metadata: {
    version: '1.0.0',
    lastUpdated: '2025-08-20',
    author: 'Gil Klainert'
  },

  tiers: {
    FREE: {
      tier: 'FREE',
      name: 'Free',
      description: 'Everything you need to create a professional CV with AI enhancement',
      price: {
        cents: 0,
        dollars: 0,
        currency: 'USD',
        stripeConfig: {
          development: '', // No Stripe config for free tier
          staging: '',
          production: ''
        }
      },
      isActive: true
    },

    PREMIUM: {
      tier: 'PREMIUM',
      name: 'Premium',
      description: 'Unlock all premium features with lifetime access - one-time payment',
      price: {
        cents: 4900, // $49.00 in cents
        dollars: 49,
        currency: 'USD',
        stripeConfig: getStripePriceIds()
      },
      isActive: true
    }
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get tier configuration by tier type
 */
export const getTierConfig = (tier: SubscriptionTier): TierConfig => {
  return BACKEND_PRICING_CONFIG.tiers[tier];
};

/**
 * Get Stripe Price ID for current environment
 */
export const getStripePriceId = (tier: SubscriptionTier): string => {
  const config = getTierConfig(tier);
  const environment = BACKEND_PRICING_CONFIG.environment;
  const priceId = config.price.stripeConfig[environment];
  
  if (!priceId || priceId.includes('placeholder')) {
    logger.warn('Using placeholder Stripe price ID', {
      tier,
      environment,
      priceId
    });
  }
  
  return priceId;
};

/**
 * Get price in cents for a specific tier
 */
export const getPriceInCents = (tier: SubscriptionTier): number => {
  return getTierConfig(tier).price.cents;
};

/**
 * Get price in dollars for a specific tier
 */
export const getPriceInDollars = (tier: SubscriptionTier): number => {
  return getTierConfig(tier).price.dollars;
};

/**
 * Format price for display
 */
export const formatPrice = (tier: SubscriptionTier, showCurrency = true): string => {
  const config = getTierConfig(tier);
  
  if (config.price.dollars === 0) {
    return 'Free';
  }
  
  const currencySymbol = config.price.currency === 'USD' ? '$' : 
                        config.price.currency === 'EUR' ? '€' : 
                        config.price.currency === 'GBP' ? '£' : '$';
  
  return showCurrency ? `${currencySymbol}${config.price.dollars}` : config.price.dollars.toString();
};

/**
 * Validate pricing configuration
 */
export const validatePricingConfig = (): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if all tiers have required fields
  Object.values(BACKEND_PRICING_CONFIG.tiers).forEach(tier => {
    if (!tier.name || tier.name.trim() === '') {
      errors.push(`Tier ${tier.tier} is missing name`);
    }
    
    if (tier.tier === 'PREMIUM' && tier.price.cents <= 0) {
      errors.push(`Premium tier must have a positive price`);
    }
  });
  
  // Check if Stripe price IDs are configured for current environment
  const environment = BACKEND_PRICING_CONFIG.environment;
  const premiumConfig = getTierConfig('PREMIUM');
  const priceId = premiumConfig.price.stripeConfig[environment];
  
  if (!priceId || priceId.includes('placeholder')) {
    if (environment === 'production') {
      errors.push(`Production Stripe Price ID is not configured for Premium tier`);
    } else {
      warnings.push(`${environment} Stripe Price ID is not configured for Premium tier`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get pricing summary for logging/debugging
 */
export const getPricingSummary = () => {
  const validation = validatePricingConfig();
  
  return {
    environment: BACKEND_PRICING_CONFIG.environment,
    defaultCurrency: BACKEND_PRICING_CONFIG.defaultCurrency,
    tiers: Object.keys(BACKEND_PRICING_CONFIG.tiers),
    validation,
    metadata: BACKEND_PRICING_CONFIG.metadata,
    stripeConfig: {
      premiumPriceId: getStripePriceId('PREMIUM'),
      premiumPriceCents: getPriceInCents('PREMIUM'),
      premiumPriceDollars: getPriceInDollars('PREMIUM')
    }
  };
};

/**
 * Type guard to check if a tier is premium
 */
export const isPremiumTier = (tier: SubscriptionTier): boolean => {
  return tier === 'PREMIUM';
};

/**
 * Check if pricing is properly configured for current environment
 */
export const isPricingConfigured = (): boolean => {
  const validation = validatePricingConfig();
  return validation.isValid;
};

/**
 * Log pricing configuration status
 */
export const logPricingStatus = (): void => {
  const summary = getPricingSummary();
  
  logger.info('Backend Pricing Configuration Status', {
    summary,
    timestamp: new Date().toISOString()
  });
  
  if (summary.validation.errors.length > 0) {
    logger.error('Pricing configuration errors', {
      errors: summary.validation.errors
    });
  }
  
  if (summary.validation.warnings.length > 0) {
    logger.warn('Pricing configuration warnings', {
      warnings: summary.validation.warnings
    });
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

// Export main configuration as default
export default BACKEND_PRICING_CONFIG;

// Export for backward compatibility
export const LEGACY_PREMIUM_PRICE_CENTS = getPriceInCents('PREMIUM');
export const LEGACY_PREMIUM_PRICE_DOLLARS = getPriceInDollars('PREMIUM');
