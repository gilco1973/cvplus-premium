/**
 * CVPlus Premium Module - Upgrade Prompt Component
 * 
 * Flexible upgrade prompts with different variants and customization options
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { 
  UpgradePromptProps,
  PremiumFeature
} from '../types';
import {
  FEATURE_DISPLAY_NAMES,
  FEATURE_DESCRIPTIONS,
  DEFAULT_PRICING,
  CURRENCY_SYMBOLS
} from '../constants/premium.constants';

/**
 * Main upgrade prompt component with multiple variants
 */
export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  onUpgrade,
  onDismiss,
  className = '',
  variant = 'modal'
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const featureName = FEATURE_DISPLAY_NAMES[feature] || feature;
  const featureDescription = FEATURE_DESCRIPTIONS[feature] || 'This premium feature requires an upgrade.';

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) {
    return null;
  }

  // Modal variant
  if (variant === 'modal') {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${className}`}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleDismiss}
          />
          
          {/* Modal panel */}
          <div className="inline-block align-bottom bg-white rounded-lg px-6 pt-6 pb-6 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <ModalContent
              feature={feature}
              featureName={featureName}
              featureDescription={featureDescription}
              onUpgrade={handleUpgrade}
              onDismiss={handleDismiss}
            />
          </div>
        </div>
      </div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white ${className}`}>
        <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="w-0 flex-1 flex items-center">
              <span className="flex p-2 rounded-lg bg-white bg-opacity-20">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </span>
              <p className="ml-3 font-medium truncate">
                <span className="md:inline">
                  Unlock {featureName} with Premium - Only $49 lifetime!
                </span>
              </p>
            </div>
            <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
              <button
                onClick={handleUpgrade}
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-gray-50"
              >
                Upgrade Now
              </button>
            </div>
            <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-3">
              <button
                onClick={handleDismiss}
                className="-mr-1 flex p-2 rounded-md hover:bg-white hover:bg-opacity-20 focus:outline-none"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 ${className}`}>
      <InlineContent
        feature={feature}
        featureName={featureName}
        featureDescription={featureDescription}
        onUpgrade={handleUpgrade}
        onDismiss={handleDismiss}
      />
    </div>
  );
};

/**
 * Modal content component
 */
interface ContentProps {
  feature: PremiumFeature;
  featureName: string;
  featureDescription: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const ModalContent: React.FC<ContentProps> = ({
  feature,
  featureName,
  featureDescription,
  onUpgrade,
  onDismiss
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
          Unlock {featureName}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {featureDescription}
        </p>
      </div>

      {/* Premium features preview */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { name: 'Web Portal', icon: '🌐' },
            { name: 'AI Chat', icon: '💬' },
            { name: 'Podcast', icon: '🎙️' },
            { name: 'Analytics', icon: '📊' },
            { name: 'Video Intro', icon: '🎥' },
            { name: 'Role Detection', icon: '🎯' }
          ].map((item) => (
            <div key={item.name} className="flex items-center p-2 bg-gray-50 rounded">
              <span className="mr-2">{item.icon}</span>
              <span className="text-gray-700">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="text-center mb-6 p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-900">
          ${DEFAULT_PRICING.PREMIUM.dollars}
        </div>
        <div className="text-sm text-gray-600">
          One-time payment • Lifetime access
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:gap-3">
        <button
          onClick={onUpgrade}
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm mb-3 sm:mb-0"
        >
          Upgrade to Premium
        </button>
        <button
          onClick={onDismiss}
          className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
        >
          Maybe Later
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          30-day money-back guarantee
        </p>
      </div>
    </>
  );
};

/**
 * Inline content component
 */
const InlineContent: React.FC<ContentProps> = ({
  feature,
  featureName,
  featureDescription,
  onUpgrade,
  onDismiss
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Upgrade to Premium
            </h3>
            <p className="text-sm text-gray-600">
              Unlock {featureName} and all premium features
            </p>
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Description */}
      <p className="text-gray-700 text-sm mb-4">
        {featureDescription}
      </p>

      {/* Key benefits */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['Lifetime Access', 'All Features', 'No Subscriptions', '30-Day Guarantee'].map((benefit) => (
          <span
            key={benefit}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {benefit}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">
            ${DEFAULT_PRICING.PREMIUM.dollars}
          </span>
          {' '}one-time
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1"
          >
            Later
          </button>
          <button
            onClick={onUpgrade}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </>
  );
};

/**
 * Compact upgrade prompt for tight spaces
 */
interface CompactUpgradePromptProps {
  feature: PremiumFeature;
  onUpgrade?: () => void;
  className?: string;
}

export const CompactUpgradePrompt: React.FC<CompactUpgradePromptProps> = ({
  feature,
  onUpgrade,
  className = ''
}) => {
  const featureName = FEATURE_DISPLAY_NAMES[feature] || feature;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    }
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-gray-900">
            {featureName} requires Premium
          </span>
        </div>
        
        <button
          onClick={handleUpgrade}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Upgrade
        </button>
      </div>
    </div>
  );
};

export default UpgradePrompt;