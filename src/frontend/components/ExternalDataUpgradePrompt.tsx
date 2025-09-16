/**
 * ExternalDataUpgradePrompt - Compelling upgrade prompt specifically for External Data Sources
 * 
 * This component creates a persuasive upgrade experience for users discovering the 
 * External Data Sources feature. It emphasizes transformation value and competitive advantage.
 */

import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Github, 
  Linkedin, 
  Globe, 
  Database, 
  Sparkles, 
  TrendingUp, 
  Shield,
  Clock,
  Users,
  X,
  ChevronRight,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { designSystem } from '../../config/designSystem';
import { usePremiumStatus } from '../../hooks/usePremiumStatus';

interface ExternalDataUpgradePromptProps {
  featureContext?: 'discovery' | 'preview' | 'conversion';
  userInteractionCount?: number;
  onClose?: () => void;
  onUpgrade?: () => void;
  className?: string;
  showCloseButton?: boolean;
}

export const ExternalDataUpgradePrompt: React.FC<ExternalDataUpgradePromptProps> = ({
  featureContext = 'preview',
  userInteractionCount = 1,
  onClose,
  onUpgrade,
  className = '',
  showCloseButton = true
}) => {
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(true);
  }, []);

  if (isPremium) return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/pricing', { 
        state: { 
          feature: 'external-data-sources',
          source: featureContext 
        }
      });
    }
  };

  const getIntensityLevel = () => {
    if (userInteractionCount >= 3) return 'high';
    if (userInteractionCount >= 2) return 'medium';
    return 'low';
  };

  const intensityLevel = getIntensityLevel();

  const dataSourceBenefits = [
    {
      icon: Github,
      title: 'GitHub Integration',
      description: 'Import repositories, contributions, and project highlights',
      impact: '+40% technical credibility'
    },
    {
      icon: Linkedin,
      title: 'LinkedIn Enhancement',
      description: 'Sync achievements, endorsements, and professional updates',
      impact: '+60% profile completeness'
    },
    {
      icon: Globe,
      title: 'Web Presence Scan',
      description: 'Find certifications, mentions, and portfolio projects',
      impact: '+35% discoverability'
    },
    {
      icon: Database,
      title: 'Smart Data Fusion',
      description: 'Intelligent merging of all external sources',
      impact: '+50% ATS optimization'
    }
  ];

  const successMetrics = [
    { value: '87%', label: 'More interview invites' },
    { value: '3.2x', label: 'Faster job matches' },
    { value: '64%', label: 'Higher salary offers' }
  ];

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border-2 border-transparent
      ${intensityLevel === 'high' 
        ? 'bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-orange-300 shadow-2xl' 
        : intensityLevel === 'medium'
        ? 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-purple-300 shadow-xl'
        : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 shadow-lg'
      }
      transform transition-all duration-700 ease-out
      ${isAnimated ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      ${className}
    `}>
      
      {/* Premium Badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
          <Crown className="w-3 h-3" />
          PREMIUM
        </div>
      </div>

      {/* Close Button */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 p-1 rounded-full bg-white/80 hover:bg-white transition-colors duration-200"
          aria-label="Close upgrade prompt"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      )}

      <div className="p-8 pt-12">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Crown className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {intensityLevel === 'high' 
              ? 'Transform Your Career Today!' 
              : 'Unlock Your Professional Potential'
            }
          </h2>
          
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            {intensityLevel === 'high'
              ? 'Join thousands of professionals who landed their dream jobs with External Data Sources. Limited-time offer!'
              : 'External Data Sources automatically enriches your CV with data from GitHub, LinkedIn, and across the web.'
            }
          </p>

          {/* Success Metrics */}
          <div className="flex justify-center gap-8 mb-8">
            {successMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-600">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {dataSourceBenefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    {benefit.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    {benefit.impact}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <div className="text-sm font-medium text-gray-900">
              4.9/5 from 2,847+ professionals
            </div>
          </div>
          <blockquote className="text-gray-700 italic">
            "External Data Sources helped me land 3x more interviews. My CV went from basic to brilliant overnight!"
          </blockquote>
          <div className="text-sm text-gray-600 mt-2">
            — Sarah M., Software Engineer at Google
          </div>
        </div>

        {/* Urgency/Scarcity (for high intensity) */}
        {intensityLevel === 'high' && (
          <div className="bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2 text-orange-800 mb-2">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">Limited Time Offer</span>
            </div>
            <p className="text-sm text-orange-700">
              Get your first month FREE when you upgrade today. Only 47 spots remaining!
            </p>
          </div>
        )}

        {/* Call to Action */}
        <div className="space-y-4">
          <button
            onClick={handleUpgrade}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-white text-lg
              transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              focus:outline-none focus:ring-4 focus:ring-blue-500/50
              ${intensityLevel === 'high'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5" />
              {intensityLevel === 'high' 
                ? 'Claim Your FREE Month Now'
                : 'Upgrade to Premium'
              }
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              30-day money-back guarantee
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Join 15K+ professionals
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};