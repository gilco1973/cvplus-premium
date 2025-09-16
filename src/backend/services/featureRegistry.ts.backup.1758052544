/**
 * CVPlus Backend Feature Registry
 * Server-side feature configuration and validation
 * Author: Gil Klainert
 * Date: August 27, 2025
 */

export interface CVFeature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'ai-powered' | 'interactive' | 'media' | 'visual' | 'analytics';
  tier: 'free' | 'premium' | 'enterprise';
  backendService?: string;
  usageLimits?: {
    free?: number;
    premium?: number;
    enterprise?: number;
  };
  apiEndpoints?: string[];
  dependencies?: string[];
  estimatedProcessingTime?: number; // in seconds
  costPerExecution?: number; // in credits/tokens
  requiresAuth?: boolean;
}

/**
 * Complete CVPlus Backend Feature Registry
 * Matches frontend registry but includes backend-specific metadata
 */
export const CV_FEATURES: CVFeature[] = [
  // ========== CORE FEATURES (Free Tier) ==========
  {
    id: 'basicCVUpload',
    name: 'Basic CV Upload',
    description: 'Upload and parse standard CV formats (PDF, DOCX, TXT)',
    category: 'core',
    tier: 'free',
    backendService: 'processCV',
    apiEndpoints: ['processCV'],
    usageLimits: { free: 3, premium: 50, enterprise: -1 },
    estimatedProcessingTime: 15,
    costPerExecution: 1,
    requiresAuth: true
  },
  {
    id: 'basicCVGeneration',
    name: 'Basic CV Generation',
    description: 'Generate standard HTML/PDF CV with basic templates',
    category: 'core',
    tier: 'free',
    backendService: 'generateCV',
    apiEndpoints: ['generateCV', 'generateCVPreview'],
    estimatedProcessingTime: 30,
    costPerExecution: 2,
    requiresAuth: true
  },
  {
    id: 'standardTemplates',
    name: 'Standard Templates',
    description: 'Access to 3 basic professional CV templates',
    category: 'core',
    tier: 'free',
    backendService: 'getTemplates',
    apiEndpoints: ['getTemplates'],
    usageLimits: { free: 3, premium: -1, enterprise: -1 },
    costPerExecution: 0,
    requiresAuth: false
  },
  {
    id: 'pdfExport',
    name: 'PDF Export',
    description: 'Export CV as PDF document',
    category: 'core',
    tier: 'free',
    costPerExecution: 1,
    requiresAuth: true
  },

  // ========== AI-POWERED FEATURES (Premium) ==========
  {
    id: 'aiChatAssistant',
    name: 'AI Chat Assistant',
    description: 'Interactive AI assistant for CV optimization guidance',
    category: 'ai-powered',
    tier: 'premium',
    backendService: 'ragChat',
    apiEndpoints: ['ragChat', 'portalChat'],
    usageLimits: { free: 0, premium: 100, enterprise: 500 },
    estimatedProcessingTime: 5,
    costPerExecution: 5,
    requiresAuth: true
  },
  {
    id: 'atsOptimization',
    name: 'ATS Optimization',
    description: 'Applicant Tracking System compatibility analysis and optimization',
    category: 'ai-powered',
    tier: 'premium',
    backendService: 'atsOptimization',
    apiEndpoints: ['atsOptimization', 'industryOptimization'],
    estimatedProcessingTime: 45,
    costPerExecution: 10,
    requiresAuth: true
  },
  {
    id: 'keywordEnhancement',
    name: 'Keyword Enhancement',
    description: 'AI-powered keyword optimization for better job matching',
    category: 'ai-powered',
    tier: 'premium',
    backendService: 'atsOptimization',
    estimatedProcessingTime: 20,
    costPerExecution: 6,
    requiresAuth: true
  },
  {
    id: 'personalityInsights',
    name: 'Personality Insights',
    description: 'AI analysis of personality traits from CV content',
    category: 'ai-powered',
    tier: 'premium',
    backendService: 'personalityInsights',
    apiEndpoints: ['personalityInsights'],
    estimatedProcessingTime: 30,
    costPerExecution: 8,
    requiresAuth: true
  },
  {
    id: 'skillsAnalytics',
    name: 'Skills Analytics',
    description: 'Advanced AI-powered skills gap analysis and recommendations',
    category: 'ai-powered',
    tier: 'premium',
    backendService: 'skillsVisualization',
    estimatedProcessingTime: 25,
    costPerExecution: 7,
    requiresAuth: true
  },
  {
    id: 'aiPodcastPlayer',
    name: 'AI Podcast Generation',
    description: 'Generate AI-powered podcast introductions from CV content',
    category: 'ai-powered',
    tier: 'premium',
    backendService: 'generatePodcast',
    apiEndpoints: ['generatePodcast', 'podcastStatus'],
    usageLimits: { free: 0, premium: 5, enterprise: 20 },
    estimatedProcessingTime: 120,
    costPerExecution: 25,
    requiresAuth: true
  },

  // ========== INTERACTIVE FEATURES (Premium) ==========
  {
    id: 'careerTimeline',
    name: 'Interactive Career Timeline',
    description: 'Visual timeline of career progression with interactive elements',
    category: 'interactive',
    tier: 'premium',
    backendService: 'generateTimeline',
    apiEndpoints: ['generateTimeline'],
    estimatedProcessingTime: 40,
    costPerExecution: 8,
    requiresAuth: true
  },
  {
    id: 'dynamicQRCode',
    name: 'Dynamic QR Codes',
    description: 'Analytics-enabled QR codes with tracking and customization',
    category: 'interactive',
    tier: 'premium',
    backendService: 'enhancedQR',
    apiEndpoints: ['enhancedQR', 'qrCodeEnhancement'],
    usageLimits: { free: 0, premium: 10, enterprise: 50 },
    estimatedProcessingTime: 10,
    costPerExecution: 3,
    requiresAuth: true
  },
  {
    id: 'availabilityCalendar',
    name: 'Availability Calendar',
    description: 'Integrated calendar for interview scheduling',
    category: 'interactive',
    tier: 'premium',
    backendService: 'calendarIntegration',
    apiEndpoints: ['calendarIntegration', 'generateAvailabilityCalendar'],
    estimatedProcessingTime: 20,
    costPerExecution: 4,
    requiresAuth: true
  },
  {
    id: 'socialMediaLinks',
    name: 'Social Media Integration',
    description: 'Enhanced social profile integration with analytics',
    category: 'interactive',
    tier: 'premium',
    backendService: 'socialMedia',
    apiEndpoints: ['socialMedia'],
    estimatedProcessingTime: 15,
    costPerExecution: 5,
    requiresAuth: true
  },

  // ========== MEDIA FEATURES (Premium) ==========
  {
    id: 'portfolioGallery',
    name: 'Portfolio Gallery',
    description: 'Visual portfolio showcase with media management',
    category: 'media',
    tier: 'premium',
    backendService: 'portfolioGallery',
    apiEndpoints: ['portfolioGallery'],
    usageLimits: { free: 0, premium: 20, enterprise: 100 },
    estimatedProcessingTime: 25,
    costPerExecution: 6,
    requiresAuth: true
  },
  {
    id: 'videoIntroduction',
    name: 'Video Introduction',
    description: 'AI-generated video introduction with avatar',
    category: 'media',
    tier: 'premium',
    backendService: 'generateVideoIntroduction',
    apiEndpoints: ['generateVideoIntroduction', 'runwayml-status-check'],
    usageLimits: { free: 0, premium: 2, enterprise: 10 },
    estimatedProcessingTime: 300,
    costPerExecution: 50,
    requiresAuth: true
  },
  {
    id: 'testimonialsCarousel',
    name: 'Testimonials Carousel',
    description: 'AI-generated professional testimonials display',
    category: 'media',
    tier: 'premium',
    backendService: 'testimonials',
    apiEndpoints: ['testimonials'],
    estimatedProcessingTime: 35,
    costPerExecution: 12,
    requiresAuth: true
  },

  // ========== VISUAL FEATURES (Premium) ==========
  {
    id: 'skillsVisualization',
    name: 'Skills Visualization',
    description: 'Interactive charts and graphs for skills representation',
    category: 'visual',
    tier: 'premium',
    backendService: 'skillsVisualization',
    apiEndpoints: ['skillsVisualization'],
    estimatedProcessingTime: 20,
    costPerExecution: 5,
    requiresAuth: true
  },
  {
    id: 'achievementCards',
    name: 'Achievement Cards',
    description: 'Visual achievement highlights with impact metrics',
    category: 'visual',
    tier: 'premium',
    backendService: 'achievementHighlighting',
    estimatedProcessingTime: 30,
    costPerExecution: 8,
    requiresAuth: true
  },
  {
    id: 'certificationBadges',
    name: 'Certification Badges',
    description: 'Professional certification display with verification',
    category: 'visual',
    tier: 'premium',
    backendService: 'certificationBadges',
    apiEndpoints: ['certificationBadges'],
    estimatedProcessingTime: 15,
    costPerExecution: 4,
    requiresAuth: true
  },
  {
    id: 'languageProficiency',
    name: 'Language Proficiency',
    description: 'Visual language skills assessment and display',
    category: 'visual',
    tier: 'premium',
    backendService: 'languageProficiency',
    apiEndpoints: ['languageProficiency'],
    estimatedProcessingTime: 10,
    costPerExecution: 3,
    requiresAuth: true
  },

  // ========== ANALYTICS FEATURES (Premium/Enterprise) ==========
  {
    id: 'advancedAnalytics',
    name: 'Advanced Analytics',
    description: 'Comprehensive CV performance and engagement analytics',
    category: 'analytics',
    tier: 'premium',
    backendService: 'getConversionMetrics',
    apiEndpoints: ['getConversionMetrics', 'getExternalDataAnalytics'],
    estimatedProcessingTime: 10,
    costPerExecution: 2,
    requiresAuth: true
  },
  {
    id: 'outcomeTracking',
    name: 'Outcome Tracking',
    description: 'Track interview rates, responses, and success metrics',
    category: 'analytics',
    tier: 'premium',
    backendService: 'trackOutcome',
    apiEndpoints: ['trackOutcome', 'predictSuccess'],
    estimatedProcessingTime: 5,
    costPerExecution: 1,
    requiresAuth: true
  },

  // ========== ENTERPRISE FEATURES ==========
  {
    id: 'publicProfile',
    name: 'Public Web Profiles',
    description: 'Generate public web profiles with custom domains',
    category: 'interactive',
    tier: 'enterprise',
    backendService: 'generateWebPortal',
    apiEndpoints: ['generateWebPortal', 'cvPortalIntegration'],
    usageLimits: { free: 0, premium: 1, enterprise: 10 },
    estimatedProcessingTime: 180,
    costPerExecution: 30,
    requiresAuth: true
  },
  {
    id: 'contactForm',
    name: 'Contact Form Integration',
    description: 'Embedded contact forms with lead management',
    category: 'interactive',
    tier: 'premium',
    backendService: 'sendSchedulingEmail',
    apiEndpoints: ['sendSchedulingEmail', 'bookMeeting'],
    estimatedProcessingTime: 15,
    costPerExecution: 2,
    requiresAuth: true
  },
  {
    id: 'roleDetection',
    name: 'AI Role Detection',
    description: 'Automatic detection of target roles and optimization',
    category: 'ai-powered',
    tier: 'premium',
    backendService: 'role-profile.functions',
    estimatedProcessingTime: 25,
    costPerExecution: 10,
    requiresAuth: true
  },
  {
    id: 'externalDataIntegration',
    name: 'External Data Integration',
    description: 'LinkedIn, GitHub, and other platform data integration',
    category: 'ai-powered',
    tier: 'premium',
    backendService: 'enrichCVWithExternalData',
    apiEndpoints: ['enrichCVWithExternalData', 'trackExternalDataUsage'],
    estimatedProcessingTime: 60,
    costPerExecution: 15,
    requiresAuth: true
  }
];

