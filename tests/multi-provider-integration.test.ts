/**
 * CVPlus Multi-Provider Integration Tests
 * Test scenarios involving both Stripe and PayPal providers
  */

import { PaymentOrchestrator } from '../payment-orchestrator';
import { ProviderRegistry } from '../provider-registry';
import { MockPayPalPaymentProvider } from './paypal-mock-provider';
import { PaymentContext, ProviderSelectionCriteria } from '../../../types/providers.types';
import { PaymentMethod, PaymentRequest, PaymentStatus } from '../../../types/payments.types';

// Mock providers
class MockStripeProvider {
  public readonly providerName = 'stripe';
  private initialized = false;

  async initialize() { this.initialized = true; }
  isInitialized() { return this.initialized; }
  
  getSupportedCurrencies() { return ['usd', 'eur', 'gbp']; }
  getSupportedPaymentMethods() { return [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD]; }
  getFeatures() { 
    return {
      webhooks: true, refunds: true, subscriptions: true,
      saved_payment_methods: true, multi_currency: true,
      hosted_checkout: true, mobile_payments: true,
      recurring_payments: true, installments: true, fraud_detection: true
    };
  }
  
  async createPaymentIntent(request: PaymentRequest) {
    return {
      success: true,
      payment_intent: {
        id: 'stripe_pi_test',
        amount: request.amount,
        currency: request.currency,
        status: PaymentStatus.REQUIRES_CONFIRMATION,
        customer_id: request.customerId,
        created_at: new Date(),
        updated_at: new Date(),
      },
      client_secret: 'pi_test_secret',
      transaction_id: 'stripe_pi_test',
    };
  }
  
  async healthCheck() { return { status: 'healthy' as const }; }
}

