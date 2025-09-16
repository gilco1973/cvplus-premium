/**
 * Advanced Billing Service
 * 
 * Sophisticated subscription management with automated billing operations.
 * Handles proration, dunning, invoicing, and enterprise billing features.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 * @since Phase 3 - Analytics & Revenue Intelligence
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

export interface SubscriptionModification {
  type: 'upgrade' | 'downgrade' | 'pause' | 'cancel' | 'reactivate';
  newPlan?: BillingPlan;
  effectiveDate?: Date;
  prorationBehavior?: 'immediate' | 'end_of_period' | 'none';
  reason?: string;
  gracePeriodDays?: number;
}

export interface BillingPlan {
  id: string;
  name: string;
  tier: 'free' | 'premium' | 'enterprise';
  monthlyPrice: number;
  yearlyPrice: number;
  stripePriceId: string;
  stripeYearlyPriceId: string;
  features: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  monthlyUploads: number;
  cvGenerations: number;
  featuresPerCV: number;
  storageGB: number;
  apiCallsPerMonth: number;
  teamMembers: number;
}

export interface SubscriptionResult {
  success: boolean;
  subscription?: any;
  proration?: ProrationResult;
  invoice?: GeneratedInvoice;
  error?: string;
}

export interface ProrationResult {
  amount: number;
  creditAmount: number;
  upcomingInvoiceAmount: number;
  effectiveDate: Date;
  description: string;
}

export interface GeneratedInvoice {
  id: string;
  stripeInvoiceId: string;
  amount: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate: Date;
  pdfUrl?: string;
  paymentIntent?: string;
}

export interface DunningConfiguration {
  maxAttempts: number;
  retryDelays: number[]; // Days between retry attempts
  emailTemplates: {
    [attempt: number]: string;
  };
  finalNoticeDelay: number; // Days before final notice
  cancellationDelay: number; // Days before auto-cancellation
}

export interface TaxConfiguration {
  enabled: boolean;
  provider: 'stripe_tax' | 'avalara' | 'taxjar' | 'manual';
  vatCountries: string[];
  gstCountries: string[];
  exemptions: TaxExemption[];
}

export interface TaxExemption {
  customerId: string;
  type: 'vat' | 'gst' | 'sales_tax' | 'all';
  exemptionCertificate?: string;
  validUntil?: Date;
}

export class AdvancedBillingService {
  private readonly db = getFirestore();
  private readonly stripe: Stripe;
  private readonly dunningConfig: DunningConfiguration;
  private readonly taxConfig: TaxConfiguration;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });

    this.dunningConfig = {
      maxAttempts: 4,
      retryDelays: [1, 3, 7, 14], // Days
      emailTemplates: {
        1: 'payment_failed_gentle',
        2: 'payment_failed_reminder',
        3: 'payment_failed_urgent',
        4: 'payment_failed_final'
      },
      finalNoticeDelay: 14,
      cancellationDelay: 21
    };

    this.taxConfig = {
      enabled: true,
      provider: 'stripe_tax',
      vatCountries: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL'],
      gstCountries: ['AU', 'NZ', 'SG'],
      exemptions: []
    };
  }

  /**
   * Handle sophisticated subscription modifications with proration
   */
  async handleSubscriptionModification(
    userId: string,
    modification: SubscriptionModification
  ): Promise<SubscriptionResult> {
    logger.info('Processing subscription modification', {
      userId,
      modificationType: modification.type
    });

    try {
      const currentSubscription = await this.getCurrentSubscription(userId);
      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }

      switch (modification.type) {
        case 'upgrade':
          return await this.processUpgrade(currentSubscription, modification);
        case 'downgrade':
          return await this.processDowngrade(currentSubscription, modification);
        case 'pause':
          return await this.processPause(currentSubscription, modification);
        case 'cancel':
          return await this.processGracefulCancellation(currentSubscription, modification);
        case 'reactivate':
          return await this.processReactivation(currentSubscription, modification);
        default:
          throw new Error(`Unsupported modification type: ${modification.type}`);
      }

    } catch (error) {
      logger.error('Failed to process subscription modification', {
        userId,
        modificationType: modification.type,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process subscription upgrade with immediate proration
   */
  private async processUpgrade(
    currentSub: any,
    modification: SubscriptionModification
  ): Promise<SubscriptionResult> {
    if (!modification.newPlan) {
      throw new Error('New plan required for upgrade');
    }

    logger.info('Processing subscription upgrade', {
      userId: currentSub.userId,
      fromPlan: currentSub.plan?.name,
      toPlan: modification.newPlan.name
    });

    // Calculate proration
    const proration = await this.calculateProration(currentSub, modification.newPlan);

    // Update Stripe subscription
    const stripeSubscription = await this.stripe.subscriptions.update(
      currentSub.stripeSubscriptionId,
      {
        items: [{
          id: currentSub.stripeItemId,
          price: modification.newPlan.stripePriceId
        }],
        proration_behavior: 'always_invoice',
        billing_cycle_anchor: modification.prorationBehavior === 'immediate' ? 'now' : 'unchanged'
      }
    );

    // Update Firestore subscription record
    await this.updateSubscriptionRecord(currentSub.userId, {
      plan: modification.newPlan,
      tier: modification.newPlan.tier,
      upgradedAt: new Date(),
      prorationAmount: proration.amount,
      stripeSubscriptionId: stripeSubscription.id,
      status: 'active'
    });

    // Send upgrade confirmation
    await this.sendUpgradeConfirmation(currentSub.userId, modification.newPlan);

    // Track upgrade event for analytics
    await this.trackBillingEvent(currentSub.userId, 'subscription_upgraded', {
      fromPlan: currentSub.plan?.id,
      toPlan: modification.newPlan.id,
      prorationAmount: proration.amount
    });

    return {
      success: true,
      subscription: stripeSubscription,
      proration
    };
  }

  /**
   * Process subscription downgrade with end-of-period billing
   */
  private async processDowngrade(
    currentSub: any,
    modification: SubscriptionModification
  ): Promise<SubscriptionResult> {
    if (!modification.newPlan) {
      throw new Error('New plan required for downgrade');
    }

    logger.info('Processing subscription downgrade', {
      userId: currentSub.userId,
      fromPlan: currentSub.plan?.name,
      toPlan: modification.newPlan.name
    });

    // For downgrades, typically apply at end of current period
    const effectiveDate = modification.effectiveDate || new Date(currentSub.currentPeriodEnd);

    // Schedule the downgrade
    const stripeSubscription = await this.stripe.subscriptions.update(
      currentSub.stripeSubscriptionId,
      {
        items: [{
          id: currentSub.stripeItemId,
          price: modification.newPlan.stripePriceId
        }],
        proration_behavior: modification.prorationBehavior || 'none',
        billing_cycle_anchor: 'unchanged'
      }
    );

    // Update subscription record with scheduled downgrade
    await this.updateSubscriptionRecord(currentSub.userId, {
      scheduledDowngrade: {
        newPlan: modification.newPlan,
        effectiveDate,
        reason: modification.reason
      },
      downgradedAt: new Date()
    });

    // Send downgrade notification
    await this.sendDowngradeNotification(currentSub.userId, modification.newPlan, effectiveDate);

    return {
      success: true,
      subscription: stripeSubscription
    };
  }

  /**
   * Advanced dunning management for failed payments
   */
  async handleDunningManagement(subscriptionId: string): Promise<void> {
    logger.info('Processing dunning management', { subscriptionId });

    try {
      const subscription = await this.getSubscriptionByStripeId(subscriptionId);
      if (!subscription) {
        logger.warn('Subscription not found for dunning', { subscriptionId });
        return;
      }

      const failedPayments = await this.getFailedPayments(subscriptionId);
      if (failedPayments.length === 0) {
        return;
      }

      const latestFailure = failedPayments[0];
      const attemptNumber = failedPayments.length;
      const daysSinceFailure = this.daysSince(latestFailure.created);

      // Check if we should trigger dunning action
      const shouldTrigger = this.dunningConfig.retryDelays.includes(daysSinceFailure);
      
      if (!shouldTrigger) {
        return;
      }

      if (attemptNumber <= this.dunningConfig.maxAttempts) {
        await this.executeDunningStep(subscription, attemptNumber, daysSinceFailure);
      } else {
        await this.handleFinalDunningAction(subscription);
      }

    } catch (error) {
      logger.error('Dunning management failed', { subscriptionId, error });
    }
  }

  /**
   * Execute specific dunning step
   */
  private async executeDunningStep(
    subscription: any,
    attemptNumber: number,
    daysSinceFailure: number
  ): Promise<void> {
    logger.info('Executing dunning step', {
      userId: subscription.userId,
      attemptNumber,
      daysSinceFailure
    });

    // Send appropriate dunning email
    const emailTemplate = this.dunningConfig.emailTemplates[attemptNumber];
    if (emailTemplate) {
      await this.sendDunningEmail(subscription.userId, emailTemplate, {
        attemptNumber,
        daysSinceFailure,
        nextRetryDate: this.calculateNextRetryDate(daysSinceFailure)
      });
    }

    // Retry payment if appropriate
    if (attemptNumber <= 2) {
      try {
        await this.retryPayment(subscription.stripeSubscriptionId);
      } catch (paymentError) {
        logger.warn('Payment retry failed', {
          subscriptionId: subscription.stripeSubscriptionId,
          error: paymentError
        });
      }
    }

    // Track dunning event
    await this.trackBillingEvent(subscription.userId, 'dunning_attempt', {
      attemptNumber,
      daysSinceFailure,
      template: emailTemplate
    });
  }

  /**
   * Generate sophisticated invoices with tax calculation
   */
  async generateInvoiceWithTaxes(
    userId: string,
    items: InvoiceItem[],
    options: InvoiceOptions = {}
  ): Promise<GeneratedInvoice> {
    logger.info('Generating invoice with tax calculation', { userId });

    try {
      const user = await this.getUser(userId);
      const customer = await this.getOrCreateStripeCustomer(user);

      // Calculate taxes based on customer location and exemptions
      const taxInfo = await this.calculateTaxes(user, items);

      // Create Stripe invoice
      const invoice = await this.stripe.invoices.create({
        customer: customer.id,
        auto_advance: options.autoAdvance !== false,
        collection_method: options.collectionMethod || 'charge_automatically',
        due_date: options.dueDate ? Math.floor(options.dueDate.getTime() / 1000) : undefined,
        metadata: {
          userId: userId,
          taxProvider: this.taxConfig.provider,
          country: user.country || 'unknown'
        }
      });

      // Add line items
      for (const item of items) {
        await this.stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          amount: Math.round(item.amount * 100), // Convert to cents
          currency: item.currency || 'usd',
          description: item.description,
          metadata: item.metadata || {}
        });
      }

      // Add tax line items if applicable
      if (taxInfo.totalTax > 0) {
        await this.stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          amount: Math.round(taxInfo.totalTax * 100),
          currency: 'usd',
          description: taxInfo.description
        });
      }

      // Finalize invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);

      // Store invoice record in Firestore
      const invoiceRecord: GeneratedInvoice = {
        id: this.generateInvoiceId(),
        stripeInvoiceId: finalizedInvoice.id,
        amount: finalizedInvoice.amount_due / 100,
        subtotal: finalizedInvoice.subtotal / 100,
        taxAmount: taxInfo.totalTax,
        discountAmount: (finalizedInvoice.discount?.amount || 0) / 100,
        total: finalizedInvoice.total / 100,
        currency: finalizedInvoice.currency,
        status: finalizedInvoice.status as any,
        dueDate: new Date(finalizedInvoice.due_date * 1000),
        pdfUrl: finalizedInvoice.invoice_pdf || undefined,
        paymentIntent: finalizedInvoice.payment_intent as string | undefined
      };

      await this.storeInvoiceRecord(userId, invoiceRecord);

      return invoiceRecord;

    } catch (error) {
      logger.error('Failed to generate invoice', { userId, error });
      throw new Error('Invoice generation failed');
    }
  }

  /**
   * Calculate prorated amounts for subscription changes
   */
  private async calculateProration(
    currentSub: any,
    newPlan: BillingPlan
  ): Promise<ProrationResult> {
    const currentPlanPrice = currentSub.plan?.monthlyPrice || 0;
    const newPlanPrice = newPlan.monthlyPrice;
    
    // Calculate remaining days in current period
    const now = new Date();
    const periodEnd = new Date(currentSub.currentPeriodEnd);
    const totalDays = this.daysBetween(new Date(currentSub.currentPeriodStart), periodEnd);
    const remainingDays = this.daysBetween(now, periodEnd);
    
    // Calculate prorated amounts
    const dailyCurrentRate = currentPlanPrice / totalDays;
    const dailyNewRate = newPlanPrice / totalDays;
    
    const currentPeriodCredit = dailyCurrentRate * remainingDays;
    const newPeriodCharge = dailyNewRate * remainingDays;
    const prorationAmount = newPeriodCharge - currentPeriodCredit;
    
    // Calculate upcoming invoice amount (full new plan price)
    const upcomingInvoiceAmount = newPlanPrice;

    return {
      amount: Math.round(prorationAmount * 100) / 100,
      creditAmount: Math.round(currentPeriodCredit * 100) / 100,
      upcomingInvoiceAmount,
      effectiveDate: now,
      description: `Proration for upgrade from ${currentSub.plan?.name} to ${newPlan.name}`
    };
  }

  /**
   * Calculate taxes based on customer location and exemptions
   */
  private async calculateTaxes(user: any, items: InvoiceItem[]): Promise<TaxCalculationResult> {
    if (!this.taxConfig.enabled) {
      return { totalTax: 0, description: 'Tax calculation disabled', breakdown: [] };
    }

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    
    // Check for tax exemptions
    const exemption = this.taxConfig.exemptions.find(e => e.customerId === user.stripeCustomerId);
    if (exemption && (!exemption.validUntil || exemption.validUntil > new Date())) {
      return { totalTax: 0, description: 'Tax exempt', breakdown: [] };
    }

    // Calculate tax based on location
    let taxRate = 0;
    let taxDescription = '';

    if (this.taxConfig.vatCountries.includes(user.country)) {
      taxRate = 0.20; // 20% VAT (simplified)
      taxDescription = 'VAT (20%)';
    } else if (this.taxConfig.gstCountries.includes(user.country)) {
      taxRate = 0.10; // 10% GST (simplified)
      taxDescription = 'GST (10%)';
    } else if (user.country === 'US') {
      // US sales tax calculation would be more complex in reality
      taxRate = user.state === 'CA' ? 0.0875 : 0.06; // Simplified
      taxDescription = `Sales Tax (${(taxRate * 100).toFixed(1)}%)`;
    }

    const totalTax = subtotal * taxRate;

    return {
      totalTax: Math.round(totalTax * 100) / 100,
      description: taxDescription,
      breakdown: [{
        type: taxDescription,
        rate: taxRate,
        amount: totalTax,
        taxableAmount: subtotal
      }]
    };
  }

  /**
   * Helper methods
   */
  private async getCurrentSubscription(userId: string): Promise<any> {
    const doc = await this.db.collection('subscriptions').doc(userId).get();
    return doc.exists ? { userId, ...doc.data() } : null;
  }

  private async updateSubscriptionRecord(userId: string, updates: any): Promise<void> {
    await this.db.collection('subscriptions').doc(userId).update({
      ...updates,
      updatedAt: new Date()
    });
  }

  private async getUser(userId: string): Promise<any> {
    const doc = await this.db.collection('users').doc(userId).get();
    if (!doc.exists) {
      throw new Error('User not found');
    }
    return { id: userId, ...doc.data() };
  }

  private async trackBillingEvent(userId: string, event: string, data: any): Promise<void> {
    await this.db.collection('billing_events').add({
      userId,
      event,
      data,
      timestamp: new Date()
    });
  }

  private daysSince(timestamp: number): number {
    return Math.floor((Date.now() / 1000 - timestamp) / 86400);
  }

  private daysBetween(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private generateInvoiceId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private calculateNextRetryDate(daysSinceFailure: number): Date {
    const nextRetry = this.dunningConfig.retryDelays.find(delay => delay > daysSinceFailure);
    const date = new Date();
    date.setDate(date.getDate() + (nextRetry || 7));
    return date;
  }

  // Placeholder methods for external integrations
  private async getFailedPayments(subscriptionId: string): Promise<any[]> { return []; }
  private async retryPayment(subscriptionId: string): Promise<any> { return true; }
  private async sendUpgradeConfirmation(userId: string, plan: BillingPlan): Promise<void> {}
  private async sendDowngradeNotification(userId: string, plan: BillingPlan, effectiveDate: Date): Promise<void> {}
  private async sendDunningEmail(userId: string, template: string, data: any): Promise<void> {}
  private async getOrCreateStripeCustomer(user: any): Promise<any> { return { id: 'cust_123' }; }
  private async storeInvoiceRecord(userId: string, invoice: GeneratedInvoice): Promise<void> {}
  private async getSubscriptionByStripeId(stripeId: string): Promise<any> { return null; }
  private async handleFinalDunningAction(subscription: any): Promise<void> {}
  private async processPause(sub: any, mod: SubscriptionModification): Promise<SubscriptionResult> { 
    return { success: true }; 
  }
  private async processGracefulCancellation(sub: any, mod: SubscriptionModification): Promise<SubscriptionResult> { 
    return { success: true }; 
  }
  private async processReactivation(sub: any, mod: SubscriptionModification): Promise<SubscriptionResult> { 
    return { success: true }; 
  }
}

// Supporting interfaces
interface InvoiceItem {
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
}

interface InvoiceOptions {
  autoAdvance?: boolean;
  collectionMethod?: 'charge_automatically' | 'send_invoice';
  dueDate?: Date;
}

interface TaxCalculationResult {
  totalTax: number;
  description: string;
  breakdown: TaxBreakdownItem[];
}

interface TaxBreakdownItem {
  type: string;
  rate: number;
  amount: number;
  taxableAmount: number;
}

export const advancedBillingService = new AdvancedBillingService();