/**
 * CVPlus PayPal Payment Provider Tests
 * Comprehensive test suite for PayPal provider implementation
 */

import { PayPalPaymentProvider } from '../paypal-provider';
import { PayPalConfig, PaymentProviderFeatures } from '../../../../types/providers.types';
import { PaymentRequest, PaymentMethod, CustomerInfo, RefundRequest } from '../../../../types/payments.types';

// Mock axios
jest.mock('axios');
const mockAxios = {
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    defaults: { baseURL: 'https://api-m.sandbox.paypal.com' },
  })),
} as any;

describe('PayPalPaymentProvider', () => {
  let paypalProvider: PayPalPaymentProvider;
  let mockConfig: PayPalConfig;
  let mockHttpClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      defaults: { baseURL: 'https://api-m.sandbox.paypal.com' },
    };
    
    mockAxios.create.mockReturnValue(mockHttpClient);

    // Mock configuration
    mockConfig = {
      provider: 'paypal',
      environment: 'sandbox',
      client_id: 'test_client_id',
      client_secret: 'test_client_secret',
      webhook_id: 'test_webhook_id',
      timeout: 30000,
      retry_attempts: 3,
    };

    paypalProvider = new PayPalPaymentProvider(mockConfig);
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      // Mock access token response
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock_access_token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      await paypalProvider.initialize();

      expect(paypalProvider.isInitialized()).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v1/oauth2/token',
        'grant_type=client_credentials',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should fail initialization with invalid credentials', async () => {
      mockHttpClient.post.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(paypalProvider.initialize()).rejects.toThrow('Failed to initialize PayPal provider: Unauthorized');
      expect(paypalProvider.isInitialized()).toBe(false);
    });
  });

  describe('Customer Management', () => {
    beforeEach(async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { access_token: 'mock_token', expires_in: 3600 },
      });
      await paypalProvider.initialize();
    });

    it('should create a customer (PayPal-style)', async () => {
      const customerInfo: CustomerInfo = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        metadata: { source: 'cvplus' },
      };

      const customerId = await paypalProvider.createCustomer(customerInfo);

      expect(customerId).toMatch(/^paypal_customer_\d+_[a-z0-9]+$/);
    });

    it('should handle customer operations for PayPal model', async () => {
      // PayPal doesn't have traditional customer management
      await expect(paypalProvider.getCustomer('test_id')).rejects.toThrow();
      await paypalProvider.updateCustomer('test_id', { name: 'New Name' }); // Should not throw
      await paypalProvider.deleteCustomer('test_id'); // Should not throw
    });
  });

  describe('Payment Methods', () => {
    beforeEach(async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { access_token: 'mock_token', expires_in: 3600 },
      });
      await paypalProvider.initialize();
    });

    it('should handle payment method operations correctly', async () => {
      // PayPal doesn't store payment methods separately
      await expect(paypalProvider.createPaymentMethod('customer_id', {})).rejects.toThrow();
      await expect(paypalProvider.getPaymentMethod('pm_id')).rejects.toThrow();
      
      const paymentMethods = await paypalProvider.getCustomerPaymentMethods('customer_id');
      expect(paymentMethods).toEqual([]);
    });
  });

  describe('Payment Processing', () => {
    beforeEach(async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { access_token: 'mock_token', expires_in: 3600 },
      });
      await paypalProvider.initialize();
    });

    it('should create payment intent (PayPal order) successfully', async () => {
      const mockOrder = {
        id: 'ORDER_123',
        status: 'CREATED',
        purchase_units: [{
          amount: { currency_code: 'USD', value: '100.00' },
        }],
        links: [
          { rel: 'approve', href: 'https://paypal.com/approve' },
        ],
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString(),
      };

      mockHttpClient.post.mockResolvedValueOnce({ data: mockOrder });

      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        customerId: 'customer_123',
        description: 'Test payment',
        metadata: { test: 'true' },
      };

      const result = await paypalProvider.createPaymentIntent(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment_intent?.id).toBe('ORDER_123');
      expect(result.client_secret).toBe('ORDER_123');
      expect(result.requires_action).toBe(true);
      expect(result.redirect_url).toBe('https://paypal.com/approve');
    });

    it('should capture payment intent successfully', async () => {
      const mockCapturedOrder = {
        id: 'ORDER_123',
        status: 'COMPLETED',
        purchase_units: [{
          payments: {
            captures: [{
              id: 'CAPTURE_123',
              status: 'COMPLETED',
              amount: { currency_code: 'USD', value: '100.00' },
            }],
          },
        }],
      };

      mockHttpClient.post.mockResolvedValueOnce({ data: mockCapturedOrder });

      const result = await paypalProvider.capturePaymentIntent('ORDER_123');

      expect(result.success).toBe(true);
      expect(result.payment_intent?.status).toBe('succeeded');
    });

    it('should handle payment processing errors', async () => {
      mockHttpClient.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            name: 'INVALID_REQUEST',
            message: 'Request is invalid',
            debug_id: 'debug_123',
          },
        },
      });

      const paymentRequest: PaymentRequest = {
        amount: -100, // Invalid amount
        currency: 'USD',
        customerId: 'customer_123',
      };

      const result = await paypalProvider.createPaymentIntent(paymentRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Request is invalid');
    });
  });

  describe('Checkout Sessions', () => {
    beforeEach(async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { access_token: 'mock_token', expires_in: 3600 },
      });
      await paypalProvider.initialize();
    });

    it('should create checkout session', async () => {
      const mockOrder = {
        id: 'ORDER_123',
        status: 'CREATED',
        purchase_units: [{ amount: { currency_code: 'USD', value: '100.00' } }],
        links: [{ rel: 'approve', href: 'https://paypal.com/approve' }],
        create_time: new Date().toISOString(),
      };

      mockHttpClient.post.mockResolvedValueOnce({ data: mockOrder });

      const sessionRequest = {
        mode: 'payment' as const,
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        line_items: [{
          price_data: {
            currency: 'USD',
            unit_amount: 100,
            product_data: {
              name: 'Test Product',
              description: 'Test Description',
            },
          },
          quantity: 1,
        }],
        customer_id: 'customer_123',
      };

      const session = await paypalProvider.createCheckoutSession(sessionRequest);

      expect(session.id).toBe('ORDER_123');
      expect(session.url).toBe('https://paypal.com/approve');
      expect(session.amount_total).toBe(100);
    });
  });

  describe('Refunds', () => {
    beforeEach(async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { access_token: 'mock_token', expires_in: 3600 },
      });
      await paypalProvider.initialize();

      // Mock order retrieval for refunds
      mockHttpClient.get.mockResolvedValue({
        data: {
          id: 'ORDER_123',
          purchase_units: [{
            payments: {
              captures: [{
                id: 'CAPTURE_123',
                amount: { currency_code: 'USD', value: '100.00' },
              }],
            },
          }],
        },
      });
    });

    it('should create refund successfully', async () => {
      const mockRefund = {
        id: 'REFUND_123',
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: '100.00' },
        create_time: new Date().toISOString(),
      };

      mockHttpClient.post.mockResolvedValueOnce({ data: mockRefund });

      const refundRequest: RefundRequest = {
        payment_intent_id: 'ORDER_123',
        amount: 100,
        reason: 'requested_by_customer',
      };

      const result = await paypalProvider.createRefund(refundRequest);

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('REFUND_123');
      expect(result.amount).toBe(100);
    });

    it('should get refund details', async () => {
      const mockRefund = {
        id: 'REFUND_123',
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: '50.00' },
        create_time: new Date().toISOString(),
      };

      mockHttpClient.get.mockResolvedValueOnce({ data: mockRefund });

      const result = await paypalProvider.getRefund('REFUND_123');

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('REFUND_123');
      expect(result.amount).toBe(50);
    });
  });

  describe('Webhooks', () => {
    beforeEach(async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { access_token: 'mock_token', expires_in: 3600 },
      });
      await paypalProvider.initialize();
    });

    it('should construct webhook event', async () => {
      const webhookPayload = JSON.stringify({
        id: 'EVENT_123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        create_time: new Date().toISOString(),
        resource_type: 'capture',
        resource: { id: 'CAPTURE_123' },
      });

      const event = await paypalProvider.constructWebhookEvent(webhookPayload, 'signature');

      expect(event.id).toBe('EVENT_123');
      expect(event.type).toBe('PAYMENT.CAPTURE.COMPLETED');
      expect(event.provider).toBe('paypal');
    });

    it('should handle webhook event', async () => {
      const event = {
        id: 'EVENT_123',
        type: 'PAYMENT.CAPTURE.COMPLETED',
        created: Math.floor(Date.now() / 1000),
        data: { object: { id: 'CAPTURE_123' } },
        provider: 'paypal' as const,
        livemode: false,
        pending_webhooks: 1,
      };

      const result = await paypalProvider.handleWebhookEvent(event);

      expect(result.received).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.actions_taken).toContain('payment_success_processed');
    });
  });

  describe('Provider Capabilities', () => {
    it('should return supported payment methods', () => {
      const methods = paypalProvider.getSupportedPaymentMethods();
      
      expect(methods).toContain(PaymentMethod.PAYPAL);
      expect(methods).toContain(PaymentMethod.CREDIT_CARD);
      expect(methods).toContain(PaymentMethod.DEBIT_CARD);
    });

    it('should return supported currencies', () => {
      const currencies = paypalProvider.getSupportedCurrencies();
      
      expect(currencies).toContain('usd');
      expect(currencies).toContain('eur');
      expect(currencies).toContain('gbp');
      expect(currencies).toContain('aud');
      expect(currencies).toContain('brl');
    });

    it('should return provider features', () => {
      const features: PaymentProviderFeatures = paypalProvider.getFeatures();
      
      expect(features.webhooks).toBe(true);
      expect(features.refunds).toBe(true);
      expect(features.subscriptions).toBe(false); // PayPal subscriptions require separate implementation
      expect(features.saved_payment_methods).toBe(false); // PayPal doesn't store payment methods
      expect(features.multi_currency).toBe(true);
      expect(features.hosted_checkout).toBe(true);
      expect(features.fraud_detection).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { access_token: 'mock_token', expires_in: 3600 },
      });

      await paypalProvider.initialize();

      const health = await paypalProvider.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThan(0);
    });

    it('should report unhealthy status when not initialized', async () => {
      const health = await paypalProvider.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toContain('not initialized');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { access_token: 'mock_token', expires_in: 3600 },
      });
      await paypalProvider.initialize();
    });

    it('should handle PayPal API errors correctly', async () => {
      mockHttpClient.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: {
            name: 'UNPROCESSABLE_ENTITY',
            message: 'The requested action could not be performed',
            debug_id: 'debug_456',
            details: [{ issue: 'INVALID_PARAMETER', description: 'Amount is invalid' }],
          },
        },
      });

      const paymentRequest: PaymentRequest = {
        amount: 0, // Invalid amount
        currency: 'USD',
        customerId: 'customer_123',
      };

      const result = await paypalProvider.createPaymentIntent(paymentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNPROCESSABLE_ENTITY');
      expect(result.error?.message).toContain('The requested action could not be performed');
    });

    it('should handle network errors', async () => {
      mockHttpClient.post.mockRejectedValueOnce(new Error('Network Error'));

      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        customerId: 'customer_123',
      };

      const result = await paypalProvider.createPaymentIntent(paymentRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network Error');
    });
  });
});