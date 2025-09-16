/**
 * CVPlus Premium Dashboard
 * Comprehensive subscription management and usage analytics interface
 * Author: Gil Klainert
 * Date: August 27, 2025
 */

import React, { useState, useEffect } from 'react';
import { 
  Crown, TrendingUp, Calendar, Settings, CreditCard, BarChart3, 
  Clock, Zap, Star, AlertTriangle, CheckCircle, ArrowUpRight,
  Download, RefreshCw, HelpCircle, Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { subscriptionCache, CachedSubscription } from '../../services/premium/subscriptionCache';
import { usageTracker, UsageMetrics } from '../../services/premium/usageTracker';
import { FeatureRegistry, CV_FEATURES } from '../../services/premium/featureRegistry';

interface PremiumDashboardState {
  subscription: CachedSubscription | null;
  usageMetrics: UsageMetrics | null;
  realtimeStats: any;
  loading: boolean;
  error: string | null;
}

/**
 * Premium Dashboard Component
 */
export const PremiumDashboard: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PremiumDashboardState>({
    subscription: null,
    usageMetrics: null,
    realtimeStats: null,
    loading: true,
    error: null
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'features' | 'billing'>('overview');

  // Load dashboard data
  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const [subscription, usageMetrics, realtimeStats] = await Promise.all([
          subscriptionCache.getUserSubscription(user.uid),
          usageTracker.getUserUsageAnalytics(user.uid, 'month'),
          usageTracker.getRealtimeUsageStats(user.uid)
        ]);

        setState({
          subscription,
          usageMetrics,
          realtimeStats,
          loading: false,
          error: null
        });

      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: (error as Error).message
        }));
      }
    };

    loadDashboardData();
  }, [user]);

  const refreshData = () => {
    if (user) {
      subscriptionCache.invalidate(user.uid);
      // Re-trigger useEffect
      setState(prev => ({ ...prev, loading: true }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Crown className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Premium Dashboard</h2>
          <p className="text-gray-600 mb-6">Sign in to access your premium account</p>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your premium dashboard...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{state.error}</p>
          <button
            onClick={refreshData}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { subscription, usageMetrics, realtimeStats } = state;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Crown className="w-8 h-8 text-purple-600" />
              Premium Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your subscription and monitor feature usage
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <a
              href="/help"
              className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </a>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="bg-white rounded-lg shadow-sm border mb-8 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                subscription?.tier === 'enterprise' ? 'bg-purple-100 text-purple-600' :
                subscription?.tier === 'premium' ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {subscription?.tier === 'enterprise' ? <Sparkles className="w-6 h-6" /> :
                 subscription?.tier === 'premium' ? <Crown className="w-6 h-6" /> :
                 <Star className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 capitalize">
                  {subscription?.tier || 'Free'} Plan
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    subscription?.status === 'active' ? 'bg-green-500' :
                    subscription?.status === 'grace_period' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-600 capitalize">
                    {subscription?.status || 'Active'}
                  </span>
                  {subscription?.gracePeriodEnd && (
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      Grace period
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              {subscription?.expiresAt && (
                <div className="text-sm text-gray-600">
                  Renews {subscription.expiresAt.toLocaleDateString()}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                  Manage Billing
                </button>
                {subscription?.tier === 'free' && (
                  <a
                    href="/pricing"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Upgrade
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'usage', label: 'Usage Analytics', icon: TrendingUp },
              { key: 'features', label: 'Feature Access', icon: Zap },
              { key: 'billing', label: 'Billing & Plans', icon: CreditCard }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab 
            subscription={subscription}
            usageMetrics={usageMetrics}
            realtimeStats={realtimeStats}
          />
        )}

        {activeTab === 'usage' && (
          <UsageAnalyticsTab 
            usageMetrics={usageMetrics}
            realtimeStats={realtimeStats}
          />
        )}

        {activeTab === 'features' && (
          <FeatureAccessTab subscription={subscription} />
        )}

        {activeTab === 'billing' && (
          <BillingTab subscription={subscription} />
        )}
      </div>
    </div>
  );
};

/**
 * Overview Tab Component
 */
const OverviewTab: React.FC<{
  subscription: CachedSubscription | null;
  usageMetrics: UsageMetrics | null;
  realtimeStats: any;
}> = ({ subscription, usageMetrics, realtimeStats }) => {
  const topFeatures = realtimeStats?.topFeatures || [];
  const todayUsage = realtimeStats?.todayUsage || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Usage Overview */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Today's Activity
          </h3>
          
          {Object.keys(todayUsage).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(todayUsage).slice(0, 4).map(([featureId, count]) => {
                const feature = FeatureRegistry.getFeature(featureId);
                return (
                  <div key={featureId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {feature?.name || featureId}
                      </div>
                      <div className="text-xs text-gray-600">
                        {count} uses today
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No activity today yet</p>
              <p className="text-sm text-gray-500 mt-1">Start creating CVs to see your usage</p>
            </div>
          )}
        </div>

        {/* Popular Features */}
        {topFeatures.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Most Used Features
            </h3>
            
            <div className="space-y-3">
              {topFeatures.slice(0, 5).map((featureId: string, index: number) => {
                const feature = FeatureRegistry.getFeature(featureId);
                return (
                  <div key={featureId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-gray-500 w-4">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {feature?.name || featureId}
                        </div>
                        <div className="text-xs text-gray-600">
                          {feature?.category.replace('-', ' ')} feature
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Usage Limits */}
        {subscription && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Usage Limits
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Monthly Uploads</span>
                  <span>
                    {realtimeStats?.monthlyUsage?.uploads || 0} / {subscription.limits.monthlyUploads === -1 ? '∞' : subscription.limits.monthlyUploads}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ 
                      width: subscription.limits.monthlyUploads === -1 ? '0%' : 
                        `${Math.min(100, ((realtimeStats?.monthlyUsage?.uploads || 0) / subscription.limits.monthlyUploads) * 100)}%` 
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CV Generations</span>
                  <span>
                    {realtimeStats?.monthlyUsage?.generations || 0} / {subscription.limits.cvGenerations === -1 ? '∞' : subscription.limits.cvGenerations}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ 
                      width: subscription.limits.cvGenerations === -1 ? '0%' : 
                        `${Math.min(100, ((realtimeStats?.monthlyUsage?.generations || 0) / subscription.limits.cvGenerations) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          
          <div className="space-y-3">
            <a
              href="/create"
              className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Zap className="w-5 h-5 text-purple-600" />
              <span className="text-purple-900 font-medium">Create New CV</span>
            </a>
            
            <a
              href="/analytics"
              className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span className="text-blue-900 font-medium">View Analytics</span>
            </a>
            
            <a
              href="/export"
              className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Download className="w-5 h-5 text-green-600" />
              <span className="text-green-900 font-medium">Export Data</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Usage Analytics Tab
 */
const UsageAnalyticsTab: React.FC<{
  usageMetrics: UsageMetrics | null;
  realtimeStats: any;
}> = ({ usageMetrics, realtimeStats }) => {
  // Implementation for usage analytics
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Usage Analytics
      </h3>
      <p className="text-gray-600">
        Detailed usage analytics coming soon...
      </p>
    </div>
  );
};

/**
 * Feature Access Tab
 */
const FeatureAccessTab: React.FC<{
  subscription: CachedSubscription | null;
}> = ({ subscription }) => {
  const userTier = subscription?.tier || 'free';
  const availableFeatures = FeatureRegistry.getFeaturesByTier(userTier);
  const allFeatures = CV_FEATURES;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Available Features ({availableFeatures.length})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableFeatures.map(feature => (
            <div key={feature.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{feature.name}</h4>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {feature.category.replace('-', ' ')}
                </span>
                {feature.popularityScore && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs text-gray-600">{feature.popularityScore}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked Features */}
      {userTier !== 'enterprise' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upgrade for More Features
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allFeatures
              .filter(f => !availableFeatures.includes(f))
              .slice(0, 6)
              .map(feature => (
                <div key={feature.id} className="border rounded-lg p-4 opacity-60">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{feature.name}</h4>
                    <Crown className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded capitalize">
                      {feature.tier}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          
          <div className="text-center mt-6">
            <a
              href="/pricing"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              View Upgrade Options
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Billing Tab
 */
const BillingTab: React.FC<{
  subscription: CachedSubscription | null;
}> = ({ subscription }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Billing & Plans
      </h3>
      <p className="text-gray-600">
        Billing management interface coming soon...
      </p>
    </div>
  );
};

export default PremiumDashboard;