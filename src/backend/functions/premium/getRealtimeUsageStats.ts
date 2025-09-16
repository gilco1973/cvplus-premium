/**
 * Real-time Usage Statistics Firebase Function
 * Provides real-time usage data for premium dashboard
 * Author: Gil Klainert
 * Date: August 27, 2025
 */

import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { FeatureRegistry } from '../../services/premium/featureRegistry';

interface RealtimeUsageStats {
  todayUsage: Record<string, number>;
  monthlyUsage: Record<string, number>;
  remainingLimits: Record<string, number>;
  topFeatures: string[];
  conversionOpportunities: number;
  totalSavings: number;
  activeSessions: number;
}

/**
 * Get real-time usage statistics for a user
 */
export const getRealtimeUsageStats = onCall<
  { userId: string },
  Promise<RealtimeUsageStats>
>({
  enforceAppCheck: false,
  cors: true
}, async (request) => {
  try {
    const { userId } = request.data;

    if (!userId) {
      throw new Error('User ID is required');
    }

    const db = getFirestore();
    
    // Get current user subscription for limits calculation
    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get();
    const subscription = subscriptionDoc.exists ? subscriptionDoc.data() : null;

    // Get user analytics data
    const userAnalyticsDoc = await db.collection('user_analytics').doc(userId).get();
    const userAnalytics = userAnalyticsDoc.exists ? userAnalyticsDoc.data() : null;

    // Calculate today's usage
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const todayUsage = extractTodayUsage(userAnalytics, today);
    const monthlyUsage = extractMonthlyUsage(userAnalytics, thisMonth);

    // Calculate remaining limits
    const remainingLimits = calculateRemainingLimits(
      subscription, 
      monthlyUsage
    );

    // Get top features
    const topFeatures = getTopFeatures(monthlyUsage);

    // Calculate conversion opportunities
    const conversionOpportunities = calculateConversionOpportunities(userAnalytics);

    // Calculate total savings (value delivered)
    const totalSavings = calculateTotalSavings(monthlyUsage);

    // Get active sessions (simplified - would be more complex in production)
    const activeSessions = 1; // Current session

    const response: RealtimeUsageStats = {
      todayUsage,
      monthlyUsage,
      remainingLimits,
      topFeatures,
      conversionOpportunities,
      totalSavings,
      activeSessions
    };

    logger.info(`Realtime stats generated for user ${userId}`, { 
      todayUsageCount: Object.keys(todayUsage).length,
      monthlyUsageCount: Object.keys(monthlyUsage).length,
      topFeaturesCount: topFeatures.length
    });

    return response;

  } catch (error) {
    logger.error('Get realtime usage stats error:', error);
    throw new Error(`Failed to get realtime stats: ${(error as Error).message}`);
  }
});

/**
 * Extract today's usage from analytics data
 */
function extractTodayUsage(userAnalytics: any, today: string): Record<string, number> {
  const todayUsage: Record<string, number> = {};

  if (userAnalytics?.dailyStats?.[today]) {
    const todayData = userAnalytics.dailyStats[today];
    
    Object.entries(todayData).forEach(([featureId, featureData]: [string, any]) => {
      if (featureId !== 'totalCost' && typeof featureData === 'object') {
        const usageCount = (featureData.feature_usage || 0) + (featureData.feature_view || 0);
        if (usageCount > 0) {
          todayUsage[featureId] = usageCount;
        }
      }
    });
  }

  return todayUsage;
}

/**
 * Extract monthly usage from analytics data
 */
function extractMonthlyUsage(userAnalytics: any, thisMonth: string): Record<string, number> {
  const monthlyUsage: Record<string, number> = {};

  if (userAnalytics?.monthlyStats?.[thisMonth]) {
    const monthData = userAnalytics.monthlyStats[thisMonth];
    
    Object.entries(monthData).forEach(([featureId, featureData]: [string, any]) => {
      if (featureId !== 'totalCost' && typeof featureData === 'object') {
        const usageCount = featureData.feature_usage || 0;
        if (usageCount > 0) {
          monthlyUsage[featureId] = usageCount;
        }
      }
    });
  }

  // Add special aggregated metrics
  monthlyUsage.uploads = calculateTotalUploads(userAnalytics, thisMonth);
  monthlyUsage.generations = calculateTotalGenerations(userAnalytics, thisMonth);

  return monthlyUsage;
}

/**
 * Calculate remaining limits based on subscription and usage
 */
