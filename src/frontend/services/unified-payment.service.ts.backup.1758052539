/**
 * CVPlus Unified Payment Service
 * Phase 5-6: Service Integration & Frontend
 * 
 * Provides unified frontend interface for all payment providers (Stripe, PayPal)
 * with automatic provider detection, state management, and error handling.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { 
  PaymentProviderName,
  PaymentRequest,
  PaymentResult,
  PaymentIntent,
  PaymentError,
  PaymentMethod,
  PaymentStatus
} from '../../types/payments.types';

import {
  PaymentContext,
  ProviderSelectionCriteria
} from '../../types/providers.types';

// Frontend-specific types
interface PaymentFlowState {
  step: 'provider_selection' | 'payment_form' | 'processing' | 'confirmation' | 'error';
  selectedProvider?: PaymentProviderName;
  paymentIntent?: PaymentIntent;
  error?: PaymentError;
  isLoading: boolean;
  canRetry: boolean;
  retryCount: number;
}

interface PaymentProviderCapabilities {
  provider: PaymentProviderName;
  isAvailable: boolean;
  supportedCurrencies: string[];
  supportedPaymentMethods: PaymentMethod[];
  features: {
    savedPaymentMethods: boolean;
    refunds: boolean;
    subscriptions: boolean;
    webhooks: boolean;
    multiCurrency: boolean;
  };
  estimatedProcessingTime: string;
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  healthScore: number; // 0-1 based on recent performance
}

interface PaymentRecommendation {
  provider: PaymentProviderName;
  score: number;
  reasons: string[];
  estimatedCost: number;
  processingTime: string;
}

interface UnifiedPaymentServiceConfig {
  apiBaseUrl: string;
  timeout: number;
  retryAttempts: number;
  enableAnalytics: boolean;
}

/**
 * Unified Payment Service - Frontend abstraction for all payment providers
 */
export class UnifiedPaymentService {
  private static instance: UnifiedPaymentService;
  private config: UnifiedPaymentServiceConfig;
  private paymentState: PaymentFlowState;
  private providers: Map<PaymentProviderName, PaymentProviderCapabilities> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  private constructor(config: UnifiedPaymentServiceConfig) {
    this.config = config;
    this.paymentState = {
      step: 'provider_selection',
      isLoading: false,
      canRetry: true,
      retryCount: 0
    };

    this.initializeProviders();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: UnifiedPaymentServiceConfig): UnifiedPaymentService {
    if (!UnifiedPaymentService.instance) {
      const defaultConfig: UnifiedPaymentServiceConfig = {
        apiBaseUrl: '/api/payments',
        timeout: 30000,
        retryAttempts: 3,
        enableAnalytics: true
      };
      UnifiedPaymentService.instance = new UnifiedPaymentService(
        config ? { ...defaultConfig, ...config } : defaultConfig
      );
    }
    return UnifiedPaymentService.instance;
  }

  // =============================================================================
  // PROVIDER DETECTION AND CAPABILITIES
  // =============================================================================

  /**
   * Get available payment providers with their capabilities
   */
  async getAvailableProviders(context?: PaymentContext): Promise<PaymentProviderCapabilities[]> {
    try {
      // Fetch provider status from backend
      const response = await this.makeRequest('/providers/status', 'GET');
      const providerStatus = response.data;

      // Update local provider capabilities
      for (const [providerName, capabilities] of Object.entries(providerStatus)) {
        this.providers.set(providerName as PaymentProviderName, capabilities as PaymentProviderCapabilities);
      }

      // Filter providers based on context if provided
      const availableProviders = Array.from(this.providers.values())
        .filter(provider => provider.isAvailable)
        .filter(provider => {
          if (!context) return true;
          
          // Filter by currency support
          if (context.currency && !provider.supportedCurrencies.includes(context.currency.toUpperCase())) {
            return false;
          }
          
          // Filter by payment method support
          if (context.paymentMethod && !provider.supportedPaymentMethods.includes(context.paymentMethod)) {
            return false;
          }
          
          return true;
        });

      return availableProviders;
    } catch (error) {
      console.error('Failed to fetch provider capabilities:', error);
      // Return cached capabilities as fallback
      return Array.from(this.providers.values()).filter(p => p.isAvailable);
    }
  }

