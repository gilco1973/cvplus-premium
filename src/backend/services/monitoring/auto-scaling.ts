/**
 * CVPlus Premium Performance & Monitoring System
 * Auto-Scaling Service
 *
 * Intelligent auto-scaling for 10,000+ concurrent users with predictive scaling,
 * resource optimization, and cost management.
 *
 * @author Gil Klainert
 * @version 1.0.0
 * @category Performance Monitoring
  */

import { logger } from 'firebase-functions/v2';
import { BaseService } from '../../shared/base-service';
import { MetricType, PerformanceMetric } from './performance-monitor';

export enum ScalingAction {
  SCALE_UP = 'scale_up',
  SCALE_DOWN = 'scale_down',
  MAINTAIN = 'maintain'
}

export enum ResourceType {
  FIREBASE_FUNCTIONS = 'firebase_functions',
  DATABASE_CONNECTIONS = 'database_connections',
  CACHE_INSTANCES = 'cache_instances',
  CDN_EDGE_LOCATIONS = 'cdn_edge_locations',
  STORAGE_BANDWIDTH = 'storage_bandwidth'
}

export interface ScalingRule {
  id: string;
  name: string;
  resourceType: ResourceType;
  enabled: boolean;

  // Scaling triggers
  scaleUpTrigger: {
    metric: MetricType;
    threshold: number;
    duration: number; // seconds
  };

  scaleDownTrigger: {
    metric: MetricType;
    threshold: number;
    duration: number; // seconds
  };

  // Scaling parameters
  minInstances: number;
  maxInstances: number;
  scaleUpStep: number;
  scaleDownStep: number;
  cooldownPeriod: number; // seconds

  // Cost optimization
  costPerInstance: number; // per hour
  maxHourlyCost: number;
}

export interface ScalingEvent {
  id: string;
  timestamp: Date;
  resourceType: ResourceType;
  action: ScalingAction;
  previousInstances: number;
  newInstances: number;
  trigger: {
    metric: MetricType;
    value: number;
    threshold: number;
  };
  costImpact: number;
  success: boolean;
  error?: string;
}

export interface ResourceCapacity {
  resourceType: ResourceType;
  currentInstances: number;
  targetInstances: number;
  minInstances: number;
  maxInstances: number;
  utilizationPercentage: number;
  lastScalingEvent?: Date;
  costPerHour: number;
  projectedDailyCost: number;
}

export interface PredictiveScalingForecast {
  timestamp: Date;
  forecastHorizon: number; // minutes
  predictedLoad: {
    concurrent_users: number;
    requests_per_second: number;
    cpu_usage: number;
    memory_usage: number;
  };
  recommendedCapacity: {
    [key in ResourceType]?: number;
  };
  confidence: number; // 0-1
}

export interface LoadPattern {
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  averageLoad: number;
  peakLoad: number;
  pattern: 'increasing' | 'decreasing' | 'stable' | 'volatile';
}

/**
 * Auto-Scaling Service
 * Intelligent resource scaling based on load patterns and predictions
  */
export class AutoScalingService extends BaseService {
  private scalingRules = new Map<string, ScalingRule>();
  private scalingEvents = new Map<string, ScalingEvent[]>();
  private resourceCapacity = new Map<ResourceType, ResourceCapacity>();
  private loadPatterns = new Map<string, LoadPattern>();

  private readonly monitoringInterval = 30000; // 30 seconds
  private readonly forecastWindow = 30 * 60 * 1000; // 30 minutes
  private monitoringTimer?: NodeJS.Timeout;

  constructor(config: any) {
    super({
      name: 'AutoScalingService',
      version: '1.0.0',
      enabled: true,
      ...config
    });

    this.initializeScalingRules();
    this.initializeResourceCapacity();
    this.startScalingMonitoring();
  }

