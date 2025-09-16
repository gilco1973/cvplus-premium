import React, { useState, useEffect, useMemo } from 'react';
import { useProgressiveRevelation } from './ProgressiveRevelationManager';
import { useConversionTracking } from '../../hooks/useConversionTracking';
import { usePremiumStatus } from '../../hooks/usePremiumStatus';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Gift, 
  Clock, 
  Users, 
  TrendingUp, 
  Star, 
  Zap,
  AlertTriangle,
  Crown
} from 'lucide-react';

interface IncentiveConfig {
  id: string;
  type: 'discount' | 'trial' | 'bonus' | 'scarcity' | 'social_proof';
  trigger: 'new_user' | 'high_engagement' | 'consideration' | 'abandonment' | 'returning_user';
  title: string;
  description: string;
  value: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  icon: React.ReactNode;
  color: string;
  expiry?: Date;
  conditions?: {
    minInteractions?: number;
    minSessions?: number;
    userTenure?: number; // days
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  };
}

interface DynamicIncentiveEngineProps {
  featureName: string;
  onIncentiveShown?: (incentive: IncentiveConfig) => void;
  onIncentiveClicked?: (incentive: IncentiveConfig) => void;
  className?: string;
}

// Predefined incentive configurations
const INCENTIVE_CONFIGS: IncentiveConfig[] = [
  {
    id: 'new_user_discount',
    type: 'discount',
    trigger: 'new_user',
    title: 'Welcome Offer: 50% Off Premium',
    description: 'New users get their first month at half price. Perfect time to try premium features!',
    value: '50% OFF',
    urgency: 'medium',
    icon: <Gift className="w-5 h-5" />,
    color: 'bg-green-500',
    conditions: {
      minSessions: 1,
      userTenure: 1
    }
  },
  {
    id: 'trial_offer',
    type: 'trial',
    trigger: 'high_engagement',
    title: '7-Day Free Premium Trial',
    description: 'Experience all premium features risk-free. No credit card required.',
    value: '7 DAYS FREE',
    urgency: 'low',
    icon: <Star className="w-5 h-5" />,
    color: 'bg-blue-500',
    conditions: {
      minInteractions: 3
    }
  },
  {
    id: 'limited_time',
    type: 'scarcity',
    trigger: 'consideration',
    title: 'Limited Time: Premium Beta Access',
    description: 'Only 100 spots left in our premium beta program. Join before it fills up!',
    value: 'EXCLUSIVE',
    urgency: 'high',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'bg-orange-500',
    expiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    conditions: {
      minInteractions: 5,
      minSessions: 3
    }
  },
  {
    id: 'social_proof',
    type: 'social_proof',
    trigger: 'consideration',
    title: 'Join 10,000+ Successful Professionals',
    description: 'Premium users get 3x more interview calls and land jobs 60% faster.',
    value: '10K+ USERS',
    urgency: 'medium',
    icon: <Users className="w-5 h-5" />,
    color: 'bg-purple-500',
    conditions: {
      minInteractions: 4,
      minSessions: 2
    }
  },
  {
    id: 'high_value',
    type: 'bonus',
    trigger: 'high_engagement',
    title: 'Unlock All Premium Features',
    description: 'Get external data sources, AI insights, and multimedia CV for just $9/month.',
    value: '$9/MONTH',
    urgency: 'medium',
    icon: <Crown className="w-5 h-5" />,
    color: 'bg-yellow-500',
    conditions: {
      minInteractions: 6
    }
  },
  {
    id: 'abandonment',
    type: 'discount',
    trigger: 'abandonment',
    title: 'Wait! 40% Off Before You Go',
    description: 'Don\'t miss out on premium features. Take 40% off your first month.',
    value: '40% OFF',
    urgency: 'critical',
    icon: <Zap className="w-5 h-5" />,
    color: 'bg-red-500',
    conditions: {
      minInteractions: 3
    }
  }
];

