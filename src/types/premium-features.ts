/**
 * CVPlus Premium Features - Master Type Definitions
 * SINGLE SOURCE OF TRUTH for all premium feature types
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @security CRITICAL - Changes to this file affect premium access control
 */

// =============================================================================
// CORE PREMIUM FEATURE TYPES - MASTER DEFINITION
// =============================================================================

/**
 * Master Premium Feature Definition
 * This is the SINGLE SOURCE OF TRUTH for all premium features
 * DO NOT duplicate this definition elsewhere in the codebase
 */
export type PremiumFeature = 
  // External Data Integration
  | 'externalDataSources'
  | 'externalData'
  
  // Analytics & Insights
  | 'advancedAnalytics'
  | 'aiInsights'
  | 'aiChat'
  
  // Multimedia Features
  | 'multimediaFeatures'
  | 'videoIntroduction'
  | 'podcastGeneration'
  | 'podcast'
  
  // Portfolio & Gallery
  | 'portfolioGallery'
  | 'webPortal'
  
  // Professional Features
  | 'certificateBadges'
  | 'customBranding'
  | 'prioritySupport'
  | 'exportOptions'
  
  // Advanced Features
  | 'roleDetection'
  | 'realTimeSync'
  | 'apiAccess';

/**
 * Feature Security Configuration
 * Defines security policies for each premium feature
 */
export interface PremiumFeatureSecurityConfig {
  /** Whether feature requires active subscription */
  requiresSubscription: boolean;
  /** Minimum subscription tier required */
  minimumTier: 'free' | 'premium' | 'lifetime';
  /** Whether feature usage should be tracked */
  usageTracking: boolean;
  /** Whether access should be audited */
  auditRequired: boolean;
  /** Feature category for grouping */
  category: 'core' | 'multimedia' | 'analytics' | 'professional' | 'advanced';
  /** Security risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Rate limiting configuration */
  rateLimiting?: {
    enabled: boolean;
    maxUsagePerHour?: number;
    maxUsagePerDay?: number;
  };
}

/**
 * Master Premium Feature Security Configuration
 * CRITICAL: This configuration determines access control for all premium features
 */
export const PREMIUM_FEATURE_SECURITY_CONFIG: Record<PremiumFeature, PremiumFeatureSecurityConfig> = {
  // External Data Integration
  'externalDataSources': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: true,
    category: 'core',
    riskLevel: 'high',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 10,
      maxUsagePerDay: 50
    }
  },
  'externalData': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: true,
    category: 'core',
    riskLevel: 'high',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 10,
      maxUsagePerDay: 50
    }
  },

  // Analytics & Insights
  'advancedAnalytics': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: false,
    category: 'analytics',
    riskLevel: 'medium',
    rateLimiting: {
      enabled: true,
      maxUsagePerDay: 100
    }
  },
  'aiInsights': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: true,
    category: 'analytics',
    riskLevel: 'high',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 20,
      maxUsagePerDay: 100
    }
  },
  'aiChat': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: true,
    category: 'analytics',
    riskLevel: 'high',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 20,
      maxUsagePerDay: 100
    }
  },

  // Multimedia Features
  'multimediaFeatures': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: false,
    category: 'multimedia',
    riskLevel: 'medium'
  },
  'videoIntroduction': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: false,
    category: 'multimedia',
    riskLevel: 'medium',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 5,
      maxUsagePerDay: 20
    }
  },
  'podcastGeneration': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: false,
    category: 'multimedia',
    riskLevel: 'medium',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 3,
      maxUsagePerDay: 10
    }
  },
  'podcast': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: false,
    category: 'multimedia',
    riskLevel: 'medium',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 3,
      maxUsagePerDay: 10
    }
  },

  // Portfolio & Gallery
  'portfolioGallery': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: false,
    auditRequired: false,
    category: 'professional',
    riskLevel: 'low'
  },
  'webPortal': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: false,
    auditRequired: false,
    category: 'professional',
    riskLevel: 'low'
  },

  // Professional Features
  'certificateBadges': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: false,
    auditRequired: false,
    category: 'professional',
    riskLevel: 'low'
  },
  'customBranding': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: false,
    auditRequired: false,
    category: 'professional',
    riskLevel: 'low'
  },
  'prioritySupport': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: false,
    category: 'professional',
    riskLevel: 'low'
  },
  'exportOptions': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: false,
    category: 'professional',
    riskLevel: 'low',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 50,
      maxUsagePerDay: 200
    }
  },

  // Advanced Features
  'roleDetection': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: true,
    category: 'advanced',
    riskLevel: 'high',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 10,
      maxUsagePerDay: 50
    }
  },
  'realTimeSync': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: false,
    auditRequired: false,
    category: 'advanced',
    riskLevel: 'medium'
  },
  'apiAccess': {
    requiresSubscription: true,
    minimumTier: 'premium',
    usageTracking: true,
    auditRequired: true,
    category: 'advanced',
    riskLevel: 'critical',
    rateLimiting: {
      enabled: true,
      maxUsagePerHour: 100,
      maxUsagePerDay: 1000
    }
  }
};

// =============================================================================
// FEATURE VALIDATION UTILITIES
// =============================================================================

/**
 * Validates if a feature is a valid premium feature
 * @param feature - Feature to validate
 * @returns True if feature is valid premium feature
 */
