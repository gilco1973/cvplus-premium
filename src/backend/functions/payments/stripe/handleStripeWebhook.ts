/**
 * CVPlus Premium Stripe Webhook Handler
 * Migrated from /functions/src/functions/payments/handleStripeWebhook.ts
  */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db } from '../../../../config/firebase';
import Stripe from 'stripe';
import { Timestamp } from 'firebase-admin/firestore';

// Environment configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!stripeWebhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

export const handleStripeWebhook = onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 60,
  },
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.error('Missing stripe-signature header');
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        stripeWebhookSecret
      );

      logger.info('Stripe webhook received', {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
      });

    } catch (error) {
      logger.error('Webhook signature verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(400).send('Webhook signature verification failed');
      return;
    }

    try {
      // Process webhook event
      await processWebhookEvent(event);
      
      // Respond to Stripe
      res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Webhook processing failed', {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      res.status(500).send('Webhook processing failed');
    }
  }
);

/**
 * Process different types of Stripe webhook events
  */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'customer.created':
      await handleCustomerCreated(event.data.object as Stripe.Customer);
      break;

    case 'customer.updated':
      await handleCustomerUpdated(event.data.object as Stripe.Customer);
      break;

    default:
      logger.info('Unhandled webhook event type', { eventType: event.type });
  }

  // Log webhook event for audit trail
  await logWebhookEvent(event);
}

/**
 * Handle successful payment intent
  */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  logger.info('Processing successful payment intent', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount,
  });

  try {
    // Update payment intent status in Firestore
    const paymentIntentRef = db.collection('payment_intents').doc(paymentIntent.id);
    const paymentIntentDoc = await paymentIntentRef.get();

    if (paymentIntentDoc.exists) {
      await paymentIntentRef.update({
        status: 'succeeded',
        updatedAt: new Date(),
        webhookProcessedAt: new Date(),
      });

      const paymentData = paymentIntentDoc.data();
      const userId = paymentData?.userId;

      if (userId) {
        // Create payment record
        await db.collection('payments').add({
          userId,
          paymentIntentId: paymentIntent.id,
          stripeCustomerId: paymentIntent.customer,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: 'completed',
          planId: paymentData?.planId || null,
          createdAt: new Date(),
          processedAt: new Date(),
          metadata: paymentIntent.metadata,
        });

        // Update user subscription if applicable
        if (paymentData?.planId) {
          await updateUserSubscription(userId, paymentData.planId);
        }
      }
    }

  } catch (error) {
    logger.error('Failed to process payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle failed payment intent
  */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  logger.info('Processing failed payment intent', {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
  });

  try {
    // Update payment intent status in Firestore
    const paymentIntentRef = db.collection('payment_intents').doc(paymentIntent.id);
    const paymentIntentDoc = await paymentIntentRef.get();

    if (paymentIntentDoc.exists) {
      await paymentIntentRef.update({
        status: 'failed',
        updatedAt: new Date(),
        webhookProcessedAt: new Date(),
        lastPaymentError: paymentIntent.last_payment_error,
      });

      const paymentData = paymentIntentDoc.data();
      const userId = paymentData?.userId;

      if (userId) {
        // Log failed payment
        await db.collection('payment_failures').add({
          userId,
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          createdAt: new Date(),
        });
      }
    }

  } catch (error) {
    logger.error('Failed to process payment intent failed', {
      paymentIntentId: paymentIntent.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle subscription created
  */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  logger.info('Processing subscription created', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  // Implementation for subscription creation
  // This would typically update user subscription status
}

/**
 * Handle subscription updated
  */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  logger.info('Processing subscription updated', {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  // Implementation for subscription updates
}

/**
 * Handle subscription deleted/cancelled
  */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  logger.info('Processing subscription deleted', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  // Implementation for subscription cancellation
}

/**
 * Handle invoice payment succeeded
  */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  logger.info('Processing invoice payment succeeded', {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
  });

  // Implementation for successful invoice payments
}

/**
 * Handle invoice payment failed
  */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  logger.info('Processing invoice payment failed', {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
  });

  // Implementation for failed invoice payments
}

/**
 * Handle customer created
  */
async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  logger.info('Processing customer created', {
    customerId: customer.id,
    email: customer.email,
  });

  // Implementation for customer creation
}

/**
 * Handle customer updated
  */
async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  logger.info('Processing customer updated', {
    customerId: customer.id,
    email: customer.email,
  });

  // Implementation for customer updates
}

/**
 * Update user subscription
  */
async function updateUserSubscription(userId: string, planId: string): Promise<void> {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      subscription: {
        planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    });

    logger.info('User subscription updated', { userId, planId });

  } catch (error) {
    logger.error('Failed to update user subscription', {
      userId,
      planId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Log webhook event for audit trail
  */
async function logWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
    await db.collection('webhook_events').doc(event.id).set({
      eventId: event.id,
      eventType: event.type,
      created: new Date(event.created * 1000),
      livemode: event.livemode,
      processedAt: new Date(),
      data: event.data,
    });

  } catch (error) {
    logger.error('Failed to log webhook event', {
      eventId: event.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw here as this is just logging
  }
}