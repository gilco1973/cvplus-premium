import React, { useState, useEffect, useMemo } from 'react';
import { useProgressiveRevelation } from './ProgressiveRevelationManager';
import { useConversionTracking } from '../../hooks/useConversionTracking';
import { usePremiumStatus } from '../../hooks/usePremiumStatus';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Sparkles, 
  TrendingUp, 
  Users,
  BarChart3,
  GitBranch,
  Award,
  Zap,
  Crown,
  ArrowRight
} from 'lucide-react';

interface FeatureTease {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'data' | 'analysis' | 'presentation' | 'insights';
  value: string;
  previewText?: string;
  stats?: {
    userBenefit: string;
    competitiveAdvantage: string;
  };
}

interface SmartFeatureTeaseProps {
  featureName: string;
  variant?: 'ghost' | 'preview' | 'comparison' | 'benefit';
  showPreview?: boolean;
  onTeaseInteraction?: (featureId: string, interactionType: string) => void;
  className?: string;
}

// Feature definitions with teasers
const FEATURE_TEASES: Record<string, FeatureTease[]> = {
  externalDataSources: [
    {
      id: 'github_integration',
      title: 'GitHub Integration',
      description: 'Import repositories, contributions, and technical achievements',
      icon: <GitBranch className="w-5 h-5" />,
      category: 'data',
      value: '25+ Projects',
      previewText: 'Your GitHub shows 23 additional projects and 156 contributions that could strengthen your CV',
      stats: {
        userBenefit: '40% more technical achievements',
        competitiveAdvantage: 'Stand out from 78% of candidates'
      }
    },
    {
      id: 'linkedin_sync',
      title: 'LinkedIn Synchronization',
      description: 'Sync professional achievements and endorsements',
      icon: <Users className="w-5 h-5" />,
      category: 'data',
      value: '12 Endorsements',
      previewText: 'LinkedIn analysis reveals 12 skill endorsements and 8 professional achievements missing from your CV',
      stats: {
        userBenefit: '60% more professional credibility',
        competitiveAdvantage: 'Higher trust score than 85% of profiles'
      }
    },
    {
      id: 'certification_scanner',
      title: 'Certification Scanner',
      description: 'Automatically detect and verify certifications',
      icon: <Award className="w-5 h-5" />,
      category: 'data',
      value: '5 Certificates',
      previewText: 'Found 5 verified certifications that could add significant value to your professional profile',
      stats: {
        userBenefit: '35% higher qualification rating',
        competitiveAdvantage: 'Beat 90% of candidates in skill verification'
      }
    }
  ],
  advancedAnalytics: [
    {
      id: 'ats_optimization',
      title: 'ATS Score Optimization',
      description: 'Real-time ATS compatibility scoring and suggestions',
      icon: <BarChart3 className="w-5 h-5" />,
      category: 'analysis',
      value: '89% ATS Score',
      previewText: 'Your CV could achieve 89% ATS compatibility with 12 strategic improvements',
      stats: {
        userBenefit: '3x more likely to pass ATS screening',
        competitiveAdvantage: 'Higher ATS score than 95% of applicants'
      }
    },
    {
      id: 'market_insights',
      title: 'Market Intelligence',
      description: 'Industry trends and salary insights for your role',
      icon: <TrendingUp className="w-5 h-5" />,
      category: 'insights',
      value: '+$15K Potential',
      previewText: 'Market analysis suggests you could earn $15,000 more with optimized positioning',
      stats: {
        userBenefit: 'Salary insights for better negotiation',
        competitiveAdvantage: 'Know your market value vs 100K+ professionals'
      }
    }
  ],
  aiInsights: [
    {
      id: 'personality_analysis',
      title: 'AI Personality Insights',
      description: 'Discover your professional personality and communication style',
      icon: <Sparkles className="w-5 h-5" />,
      category: 'insights',
      value: 'Leadership Profile',
      previewText: 'AI analysis reveals strong leadership indicators and collaborative communication style',
      stats: {
        userBenefit: 'Better role-fit matching',
        competitiveAdvantage: 'Personality insights 87% accuracy rate'
      }
    }
  ]
};

/**
 * Smart Feature Tease Component
 * 
 * Intelligently shows users what premium features could offer them
 * without being intrusive, using different revelation strategies.
 */
