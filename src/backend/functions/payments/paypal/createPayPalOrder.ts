/**
 * CVPlus PayPal Create Order Firebase Function
 * Creates PayPal order for payment processing
  */

import { https } from 'firebase-functions';
import { PayPalPaymentProvider } from '../../../services/payments/providers/paypal-provider';
import { configurationManager } from '../../../services/payments/config-manager';
import { PayPalConfig } from '../../../../types/providers.types';
import { PaymentRequest } from '../../../../types/payments.types';

/**
 * Create PayPal Order Function
  */
export const createPayPalOrder = https.onCall(async (data: PaymentRequest, context) => {
  // Validate authentication
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Authentication required');
  }

  // Validate request data
  if (!data.amount || !data.currency || !data.customerId) {
    throw new https.HttpsError('invalid-argument', 'Missing required payment parameters');
  }

  // Additional validation
  if (data.amount <= 0) {
    throw new https.HttpsError('invalid-argument', 'Payment amount must be greater than zero');
  }

  if (!data.currency.match(/^[A-Z]{3}$/)) {
    throw new https.HttpsError('invalid-argument', 'Invalid currency code format');
  }

  try {
    // Load PayPal configuration
    const config = await configurationManager.loadConfig<PayPalConfig>('paypal');
    
    // Initialize PayPal provider
    const paypalProvider = new PayPalPaymentProvider(config);
    await paypalProvider.initialize();

    // Create payment intent (PayPal order)
    const result = await paypalProvider.createPaymentIntent({
      amount: data.amount,
      currency: data.currency,
      customerId: data.customerId,
      description: data.description || 'CVPlus Payment',
      metadata: {
        ...data.metadata,
        user_id: context.auth.uid,
        created_by: 'createPayPalOrder',
        timestamp: new Date().toISOString(),
      },
    });

    if (!result.success) {
      throw new https.HttpsError(
        'internal',
        `Failed to create PayPal order: ${result.error?.message}`
      );
    }

    // Return success response
    return {
      success: true,
      order_id: result.payment_intent?.id,
      client_secret: result.client_secret,
      approval_url: result.redirect_url,
      requires_action: result.requires_action,
    };

  } catch (error) {
    console.error('[createPayPalOrder] Error:', error);
    
    if (error instanceof https.HttpsError) {
      throw error;
    }

    throw new https.HttpsError(
      'internal',
      `Internal error creating PayPal order: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});