/**
 * Feature Registry Service
 * Centralized management of premium features and their configurations
 * Author: Gil Klainert
 * Date: 2025-08-29
  */

import { Feature, IFeatureRegistry } from '@cvplus/core';
import { logger } from 'firebase-functions';

/**
 * Feature Registry Implementation
 * Manages feature definitions, tiers, and access controls
  */
export class FeatureRegistry implements IFeatureRegistry {
  private features = new Map<string, Feature>();

  constructor() {
    this.initializeDefaultFeatures();
  }

  /**
   * Get a feature by ID
    */
  getFeature(featureId: string): Feature | undefined {
    return this.features.get(featureId);
  }

  /**
   * Register a new feature
    */
  registerFeature(feature: Feature): void {
    this.features.set(feature.id, feature);
    logger.debug('Feature registered', { featureId: feature.id, tier: feature.tier });
  }

  /**
   * Get all registered features
    */
  getAllFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  /**
   * Get features available for a specific tier
    */
  getFeaturesForTier(tier: string): Feature[] {
    const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
    const tierLevel = tierHierarchy[tier as keyof typeof tierHierarchy] ?? 0;

    return Array.from(this.features.values()).filter(feature => {
      const featureLevel = tierHierarchy[feature.tier as keyof typeof tierHierarchy] ?? 0;
      return featureLevel <= tierLevel;
    });
  }

  /**
   * Initialize default CVPlus features
    */
  private initializeDefaultFeatures(): void {
    const defaultFeatures: Feature[] = [
      // Core CV Features (Free)
      {
        id: 'basicCV',
        name: 'Basic CV Generation',
        description: 'Generate basic CV with standard templates',
        tier: 'free',
        usageLimits: {
          free: 5,
          premium: 100,
          enterprise: -1
        }
      },
      {
        id: 'templateLibrary',
        name: 'Template Library',
        description: 'Access to basic CV templates',
        tier: 'free'
      },

      // Premium Features
      {
        id: 'webPortal',
        name: 'Web Portal',
        description: 'Interactive web-based CV portal',
        tier: 'premium',
        usageLimits: {
          premium: 10,
          enterprise: -1
        },
        rateLimit: {
          requests: 60,
          windowMs: 60000 // 1 minute
        }
      },
      {
        id: 'aiChat',
        name: 'AI Chat Assistant',
        description: 'Interactive AI chat for CV optimization',
        tier: 'premium',
        usageLimits: {
          premium: 100,
          enterprise: -1
        },
        rateLimit: {
          requests: 30,
          windowMs: 60000
        }
      },
      {
        id: 'podcast',
        name: 'Podcast Generation',
        description: 'Generate podcast from CV content',
        tier: 'premium',
        usageLimits: {
          premium: 5,
          enterprise: 50
        },
        rateLimit: {
          requests: 5,
          windowMs: 300000 // 5 minutes
        }
      },
      {
        id: 'videoIntroduction',
        name: 'Video Introduction',
        description: 'AI-generated video introductions',
        tier: 'premium',
        usageLimits: {
          premium: 3,
          enterprise: 20
        },
        rateLimit: {
          requests: 2,
          windowMs: 600000 // 10 minutes
        }
      },
      {
        id: 'advancedAnalytics',
        name: 'Advanced Analytics',
        description: 'Detailed CV performance analytics',
        tier: 'premium',
        usageLimits: {
          premium: 50,
          enterprise: -1
        }
      },
      {
        id: 'roleDetection',
        name: 'Role Detection',
        description: 'AI-powered role and skills detection',
        tier: 'premium',
        usageLimits: {
          premium: 20,
          enterprise: -1
        }
      },
      {
        id: 'externalData',
        name: 'External Data Integration',
        description: 'Integration with LinkedIn, GitHub, etc.',
        tier: 'premium',
        usageLimits: {
          premium: 10,
          enterprise: -1
        },
        rateLimit: {
          requests: 10,
          windowMs: 300000 // 5 minutes
        }
      },

      // Enterprise Features
      {
        id: 'enterpriseFeatures',
        name: 'Enterprise Features',
        description: 'Advanced enterprise functionality',
        tier: 'enterprise',
        usageLimits: {
          enterprise: -1
        }
      },
      {
        id: 'customBranding',
        name: 'Custom Branding',
        description: 'White-label and custom branding options',
        tier: 'enterprise',
        usageLimits: {
          enterprise: -1
        }
      },
      {
        id: 'apiAccess',
        name: 'API Access',
        description: 'Full API access for integrations',
        tier: 'enterprise',
        usageLimits: {
          enterprise: -1
        },
        rateLimit: {
          requests: 1000,
          windowMs: 60000 // 1 minute
        }
      },
      {
        id: 'bulkOperations',
        name: 'Bulk Operations',
        description: 'Bulk CV processing and management',
        tier: 'enterprise',
        usageLimits: {
          enterprise: -1
        }
      },
      {
        id: 'advancedSecurity',
        name: 'Advanced Security',
        description: 'Enhanced security and compliance features',
        tier: 'enterprise'
      },
      {
        id: 'prioritySupport',
        name: 'Priority Support',
        description: '24/7 priority customer support',
        tier: 'enterprise'
      }
    ];

    defaultFeatures.forEach(feature => {
      this.features.set(feature.id, feature);
    });

    logger.info('Feature registry initialized', { 
      totalFeatures: this.features.size,
      freeFeatures: this.getFeaturesForTier('free').length,
      premiumFeatures: this.getFeaturesForTier('premium').length,
      enterpriseFeatures: this.getFeaturesForTier('enterprise').length
    });
  }

