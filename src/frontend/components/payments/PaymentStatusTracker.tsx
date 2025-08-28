/**
 * CVPlus Payment Status Tracker Component
 * Phase 5-6: Service Integration & Frontend
 * 
 * Real-time payment status tracking with WebSocket integration,
 * visual progress indicators, and retry actions.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PaymentProviderName,
  PaymentStatus,
  PaymentIntent,
  PaymentError
} from '../../../types/payments.types';

// Status tracker specific types
interface PaymentStatusUpdate {
  paymentIntentId: string;
  status: PaymentStatus;
  provider: PaymentProviderName;
  timestamp: Date;
  message?: string;
  metadata?: Record<string, any>;
}

interface PaymentStatusTrackerProps {
  /** Payment intent to track */
  paymentIntent: PaymentIntent;
  
  /** Enable real-time updates via WebSocket */
  enableRealTimeUpdates?: boolean;
  
  /** Show detailed progress steps */
  showDetailedProgress?: boolean;
  
  /** Enable retry actions for failed payments */
  enableRetryActions?: boolean;
  
  /** Auto-hide after successful completion */
  autoHideOnSuccess?: boolean;
  
  /** Auto-hide delay in milliseconds */
  autoHideDelay?: number;
  
  /** Status update callback */
  onStatusUpdate?: (update: PaymentStatusUpdate) => void;
  
  /** Payment completion callback */
  onPaymentComplete?: (success: boolean, finalStatus: PaymentStatus) => void;
  
  /** Retry payment callback */
  onRetryPayment?: () => Promise<void>;
  
  /** Custom styling */
  className?: string;
}

interface StatusStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  timestamp?: Date;
  error?: string;
}

/**
 * Payment Status Tracker Component
 */
