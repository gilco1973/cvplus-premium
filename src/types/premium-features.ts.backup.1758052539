/**
 * Premium Features Types
 * 
 * Defines premium features and their access requirements
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export enum PremiumTier {
  FREE = 'free',
  BASIC = 'basic', 
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum PremiumFeature {
  ADVANCED_CV_GENERATION = 'advanced_cv_generation',
  PORTFOLIO_GALLERY = 'portfolio_gallery',
  VIDEO_INTRODUCTION = 'video_introduction',
  PODCAST_GENERATION = 'podcast_generation',
  ANALYTICS_DASHBOARD = 'analytics_dashboard',
  CUSTOM_BRANDING = 'custom_branding',
  API_ACCESS = 'api_access',
  PRIORITY_SUPPORT = 'priority_support',
  UNLIMITED_CVS = 'unlimited_cvs',
  TEAM_COLLABORATION = 'team_collaboration'
}

export interface FeatureAccess {
  feature: PremiumFeature;
  requiredTier: PremiumTier;
  requiresSubscription: boolean;
  description: string;
  limits?: {
    maxUsage?: number;
    resetPeriod?: 'daily' | 'weekly' | 'monthly';
  };
}

const FEATURE_DEFINITIONS: Record<PremiumFeature, FeatureAccess> = {
  [PremiumFeature.ADVANCED_CV_GENERATION]: {
    feature: PremiumFeature.ADVANCED_CV_GENERATION,
    requiredTier: PremiumTier.BASIC,
    requiresSubscription: true,
    description: 'AI-powered CV generation with advanced templates'
  },
  [PremiumFeature.PORTFOLIO_GALLERY]: {
    feature: PremiumFeature.PORTFOLIO_GALLERY,
    requiredTier: PremiumTier.BASIC,
    requiresSubscription: true,
    description: 'Interactive portfolio gallery with multimedia support'
  },
  [PremiumFeature.VIDEO_INTRODUCTION]: {
    feature: PremiumFeature.VIDEO_INTRODUCTION,
    requiredTier: PremiumTier.PRO,
    requiresSubscription: true,
    description: 'AI-generated video introductions'
  },
  [PremiumFeature.PODCAST_GENERATION]: {
    feature: PremiumFeature.PODCAST_GENERATION,
    requiredTier: PremiumTier.PRO,
    requiresSubscription: true,
    description: 'AI-generated podcast episodes'
  },
  [PremiumFeature.ANALYTICS_DASHBOARD]: {
    feature: PremiumFeature.ANALYTICS_DASHBOARD,
    requiredTier: PremiumTier.PRO,
    requiresSubscription: true,
    description: 'Advanced analytics and insights'
  },
  [PremiumFeature.CUSTOM_BRANDING]: {
    feature: PremiumFeature.CUSTOM_BRANDING,
    requiredTier: PremiumTier.ENTERPRISE,
    requiresSubscription: true,
    description: 'Custom branding and white-label options'
  },
  [PremiumFeature.API_ACCESS]: {
    feature: PremiumFeature.API_ACCESS,
    requiredTier: PremiumTier.ENTERPRISE,
    requiresSubscription: true,
    description: 'Full API access for integrations'
  },
  [PremiumFeature.PRIORITY_SUPPORT]: {
    feature: PremiumFeature.PRIORITY_SUPPORT,
    requiredTier: PremiumTier.PRO,
    requiresSubscription: true,
    description: '24/7 priority customer support'
  },
  [PremiumFeature.UNLIMITED_CVS]: {
    feature: PremiumFeature.UNLIMITED_CVS,
    requiredTier: PremiumTier.PRO,
    requiresSubscription: true,
    description: 'Generate unlimited CVs'
  },
  [PremiumFeature.TEAM_COLLABORATION]: {
    feature: PremiumFeature.TEAM_COLLABORATION,
    requiredTier: PremiumTier.ENTERPRISE,
    requiresSubscription: true,
    description: 'Team collaboration and management features'
  }
};

export function isValidPremiumFeature(feature: string): feature is PremiumFeature {
  return Object.values(PremiumFeature).includes(feature as PremiumFeature);
}

export function requiresSubscription(feature: PremiumFeature): boolean {
  return FEATURE_DEFINITIONS[feature]?.requiresSubscription ?? false;
}

export function getMinimumTier(feature: PremiumFeature): PremiumTier {
  return FEATURE_DEFINITIONS[feature]?.requiredTier ?? PremiumTier.FREE;
}

export function getFeatureDefinition(feature: PremiumFeature): FeatureAccess | undefined {
  return FEATURE_DEFINITIONS[feature];
}