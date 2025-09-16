/**
 * Premium Components Export Index
 * 
 * Central export file for all premium upgrade flow components and related utilities.
 * This provides a clean API for importing premium components throughout the application.
 */

// Main upgrade flow components
export { ExternalDataUpgradePrompt } from './ExternalDataUpgradePrompt';
export { ExternalDataBenefitsShowcase } from './ExternalDataBenefitsShowcase';
export { SuccessStoriesComponent } from './SuccessStoriesComponent';
export { UpgradeIncentives } from './UpgradeIncentives';
export { ExternalDataUpgradeFlow } from './ExternalDataUpgradeFlow';

// Progressive revelation system
export {
  ProgressiveRevelationProvider,
  useProgressiveRevelation,
  useFeatureTracking,
  FeatureEngagementTracker,
  AdaptiveUpgradePrompt
} from './ProgressiveRevelationManager';

// Existing premium components
export { PremiumGate, type PremiumGateProps } from './PremiumGate';
export {
  LoadingState,
  PreviewOverlay,
  DefaultUpgradePrompt
} from './PremiumGateComponents';
export { PremiumGateErrorBoundary } from './PremiumGateErrorBoundary';
export { usePremiumGateAnalytics } from './PremiumGateHooks';
export {
  createFeaturePremiumGate,
  ExternalDataSourcesGate,
  AdvancedAnalyticsGate,
  AIInsightsGate,
  MultimediaFeaturesGate
} from './PremiumGatePresets';

// Type definitions
export interface UpgradeFlowConfig {
  featureName: string;
  context: 'feature-gate' | 'navigation' | 'usage-limit' | 'feature-tour';
  stage?: 'discovery' | 'interest' | 'consideration' | 'conversion';
  showIncentives?: boolean;
  showSocialProof?: boolean;
  adaptiveIntensity?: boolean;
}

export interface ConversionMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  avgTimeToConversion: number;
}

// Utility functions for premium features
export const createUpgradeFlow = (config: UpgradeFlowConfig) => {
  return {
    config,
    // Add utility methods here if needed
  };
};

// Re-export the default PremiumGate
export { default } from './PremiumGateCore';