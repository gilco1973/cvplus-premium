/**
 * CVPlus PayPal Mock Provider
 * Mock implementation for testing PayPal integration
 */

import { BasePaymentProvider } from '../providers/base-provider';
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
  PaymentStatus,
} from '../../../types/payments.types';
import {
  PayPalConfig,
  PaymentProviderFeatures,
} from '../../../types/providers.types';

/**
 * Mock PayPal Provider for Testing
 */
export class MockPayPalPaymentProvider extends BasePaymentProvider {
  private mockOrders = new Map<string, any>();
  private mockCustomers = new Map<string, CustomerInfo>();
  private mockRefunds = new Map<string, any>();
  private shouldFailNextOperation = false;
  private simulateLatency = false;

  constructor(config: PayPalConfig) {
    super(config, 'paypal');
  }

  // =============================================================================
  // TEST CONTROL METHODS
  // =============================================================================

  /**
   * Configure the mock to fail the next operation
   */
  public setFailNextOperation(fail: boolean = true): void {
    this.shouldFailNextOperation = fail;
  }

  /**
   * Configure the mock to simulate network latency
   */
  public setSimulateLatency(simulate: boolean = true): void {
    this.simulateLatency = simulate;
  }

  /**
   * Get all mock orders for testing
   */
  public getMockOrders(): Map<string, any> {
    return this.mockOrders;
  }

  /**
   * Clear all mock data
   */
  public clearMockData(): void {
    this.mockOrders.clear();
    this.mockCustomers.clear();
    this.mockRefunds.clear();
    this.shouldFailNextOperation = false;
    this.simulateLatency = false;
  }

  // =============================================================================
  // PROVIDER IMPLEMENTATION
  // =============================================================================

