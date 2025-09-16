/**
 * Premium Service
 * 
 * Manages premium subscriptions, feature access, and usage tracking.
 */

import type { 
  PremiumStatus, 
  PremiumSubscription, 
  PremiumTier,
  SubscriptionStatus,
  AuthConfig,
  PremiumFeatures,
  UsageMetrics
} from '../types';
import { createAuthError } from '../utils/errors';
import { logger } from '../utils/logger';
import { PREMIUM_PLANS, TIER_LIMITS } from '../constants/premium.constants';
import { STORAGE_KEYS } from '../constants/auth.constants';

export class PremiumService {
  private config: AuthConfig;
  private statusCache: Map<string, { status: PremiumStatus; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Loads premium status for a user
   */
  async loadPremiumStatus(userId: string): Promise<PremiumStatus> {
    try {
      // Check cache first
      const cached = this.statusCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        logger.debug('Using cached premium status', { userId });
        return cached.status;
      }

      // Load from persistent storage
      const persistentStatus = this.loadFromStorage(userId);
      if (persistentStatus) {
        this.statusCache.set(userId, { status: persistentStatus, timestamp: Date.now() });
        return persistentStatus;
      }

      // Try to load from Firestore
      const firestoreStatus = await this.loadFromFirestore(userId);
      if (firestoreStatus) {
        this.statusCache.set(userId, { status: firestoreStatus, timestamp: Date.now() });
        this.saveToStorage(userId, firestoreStatus); // Cache locally
        return firestoreStatus;
      }

      // Default to free tier
      const defaultStatus = this.createDefaultPremiumStatus();
      this.statusCache.set(userId, { status: defaultStatus, timestamp: Date.now() });
      
      logger.info('Loaded default premium status for user', { userId, tier: defaultStatus.tier });
      return defaultStatus;

    } catch (error) {
      logger.error('Failed to load premium status:', error);
      return this.createDefaultPremiumStatus();
    }
  }

  /**
   * Refreshes premium status from the backend
   */
  async refreshPremiumStatus(userId: string): Promise<PremiumStatus> {
    try {
      // Clear cache
      this.statusCache.delete(userId);
      
      // In a real implementation, this would call the backend API
      // For now, we'll simulate loading from storage or return default
      const status = await this.loadPremiumStatus(userId);
      
      logger.info('Premium status refreshed', { userId, tier: status.tier });
      return status;

    } catch (error) {
      logger.error('Failed to refresh premium status:', error);
      throw createAuthError('premium/refresh-failed', 'Failed to refresh premium status');
    }
  }

  /**
   * Checks if a user has access to a specific feature
   */
  hasFeatureAccess(status: PremiumStatus, feature: keyof PremiumStatus['features']): boolean {
    const featureValue = status.features[feature];
    
    // Handle FeatureAccess type (has enabled property)
    if (featureValue && typeof featureValue === 'object' && 'enabled' in featureValue) {
      return featureValue.enabled || false;
    }
    
    // Handle FeatureLimit type (doesn't have enabled, but we can check if usage is available)
    if (featureValue && typeof featureValue === 'object' && 'current' in featureValue && 'maximum' in featureValue) {
      return featureValue.current < featureValue.maximum;
    }
    
    return false;
  }

  /**
   * Checks if a user has reached their usage limit for a feature
   */
  hasReachedUsageLimit(status: PremiumStatus, feature: string): boolean {
    const limits = TIER_LIMITS[status.tier];
    if (!limits) return false;

    switch (feature) {
      case 'cv_creation':
        return limits.cvs !== -1 && status.usage.metrics.cvGenerated >= limits.cvs;
      case 'storage':
        return status.usage.metrics.storageUsed >= limits.storage;
      case 'api_calls':
        return status.usage.metrics.apiCalls >= limits.apiCalls;
      default:
        return false;
    }
  }

