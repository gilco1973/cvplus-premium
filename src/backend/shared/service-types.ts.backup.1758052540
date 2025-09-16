/**
 * Service Type Definitions
 * 
 * Shared type definitions for the service layer architecture.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Re-export core types from @cvplus/core if available, otherwise define locally
export interface ServiceError extends Error {
  code: string;
  context?: Record<string, any>;
  originalError?: Error;
  timestamp?: Date;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: Record<string, any>;
}

export interface ServiceOperation<TInput = any, TOutput = any> {
  name: string;
  input: TInput;
  output?: TOutput;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success?: boolean;
  error?: ServiceError;
}

export interface ServiceMetrics {
  operationsCount: number;
  successRate: number;
  averageResponseTime: number;
  lastOperationTime?: Date;
  errors: ServiceError[];
}

export interface ServiceDependency {
  serviceName: string;
  required: boolean;
  version?: string;
  healthCheckUrl?: string;
}

export interface ServiceConfiguration {
  name: string;
  version: string;
  enabled: boolean;
  dependencies: ServiceDependency[];
  config: Record<string, any>;
  secrets?: string[];
}

// Service Event Types
export type ServiceEventType = 
  | 'service.initialized'
  | 'service.started' 
  | 'service.stopped'
  | 'service.error'
  | 'operation.started'
  | 'operation.completed'
  | 'operation.failed';

export interface ServiceEvent {
  type: ServiceEventType;
  serviceName: string;
  timestamp: Date;
  data?: Record<string, any>;
  error?: ServiceError;
}

// CV Processing Types
export interface CVProcessingContext {
  jobId: string;
  userId: string;
  cvData: any;
  templateId?: string;
  features?: string[];
  metadata?: Record<string, any>;
}

export interface CVGenerationResult {
  jobId: string;
  success: boolean;
  generatedFiles?: {
    html?: string;
    pdf?: string;
    docx?: string;
  };
  downloadUrls?: Record<string, string>;
  metadata?: Record<string, any>;
  error?: ServiceError;
}

// Media Processing Types
export interface MediaProcessingContext {
  userId: string;
  jobId?: string;
  mediaType: 'video' | 'audio' | 'image';
  inputData: any;
  outputFormat?: string;
  quality?: 'low' | 'medium' | 'high';
}

export interface MediaGenerationResult {
  success: boolean;
  mediaUrl?: string;
  downloadUrl?: string;
  metadata?: {
    duration?: number;
    size?: number;
    format?: string;
    resolution?: string;
  };
  error?: ServiceError;
}

// Analytics Types
export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  properties: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AnalyticsResult {
  success: boolean;
  metrics?: Record<string, number>;
  data?: any[];
  error?: ServiceError;
}

// Payment Types
export interface PaymentContext {
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId?: string;
  subscriptionId?: string;
  features?: string[];
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  subscriptionId?: string;
  status?: string;
  error?: ServiceError;
}

// Error Codes
export const SERVICE_ERROR_CODES = {
  // General Service Errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT: 'SERVICE_TIMEOUT',
  SERVICE_CONFIGURATION_ERROR: 'SERVICE_CONFIGURATION_ERROR',
  
  // CV Processing Errors
  CV_GENERATION_FAILED: 'CV_GENERATION_FAILED',
  CV_ANALYSIS_FAILED: 'CV_ANALYSIS_FAILED',
  CV_TEMPLATE_NOT_FOUND: 'CV_TEMPLATE_NOT_FOUND',
  CV_VALIDATION_FAILED: 'CV_VALIDATION_FAILED',
  
  // Media Processing Errors
  MEDIA_GENERATION_FAILED: 'MEDIA_GENERATION_FAILED',
  MEDIA_PROCESSING_FAILED: 'MEDIA_PROCESSING_FAILED',
  MEDIA_UPLOAD_FAILED: 'MEDIA_UPLOAD_FAILED',
  
  // Payment Errors
  PAYMENT_PROCESSING_FAILED: 'PAYMENT_PROCESSING_FAILED',
  SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ERROR',
  FEATURE_ACCESS_DENIED: 'FEATURE_ACCESS_DENIED',
  
  // Analytics Errors
  ANALYTICS_TRACKING_FAILED: 'ANALYTICS_TRACKING_FAILED',
  METRICS_CALCULATION_FAILED: 'METRICS_CALCULATION_FAILED'
} as const;

export type ServiceErrorCode = typeof SERVICE_ERROR_CODES[keyof typeof SERVICE_ERROR_CODES];

// Utility type helpers
export type PromiseResult<T> = Promise<ServiceResult<T>>;
export type ServiceFunction<TInput, TOutput> = (input: TInput) => PromiseResult<TOutput>;