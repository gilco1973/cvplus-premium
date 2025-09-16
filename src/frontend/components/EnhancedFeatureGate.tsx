/**
 * Enhanced Feature Gate Component
 * Comprehensive premium feature access control with usage tracking
 * Author: Gil Klainert
 * Date: August 27, 2025
 */

import React, { ReactNode, useEffect, useState, useMemo } from 'react';
import { Crown, Loader2, AlertTriangle, TrendingUp, Clock, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { featureGatingService, FeatureAccessResult } from '../../services/premium/featureGatingService';
import { usageTracker } from '../../services/premium/usageTracker';
import { FeatureRegistry } from '../../services/premium/featureRegistry';
import { UpgradePrompt } from '../pricing/UpgradePrompt';

interface EnhancedFeatureGateProps {
  featureId: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  upgradeMessage?: string;
  trackUsage?: boolean;
  className?: string;
  onAccessDenied?: (reason: string, details?: any) => void;
  onAccessGranted?: (details?: any) => void;
}

interface FeatureGateState {
  accessResult: FeatureAccessResult | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Enhanced Feature Gate with comprehensive access control and analytics
 */
export const EnhancedFeatureGate: React.FC<EnhancedFeatureGateProps> = ({
  featureId,
  children,
  fallback,
  showUpgradePrompt = true,
  upgradeMessage,
  trackUsage = true,
  className = '',
  onAccessDenied,
  onAccessGranted
}) => {
  const { user } = useAuth();
  const [state, setState] = useState<FeatureGateState>({
    accessResult: null,
    isLoading: true,
    error: null
  });

  const feature = useMemo(() => FeatureRegistry.getFeature(featureId), [featureId]);

  // Check feature access on mount and user change
  useEffect(() => {
    if (!user || !feature) {
      setState({
        accessResult: null,
        isLoading: false,
        error: !feature ? `Feature '${featureId}' not found` : null
      });
      return;
    }

    let isMounted = true;

    const checkAccess = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const accessResult = await featureGatingService.checkFeatureAccess(
          user.uid,
          featureId,
          {
            userAgent: navigator.userAgent,
            sessionId: sessionStorage.getItem('sessionId') || undefined,
            referrer: document.referrer,
            metadata: {
              component: 'EnhancedFeatureGate',
              trackUsage
            }
          }
        );

        if (!isMounted) return;

        setState({
          accessResult,
          isLoading: false,
          error: null
        });

        // Call appropriate callback
        if (accessResult.hasAccess) {
          onAccessGranted?.(accessResult.details);
        } else {
          onAccessDenied?.(accessResult.reason, accessResult.details);
        }

      } catch (error) {
        if (!isMounted) return;
        
        setState({
          accessResult: null,
          isLoading: false,
          error: (error as Error).message
        });
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [user, featureId, feature, onAccessDenied, onAccessGranted, trackUsage]);

  // Track feature view
  useEffect(() => {
    if (trackUsage && user && state.accessResult && !state.isLoading) {
      usageTracker.trackFeatureAccess(user.uid, featureId, {
        accessType: state.accessResult.hasAccess ? 'authorized' : 'blocked',
        executionTime: state.accessResult.metadata?.checkedAt ? 
          Date.now() - state.accessResult.metadata.checkedAt.getTime() : 
          undefined,
        metadata: {
          component: 'EnhancedFeatureGate',
          reason: state.accessResult.reason
        }
      });
    }
  }, [user, featureId, state.accessResult, state.isLoading, trackUsage]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Checking access...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Access Check Failed</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{state.error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-red-600 underline hover:text-red-800 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  // Feature not found
  if (!feature) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Feature Not Available</span>
        </div>
        <p className="text-yellow-600 text-sm mt-1">
          The requested feature "{featureId}" is not available.
        </p>
      </div>
    );
  }

  // No user - show sign in prompt
  if (!user) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-blue-700">
          <Crown className="w-5 h-5" />
          <span className="font-medium">Sign In Required</span>
        </div>
        <p className="text-blue-600 text-sm mt-1">
          Please sign in to access this feature.
        </p>
        <button
          onClick={() => {
            // Trigger sign in modal/redirect
            window.location.href = '/auth/signin';
          }}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  const { accessResult } = state;

  // Access granted - render children
  if (accessResult?.hasAccess) {
    // Show grace period warning if applicable
    if (accessResult.reason === 'grace_period') {
      return (
        <div className={className}>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-orange-700">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Grace Period Active</span>
            </div>
            <p className="text-orange-600 text-xs mt-1">
              {accessResult.details?.remainingDays} days remaining. 
              <a 
                href={accessResult.details?.upgradeUrl || '/pricing'} 
                className="underline hover:text-orange-800 ml-1"
              >
                Upgrade now
              </a>
            </p>
          </div>
          {children}
        </div>
      );
    }

    return <div className={className}>{children}</div>;
  }

  // Access denied - show appropriate UI
  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  // Render upgrade prompt based on denial reason
  return (
    <div className={className}>
      {accessResult?.reason === 'insufficient_plan' && (
        <UpgradePrompt
          featureId={featureId}
          featureName={feature.name}
          featureDescription={feature.description}
          currentPlan={accessResult.details?.currentPlan}
          requiredPlans={accessResult.details?.requiredPlans}
          customMessage={upgradeMessage}
          className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50"
          popularityScore={feature.popularityScore}
        />
      )}

      {accessResult?.reason === 'usage_limit_exceeded' && (
        <div className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-amber-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900">
                Usage Limit Reached
              </h3>
              <p className="text-amber-700 text-sm mt-1">
                You've used {accessResult.details?.currentUsage} of {accessResult.details?.usageLimit} 
                {' '}{feature.name.toLowerCase()} features this month.
              </p>
              
              {accessResult.details?.resetDate && (
                <p className="text-amber-600 text-xs mt-2">
                  Limits reset on {new Date(accessResult.details.resetDate).toLocaleDateString()}
                </p>
              )}

              <div className="flex gap-3 mt-4">
                <a
                  href="/pricing"
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  Upgrade Plan
                </a>
                <button
                  onClick={() => {
                    // Show usage details modal
                    console.log('Show usage details');
                  }}
                  className="text-amber-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  View Usage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {accessResult?.reason === 'system_error' && (
        <div className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">
                Temporary Access Issue
              </h3>
              <p className="text-red-700 text-sm mt-1">
                We're experiencing technical difficulties. Please try again in a moment.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors mt-3"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for feature gate logic in custom components
 */
export const useFeatureGate = (featureId: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<FeatureGateState>({
    accessResult: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!user) {
      setState({ accessResult: null, isLoading: false, error: null });
      return;
    }

    let isMounted = true;

    const checkAccess = async () => {
      try {
        const accessResult = await featureGatingService.checkFeatureAccess(user.uid, featureId);
        
        if (isMounted) {
          setState({ accessResult, isLoading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          setState({ accessResult: null, isLoading: false, error: (error as Error).message });
        }
      }
    };

    checkAccess();
    return () => { isMounted = false; };
  }, [user, featureId]);

  return {
    hasAccess: state.accessResult?.hasAccess ?? false,
    reason: state.accessResult?.reason,
    details: state.accessResult?.details,
    isLoading: state.isLoading,
    error: state.error,
    feature: FeatureRegistry.getFeature(featureId)
  };
};

export default EnhancedFeatureGate;