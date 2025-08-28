/**
 * CVPlus Premium Enhanced Payment Error Handling System
 * Phase 2: Comprehensive error classification, recovery, and reporting
 */

import {
  PaymentProviderName,
} from '../../../../types/payments.types';

import {
  PaymentContext,
  ProviderError,
  ProviderErrorCode,
  IPaymentErrorHandler,
  PaymentErrorHandlingResult,
  PaymentErrorClassification,
  ErrorRecoveryStrategy,
  ErrorStats,
  DateRange,
  CreateProviderError,
} from '../../../../types/providers.types';

import { paymentEventBus } from '../events/payment-events';
import { paymentOrchestrator } from '../payment-orchestrator';

/**
 * Advanced Payment Error Handler with intelligent classification,
 * recovery strategies, and comprehensive analytics
 */
export class PaymentErrorHandler implements IPaymentErrorHandler {
  private static instance: PaymentErrorHandler;
  
  private readonly errorHistory: ErrorRecord[] = [];
  private readonly recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private readonly errorStats: Map<string, ErrorStatistic> = new Map();
  
  private readonly maxHistorySize = 5000;
  private readonly createError: CreateProviderError;

  private constructor() {
    this.createError = this.createProviderError.bind(this);
    this.initializeRecoveryStrategies();
    this.startErrorAnalytics();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PaymentErrorHandler {
    if (!PaymentErrorHandler.instance) {
      PaymentErrorHandler.instance = new PaymentErrorHandler();
    }
    return PaymentErrorHandler.instance;
  }

  // =============================================================================
  // ERROR CLASSIFICATION AND HANDLING
  // =============================================================================

  /**
   * Handle error with comprehensive classification and recovery
   */
  async handleError(error: unknown, context: PaymentContext): Promise<PaymentErrorHandlingResult> {
    const handlingId = this.generateHandlingId();
    const startTime = Date.now();
    
    try {
      this.logErrorEvent('error.handling.started', context, {
        handling_id: handlingId,
        error_type: typeof error,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      // Classify the error
      const classification = this.classifyError(error);
      
      // Record error in history
      const errorRecord = this.recordError(error, context, classification, handlingId);

      // Determine if recovery should be attempted
      const shouldAttemptRecovery = this.shouldAttemptRecovery(classification, context);
      
      let recoverySuccessful = false;
      let fallbackProvider: PaymentProviderName | undefined;

      if (shouldAttemptRecovery) {
        try {
          const recoveryResult = await this.attemptErrorRecovery(
            errorRecord.providerError,
            context,
            classification
          );
          
          recoverySuccessful = recoveryResult.success;
          fallbackProvider = recoveryResult.fallback_provider;
          
          // Update error record with recovery result
          errorRecord.recovery_attempted = true;
          errorRecord.recovery_successful = recoverySuccessful;
          errorRecord.recovery_strategy = recoveryResult.strategy_used;
        } catch (recoveryError) {
          this.logErrorEvent('error.recovery.failed', context, {
            handling_id: handlingId,
            recovery_error: recoveryError instanceof Error ? recoveryError.message : 'Recovery failed',
          });
        }
      }

      // Report error for analytics
      await this.reportError(errorRecord.providerError, context);

      // Update error statistics
      this.updateErrorStatistics(errorRecord);

      const processingTime = Date.now() - startTime;
      const result: PaymentErrorHandlingResult = {
        handled: true,
        recovery_attempted: shouldAttemptRecovery,
        recovery_successful: recoverySuccessful,
        fallback_provider: fallbackProvider,
        retry_recommended: this.shouldRecommendRetry(classification, context),
        user_action_required: this.requiresUserAction(classification),
      };

      this.logErrorEvent('error.handling.completed', context, {
        handling_id: handlingId,
        processing_time_ms: processingTime,
        result,
        classification,
      });

      return result;
    } catch (handlingError) {
      const processingTime = Date.now() - startTime;
      
      this.logErrorEvent('error.handling.failed', context, {
        handling_id: handlingId,
        processing_time_ms: processingTime,
        handling_error: handlingError instanceof Error ? handlingError.message : 'Handling failed',
      });

      // Return basic failure result
      return {
        handled: false,
        recovery_attempted: false,
        retry_recommended: false,
        user_action_required: true,
      };
    }
  }

  /**
   * Classify error with comprehensive analysis
   */
  classifyError(error: unknown): PaymentErrorClassification {
    // Default classification
    let classification: PaymentErrorClassification = {
      severity: 'medium',
      category: 'system',
      retryable: false,
      user_actionable: false,
      provider_specific: false,
    };

    if (!error) {
      return classification;
    }

    // Handle ProviderError
    if (this.isProviderError(error)) {
      classification = this.classifyProviderError(error);
    }
    // Handle standard Error
    else if (error instanceof Error) {
      classification = this.classifyStandardError(error);
    }
    // Handle unknown error types
    else {
      classification = {
        severity: 'high',
        category: 'system',
        retryable: false,
        user_actionable: false,
        provider_specific: false,
      };
    }

    return classification;
  }

  // =============================================================================
  // RECOVERY STRATEGIES
  // =============================================================================

  /**
   * Execute recovery strategy for specific error
   */
  async executeRecoveryStrategy(
    error: ProviderError,
    strategy: ErrorRecoveryStrategy,
    context: PaymentContext
  ): Promise<any> {
    const executionId = this.generateExecutionId();
    
    try {
      this.logErrorEvent('recovery.strategy.started', context, {
        execution_id: executionId,
        strategy_name: strategy.name,
        error_code: error.code,
        provider: error.provider,
      });

      // Validate strategy conditions
      if (!this.validateStrategyConditions(strategy, error, context)) {
        throw this.createError(
          error.provider,
          'FEATURE_NOT_SUPPORTED',
          `Recovery strategy '${strategy.name}' conditions not met`
        );
      }

      let result: any;
      
      // Execute strategy based on name
      switch (strategy.name) {
        case 'provider_failover':
          result = await this.executeProviderFailover(error, strategy, context);
          break;
          
        case 'retry_with_backoff':
          result = await this.executeRetryWithBackoff(error, strategy, context);
          break;
          
        case 'payment_method_fallback':
          result = await this.executePaymentMethodFallback(error, strategy, context);
          break;
          
        case 'amount_adjustment':
          result = await this.executeAmountAdjustment(error, strategy, context);
          break;
          
        case 'manual_review':
          result = await this.executeManualReview(error, strategy, context);
          break;
          
        default:
          throw this.createError(
            error.provider,
            'FEATURE_NOT_SUPPORTED',
            `Unknown recovery strategy: ${strategy.name}`
          );
      }

      this.logErrorEvent('recovery.strategy.succeeded', context, {
        execution_id: executionId,
        strategy_name: strategy.name,
        result,
      });

      return result;
    } catch (recoveryError) {
      this.logErrorEvent('recovery.strategy.failed', context, {
        execution_id: executionId,
        strategy_name: strategy.name,
        recovery_error: recoveryError instanceof Error ? recoveryError.message : 'Recovery failed',
      });
      throw recoveryError;
    }
  }

  // =============================================================================
  // ERROR REPORTING AND ANALYTICS
  // =============================================================================

  /**
   * Report error for analytics and monitoring
   */
  async reportError(error: ProviderError, context: PaymentContext): Promise<void> {
    try {
      const reportData = {
        error_code: error.code,
        provider: error.provider,
        message: error.message,
        retryable: error.retryable,
        context: this.sanitizeContext(context),
        timestamp: new Date(),
        correlation_id: context.metadata?.correlation_id,
        user_id: context.userId,
      };

      // In a real implementation, this would send to monitoring service
      console.log('[PaymentErrorHandler] Error reported:', JSON.stringify(reportData, null, 2));

      // Emit error event
      await paymentEventBus.emit({
        id: this.generateEventId(),
        type: 'error.reported',
        provider: error.provider,
        timestamp: new Date(),
        data: reportData,
      });

    } catch (reportingError) {
      console.error('[PaymentErrorHandler] Failed to report error:', reportingError);
    }
  }

  /**
   * Get error statistics with filtering
   */
  async getErrorStats(
    provider?: PaymentProviderName,
    timeRange?: DateRange
  ): Promise<ErrorStats> {
    let relevantErrors = [...this.errorHistory];

    // Apply provider filter
    if (provider) {
      relevantErrors = relevantErrors.filter(record => record.provider === provider);
    }

    // Apply time range filter
    if (timeRange) {
      relevantErrors = relevantErrors.filter(record => 
        record.timestamp >= timeRange.start && record.timestamp <= timeRange.end
      );
    }

    // Calculate statistics
    const totalErrors = relevantErrors.length;
    const errorsByType: Record<string, number> = {};
    const errorsByProvider: Record<PaymentProviderName, number> = {};
    let resolvedErrors = 0;
    let totalResolutionTime = 0;

    // Top error codes tracking
    const errorCodeCounts: Record<string, number> = {};

    relevantErrors.forEach(record => {
      // Count by type
      const errorType = record.classification.category;
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

      // Count by provider
      errorsByProvider[record.provider] = (errorsByProvider[record.provider] || 0) + 1;

      // Count error codes
      errorCodeCounts[record.providerError.code] = (errorCodeCounts[record.providerError.code] || 0) + 1;

      // Calculate resolution stats
      if (record.recovery_successful) {
        resolvedErrors++;
        if (record.resolution_time_ms) {
          totalResolutionTime += record.resolution_time_ms;
        }
      }
    });

    // Get top error codes
    const topErrorCodes = Object.entries(errorCodeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    const resolutionRate = totalErrors > 0 ? resolvedErrors / totalErrors : 0;
    const averageResolutionTime = resolvedErrors > 0 ? totalResolutionTime / resolvedErrors : 0;

    return {
      total_errors: totalErrors,
      errors_by_type: errorsByType,
      errors_by_provider: errorsByProvider,
      resolution_rate: resolutionRate,
      average_resolution_time_ms: averageResolutionTime,
      top_error_codes: topErrorCodes,
    };
  }

  // =============================================================================
  // PRIVATE RECOVERY STRATEGY IMPLEMENTATIONS
  // =============================================================================

  /**
   * Execute provider failover recovery
   */
  private async executeProviderFailover(
    error: ProviderError,
    strategy: ErrorRecoveryStrategy,
    context: PaymentContext
  ): Promise<any> {
    if (!strategy.fallback_provider) {
      throw this.createError(
        error.provider,
        'PROVIDER_CONFIG_INVALID',
        'Failover strategy requires fallback provider'
      );
    }

    // Use orchestrator to route to different provider
    const fallbackProvider = await paymentOrchestrator.selectOptimalProvider(context, {
      exclude_providers: [error.provider],
    });

    return {
      success: true,
      fallback_provider: fallbackProvider.providerName,
      strategy_used: strategy.name,
    };
  }

  /**
   * Execute retry with exponential backoff
   */
  private async executeRetryWithBackoff(
    error: ProviderError,
    strategy: ErrorRecoveryStrategy,
    context: PaymentContext
  ): Promise<any> {
    let attempt = 0;
    
    while (attempt < strategy.max_attempts) {
      attempt++;
      
      if (attempt > 1) {
        const delayMs = strategy.delay_ms * Math.pow(2, attempt - 2);
        await this.delay(delayMs);
      }

      // In a real implementation, this would retry the original operation
      // For now, we'll simulate a retry
      const success = Math.random() > 0.5; // 50% success rate simulation
      
      if (success) {
        return {
          success: true,
          attempts: attempt,
          strategy_used: strategy.name,
        };
      }
    }

    throw this.createError(
      error.provider,
      'PROCESSING_FAILED',
      `Retry strategy failed after ${strategy.max_attempts} attempts`
    );
  }

  /**
   * Execute payment method fallback
   */
  private async executePaymentMethodFallback(
    error: ProviderError,
    strategy: ErrorRecoveryStrategy,
    context: PaymentContext
  ): Promise<any> {
    // In a real implementation, this would suggest alternative payment methods
    return {
      success: true,
      suggested_payment_methods: ['credit_card', 'bank_transfer'],
      strategy_used: strategy.name,
    };
  }

  /**
   * Execute amount adjustment recovery
   */
  private async executeAmountAdjustment(
    error: ProviderError,
    strategy: ErrorRecoveryStrategy,
    context: PaymentContext
  ): Promise<any> {
    // Adjust amount based on error (e.g., currency conversion issues)
    const adjustedAmount = Math.round(context.amount * 0.99); // Small adjustment
    
    return {
      success: true,
      original_amount: context.amount,
      adjusted_amount: adjustedAmount,
      strategy_used: strategy.name,
    };
  }

  /**
   * Execute manual review process
   */
  private async executeManualReview(
    error: ProviderError,
    strategy: ErrorRecoveryStrategy,
    context: PaymentContext
  ): Promise<any> {
    // Create manual review request
    const reviewId = this.generateReviewId();
    
    // In a real implementation, this would create a review ticket
    return {
      success: true,
      review_id: reviewId,
      estimated_resolution_time: '24 hours',
      strategy_used: strategy.name,
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Initialize built-in recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    const strategies: ErrorRecoveryStrategy[] = [
      {
        name: 'provider_failover',
        description: 'Switch to alternative payment provider',
        conditions: ['PROVIDER_UNAVAILABLE', 'PROVIDER_RATE_LIMITED'],
        max_attempts: 1,
        delay_ms: 0,
      },
      {
        name: 'retry_with_backoff',
        description: 'Retry with exponential backoff',
        conditions: ['NETWORK_ERROR', 'TIMEOUT_ERROR'],
        max_attempts: 3,
        delay_ms: 1000,
      },
      {
        name: 'payment_method_fallback',
        description: 'Suggest alternative payment methods',
        conditions: ['PAYMENT_METHOD_INVALID', 'PAYMENT_DECLINED'],
        max_attempts: 1,
        delay_ms: 0,
      },
      {
        name: 'amount_adjustment',
        description: 'Adjust payment amount for currency issues',
        conditions: ['CURRENCY_NOT_SUPPORTED', 'AMOUNT_TOO_SMALL'],
        max_attempts: 1,
        delay_ms: 0,
      },
      {
        name: 'manual_review',
        description: 'Escalate to manual review',
        conditions: ['FRAUD_DETECTED', 'COMPLIANCE_ISSUE'],
        max_attempts: 1,
        delay_ms: 0,
      },
    ];

    strategies.forEach(strategy => {
      this.recoveryStrategies.set(strategy.name, strategy);
    });
  }

  /**
   * Start error analytics background process
   */
  private startErrorAnalytics(): void {
    setInterval(() => {
      this.updateErrorTrends();
      this.cleanupOldErrors();
    }, 60000); // Every minute
  }

  /**
   * Check if error is a ProviderError
   */
  private isProviderError(error: unknown): error is ProviderError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      'provider' in error &&
      'retryable' in error
    );
  }

  /**
   * Classify ProviderError specifically
   */
  private classifyProviderError(error: ProviderError): PaymentErrorClassification {
    const classification: PaymentErrorClassification = {
      severity: this.determineSeverity(error.code),
      category: this.determineCategory(error.code),
      retryable: error.retryable,
      user_actionable: this.isUserActionable(error.code),
      provider_specific: true,
    };

    return classification;
  }

  /**
   * Classify standard Error
   */
  private classifyStandardError(error: Error): PaymentErrorClassification {
    const message = error.message.toLowerCase();
    
    return {
      severity: message.includes('timeout') || message.includes('network') ? 'medium' : 'high',
      category: this.categorizeFromMessage(message),
      retryable: message.includes('timeout') || message.includes('network') || message.includes('retry'),
      user_actionable: message.includes('invalid') || message.includes('required'),
      provider_specific: false,
    };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(code: ProviderErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCodes = ['PROVIDER_UNAVAILABLE', 'PROVIDER_CONFIG_INVALID'];
    const highCodes = ['PAYMENT_DECLINED', 'PAYMENT_FAILED', 'WEBHOOK_SIGNATURE_INVALID'];
    const mediumCodes = ['PROVIDER_RATE_LIMITED', 'AMOUNT_TOO_LARGE', 'CURRENCY_NOT_SUPPORTED'];
    
    if (criticalCodes.includes(code)) return 'critical';
    if (highCodes.includes(code)) return 'high';
    if (mediumCodes.includes(code)) return 'medium';
    return 'low';
  }

  /**
   * Determine error category
   */
  private determineCategory(code: ProviderErrorCode): 'network' | 'authentication' | 'validation' | 'business' | 'system' {
    if (code.includes('INVALID') || code.includes('REQUIRED')) return 'validation';
    if (code.includes('AUTH') || code.includes('UNAUTHORIZED')) return 'authentication';
    if (code.includes('NETWORK') || code.includes('TIMEOUT')) return 'network';
    if (code.includes('DECLINED') || code.includes('INSUFFICIENT')) return 'business';
    return 'system';
  }

  /**
   * Check if error requires user action
   */
  private isUserActionable(code: ProviderErrorCode): boolean {
    const userActionableCodes = [
      'PAYMENT_DECLINED',
      'PAYMENT_INSUFFICIENT_FUNDS',
      'PAYMENT_METHOD_INVALID',
      'AMOUNT_TOO_SMALL',
      'AMOUNT_TOO_LARGE',
    ];
    
    return userActionableCodes.includes(code);
  }

  /**
   * Categorize error from message
   */
  private categorizeFromMessage(message: string): 'network' | 'authentication' | 'validation' | 'business' | 'system' {
    if (message.includes('network') || message.includes('timeout')) return 'network';
    if (message.includes('auth') || message.includes('unauthorized')) return 'authentication';
    if (message.includes('invalid') || message.includes('required')) return 'validation';
    if (message.includes('declined') || message.includes('insufficient')) return 'business';
    return 'system';
  }

  /**
   * Record error in history
   */
  private recordError(
    error: unknown,
    context: PaymentContext,
    classification: PaymentErrorClassification,
    handlingId: string
  ): ErrorRecord {
    const providerError = this.normalizeToProviderError(error);
    
    const record: ErrorRecord = {
      id: handlingId,
      timestamp: new Date(),
      provider: providerError.provider,
      providerError,
      classification,
      context: this.sanitizeContext(context),
      recovery_attempted: false,
      recovery_successful: false,
    };

    this.errorHistory.push(record);
    
    // Maintain history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.splice(0, this.errorHistory.length - this.maxHistorySize);
    }

    return record;
  }

  /**
   * Normalize any error to ProviderError
   */
  private normalizeToProviderError(error: unknown): ProviderError {
    if (this.isProviderError(error)) {
      return error;
    }

    // Convert standard error to ProviderError
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return this.createError(
      'stripe', // Default provider
      'PROCESSING_FAILED',
      message,
      {
        original_error: error,
      }
    );
  }

  /**
   * Sanitize context for logging
   */
  private sanitizeContext(context: PaymentContext): Partial<PaymentContext> {
    return {
      userId: context.userId,
      currency: context.currency,
      amount: context.amount,
      paymentMethod: context.paymentMethod,
      billing_country: context.billing_country,
      // Exclude sensitive metadata
    };
  }

  /**
   * Check if recovery should be attempted
   */
  private shouldAttemptRecovery(
    classification: PaymentErrorClassification,
    context: PaymentContext
  ): boolean {
    // Don't attempt recovery for critical user errors
    if (classification.severity === 'critical' && classification.user_actionable) {
      return false;
    }

    // Always attempt recovery for retryable errors
    if (classification.retryable) {
      return true;
    }

    // Attempt recovery for system errors
    if (classification.category === 'system' || classification.category === 'network') {
      return true;
    }

    return false;
  }

  /**
   * Attempt error recovery
   */
  private async attemptErrorRecovery(
    error: ProviderError,
    context: PaymentContext,
    classification: PaymentErrorClassification
  ): Promise<{ success: boolean; fallback_provider?: PaymentProviderName; strategy_used?: string }> {
    // Find applicable recovery strategy
    const strategy = this.findRecoveryStrategy(error, classification);
    if (!strategy) {
      return { success: false };
    }

    try {
      const result = await this.executeRecoveryStrategy(error, strategy, context);
      return {
        success: true,
        fallback_provider: result.fallback_provider,
        strategy_used: strategy.name,
      };
    } catch (recoveryError) {
      return { success: false, strategy_used: strategy.name };
    }
  }

  /**
   * Find applicable recovery strategy
   */
  private findRecoveryStrategy(
    error: ProviderError,
    classification: PaymentErrorClassification
  ): ErrorRecoveryStrategy | null {
    for (const strategy of this.recoveryStrategies.values()) {
      if (strategy.conditions.includes(error.code)) {
        return strategy;
      }
    }
    
    // Fallback strategies based on classification
    if (classification.retryable) {
      return this.recoveryStrategies.get('retry_with_backoff') || null;
    }
    
    if (classification.category === 'business') {
      return this.recoveryStrategies.get('manual_review') || null;
    }

    return null;
  }

  /**
   * Validate strategy conditions
   */
  private validateStrategyConditions(
    strategy: ErrorRecoveryStrategy,
    error: ProviderError,
    context: PaymentContext
  ): boolean {
    // Check if error code matches strategy conditions
    if (!strategy.conditions.includes(error.code)) {
      return false;
    }

    // Additional context-based validation could go here
    return true;
  }

  /**
   * Determine if retry should be recommended
   */
  private shouldRecommendRetry(
    classification: PaymentErrorClassification,
    context: PaymentContext
  ): boolean {
    return classification.retryable && 
           classification.category !== 'business' &&
           !classification.user_actionable;
  }

  /**
   * Check if user action is required
   */
  private requiresUserAction(classification: PaymentErrorClassification): boolean {
    return classification.user_actionable || 
           classification.category === 'validation' ||
           classification.category === 'business';
  }

  /**
   * Update error statistics
   */
  private updateErrorStatistics(record: ErrorRecord): void {
    const key = `${record.provider}_${record.providerError.code}`;
    const existing = this.errorStats.get(key);
    
    if (existing) {
      existing.count++;
      existing.last_occurrence = record.timestamp;
      if (record.recovery_successful) {
        existing.successful_recoveries++;
      }
    } else {
      this.errorStats.set(key, {
        provider: record.provider,
        error_code: record.providerError.code,
        count: 1,
        first_occurrence: record.timestamp,
        last_occurrence: record.timestamp,
        successful_recoveries: record.recovery_successful ? 1 : 0,
        recovery_rate: record.recovery_successful ? 1.0 : 0.0,
      });
    }

    // Update recovery rate
    const stat = this.errorStats.get(key)!;
    stat.recovery_rate = stat.successful_recoveries / stat.count;
  }

  /**
   * Update error trends analysis
   */
  private updateErrorTrends(): void {
    // Analyze recent error patterns
    const recentErrors = this.errorHistory.filter(
      record => record.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    if (recentErrors.length > 0) {
      console.log(`[PaymentErrorHandler] Analyzed ${recentErrors.length} recent errors`);
    }
  }

  /**
   * Clean up old error records
   */
  private cleanupOldErrors(): void {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const initialLength = this.errorHistory.length;
    
    // Remove errors older than cutoff
    const filtered = this.errorHistory.filter(record => record.timestamp > cutoffDate);
    this.errorHistory.splice(0, this.errorHistory.length, ...filtered);
    
    const removed = initialLength - this.errorHistory.length;
    if (removed > 0) {
      console.log(`[PaymentErrorHandler] Cleaned up ${removed} old error records`);
    }
  }

  /**
   * Generate unique handling ID
   */
  private generateHandlingId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique review ID
   */
  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create provider error with proper typing
   */
  private createProviderError<P extends PaymentProviderName>(
    provider: P,
    code: ProviderErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      context?: Record<string, any>;
      original_error?: unknown;
    } = {}
  ): ProviderError {
    const error = new Error(message) as ProviderError;
    error.code = code;
    error.provider = provider;
    error.retryable = options.retryable ?? false;
    error.context = options.context;
    error.original_error = options.original_error;
    
    return error;
  }

  /**
   * Log error handling events
   */
  private logErrorEvent(
    type: string,
    context: PaymentContext,
    data: Record<string, any> = {}
  ): void {
    console.log(`[PaymentErrorHandler] ${type}:`, {
      user_id: context.userId,
      currency: context.currency,
      amount: context.amount,
      ...data,
    });
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

interface ErrorRecord {
  id: string;
  timestamp: Date;
  provider: PaymentProviderName;
  providerError: ProviderError;
  classification: PaymentErrorClassification;
  context: Partial<PaymentContext>;
  recovery_attempted: boolean;
  recovery_successful: boolean;
  recovery_strategy?: string;
  resolution_time_ms?: number;
}

interface ErrorStatistic {
  provider: PaymentProviderName;
  error_code: ProviderErrorCode;
  count: number;
  first_occurrence: Date;
  last_occurrence: Date;
  successful_recoveries: number;
  recovery_rate: number;
}

// Export singleton instance
export const paymentErrorHandler = PaymentErrorHandler.getInstance();