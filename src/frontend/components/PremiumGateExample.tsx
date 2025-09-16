import React from 'react';
import { ExternalDataSources } from '../ExternalDataSources';
import { PremiumGate, ExternalDataSourcesGate, usePremiumGateAnalytics } from './PremiumGate';
import { toast } from 'react-hot-toast';

/**
 * Example integration of PremiumGate with ExternalDataSources component
 * This demonstrates how to properly wrap premium features with access control
 */

interface ExampleProps {
  jobId: string;
  onDataEnriched?: (data: unknown[]) => void;
  onSkip?: () => void;
}

/**
 * Example 1: Basic PremiumGate Integration
 * Shows the most straightforward way to add premium gating
 */
export const BasicPremiumGateExample: React.FC<ExampleProps> = ({
  jobId,
  onDataEnriched,
  onSkip
}) => {
  const { trackEvent } = usePremiumGateAnalytics();

  const handleAnalyticsEvent = (event: string, data?: Record<string, any>) => {
    trackEvent(event, {
      component: 'ExternalDataSources',
      jobId,
      ...data
    });
  };

  const handleAccessDenied = () => {
    toast.error('This feature requires a premium subscription', {
      duration: 4000,
      position: 'top-center'
    });
  };

  return (
    <PremiumGate
      feature="externalDataSources"
      title="External Data Sources"
      description="Import and sync data from LinkedIn, GitHub, and other professional platforms to enhance your CV automatically."
      showPreview={true}
      previewOpacity={0.3}
      onAnalyticsEvent={handleAnalyticsEvent}
      onAccessDenied={handleAccessDenied}
      className="w-full"
    >
      <ExternalDataSources
        jobId={jobId}
        onDataEnriched={onDataEnriched}
        onSkip={onSkip}
      />
    </PremiumGate>
  );
};

/**
 * Example 2: Using Pre-configured PremiumGate
 * Shows how to use the pre-configured ExternalDataSourcesGate
 */
export const PreConfiguredGateExample: React.FC<ExampleProps> = ({
  jobId,
  onDataEnriched,
  onSkip
}) => {
  const { trackEvent } = usePremiumGateAnalytics();

  const handleAnalyticsEvent = (event: string, data?: Record<string, any>) => {
    trackEvent(event, {
      component: 'ExternalDataSources',
      context: 'preconfigured_gate',
      jobId,
      ...data
    });
  };

  return (
    <ExternalDataSourcesGate
      onAnalyticsEvent={handleAnalyticsEvent}
      onAccessDenied={() => {
        toast.error('Premium feature - upgrade to access external data sources!');
      }}
    >
      <ExternalDataSources
        jobId={jobId}
        onDataEnriched={onDataEnriched}
        onSkip={onSkip}
      />
    </ExternalDataSourcesGate>
  );
};

/**
 * Example 3: Custom Fallback Component
 * Shows how to provide a custom upgrade prompt
 */
export const CustomFallbackExample: React.FC<ExampleProps> = ({
  jobId,
  onDataEnriched,
  onSkip
}) => {
  const CustomUpgradePrompt = (
    <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl p-8 border border-blue-500/30 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-white mb-3">
            Supercharge Your CV
          </h3>
          <p className="text-blue-100 leading-relaxed">
            Connect with LinkedIn, GitHub, and other platforms to automatically import your latest achievements, projects, and certifications.
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm text-blue-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Automatic data import</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-blue-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Real-time synchronization</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-blue-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Enhanced CV content</span>
          </div>
        </div>
        
        <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200">
          Upgrade to Premium
        </button>
      </div>
    </div>
  );

  return (
    <PremiumGate
      feature="externalDataSources"
      title="External Data Sources"
      description="Premium feature for importing external data"
      fallback={CustomUpgradePrompt}
      onAnalyticsEvent={(event, data) => {
        console.log('Custom fallback analytics:', event, data);
      }}
    >
      <ExternalDataSources
        jobId={jobId}
        onDataEnriched={onDataEnriched}
        onSkip={onSkip}
      />
    </PremiumGate>
  );
};

/**
 * Example 4: No Preview Mode
 * Shows external data sources gate without preview functionality
 */
export const NoPreviewExample: React.FC<ExampleProps> = ({
  jobId,
  onDataEnriched,
  onSkip
}) => {
  return (
    <PremiumGate
      feature="externalDataSources"
      title="External Data Integration"
      description="Connect your professional profiles to automatically enhance your CV with the latest achievements, projects, and certifications from LinkedIn, GitHub, and other platforms."
      showPreview={false} // No preview - direct upgrade prompt
      className="w-full max-w-4xl mx-auto"
      onAnalyticsEvent={(event, data) => {
        // Send to analytics service
        console.log('Premium gate event:', event, data);
      }}
      onAccessDenied={() => {
        // Custom handling for access denied
        toast.error('External data sources require premium access', {
          duration: 5000,
          icon: '🔒'
        });
      }}
    >
      <ExternalDataSources
        jobId={jobId}
        onDataEnriched={onDataEnriched}
        onSkip={onSkip}
      />
    </PremiumGate>
  );
};

/**
 * Example 5: Integration in a larger component
 * Shows how to integrate premium gating within a multi-step process
 */
interface MultiStepProps {
  currentStep: number;
  jobId: string;
  onNextStep: () => void;
  onPreviousStep: () => void;
}

export const MultiStepIntegrationExample: React.FC<MultiStepProps> = ({
  currentStep,
  jobId,
  onNextStep,
  onPreviousStep
}) => {
  if (currentStep !== 3) {
    return null; // Only show on step 3
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Step 3: External Data Integration
        </h2>
        <p className="text-neutral-300">
          Enhance your CV with data from your professional profiles (Premium Feature)
        </p>
      </div>
      
      <ExternalDataSourcesGate
        className="w-full"
        onAnalyticsEvent={(event, data) => {
          console.log('Multi-step premium gate:', event, {
            ...data,
            step: currentStep,
            context: 'multi_step_process'
          });
        }}
      >
        <ExternalDataSources
          jobId={jobId}
          onDataEnriched={() => {
            toast.success('External data integrated successfully!');
            onNextStep();
          }}
          onSkip={onNextStep}
        />
      </ExternalDataSourcesGate>
      
      <div className="flex justify-between pt-4">
        <button
          onClick={onPreviousStep}
          className="px-4 py-2 text-neutral-300 hover:text-white transition-colors"
        >
          ← Previous Step
        </button>
        
        <button
          onClick={onNextStep}
          className="px-6 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors"
        >
          Skip This Step →
        </button>
      </div>
    </div>
  );
};

export default {
  BasicPremiumGateExample,
  PreConfiguredGateExample,
  CustomFallbackExample,
  NoPreviewExample,
  MultiStepIntegrationExample
};