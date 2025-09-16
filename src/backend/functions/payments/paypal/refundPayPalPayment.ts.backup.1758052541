/**
 * CVPlus PayPal Refund Payment Firebase Function
 * Handles PayPal payment refunds
 */

import { https } from 'firebase-functions';
import { PayPalPaymentProvider } from '../../../services/payments/providers/paypal-provider';
import { configurationManager } from '../../../services/payments/config-manager';
import { PayPalConfig } from '../../../../types/providers.types';
import { RefundRequest } from '../../../../types/payments.types';

/**
 * Refund PayPal Payment Function
 */
export const refundPayPalPayment = https.onCall(async (data: RefundRequest, context) => {
  // Validate authentication
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Validate admin permissions (in production, check actual admin role)
  // This is a simplified check - implement proper admin role verification
  const userRoles = context.auth.token?.roles || [];
  if (!userRoles.includes('admin') && !userRoles.includes('support')) {
    throw new https.HttpsError('permission-denied', 'Insufficient permissions for refund operations');
  }

  // Validate request data
  if (!data.payment_intent_id) {
    throw new https.HttpsError('invalid-argument', 'Payment intent ID is required');
  }

  // Validate refund amount if provided
  if (data.amount && data.amount <= 0) {
    throw new https.HttpsError('invalid-argument', 'Refund amount must be greater than zero');
  }

  try {
    // Load PayPal configuration
    const config = await configurationManager.loadConfig<PayPalConfig>('paypal');
    
    // Initialize PayPal provider
    const paypalProvider = new PayPalPaymentProvider(config);
    await paypalProvider.initialize();

    // Create refund
    const result = await paypalProvider.createRefund({
      payment_intent_id: data.payment_intent_id,
      amount: data.amount, // undefined for full refund
      reason: data.reason || 'requested_by_customer',
      metadata: {
        ...data.metadata,
        refunded_by: context.auth.uid,
        refund_requested_at: new Date().toISOString(),
      },
    });

    if (!result.success) {
      throw new https.HttpsError(
        'internal',
        `Failed to process PayPal refund: ${result.error?.message}`
      );
    }

    // Log successful refund
    console.log(`[refundPayPalPayment] Successfully processed refund`, {
      payment_intent_id: data.payment_intent_id,
      refund_id: result.refund_id,
      amount: result.amount,
      currency: result.currency,
      refunded_by: context.auth.uid,
      reason: data.reason,
    });

    // Return success response
    return {
      success: true,
      refund_id: result.refund_id,
      payment_intent_id: data.payment_intent_id,
      amount: result.amount,
      currency: result.currency,
      status: result.status,
      created_at: result.created_at,
    };

  } catch (error) {
    console.error('[refundPayPalPayment] Error:', error);
    
    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError(
      'internal',
      `Internal error processing PayPal refund: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});