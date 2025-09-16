/**
 * CVPlus Premium Stripe Checkout Session Creation
 * Migrated from /functions/src/functions/payments/createCheckoutSession.ts
  */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '../../../../config/firebase';
import { corsOptions } from '../../../../config/cors';
import Stripe from 'stripe';
import type { 
  PaymentSessionRequest,
  PaymentSession,
} from '../../../../types/payments.types';

// Environment configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

interface CreateCheckoutSessionData {
  priceId?: string;
  planId: string;
  successUrl?: string;
  cancelUrl?: string;
  customerId?: string;
  mode?: 'payment' | 'subscription' | 'setup';
  allowPromotionCodes?: boolean;
  metadata?: Record<string, string>;
}

export const createCheckoutSession = onCall<CreateCheckoutSessionData>(
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
      const { 
        priceId, 
        planId, 
        successUrl, 
        cancelUrl, 
        customerId, 
        mode = 'subscription',
        allowPromotionCodes = true,
        metadata 
      } = data;

      if (!planId) {
        throw new HttpsError('invalid-argument', 'Plan ID is required');
      }

      logger.info(`Creating checkout session for user ${auth.uid}`, {
        planId,
        mode,
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
            planId,
          },
        });

        stripeCustomerId = customer.id;

        // Store customer ID in user document
        await db.collection('users').doc(auth.uid).update({
          stripeCustomerId: customer.id,
          updatedAt: new Date(),
        });
      }

      // Get plan details
      const planDoc = await db.collection('subscription_plans').doc(planId).get();
      if (!planDoc.exists) {
        throw new HttpsError('not-found', 'Subscription plan not found');
      }

      const planData = planDoc.data();
      const finalPriceId = priceId || planData?.stripePriceId;

      if (!finalPriceId) {
        throw new HttpsError('invalid-argument', 'Price ID not found for plan');
      }

      // Default URLs
      const baseUrl = process.env.FRONTEND_URL || 'https://cvplus-webapp.web.app';
      const finalSuccessUrl = successUrl || `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      const finalCancelUrl = cancelUrl || `${baseUrl}/billing/canceled`;

      // Create checkout session parameters
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        allow_promotion_codes: allowPromotionCodes,
        metadata: {
          userId: auth.uid,
          planId,
          ...metadata,
        },
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        tax_id_collection: {
          enabled: true,
        },
      };

      // Configure line items based on mode
      if (mode === 'subscription') {
        sessionParams.line_items = [{
          price: finalPriceId,
          quantity: 1,
        }];
        
        // Add trial period if specified in plan
        if (planData?.trialDays && planData.trialDays > 0) {
          sessionParams.subscription_data = {
            trial_period_days: planData.trialDays,
            metadata: {
              userId: auth.uid,
              planId,
            },
          };
        }
      } else if (mode === 'payment') {
        sessionParams.line_items = [{
          price: finalPriceId,
          quantity: 1,
        }];
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create(sessionParams);

      // Store session in Firestore
      await db.collection('checkout_sessions').doc(session.id).set({
        userId: auth.uid,
        sessionId: session.id,
        stripeCustomerId,
        planId,
        mode,
        status: 'open',
        url: session.url,
        createdAt: new Date(),
        expiresAt: new Date(session.expires_at * 1000),
        metadata: session.metadata,
      });

      logger.info(`Checkout session created successfully`, {
        sessionId: session.id,
        userId: auth.uid,
        planId,
        mode,
        url: session.url,
      });

      const response: PaymentSession = {
        id: session.id,
        url: session.url!,
        payment_status: 'pending' as any,
        amount_total: session.amount_total || 0,
        currency: session.currency || 'usd',
        customer_id: stripeCustomerId,
        expires_at: new Date(session.expires_at * 1000),
        metadata: session.metadata || {},
      };

      return response;

    } catch (error) {
      logger.error('Failed to create checkout session', {
        userId: auth?.uid,
        planId: data.planId,
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

      throw new HttpsError('internal', 'Failed to create checkout session');
    }
  }
);