export const PaymentStatusTracker: React.FC<PaymentStatusTrackerProps> = ({
  paymentIntent,
  enableRealTimeUpdates = true,
  showDetailedProgress = true,
  enableRetryActions = true,
  autoHideOnSuccess = false,
  autoHideDelay = 5000,
  onStatusUpdate,
  onPaymentComplete,
  onRetryPayment,
  className = ''
}) => {
  const [currentStatus, setCurrentStatus] = useState<PaymentStatus>(paymentIntent.status);
  const [statusHistory, setStatusHistory] = useState<PaymentStatusUpdate[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRetrying, setIsRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date>(new Date());
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // STATUS STEP MAPPING
  // =============================================================================

  const getStatusSteps = useCallback((status: PaymentStatus, provider: PaymentProviderName): StatusStep[] => {
    const baseSteps: StatusStep[] = [
      {
        id: 'initiated',
        label: 'Payment Initiated',
        description: 'Payment request has been created',
        status: 'completed'
      },
      {
        id: 'processing',
        label: 'Processing Payment',
        description: `Processing payment via ${provider}`,
        status: status === 'processing' ? 'active' : 
                ['succeeded', 'failed', 'canceled'].includes(status) ? 'completed' : 'pending'
      }
    ];

    // Provider-specific steps
    if (provider === 'stripe') {
      baseSteps.push({
        id: 'authentication',
        label: 'Authentication',
        description: 'Verifying payment method',
        status: status === 'requires_action' ? 'active' :
                ['succeeded', 'failed'].includes(status) ? 'completed' : 'pending'
      });
    } else if (provider === 'paypal') {
      baseSteps.push({
        id: 'redirect',
        label: 'PayPal Redirect',
        description: 'Redirecting to PayPal for authorization',
        status: status === 'requires_action' ? 'active' :
                ['succeeded', 'failed'].includes(status) ? 'completed' : 'pending'
      });
    }

    // Final step
    baseSteps.push({
      id: 'completion',
      label: status === 'succeeded' ? 'Payment Successful' : 
             status === 'failed' ? 'Payment Failed' :
             status === 'canceled' ? 'Payment Canceled' : 'Completion',
      description: status === 'succeeded' ? 'Payment has been processed successfully' :
                   status === 'failed' ? 'Payment processing failed' :
                   status === 'canceled' ? 'Payment was canceled' :
                   'Waiting for payment completion',
      status: status === 'succeeded' ? 'completed' :
              status === 'failed' ? 'failed' :
              status === 'canceled' ? 'failed' : 'pending'
    });

    return baseSteps;
  }, []);

  // =============================================================================
  // WEBSOCKET CONNECTION
  // =============================================================================

  const connectWebSocket = useCallback(() => {
    if (!enableRealTimeUpdates || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    // Create WebSocket connection (URL would be environment-specific)
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/payments/${paymentIntent.id}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setConnectionStatus('connected');
      console.log('Payment status WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const update: PaymentStatusUpdate = JSON.parse(event.data);
        handleStatusUpdate(update);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('Payment status WebSocket disconnected');
      
      // Attempt to reconnect after delay if payment is still processing
      if (!['succeeded', 'failed', 'canceled'].includes(currentStatus)) {
        setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('Payment status WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
  }, [enableRealTimeUpdates, paymentIntent.id, currentStatus]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // =============================================================================
  // STATUS UPDATES
  // =============================================================================

  const handleStatusUpdate = useCallback((update: PaymentStatusUpdate) => {
    setCurrentStatus(update.status);
    setLastUpdate(update.timestamp);
    
    // Add to status history
    setStatusHistory(prev => [
      ...prev.filter(h => h.status !== update.status), // Remove duplicate statuses
      update
    ]);

    // Call external callback
    if (onStatusUpdate) {
      onStatusUpdate(update);
    }

    // Check for completion
    const finalStatuses: PaymentStatus[] = ['succeeded', 'failed', 'canceled'];
    if (finalStatuses.includes(update.status)) {
      if (onPaymentComplete) {
        onPaymentComplete(update.status === 'succeeded', update.status);
      }
      
      // Auto-hide on success
      if (autoHideOnSuccess && update.status === 'succeeded') {
        autoHideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, autoHideDelay);
      }
      
      // Stop timer and disconnect WebSocket
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      disconnectWebSocket();
    }
  }, [onStatusUpdate, onPaymentComplete, autoHideOnSuccess, autoHideDelay, disconnectWebSocket]);

  // Fallback status polling for when WebSocket is not available
  const pollPaymentStatus = useCallback(async () => {
    if (enableRealTimeUpdates && connectionStatus === 'connected') {
      return; // WebSocket is handling updates
    }

    try {
      // Mock API call - would be replaced with actual service call
      const response = await fetch(`/api/payments/${paymentIntent.id}/status`);
      const data = await response.json();
      
      const update: PaymentStatusUpdate = {
        paymentIntentId: paymentIntent.id,
        status: data.status,
        provider: paymentIntent.payment_method?.type === 'paypal' ? 'paypal' : 'stripe',
        timestamp: new Date(),
        message: data.message,
        metadata: data.metadata
      };
      
      handleStatusUpdate(update);
    } catch (error) {
      console.error('Failed to poll payment status:', error);
    }
  }, [enableRealTimeUpdates, connectionStatus, paymentIntent.id, handleStatusUpdate]);

  // =============================================================================
  // RETRY FUNCTIONALITY
  // =============================================================================

  const handleRetry = useCallback(async () => {
    if (!onRetryPayment || isRetrying) return;
    
    setIsRetrying(true);
    
    try {
      await onRetryPayment();
      
      // Reset status tracking
      setCurrentStatus('processing');
      setStatusHistory([]);
      startTimeRef.current = new Date();
      setTimeElapsed(0);
      
      // Restart timer and WebSocket
      startTimer();
      connectWebSocket();
    } catch (error) {
      console.error('Payment retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetryPayment, isRetrying, connectWebSocket]);

  // =============================================================================
  // TIMER FUNCTIONALITY
  // =============================================================================

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
      setTimeElapsed(elapsed);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Initialize tracking on mount
  useEffect(() => {
    startTimer();
    
    if (enableRealTimeUpdates) {
      connectWebSocket();
    } else {
      // Start polling
      const pollInterval = setInterval(pollPaymentStatus, 2000);
      return () => clearInterval(pollInterval);
    }
    
    return () => {
      stopTimer();
      disconnectWebSocket();
    };
  }, [enableRealTimeUpdates, connectWebSocket, pollPaymentStatus, startTimer, stopTimer, disconnectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, []);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'succeeded':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'failed':
      case 'canceled':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'requires_action':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
            <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = (status: PaymentStatus): string => {
    switch (status) {
      case 'succeeded': return 'text-green-600';
      case 'failed':
      case 'canceled': return 'text-red-600';
      case 'requires_action': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  };

  const getStatusMessage = (status: PaymentStatus): string => {
    switch (status) {
      case 'pending': return 'Payment is being initialized...';
      case 'processing': return 'Processing your payment...';
      case 'requires_action': return 'Additional authentication required';
      case 'requires_confirmation': return 'Please confirm your payment';
      case 'succeeded': return 'Payment completed successfully!';
      case 'failed': return 'Payment failed. Please try again.';
      case 'canceled': return 'Payment was canceled.';
      default: return 'Processing payment...';
    }
  };

  const renderProgressSteps = () => {
    if (!showDetailedProgress) return null;
    
    const steps = getStatusSteps(currentStatus, paymentIntent.payment_method?.type === 'paypal' ? 'paypal' : 'stripe');
    
    return (
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';
          const isFailed = step.status === 'failed';
          
          return (
            <div key={step.id} className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <div className={`w-3 h-3 rounded-full border-2 ${
                  isCompleted ? 'bg-green-500 border-green-500' :
                  isActive ? 'bg-blue-500 border-blue-500 animate-pulse' :
                  isFailed ? 'bg-red-500 border-red-500' :
                  'bg-white border-gray-300'
                }`} />
                {index < steps.length - 1 && (
                  <div className={`w-px h-8 ml-1 mt-1 ${
                    isCompleted ? 'bg-green-200' : 'bg-gray-200'
                  }`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isCompleted ? 'text-green-600' :
                  isActive ? 'text-blue-600' :
                  isFailed ? 'text-red-600' :
                  'text-gray-400'
                }`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                {step.timestamp && (
                  <p className="text-xs text-gray-400 mt-1">
                    {step.timestamp.toLocaleTimeString()}
                  </p>
                )}
                {step.error && (
                  <p className="text-xs text-red-600 mt-1">{step.error}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`payment-status-tracker ${className}`}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            {getStatusIcon(currentStatus)}
            <div className="ml-3">
              <h3 className={`text-lg font-semibold ${getStatusColor(currentStatus)}`}>
                {getStatusMessage(currentStatus)}
              </h3>
              <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                <span>Time elapsed: {formatTime(timeElapsed)}</span>
                <span>•</span>
                <span className="capitalize">{paymentIntent.payment_method?.type || 'card'} payment</span>
                {enableRealTimeUpdates && (
                  <>
                    <span>•</span>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        connectionStatus === 'connected' ? 'bg-green-400' :
                        connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                        'bg-red-400'
                      }`} />
                      <span className="text-xs">
                        {connectionStatus === 'connected' ? 'Live updates' :
                         connectionStatus === 'connecting' ? 'Connecting...' :
                         'Disconnected'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar for simple view */}
        {!showDetailedProgress && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentStatus === 'succeeded' ? 'bg-green-500 w-full' :
                  currentStatus === 'failed' || currentStatus === 'canceled' ? 'bg-red-500 w-full' :
                  currentStatus === 'processing' ? 'bg-blue-500 w-3/4 animate-pulse' :
                  currentStatus === 'requires_action' ? 'bg-orange-500 w-1/2' :
                  'bg-blue-500 w-1/4'
                }`}
              />
            </div>
          </div>
        )}

        {/* Detailed progress steps */}
        {renderProgressSteps()}

        {/* Transaction details */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Transaction ID:</span>
            <span className="text-sm text-gray-900 font-mono">{paymentIntent.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Amount:</span>
            <span className="text-sm text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: paymentIntent.currency
              }).format(paymentIntent.amount / 100)}
            </span>
          </div>
          {lastUpdate && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Last updated:</span>
              <span className="text-sm text-gray-900">{lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-between items-center">
          <div>
            {currentStatus === 'requires_action' && (
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                Complete Authentication
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {enableRetryActions && (currentStatus === 'failed' || currentStatus === 'canceled') && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isRetrying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isRetrying ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Retrying...
                  </div>
                ) : (
                  'Retry Payment'
                )}
              </button>
            )}
            
            <button
              onClick={() => setIsVisible(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {currentStatus === 'succeeded' ? 'Close' : 'Minimize'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusTracker;