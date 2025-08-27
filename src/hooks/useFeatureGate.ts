/**
 * CVPlus Premium Module - useFeatureGate Hook
 * 
 * React hook for feature access control and gating
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UseFeatureGateReturn,
  PremiumFeature,
  SubscriptionTier
} from '../types';

/**
 * Hook configuration
 */
interface UseFeatureGateConfig {
  userId?: string;
  feature: PremiumFeature;
  onAccessDenied?: () => void;
  onUpgradeRequired?: () => void;
  cacheTimeout?: number; // milliseconds
}

/**
 * React hook for feature gate management
 */
export const useFeatureGate = (config: UseFeatureGateConfig): UseFeatureGateReturn => {
  const {
    userId,
    feature,
    onAccessDenied,
    onUpgradeRequired,
    cacheTimeout = 30 * 1000 // 30 seconds
  } = config;

  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<number>(0);
  const [userTier, setUserTier] = useState<SubscriptionTier>('FREE');

  /**
   * Check feature access
   */
  const checkAccess = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!userId) {
      setError('User ID is required');
      setIsLoading(false);
      return;
    }

    // Check cache
    if (!forceRefresh && Date.now() - lastCheck < cacheTimeout) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - in real implementation, this would use FeatureService
      await new Promise(resolve => setTimeout(resolve, 300));

      // Mock access logic based on feature
      const mockTier: SubscriptionTier = 'FREE'; // Mock user is free tier
      const mockHasAccess = mockTier === 'PREMIUM';

      setUserTier(mockTier);
      setHasAccess(mockHasAccess);
      setLastCheck(Date.now());

      // Trigger callbacks
      if (!mockHasAccess) {
        if (onAccessDenied) {
          onAccessDenied();
        }
        if (mockTier === 'FREE' && onUpgradeRequired) {
          onUpgradeRequired();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check feature access';
      setError(errorMessage);
      setHasAccess(false); // Fail safe to false
      console.error('Feature gate error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, feature, cacheTimeout, lastCheck, onAccessDenied, onUpgradeRequired]);

  /**
   * Upgrade handler
   */
  const upgrade = useCallback(() => {
    // In real implementation, this would navigate to upgrade flow
    window.location.href = '/pricing';
  }, []);

  // Initial check
  useEffect(() => {
    if (userId) {
      checkAccess();
    }
  }, [userId, checkAccess]);

  // Re-check when feature changes
  useEffect(() => {
    if (userId) {
      checkAccess(true); // Force refresh when feature changes
    }
  }, [feature, userId, checkAccess]);

  return {
    hasAccess,
    isLoading,
    error,
    upgrade
  };
};

/**
 * Hook for multiple feature gates
 */
export const useMultipleFeatureGates = (
  userId?: string,
  features: PremiumFeature[] = []
) => {
  const [accessMap, setAccessMap] = useState<Record<PremiumFeature, boolean>>({} as any);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkAllFeatures = useCallback(async () => {
    if (!userId || features.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 400));

      // Mock access checking for all features
      const mockAccessMap: Record<PremiumFeature, boolean> = {} as any;
      features.forEach(feature => {
        mockAccessMap[feature] = false; // Mock: no access to any premium features
      });

      setAccessMap(mockAccessMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check feature access');
    } finally {
      setIsLoading(false);
    }
  }, [userId, features]);

  useEffect(() => {
    checkAllFeatures();
  }, [checkAllFeatures]);

  const hasFeature = useCallback((feature: PremiumFeature): boolean => {
    return accessMap[feature] === true;
  }, [accessMap]);

  const hasAnyFeature = useCallback((checkFeatures: PremiumFeature[]): boolean => {
    return checkFeatures.some(feature => accessMap[feature] === true);
  }, [accessMap]);

  const hasAllFeatures = useCallback((checkFeatures: PremiumFeature[]): boolean => {
    return checkFeatures.every(feature => accessMap[feature] === true);
  }, [accessMap]);

  const getEnabledFeatures = useCallback((): PremiumFeature[] => {
    return Object.entries(accessMap)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature as PremiumFeature);
  }, [accessMap]);

  const getDisabledFeatures = useCallback((): PremiumFeature[] => {
    return Object.entries(accessMap)
      .filter(([, enabled]) => !enabled)
      .map(([feature]) => feature as PremiumFeature);
  }, [accessMap]);

  return {
    accessMap,
    isLoading,
    error,
    hasFeature,
    hasAnyFeature,
    hasAllFeatures,
    getEnabledFeatures,
    getDisabledFeatures,
    refresh: checkAllFeatures
  };
};

