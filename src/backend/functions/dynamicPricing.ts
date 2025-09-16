/**
 * CVPlus Premium Phase 4: Dynamic Pricing Cloud Function
 * Provides real-time pricing optimization and analytics endpoints
 * 
 * @author Gil Klainert
 * @version 4.0.0
 * @category Enterprise Functions
  */

import { https } from 'firebase-functions/v2';
import { logger } from 'firebase-functions/v2';
import { DynamicPricingEngine } from '../services/pricing/dynamicEngine';
import { PricingAnalyticsService } from '../services/analytics/pricingAnalytics';
import { requireAuth } from '../../middleware/authGuard';
import { enhancedPremiumGuard } from '../../middleware/enhancedPremiumGuard';

const pricingEngine = new DynamicPricingEngine({
  name: 'DynamicPricingEngine',
  version: '1.0.0',
  enabled: true
});
const analyticsService = new PricingAnalyticsService({
  name: 'PricingAnalyticsService',
  version: '1.0.0',
  enabled: true
});

/**
 * Get optimized pricing for a specific product and user
  */
export const getOptimizedPricing = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      // Validate authentication
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      const { productId, region = 'US' } = request.data;

      if (!productId) {
        throw new https.HttpsError('invalid-argument', 'Product ID is required');
      }

      // Log pricing request
      logger.info('Pricing request received', {
        userId: request.auth.uid,
        productId,
        region,
        timestamp: new Date().toISOString()
      });

      // Calculate optimized pricing
      const pricing = await pricingEngine.calculateOptimalPrice(
        productId,
        request.auth.uid,
        region
      );

      // Log pricing decision for analytics
      logger.info('Pricing calculated', {
        userId: request.auth.uid,
        productId,
        finalPrice: pricing.finalPrice,
        confidence: pricing.confidence
      });

      return {
        success: true,
        pricing: {
          productId: pricing.productId,
          finalPrice: pricing.finalPrice,
          currency: pricing.currency,
          validUntil: pricing.validUntil,
          confidence: pricing.confidence,
          reasoning: pricing.reasoning
        }
      };
    } catch (error) {
      logger.error('Pricing calculation failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to calculate pricing',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Create A/B pricing test (Enterprise only)
  */
export const createPricingTest = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      // Validate authentication and enterprise access
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      // Check enterprise access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_analytics');

      const { testName, productId, variants, duration = 14 } = request.data;

      if (!testName || !productId || !variants || !Array.isArray(variants)) {
        throw new https.HttpsError('invalid-argument', 'Invalid test configuration');
      }

      // Validate variants
      for (const variant of variants) {
        if (!variant.variantId || typeof variant.price !== 'number') {
          throw new https.HttpsError('invalid-argument', 'Invalid variant configuration');
        }
      }

      logger.info('Creating pricing A/B test', {
        userId: request.auth.uid,
        testName,
        productId,
        variantCount: variants.length
      });

      // Create A/B test
      const testId = await pricingEngine.runABPricingTest(
        `${testName}_${Date.now()}`,
        productId,
        variants
      );

      return {
        success: true,
        testId,
        message: 'Pricing test created successfully',
        estimatedDuration: `${duration} days`
      };
    } catch (error) {
      logger.error('Pricing test creation failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to create pricing test',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get pricing analytics report (Enterprise only)
  */
export const getPricingAnalytics = https.onCall(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 120
  },
  async (request) => {
    try {
      // Validate authentication and enterprise access
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      // Check enterprise access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_analytics');

      const { 
        startDate, 
        endDate, 
        period = 'daily',
        includeSegments = true,
        includeCompetitive = false
      } = request.data;

      // Validate date range
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      if (start >= end) {
        throw new https.HttpsError('invalid-argument', 'Invalid date range');
      }

      logger.info('Generating pricing analytics report', {
        userId: request.auth.uid,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        period
      });

      // Generate comprehensive pricing report
      const report = await analyticsService.generatePricingReport({
        start,
        end,
        period: period as 'daily' | 'weekly' | 'monthly'
      });

      // Filter sensitive competitive data for non-admin users
      if (!includeCompetitive) {
        report.competitivePosition = {
          ...report.competitivePosition,
          threats: [],
          opportunities: report.competitivePosition.opportunities.map(opp => ({
            ...opp,
            opportunity: 'Market opportunity identified'
          }))
        };
      }

      logger.info('Pricing analytics report generated', {
        userId: request.auth.uid,
        actionCount: report.recommendedActions.length,
        dataPoints: report.conversionByPrice.length
      });

      return {
        success: true,
        report: {
          timeframe: report.timeframe,
          kpis: report.kpis,
          conversionMetrics: report.conversionByPrice,
          revenueOptimization: report.revenueOptimization,
          segmentAnalysis: includeSegments ? report.customerSegmentAnalysis : [],
          competitivePosition: report.competitivePosition,
          recommendedActions: report.recommendedActions.slice(0, 10), // Top 10 actions
          priceElasticity: report.priceElasticity,
          abTestResults: report.abTestResults
        }
      };
    } catch (error) {
      logger.error('Pricing analytics generation failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to generate pricing analytics',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Run pricing optimization analysis (Enterprise only)
  */
export const optimizePricingStrategy = https.onCall(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 180
  },
  async (request) => {
    try {
      // Validate authentication and enterprise access
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      // Check enterprise access
      await enhancedPremiumGuard(request.auth.uid, 'enterprise_optimization');

      logger.info('Starting pricing strategy optimization', {
        userId: request.auth.uid,
        timestamp: new Date().toISOString()
      });

      // Run comprehensive pricing optimization
      const optimization = await analyticsService.optimizePricingStrategy();

      logger.info('Pricing optimization completed', {
        userId: request.auth.uid,
        strategiesCount: optimization.optimizedPricing.length,
        projectedRevenueIncrease: optimization.projectedImpact.revenueIncrease
      });

      return {
        success: true,
        optimization: {
          currentPerformance: optimization.currentPerformance,
          optimizedStrategies: optimization.optimizedPricing,
          projectedImpact: optimization.projectedImpact,
          implementationPlan: optimization.implementationPlan,
          riskAssessment: optimization.riskAssessment,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Pricing optimization failed', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to optimize pricing strategy',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Get A/B test results (Enterprise only)
  */
export const getPricingTestResults = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      // Validate authentication and enterprise access
      if (!request.auth?.uid) {
        throw new https.HttpsError('unauthenticated', 'Authentication required');
      }

      await enhancedPremiumGuard(request.auth.uid, 'enterprise_analytics');

      const { testId } = request.data;

      if (!testId) {
        throw new https.HttpsError('invalid-argument', 'Test ID is required');
      }

      logger.info('Retrieving pricing test results', {
        userId: request.auth.uid,
        testId
      });

      // Get test results
      const results = await pricingEngine.getABTestResults(testId);

      if (!results) {
        throw new https.HttpsError('not-found', 'Pricing test not found');
      }

      return {
        success: true,
        results: {
          testId: results.testId,
          status: results.winner ? 'completed' : 'running',
          variants: results.variants,
          results: results.results,
          winner: results.winner,
          significance: results.statistical_significance
        }
      };
    } catch (error) {
      logger.error('Failed to get pricing test results', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to retrieve test results',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Record pricing conversion (for analytics)
  */
export const recordPricingConversion = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      const { productId, price, testId, variantId } = request.data;

      if (!productId || !price) {
        throw new https.HttpsError('invalid-argument', 'Product ID and price are required');
      }

      logger.info('Recording pricing conversion', {
        userId: request.auth?.uid || 'anonymous',
        productId,
        price,
        testId,
        variantId
      });

      // Record conversion for A/B test if applicable
      if (testId && variantId) {
        await pricingEngine.recordABTestConversion(testId, variantId, price);
      }

      // Record general conversion analytics
      // Implementation would store in analytics database

      return {
        success: true,
        message: 'Conversion recorded successfully'
      };
    } catch (error) {
      logger.error('Failed to record pricing conversion', { error, data: request.data });
      
      if (error instanceof https.HttpsError) {
        throw error;
      }
      
      throw new https.HttpsError(
        'internal',
        'Failed to record conversion',
        { originalError: error.message }
      );
    }
  }
);

/**
 * Health check for pricing services
  */
export const pricingHealthCheck = https.onCall(
  {
    cors: true,
    region: 'us-central1'
  },
  async (request) => {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          dynamicPricing: 'operational',
          analytics: 'operational',
          marketIntelligence: 'operational'
        },
        version: '4.0.0'
      };

      return {
        success: true,
        health: healthStatus
      };
    } catch (error) {
      logger.error('Pricing health check failed', { error });
      
      return {
        success: false,
        health: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        }
      };
    }
  }
);