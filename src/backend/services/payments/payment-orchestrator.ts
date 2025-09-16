/**
 * CVPlus Premium Payment Service Orchestrator
 * Phase 2: Advanced orchestration with intelligent routing and failover
  */

import {
  PaymentProviderName,
  PaymentRequest,
  PaymentResult,
  PaymentStatus,
} from '../../../types/payments.types';

import {
  IPaymentProvider,
  IPaymentOrchestrator,
  PaymentContext,
  ProviderSelectionCriteria,
  PaymentProcessingOptions,
  PaymentState,
  LoadBalancingStats,
  ProviderLoadMetrics,
  ProviderHealthStatus,
  ProviderError,
  ProviderErrorCode,
} from '../../../types/providers.types';

import { providerRegistry, ProviderSelectionCriteria as RegistrySelectionCriteria } from './provider-registry';
import { paymentEventBus } from './events/payment-events';

/**
 * Advanced Payment Orchestrator with intelligent provider selection,
 * load balancing, and comprehensive failover strategies
  */
export class PaymentOrchestrator implements IPaymentOrchestrator {
  private static instance: PaymentOrchestrator;
  
  private readonly paymentStates = new Map<string, PaymentState>();
  private readonly loadMetrics = new Map<PaymentProviderName, ProviderLoadMetrics>();
  private readonly processingHistory: PaymentProcessingRecord[] = [];
  
  private readonly maxHistorySize = 1000;
  private readonly defaultTimeoutMs = 30000;
  private readonly defaultMaxRetries = 3;

  private constructor() {
    this.initializeLoadMetrics();
    this.startMetricsCollection();
  }

  /**
   * Get singleton instance
    */
  public static getInstance(): PaymentOrchestrator {
    if (!PaymentOrchestrator.instance) {
      PaymentOrchestrator.instance = new PaymentOrchestrator();
    }
    return PaymentOrchestrator.instance;
  }

  // =============================================================================
  // REQUEST ROUTING AND PROVIDER SELECTION
  // =============================================================================

