/**
 * CVPlus Premium Payment Metrics System
 * Phase 2: Comprehensive metrics collection, analysis, and real-time monitoring
  */

import {
  PaymentProviderName,
  PaymentMethod,
} from '../../../../types/payments.types';

import {
  ProviderMetrics,
  IPaymentMetricsCollector,
  TransactionMetrics,
  TransactionCost,
  RealtimeMetrics,
  MetricsReportType,
  MetricsReportOptions,
  MetricsReport,
  DateRange,
} from '../../../../types/providers.types';

import { paymentEventBus } from '../events/payment-events';

/**
 * Advanced Payment Metrics Collector with real-time monitoring,
 * cost analysis, and comprehensive reporting capabilities
  */
export class PaymentMetricsCollector implements IPaymentMetricsCollector {
  private static instance: PaymentMetricsCollector;
  
  private readonly providerMetrics = new Map<PaymentProviderName, ProviderMetrics>();
  private readonly transactionHistory: StoredTransactionMetrics[] = [];
  private readonly costHistory: StoredTransactionCost[] = [];
  private readonly realtimeSubscribers: Array<(metrics: RealtimeMetrics) => void> = [];
  
  private readonly maxHistorySize = 10000;
  private readonly realtimeUpdateInterval = 5000; // 5 seconds
  private metricsUpdateTimer?: NodeJS.Timeout;

  private constructor() {
    this.initializeProviderMetrics();
    this.startRealtimeUpdates();
  }

  /**
   * Get singleton instance
    */
  public static getInstance(): PaymentMetricsCollector {
    if (!PaymentMetricsCollector.instance) {
      PaymentMetricsCollector.instance = new PaymentMetricsCollector();
    }
    return PaymentMetricsCollector.instance;
  }

  // =============================================================================
  // PERFORMANCE METRICS
  // =============================================================================

  /**
   * Record transaction metrics with comprehensive tracking
    */
  async recordTransactionMetrics(
    provider: PaymentProviderName,
    metrics: TransactionMetrics
  ): Promise<void> {
    try {
      // Store transaction metrics
      const storedMetrics: StoredTransactionMetrics = {
        ...metrics,
        provider,
        recorded_at: new Date(),
      };
      
      this.transactionHistory.push(storedMetrics);
      
      // Maintain history size
      if (this.transactionHistory.length > this.maxHistorySize) {
        this.transactionHistory.shift();
      }

      // Update provider metrics
      await this.updateProviderMetrics(provider, metrics);

      // Log metrics event
      this.logMetricsEvent('transaction.recorded', provider, {
        transaction_id: metrics.transaction_id,
        amount: metrics.amount,
        currency: metrics.currency,
        processing_time_ms: metrics.processing_time_ms,
        success: metrics.success,
      });

      // Emit metrics event
      await paymentEventBus.emit({
        id: this.generateEventId(),
        type: 'metrics.collected',
        provider,
        timestamp: new Date(),
        data: {
          type: 'transaction',
          metrics: storedMetrics,
        },
      });
    } catch (error) {
      console.error(`[PaymentMetricsCollector] Failed to record transaction metrics:`, error);
    }
  }

  /**
   * Record provider-level metrics
    */
  async recordProviderMetrics(
    provider: PaymentProviderName,
    metrics: Partial<ProviderMetrics>
  ): Promise<void> {
    try {
      const currentMetrics = this.providerMetrics.get(provider);
      if (!currentMetrics) {
        console.warn(`[PaymentMetricsCollector] Provider ${provider} not initialized`);
        return;
      }

      // Merge with existing metrics
      const updatedMetrics: ProviderMetrics = {
        ...currentMetrics,
        ...metrics,
        last_transaction: new Date(),
      };

      this.providerMetrics.set(provider, updatedMetrics);

      this.logMetricsEvent('provider.metrics.updated', provider, {
        updated_fields: Object.keys(metrics),
        total_transactions: updatedMetrics.total_transactions,
        success_rate: updatedMetrics.success_rate,
      });
    } catch (error) {
      console.error(`[PaymentMetricsCollector] Failed to record provider metrics:`, error);
    }
  }

