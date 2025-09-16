/**
 * SmartIncentiveManager - Comprehensive upgrade incentivization system
 * 
 * This component provides personalized incentives based on user behavior, engagement patterns,
 * and contextual factors. It implements advanced behavioral psychology principles to maximize
 * conversion while maintaining excellent user experience.
 * 
 * Features:
 * - Progressive revelation based on engagement stages
 * - Industry-specific messaging
 * - Time-sensitive offers
 * - A/B testing support
 * - Advanced analytics integration
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProgressiveRevelation } from '../../hooks/useProgressiveRevelation';
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
  Crown,
  Target,
  Award,
  Briefcase,
  Code,
  Palette,
  Calculator,
  Globe
} from 'lucide-react';

interface IncentiveType {
  id: string;
  type: 'discount' | 'trial' | 'bundle' | 'scarcity' | 'social_proof' | 'free_trial';
  value: number; // Percentage for discounts, days for trials
  title: string;
  description: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  validUntil?: Date;
  conditions: {
    minEngagementScore: number;
    maxDismissalCount: number;
    requiredStage: string[];
    industry?: string[];
    timeOfDay?: ('morning' | 'afternoon' | 'evening')[];
    userTenure?: { min?: number; max?: number };
  };
}

interface UserContext {
  industry: string;
  cvQuality: 'basic' | 'good' | 'excellent';
  engagementPattern: 'casual' | 'explorer' | 'power_user';
  conversionReadiness: number; // 0-100 score
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  userTenure: number; // days since signup
  previousPremiumExperience: boolean;
}

interface SmartIncentiveManagerProps {
  featureName: string;
  onIncentiveShown?: (incentive: IncentiveType) => void;
  onIncentiveClicked?: (incentive: IncentiveType) => void;
  onIncentiveDismissed?: (incentive: IncentiveType) => void;
  className?: string;
  enableABTesting?: boolean;
  variant?: 'default' | 'compact' | 'modal' | 'floating';
}

// Industry-specific messaging and targeting
const INDUSTRY_CONFIGS = {
  technology: {
    icon: <Code className="w-5 h-5" />,
    color: 'bg-blue-600',
    messaging: {
      curiosity: 'Advanced technical profiles get 40% more responses',
      value: 'Import GitHub repos, showcase your coding impact',
      social: 'Join 5,000+ developers who landed FAANG jobs',
      urgency: 'Limited beta access for technical professionals'
    }
  },
  business: {
    icon: <Briefcase className="w-5 h-5" />,
    color: 'bg-purple-600',
    messaging: {
      curiosity: 'Executive profiles stand out with premium features',
      value: 'LinkedIn sync + performance metrics = 3x more calls',
      social: 'Trusted by Fortune 500 executives',
      urgency: 'Executive beta program closing soon'
    }
  },
  creative: {
    icon: <Palette className="w-5 h-5" />,
    color: 'bg-pink-600',
    messaging: {
      curiosity: 'Showcase your creative portfolio like never before',
      value: 'Multimedia galleries + video intros for creatives',
      social: 'Top creative agencies prefer premium profiles',
      urgency: 'Creative studio partnership expires Friday'
    }
  },
  finance: {
    icon: <Calculator className="w-5 h-5" />,
    color: 'bg-green-600',
    messaging: {
      curiosity: 'Quantify your financial impact with premium analytics',
      value: 'ROI tracking + achievement metrics for finance pros',
      social: 'Investment bankers get 50% more opportunities',
      urgency: 'Financial services discount ends tomorrow'
    }
  },
  marketing: {
    icon: <Globe className="w-5 h-5" />,
    color: 'bg-orange-600',
    messaging: {
      curiosity: 'Marketing ROI stories that convert recruiters',
      value: 'Campaign results + social proof integration',
      social: 'Marketing VPs love our premium features',
      urgency: 'MarTech conference special ends Monday'
    }
  }
};

// Advanced incentive configurations
const SMART_INCENTIVES: IncentiveType[] = [
  {
    id: 'first_time_30',
    type: 'discount',
    value: 30,
    title: 'Welcome to Premium: 30% Off',
    description: 'New users get their first month at 30% off. Perfect time to try premium features!',
    urgencyLevel: 'low',
    conditions: {
      minEngagementScore: 10,
      maxDismissalCount: 0,
      requiredStage: ['discovery', 'interest'],
      userTenure: { max: 7 }
    }
  },
  {
    id: 'high_engagement_trial',
    type: 'free_trial',
    value: 7,
    title: '7-Day Free Premium Trial',
    description: 'You\'ve shown great interest! Try all premium features free for 7 days.',
    urgencyLevel: 'medium',
    conditions: {
      minEngagementScore: 40,
      maxDismissalCount: 2,
      requiredStage: ['interest', 'consideration']
    }
  },
  {
    id: 'feature_bundle_deal',
    type: 'bundle',
    value: 40,
    title: 'External Data + AI Bundle',
    description: 'Get External Data Sources + AI Insights together for 40% off regular price.',
    urgencyLevel: 'medium',
    conditions: {
      minEngagementScore: 30,
      maxDismissalCount: 3,
      requiredStage: ['consideration']
    }
  },
  {
    id: 'scarcity_limited_spots',
    type: 'scarcity',
    value: 50,
    title: 'Only 50 Premium Spots Left',
    description: 'Limited beta access closing soon. Join before we reach capacity!',
    urgencyLevel: 'high',
    validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    conditions: {
      minEngagementScore: 60,
      maxDismissalCount: 4,
      requiredStage: ['consideration', 'conversion']
    }
  },
  {
    id: 'industry_social_proof',
    type: 'social_proof',
    value: 0,
    title: 'Join Industry Leaders',
    description: 'Professionals in your field get 3x more interviews with premium features.',
    urgencyLevel: 'medium',
    conditions: {
      minEngagementScore: 35,
      maxDismissalCount: 2,
      requiredStage: ['interest', 'consideration']
    }
  },
  {
    id: 'abandonment_rescue',
    type: 'discount',
    value: 50,
    title: 'Wait! 50% Off Before You Go',
    description: 'Don\'t miss out on premium features. Take 50% off your first month.',
    urgencyLevel: 'critical',
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    conditions: {
      minEngagementScore: 70,
      maxDismissalCount: 5,
      requiredStage: ['conversion']
    }
  },
  {
    id: 'time_sensitive_flash',
    type: 'discount',
    value: 45,
    title: 'Flash Sale: 45% Off Premium',
    description: 'Next 6 hours only! Biggest discount we\'ve ever offered.',
    urgencyLevel: 'critical',
    validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
    conditions: {
      minEngagementScore: 50,
      maxDismissalCount: 3,
      requiredStage: ['consideration', 'conversion'],
      timeOfDay: ['afternoon', 'evening']
    }
  }
];

/**
 * SmartIncentiveManager Component
 * 
 * Provides intelligent incentive selection and display based on comprehensive
 * user behavior analysis and contextual factors.
 */
