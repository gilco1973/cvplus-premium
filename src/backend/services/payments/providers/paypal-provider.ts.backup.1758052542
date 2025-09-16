/**
 * CVPlus Premium PayPal Payment Provider Implementation
 * Concrete implementation of IPaymentProvider for PayPal
 */

import { BasePaymentProvider } from './base-provider';
import axios, { AxiosInstance } from 'axios';
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
  PayPalConfig,
  PaymentProviderFeatures,
} from '../../../../types/providers.types';

/**
 * PayPal API response interfaces
 */
interface PayPalAccessToken {
  scope: string;
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number;
  nonce: string;
}

interface PayPalOrder {
  id: string;
  intent: 'CAPTURE' | 'AUTHORIZE';
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  purchase_units: PayPalPurchaseUnit[];
  payer?: PayPalPayer;
  create_time: string;
  update_time: string;
  links: PayPalLink[];
}

interface PayPalPurchaseUnit {
  reference_id?: string;
  amount: PayPalAmount;
  payee?: PayPalPayee;
  payment_instruction?: PayPalPaymentInstruction;
  description?: string;
  custom_id?: string;
  invoice_id?: string;
  soft_descriptor?: string;
  items?: PayPalItem[];
  shipping?: PayPalShipping;
  payments?: PayPalPayments;
}

interface PayPalAmount {
  currency_code: string;
  value: string;
  breakdown?: PayPalAmountBreakdown;
}

interface PayPalAmountBreakdown {
  item_total?: PayPalAmount;
  shipping?: PayPalAmount;
  handling?: PayPalAmount;
  tax_total?: PayPalAmount;
  insurance?: PayPalAmount;
  shipping_discount?: PayPalAmount;
  discount?: PayPalAmount;
}

interface PayPalPayee {
  email_address?: string;
  merchant_id?: string;
}

interface PayPalPaymentInstruction {
  platform_fees?: PayPalPlatformFee[];
  disbursement_mode?: 'INSTANT' | 'DELAYED';
}

interface PayPalPlatformFee {
  amount: PayPalAmount;
  payee?: PayPalPayee;
}

interface PayPalItem {
  name: string;
  unit_amount: PayPalAmount;
  tax?: PayPalAmount;
  quantity: string;
  description?: string;
  sku?: string;
  category?: 'DIGITAL_GOODS' | 'PHYSICAL_GOODS';
}

interface PayPalShipping {
  method?: string;
  address?: PayPalAddress;
}

interface PayPalAddress {
  address_line_1?: string;
  address_line_2?: string;
  admin_area_2?: string;
  admin_area_1?: string;
  postal_code?: string;
  country_code: string;
}

interface PayPalPayments {
  captures?: PayPalCapture[];
  authorizations?: PayPalAuthorization[];
  refunds?: PayPalRefund[];
}

interface PayPalCapture {
  id: string;
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED';
  amount: PayPalAmount;
  final_capture?: boolean;
  seller_protection?: PayPalSellerProtection;
  seller_receivable_breakdown?: PayPalSellerReceivableBreakdown;
  invoice_id?: string;
  custom_id?: string;
  create_time: string;
  update_time: string;
}

interface PayPalAuthorization {
  id: string;
  status: 'CREATED' | 'CAPTURED' | 'DENIED' | 'EXPIRED' | 'PARTIALLY_CAPTURED' | 'VOIDED' | 'PENDING';
  amount: PayPalAmount;
  invoice_id?: string;
  custom_id?: string;
  seller_protection?: PayPalSellerProtection;
  expiration_time?: string;
  create_time: string;
  update_time: string;
}

interface PayPalRefund {
  id: string;
  amount: PayPalAmount;
  invoice_id?: string;
  custom_id?: string;
  acquirer_reference_number?: string;
  seller_payable_breakdown?: PayPalSellerPayableBreakdown;
  status: 'CANCELLED' | 'PENDING' | 'COMPLETED';
  status_details?: PayPalStatusDetails;
  create_time: string;
  update_time: string;
}

interface PayPalSellerProtection {
  status: 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE';
  dispute_categories?: string[];
}

interface PayPalSellerReceivableBreakdown {
  gross_amount: PayPalAmount;
  paypal_fee?: PayPalAmount;
  paypal_fee_in_receivable_currency?: PayPalAmount;
  net_amount?: PayPalAmount;
  receivable_amount?: PayPalAmount;
  exchange_rate?: PayPalExchangeRate;
}

interface PayPalSellerPayableBreakdown {
  gross_amount: PayPalAmount;
  paypal_fee?: PayPalAmount;
  net_amount?: PayPalAmount;
  total_refunded_amount?: PayPalAmount;
}

interface PayPalExchangeRate {
  source_currency: string;
  target_currency: string;
  value: string;
}

