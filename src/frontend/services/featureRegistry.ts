/**
 * CVPlus Feature Registry
 * Comprehensive catalog of all CV features with premium tier mapping
 * Author: Gil Klainert
 * Date: August 27, 2025
  */

export interface CVFeature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'ai-powered' | 'interactive' | 'media' | 'visual' | 'analytics';
  tier: 'free' | 'premium' | 'enterprise';
  component?: string;
  backendService?: string;
  usageLimits?: {
    free?: number;
    premium?: number;
    enterprise?: number;
  };
  apiEndpoints?: string[];
  dependencies?: string[];
  estimatedProcessingTime?: number; // in seconds
  popularityScore?: number; // 1-10
}

export interface PremiumTier {
  tier: 'free' | 'premium' | 'enterprise';
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  limits: {
    monthlyUploads: number;
    cvGenerations: number;
    featuresPerCV: number;
    storageGB: number;
    apiCallsPerMonth: number;
    supportLevel: 'community' | 'email' | 'priority';
  };
}

/**
 * Complete CVPlus Feature Registry
 * Based on codebase analysis and implementation reports
  */
export const CV_FEATURES: CVFeature[] = [
  // ========== CORE FEATURES (Free Tier) ==========
  {
    id: 'basicCVUpload',
    name: 'Basic CV Upload',
    description: 'Upload and parse standard CV formats (PDF, DOCX, TXT)',
    category: 'core',
    tier: 'free',
    component: 'FileUpload.tsx',
    backendService: 'cvParsing.service.ts',
    apiEndpoints: ['processCV'],
    usageLimits: { free: 3, premium: 50, enterprise: -1 },
    estimatedProcessingTime: 15,
    popularityScore: 10
  },
  {
    id: 'basicCVGeneration',
    name: 'Basic CV Generation',
    description: 'Generate standard HTML/PDF CV with basic templates',
    category: 'core',
    tier: 'free',
    component: 'CVPreview.tsx',
    backendService: 'cvGenerator.ts',
    apiEndpoints: ['generateCV'],
    estimatedProcessingTime: 30,
    popularityScore: 10
  },
  {
    id: 'standardTemplates',
    name: 'Standard Templates',
    description: 'Access to 3 basic professional CV templates',
    category: 'core',
    tier: 'free',
    component: 'TemplateCard.tsx',
    usageLimits: { free: 3, premium: -1, enterprise: -1 },
    popularityScore: 9
  },
  {
    id: 'pdfExport',
    name: 'PDF Export',
    description: 'Export CV as PDF document',
    category: 'core',
    tier: 'free',
    backendService: 'pdfService.ts',
    popularityScore: 10
  },

  // ========== AI-POWERED FEATURES (Premium) ==========
  {
    id: 'aiChatAssistant',
    name: 'AI Chat Assistant',
    description: 'Interactive AI assistant for CV optimization guidance',
    category: 'ai-powered',
    tier: 'premium',
    component: 'AIChatAssistant.tsx',
    backendService: 'chat.service.ts',
    apiEndpoints: ['ragChat'],
    usageLimits: { free: 0, premium: 100, enterprise: 500 },
    estimatedProcessingTime: 5,
    popularityScore: 8
  },
  {
    id: 'atsOptimization',
    name: 'ATS Optimization',
    description: 'Applicant Tracking System compatibility analysis and optimization',
    category: 'ai-powered',
    tier: 'premium',
    component: 'ATSOptimization.tsx',
    backendService: 'ats-optimization.service.ts',
    apiEndpoints: ['atsOptimization'],
    estimatedProcessingTime: 45,
    popularityScore: 9
  },
  {
    id: 'keywordEnhancement',
    name: 'Keyword Enhancement',
    description: 'AI-powered keyword optimization for better job matching',
    category: 'ai-powered',
    tier: 'premium',
    component: 'KeywordEnhancement.tsx',
    backendService: 'ats-optimization.service.ts',
    estimatedProcessingTime: 20,
    popularityScore: 8
  },
  {
    id: 'personalityInsights',
    name: 'Personality Insights',
    description: 'AI analysis of personality traits from CV content',
    category: 'ai-powered',
    tier: 'premium',
    component: 'PersonalityInsights.tsx',
    backendService: 'personality-insights.service.ts',
    apiEndpoints: ['personalityInsights'],
    estimatedProcessingTime: 30,
    popularityScore: 7
  },
  {
    id: 'skillsAnalytics',
    name: 'Skills Analytics',
    description: 'Advanced AI-powered skills gap analysis and recommendations',
    category: 'ai-powered',
    tier: 'premium',
    component: 'SkillsAnalytics.tsx',
    backendService: 'skills-visualization.service.ts',
    estimatedProcessingTime: 25,
    popularityScore: 8
  },
  {
    id: 'aiPodcastPlayer',
    name: 'AI Podcast Generation',
    description: 'Generate AI-powered podcast introductions from CV content',
    category: 'ai-powered',
    tier: 'premium',
    component: 'AIPodcastPlayer.tsx',
    backendService: 'podcast-generation.service.ts',
    apiEndpoints: ['generatePodcast'],
    usageLimits: { free: 0, premium: 5, enterprise: 20 },
    estimatedProcessingTime: 120,
    popularityScore: 6
  },

  // ========== INTERACTIVE FEATURES (Premium) ==========
  {
    id: 'careerTimeline',
    name: 'Interactive Career Timeline',
    description: 'Visual timeline of career progression with interactive elements',
    category: 'interactive',
    tier: 'premium',
    component: 'CareerTimeline.tsx',
    backendService: 'timeline-generation.service.ts',
    apiEndpoints: ['generateTimeline'],
    estimatedProcessingTime: 40,
    popularityScore: 8
  },
  {
    id: 'dynamicQRCode',
    name: 'Dynamic QR Codes',
    description: 'Analytics-enabled QR codes with tracking and customization',
    category: 'interactive',
    tier: 'premium',
    component: 'DynamicQRCode.tsx',
    backendService: 'enhanced-qr.service.ts',
    apiEndpoints: ['enhancedQR'],
    usageLimits: { free: 0, premium: 10, enterprise: 50 },
    estimatedProcessingTime: 10,
    popularityScore: 7
  },
  {
    id: 'availabilityCalendar',
    name: 'Availability Calendar',
    description: 'Integrated calendar for interview scheduling',
    category: 'interactive',
    tier: 'premium',
    component: 'AvailabilityCalendar.tsx',
    backendService: 'calendar-integration.service.ts',
    apiEndpoints: ['calendarIntegration', 'generateAvailabilityCalendar'],
    estimatedProcessingTime: 20,
    popularityScore: 6
  },
  {
    id: 'socialMediaLinks',
    name: 'Social Media Integration',
    description: 'Enhanced social profile integration with analytics',
    category: 'interactive',
    tier: 'premium',
    component: 'SocialMediaLinks/index.tsx',
    backendService: 'social-media.service.ts',
    apiEndpoints: ['socialMedia'],
    estimatedProcessingTime: 15,
    popularityScore: 8
  },

  // ========== MEDIA FEATURES (Premium) ==========
  {
    id: 'portfolioGallery',
    name: 'Portfolio Gallery',
    description: 'Visual portfolio showcase with media management',
    category: 'media',
    tier: 'premium',
    component: 'PortfolioGallery.tsx',
    backendService: 'portfolio-gallery.service.ts',
    apiEndpoints: ['portfolioGallery'],
    usageLimits: { free: 0, premium: 20, enterprise: 100 },
    estimatedProcessingTime: 25,
    popularityScore: 7
  },
  {
    id: 'videoIntroduction',
    name: 'Video Introduction',
    description: 'AI-generated video introduction with avatar',
    category: 'media',
    tier: 'premium',
    component: 'VideoIntroduction.tsx',
    backendService: 'video-generation.service.ts',
    apiEndpoints: ['generateVideoIntroduction'],
    usageLimits: { free: 0, premium: 2, enterprise: 10 },
    estimatedProcessingTime: 300,
    popularityScore: 6
  },
  {
    id: 'testimonialsCarousel',
    name: 'Testimonials Carousel',
    description: 'AI-generated professional testimonials display',
    category: 'media',
    tier: 'premium',
    component: 'TestimonialsCarousel.tsx',
    backendService: 'testimonials.service.ts',
    apiEndpoints: ['testimonials'],
    estimatedProcessingTime: 35,
    popularityScore: 7
  },

  // ========== VISUAL FEATURES (Premium) ==========
  {
    id: 'skillsVisualization',
    name: 'Skills Visualization',
    description: 'Interactive charts and graphs for skills representation',
    category: 'visual',
    tier: 'premium',
    component: 'SkillsVisualization.tsx',
    backendService: 'skills-visualization.service.ts',
    apiEndpoints: ['skillsVisualization'],
    estimatedProcessingTime: 20,
    popularityScore: 9
  },
  {
    id: 'achievementCards',
    name: 'Achievement Cards',
    description: 'Visual achievement highlights with impact metrics',
    category: 'visual',
    tier: 'premium',
    component: 'AchievementCards.tsx',
    backendService: 'achievements-analysis.service.ts',
    estimatedProcessingTime: 30,
    popularityScore: 8
  },
  {
    id: 'certificationBadges',
    name: 'Certification Badges',
    description: 'Professional certification display with verification',
    category: 'visual',
    tier: 'premium',
    component: 'CertificationBadges.tsx',
    backendService: 'certification-badges.service.ts',
    apiEndpoints: ['certificationBadges'],
    estimatedProcessingTime: 15,
    popularityScore: 8
  },
  {
    id: 'languageProficiency',
    name: 'Language Proficiency',
    description: 'Visual language skills assessment and display',
    category: 'visual',
    tier: 'premium',
    component: 'LanguageProficiency.tsx',
    backendService: 'language-proficiency.service.ts',
    apiEndpoints: ['languageProficiency'],
    estimatedProcessingTime: 10,
    popularityScore: 7
  },

  // ========== ANALYTICS FEATURES (Premium/Enterprise) ==========
  {
    id: 'advancedAnalytics',
    name: 'Advanced Analytics',
    description: 'Comprehensive CV performance and engagement analytics',
    category: 'analytics',
    tier: 'premium',
    component: 'AnalyticsDashboard.tsx',
    backendService: 'analytics-engine.service.ts',
    estimatedProcessingTime: 10,
    popularityScore: 6
  },
  {
    id: 'outcomeTracking',
    name: 'Outcome Tracking',
    description: 'Track interview rates, responses, and success metrics',
    category: 'analytics',
    tier: 'premium',
    component: 'OutcomeTracker.tsx',
    backendService: 'ml-pipeline.service.ts',
    apiEndpoints: ['trackOutcome'],
    estimatedProcessingTime: 5,
    popularityScore: 7
  },

  // ========== ENTERPRISE FEATURES ==========
  {
    id: 'publicProfile',
    name: 'Public Web Profiles',
    description: 'Generate public web profiles with custom domains',
    category: 'interactive',
    tier: 'enterprise',
    component: 'PublicProfile.tsx',
    backendService: 'portal-generation.service.ts',
    apiEndpoints: ['generateWebPortal'],
    usageLimits: { free: 0, premium: 1, enterprise: 10 },
    estimatedProcessingTime: 180,
    popularityScore: 8
  },
  {
    id: 'contactForm',
    name: 'Contact Form Integration',
    description: 'Embedded contact forms with lead management',
    category: 'interactive',
    tier: 'premium',
    component: 'ContactForm.tsx',
    backendService: 'portal-generation.service.ts',
    estimatedProcessingTime: 15,
    popularityScore: 8
  },
  {
    id: 'roleDetection',
    name: 'AI Role Detection',
    description: 'Automatic detection of target roles and optimization',
    category: 'ai-powered',
    tier: 'premium',
    component: 'RoleDetectionSection.tsx',
    backendService: 'role-detection.service.ts',
    estimatedProcessingTime: 25,
    popularityScore: 8
  },
  {
    id: 'externalDataIntegration',
    name: 'External Data Integration',
    description: 'LinkedIn, GitHub, and other platform data integration',
    category: 'ai-powered',
    tier: 'premium',
    component: 'ExternalDataSources.tsx',
    backendService: 'external-data/orchestrator.service.ts',
    apiEndpoints: ['enrichCVWithExternalData'],
    estimatedProcessingTime: 60,
    popularityScore: 7
  }
];

