/**
 * Tier Manager Service
 * Manages user tiers, feature access, and usage tracking
 */

import * as admin from 'firebase-admin';
import {
  UserTier,
  TierConfig,
  UserTierInfo,
  FeatureAccessRequest,
  FeatureAccessResponse,
  UsageStats
} from './types';

export class TierManager {
  private readonly db = admin.firestore();
  private readonly tierConfigs: Map<UserTier, TierConfig>;

  constructor() {
    this.tierConfigs = this.initializeTierConfigs();
  }

  private initializeTierConfigs(): Map<UserTier, TierConfig> {
    const configs = new Map<UserTier, TierConfig>();

    // Free Tier Configuration
    configs.set(UserTier.FREE, {
      tier: UserTier.FREE,
      features: new Set([
        'basic_ats_scoring',
        'keyword_analysis',
        'general_recommendations',
        'basic_formatting',
        'simple_templates'
      ]),
      limits: {
        maxCVProcessing: 3,
        maxATSOptimizations: 5,
        maxMLPredictions: 0,
        maxEnterpriseIntegrations: 0,
        maxMonthlyRequests: 100,
        dataRetentionDays: 30
      }
    });

    // Premium Tier Configuration
    configs.set(UserTier.PREMIUM, {
      tier: UserTier.PREMIUM,
      features: new Set([
        'basic_ats_scoring',
        'keyword_analysis',
        'general_recommendations',
        'basic_formatting',
        'simple_templates',
        'ml_scoring_engine',
        'predictive_analytics',
        'industry_optimization',
        'outcome_tracking',
        'advanced_templates',
        'professional_parsing',
        'competitor_analysis'
      ]),
      limits: {
        maxCVProcessing: -1, // unlimited
        maxATSOptimizations: -1,
        maxMLPredictions: 100,
        maxEnterpriseIntegrations: 5,
        maxMonthlyRequests: 10000,
        dataRetentionDays: 365
      }
    });

    // Enterprise Tier Configuration
    configs.set(UserTier.ENTERPRISE, {
      tier: UserTier.ENTERPRISE,
      features: new Set([
        'basic_ats_scoring',
        'keyword_analysis',
        'general_recommendations',
        'basic_formatting',
        'simple_templates',
        'ml_scoring_engine',
        'predictive_analytics',
        'industry_optimization',
        'outcome_tracking',
        'advanced_templates',
        'professional_parsing',
        'competitor_analysis',
        'enterprise_integration',
        'custom_ml_models',
        'api_access',
        'bulk_processing',
        'white_label',
        'dedicated_support'
      ]),
      limits: {
        maxCVProcessing: -1,
        maxATSOptimizations: -1,
        maxMLPredictions: -1,
        maxEnterpriseIntegrations: -1,
        maxMonthlyRequests: -1,
        dataRetentionDays: -1
      }
    });

    return configs;
  }