  /**
   * Update feature configuration
    */
  updateFeature(featureId: string, updates: Partial<Feature>): boolean {
    const existingFeature = this.features.get(featureId);
    if (!existingFeature) {
      logger.warn('Cannot update non-existent feature', { featureId });
      return false;
    }

    const updatedFeature = { ...existingFeature, ...updates };
    this.features.set(featureId, updatedFeature);
    
    logger.info('Feature updated', { 
      featureId, 
      updates: Object.keys(updates)
    });
    
    return true;
  }

  /**
   * Remove a feature
    */
  removeFeature(featureId: string): boolean {
    const removed = this.features.delete(featureId);
    if (removed) {
      logger.info('Feature removed', { featureId });
    } else {
      logger.warn('Cannot remove non-existent feature', { featureId });
    }
    return removed;
  }

  /**
   * Check if a feature exists
    */
  hasFeature(featureId: string): boolean {
    return this.features.has(featureId);
  }

  /**
   * Get features by tier with usage limits
    */
  getFeaturesWithLimits(tier: string): Array<Feature & { currentLimit?: number }> {
    return this.getFeaturesForTier(tier).map(feature => ({
      ...feature,
      currentLimit: feature.usageLimits?.[tier as keyof typeof feature.usageLimits]
    }));
  }

  /**
   * Validate feature access for tier
    */
  validateFeatureAccess(featureId: string, userTier: string): {
    allowed: boolean;
    reason?: string;
    requiredTier?: string;
  } {
    const feature = this.getFeature(featureId);
    
    if (!feature) {
      return {
        allowed: false,
        reason: 'Feature not found'
      };
    }

    const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
    const userLevel = tierHierarchy[userTier as keyof typeof tierHierarchy] ?? 0;
    const requiredLevel = tierHierarchy[feature.tier as keyof typeof tierHierarchy] ?? 0;

    if (userLevel < requiredLevel) {
      return {
        allowed: false,
        reason: 'Insufficient tier',
        requiredTier: feature.tier
      };
    }

    return { allowed: true };
  }

  /**
   * Get feature statistics
    */
  getFeatureStats(): {
    total: number;
    byTier: Record<string, number>;
    withLimits: number;
    withRateLimit: number;
  } {
    const features = Array.from(this.features.values());
    const byTier = features.reduce((acc, feature) => {
      acc[feature.tier] = (acc[feature.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: features.length,
      byTier,
      withLimits: features.filter(f => f.usageLimits).length,
      withRateLimit: features.filter(f => f.rateLimit).length
    };
  }
}

// Export singleton instance
export const featureRegistry = new FeatureRegistry();

// Export for testing and external use
export default FeatureRegistry;