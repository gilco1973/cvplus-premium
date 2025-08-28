/**
 * CVPlus Premium Advanced Provider Registry
 * Phase 2: Comprehensive provider management with health monitoring and discovery
 */

import {
  PaymentProviderName,
  PaymentMethod,
} from '../../../types/payments.types';

import {
  IPaymentProvider,
  IPaymentProviderRegistry,
  PaymentProviderFeatures,
  ProviderHealthStatus,
  ProviderEventType,
  ProviderEvent,
  ProviderErrorCode,
  ProviderError,
  CreateProviderError,
} from '../../../types/providers.types';

/**
 * Advanced Provider Registry with health monitoring and intelligent selection
 * Singleton pattern for managing multiple payment providers
 */
export class ProviderRegistry implements IPaymentProviderRegistry {
  private static instance: ProviderRegistry;
  
  private readonly providers = new Map<PaymentProviderName, IPaymentProvider>();
  private readonly healthStatuses = new Map<PaymentProviderName, ProviderHealthStatus>();
  private readonly registrationCallbacks: Array<(provider: IPaymentProvider) => void> = [];
  private readonly removalCallbacks: Array<(providerName: PaymentProviderName) => void> = [];
  private readonly healthCallbacks: Array<(status: ProviderHealthStatus) => void> = [];
  
  private healthMonitorInterval?: NodeJS.Timeout;
  private readonly healthCheckIntervalMs = 30000; // 30 seconds
  private readonly createError: CreateProviderError;

