/**
 * UpgradeIncentives - Time-sensitive offers and incentives for premium upgrades
 * 
 * This component creates compelling upgrade incentives including limited-time offers,
 * discounts, and personalized recommendations to maximize conversion rates.
 */

import React, { useState, useEffect } from 'react';
import {
  Crown,
  Clock,
  Gift,
  Zap,
  Target,
  TrendingUp,
  Users,
  Star,
  Shield,
  CheckCircle,
  Sparkles,
  Timer,
  Percent,
  Award,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { designSystem } from '../../config/designSystem';
import { useProgressiveRevelation } from './ProgressiveRevelationManager';

interface UpgradeIncentive {
  id: string;
  type: 'discount' | 'trial' | 'bonus' | 'urgency' | 'social-proof';
  title: string;
  description: string;
  value: string;
  validUntil?: Date;
  conditions?: string;
  highlight: boolean;
  intensity: 'low' | 'medium' | 'high' | 'urgent';
}

interface UpgradeIncentivesProps {
  featureContext?: string;
  userSegment?: 'first-time' | 'returning' | 'engaged' | 'high-intent';
  className?: string;
  variant?: 'banner' | 'card' | 'modal' | 'sidebar';
  showCountdown?: boolean;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export const UpgradeIncentives: React.FC<UpgradeIncentivesProps> = ({
  featureContext = 'external-data-sources',
  userSegment = 'returning',
  className = '',
  variant = 'card',
  showCountdown = true,
  onUpgrade,
  onDismiss
}) => {
  const navigate = useNavigate();
  const { currentStage, trackConversionAttempt } = useProgressiveRevelation();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Generate dynamic incentives based on user segment and engagement
  const generateIncentives = (): UpgradeIncentive[] => {
    const baseIncentives: UpgradeIncentive[] = [];

    // First-time user incentives
    if (userSegment === 'first-time') {
      baseIncentives.push({
        id: 'first-month-free',
        type: 'trial',
        title: 'First Month FREE',
        description: 'Try all premium features risk-free for 30 days',
        value: 'FREE',
        highlight: true,
        intensity: 'high'
      });
    }

    // High engagement user incentives
    if (userSegment === 'engaged' || currentStage.intensity === 'high') {
      baseIncentives.push({
        id: 'early-adopter-discount',
        type: 'discount',
        title: '50% Early Adopter Discount',
        description: 'Limited spots available for beta users',
        value: '50% OFF',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        conditions: 'Only 47 spots remaining',
        highlight: true,
        intensity: 'urgent'
      });
    }

    // High intent users
    if (userSegment === 'high-intent' || currentStage.intensity === 'urgent') {
      baseIncentives.push({
        id: 'upgrade-now-bonus',
        type: 'bonus',
        title: 'Upgrade Now + Get Bonus Features',
        description: 'AI Career Coach & Resume Review included FREE',
        value: '+$97 VALUE',
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        highlight: true,
        intensity: 'urgent'
      });
    }

    // Social proof for all segments
    baseIncentives.push({
      id: 'social-proof',
      type: 'social-proof',
      title: 'Join 15,000+ Professionals',
      description: '87% land interviews within 2 weeks of upgrading',
      value: '87% SUCCESS',
      highlight: false,
      intensity: currentStage.intensity
    });

    // Money-back guarantee
    baseIncentives.push({
      id: 'guarantee',
      type: 'bonus',
      title: '30-Day Money-Back Guarantee',
      description: 'Not satisfied? Get a full refund, no questions asked',
      value: 'GUARANTEED',
      highlight: false,
      intensity: 'low'
    });

    return baseIncentives;
  };

  const incentives = generateIncentives();
  const primaryIncentive = incentives.find(i => i.highlight) || incentives[0];

  // Countdown timer for time-sensitive offers
  useEffect(() => {
    if (!showCountdown || !primaryIncentive.validUntil) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = primaryIncentive.validUntil!.getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeRemaining('Expired');
        clearInterval(interval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [primaryIncentive.validUntil, showCountdown]);

  const handleUpgrade = () => {
    trackConversionAttempt();
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/pricing', { 
        state: { 
          incentive: primaryIncentive.id,
          feature: featureContext,
          source: 'upgrade-incentives'
        }
      });
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'banner':
        return 'w-full rounded-lg p-4';
      case 'modal':
        return 'max-w-md mx-auto rounded-2xl p-8 shadow-2xl';
      case 'sidebar':
        return 'w-80 rounded-xl p-6';
      case 'card':
      default:
        return 'max-w-2xl rounded-2xl p-8 shadow-lg';
    }
  };

  const getIntensityStyles = () => {
    switch (primaryIncentive.intensity) {
      case 'urgent':
        return 'bg-gradient-to-br from-red-50 to-orange-50 border-2 border-orange-300';
      case 'high':
        return 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300';
      case 'medium':
        return 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300';
      case 'low':
      default:
        return 'bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300';
    }
  };

  if (variant === 'banner') {
    return (
      <div className={`relative overflow-hidden ${getIntensityStyles()} ${getVariantStyles()} ${className}`}>
        {/* Premium Badge */}
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            <Crown className="w-3 h-3" />
            PREMIUM
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              primaryIncentive.type === 'discount' ? 'bg-green-500' :
              primaryIncentive.type === 'trial' ? 'bg-blue-500' :
              primaryIncentive.type === 'bonus' ? 'bg-purple-500' : 'bg-gray-500'
            }`}>
              {primaryIncentive.type === 'discount' && <Percent className="w-5 h-5 text-white" />}
              {primaryIncentive.type === 'trial' && <Gift className="w-5 h-5 text-white" />}
              {primaryIncentive.type === 'bonus' && <Star className="w-5 h-5 text-white" />}
              {primaryIncentive.type === 'urgency' && <Clock className="w-5 h-5 text-white" />}
              {primaryIncentive.type === 'social-proof' && <Users className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">
                {primaryIncentive.title}
              </h3>
              <p className="text-xs text-gray-600">
                {primaryIncentive.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showCountdown && timeRemaining && primaryIncentive.validUntil && (
              <div className="text-center">
                <div className="text-xs font-bold text-red-600">
                  {timeRemaining}
                </div>
                <div className="text-xs text-gray-500">remaining</div>
              </div>
            )}
            <button
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${getIntensityStyles()} ${getVariantStyles()} ${className}`}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-200/20 to-orange-200/20 rounded-full -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200/20 to-purple-200/20 rounded-full -ml-12 -mb-12"></div>

      {/* Premium Badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
          <Crown className="w-3 h-3" />
          PREMIUM OFFER
        </div>
      </div>

      {/* Close Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 left-4 z-10 p-1 rounded-full bg-white/80 hover:bg-white transition-colors duration-200 text-gray-600"
        >
          ×
        </button>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
              primaryIncentive.type === 'discount' ? 'bg-gradient-to-br from-green-500 to-green-600' :
              primaryIncentive.type === 'trial' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
              primaryIncentive.type === 'bonus' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 
              'bg-gradient-to-br from-gray-500 to-gray-600'
            }`}>
              {primaryIncentive.type === 'discount' && <Percent className="w-8 h-8 text-white" />}
              {primaryIncentive.type === 'trial' && <Gift className="w-8 h-8 text-white" />}
              {primaryIncentive.type === 'bonus' && <Sparkles className="w-8 h-8 text-white" />}
              {primaryIncentive.type === 'urgency' && <Clock className="w-8 h-8 text-white" />}
              {primaryIncentive.type === 'social-proof' && <Users className="w-8 h-8 text-white" />}
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {primaryIncentive.title}
          </h2>
          
          <p className="text-lg text-gray-700 mb-4">
            {primaryIncentive.description}
          </p>

          {/* Value highlight */}
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm px-6 py-3 rounded-full border border-white/50 shadow-sm">
            <Award className="w-5 h-5 text-yellow-600" />
            <span className="text-xl font-bold text-gray-900">
              {primaryIncentive.value}
            </span>
          </div>
        </div>

        {/* Countdown Timer */}
        {showCountdown && timeRemaining && primaryIncentive.validUntil && (
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/50 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Timer className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">LIMITED TIME OFFER</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {timeRemaining}
            </div>
            <div className="text-sm text-gray-600">
              {primaryIncentive.conditions || 'Hurry, offer expires soon!'}
            </div>
          </div>
        )}

        {/* Additional Incentives */}
        <div className="grid gap-4 mb-8">
          {incentives.filter(i => !i.highlight).map((incentive) => (
            <div 
              key={incentive.id}
              className="flex items-center gap-4 bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/50"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {incentive.title}
                </h3>
                <p className="text-sm text-gray-700">
                  {incentive.description}
                </p>
              </div>
              <div className="text-sm font-bold text-green-600">
                {incentive.value}
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="space-y-4">
          <button
            onClick={handleUpgrade}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-white text-lg
              transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              focus:outline-none focus:ring-4 focus:ring-blue-500/50
              ${primaryIncentive.intensity === 'urgent'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg'
                : primaryIncentive.intensity === 'high'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5" />
              {primaryIncentive.intensity === 'urgent' 
                ? 'Claim This Offer Now'
                : primaryIncentive.type === 'trial'
                ? 'Start Free Trial'
                : 'Upgrade to Premium'
              }
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>

          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              30-day guarantee
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Join 15K+ users
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Instant activation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};