/**
 * Premium Tier Definitions
  */
export const PREMIUM_TIERS: PremiumTier[] = [
  {
    tier: 'free',
    name: 'Free',
    description: 'Basic CV creation and export',
    monthlyPrice: 0,
    features: ['basicCVUpload', 'basicCVGeneration', 'standardTemplates', 'pdfExport'],
    limits: {
      monthlyUploads: 3,
      cvGenerations: 5,
      featuresPerCV: 2,
      storageGB: 0.1,
      apiCallsPerMonth: 20,
      supportLevel: 'community'
    }
  },
  {
    tier: 'premium',
    name: 'Premium',
    description: 'Full access to AI-powered features and analytics',
    monthlyPrice: 29,
    features: CV_FEATURES.filter(f => f.tier === 'free' || f.tier === 'premium').map(f => f.id),
    limits: {
      monthlyUploads: 50,
      cvGenerations: 100,
      featuresPerCV: -1, // Unlimited
      storageGB: 5,
      apiCallsPerMonth: 1000,
      supportLevel: 'email'
    }
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced features, API access, and white-label options',
    monthlyPrice: 99,
    features: CV_FEATURES.map(f => f.id), // All features
    limits: {
      monthlyUploads: -1, // Unlimited
      cvGenerations: -1,
      featuresPerCV: -1,
      storageGB: 50,
      apiCallsPerMonth: 10000,
      supportLevel: 'priority'
    }
  }
];

