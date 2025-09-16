/**
 * CVPlus Premium Module - Stripe Integration Service
 * 
 * Secure Stripe API wrapper with comprehensive error handling, retry logic,
 * and PCI compliance best practices
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import Stripe from 'stripe';
import { logger } from '../utils/logger';
import {
  StripeCustomerData,
  StripePaymentIntentConfig,
  StripeSubscriptionConfig,
  StripeCheckoutConfig,
  StripeWebhookHandlerResult,
  StripeErrorContext,
  StripeRetryConfig,
  StripeIdempotencyConfig,
  Environment
} from '../types';
import {
  STRIPE_API_VERSION,
  RETRYABLE_STRIPE_ERRORS,
  PREMIUM_ERROR_CODES,
  ERROR_MESSAGES,
  RATE_LIMITS
} from '../constants/premium.constants';

/**
 * Stripe service configuration
 */
interface StripeServiceConfig {
  secretKey: string;
  webhookSecret: string;
  environment: Environment;
  retry: StripeRetryConfig;
  idempotency: StripeIdempotencyConfig;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: StripeRetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrorCodes: [...RETRYABLE_STRIPE_ERRORS],
  retryableErrorTypes: [
    'StripeConnectionError',
    'StripeAPIError',
    'StripeRateLimitError'
  ]
};

/**
 * Default idempotency configuration
 */
