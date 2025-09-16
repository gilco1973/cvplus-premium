/**
 * ProgressiveRevelationManager - Strategic feature revelation based on user engagement
 * 
 * This component manages the progressive disclosure of premium features,
 * adapting the upgrade messaging intensity based on user behavior and interaction patterns.
 */

import React, { useState, useEffect, useContext, createContext } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { usePremiumStatus } from '../../hooks/usePremiumStatus';

interface UserEngagement {
  featureVisits: Record<string, number>;
  totalSessions: number;
  timeSpent: Record<string, number>;
  lastVisit: string;
  conversionAttempts: number;
  dismissedPrompts: string[];
}

interface RevelationStage {
  stage: 'teaser' | 'preview' | 'conversion' | 'retention';
  intensity: 'low' | 'medium' | 'high' | 'urgent';
  messaging: 'curiosity' | 'value' | 'social-proof' | 'urgency';
  showSpecialOffers: boolean;
  prominenceLevel: number;
}

interface ProgressiveRevelationContextType {
  engagement: UserEngagement;
  currentStage: RevelationStage;
  updateEngagement: (feature: string, action: string, metadata?: any) => void;
  getRevelationConfig: (feature: string) => RevelationStage;
  shouldShowUpgradePrompt: (feature: string) => boolean;
  getPromptIntensity: (feature: string) => 'low' | 'medium' | 'high' | 'urgent';
  trackConversionAttempt: () => void;
  dismissPrompt: (promptId: string) => void;
}

const ProgressiveRevelationContext = createContext<ProgressiveRevelationContextType | null>(null);

export const useProgressiveRevelation = () => {
  const context = useContext(ProgressiveRevelationContext);
  if (!context) {
    throw new Error('useProgressiveRevelation must be used within ProgressiveRevelationProvider');
  }
  return context;
};

interface ProgressiveRevelationProviderProps {
  children: React.ReactNode;
}

export const ProgressiveRevelationProvider: React.FC<ProgressiveRevelationProviderProps> = ({ children }) => {
  const { isPremium } = usePremiumStatus();
  const [engagement, setEngagement] = useLocalStorage<UserEngagement>('user-engagement', {
    featureVisits: {},
    totalSessions: 0,
    timeSpent: {},
    lastVisit: new Date().toISOString(),
    conversionAttempts: 0,
    dismissedPrompts: []
  });

  const [sessionStart] = useState(Date.now());

  // Update session count on mount
  useEffect(() => {
    setEngagement(prev => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
      lastVisit: new Date().toISOString()
    }));
  }, [setEngagement]);

  // Track time spent on session end
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeSpent = Date.now() - sessionStart;
      setEngagement(prev => ({
        ...prev,
        timeSpent: {
          ...prev.timeSpent,
          total: (prev.timeSpent.total || 0) + timeSpent
        }
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionStart, setEngagement]);

  const updateEngagement = (feature: string, action: string, metadata?: any) => {
    if (isPremium) return; // Don't track premium users

    setEngagement(prev => {
      const updated = { ...prev };
      
      // Track feature visits
      if (action === 'visit') {
        updated.featureVisits[feature] = (updated.featureVisits[feature] || 0) + 1;
      }
      
      // Track time spent per feature
      if (action === 'time-spent' && metadata?.duration) {
        updated.timeSpent[feature] = (updated.timeSpent[feature] || 0) + metadata.duration;
      }
      
      return updated;
    });
  };

  const getRevelationStage = (feature: string): RevelationStage => {
    const visits = engagement.featureVisits[feature] || 0;
    const timeSpent = engagement.timeSpent[feature] || 0;
    const totalSessions = engagement.totalSessions;
    const conversionAttempts = engagement.conversionAttempts;

    // High engagement, multiple conversion attempts
    if (visits >= 5 || conversionAttempts >= 3 || (visits >= 3 && timeSpent > 300000)) {
      return {
        stage: 'conversion',
        intensity: 'urgent',
        messaging: 'urgency',
        showSpecialOffers: true,
        prominenceLevel: 5
      };
    }
    
    // Medium engagement, shown interest
    if (visits >= 3 || (visits >= 2 && timeSpent > 120000) || totalSessions >= 5) {
      return {
        stage: 'conversion',
        intensity: 'high',
        messaging: 'social-proof',
        showSpecialOffers: true,
        prominenceLevel: 4
      };
    }
    
    // Some engagement, needs value demonstration
    if (visits >= 2 || timeSpent > 60000 || totalSessions >= 3) {
      return {
        stage: 'preview',
        intensity: 'medium',
        messaging: 'value',
        showSpecialOffers: false,
        prominenceLevel: 3
      };
    }
    
    // First or second visit, build curiosity
    return {
      stage: 'teaser',
      intensity: 'low',
      messaging: 'curiosity',
      showSpecialOffers: false,
      prominenceLevel: 2
    };
  };

  const getRevelationConfig = (feature: string): RevelationStage => {
    return getRevelationStage(feature);
  };

  const shouldShowUpgradePrompt = (feature: string): boolean => {
    if (isPremium) return false;
    
    const promptId = `${feature}-upgrade-prompt`;
    if (engagement.dismissedPrompts.includes(promptId)) {
      // Show again after 24 hours
      const lastDismissal = localStorage.getItem(`dismiss-${promptId}`);
      if (lastDismissal) {
        const timeSinceDismisal = Date.now() - parseInt(lastDismissal);
        return timeSinceDismisal > 24 * 60 * 60 * 1000; // 24 hours
      }
    }
    
    const stage = getRevelationStage(feature);
    const visits = engagement.featureVisits[feature] || 0;
    
    // Always show for preview and conversion stages
    if (stage.stage === 'preview' || stage.stage === 'conversion') {
      return true;
    }
    
    // Show teaser after first visit
    if (stage.stage === 'teaser' && visits >= 1) {
      return true;
    }
    
    return false;
  };

  const getPromptIntensity = (feature: string): 'low' | 'medium' | 'high' | 'urgent' => {
    return getRevelationStage(feature).intensity;
  };

  const trackConversionAttempt = () => {
    setEngagement(prev => ({
      ...prev,
      conversionAttempts: prev.conversionAttempts + 1
    }));
  };

  const dismissPrompt = (promptId: string) => {
    setEngagement(prev => ({
      ...prev,
      dismissedPrompts: [...prev.dismissedPrompts.filter(id => id !== promptId), promptId]
    }));
    
    // Store dismissal timestamp
    localStorage.setItem(`dismiss-${promptId}`, Date.now().toString());
  };

  const currentStage = getRevelationStage('external-data-sources'); // Default feature

  const contextValue: ProgressiveRevelationContextType = {
    engagement,
    currentStage,
    updateEngagement,
    getRevelationConfig,
    shouldShowUpgradePrompt,
    getPromptIntensity,
    trackConversionAttempt,
    dismissPrompt
  };

  return (
    <ProgressiveRevelationContext.Provider value={contextValue}>
      {children}
    </ProgressiveRevelationContext.Provider>
  );
};