/**
 * Backend Feature Registry Helper Class
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
   * Get features by backend service
   */
  static getFeaturesByService(serviceName: string): CVFeature[] {
    return CV_FEATURES.filter(feature => feature.backendService === serviceName);
  }

  /**
   * Get features by API endpoint
   */
  static getFeaturesByEndpoint(endpoint: string): CVFeature[] {
    return CV_FEATURES.filter(feature => 
      feature.apiEndpoints?.includes(endpoint)
    );
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
   * Get estimated cost for feature execution
   */
  static getExecutionCost(featureId: string): number {
    const feature = this.getFeature(featureId);
    return feature?.costPerExecution ?? 0;
  }

  /**
   * Validate feature requirements
   */
  static validateFeatureRequirements(featureId: string, userAuth: boolean): {
    valid: boolean;
    reasons: string[];
  } {
    const feature = this.getFeature(featureId);
    const reasons: string[] = [];

    if (!feature) {
      reasons.push('Feature not found');
      return { valid: false, reasons };
    }

    if (feature.requiresAuth && !userAuth) {
      reasons.push('Authentication required');
    }

    return {
      valid: reasons.length === 0,
      reasons
    };
  }

  /**
   * Get premium features (non-free)
   */
  static getPremiumFeatures(): CVFeature[] {
    return CV_FEATURES.filter(f => f.tier !== 'free');
  }

  /**
   * Get enterprise-only features
   */
  static getEnterpriseFeatures(): CVFeature[] {
    return CV_FEATURES.filter(f => f.tier === 'enterprise');
  }

  /**
   * Get high-cost features (for monitoring)
   */
  static getHighCostFeatures(threshold: number = 20): CVFeature[] {
    return CV_FEATURES.filter(f => (f.costPerExecution ?? 0) >= threshold);
  }

  /**
   * Get features requiring specific dependencies
   */
  static getFeaturesWithDependencies(): CVFeature[] {
    return CV_FEATURES.filter(f => f.dependencies && f.dependencies.length > 0);
  }

  /**
   * Calculate total cost for feature list
   */
  static calculateTotalCost(featureIds: string[]): number {
    return featureIds.reduce((total, featureId) => {
      return total + this.getExecutionCost(featureId);
    }, 0);
  }

  /**
   * Get feature statistics
   */
  static getFeatureStatistics(): {
    totalFeatures: number;
    byTier: Record<string, number>;
    byCategory: Record<string, number>;
    averageCost: number;
    highCostFeatures: number;
  } {
    const byTier: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalCost = 0;
    let costFeatures = 0;

    CV_FEATURES.forEach(feature => {
      byTier[feature.tier] = (byTier[feature.tier] || 0) + 1;
      byCategory[feature.category] = (byCategory[feature.category] || 0) + 1;
      
      if (feature.costPerExecution) {
        totalCost += feature.costPerExecution;
        costFeatures++;
      }
    });

    return {
      totalFeatures: CV_FEATURES.length,
      byTier,
      byCategory,
      averageCost: costFeatures > 0 ? totalCost / costFeatures : 0,
      highCostFeatures: this.getHighCostFeatures().length
    };
  }
}

export default FeatureRegistry;