  /**
   * Initialize scaling rules
    */
  private initializeScalingRules(): void {
    const rules: ScalingRule[] = [
      {
        id: 'firebase_functions_cpu',
        name: 'Firebase Functions CPU-based Scaling',
        resourceType: ResourceType.FIREBASE_FUNCTIONS,
        enabled: true,
        scaleUpTrigger: {
          metric: MetricType.CPU_USAGE,
          threshold: 70, // 70% CPU
          duration: 120  // 2 minutes
        },
        scaleDownTrigger: {
          metric: MetricType.CPU_USAGE,
          threshold: 30, // 30% CPU
          duration: 300  // 5 minutes
        },
        minInstances: 2,
        maxInstances: 50,
        scaleUpStep: 2,
        scaleDownStep: 1,
        cooldownPeriod: 300, // 5 minutes
        costPerInstance: 0.10, // $0.10/hour
        maxHourlyCost: 5.00    // $5/hour max
      },
      {
        id: 'firebase_functions_concurrency',
        name: 'Firebase Functions Concurrency-based Scaling',
        resourceType: ResourceType.FIREBASE_FUNCTIONS,
        enabled: true,
        scaleUpTrigger: {
          metric: MetricType.CONCURRENT_USERS,
          threshold: 8000,  // 8k concurrent users
          duration: 60      // 1 minute
        },
        scaleDownTrigger: {
          metric: MetricType.CONCURRENT_USERS,
          threshold: 3000,  // 3k concurrent users
          duration: 600     // 10 minutes
        },
        minInstances: 5,
        maxInstances: 100,
        scaleUpStep: 5,
        scaleDownStep: 2,
        cooldownPeriod: 180,
        costPerInstance: 0.10,
        maxHourlyCost: 10.00
      },
      {
        id: 'database_connections',
        name: 'Database Connection Pool Scaling',
        resourceType: ResourceType.DATABASE_CONNECTIONS,
        enabled: true,
        scaleUpTrigger: {
          metric: MetricType.DATABASE_CONNECTIONS,
          threshold: 80,    // 80% of pool used
          duration: 60
        },
        scaleDownTrigger: {
          metric: MetricType.DATABASE_CONNECTIONS,
          threshold: 40,    // 40% of pool used
          duration: 300
        },
        minInstances: 10,
        maxInstances: 200,
        scaleUpStep: 10,
        scaleDownStep: 5,
        cooldownPeriod: 120,
        costPerInstance: 0.02,
        maxHourlyCost: 4.00
      },
      {
        id: 'cache_instances',
        name: 'Cache Instance Scaling',
        resourceType: ResourceType.CACHE_INSTANCES,
        enabled: true,
        scaleUpTrigger: {
          metric: MetricType.CACHE_HIT_RATE,
          threshold: 85,    // Below 85% hit rate
          duration: 180
        },
        scaleDownTrigger: {
          metric: MetricType.CACHE_HIT_RATE,
          threshold: 95,    // Above 95% hit rate
          duration: 600
        },
        minInstances: 2,
        maxInstances: 20,
        scaleUpStep: 2,
        scaleDownStep: 1,
        cooldownPeriod: 600,
        costPerInstance: 0.05,
        maxHourlyCost: 1.00
      }
    ];

    rules.forEach(rule => {
      this.scalingRules.set(rule.id, rule);
    });

    logger.info('Initialized auto-scaling rules', {
      ruleCount: rules.length,
      resourceTypes: [...new Set(rules.map(r => r.resourceType))]
    });
  }

  /**
   * Initialize resource capacity tracking
    */
  private initializeResourceCapacity(): void {
    const capacities: ResourceCapacity[] = [
      {
        resourceType: ResourceType.FIREBASE_FUNCTIONS,
        currentInstances: 5,
        targetInstances: 5,
        minInstances: 2,
        maxInstances: 100,
        utilizationPercentage: 45,
        costPerHour: 0.50,
        projectedDailyCost: 12.00
      },
      {
        resourceType: ResourceType.DATABASE_CONNECTIONS,
        currentInstances: 20,
        targetInstances: 20,
        minInstances: 10,
        maxInstances: 200,
        utilizationPercentage: 60,
        costPerHour: 0.40,
        projectedDailyCost: 9.60
      },
      {
        resourceType: ResourceType.CACHE_INSTANCES,
        currentInstances: 3,
        targetInstances: 3,
        minInstances: 2,
        maxInstances: 20,
        utilizationPercentage: 70,
        costPerHour: 0.15,
        projectedDailyCost: 3.60
      }
    ];

    capacities.forEach(capacity => {
      this.resourceCapacity.set(capacity.resourceType, capacity);
    });

    logger.info('Initialized resource capacity tracking', {
      resourceTypes: capacities.length,
      totalCurrentInstances: capacities.reduce((sum, c) => sum + c.currentInstances, 0),
      totalProjectedDailyCost: capacities.reduce((sum, c) => sum + c.projectedDailyCost, 0)
    });
  }

