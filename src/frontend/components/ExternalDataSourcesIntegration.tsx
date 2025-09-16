import React from 'react';
import { ExternalDataSources } from '../ExternalDataSources';
import { ExternalDataSourcesGate } from './PremiumGate';
import toast from 'react-hot-toast';

/**
 * Production-ready integration of PremiumGate with ExternalDataSources
 * This component demonstrates the recommended way to integrate premium gating
 * with the ExternalDataSources feature in CVPlus.
 */

interface ExternalDataSourcesIntegrationProps {
  /** The job ID for CV processing */
  jobId: string;
  /** Callback when external data is successfully enriched */
  onDataEnriched?: (data: unknown[]) => void;
  /** Callback when user skips external data step */
  onSkip?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Premium-gated ExternalDataSources component
 * 
 * This component wraps the ExternalDataSources with premium access control,
 * providing a consistent user experience for both premium and free users.
 * 
 * Features:
 * - Premium access control with preview mode
 * - Analytics tracking for premium interactions
 * - User-friendly upgrade prompts
 * - Error handling and accessibility support
 */
export const ExternalDataSourcesIntegration: React.FC<ExternalDataSourcesIntegrationProps> = ({
  jobId,
  onDataEnriched,
  onSkip,
  className = ''
}) => {
  /**
   * Handle analytics events for premium feature interactions
   * Integrate with your analytics service (Google Analytics, Mixpanel, etc.)
   */
  const handleAnalyticsEvent = (event: string, data?: Record<string, any>) => {
    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Premium Feature Analytics:', {
        event,
        feature: 'externalDataSources',
        jobId,
        timestamp: Date.now(),
        ...data
      });
    }

    // Example: Send to analytics service
    // analytics.track('premium_gate_interaction', {
    //   event,
    //   feature: 'externalDataSources',
    //   jobId,
    //   component: 'ExternalDataSourcesIntegration',
    //   ...data
    // });
  };

  /**
   * Handle user attempts to access premium feature without subscription
   * Provide helpful feedback and encourage upgrade
   */
  const handleAccessDenied = () => {
    toast.error(
      'External Data Sources require premium access. Upgrade to automatically import from LinkedIn, GitHub, and more!',
      {
        duration: 6000,
        position: 'top-center',
        icon: '🔒',
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          border: '1px solid #374151'
        }
      }
    );
    
    // Track access denial for analytics
    handleAnalyticsEvent('access_denied_toast_shown', {
      reason: 'no_premium_subscription'
    });
  };

  /**
   * Enhanced data enriched callback with analytics
   */
  const handleDataEnriched = (data: unknown[]) => {
    // Track successful premium feature usage
    handleAnalyticsEvent('feature_used_successfully', {
      dataItemsCount: data.length,
      success: true
    });

    // Call parent callback
    onDataEnriched?.(data);

    // Show success message
    toast.success(
      `Successfully imported ${data.length} items from external sources!`,
      {
        duration: 4000,
        icon: '✨'
      }
    );
  };

  /**
   * Enhanced skip callback with analytics
   */
  const handleSkip = () => {
    // Track when users skip the premium feature
    handleAnalyticsEvent('feature_skipped', {
      reason: 'user_choice'
    });

    // Call parent callback
    onSkip?.();
  };

  return (
    <div className={`external-data-sources-integration ${className}`}>
      <ExternalDataSourcesGate
        onAnalyticsEvent={handleAnalyticsEvent}
        onAccessDenied={handleAccessDenied}
        className="w-full"
      >
        <ExternalDataSources
          jobId={jobId}
          onDataEnriched={handleDataEnriched}
          onSkip={handleSkip}
          className="w-full"
        />
      </ExternalDataSourcesGate>
    </div>
  );
};

/**
 * Variant with custom upgrade prompt
 * Shows how to create a more specific upgrade message for this feature
 */
export const ExternalDataSourcesWithCustomPrompt: React.FC<ExternalDataSourcesIntegrationProps> = ({
  jobId,
  onDataEnriched,
  onSkip,
  className = ''
}) => {
  const CustomUpgradePrompt = (
    <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-xl p-8 border border-cyan-500/30 text-center max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        
        {/* Title */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-3">
            Supercharge Your CV with External Data
          </h3>
          <p className="text-cyan-100 leading-relaxed">
            Automatically import your latest achievements, projects, and certifications 
            from your professional profiles. Save hours of manual data entry!
          </p>
        </div>
        
        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-cyan-200">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>LinkedIn Profile Sync</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-200">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>GitHub Repository Import</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-200">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Certification Verification</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-200">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Real-time Updates</span>
          </div>
        </div>
        
        {/* CTA */}
        <div className="pt-2">
          <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-8 rounded-lg hover:from-cyan-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
            Unlock External Data Sources - $49 Lifetime
          </button>
          <p className="text-xs text-cyan-300 mt-2 opacity-75">
            One-time payment • No monthly fees • Lifetime access
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`external-data-sources-integration ${className}`}>
      <ExternalDataSourcesGate
        fallback={CustomUpgradePrompt}
        onAnalyticsEvent={(event, data) => {
          console.log('Custom prompt analytics:', event, data);
        }}
        onAccessDenied={() => {
          toast.error('Upgrade to unlock external data integration!');
        }}
      >
        <ExternalDataSources
          jobId={jobId}
          onDataEnriched={onDataEnriched}
          onSkip={onSkip}
        />
      </ExternalDataSourcesGate>
    </div>
  );
};

export default ExternalDataSourcesIntegration;