function calculateRemainingLimits(
  subscription: any, 
  monthlyUsage: Record<string, number>
): Record<string, number> {
  const remainingLimits: Record<string, number> = {};

  if (!subscription || !subscription.limits) {
    return remainingLimits;
  }

  const limits = subscription.limits;
  
  // Monthly uploads
  if (limits.monthlyUploads !== -1) {
    remainingLimits.monthlyUploads = Math.max(0, limits.monthlyUploads - (monthlyUsage.uploads || 0));
  }

  // CV generations
  if (limits.cvGenerations !== -1) {
    remainingLimits.cvGenerations = Math.max(0, limits.cvGenerations - (monthlyUsage.generations || 0));
  }

  // Feature-specific limits
  FeatureRegistry.getPremiumFeatures().forEach(feature => {
    if (feature.usageLimits) {
      const limit = feature.usageLimits[subscription.tier as keyof typeof feature.usageLimits];
      if (limit && limit !== -1) {
        const currentUsage = monthlyUsage[feature.id] || 0;
        remainingLimits[feature.id] = Math.max(0, limit - currentUsage);
      }
    }
  });

  return remainingLimits;
}

/**
 * Get top features by usage
 */
function getTopFeatures(monthlyUsage: Record<string, number>): string[] {
  return Object.entries(monthlyUsage)
    .filter(([featureId]) => featureId !== 'uploads' && featureId !== 'generations')
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([featureId]) => featureId);
}

/**
 * Calculate conversion opportunities from blocked attempts
 */
function calculateConversionOpportunities(userAnalytics: any): number {
  if (!userAnalytics?.conversionOpportunities) {
    return 0;
  }

  return userAnalytics.conversionOpportunities.total || 0;
}

/**
 * Calculate total value/savings provided to user
 */
function calculateTotalSavings(monthlyUsage: Record<string, number>): number {
  let totalSavings = 0;

  Object.entries(monthlyUsage).forEach(([featureId, count]) => {
    if (featureId !== 'uploads' && featureId !== 'generations') {
      const feature = FeatureRegistry.getFeature(featureId);
      if (feature?.costPerExecution) {
        // Estimate value as processing cost * usage multiplier
        totalSavings += feature.costPerExecution * count * 2; // 2x multiplier for value
      }
    }
  });

  return Math.round(totalSavings);
}

/**
 * Calculate total uploads for the month
 */
function calculateTotalUploads(userAnalytics: any, thisMonth: string): number {
  let totalUploads = 0;

  if (userAnalytics?.monthlyStats?.[thisMonth]) {
    const monthData = userAnalytics.monthlyStats[thisMonth];
    
    // Count uploads from CV processing features
    const uploadFeatures = ['basicCVUpload', 'enhancedAnalyzeCV'];
    uploadFeatures.forEach(featureId => {
      if (monthData[featureId]?.feature_usage) {
        totalUploads += monthData[featureId].feature_usage;
      }
    });
  }

  return totalUploads;
}

/**
 * Calculate total CV generations for the month
 */
function calculateTotalGenerations(userAnalytics: any, thisMonth: string): number {
  let totalGenerations = 0;

  if (userAnalytics?.monthlyStats?.[thisMonth]) {
    const monthData = userAnalytics.monthlyStats[thisMonth];
    
    // Count generations from CV generation features
    const generationFeatures = ['basicCVGeneration', 'generateCV', 'generateCVPreview'];
    generationFeatures.forEach(featureId => {
      if (monthData[featureId]?.feature_usage) {
        totalGenerations += monthData[featureId].feature_usage;
      }
    });
  }

  return totalGenerations;
}

/**
 * Get feature popularity metrics across all users
 */
export const getFeaturePopularityMetrics = onCall<
  {},
  Promise<{
    mostUsed: Array<{ featureId: string; count: number; tier: string }>;
    leastUsed: Array<{ featureId: string; count: number; tier: string }>;
    conversionRates: Record<string, number>;
  }>