  /**
   * Evaluate scaling decisions based on current metrics
    */
  async evaluateScaling(metrics: PerformanceMetric[]): Promise<ScalingEvent[]> {
    const scalingEvents: ScalingEvent[] = [];

    for (const rule of this.scalingRules.values()) {
      if (!rule.enabled) continue;

      const capacity = this.resourceCapacity.get(rule.resourceType);
      if (!capacity) continue;

      // Check if in cooldown period
      if (capacity.lastScalingEvent) {
        const timeSinceLastScaling = Date.now() - capacity.lastScalingEvent.getTime();
        if (timeSinceLastScaling < rule.cooldownPeriod * 1000) {
          continue; // Skip due to cooldown
        }
      }

      const relevantMetrics = metrics.filter(m => m.type === rule.scaleUpTrigger.metric);
      if (relevantMetrics.length === 0) continue;

      const latestMetric = relevantMetrics[relevantMetrics.length - 1];
      let scalingAction: ScalingAction = ScalingAction.MAINTAIN;
      let targetInstances = capacity.currentInstances;

      // Check scale up conditions
      if (this.shouldScaleUp(latestMetric, rule)) {
        scalingAction = ScalingAction.SCALE_UP;
        targetInstances = Math.min(
          capacity.currentInstances + rule.scaleUpStep,
          rule.maxInstances
        );
      }
      // Check scale down conditions
      else if (this.shouldScaleDown(latestMetric, rule)) {
        scalingAction = ScalingAction.SCALE_DOWN;
        targetInstances = Math.max(
          capacity.currentInstances - rule.scaleDownStep,
          rule.minInstances
        );
      }

      if (scalingAction !== ScalingAction.MAINTAIN && targetInstances !== capacity.currentInstances) {
        // Check cost constraints
        const newHourlyCost = targetInstances * rule.costPerInstance;
        if (newHourlyCost > rule.maxHourlyCost) {
          logger.warn('Scaling blocked by cost constraints', {
            rule: rule.id,
            targetInstances,
            newHourlyCost,
            maxHourlyCost: rule.maxHourlyCost
          });
          continue;
        }

        const scalingEvent = await this.executeScaling(
          rule,
          capacity,
          scalingAction,
          targetInstances,
          latestMetric
        );

        if (scalingEvent) {
          scalingEvents.push(scalingEvent);
        }
      }
    }

    return scalingEvents;
  }

  /**
   * Generate predictive scaling forecast
    */
  async generatePredictiveForecast(): Promise<PredictiveScalingForecast> {
    const now = new Date();
    const forecastTime = new Date(now.getTime() + this.forecastWindow);

    // Analyze historical load patterns
    const currentPattern = this.getCurrentLoadPattern();

    // Predict load based on patterns
    const predictedLoad = this.predictLoad(forecastTime, currentPattern);

    // Calculate recommended capacity
    const recommendedCapacity = this.calculateRecommendedCapacity(predictedLoad);

    const forecast: PredictiveScalingForecast = {
      timestamp: now,
      forecastHorizon: this.forecastWindow / (60 * 1000), // minutes
      predictedLoad,
      recommendedCapacity,
      confidence: this.calculateForecastConfidence(currentPattern)
    };

    logger.info('Generated predictive scaling forecast', {
      forecastHorizon: forecast.forecastHorizon,
      predictedUsers: forecast.predictedLoad.concurrent_users,
      confidence: forecast.confidence
    });

    return forecast;
  }

