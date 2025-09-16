/**
 * CVPlus Premium Stripe Payment Confirmation
 * Migrated from /functions/src/functions/payments/confirmPayment.ts
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '../../../../config/firebase';
import { corsOptions } from '../../../../config/cors';
import Stripe from 'stripe';
import { Timestamp } from 'firebase-admin/firestore';
import type { 
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
} from '../../../../types/payments.types';

// Environment configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

interface ConfirmPaymentData {
  paymentIntentId: string;
  paymentMethodId?: string;
  returnUrl?: string;
}

export const confirmPayment = onCall<ConfirmPaymentData>(
  {
    cors: corsOptions,
    enforceAppCheck: false,
    memory: '1GiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    const { auth, data } = request;

    try {
      // Authentication check
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      // Input validation
      const { paymentIntentId, paymentMethodId, returnUrl } = data;

      if (!paymentIntentId) {
        throw new HttpsError('invalid-argument', 'Payment intent ID is required');
      }

      logger.info(`Confirming payment intent ${paymentIntentId} for user ${auth.uid}`, {
        paymentMethodId: paymentMethodId || 'existing',
        hasReturnUrl: !!returnUrl,
      });

      // Verify payment intent belongs to user
      const paymentIntentDoc = await db.collection('payment_intents').doc(paymentIntentId).get();
      
      if (!paymentIntentDoc.exists) {
        throw new HttpsError('not-found', 'Payment intent not found');
      }

      const paymentIntentData = paymentIntentDoc.data();
      if (paymentIntentData?.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Payment intent does not belong to user');
      }

      // Prepare confirmation parameters
      const confirmParams: Stripe.PaymentIntentConfirmParams = {};

      if (paymentMethodId) {
        confirmParams.payment_method = paymentMethodId;
      }

      if (returnUrl) {
        confirmParams.return_url = returnUrl;
      } else {
        confirmParams.return_url = `${process.env.FRONTEND_URL || 'https://cvplus-webapp.web.app'}/billing/success`;
      }

      // Confirm payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams
      );

      // Update payment intent in Firestore
      await db.collection('payment_intents').doc(paymentIntentId).update({
        status: paymentIntent.status,
        updatedAt: new Date(),
        confirmedAt: new Date(),
        paymentMethodId: paymentIntent.payment_method || paymentIntentData?.paymentMethodId,
      });

      // Handle successful payment
      if (paymentIntent.status === 'succeeded') {
        await handleSuccessfulPayment(auth.uid, paymentIntent, paymentIntentData);
      }

      logger.info(`Payment intent confirmed successfully`, {
        paymentIntentId,
        userId: auth.uid,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
      });

      const response: ConfirmPaymentResponse = {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status as any,
        clientSecret: paymentIntent.client_secret || undefined,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action || undefined,
        paymentMethod: paymentIntent.payment_method 
          ? typeof paymentIntent.payment_method === 'string' 
            ? paymentIntent.payment_method 
            : paymentIntent.payment_method.id
          : undefined,
      };

      return response;

    } catch (error) {
      logger.error('Failed to confirm payment', {
        userId: auth?.uid,
        paymentIntentId: data.paymentIntentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error instanceof Stripe.errors.StripeError) {
        throw new HttpsError(
          'internal',
          `Stripe error: ${error.message}`,
          { code: error.code, type: error.type }
        );
      }

      throw new HttpsError('internal', 'Failed to confirm payment');
    }
  }
);

/**
 * Handle successful payment processing
 */
async function handleSuccessfulPayment(
  userId: string,
  paymentIntent: Stripe.PaymentIntent,
  paymentIntentData: any
): Promise<void> {
  try {
    const batch = db.batch();
    
    // Create payment record
    const paymentRef = db.collection('payments').doc();
    batch.set(paymentRef, {
      id: paymentRef.id,
      userId,
      paymentIntentId: paymentIntent.id,
      stripeCustomerId: paymentIntent.customer,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      status: 'completed',
      planId: paymentIntentData?.planId || null,
      createdAt: new Date(),
      processedAt: new Date(),
      metadata: paymentIntent.metadata,
    });

    // Update user subscription if planId is provided
    if (paymentIntentData?.planId) {
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        subscription: {
          planId: paymentIntentData.planId,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          updatedAt: new Date(),
        },
        updatedAt: new Date(),
      });
    }

    // Commit batch
    await batch.commit();

    logger.info('Payment processed successfully', {
      userId,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      planId: paymentIntentData?.planId,
    });

  } catch (error) {
    logger.error('Failed to process successful payment', {
      userId,
      paymentIntentId: paymentIntent.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Don't throw error here as payment was successful with Stripe
    // This is a data consistency issue that should be handled separately
  }
}