/**
 * Hook for feature gate with automatic retry
 */
export const useFeatureGateWithRetry = (
  userId?: string,
  feature?: PremiumFeature,
  maxRetries = 3,
  retryDelay = 1000
) => {
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const baseConfig = {
    userId,
    feature: feature!,
    cacheTimeout: 10 * 1000 // 10 seconds for retry scenarios
  };

  const { hasAccess, isLoading, error, upgrade } = useFeatureGate(baseConfig);

  const retry = useCallback(async () => {
    if (retryCount >= maxRetries || !error) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    // Wait for retry delay
    await new Promise(resolve => setTimeout(resolve, retryDelay));

    // The useFeatureGate hook will automatically re-check
    setIsRetrying(false);
  }, [retryCount, maxRetries, error, retryDelay]);

  // Auto-retry on error
  useEffect(() => {
    if (error && retryCount < maxRetries && !isRetrying) {
      const timer = setTimeout(retry, retryDelay);
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, maxRetries, isRetrying, retry, retryDelay]);

  const canRetry = error && retryCount < maxRetries;
  const hasExceededRetries = retryCount >= maxRetries;

  return {
    hasAccess,
    isLoading: isLoading || isRetrying,
    error,
    upgrade,
    retry,
    canRetry,
    hasExceededRetries,
    retryCount
  };
};

/**
 * Hook for conditional feature rendering
 */
export const useConditionalFeature = <T>(
  userId?: string,
  feature?: PremiumFeature,
  premiumValue?: T,
  fallbackValue?: T
) => {
  const { hasAccess, isLoading } = useFeatureGate({
    userId,
    feature: feature!
  });

  const value = hasAccess ? premiumValue : fallbackValue;
  const shouldShowPremium = hasAccess && premiumValue !== undefined;
  const shouldShowFallback = !hasAccess && fallbackValue !== undefined;

  return {
    value,
    hasAccess,
    isLoading,
    shouldShowPremium,
    shouldShowFallback
  };
};

/**
 * Hook for feature gate analytics
 */
export const useFeatureGateAnalytics = (userId?: string) => {
  const [analytics, setAnalytics] = useState<{
    totalChecks: number;
    grantedChecks: number;
    deniedChecks: number;
    mostCheckedFeatures: Array<{ feature: PremiumFeature; count: number }>;
  }>({
    totalChecks: 0,
    grantedChecks: 0,
    deniedChecks: 0,
    mostCheckedFeatures: []
  });

  const trackFeatureCheck = useCallback((
    feature: PremiumFeature,
    granted: boolean
  ) => {
    setAnalytics(prev => ({
      ...prev,
      totalChecks: prev.totalChecks + 1,
      grantedChecks: granted ? prev.grantedChecks + 1 : prev.grantedChecks,
      deniedChecks: !granted ? prev.deniedChecks + 1 : prev.deniedChecks
    }));
  }, []);

  const getConversionOpportunities = useCallback(() => {
    const { deniedChecks, totalChecks } = analytics;
    const conversionRate = totalChecks > 0 ? (deniedChecks / totalChecks) * 100 : 0;
    
    return {
      conversionRate,
      totalOpportunities: deniedChecks,
      recommendations: deniedChecks > 5 ? ['Consider upgrading to Premium'] : []
    };
  }, [analytics]);

  return {
    analytics,
    trackFeatureCheck,
    getConversionOpportunities
  };
};

export default useFeatureGate;