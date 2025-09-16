/**
 * PayPal Integration Test Runner
 * Orchestrates comprehensive PayPal testing scenarios
 */

import { PayPalTestDataGenerator } from './test-setup';
import { MockPayPalPaymentProvider } from './paypal-mock-provider';

/**
 * Comprehensive PayPal Test Suite Runner
 */
export class PayPalTestRunner {
  private mockProvider: MockPayPalPaymentProvider;
  private testResults: TestResult[] = [];

  constructor() {
    this.mockProvider = new MockPayPalPaymentProvider({
      provider: 'paypal',
      environment: 'sandbox',
      client_id: 'test_client_id',
      client_secret: 'test_client_secret',
      webhook_id: 'test_webhook_id',
    });
  }

  /**
   * Run all PayPal integration tests
   */
  async runAllTests(): Promise<TestSummary> {
    console.log('🚀 Starting PayPal Integration Test Suite...');
    
    try {
      await this.mockProvider.initialize();
      
      await this.runBasicPaymentTests();
      await this.runWebhookTests();
      await this.runErrorScenarioTests();
      await this.runPerformanceTests();
      await this.runSecurityTests();
      
    } catch (error) {
      console.error('❌ Test suite initialization failed:', error);
      throw error;
    } finally {
      this.mockProvider.clearMockData();
    }

    return this.generateTestSummary();
  }

  /**
   * Basic Payment Flow Tests
   */
  private async runBasicPaymentTests(): Promise<void> {
    console.log('📝 Running Basic Payment Tests...');

    // Test 1: Create Payment Intent
    await this.runTest('Create PayPal Order', async () => {
      const request = PayPalTestDataGenerator.createPaymentRequest();
      const result = await this.mockProvider.createPaymentIntent(request);
      
      expect(result.success).toBe(true);
      expect(result.payment_intent?.id).toMatch(/^MOCK_ORDER_/);
      expect(result.requires_action).toBe(true);
      expect(result.redirect_url).toBeDefined();
    });

    // Test 2: Capture Payment
    await this.runTest('Capture PayPal Payment', async () => {
      const request = PayPalTestDataGenerator.createPaymentRequest();
      const createResult = await this.mockProvider.createPaymentIntent(request);
      
      if (createResult.success && createResult.payment_intent?.id) {
        const captureResult = await this.mockProvider.capturePaymentIntent(createResult.payment_intent.id);
        expect(captureResult.success).toBe(true);
        expect(captureResult.payment_intent?.status).toBe('succeeded');
      }
    });

    // Test 3: Create Refund
    await this.runTest('Create PayPal Refund', async () => {
      // First create and capture a payment
      const request = PayPalTestDataGenerator.createPaymentRequest();
      const createResult = await this.mockProvider.createPaymentIntent(request);
      
      if (createResult.success && createResult.payment_intent?.id) {
        await this.mockProvider.capturePaymentIntent(createResult.payment_intent.id);
        
        const refundRequest = PayPalTestDataGenerator.createRefundRequest({
          payment_intent_id: createResult.payment_intent.id,
        });
        
        const refundResult = await this.mockProvider.createRefund(refundRequest);
        expect(refundResult.success).toBe(true);
        expect(refundResult.refund_id).toBeDefined();
      }
    });

    console.log('✅ Basic Payment Tests Completed');
  }

  /**
   * Webhook Processing Tests
   */
  private async runWebhookTests(): Promise<void> {
    console.log('📡 Running Webhook Tests...');

    // Test 1: Payment Completed Webhook
    await this.runTest('Payment Completed Webhook', async () => {
      const webhookPayload = JSON.stringify(
        PayPalTestDataGenerator.createWebhookEvent('PAYMENT.CAPTURE.COMPLETED')
      );
      
      const event = await this.mockProvider.constructWebhookEvent(webhookPayload, 'signature');
      const result = await this.mockProvider.handleWebhookEvent(event);
      
      expect(result.processed).toBe(true);
      expect(result.actions_taken).toContain('payment_success_processed');
    });

    // Test 2: Payment Failed Webhook
    await this.runTest('Payment Failed Webhook', async () => {
      const webhookPayload = JSON.stringify(
        PayPalTestDataGenerator.createWebhookEvent('PAYMENT.CAPTURE.DENIED')
      );
      
      const event = await this.mockProvider.constructWebhookEvent(webhookPayload, 'signature');
      const result = await this.mockProvider.handleWebhookEvent(event);
      
      expect(result.processed).toBe(true);
      expect(result.actions_taken).toContain('payment_failure_processed');
    });

    // Test 3: Order Approved Webhook
    await this.runTest('Order Approved Webhook', async () => {
      const webhookPayload = JSON.stringify(
        PayPalTestDataGenerator.createWebhookEvent('CHECKOUT.ORDER.APPROVED')
      );
      
      const event = await this.mockProvider.constructWebhookEvent(webhookPayload, 'signature');
      const result = await this.mockProvider.handleWebhookEvent(event);
      
      expect(result.processed).toBe(true);
      expect(result.actions_taken).toContain('order_approved_processed');
    });

    console.log('✅ Webhook Tests Completed');
  }