  /**
   * Records feature usage
   */
  async recordFeatureUsage(userId: string, feature: string, amount = 1): Promise<void> {
    try {
      const status = this.statusCache.get(userId)?.status;
      if (!status) return;

      // Update usage metrics
      switch (feature) {
        case 'cv_generation':
          status.usage.metrics.cvGenerated += amount;
          break;
        case 'storage':
          status.usage.metrics.storageUsed += amount;
          break;
        case 'api_calls':
          status.usage.metrics.apiCalls += amount;
          break;
        case 'portal_views':
          status.usage.metrics.portalViews += amount;
          break;
        case 'podcast_generation':
          status.usage.metrics.podcastsGenerated += amount;
          break;
        case 'video_generation':
          status.usage.metrics.videosGenerated += amount;
          break;
      }

      // Update cache
      this.statusCache.set(userId, { status, timestamp: Date.now() });
      
      // Persist to storage
      this.saveToStorage(userId, status);

      logger.debug('Feature usage recorded', { userId, feature, amount });

    } catch (error) {
      logger.error('Failed to record feature usage:', error);
    }
  }

  /**
   * Gets usage alerts for a user
   */
  getUsageAlerts(status: PremiumStatus): Array<{ feature: string; percentage: number; message: string }> {
    const alerts: Array<{ feature: string; percentage: number; message: string }> = [];
    const limits = TIER_LIMITS[status.tier];
    
    if (!limits) return alerts;

    // Check CV limit
    if (limits.cvs !== -1) {
      const percentage = (status.usage.metrics.cvGenerated / limits.cvs) * 100;
      if (percentage >= 80) {
        alerts.push({
          feature: 'cv_creation',
          percentage,
          message: `You've used ${Math.round(percentage)}% of your CV creation limit`
        });
      }
    }

    // Check storage limit
    const storagePercentage = (status.usage.metrics.storageUsed / limits.storage) * 100;
    if (storagePercentage >= 80) {
      alerts.push({
        feature: 'storage',
        percentage: storagePercentage,
        message: `You've used ${Math.round(storagePercentage)}% of your storage space`
      });
    }

    // Check API calls limit
    const apiPercentage = (status.usage.metrics.apiCalls / limits.apiCalls) * 100;
    if (apiPercentage >= 80) {
      alerts.push({
        feature: 'api_calls',
        percentage: apiPercentage,
        message: `You've used ${Math.round(apiPercentage)}% of your API calls limit`
      });
    }

    return alerts;
  }

  /**
   * Simulates a subscription upgrade
   */
  async upgradeSubscription(userId: string, newTier: PremiumTier): Promise<PremiumStatus> {
    try {
      const currentStatus = await this.loadPremiumStatus(userId);
      const newPlan = PREMIUM_PLANS[newTier];
      
      if (!newPlan) {
        throw createAuthError('premium/invalid-tier', `Invalid subscription tier: ${newTier}`);
      }

      const upgradedStatus: PremiumStatus = {
        ...currentStatus,
        isPremium: newTier !== 'free',
        isLifetime: newTier === 'lifetime',
        tier: newTier,
        status: newTier === 'lifetime' ? 'lifetime' : 'active',
        features: newPlan.features
      };

      // Update cache and storage
      this.statusCache.set(userId, { status: upgradedStatus, timestamp: Date.now() });
      this.saveToStorage(userId, upgradedStatus);
      
      // Save to Firestore
      try {
        await this.saveToFirestore(userId, upgradedStatus);
      } catch (firestoreError) {
        logger.warn('Failed to save upgraded subscription to Firestore:', firestoreError);
        // Don't fail the upgrade if Firestore save fails
      }

      logger.info('Subscription upgraded', { userId, fromTier: currentStatus.tier, toTier: newTier });
      return upgradedStatus;

    } catch (error) {
      logger.error('Failed to upgrade subscription:', error);
      throw createAuthError('premium/upgrade-failed', 'Failed to upgrade subscription');
    }
  }