  /**
   * Get smart payment recommendations based on context
   */
  async getPaymentRecommendations(
    paymentRequest: PaymentRequest,
    context: PaymentContext
  ): Promise<PaymentRecommendation[]> {
    const availableProviders = await this.getAvailableProviders(context);
    const recommendations: PaymentRecommendation[] = [];

    for (const provider of availableProviders) {
      const score = this.calculateProviderScore(provider, paymentRequest, context);
      const estimatedCost = this.calculateEstimatedCost(provider, paymentRequest);
      
      const recommendation: PaymentRecommendation = {
        provider: provider.provider,
        score,
        reasons: this.getRecommendationReasons(provider, paymentRequest, context),
        estimatedCost,
        processingTime: provider.estimatedProcessingTime
      };
      
      recommendations.push(recommendation);
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Detect optimal payment provider automatically
   */
  async detectOptimalProvider(
    paymentRequest: PaymentRequest,
    context: PaymentContext
  ): Promise<PaymentProviderName | null> {
    const recommendations = await this.getPaymentRecommendations(paymentRequest, context);
    return recommendations.length > 0 ? recommendations[0].provider : null;
  }

  // =============================================================================
  // PAYMENT FLOW STATE MANAGEMENT
  // =============================================================================

  /**
   * Get current payment flow state
   */
  getPaymentState(): PaymentFlowState {
    return { ...this.paymentState };
  }

  /**
   * Update payment flow state
   */
  private updatePaymentState(updates: Partial<PaymentFlowState>): void {
    this.paymentState = {
      ...this.paymentState,
      ...updates
    };
    
    this.emit('payment_state_changed', this.paymentState);
  }

  /**
   * Reset payment flow to initial state
   */
  resetPaymentFlow(): void {
    this.updatePaymentState({
      step: 'provider_selection',
      selectedProvider: undefined,
      paymentIntent: undefined,
      error: undefined,
      isLoading: false,
      canRetry: true,
      retryCount: 0
    });
  }

  /**
   * Select payment provider
   */
  selectProvider(provider: PaymentProviderName): void {
    this.updatePaymentState({
      selectedProvider: provider,
      step: 'payment_form',
      error: undefined
    });
  }

  /**
   * Switch to different provider (during mid-flow switching)
   */
  async switchProvider(newProvider: PaymentProviderName): Promise<void> {
    this.updatePaymentState({
      selectedProvider: newProvider,
      step: 'payment_form',
      error: undefined,
      isLoading: false
    });

    // Analytics tracking
    if (this.config.enableAnalytics) {
      await this.trackEvent('provider_switched', {
        from_provider: this.paymentState.selectedProvider,
        to_provider: newProvider,
        retry_count: this.paymentState.retryCount
      });
    }
  }

  // =============================================================================
  // UNIFIED PAYMENT PROCESSING
  // =============================================================================

  /**
   * Initialize payment with selected provider
   */
  async initializePayment(
    paymentRequest: PaymentRequest,
    context: PaymentContext
  ): Promise<PaymentResult> {
    if (!this.paymentState.selectedProvider) {
      throw new Error('No payment provider selected');
    }

    this.updatePaymentState({
      step: 'processing',
      isLoading: true,
      error: undefined
    });

    try {
      const result = await this.makeRequest('/initialize-payment', 'POST', {
        provider: this.paymentState.selectedProvider,
        paymentRequest,
        context
      });

      if (result.success) {
        this.updatePaymentState({
          paymentIntent: result.payment_intent,
          isLoading: false
        });
      } else {
        this.updatePaymentState({
          step: 'error',
          error: result.error,
          isLoading: false,
          canRetry: this.isRetryableError(result.error)
        });
      }

      return result;
    } catch (error) {
      const paymentError: PaymentError = {
        code: 'INITIALIZATION_FAILED',
        message: error instanceof Error ? error.message : 'Payment initialization failed',
        type: 'api_error'
      };

      this.updatePaymentState({
        step: 'error',
        error: paymentError,
        isLoading: false,
        canRetry: true
      });

      return {
        success: false,
        error: paymentError
      };
    }
  }

  /**
   * Process payment with automatic failover
   */
  async processPayment(
    paymentRequest: PaymentRequest,
    context: PaymentContext,
    options?: {
      enableFailover?: boolean;
      maxRetries?: number;
    }
  ): Promise<PaymentResult> {
    const maxRetries = options?.maxRetries || this.config.retryAttempts;
    const enableFailover = options?.enableFailover !== false;
    
    let lastError: PaymentError | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      
      try {
        this.updatePaymentState({
          isLoading: true,
          retryCount: attempt - 1
        });

        const result = await this.makeRequest('/process-payment', 'POST', {
          provider: this.paymentState.selectedProvider,
          paymentRequest,
          context,
          attempt,
          enableFailover
        });

        if (result.success) {
          this.updatePaymentState({
            step: 'confirmation',
            paymentIntent: result.payment_intent,
            isLoading: false,
            error: undefined
          });
          
          // Track successful payment
          if (this.config.enableAnalytics) {
            await this.trackEvent('payment_succeeded', {
              provider: this.paymentState.selectedProvider,
              amount: paymentRequest.amount,
              currency: paymentRequest.currency,
              attempts: attempt
            });
          }
          
          return result;
        } else {
          lastError = result.error!;
          
          // Check if we should retry
          if (!this.isRetryableError(lastError) || attempt >= maxRetries) {
            break;
          }
          
          // If failover is enabled and we have alternative providers
          if (enableFailover && attempt === 1) {
            const alternativeProvider = await this.getFailoverProvider(context);
            if (alternativeProvider && alternativeProvider !== this.paymentState.selectedProvider) {
              await this.switchProvider(alternativeProvider);
              continue;
            }
          }
          
          // Wait before retry (exponential backoff)
          await this.delay(1000 * Math.pow(2, attempt - 1));
        }
      } catch (error) {
        lastError = {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Payment processing failed',
          type: 'api_error'
        };
      }
    }

    // All attempts failed
    this.updatePaymentState({
      step: 'error',
      error: lastError,
      isLoading: false,
      canRetry: enableFailover && attempt < maxRetries,
      retryCount: attempt
    });

    // Track failed payment
    if (this.config.enableAnalytics) {
      await this.trackEvent('payment_failed', {
        provider: this.paymentState.selectedProvider,
        error: lastError?.code,
        attempts: attempt,
        final_error: lastError?.message
      });
    }

    return {
      success: false,
      error: lastError!
    };
  }

  /**
   * Retry payment with error recovery
   */
  async retryPayment(
    paymentRequest: PaymentRequest,
    context: PaymentContext
  ): Promise<PaymentResult> {
    if (!this.paymentState.canRetry) {
      throw new Error('Payment retry not available');
    }

    // Reset error state
    this.updatePaymentState({
      step: 'processing',
      error: undefined
    });

    return this.processPayment(paymentRequest, context, {
      enableFailover: true,
      maxRetries: this.config.retryAttempts
    });
  }

  // =============================================================================
  // MULTI-CURRENCY AND LOCALIZATION
  // =============================================================================

  /**
   * Get supported currencies for payment context
   */
  async getSupportedCurrencies(context?: PaymentContext): Promise<string[]> {
    const providers = await this.getAvailableProviders(context);
    const allCurrencies = new Set<string>();
    
    providers.forEach(provider => {
      provider.supportedCurrencies.forEach(currency => {
        allCurrencies.add(currency);
      });
    });
    
    return Array.from(allCurrencies).sort();
  }

  /**
   * Get exchange rate for currency conversion
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;
    
    try {
      const response = await this.makeRequest(
        `/exchange-rates?from=${fromCurrency}&to=${toCurrency}`,
        'GET'
      );
      return response.data.rate;
    } catch (error) {
      console.warn('Failed to fetch exchange rate:', error);
      return 1; // Fallback to 1:1 rate
    }
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ amount: number; rate: number; formattedAmount: string }> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: toCurrency
    }).format(convertedAmount / 100); // Assuming amounts are in cents
    
    return {
      amount: convertedAmount,
      rate,
      formattedAmount
    };
  }

  // =============================================================================
  // EVENT MANAGEMENT
  // =============================================================================

  /**
   * Subscribe to payment events
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from payment events
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit payment event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Initialize provider capabilities with defaults
   */
  private async initializeProviders(): Promise<void> {
    // Set default provider capabilities (will be updated by getAvailableProviders)
    const defaultStripe: PaymentProviderCapabilities = {
      provider: 'stripe',
      isAvailable: true,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
      supportedPaymentMethods: [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD],
      features: {
        savedPaymentMethods: true,
        refunds: true,
        subscriptions: true,
        webhooks: true,
        multiCurrency: true
      },
      estimatedProcessingTime: 'Instant',
      fees: {
        percentage: 0.029,
        fixed: 30,
        currency: 'USD'
      },
      healthScore: 0.95
    };

    const defaultPayPal: PaymentProviderCapabilities = {
      provider: 'paypal',
      isAvailable: true,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BRL'],
      supportedPaymentMethods: [PaymentMethod.PAYPAL, PaymentMethod.CREDIT_CARD],
      features: {
        savedPaymentMethods: true,
        refunds: true,
        subscriptions: true,
        webhooks: true,
        multiCurrency: true
      },
      estimatedProcessingTime: 'Instant',
      fees: {
        percentage: 0.029,
        fixed: 30,
        currency: 'USD'
      },
      healthScore: 0.90
    };

    this.providers.set('stripe', defaultStripe);
    this.providers.set('paypal', defaultPayPal);
  }

  /**
   * Calculate provider recommendation score
   */
  private calculateProviderScore(
    provider: PaymentProviderCapabilities,
    paymentRequest: PaymentRequest,
    context: PaymentContext
  ): number {
    let score = 0;

    // Base score from health
    score += provider.healthScore * 40;

    // Currency support bonus
    if (provider.supportedCurrencies.includes(paymentRequest.currency.toUpperCase())) {
      score += 20;
    }

    // Payment method preference
    if (context.paymentMethod && provider.supportedPaymentMethods.includes(context.paymentMethod)) {
      score += 15;
    }

    // Cost efficiency (lower fees = higher score)
    const estimatedCost = this.calculateEstimatedCost(provider, paymentRequest);
    const costScore = Math.max(0, 10 - (estimatedCost * 100 / paymentRequest.amount));
    score += costScore;

    // Feature bonuses
    if (context.subscriptionId && provider.features.subscriptions) {
      score += 10;
    }
    
    if (provider.features.savedPaymentMethods) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate estimated cost for provider
   */
  private calculateEstimatedCost(
    provider: PaymentProviderCapabilities,
    paymentRequest: PaymentRequest
  ): number {
    const percentageFee = paymentRequest.amount * provider.fees.percentage;
    const fixedFee = provider.fees.fixed;
    return percentageFee + fixedFee;
  }

  /**
   * Get recommendation reasons
   */
  private getRecommendationReasons(
    provider: PaymentProviderCapabilities,
    paymentRequest: PaymentRequest,
    context: PaymentContext
  ): string[] {
    const reasons: string[] = [];

    if (provider.healthScore > 0.9) {
      reasons.push('Excellent reliability');
    }

    if (provider.estimatedProcessingTime === 'Instant') {
      reasons.push('Instant processing');
    }

    if (provider.features.savedPaymentMethods) {
      reasons.push('Supports saved payment methods');
    }

    if (provider.provider === 'paypal' && this.isInternationalPayment(context)) {
      reasons.push('Optimized for international payments');
    }

    if (provider.provider === 'stripe' && context.subscriptionId) {
      reasons.push('Excellent for subscription payments');
    }

    const cost = this.calculateEstimatedCost(provider, paymentRequest);
    if (cost < paymentRequest.amount * 0.03) {
      reasons.push('Low processing fees');
    }

    return reasons;
  }

  /**
   * Check if payment is international
   */
  private isInternationalPayment(context: PaymentContext): boolean {
    if (!context.billing_country) return false;
    const domesticCountries = ['US', 'USA', 'United States'];
    return !domesticCountries.includes(context.billing_country);
  }

  /**
   * Get failover provider
   */
  private async getFailoverProvider(context: PaymentContext): Promise<PaymentProviderName | null> {
    const availableProviders = await this.getAvailableProviders(context);
    const currentProvider = this.paymentState.selectedProvider;
    
    // Find alternative provider
    const alternatives = availableProviders.filter(p => p.provider !== currentProvider);
    if (alternatives.length === 0) return null;
    
    // Return the highest scoring alternative
    return alternatives.sort((a, b) => b.healthScore - a.healthScore)[0].provider;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error?: PaymentError): boolean {
    if (!error) return false;
    
    const retryableCodes = [
      'PROVIDER_UNAVAILABLE',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMITED',
      'TEMPORARY_ERROR'
    ];
    
    return retryableCodes.includes(error.code);
  }

  /**
   * Make HTTP request to backend
   */
  private async makeRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.config.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string> {
    // This would integrate with your auth system
    return 'dummy-token'; // Placeholder
  }

  /**
   * Track analytics event
   */
  private async trackEvent(eventName: string, properties: Record<string, any>): Promise<void> {
    if (!this.config.enableAnalytics) return;
    
    try {
      await this.makeRequest('/analytics/track', 'POST', {
        event: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          service: 'unified_payment_service'
        }
      });
    } catch (error) {
      console.warn('Failed to track analytics event:', error);
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance getter
export const getUnifiedPaymentService = (config?: UnifiedPaymentServiceConfig) => {
  return UnifiedPaymentService.getInstance(config);
};