  /**
   * Route payment request to optimal provider
    */
  async routePaymentRequest(context: PaymentContext): Promise<IPaymentProvider> {
    const startTime = Date.now();
    
    try {
      this.logOrchestrationEvent('routing.started', context);
      
      // Get available providers
      const availableProviders = providerRegistry.getHealthy();
      if (availableProviders.length === 0) {
        throw this.createOrchestrationError(
          'PROVIDER_UNAVAILABLE',
          'No healthy providers available'
        );
      }

      // Apply basic filters
      let candidates = this.applyBasicFilters(availableProviders, context);
      if (candidates.length === 0) {
        throw this.createOrchestrationError(
          'PROVIDER_UNAVAILABLE',
          'No providers match the required criteria'
        );
      }

      // Select optimal provider
      const selectedProvider = await this.selectOptimalProvider(context, {
        prefer_lowest_cost: true,
        prefer_fastest: true,
      });

      if (!selectedProvider) {
        throw this.createOrchestrationError(
          'PROVIDER_UNAVAILABLE',
          'Provider selection failed'
        );
      }

      const processingTime = Date.now() - startTime;
      this.logOrchestrationEvent('routing.completed', context, {
        selected_provider: selectedProvider.providerName,
        processing_time_ms: processingTime,
        candidates_count: candidates.length,
      });

      return selectedProvider;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logOrchestrationEvent('routing.failed', context, {
        processing_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Select optimal provider based on comprehensive criteria
    */
  async selectOptimalProvider(
    context: PaymentContext,
    criteria?: ProviderSelectionCriteria
  ): Promise<IPaymentProvider> {
    const startTime = Date.now();
    
    try {
      // Convert criteria to registry format
      const registryCriteria: RegistrySelectionCriteria = {
        currency: context.currency,
        paymentMethod: context.paymentMethod,
        requiredFeatures: criteria?.require_features,
        excludeProviders: criteria?.exclude_providers,
        preferLowestCost: criteria?.prefer_lowest_cost,
        preferFastest: criteria?.prefer_fastest,
      };

      // Use registry's intelligent selection with cost optimization
      let selectedProvider = providerRegistry.selectBestProvider(registryCriteria);
      
      // Apply multi-provider cost optimization if criteria includes cost preference
      if (criteria?.prefer_lowest_cost && selectedProvider) {
        const allSuitableProviders = providerRegistry.getHealthy().filter(p => 
          this.applyBasicFilters([p], context).length > 0
        );
        
        if (allSuitableProviders.length > 1) {
          // Calculate costs for all suitable providers
          const providerCosts = allSuitableProviders.map(provider => ({
            provider,
            cost: this.calculateProviderCost(provider, context),
            healthScore: this.loadMetrics.get(provider.providerName)?.health_score || 0.5,
          }));
          
          // Sort by cost but consider health score (weighted decision)
          providerCosts.sort((a, b) => {
            const aScore = a.cost * (2 - a.healthScore); // Lower cost + higher health = better score
            const bScore = b.cost * (2 - b.healthScore);
            return aScore - bScore;
          });
          
          selectedProvider = providerCosts[0]?.provider || selectedProvider;
          
          this.logOrchestrationEvent('provider.cost_optimized', context, {
            providers_evaluated: providerCosts.length,
            selected_provider: selectedProvider.providerName,
            estimated_cost: this.calculateProviderCost(selectedProvider, context),
            cost_comparison: providerCosts.map(pc => ({
              provider: pc.provider.providerName,
              cost: pc.cost,
              health_score: pc.healthScore,
            })),
          });
        }
      }
      
      if (!selectedProvider) {
        throw this.createOrchestrationError(
          'PROVIDER_UNAVAILABLE',
          'No suitable provider found'
        );
      }

      // Additional orchestrator-level validation
      await this.validateProviderForContext(selectedProvider, context);

      // Update load metrics
      this.updateProviderLoad(selectedProvider.providerName, 'request_routed');

      const processingTime = Date.now() - startTime;
      this.logOrchestrationEvent('provider.selected', context, {
        provider: selectedProvider.providerName,
        selection_time_ms: processingTime,
        criteria,
      });

      return selectedProvider;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logOrchestrationEvent('provider.selection_failed', context, {
        selection_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // =============================================================================
  // CROSS-PROVIDER OPERATIONS WITH FAILOVER
  // =============================================================================

  /**
   * Process payment with automatic failover support
    */
  async processPaymentWithFailover(
    request: PaymentRequest,
    context: PaymentContext,
    options: PaymentProcessingOptions = {}
  ): Promise<PaymentResult> {
    const processingId = this.generateProcessingId();
    const startTime = Date.now();
    const maxRetries = options.max_retries || this.defaultMaxRetries;
    const timeoutMs = options.timeout_ms || this.defaultTimeoutMs;
    
    this.logOrchestrationEvent('payment.processing.started', context, {
      processing_id: processingId,
      amount: request.amount,
      currency: request.currency,
      options,
    });

    let lastError: Error | null = null;
    let attempt = 0;
    const attemptHistory: PaymentAttempt[] = [];

    while (attempt < maxRetries) {
      attempt++;
      const attemptStartTime = Date.now();
      
      try {
        // Select provider for this attempt
        const provider = await this.selectProviderForAttempt(
          context, 
          attempt, 
          attemptHistory, 
          options
        );

        this.logOrchestrationEvent('payment.attempt.started', context, {
          processing_id: processingId,
          attempt,
          provider: provider.providerName,
        });

        // Create payment state tracking
        const paymentState: PaymentState = {
          payment_intent_id: '', // Will be set after creation
          provider: provider.providerName,
          status: 'processing' as PaymentStatus,
          created_at: new Date(),
          updated_at: new Date(),
          retry_count: attempt - 1,
          metadata: {
            processing_id: processingId,
            context,
            options,
          },
        };

        // Process payment with timeout
        const result = await this.processPaymentWithTimeout(
          provider,
          request,
          timeoutMs
        );

        // Update state with result
        if (result.payment_intent?.id) {
          paymentState.payment_intent_id = result.payment_intent.id;
          paymentState.status = result.payment_intent.status;
          paymentState.updated_at = new Date();
          
          this.paymentStates.set(result.payment_intent.id, paymentState);
        }

        // Record successful attempt
        const attemptTime = Date.now() - attemptStartTime;
        const successAttempt: PaymentAttempt = {
          attempt_number: attempt,
          provider: provider.providerName,
          started_at: new Date(attemptStartTime),
          completed_at: new Date(),
          processing_time_ms: attemptTime,
          success: result.success,
          error: result.success ? undefined : result.error,
        };
        attemptHistory.push(successAttempt);

        // Update load metrics
        this.updateProviderLoad(provider.providerName, result.success ? 'success' : 'error');

        if (result.success) {
          const totalProcessingTime = Date.now() - startTime;
          
          // Record successful processing
          this.recordProcessingHistory({
            processing_id: processingId,
            context,
            attempts: attemptHistory,
            final_result: result,
            total_processing_time_ms: totalProcessingTime,
            success: true,
          });

          this.logOrchestrationEvent('payment.processing.succeeded', context, {
            processing_id: processingId,
            final_provider: provider.providerName,
            attempts: attempt,
            total_time_ms: totalProcessingTime,
            payment_intent_id: result.payment_intent?.id,
          });

          return result;
        } else {
          // Non-retryable failure
          lastError = new Error(result.error?.message || 'Payment failed');
          
          if (!this.isRetryableError(result.error)) {
            break;
          }
        }
      } catch (error) {
        const attemptTime = Date.now() - attemptStartTime;
        lastError = error as Error;
        
        // Record failed attempt
        const failedAttempt: PaymentAttempt = {
          attempt_number: attempt,
          provider: 'unknown', // Provider selection may have failed
          started_at: new Date(attemptStartTime),
          completed_at: new Date(),
          processing_time_ms: attemptTime,
          success: false,
          error: { 
            code: 'PROCESSING_ERROR', 
            message: lastError.message,
            type: 'api_error' 
          },
        };
        attemptHistory.push(failedAttempt);

        this.logOrchestrationEvent('payment.attempt.failed', context, {
          processing_id: processingId,
          attempt,
          error: lastError.message,
          will_retry: attempt < maxRetries && this.isRetryableError(lastError),
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delayMs = options.retry_delay_ms || (1000 * Math.pow(2, attempt - 1));
          await this.delay(delayMs);
        }
      }
    }

    // All attempts failed
    const totalProcessingTime = Date.now() - startTime;
    
    // Record failed processing
    this.recordProcessingHistory({
      processing_id: processingId,
      context,
      attempts: attemptHistory,
      final_result: {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: lastError?.message || 'Payment processing failed',
          type: 'api_error',
        },
      },
      total_processing_time_ms: totalProcessingTime,
      success: false,
    });

    this.logOrchestrationEvent('payment.processing.failed', context, {
      processing_id: processingId,
      attempts: attempt,
      total_time_ms: totalProcessingTime,
      final_error: lastError?.message,
    });

    // Return final failure result
    return {
      success: false,
      error: {
        code: 'PROCESSING_FAILED',
        message: `Payment failed after ${attempt} attempts: ${lastError?.message || 'Unknown error'}`,
        type: 'api_error',
      },
    };
  }

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================

  /**
   * Track payment state across processing
    */
  async trackPaymentState(paymentIntentId: string, provider: PaymentProviderName): Promise<void> {
    const existingState = this.paymentStates.get(paymentIntentId);
    
    if (existingState) {
      existingState.updated_at = new Date();
      existingState.retry_count = (existingState.retry_count || 0) + 1;
    } else {
      const newState: PaymentState = {
        payment_intent_id: paymentIntentId,
        provider,
        status: 'processing' as PaymentStatus,
        created_at: new Date(),
        updated_at: new Date(),
        retry_count: 0,
        metadata: {},
      };
      
      this.paymentStates.set(paymentIntentId, newState);
    }

    this.logOrchestrationEvent('payment.state.tracked', { userId: 'system' } as PaymentContext, {
      payment_intent_id: paymentIntentId,
      provider,
    });
  }

  /**
   * Get payment state
    */
  async getPaymentState(paymentIntentId: string): Promise<PaymentState | null> {
    return this.paymentStates.get(paymentIntentId) || null;
  }

  // =============================================================================
  // LOAD BALANCING
  // =============================================================================

  /**
   * Distribute load across providers
    */
  async distributeLoad(): Promise<LoadBalancingStats> {
    const providers = providerRegistry.getAll();
    const totalRequests = Array.from(this.loadMetrics.values())
      .reduce((sum, metrics) => sum + metrics.requests_per_minute, 0);

    const requestsByProvider: Record<PaymentProviderName, number> = {};
    let totalResponseTime = 0;
    let totalSuccessful = 0;

    providers.forEach(provider => {
      const metrics = this.loadMetrics.get(provider.providerName);
      if (metrics) {
        requestsByProvider[provider.providerName] = metrics.requests_per_minute;
        totalResponseTime += metrics.average_response_time_ms;
        totalSuccessful += Math.round(metrics.requests_per_minute * (1 - metrics.error_rate));
      }
    });

    const averageResponseTime = providers.length > 0 ? totalResponseTime / providers.length : 0;
    const successRate = totalRequests > 0 ? totalSuccessful / totalRequests : 0;

    return {
      total_requests: totalRequests,
      requests_by_provider: requestsByProvider,
      average_response_time: averageResponseTime,
      success_rate: successRate,
      last_updated: new Date(),
    };
  }

  /**
   * Get provider load metrics
    */
  async getProviderLoadMetrics(): Promise<Record<PaymentProviderName, ProviderLoadMetrics>> {
    const result: Record<PaymentProviderName, ProviderLoadMetrics> = {};
    
    this.loadMetrics.forEach((metrics, provider) => {
      result[provider] = { ...metrics };
    });

    return result;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Apply basic filtering to providers
    */
  private applyBasicFilters(
    providers: IPaymentProvider[],
    context: PaymentContext
  ): IPaymentProvider[] {
    return providers.filter(provider => {
      // Filter by currency support
      if (context.currency) {
        const supportedCurrencies = provider.getSupportedCurrencies();
        if (!supportedCurrencies.includes(context.currency.toLowerCase())) {
          return false;
        }
      }

      // Filter by payment method support
      if (context.paymentMethod) {
        const supportedMethods = provider.getSupportedPaymentMethods();
        if (!supportedMethods.includes(context.paymentMethod)) {
          return false;
        }
      }

      // Filter by preferred provider
      if (context.preferred_provider && context.preferred_provider !== provider.providerName) {
        return false;
      }

      // PayPal-specific filtering for optimal routing
      if (provider.providerName === 'paypal') {
        // PayPal is better for international payments
        if (this.isInternationalPayment(context)) {
          return true;
        }
        
        // PayPal is good for users who prefer not to enter card details
        if (context.paymentMethod?.toString().includes('paypal')) {
          return true;
        }
      }

      // Stripe-specific filtering
      if (provider.providerName === 'stripe') {
        // Stripe is better for credit card payments
        if (context.paymentMethod?.toString().includes('card')) {
          return true;
        }
        
        // Stripe is better for subscription payments due to better saved payment methods
        if (context.subscriptionId) {
          return true;
        }
      }

      return true;
    });
  }

  /**
   * Enhanced provider selection with PayPal-specific cost optimization
    */
  private calculateProviderCost(provider: IPaymentProvider, context: PaymentContext): number {
    const amount = context.amount;
    const currency = context.currency;
    
    // Base fees (simplified - would be more complex in production)
    const providerFees = {
      stripe: {
        percentage: 0.029, // 2.9%
        fixed: currency.toLowerCase() === 'usd' ? 30 : 25, // cents
      },
      paypal: {
        percentage: 0.029, // 2.9%
        fixed: currency.toLowerCase() === 'usd' ? 30 : 25, // cents
      },
    };

    const fees = providerFees[provider.providerName];
    if (!fees) return Infinity;

    const percentageFee = amount * fees.percentage;
    const fixedFee = fees.fixed;
    
    // PayPal has slightly higher international fees
    let internationalMultiplier = 1;
    if (provider.providerName === 'paypal' && this.isInternationalPayment(context)) {
      internationalMultiplier = 1.1; // 10% higher for international
    }

    return (percentageFee + fixedFee) * internationalMultiplier;
  }

  /**
   * Check if payment is international
    */
  private isInternationalPayment(context: PaymentContext): boolean {
    // This would integrate with user location detection
    // For now, use a simple heuristic
    const domesticCountries = ['US', 'USA', 'United States'];
    return context.billing_country ? !domesticCountries.includes(context.billing_country) : false;
  }

  /**
   * Validate provider for specific context
    */
  private async validateProviderForContext(
    provider: IPaymentProvider,
    context: PaymentContext
  ): Promise<void> {
    // Check if provider is initialized
    if (!provider.isInitialized()) {
      throw this.createOrchestrationError(
        'PROVIDER_NOT_INITIALIZED',
        `Provider ${provider.providerName} is not initialized`
      );
    }

    // Check amount limits (would be implemented with real provider data)
    if (context.amount < 50) { // Minimum amount check
      throw this.createOrchestrationError(
        'AMOUNT_TOO_SMALL',
        'Amount is below minimum threshold'
      );
    }

    if (context.amount > 100000000) { // Maximum amount check (1M in cents)
      throw this.createOrchestrationError(
        'AMOUNT_TOO_LARGE',
        'Amount exceeds maximum threshold'
      );
    }

    // Regional restrictions check (placeholder)
    if (context.billing_country) {
      // Would check provider's supported countries
    }
  }

  /**
   * Select provider for specific attempt with failover logic
    */
  private async selectProviderForAttempt(
    context: PaymentContext,
    attempt: number,
    attemptHistory: PaymentAttempt[],
    options: PaymentProcessingOptions
  ): Promise<IPaymentProvider> {
    // Get previously failed providers
    const failedProviders = attemptHistory.map(a => a.provider);
    
    // Implement intelligent Stripe ↔ PayPal failover
    const smartFailoverProvider = this.getSmartFailoverProvider(failedProviders, context);
    if (smartFailoverProvider && attempt <= 2) { // Only for first 2 retries
      this.logOrchestrationEvent('provider.smart_failover', context, {
        attempt,
        failed_providers: failedProviders,
        selected_failover: smartFailoverProvider,
      });
      
      const provider = providerRegistry.get(smartFailoverProvider);
      if (provider && provider.isInitialized()) {
        return provider;
      }
    }
    
    // Update context to exclude failed providers
    const contextWithExclusions: PaymentContext = {
      ...context,
      metadata: {
        ...context.metadata,
        excluded_providers: failedProviders,
      },
    };

    // Select provider with exclusions
    const criteria: ProviderSelectionCriteria = {
      exclude_providers: [
        ...(options.fallback_providers || []),
        ...failedProviders,
      ] as PaymentProviderName[],
      prefer_fastest: attempt > 1, // Prefer speed on retries
      max_failure_rate: 0.1, // Max 10% failure rate
    };

    return this.selectOptimalProvider(contextWithExclusions, criteria);
  }

  /**
   * Get smart failover provider based on failure patterns
    */
  private getSmartFailoverProvider(
    failedProviders: PaymentProviderName[],
    context: PaymentContext
  ): PaymentProviderName | null {
    // If Stripe failed, try PayPal (and vice versa)
    if (failedProviders.includes('stripe') && !failedProviders.includes('paypal')) {
      // PayPal is good for international payments and when users don't want to enter card details
      if (this.isInternationalPayment(context) || context.paymentMethod?.toString().includes('paypal')) {
        return 'paypal';
      }
      return 'paypal'; // Default failover
    }
    
    if (failedProviders.includes('paypal') && !failedProviders.includes('stripe')) {
      // Stripe is better for card payments and subscriptions
      if (context.paymentMethod?.toString().includes('card') || context.subscriptionId) {
        return 'stripe';
      }
      return 'stripe'; // Default failover
    }
    
    // Both failed or no obvious failover
    return null;
  }

  /**
   * Process payment with timeout protection
    */
  private async processPaymentWithTimeout(
    provider: IPaymentProvider,
    request: PaymentRequest,
    timeoutMs: number
  ): Promise<PaymentResult> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Payment processing timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await provider.createPaymentIntent(request);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Check if error is retryable
    */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const retryableCodes = [
      'PROVIDER_UNAVAILABLE',
      'PROVIDER_RATE_LIMITED',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'TEMPORARY_ERROR',
    ];

    return retryableCodes.includes(error.code) || 
           error.retryable === true ||
           error.message?.includes('timeout') ||
           error.message?.includes('network');
  }

  /**
   * Initialize load metrics for all providers
    */
  private initializeLoadMetrics(): void {
    const providers = providerRegistry.getAll();
    
    providers.forEach(provider => {
      this.loadMetrics.set(provider.providerName, {
        current_requests: 0,
        requests_per_minute: 0,
        average_response_time_ms: 0,
        error_rate: 0,
        health_score: 1.0,
      });
    });
  }

  /**
   * Update provider load metrics
    */
  private updateProviderLoad(
    provider: PaymentProviderName,
    action: 'request_routed' | 'success' | 'error'
  ): void {
    const metrics = this.loadMetrics.get(provider);
    if (!metrics) return;

    switch (action) {
      case 'request_routed':
        metrics.current_requests++;
        metrics.requests_per_minute++;
        break;
      case 'success':
        metrics.current_requests = Math.max(0, metrics.current_requests - 1);
        // Update health score positively
        metrics.health_score = Math.min(1.0, metrics.health_score + 0.01);
        break;
      case 'error':
        metrics.current_requests = Math.max(0, metrics.current_requests - 1);
        // Update health score negatively
        metrics.health_score = Math.max(0.0, metrics.health_score - 0.05);
        metrics.error_rate = Math.min(1.0, metrics.error_rate + 0.01);
        break;
    }

    this.loadMetrics.set(provider, metrics);
  }

  /**
   * Start metrics collection background process
    */
  private startMetricsCollection(): void {
    setInterval(() => {
      // Reset per-minute counters
      this.loadMetrics.forEach((metrics, provider) => {
        metrics.requests_per_minute = Math.max(0, metrics.requests_per_minute - 1);
        metrics.error_rate = Math.max(0, metrics.error_rate - 0.001); // Gradual recovery
      });
    }, 60000); // Every minute
  }

  /**
   * Record processing history
    */
  private recordProcessingHistory(record: PaymentProcessingRecord): void {
    this.processingHistory.push(record);
    
    // Maintain max history size
    if (this.processingHistory.length > this.maxHistorySize) {
      this.processingHistory.splice(0, this.processingHistory.length - this.maxHistorySize);
    }
  }

  /**
   * Generate unique processing ID
    */
  private generateProcessingId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple delay utility
    */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create orchestration error
    */
  private createOrchestrationError(
    code: ProviderErrorCode,
    message: string
  ): ProviderError {
    const error = new Error(message) as ProviderError;
    error.code = code;
    error.provider = 'stripe'; // Default provider for orchestration errors
    error.retryable = ['PROVIDER_UNAVAILABLE', 'PROVIDER_RATE_LIMITED'].includes(code);
    
    return error;
  }

  /**
   * Log orchestration events
    */
  private logOrchestrationEvent(
    type: string,
    context: PaymentContext,
    data: Record<string, any> = {}
  ): void {
    const event = {
      id: `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      provider: 'orchestrator' as PaymentProviderName,
      timestamp: new Date(),
      data: {
        user_id: context.userId,
        currency: context.currency,
        amount: context.amount,
        ...data,
      },
    };

    console.log(`[PaymentOrchestrator] ${type}:`, JSON.stringify(event, null, 2));
    
    // Emit to event bus
    paymentEventBus.emit(event).catch(console.error);
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

interface PaymentAttempt {
  attempt_number: number;
  provider: PaymentProviderName | 'unknown';
  started_at: Date;
  completed_at: Date;
  processing_time_ms: number;
  success: boolean;
  error?: {
    code: string;
    message: string;
    type: string;
  };
}

interface PaymentProcessingRecord {
  processing_id: string;
  context: PaymentContext;
  attempts: PaymentAttempt[];
  final_result: PaymentResult;
  total_processing_time_ms: number;
  success: boolean;
}

// Export singleton instance
export const paymentOrchestrator = PaymentOrchestrator.getInstance();