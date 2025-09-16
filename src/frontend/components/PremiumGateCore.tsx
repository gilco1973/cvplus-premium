import React, { useState, useCallback } from 'react';
import { useFeatureAccess } from '../../hooks/usePremiumStatus';
import { LoadingState, PreviewOverlay, DefaultUpgradePrompt } from './PremiumGateComponents';
import { PremiumGateErrorBoundary } from './PremiumGateErrorBoundary';

/**
 * Props interface for the PremiumGate component
 */
export interface PremiumGateProps {
  /** The premium feature name to check access for */
  feature: string;
  /** Title for the upgrade prompt */
  title: string;
  /** Description of the premium feature */
  description: string;
  /** The premium content to show when user has access */
  children: React.ReactNode;
  /** Optional custom upgrade prompt component */
  fallback?: React.ReactNode;
  /** Whether to show a preview of the feature (with overlay) */
  showPreview?: boolean;
  /** Opacity for preview mode (default 0.3) */
  previewOpacity?: number;
  /** Additional CSS classes */
  className?: string;
  /** Analytics tracking callback for premium feature interactions */
  onAnalyticsEvent?: (event: 'upgrade_prompt_shown' | 'upgrade_prompt_clicked' | 'feature_access_denied', data?: Record<string, any>) => void;
  /** Callback when user tries to interact with locked feature */
  onAccessDenied?: () => void;
}

/**
 * PremiumGate component - Controls access to premium features
 * 
 * This component wraps premium content and shows appropriate upgrade prompts
 * for non-premium users. It integrates with the existing premium infrastructure
 * and provides a consistent user experience across all premium features.
 */
export const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  title,
  description,
  children,
  fallback,
  showPreview = false,
  previewOpacity = 0.3,
  className = '',
  onAnalyticsEvent,
  onAccessDenied
}) => {
  const { hasAccess, isPremium, isLoading } = useFeatureAccess(feature);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Handle upgrade button click
  const handleUpgradeClick = useCallback(() => {
    setHasInteracted(true);
    onAnalyticsEvent?.('upgrade_prompt_clicked', { feature, title });
  }, [feature, title, onAnalyticsEvent]);
  
  // Handle access denied interaction
  const handleAccessDenied = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onAnalyticsEvent?.('feature_access_denied', { feature, title });
      onAccessDenied?.();
    }
  }, [feature, title, hasInteracted, onAnalyticsEvent, onAccessDenied]);
  
  // Error boundary error handler
  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`PremiumGate Error for feature "${feature}":`, error, errorInfo);
    onAnalyticsEvent?.('feature_access_denied', { 
      feature, 
      title, 
      error: error.message,
      errorType: 'boundary_error'
    });
  }, [feature, title, onAnalyticsEvent]);
  
  return (
    <PremiumGateErrorBoundary onError={handleError}>
      <div 
        className={`premium-gate relative ${className}`}
        data-feature={feature}
        data-has-access={hasAccess}
        data-is-premium={isPremium}
      >
        {isLoading ? (
          <LoadingState className={className} />
        ) : hasAccess ? (
          // User has access - render content normally
          <div className="premium-content">
            {children}
          </div>
        ) : showPreview ? (
          // Show preview with overlay
          <div className="relative">
            <div 
              className="premium-preview transition-opacity duration-300"
              style={{ opacity: previewOpacity }}
              aria-hidden="true"
            >
              {children}
            </div>
            <PreviewOverlay
              title={title}
              description={description}
              opacity={previewOpacity}
              onUpgradeClick={handleUpgradeClick}
              onAccessDenied={handleAccessDenied}
            />
          </div>
        ) : (
          // Show upgrade prompt
          <div className="premium-gate-blocked">
            {fallback || (
              <DefaultUpgradePrompt
                feature={feature}
                title={title}
                description={description}
                onAnalyticsEvent={onAnalyticsEvent}
              />
            )}
          </div>
        )}
      </div>
    </PremiumGateErrorBoundary>
  );
};

export default PremiumGate;