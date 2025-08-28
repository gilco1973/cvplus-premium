/**
 * CVPlus Premium Payment Services Index
 * Phase 2: Complete payment abstraction layer with advanced features
 */

// =============================================================================
// PHASE 1: Core Provider System
// =============================================================================
export { PaymentProviderFactory, paymentProviderFactory } from './provider-factory';
export { BasePaymentProvider } from './providers/base-provider';
export { StripePaymentProvider } from './providers/stripe-provider';

// =============================================================================
// PHASE 2: Advanced Provider Abstraction Layer
// =============================================================================

// Provider Registry
export { ProviderRegistry, providerRegistry } from './provider-registry';

// Configuration Management  
export { ProviderConfigurationManager, configurationManager } from './config-manager';

// Event System
export { 
  PaymentEventBus, 
  paymentEventBus,
  LoggingEventHandler,
  MetricsCollectionEventHandler,
  type PaymentEventType,
  type PaymentEvent,
  type PaymentEventHandler,
  type EventMiddleware,
  type EventSubscriptionOptions,
} from './events/payment-events';

// Payment Orchestration
export { PaymentOrchestrator, paymentOrchestrator } from './payment-orchestrator';

// Error Handling
export { PaymentErrorHandler, paymentErrorHandler } from './errors/payment-errors';

// Metrics Collection
export { PaymentMetricsCollector, paymentMetricsCollector } from './metrics/payment-metrics';

// Request Validation
export { 
  PaymentRequestValidator, 
  paymentRequestValidator,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './validation/request-validator';

// Testing Types
export type {
  MockPaymentProvider,
  MockProviderBehavior,
  MockCallRecord,
  MockProviderFactory,
  PaymentTestFixtures,
  TestCustomerFixture,
  TestPaymentRequestFixture,
  PaymentAssertions,
  TestDataBuilder,
  PaymentTestToolkit,
  TestResults,
  LoadTestConfig,
  PerformanceTestResults,
} from './__tests__/types/test-types';

// =============================================================================
// PHASE 2: CONVENIENCE EXPORTS
// =============================================================================

/**
 * Complete Payment Processing System
 * Main entry point for payment processing with full feature set
 */
export class PaymentSystem {
  public readonly registry = providerRegistry;
  public readonly configManager = configurationManager;
  public readonly eventBus = paymentEventBus;
  public readonly orchestrator = paymentOrchestrator;
  public readonly errorHandler = paymentErrorHandler;
  public readonly metricsCollector = paymentMetricsCollector;
  public readonly requestValidator = paymentRequestValidator;
  public readonly providerFactory = paymentProviderFactory;

  /**
   * Initialize the complete payment system
   */
  async initialize(): Promise<void> {
    console.log('[PaymentSystem] Initializing advanced payment processing system...');
    
    // Auto-discover and register providers
    await this.registry.discoverProviders();
    
    // Start health monitoring
    await this.registry.performHealthCheck();
    
    // Initialize metrics collection
    console.log('[PaymentSystem] Payment system initialized successfully');
    console.log(`[PaymentSystem] Registered providers: ${this.registry.getAll().map(p => p.providerName).join(', ')}`);
  }

  /**
   * Get system health overview
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<string, any>;
    metrics: any;
  }> {
    const healthStatuses = this.registry.getHealthStatuses();
    const realtimeMetrics = await this.metricsCollector.getRealtimeMetrics();
    
    const healthyCount = Array.from(healthStatuses.values()).filter(h => h.status === 'healthy').length;
    const totalCount = healthStatuses.size;
    
    let systemStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      systemStatus = 'healthy';
    } else if (healthyCount > 0) {
      systemStatus = 'degraded';
    } else {
      systemStatus = 'unhealthy';
    }

    const providersHealth: Record<string, any> = {};
    healthStatuses.forEach((status, provider) => {
      providersHealth[provider] = {
        status: status.status,
        latency: status.latency,
        success_rate: status.success_rate,
        last_checked: status.last_checked,
      };
    });

    return {
      status: systemStatus,
      providers: providersHealth,
      metrics: {
        transactions_per_minute: realtimeMetrics.transactions_per_minute,
        success_rate: realtimeMetrics.success_rate,
        average_processing_time: realtimeMetrics.average_processing_time_ms,
        total_volume: realtimeMetrics.total_volume,
      },
    };
  }

  /**
   * Shutdown the payment system gracefully
   */
  shutdown(): void {
    console.log('[PaymentSystem] Shutting down payment system...');
    this.registry.shutdown();
    console.log('[PaymentSystem] Payment system shutdown completed');
  }
}

// Export singleton instance
export const paymentSystem = new PaymentSystem();