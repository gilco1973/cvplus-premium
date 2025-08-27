/**
 * CVPlus Premium Module - Subscription Plans Component
 * 
 * Comprehensive subscription plans display with pricing, features,
 * and upgrade functionality
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  SubscriptionTier, 
  TierConfig, 
  SubscriptionPlanProps,
  PremiumFeature 
} from '../types';
import { 
  SUBSCRIPTION_TIERS,
  FEATURE_DISPLAY_NAMES,
  CURRENCY_SYMBOLS,
  DEFAULT_PRICING
} from '../constants/premium.constants';

/**
 * Individual subscription plan card component
 */
const SubscriptionPlanCard: React.FC<SubscriptionPlanProps> = ({
  tier,
  config,
  currentTier,
  onSelect,
  isSelected = false,
  isLoading = false,
  className = ''
}) => {
  const isCurrent = currentTier === tier;
  const isUpgrade = currentTier === 'FREE' && tier === 'PREMIUM';
  const currencySymbol = CURRENCY_SYMBOLS[config.price.currency];

  const handleSelect = () => {
    if (onSelect && !isLoading && !isCurrent) {
      onSelect(tier);
    }
  };

  return (
    <div 
      className={`
        relative rounded-xl border-2 transition-all duration-300 cursor-pointer
        ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
        ${isCurrent ? 'ring-2 ring-green-500' : ''}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={handleSelect}
    >
      {/* Current plan badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Current Plan
          </span>
        </div>
      )}

      {/* Popular badge for premium */}
      {tier === 'PREMIUM' && !isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-6">
        {/* Plan header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {config.name}
          </h3>
          <div className="mb-4">
            <span className="text-4xl font-bold text-gray-900">
              {config.price.dollars === 0 ? 'Free' : `${currencySymbol}${config.price.dollars}`}
            </span>
            {tier === 'PREMIUM' && (
              <span className="text-gray-500 text-lg ml-1">one-time</span>
            )}
          </div>
          <p className="text-gray-600 text-sm">
            {config.description}
          </p>
        </div>

        {/* Features list */}
        <div className="mb-6">
          <ul className="space-y-3">
            {Object.entries(config.features).map(([feature, enabled]) => (
              <li key={feature} className="flex items-center">
                <div className={`
                  w-5 h-5 rounded-full mr-3 flex items-center justify-center
                  ${enabled ? 'bg-green-100' : 'bg-gray-100'}
                `}>
                  {enabled ? (
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className={`
                  text-sm
                  ${enabled ? 'text-gray-900' : 'text-gray-400 line-through'}
                `}>
                  {FEATURE_DISPLAY_NAMES[feature as PremiumFeature] || feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action button */}
        <button
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200
            ${isCurrent 
              ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
              : isUpgrade
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={handleSelect}
          disabled={isLoading || isCurrent}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Processing...
            </div>
          ) : isCurrent ? (
            'Current Plan'
          ) : isUpgrade ? (
            'Upgrade Now'
          ) : (
            'Select Plan'
          )}
        </button>

        {/* Lifetime guarantee for premium */}
        {tier === 'PREMIUM' && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              ✨ Lifetime access - no recurring payments
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main subscription plans component
 */
interface SubscriptionPlansProps {
  currentTier?: SubscriptionTier;
  onPlanSelect?: (tier: SubscriptionTier) => void;
  isLoading?: boolean;
  showComparison?: boolean;
  className?: string;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  currentTier = 'FREE',
  onPlanSelect,
  isLoading = false,
  showComparison = false,
  className = ''
}) => {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [tierConfigs, setTierConfigs] = useState<Record<SubscriptionTier, TierConfig>>({
    FREE: {
      tier: 'FREE',
      name: 'Free',
      description: 'Perfect for getting started with CV enhancement',
      price: {
        cents: 0,
        dollars: 0,
        currency: 'USD',
        stripeConfig: {
          development: '',
          staging: '',
          production: ''
        }
      },
      isActive: true,
      features: {
        webPortal: false,
        aiChat: false,
        podcast: false,
        advancedAnalytics: false,
        videoIntroduction: false,
        roleDetection: false,
        externalData: false
      }
    },
    PREMIUM: {
      tier: 'PREMIUM',
      name: 'Premium',
      description: 'Unlock all features with lifetime access',
      price: {
        cents: DEFAULT_PRICING.PREMIUM.cents,
        dollars: DEFAULT_PRICING.PREMIUM.dollars,
        currency: 'USD',
        stripeConfig: {
          development: 'price_dev_placeholder',
          staging: 'price_staging_placeholder',
          production: 'price_prod_placeholder'
        }
      },
      isActive: true,
      features: {
        webPortal: true,
        aiChat: true,
        podcast: true,
        advancedAnalytics: true,
        videoIntroduction: true,
        roleDetection: true,
        externalData: true
      }
    }
  });

  const handlePlanSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    if (onPlanSelect) {
      onPlanSelect(tier);
    }
  };

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Start with our free plan or upgrade to premium for unlimited access to all features.
          Premium is a one-time payment with lifetime access.
        </p>
      </div>

      {/* Plans grid */}
      <div className={`
        grid gap-8 mb-12
        ${showComparison ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}
      `}>
        {Object.entries(tierConfigs).map(([tier, config]) => (
          <SubscriptionPlanCard
            key={tier}
            tier={tier as SubscriptionTier}
            config={config}
            currentTier={currentTier}
            onSelect={handlePlanSelect}
            isSelected={selectedTier === tier}
            isLoading={isLoading && selectedTier === tier}
            className={tier === 'PREMIUM' ? 'relative scale-105 shadow-lg' : ''}
          />
        ))}
      </div>

      {/* Feature comparison table */}
      {showComparison && (
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Feature Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">
                    Feature
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">
                    Free
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(FEATURE_DISPLAY_NAMES).map((feature) => {
                  const featureKey = feature as PremiumFeature;
                  return (
                    <tr key={feature} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-900">
                        {FEATURE_DISPLAY_NAMES[featureKey]}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tierConfigs.FREE.features[featureKey] ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-400">✗</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tierConfigs.PREMIUM.features[featureKey] ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-400">✗</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Money-back guarantee */}
      <div className="text-center mt-8 p-6 bg-blue-50 rounded-xl">
        <div className="flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold text-blue-900">
            30-Day Money-Back Guarantee
          </h3>
        </div>
        <p className="text-blue-800 text-sm max-w-md mx-auto">
          Try Premium risk-free. If you're not completely satisfied within 30 days, 
          we'll refund your payment in full.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;