  private constructor() {
    this.createError = this.createProviderError.bind(this);
    this.startHealthMonitoring();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  // =============================================================================
  // CORE REGISTRY OPERATIONS
  // =============================================================================

  /**
   * Register a payment provider with comprehensive validation
   */
  register(provider: IPaymentProvider): void {
    const providerName = provider.providerName;
    
    this.validateProvider(provider);
    
    if (this.providers.has(providerName)) {
      console.warn(`[ProviderRegistry] Provider '${providerName}' is already registered. Replacing...`);
    }

    this.providers.set(providerName, provider);
    
    // Initialize health status
    this.initializeProviderHealth(provider);
    
    // Notify callbacks
    this.registrationCallbacks.forEach(callback => {
      try {
        callback(provider);
      } catch (error) {
        console.error(`[ProviderRegistry] Registration callback error:`, error);
      }
    });

    this.logProviderEvent('provider.registered', providerName, {
      initialized: provider.isInitialized(),
      features: provider.getFeatures(),
    });
  }

  /**
   * Get provider by name
   */
  get(providerName: PaymentProviderName): IPaymentProvider | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Get all registered providers
   */
  getAll(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get only healthy providers
   */
  getHealthy(): IPaymentProvider[] {
    return this.getAll().filter(provider => {
      const healthStatus = this.healthStatuses.get(provider.providerName);
      return healthStatus?.status === 'healthy';
    });
  }

  /**
   * Remove provider from registry
   */
  remove(providerName: PaymentProviderName): void {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw this.createError('stripe', 'PROVIDER_NOT_FOUND', `Provider '${providerName}' not found`);
    }

    this.providers.delete(providerName);
    this.healthStatuses.delete(providerName);

    // Notify callbacks
    this.removalCallbacks.forEach(callback => {
      try {
        callback(providerName);
      } catch (error) {
        console.error(`[ProviderRegistry] Removal callback error:`, error);
      }
    });

    this.logProviderEvent('provider.removed', providerName, {
      provider_count: this.providers.size,
    });
  }

  /**
   * Clear all providers
   */
  clear(): void {
    const providerNames = Array.from(this.providers.keys());
    providerNames.forEach(name => this.remove(name));
  }

  // =============================================================================
  // ADVANCED REGISTRY FEATURES
  // =============================================================================

  /**
   * Check if provider is registered
   */
  isRegistered(providerName: PaymentProviderName): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get providers by capability
   */
  getByCapability<T extends keyof PaymentProviderFeatures>(
    capability: T, 
    value: PaymentProviderFeatures[T]
  ): IPaymentProvider[] {
    return this.getAll().filter(provider => {
      const features = provider.getFeatures();
      return features[capability] === value;
    });
  }

  /**
   * Get providers that support a specific currency
   */
  getByCurrency(currency: string): IPaymentProvider[] {
    return this.getAll().filter(provider => {
      const supportedCurrencies = provider.getSupportedCurrencies();
      return supportedCurrencies.includes(currency.toLowerCase());
    });
  }

  /**
   * Get providers that support a specific region
   */
  getByRegion(region: string): IPaymentProvider[] {
    // For now, return all providers - this would be enhanced with actual region support
    return this.getAll().filter(provider => {
      // Provider-specific region support would be implemented here
      return true; // Placeholder
    });
  }

  /**
   * Get providers by payment method support
   */
  getByPaymentMethod(paymentMethod: PaymentMethod): IPaymentProvider[] {
    return this.getAll().filter(provider => {
      const supportedMethods = provider.getSupportedPaymentMethods();
      return supportedMethods.includes(paymentMethod);
    });
  }

  /**
   * Intelligent provider selection based on multiple criteria
   */
  selectBestProvider(criteria: ProviderSelectionCriteria): IPaymentProvider | null {
    let candidates = this.getHealthy();

    // Apply currency filter
    if (criteria.currency) {
      candidates = candidates.filter(provider => 
        provider.getSupportedCurrencies().includes(criteria.currency!)
      );
    }

    // Apply payment method filter
    if (criteria.paymentMethod) {
      candidates = candidates.filter(provider => 
        provider.getSupportedPaymentMethods().includes(criteria.paymentMethod!)
      );
    }

    // Apply feature requirements
    if (criteria.requiredFeatures?.length) {
      candidates = candidates.filter(provider => {
        const features = provider.getFeatures();
        return criteria.requiredFeatures!.every(feature => features[feature] === true);
      });
    }

    // Exclude unwanted providers
    if (criteria.excludeProviders?.length) {
      candidates = candidates.filter(provider => 
        !criteria.excludeProviders!.includes(provider.providerName)
      );
    }

    if (candidates.length === 0) {
      return null;
    }

    // Select based on criteria priority
    if (criteria.preferLowestCost) {
      // Implement cost-based selection (would need cost data)
      return candidates[0]; // Placeholder
    }

    if (criteria.preferFastest) {
      // Select provider with best response time
      return candidates.reduce((best, current) => {
        const bestHealth = this.healthStatuses.get(best.providerName);
        const currentHealth = this.healthStatuses.get(current.providerName);
        
        if (!bestHealth || !currentHealth) return best;
        
        return (currentHealth.latency < bestHealth.latency) ? current : best;
      });
    }

    // Default: return first healthy provider
    return candidates[0];
  }

  // =============================================================================
  // HEALTH MONITORING
  // =============================================================================

  /**
   * Get health status for all providers
   */
  getHealthStatuses(): Map<PaymentProviderName, ProviderHealthStatus> {
    return new Map(this.healthStatuses);
  }

  /**
   * Get health status for specific provider
   */
  getProviderHealth(providerName: PaymentProviderName): ProviderHealthStatus | undefined {
    return this.healthStatuses.get(providerName);
  }

  /**
   * Force health check for all providers
   */
  async performHealthCheck(): Promise<Map<PaymentProviderName, ProviderHealthStatus>> {
    const healthPromises = Array.from(this.providers.entries()).map(
      async ([name, provider]) => {
        try {
          const healthResult = await provider.healthCheck();
          const status: ProviderHealthStatus = {
            provider: name,
            status: healthResult.status,
            latency: healthResult.latency || 0,
            error: healthResult.error,
            last_checked: new Date(),
            success_rate: this.calculateSuccessRate(name),
            error_rate: this.calculateErrorRate(name),
          };
          
          this.healthStatuses.set(name, status);
          
          // Notify health callbacks
          this.healthCallbacks.forEach(callback => {
            try {
              callback(status);
            } catch (error) {
              console.error(`[ProviderRegistry] Health callback error:`, error);
            }
          });

          return [name, status] as const;
        } catch (error) {
          const status: ProviderHealthStatus = {
            provider: name,
            status: 'unhealthy',
            latency: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            last_checked: new Date(),
            success_rate: 0,
            error_rate: 1,
          };
          
          this.healthStatuses.set(name, status);
          return [name, status] as const;
        }
      }
    );

    const results = await Promise.allSettled(healthPromises);
    const healthMap = new Map<PaymentProviderName, ProviderHealthStatus>();

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const [name, status] = result.value;
        healthMap.set(name, status);
      }
    });

    return healthMap;
  }

  // =============================================================================
  // EVENT CALLBACKS
  // =============================================================================

  /**
   * Register callback for provider registration
   */
  onProviderRegistered(callback: (provider: IPaymentProvider) => void): void {
    this.registrationCallbacks.push(callback);
  }

  /**
   * Register callback for provider removal
   */
  onProviderRemoved(callback: (providerName: PaymentProviderName) => void): void {
    this.removalCallbacks.push(callback);
  }

  /**
   * Register callback for health status changes
   */
  onHealthStatusChanged(callback: (status: ProviderHealthStatus) => void): void {
    this.healthCallbacks.push(callback);
  }

  // =============================================================================
  // PROVIDER DISCOVERY
  // =============================================================================

  /**
   * Auto-discover and register providers from environment
   */
  async discoverProviders(): Promise<void> {
    // Check for Stripe configuration
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) {
      try {
        const { paymentProviderFactory } = await import('../provider-factory');
        const stripeProvider = await paymentProviderFactory.createProviderFromEnvironment('stripe');
        this.register(stripeProvider);
      } catch (error) {
        console.error('[ProviderRegistry] Failed to auto-register Stripe provider:', error);
      }
    }

    // Check for PayPal configuration (Phase 3)
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      try {
        const { paymentProviderFactory } = await import('../provider-factory');
        const paypalProvider = await paymentProviderFactory.createProviderFromEnvironment('paypal');
        this.register(paypalProvider);
      } catch (error) {
        console.error('[ProviderRegistry] Failed to auto-register PayPal provider:', error);
      }
    }
  }

  // =============================================================================
  // LOAD BALANCING
  // =============================================================================

  /**
   * Get provider with least current load
   */
  getProviderWithLeastLoad(): IPaymentProvider | null {
    const healthyProviders = this.getHealthy();
    if (healthyProviders.length === 0) {
      return null;
    }

    // For now, use round-robin - would be enhanced with actual load metrics
    const index = Math.floor(Math.random() * healthyProviders.length);
    return healthyProviders[index];
  }

  // =============================================================================
  // CLEANUP AND LIFECYCLE
  // =============================================================================

  /**
   * Shutdown registry and cleanup resources
   */
  shutdown(): void {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
      this.healthMonitorInterval = undefined;
    }

    // Clear all callbacks
    this.registrationCallbacks.length = 0;
    this.removalCallbacks.length = 0;
    this.healthCallbacks.length = 0;

    console.log('[ProviderRegistry] Registry shutdown completed');
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Validate provider before registration
   */
  private validateProvider(provider: IPaymentProvider): void {
    if (!provider.providerName) {
      throw this.createError(
        'stripe', // fallback provider name
        'PROVIDER_CONFIG_INVALID',
        'Provider must have a valid provider name'
      );
    }

    if (!provider.config) {
      throw this.createError(
        provider.providerName,
        'PROVIDER_CONFIG_INVALID',
        'Provider must have a valid configuration'
      );
    }

    // Validate required methods exist
    const requiredMethods = [
      'initialize', 'createCustomer', 'createPaymentIntent', 
      'healthCheck', 'getSupportedPaymentMethods', 'getSupportedCurrencies'
    ];

    requiredMethods.forEach(method => {
      if (typeof (provider as any)[method] !== 'function') {
        throw this.createError(
          provider.providerName,
          'PROVIDER_CONFIG_INVALID',
          `Provider missing required method: ${method}`
        );
      }
    });
  }

  /**
   * Initialize health status for new provider
   */
  private initializeProviderHealth(provider: IPaymentProvider): void {
    const initialHealth: ProviderHealthStatus = {
      provider: provider.providerName,
      status: 'healthy',
      latency: 0,
      last_checked: new Date(),
      success_rate: 1.0,
      error_rate: 0.0,
    };

    this.healthStatuses.set(provider.providerName, initialHealth);
  }

  /**
   * Start health monitoring background process
   */
  private startHealthMonitoring(): void {
    this.healthMonitorInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[ProviderRegistry] Health check failed:', error);
      }
    }, this.healthCheckIntervalMs);
  }

  /**
   * Calculate success rate for provider (placeholder)
   */
  private calculateSuccessRate(providerName: PaymentProviderName): number {
    // In a real implementation, this would calculate based on recent transaction data
    return 0.95; // Placeholder
  }

  /**
   * Calculate error rate for provider (placeholder)
   */
  private calculateErrorRate(providerName: PaymentProviderName): number {
    // In a real implementation, this would calculate based on recent error data
    return 0.05; // Placeholder
  }

  /**
   * Log provider events
   */
  private logProviderEvent(
    type: string,
    provider: PaymentProviderName,
    data: Record<string, any>
  ): void {
    const event: ProviderEvent = {
      id: `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as ProviderEventType,
      provider,
      timestamp: new Date(),
      data,
    };

    console.log(`[ProviderRegistry] ${type}:`, JSON.stringify(event, null, 2));
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
}

// =============================================================================
// PROVIDER SELECTION CRITERIA
// =============================================================================

export interface ProviderSelectionCriteria {
  currency?: string;
  paymentMethod?: PaymentMethod;
  requiredFeatures?: (keyof PaymentProviderFeatures)[];
  excludeProviders?: PaymentProviderName[];
  preferLowestCost?: boolean;
  preferFastest?: boolean;
  maxErrorRate?: number;
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance();