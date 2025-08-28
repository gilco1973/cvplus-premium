/**
 * CVPlus PayPal Success Handler Component
 * Handles PayPal payment success callbacks and order capture
 */

import React, { useEffect, useState } from 'react';
import { PaymentResult } from '../../../payments/src/types';

interface PayPalSuccessHandlerProps {
  /** PayPal order ID from URL parameters */
  orderId: string;
  
  /** PayPal payer ID from URL parameters */
  payerId?: string;
  
  /** Success callback with payment result */
  onSuccess: (result: PaymentResult) => void;
  
  /** Error callback */
  onError: (error: Error) => void;
  
  /** Firebase functions base URL */
  functionsBaseUrl?: string;
  
  /** Custom styling */
  className?: string;
}

interface CaptureOrderResponse {
  success: boolean;
  order_id: string;
  payment_intent: any;
  transaction_id: string;
  status: string;
  captured_at: string;
  error?: string;
}

/**
 * PayPal Success Handler Component
 */
export const PayPalSuccessHandler: React.FC<PayPalSuccessHandlerProps> = ({
  orderId,
  payerId,
  onSuccess,
  onError,
  functionsBaseUrl = '',
  className = '',
}) => {
  const [captureState, setCaptureState] = useState<'capturing' | 'success' | 'error'>('capturing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captureResult, setCaptureResult] = useState<PaymentResult | null>(null);

  // Capture PayPal order
  useEffect(() => {
    const captureOrder = async () => {
      try {
        setCaptureState('capturing');
        setErrorMessage(null);

        // Call Firebase function to capture the order
        const captureResponse = await fetch(`${functionsBaseUrl}/capturePayPalOrder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`, // Implement your auth token retrieval
          },
          body: JSON.stringify({
            order_id: orderId,
            payer_id: payerId,
          }),
        });

        if (!captureResponse.ok) {
          throw new Error(`HTTP error! status: ${captureResponse.status}`);
        }

        const captureData: CaptureOrderResponse = await captureResponse.json();

        if (!captureData.success) {
          throw new Error(captureData.error || 'Failed to capture PayPal order');
        }

        // Create payment result
        const paymentResult: PaymentResult = {
          success: true,
          payment_intent: captureData.payment_intent,
          transaction_id: captureData.transaction_id,
          client_secret: captureData.order_id,
          provider_response: captureData,
        };

        setCaptureResult(paymentResult);
        setCaptureState('success');
        onSuccess(paymentResult);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to capture PayPal order';
        setErrorMessage(errorMsg);
        setCaptureState('error');
        onError(new Error(errorMsg));
      }
    };

    if (orderId) {
      captureOrder();
    }
  }, [orderId, payerId, functionsBaseUrl, onSuccess, onError]);

  // Get authentication token (implement according to your auth system)
  const getAuthToken = async (): Promise<string> => {
    // This should integrate with your authentication system
    // For Firebase Auth, you might use:
    // const user = firebase.auth().currentUser;
    // return await user?.getIdToken() || '';
    
    // Placeholder implementation
    return '';
  };

  if (captureState === 'capturing') {
    return (
      <div className={`paypal-success-handler capturing ${className}`}>
        <div className="flex flex-col items-center justify-center min-h-64 p-8">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-top-blue-600"></div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Processing Payment</h2>
          <p className="text-gray-600 text-center max-w-md">
            We're finalizing your PayPal payment. This should only take a moment...
          </p>
          <div className="mt-6 text-sm text-gray-500">
            Order ID: {orderId}
          </div>
        </div>
      </div>
    );
  }

  if (captureState === 'success') {
    return (
      <div className={`paypal-success-handler success ${className}`}>
        <div className="flex flex-col items-center justify-center min-h-64 p-8">
          <div className="mb-6">
            <div className="rounded-full bg-green-100 p-3">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-green-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 text-center max-w-md mb-6">
            Your PayPal payment has been processed successfully. You should receive a confirmation email shortly.
          </p>
          
          {captureResult && (
            <div className="bg-gray-50 rounded-lg p-4 w-full max-w-md">
              <h3 className="font-medium text-gray-900 mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono">{captureResult.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">
                    {captureResult.payment_intent?.currency?.toUpperCase()} {captureResult.payment_intent?.amount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-medium">Completed</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (captureState === 'error') {
    return (
      <div className={`paypal-success-handler error ${className}`}>
        <div className="flex flex-col items-center justify-center min-h-64 p-8">
          <div className="mb-6">
            <div className="rounded-full bg-red-100 p-3">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-red-900 mb-2">Payment Processing Failed</h2>
          <p className="text-gray-600 text-center max-w-md mb-4">
            We encountered an issue while processing your PayPal payment.
          </p>
          
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full max-w-md mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error Details</h3>
                  <div className="text-sm text-red-700 mt-1">{errorMessage}</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            Order ID: {orderId}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PayPalSuccessHandler;