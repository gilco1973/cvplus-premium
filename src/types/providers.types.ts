/**
 * CVPlus Premium Payment Provider Abstraction Types
 * Interface contracts for payment provider implementations
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
  PaymentStatus,
  PaymentSessionRequest,
  PaymentSession,
  CustomerInfo,
  PaymentMethodInfo,
  PaymentConfiguration,
} from './payments.types';

// =============================================================================
// PHASE 2: ENHANCED TYPE SYSTEM - Advanced Generic Types & Branded Types
// =============================================================================

// Branded types for type safety
type Brand<T, B> = T & { readonly __brand: B };

// Provider-specific branded types
export type StripeCustomerId = Brand<string, 'StripeCustomerId'>;
export type StripePaymentIntentId = Brand<string, 'StripePaymentIntentId'>;
export type StripePaymentMethodId = Brand<string, 'StripePaymentMethodId'>;
export type PayPalCustomerId = Brand<string, 'PayPalCustomerId'>;
export type PayPalPaymentId = Brand<string, 'PayPalPaymentId'>;
export type PayPalPaymentMethodId = Brand<string, 'PayPalPaymentMethodId'>;

// Generic provider ID types
export type ProviderId<T extends PaymentProviderName> = 
  T extends 'stripe' ? StripeCustomerId | StripePaymentIntentId | StripePaymentMethodId :
  T extends 'paypal' ? PayPalCustomerId | PayPalPaymentId | PayPalPaymentMethodId :
  never;

// Advanced generic response wrapper
export interface ProviderResponse<T, P extends PaymentProviderName> {
  readonly success: boolean;
  readonly data: T;
  readonly provider: P;
  readonly raw_response: Record<string, any>;
  readonly metadata: ProviderResponseMetadata<P>;
  readonly timestamp: Date;
}

// Provider-specific response metadata
export type ProviderResponseMetadata<P extends PaymentProviderName> = 
  P extends 'stripe' ? StripeResponseMetadata :
  P extends 'paypal' ? PayPalResponseMetadata :
  never;

export interface StripeResponseMetadata {
  request_id: string;
  idempotency_key?: string;
  api_version: string;
  livemode: boolean;
}

export interface PayPalResponseMetadata {
  debug_id: string;
  correlation_id?: string;
  api_version?: string;
  environment: 'sandbox' | 'live';
}

// Generic provider capabilities with strict typing
export type ProviderCapabilities<P extends PaymentProviderName> = {
  readonly provider: P;
  readonly features: PaymentProviderFeatures;
  readonly limits: ProviderLimits;
  readonly supported_regions: string[];
  readonly compliance: ComplianceFeatures;
};

// Provider limits with typed constraints
export interface ProviderLimits {
  readonly min_amount: Record<string, number>; // currency -> min amount
  readonly max_amount: Record<string, number>; // currency -> max amount
  readonly daily_limit?: number;
  readonly monthly_limit?: number;
  readonly rate_limits: {
    readonly requests_per_second: number;
    readonly requests_per_minute: number;
    readonly requests_per_hour: number;
  };
}

// Compliance features
export interface ComplianceFeatures {
  readonly pci_dss: boolean;
  readonly gdpr: boolean;
  readonly ccpa: boolean;
  readonly psd2: boolean;
  readonly sox: boolean;
  readonly iso27001: boolean;
}

// Advanced error type hierarchy
export type ProviderErrorCode = 
  | 'PROVIDER_NOT_INITIALIZED'
  | 'PROVIDER_CONFIG_INVALID'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_QUOTA_EXCEEDED'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_INSUFFICIENT_FUNDS'
  | 'PAYMENT_EXPIRED'
  | 'PAYMENT_CANCELLED'
  | 'CUSTOMER_NOT_FOUND'
  | 'PAYMENT_METHOD_INVALID'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'CURRENCY_NOT_SUPPORTED'
  | 'AMOUNT_TOO_SMALL'
  | 'AMOUNT_TOO_LARGE'
  | 'REGION_NOT_SUPPORTED'
  | 'FEATURE_NOT_SUPPORTED';

export interface ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly provider: PaymentProviderName;
  readonly retryable: boolean;
  readonly context?: Record<string, any>;
  readonly original_error?: unknown;
}

// Type-safe error factory
export type CreateProviderError = <P extends PaymentProviderName>(
  provider: P,
  code: ProviderErrorCode,
  message: string,
  options?: {
    retryable?: boolean;
    context?: Record<string, any>;
    original_error?: unknown;
  }
) => ProviderError;

// Configuration validation schema types
export interface ConfigValidationSchema<T> {
  readonly validate: (config: unknown) => config is T;
  readonly errors: (config: unknown) => string[];
  readonly sanitize: (config: unknown) => T;
}

// Runtime type validation helpers
export type TypeGuard<T> = (value: unknown) => value is T;
export type TypeAssertion<T> = (value: unknown) => asserts value is T;

// Base Provider Configuration
export interface ProviderConfig {
  provider: PaymentProviderName;
  environment: 'sandbox' | 'production';
  api_version?: string;
  timeout?: number;
  retry_attempts?: number;
}

// Stripe-specific Configuration
export interface StripeConfig extends ProviderConfig {
  provider: 'stripe';
  publishable_key: string;
  secret_key: string;
  webhook_secret: string;
  api_version: string;
}

// PayPal-specific Configuration
export interface PayPalConfig extends ProviderConfig {
  provider: 'paypal';
  client_id: string;
  client_secret: string;
  webhook_id: string;
}

// Union type for all provider configurations
export type PaymentProviderConfig = StripeConfig | PayPalConfig;

// Main Payment Provider Interface
export interface IPaymentProvider {
  readonly providerName: PaymentProviderName;
  readonly config: PaymentProviderConfig;
  
  // Initialization
  initialize(): Promise<void>;
  isInitialized(): boolean;
  
  // Customer Management
  createCustomer(customerInfo: CustomerInfo): Promise<string>;
  getCustomer(customerId: string): Promise<CustomerInfo>;
  updateCustomer(customerId: string, updates: Partial<CustomerInfo>): Promise<void>;
  deleteCustomer(customerId: string): Promise<void>;
  
  // Payment Methods
  createPaymentMethod(customerId: string, paymentMethodData: Partial<PaymentMethodDetails>): Promise<PaymentMethodDetails>;
  getPaymentMethod(paymentMethodId: string): Promise<PaymentMethodDetails>;
  getCustomerPaymentMethods(customerId: string): Promise<PaymentMethodDetails[]>;
  attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<void>;
  detachPaymentMethodFromCustomer(paymentMethodId: string): Promise<void>;
  
  // Payment Processing
  createPaymentIntent(request: PaymentRequest): Promise<PaymentResult>;
  confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentResult>;
  capturePaymentIntent(paymentIntentId: string): Promise<PaymentResult>;
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentResult>;
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
  
  // Checkout Sessions (for hosted payment pages)
  createCheckoutSession(request: PaymentSessionRequest): Promise<PaymentSession>;
  getCheckoutSession(sessionId: string): Promise<PaymentSession>;
  expireCheckoutSession(sessionId: string): Promise<void>;
  
  // Refunds
  createRefund(request: RefundRequest): Promise<RefundResult>;
  getRefund(refundId: string): Promise<RefundResult>;
  
  // Webhooks
  constructWebhookEvent(payload: string, signature: string): Promise<PaymentEvent>;
  handleWebhookEvent(event: PaymentEvent): Promise<WebhookResult>;
  
  // Health Check
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    error?: string;
  }>;
  
  // Provider-specific capabilities
  getSupportedPaymentMethods(): PaymentMethod[];
  getSupportedCurrencies(): string[];
  getFeatures(): PaymentProviderFeatures;
}

// Provider Features
export interface PaymentProviderFeatures {
  webhooks: boolean;
  refunds: boolean;
  subscriptions: boolean;
  saved_payment_methods: boolean;
  multi_currency: boolean;
  hosted_checkout: boolean;
  mobile_payments: boolean;
  recurring_payments: boolean;
  installments: boolean;
  fraud_detection: boolean;
}

// Provider Factory Interface
export interface IPaymentProviderFactory {
  createProvider(config: PaymentProviderConfig): Promise<IPaymentProvider>;
  getAvailableProviders(): PaymentProviderName[];
  getProviderCapabilities(provider: PaymentProviderName): PaymentProviderFeatures;
}

// Enhanced Provider Registry Interface with Phase 2 features
export interface IPaymentProviderRegistry {
  // Core registry operations
  register(provider: IPaymentProvider): void;
  get(providerName: PaymentProviderName): IPaymentProvider | undefined;
  getAll(): IPaymentProvider[];
  getHealthy(): IPaymentProvider[];
  remove(providerName: PaymentProviderName): void;
  clear(): void;
  
  // Phase 2: Advanced registry features
  isRegistered(providerName: PaymentProviderName): boolean;
  getByCapability<T extends keyof PaymentProviderFeatures>(
    capability: T, 
    value: PaymentProviderFeatures[T]
  ): IPaymentProvider[];
  getByCurrency(currency: string): IPaymentProvider[];
  getByRegion(region: string): IPaymentProvider[];
  
  // Health monitoring integration
  onProviderRegistered(callback: (provider: IPaymentProvider) => void): void;
  onProviderRemoved(callback: (providerName: PaymentProviderName) => void): void;
  onHealthStatusChanged(callback: (status: ProviderHealthStatus) => void): void;
}

// Payment Context (for provider selection and routing)
export interface PaymentContext {
  userId: string;
  subscriptionId?: string;
  planId?: string;
  currency: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  billing_country?: string;
  preferred_provider?: PaymentProviderName;
  metadata?: Record<string, string>;
}

// Provider Selection Strategy
export interface IProviderSelectionStrategy {
  selectProvider(context: PaymentContext, availableProviders: IPaymentProvider[]): Promise<IPaymentProvider>;
}

// Payment Router Interface
export interface IPaymentRouter {
  route(context: PaymentContext): Promise<IPaymentProvider>;
  addProvider(provider: IPaymentProvider): void;
  removeProvider(providerName: PaymentProviderName): void;
  setSelectionStrategy(strategy: IProviderSelectionStrategy): void;
}

// Provider Health Monitor
export interface IProviderHealthMonitor {
  checkHealth(provider: IPaymentProvider): Promise<ProviderHealthStatus>;
  monitorAllProviders(): Promise<ProviderHealthStatus[]>;
  onProviderHealthChange(callback: (status: ProviderHealthStatus) => void): void;
}

export interface ProviderHealthStatus {
  provider: PaymentProviderName;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  error?: string;
  last_checked: Date;
  success_rate: number;
  error_rate: number;
}

// Provider Metrics
export interface ProviderMetrics {
  provider: PaymentProviderName;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  success_rate: number;
  average_processing_time: number;
  total_amount_processed: number;
  currencies_processed: string[];
  last_transaction: Date;
  uptime: number;
}

// Provider Event Types
export type ProviderEventType = 
  | 'provider.initialized'
  | 'provider.error'
  | 'payment.created'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'webhook.received'
  | 'webhook.processed'
  | 'health.check'
  | 'metrics.updated';

// Provider Event
export interface ProviderEvent {
  id: string;
  type: ProviderEventType;
  provider: PaymentProviderName;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: Record<string, string>;
}

// Provider Event Handler
export interface IProviderEventHandler {
  handle(event: ProviderEvent): Promise<void>;
}

// Provider Event Bus
export interface IProviderEventBus {
  emit(event: ProviderEvent): Promise<void>;
  subscribe(eventType: ProviderEventType, handler: IProviderEventHandler): void;
  unsubscribe(eventType: ProviderEventType, handler: IProviderEventHandler): void;
}

// =============================================================================
// PHASE 2: ENHANCED INTERFACES - Configuration, Events, Orchestration
// =============================================================================

// Configuration Manager Interface
export interface IProviderConfigurationManager {
  // Configuration loading and validation
  loadConfig<T extends PaymentProviderConfig>(
    provider: PaymentProviderName,
    environment?: 'sandbox' | 'production'
  ): Promise<T>;
  validateConfig<T extends PaymentProviderConfig>(config: T): ConfigValidationResult<T>;
  sanitizeConfig<T extends PaymentProviderConfig>(config: Partial<T>): T;
  
  // Runtime configuration management
  updateConfig<T extends PaymentProviderConfig>(
    provider: PaymentProviderName,
    updates: Partial<T>
  ): Promise<void>;
  getConfig<T extends PaymentProviderConfig>(provider: PaymentProviderName): T | null;
  reloadConfig(provider: PaymentProviderName): Promise<void>;
  
  // Secrets management
  rotateSecrets(provider: PaymentProviderName): Promise<void>;
  validateSecrets(provider: PaymentProviderName): Promise<boolean>;
  
  // Configuration monitoring
  onConfigChanged(callback: (provider: PaymentProviderName, config: PaymentProviderConfig) => void): void;
  onSecretsRotated(callback: (provider: PaymentProviderName) => void): void;
}

export interface ConfigValidationResult<T> {
  readonly valid: boolean;
  readonly config?: T;
  readonly errors: string[];
  readonly warnings: string[];
}

// Payment Service Orchestrator Interface
export interface IPaymentOrchestrator {
  // Request routing and provider selection
  routePaymentRequest(context: PaymentContext): Promise<IPaymentProvider>;
  selectOptimalProvider(
    context: PaymentContext,
    criteria?: ProviderSelectionCriteria
  ): Promise<IPaymentProvider>;
  
  // Cross-provider operations
  processPaymentWithFailover(
    request: PaymentRequest,
    context: PaymentContext,
    options?: PaymentProcessingOptions
  ): Promise<PaymentResult>;
  
  // State management
  trackPaymentState(paymentIntentId: string, provider: PaymentProviderName): Promise<void>;
  getPaymentState(paymentIntentId: string): Promise<PaymentState | null>;
  
  // Load balancing
  distributeLoad(): Promise<LoadBalancingStats>;
  getProviderLoadMetrics(): Promise<Record<PaymentProviderName, ProviderLoadMetrics>>;
}

export interface ProviderSelectionCriteria {
  readonly prefer_lowest_cost?: boolean;
  readonly prefer_fastest?: boolean;
  readonly require_features?: (keyof PaymentProviderFeatures)[];
  readonly exclude_providers?: PaymentProviderName[];
  readonly require_compliance?: (keyof ComplianceFeatures)[];
  readonly max_failure_rate?: number;
}

export interface PaymentProcessingOptions {
  readonly max_retries?: number;
  readonly retry_delay_ms?: number;
  readonly timeout_ms?: number;
  readonly enable_failover?: boolean;
  readonly fallback_providers?: PaymentProviderName[];
}

export interface PaymentState {
  readonly payment_intent_id: string;
  readonly provider: PaymentProviderName;
  readonly status: PaymentStatus;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly retry_count: number;
  readonly metadata: Record<string, any>;
}

export interface LoadBalancingStats {
  readonly total_requests: number;
  readonly requests_by_provider: Record<PaymentProviderName, number>;
  readonly average_response_time: number;
  readonly success_rate: number;
  readonly last_updated: Date;
}

export interface ProviderLoadMetrics {
  readonly current_requests: number;
  readonly requests_per_minute: number;
  readonly average_response_time_ms: number;
  readonly error_rate: number;
  readonly health_score: number; // 0-1
}

// Enhanced Error Handling Interface
export interface IPaymentErrorHandler {
  // Error classification and handling
  handleError(error: unknown, context: PaymentContext): Promise<PaymentErrorHandlingResult>;
  classifyError(error: unknown): PaymentErrorClassification;
  
  // Recovery strategies
  executeRecoveryStrategy(
    error: ProviderError,
    strategy: ErrorRecoveryStrategy,
    context: PaymentContext
  ): Promise<PaymentResult>;
  
  // Error reporting and analytics
  reportError(error: ProviderError, context: PaymentContext): Promise<void>;
  getErrorStats(
    provider?: PaymentProviderName,
    timeRange?: DateRange
  ): Promise<ErrorStats>;
}

export interface PaymentErrorHandlingResult {
  readonly handled: boolean;
  readonly recovery_attempted: boolean;
  readonly recovery_successful?: boolean;
  readonly fallback_provider?: PaymentProviderName;
  readonly retry_recommended: boolean;
  readonly user_action_required: boolean;
}

export interface PaymentErrorClassification {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly category: 'network' | 'authentication' | 'validation' | 'business' | 'system';
  readonly retryable: boolean;
  readonly user_actionable: boolean;
  readonly provider_specific: boolean;
}

export interface ErrorRecoveryStrategy {
  readonly name: string;
  readonly description: string;
  readonly conditions: string[];
  readonly max_attempts: number;
  readonly delay_ms: number;
  readonly fallback_provider?: PaymentProviderName;
}

export interface ErrorStats {
  readonly total_errors: number;
  readonly errors_by_type: Record<string, number>;
  readonly errors_by_provider: Record<PaymentProviderName, number>;
  readonly resolution_rate: number;
  readonly average_resolution_time_ms: number;
  readonly top_error_codes: Array<{ code: string; count: number }>;
}

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

// Payment Metrics Interface
export interface IPaymentMetricsCollector {
  // Performance metrics
  recordTransactionMetrics(
    provider: PaymentProviderName,
    metrics: TransactionMetrics
  ): Promise<void>;
  
  recordProviderMetrics(
    provider: PaymentProviderName,
    metrics: Partial<ProviderMetrics>
  ): Promise<void>;
  
  // Cost analytics
  recordTransactionCost(
    provider: PaymentProviderName,
    cost: TransactionCost
  ): Promise<void>;
  
  // Real-time monitoring
  getRealtimeMetrics(provider?: PaymentProviderName): Promise<RealtimeMetrics>;
  subscribeToMetrics(callback: (metrics: RealtimeMetrics) => void): void;
  
  // Reporting
  generateReport(
    type: MetricsReportType,
    options: MetricsReportOptions
  ): Promise<MetricsReport>;
}

export interface TransactionMetrics {
  readonly transaction_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly processing_time_ms: number;
  readonly success: boolean;
  readonly error_code?: string;
  readonly payment_method: PaymentMethod;
  readonly timestamp: Date;
}

export interface TransactionCost {
  readonly transaction_id: string;
  readonly provider_fee: number;
  readonly processing_fee: number;
  readonly currency_conversion_fee?: number;
  readonly total_cost: number;
  readonly currency: string;
}

export interface RealtimeMetrics {
  readonly timestamp: Date;
  readonly transactions_per_minute: number;
  readonly success_rate: number;
  readonly average_processing_time_ms: number;
  readonly total_volume: number;
  readonly provider_health: Record<PaymentProviderName, ProviderHealthStatus>;
}

export type MetricsReportType = 
  | 'performance'
  | 'cost_analysis'
  | 'provider_comparison'
  | 'error_analysis'
  | 'usage_trends';

export interface MetricsReportOptions {
  readonly date_range: DateRange;
  readonly providers?: PaymentProviderName[];
  readonly currencies?: string[];
  readonly payment_methods?: PaymentMethod[];
  readonly include_raw_data?: boolean;
}

export interface MetricsReport {
  readonly type: MetricsReportType;
  readonly generated_at: Date;
  readonly options: MetricsReportOptions;
  readonly summary: Record<string, any>;
  readonly data: Record<string, any>;
  readonly recommendations?: string[];
}