/**
 * CVPlus Feature Registry Adapter
 * Adapter to make the existing FeatureRegistry compatible with IFeatureRegistry interface
 * Author: Gil Klainert
 * Date: August 29, 2025
 * 
 * ARCHITECTURAL FIX: Provides interface compliance for dependency injection
  */

import { IFeatureRegistry, Feature } from '@cvplus/core';
import { FeatureRegistry, CVFeature } from './featureRegistry';

/**
 * Adapter class to convert CVFeature to Core Feature interface
  */
class FeatureAdapter {
  static convertCVFeatureToFeature(cvFeature: CVFeature): Feature {
    return {
      id: cvFeature.id,
      name: cvFeature.name,
      description: cvFeature.description,
      tier: cvFeature.tier,
      usageLimits: cvFeature.usageLimits,
      rateLimit: cvFeature.estimatedProcessingTime ? {
        requests: 60, // Default rate limit
        windowMs: 60000 // 1 minute window
      } : undefined
    };
  }

  static convertFeaturesToCVFeatures(features: Feature[]): CVFeature[] {
    return features.map(feature => ({
      id: feature.id,
      name: feature.name,
      description: feature.description,
      category: 'core' as const,
      tier: feature.tier,
      usageLimits: feature.usageLimits,
      requiresAuth: true
    }));
  }
}

/**
 * Feature Registry Adapter implementing IFeatureRegistry interface
 * Provides dependency injection compatibility while using existing FeatureRegistry
  */
export class FeatureRegistryAdapter implements IFeatureRegistry {
  private static instance: FeatureRegistryAdapter;
  
  /**
   * Singleton instance for consistent dependency injection
    */
  static getInstance(): FeatureRegistryAdapter {
    if (!FeatureRegistryAdapter.instance) {
      FeatureRegistryAdapter.instance = new FeatureRegistryAdapter();
    }
    return FeatureRegistryAdapter.instance;
  }

  /**
   * Get feature by ID (implements IFeatureRegistry)
    */
  getFeature(featureId: string): Feature | undefined {
    const cvFeature = FeatureRegistry.getFeature(featureId);
    return cvFeature ? FeatureAdapter.convertCVFeatureToFeature(cvFeature) : undefined;
  }

  /**
   * Register feature (implements IFeatureRegistry)
   * Note: This is a no-op as the current implementation uses static data
    */
  registerFeature(feature: Feature): void {
    console.warn('registerFeature not implemented in FeatureRegistryAdapter - features are statically defined');
    // TODO: If dynamic feature registration is needed, implement here
  }

  /**
   * Get all features (implements IFeatureRegistry)
    */
  getAllFeatures(): Feature[] {
    const allCVFeatures = FeatureRegistry.getFeaturesByTier('enterprise'); // Gets all features
    return allCVFeatures.map(cvFeature => FeatureAdapter.convertCVFeatureToFeature(cvFeature));
  }

  /**
   * Get features for tier (implements IFeatureRegistry)
    */
  getFeaturesForTier(tier: string): Feature[] {
    const validTier = tier as 'free' | 'premium' | 'enterprise';
    const cvFeatures = FeatureRegistry.getFeaturesByTier(validTier);
    return cvFeatures.map(cvFeature => FeatureAdapter.convertCVFeatureToFeature(cvFeature));
  }

  /**
   * Additional methods for backward compatibility with existing code
    */
  
  /**
   * Get original CVFeature by ID
    */
  getCVFeature(featureId: string): CVFeature | undefined {
    return FeatureRegistry.getFeature(featureId);
  }

  /**
   * Check if user has access to feature
    */
  hasFeatureAccess(featureId: string, userTier: 'free' | 'premium' | 'enterprise'): boolean {
    return FeatureRegistry.hasFeatureAccess(featureId, userTier);
  }

  /**
   * Get usage limit for feature
    */
  getUsageLimit(featureId: string, userTier: 'free' | 'premium' | 'enterprise'): number {
    return FeatureRegistry.getUsageLimit(featureId, userTier);
  }

  /**
   * Get execution cost for feature
    */
  getExecutionCost(featureId: string): number {
    return FeatureRegistry.getExecutionCost(featureId);
  }

  /**
   * Validate feature requirements
    */
  validateFeatureRequirements(featureId: string, userTier: 'free' | 'premium' | 'enterprise'): {
    valid: boolean;
    reasons: string[];
  } {
    return FeatureRegistry.validateFeatureRequirements(featureId, userTier);
  }
}

/**
 * Export both the adapter instance and the class for different use cases
  */
export const featureRegistryInstance = FeatureRegistryAdapter.getInstance();
export default FeatureRegistryAdapter;