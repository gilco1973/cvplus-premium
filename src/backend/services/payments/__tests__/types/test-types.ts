/**
 * CVPlus Premium Payment Testing Types
 * Phase 2: Comprehensive testing types for payment provider testing
  */

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
  IPaymentProvider,
  PaymentProviderConfig,
  StripeConfig,
  PayPalConfig,
  PaymentProviderFeatures,
  ProviderHealthStatus,
  ProviderMetrics,
  ProviderResponse,
  ProviderError,
  PaymentContext,
} from '../../../types/providers.types';

// =============================================================================
// MOCK PROVIDER TYPES
// =============================================================================

/**
 * Mock Payment Provider for testing with configurable behavior
  */
export interface MockPaymentProvider extends IPaymentProvider {
  // Mock-specific methods
  setMockBehavior(behavior: MockProviderBehavior): void;
  resetMockBehavior(): void;
  getMockCallHistory(): MockCallRecord[];
  clearMockCallHistory(): void;
  simulateError(error: ProviderError): void;
  simulateLatency(ms: number): void;
  simulateHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy'): void;
}

/**
 * Configurable behavior for mock providers
  */
export interface MockProviderBehavior {
  // Success/failure rates
  success_rate?: number; // 0-1, default 1.0
  payment_success_rate?: number; // 0-1, for payment-specific operations
  
  // Latency simulation
  base_latency_ms?: number; // Base response time
  latency_variance_ms?: number; // Random variance
  
  // Error simulation
  errors_to_simulate?: ProviderError[];
  error_probability?: number; // 0-1, chance of error per call
  
  // Health simulation
  health_status?: 'healthy' | 'degraded' | 'unhealthy';
  health_check_latency?: number;
  
  // Feature toggles
  supported_currencies?: string[];
  supported_payment_methods?: PaymentMethod[];
  features_override?: Partial<PaymentProviderFeatures>;
}

/**
 * Record of mock provider method calls for verification
  */
export interface MockCallRecord {
  method_name: string;
  arguments: any[];
  timestamp: Date;
  result?: any;
  error?: Error;
  execution_time_ms: number;
}

/**
 * Mock provider factory for creating test providers
  */
export interface MockProviderFactory {
  createMockStripeProvider(config?: Partial<MockProviderBehavior>): MockPaymentProvider;
  createMockPayPalProvider(config?: Partial<MockProviderBehavior>): MockPaymentProvider;
  createMockProvider(
    providerName: PaymentProviderName,
    config?: Partial<MockProviderBehavior>
  ): MockPaymentProvider;
}

// =============================================================================
// TEST FIXTURE TYPES
// =============================================================================

/**
 * Comprehensive test data fixtures
  */
export interface PaymentTestFixtures {
  customers: TestCustomerFixture[];
  payment_methods: TestPaymentMethodFixture[];
  payment_requests: TestPaymentRequestFixture[];
  payment_contexts: TestPaymentContextFixture[];
  webhooks: TestWebhookFixture[];
  errors: TestErrorFixture[];
}

/**
 * Test customer data
  */
export interface TestCustomerFixture {
  id: string;
  name: string;
  description: string;
  customer_info: CustomerInfo;
  expected_provider_id?: string;
  should_fail?: boolean;
  failure_reason?: string;
}

/**
 * Test payment method data
  */
export interface TestPaymentMethodFixture {
  id: string;
  name: string;
  description: string;
  payment_method: PaymentMethodDetails;
  customer_id: string;
  is_valid: boolean;
  expected_errors?: string[];
}

/**
 * Test payment request data
  */
export interface TestPaymentRequestFixture {
  id: string;
  name: string;
  description: string;
  request: PaymentRequest;
  context: PaymentContext;
  expected_result: Partial<PaymentResult>;
  should_succeed: boolean;
  expected_errors?: string[];
  test_scenarios?: string[];
}

/**
 * Test payment context data
  */
export interface TestPaymentContextFixture {
  id: string;
  name: string;
  description: string;
  context: PaymentContext;
  applicable_providers: PaymentProviderName[];
  risk_level: 'low' | 'medium' | 'high';
  compliance_requirements: string[];
}

/**
 * Test webhook data
  */
export interface TestWebhookFixture {
  id: string;
  name: string;
  description: string;
  provider: PaymentProviderName;
  payload: string;
  signature: string;
  expected_event: Partial<PaymentEvent>;
  is_valid: boolean;
  should_process: boolean;
}

/**
 * Test error scenarios
  */
