/**
 * CVPlus Premium Module - Consolidated Function Integration Example
 * 
 * Demonstrates how Firebase Functions can use the consolidated premium
 * access services to eliminate duplicated validation logic.
 * 
 * This example shows the transformation of duplicated premium validation
 * patterns into clean, centralized service calls.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @created 2025-08-28
 * @category Integration Examples
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { corsOptions } from '../config/cors';

// Import consolidated services instead of duplicated validation logic
import { 
  enforceFeatureGate,
  requirePremiumTier,
  requireActiveSubscription,
  FeatureAccessService,
  TierValidationService,
  SubscriptionUtilsService
} from '../services';

import { PremiumFeature, PremiumTier } from '../types';

// =============================================================================
// BEFORE: Duplicated Premium Validation Pattern (120+ lines across functions)
// =============================================================================

/*
// This pattern was repeated in 8+ Firebase Functions:

export const someFirebaseFunction = onCall(async (request) => {
  const { data, auth } = request;
  
  // Duplicated authentication check
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Duplicated subscription fetching
  const subscriptionDoc = await db
    .collection('userSubscriptions')
    .doc(auth.uid)
    .get();
    
  // Duplicated tier validation
  if (!subscriptionDoc.exists) {
    throw new HttpsError('permission-denied', 'Premium subscription required');
  }
  
  const subscription = subscriptionDoc.data();
  if (!subscription || subscription.tier !== 'premium') {
    throw new HttpsError('permission-denied', 'Premium subscription required');
  }
  
  // Duplicated billing status check
  if (subscription.status !== 'active') {
    throw new HttpsError('permission-denied', 'Active subscription required');
  }
  
  // Duplicated feature access validation
  const hasAccess = await checkFeatureAccess(auth.uid, 'advanced_analytics');
  if (!hasAccess) {
    throw new HttpsError('permission-denied', 'Feature not available in current plan');
  }
  
  // Function logic here...
});
*/

// =============================================================================
// AFTER: Using Consolidated Premium Services (Clean Implementation)
// =============================================================================

/**
 * Advanced Analytics Function - Using Consolidated Services
 * Replaces 45+ lines of duplicated validation with clean service calls
 */
export const advancedAnalyticsConsolidated = onCall(
  {
    ...corsOptions,
    region: 'us-central1'
  },
  async (request) => {
    const { data, auth } = request;

    // Basic authentication (still required)
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // CONSOLIDATED: All premium validation in one line!
    return enforceFeatureGate(
      auth.uid,
      PremiumFeature.ANALYTICS_DASHBOARD,
      async () => {
        // Main function logic - no validation boilerplate needed
        logger.info('Advanced analytics accessed', { userId: auth.uid });
        
        // Your actual business logic here
        const analyticsData = await generateAdvancedAnalytics(auth.uid, data);
        
        return {
          success: true,
          data: analyticsData,
          timestamp: new Date()
        };
      },
      {
        // Optional context for analytics
        functionName: 'advancedAnalytics',
        requestData: data
      }
    );
  }
);

/**
 * Dynamic Pricing Function - Using Consolidated Services
 * Replaces 30+ lines of duplicated validation with service calls
 */
export const dynamicPricingConsolidated = onCall(
  {
    ...corsOptions,
    region: 'us-central1'
  },
  async (request) => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // CONSOLIDATED: Multiple validation patterns in clean service calls
    await requirePremiumTier(auth.uid, PremiumTier.PRO);
    
    const subscription = await requireActiveSubscription(auth.uid);
    
    // Main function logic
    logger.info('Dynamic pricing accessed', { 
      userId: auth.uid, 
      tier: subscription.tier 
    });
    
    const pricingData = await calculateDynamicPricing(auth.uid, data);
    
    return {
      success: true,
      pricing: pricingData,
      userTier: subscription.tier,
      timestamp: new Date()
    };
  }
);

/**
 * Enterprise Management Function - Using Consolidated Services
 * Demonstrates complex validation with multiple service calls
 */
export const enterpriseManagementConsolidated = onCall(
  {
    ...corsOptions,
    region: 'us-central1'
  },
  async (request) => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // CONSOLIDATED: Complex enterprise validation simplified
    const [tierValidation, featureAccess] = await Promise.all([
      TierValidationService.getInstance().validateMinimumTier(auth.uid, PremiumTier.ENTERPRISE),
      FeatureAccessService.getInstance().checkFeatureAccess(
        auth.uid, 
        PremiumFeature.TEAM_COLLABORATION,
        { teamId: data.teamId }
      )
    ]);

    if (!tierValidation.hasAccess) {
      throw new HttpsError('permission-denied', tierValidation.message);
    }

    if (!featureAccess.hasAccess) {
      throw new HttpsError('permission-denied', featureAccess.message);
    }

    // Main function logic
    logger.info('Enterprise management accessed', { 
      userId: auth.uid,
      teamId: data.teamId
    });
    
    const managementData = await processEnterpriseManagement(auth.uid, data);
    
    return {
      success: true,
      data: managementData,
      accessLevel: 'enterprise',
      timestamp: new Date()
    };
  }
);

/**
 * Bulk Feature Access Validation Example
 * Shows how to validate multiple features efficiently
 */
export const bulkFeatureValidation = onCall(
  {
    ...corsOptions,
    region: 'us-central1'
  },
  async (request) => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const featuresRequested = data.features || [];
    const featureService = FeatureAccessService.getInstance();

    // CONSOLIDATED: Bulk validation replacing multiple individual checks
    const validationResults = await Promise.all(
      featuresRequested.map(async (feature: PremiumFeature) => ({
        feature,
        result: await featureService.checkFeatureAccess(auth.uid, feature)
      }))
    );

    const accessibleFeatures = validationResults
      .filter(({ result }) => result.hasAccess)
      .map(({ feature }) => feature);

    const restrictedFeatures = validationResults
      .filter(({ result }) => !result.hasAccess)
      .map(({ feature, result }) => ({
        feature,
        reason: result.message,
        upgradeRequired: result.upgradeRequired
      }));

    return {
      success: true,
      accessible: accessibleFeatures,
      restricted: restrictedFeatures,
      totalRequested: featuresRequested.length,
      accessCount: accessibleFeatures.length
    };
  }
);

// =============================================================================
// HELPER FUNCTIONS (Mock implementations for example)
// =============================================================================

async function generateAdvancedAnalytics(userId: string, data: any) {
  // Mock implementation - replace with actual analytics logic
  return {
    userId,
    metrics: {
      cvViews: 150,
      profileVisits: 89,
      downloadCount: 23
    },
    insights: [
      'Your CV has been viewed 150 times this month',
      'Profile visits increased by 34% compared to last month'
    ]
  };
}

async function calculateDynamicPricing(userId: string, data: any) {
  // Mock implementation - replace with actual pricing logic
  return {
    basePrice: 29.99,
    discountApplied: 0.15,
    finalPrice: 25.49,
    currency: 'USD',
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}

async function processEnterpriseManagement(userId: string, data: any) {
  // Mock implementation - replace with actual enterprise logic
  return {
    teamId: data.teamId,
    action: data.action,
    result: 'success',
    membersAffected: data.members?.length || 0
  };
}