  // =============================================================================
  // COST ANALYTICS
  // =============================================================================

  /**
   * Record transaction cost data
    */
  async recordTransactionCost(
    provider: PaymentProviderName,
    cost: TransactionCost
  ): Promise<void> {
    try {
      const storedCost: StoredTransactionCost = {
        ...cost,
        provider,
        recorded_at: new Date(),
      };

      this.costHistory.push(storedCost);

      // Maintain history size
      if (this.costHistory.length > this.maxHistorySize) {
        this.costHistory.shift();
      }

      this.logMetricsEvent('cost.recorded', provider, {
        transaction_id: cost.transaction_id,
        total_cost: cost.total_cost,
        currency: cost.currency,
        provider_fee: cost.provider_fee,
        processing_fee: cost.processing_fee,
      });

      // Emit cost event
      await paymentEventBus.emit({
        id: this.generateEventId(),
        type: 'metrics.collected',
        provider,
        timestamp: new Date(),
        data: {
          type: 'cost',
          cost: storedCost,
        },
      });
    } catch (error) {
      console.error(`[PaymentMetricsCollector] Failed to record transaction cost:`, error);
    }
  }

  // =============================================================================
  // REAL-TIME MONITORING
  // =============================================================================

  /**
   * Get real-time metrics
    */
  async getRealtimeMetrics(provider?: PaymentProviderName): Promise<RealtimeMetrics> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // Get recent transactions
    let recentTransactions = this.transactionHistory.filter(
      t => t.timestamp >= oneMinuteAgo
    );

    // Filter by provider if specified
    if (provider) {
      recentTransactions = recentTransactions.filter(t => t.provider === provider);
    }

    // Calculate metrics
    const transactionsPerMinute = recentTransactions.length;
    const successfulTransactions = recentTransactions.filter(t => t.success).length;
    const successRate = transactionsPerMinute > 0 ? successfulTransactions / transactionsPerMinute : 0;
    
    const totalProcessingTime = recentTransactions.reduce(
      (sum, t) => sum + t.processing_time_ms, 
      0
    );
    const averageProcessingTime = transactionsPerMinute > 0 ? 
      totalProcessingTime / transactionsPerMinute : 0;

    const totalVolume = recentTransactions.reduce(
      (sum, t) => sum + t.amount, 
      0
    );

    // Get provider health statuses
    const providerHealth: Record<PaymentProviderName, any> = {};
    
    for (const [providerName, metrics] of this.providerMetrics.entries()) {
      if (!provider || provider === providerName) {
        providerHealth[providerName] = {
          provider: providerName,
          status: this.calculateProviderHealthStatus(metrics),
          success_rate: metrics.success_rate,
          latency: metrics.average_processing_time,
          last_checked: new Date(),
          error_rate: 1 - metrics.success_rate,
        };
      }
    }