export interface TestErrorFixture {
  id: string;
  name: string;
  description: string;
  provider: PaymentProviderName;
  error: ProviderError;
  context: PaymentContext;
  expected_classification: {
    severity: string;
    category: string;
    retryable: boolean;
    user_actionable: boolean;
  };
  expected_recovery_strategy?: string;
}

// =============================================================================
// ASSERTION HELPER TYPES
// =============================================================================

/**
 * Type-safe assertion helpers for payment testing
  */
export interface PaymentAssertions {
  // Provider assertions
  assertProviderInitialized(provider: IPaymentProvider): void;
  assertProviderHealthy(provider: IPaymentProvider): Promise<void>;
  assertProviderSupportsMethod(provider: IPaymentProvider, method: PaymentMethod): void;
  assertProviderSupportsCurrency(provider: IPaymentProvider, currency: string): void;
  
  // Payment result assertions
  assertPaymentSucceeded(result: PaymentResult): void;
  assertPaymentFailed(result: PaymentResult, expectedError?: string): void;
  assertPaymentRequiresAction(result: PaymentResult): void;
  
  // Payment intent assertions
  assertPaymentIntentStatus(intent: PaymentIntent, expectedStatus: PaymentStatus): void;
  assertPaymentIntentAmount(intent: PaymentIntent, expectedAmount: number): void;
  assertPaymentIntentCurrency(intent: PaymentIntent, expectedCurrency: string): void;
  
  // Error assertions
  assertProviderError(error: unknown, expectedCode?: string): void;
  assertErrorRetryable(error: ProviderError): void;
  assertErrorNonRetryable(error: ProviderError): void;
  
  // Webhook assertions
  assertWebhookValid(result: WebhookResult): void;
  assertWebhookProcessed(result: WebhookResult): void;
  assertEventType(event: PaymentEvent, expectedType: string): void;
  
  // Performance assertions
  assertResponseTime(startTime: number, maxMs: number): void;
  assertProviderMetrics(metrics: ProviderMetrics, expectations: Partial<ProviderMetrics>): void;
}

/**
 * Mock data builders for creating test data
  */
export interface TestDataBuilder {
  // Customer builders
  buildCustomer(overrides?: Partial<CustomerInfo>): CustomerInfo;
  buildTestCustomer(scenario: CustomerTestScenario): CustomerInfo;
  
  // Payment method builders
  buildPaymentMethod(type: PaymentMethod, overrides?: Partial<PaymentMethodDetails>): PaymentMethodDetails;
  buildCreditCard(overrides?: Partial<CreditCardDetails>): PaymentMethodDetails;
  buildBankAccount(overrides?: Partial<BankAccountDetails>): PaymentMethodDetails;
  
  // Payment request builders
  buildPaymentRequest(overrides?: Partial<PaymentRequest>): PaymentRequest;
  buildLargePayment(amount?: number): PaymentRequest;
  buildInternationalPayment(country: string): PaymentRequest;
  buildSubscriptionPayment(): PaymentRequest;
  
  // Context builders
  buildPaymentContext(overrides?: Partial<PaymentContext>): PaymentContext;
  buildHighRiskContext(): PaymentContext;
  buildCrossBorderContext(): PaymentContext;
  
  // Error builders
  buildProviderError(
    code: string,
    provider: PaymentProviderName,
    overrides?: Partial<ProviderError>
  ): ProviderError;
  buildRetryableError(provider: PaymentProviderName): ProviderError;
  buildNonRetryableError(provider: PaymentProviderName): ProviderError;
  
  // Event builders
  buildPaymentEvent(
    type: string,
    provider: PaymentProviderName,
    overrides?: Partial<PaymentEvent>
  ): PaymentEvent;
  buildWebhookPayload(provider: PaymentProviderName, eventType: string): {
    payload: string;
    signature: string;
  };
}

// =============================================================================
// TEST SCENARIO TYPES
// =============================================================================

/**
 * Predefined test scenarios
  */
export type CustomerTestScenario = 
  | 'valid_us_customer'
  | 'valid_eu_customer'
  | 'high_risk_customer'
  | 'corporate_customer'
  | 'invalid_address'
  | 'missing_required_fields';

export type PaymentTestScenario = 
  | 'simple_payment'
  | 'high_value_payment'
  | 'international_payment'
  | 'declined_payment'
  | 'insufficient_funds'
  | 'expired_card'
  | 'fraudulent_payment'
  | 'subscription_payment'
  | 'recurring_payment';

