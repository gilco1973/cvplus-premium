/**
 * Stripe Webhook Handler Firebase Function
 * 
 * Processes Stripe webhooks to keep subscription and payment data in sync.
 * Handles all subscription lifecycle events and payment updates.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Premium Module
 */

import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import { StripeService } from '../../services/stripe.service';
import { SubscriptionService } from '../../services/subscription.service';
import { BillingService } from '../../services/billing.service';
import { FeatureService } from '../../services/features.service';
import { logger } from '../../utils/logger';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

/**
 * Handle Stripe webhooks
 */
export const handleStripeWebhook = onRequest(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    region: 'us-central1'
  },
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    
    if (!sig) {
      logger.error('Missing Stripe signature');
      return res.status(400).send('Missing Stripe signature');
    }

    try {
      const stripeService = new StripeService();
      const event = stripeService.constructWebhookEvent(req.body, sig);

      logger.info(`Processing Stripe webhook: ${event.type}`, { eventId: event.id });

      // Process the event
      await processStripeEvent(event);

      // Acknowledge receipt
      res.status(200).send('Webhook processed successfully');

    } catch (error: any) {
      logger.error('Stripe webhook processing failed:', error);
      
      if (error.message?.includes('Invalid signature')) {
        return res.status(400).send('Invalid signature');
      }
      
      return res.status(500).send('Webhook processing failed');
    }
  }
);

/**
 * Process different Stripe events
 */