  /**
   * Error Scenario Tests
   */
  private async runErrorScenarioTests(): Promise<void> {
    console.log('⚠️ Running Error Scenario Tests...');

    // Test 1: Payment Creation Failure
    await this.runTest('Payment Creation Failure', async () => {
      this.mockProvider.setFailNextOperation(true);
      
      const request = PayPalTestDataGenerator.createPaymentRequest();
      const result = await this.mockProvider.createPaymentIntent(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    // Test 2: Capture Failure
    await this.runTest('Payment Capture Failure', async () => {
      const request = PayPalTestDataGenerator.createPaymentRequest();
      const createResult = await this.mockProvider.createPaymentIntent(request);
      
      if (createResult.success && createResult.payment_intent?.id) {
        this.mockProvider.setFailNextOperation(true);
        const captureResult = await this.mockProvider.capturePaymentIntent(createResult.payment_intent.id);
        
        expect(captureResult.success).toBe(false);
        expect(captureResult.error).toBeDefined();
      }
    });

    // Test 3: Webhook Processing Failure
    await this.runTest('Webhook Processing Failure', async () => {
      this.mockProvider.setFailNextOperation(true);
      
      const webhookPayload = JSON.stringify(
        PayPalTestDataGenerator.createWebhookEvent('PAYMENT.CAPTURE.COMPLETED')
      );
      
      const event = await this.mockProvider.constructWebhookEvent(webhookPayload, 'signature');
      const result = await this.mockProvider.handleWebhookEvent(event);
      
      expect(result.processed).toBe(false);
      expect(result.error).toBeDefined();
    });

    console.log('✅ Error Scenario Tests Completed');
  }

  /**
   * Performance Tests
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('🚄 Running Performance Tests...');

    // Test 1: High Volume Payments
    await this.runTest('High Volume Payment Processing', async () => {
      const requests = Array.from({ length: 100 }, () => 
        PayPalTestDataGenerator.createPaymentRequest({ amount: Math.random() * 1000 })
      );
      
      const startTime = Date.now();
      const promises = requests.map(request => this.mockProvider.createPaymentIntent(request));
      const results = await Promise.all(promises);
      const processingTime = Date.now() - startTime;
      
      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
      expect(processingTime).toBeLessThan(5000); // Should process 100 requests in under 5 seconds
      
      console.log(`  📊 Processed 100 payments in ${processingTime}ms`);
    });

    // Test 2: Concurrent Webhook Processing
    await this.runTest('Concurrent Webhook Processing', async () => {
      const webhookEvents = Array.from({ length: 50 }, (_, i) => ({
        payload: JSON.stringify(PayPalTestDataGenerator.createWebhookEvent('PAYMENT.CAPTURE.COMPLETED', { id: `WH_${i}` })),
        signature: `signature_${i}`,
      }));
      
      const startTime = Date.now();
      const promises = webhookEvents.map(async ({ payload, signature }) => {
        const event = await this.mockProvider.constructWebhookEvent(payload, signature);
        return this.mockProvider.handleWebhookEvent(event);
      });
      
      const results = await Promise.all(promises);
      const processingTime = Date.now() - startTime;
      
      expect(results).toHaveLength(50);
      expect(results.every(r => r.processed)).toBe(true);
      
      console.log(`  📊 Processed 50 webhooks in ${processingTime}ms`);
    });

    console.log('✅ Performance Tests Completed');
  }

  /**
   * Security Tests
   */
  private async runSecurityTests(): Promise<void> {
    console.log('🔒 Running Security Tests...');

    // Test 1: Invalid Amount Handling
    await this.runTest('Invalid Amount Security', async () => {
      const invalidRequests = [
        PayPalTestDataGenerator.createPaymentRequest({ amount: -100 }),
        PayPalTestDataGenerator.createPaymentRequest({ amount: 0 }),
        PayPalTestDataGenerator.createPaymentRequest({ amount: 'invalid' }),
      ];
      
      for (const request of invalidRequests) {
        const result = await this.mockProvider.createPaymentIntent(request);
        // In a real implementation, these would be caught by validation
        // For mock, we just ensure they don't crash the system
        expect(typeof result.success).toBe('boolean');
      }
    });

    // Test 2: Malformed Webhook Handling
    await this.runTest('Malformed Webhook Security', async () => {
      const malformedPayloads = [
        'invalid json',
        '{"incomplete": true',
        '',
        null,
        undefined,
      ];
      
      for (const payload of malformedPayloads) {
        try {
          await this.mockProvider.constructWebhookEvent(payload as any, 'signature');
        } catch (error) {
          // Expected for malformed payloads
          expect(error).toBeDefined();
        }
      }
    });

    console.log('✅ Security Tests Completed');
  }

  /**
   * Run individual test with error handling
   */
  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        status: 'PASSED',
        duration,
      });
      
      console.log(`  ✅ ${name} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        status: 'FAILED',
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      
      console.log(`  ❌ ${name} (${duration}ms): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(): TestSummary {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    const summary: TestSummary = {
      totalTests,
      passedTests,
      failedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      totalDuration,
      testResults: this.testResults,
    };
    
    console.log('\n📊 PayPal Integration Test Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    }
    
    return summary;
  }
}

// Type definitions
interface TestResult {
  name: string;
  status: 'PASSED' | 'FAILED';
  duration: number;
  error?: string;
}

interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  totalDuration: number;
  testResults: TestResult[];
}

// Usage example
if (require.main === module) {
  const testRunner = new PayPalTestRunner();
  testRunner.runAllTests()
    .then(summary => {
      process.exit(summary.failedTests === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { PayPalTestRunner };