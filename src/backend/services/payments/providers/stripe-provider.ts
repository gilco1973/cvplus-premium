/**
 * CVPlus Premium Stripe Payment Provider Implementation
 * Concrete implementation of IPaymentProvider for Stripe
 */

import Stripe from 'stripe';
import { BasePaymentProvider } from './base-provider';
import {
  PaymentProviderName,
  PaymentMethod,
  PaymentRequest,
  PaymentResult,
  PaymentIntent,
  PaymentEvent,
  WebhookResult,
  RefundRequest,
  RefundResult,
  PaymentSessionRequest,
  PaymentSession,
  CustomerInfo,
  PaymentMethodDetails,
  PaymentError,
  PaymentStatus,
} from '../../../../types/payments.types';
import {
  StripeConfig,
  PaymentProviderFeatures,
} from '../../../../types/providers.types';

/**
 * Stripe Payment Provider Implementation
 */
export class StripePaymentProvider extends BasePaymentProvider {
  private stripe: Stripe | null = null;
  private readonly stripeConfig: StripeConfig;

  constructor(config: StripeConfig) {
    super(config, 'stripe');
    this.stripeConfig = config;
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      this.stripe = new Stripe(this.stripeConfig.secret_key, {
        apiVersion: this.stripeConfig.api_version as Stripe.LatestApiVersion,
        timeout: this.stripeConfig.timeout || 20000,
        maxNetworkRetries: this.stripeConfig.retry_attempts || 3,
      });

      // Test the connection
      await this.stripe.accounts.retrieve();
      
      this._initialized = true;
      this.logPaymentEvent('provider.initialized', {
        environment: this.stripeConfig.environment,
        apiVersion: this.stripeConfig.api_version,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('provider.error', {
        stage: 'initialization',
        error: errorMessage,
      });
      throw new Error(`Failed to initialize Stripe provider: ${errorMessage}`);
    }
  }

  // =============================================================================
  // CUSTOMER MANAGEMENT
  // =============================================================================

  async createCustomer(customerInfo: CustomerInfo): Promise<string> {
    this.ensureInitialized();
    
    try {
      const customer = await this.stripe!.customers.create({
        email: customerInfo.email,
        name: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.address ? {
          line1: customerInfo.address.line1,
          line2: customerInfo.address.line2,
          city: customerInfo.address.city,
          state: customerInfo.address.state,
          postal_code: customerInfo.address.postal_code,
          country: customerInfo.address.country,
        } : undefined,
        metadata: {
          cvplus_user_id: customerInfo.id,
          ...customerInfo.metadata,
        },
      });

      this.logPaymentEvent('customer.created', {
        customerId: customer.id,
        email: customerInfo.email,
      });

      return customer.id;

    } catch (error) {
      const paymentError = this.handleProviderError(error);
      this.logPaymentEvent('customer.creation_failed', {
        email: customerInfo.email,
        error: paymentError.message,
      });
      throw paymentError;
    }
  }

  async getCustomer(customerId: string): Promise<CustomerInfo> {
    this.ensureInitialized();
    
    try {
      const customer = await this.stripe!.customers.retrieve(customerId);
      
      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }

      const stripeCustomer = customer as Stripe.Customer;
      
      return {
        id: stripeCustomer.metadata?.cvplus_user_id || customerId,
        email: stripeCustomer.email || '',
        name: stripeCustomer.name || undefined,
        phone: stripeCustomer.phone || undefined,
        address: stripeCustomer.address ? {
          line1: stripeCustomer.address.line1 || '',
          line2: stripeCustomer.address.line2 || undefined,
          city: stripeCustomer.address.city || '',
          state: stripeCustomer.address.state || '',
          postal_code: stripeCustomer.address.postal_code || '',
          country: stripeCustomer.address.country || '',
        } : undefined,
        metadata: stripeCustomer.metadata,
      };

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerInfo>): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.stripe!.customers.update(customerId, {
        email: updates.email,
        name: updates.name,
        phone: updates.phone,
        address: updates.address ? {
          line1: updates.address.line1,
          line2: updates.address.line2,
          city: updates.address.city,
          state: updates.address.state,
          postal_code: updates.address.postal_code,
          country: updates.address.country,
        } : undefined,
        metadata: updates.metadata,
      });

      this.logPaymentEvent('customer.updated', {
        customerId,
        updatedFields: Object.keys(updates),
      });

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.stripe!.customers.del(customerId);
      
      this.logPaymentEvent('customer.deleted', {
        customerId,
      });

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  // =============================================================================
  // PAYMENT METHODS
  // =============================================================================

  async createPaymentMethod(
    customerId: string, 
    paymentMethodData: Partial<PaymentMethodDetails>
  ): Promise<PaymentMethodDetails> {
    this.ensureInitialized();
    
    try {
      // In a real implementation, you would create payment method
      // This is a simplified version
      throw new Error('Payment method creation not implemented - use Stripe Elements on frontend');

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethodDetails> {
    this.ensureInitialized();
    
    try {
      const paymentMethod = await this.stripe!.paymentMethods.retrieve(paymentMethodId);
      
      return this.convertStripePaymentMethod(paymentMethod);

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async getCustomerPaymentMethods(customerId: string): Promise<PaymentMethodDetails[]> {
    this.ensureInitialized();
    
    try {
      const paymentMethods = await this.stripe!.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => this.convertStripePaymentMethod(pm));

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.stripe!.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async detachPaymentMethodFromCustomer(paymentMethodId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.stripe!.paymentMethods.detach(paymentMethodId);

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  // =============================================================================
  // PAYMENT PROCESSING
  // =============================================================================

  async createPaymentIntent(request: PaymentRequest): Promise<PaymentResult> {
    this.ensureInitialized();
    this.validatePaymentRequest(request);
    
    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        customer: request.customerId,
        description: request.description,
        metadata: request.metadata || {},
      };

      if (request.paymentMethodId) {
        paymentIntentParams.payment_method = request.paymentMethodId;
      }

      if (request.automatic_payment_methods?.enabled) {
        paymentIntentParams.automatic_payment_methods = {
          enabled: true,
          allow_redirects: request.automatic_payment_methods.allow_redirects,
        };
      }

      const paymentIntent = await this.stripe!.paymentIntents.create(paymentIntentParams);
      
      this.updateMetrics(true, request.amount, request.currency);
      this.logPaymentEvent('payment.created', {
        paymentIntentId: paymentIntent.id,
        amount: request.amount,
        currency: request.currency,
      });

      return {
        success: true,
        payment_intent: this.convertStripePaymentIntent(paymentIntent),
        client_secret: paymentIntent.client_secret || undefined,
        requires_action: paymentIntent.status === 'requires_action',
        transaction_id: paymentIntent.id,
        provider_response: paymentIntent,
      };

    } catch (error) {
      this.updateMetrics(false, request.amount, request.currency);
      const paymentError = this.handleProviderError(error);
      
      return {
        success: false,
        error: paymentError,
      };
    }
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentResult> {
    this.ensureInitialized();
    
    try {
      const confirmParams: Stripe.PaymentIntentConfirmParams = {};
      
      if (paymentMethodId) {
        confirmParams.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe!.paymentIntents.confirm(
        paymentIntentId,
        confirmParams
      );

      const success = paymentIntent.status === 'succeeded';
      this.updateMetrics(success);
      
      this.logPaymentEvent(
        success ? 'payment.succeeded' : 'payment.requires_action',
        {
          paymentIntentId,
          status: paymentIntent.status,
        }
      );

      return {
        success,
        payment_intent: this.convertStripePaymentIntent(paymentIntent),
        client_secret: paymentIntent.client_secret || undefined,
        requires_action: paymentIntent.status === 'requires_action',
        redirect_url: paymentIntent.next_action?.redirect_to_url?.url,
        transaction_id: paymentIntent.id,
        provider_response: paymentIntent,
      };

    } catch (error) {
      this.updateMetrics(false);
      const paymentError = this.handleProviderError(error);
      
      return {
        success: false,
        error: paymentError,
      };
    }
  }

  async capturePaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    this.ensureInitialized();
    
    try {
      const paymentIntent = await this.stripe!.paymentIntents.capture(paymentIntentId);
      
      const success = paymentIntent.status === 'succeeded';
      this.updateMetrics(success);

      return {
        success,
        payment_intent: this.convertStripePaymentIntent(paymentIntent),
        transaction_id: paymentIntent.id,
        provider_response: paymentIntent,
      };

    } catch (error) {
      this.updateMetrics(false);
      const paymentError = this.handleProviderError(error);
      
      return {
        success: false,
        error: paymentError,
      };
    }
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    this.ensureInitialized();
    
    try {
      const paymentIntent = await this.stripe!.paymentIntents.cancel(paymentIntentId);

      return {
        success: true,
        payment_intent: this.convertStripePaymentIntent(paymentIntent),
        transaction_id: paymentIntent.id,
        provider_response: paymentIntent,
      };

    } catch (error) {
      const paymentError = this.handleProviderError(error);
      
      return {
        success: false,
        error: paymentError,
      };
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    this.ensureInitialized();
    
    try {
      const paymentIntent = await this.stripe!.paymentIntents.retrieve(paymentIntentId);
      return this.convertStripePaymentIntent(paymentIntent);

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  // =============================================================================
  // CHECKOUT SESSIONS
  // =============================================================================

  async createCheckoutSession(request: PaymentSessionRequest): Promise<PaymentSession> {
    this.ensureInitialized();
    
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: request.mode,
        success_url: request.success_url,
        cancel_url: request.cancel_url,
        customer: request.customer_id,
        metadata: request.metadata || {},
        allow_promotion_codes: request.allow_promotion_codes,
        billing_address_collection: request.billing_address_collection,
        line_items: request.line_items.map(item => ({
          price_data: {
            currency: item.price_data.currency,
            product_data: {
              name: item.price_data.product_data.name,
              description: item.price_data.product_data.description,
            },
            unit_amount: Math.round(item.price_data.unit_amount * 100),
          },
          quantity: item.quantity,
        })),
      };

      if (request.shipping_address_collection) {
        sessionParams.shipping_address_collection = {
          allowed_countries: request.shipping_address_collection.allowed_countries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
        };
      }

      const session = await this.stripe!.checkout.sessions.create(sessionParams);

      return {
        id: session.id,
        url: session.url!,
        payment_status: this.convertStripePaymentStatus(session.payment_status),
        amount_total: (session.amount_total || 0) / 100,
        currency: session.currency || 'usd',
        customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        expires_at: new Date(session.expires_at * 1000),
        metadata: session.metadata || {},
      };

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async getCheckoutSession(sessionId: string): Promise<PaymentSession> {
    this.ensureInitialized();
    
    try {
      const session = await this.stripe!.checkout.sessions.retrieve(sessionId);

      return {
        id: session.id,
        url: session.url || '',
        payment_status: this.convertStripePaymentStatus(session.payment_status),
        amount_total: (session.amount_total || 0) / 100,
        currency: session.currency || 'usd',
        customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        expires_at: new Date(session.expires_at * 1000),
        metadata: session.metadata || {},
      };

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async expireCheckoutSession(sessionId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.stripe!.checkout.sessions.expire(sessionId);

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  // =============================================================================
  // REFUNDS
  // =============================================================================

  async createRefund(request: RefundRequest): Promise<RefundResult> {
    this.ensureInitialized();
    this.validateRefundRequest(request);
    
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: request.payment_intent_id,
        metadata: request.metadata || {},
      };

      if (request.amount) {
        refundParams.amount = Math.round(request.amount * 100);
      }

      if (request.reason) {
        refundParams.reason = request.reason;
      }

      const refund = await this.stripe!.refunds.create(refundParams);

      return {
        success: true,
        refund_id: refund.id,
        amount: (refund.amount || 0) / 100,
        currency: refund.currency,
        status: refund.status as any,
        created_at: new Date(refund.created * 1000),
      };

    } catch (error) {
      const paymentError = this.handleProviderError(error);
      
      return {
        success: false,
        error: paymentError,
      };
    }
  }

  async getRefund(refundId: string): Promise<RefundResult> {
    this.ensureInitialized();
    
    try {
      const refund = await this.stripe!.refunds.retrieve(refundId);

      return {
        success: true,
        refund_id: refund.id,
        amount: (refund.amount || 0) / 100,
        currency: refund.currency,
        status: refund.status as any,
        failure_reason: refund.failure_reason || undefined,
        created_at: new Date(refund.created * 1000),
      };

    } catch (error) {
      const paymentError = this.handleProviderError(error);
      
      return {
        success: false,
        error: paymentError,
      };
    }
  }

  // =============================================================================
  // WEBHOOKS
  // =============================================================================

  async constructWebhookEvent(payload: string, signature: string): Promise<PaymentEvent> {
    this.ensureInitialized();
    
    try {
      const event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        this.stripeConfig.webhook_secret
      );

      return {
        id: event.id,
        type: event.type,
        created: event.created,
        data: event.data,
        provider: 'stripe',
        livemode: event.livemode,
        pending_webhooks: event.pending_webhooks,
        request: event.request || undefined,
      };

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async handleWebhookEvent(event: PaymentEvent): Promise<WebhookResult> {
    this.ensureInitialized();
    
    try {
      const actions: string[] = [];
      
      // Log the webhook event
      this.logPaymentEvent('webhook.received', {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
      });

      // Process the event based on type
      switch (event.type) {
        case 'payment_intent.succeeded':
          actions.push('payment_success_processed');
          break;
        case 'payment_intent.payment_failed':
          actions.push('payment_failure_processed');
          break;
        // Add more event types as needed
      }

      this.logPaymentEvent('webhook.processed', {
        eventId: event.id,
        eventType: event.type,
        actions,
      });

      return {
        received: true,
        processed: true,
        event_id: event.id,
        event_type: event.type,
        actions_taken: actions,
        timestamp: new Date(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        received: true,
        processed: false,
        event_id: event.id,
        event_type: event.type,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  // =============================================================================
  // PROVIDER CAPABILITIES
  // =============================================================================

  getSupportedPaymentMethods(): PaymentMethod[] {
    return [
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.APPLE_PAY,
      PaymentMethod.GOOGLE_PAY,
    ];
  }

  getSupportedCurrencies(): string[] {
    return [
      'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 
      'chf', 'nok', 'sek', 'dkk', 'pln', 'czk',
      'huf', 'bgn', 'hrk', 'ron', 'isk', 'try',
    ];
  }

  getFeatures(): PaymentProviderFeatures {
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
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private ensureInitialized(): void {
    if (!this._initialized || !this.stripe) {
      throw new Error('Stripe provider not initialized');
    }
  }

  private convertStripePaymentIntent(paymentIntent: Stripe.PaymentIntent): PaymentIntent {
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: this.convertStripePaymentStatus(paymentIntent.status),
      client_secret: paymentIntent.client_secret || undefined,
      customer_id: typeof paymentIntent.customer === 'string' 
        ? paymentIntent.customer 
        : paymentIntent.customer?.id || '',
      description: paymentIntent.description || undefined,
      created_at: new Date(paymentIntent.created * 1000),
      updated_at: new Date(), // Stripe doesn't provide updated timestamp
      metadata: paymentIntent.metadata,
    };
  }

  private convertStripePaymentMethod(paymentMethod: Stripe.PaymentMethod): PaymentMethodDetails {
    return {
      id: paymentMethod.id,
      type: PaymentMethod.CREDIT_CARD, // Simplified for now
      card: paymentMethod.card ? {
        last4: paymentMethod.card.last4,
        brand: paymentMethod.card.brand,
        exp_month: paymentMethod.card.exp_month,
        exp_year: paymentMethod.card.exp_year,
      } : undefined,
      billing_details: {
        email: paymentMethod.billing_details.email || undefined,
        name: paymentMethod.billing_details.name || undefined,
        phone: paymentMethod.billing_details.phone || undefined,
        address: paymentMethod.billing_details.address ? {
          line1: paymentMethod.billing_details.address.line1 || '',
          line2: paymentMethod.billing_details.address.line2 || undefined,
          city: paymentMethod.billing_details.address.city || '',
          state: paymentMethod.billing_details.address.state || '',
          postal_code: paymentMethod.billing_details.address.postal_code || '',
          country: paymentMethod.billing_details.address.country || '',
        } : undefined,
      },
      metadata: paymentMethod.metadata,
    };
  }

  private convertStripePaymentStatus(status: string | null): PaymentStatus {
    switch (status) {
      case 'succeeded':
        return PaymentStatus.SUCCEEDED;
      case 'requires_payment_method':
      case 'requires_confirmation':
        return PaymentStatus.REQUIRES_CONFIRMATION;
      case 'requires_action':
        return PaymentStatus.REQUIRES_ACTION;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'canceled':
        return PaymentStatus.CANCELED;
      case 'paid':
        return PaymentStatus.SUCCEEDED;
      case 'unpaid':
        return PaymentStatus.PENDING;
      default:
        return PaymentStatus.PENDING;
    }
  }

  protected handleProviderError(error: any): PaymentError {
    if (error instanceof Stripe.errors.StripeError) {
      return this.createPaymentError(
        error.code || 'stripe_error',
        error.message,
        this.mapStripeErrorType(error.type),
        {
          decline_code: error.decline_code,
          charge_id: error.charge,
          payment_intent_id: error.payment_intent?.id,
          payment_method_id: error.payment_method?.id,
          source: error.source?.id,
        }
      );
    }

    return super.handleProviderError(error);
  }

  private mapStripeErrorType(stripeType: string): PaymentError['type'] {
    switch (stripeType) {
      case 'card_error':
        return 'card_error';
      case 'idempotency_error':
        return 'idempotency_error';
      case 'invalid_request_error':
        return 'invalid_request_error';
      case 'authentication_error':
        return 'authentication_error';
      case 'rate_limit_error':
        return 'rate_limit_error';
      default:
        return 'api_error';
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await super.performHealthCheck();
    
    // Perform Stripe-specific health check
    if (this.stripe) {
      await this.stripe.accounts.retrieve();
    }
  }
}