  async initialize(): Promise<void> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock PayPal initialization failed');
    }

    this._initialized = true;
    this.logPaymentEvent('provider.initialized', {
      environment: this.config.environment,
      mock: true,
    });
  }

  async createCustomer(customerInfo: CustomerInfo): Promise<string> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock PayPal customer creation failed');
    }

    const customerId = `mock_paypal_customer_${Date.now()}`;
    this.mockCustomers.set(customerId, customerInfo);
    
    this.logPaymentEvent('customer.created', {
      customerId,
      email: customerInfo.email,
      mock: true,
    });

    return customerId;
  }

  async getCustomer(customerId: string): Promise<CustomerInfo> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock PayPal customer retrieval failed');
    }

    const customer = this.mockCustomers.get(customerId);
    if (!customer) {
      throw new Error(`Mock customer ${customerId} not found`);
    }

    return customer;
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerInfo>): Promise<void> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock PayPal customer update failed');
    }

    const customer = this.mockCustomers.get(customerId);
    if (customer) {
      this.mockCustomers.set(customerId, { ...customer, ...updates });
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock PayPal customer deletion failed');
    }

    this.mockCustomers.delete(customerId);
  }

  // Payment methods (PayPal doesn't store these separately)
  async createPaymentMethod(): Promise<PaymentMethodDetails> {
    throw new Error('PayPal payment method creation is handled during checkout flow');
  }

  async getPaymentMethod(): Promise<PaymentMethodDetails> {
    throw new Error('PayPal payment method retrieval is not supported');
  }

  async getCustomerPaymentMethods(): Promise<PaymentMethodDetails[]> {
    return [];
  }

  async attachPaymentMethodToCustomer(): Promise<void> {
    throw new Error('PayPal payment method attachment is not supported');
  }

  async detachPaymentMethodFromCustomer(): Promise<void> {
    throw new Error('PayPal payment method detachment is not supported');
  }

  async createPaymentIntent(request: PaymentRequest): Promise<PaymentResult> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      return {
        success: false,
        error: {
          code: 'mock_paypal_error',
          message: 'Mock PayPal payment creation failed',
          type: 'api_error',
        },
      };
    }

    const orderId = `MOCK_ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockOrder = {
      id: orderId,
      status: 'CREATED',
      intent: 'CAPTURE',
      amount: request.amount,
      currency: request.currency,
      customerId: request.customerId,
      description: request.description,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: request.metadata,
      approval_url: `https://mock-paypal.com/approve/${orderId}`,
    };

    this.mockOrders.set(orderId, mockOrder);

    const paymentIntent: PaymentIntent = {
      id: orderId,
      amount: request.amount,
      currency: request.currency,
      status: PaymentStatus.REQUIRES_ACTION,
      client_secret: orderId,
      customer_id: request.customerId,
      description: request.description,
      created_at: mockOrder.created_at,
      updated_at: mockOrder.updated_at,
      metadata: request.metadata,
    };

    this.updateMetrics(true, request.amount, request.currency);
    this.logPaymentEvent('payment.created', {
      orderId,
      amount: request.amount,
      currency: request.currency,
      mock: true,
    });

    return {
      success: true,
      payment_intent: paymentIntent,
      client_secret: orderId,
      requires_action: true,
      redirect_url: mockOrder.approval_url,
      transaction_id: orderId,
      provider_response: mockOrder,
    };
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    return this.capturePaymentIntent(paymentIntentId);
  }

  async capturePaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      return {
        success: false,
        error: {
          code: 'mock_paypal_capture_failed',
          message: 'Mock PayPal payment capture failed',
          type: 'api_error',
        },
      };
    }

    const mockOrder = this.mockOrders.get(paymentIntentId);
    if (!mockOrder) {
      return {
        success: false,
        error: {
          code: 'mock_order_not_found',
          message: 'Mock order not found',
          type: 'api_error',
        },
      };
    }

    // Update mock order status
    mockOrder.status = 'COMPLETED';
    mockOrder.captured_at = new Date();
    this.mockOrders.set(paymentIntentId, mockOrder);

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      amount: mockOrder.amount,
      currency: mockOrder.currency,
      status: PaymentStatus.SUCCEEDED,
      client_secret: paymentIntentId,
      customer_id: mockOrder.customerId,
      description: mockOrder.description,
      created_at: mockOrder.created_at,
      updated_at: new Date(),
      metadata: mockOrder.metadata,
    };

    this.updateMetrics(true);
    this.logPaymentEvent('payment.succeeded', {
      orderId: paymentIntentId,
      status: 'COMPLETED',
      mock: true,
    });

    return {
      success: true,
      payment_intent: paymentIntent,
      transaction_id: paymentIntentId,
      provider_response: mockOrder,
    };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    await this.simulateDelay();
    
    const mockOrder = this.mockOrders.get(paymentIntentId);
    if (!mockOrder) {
      return {
        success: false,
        error: {
          code: 'mock_order_not_found',
          message: 'Mock order not found',
          type: 'api_error',
        },
      };
    }

    mockOrder.status = 'VOIDED';
    this.mockOrders.set(paymentIntentId, mockOrder);

    const paymentIntent: PaymentIntent = {
      id: paymentIntentId,
      amount: mockOrder.amount,
      currency: mockOrder.currency,
      status: PaymentStatus.CANCELED,
      client_secret: paymentIntentId,
      customer_id: mockOrder.customerId,
      description: mockOrder.description,
      created_at: mockOrder.created_at,
      updated_at: new Date(),
      metadata: mockOrder.metadata,
    };

    return {
      success: true,
      payment_intent: paymentIntent,
      transaction_id: paymentIntentId,
      provider_response: mockOrder,
    };
  }

  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock PayPal payment intent retrieval failed');
    }

    const mockOrder = this.mockOrders.get(paymentIntentId);
    if (!mockOrder) {
      throw new Error(`Mock order ${paymentIntentId} not found`);
    }

    const statusMap: Record<string, PaymentStatus> = {
      'CREATED': PaymentStatus.PENDING,
      'SAVED': PaymentStatus.PENDING,
      'APPROVED': PaymentStatus.REQUIRES_CONFIRMATION,
      'COMPLETED': PaymentStatus.SUCCEEDED,
      'VOIDED': PaymentStatus.CANCELED,
    };

    return {
      id: paymentIntentId,
      amount: mockOrder.amount,
      currency: mockOrder.currency,
      status: statusMap[mockOrder.status] || PaymentStatus.PENDING,
      client_secret: paymentIntentId,
      customer_id: mockOrder.customerId,
      description: mockOrder.description,
      created_at: mockOrder.created_at,
      updated_at: mockOrder.updated_at,
      metadata: mockOrder.metadata,
    };
  }

  async createCheckoutSession(request: PaymentSessionRequest): Promise<PaymentSession> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock PayPal checkout session creation failed');
    }

    const sessionId = `MOCK_SESSION_${Date.now()}`;
    const totalAmount = request.line_items.reduce(
      (sum, item) => sum + (item.price_data.unit_amount * item.quantity),
      0
    );

    return {
      id: sessionId,
      url: `https://mock-paypal.com/checkout/${sessionId}`,
      payment_status: PaymentStatus.PENDING,
      amount_total: totalAmount,
      currency: request.line_items[0]?.price_data.currency || 'usd',
      customer_id: request.customer_id,
      expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours
      metadata: request.metadata || {},
    };
  }

  async getCheckoutSession(sessionId: string): Promise<PaymentSession> {
    await this.simulateDelay();
    
    // Mock session data
    return {
      id: sessionId,
      url: `https://mock-paypal.com/checkout/${sessionId}`,
      payment_status: PaymentStatus.SUCCEEDED,
      amount_total: 100,
      currency: 'usd',
      customer_id: 'mock_customer',
      expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000),
      metadata: {},
    };
  }

  async expireCheckoutSession(): Promise<void> {
    await this.simulateDelay();
    // Mock implementation - no action needed
  }

  async createRefund(request: RefundRequest): Promise<RefundResult> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      return {
        success: false,
        error: {
          code: 'mock_refund_failed',
          message: 'Mock PayPal refund failed',
          type: 'api_error',
        },
      };
    }

    const mockOrder = this.mockOrders.get(request.payment_intent_id);
    if (!mockOrder) {
      return {
        success: false,
        error: {
          code: 'mock_order_not_found',
          message: 'Mock order not found for refund',
          type: 'api_error',
        },
      };
    }

    const refundId = `MOCK_REFUND_${Date.now()}`;
    const refundAmount = request.amount || mockOrder.amount;
    
    const mockRefund = {
      id: refundId,
      status: 'COMPLETED',
      amount: refundAmount,
      currency: mockOrder.currency,
      payment_intent_id: request.payment_intent_id,
      created_at: new Date(),
    };

    this.mockRefunds.set(refundId, mockRefund);

    return {
      success: true,
      refund_id: refundId,
      amount: refundAmount,
      currency: mockOrder.currency,
      status: 'succeeded',
      created_at: mockRefund.created_at,
    };
  }

  async getRefund(refundId: string): Promise<RefundResult> {
    await this.simulateDelay();
    
    const mockRefund = this.mockRefunds.get(refundId);
    if (!mockRefund) {
      return {
        success: false,
        error: {
          code: 'mock_refund_not_found',
          message: 'Mock refund not found',
          type: 'api_error',
        },
      };
    }

    return {
      success: true,
      refund_id: refundId,
      amount: mockRefund.amount,
      currency: mockRefund.currency,
      status: 'succeeded',
      created_at: mockRefund.created_at,
    };
  }

  async constructWebhookEvent(payload: string): Promise<PaymentEvent> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock webhook event construction failed');
    }

    const webhookData = JSON.parse(payload);
    
    return {
      id: webhookData.id || `mock_event_${Date.now()}`,
      type: webhookData.event_type || 'PAYMENT.CAPTURE.COMPLETED',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: webhookData.resource || {},
      },
      provider: 'paypal',
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: webhookData.id,
      },
    };
  }

  async handleWebhookEvent(event: PaymentEvent): Promise<WebhookResult> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      return {
        received: true,
        processed: false,
        event_id: event.id,
        event_type: event.type,
        error: 'Mock webhook processing failed',
        timestamp: new Date(),
      };
    }

    const actions: string[] = [];
    
    switch (event.type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        actions.push('payment_success_processed');
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        actions.push('payment_failure_processed');
        break;
      default:
        actions.push('event_logged');
    }

    this.logPaymentEvent('webhook.processed', {
      eventId: event.id,
      eventType: event.type,
      actions,
      mock: true,
    });

    return {
      received: true,
      processed: true,
      event_id: event.id,
      event_type: event.type,
      actions_taken: actions,
      timestamp: new Date(),
    };
  }

  getSupportedPaymentMethods(): PaymentMethod[] {
    return [
      PaymentMethod.PAYPAL,
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
    ];
  }

  getSupportedCurrencies(): string[] {
    return [
      'usd', 'eur', 'gbp', 'aud', 'brl', 'cad', 'czk', 'dkk',
      'hkd', 'huf', 'inr', 'ils', 'jpy', 'myr', 'mxn', 'twd',
      'nzd', 'nok', 'php', 'pln', 'rub', 'sgd', 'sek', 'chf',
      'thb', 'try',
    ];
  }

  getFeatures(): PaymentProviderFeatures {
    return {
      webhooks: true,
      refunds: true,
      subscriptions: false,
      saved_payment_methods: false,
      multi_currency: true,
      hosted_checkout: true,
      mobile_payments: true,
      recurring_payments: true,
      installments: true,
      fraud_detection: true,
    };
  }

  protected async performHealthCheck(): Promise<void> {
    await this.simulateDelay();
    
    if (this.shouldFailNextOperation) {
      this.shouldFailNextOperation = false;
      throw new Error('Mock PayPal health check failed');
    }

    // Mock health check always passes
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  private async simulateDelay(): Promise<void> {
    if (this.simulateLatency) {
      const delay = Math.random() * 100 + 50; // 50-150ms delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}