  /**
   * Get current scaling status
    */
  getScalingStatus(): {
    totalInstances: number;
    totalHourlyCost: number;
    resourceUtilization: Array<{
      resourceType: ResourceType;
      instances: number;
      utilization: number;
      cost: number;
    }>;
    recentEvents: ScalingEvent[];
  } {
    const capacities = Array.from(this.resourceCapacity.values());
    const totalInstances = capacities.reduce((sum, c) => sum + c.currentInstances, 0);
    const totalHourlyCost = capacities.reduce((sum, c) => sum + c.costPerHour, 0);

    const resourceUtilization = capacities.map(capacity => ({
      resourceType: capacity.resourceType,
      instances: capacity.currentInstances,
      utilization: capacity.utilizationPercentage,
      cost: capacity.costPerHour
    }));

    // Get recent events (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents: ScalingEvent[] = [];

    for (const events of this.scalingEvents.values()) {
      recentEvents.push(...events.filter(e => e.timestamp >= oneDayAgo));
    }

    recentEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalInstances,
      totalHourlyCost,
      resourceUtilization,
      recentEvents: recentEvents.slice(0, 20) // Last 20 events
    };
  }

  /**
   * Start scaling monitoring
    */
  private startScalingMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        // In production, would get real metrics from monitoring system
        const mockMetrics = this.generateMockMetrics();
        const scalingEvents = await this.evaluateScaling(mockMetrics);

        if (scalingEvents.length > 0) {
          logger.info('Auto-scaling events executed', {
            eventCount: scalingEvents.length,
            events: scalingEvents.map(e => ({
              resource: e.resourceType,
              action: e.action,
              instances: `${e.previousInstances} -> ${e.newInstances}`
            }))
          });
        }
      } catch (error) {
        logger.error('Auto-scaling monitoring error', { error });
      }
    }, this.monitoringInterval);

    logger.info('Auto-scaling monitoring started', {
      interval: this.monitoringInterval / 1000
    });
  }

  /**
   * Check if should scale up
    */
  private shouldScaleUp(metric: PerformanceMetric, rule: ScalingRule): boolean {
    return metric.value > rule.scaleUpTrigger.threshold;
  }

  /**
   * Check if should scale down
    */
  private shouldScaleDown(metric: PerformanceMetric, rule: ScalingRule): boolean {
    return metric.value < rule.scaleDownTrigger.threshold;
  }

  /**
   * Execute scaling action
    */
  private async executeScaling(
    rule: ScalingRule,
    capacity: ResourceCapacity,
    action: ScalingAction,
    targetInstances: number,
    triggerMetric: PerformanceMetric
  ): Promise<ScalingEvent | null> {
    const eventId = `${rule.resourceType}_${Date.now()}`;
    const timestamp = new Date();

    try {
      logger.info('Executing scaling action', {
        rule: rule.id,
        action,
        from: capacity.currentInstances,
        to: targetInstances,
        triggerValue: triggerMetric.value,
        threshold: action === ScalingAction.SCALE_UP
          ? rule.scaleUpTrigger.threshold
          : rule.scaleDownTrigger.threshold
      });

      // Simulate scaling execution (in production, would call cloud APIs)
      await this.performResourceScaling(rule.resourceType, targetInstances);

      const costImpact = (targetInstances - capacity.currentInstances) * rule.costPerInstance;

      const scalingEvent: ScalingEvent = {
        id: eventId,
        timestamp,
        resourceType: rule.resourceType,
        action,
        previousInstances: capacity.currentInstances,
        newInstances: targetInstances,
        trigger: {
          metric: triggerMetric.type,
          value: triggerMetric.value,
          threshold: action === ScalingAction.SCALE_UP
            ? rule.scaleUpTrigger.threshold
            : rule.scaleDownTrigger.threshold
        },
        costImpact,
        success: true
      };

      // Update capacity
      capacity.currentInstances = targetInstances;
      capacity.targetInstances = targetInstances;
      capacity.lastScalingEvent = timestamp;
      capacity.costPerHour = targetInstances * rule.costPerInstance;
      capacity.projectedDailyCost = capacity.costPerHour * 24;

      // Store event
      if (!this.scalingEvents.has(rule.resourceType)) {
        this.scalingEvents.set(rule.resourceType, []);
      }
      this.scalingEvents.get(rule.resourceType)!.push(scalingEvent);

      logger.info('Scaling action completed successfully', {
        eventId,
        resource: rule.resourceType,
        newInstances: targetInstances,
        costImpact
      });

      return scalingEvent;

    } catch (error) {
      logger.error('Scaling action failed', { error, rule: rule.id, action });

      const failedEvent: ScalingEvent = {
        id: eventId,
        timestamp,
        resourceType: rule.resourceType,
        action,
        previousInstances: capacity.currentInstances,
        newInstances: capacity.currentInstances, // No change due to failure
        trigger: {
          metric: triggerMetric.type,
          value: triggerMetric.value,
          threshold: rule.scaleUpTrigger.threshold
        },
        costImpact: 0,
        success: false,
        error: error.message
      };

      // Store failed event
      if (!this.scalingEvents.has(rule.resourceType)) {
        this.scalingEvents.set(rule.resourceType, []);
      }
      this.scalingEvents.get(rule.resourceType)!.push(failedEvent);

      return failedEvent;
    }
  }

  /**
   * Perform actual resource scaling
    */
  private async performResourceScaling(resourceType: ResourceType, targetInstances: number): Promise<void> {
    // Simulate cloud API calls for scaling
    switch (resourceType) {
      case ResourceType.FIREBASE_FUNCTIONS:
        // Would call Firebase Admin SDK to update function configuration
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;

      case ResourceType.DATABASE_CONNECTIONS:
        // Would update connection pool configuration
        await new Promise(resolve => setTimeout(resolve, 500));
        break;

      case ResourceType.CACHE_INSTANCES:
        // Would scale cache cluster
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;

      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  /**
   * Get current load pattern
    */
  private getCurrentLoadPattern(): LoadPattern {
    const now = new Date();
    const timeOfDay = now.getHours();
    const dayOfWeek = now.getDay();

    const patternKey = `${timeOfDay}_${dayOfWeek}`;

    return this.loadPatterns.get(patternKey) || {
      timeOfDay,
      dayOfWeek,
      averageLoad: 5000,
      peakLoad: 8000,
      pattern: 'stable'
    };
  }

  /**
   * Predict load for future time
    */
  private predictLoad(forecastTime: Date, currentPattern: LoadPattern): PredictiveScalingForecast['predictedLoad'] {
    const hour = forecastTime.getHours();
    const isBusinessHours = hour >= 9 && hour <= 17;
    const isWeekend = forecastTime.getDay() === 0 || forecastTime.getDay() === 6;

    let baseLoad = currentPattern.averageLoad;

    // Apply time-based modifiers
    if (isBusinessHours && !isWeekend) {
      baseLoad *= 1.5; // 50% increase during business hours
    } else if (isWeekend) {
      baseLoad *= 0.7; // 30% decrease on weekends
    }

    // Add some variability based on pattern
    const variability = currentPattern.pattern === 'volatile' ? 0.3 : 0.1;
    const variance = 1 + (Math.random() - 0.5) * variability;

    return {
      concurrent_users: Math.floor(baseLoad * variance),
      requests_per_second: Math.floor(baseLoad / 100 * variance),
      cpu_usage: Math.min(95, 40 + baseLoad / 200),
      memory_usage: Math.min(95, 50 + baseLoad / 150)
    };
  }

  /**
   * Calculate recommended capacity based on predicted load
    */
  private calculateRecommendedCapacity(predictedLoad: PredictiveScalingForecast['predictedLoad']): PredictiveScalingForecast['recommendedCapacity'] {
    const recommendations: PredictiveScalingForecast['recommendedCapacity'] = {};

    // Firebase Functions scaling
    const functionsNeeded = Math.ceil(predictedLoad.concurrent_users / 200); // 200 users per instance
    recommendations[ResourceType.FIREBASE_FUNCTIONS] = Math.max(2, Math.min(100, functionsNeeded));

    // Database connections
    const connectionsNeeded = Math.ceil(predictedLoad.requests_per_second * 2); // 2 connections per req/s
    recommendations[ResourceType.DATABASE_CONNECTIONS] = Math.max(10, Math.min(200, connectionsNeeded));

    // Cache instances
    const cacheNeeded = Math.ceil(predictedLoad.concurrent_users / 2000); // 2k users per cache instance
    recommendations[ResourceType.CACHE_INSTANCES] = Math.max(2, Math.min(20, cacheNeeded));

    return recommendations;
  }

  /**
   * Calculate forecast confidence
    */
  private calculateForecastConfidence(pattern: LoadPattern): number {
    const patternConfidence = {
      'stable': 0.9,
      'increasing': 0.8,
      'decreasing': 0.8,
      'volatile': 0.6
    };

    return patternConfidence[pattern.pattern] || 0.7;
  }

  /**
   * Generate mock metrics for testing
    */
  private generateMockMetrics(): PerformanceMetric[] {
    const now = new Date();

    return [
      {
        timestamp: now,
        type: MetricType.CPU_USAGE,
        value: 60 + Math.random() * 30,
        unit: '%',
        source: 'system'
      },
      {
        timestamp: now,
        type: MetricType.CONCURRENT_USERS,
        value: 5000 + Math.random() * 4000,
        unit: 'users',
        source: 'application'
      },
      {
        timestamp: now,
        type: MetricType.DATABASE_CONNECTIONS,
        value: 50 + Math.random() * 40,
        unit: '%',
        source: 'database'
      }
    ];
  }

  /**
   * Health check for auto-scaling service
    */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const capacities = Array.from(this.resourceCapacity.values());
    const totalInstances = capacities.reduce((sum, c) => sum + c.currentInstances, 0);
    const overUtilized = capacities.filter(c => c.utilizationPercentage > 90).length;

    return {
      status: overUtilized > 0 ? 'degraded' : 'healthy',
      details: {
        scalingRules: this.scalingRules.size,
        enabledRules: Array.from(this.scalingRules.values()).filter(r => r.enabled).length,
        resourceTypes: this.resourceCapacity.size,
        totalInstances,
        overUtilizedResources: overUtilized,
        totalHourlyCost: capacities.reduce((sum, c) => sum + c.costPerHour, 0),
        isMonitoring: !!this.monitoringTimer
      }
    };
  }

  /**
   * Stop auto-scaling monitoring
    */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    logger.info('Auto-scaling monitoring stopped');
  }
}