export const SmartIncentiveManager: React.FC<SmartIncentiveManagerProps> = ({
  featureName,
  onIncentiveShown,
  onIncentiveClicked,
  onIncentiveDismissed,
  className = '',
  enableABTesting = true,
  variant = 'default'
}) => {
  const { user } = useAuth();
  const { isPremium } = usePremiumStatus();
  const { 
    engagementLevel, 
    behaviorData, 
    shouldShowUpgradePrompt,
    trackInteraction,
    trackDismissal
  } = useProgressiveRevelation(featureName);
  const { 
    trackEvent,
    trackABTest,
    getFeatureConversionRate
  } = useConversionTracking();
  
  const [activeIncentive, setActiveIncentive] = useState<IncentiveType | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedIncentives, setDismissedIncentives] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem(`dismissed_incentives_${featureName}`) || '[]'))
  );
  const [abTestVariant, setAbTestVariant] = useState<string>('A');
  
  // Analyze user context for personalization
  const userContext = useMemo((): UserContext => {
    const now = new Date();
    const hour = now.getHours();
    const userCreationTime = user?.metadata?.creationTime ? new Date(user.metadata.creationTime) : new Date();
    const userTenure = Math.floor((Date.now() - userCreationTime.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine industry based on user data or feature usage patterns
    const industry = determineUserIndustry(behaviorData) || 'business';
    
    // Calculate engagement pattern
    const totalInteractions = Object.values(behaviorData.featureInteractions).reduce((sum, count) => sum + count, 0);
    const engagementPattern = totalInteractions > 20 ? 'power_user' : 
                            totalInteractions > 8 ? 'explorer' : 'casual';
    
    // Calculate conversion readiness score
    const conversionReadiness = Math.min(100, engagementLevel.score + 
      (behaviorData.conversionEvents.length * 10) -
      (behaviorData.dismissalCount * 5)
    );
    
    return {
      industry,
      cvQuality: determineCVQuality(behaviorData),
      engagementPattern,
      conversionReadiness,
      timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
      userTenure,
      previousPremiumExperience: behaviorData.conversionEvents.some(event => event.includes('premium'))
    };
  }, [user, behaviorData, engagementLevel]);
  
  // A/B Testing variant selection
  useEffect(() => {
    if (enableABTesting) {
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      setAbTestVariant(variant);
    }
  }, [enableABTesting]);
  
  // Select optimal incentive based on user context and engagement
  const optimalIncentive = useMemo(() => {
    if (isPremium || !shouldShowUpgradePrompt) return null;
    
    const eligibleIncentives = SMART_INCENTIVES.filter(incentive => {
      // Skip if dismissed
      if (dismissedIncentives.has(incentive.id)) return false;
      
      // Check expiry
      if (incentive.validUntil && new Date() > incentive.validUntil) return false;
      
      // Check conditions
      const conditions = incentive.conditions;
      if (userContext.conversionReadiness < conditions.minEngagementScore) return false;
      if (behaviorData.dismissalCount > conditions.maxDismissalCount) return false;
      if (!conditions.requiredStage.includes(engagementLevel.level)) return false;
      
      // Check industry match
      if (conditions.industry && !conditions.industry.includes(userContext.industry)) return false;
      
      // Check time of day
      if (conditions.timeOfDay && !conditions.timeOfDay.includes(userContext.timeOfDay)) return false;
      
      // Check user tenure
      if (conditions.userTenure) {
        if (conditions.userTenure.min && userContext.userTenure < conditions.userTenure.min) return false;
        if (conditions.userTenure.max && userContext.userTenure > conditions.userTenure.max) return false;
      }
      
      return true;
    });
    
    // Sort by urgency and personalization score
    const scored = eligibleIncentives.map(incentive => ({
      incentive,
      score: calculateIncentiveScore(incentive, userContext, engagementLevel)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.incentive || null;
  }, [isPremium, shouldShowUpgradePrompt, dismissedIncentives, userContext, engagementLevel, behaviorData]);
  
  // Show incentive when conditions are met
  useEffect(() => {
    if (optimalIncentive && !activeIncentive) {
      setActiveIncentive(optimalIncentive);
      
      // Progressive delay based on urgency
      const delay = {
        low: 8000,
        medium: 5000,
        high: 3000,
        critical: 1500
      }[optimalIncentive.urgencyLevel];
      
      const timer = setTimeout(() => {
        setIsVisible(true);
        
        // Track incentive shown
        onIncentiveShown?.(optimalIncentive);
        trackEvent('smart_incentive_shown', featureName, {
          incentiveId: optimalIncentive.id,
          incentiveType: optimalIncentive.type,
          urgencyLevel: optimalIncentive.urgencyLevel,
          userIndustry: userContext.industry,
          engagementStage: engagementLevel.level,
          conversionReadiness: userContext.conversionReadiness,
          abTestVariant
        });
        
        if (enableABTesting) {
          trackABTest('smart_incentive_display', abTestVariant, featureName, 'view');
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [optimalIncentive, activeIncentive, featureName, onIncentiveShown, trackEvent, userContext, engagementLevel, abTestVariant, enableABTesting, trackABTest]);
  
  // Handle incentive interaction
  const handleIncentiveClick = useCallback(() => {
    if (!activeIncentive) return;
    
    trackInteraction('incentive_click');
    onIncentiveClicked?.(activeIncentive);
    
    trackEvent('smart_incentive_clicked', featureName, {
      incentiveId: activeIncentive.id,
      incentiveType: activeIncentive.type,
      urgencyLevel: activeIncentive.urgencyLevel,
      userIndustry: userContext.industry,
      conversionReadiness: userContext.conversionReadiness
    });
    
    if (enableABTesting) {
      trackABTest('smart_incentive_interaction', abTestVariant, featureName, 'click');
    }
    
    setIsVisible(false);
    
    // Navigate to upgrade flow with context
    const upgradeUrl = generateUpgradeUrl(activeIncentive, userContext);
    if (process.env.NODE_ENV === 'development') {
      console.log('Navigate to upgrade:', upgradeUrl);
    }
  }, [activeIncentive, featureName, trackInteraction, onIncentiveClicked, trackEvent, userContext, enableABTesting, abTestVariant, trackABTest]);
  
  // Handle incentive dismissal
  const handleIncentiveDismiss = useCallback(() => {
    if (!activeIncentive) return;
    
    const newDismissed = new Set(dismissedIncentives).add(activeIncentive.id);
    setDismissedIncentives(newDismissed);
    localStorage.setItem(`dismissed_incentives_${featureName}`, JSON.stringify(Array.from(newDismissed)));
    
    trackDismissal();
    onIncentiveDismissed?.(activeIncentive);
    
    trackEvent('smart_incentive_dismissed', featureName, {
      incentiveId: activeIncentive.id,
      incentiveType: activeIncentive.type,
      dismissalCount: behaviorData.dismissalCount + 1
    });
    
    setIsVisible(false);
    setActiveIncentive(null);
  }, [activeIncentive, dismissedIncentives, featureName, trackDismissal, onIncentiveDismissed, trackEvent, behaviorData]);
  
  // Auto-hide based on urgency and engagement
  useEffect(() => {
    if (!isVisible || !activeIncentive) return;
    
    const autoHideDelay = {
      low: 45000,    // 45 seconds
      medium: 60000,  // 1 minute
      high: 90000,   // 1.5 minutes
      critical: 120000 // 2 minutes
    }[activeIncentive.urgencyLevel];
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      trackEvent('smart_incentive_auto_hidden', featureName, {
        incentiveId: activeIncentive.id,
        timeVisible: autoHideDelay
      });
    }, autoHideDelay);
    
    return () => clearTimeout(timer);
  }, [isVisible, activeIncentive, featureName, trackEvent]);
  
  if (!isVisible || !activeIncentive || isPremium) {
    return null;
  }
  
  return (
    <IncentiveDisplay
      incentive={activeIncentive}
      userContext={userContext}
      variant={variant}
      abTestVariant={abTestVariant}
      className={className}
      onClick={handleIncentiveClick}
      onDismiss={handleIncentiveDismiss}
    />
  );
};

// Helper component for rendering incentive display
interface IncentiveDisplayProps {
  incentive: IncentiveType;
  userContext: UserContext;
  variant: 'default' | 'compact' | 'modal' | 'floating';
  abTestVariant: string;
  className: string;
  onClick: () => void;
  onDismiss: () => void;
}

const IncentiveDisplay: React.FC<IncentiveDisplayProps> = ({
  incentive,
  userContext,
  variant,
  abTestVariant,
  className,
  onClick,
  onDismiss
}) => {
  const industryConfig = INDUSTRY_CONFIGS[userContext.industry] || INDUSTRY_CONFIGS.business;
  const personalizedTitle = personalizeMessage(incentive.title, userContext);
  const personalizedDescription = personalizeMessage(incentive.description, userContext);
  
  const urgencyStyles = {
    low: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
    medium: 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 text-purple-900',
    high: 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-900',
    critical: 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-900 animate-pulse'
  }[incentive.urgencyLevel];
  
  const buttonStyles = {
    low: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
    medium: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700',
    high: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700',
    critical: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700'
  }[incentive.urgencyLevel];
  
  const variantClasses = {
    default: 'rounded-xl border-2 p-6 shadow-lg',
    compact: 'rounded-lg border p-4 shadow-md',
    modal: 'rounded-2xl border-2 p-8 shadow-2xl max-w-md mx-auto',
    floating: 'fixed bottom-4 right-4 rounded-xl border-2 p-6 shadow-2xl max-w-sm z-50'
  }[variant];
  
  return (
    <div className={`smart-incentive-display ${variantClasses} ${urgencyStyles} ${className}`}>
      {/* Header with industry-specific icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl text-white ${industryConfig.color}`}>
            {industryConfig.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight">{personalizedTitle}</h3>
            {incentive.validUntil && (
              <div className="flex items-center gap-1 text-sm opacity-75 mt-1">
                <Clock className="w-3 h-3" />
                <span>Expires {incentive.validUntil.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Value badge */}
        <div className={`px-4 py-2 rounded-full text-white font-bold text-sm ${industryConfig.color}`}>
          {formatIncentiveValue(incentive)}
        </div>
      </div>
      
      {/* Description */}
      <p className="mb-6 opacity-90 leading-relaxed">{personalizedDescription}</p>
      
      {/* Social proof or urgency indicators */}
      {incentive.type === 'social_proof' && (
        <div className="mb-4 flex items-center gap-2 text-sm opacity-75">
          <Users className="w-4 h-4" />
          <span>Join {getIndustryStats(userContext.industry)} professionals</span>
        </div>
      )}
      
      {incentive.urgencyLevel === 'critical' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm opacity-75 mb-2">
            <span>Limited time offer</span>
            <span>Act fast!</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-2">
            <div 
              className="bg-current h-2 rounded-full transition-all duration-1000"
              style={{ width: `${85 - (Math.random() * 10)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClick}
          className={`px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${buttonStyles}`}
        >
          {getIncentiveIcon(incentive)}
          {getActionText(incentive, abTestVariant)}
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 rounded-lg text-current opacity-60 hover:opacity-80 hover:bg-white/20 transition-all duration-200 text-sm"
        >
          Maybe Later
        </button>
      </div>
      
      {/* A/B Test indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono opacity-75">
          <div><strong>Incentive:</strong> {incentive.id}</div>
          <div><strong>A/B Variant:</strong> {abTestVariant}</div>
          <div><strong>Industry:</strong> {userContext.industry}</div>
          <div><strong>Conversion Score:</strong> {userContext.conversionReadiness}</div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function determineUserIndustry(behaviorData: any): string {
  // Analyze user behavior patterns to determine industry
  // This is a simplified version - in production, use more sophisticated analysis
  const interactions = Object.keys(behaviorData.featureInteractions || {});
  
  if (interactions.some(feature => feature.includes('github') || feature.includes('code'))) {
    return 'technology';
  }
  if (interactions.some(feature => feature.includes('portfolio') || feature.includes('creative'))) {
    return 'creative';
  }
  if (interactions.some(feature => feature.includes('finance') || feature.includes('analytics'))) {
    return 'finance';
  }
  if (interactions.some(feature => feature.includes('marketing') || feature.includes('social'))) {
    return 'marketing';
  }
  
  return 'business'; // Default
}

function determineCVQuality(behaviorData: any): 'basic' | 'good' | 'excellent' {
  const totalInteractions = Object.values(behaviorData.featureInteractions || {}).reduce((sum: number, count) => sum + (count as number), 0);
  const timeSpent = Object.values(behaviorData.timeSpent || {}).reduce((sum: number, time) => sum + (time as number), 0);
  
  if (totalInteractions > 15 && timeSpent > 600000) return 'excellent';
  if (totalInteractions > 8 && timeSpent > 300000) return 'good';
  return 'basic';
}

function calculateIncentiveScore(incentive: IncentiveType, userContext: UserContext, engagementLevel: any): number {
  let score = 0;
  
  // Base score from urgency
  score += { low: 10, medium: 20, high: 30, critical: 40 }[incentive.urgencyLevel];
  
  // Bonus for industry match
  if (incentive.conditions.industry?.includes(userContext.industry)) {
    score += 15;
  }
  
  // Bonus for engagement stage match
  if (incentive.conditions.requiredStage.includes(engagementLevel.level)) {
    score += 10;
  }
  
  // Bonus for conversion readiness
  if (userContext.conversionReadiness > 70) {
    score += 20;
  }
  
  // Bonus for user pattern match
  if (userContext.engagementPattern === 'power_user' && incentive.urgencyLevel === 'high') {
    score += 10;
  }
  
  return score;
}

function personalizeMessage(message: string, userContext: UserContext): string {
  const industryConfig = INDUSTRY_CONFIGS[userContext.industry] || INDUSTRY_CONFIGS.business;
  
  return message
    .replace(/professionals?/gi, `${userContext.industry} professionals`)
    .replace(/users?/gi, `${userContext.industry} experts`)
    .replace(/features?/gi, `${userContext.industry}-focused features`);
}

function formatIncentiveValue(incentive: IncentiveType): string {
  switch (incentive.type) {
    case 'discount':
      return `${incentive.value}% OFF`;
    case 'free_trial':
      return `${incentive.value} DAYS FREE`;
    case 'bundle':
      return `${incentive.value}% OFF BUNDLE`;
    case 'scarcity':
      return 'LIMITED';
    case 'social_proof':
      return 'JOIN NOW';
    default:
      return 'PREMIUM';
  }
}

function getIncentiveIcon(incentive: IncentiveType): React.ReactNode {
  switch (incentive.type) {
    case 'discount':
      return <Gift className="w-4 h-4" />;
    case 'free_trial':
      return <Star className="w-4 h-4" />;
    case 'bundle':
      return <Award className="w-4 h-4" />;
    case 'scarcity':
      return <AlertTriangle className="w-4 h-4" />;
    case 'social_proof':
      return <Users className="w-4 h-4" />;
    default:
      return <Crown className="w-4 h-4" />;
  }
}

function getActionText(incentive: IncentiveType, variant: string): string {
  const baseTexts = {
    discount: 'Claim Discount',
    free_trial: 'Start Free Trial',
    bundle: 'Get Bundle Deal',
    scarcity: 'Secure Spot Now',
    social_proof: 'Join Premium'
  };
  
  const variantTexts = {
    discount: 'Unlock with Discount',
    free_trial: 'Try Premium Free',
    bundle: 'Get Complete Package',
    scarcity: 'Claim Your Spot',
    social_proof: 'Join the Elite'
  };
  
  const texts = variant === 'B' ? variantTexts : baseTexts;
  return texts[incentive.type] || 'Upgrade Now';
}

function getIndustryStats(industry: string): string {
  const stats = {
    technology: '25,000+',
    business: '50,000+',
    creative: '15,000+',
    finance: '30,000+',
    marketing: '20,000+'
  };
  
  return stats[industry] || '40,000+';
}

function generateUpgradeUrl(incentive: IncentiveType, userContext: UserContext): string {
  const baseUrl = '/upgrade';
  const params = new URLSearchParams({
    incentive: incentive.id,
    type: incentive.type,
    value: incentive.value.toString(),
    industry: userContext.industry,
    source: 'smart_incentive'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

export default SmartIncentiveManager;