/**
 * CVPlus Premium Get User Subscription
 * Migrated from /functions/src/functions/payments/getUserSubscription.ts
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { corsOptions } from '../../../../config/cors';
import { cachedSubscriptionService } from '../../../../services/subscription.service';
import { UserSubscriptionData } from '../../../../types';

interface GetUserSubscriptionData {
  includeUsage?: boolean;
  includePaymentMethods?: boolean;
  includeUpcomingInvoice?: boolean;
}

interface SubscriptionResponse extends UserSubscriptionData {
  usage?: {
    [feature: string]: {
      current: number;
      limit: number;
      resetDate: Date;
    };
  };
  paymentMethods?: Array<{
    id: string;
    type: string;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault: boolean;
  }>;
  upcomingInvoice?: {
    id: string;
    amount: number;
    currency: string;
    dueDate: Date;
    status: string;
  };
}

export const getUserSubscription = onCall<GetUserSubscriptionData>(
  {
    cors: corsOptions,
    enforceAppCheck: false,
    memory: '512MiB',
    timeoutSeconds: 30,
  },
  async (request): Promise<SubscriptionResponse> => {
    const { auth, data } = request;

    try {
      // Authentication check
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
      }

      const { 
        includeUsage = false, 
        includePaymentMethods = false, 
        includeUpcomingInvoice = false 
      } = data || {};

      logger.info(`Getting subscription data for user ${auth.uid}`, {
        includeUsage,
        includePaymentMethods,
        includeUpcomingInvoice,
      });

      // Get cached subscription data
      const subscriptionData = await cachedSubscriptionService.getUserSubscription(auth.uid);

      if (!subscriptionData) {
        logger.info(`No subscription found for user ${auth.uid}`);
        
        return {
          userId: auth.uid,
          subscription: null,
          features: {},
          hasActiveSubscription: false,
          isTrialActive: false,
          daysUntilExpiry: 0,
          lastUpdated: new Date(),
        };
      }

      // Build response
      const response: SubscriptionResponse = { ...subscriptionData };

      // Include usage data if requested
      if (includeUsage && subscriptionData.subscription) {
        response.usage = await getUserFeatureUsage(auth.uid, subscriptionData.subscription.planId);
      }

      // Include payment methods if requested
      if (includePaymentMethods && subscriptionData.subscription?.stripeCustomerId) {
        response.paymentMethods = await getUserPaymentMethods(
          subscriptionData.subscription.stripeCustomerId
        );
      }

      // Include upcoming invoice if requested
      if (includeUpcomingInvoice && subscriptionData.subscription?.stripeCustomerId) {
        response.upcomingInvoice = await getUpcomingInvoice(
          subscriptionData.subscription.stripeCustomerId
        );
      }

      logger.info(`Subscription data retrieved successfully for user ${auth.uid}`, {
        hasSubscription: !!subscriptionData.subscription,
        planId: subscriptionData.subscription?.planId,
        status: subscriptionData.subscription?.status,
        includesUsage: !!response.usage,
        includesPaymentMethods: !!response.paymentMethods,
        includesUpcomingInvoice: !!response.upcomingInvoice,
      });

      return response;

    } catch (error) {
      logger.error('Failed to get user subscription', {
        userId: auth?.uid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', 'Failed to get subscription data');
    }
  }
);

/**
 * Internal helper function to get user subscription data
 * Used by other functions that need subscription data without HTTP overhead
 */
export async function getUserSubscriptionInternal(userId: string): Promise<UserSubscriptionData> {
  try {
    logger.debug('Getting user subscription internally with cache', { userId });
    return await cachedSubscriptionService.getUserSubscription(userId);
  } catch (error) {
    logger.error('Error getting user subscription internally', { error, userId });
    throw error;
  }
}

/**
 * Helper function to invalidate cache when subscription changes
 */
export function invalidateUserSubscriptionCache(userId: string): void {
  cachedSubscriptionService.invalidateUserSubscription(userId);
}

/**
 * Get user feature usage data
 */
async function getUserFeatureUsage(
  userId: string, 
  planId: string
): Promise<{ [feature: string]: { current: number; limit: number; resetDate: Date } }> {
  try {
    const { db } = await import('../../../../../functions/src/config/firebase');
    
    // Get plan limits
    const planDoc = await db.collection('subscription_plans').doc(planId).get();
    const planData = planDoc.data();
    const planFeatures = planData?.features || {};

    // Get current month's usage for all features
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usageQuery = await db
      .collection('feature_usage')
      .where('userId', '==', userId)
      .where('timestamp', '>=', startOfMonth)
      .where('timestamp', '<=', endOfMonth)
      .get();

    // Count usage by feature
    const usageByFeature: { [feature: string]: number } = {};
    usageQuery.forEach(doc => {
      const data = doc.data();
      const feature = data.feature;
      usageByFeature[feature] = (usageByFeature[feature] || 0) + 1;
    });

    // Build usage response
    const usage: { [feature: string]: { current: number; limit: number; resetDate: Date } } = {};
    
    Object.keys(planFeatures).forEach(feature => {
      const featureConfig = planFeatures[feature];
      const limit = featureConfig?.limits?.monthly || featureConfig?.limits?.total || -1;
      const current = usageByFeature[feature] || 0;

      usage[feature] = {
        current,
        limit,
        resetDate: endOfMonth,
      };
    });

    return usage;

  } catch (error) {
    logger.error('Failed to get user feature usage', {
      userId,
      planId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {};
  }
}

/**
 * Get user payment methods from Stripe
 */
async function getUserPaymentMethods(stripeCustomerId: string): Promise<Array<{
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}>> {
  try {
    const Stripe = (await import('stripe')).default;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      logger.warn('Stripe secret key not configured');
      return [];
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    // Get customer's payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    // Get customer to find default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    const defaultPaymentMethodId = typeof customer !== 'string' 
      ? customer.invoice_settings?.default_payment_method 
      : null;

    return paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      expiryMonth: pm.card?.exp_month,
      expiryYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

  } catch (error) {
    logger.error('Failed to get user payment methods', {
      stripeCustomerId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return [];
  }
}

/**
 * Get upcoming invoice from Stripe
 */
async function getUpcomingInvoice(stripeCustomerId: string): Promise<{
  id: string;
  amount: number;
  currency: string;
  dueDate: Date;
  status: string;
} | undefined> {
  try {
    const Stripe = (await import('stripe')).default;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      logger.warn('Stripe secret key not configured');
      return undefined;
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    // Get upcoming invoice
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: stripeCustomerId,
    });

    if (!invoice) {
      return undefined;
    }

    return {
      id: invoice.id || 'upcoming',
      amount: (invoice.amount_due || 0) / 100, // Convert from cents
      currency: invoice.currency || 'usd',
      dueDate: new Date((invoice.period_end || invoice.created) * 1000),
      status: invoice.status || 'draft',
    };

  } catch (error) {
    // Stripe throws an error if there's no upcoming invoice
    if (error instanceof Error && error.message.includes('No upcoming invoice')) {
      return undefined;
    }

    logger.error('Failed to get upcoming invoice', {
      stripeCustomerId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return undefined;
  }
}