  /**
   * Clears premium status cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.statusCache.delete(userId);
    } else {
      this.statusCache.clear();
    }
    logger.debug('Premium status cache cleared', { userId });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private createDefaultPremiumStatus(): PremiumStatus {
    const freePlan = PREMIUM_PLANS.free;
    
    return {
      isPremium: false,
      isLifetime: false,
      tier: 'free',
      status: 'active',
      features: freePlan.features,
      usage: {
        periodStart: Date.now(),
        periodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        metrics: {
          cvGenerated: 0,
          storageUsed: 0,
          apiCalls: 0,
          portalViews: 0,
          podcastsGenerated: 0,
          videosGenerated: 0
        }
      }
    };
  }

  private loadFromStorage(userId: string): PremiumStatus | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const storageKey = `${STORAGE_KEYS.PREMIUM}_${userId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check if cache is still valid
        if (Date.now() - data.timestamp < this.CACHE_DURATION) {
          return data.status;
        } else {
          // Remove expired cache
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      logger.warn('Failed to load premium status from storage:', error);
    }
    
    return null;
  }

  private saveToStorage(userId: string, status: PremiumStatus): void {
    if (typeof window === 'undefined') return;
    
    try {
      const storageKey = `${STORAGE_KEYS.PREMIUM}_${userId}`;
      const data = {
        status,
        timestamp: Date.now()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to save premium status to storage:', error);
    }
  }

  /**
   * Loads premium status from Firestore
   */
  private async loadFromFirestore(userId: string): Promise<PremiumStatus | null> {
    try {
      // Import Firestore functions dynamically
      const { doc, getDoc, getFirestore } = await import('firebase/firestore');
      
      // Get Firestore instance - we'll need to get this from the main app instance
      const db = getFirestore();
      
      const subscriptionDoc = doc(db, 'user_subscriptions', userId);
      const docSnap = await getDoc(subscriptionDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const status: PremiumStatus = {
          isPremium: data.isPremium || false,
          tier: data.tier || 'free',
          isLifetime: data.isLifetime || false,
          status: data.status || 'inactive',
          features: data.features || this.createDefaultFeatures('free'),
          usage: data.usage || this.createDefaultUsage(),
          billing: data.billing,
          expiresAt: data.expiresAt,
          gracePeriodEnd: data.gracePeriodEnd
        };
        
        logger.debug('Premium status loaded from Firestore', { userId, tier: status.tier });
        return status;
      }
      
      logger.debug('No subscription found in Firestore', { userId });
      return null;
    } catch (error) {
      logger.error('Failed to load premium status from Firestore:', error);
      return null;
    }
  }

  /**
   * Saves premium status to Firestore
   */
  private async saveToFirestore(userId: string, status: PremiumStatus): Promise<void> {
    try {
      // Import Firestore functions dynamically
      const { doc, setDoc, serverTimestamp, getFirestore } = await import('firebase/firestore');
      
      // Get Firestore instance - we'll need to get this from the main app instance
      const db = getFirestore();
      
      const subscriptionDoc = doc(db, 'user_subscriptions', userId);
      
      const subscriptionData = {
        ...status,
        updatedAt: serverTimestamp(),
        lastCheckedAt: serverTimestamp()
      };
      
      await setDoc(subscriptionDoc, subscriptionData, { merge: true });
      logger.debug('Premium status saved to Firestore', { userId, tier: status.tier });
    } catch (error) {
      logger.error('Failed to save premium status to Firestore:', error);
      throw error;
    }
  }

  /**
   * Gets premium plan information
   */
  getPlanInfo(tier: PremiumTier): typeof PREMIUM_PLANS[PremiumTier] | null {
    return PREMIUM_PLANS[tier] || null;
  }

  /**
   * Compares two premium tiers
   */
  compareTiers(tierA: PremiumTier, tierB: PremiumTier): number {
    const tierOrder: PremiumTier[] = ['free', 'basic', 'premium', 'professional', 'enterprise', 'lifetime'];
    const indexA = tierOrder.indexOf(tierA);
    const indexB = tierOrder.indexOf(tierB);
    
    return indexA - indexB; // negative if A < B, positive if A > B, 0 if equal
  }

  /**
   * Checks if a tier qualifies for a feature
   */
  tierQualifiesForFeature(tier: PremiumTier, requiredTier: PremiumTier): boolean {
    return this.compareTiers(tier, requiredTier) >= 0;
  }

  /**
   * Creates default features for a tier
   */
  private createDefaultFeatures(tier: PremiumTier): PremiumFeatures {
    const plan = PREMIUM_PLANS[tier];
    return plan ? plan.features : PREMIUM_PLANS.free.features;
  }

  /**
   * Creates default usage metrics
   */
  private createDefaultUsage(): UsageMetrics {
    const now = Date.now();
    return {
      periodStart: now,
      periodEnd: now + (30 * 24 * 60 * 60 * 1000), // 30 days from now
      metrics: {
        cvGenerated: 0,
        storageUsed: 0,
        apiCalls: 0,
        portalViews: 0,
        podcastsGenerated: 0,
        videosGenerated: 0
      }
    };
  }
}