// Hook for feature-specific tracking
export const useFeatureTracking = (featureName: string) => {
  const { updateEngagement, getRevelationConfig, shouldShowUpgradePrompt, getPromptIntensity } = useProgressiveRevelation();
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Track feature visit
    updateEngagement(featureName, 'visit');

    // Track time spent when component unmounts
    return () => {
      const timeSpent = Date.now() - startTime;
      if (timeSpent > 5000) { // Only track if spent more than 5 seconds
        updateEngagement(featureName, 'time-spent', { duration: timeSpent });
      }
    };
  }, [featureName, updateEngagement, startTime]);

  return {
    revelationConfig: getRevelationConfig(featureName),
    shouldShowPrompt: shouldShowUpgradePrompt(featureName),
    promptIntensity: getPromptIntensity(featureName)
  };
};

// Component for tracking engagement on specific features
interface FeatureEngagementTrackerProps {
  featureName: string;
  children: React.ReactNode;
  trackHover?: boolean;
  trackClicks?: boolean;
}

export const FeatureEngagementTracker: React.FC<FeatureEngagementTrackerProps> = ({
  featureName,
  children,
  trackHover = false,
  trackClicks = true
}) => {
  const { updateEngagement } = useProgressiveRevelation();
  const [hoverStartTime, setHoverStartTime] = useState<number | null>(null);

  const handleMouseEnter = () => {
    if (trackHover) {
      setHoverStartTime(Date.now());
    }
  };

  const handleMouseLeave = () => {
    if (trackHover && hoverStartTime) {
      const hoverDuration = Date.now() - hoverStartTime;
      if (hoverDuration > 1000) { // Only track hovers longer than 1 second
        updateEngagement(featureName, 'hover', { duration: hoverDuration });
      }
      setHoverStartTime(null);
    }
  };

  const handleClick = () => {
    if (trackClicks) {
      updateEngagement(featureName, 'click');
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

// Enhanced upgrade prompt that adapts to revelation stage
interface AdaptiveUpgradePromptProps {
  featureName: string;
  children?: React.ReactNode;
  className?: string;
}

export const AdaptiveUpgradePrompt: React.FC<AdaptiveUpgradePromptProps> = ({
  featureName,
  children,
  className = ''
}) => {
  const { 
    shouldShowUpgradePrompt, 
    getRevelationConfig, 
    trackConversionAttempt,
    dismissPrompt 
  } = useProgressiveRevelation();

  if (!shouldShowUpgradePrompt(featureName)) {
    return null;
  }

  const config = getRevelationConfig(featureName);
  const promptId = `${featureName}-upgrade-prompt`;

  const handleUpgradeClick = () => {
    trackConversionAttempt();
  };

  const handleDismiss = () => {
    dismissPrompt(promptId);
  };

  // Render different components based on stage and intensity
  if (config.stage === 'teaser') {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-blue-800">
              <strong>Premium Feature:</strong> Unlock advanced capabilities with {featureName}.
            </p>
          </div>
          <button
            onClick={handleUpgradeClick}
            className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Learn More
          </button>
          <button
            onClick={handleDismiss}
            className="ml-2 text-blue-400 hover:text-blue-600"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // For preview and conversion stages, render the appropriate upgrade component
  return children || null;
};