/**
 * Premium Constants
 * 
 * Premium tier definitions, feature configurations, and billing constants.
  */

import type { 
  PremiumPlan, 
  PremiumTier, 
  PremiumFeatures, 
  MonetaryAmount,
  FeatureGateConfig
} from '../types';

// ============================================================================
// PREMIUM TIERS
// ============================================================================
export const PREMIUM_TIERS: Record<PremiumTier, string> = {
  free: 'Free',
  basic: 'Basic',
  premium: 'Premium',
  professional: 'Professional',
  enterprise: 'Enterprise',
  lifetime: 'Lifetime Premium'
} as const;

// ============================================================================
// FEATURE LIMITS BY TIER
// ============================================================================
export const TIER_LIMITS = {
  free: {
    cvs: 3,
    storage: 50 * 1024 * 1024, // 50MB
    apiCalls: 100,
    exports: 5,
    templates: 'basic'
  },
  basic: {
    cvs: 10,
    storage: 200 * 1024 * 1024, // 200MB
    apiCalls: 500,
    exports: 25,
    templates: 'standard'
  },
  premium: {
    cvs: 50,
    storage: 1024 * 1024 * 1024, // 1GB
    apiCalls: 2500,
    exports: 100,
    templates: 'all'
  },
  professional: {
    cvs: 200,
    storage: 5 * 1024 * 1024 * 1024, // 5GB
    apiCalls: 10000,
    exports: 500,
    templates: 'all'
  },
  enterprise: {
    cvs: -1, // unlimited
    storage: 50 * 1024 * 1024 * 1024, // 50GB
    apiCalls: 100000,
    exports: -1, // unlimited
    templates: 'all'
  },
  lifetime: {
    cvs: -1, // unlimited
    storage: 10 * 1024 * 1024 * 1024, // 10GB
    apiCalls: 50000,
    exports: -1, // unlimited
    templates: 'all'
  }
} as const;