export function isValidPremiumFeature(feature: string): feature is PremiumFeature {
  return Object.keys(PREMIUM_FEATURE_SECURITY_CONFIG).includes(feature);
}

/**
 * Gets security configuration for a premium feature
 * @param feature - Premium feature
 * @returns Security configuration or null if invalid
 */
export function getFeatureSecurityConfig(feature: string): PremiumFeatureSecurityConfig | null {
  if (!isValidPremiumFeature(feature)) {
    return null;
  }
  return PREMIUM_FEATURE_SECURITY_CONFIG[feature];
}

/**
 * Checks if a feature requires subscription
 * @param feature - Feature to check
 * @returns True if subscription required
 */
export function requiresSubscription(feature: string): boolean {
  const config = getFeatureSecurityConfig(feature);
  return config?.requiresSubscription ?? true; // Default to requiring subscription for security
}

/**
 * Gets minimum tier required for a feature
 * @param feature - Feature to check
 * @returns Minimum tier or 'premium' as secure default
 */
export function getMinimumTier(feature: string): 'free' | 'premium' | 'lifetime' {
  const config = getFeatureSecurityConfig(feature);
  return config?.minimumTier ?? 'premium'; // Secure default
}

/**
 * Checks if feature usage should be tracked
 * @param feature - Feature to check
 * @returns True if usage should be tracked
 */
export function shouldTrackUsage(feature: string): boolean {
  const config = getFeatureSecurityConfig(feature);
  return config?.usageTracking ?? true; // Default to tracking for security
}

/**
 * Checks if feature access should be audited
 * @param feature - Feature to check
 * @returns True if access should be audited
 */
export function requiresAudit(feature: string): boolean {
  const config = getFeatureSecurityConfig(feature);
  return config?.auditRequired ?? false;
}

/**
 * Gets rate limiting configuration for a feature
 * @param feature - Feature to check
 * @returns Rate limiting config or null
 */
export function getRateLimitingConfig(feature: string) {
  const config = getFeatureSecurityConfig(feature);
  return config?.rateLimiting ?? null;
}

// =============================================================================
// FEATURE CATEGORIES & GROUPING
// =============================================================================

/**
 * Feature categories for UI grouping and security policies
 */
export const PREMIUM_FEATURE_CATEGORIES = {
  core: ['externalDataSources', 'externalData'],
  multimedia: ['multimediaFeatures', 'videoIntroduction', 'podcastGeneration', 'podcast'],
  analytics: ['advancedAnalytics', 'aiInsights', 'aiChat'],
  professional: ['portfolioGallery', 'webPortal', 'certificateBadges', 'customBranding', 'prioritySupport', 'exportOptions'],
  advanced: ['roleDetection', 'realTimeSync', 'apiAccess']
} as const;

/**
 * Gets features by category
 * @param category - Feature category
 * @returns Array of features in category
 */
export function getFeaturesByCategory(category: keyof typeof PREMIUM_FEATURE_CATEGORIES): PremiumFeature[] {
  return PREMIUM_FEATURE_CATEGORIES[category] as PremiumFeature[];
}

/**
 * Gets category for a specific feature
 * @param feature - Feature to categorize
 * @returns Feature category or null
 */
export function getFeatureCategory(feature: PremiumFeature): keyof typeof PREMIUM_FEATURE_CATEGORIES | null {
  for (const [category, features] of Object.entries(PREMIUM_FEATURE_CATEGORIES)) {
    if (features.includes(feature as any)) {
      return category as keyof typeof PREMIUM_FEATURE_CATEGORIES;
    }
  }
  return null;
}

// =============================================================================
// SECURITY CONSTANTS
// =============================================================================

/**
 * Security risk levels for features
 */
export const SECURITY_RISK_LEVELS = {
  low: 'Features with minimal security impact',
  medium: 'Features requiring moderate security controls',
  high: 'Features requiring strict security controls and monitoring',
  critical: 'Features requiring maximum security controls and audit trails'
} as const;

/**
 * Default security policies
 */
export const DEFAULT_SECURITY_POLICIES = {
  requiresSubscription: true,
  minimumTier: 'premium' as const,
  usageTracking: true,
  auditRequired: false,
  riskLevel: 'medium' as const
};

// =============================================================================
// TYPE GUARDS & VALIDATION
// =============================================================================

/**
 * Type guard for premium feature arrays
 * @param features - Array to validate
 * @returns True if all items are valid premium features
 */
export function areValidPremiumFeatures(features: string[]): features is PremiumFeature[] {
  return features.every(isValidPremiumFeature);
}

/**
 * Filters valid premium features from a mixed array
 * @param features - Mixed feature array
 * @returns Array containing only valid premium features
 */
export function filterValidPremiumFeatures(features: string[]): PremiumFeature[] {
  return features.filter(isValidPremiumFeature);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  PREMIUM_FEATURE_SECURITY_CONFIG,
  PREMIUM_FEATURE_CATEGORIES,
  SECURITY_RISK_LEVELS,
  DEFAULT_SECURITY_POLICIES,
  isValidPremiumFeature,
  getFeatureSecurityConfig,
  requiresSubscription,
  getMinimumTier,
  shouldTrackUsage,
  requiresAudit,
  getRateLimitingConfig,
  getFeaturesByCategory,
  getFeatureCategory,
  areValidPremiumFeatures,
  filterValidPremiumFeatures
};