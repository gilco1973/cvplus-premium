/**
 * CVPlus Premium Payment Event System
 * Phase 2: Comprehensive event handling with typed handlers and middleware
  */

import {
  PaymentProviderName,
  PaymentStatus,
} from '../../../../types/payments.types';

import {
  ProviderEvent,
  ProviderEventType,
  IProviderEventHandler,
  IProviderEventBus,
} from '../../../../types/providers.types';

// =============================================================================
// ENHANCED EVENT TYPES
// =============================================================================

/**
 * Extended event types for comprehensive payment system monitoring
  */
export type PaymentEventType = ProviderEventType 
  | 'payment.intent.created'
  | 'payment.intent.confirmed'
  | 'payment.intent.captured'
  | 'payment.intent.cancelled'
  | 'payment.method.attached'
  | 'payment.method.detached'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'refund.created'
  | 'refund.processed'
  | 'checkout.session.created'
  | 'checkout.session.completed'
  | 'checkout.session.expired'
  | 'provider.healthcheck.completed'
  | 'provider.failover.triggered'
  | 'provider.recovery.successful'
  | 'metrics.collected'
  | 'error.recovered'
  | 'error.escalated';

/**
 * Enhanced event interface with better typing
  */
export interface PaymentEvent extends ProviderEvent {
  type: PaymentEventType;
  correlation_id?: string;
  user_id?: string;
  trace_id?: string;
  source: 'provider' | 'orchestrator' | 'registry' | 'config_manager';
  severity: 'info' | 'warning' | 'error' | 'critical';
  tags?: string[];
}

/**
 * Event handler with enhanced error handling
  */
export interface PaymentEventHandler<T extends PaymentEvent = PaymentEvent> {
  readonly name: string;
  readonly priority: number; // Lower numbers = higher priority
  readonly event_types: PaymentEventType[];
  
  canHandle(event: PaymentEvent): boolean;
  handle(event: T): Promise<EventHandlerResult>;
  onError?(error: Error, event: T): Promise<void>;
}

/**
 * Result of event handler execution
  */
export interface EventHandlerResult {
  readonly success: boolean;
  readonly message?: string;
  readonly data?: Record<string, any>;
  readonly should_continue: boolean; // If false, stops handler chain
  readonly modified_event?: Partial<PaymentEvent>;
}

/**
 * Event middleware interface
  */
export interface EventMiddleware {
  readonly name: string;
  readonly priority: number;
  
  beforeHandler(event: PaymentEvent): Promise<PaymentEvent>;
  afterHandler(event: PaymentEvent, result: EventHandlerResult): Promise<void>;
  onError(error: Error, event: PaymentEvent): Promise<void>;
}

/**
 * Event subscription options
  */
export interface EventSubscriptionOptions {
  readonly filter?: (event: PaymentEvent) => boolean;
  readonly priority?: number;
  readonly max_retries?: number;
  readonly retry_delay_ms?: number;
  readonly timeout_ms?: number;
}

// =============================================================================
// PAYMENT EVENT BUS IMPLEMENTATION
// =============================================================================

/**
 * Advanced Payment Event Bus with middleware support and reliable delivery
  */
export class PaymentEventBus implements IProviderEventBus {
  private static instance: PaymentEventBus;
  
  private readonly handlers = new Map<PaymentEventType, PaymentEventHandler[]>();
  private readonly middleware: EventMiddleware[] = [];
  private readonly subscriptions = new Map<string, EventSubscription>();
  private readonly eventHistory: PaymentEvent[] = [];
  
  private readonly maxHistorySize = 1000;
  private subscriptionId = 0;

  private constructor() {}

  /**
   * Get singleton instance
    */
  public static getInstance(): PaymentEventBus {
    if (!PaymentEventBus.instance) {
      PaymentEventBus.instance = new PaymentEventBus();
    }
    return PaymentEventBus.instance;
  }

  // =============================================================================
  // CORE EVENT BUS OPERATIONS
  // =============================================================================