// ============================================================================
// PREMIUM PLANS DEFINITION
// ============================================================================
export const PREMIUM_PLANS: Record<PremiumTier, PremiumPlan> = {
  free: {
    id: 'free',
    name: 'Free Plan',
    description: 'Perfect for getting started with CV creation',
    tier: 'free',
    price: {
      monthly: { value: 0, currency: 'USD', formatted: 'Free' },
      yearly: { value: 0, currency: 'USD', formatted: 'Free' }
    },
    features: {
      cvGeneration: { enabled: true },
      templatesAccess: { enabled: true, restrictions: [{ type: 'functional', value: 'basic_only', message: 'Basic templates only' }] },
      webPortal: { enabled: false },
      aiChat: { enabled: false },
      podcastGeneration: { enabled: false },
      videoIntroduction: { enabled: false },
      advancedAnalytics: { enabled: false },
      customBranding: { enabled: false },
      apiAccess: { enabled: false },
      prioritySupport: { enabled: false },
      teamCollaboration: { enabled: false },
      cvLimit: { current: 0, maximum: 3, resetPeriod: 'never' },
      storageLimit: { current: 0, maximum: 50 * 1024 * 1024, resetPeriod: 'never' },
      exportLimit: { current: 0, maximum: 5, resetPeriod: 'monthly', resetDate: Date.now() },
      apiCallLimit: { current: 0, maximum: 100, resetPeriod: 'monthly', resetDate: Date.now() }
    },
    limits: {
      maxCVs: 3,
      maxStorage: 50 * 1024 * 1024,
      maxApiCalls: 100,
      supportLevel: 'community'
    },
    popular: false
  },
  
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    description: 'Enhanced features for serious job seekers',
    tier: 'basic',
    price: {
      monthly: { value: 9.99, currency: 'USD', formatted: '$9.99' },
      yearly: { value: 99.99, currency: 'USD', formatted: '$99.99' }
    },
    features: {
      cvGeneration: { enabled: true },
      templatesAccess: { enabled: true },
      webPortal: { enabled: false },
      aiChat: { enabled: false },
      podcastGeneration: { enabled: false },
      videoIntroduction: { enabled: false },
      advancedAnalytics: { enabled: true, restrictions: [{ type: 'functional', value: 'basic_only' }] },
      customBranding: { enabled: false },
      apiAccess: { enabled: false },
      prioritySupport: { enabled: false },
      teamCollaboration: { enabled: false },
      cvLimit: { current: 0, maximum: 10, resetPeriod: 'never' },
      storageLimit: { current: 0, maximum: 200 * 1024 * 1024, resetPeriod: 'never' },
      exportLimit: { current: 0, maximum: 25, resetPeriod: 'monthly', resetDate: Date.now() },
      apiCallLimit: { current: 0, maximum: 500, resetPeriod: 'monthly', resetDate: Date.now() }
    },
    limits: {
      maxCVs: 10,
      maxStorage: 200 * 1024 * 1024,
      maxApiCalls: 500,
      supportLevel: 'email'
    },
    popular: false
  },
  
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    description: 'Full access to all premium features',
    tier: 'premium',
    price: {
      monthly: { value: 29.99, currency: 'USD', formatted: '$29.99' },
      yearly: { value: 299.99, currency: 'USD', formatted: '$299.99' },
      lifetime: { value: 499.99, currency: 'USD', formatted: '$499.99' }
    },
    features: {
      cvGeneration: { enabled: true },
      templatesAccess: { enabled: true },
      webPortal: { enabled: true },
      aiChat: { enabled: true },
      podcastGeneration: { enabled: true },
      videoIntroduction: { enabled: true },
      advancedAnalytics: { enabled: true },
      customBranding: { enabled: true },
      apiAccess: { enabled: true },
      prioritySupport: { enabled: true },
      teamCollaboration: { enabled: false },
      cvLimit: { current: 0, maximum: 50, resetPeriod: 'never' },
      storageLimit: { current: 0, maximum: 1024 * 1024 * 1024, resetPeriod: 'never' },
      exportLimit: { current: 0, maximum: 100, resetPeriod: 'monthly', resetDate: Date.now() },
      apiCallLimit: { current: 0, maximum: 2500, resetPeriod: 'monthly', resetDate: Date.now() }
    },
    limits: {
      maxCVs: 50,
      maxStorage: 1024 * 1024 * 1024,
      maxApiCalls: 2500,
      supportLevel: 'priority'
    },
    popular: true
  },
  
  professional: {
    id: 'professional',
    name: 'Professional Plan',
    description: 'Advanced features for professionals and recruiters',
    tier: 'professional',
    price: {
      monthly: { value: 59.99, currency: 'USD', formatted: '$59.99' },
      yearly: { value: 599.99, currency: 'USD', formatted: '$599.99' }
    },
    features: {
      cvGeneration: { enabled: true },
      templatesAccess: { enabled: true },
      webPortal: { enabled: true },
      aiChat: { enabled: true },
      podcastGeneration: { enabled: true },
      videoIntroduction: { enabled: true },
      advancedAnalytics: { enabled: true },
      customBranding: { enabled: true },
      apiAccess: { enabled: true },
      prioritySupport: { enabled: true },
      teamCollaboration: { enabled: true },
      cvLimit: { current: 0, maximum: 200, resetPeriod: 'never' },
      storageLimit: { current: 0, maximum: 5 * 1024 * 1024 * 1024, resetPeriod: 'never' },
      exportLimit: { current: 0, maximum: 500, resetPeriod: 'monthly', resetDate: Date.now() },
      apiCallLimit: { current: 0, maximum: 10000, resetPeriod: 'monthly', resetDate: Date.now() }
    },
    limits: {
      maxCVs: 200,
      maxStorage: 5 * 1024 * 1024 * 1024,
      maxApiCalls: 10000,
      maxTeamMembers: 10,
      supportLevel: 'priority'
    },
    popular: false
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    description: 'Custom solutions for large organizations',
    tier: 'enterprise',
    price: {
      monthly: { value: 199.99, currency: 'USD', formatted: '$199.99' },
      yearly: { value: 1999.99, currency: 'USD', formatted: '$1999.99' }
    },
    features: {
      cvGeneration: { enabled: true },
      templatesAccess: { enabled: true },
      webPortal: { enabled: true },
      aiChat: { enabled: true },
      podcastGeneration: { enabled: true },
      videoIntroduction: { enabled: true },
      advancedAnalytics: { enabled: true },
      customBranding: { enabled: true },
      apiAccess: { enabled: true },
      prioritySupport: { enabled: true },
      teamCollaboration: { enabled: true },
      cvLimit: { current: 0, maximum: -1, resetPeriod: 'never' },
      storageLimit: { current: 0, maximum: 50 * 1024 * 1024 * 1024, resetPeriod: 'never' },
      exportLimit: { current: 0, maximum: -1, resetPeriod: 'never' },
      apiCallLimit: { current: 0, maximum: 100000, resetPeriod: 'monthly', resetDate: Date.now() }
    },
    limits: {
      maxCVs: -1,
      maxStorage: 50 * 1024 * 1024 * 1024,
      maxApiCalls: 100000,
      maxTeamMembers: -1,
      supportLevel: 'dedicated'
    },
    popular: false
  },
  
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime Premium',
    description: 'One-time payment for lifetime access',
    tier: 'lifetime',
    price: {
      monthly: { value: 0, currency: 'USD', formatted: 'One-time' },
      yearly: { value: 0, currency: 'USD', formatted: 'One-time' },
      lifetime: { value: 499.99, currency: 'USD', formatted: '$499.99' }
    },
    features: {
      cvGeneration: { enabled: true },
      templatesAccess: { enabled: true },
      webPortal: { enabled: true },
      aiChat: { enabled: true },
      podcastGeneration: { enabled: true },
      videoIntroduction: { enabled: true },
      advancedAnalytics: { enabled: true },
      customBranding: { enabled: true },
      apiAccess: { enabled: true },
      prioritySupport: { enabled: true },
      teamCollaboration: { enabled: false },
      cvLimit: { current: 0, maximum: -1, resetPeriod: 'never' },
      storageLimit: { current: 0, maximum: 10 * 1024 * 1024 * 1024, resetPeriod: 'never' },
      exportLimit: { current: 0, maximum: -1, resetPeriod: 'never' },
      apiCallLimit: { current: 0, maximum: 50000, resetPeriod: 'monthly', resetDate: Date.now() }
    },
    limits: {
      maxCVs: -1,
      maxStorage: 10 * 1024 * 1024 * 1024,
      maxApiCalls: 50000,
      supportLevel: 'priority'
    },
    popular: false
  }
};

