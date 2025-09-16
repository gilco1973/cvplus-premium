/**
 * ExternalDataSourcesUpgradeIntegration - Complete integration example
 * 
 * This component demonstrates how to integrate the new upgrade flow components
 * with the existing External Data Sources feature and PremiumGate system.
 * 
 * Use this as a reference for implementing similar upgrade flows for other premium features.
 */

import React from 'react';
import { ExternalDataSourcesGate } from './PremiumGatePresets';
import { ExternalDataUpgradeFlow } from './ExternalDataUpgradeFlow';
import { 
  ProgressiveRevelationProvider, 
  useFeatureTracking,
  FeatureEngagementTracker 
} from './ProgressiveRevelationManager';
import { usePremiumStatus } from '../../hooks/usePremiumStatus';

interface ExternalDataSourcesUpgradeIntegrationProps {
  jobId: string;
  onDataEnriched?: (data: unknown[]) => void;
  onSkip?: () => void;
  className?: string;
}

// Enhanced External Data Sources component with integrated upgrade flow
const ExternalDataSourcesWithUpgradeFlow: React.FC<ExternalDataSourcesUpgradeIntegrationProps> = ({
  jobId,
  onDataEnriched,
  onSkip,
  className = ''
}) => {
  const { isPremium } = usePremiumStatus();
  const { revelationConfig, shouldShowPrompt } = useFeatureTracking('external-data-sources');

  // For premium users, render the actual External Data Sources component
  if (isPremium) {
    // Import the actual component dynamically to avoid circular dependencies
    const ExternalDataSources = React.lazy(() => 
      import('../ExternalDataSources').then(module => ({ 
        default: module.ExternalDataSources || module.default 
      }))
    );

    return (
      <React.Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-lg p-6 h-64" />}>
        <ExternalDataSources
          jobId={jobId}
          onDataEnriched={onDataEnriched}
          onSkip={onSkip}
          className={className}
        />
      </React.Suspense>
    );
  }

  // For non-premium users, show the upgrade flow based on engagement level
  return (
    <div className={`${className}`}>
      <FeatureEngagementTracker
        featureName="external-data-sources"
        trackHover={true}
        trackClicks={true}
      >
        <ExternalDataUpgradeFlow
          stage={
            revelationConfig.intensity === 'urgent' ? 'conversion' :
            revelationConfig.intensity === 'high' ? 'consideration' :
            revelationConfig.intensity === 'medium' ? 'interest' : 'discovery'
          }
          context="feature-gate"
          onUpgrade={() => {
            // Handle upgrade completion
            window.location.href = '/pricing';
          }}
          onDismiss={() => {
            // Handle dismissal - could skip to basic upload
            if (onSkip) {
              onSkip();
            }
          }}
        />
      </FeatureEngagementTracker>
    </div>
  );
};

// Main integration component with Progressive Revelation Provider
export const ExternalDataSourcesUpgradeIntegration: React.FC<ExternalDataSourcesUpgradeIntegrationProps> = (props) => {
  return (
    <ProgressiveRevelationProvider>
      <ExternalDataSourcesWithUpgradeFlow {...props} />
    </ProgressiveRevelationProvider>
  );
};

// Alternative implementation using the existing PremiumGate system
export const ExternalDataSourcesWithPremiumGate: React.FC<ExternalDataSourcesUpgradeIntegrationProps> = ({
  jobId,
  onDataEnriched,
  onSkip,
  className = ''
}) => {
  // Import the actual component dynamically
  const ExternalDataSources = React.lazy(() => 
    import('../ExternalDataSources').then(module => ({ 
      default: module.ExternalDataSources || module.default 
    }))
  );

  return (
    <ProgressiveRevelationProvider>
      <ExternalDataSourcesGate
        customUpgradeComponent={(props) => (
          <ExternalDataUpgradeFlow
            stage="consideration"
            context="feature-gate"
            onUpgrade={props.onUpgrade}
            onDismiss={onSkip}
            className="max-w-4xl mx-auto"
          />
        )}
      >
        <React.Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-lg p-6 h-64" />}>
          <ExternalDataSources
            jobId={jobId}
            onDataEnriched={onDataEnriched}
            onSkip={onSkip}
            className={className}
          />
        </React.Suspense>
      </ExternalDataSourcesGate>
    </ProgressiveRevelationProvider>
  );
};

// Usage examples and documentation
export const ExternalDataSourcesUpgradeExamples = {
  /**
   * Basic Usage - Replace existing External Data Sources component
   * 
   * Before:
   * <ExternalDataSources jobId={jobId} onDataEnriched={handleData} />
   * 
   * After:
   * <ExternalDataSourcesUpgradeIntegration 
   *   jobId={jobId} 
   *   onDataEnriched={handleData} 
   * />
   */
  basic: `
    <ExternalDataSourcesUpgradeIntegration 
      jobId={jobId} 
      onDataEnriched={handleDataEnrichment}
      onSkip={handleSkipToBasicUpload}
    />
  `,

  /**
   * With Premium Gate - Use existing PremiumGate system
   */
  withPremiumGate: `
    <ExternalDataSourcesWithPremiumGate
      jobId={jobId}
      onDataEnriched={handleDataEnrichment}
      onSkip={handleSkipToBasicUpload}
    />
  `,

  /**
   * Custom Configuration - Fine-tune the upgrade experience
   */
  customConfig: `
    <ProgressiveRevelationProvider>
      <ExternalDataUpgradeFlow
        stage="conversion"
        context="feature-gate"
        onUpgrade={() => navigate('/pricing')}
        onDismiss={handleDismiss}
      />
    </ProgressiveRevelationProvider>
  `,

  /**
   * Integration with existing CV Analysis Page
   */
  cvAnalysisIntegration: `
    // In CVAnalysisPage.tsx
    import { ExternalDataSourcesUpgradeIntegration } from './components/premium';

    // Replace the existing ExternalDataSources usage:
    <ExternalDataSourcesUpgradeIntegration
      jobId={jobId}
      onDataEnriched={handleExternalDataEnrichment}
      onSkip={() => setShowExternalDataSources(false)}
      className="mb-8"
    />
  `
};

export default ExternalDataSourcesUpgradeIntegration;