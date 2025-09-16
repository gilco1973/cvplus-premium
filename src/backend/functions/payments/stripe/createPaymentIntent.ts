/**
 * CVPlus Premium Stripe Payment Intent Creation
 * Migrated from /functions/src/functions/payments/createPaymentIntent.ts
  */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

import type { 
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
} from '../../../../types/payments.types';

// Note: This function requires Firebase configuration to be provided
// when used in the main functions index. It will be properly configured
// during the export process in /functions/src/index.ts

// Environment configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

interface CreatePaymentIntentData {
  amount: number;
  currency: string;
  planId?: string;
  customerId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export const createPaymentIntent = onCall<CreatePaymentIntentData>(
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
      const { amount, currency, planId, customerId, paymentMethodId, metadata } = data;

      if (!amount || amount <= 0) {
        throw new HttpsError('invalid-argument', 'Amount must be greater than 0');
      }

      if (!currency || currency.length !== 3) {
        throw new HttpsError('invalid-argument', 'Valid currency code required');
      }

      logger.info(`Creating payment intent for user ${auth.uid}`, {
        amount,
        currency,
        planId,
        customerId: customerId || 'new_customer',
      });

      // Get or create Stripe customer
      let stripeCustomerId = customerId;
      
      if (!stripeCustomerId) {
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(auth.uid).get();
        if (!userDoc.exists) {
          throw new HttpsError('not-found', 'User profile not found');
        }

        const userData = userDoc.data();
        const email = userData?.email || auth.token?.email;
        
        if (!email) {
          throw new HttpsError('invalid-argument', 'User email is required');
        }

        // Create Stripe customer
        const customer = await stripe.customers.create({
          email,
          metadata: {
            userId: auth.uid,
            planId: planId || 'unknown',
          },
        });

        stripeCustomerId = customer.id;

        // Store customer ID in user document
        await db.collection('users').doc(auth.uid).update({
          stripeCustomerId: customer.id,
          updatedAt: new Date(),
        });
      }

      // Create payment intent
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: auth.uid,
          planId: planId || 'unknown',
          ...metadata,
        },
      };

      // Add payment method if provided
      if (paymentMethodId) {
        paymentIntentParams.payment_method = paymentMethodId;
        paymentIntentParams.confirmation_method = 'manual';
        paymentIntentParams.confirm = true;
        paymentIntentParams.return_url = `${process.env.FRONTEND_URL || 'https://cvplus-webapp.web.app'}/billing/success`;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      // Store payment intent in Firestore
      await db.collection('payment_intents').doc(paymentIntent.id).set({
        userId: auth.uid,
        stripeCustomerId,
        amount: amount,
        currency: currency,
        status: paymentIntent.status,
        planId: planId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: paymentIntent.metadata,
      });

      logger.info(`Payment intent created successfully`, {
        paymentIntentId: paymentIntent.id,
        userId: auth.uid,
        amount,
        currency,
        status: paymentIntent.status,
      });

      const response: CreatePaymentIntentResponse = {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
        status: paymentIntent.status as any,
        customerId: stripeCustomerId,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action || undefined,
      };

      return response;

    } catch (error) {
      logger.error('Failed to create payment intent', {
        userId: auth?.uid,
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
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

      throw new HttpsError('internal', 'Failed to create payment intent');
    }
  }
);