// ============================================================================
// FEATURE GATES
// ============================================================================
export const PREMIUM_FEATURE_GATES: Record<string, FeatureGateConfig> = {
  webPortal: {
    feature: 'webPortal',
    required: {
      tier: 'premium',
      status: ['active', 'lifetime']
    },
    fallback: {
      message: 'Web Portal generation requires a Premium subscription or higher',
      action: 'upgrade',
      ctaText: 'Upgrade to Premium',
      ctaUrl: '/pricing'
    }
  },
  
  aiChat: {
    feature: 'aiChat',
    required: {
      tier: 'premium',
      status: ['active', 'lifetime']
    },
    fallback: {
      message: 'AI Chat feature requires a Premium subscription or higher',
      action: 'upgrade',
      ctaText: 'Upgrade to Premium',
      ctaUrl: '/pricing'
    }
  },
  
  podcastGeneration: {
    feature: 'podcastGeneration',
    required: {
      tier: 'premium',
      status: ['active', 'lifetime']
    },
    fallback: {
      message: 'Podcast generation requires a Premium subscription or higher',
      action: 'upgrade',
      ctaText: 'Upgrade to Premium',
      ctaUrl: '/pricing'
    }
  },
  
  videoIntroduction: {
    feature: 'videoIntroduction',
    required: {
      tier: 'premium',
      status: ['active', 'lifetime']
    },
    fallback: {
      message: 'Video introduction requires a Premium subscription or higher',
      action: 'upgrade',
      ctaText: 'Upgrade to Premium',
      ctaUrl: '/pricing'
    }
  },
  
  advancedAnalytics: {
    feature: 'advancedAnalytics',
    required: {
      tier: 'basic',
      status: ['active', 'lifetime']
    },
    fallback: {
      message: 'Advanced analytics requires a Basic subscription or higher',
      action: 'upgrade',
      ctaText: 'Upgrade Now',
      ctaUrl: '/pricing'
    }
  },
  
  customBranding: {
    feature: 'customBranding',
    required: {
      tier: 'premium',
      status: ['active', 'lifetime']
    },
    fallback: {
      message: 'Custom branding requires a Premium subscription or higher',
      action: 'upgrade',
      ctaText: 'Upgrade to Premium',
      ctaUrl: '/pricing'
    }
  },
  
  apiAccess: {
    feature: 'apiAccess',
    required: {
      tier: 'premium',
      status: ['active', 'lifetime']
    },
    fallback: {
      message: 'API access requires a Premium subscription or higher',
      action: 'upgrade',
      ctaText: 'Upgrade to Premium',
      ctaUrl: '/pricing'
    }
  },
  
  teamCollaboration: {
    feature: 'teamCollaboration',
    required: {
      tier: 'professional',
      status: ['active', 'lifetime']
    },
    fallback: {
      message: 'Team collaboration requires a Professional subscription or higher',
      action: 'upgrade',
      ctaText: 'Upgrade to Professional',
      ctaUrl: '/pricing'
    }
  }
};