export const SmartFeatureTease: React.FC<SmartFeatureTeaseProps> = ({
  featureName,
  variant = 'ghost',
  showPreview = false,
  onTeaseInteraction,
  className = ''
}) => {
  const { isPremium } = usePremiumStatus();
  const { engagement, currentStage } = useProgressiveRevelation();
  const { trackFeatureUsage } = useConversionTracking();
  
  const [visibleTease, setVisibleTease] = useState<FeatureTease | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  
  // Get relevant teases for the feature
  const relevantTeases = useMemo(() => {
    return FEATURE_TEASES[featureName] || [];
  }, [featureName]);
  
  // Select the most relevant tease based on user engagement
  const selectedTease = useMemo(() => {
    if (!relevantTeases.length || isPremium) return null;
    
    const userInteractions = engagement.featureVisits[featureName] || 0;
    const engagementLevel = currentStage.intensity;
    
    // Show different teases based on engagement
    if (engagementLevel === 'urgent' && userInteractions >= 5) {
      // High engagement - show most compelling tease
      return relevantTeases.find(t => t.stats?.competitiveAdvantage.includes('90%')) || relevantTeases[0];
    } else if (engagementLevel === 'high' && userInteractions >= 3) {
      // Medium-high engagement - show value-focused tease
      return relevantTeases.find(t => t.category === 'analysis') || relevantTeases[0];
    } else if (userInteractions >= 1) {
      // Some engagement - show data-focused tease
      return relevantTeases.find(t => t.category === 'data') || relevantTeases[0];
    }
    
    return null;
  }, [relevantTeases, isPremium, engagement, featureName, currentStage]);
  
  // Update visible tease when selection changes
  useEffect(() => {
    if (selectedTease && !visibleTease) {
      setVisibleTease(selectedTease);
      trackFeatureUsage(featureName, 'tease_shown', {
        teaseId: selectedTease.id,
        variant,
        engagementLevel: currentStage.intensity
      });
    }
  }, [selectedTease, visibleTease, featureName, variant, currentStage, trackFeatureUsage]);
  
  // Handle tease interaction
  const handleTeaseInteraction = (interactionType: string) => {
    if (!visibleTease) return;
    
    setInteractionCount(prev => prev + 1);
    
    onTeaseInteraction?.(visibleTease.id, interactionType);
    trackFeatureUsage(featureName, `tease_${interactionType}`, {
      teaseId: visibleTease.id,
      variant,
      interactionCount: interactionCount + 1
    });
    
    if (interactionType === 'expand') {
      setIsPreviewExpanded(true);
    }
  };
  
  if (!visibleTease || isPremium) {
    return null;
  }
  
  // Render different variants
  const renderGhostVariant = () => (
    <div 
      className={`relative opacity-50 hover:opacity-75 transition-all duration-300 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer ${className}`}
      onClick={() => handleTeaseInteraction('click')}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg" />
      <div className="relative flex items-center gap-3">
        <div className="p-2 bg-gray-200 rounded-lg">
          <Lock className="w-4 h-4 text-gray-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-700">{visibleTease.title}</h4>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Premium
            </span>
          </div>
          <p className="text-sm text-gray-600">{visibleTease.description}</p>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-700">{visibleTease.value}</div>
          <div className="text-xs text-gray-500">Available</div>
        </div>
      </div>
    </div>
  );
  
  const renderPreviewVariant = () => (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white">
          {visibleTease.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-800">{visibleTease.title}</h4>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Preview</span>
          </div>
          
          {!isPreviewExpanded ? (
            <div>
              <p className="text-sm text-gray-700 mb-3">{visibleTease.description}</p>
              <button
                onClick={() => handleTeaseInteraction('expand')}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                <Eye className="w-4 h-4" />
                See what you're missing
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 italic">"<em>{visibleTease.previewText}</em>"</p>
              
              {visibleTease.stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Your Benefit</div>
                    <div className="text-sm font-semibold text-green-700">
                      {visibleTease.stats.userBenefit}
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Competitive Edge</div>
                    <div className="text-sm font-semibold text-blue-700">
                      {visibleTease.stats.competitiveAdvantage}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleTeaseInteraction('upgrade')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Unlock This Feature
                </button>
                <button
                  onClick={() => setIsPreviewExpanded(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Collapse preview"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  const renderComparisonVariant = () => (
    <div className={`bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-orange-500 rounded-lg text-white">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-800">You're Missing Out</h4>
          <p className="text-sm text-orange-700">Premium users get significantly better results</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400">Basic</div>
          <div className="text-sm text-gray-600">Limited insights</div>
          <div className="text-xs text-gray-500 mt-1">What you have now</div>
        </div>
        <div className="text-center border-l-2 border-orange-200 pl-4">
          <div className="text-2xl font-bold text-orange-600">{visibleTease.value}</div>
          <div className="text-sm text-orange-700">{visibleTease.title}</div>
          <div className="text-xs text-orange-600 mt-1">With Premium</div>
        </div>
      </div>
      
      <button
        onClick={() => handleTeaseInteraction('compare')}
        className="w-full mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
      >
        See Full Comparison
      </button>
    </div>
  );
  
  const renderBenefitVariant = () => (
    <div className={`bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-500 rounded-lg text-white">
          {visibleTease.icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-2">{visibleTease.title}</h4>
          <p className="text-sm text-gray-700 mb-3">{visibleTease.previewText}</p>
          
          {visibleTease.stats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-700">
                <Sparkles className="w-4 h-4" />
                <span>{visibleTease.stats.userBenefit}</span>
              </div>
              <div className="text-gray-500">•</div>
              <div className="text-emerald-700">
                {visibleTease.stats.competitiveAdvantage}
              </div>
            </div>
          )}
          
          <button
            onClick={() => handleTeaseInteraction('benefit')}
            className="mt-3 text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-1"
          >
            Learn how this helps you
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
  
  // Render based on variant
  const renderTease = () => {
    switch (variant) {
      case 'ghost':
        return renderGhostVariant();
      case 'preview':
        return renderPreviewVariant();
      case 'comparison':
        return renderComparisonVariant();
      case 'benefit':
        return renderBenefitVariant();
      default:
        return renderGhostVariant();
    }
  };
  
  return (
    <div className="smart-feature-tease">
      {renderTease()}
      
      {/* Development debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
          <div><strong>Tease:</strong> {visibleTease.id}</div>
          <div><strong>Variant:</strong> {variant}</div>
          <div><strong>Category:</strong> {visibleTease.category}</div>
          <div><strong>Interactions:</strong> {interactionCount}</div>
          <div><strong>Engagement:</strong> {currentStage.intensity}</div>
        </div>
      )}
    </div>
  );
};

export default SmartFeatureTease;
