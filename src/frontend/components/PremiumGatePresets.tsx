import React from 'react';
import { PremiumGate, type PremiumGateProps } from './PremiumGateCore';

/**
 * Utility function to create feature-specific PremiumGate components
 */
export const createFeaturePremiumGate = (featureConfig: {
  feature: string;
  title: string;
  description: string;
  showPreview?: boolean;
  previewOpacity?: number;
}) => {
  const FeaturePremiumGate: React.FC<{
    children: React.ReactNode;
    className?: string;
    fallback?: React.ReactNode;
    onAnalyticsEvent?: PremiumGateProps['onAnalyticsEvent'];
    onAccessDenied?: () => void;
  }> = (props) => (
    <PremiumGate
      {...featureConfig}
      {...props}
    />
  );
  
  FeaturePremiumGate.displayName = `${featureConfig.feature}PremiumGate`;
  
  return FeaturePremiumGate;
};

// Pre-configured premium gates for common features
export const ExternalDataSourcesGate = createFeaturePremiumGate({
  feature: 'externalDataSources',
  title: 'External Data Sources',
  description: 'Import and sync data from LinkedIn, GitHub, and other professional platforms to enhance your CV automatically.',
  showPreview: true,
  previewOpacity: 0.3
});

export const AdvancedAnalyticsGate = createFeaturePremiumGate({
  feature: 'advancedAnalytics',
  title: 'Advanced Analytics',
  description: 'Get detailed insights about your CV performance, skill analysis, and improvement recommendations.',
  showPreview: true,
  previewOpacity: 0.2
});

export const AIInsightsGate = createFeaturePremiumGate({
  feature: 'aiInsights',
  title: 'AI-Powered Insights',
  description: 'Receive personalized recommendations and AI-driven suggestions to optimize your professional profile.',
  showPreview: false
});

export const MultimediaFeaturesGate = createFeaturePremiumGate({
  feature: 'multimediaFeatures',
  title: 'Multimedia Features',
  description: 'Create video introductions, portfolio galleries, and interactive content to stand out from the crowd.',
  showPreview: true,
  previewOpacity: 0.4
});