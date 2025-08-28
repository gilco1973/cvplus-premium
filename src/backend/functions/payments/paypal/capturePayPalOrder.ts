/**
 * CVPlus PayPal Capture Order Firebase Function
 * Captures PayPal order after user approval
 */

import { https } from 'firebase-functions';
import { PayPalPaymentProvider } from '../../../services/payments/providers/paypal-provider';
import { configurationManager } from '../../../services/payments/config-manager';
import { PayPalConfig } from '../../../../types/providers.types';

interface CaptureOrderRequest {
  order_id: string;
  payer_id?: string; // PayPal payer ID if available
}

/**
 * Capture PayPal Order Function
 */
export const capturePayPalOrder = https.onCall(async (data: CaptureOrderRequest, context) => {
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

    // Capture the order
    const result = await paypalProvider.capturePaymentIntent(data.order_id);

    if (!result.success) {
      throw new https.HttpsError(
        'internal',
        `Failed to capture PayPal order: ${result.error?.message}`
      );
    }

    // Log successful capture
    console.log(`[capturePayPalOrder] Successfully captured order ${data.order_id}`, {
      order_id: data.order_id,
      user_id: context.auth.uid,
      amount: result.payment_intent?.amount,
      currency: result.payment_intent?.currency,
      status: result.payment_intent?.status,
    });

    // Return success response
    return {
      success: true,
      order_id: data.order_id,
      payment_intent: result.payment_intent,
      transaction_id: result.transaction_id,
      status: result.payment_intent?.status,
      captured_at: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[capturePayPalOrder] Error:', error);
    
    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError(
      'internal',
      `Internal error capturing PayPal order: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});