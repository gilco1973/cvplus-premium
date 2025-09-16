/**
 * CVPlus Premium Provider Configuration Manager
 * Phase 2: Advanced configuration management with validation and secrets handling
  */

import {
  PaymentProviderName,
} from '../../../types/payments.types';

import {
  PaymentProviderConfig,
  StripeConfig,
  PayPalConfig,
  IProviderConfigurationManager,
  ConfigValidationResult,
  ConfigValidationSchema,
  TypeGuard,
  ProviderErrorCode,
  ProviderError,
  CreateProviderError,
} from '../../../types/providers.types';

/**
 * Advanced Configuration Manager with environment-based loading,
 * runtime validation, and secure secrets management
  */
export class ProviderConfigurationManager implements IProviderConfigurationManager {
  private static instance: ProviderConfigurationManager;
  
  private readonly configs = new Map<PaymentProviderName, PaymentProviderConfig>();
  private readonly configChangeCallbacks: Array<(provider: PaymentProviderName, config: PaymentProviderConfig) => void> = [];
  private readonly secretsRotationCallbacks: Array<(provider: PaymentProviderName) => void> = [];
  
  private readonly validationSchemas: Record<PaymentProviderName, ConfigValidationSchema<any>>;
  private readonly createError: CreateProviderError;

  private constructor() {
    this.createError = this.createProviderError.bind(this);
    this.validationSchemas = this.createValidationSchemas();
  }

  /**
   * Get singleton instance
    */
  public static getInstance(): ProviderConfigurationManager {
    if (!ProviderConfigurationManager.instance) {
      ProviderConfigurationManager.instance = new ProviderConfigurationManager();
    }
    return ProviderConfigurationManager.instance;
  }

  // =============================================================================
  // CONFIGURATION LOADING AND VALIDATION
  // =============================================================================

  /**
   * Load configuration from environment with comprehensive validation
    */
  async loadConfig<T extends PaymentProviderConfig>(
    provider: PaymentProviderName,
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<T> {
    try {
      let config: PaymentProviderConfig;

      switch (provider) {
        case 'stripe':
          config = await this.loadStripeConfig(environment);
          break;
        case 'paypal':
          config = await this.loadPayPalConfig(environment);
          break;
        default:
          throw this.createError(
            provider,
            'PROVIDER_CONFIG_INVALID',
            `Unsupported provider: ${provider}`
          );
      }

      // Validate the loaded configuration
      const validationResult = this.validateConfig(config);
      if (!validationResult.valid) {
        throw this.createError(
          provider,
          'PROVIDER_CONFIG_INVALID',
          `Configuration validation failed: ${validationResult.errors.join(', ')}`
        );
      }

      // Store validated configuration
      this.configs.set(provider, config);

      this.logConfigEvent('config.loaded', provider, {
        environment,
        valid: validationResult.valid,
        warnings: validationResult.warnings,
      });

      return config as T;
    } catch (error) {
      this.logConfigEvent('config.load_failed', provider, {
        environment,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate configuration with comprehensive type checking
    */
  validateConfig<T extends PaymentProviderConfig>(config: T): ConfigValidationResult<T> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config) {
      errors.push('Configuration is required');
      return { valid: false, errors, warnings };
    }

    if (!config.provider) {
      errors.push('Provider name is required');
    }

    if (!config.environment || !['sandbox', 'production'].includes(config.environment)) {
      errors.push('Valid environment (sandbox/production) is required');
    }

    // Provider-specific validation
    const schema = this.validationSchemas[config.provider];
    if (schema) {
      if (!schema.validate(config)) {
        errors.push(...schema.errors(config));
      }
    } else {
      errors.push(`No validation schema found for provider: ${config.provider}`);
    }

    // Security validations
    this.validateSecurityConfig(config, errors, warnings);

    // Performance validations
    this.validatePerformanceConfig(config, warnings);

    return {
      valid: errors.length === 0,
      config: errors.length === 0 ? config : undefined,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize configuration by removing sensitive data and applying defaults
    */
  sanitizeConfig<T extends PaymentProviderConfig>(config: Partial<T>): T {
    const sanitized = { ...config } as T;

    // Apply defaults based on provider type
    switch (sanitized.provider) {
      case 'stripe':
        this.applyStripeDefaults(sanitized as any);
        break;
      case 'paypal':
        this.applyPayPalDefaults(sanitized as any);
        break;
    }

    // Remove undefined values
    Object.keys(sanitized).forEach(key => {
      if ((sanitized as any)[key] === undefined) {
        delete (sanitized as any)[key];
      }
    });

    return sanitized;
  }

  // =============================================================================
  // RUNTIME CONFIGURATION MANAGEMENT
  // =============================================================================

  /**
   * Update configuration at runtime with validation
    */
  async updateConfig<T extends PaymentProviderConfig>(
    provider: PaymentProviderName,
    updates: Partial<T>
  ): Promise<void> {
    const currentConfig = this.configs.get(provider);
    if (!currentConfig) {
      throw this.createError(
        provider,
        'PROVIDER_CONFIG_INVALID',
        `No configuration found for provider: ${provider}`
      );
    }

    // Merge updates with current configuration
    const updatedConfig = { ...currentConfig, ...updates } as T;

    // Validate merged configuration
    const validationResult = this.validateConfig(updatedConfig);
    if (!validationResult.valid) {
      throw this.createError(
        provider,
        'PROVIDER_CONFIG_INVALID',
        `Configuration update validation failed: ${validationResult.errors.join(', ')}`
      );
    }

    // Apply update
    this.configs.set(provider, updatedConfig);

    // Notify callbacks
    this.configChangeCallbacks.forEach(callback => {
      try {
        callback(provider, updatedConfig);
      } catch (error) {
        console.error(`[ConfigManager] Config change callback error:`, error);
      }
    });

    this.logConfigEvent('config.updated', provider, {
      updated_fields: Object.keys(updates),
      warnings: validationResult.warnings,
    });
  }

  /**
   * Get current configuration for provider
    */
  getConfig<T extends PaymentProviderConfig>(provider: PaymentProviderName): T | null {
    const config = this.configs.get(provider);
    return config ? { ...config } as T : null;
  }

  /**
   * Reload configuration from environment
    */
  async reloadConfig(provider: PaymentProviderName): Promise<void> {
    const currentConfig = this.configs.get(provider);
    const environment = currentConfig?.environment || 'sandbox';

    await this.loadConfig(provider, environment);

    this.logConfigEvent('config.reloaded', provider, {
      environment,
    });
  }

  // =============================================================================
  // SECRETS MANAGEMENT
  // =============================================================================

  /**
   * Rotate secrets for a provider (placeholder for future implementation)
    */
  async rotateSecrets(provider: PaymentProviderName): Promise<void> {
    const config = this.configs.get(provider);
    if (!config) {
      throw this.createError(
        provider,
        'PROVIDER_CONFIG_INVALID',
        `No configuration found for provider: ${provider}`
      );
    }

    // In a production system, this would integrate with a secrets management system
    // like AWS Secrets Manager, HashiCorp Vault, etc.
    console.log(`[ConfigManager] Secrets rotation for ${provider} - would be implemented with secrets manager`);

    // Notify callbacks
    this.secretsRotationCallbacks.forEach(callback => {
      try {
        callback(provider);
      } catch (error) {
        console.error(`[ConfigManager] Secrets rotation callback error:`, error);
      }
    });

    this.logConfigEvent('secrets.rotated', provider, {
      rotation_time: new Date().toISOString(),
    });
  }

  /**
   * Validate secrets for a provider
    */
  async validateSecrets(provider: PaymentProviderName): Promise<boolean> {
    const config = this.configs.get(provider);
    if (!config) {
      return false;
    }

    try {
      switch (provider) {
        case 'stripe':
          return this.validateStripeSecrets(config as StripeConfig);
        case 'paypal':
          return this.validatePayPalSecrets(config as PayPalConfig);
        default:
          return false;
      }
    } catch (error) {
      this.logConfigEvent('secrets.validation_failed', provider, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // =============================================================================
  // CONFIGURATION MONITORING
  // =============================================================================

  /**
   * Register callback for configuration changes
    */
  onConfigChanged(callback: (provider: PaymentProviderName, config: PaymentProviderConfig) => void): void {
    this.configChangeCallbacks.push(callback);
  }

  /**
   * Register callback for secrets rotation
    */
  onSecretsRotated(callback: (provider: PaymentProviderName) => void): void {
    this.secretsRotationCallbacks.push(callback);
  }

  // =============================================================================
  // PROVIDER-SPECIFIC CONFIG LOADING
  // =============================================================================

  /**
   * Load Stripe configuration from environment
    */
  private async loadStripeConfig(environment: 'sandbox' | 'production'): Promise<StripeConfig> {
    const requiredVars = {
      secret_key: this.getRequiredEnvVar('STRIPE_SECRET_KEY'),
      publishable_key: this.getRequiredEnvVar('STRIPE_PUBLISHABLE_KEY'),
      webhook_secret: this.getRequiredEnvVar('STRIPE_WEBHOOK_SECRET'),
    };

    const config: StripeConfig = {
      provider: 'stripe',
      environment,
      ...requiredVars,
      api_version: process.env.STRIPE_API_VERSION || '2024-06-20',
      timeout: this.parseIntEnvVar('STRIPE_TIMEOUT', 20000),
      retry_attempts: this.parseIntEnvVar('STRIPE_RETRY_ATTEMPTS', 3),
    };

    return config;
  }

  /**
   * Load PayPal configuration from environment (Phase 3 placeholder)
    */
  private async loadPayPalConfig(environment: 'sandbox' | 'production'): Promise<PayPalConfig> {
    const requiredVars = {
      client_id: this.getRequiredEnvVar('PAYPAL_CLIENT_ID'),
      client_secret: this.getRequiredEnvVar('PAYPAL_CLIENT_SECRET'),
      webhook_id: this.getRequiredEnvVar('PAYPAL_WEBHOOK_ID'),
    };

    const config: PayPalConfig = {
      provider: 'paypal',
      environment,
      ...requiredVars,
      timeout: this.parseIntEnvVar('PAYPAL_TIMEOUT', 30000),
      retry_attempts: this.parseIntEnvVar('PAYPAL_RETRY_ATTEMPTS', 3),
    };

    return config;
  }

  // =============================================================================
  // VALIDATION SCHEMAS
  // =============================================================================

  /**
   * Create validation schemas for all providers
    */
  private createValidationSchemas(): Record<PaymentProviderName, ConfigValidationSchema<any>> {
    return {
      stripe: this.createStripeValidationSchema(),
      paypal: this.createPayPalValidationSchema(),
    };
  }

  /**
   * Create Stripe configuration validation schema
    */
  private createStripeValidationSchema(): ConfigValidationSchema<StripeConfig> {
    const isStripeConfig: TypeGuard<StripeConfig> = (value: unknown): value is StripeConfig => {
      if (typeof value !== 'object' || value === null) return false;
      const config = value as any;
      return (
        config.provider === 'stripe' &&
        typeof config.secret_key === 'string' &&
        typeof config.publishable_key === 'string' &&
        typeof config.webhook_secret === 'string' &&
        typeof config.api_version === 'string' &&
        ['sandbox', 'production'].includes(config.environment)
      );
    };

    return {
      validate: isStripeConfig,
      errors: (config: unknown) => {
        const errors: string[] = [];
        if (typeof config !== 'object' || config === null) {
          errors.push('Config must be an object');
          return errors;
        }

        const c = config as any;
        if (c.provider !== 'stripe') errors.push('Provider must be "stripe"');
        if (!c.secret_key) errors.push('Stripe secret key is required');
        if (!c.publishable_key) errors.push('Stripe publishable key is required');
        if (!c.webhook_secret) errors.push('Stripe webhook secret is required');
        if (!c.api_version) errors.push('Stripe API version is required');
        if (!['sandbox', 'production'].includes(c.environment)) {
          errors.push('Environment must be "sandbox" or "production"');
        }

        return errors;
      },
      sanitize: (config: unknown) => {
        const c = config as any;
        return this.sanitizeConfig({
          provider: 'stripe',
          environment: c.environment,
          secret_key: c.secret_key,
          publishable_key: c.publishable_key,
          webhook_secret: c.webhook_secret,
          api_version: c.api_version,
          timeout: c.timeout,
          retry_attempts: c.retry_attempts,
        });
      },
    };
  }

  /**
   * Create PayPal configuration validation schema
    */
  private createPayPalValidationSchema(): ConfigValidationSchema<PayPalConfig> {
    const isPayPalConfig: TypeGuard<PayPalConfig> = (value: unknown): value is PayPalConfig => {
      if (typeof value !== 'object' || value === null) return false;
      const config = value as any;
      return (
        config.provider === 'paypal' &&
        typeof config.client_id === 'string' &&
        typeof config.client_secret === 'string' &&
        typeof config.webhook_id === 'string' &&
        ['sandbox', 'production'].includes(config.environment)
      );
    };

    return {
      validate: isPayPalConfig,
      errors: (config: unknown) => {
        const errors: string[] = [];
        if (typeof config !== 'object' || config === null) {
          errors.push('Config must be an object');
          return errors;
        }

        const c = config as any;
        if (c.provider !== 'paypal') errors.push('Provider must be "paypal"');
        if (!c.client_id) errors.push('PayPal client ID is required');
        if (!c.client_secret) errors.push('PayPal client secret is required');
        if (!c.webhook_id) errors.push('PayPal webhook ID is required');
        if (!['sandbox', 'production'].includes(c.environment)) {
          errors.push('Environment must be "sandbox" or "production"');
        }

        return errors;
      },
      sanitize: (config: unknown) => {
        const c = config as any;
        return this.sanitizeConfig({
          provider: 'paypal',
          environment: c.environment,
          client_id: c.client_id,
          client_secret: c.client_secret,
          webhook_id: c.webhook_id,
          timeout: c.timeout,
          retry_attempts: c.retry_attempts,
        });
      },
    };
  }

  // =============================================================================
  // CONFIGURATION DEFAULTS
  // =============================================================================

  /**
   * Apply Stripe configuration defaults
    */
  private applyStripeDefaults(config: Partial<StripeConfig>): void {
    config.api_version = config.api_version || '2024-06-20';
    config.timeout = config.timeout || 20000;
    config.retry_attempts = config.retry_attempts || 3;
  }

  /**
   * Apply PayPal configuration defaults
    */
  private applyPayPalDefaults(config: Partial<PayPalConfig>): void {
    config.timeout = config.timeout || 30000;
    config.retry_attempts = config.retry_attempts || 3;
  }

  // =============================================================================
  // SECURITY AND PERFORMANCE VALIDATION
  // =============================================================================

  /**
   * Validate security aspects of configuration
    */
  private validateSecurityConfig(
    config: PaymentProviderConfig,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for production environment with proper settings
    if (config.environment === 'production') {
      switch (config.provider) {
        case 'stripe':
          const stripeConfig = config as StripeConfig;
          if (stripeConfig.secret_key.includes('test')) {
            errors.push('Production environment cannot use test keys');
          }
          break;
        case 'paypal':
          // PayPal-specific production validation would go here
          break;
      }
    }

    // Check timeout values
    if (config.timeout && config.timeout < 5000) {
      warnings.push('Timeout value less than 5 seconds may cause issues with slow networks');
    }

    if (config.timeout && config.timeout > 60000) {
      warnings.push('Timeout value greater than 60 seconds may cause poor user experience');
    }
  }

  /**
   * Validate performance aspects of configuration
    */
  private validatePerformanceConfig(config: PaymentProviderConfig, warnings: string[]): void {
    if (config.retry_attempts && config.retry_attempts > 5) {
      warnings.push('High retry attempts may cause poor user experience');
    }

    if (config.retry_attempts && config.retry_attempts < 2) {
      warnings.push('Low retry attempts may reduce success rate');
    }
  }

  /**
   * Validate Stripe secrets
    */
  private async validateStripeSecrets(config: StripeConfig): Promise<boolean> {
    // In a real implementation, this would make test API calls
    return config.secret_key.length > 0 && 
           config.publishable_key.length > 0 && 
           config.webhook_secret.length > 0;
  }

  /**
   * Validate PayPal secrets
    */
  private async validatePayPalSecrets(config: PayPalConfig): Promise<boolean> {
    // In a real implementation, this would make test API calls
    return config.client_id.length > 0 && 
           config.client_secret.length > 0 && 
           config.webhook_id.length > 0;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get required environment variable with error handling
    */
  private getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  /**
   * Parse integer environment variable with default
    */
  private parseIntEnvVar(name: string, defaultValue: number): number {
    const value = process.env[name];
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      console.warn(`[ConfigManager] Invalid integer value for ${name}: ${value}, using default: ${defaultValue}`);
      return defaultValue;
    }
    
    return parsed;
  }

  /**
   * Log configuration events
    */
  private logConfigEvent(
    type: string,
    provider: PaymentProviderName,
    data: Record<string, any>
  ): void {
    console.log(`[ConfigManager] ${type} for ${provider}:`, JSON.stringify(data, null, 2));
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

// Export singleton instance
export const configurationManager = ProviderConfigurationManager.getInstance();