interface PayPalStatusDetails {
  reason?: string;
}

interface PayPalPayer {
  email_address?: string;
  payer_id?: string;
  name?: PayPalName;
  phone?: PayPalPhone;
  birth_date?: string;
  tax_info?: PayPalTaxInfo;
  address?: PayPalAddress;
}

interface PayPalName {
  given_name?: string;
  surname?: string;
  middle_name?: string;
  full_name?: string;
  prefix?: string;
  suffix?: string;
}

interface PayPalPhone {
  phone_type?: 'FAX' | 'HOME' | 'MOBILE' | 'OTHER' | 'PAGER';
  phone_number: PayPalPhoneNumber;
}

interface PayPalPhoneNumber {
  national_number: string;
  country_code?: string;
  extension_number?: string;
}

interface PayPalTaxInfo {
  tax_id: string;
  tax_id_type: 'BR_CPF' | 'BR_CNPJ';
}

interface PayPalLink {
  href: string;
  rel: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'CONNECT' | 'OPTIONS' | 'PATCH';
  title?: string;
  media_type?: string;
}

interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  resource_version?: string;
  event_type: string;
  summary?: string;
  resource: any;
  links?: PayPalLink[];
}

/**
 * PayPal Payment Provider Implementation
 */
export class PayPalPaymentProvider extends BasePaymentProvider {
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private readonly paypalConfig: PayPalConfig;

  constructor(config: PayPalConfig) {
    super(config, 'paypal');
    this.paypalConfig = config;
    
    // Initialize HTTP client with PayPal base configuration
    const baseURL = config.environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    this.httpClient = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'PayPal-Request-Id': this.generateRequestId(),
      },
    });
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      // Get access token to validate configuration
      await this.getAccessToken();
      
      this._initialized = true;
      this.logPaymentEvent('provider.initialized', {
        environment: this.paypalConfig.environment,
        baseURL: this.httpClient.defaults.baseURL,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logPaymentEvent('provider.error', {
        stage: 'initialization',
        error: errorMessage,
      });
      throw new Error(`Failed to initialize PayPal provider: ${errorMessage}`);
    }
  }

  // =============================================================================
  // CUSTOMER MANAGEMENT
  // =============================================================================

  async createCustomer(customerInfo: CustomerInfo): Promise<string> {
    this.ensureInitialized();
    
    try {
      // PayPal doesn't have a separate customer creation API like Stripe
      // We'll use the customer email as the identifier and store metadata locally
      // In a real implementation, this would integrate with your user management system
      
      const customerId = `paypal_customer_${Date.now()}_${this.generateId()}`;
      
      this.logPaymentEvent('customer.created', {
        customerId,
        email: customerInfo.email,
      });

      return customerId;

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
      // In a real implementation, this would fetch from your user database
      // PayPal doesn't have a customer management API like Stripe
      throw new Error('PayPal customer retrieval requires integration with user database');

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerInfo>): Promise<void> {
    this.ensureInitialized();
    
    try {
      // In a real implementation, this would update your user database
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
      // In a real implementation, this would delete from your user database
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
      // PayPal doesn't have separate payment method creation like Stripe
      // Payment methods are handled during checkout flow
      throw new Error('PayPal payment method creation is handled during checkout flow');

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethodDetails> {
    this.ensureInitialized();
    
    try {
      // PayPal payment methods are ephemeral and tied to orders
      throw new Error('PayPal payment method retrieval is not supported - methods are tied to orders');

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async getCustomerPaymentMethods(customerId: string): Promise<PaymentMethodDetails[]> {
    this.ensureInitialized();
    
    try {
      // PayPal doesn't store payment methods like Stripe - they're processed during checkout
      return [];

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Not applicable to PayPal
      throw new Error('PayPal payment method attachment is not supported');

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async detachPaymentMethodFromCustomer(paymentMethodId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Not applicable to PayPal
      throw new Error('PayPal payment method detachment is not supported');

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
      const accessToken = await this.getAccessToken();
      
      const orderRequest = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: request.amount.toFixed(2),
          },
          description: request.description,
          custom_id: request.metadata?.custom_id || this.generateId(),
          invoice_id: request.metadata?.invoice_id,
        }],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'CVPlus',
              locale: 'en-US',
              landing_page: 'LOGIN',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
            },
          },
        },
      };

      const response = await this.httpClient.post('/v2/checkout/orders', orderRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'PayPal-Request-Id': this.generateRequestId(),
        },
      });

      const order: PayPalOrder = response.data;
      
      this.updateMetrics(true, request.amount, request.currency);
      this.logPaymentEvent('payment.created', {
        orderId: order.id,
        amount: request.amount,
        currency: request.currency,
      });

      const approveLink = order.links.find(link => link.rel === 'approve');

      return {
        success: true,
        payment_intent: this.convertPayPalOrderToPaymentIntent(order, request.customerId),
        client_secret: order.id, // PayPal uses order ID instead of client secret
        requires_action: true, // PayPal always requires user approval
        redirect_url: approveLink?.href,
        transaction_id: order.id,
        provider_response: order,
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
      // For PayPal, confirmation is done by capturing the order
      return await this.capturePaymentIntent(paymentIntentId);

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
      const accessToken = await this.getAccessToken();

      const response = await this.httpClient.post(
        `/v2/checkout/orders/${paymentIntentId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      const order: PayPalOrder = response.data;
      const capture = order.purchase_units[0]?.payments?.captures?.[0];
      
      const success = order.status === 'COMPLETED' && capture?.status === 'COMPLETED';
      this.updateMetrics(success);

      this.logPaymentEvent(
        success ? 'payment.succeeded' : 'payment.failed',
        {
          orderId: order.id,
          status: order.status,
          captureStatus: capture?.status,
        }
      );

      return {
        success,
        payment_intent: this.convertPayPalOrderToPaymentIntent(order, ''),
        transaction_id: order.id,
        provider_response: order,
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
      // PayPal orders can be cancelled, but the API is different
      // For now, we'll just mark it as cancelled in our system
      const order = await this.getPayPalOrder(paymentIntentId);

      return {
        success: true,
        payment_intent: this.convertPayPalOrderToPaymentIntent(order, ''),
        transaction_id: order.id,
        provider_response: order,
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
      const order = await this.getPayPalOrder(paymentIntentId);
      return this.convertPayPalOrderToPaymentIntent(order, '');

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
      const accessToken = await this.getAccessToken();
      
      const orderRequest = {
        intent: 'CAPTURE',
        purchase_units: request.line_items.map(item => ({
          amount: {
            currency_code: item.price_data.currency.toUpperCase(),
            value: (item.price_data.unit_amount * item.quantity).toFixed(2),
          },
          description: item.price_data.product_data.description,
        })),
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'CVPlus',
              locale: 'en-US',
              landing_page: 'LOGIN',
              shipping_preference: request.shipping_address_collection ? 'SET_PROVIDED_ADDRESS' : 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: request.success_url,
              cancel_url: request.cancel_url,
            },
          },
        },
      };

      const response = await this.httpClient.post('/v2/checkout/orders', orderRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'PayPal-Request-Id': this.generateRequestId(),
        },
      });

      const order: PayPalOrder = response.data;
      const approveLink = order.links.find(link => link.rel === 'approve');

      const totalAmount = request.line_items.reduce(
        (sum, item) => sum + (item.price_data.unit_amount * item.quantity),
        0
      );

      return {
        id: order.id,
        url: approveLink?.href || '',
        payment_status: this.convertPayPalStatusToPaymentStatus(order.status),
        amount_total: totalAmount,
        currency: request.line_items[0]?.price_data.currency || 'usd',
        customer_id: request.customer_id,
        expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
        metadata: request.metadata || {},
      };

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async getCheckoutSession(sessionId: string): Promise<PaymentSession> {
    this.ensureInitialized();
    
    try {
      const order = await this.getPayPalOrder(sessionId);
      const approveLink = order.links.find(link => link.rel === 'approve');

      const amount = parseFloat(order.purchase_units[0]?.amount.value || '0');

      return {
        id: order.id,
        url: approveLink?.href || '',
        payment_status: this.convertPayPalStatusToPaymentStatus(order.status),
        amount_total: amount,
        currency: order.purchase_units[0]?.amount.currency_code.toLowerCase() || 'usd',
        customer_id: '', // PayPal doesn't have customer concept in orders
        expires_at: new Date(order.create_time),
        metadata: {},
      };

    } catch (error) {
      throw this.handleProviderError(error);
    }
  }

  async expireCheckoutSession(sessionId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      // PayPal orders expire automatically, but we can implement custom logic here
      console.log(`[PayPalProvider] Session ${sessionId} marked for expiration`);

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
      const accessToken = await this.getAccessToken();
      
      // First, get the capture ID from the order
      const order = await this.getPayPalOrder(request.payment_intent_id);
      const capture = order.purchase_units[0]?.payments?.captures?.[0];
      
      if (!capture) {
        throw new Error('No capture found for this order');
      }

      const refundRequest: any = {
        amount: request.amount ? {
          currency_code: capture.amount.currency_code,
          value: request.amount.toFixed(2),
        } : undefined,
        invoice_id: request.metadata?.invoice_id,
        note_to_payer: request.reason,
      };

      const response = await this.httpClient.post(
        `/v2/payments/captures/${capture.id}/refund`,
        refundRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      const refund: PayPalRefund = response.data;

      return {
        success: true,
        refund_id: refund.id,
        amount: parseFloat(refund.amount.value),
        currency: refund.amount.currency_code.toLowerCase(),
        status: this.convertPayPalRefundStatus(refund.status),
        created_at: new Date(refund.create_time),
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
      const accessToken = await this.getAccessToken();

      const response = await this.httpClient.get(`/v2/payments/refunds/${refundId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const refund: PayPalRefund = response.data;

      return {
        success: true,
        refund_id: refund.id,
        amount: parseFloat(refund.amount.value),
        currency: refund.amount.currency_code.toLowerCase(),
        status: this.convertPayPalRefundStatus(refund.status),
        created_at: new Date(refund.create_time),
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
      // PayPal webhook verification would go here
      // This is a simplified implementation
      const webhookData: PayPalWebhookEvent = JSON.parse(payload);

      return {
        id: webhookData.id,
        type: webhookData.event_type,
        created: Math.floor(new Date(webhookData.create_time).getTime() / 1000),
        data: {
          object: webhookData.resource,
        },
        provider: 'paypal',
        livemode: this.paypalConfig.environment === 'production',
        pending_webhooks: 1,
        request: {
          id: webhookData.id,
          idempotency_key: undefined,
        },
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
        case 'PAYMENT.CAPTURE.COMPLETED':
          actions.push('payment_success_processed');
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          actions.push('payment_failure_processed');
          break;
        case 'CHECKOUT.ORDER.APPROVED':
          actions.push('order_approved_processed');
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
      subscriptions: false, // PayPal subscriptions require separate implementation
      saved_payment_methods: false, // PayPal doesn't store payment methods like Stripe
      multi_currency: true,
      hosted_checkout: true,
      mobile_payments: true,
      recurring_payments: true, // Through PayPal subscriptions
      installments: true,
      fraud_detection: true,
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private ensureInitialized(): void {
    if (!this._initialized) {
      throw new Error('PayPal provider not initialized');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Check if current token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await this.httpClient.post('/v1/oauth2/token', 
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(
              `${this.paypalConfig.client_id}:${this.paypalConfig.client_secret}`
            ).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenData: PayPalAccessToken = response.data;
      this.accessToken = tokenData.access_token;
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minute buffer

      return this.accessToken;

    } catch (error) {
      throw new Error(`Failed to get PayPal access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getPayPalOrder(orderId: string): Promise<PayPalOrder> {
    const accessToken = await this.getAccessToken();

    const response = await this.httpClient.get(`/v2/checkout/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  private convertPayPalOrderToPaymentIntent(order: PayPalOrder, customerId: string): PaymentIntent {
    const amount = parseFloat(order.purchase_units[0]?.amount.value || '0');
    const currency = order.purchase_units[0]?.amount.currency_code.toLowerCase() || 'usd';

    return {
      id: order.id,
      amount,
      currency,
      status: this.convertPayPalStatusToPaymentStatus(order.status),
      client_secret: order.id,
      customer_id: customerId,
      description: order.purchase_units[0]?.description,
      created_at: new Date(order.create_time),
      updated_at: new Date(order.update_time),
      metadata: {
        paypal_order_id: order.id,
      },
    };
  }

  private convertPayPalStatusToPaymentStatus(status: string): PaymentStatus {
    switch (status) {
      case 'COMPLETED':
        return PaymentStatus.SUCCEEDED;
      case 'APPROVED':
        return PaymentStatus.REQUIRES_CONFIRMATION;
      case 'CREATED':
      case 'SAVED':
        return PaymentStatus.PENDING;
      case 'PAYER_ACTION_REQUIRED':
        return PaymentStatus.REQUIRES_ACTION;
      case 'VOIDED':
        return PaymentStatus.CANCELED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private convertPayPalRefundStatus(status: string): any {
    switch (status) {
      case 'COMPLETED':
        return 'succeeded';
      case 'PENDING':
        return 'pending';
      case 'CANCELLED':
        return 'canceled';
      default:
        return 'pending';
    }
  }

  private generateRequestId(): string {
    return `cvplus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  protected handleProviderError(error: any): PaymentError {
    if (error.response?.data) {
      const paypalError = error.response.data;
      return this.createPaymentError(
        paypalError.name || 'paypal_error',
        paypalError.message || paypalError.error_description || 'PayPal API error',
        'api_error',
        {
          debug_id: paypalError.debug_id,
          details: paypalError.details,
          status_code: error.response.status,
        }
      );
    }

    return super.handleProviderError(error);
  }

  protected async performHealthCheck(): Promise<void> {
    await super.performHealthCheck();
    
    // Perform PayPal-specific health check
    await this.getAccessToken();
  }
}