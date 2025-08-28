/**
 * CVPlus Premium Base Payment Provider
 * Abstract base class for payment provider implementations
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
  PaymentError,
} from '../../../../types/payments.types';
import {
  IPaymentProvider,
  PaymentProviderConfig,
  PaymentProviderFeatures,
  ProviderHealthStatus,
  ProviderMetrics,
  ProviderEvent,
  ProviderEventType,
} from '../../../../types/providers.types';

/**
 * Abstract base class that provides common functionality for payment providers
 */
export abstract class BasePaymentProvider implements IPaymentProvider {
  protected _initialized = false;
  protected _metrics: ProviderMetrics;
  protected _healthStatus: ProviderHealthStatus;

  constructor(
    public readonly config: PaymentProviderConfig,
    public readonly providerName: PaymentProviderName
  ) {
    this._metrics = this.initializeMetrics();
    this._healthStatus = this.initializeHealthStatus();
  }

  // =============================================================================
  // ABSTRACT METHODS - Must be implemented by concrete providers
  // =============================================================================

  abstract initialize(): Promise<void>;
  abstract createCustomer(customerInfo: CustomerInfo): Promise<string>;
  abstract getCustomer(customerId: string): Promise<CustomerInfo>;
  abstract updateCustomer(customerId: string, updates: Partial<CustomerInfo>): Promise<void>;
  abstract deleteCustomer(customerId: string): Promise<void>;
  abstract createPaymentMethod(customerId: string, paymentMethodData: Partial<PaymentMethodDetails>): Promise<PaymentMethodDetails>;
  abstract getPaymentMethod(paymentMethodId: string): Promise<PaymentMethodDetails>;
  abstract getCustomerPaymentMethods(customerId: string): Promise<PaymentMethodDetails[]>;
  abstract attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<void>;
  abstract detachPaymentMethodFromCustomer(paymentMethodId: string): Promise<void>;
  abstract createPaymentIntent(request: PaymentRequest): Promise<PaymentResult>;
  abstract confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentResult>;
  abstract capturePaymentIntent(paymentIntentId: string): Promise<PaymentResult>;
  abstract cancelPaymentIntent(paymentIntentId: string): Promise<PaymentResult>;
  abstract getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
  abstract createCheckoutSession(request: PaymentSessionRequest): Promise<PaymentSession>;
  abstract getCheckoutSession(sessionId: string): Promise<PaymentSession>;
  abstract expireCheckoutSession(sessionId: string): Promise<void>;
  abstract createRefund(request: RefundRequest): Promise<RefundResult>;
  abstract getRefund(refundId: string): Promise<RefundResult>;
  abstract constructWebhookEvent(payload: string, signature: string): Promise<PaymentEvent>;
  abstract handleWebhookEvent(event: PaymentEvent): Promise<WebhookResult>;
  abstract getSupportedPaymentMethods(): PaymentMethod[];
  abstract getSupportedCurrencies(): string[];
  abstract getFeatures(): PaymentProviderFeatures;

  // =============================================================================
  // COMMON FUNCTIONALITY
  // =============================================================================

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Health check implementation with common retry logic
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await this.performHealthCheck();
      const latency = Date.now() - startTime;
      
      this._healthStatus = {
        ...this._healthStatus,
        status: latency > 5000 ? 'degraded' : 'healthy',
        latency,
        last_checked: new Date(),
        error: undefined,
      };
      
      return {
        status: this._healthStatus.status,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this._healthStatus = {
        ...this._healthStatus,
        status: 'unhealthy',
        latency,
        error: errorMessage,
        last_checked: new Date(),
      };
      
      return {
        status: 'unhealthy',
        latency,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current provider metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this._metrics };
  }

  /**
   * Get current health status
   */
  getHealthStatus(): ProviderHealthStatus {
    return { ...this._healthStatus };
  }

  // =============================================================================
  // PROTECTED HELPER METHODS
  // =============================================================================

  /**
   * Validate payment request common fields
   */
  protected validatePaymentRequest(request: PaymentRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    
    if (!request.currency || request.currency.length !== 3) {
      throw new Error('Invalid currency code');
    }
    
    if (!request.customerId) {
      throw new Error('Customer ID is required');
    }
  }

  /**
   * Validate refund request
   */
  protected validateRefundRequest(request: RefundRequest): void {
    if (!request.payment_intent_id) {
      throw new Error('Payment intent ID is required for refund');
    }
    
    if (request.amount !== undefined && request.amount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }
  }

  /**
   * Log payment event with structured data
   */
  protected logPaymentEvent(
    eventType: ProviderEventType,
    data: Record<string, any>,
    metadata?: Record<string, string>
  ): void {
    const event: ProviderEvent = {
      id: this.generateEventId(),
      type: eventType,
      provider: this.providerName,
      timestamp: new Date(),
      data,
      metadata,
    };
    
    console.log(`[${this.providerName.toUpperCase()}] ${eventType}:`, JSON.stringify(event, null, 2));
    
    // Here you could emit to an event bus or logging service
    this.emitProviderEvent(event);
  }

  /**
   * Update metrics after transaction
   */
  protected updateMetrics(success: boolean, amount?: number, currency?: string): void {
    this._metrics.total_transactions++;
    
    if (success) {
      this._metrics.successful_transactions++;
      if (amount && currency) {
        this._metrics.total_amount_processed += amount;
        if (!this._metrics.currencies_processed.includes(currency)) {
          this._metrics.currencies_processed.push(currency);
        }
      }
    } else {
      this._metrics.failed_transactions++;
    }
    
    this._metrics.success_rate = this._metrics.total_transactions > 0 
      ? this._metrics.successful_transactions / this._metrics.total_transactions 
      : 0;
    
    this._metrics.last_transaction = new Date();
  }

  /**
   * Create standardized payment error
   */
  protected createPaymentError(
    code: string,
    message: string,
    type: PaymentError['type'] = 'api_error',
    additionalData?: Partial<PaymentError>
  ): PaymentError {
    return {
      code,
      message,
      type,
      ...additionalData,
    };
  }

  /**
   * Handle provider-specific errors and convert to standard format
   */
  protected handleProviderError(error: any): PaymentError {
    // Base implementation - providers should override for specific error handling
    return this.createPaymentError(
      'provider_error',
      error.message || 'Unknown provider error',
      'api_error'
    );
  }

  /**
   * Retry logic for provider operations
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Exponential backoff
        await this.delay(delayMs * Math.pow(2, attempt - 1));
      }
    }
    
    throw lastError!;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Initialize provider metrics
   */
  private initializeMetrics(): ProviderMetrics {
    return {
      provider: this.providerName,
      total_transactions: 0,
      successful_transactions: 0,
      failed_transactions: 0,
      success_rate: 0,
      average_processing_time: 0,
      total_amount_processed: 0,
      currencies_processed: [],
      last_transaction: new Date(),
      uptime: 0,
    };
  }

  /**
   * Initialize health status
   */
  private initializeHealthStatus(): ProviderHealthStatus {
    return {
      provider: this.providerName,
      status: 'healthy',
      latency: 0,
      last_checked: new Date(),
      success_rate: 0,
      error_rate: 0,
    };
  }

  /**
   * Perform provider-specific health check
   * Override in concrete implementations
   */
  protected async performHealthCheck(): Promise<void> {
    // Base implementation - just check if initialized
    if (!this._initialized) {
      throw new Error('Provider not initialized');
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${this.providerName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit provider event (placeholder for event bus integration)
   */
  private emitProviderEvent(event: ProviderEvent): void {
    // In a real implementation, this would emit to an event bus
    // For now, just log the event
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}