/**
 * Batch Tracking Events Firebase Function
 * Handles batched analytics events from frontend usage tracker
 * Author: Gil Klainert
 * Date: August 27, 2025
 */

import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { FeatureRegistry } from '../../services/premium/featureRegistry';

interface AnalyticsEvent {
  userId: string;
  featureId: string;
  timestamp: number;
  type: 'feature_view' | 'feature_usage' | 'feature_blocked' | 'feature_error';
  metadata: Record<string, any>;
}

interface ProcessedEvent extends AnalyticsEvent {
  id: string;
  processedAt: number;
  cost?: number;
  tier?: string;
  category?: string;
}

interface BatchResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

/**
 * Batch tracking events function
 * Processes analytics events in batches for optimal performance
 */
export const batchTrackingEvents = onCall<{ events: AnalyticsEvent[] }, Promise<BatchResponse>>({
  enforceAppCheck: false, // Allow from web without app check for development
  cors: true
}, async (request) => {
  try {
    const { events } = request.data;
    
    if (!events || !Array.isArray(events) || events.length === 0) {
      return {
        success: false,
        processed: 0,
        failed: 1,
        errors: ['No events provided or invalid format']
      };
    }

    // Validate batch size (prevent abuse)
    if (events.length > 100) {
      return {
        success: false,
        processed: 0,
        failed: 1,
        errors: ['Batch size too large (max 100 events)']
      };
    }

    logger.info(`Processing batch of ${events.length} events`);

    const db = getFirestore();
    const batch = db.batch();
    const processedEvents: ProcessedEvent[] = [];
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    // Process each event
    for (const event of events) {
      try {
        // Validate event structure
        if (!isValidEvent(event)) {
          errors.push(`Invalid event structure for user ${event.userId}, feature ${event.featureId}`);
          failed++;
          continue;
        }

        // Enrich event with feature metadata
        const enrichedEvent = enrichEvent(event);
        
        // Add to usage tracking collection
        const usageDocRef = db.collection('usage_tracking').doc();
        batch.set(usageDocRef, enrichedEvent);

        // Update user statistics
        await updateUserStatistics(batch, db, enrichedEvent);

        // Update global feature statistics
        await updateFeatureStatistics(batch, db, enrichedEvent);

        processedEvents.push(enrichedEvent);
        processed++;

      } catch (error) {
        logger.error(`Error processing event for user ${event.userId}:`, error);
        errors.push(`Failed to process event: ${(error as Error).message}`);
        failed++;
      }
    }

    // Commit batch if we have any successful events
    if (processed > 0) {
      await batch.commit();
      logger.info(`Successfully processed ${processed} events`);
    }

    // Update real-time analytics aggregates
    if (processedEvents.length > 0) {
      await updateRealtimeAggregates(processedEvents);
    }

    return {
      success: processed > 0,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    logger.error('Batch tracking events error:', error);
    return {
      success: false,
      processed: 0,
      failed: 1,
      errors: [(error as Error).message]
    };
  }
});

/**
 * Validate event structure
 */
function isValidEvent(event: any): event is AnalyticsEvent {
  return (
    event &&
    typeof event.userId === 'string' &&
    typeof event.featureId === 'string' &&
    typeof event.timestamp === 'number' &&
    typeof event.type === 'string' &&
    ['feature_view', 'feature_usage', 'feature_blocked', 'feature_error'].includes(event.type) &&
    event.metadata &&
    typeof event.metadata === 'object'
  );
}

/**
 * Enrich event with feature metadata
 */
function enrichEvent(event: AnalyticsEvent): ProcessedEvent {
  const feature = FeatureRegistry.getFeature(event.featureId);
  
  return {
    ...event,
    id: `${event.userId}_${event.featureId}_${event.timestamp}`,
    processedAt: Date.now(),
    cost: feature?.costPerExecution,
    tier: feature?.tier,
    category: feature?.category
  };
}

/**
 * Update user-specific statistics
 */
async function updateUserStatistics(batch: any, db: any, event: ProcessedEvent): Promise<void> {
  const userStatsRef = db.collection('user_analytics').doc(event.userId);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  // Prepare update data
  const updateData: Record<string, any> = {
    lastActivity: new Date(),
    [`dailyStats.${today}.${event.featureId}.${event.type}`]: FieldValue.increment(1),
    [`monthlyStats.${thisMonth}.${event.featureId}.${event.type}`]: FieldValue.increment(1)
  };

  // Add cost tracking if applicable
  if (event.cost) {
    updateData[`dailyStats.${today}.totalCost`] = FieldValue.increment(event.cost);
    updateData[`monthlyStats.${thisMonth}.totalCost`] = FieldValue.increment(event.cost);
  }

  // Track conversion events specifically
  if (event.type === 'feature_blocked') {
    updateData[`conversionOpportunities.${event.featureId}`] = FieldValue.increment(1);
    updateData[`conversionOpportunities.total`] = FieldValue.increment(1);
  }

  batch.set(userStatsRef, updateData, { merge: true });
}

/**
 * Update global feature statistics
 */
async function updateFeatureStatistics(batch: any, db: any, event: ProcessedEvent): Promise<void> {
  const featureStatsRef = db.collection('feature_analytics').doc(event.featureId);
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const updateData: Record<string, any> = {
    featureId: event.featureId,
    lastUsed: new Date(),
    [`daily.${today}.${event.type}`]: FieldValue.increment(1),
    [`monthly.${thisMonth}.${event.type}`]: FieldValue.increment(1),
    [`total.${event.type}`]: FieldValue.increment(1)
  };

  // Track unique users
  if (event.type === 'feature_usage') {
    updateData[`uniqueUsers.${thisMonth}`] = FieldValue.arrayUnion(event.userId);
  }

  // Add execution time tracking
  if (event.metadata.executionTime) {
    updateData[`performance.totalExecutionTime`] = FieldValue.increment(event.metadata.executionTime);
    updateData[`performance.executionCount`] = FieldValue.increment(1);
  }

  batch.set(featureStatsRef, updateData, { merge: true });
}

/**
 * Update real-time aggregates for dashboards
 */
async function updateRealtimeAggregates(events: ProcessedEvent[]): Promise<void> {
  try {
    const db = getFirestore();
    const realtimeRef = db.collection('realtime_analytics').doc('current');
    
    // Group events by user and feature
    const userFeatureCounts: Record<string, Record<string, number>> = {};
    const featureCounts: Record<string, number> = {};
    
    events.forEach(event => {
      if (event.type === 'feature_usage') {
        // User feature counts
        if (!userFeatureCounts[event.userId]) {
          userFeatureCounts[event.userId] = {};
        }
        userFeatureCounts[event.userId][event.featureId] = 
          (userFeatureCounts[event.userId][event.featureId] || 0) + 1;
        
        // Global feature counts
        featureCounts[event.featureId] = (featureCounts[event.featureId] || 0) + 1;
      }
    });

    // Update realtime aggregates
    const updateData: Record<string, any> = {
      lastUpdated: new Date(),
      totalEvents: FieldValue.increment(events.length)
    };

    // Add feature popularity updates
    Object.entries(featureCounts).forEach(([featureId, count]) => {
      updateData[`popularFeatures.${featureId}`] = FieldValue.increment(count);
    });

    await realtimeRef.set(updateData, { merge: true });
    
  } catch (error) {
    logger.error('Error updating realtime aggregates:', error);
    // Non-blocking error
  }
}

/**
 * Get user usage analytics function
 * Returns usage statistics for a specific user
 */
export const getUserUsageAnalytics = onCall<
  { userId: string; timeRange?: 'day' | 'week' | 'month' | 'year' },
  Promise<any>
>({
  enforceAppCheck: false,
  cors: true
}, async (request) => {
  try {
    const { userId, timeRange = 'month' } = request.data;

    if (!userId) {
      throw new Error('User ID is required');
    }

    const db = getFirestore();
    const userStatsDoc = await db.collection('user_analytics').doc(userId).get();
    
    if (!userStatsDoc.exists) {
      return {
        dailyUsage: {},
        monthlyUsage: {},
        popularFeatures: [],
        blockedAttempts: [],
        conversionMetrics: {
          blockedToUpgrade: 0,
          viewToUsage: 0,
          errorRate: 0
        }
      };
    }

    const data = userStatsDoc.data();
    
    // Process data based on time range
    const response = {
      dailyUsage: data?.dailyStats || {},
      monthlyUsage: data?.monthlyStats || {},
      popularFeatures: extractPopularFeatures(data),
      blockedAttempts: extractBlockedAttempts(data),
      conversionMetrics: calculateConversionMetrics(data),
      lastActivity: data?.lastActivity?.toDate()
    };

    return response;

  } catch (error) {
    logger.error('Get user analytics error:', error);
    throw new Error(`Failed to get user analytics: ${(error as Error).message}`);
  }
});

/**
 * Helper functions for analytics processing
 */
function extractPopularFeatures(data: any): Array<{ featureId: string; count: number }> {
  const featureCounts: Record<string, number> = {};
  
  // Aggregate monthly usage
  if (data.monthlyStats) {
    Object.entries(data.monthlyStats).forEach(([month, monthData]: [string, any]) => {
      Object.entries(monthData).forEach(([featureId, featureData]: [string, any]) => {
        if (featureId !== 'totalCost' && typeof featureData === 'object') {
          featureCounts[featureId] = (featureCounts[featureId] || 0) + 
            (featureData.feature_usage || 0);
        }
      });
    });
  }

  return Object.entries(featureCounts)
    .map(([featureId, count]) => ({ featureId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function extractBlockedAttempts(data: any): Array<{ featureId: string; reason: string; count: number }> {
  const blockedCounts: Record<string, number> = {};
  
  if (data.monthlyStats) {
    Object.entries(data.monthlyStats).forEach(([month, monthData]: [string, any]) => {
      Object.entries(monthData).forEach(([featureId, featureData]: [string, any]) => {
        if (featureId !== 'totalCost' && typeof featureData === 'object') {
          const blocked = featureData.feature_blocked || 0;
          if (blocked > 0) {
            blockedCounts[featureId] = (blockedCounts[featureId] || 0) + blocked;
          }
        }
      });
    });
  }

  return Object.entries(blockedCounts)
    .map(([featureId, count]) => ({ featureId, reason: 'premium_required', count }))
    .sort((a, b) => b.count - a.count);
}

function calculateConversionMetrics(data: any): {
  blockedToUpgrade: number;
  viewToUsage: number;
  errorRate: number;
} {
  // This would be more sophisticated in production
  // For now, return basic metrics
  return {
    blockedToUpgrade: 0,
    viewToUsage: 0,
    errorRate: 0
  };
}

export default batchTrackingEvents;