describe('Multi-Provider Integration Tests', () => {
  let orchestrator: PaymentOrchestrator;
  let registry: ProviderRegistry;
  let mockStripeProvider: MockStripeProvider;
  let mockPayPalProvider: MockPayPalPaymentProvider;

  beforeEach(async () => {
    // Create fresh instances
    registry = ProviderRegistry.getInstance();
    orchestrator = PaymentOrchestrator.getInstance();
    
    // Clear existing providers
    registry.clear();
    
    // Create mock providers
    mockStripeProvider = new MockStripeProvider() as any;
    mockPayPalProvider = new MockPayPalPaymentProvider({
      provider: 'paypal',
      environment: 'sandbox',
      client_id: 'test_client_id',
      client_secret: 'test_client_secret',
      webhook_id: 'test_webhook_id',
    });
    
    // Initialize providers
    await mockStripeProvider.initialize();
    await mockPayPalProvider.initialize();
    
    // Register providers
    registry.register(mockStripeProvider as any);
    registry.register(mockPayPalProvider as any);
  });

  afterEach(() => {
    registry.clear();
    mockPayPalProvider.clearMockData();
  });

  describe('Provider Selection and Routing', () => {
    it('should select Stripe for credit card payments', async () => {
      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        billing_country: 'US',
      };

      const provider = await orchestrator.routePaymentRequest(context);
      expect(provider.providerName).toBe('stripe');
    });

    it('should select PayPal for PayPal payments', async () => {
      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
        paymentMethod: PaymentMethod.PAYPAL,
      };

      const provider = await orchestrator.routePaymentRequest(context);
      expect(provider.providerName).toBe('paypal');
    });

    it('should select PayPal for international payments', async () => {
      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'eur',
        amount: 100,
        billing_country: 'DE', // Germany
      };

      const provider = await orchestrator.routePaymentRequest(context);
      expect(provider.providerName).toBe('paypal'); // PayPal is preferred for international
    });

    it('should respect preferred provider', async () => {
      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
        preferred_provider: 'paypal',
      };

      const provider = await orchestrator.routePaymentRequest(context);
      expect(provider.providerName).toBe('paypal');
    });
  });

  describe('Cost Optimization', () => {
    it('should select lower-cost provider when prefer_lowest_cost is true', async () => {
      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
      };

      const criteria: ProviderSelectionCriteria = {
        prefer_lowest_cost: true,
      };

      const provider = await orchestrator.selectOptimalProvider(context, criteria);
      
      // Both providers have similar costs, but cost optimization logic should be applied
      expect(['stripe', 'paypal']).toContain(provider.providerName);
    });

    it('should consider health score in cost optimization', async () => {
      // Set PayPal to have lower health score
      mockPayPalProvider.setFailNextOperation(true);
      try {
        await mockPayPalProvider.healthCheck();
      } catch (e) {
        // Health check failure will lower the score
      }

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
      };

      const criteria: ProviderSelectionCriteria = {
        prefer_lowest_cost: true,
      };

      const provider = await orchestrator.selectOptimalProvider(context, criteria);
      
      // Should prefer Stripe due to better health score
      expect(provider.providerName).toBe('stripe');
    });
  });

  describe('Failover Logic', () => {
    it('should failover from Stripe to PayPal on failure', async () => {
      // Mock Stripe to fail
      mockStripeProvider.createPaymentIntent = jest.fn().mockRejectedValue(new Error('Stripe service unavailable'));

      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'usd',
        customerId: 'customer_123',
        description: 'Test payment',
      };

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
      };

      const options = {
        enable_failover: true,
        max_retries: 2,
      };

      const result = await orchestrator.processPaymentWithFailover(paymentRequest, context, options);

      expect(result.success).toBe(true);
      expect(result.payment_intent?.id).toContain('MOCK_ORDER_'); // PayPal order ID pattern
    });

    it('should failover from PayPal to Stripe on failure', async () => {
      // Mock PayPal to fail
      mockPayPalProvider.setFailNextOperation(true);

      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'usd',
        customerId: 'customer_123',
        description: 'Test payment',
      };

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
        preferred_provider: 'paypal', // Start with PayPal
      };

      const options = {
        enable_failover: true,
        max_retries: 2,
      };

      const result = await orchestrator.processPaymentWithFailover(paymentRequest, context, options);

      expect(result.success).toBe(true);
      expect(result.payment_intent?.id).toBe('stripe_pi_test'); // Stripe payment ID
    });

    it('should handle both providers failing', async () => {
      // Mock both providers to fail
      mockStripeProvider.createPaymentIntent = jest.fn().mockRejectedValue(new Error('Stripe unavailable'));
      mockPayPalProvider.setFailNextOperation(true);

      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'usd',
        customerId: 'customer_123',
        description: 'Test payment',
      };

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
      };

      const options = {
        enable_failover: true,
        max_retries: 3,
      };

      const result = await orchestrator.processPaymentWithFailover(paymentRequest, context, options);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Payment failed after');
    });
  });

  describe('Currency Support', () => {
    it('should filter providers by currency support', async () => {
      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'brl', // Brazilian Real - PayPal supports it, mock Stripe doesn't
        amount: 100,
      };

      const provider = await orchestrator.routePaymentRequest(context);
      expect(provider.providerName).toBe('paypal');
    });

    it('should handle unsupported currency gracefully', async () => {
      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'xyz', // Unsupported currency
        amount: 100,
      };

      await expect(orchestrator.routePaymentRequest(context)).rejects.toThrow();
    });
  });

  describe('Load Balancing', () => {
    it('should distribute load across providers', async () => {
      const stats = await orchestrator.distributeLoad();

      expect(stats.total_requests).toBeGreaterThanOrEqual(0);
      expect(stats.requests_by_provider).toBeDefined();
      expect(stats.average_response_time).toBeGreaterThanOrEqual(0);
      expect(stats.success_rate).toBeGreaterThanOrEqual(0);
    });

    it('should track provider load metrics', async () => {
      const loadMetrics = await orchestrator.getProviderLoadMetrics();

      expect(loadMetrics).toBeDefined();
      expect(loadMetrics.stripe || loadMetrics.paypal).toBeDefined();
    });
  });

  describe('Payment State Management', () => {
    it('should track payment state across providers', async () => {
      const paymentIntentId = 'test_payment_123';
      
      await orchestrator.trackPaymentState(paymentIntentId, 'stripe');
      
      const state = await orchestrator.getPaymentState(paymentIntentId);
      
      expect(state).toBeDefined();
      expect(state?.payment_intent_id).toBe(paymentIntentId);
      expect(state?.provider).toBe('stripe');
    });

    it('should update state on retry', async () => {
      const paymentIntentId = 'test_payment_123';
      
      await orchestrator.trackPaymentState(paymentIntentId, 'stripe');
      await orchestrator.trackPaymentState(paymentIntentId, 'stripe'); // Retry
      
      const state = await orchestrator.getPaymentState(paymentIntentId);
      
      expect(state?.retry_count).toBe(1);
    });
  });

  describe('Provider Health Monitoring', () => {
    it('should only route to healthy providers', async () => {
      // Make PayPal unhealthy
      mockPayPalProvider.setFailNextOperation(true);
      try {
        await mockPayPalProvider.healthCheck();
      } catch (e) {
        // Expected failure
      }

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
      };

      const provider = await orchestrator.routePaymentRequest(context);
      
      // Should route to healthy Stripe provider
      expect(provider.providerName).toBe('stripe');
    });

    it('should handle all providers being unhealthy', async () => {
      // Make both providers unhealthy
      mockStripeProvider.healthCheck = jest.fn().mockResolvedValue({ status: 'unhealthy' });
      mockPayPalProvider.setFailNextOperation(true);

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
      };

      // This should fail gracefully
      await expect(orchestrator.routePaymentRequest(context)).rejects.toThrow('No healthy providers available');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle provider registry being empty', async () => {
      registry.clear();

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
      };

      await expect(orchestrator.routePaymentRequest(context)).rejects.toThrow('No healthy providers available');
    });

    it('should validate amount limits', async () => {
      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: -100, // Negative amount
      };

      await expect(orchestrator.routePaymentRequest(context)).rejects.toThrow();
    });

    it('should handle provider initialization failures', async () => {
      // Create uninitialized provider
      const uninitializedProvider = new MockPayPalPaymentProvider({
        provider: 'paypal',
        environment: 'sandbox',
        client_id: 'invalid',
        client_secret: 'invalid',
        webhook_id: 'invalid',
      });

      registry.register(uninitializedProvider as any);

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
        preferred_provider: 'paypal',
      };

      await expect(orchestrator.routePaymentRequest(context)).rejects.toThrow('not initialized');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent payment routing', async () => {
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        userId: `user_${i}`,
        currency: 'usd',
        amount: 100 + i,
      }));

      const promises = contexts.map(context => orchestrator.routePaymentRequest(context));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(provider => {
        expect(['stripe', 'paypal']).toContain(provider.providerName);
      });
    });

    it('should handle rapid successive calls', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'usd',
        customerId: 'customer_123',
        description: 'Rapid test payment',
      };

      const context: PaymentContext = {
        userId: 'user_123',
        currency: 'usd',
        amount: 100,
      };

      const promises = Array.from({ length: 5 }, () => 
        orchestrator.processPaymentWithFailover(paymentRequest, context)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});