/**
 * CVPlus Premium Module - useSubscription Hook
 * 
 * React hook for managing subscription state and operations
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UseSubscriptionReturn,
  UserSubscriptionData,
  PremiumFeature,
  SubscriptionStatus
} from '../types';

/**
 * Hook configuration
 */
interface UseSubscriptionConfig {
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  cacheTimeout?: number; // milliseconds
}

/**
 * React hook for subscription management
 */
export const useSubscription = (config: UseSubscriptionConfig = {}): UseSubscriptionReturn => {
  const {
    userId,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    cacheTimeout = 30 * 1000 // 30 seconds
  } = config;

  const [subscription, setSubscription] = useState<UserSubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  /**
   * Fetch subscription data
   */
  const fetchSubscription = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!userId) {
      setError('User ID is required');
      setIsLoading(false);
      return;
    }

    // Check cache
    if (!forceRefresh && Date.now() - lastFetch < cacheTimeout && subscription) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - in real implementation, this would use SubscriptionService
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock subscription data
      const mockSubscription: UserSubscriptionData = {
        userId,
        email: 'user@example.com',
        googleId: 'mock-google-id',
        subscriptionStatus: 'free' as SubscriptionStatus,
        lifetimeAccess: false,
        features: {
          webPortal: false,
          aiChat: false,
          podcast: false,
          advancedAnalytics: false,
          videoIntroduction: false,
          roleDetection: false,
          externalData: false
        },
        metadata: {
          createdBy: 'system',
          creationType: 'default'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setSubscription(mockSubscription);
      setLastFetch(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription';
      setError(errorMessage);
      console.error('Subscription fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, cacheTimeout, subscription, lastFetch]);

  /**
   * Check if user has access to a specific feature
   */
  const hasFeature = useCallback((feature: PremiumFeature): boolean => {
    if (!subscription) return false;
    return subscription.features[feature] === true;
  }, [subscription]);

  /**
   * Check if user has access to any of the specified features
   */
  const hasAnyFeature = useCallback((features: PremiumFeature[]): boolean => {
    if (!subscription) return false;
    return features.some(feature => subscription.features[feature] === true);
  }, [subscription]);

  /**
   * Refresh subscription data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchSubscription(true);
  }, [fetchSubscription]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchSubscription();
    }
  }, [userId, fetchSubscription]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !userId || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchSubscription();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, userId, refreshInterval, fetchSubscription]);

  // Focus refresh (refresh when window gains focus)
  useEffect(() => {
    if (!userId) return;

    const handleFocus = () => {
      // Only refresh if data is stale
      if (Date.now() - lastFetch > cacheTimeout) {
        fetchSubscription();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userId, lastFetch, cacheTimeout, fetchSubscription]);

  return {
    subscription,
    isLoading,
    error,
    hasFeature,
    hasAnyFeature,
    refresh
  };
};

/**
 * Hook for subscription status only (lightweight)
 */
export const useSubscriptionStatus = (userId?: string) => {
  const { subscription, isLoading, error } = useSubscription({ userId });
  
  return {
    status: subscription?.subscriptionStatus || 'free',
    isLifetime: subscription?.lifetimeAccess || false,
    isPremium: subscription?.lifetimeAccess || false,
    isLoading,
    error
  };
};

/**
 * Hook for feature access checking
 */
export const useFeatureAccess = (userId?: string) => {
  const { subscription, hasFeature, hasAnyFeature, isLoading } = useSubscription({ userId });
  
  const checkFeature = useCallback((feature: PremiumFeature): boolean => {
    return hasFeature(feature);
  }, [hasFeature]);

  const checkFeatures = useCallback((features: PremiumFeature[]): Record<PremiumFeature, boolean> => {
    const result = {} as Record<PremiumFeature, boolean>;
    features.forEach(feature => {
      result[feature] = hasFeature(feature);
    });
    return result;
  }, [hasFeature]);

  const getEnabledFeatures = useCallback((): PremiumFeature[] => {
    if (!subscription) return [];
    
    return Object.entries(subscription.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature as PremiumFeature);
  }, [subscription]);

  return {
    checkFeature,
    checkFeatures,
    hasAnyFeature,
    getEnabledFeatures,
    isLoading
  };
};

/**
 * Hook for subscription metadata and analytics
 */
export const useSubscriptionMetrics = (userId?: string) => {
  const { subscription, isLoading } = useSubscription({ userId });
  
  const metrics = {
    subscriptionAge: subscription ? 
      Math.floor((Date.now() - new Date(subscription.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    
    lastUpdated: subscription?.updatedAt ? new Date(subscription.updatedAt) : null,
    
    activeFeatures: subscription ? 
      Object.values(subscription.features).filter(Boolean).length : 0,
    
    totalFeatures: subscription ? Object.keys(subscription.features).length : 0,
    
    featureUtilization: subscription ? 
      (Object.values(subscription.features).filter(Boolean).length / Object.keys(subscription.features).length) * 100 : 0
  };

  return {
    metrics,
    subscription,
    isLoading
  };
};

export default useSubscription;