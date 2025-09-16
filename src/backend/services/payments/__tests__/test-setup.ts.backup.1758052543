/**
 * Jest Test Setup for PayPal Payment Testing
 * Global test configuration and utilities
 */

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  https: {
    onCall: jest.fn((handler) => handler),
    onRequest: jest.fn((handler) => handler),
  },
  config: jest.fn(() => ({
    paypal: {
      client_id: 'test_client_id',
      client_secret: 'test_client_secret',
      webhook_id: 'test_webhook_id',
    },
    stripe: {
      secret_key: 'sk_test_123',
      publishable_key: 'pk_test_123',
      webhook_secret: 'whsec_test_123',
    },
  })),
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
    batch: jest.fn(),
  })),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

// Mock Axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: {
      baseURL: 'https://api-m.sandbox.paypal.com',
    },
  })),
  post: jest.fn(),
  get: jest.fn(),
}));

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBePayPalOrder(): R;
      toBeValidPaymentResult(): R;
      toBeValidWebhookResult(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBePayPalOrder(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      received.id.startsWith('MOCK_ORDER_') &&
      received.status &&
      received.amount &&
      received.currency;

    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a PayPal order`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a PayPal order`,
        pass: false,
      };
    }
  },

  toBeValidPaymentResult(received: any) {
    const pass = received &&
      typeof received.success === 'boolean' &&
      (received.success || received.error) &&
      (!received.payment_intent || typeof received.payment_intent === 'object');

    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid payment result`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid payment result`,
        pass: false,
      };
    }
  },

  toBeValidWebhookResult(received: any) {
    const pass = received &&
      typeof received.received === 'boolean' &&
      typeof received.processed === 'boolean' &&
      received.event_id &&
      received.event_type &&
      received.timestamp;

    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid webhook result`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid webhook result`,
        pass: false,
      };
    }
  },
});

// Test data generators
export class PayPalTestDataGenerator {
  static createOrderData(overrides: any = {}) {
    return {
      id: `MOCK_ORDER_${Date.now()}`,
      status: 'CREATED',
      intent: 'CAPTURE',
      amount: 100,
      currency: 'USD',
      customerId: 'test_customer_123',
      description: 'Test payment',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: { test: 'true' },
      approval_url: 'https://mock-paypal.com/approve/ORDER_123',
      ...overrides,
    };
  }

  static createPaymentRequest(overrides: any = {}) {
    return {
      amount: 100,
      currency: 'USD',
      customerId: 'test_customer_123',
      description: 'Test payment',
      metadata: { test: 'true' },
      ...overrides,
    };
  }

  static createWebhookEvent(eventType: string = 'PAYMENT.CAPTURE.COMPLETED', overrides: any = {}) {
    return {
      id: `WH_${Date.now()}`,
      event_type: eventType,
      create_time: new Date().toISOString(),
      resource_type: 'capture',
      resource: {
        id: `CAPTURE_${Date.now()}`,
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: '100.00' },
      },
      ...overrides,
    };
  }

  static createCustomerInfo(overrides: any = {}) {
    return {
      id: 'test_customer_123',
      email: 'test@example.com',
      name: 'Test Customer',
      phone: '+1234567890',
      metadata: { source: 'test' },
      ...overrides,
    };
  }

  static createRefundRequest(overrides: any = {}) {
    return {
      payment_intent_id: 'ORDER_123',
      amount: 50,
      reason: 'requested_by_customer',
      metadata: { test_refund: 'true' },
      ...overrides,
    };
  }

  static createPaymentContext(overrides: any = {}) {
    return {
      userId: 'user_123',
      currency: 'USD',
      amount: 100,
      billing_country: 'US',
      metadata: { test: 'true' },
      ...overrides,
    };
  }
}

// Test environment setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset console methods to avoid spam
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Export test utilities
export { PayPalTestDataGenerator };

// Global test timeout
jest.setTimeout(30000);