  /**
   * Emit event with comprehensive error handling and middleware processing
    */
  async emit(event: ProviderEvent): Promise<void> {
    const paymentEvent = this.enhanceEvent(event);
    
    try {
      // Store event in history
      this.addToHistory(paymentEvent);

      // Process through middleware chain (before handlers)
      let processedEvent = paymentEvent;
      for (const middleware of this.getSortedMiddleware()) {
        try {
          processedEvent = await middleware.beforeHandler(processedEvent);
        } catch (error) {
          await middleware.onError(error as Error, processedEvent);
          console.error(`[PaymentEventBus] Middleware error in ${middleware.name}:`, error);
        }
      }

      // Get handlers for event type
      const handlers = this.getHandlersForEvent(processedEvent);
      if (handlers.length === 0) {
        this.logEventProcessing('no_handlers', processedEvent);
        return;
      }

      // Execute handlers in priority order
      const handlerResults: Array<{ handler: PaymentEventHandler; result: EventHandlerResult }> = [];
      
      for (const handler of handlers) {
        try {
          if (!handler.canHandle(processedEvent)) {
            continue;
          }

          const result = await this.executeHandlerWithTimeout(handler, processedEvent);
          handlerResults.push({ handler, result });

          // Apply event modifications if any
          if (result.modified_event) {
            processedEvent = { ...processedEvent, ...result.modified_event };
          }

          // Stop processing if handler requests it
          if (!result.should_continue) {
            break;
          }
        } catch (error) {
          await this.handleHandlerError(handler, error as Error, processedEvent);
        }
      }

      // Process through middleware chain (after handlers)
      for (const middleware of this.getSortedMiddleware()) {
        for (const { result } of handlerResults) {
          try {
            await middleware.afterHandler(processedEvent, result);
          } catch (error) {
            await middleware.onError(error as Error, processedEvent);
            console.error(`[PaymentEventBus] Middleware after-handler error in ${middleware.name}:`, error);
          }
        }
      }

      this.logEventProcessing('completed', processedEvent, {
        handlers_executed: handlerResults.length,
        successful_handlers: handlerResults.filter(r => r.result.success).length,
      });

    } catch (error) {
      this.logEventProcessing('failed', paymentEvent, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Subscribe to specific event types with options
    */
  subscribe(
    eventType: ProviderEventType, 
    handler: IProviderEventHandler, 
    options: EventSubscriptionOptions = {}
  ): string {
    const subscriptionId = `sub_${++this.subscriptionId}`;
    const paymentHandler = this.wrapHandler(handler, options);
    
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(paymentHandler);
    
    // Sort handlers by priority
    this.handlers.get(eventType)!.sort((a, b) => a.priority - b.priority);
    
    this.subscriptions.set(subscriptionId, {
      eventType,
      handler: paymentHandler,
      options,
      created_at: new Date(),
    });

    this.logSubscription('subscribed', eventType, subscriptionId, options);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
    */
  unsubscribe(eventType: ProviderEventType, handler: IProviderEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;

    // Find and remove matching subscriptions
    const subscriptionsToRemove: string[] = [];
    
    this.subscriptions.forEach((subscription, id) => {
      if (subscription.eventType === eventType) {
        // Remove from handlers array
        const index = handlers.indexOf(subscription.handler);
        if (index !== -1) {
          handlers.splice(index, 1);
          subscriptionsToRemove.push(id);
        }
      }
    });

    // Clean up subscription records
    subscriptionsToRemove.forEach(id => {
      this.subscriptions.delete(id);
      this.logSubscription('unsubscribed', eventType, id);
    });

    if (handlers.length === 0) {
      this.handlers.delete(eventType);
    }
  }

  /**
   * Unsubscribe by subscription ID
    */
  unsubscribeById(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const handlers = this.handlers.get(subscription.eventType);
    if (handlers) {
      const index = handlers.indexOf(subscription.handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }

    this.subscriptions.delete(subscriptionId);
    this.logSubscription('unsubscribed', subscription.eventType, subscriptionId);
  }

  // =============================================================================
  // MIDDLEWARE MANAGEMENT
  // =============================================================================

  /**
   * Add event middleware
    */
  addMiddleware(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
    this.middleware.sort((a, b) => a.priority - b.priority);
    
    console.log(`[PaymentEventBus] Middleware '${middleware.name}' added with priority ${middleware.priority}`);
  }

  /**
   * Remove event middleware
    */
  removeMiddleware(name: string): void {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      console.log(`[PaymentEventBus] Middleware '${name}' removed`);
    }
  }

  // =============================================================================
  // EVENT QUERY AND ANALYTICS
  // =============================================================================

  /**
   * Get recent events with filtering
    */
  getRecentEvents(options: EventQueryOptions = {}): PaymentEvent[] {
    let events = [...this.eventHistory];

    if (options.event_types?.length) {
      events = events.filter(event => options.event_types!.includes(event.type));
    }

    if (options.provider) {
      events = events.filter(event => event.provider === options.provider);
    }

    if (options.severity) {
      events = events.filter(event => event.severity === options.severity);
    }

    if (options.since) {
      events = events.filter(event => event.timestamp >= options.since!);
    }

    if (options.user_id) {
      events = events.filter(event => event.user_id === options.user_id);
    }

    if (options.correlation_id) {
      events = events.filter(event => event.correlation_id === options.correlation_id);
    }

    // Sort by timestamp (most recent first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Get event statistics
    */
  getEventStats(options: EventStatsOptions = {}): EventStats {
    const events = this.getRecentEvents(options);
    
    const stats: EventStats = {
      total_events: events.length,
      events_by_type: {},
      events_by_provider: {},
      events_by_severity: {},
      events_by_hour: {},
      average_processing_time: 0,
      last_updated: new Date(),
    };

    // Group events by type
    events.forEach(event => {
      stats.events_by_type[event.type] = (stats.events_by_type[event.type] || 0) + 1;
      stats.events_by_provider[event.provider] = (stats.events_by_provider[event.provider] || 0) + 1;
      stats.events_by_severity[event.severity] = (stats.events_by_severity[event.severity] || 0) + 1;
      
      // Group by hour
      const hour = event.timestamp.toISOString().slice(0, 13);
      stats.events_by_hour[hour] = (stats.events_by_hour[hour] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear event history
    */
  clearHistory(): void {
    this.eventHistory.length = 0;
    console.log('[PaymentEventBus] Event history cleared');
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Enhance basic event with payment-specific metadata
    */
  private enhanceEvent(event: ProviderEvent): PaymentEvent {
    return {
      ...event,
      correlation_id: this.generateCorrelationId(),
      trace_id: this.generateTraceId(),
      source: 'provider',
      severity: this.determineSeverity(event.type),
      tags: this.generateTags(event),
    } as PaymentEvent;
  }

  /**
   * Add event to history with size management
    */
  private addToHistory(event: PaymentEvent): void {
    this.eventHistory.push(event);
    
    // Maintain max history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize);
    }
  }

  /**
   * Get handlers for specific event with filtering
    */
  private getHandlersForEvent(event: PaymentEvent): PaymentEventHandler[] {
    const handlers = this.handlers.get(event.type) || [];
    return handlers.filter(handler => handler.canHandle(event));
  }

  /**
   * Get middleware sorted by priority
    */
  private getSortedMiddleware(): EventMiddleware[] {
    return [...this.middleware].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute handler with timeout protection
    */
  private async executeHandlerWithTimeout(
    handler: PaymentEventHandler,
    event: PaymentEvent,
    timeoutMs: number = 10000
  ): Promise<EventHandlerResult> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Handler '${handler.name}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await handler.handle(event);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Handle handler execution errors
    */
  private async handleHandlerError(
    handler: PaymentEventHandler,
    error: Error,
    event: PaymentEvent
  ): Promise<void> {
    console.error(`[PaymentEventBus] Handler '${handler.name}' failed:`, error);

    try {
      if (handler.onError) {
        await handler.onError(error, event);
      }
    } catch (onErrorError) {
      console.error(`[PaymentEventBus] Handler onError callback failed:`, onErrorError);
    }

    // Emit error event
    const errorEvent: PaymentEvent = {
      id: this.generateEventId(),
      type: 'error.escalated',
      provider: event.provider,
      timestamp: new Date(),
      data: {
        original_event: event,
        handler_name: handler.name,
        error_message: error.message,
      },
      source: 'orchestrator',
      severity: 'error',
    };

    // Don't await to prevent infinite loops
    this.emit(errorEvent).catch(console.error);
  }

  /**
   * Wrap legacy handler interface
    */
  private wrapHandler(handler: IProviderEventHandler, options: EventSubscriptionOptions): PaymentEventHandler {
    return {
      name: handler.constructor.name || 'AnonymousHandler',
      priority: options.priority || 100,
      event_types: [], // Will be populated by subscription
      
      canHandle: (event: PaymentEvent) => {
        return options.filter ? options.filter(event) : true;
      },
      
      handle: async (event: PaymentEvent) => {
        await handler.handle(event);
        return {
          success: true,
          should_continue: true,
        };
      },
    };
  }

  /**
   * Determine event severity based on type
    */
  private determineSeverity(eventType: string): 'info' | 'warning' | 'error' | 'critical' {
    if (eventType.includes('error') || eventType.includes('failed')) return 'error';
    if (eventType.includes('warning') || eventType.includes('degraded')) return 'warning';
    if (eventType.includes('critical') || eventType.includes('escalated')) return 'critical';
    return 'info';
  }

  /**
   * Generate correlation ID for event tracking
    */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate trace ID for distributed tracing
    */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate event ID
    */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate tags for event categorization
    */
  private generateTags(event: ProviderEvent): string[] {
    const tags: string[] = [];
    
    tags.push(event.provider);
    tags.push(event.type.split('.')[0]); // First part of event type
    
    if (event.type.includes('error')) tags.push('error');
    if (event.type.includes('success')) tags.push('success');
    if (event.type.includes('webhook')) tags.push('webhook');
    if (event.type.includes('payment')) tags.push('payment');
    
    return tags;
  }

  /**
   * Log event processing
    */
  private logEventProcessing(
    status: string,
    event: PaymentEvent,
    data: Record<string, any> = {}
  ): void {
    console.log(`[PaymentEventBus] Event ${status}:`, {
      event_id: event.id,
      event_type: event.type,
      provider: event.provider,
      severity: event.severity,
      correlation_id: event.correlation_id,
      ...data,
    });
  }

  /**
   * Log subscription operations
    */
  private logSubscription(
    action: string,
    eventType: ProviderEventType,
    subscriptionId: string,
    options?: EventSubscriptionOptions
  ): void {
    console.log(`[PaymentEventBus] ${action}:`, {
      event_type: eventType,
      subscription_id: subscriptionId,
      options,
    });
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

interface EventSubscription {
  eventType: ProviderEventType;
  handler: PaymentEventHandler;
  options: EventSubscriptionOptions;
  created_at: Date;
}

export interface EventQueryOptions {
  event_types?: PaymentEventType[];
  provider?: PaymentProviderName;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  since?: Date;
  user_id?: string;
  correlation_id?: string;
  limit?: number;
}

export interface EventStatsOptions extends EventQueryOptions {}

export interface EventStats {
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_provider: Record<PaymentProviderName, number>;
  events_by_severity: Record<string, number>;
  events_by_hour: Record<string, number>;
  average_processing_time: number;
  last_updated: Date;
}

// =============================================================================
// BUILT-IN EVENT HANDLERS
// =============================================================================

/**
 * Logging event handler for debugging and monitoring
  */
export class LoggingEventHandler implements PaymentEventHandler {
  readonly name = 'LoggingEventHandler';
  readonly priority = 1000; // Low priority, runs last
  readonly event_types: PaymentEventType[] = []; // Handles all events

  canHandle(_event: PaymentEvent): boolean {
    return true; // Handle all events
  }

  async handle(event: PaymentEvent): Promise<EventHandlerResult> {
    const logLevel = this.getLogLevel(event.severity);
    console[logLevel](`[PaymentEvent] ${event.type}:`, {
      id: event.id,
      provider: event.provider,
      correlation_id: event.correlation_id,
      data: event.data,
    });

    return {
      success: true,
      should_continue: true,
    };
  }

  private getLogLevel(severity: string): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'warning': return 'warn';
      case 'error':
      case 'critical': return 'error';
      default: return 'log';
    }
  }
}

/**
 * Metrics collection event handler
  */
export class MetricsCollectionEventHandler implements PaymentEventHandler {
  readonly name = 'MetricsCollectionEventHandler';
  readonly priority = 50; // High priority
  readonly event_types: PaymentEventType[] = [
    'payment.succeeded',
    'payment.failed',
    'provider.error',
    'provider.healthcheck.completed',
  ];

  canHandle(event: PaymentEvent): boolean {
    return this.event_types.includes(event.type);
  }

  async handle(event: PaymentEvent): Promise<EventHandlerResult> {
    // In a real implementation, this would send metrics to a metrics service
    console.log(`[Metrics] Collecting metrics for ${event.type} from ${event.provider}`);

    return {
      success: true,
      should_continue: true,
      data: {
        metrics_recorded: true,
        timestamp: new Date(),
      },
    };
  }
}

// Export singleton instance
export const paymentEventBus = PaymentEventBus.getInstance();