/**
 * CVPlus Premium Payment Provider Factory
 * Creates and configures payment provider instances
 */

import {
  PaymentProviderName,
  PaymentProviderConfig,
  StripeConfig,
  PayPalConfig,
  IPaymentProvider,
  IPaymentProviderFactory,
  PaymentProviderFeatures,
} from '../../../types/providers.types';
import { StripePaymentProvider } from './providers/stripe-provider';
import { PayPalPaymentProvider } from './providers/paypal-provider';

/**
 * Factory class for creating payment provider instances
 */
export class PaymentProviderFactory implements IPaymentProviderFactory {
  private readonly registeredProviders: Set<PaymentProviderName> = new Set();

  constructor() {
    // Register available providers
    this.registerProviders();
  }

  /**
   * Create a payment provider instance based on configuration
   */
  async createProvider(config: PaymentProviderConfig): Promise<IPaymentProvider> {
    if (!this.registeredProviders.has(config.provider)) {
      throw new Error(`Payment provider '${config.provider}' is not registered`);
    }

    let provider: IPaymentProvider;

    switch (config.provider) {
      case 'stripe':
        provider = new StripePaymentProvider(config as StripeConfig);
        break;

      case 'paypal':
        provider = new PayPalPaymentProvider(config as PayPalConfig);
        break;

      default:
        throw new Error(`Unsupported payment provider: ${config.provider}`);
    }

    // Initialize the provider
    await provider.initialize();

    return provider;
  }

  /**
   * Get list of available payment providers
   */
  getAvailableProviders(): PaymentProviderName[] {
    return Array.from(this.registeredProviders);
  }

  /**
   * Get capabilities of a specific provider
   */
  getProviderCapabilities(provider: PaymentProviderName): PaymentProviderFeatures {
    switch (provider) {
      case 'stripe':
        return {
          webhooks: true,
          refunds: true,
          subscriptions: true,
          saved_payment_methods: true,
          multi_currency: true,
          hosted_checkout: true,
          mobile_payments: true,
          recurring_payments: true,
          installments: true,
          fraud_detection: true,
        };

      case 'paypal':
        return {
          webhooks: true,
          refunds: true,
          subscriptions: false, // PayPal subscriptions require separate implementation
          saved_payment_methods: false, // PayPal doesn't store payment methods like Stripe
          multi_currency: true,
          hosted_checkout: true,
          mobile_payments: true,
          recurring_payments: true, // Through PayPal subscriptions
          installments: true,
          fraud_detection: true,
        };

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Create provider with environment-based configuration
   */
  async createProviderFromEnvironment(providerName: PaymentProviderName): Promise<IPaymentProvider> {
    const config = this.getEnvironmentConfig(providerName);
    return this.createProvider(config);
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: PaymentProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Common validation
    if (!config.provider) {
      errors.push('Provider name is required');
    }

    if (!config.environment || !['sandbox', 'production'].includes(config.environment)) {
      errors.push('Valid environment (sandbox/production) is required');
    }

    // Provider-specific validation
    switch (config.provider) {
      case 'stripe':
        errors.push(...this.validateStripeConfig(config as StripeConfig));
        break;

      case 'paypal':
        errors.push(...this.validatePayPalConfig(config as PayPalConfig));
        break;

      default:
        errors.push(`Unsupported provider: ${config.provider}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Register available payment providers
   */
  private registerProviders(): void {
    this.registeredProviders.add('stripe');
    this.registeredProviders.add('paypal'); // Placeholder for Phase 3
  }

  /**
   * Get configuration from environment variables
   */
  private getEnvironmentConfig(providerName: PaymentProviderName): PaymentProviderConfig {
    switch (providerName) {
      case 'stripe':
        return this.getStripeConfigFromEnvironment();

      case 'paypal':
        return this.getPayPalConfigFromEnvironment();

      default:
        throw new Error(`Environment configuration not available for provider: ${providerName}`);
    }
  }

  /**
   * Get Stripe configuration from environment
   */
  private getStripeConfigFromEnvironment(): StripeConfig {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    if (!publishableKey) {
      throw new Error('STRIPE_PUBLISHABLE_KEY environment variable is required');
    }

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    return {
      provider: 'stripe',
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
      publishable_key: publishableKey,
      secret_key: secretKey,
      webhook_secret: webhookSecret,
      api_version: '2024-06-20',
      timeout: parseInt(process.env.STRIPE_TIMEOUT || '20000'),
      retry_attempts: parseInt(process.env.STRIPE_RETRY_ATTEMPTS || '3'),
    };
  }

  /**
   * Get PayPal configuration from environment (Phase 3 placeholder)
   */
  private getPayPalConfigFromEnvironment(): PayPalConfig {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!clientId) {
      throw new Error('PAYPAL_CLIENT_ID environment variable is required');
    }

    if (!clientSecret) {
      throw new Error('PAYPAL_CLIENT_SECRET environment variable is required');
    }

    if (!webhookId) {
      throw new Error('PAYPAL_WEBHOOK_ID environment variable is required');
    }

    return {
      provider: 'paypal',
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
      client_id: clientId,
      client_secret: clientSecret,
      webhook_id: webhookId,
      timeout: parseInt(process.env.PAYPAL_TIMEOUT || '30000'),
      retry_attempts: parseInt(process.env.PAYPAL_RETRY_ATTEMPTS || '3'),
    };
  }

  /**
   * Validate Stripe configuration
   */
  private validateStripeConfig(config: StripeConfig): string[] {
    const errors: string[] = [];

    if (!config.publishable_key) {
      errors.push('Stripe publishable key is required');
    }

    if (!config.secret_key) {
      errors.push('Stripe secret key is required');
    }

    if (!config.webhook_secret) {
      errors.push('Stripe webhook secret is required');
    }

    if (!config.api_version) {
      errors.push('Stripe API version is required');
    }

    return errors;
  }

  /**
   * Validate PayPal configuration (Phase 3 placeholder)
   */
  private validatePayPalConfig(config: PayPalConfig): string[] {
    const errors: string[] = [];

    if (!config.client_id) {
      errors.push('PayPal client ID is required');
    }

    if (!config.client_secret) {
      errors.push('PayPal client secret is required');
    }

    if (!config.webhook_id) {
      errors.push('PayPal webhook ID is required');
    }

    return errors;
  }
}


// Export singleton instance
export const paymentProviderFactory = new PaymentProviderFactory();