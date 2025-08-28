/**
 * Manage Subscription Firebase Function
 * 
 * Handles subscription lifecycle operations including creation, updates,
 * cancellations, and renewals with Stripe integration.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Premium Module
 */

import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { SubscriptionService } from '../../services/subscription.service';
import { StripeService } from '../../services/stripe.service';
import { FeatureService } from '../../services/features.service';
import { logger } from '../../utils/logger';
import * as admin from 'firebase-admin';

export interface ManageSubscriptionRequest {
  action: 'create' | 'update' | 'cancel' | 'reactivate' | 'change_plan';
  subscriptionId?: string;
  priceId?: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface ManageSubscriptionResponse {
  success: boolean;
  subscription?: any;
  clientSecret?: string;
  error?: string;
  message?: string;
}

/**
 * Main subscription management function
 */
export const manageSubscription = onCall<ManageSubscriptionRequest, Promise<ManageSubscriptionResponse>>(
  {
    timeoutSeconds: 300, // 5 minutes
    memory: '1GiB',
    region: 'us-central1'
  },
  async (request: CallableRequest<ManageSubscriptionRequest>): Promise<ManageSubscriptionResponse> => {
    const { data, auth } = request;
    
    // Validate authentication
    if (!auth?.uid) {
      logger.error('Unauthenticated subscription management request');
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    const { action, subscriptionId, priceId, paymentMethodId, metadata } = data;
    const userId = auth.uid;

    try {
      logger.info(`Managing subscription: ${action} for user ${userId}`, { data });

      // Initialize services
      const subscriptionService = new SubscriptionService();
      const stripeService = new StripeService();
      const featureService = new FeatureService();

      switch (action) {
        case 'create':
          return await createSubscription(
            userId, 
            priceId!, 
            paymentMethodId, 
            metadata,
            subscriptionService,
            stripeService,
            featureService
          );

        case 'update':
          return await updateSubscription(
            userId,
            subscriptionId!,
            metadata || {},
            subscriptionService,
            stripeService
          );

        case 'cancel':
          return await cancelSubscription(
            userId,
            subscriptionId!,
            subscriptionService,
            stripeService,
            featureService
          );

        case 'reactivate':
          return await reactivateSubscription(
            userId,
            subscriptionId!,
            subscriptionService,
            stripeService,
            featureService
          );

        case 'change_plan':
          return await changePlan(
            userId,
            subscriptionId!,
            priceId!,
            subscriptionService,
            stripeService,
            featureService
          );

        default:
          return {
            success: false,
            error: `Invalid action: ${action}`
          };
      }

    } catch (error: any) {
      logger.error(`Subscription management failed for user ${userId}:`, error);
      return {
        success: false,
        error: error.message || 'Subscription management failed',
        message: 'Please try again or contact support if the problem persists'
      };
    }
  }
);

/**
 * Create new subscription
 */
async function createSubscription(
  userId: string,
  priceId: string,
  paymentMethodId: string | undefined,
  metadata: Record<string, string> = {},
  subscriptionService: SubscriptionService,
  stripeService: StripeService,
  featureService: FeatureService
): Promise<ManageSubscriptionResponse> {
  
  // Get or create Stripe customer
  const customer = await stripeService.getOrCreateCustomer(userId);
  
  // Attach payment method if provided
  if (paymentMethodId) {
    await stripeService.attachPaymentMethod(paymentMethodId, customer.id);
    await stripeService.setDefaultPaymentMethod(customer.id, paymentMethodId);
  }

  // Create subscription in Stripe
  const stripeSubscription = await stripeService.createSubscription(customer.id, priceId, {
    ...metadata,
    userId
  });

  // Handle subscription status
  if (stripeSubscription.status === 'incomplete') {
    return {
      success: false,
      clientSecret: stripeSubscription.latest_invoice?.payment_intent?.client_secret,
      error: 'Payment confirmation required',
      message: 'Please complete payment to activate your subscription'
    };
  }

  // Create subscription record in Firestore
  const subscriptionData = await subscriptionService.createSubscription({
    userId,
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId: customer.id,
    priceId,
    status: stripeSubscription.status as any,
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    metadata
  });

  // Update user features
  await featureService.updateUserFeatures(userId, subscriptionData);

  // Update user role to premium
  await admin.firestore().collection('users').doc(userId).update({
    role: 'premium',
    subscriptionId: subscriptionData.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  logger.info(`Subscription created successfully for user ${userId}:`, subscriptionData.id);

  return {
    success: true,
    subscription: subscriptionData,
    message: 'Subscription created successfully'
  };
}

/**
 * Update existing subscription
 */
async function updateSubscription(
  userId: string,
  subscriptionId: string,
  metadata: Record<string, string>,
  subscriptionService: SubscriptionService,
  stripeService: StripeService
): Promise<ManageSubscriptionResponse> {
  
  // Get subscription
  const subscription = await subscriptionService.getSubscription(subscriptionId);
  
  if (!subscription || subscription.userId !== userId) {
    return {
      success: false,
      error: 'Subscription not found or access denied'
    };
  }

  // Update in Stripe
  const stripeSubscription = await stripeService.updateSubscription(
    subscription.stripeSubscriptionId,
    { metadata }
  );

  // Update in Firestore
  const updatedSubscription = await subscriptionService.updateSubscription(subscriptionId, {
    status: stripeSubscription.status as any,
    metadata: { ...subscription.metadata, ...metadata },
    updatedAt: new Date()
  });

  return {
    success: true,
    subscription: updatedSubscription,
    message: 'Subscription updated successfully'
  };
}

/**
 * Cancel subscription
 */
async function cancelSubscription(
  userId: string,
  subscriptionId: string,
  subscriptionService: SubscriptionService,
  stripeService: StripeService,
  featureService: FeatureService
): Promise<ManageSubscriptionResponse> {
  
  // Get subscription
  const subscription = await subscriptionService.getSubscription(subscriptionId);
  
  if (!subscription || subscription.userId !== userId) {
    return {
      success: false,
      error: 'Subscription not found or access denied'
    };
  }

  // Cancel in Stripe
  const canceledSubscription = await stripeService.cancelSubscription(
    subscription.stripeSubscriptionId,
    { at_period_end: true }
  );

  // Update in Firestore
  const updatedSubscription = await subscriptionService.updateSubscription(subscriptionId, {
    status: 'canceled',
    canceledAt: new Date(),
    updatedAt: new Date()
  });

  // Update user features (they keep access until period end)
  if (canceledSubscription.current_period_end) {
    const periodEnd = new Date(canceledSubscription.current_period_end * 1000);
    await featureService.scheduleFeatureRemoval(userId, periodEnd);
  }

  return {
    success: true,
    subscription: updatedSubscription,
    message: 'Subscription will be canceled at the end of the current billing period'
  };
}

/**
 * Reactivate subscription
 */
async function reactivateSubscription(
  userId: string,
  subscriptionId: string,
  subscriptionService: SubscriptionService,
  stripeService: StripeService,
  featureService: FeatureService
): Promise<ManageSubscriptionResponse> {
  
  // Get subscription
  const subscription = await subscriptionService.getSubscription(subscriptionId);
  
  if (!subscription || subscription.userId !== userId) {
    return {
      success: false,
      error: 'Subscription not found or access denied'
    };
  }

  // Reactivate in Stripe
  const reactivatedSubscription = await stripeService.reactivateSubscription(
    subscription.stripeSubscriptionId
  );

  // Update in Firestore
  const updatedSubscription = await subscriptionService.updateSubscription(subscriptionId, {
    status: reactivatedSubscription.status as any,
    canceledAt: null,
    updatedAt: new Date()
  });

  // Restore user features
  await featureService.updateUserFeatures(userId, updatedSubscription);

  return {
    success: true,
    subscription: updatedSubscription,
    message: 'Subscription reactivated successfully'
  };
}

/**
 * Change subscription plan
 */
async function changePlan(
  userId: string,
  subscriptionId: string,
  newPriceId: string,
  subscriptionService: SubscriptionService,
  stripeService: StripeService,
  featureService: FeatureService
): Promise<ManageSubscriptionResponse> {
  
  // Get subscription
  const subscription = await subscriptionService.getSubscription(subscriptionId);
  
  if (!subscription || subscription.userId !== userId) {
    return {
      success: false,
      error: 'Subscription not found or access denied'
    };
  }

  // Update in Stripe
  const updatedStripeSubscription = await stripeService.updateSubscriptionPlan(
    subscription.stripeSubscriptionId,
    newPriceId
  );

  // Update in Firestore
  const updatedSubscription = await subscriptionService.updateSubscription(subscriptionId, {
    priceId: newPriceId,
    status: updatedStripeSubscription.status as any,
    currentPeriodStart: new Date(updatedStripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(updatedStripeSubscription.current_period_end * 1000),
    updatedAt: new Date()
  });

  // Update user features based on new plan
  await featureService.updateUserFeatures(userId, updatedSubscription);

  return {
    success: true,
    subscription: updatedSubscription,
    message: 'Subscription plan changed successfully'
  };
}