export type ErrorTestScenario = 
  | 'network_timeout'
  | 'provider_unavailable'
  | 'rate_limited'
  | 'authentication_failed'
  | 'invalid_credentials'
  | 'payment_declined'
  | 'insufficient_funds'
  | 'card_expired'
  | 'fraud_detected';

/**
 * Test suite configuration
  */
export interface PaymentTestSuiteConfig {
  providers_to_test: PaymentProviderName[];
  test_scenarios: PaymentTestScenario[];
  enable_integration_tests: boolean;
  enable_load_tests: boolean;
  enable_error_simulation: boolean;
  max_test_duration_ms?: number;
  parallel_execution?: boolean;
  cleanup_after_tests?: boolean;
}

/**
 * Test environment configuration
  */
export interface PaymentTestEnvironment {
  environment: 'test' | 'staging' | 'development';
  api_endpoints: Record<PaymentProviderName, string>;
  test_credentials: Record<PaymentProviderName, PaymentProviderConfig>;
  webhook_endpoints: Record<PaymentProviderName, string>;
  mock_services?: MockServiceEndpoints;
}

export interface MockServiceEndpoints {
  fraud_detection?: string;
  currency_conversion?: string;
  compliance_check?: string;
  notification_service?: string;
}

// =============================================================================
// PROVIDER STUB TYPES
// =============================================================================

/**
 * Provider stub for testing without actual API calls
  */
export interface PaymentProviderStub extends IPaymentProvider {
  // Stub-specific configuration
  setStubResponse<T>(methodName: string, response: T | (() => T)): void;
  setStubError(methodName: string, error: Error): void;
  setStubLatency(methodName: string, latency: number): void;
  
  // Call tracking
  getCallCount(methodName: string): number;
  getLastCall(methodName: string): { args: any[]; timestamp: Date } | null;
  getAllCalls(methodName: string): Array<{ args: any[]; timestamp: Date }>;
  resetCallHistory(): void;
  
  // State simulation
  simulateProviderState(state: ProviderState): void;
  getSimulatedState(): ProviderState;
}

export interface ProviderState {
  healthy: boolean;
  response_time_ms: number;
  error_rate: number;
  supported_features: PaymentProviderFeatures;
  rate_limit_remaining?: number;
}

// =============================================================================
// PERFORMANCE TESTING TYPES
// =============================================================================

/**
 * Load testing configuration
  */
export interface LoadTestConfig {
  concurrent_users: number;
  requests_per_second: number;
  test_duration_seconds: number;
  ramp_up_seconds: number;
  test_scenarios: LoadTestScenario[];
  success_rate_threshold: number; // Minimum success rate (0-1)
  max_response_time_ms: number; // Maximum acceptable response time
}

export interface LoadTestScenario {
  name: string;
  weight: number; // Percentage of total load
  operation: 'create_payment' | 'confirm_payment' | 'refund_payment' | 'webhook_processing';
  data_generator: () => any;
}

/**
 * Performance test results
  */
export interface PerformanceTestResults {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  average_response_time_ms: number;
  percentile_95_response_time_ms: number;
  percentile_99_response_time_ms: number;
  requests_per_second: number;
  errors_by_type: Record<string, number>;
  provider_performance: Record<PaymentProviderName, ProviderPerformanceMetrics>;
}

export interface ProviderPerformanceMetrics {
  requests: number;
  success_rate: number;
  avg_response_time_ms: number;
  error_count: number;
  error_rate: number;
}

// =============================================================================
// HELPER TYPE DEFINITIONS
// =============================================================================

interface CreditCardDetails {
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
  brand?: string;
}

interface BankAccountDetails {
  account_number: string;
  routing_number: string;
  account_type: 'checking' | 'savings';
  bank_name?: string;
}

// =============================================================================
// EXPORT COLLECTIONS
// =============================================================================

/**
 * Complete test toolkit interface
  */
export interface PaymentTestToolkit {
  mockFactory: MockProviderFactory;
  fixtures: PaymentTestFixtures;
  builders: TestDataBuilder;
  assertions: PaymentAssertions;
  environment: PaymentTestEnvironment;
  config: PaymentTestSuiteConfig;
}

/**
 * Test result aggregation
  */
export interface TestResults {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  success_rate: number;
  total_duration_ms: number;
  test_details: TestDetail[];
  performance_metrics?: PerformanceTestResults;
}

export interface TestDetail {
  test_name: string;
  test_type: 'unit' | 'integration' | 'load' | 'error';
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration_ms: number;
  error_message?: string;
  assertions_count: number;
  provider_tested?: PaymentProviderName;
}