>({
  enforceAppCheck: false,
  cors: true
}, async (request) => {
  try {
    const db = getFirestore();
    
    // Get feature analytics data
    const featureAnalyticsSnapshot = await db.collection('feature_analytics').get();
    
    const featureStats: Array<{
      featureId: string;
      count: number;
      tier: string;
      blocked: number;
    }> = [];

    featureAnalyticsSnapshot.forEach(doc => {
      const data = doc.data();
      const feature = FeatureRegistry.getFeature(doc.id);
      
      if (feature) {
        featureStats.push({
          featureId: doc.id,
          count: data.total?.feature_usage || 0,
          tier: feature.tier,
          blocked: data.total?.feature_blocked || 0
        });
      }
    });

    // Sort by usage
    const sortedStats = featureStats.sort((a, b) => b.count - a.count);
    
    // Get most and least used
    const mostUsed = sortedStats.slice(0, 10).map(stat => ({
      featureId: stat.featureId,
      count: stat.count,
      tier: stat.tier
    }));

    const leastUsed = sortedStats.slice(-10).reverse().map(stat => ({
      featureId: stat.featureId,
      count: stat.count,
      tier: stat.tier
    }));

    // Calculate conversion rates
    const conversionRates: Record<string, number> = {};
    featureStats.forEach(stat => {
      if (stat.blocked > 0 && stat.count > 0) {
        conversionRates[stat.featureId] = stat.count / (stat.count + stat.blocked);
      } else {
        conversionRates[stat.featureId] = stat.count > 0 ? 1 : 0;
      }
    });

    return {
      mostUsed,
      leastUsed,
      conversionRates
    };

  } catch (error) {
    logger.error('Get feature popularity metrics error:', error);
    throw new Error(`Failed to get popularity metrics: ${(error as Error).message}`);
  }
});

/**
 * Update feature usage (called when a feature is actually used)
 */
export const updateFeatureUsage = onCall<
  { userId: string; featureId: string; timestamp: number },
  Promise<{ success: boolean }>
>({
  enforceAppCheck: false,
  cors: true
}, async (request) => {
  try {
    const { userId, featureId, timestamp } = request.data;

    if (!userId || !featureId) {
      throw new Error('User ID and feature ID are required');
    }

    const db = getFirestore();
    const today = new Date(timestamp).toISOString().split('T')[0];
    const thisMonth = new Date(timestamp).toISOString().slice(0, 7);

    // Update user analytics
    const userAnalyticsRef = db.collection('user_analytics').doc(userId);
    await userAnalyticsRef.set({
      [`dailyStats.${today}.${featureId}.feature_usage`]: 
        (await getUserFeatureUsageCount(db, userId, featureId, 'day')) + 1,
      [`monthlyStats.${thisMonth}.${featureId}.feature_usage`]: 
        (await getUserFeatureUsageCount(db, userId, featureId, 'month')) + 1,
      lastActivity: new Date(timestamp)
    }, { merge: true });

    // Update feature analytics
    const featureAnalyticsRef = db.collection('feature_analytics').doc(featureId);
    await featureAnalyticsRef.set({
      [`daily.${today}.feature_usage`]: 
        (await getFeatureUsageCount(db, featureId, 'day')) + 1,
      [`monthly.${thisMonth}.feature_usage`]: 
        (await getFeatureUsageCount(db, featureId, 'month')) + 1,
      [`total.feature_usage`]: 
        (await getFeatureUsageCount(db, featureId, 'total')) + 1,
      lastUsed: new Date(timestamp)
    }, { merge: true });

    return { success: true };

  } catch (error) {
    logger.error('Update feature usage error:', error);
    throw new Error(`Failed to update usage: ${(error as Error).message}`);
  }
});

/**
 * Helper function to get current usage count for a user and feature
 */
async function getUserFeatureUsageCount(
  db: any, 
  userId: string, 
  featureId: string, 
  period: 'day' | 'month'
): Promise<number> {
  try {
    const doc = await db.collection('user_analytics').doc(userId).get();
    if (!doc.exists) return 0;

    const data = doc.data();
    const key = period === 'day' ? 'dailyStats' : 'monthlyStats';
    const dateKey = period === 'day' ? 
      new Date().toISOString().split('T')[0] : 
      new Date().toISOString().slice(0, 7);

    return data[key]?.[dateKey]?.[featureId]?.feature_usage || 0;
  } catch {
    return 0;
  }
}

/**
 * Helper function to get global feature usage count
 */
async function getFeatureUsageCount(
  db: any, 
  featureId: string, 
  period: 'day' | 'month' | 'total'
): Promise<number> {
  try {
    const doc = await db.collection('feature_analytics').doc(featureId).get();
    if (!doc.exists) return 0;

    const data = doc.data();
    
    if (period === 'total') {
      return data.total?.feature_usage || 0;
    }

    const dateKey = period === 'day' ? 
      new Date().toISOString().split('T')[0] : 
      new Date().toISOString().slice(0, 7);

    return data[period]?.[dateKey]?.feature_usage || 0;
  } catch {
    return 0;
  }
}

export default getRealtimeUsageStats;