/**
 * Dynamic Incentive Engine Component
 * 
 * Provides personalized incentives based on user behavior, engagement level,
 * and contextual factors like time of day and user characteristics.
 */
export const DynamicIncentiveEngine: React.FC<DynamicIncentiveEngineProps> = ({
  featureName,
  onIncentiveShown,
  onIncentiveClicked,
  className = ''
}) => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { engagement, currentStage } = useProgressiveRevelation();
  const { trackEvent } = useConversionTracking();
  
  const [activeIncentive, setActiveIncentive] = useState<IncentiveConfig | null>(null);
  const [shownIncentives, setShownIncentives] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);
  
  // User characteristics for targeting
  const userProfile = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const userTenure = user ? Math.floor((Date.now() - new Date(user.metadata.creationTime).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      isNewUser: userTenure < 7,
      userTenure,
      timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
      totalSessions: engagement.totalSessions,
      featureInteractions: engagement.featureVisits[featureName] || 0,
      engagementStage: currentStage.stage
    };
  }, [user, engagement, featureName, currentStage]);
  
  // Select the best incentive based on current context
  const selectOptimalIncentive = useMemo(() => {
    if (isPremium) return null;
    
    // Filter incentives based on trigger and conditions
    const eligibleIncentives = INCENTIVE_CONFIGS.filter(incentive => {
      // Skip if already shown
      if (shownIncentives.has(incentive.id)) return false;
      
      // Check expiry
      if (incentive.expiry && new Date() > incentive.expiry) return false;
      
      // Check conditions
      const conditions = incentive.conditions;
      if (conditions) {
        if (conditions.minInteractions && userProfile.featureInteractions < conditions.minInteractions) return false;
        if (conditions.minSessions && userProfile.totalSessions < conditions.minSessions) return false;
        if (conditions.userTenure && userProfile.userTenure < conditions.userTenure) return false;
      }
      
      // Match trigger to user state
      switch (incentive.trigger) {
        case 'new_user':
          return userProfile.isNewUser && userProfile.totalSessions <= 3;
        case 'high_engagement':
          return userProfile.featureInteractions >= 3 && userProfile.engagementStage !== 'teaser';
        case 'consideration':
          return userProfile.engagementStage === 'conversion' || userProfile.featureInteractions >= 5;
        case 'returning_user':
          return !userProfile.isNewUser && userProfile.totalSessions >= 3;
        default:
          return true;
      }
    });
    
    // Sort by urgency and relevance
    const sortedIncentives = eligibleIncentives.sort((a, b) => {
      const urgencyWeight = { low: 1, medium: 2, high: 3, critical: 4 };
      return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    });
    
    return sortedIncentives[0] || null;
  }, [isPremium, shownIncentives, userProfile]);
  
  // Show incentive when conditions are met
  useEffect(() => {
    const incentive = selectOptimalIncentive;
    if (incentive && !activeIncentive) {
      setActiveIncentive(incentive);
      setShownIncentives(prev => new Set(prev).add(incentive.id));
      
      // Delay showing based on urgency
      const delay = {
        low: 5000,
        medium: 3000,
        high: 2000,
        critical: 1000
      }[incentive.urgency];
      
      const timer = setTimeout(() => {
        setIsVisible(true);
        onIncentiveShown?.(incentive);
        trackEvent('incentive_shown', featureName, {
          incentiveId: incentive.id,
          incentiveType: incentive.type,
          urgency: incentive.urgency,
          engagementStage: userProfile.engagementStage
        });
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [selectOptimalIncentive, activeIncentive, featureName, onIncentiveShown, trackEvent, userProfile]);
  
  // Handle incentive click
  const handleIncentiveClick = () => {
    if (!activeIncentive) return;
    
    onIncentiveClicked?.(activeIncentive);
    trackEvent('incentive_clicked', featureName, {
      incentiveId: activeIncentive.id,
      incentiveType: activeIncentive.type,
      urgency: activeIncentive.urgency
    });
    
    setIsVisible(false);
    
    // Navigate to upgrade (would use router in real app)
    if (process.env.NODE_ENV === 'development') {
      console.log('Navigate to upgrade with incentive:', activeIncentive);
    }
  };
  
  // Handle dismiss
  const handleDismiss = () => {
    if (!activeIncentive) return;
    
    trackEvent('incentive_dismissed', featureName, {
      incentiveId: activeIncentive.id,
      incentiveType: activeIncentive.type
    });
    
    setIsVisible(false);
    setActiveIncentive(null);
  };
  
  // Auto-hide after some time based on urgency
  useEffect(() => {
    if (!isVisible || !activeIncentive) return;
    
    const autoHideDelay = {
      low: 30000,    // 30 seconds
      medium: 45000,  // 45 seconds
      high: 60000,   // 1 minute
      critical: 90000 // 1.5 minutes
    }[activeIncentive.urgency];
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      trackEvent('incentive_auto_hidden', featureName, {
        incentiveId: activeIncentive.id,
        timeShown: autoHideDelay
      });
    }, autoHideDelay);
    
    return () => clearTimeout(timer);
  }, [isVisible, activeIncentive, featureName, trackEvent]);
  
  if (!isVisible || !activeIncentive || isPremium) {
    return null;
  }
  
  const urgencyStyles = {
    low: 'bg-blue-50 border-blue-200 text-blue-800',
    medium: 'bg-purple-50 border-purple-200 text-purple-800',
    high: 'bg-orange-50 border-orange-200 text-orange-800',
    critical: 'bg-red-50 border-red-200 text-red-800 animate-pulse'
  }[activeIncentive.urgency];
  
  const buttonStyles = {
    low: 'bg-blue-600 hover:bg-blue-700',
    medium: 'bg-purple-600 hover:bg-purple-700',
    high: 'bg-orange-600 hover:bg-orange-700',
    critical: 'bg-red-600 hover:bg-red-700'
  }[activeIncentive.urgency];
  
  return (
    <div className={`dynamic-incentive-container ${className}`}>
      <div className={`rounded-xl border-2 p-6 shadow-lg transition-all duration-300 ${urgencyStyles}`}>
        {/* Header with icon and value */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white ${activeIncentive.color}`}>
              {activeIncentive.icon}
            </div>
            <div>
              <h3 className="font-bold text-lg">{activeIncentive.title}</h3>
              {activeIncentive.expiry && (
                <div className="flex items-center gap-1 text-xs opacity-75">
                  <Clock className="w-3 h-3" />
                  <span>
                    Expires {activeIncentive.expiry.toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-white font-bold text-sm ${activeIncentive.color}`}>
            {activeIncentive.value}
          </div>
        </div>
        
        {/* Description */}
        <p className="mb-4 opacity-90">{activeIncentive.description}</p>
        
        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleIncentiveClick}
            className={`px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 flex items-center gap-2 ${buttonStyles}`}
          >
            <TrendingUp className="w-4 h-4" />
            {activeIncentive.type === 'trial' ? 'Start Free Trial' : 
             activeIncentive.type === 'discount' ? 'Claim Offer' :
             'Unlock Premium'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-all duration-200 text-sm"
          >
            Maybe Later
          </button>
        </div>
        
        {/* Progress indicator for high urgency */}
        {activeIncentive.urgency === 'critical' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs opacity-75 mb-1">
              <span>Limited time offer</span>
              <span>Act now!</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: '85%' }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Development debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
          <div><strong>Incentive:</strong> {activeIncentive.id}</div>
          <div><strong>Type:</strong> {activeIncentive.type}</div>
          <div><strong>Trigger:</strong> {activeIncentive.trigger}</div>
          <div><strong>User Tenure:</strong> {userProfile.userTenure} days</div>
          <div><strong>Interactions:</strong> {userProfile.featureInteractions}</div>
          <div><strong>Stage:</strong> {userProfile.engagementStage}</div>
        </div>
      )}
    </div>
  );
};

export default DynamicIncentiveEngine;
