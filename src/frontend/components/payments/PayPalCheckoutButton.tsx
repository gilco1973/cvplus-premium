/**
 * CVPlus PayPal Checkout Button Component
 * React component for PayPal payment processing
 */

import React, { useCallback } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { PaymentRequest } from '../../../payments/src/types';

interface PayPalCheckoutButtonProps {
  /** Payment request data */
  paymentRequest: PaymentRequest;
  
  /** Success callback */
  onSuccess: (orderId: string, details: any) => void;
  
  /** Error callback */
  onError: (error: Error) => void;
  
  /** Cancel callback */
  onCancel?: () => void;
  
  /** Loading state callback */
  onLoading?: (loading: boolean) => void;
  
  /** Custom styling */
  style?: {
    layout?: 'vertical' | 'horizontal';
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
    shape?: 'rect' | 'pill';
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment';
    tagline?: boolean;
    height?: number;
    disableMaxWidth?: boolean;
  };
  
  /** Disable the button */
  disabled?: boolean;
}

/**
 * PayPal Checkout Button Component
 */
export const PayPalCheckoutButton: React.FC<PayPalCheckoutButtonProps> = ({
  paymentRequest,
  onSuccess,
  onError,
  onCancel,
  onLoading,
  style = {
    layout: 'horizontal',
    color: 'gold',
    shape: 'rect',
    label: 'pay',
    height: 55,
  },
  disabled = false,
}) => {
  const [{ isPending }] = usePayPalScriptReducer();

  const handleCreateOrder = useCallback(
    (data: any, actions: any) => {
      onLoading?.(true);
      
      return actions.order.create({
        purchase_units: [{
          amount: {
            currency_code: paymentRequest.currency.toUpperCase(),
            value: paymentRequest.amount.toFixed(2),
          },
          description: paymentRequest.description || 'CVPlus Payment',
          custom_id: paymentRequest.metadata?.custom_id,
          invoice_id: paymentRequest.metadata?.invoice_id,
        }],
        application_context: {
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          brand_name: 'CVPlus',
          locale: 'en-US',
          landing_page: 'LOGIN',
          payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
      });
    },
    [paymentRequest, onLoading]
  );

  const handleApprove = useCallback(
    async (data: any, actions: any) => {
      try {
        const details = await actions.order.capture();
        onLoading?.(false);
        onSuccess(data.orderID, details);
      } catch (error) {
        onLoading?.(false);
        onError(error instanceof Error ? error : new Error('PayPal approval failed'));
      }
    },
    [onSuccess, onError, onLoading]
  );

  const handleError = useCallback(
    (error: any) => {
      onLoading?.(false);
      onError(error instanceof Error ? error : new Error('PayPal payment error'));
    },
    [onError, onLoading]
  );

  const handleCancel = useCallback(
    (data: any) => {
      onLoading?.(false);
      onCancel?.();
    },
    [onCancel, onLoading]
  );

  const handleClick = useCallback(
    (data: any, actions: any) => {
      // Validation before starting payment
      if (!paymentRequest.amount || paymentRequest.amount <= 0) {
        onError(new Error('Invalid payment amount'));
        return actions.reject();
      }
      
      if (!paymentRequest.currency) {
        onError(new Error('Currency is required'));
        return actions.reject();
      }
      
      return actions.resolve();
    },
    [paymentRequest, onError]
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-14 bg-gray-100 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading PayPal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="paypal-checkout-button">
      <PayPalButtons
        createOrder={handleCreateOrder}
        onApprove={handleApprove}
        onError={handleError}
        onCancel={handleCancel}
        onClick={handleClick}
        style={style}
        disabled={disabled}
        forceReRender={[paymentRequest.amount, paymentRequest.currency]}
      />
    </div>
  );
};

export default PayPalCheckoutButton;