async function processStripeEvent(event: Stripe.Event): Promise<void> {
  const subscriptionService = new SubscriptionService();
  const billingService = new BillingService();
  const featureService = new FeatureService();

  switch (event.type) {
    // Subscription events
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription, subscriptionService, featureService);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, subscriptionService, featureService);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, subscriptionService, featureService);
      break;

    // Invoice events
    case 'invoice.created':
      await handleInvoiceCreated(event.data.object as Stripe.Invoice, billingService);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, billingService, subscriptionService);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, billingService, subscriptionService);
      break;

    // Payment events
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, billingService);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, billingService);
      break;

    // Customer events
    case 'customer.created':
      await handleCustomerCreated(event.data.object as Stripe.Customer);
      break;

    case 'customer.updated':
      await handleCustomerUpdated(event.data.object as Stripe.Customer);
      break;

    default:
      logger.info(`Unhandled webhook event type: ${event.type}`);
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  subscriptionService: SubscriptionService,
  featureService: FeatureService
): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    logger.error('No userId in subscription metadata', { subscriptionId: subscription.id });
    return;
  }

  try {
    // Find or create subscription record
    const existingSubscription = await subscriptionService.getSubscriptionByStripeId(subscription.id);
    
    if (!existingSubscription) {
      // Create new subscription record
      const subscriptionData = await subscriptionService.createSubscription({
        userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        priceId: subscription.items.data[0]?.price.id || '',
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: subscription.metadata
      });

      // Update user features
      await featureService.updateUserFeatures(userId, subscriptionData);
    }

    logger.info(`Subscription created via webhook for user ${userId}`);
  } catch (error) {
    logger.error('Failed to handle subscription created:', error);
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  subscriptionService: SubscriptionService,
  featureService: FeatureService
): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    logger.error('No userId in subscription metadata', { subscriptionId: subscription.id });
    return;
  }

  try {
    const existingSubscription = await subscriptionService.getSubscriptionByStripeId(subscription.id);
    
    if (existingSubscription) {
      // Update subscription record
      const updatedSubscription = await subscriptionService.updateSubscription(existingSubscription.id, {
        status: subscription.status as any,
        priceId: subscription.items.data[0]?.price.id || existingSubscription.priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: subscription.metadata,
        updatedAt: new Date()
      });

      // Update user features
      await featureService.updateUserFeatures(userId, updatedSubscription);

      // Update user role based on subscription status
      const newRole = subscription.status === 'active' ? 'premium' : 'user';
      await admin.firestore().collection('users').doc(userId).update({
        role: newRole,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    logger.info(`Subscription updated via webhook for user ${userId}`);
  } catch (error) {
    logger.error('Failed to handle subscription updated:', error);
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  subscriptionService: SubscriptionService,
  featureService: FeatureService
): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
    logger.error('No userId in subscription metadata', { subscriptionId: subscription.id });
    return;
  }

  try {
    const existingSubscription = await subscriptionService.getSubscriptionByStripeId(subscription.id);
    
    if (existingSubscription) {
      // Mark subscription as canceled
      await subscriptionService.updateSubscription(existingSubscription.id, {
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date()
      });

      // Remove premium features
      await featureService.removeUserFeatures(userId);

      // Update user role back to regular user
      await admin.firestore().collection('users').doc(userId).update({
        role: 'user',
        subscriptionId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    logger.info(`Subscription deleted via webhook for user ${userId}`);
  } catch (error) {
    logger.error('Failed to handle subscription deleted:', error);
  }
}

/**
 * Handle invoice created
 */
async function handleInvoiceCreated(
  invoice: Stripe.Invoice,
  billingService: BillingService
): Promise<void> {
  try {
    const userId = invoice.metadata?.userId || invoice.subscription_details?.metadata?.userId;
    
    if (userId) {
      await billingService.recordInvoice({
        userId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency as any,
        status: invoice.status as any,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : new Date(),
        createdAt: new Date(invoice.created * 1000)
      });
    }

    logger.info(`Invoice created: ${invoice.id}`);
  } catch (error) {
    logger.error('Failed to handle invoice created:', error);
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  billingService: BillingService,
  subscriptionService: SubscriptionService
): Promise<void> {
  try {
    // Record payment
    const userId = invoice.metadata?.userId || invoice.subscription_details?.metadata?.userId;
    
    if (userId) {
      await billingService.recordPayment({
        userId,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent as string,
        amount: invoice.amount_paid,
        currency: invoice.currency as any,
        status: 'succeeded',
        paidAt: new Date()
      });

      // Send confirmation email (implement as needed)
      logger.info(`Payment successful for user ${userId}, invoice ${invoice.id}`);
    }
  } catch (error) {
    logger.error('Failed to handle invoice payment succeeded:', error);
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  billingService: BillingService,
  subscriptionService: SubscriptionService
): Promise<void> {
  try {
    const userId = invoice.metadata?.userId || invoice.subscription_details?.metadata?.userId;
    
    if (userId) {
      await billingService.recordPayment({
        userId,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent as string,
        amount: invoice.amount_due,
        currency: invoice.currency as any,
        status: 'failed',
        failedAt: new Date()
      });

      // Send payment failure notification (implement as needed)
      logger.warn(`Payment failed for user ${userId}, invoice ${invoice.id}`);
    }
  } catch (error) {
    logger.error('Failed to handle invoice payment failed:', error);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  billingService: BillingService
): Promise<void> {
  try {
    const userId = paymentIntent.metadata?.userId;
    
    if (userId) {
      logger.info(`Payment succeeded for user ${userId}: ${paymentIntent.id}`);
    }
  } catch (error) {
    logger.error('Failed to handle payment succeeded:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  billingService: BillingService
): Promise<void> {
  try {
    const userId = paymentIntent.metadata?.userId;
    
    if (userId) {
      logger.warn(`Payment failed for user ${userId}: ${paymentIntent.id}`);
    }
  } catch (error) {
    logger.error('Failed to handle payment failed:', error);
  }
}

/**
 * Handle customer created
 */
async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  try {
    const userId = customer.metadata?.userId;
    
    if (userId) {
      // Update user record with Stripe customer ID
      await admin.firestore().collection('users').doc(userId).update({
        stripeCustomerId: customer.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      logger.info(`Customer created for user ${userId}: ${customer.id}`);
    }
  } catch (error) {
    logger.error('Failed to handle customer created:', error);
  }
}

/**
 * Handle customer updated
 */
async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  try {
    const userId = customer.metadata?.userId;
    
    if (userId) {
      logger.info(`Customer updated for user ${userId}: ${customer.id}`);
    }
  } catch (error) {
    logger.error('Failed to handle customer updated:', error);
  }
}