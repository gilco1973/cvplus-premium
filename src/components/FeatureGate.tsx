/**
 * CVPlus Premium Module - Feature Gate Component
 * 
 * Controls access to premium features with upgrade prompts and fallback UI
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PremiumGateProps,
  PremiumFeature,
  SubscriptionTier
} from '../types';
import {
  FEATURE_DISPLAY_NAMES,
  FEATURE_DESCRIPTIONS
} from '../constants/premium.constants';

/**
 * Feature gate component that controls access to premium features
 */
export const FeatureGate: React.FC<PremiumGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  upgradeUrl = '/pricing',
  className = ''
}) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userTier, setUserTier] = useState<SubscriptionTier>('FREE');

  // Mock access check - in real implementation, this would use the FeatureService
  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock logic - in real implementation, this would call the feature service
        const mockHasAccess = userTier === 'PREMIUM';
        setHasAccess(mockHasAccess);
      } catch (error) {
        console.error('Error checking feature access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [feature, userTier]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-lg p-6">
          <div className="h-4 bg-gray-300 rounded mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  // Grant access if user has premium features
  if (hasAccess) {
    return <div className={className}>{children}</div>;
  }

  // Show fallback if provided and no upgrade prompt
  if (fallback && !showUpgradePrompt) {
    return <div className={className}>{fallback}</div>;
  }

  // Show upgrade prompt
  return (
    <div className={className}>
      <UpgradePrompt
        feature={feature}
        upgradeUrl={upgradeUrl}
        fallback={fallback}
      />
    </div>
  );
};

/**
 * Upgrade prompt component
 */
interface UpgradePromptProps {
  feature: PremiumFeature;
  upgradeUrl: string;
  fallback?: React.ReactNode;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  upgradeUrl,
  fallback
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const featureName = FEATURE_DISPLAY_NAMES[feature] || feature;
  const featureDescription = FEATURE_DESCRIPTIONS[feature] || 'This premium feature requires an upgrade.';

  const handleUpgrade = () => {
    // In a real app, this would navigate to the upgrade page
    window.location.href = upgradeUrl;
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Show fallback if dismissed and available
  if (isDismissed && fallback) {
    return <>{fallback}</>;
  }

  // Show minimal dismissed state
  if (isDismissed) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {featureName} requires Premium
          </span>
          <button
            onClick={() => setIsDismissed(false)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Show Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Upgrade to Premium
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Unlock {featureName} and all premium features
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Feature description */}
      <div className="mb-6">
        <p className="text-gray-700 text-sm leading-relaxed">
          {featureDescription}
        </p>
      </div>

      {/* Benefits list */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          What you'll get with Premium:
        </h4>
        <ul className="space-y-2">
          {[
            'Personal Web Portal',
            'AI Chat Assistant',
            'AI Career Podcast',
            'Advanced Analytics',
            'Video Introduction',
            'AI Role Detection',
            'External Data Integration'
          ].map((benefit, index) => (
            <li key={index} className="flex items-center text-sm text-gray-700">
              <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* Pricing */}
      <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            $49 <span className="text-lg font-normal text-gray-600">one-time</span>
          </div>
          <div className="text-sm text-gray-600">
            Lifetime access • No recurring payments
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleUpgrade}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors mr-3"
        >
          Upgrade Now
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-600 hover:text-gray-800 text-sm font-medium px-4 py-3"
        >
          Maybe Later
        </button>
      </div>

      {/* Guarantee */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          ✅ 30-day money-back guarantee
        </p>
      </div>
    </div>
  );
};

/**
 * Inline feature gate for smaller UI elements
 */
interface InlineFeatureGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  fallbackText?: string;
  upgradeUrl?: string;
  className?: string;
}

export const InlineFeatureGate: React.FC<InlineFeatureGateProps> = ({
  feature,
  children,
  fallbackText = 'Premium feature',
  upgradeUrl = '/pricing',
  className = ''
}) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  // Mock access check
  useEffect(() => {
    // In real implementation, this would check user's subscription
    setHasAccess(false); // Mock: user doesn't have access
  }, [feature]);

  if (hasAccess) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <span className="text-gray-400">{fallbackText}</span>
      <a
        href={upgradeUrl}
        className="ml-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        Upgrade
      </a>
    </div>
  );
};

/**
 * Feature gate hook for programmatic access control
 */
export const useFeatureAccess = (feature: PremiumFeature) => {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      
      try {
        // In real implementation, this would use the FeatureService
        await new Promise(resolve => setTimeout(resolve, 100));
        setHasAccess(false); // Mock: no access
      } catch (error) {
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [feature]);

  return { hasAccess, isLoading };
};

export default FeatureGate;