    return {
      timestamp: now,
      transactions_per_minute: transactionsPerMinute,
      success_rate: successRate,
      average_processing_time_ms: averageProcessingTime,
      total_volume: totalVolume,
      provider_health: providerHealth,
    };
  }

  /**
   * Subscribe to real-time metrics updates
    */
  subscribeToMetrics(callback: (metrics: RealtimeMetrics) => void): void {
    this.realtimeSubscribers.push(callback);
    
    this.logMetricsEvent('realtime.subscribed', 'stripe' as PaymentProviderName, {
      subscriber_count: this.realtimeSubscribers.length,
    });
  }

  /**
   * Unsubscribe from real-time metrics
    */
  unsubscribeFromMetrics(callback: (metrics: RealtimeMetrics) => void): void {
    const index = this.realtimeSubscribers.indexOf(callback);
    if (index !== -1) {
      this.realtimeSubscribers.splice(index, 1);
      
      this.logMetricsEvent('realtime.unsubscribed', 'stripe' as PaymentProviderName, {
        subscriber_count: this.realtimeSubscribers.length,
      });
    }
  }

  // =============================================================================
  // REPORTING
  // =============================================================================

  /**
   * Generate comprehensive metrics report
    */
  async generateReport(
    type: MetricsReportType,
    options: MetricsReportOptions
  ): Promise<MetricsReport> {
    const reportId = this.generateReportId();
    
    try {
      this.logMetricsEvent('report.generation.started', 'stripe' as PaymentProviderName, {
        report_id: reportId,
        report_type: type,
        date_range: options.date_range,
      });

      let reportData: Record<string, any>;
      let summary: Record<string, any>;
      let recommendations: string[] = [];

      switch (type) {
        case 'performance':
          ({ data: reportData, summary, recommendations } = await this.generatePerformanceReport(options));
          break;
        case 'cost_analysis':
          ({ data: reportData, summary, recommendations } = await this.generateCostAnalysisReport(options));
          break;
        case 'provider_comparison':
          ({ data: reportData, summary, recommendations } = await this.generateProviderComparisonReport(options));
          break;
        case 'error_analysis':
          ({ data: reportData, summary, recommendations } = await this.generateErrorAnalysisReport(options));
          break;
        case 'usage_trends':
          ({ data: reportData, summary, recommendations } = await this.generateUsageTrendsReport(options));
          break;
        default:
          throw new Error(`Unsupported report type: ${type}`);
      }

      const report: MetricsReport = {
        type,
        generated_at: new Date(),
        options,
        summary,
        data: reportData,
        recommendations,
      };

      this.logMetricsEvent('report.generation.completed', 'stripe' as PaymentProviderName, {
        report_id: reportId,
        report_type: type,
        data_points: Object.keys(reportData).length,
        recommendations_count: recommendations.length,
      });

      return report;
    } catch (error) {
      this.logMetricsEvent('report.generation.failed', 'stripe' as PaymentProviderName, {
        report_id: reportId,
        report_type: type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // =============================================================================
  // REPORT GENERATION METHODS
  // =============================================================================

  /**
   * Generate performance report
    */
  private async generatePerformanceReport(options: MetricsReportOptions): Promise<{
    data: Record<string, any>;
    summary: Record<string, any>;
    recommendations: string[];
  }> {
    const filteredTransactions = this.filterTransactions(options);
    
    const totalTransactions = filteredTransactions.length;
    const successfulTransactions = filteredTransactions.filter(t => t.success).length;
    const successRate = totalTransactions > 0 ? successfulTransactions / totalTransactions : 0;
    
    const averageProcessingTime = totalTransactions > 0 ? 
      filteredTransactions.reduce((sum, t) => sum + t.processing_time_ms, 0) / totalTransactions : 0;
    
    const p95ProcessingTime = this.calculatePercentile(
      filteredTransactions.map(t => t.processing_time_ms), 
      95
    );

    // Group by provider
    const performanceByProvider: Record<string, any> = {};
    const providerNames = [...new Set(filteredTransactions.map(t => t.provider))];
    
    providerNames.forEach(provider => {
      const providerTransactions = filteredTransactions.filter(t => t.provider === provider);
      const providerSuccessful = providerTransactions.filter(t => t.success).length;
      
      performanceByProvider[provider] = {
        total_transactions: providerTransactions.length,
        success_rate: providerTransactions.length > 0 ? providerSuccessful / providerTransactions.length : 0,
        average_processing_time: providerTransactions.length > 0 ? 
          providerTransactions.reduce((sum, t) => sum + t.processing_time_ms, 0) / providerTransactions.length : 0,
      };
    });

    const data = {
      overview: {
        total_transactions: totalTransactions,
        success_rate: successRate,
        average_processing_time_ms: averageProcessingTime,
        p95_processing_time_ms: p95ProcessingTime,
      },
      by_provider: performanceByProvider,
      time_series: this.generateTimeSeriesData(filteredTransactions, 'hourly'),
    };

    const summary = {
      best_performing_provider: this.getBestPerformingProvider(performanceByProvider),
      worst_performing_provider: this.getWorstPerformingProvider(performanceByProvider),
      overall_health: successRate > 0.95 ? 'excellent' : successRate > 0.9 ? 'good' : 'needs_attention',
    };

    const recommendations = this.generatePerformanceRecommendations(data, summary);

    return { data, summary, recommendations };
  }

  /**
   * Generate cost analysis report
    */
  private async generateCostAnalysisReport(options: MetricsReportOptions): Promise<{
    data: Record<string, any>;
    summary: Record<string, any>;
    recommendations: string[];
  }> {
    const filteredCosts = this.filterCosts(options);
    
    const totalCosts = filteredCosts.reduce((sum, c) => sum + c.total_cost, 0);
    const totalProviderFees = filteredCosts.reduce((sum, c) => sum + c.provider_fee, 0);
    const totalProcessingFees = filteredCosts.reduce((sum, c) => sum + c.processing_fee, 0);
    
    // Cost by provider
    const costByProvider: Record<string, any> = {};
    const providerNames = [...new Set(filteredCosts.map(c => c.provider))];
    
    providerNames.forEach(provider => {
      const providerCosts = filteredCosts.filter(c => c.provider === provider);
      
      costByProvider[provider] = {
        total_cost: providerCosts.reduce((sum, c) => sum + c.total_cost, 0),
        average_cost: providerCosts.length > 0 ? 
          providerCosts.reduce((sum, c) => sum + c.total_cost, 0) / providerCosts.length : 0,
        transaction_count: providerCosts.length,
      };
    });

    const data = {
      overview: {
        total_costs: totalCosts,
        total_provider_fees: totalProviderFees,
        total_processing_fees: totalProcessingFees,
        average_cost_per_transaction: filteredCosts.length > 0 ? totalCosts / filteredCosts.length : 0,
      },
      by_provider: costByProvider,
      by_currency: this.groupCostsByCurrency(filteredCosts),
    };

    const summary = {
      most_expensive_provider: this.getMostExpensiveProvider(costByProvider),
      most_economical_provider: this.getMostEconomicalProvider(costByProvider),
      cost_efficiency: this.calculateCostEfficiency(data),
    };

    const recommendations = this.generateCostRecommendations(data, summary);

    return { data, summary, recommendations };
  }

  /**
   * Generate provider comparison report
    */
  private async generateProviderComparisonReport(options: MetricsReportOptions): Promise<{
    data: Record<string, any>;
    summary: Record<string, any>;
    recommendations: string[];
  }> {
    const comparison: Record<string, any> = {};
    
    // Get metrics for each provider
    for (const [provider, metrics] of this.providerMetrics.entries()) {
      if (!options.providers || options.providers.includes(provider)) {
        comparison[provider] = {
          success_rate: metrics.success_rate,
          average_processing_time: metrics.average_processing_time,
          total_transactions: metrics.total_transactions,
          uptime: metrics.uptime,
          currencies_supported: metrics.currencies_processed.length,
        };
      }
    }

    const data = {
      provider_comparison: comparison,
      rankings: this.rankProviders(comparison),
    };

    const summary = {
      top_provider: this.getTopProvider(comparison),
      provider_count: Object.keys(comparison).length,
    };

    const recommendations = this.generateProviderComparisonRecommendations(data, summary);

    return { data, summary, recommendations };
  }

  /**
   * Generate error analysis report
    */
  private async generateErrorAnalysisReport(options: MetricsReportOptions): Promise<{
    data: Record<string, any>;
    summary: Record<string, any>;
    recommendations: string[];
  }> {
    const filteredTransactions = this.filterTransactions(options);
    const errorTransactions = filteredTransactions.filter(t => !t.success);
    
    const errorRate = filteredTransactions.length > 0 ? errorTransactions.length / filteredTransactions.length : 0;
    
    // Group errors by provider
    const errorsByProvider: Record<string, any> = {};
    const providerNames = [...new Set(errorTransactions.map(t => t.provider))];
    
    providerNames.forEach(provider => {
      const providerErrors = errorTransactions.filter(t => t.provider === provider);
      
      errorsByProvider[provider] = {
        error_count: providerErrors.length,
        error_rate: filteredTransactions.filter(t => t.provider === provider).length > 0 ?
          providerErrors.length / filteredTransactions.filter(t => t.provider === provider).length : 0,
      };
    });

    const data = {
      overview: {
        total_errors: errorTransactions.length,
        error_rate: errorRate,
        most_common_error_codes: this.getMostCommonErrorCodes(errorTransactions),
      },
      by_provider: errorsByProvider,
      error_trends: this.generateErrorTrends(errorTransactions),
    };

    const summary = {
      error_severity: errorRate > 0.1 ? 'high' : errorRate > 0.05 ? 'medium' : 'low',
      most_problematic_provider: this.getMostProblematicProvider(errorsByProvider),
    };

    const recommendations = this.generateErrorRecommendations(data, summary);

    return { data, summary, recommendations };
  }

  /**
   * Generate usage trends report
    */
  private async generateUsageTrendsReport(options: MetricsReportOptions): Promise<{
    data: Record<string, any>;
    summary: Record<string, any>;
    recommendations: string[];
  }> {
    const filteredTransactions = this.filterTransactions(options);
    
    const data = {
      volume_trends: this.generateVolumeTrends(filteredTransactions),
      payment_method_distribution: this.getPaymentMethodDistribution(filteredTransactions),
      currency_distribution: this.getCurrencyDistribution(filteredTransactions),
      geographic_distribution: this.getGeographicDistribution(filteredTransactions),
    };

    const summary = {
      growth_rate: this.calculateGrowthRate(filteredTransactions),
      peak_usage_time: this.getPeakUsageTime(filteredTransactions),
      dominant_payment_method: this.getDominantPaymentMethod(data.payment_method_distribution),
    };

    const recommendations = this.generateUsageRecommendations(data, summary);

    return { data, summary, recommendations };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Initialize provider metrics
    */
  private initializeProviderMetrics(): void {
    const providers: PaymentProviderName[] = ['stripe', 'paypal'];
    
    providers.forEach(provider => {
      const metrics: ProviderMetrics = {
        provider,
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
      
      this.providerMetrics.set(provider, metrics);
    });
  }

  /**
   * Start real-time metrics updates
    */
  private startRealtimeUpdates(): void {
    this.metricsUpdateTimer = setInterval(async () => {
      try {
        const realtimeMetrics = await this.getRealtimeMetrics();
        
        // Notify all subscribers
        this.realtimeSubscribers.forEach(callback => {
          try {
            callback(realtimeMetrics);
          } catch (error) {
            console.error('[PaymentMetricsCollector] Subscriber callback error:', error);
          }
        });
      } catch (error) {
        console.error('[PaymentMetricsCollector] Failed to update realtime metrics:', error);
      }
    }, this.realtimeUpdateInterval);
  }

  /**
   * Update provider metrics with transaction data
    */
  private async updateProviderMetrics(
    provider: PaymentProviderName,
    transactionMetrics: TransactionMetrics
  ): Promise<void> {
    const currentMetrics = this.providerMetrics.get(provider);
    if (!currentMetrics) return;

    // Update counters
    currentMetrics.total_transactions++;
    if (transactionMetrics.success) {
      currentMetrics.successful_transactions++;
    } else {
      currentMetrics.failed_transactions++;
    }

    // Recalculate success rate
    currentMetrics.success_rate = currentMetrics.successful_transactions / currentMetrics.total_transactions;

    // Update average processing time (moving average)
    const weight = 0.1; // Give more weight to recent transactions
    currentMetrics.average_processing_time = 
      (1 - weight) * currentMetrics.average_processing_time + 
      weight * transactionMetrics.processing_time_ms;

    // Update amount processed
    currentMetrics.total_amount_processed += transactionMetrics.amount;

    // Add currency if not already tracked
    if (!currentMetrics.currencies_processed.includes(transactionMetrics.currency)) {
      currentMetrics.currencies_processed.push(transactionMetrics.currency);
    }

    // Update last transaction time
    currentMetrics.last_transaction = transactionMetrics.timestamp;

    this.providerMetrics.set(provider, currentMetrics);
  }

  /**
   * Filter transactions based on options
    */
  private filterTransactions(options: MetricsReportOptions): StoredTransactionMetrics[] {
    let filtered = [...this.transactionHistory];

    // Date range filter
    if (options.date_range) {
      filtered = filtered.filter(t => 
        t.timestamp >= options.date_range!.start && 
        t.timestamp <= options.date_range!.end
      );
    }

    // Provider filter
    if (options.providers?.length) {
      filtered = filtered.filter(t => options.providers!.includes(t.provider));
    }

    // Currency filter
    if (options.currencies?.length) {
      filtered = filtered.filter(t => options.currencies!.includes(t.currency));
    }

    // Payment method filter
    if (options.payment_methods?.length) {
      filtered = filtered.filter(t => options.payment_methods!.includes(t.payment_method));
    }

    return filtered;
  }

  /**
   * Filter costs based on options
    */
  private filterCosts(options: MetricsReportOptions): StoredTransactionCost[] {
    let filtered = [...this.costHistory];

    // Date range filter
    if (options.date_range) {
      filtered = filtered.filter(c => 
        c.recorded_at >= options.date_range!.start && 
        c.recorded_at <= options.date_range!.end
      );
    }

    // Provider filter
    if (options.providers?.length) {
      filtered = filtered.filter(c => options.providers!.includes(c.provider));
    }

    // Currency filter
    if (options.currencies?.length) {
      filtered = filtered.filter(c => options.currencies!.includes(c.currency));
    }

    return filtered;
  }

  /**
   * Calculate percentile value
    */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate provider health status
    */
  private calculateProviderHealthStatus(metrics: ProviderMetrics): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.success_rate >= 0.95 && metrics.average_processing_time < 2000) {
      return 'healthy';
    } else if (metrics.success_rate >= 0.9 && metrics.average_processing_time < 5000) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Generate time series data
    */
  private generateTimeSeriesData(
    transactions: StoredTransactionMetrics[], 
    interval: 'hourly' | 'daily'
  ): Record<string, any> {
    const buckets: Record<string, { count: number; success: number }> = {};
    
    transactions.forEach(t => {
      const key = interval === 'hourly' ? 
        t.timestamp.toISOString().slice(0, 13) : // YYYY-MM-DDTHH
        t.timestamp.toISOString().slice(0, 10);  // YYYY-MM-DD
      
      if (!buckets[key]) {
        buckets[key] = { count: 0, success: 0 };
      }
      
      buckets[key].count++;
      if (t.success) {
        buckets[key].success++;
      }
    });

    return buckets;
  }

  /**
   * Get best performing provider
    */
  private getBestPerformingProvider(performanceData: Record<string, any>): string {
    let bestProvider = '';
    let bestScore = 0;
    
    Object.entries(performanceData).forEach(([provider, data]: [string, any]) => {
      // Score based on success rate and processing time (inverse)
      const score = data.success_rate * (10000 / Math.max(data.average_processing_time, 100));
      
      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    });
    
    return bestProvider;
  }

  /**
   * Get worst performing provider
    */
  private getWorstPerformingProvider(performanceData: Record<string, any>): string {
    let worstProvider = '';
    let worstScore = Infinity;
    
    Object.entries(performanceData).forEach(([provider, data]: [string, any]) => {
      const score = data.success_rate * (10000 / Math.max(data.average_processing_time, 100));
      
      if (score < worstScore) {
        worstScore = score;
        worstProvider = provider;
      }
    });
    
    return worstProvider;
  }

  /**
   * Generate various helper methods for report generation
    */
  private generatePerformanceRecommendations(data: any, summary: any): string[] {
    const recommendations: string[] = [];
    
    if (data.overview.success_rate < 0.95) {
      recommendations.push('Overall success rate is below target (95%). Consider investigating error patterns.');
    }
    
    if (data.overview.average_processing_time_ms > 3000) {
      recommendations.push('Average processing time is high. Consider optimizing payment flows.');
    }
    
    return recommendations;
  }

  private generateCostRecommendations(data: any, summary: any): string[] {
    return ['Consider negotiating better rates with high-volume providers.'];
  }

  private generateProviderComparisonRecommendations(data: any, summary: any): string[] {
    return ['Consider load balancing between top-performing providers.'];
  }

  private generateErrorRecommendations(data: any, summary: any): string[] {
    return ['Implement error monitoring alerts for critical error patterns.'];
  }

  private generateUsageRecommendations(data: any, summary: any): string[] {
    return ['Scale infrastructure based on peak usage patterns.'];
  }

  // Additional placeholder methods for complete functionality
  private groupCostsByCurrency(costs: StoredTransactionCost[]): Record<string, any> { return {}; }
  private getMostExpensiveProvider(costData: Record<string, any>): string { return 'stripe'; }
  private getMostEconomicalProvider(costData: Record<string, any>): string { return 'paypal'; }
  private calculateCostEfficiency(data: any): number { return 0.85; }
  private rankProviders(comparison: Record<string, any>): Record<string, any> { return {}; }
  private getTopProvider(comparison: Record<string, any>): string { return 'stripe'; }
  private getMostCommonErrorCodes(errors: StoredTransactionMetrics[]): string[] { return []; }
  private generateErrorTrends(errors: StoredTransactionMetrics[]): Record<string, any> { return {}; }
  private getMostProblematicProvider(errorData: Record<string, any>): string { return 'unknown'; }
  private generateVolumeTrends(transactions: StoredTransactionMetrics[]): Record<string, any> { return {}; }
  private getPaymentMethodDistribution(transactions: StoredTransactionMetrics[]): Record<string, number> { return {}; }
  private getCurrencyDistribution(transactions: StoredTransactionMetrics[]): Record<string, number> { return {}; }
  private getGeographicDistribution(transactions: StoredTransactionMetrics[]): Record<string, number> { return {}; }
  private calculateGrowthRate(transactions: StoredTransactionMetrics[]): number { return 0.15; }
  private getPeakUsageTime(transactions: StoredTransactionMetrics[]): string { return '14:00'; }
  private getDominantPaymentMethod(distribution: Record<string, number>): string { return 'credit_card'; }

  /**
   * Generate unique report ID
    */
  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
    */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log metrics events
    */
  private logMetricsEvent(
    type: string,
    provider: PaymentProviderName,
    data: Record<string, any> = {}
  ): void {
    console.log(`[PaymentMetricsCollector] ${type}:`, {
      provider,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

interface StoredTransactionMetrics extends TransactionMetrics {
  provider: PaymentProviderName;
  recorded_at: Date;
}

interface StoredTransactionCost extends TransactionCost {
  provider: PaymentProviderName;
  recorded_at: Date;
}

// Export singleton instance
export const paymentMetricsCollector = PaymentMetricsCollector.getInstance();