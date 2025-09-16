import React, { useCallback, useEffect } from 'react';
import { Crown, Lock, Sparkles, Loader2 } from 'lucide-react';
import { PremiumUpgradePrompt } from '../common/PremiumUpgradePrompt';
import { designSystem } from '../../config/designSystem';
import type { PremiumGateProps } from './PremiumGateCore';

/**
 * Loading state component
 */
export const LoadingState: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <div className="flex items-center gap-3 text-neutral-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Checking premium status...</span>
    </div>
  </div>
);

/**
 * Preview overlay component
 */
export const PreviewOverlay: React.FC<{
  title: string;
  description: string;
  opacity: number;
  onUpgradeClick: () => void;
  onAccessDenied?: () => void;
}> = ({ title, description, opacity, onUpgradeClick, onAccessDenied }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAccessDenied?.();
  }, [onAccessDenied]);

  return (
    <div 
      className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900/90 backdrop-blur-sm rounded-xl cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      aria-label="Premium feature locked - click to upgrade"
    >
      <div className="text-center max-w-sm mx-auto px-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-yellow-900" />
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          Premium Feature
        </h3>
        
        <p className="text-neutral-300 text-sm mb-4 leading-relaxed">
          {description}
        </p>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpgradeClick();
          }}
          className={`${
            designSystem.components.button.base
          } bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 ${
            designSystem.components.button.sizes.md
          } flex items-center gap-2 mx-auto transform hover:scale-105 transition-all duration-200`}
        >
          <Sparkles className="w-4 h-4" />
          Upgrade Now
        </button>
      </div>
    </div>
  );
};

/**
 * Default upgrade prompt component
 */
export const DefaultUpgradePrompt: React.FC<{
  feature: string;
  title: string;
  description: string;
  onAnalyticsEvent?: PremiumGateProps['onAnalyticsEvent'];
}> = ({ feature, title, description, onAnalyticsEvent }) => {
  useEffect(() => {
    onAnalyticsEvent?.('upgrade_prompt_shown', { feature, title });
  }, [feature, title, onAnalyticsEvent]);

  return (
    <div className={`${designSystem.components.card.base} ${designSystem.components.card.variants.default} p-8`}>
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
          <Crown className="w-10 h-10 text-yellow-900" />
        </div>
        
        <h2 className="text-2xl font-bold text-neutral-100 mb-3 flex items-center justify-center gap-3">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          {title}
        </h2>
        
        <p className="text-neutral-300 mb-6 leading-relaxed">
          {description}
        </p>
        
        <div className="space-y-4">
          <PremiumUpgradePrompt
            feature={feature}
            variant="card"
            className="border-0 bg-transparent p-0"
            showCloseButton={false}
          />
          
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
            <Lock className="w-3 h-3" />
            <span>This feature requires a premium subscription</span>
          </div>
        </div>
      </div>
    </div>
  );
};