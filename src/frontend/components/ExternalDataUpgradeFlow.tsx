/**
 * ExternalDataUpgradeFlow - Complete upgrade flow orchestrator for External Data Sources
 * 
 * This component orchestrates the entire upgrade experience, adapting content and intensity
 * based on user engagement patterns and providing a cohesive conversion journey.
 */

import React, { useState, useEffect } from 'react';
import { ExternalDataUpgradePrompt } from './ExternalDataUpgradePrompt';
import { ExternalDataBenefitsShowcase } from './ExternalDataBenefitsShowcase';
import { SuccessStoriesComponent } from './SuccessStoriesComponent';
import { UpgradeIncentives } from './UpgradeIncentives';
import { 
  useProgressiveRevelation, 
  useFeatureTracking,
  FeatureEngagementTracker,
  AdaptiveUpgradePrompt
} from './ProgressiveRevelationManager';
import { usePremiumStatus } from '../../hooks/usePremiumStatus';

interface ExternalDataUpgradeFlowProps {
  stage?: 'discovery' | 'interest' | 'consideration' | 'conversion';
  context?: 'feature-gate' | 'navigation' | 'usage-limit' | 'feature-tour';
  onUpgrade?: () => void;
  onDismiss?: () => void;
  className?: string;
}

type FlowStep = 'benefits' | 'social-proof' | 'incentives' | 'prompt';

export const ExternalDataUpgradeFlow: React.FC<ExternalDataUpgradeFlowProps> = ({
  stage = 'interest',
  context = 'feature-gate',
  onUpgrade,
  onDismiss,
  className = ''
}) => {
  const { isPremium } = usePremiumStatus();
  const { 
    currentStage, 
    getRevelationConfig, 
    shouldShowUpgradePrompt,
    trackConversionAttempt 
  } = useProgressiveRevelation();
  
  const { 
    revelationConfig, 
    shouldShowPrompt, 
    promptIntensity 
  } = useFeatureTracking('external-data-sources');

  const [currentStep, setCurrentStep] = useState<FlowStep>('benefits');
  const [userInteractionCount, setUserInteractionCount] = useState(0);

  // Don't render for premium users
  if (isPremium) return null;

  // Get user engagement level
  const engagementLevel = revelationConfig.intensity;
  const showSpecialOffers = revelationConfig.showSpecialOffers;

  // Determine flow sequence based on engagement and context
  const getFlowSequence = (): FlowStep[] => {
    if (engagementLevel === 'urgent' || promptIntensity === 'urgent') {
      return ['incentives', 'prompt'];
    }
    
    if (engagementLevel === 'high' || stage === 'conversion') {
      return ['social-proof', 'incentives', 'prompt'];
    }
    
    if (engagementLevel === 'medium' || stage === 'consideration') {
      return ['benefits', 'social-proof', 'prompt'];
    }
    
    // Low engagement or discovery stage
    return ['benefits'];
  };

  const flowSequence = getFlowSequence();
  const isLastStep = flowSequence.indexOf(currentStep) === flowSequence.length - 1;

  const handleNext = () => {
    const currentIndex = flowSequence.indexOf(currentStep);
    if (currentIndex < flowSequence.length - 1) {
      setCurrentStep(flowSequence[currentIndex + 1]);
      setUserInteractionCount(prev => prev + 1);
    } else {
      handleUpgrade();
    }
  };

  const handleUpgrade = () => {
    trackConversionAttempt();
    if (onUpgrade) {
      onUpgrade();
    }
  };

  const getUserSegment = () => {
    if (userInteractionCount === 0) return 'first-time';
    if (userInteractionCount >= 3) return 'high-intent';
    if (engagementLevel === 'high' || engagementLevel === 'urgent') return 'engaged';
    return 'returning';
  };

  // Render different components based on current step and engagement level
  const renderStepContent = () => {
    switch (currentStep) {
      case 'benefits':
        return (
          <FeatureEngagementTracker
            featureName="external-data-sources"
            trackHover={true}
            trackClicks={true}
          >
            <ExternalDataBenefitsShowcase
              variant={engagementLevel === 'low' ? 'compact' : 'interactive'}
              showMetrics={engagementLevel !== 'low'}
              className="mb-6"
            />
            {flowSequence.length > 1 && (
              <div className="text-center">
                <button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                >
                  See Success Stories →
                </button>
              </div>
            )}
          </FeatureEngagementTracker>
        );

      case 'social-proof':
        return (
          <div>
            <SuccessStoriesComponent
              variant={engagementLevel === 'urgent' ? 'featured' : 'carousel'}
              showMetrics={true}
              showBeforeAfter={engagementLevel === 'high' || engagementLevel === 'urgent'}
              className="mb-6"
            />
            <div className="text-center">
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-105"
              >
                {showSpecialOffers ? 'View Special Offers →' : 'Upgrade Now →'}
              </button>
            </div>
          </div>
        );

      case 'incentives':
        return (
          <div>
            <UpgradeIncentives
              featureContext="external-data-sources"
              userSegment={getUserSegment()}
              variant="card"
              showCountdown={engagementLevel === 'urgent'}
              onUpgrade={handleNext}
              onDismiss={onDismiss}
              className="mb-6"
            />
            {!isLastStep && (
              <div className="text-center">
                <button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-105"
                >
                  Complete Upgrade →
                </button>
              </div>
            )}
          </div>
        );

      case 'prompt':
        return (
          <ExternalDataUpgradePrompt
            featureContext={
              engagementLevel === 'urgent' ? 'conversion' :
              engagementLevel === 'high' ? 'preview' : 'discovery'
            }
            userInteractionCount={userInteractionCount + 1}
            onUpgrade={handleUpgrade}
            onClose={onDismiss}
            showCloseButton={engagementLevel !== 'urgent'}
          />
        );

      default:
        return null;
    }
  };

  // For low engagement users or discovery stage, show adaptive prompt instead of full flow
  if (engagementLevel === 'low' && stage === 'discovery') {
    return (
      <AdaptiveUpgradePrompt 
        featureName="external-data-sources"
        className={className}
      >
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Unlock External Data Sources
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Import data from GitHub, LinkedIn, and across the web to create a powerful professional profile.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => setCurrentStep('benefits')}
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Learn more about benefits →
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdaptiveUpgradePrompt>
    );
  }

  return (
    <div className={`${className}`}>
      {renderStepContent()}
      
      {/* Progress indicator for multi-step flows */}
      {flowSequence.length > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex gap-2">
            {flowSequence.map((step, index) => {
              const isCurrent = step === currentStep;
              const isCompleted = flowSequence.indexOf(currentStep) > index;
              
              return (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-blue-500 scale-125'
                      : isCompleted 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};