// ============================================================================
// USAGE ALERT THRESHOLDS
// ============================================================================
export const USAGE_ALERT_THRESHOLDS = {
  WARNING: 0.8,  // 80%
  CRITICAL: 0.95 // 95%
} as const;

// ============================================================================
// BILLING CYCLES
// ============================================================================
export const BILLING_CYCLES = {
  monthly: { 
    label: 'Monthly',
    description: 'Billed every month',
    discount: 0
  },
  yearly: { 
    label: 'Yearly',
    description: 'Billed annually',
    discount: 0.17 // 17% discount (~2 months free)
  },
  lifetime: { 
    label: 'Lifetime',
    description: 'One-time payment',
    discount: 0
  }
} as const;

// ============================================================================
// PAYMENT METHODS
// ============================================================================
export const SUPPORTED_PAYMENT_METHODS = [
  'card',
  'paypal',
  'apple_pay',
  'google_pay'
] as const;

// ============================================================================
// CURRENCY SUPPORT
// ============================================================================
export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD'
] as const;

// ============================================================================
// SUBSCRIPTION STATUS MESSAGES
// ============================================================================
export const SUBSCRIPTION_STATUS_MESSAGES = {
  active: 'Your subscription is active',
  cancelled: 'Your subscription has been cancelled',
  expired: 'Your subscription has expired',
  suspended: 'Your subscription has been suspended',
  pending: 'Your subscription is being processed',
  trial: 'You are in a trial period',
  lifetime: 'You have lifetime access'
} as const;

// ============================================================================
// GRACE PERIOD SETTINGS
// ============================================================================
export const GRACE_PERIOD = {
  PAYMENT_RETRY: 3 * 24 * 60 * 60 * 1000, // 3 days
  ACCESS_AFTER_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  DATA_RETENTION: 30 * 24 * 60 * 60 * 1000 // 30 days
} as const;