const DEFAULT_IDEMPOTENCY_CONFIG: StripeIdempotencyConfig = {
  enabled: true,
  keyPrefix: 'cvplus',
  keyGenerator: (operation: string, params: any) => {
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${operation}:${JSON.stringify(params)}`)
      .digest('hex')
      .substring(0, 16);
    return `${DEFAULT_IDEMPOTENCY_CONFIG.keyPrefix}:${operation}:${hash}`;
  },
  timeout: 30000
};

/**
 * Comprehensive Stripe integration service with security and reliability features
 */
export class StripeService {
  private stripe: Stripe;
  private config: StripeServiceConfig;
  private rateLimiter: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(config: StripeServiceConfig) {
    this.config = {
      ...config,
      retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
      idempotency: { ...DEFAULT_IDEMPOTENCY_CONFIG, ...config.idempotency }
    };

    this.stripe = new Stripe(config.secretKey, {
      apiVersion: STRIPE_API_VERSION as any,
      typescript: true,
      telemetry: false, // Disable for privacy
      timeout: 20000, // 20 second timeout
      maxNetworkRetries: config.retry.maxAttempts
    });

    logger.info('Stripe service initialized', {
      environment: config.environment,
      apiVersion: STRIPE_API_VERSION
    });
  }

  // =============================================================================
  // CUSTOMER MANAGEMENT
  // =============================================================================

  /**
   * Create or retrieve Stripe customer with idempotency
   */
  async createOrRetrieveCustomer(params: {
    userId: string;
    email: string;
    googleId: string;
    name?: string;
    phone?: string;
    address?: Stripe.AddressParam;
  }): Promise<StripeCustomerData> {
    const operation = 'create_customer';
    
    try {
      await this.checkRateLimit(operation);

      // First, try to find existing customer
      const existingCustomers = await this.executeWithRetry(
        () => this.stripe.customers.list({
          email: params.email,
          limit: 1
        }),
        operation
      );

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        logger.info('Retrieved existing Stripe customer', {
          customerId: customer.id,
          userId: params.userId
        });

        return this.mapStripeCustomer(customer);
      }

      // Create new customer with idempotency
      const idempotencyKey = this.generateIdempotencyKey(operation, params);
      
      const customer = await this.executeWithRetry(
        () => this.stripe.customers.create({
          email: params.email,
          name: params.name,
          phone: params.phone,
          address: params.address,
          metadata: {
            userId: params.userId,
            googleId: params.googleId,
            platform: 'cvplus',
            environment: this.config.environment,
            createdAt: new Date().toISOString()
          }
        }, {
          idempotencyKey
        }),
        operation
      );

      logger.info('Created new Stripe customer', {
        customerId: customer.id,
        userId: params.userId
      });

      return this.mapStripeCustomer(customer);
    } catch (error) {
      logger.error('Failed to create/retrieve customer', {
        error: this.formatStripeError(error),
        userId: params.userId,
        email: params.email
      });
      throw this.wrapStripeError(error, 'Failed to create customer');
    }
  }

  /**
   * Update customer information
   */
  async updateCustomer(customerId: string, updates: {
    name?: string;
    phone?: string;
    email?: string;
    address?: Stripe.AddressParam;
    metadata?: Record<string, string>;
  }): Promise<StripeCustomerData> {
    const operation = 'update_customer';
    
    try {
      await this.checkRateLimit(operation);

      const customer = await this.executeWithRetry(
        () => this.stripe.customers.update(customerId, {
          ...updates,
          metadata: updates.metadata ? {
            ...updates.metadata,
            updatedAt: new Date().toISOString()
          } : undefined
        }),
        operation
      );

      logger.info('Updated Stripe customer', { customerId });
      return this.mapStripeCustomer(customer);
    } catch (error) {
      logger.error('Failed to update customer', {
        error: this.formatStripeError(error),
        customerId
      });
      throw this.wrapStripeError(error, 'Failed to update customer');
    }
  }

  // =============================================================================
  // PAYMENT INTENT MANAGEMENT
  // =============================================================================

  /**
   * Create payment intent with comprehensive configuration
   */
  async createPaymentIntent(config: StripePaymentIntentConfig): Promise<Stripe.PaymentIntent> {
    const operation = 'create_payment_intent';
    
    try {
      await this.checkRateLimit(operation);

      // Validate amount
      if (config.amount < 50) { // Minimum $0.50
        throw new Error('Payment amount too small (minimum $0.50)');
      }

      // Generate idempotency key
      const idempotencyKey = this.generateIdempotencyKey(operation, config);

      const paymentIntent = await this.executeWithRetry(
        () => this.stripe.paymentIntents.create({
          amount: config.amount,
          currency: config.currency.toLowerCase(),
          customer: config.customer,
          description: config.description,
          metadata: {
            ...config.metadata,
            environment: this.config.environment,
            createdAt: new Date().toISOString()
          },
          payment_method_types: config.paymentMethodTypes || ['card'],
          automatic_payment_methods: config.automaticPaymentMethods,
          confirmation_method: config.confirmationMethod || 'automatic',
          capture_method: config.captureMethod || 'automatic',
          receipt_email: config.receiptEmail,
          statement_descriptor: config.statementDescriptor?.substring(0, 22) // Stripe limit
        }, {
          idempotencyKey
        }),
        operation
      );

      logger.info('Created payment intent', {
        paymentIntentId: paymentIntent.id,
        amount: config.amount,
        currency: config.currency,
        customerId: config.customer
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to create payment intent', {
        error: this.formatStripeError(error),
        config: { ...config, metadata: 'redacted' }
      });
      throw this.wrapStripeError(error, 'Failed to create payment intent');
    }
  }

  /**
   * Retrieve payment intent with full details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const operation = 'get_payment_intent';
    
    try {
      await this.checkRateLimit(operation);

      const paymentIntent = await this.executeWithRetry(
        () => this.stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ['customer', 'payment_method']
        }),
        operation
      );

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to retrieve payment intent', {
        error: this.formatStripeError(error),
        paymentIntentId
      });
      throw this.wrapStripeError(error, 'Failed to retrieve payment intent');
    }
  }

  /**
   * Cancel payment intent if possible
   */
  async cancelPaymentIntent(paymentIntentId: string, reason?: string): Promise<Stripe.PaymentIntent> {
    const operation = 'cancel_payment_intent';
    
    try {
      await this.checkRateLimit(operation);

      const paymentIntent = await this.executeWithRetry(
        () => this.stripe.paymentIntents.cancel(paymentIntentId, {
          cancellation_reason: reason as any
        }),
        operation
      );

      logger.info('Cancelled payment intent', { paymentIntentId, reason });
      return paymentIntent;
    } catch (error) {
      logger.error('Failed to cancel payment intent', {
        error: this.formatStripeError(error),
        paymentIntentId
      });
      throw this.wrapStripeError(error, 'Failed to cancel payment intent');
    }
  }

  // =============================================================================
  // CHECKOUT SESSION MANAGEMENT
  // =============================================================================

  /**
   * Create Stripe Checkout session with security best practices
   */
  async createCheckoutSession(config: StripeCheckoutConfig): Promise<any> {
    const operation = 'create_checkout_session';
    
    try {
      await this.checkRateLimit(operation);

      // Validate URLs are HTTPS in production
      if (this.config.environment === 'production') {
        if (!config.successUrl.startsWith('https://') || !config.cancelUrl.startsWith('https://')) {
          throw new Error('URLs must use HTTPS in production');
        }
      }

      const idempotencyKey = this.generateIdempotencyKey(operation, config);

      // Simplified checkout session creation to avoid TypeScript issues
      const sessionParams: any = {
        mode: config.mode,
        line_items: config.lineItems,
        success_url: config.successUrl,
        cancel_url: config.cancelUrl,
        payment_method_types: config.paymentMethodTypes || ['card'],
        metadata: {
          ...config.metadata,
          environment: this.config.environment,
          createdAt: new Date().toISOString()
        }
      };

      if (config.customer) {
        sessionParams.customer = config.customer;
      }

      if (config.customerEmail) {
        sessionParams.customer_email = config.customerEmail;
      }

      const session = await this.executeWithRetry(
        () => this.stripe.checkout.sessions.create(sessionParams),
        operation
      );

      logger.info('Created checkout session', {
        sessionId: session.id,
        mode: config.mode,
        customerId: config.customer
      });

      return session;
    } catch (error) {
      logger.error('Failed to create checkout session', {
        error: this.formatStripeError(error),
        config: { ...config, metadata: 'redacted' }
      });
      throw this.wrapStripeError(error, 'Failed to create checkout session');
    }
  }

  // =============================================================================
  // WEBHOOK PROCESSING
  // =============================================================================

  /**
   * Verify and process Stripe webhook with security validation
   */
  async processWebhook(
    rawBody: string | Buffer,
    signature: string,
    handlers: Record<string, (event: Stripe.Event) => Promise<StripeWebhookHandlerResult>>
  ): Promise<StripeWebhookHandlerResult> {
    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.webhookSecret
      );

      logger.info('Processing Stripe webhook', {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode
      });

      // Check if we have a handler for this event type
      const handler = handlers[event.type];
      if (!handler) {
        logger.info('No handler for webhook event type', { eventType: event.type });
        return {
          processed: false,
          error: `No handler for event type: ${event.type}`
        };
      }

      // Process the event with the appropriate handler
      const result = await handler(event);

      logger.info('Webhook processed successfully', {
        eventId: event.id,
        eventType: event.type,
        processed: result.processed,
        actions: result.actions
      });

      return result;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
        logger.error('Invalid webhook signature', { error: error.message });
        return {
          processed: false,
          error: 'Invalid webhook signature'
        };
      }

      logger.error('Webhook processing failed', {
        error: this.formatStripeError(error)
      });

      return {
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown webhook error'
      };
    }
  }

  // =============================================================================
  // REFUND MANAGEMENT
  // =============================================================================

  /**
   * Process refund with proper validation
   */
  async createRefund(params: {
    paymentIntentId?: string;
    chargeId?: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    const operation = 'create_refund';
    
    try {
      await this.checkRateLimit(operation);

      const refund = await this.executeWithRetry(
        () => this.stripe.refunds.create({
          payment_intent: params.paymentIntentId,
          charge: params.chargeId,
          amount: params.amount,
          reason: params.reason,
          metadata: {
            ...params.metadata,
            environment: this.config.environment,
            processedAt: new Date().toISOString()
          }
        }),
        operation
      );

      logger.info('Created refund', {
        refundId: refund.id,
        paymentIntentId: params.paymentIntentId,
        amount: params.amount,
        reason: params.reason
      });

      return refund;
    } catch (error) {
      logger.error('Failed to create refund', {
        error: this.formatStripeError(error),
        params: { ...params, metadata: 'redacted' }
      });
      throw this.wrapStripeError(error, 'Failed to process refund');
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Execute operation with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        if (attempt === this.config.retry.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.retry.initialDelay * Math.pow(this.config.retry.backoffMultiplier, attempt - 1),
          this.config.retry.maxDelay
        );

        logger.warn(`Retrying ${operationName} (attempt ${attempt}/${this.config.retry.maxAttempts})`, {
          error: this.formatStripeError(error),
          delayMs: delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable based on configuration
   */
  private isRetryableError(error: any): boolean {
    if (error.type && this.config.retry.retryableErrorTypes.includes(error.type)) {
      return true;
    }
    
    if (error.code && this.config.retry.retryableErrorCodes.includes(error.code)) {
      return true;
    }
    
    return false;
  }

  /**
   * Generate idempotency key for operations
   */
  private generateIdempotencyKey(operation: string, params: any): string {
    if (!this.config.idempotency.enabled) {
      return '';
    }
    
    return this.config.idempotency.keyGenerator(operation, params);
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(operation: string): Promise<void> {
    const now = Date.now();
    const key = `${operation}`;
    const limit = RATE_LIMITS.PAYMENT_ATTEMPTS;
    
    let record = this.rateLimiter.get(key);
    
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + (limit.WINDOW_MINUTES * 60 * 1000) };
      this.rateLimiter.set(key, record);
    }
    
    if (record.count >= limit.MAX_ATTEMPTS) {
      throw new Error(`Rate limit exceeded for ${operation}`);
    }
    
    record.count++;
  }

  /**
   * Map Stripe customer to our data structure
   */
  private mapStripeCustomer(customer: Stripe.Customer): StripeCustomerData {
    return {
      id: customer.id,
      email: customer.email || '',
      name: customer.name || undefined,
      phone: customer.phone || undefined,
      address: customer.address || undefined,
      metadata: customer.metadata as any,
      paymentMethods: [], // Would need separate call to populate
      defaultPaymentMethod: (customer as any).default_payment_method || undefined,
      created: customer.created
    };
  }

  /**
   * Format Stripe error for logging (removing sensitive data)
   */
  private formatStripeError(error: any): Record<string, any> {
    if (!error) return {};
    
    return {
      type: error.type,
      code: error.code,
      message: error.message,
      decline_code: error.decline_code,
      statusCode: error.statusCode,
      request_id: error.requestId,
      // Never log raw error data as it might contain sensitive information
      hasRawData: !!error.raw
    };
  }

  /**
   * Wrap Stripe errors with context
   */
  private wrapStripeError(error: any, message: string): StripeErrorContext {
    const wrappedError = new Error(message) as StripeErrorContext;
    
    if (error.type) {
      wrappedError.type = error.type;
      wrappedError.code = error.code;
      wrappedError.decline_code = error.decline_code;
      wrappedError.statusCode = error.statusCode;
      wrappedError.request_id = error.requestId;
      wrappedError.retryable = this.isRetryableError(error);
    }
    
    return wrappedError;
  }
}