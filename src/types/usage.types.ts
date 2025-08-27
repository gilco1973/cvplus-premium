/**
 * Usage tracking types for the Premium module
 */

/**
 * Usage period types
 */
export type UsagePeriod = 'hour' | 'day' | 'week' | 'month' | 'year';

/**
 * Usage metric categories
 */
export type UsageMetricCategory = 
  | 'core' 
  | 'premium' 
  | 'api' 
  | 'storage' 
  | 'processing' 
  | 'ai';

/**
 * Extended usage metric types with categories
 */
export interface UsageMetricDefinition {
  type: string;
  category: UsageMetricCategory;
  name: string;
  description: string;
  unit: string;
  isPremiumFeature: boolean;
  costPerUnit?: number; // For future billing integration
}

/**
 * Built-in usage metrics
 */
export const USAGE_METRICS: Record<string, UsageMetricDefinition> = {
  CV_UPLOADS: {
    type: 'cv_uploads',
    category: 'core',
    name: 'CV Uploads',
    description: 'Number of CV files uploaded',
    unit: 'files',
    isPremiumFeature: false
  },
  AI_ANALYSES: {
    type: 'ai_analyses',
    category: 'ai',
    name: 'AI Analyses',
    description: 'AI-powered CV analyses performed',
    unit: 'analyses',
    isPremiumFeature: true
  },
  TEMPLATE_DOWNLOADS: {
    type: 'template_downloads',
    category: 'core',
    name: 'Template Downloads',
    description: 'CV template downloads',
    unit: 'downloads',
    isPremiumFeature: false
  },
  VIDEO_GENERATIONS: {
    type: 'video_generations',
    category: 'premium',
    name: 'Video Generations',
    description: 'AI video introduction generations',
    unit: 'videos',
    isPremiumFeature: true,
    costPerUnit: 5.00
  },
  PODCAST_GENERATIONS: {
    type: 'podcast_generations',
    category: 'premium',
    name: 'Podcast Generations',
    description: 'AI podcast generations',
    unit: 'podcasts',
    isPremiumFeature: true,
    costPerUnit: 2.50
  },
  PORTAL_VIEWS: {
    type: 'portal_views',
    category: 'premium',
    name: 'Portal Views',
    description: 'Personal web portal page views',
    unit: 'views',
    isPremiumFeature: true
  },
  API_CALLS: {
    type: 'api_calls',
    category: 'api',
    name: 'API Calls',
    description: 'External API calls made',
    unit: 'calls',
    isPremiumFeature: false
  },
  STORAGE_USED: {
    type: 'storage_used',
    category: 'storage',
    name: 'Storage Used',
    description: 'File storage consumption',
    unit: 'MB',
    isPremiumFeature: false
  },
  PROCESSING_TIME: {
    type: 'processing_time',
    category: 'processing',
    name: 'Processing Time',
    description: 'AI processing time consumed',
    unit: 'seconds',
    isPremiumFeature: true,
    costPerUnit: 0.10
  }
};

/**
 * Usage limit with flexible configuration
 */
export interface FlexibleUsageLimit {
  metricType: string;
  tier: 'free' | 'premium' | 'unlimited';
  limits: {
    [key in UsagePeriod]?: number;
  };
  resetSchedule: {
    period: UsagePeriod;
    resetTime?: string; // HH:mm format for daily resets
    resetDay?: number; // Day of week (0-6) for weekly, day of month (1-31) for monthly
  };
  overagePolicy: {
    allowed: boolean;
    rate?: number; // Cost per unit over limit
    hardLimit?: number; // Absolute maximum
  };
  notifications: {
    thresholds: number[]; // Percentage thresholds for warnings (e.g., [75, 90, 100])
    channels: ('email' | 'ui' | 'webhook')[];
  };
}

/**
 * Real-time usage tracking
 */
export interface LiveUsageData {
  userId: string;
  metricType: string;
  currentPeriod: string;
  usage: number;
  limit: number;
  percentage: number;
  remainingQuota: number;
  resetAt: Date;
  isOverLimit: boolean;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

/**
 * Usage analytics data
 */
export interface UsageAnalytics {
  userId: string;
  period: string;
  metrics: {
    [metricType: string]: {
      total: number;
      daily: Record<string, number>;
      hourly?: Record<string, number>;
      peak: {
        value: number;
        timestamp: Date;
      };
      trend: 'increasing' | 'decreasing' | 'stable';
      percentageOfLimit: number;
    };
  };
  cost: {
    total: number;
    breakdown: Record<string, number>;
    currency: string;
  };
  efficiency: {
    utilizationRate: number; // How much of their quota they use
    peakUsageTime: string; // When they use the service most
    averageSessionDuration: number; // minutes
  };
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Usage aggregation configuration
 */
export interface UsageAggregationConfig {
  metrics: string[];
  periods: UsagePeriod[];
  retentionDays: number;
  aggregationInterval: number; // minutes
  enableRealTimeUpdates: boolean;
  includeMetadata: boolean;
}

/**
 * Batch usage update
 */
export interface BatchUsageUpdate {
  userId: string;
  updates: Array<{
    metricType: string;
    increment: number;
    metadata?: Record<string, any>;
    timestamp?: Date;
  }>;
  batchId?: string;
  processedAt?: Date;
}