  async getUserTier(userId: string): Promise<UserTierInfo> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData) {
        return this.getDefaultUserTierInfo(userId);
      }

      const subscription = userData.subscription || {};
      const usageStats = await this.getUserUsageStats(userId);

      return {
        userId,
        currentTier: this.determineTier(subscription),
        subscriptionStatus: {
          isActive: subscription.isActive || false,
          isPremium: subscription.isPremium || false,
          isEnterprise: subscription.isEnterprise || false,
          subscriptionId: subscription.id,
          billingCycle: subscription.billingCycle,
          nextBillingDate: subscription.nextBillingDate?.toDate()
        },
        usageStats,
        tierExpiry: subscription.expiryDate?.toDate(),
        customFeatures: new Set(subscription.customFeatures || [])
      };
    } catch (error) {
      console.error('Error getting user tier:', error);
      return this.getDefaultUserTierInfo(userId);
    }
  }

  async checkFeatureAccess(request: FeatureAccessRequest): Promise<FeatureAccessResponse> {
    const userTierInfo = await this.getUserTier(request.userId);
    const tierConfig = this.tierConfigs.get(userTierInfo.currentTier);

    if (!tierConfig) {
      return {
        hasAccess: false,
        tier: UserTier.FREE,
        feature: request.feature,
        reason: 'Invalid tier configuration'
      };
    }

    const hasAccess = tierConfig.features.has(request.feature) ||
                     userTierInfo.customFeatures?.has(request.feature) ||
                     false;

    if (!hasAccess) {
      const suggestedTier = this.getSuggestedTierForFeature(request.feature);
      return {
        hasAccess: false,
        tier: userTierInfo.currentTier,
        feature: request.feature,
        reason: `Feature "${request.feature}" requires ${suggestedTier} tier`,
        upgradeLink: `/pricing?feature=${request.feature}`,
        alternativeFeatures: this.getAlternativeFeatures(request.feature, userTierInfo.currentTier)
      };
    }

    // Check usage limits
    const limitCheck = await this.checkUsageLimits(userTierInfo, request.feature);
    if (!limitCheck.withinLimits) {
      return {
        hasAccess: false,
        tier: userTierInfo.currentTier,
        feature: request.feature,
        reason: limitCheck.reason,
        upgradeLink: '/pricing'
      };
    }

    return {
      hasAccess: true,
      tier: userTierInfo.currentTier,
      feature: request.feature
    };
  }

  async incrementUsage(userId: string, feature: string): Promise<void> {
    const monthKey = new Date().toISOString().slice(0, 7);
    const usageRef = this.db.collection('usage').doc(userId);

    await usageRef.set({
      [monthKey]: {
        [feature]: admin.firestore.FieldValue.increment(1),
        totalRequests: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });
  }

  private async getUserUsageStats(userId: string): Promise<UsageStats> {
    const monthKey = new Date().toISOString().slice(0, 7);
    const usageDoc = await this.db.collection('usage').doc(userId).get();
    const usageData = usageDoc.data()?.[monthKey] || {};

    return {
      cvProcessed: usageData.cvProcessed || 0,
      atsOptimizations: usageData.atsOptimizations || 0,
      mlPredictions: usageData.mlPredictions || 0,
      enterpriseIntegrations: usageData.enterpriseIntegrations || 0,
      totalRequests: usageData.totalRequests || 0,
      currentMonth: monthKey,
      lastResetDate: new Date(monthKey + '-01')
    };
  }

  private async checkUsageLimits(
    userTierInfo: UserTierInfo,
    feature: string
  ): Promise<{ withinLimits: boolean; reason?: string }> {
    const config = this.tierConfigs.get(userTierInfo.currentTier);
    if (!config) return { withinLimits: false, reason: 'Invalid tier' };

    const limits = config.limits;
    const usage = userTierInfo.usageStats;

    // Check specific feature limits
    if (feature.includes('ml_') && limits.maxMLPredictions !== -1) {
      if (usage.mlPredictions >= limits.maxMLPredictions) {
        return {
          withinLimits: false,
          reason: `ML prediction limit reached (${limits.maxMLPredictions}/month)`
        };
      }
    }

    // Check general request limits
    if (limits.maxMonthlyRequests !== -1 && usage.totalRequests >= limits.maxMonthlyRequests) {
      return {
        withinLimits: false,
        reason: `Monthly request limit reached (${limits.maxMonthlyRequests})`
      };
    }

    return { withinLimits: true };
  }

  private determineTier(subscription: any): UserTier {
    if (subscription.isEnterprise) return UserTier.ENTERPRISE;
    if (subscription.isPremium) return UserTier.PREMIUM;
    return UserTier.FREE;
  }

  private getSuggestedTierForFeature(feature: string): UserTier {
    for (const [tier, config] of this.tierConfigs.entries()) {
      if (config.features.has(feature)) {
        return tier;
      }
    }
    return UserTier.PREMIUM;
  }

  private getAlternativeFeatures(feature: string, currentTier: UserTier): string[] {
    const config = this.tierConfigs.get(currentTier);
    if (!config) return [];

    const alternatives: string[] = [];
    for (const availableFeature of config.features) {
      if (availableFeature.includes(feature?.split('_')[0] || '')) {
        alternatives.push(availableFeature);
      }
    }
    return alternatives.slice(0, 3);
  }

  private getDefaultUserTierInfo(userId: string): UserTierInfo {
    return {
      userId,
      currentTier: UserTier.FREE,
      subscriptionStatus: {
        isActive: true,
        isPremium: false,
        isEnterprise: false
      },
      usageStats: {
        cvProcessed: 0,
        atsOptimizations: 0,
        mlPredictions: 0,
        enterpriseIntegrations: 0,
        totalRequests: 0,
        currentMonth: new Date().toISOString().slice(0, 7),
        lastResetDate: new Date()
      }
    };
  }
}