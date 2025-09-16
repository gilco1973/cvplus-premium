/**
 * CVPlus PayPal Payment Status Firebase Function
 * Checks PayPal payment/order status
  */

import { https } from 'firebase-functions';
import { PayPalPaymentProvider } from '../../../services/payments/providers/paypal-provider';
import { configurationManager } from '../../../services/payments/config-manager';
import { PayPalConfig } from '../../../../types/providers.types';

interface PaymentStatusRequest {
  order_id: string;
}

/**
 * Get PayPal Payment Status Function
  */
export const getPayPalPaymentStatus = https.onCall(async (data: PaymentStatusRequest, context) => {
  // Validate authentication
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Validate request data
  if (!data.order_id) {
    throw new https.HttpsError('invalid-argument', 'Order ID is required');
  }

  try {
    // Load PayPal configuration
    const config = await configurationManager.loadConfig<PayPalConfig>('paypal');
    
    // Initialize PayPal provider
    const paypalProvider = new PayPalPaymentProvider(config);
    await paypalProvider.initialize();

    // Get payment intent (PayPal order)
    const paymentIntent = await paypalProvider.getPaymentIntent(data.order_id);

    // Return payment status
    return {
      success: true,
      order_id: data.order_id,
      payment_intent: paymentIntent,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created_at: paymentIntent.created_at,
      updated_at: paymentIntent.updated_at,
    };

  } catch (error) {
    console.error('[getPayPalPaymentStatus] Error:', error);
    
    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError(
      'internal',
      `Internal error getting PayPal payment status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});