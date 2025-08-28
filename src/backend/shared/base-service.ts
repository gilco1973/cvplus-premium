/**
 * Base Service Interface
 * 
 * Provides common interface and functionality for all service modules
 * in the CVPlus platform.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { Logger } from './logger';

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  metrics?: Record<string, any>;
  errors?: string[];
}

export interface ServiceConfig {
  name: string;
  version: string;
  enabled?: boolean;
  retryAttempts?: number;
  timeoutMs?: number;
}

export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly config: ServiceConfig;
  protected initialized: boolean = false;

  constructor(config: ServiceConfig) {
    this.config = {
      enabled: true,
      retryAttempts: 3,
      timeoutMs: 30000,
      ...config
    };
    this.logger = new Logger(this.config.name);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing service', { 
      name: this.config.name, 
      version: this.config.version 
    });

    try {
      await this.onInitialize();
      this.initialized = true;
      this.logger.info('Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize service', { error });
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up service');
    
    try {
      await this.onCleanup();
      this.initialized = false;
      this.logger.info('Service cleaned up successfully');
    } catch (error) {
      this.logger.error('Failed to cleanup service', { error });
      throw error;
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<ServiceHealth> {
    try {
      const healthData = await this.onHealthCheck();
      return {
        status: 'healthy',
        timestamp: new Date(),
        ...healthData
      };
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Execute operation with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.config.retryAttempts) {
          this.logger.error('Operation failed after all retry attempts', {
            context,
            attempt,
            error: lastError
          });
          break;
        }
        
        this.logger.warn('Operation failed, retrying', {
          context,
          attempt,
          maxAttempts: this.config.retryAttempts,
          error: lastError
        });
        
        // Exponential backoff
        await this.delay(Math.pow(2, attempt - 1) * 1000);
      }
    }
    
    throw lastError!;
  }

  /**
   * Execute operation with timeout
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    const timeout = timeoutMs || this.config.timeoutMs!;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
    });
    
    return Promise.race([operation(), timeoutPromise]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Abstract methods to be implemented by concrete services
  protected abstract onInitialize(): Promise<void>;
  protected abstract onCleanup(): Promise<void>;
  protected abstract onHealthCheck(): Promise<Partial<ServiceHealth>>;

  // Getters
  get name(): string { return this.config.name; }
  get version(): string { return this.config.version; }
  get isInitialized(): boolean { return this.initialized; }
  get isEnabled(): boolean { return this.config.enabled || false; }
}