/**
 * Feature Categories for Organization
  */
export const FEATURE_CATEGORIES = {
  core: 'Essential CV functionality available to all users',
  'ai-powered': 'Advanced AI features for optimization and insights',
  interactive: 'Interactive elements for enhanced user engagement',
  media: 'Rich media content generation and management',
  visual: 'Visual enhancements and data representation',
  analytics: 'Performance tracking and insights'
} as const;

/**
 * Helper Functions
  */
export class FeatureRegistry {
  /**
   * Get feature by ID
    */
  static getFeature(featureId: string): CVFeature | undefined {
    return CV_FEATURES.find(feature => feature.id === featureId);
  }

  /**
   * Get features by tier
    */
  static getFeaturesByTier(tier: 'free' | 'premium' | 'enterprise'): CVFeature[] {
    if (tier === 'enterprise') return CV_FEATURES; // Enterprise has all features
    if (tier === 'premium') return CV_FEATURES.filter(f => f.tier === 'free' || f.tier === 'premium');
    return CV_FEATURES.filter(f => f.tier === 'free');
  }

  /**
   * Get features by category
    */
  static getFeaturesByCategory(category: CVFeature['category']): CVFeature[] {
    return CV_FEATURES.filter(feature => feature.category === category);
  }

  /**
   * Check if user has access to feature
    */
  static hasFeatureAccess(featureId: string, userTier: 'free' | 'premium' | 'enterprise'): boolean {
    const feature = this.getFeature(featureId);
    if (!feature) return false;

    const allowedFeatures = this.getFeaturesByTier(userTier);
    return allowedFeatures.some(f => f.id === featureId);
  }

  /**
   * Get usage limit for feature
    */
  static getUsageLimit(featureId: string, userTier: 'free' | 'premium' | 'enterprise'): number {
    const feature = this.getFeature(featureId);
    if (!feature?.usageLimits) return -1; // Unlimited if not specified

    return feature.usageLimits[userTier] ?? -1;
  }

  /**
   * Get premium features (non-free)
    */
  static getPremiumFeatures(): CVFeature[] {
    return CV_FEATURES.filter(f => f.tier !== 'free');
  }

  /**
   * Get popular features (score >= 8)
    */
  static getPopularFeatures(): CVFeature[] {
    return CV_FEATURES.filter(f => f.popularityScore && f.popularityScore >= 8)
                     .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
  }
}

export default FeatureRegistry;