/**
 * CVPlus PayPal Error Handler Component
 * Handles PayPal payment errors and provides retry mechanisms
 */

import React, { useState, useCallback } from 'react';
import { PaymentError } from '../../../payments/src/types';

interface PayPalErrorHandlerProps {
  /** Payment error object */
  error: PaymentError | Error;
  
  /** Retry callback */
  onRetry?: () => void;
  
  /** Cancel callback */
  onCancel?: () => void;
  
  /** Back to payment method selection */
  onBackToSelection?: () => void;
  
  /** Custom styling */
  className?: string;
  
  /** Show detailed error information */
  showDetails?: boolean;
  
  /** Enable automatic retry */
  autoRetry?: boolean;
  
  /** Maximum retry attempts */
  maxRetryAttempts?: number;
}

/**
 * Error category classification
 */
type ErrorCategory = 'network' | 'validation' | 'authorization' | 'provider' | 'system';

interface ErrorInfo {
  category: ErrorCategory;
  title: string;
  description: string;
  userAction: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high';
}

/**
 * PayPal Error Handler Component
 */
export const PayPalErrorHandler: React.FC<PayPalErrorHandlerProps> = ({
  error,
  onRetry,
  onCancel,
  onBackToSelection,
  className = '',
  showDetails = false,
  autoRetry = false,
  maxRetryAttempts = 3,
}) => {
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Classify error and get appropriate handling info
  const getErrorInfo = useCallback((error: PaymentError | Error): ErrorInfo => {
    const errorMessage = error.message.toLowerCase();
    
    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection') || 
        errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return {
        category: 'network',
        title: 'Connection Issue',
        description: 'There was a problem connecting to PayPal services. This is usually temporary.',
        userAction: 'Check your internet connection and try again.',
        retryable: true,
        severity: 'medium',
      };
    }
    
    // Validation errors
    if (errorMessage.includes('invalid') || errorMessage.includes('required') || 
        errorMessage.includes('validation') || errorMessage.includes('format')) {
      return {
        category: 'validation',
        title: 'Invalid Payment Information',
        description: 'The payment information provided is not valid.',
        userAction: 'Please check your payment details and try again.',
        retryable: true,
        severity: 'low',
      };
    }
    
    // Authorization errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('permission') || 
        errorMessage.includes('access') || errorMessage.includes('token')) {
      return {
        category: 'authorization',
        title: 'Authorization Failed',
        description: 'There was an issue with payment authorization.',
        userAction: 'Please log in again and retry the payment.',
        retryable: false,
        severity: 'high',
      };
    }
    
    // PayPal provider errors
    if (errorMessage.includes('paypal') || errorMessage.includes('declined') || 
        errorMessage.includes('insufficient') || errorMessage.includes('cancelled')) {
      return {
        category: 'provider',
        title: 'PayPal Payment Issue',
        description: 'PayPal was unable to process your payment.',
        userAction: 'Try a different payment method or contact PayPal support.',
        retryable: true,
        severity: 'medium',
      };
    }
    
    // System errors
    return {
      category: 'system',
      title: 'System Error',
      description: 'An unexpected error occurred while processing your payment.',
      userAction: 'Please try again or contact support if the problem persists.',
      retryable: true,
      severity: 'high',
    };
  }, []);

  const errorInfo = getErrorInfo(error);

  // Handle retry with exponential backoff
  const handleRetry = useCallback(async () => {
    if (!onRetry || retryAttempts >= maxRetryAttempts) return;
    
    setIsRetrying(true);
    setRetryAttempts(prev => prev + 1);
    
    // Exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, retryAttempts), 5000);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, retryAttempts, maxRetryAttempts]);

  // Auto retry for certain error types
  React.useEffect(() => {
    if (autoRetry && errorInfo.retryable && retryAttempts < maxRetryAttempts && 
        errorInfo.category === 'network') {
      const timer = setTimeout(handleRetry, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoRetry, errorInfo, retryAttempts, maxRetryAttempts, handleRetry]);

  // Get error severity styling
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Get error icon
  const getErrorIcon = (category: ErrorCategory) => {
    switch (category) {
      case 'network':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case 'validation':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'authorization':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'provider':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`paypal-error-handler ${className}`}>
      <div className="flex flex-col items-center justify-center min-h-64 p-8">
        {/* Error Icon */}
        <div className={`mb-6 p-3 rounded-full ${getSeverityStyles(errorInfo.severity)}`}>
          {getErrorIcon(errorInfo.category)}
        </div>
        
        {/* Error Title */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          {errorInfo.title}
        </h2>
        
        {/* Error Description */}
        <p className="text-gray-600 text-center max-w-md mb-4">
          {errorInfo.description}
        </p>
        
        {/* User Action */}
        <p className="text-sm text-gray-700 text-center max-w-md mb-6 font-medium">
          {errorInfo.userAction}
        </p>
        
        {/* Retry Information */}
        {retryAttempts > 0 && (
          <div className="mb-4 text-sm text-gray-500">
            Retry attempts: {retryAttempts} of {maxRetryAttempts}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="space-y-3 w-full max-w-xs">
          {/* Retry Button */}
          {errorInfo.retryable && onRetry && retryAttempts < maxRetryAttempts && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRetrying ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Retrying...
                </div>
              ) : (
                `Retry Payment ${retryAttempts > 0 ? `(${maxRetryAttempts - retryAttempts} left)` : ''}`
              )}
            </button>
          )}
          
          {/* Back to Selection Button */}
          {onBackToSelection && (
            <button
              onClick={onBackToSelection}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Try Different Payment Method
            </button>
          )}
          
          {/* Cancel Button */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel Payment
            </button>
          )}
        </div>
        
        {/* Error Details Toggle */}
        {showDetails && (
          <div className="mt-6 w-full max-w-md">
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {showFullDetails ? 'Hide' : 'Show'} Error Details
            </button>
            
            {showFullDetails && (
              <div className="mt-3 p-3 bg-gray-100 rounded-lg text-xs font-mono text-gray-700 break-words">
                <div className="mb-2">
                  <strong>Error Type:</strong> {errorInfo.category}
                </div>
                <div className="mb-2">
                  <strong>Message:</strong> {error.message}
                </div>
                {'code' in error && error.code && (
                  <div className="mb-2">
                    <strong>Code:</strong> {error.code}
                  </div>
                )}
                {'context' in error && error.context && (
                  <div>
                    <strong>Context:</strong> {JSON.stringify(error.context, null, 2)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Support Information */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>If this problem continues, please contact our support team.</p>
          <p>Error ID: {Date.now().toString(36)}</p>
        </div>
      </div>
    </div>
  );
};

export default PayPalErrorHandler;