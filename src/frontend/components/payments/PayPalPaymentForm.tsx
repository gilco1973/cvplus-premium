/**
 * CVPlus PayPal Payment Form Component
 * Complete PayPal payment form with order creation and processing
 */

import React, { useState, useCallback, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { PaymentRequest, PaymentResult } from '../../../payments/src/types';

interface PayPalPaymentFormProps {
  /** PayPal client ID */
  clientId: string;
  
  /** Environment (sandbox or production) */
  environment: 'sandbox' | 'production';
  
  /** Payment request data */
  paymentRequest: PaymentRequest;
  
  /** Success callback with payment result */
  onPaymentSuccess: (result: PaymentResult) => void;
  
  /** Error callback */
  onPaymentError: (error: Error) => void;
  
  /** Cancel callback */
  onPaymentCancel?: () => void;
  
  /** Custom styling */
  className?: string;
  
  /** Show payment summary */
  showSummary?: boolean;
}

interface PaymentSummaryProps {
  paymentRequest: PaymentRequest;
}

/**
 * Payment Summary Component
 */
const PaymentSummary: React.FC<PaymentSummaryProps> = ({ paymentRequest }) => (
  <div className="bg-gray-50 p-4 rounded-lg mb-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Summary</h3>
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Description:</span>
        <span className="font-medium">{paymentRequest.description || 'CVPlus Payment'}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Amount:</span>
        <span className="font-semibold text-xl">
          {paymentRequest.currency.toUpperCase()} {paymentRequest.amount.toFixed(2)}
        </span>
      </div>
      {paymentRequest.metadata?.invoice_id && (
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Invoice ID:</span>
          <span className="font-mono text-sm">{paymentRequest.metadata.invoice_id}</span>
        </div>
      )}
    </div>
  </div>
);

/**
 * PayPal Payment Form Component
 */
export const PayPalPaymentForm: React.FC<PayPalPaymentFormProps> = ({
  clientId,
  environment,
  paymentRequest,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  className = '',
  showSummary = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'ready' | 'processing' | 'completed' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PayPal script options
  const paypalScriptOptions = {
    'client-id': clientId,
    currency: paymentRequest.currency.toUpperCase(),
    intent: 'capture',
    'data-page-type': 'product-details',
    'data-user-id-token': paymentRequest.customerId,
  };

  // Create PayPal order
  const createOrder = useCallback(
    (data: any, actions: any) => {
      setIsLoading(true);
      setPaymentStep('processing');
      setErrorMessage(null);
      
      return actions.order.create({
        purchase_units: [{
          amount: {
            currency_code: paymentRequest.currency.toUpperCase(),
            value: paymentRequest.amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: paymentRequest.currency.toUpperCase(),
                value: paymentRequest.amount.toFixed(2),
              },
            },
          },
          description: paymentRequest.description || 'CVPlus Premium Service',
          custom_id: paymentRequest.metadata?.custom_id || `cvplus_${Date.now()}`,
          invoice_id: paymentRequest.metadata?.invoice_id,
          items: [{
            name: paymentRequest.description || 'CVPlus Premium Service',
            unit_amount: {
              currency_code: paymentRequest.currency.toUpperCase(),
              value: paymentRequest.amount.toFixed(2),
            },
            quantity: '1',
            category: 'DIGITAL_GOODS',
          }],
        }],
        application_context: {
          brand_name: 'CVPlus',
          locale: 'en-US',
          landing_page: 'LOGIN',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
          return_url: `${window.location.origin}/payment/success`,
          cancel_url: `${window.location.origin}/payment/cancel`,
        },
      });
    },
    [paymentRequest]
  );

  // Approve PayPal payment
  const onApprove = useCallback(
    async (data: any, actions: any) => {
      try {
        const details = await actions.order.capture();
        setIsLoading(false);
        setPaymentStep('completed');
        
        const paymentResult: PaymentResult = {
          success: true,
          payment_intent: {
            id: data.orderID,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            status: 'succeeded' as any,
            client_secret: data.orderID,
            customer_id: paymentRequest.customerId,
            description: paymentRequest.description,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {
              ...paymentRequest.metadata,
              paypal_order_id: data.orderID,
              payer_id: details.payer?.payer_id,
              payer_email: details.payer?.email_address,
            },
          },
          client_secret: data.orderID,
          transaction_id: data.orderID,
          provider_response: details,
        };
        
        onPaymentSuccess(paymentResult);
      } catch (error) {
        setIsLoading(false);
        setPaymentStep('error');
        const errorMsg = error instanceof Error ? error.message : 'Payment capture failed';
        setErrorMessage(errorMsg);
        onPaymentError(new Error(errorMsg));
      }
    },
    [paymentRequest, onPaymentSuccess, onPaymentError]
  );

  // Handle PayPal errors
  const onError = useCallback(
    (error: any) => {
      setIsLoading(false);
      setPaymentStep('error');
      const errorMsg = error?.message || 'PayPal payment error occurred';
      setErrorMessage(errorMsg);
      onPaymentError(new Error(errorMsg));
    },
    [onPaymentError]
  );

  // Handle payment cancellation
  const onCancel = useCallback(
    (data: any) => {
      setIsLoading(false);
      setPaymentStep('ready');
      setErrorMessage('Payment was cancelled by user');
      onPaymentCancel?.();
    },
    [onPaymentCancel]
  );

  // Validate payment before processing
  const onClick = useCallback(
    (data: any, actions: any) => {
      // Reset error state
      setErrorMessage(null);
      
      // Validate payment amount
      if (!paymentRequest.amount || paymentRequest.amount <= 0) {
        setErrorMessage('Invalid payment amount');
        onPaymentError(new Error('Invalid payment amount'));
        return actions.reject();
      }
      
      // Validate currency
      if (!paymentRequest.currency) {
        setErrorMessage('Currency is required');
        onPaymentError(new Error('Currency is required'));
        return actions.reject();
      }
      
      // Validate customer
      if (!paymentRequest.customerId) {
        setErrorMessage('Customer ID is required');
        onPaymentError(new Error('Customer ID is required'));
        return actions.reject();
      }
      
      return actions.resolve();
    },
    [paymentRequest, onPaymentError]
  );

  // Reset form when payment request changes
  useEffect(() => {
    setPaymentStep('ready');
    setErrorMessage(null);
    setIsLoading(false);
  }, [paymentRequest.amount, paymentRequest.currency, paymentRequest.customerId]);

  return (
    <div className={`paypal-payment-form ${className}`}>
      {showSummary && <PaymentSummary paymentRequest={paymentRequest} />}
      
      {/* Payment Status */}
      {paymentStep === 'processing' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800">Processing payment...</span>
          </div>
        </div>
      )}
      
      {paymentStep === 'completed' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="rounded-full bg-green-400 p-1 mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-green-800 font-medium">Payment completed successfully!</span>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="rounded-full bg-red-400 p-1 mr-3 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-red-800 font-medium">Payment Error</h4>
              <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* PayPal Buttons */}
      <div className="paypal-buttons-container">
        <PayPalScriptProvider options={paypalScriptOptions}>
          <PayPalButtons
            createOrder={createOrder}
            onApprove={onApprove}
            onError={onError}
            onCancel={onCancel}
            onClick={onClick}
            disabled={isLoading || paymentStep === 'completed'}
            style={{
              layout: 'horizontal',
              color: 'gold',
              shape: 'rect',
              label: 'pay',
              height: 55,
              tagline: false,
            }}
            forceReRender={[
              paymentRequest.amount,
              paymentRequest.currency,
              paymentRequest.customerId,
            ]}
          />
        </PayPalScriptProvider>
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayPalPaymentForm;