/**
 * CVPlus Premium Module - Billing Service
 * 
 * Comprehensive billing management with invoice generation,
 * payment tracking, and revenue analytics
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { logger } from '../utils/logger';
import {
  PaymentHistory,
  PaymentStatus,
  Invoice,
  InvoiceStatus,
  InvoiceItem,
  BillingPreferences,
  RevenueAnalytics,
  RefundRequest,
  RefundResponse,
  PaymentMethodDetails,
  Currency
} from '../types';
import { CACHE_TTL, CACHE_KEYS, CURRENCY_SYMBOLS } from '../constants/premium.constants';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Billing service configuration
 */
interface BillingServiceConfig {
  invoicePrefix: string;
  gracePeriodDays: number;
  retryAttempts: number;
  defaultCurrency: Currency;
  taxCalculation: {
    enabled: boolean;
    ratesUrl?: string;
  };
  notifications: {
    enabled: boolean;
    channels: ('email' | 'webhook')[];
  };
}

/**
 * Revenue period data
 */
interface RevenuePeriodData {
  period: string;
  revenue: number;
  transactions: number;
  refunds: number;
  customers: Set<string>;
}

/**
 * Default billing configuration
 */
const DEFAULT_CONFIG: BillingServiceConfig = {
  invoicePrefix: 'CVPLUS',
  gracePeriodDays: 3,
  retryAttempts: 3,
  defaultCurrency: 'USD',
  taxCalculation: {
    enabled: false
  },
  notifications: {
    enabled: true,
    channels: ['email']
  }
};

/**
 * Convert Firebase Timestamp to Date
 */
function toDate(timestamp: Timestamp | Date): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return timestamp.toDate();
}

/**
 * Comprehensive billing management service
 */
export class BillingService {
  private config: BillingServiceConfig;
  private cache: Map<string, any> = new Map();
  private revenueCache: Map<string, RevenuePeriodData> = new Map();

  constructor(config: Partial<BillingServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    logger.info('Billing service initialized', {
      invoicePrefix: this.config.invoicePrefix,
      gracePeriodDays: this.config.gracePeriodDays,
      defaultCurrency: this.config.defaultCurrency
    });
  }

  // =============================================================================
  // PAYMENT HISTORY MANAGEMENT
  // =============================================================================

  /**
   * Record a payment transaction
   */
  async recordPayment(payment: Omit<PaymentHistory, 'createdAt'>): Promise<PaymentHistory> {
    try {
      const paymentRecord: PaymentHistory = {
        ...payment,
        createdAt: new Date()
      };

      // Save to database
      await this.savePaymentToDatabase(paymentRecord);

      // Update revenue cache
      this.updateRevenueCache(paymentRecord);

      logger.info('Payment recorded', {
        paymentId: payment.paymentId,
        userId: payment.userId,
        amount: payment.amount,
        status: payment.status
      });

      return paymentRecord;
    } catch (error) {
      logger.error('Failed to record payment', {
        error: error instanceof Error ? error.message : error,
        paymentId: payment.paymentId
      });
      throw error;
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: PaymentStatus;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<PaymentHistory[]> {
    try {
      const cacheKey = `${CACHE_KEYS.PAYMENT}${userId}:${JSON.stringify(options)}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }

      // Load from database
      const payments = await this.loadPaymentHistoryFromDatabase(userId, options);

      // Cache the result
      this.cache.set(cacheKey, {
        data: payments,
        expiresAt: Date.now() + (CACHE_TTL.PAYMENT_HISTORY * 1000)
      });

      return payments;
    } catch (error) {
      logger.error('Failed to get payment history', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    metadata?: Record<string, any>
  ): Promise<PaymentHistory> {
    try {
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const updatedPayment: PaymentHistory = {
        ...payment,
        status,
        metadata: {
          ...payment.metadata,
          ...metadata,
          statusUpdatedAt: new Date()
        }
      };

      // Handle status-specific updates
      switch (status) {
        case 'succeeded':
          updatedPayment.processedAt = new Date();
          break;
        case 'failed':
          updatedPayment.failedAt = new Date();
          break;
        case 'refunded':
          updatedPayment.refundedAt = new Date();
          break;
      }

      // Save to database
      await this.savePaymentToDatabase(updatedPayment);

      // Update revenue cache if status changed significantly
      if (this.isRevenueAffectingStatusChange(payment.status, status)) {
        this.updateRevenueCache(updatedPayment);
      }

      // Send notifications if configured
      if (this.config.notifications.enabled) {
        await this.sendPaymentStatusNotification(updatedPayment);
      }

      logger.info('Payment status updated', {
        paymentId,
        userId: payment.userId,
        fromStatus: payment.status,
        toStatus: status
      });

      return updatedPayment;
    } catch (error) {
      logger.error('Failed to update payment status', {
        error: error instanceof Error ? error.message : error,
        paymentId,
        status
      });
      throw error;
    }
  }

  // =============================================================================
  // INVOICE MANAGEMENT
  // =============================================================================

  /**
   * Generate invoice for a payment
   */
  async generateInvoice(
    paymentId: string,
    items: InvoiceItem[],
    options: {
      dueDate?: Date;
      billingAddress?: any;
      notes?: string;
    } = {}
  ): Promise<Invoice> {
    try {
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const invoiceNumber = this.generateInvoiceNumber();
      const now = new Date();
      const dueDate = options.dueDate || new Date(now.getTime() + (this.config.gracePeriodDays * 24 * 60 * 60 * 1000));

      const invoice: Invoice = {
        id: `inv_${invoiceNumber}`,
        userId: payment.userId,
        stripeInvoiceId: payment.stripePaymentIntentId,
        number: invoiceNumber,
        status: payment.status === 'succeeded' ? 'paid' : 'open',
        amount: payment.amount,
        currency: payment.currency,
        items,
        billingPeriodStart: now,
        billingPeriodEnd: now, // For one-time payments
        dueDate,
        paidAt: payment.status === 'succeeded' && payment.processedAt ? toDate(payment.processedAt) : undefined,
        createdAt: now,
        updatedAt: now
      };

      // Save to database
      await this.saveInvoiceToDatabase(invoice);

      logger.info('Invoice generated', {
        invoiceId: invoice.id,
        invoiceNumber,
        userId: payment.userId,
        amount: payment.amount,
        status: invoice.status
      });

      return invoice;
    } catch (error) {
      logger.error('Failed to generate invoice', {
        error: error instanceof Error ? error.message : error,
        paymentId
      });
      throw error;
    }
  }

  /**
   * Get invoices for a user
   */
  async getUserInvoices(
    userId: string,
    options: {
      limit?: number;
      status?: InvoiceStatus;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<Invoice[]> {
    try {
      return await this.loadInvoicesFromDatabase(userId, options);
    } catch (error) {
      logger.error('Failed to get user invoices', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(invoiceId: string, paidAt: Date = new Date()): Promise<Invoice> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      if (invoice.status === 'paid') {
        logger.warn('Invoice already marked as paid', { invoiceId });
        return invoice;
      }

      const updatedInvoice: Invoice = {
        ...invoice,
        status: 'paid',
        paidAt,
        updatedAt: new Date()
      };

      await this.saveInvoiceToDatabase(updatedInvoice);

      logger.info('Invoice marked as paid', {
        invoiceId,
        userId: invoice.userId,
        amount: invoice.amount,
        paidAt
      });

      return updatedInvoice;
    } catch (error) {
      logger.error('Failed to mark invoice as paid', {
        error: error instanceof Error ? error.message : error,
        invoiceId
      });
      throw error;
    }
  }

  // =============================================================================
  // REFUND MANAGEMENT
  // =============================================================================

  /**
   * Process refund request
   */
  async processRefund(refundRequest: RefundRequest): Promise<RefundResponse> {
    try {
      const payment = await this.getPaymentById(refundRequest.paymentId);
      if (!payment) {
        throw new Error(`Payment not found: ${refundRequest.paymentId}`);
      }

      if (payment.status !== 'succeeded') {
        throw new Error('Can only refund successful payments');
      }

      // Calculate refund amount
      const refundAmount = refundRequest.amount || payment.amount;
      if (refundAmount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount');
      }

      // Create refund record
      const refund: RefundResponse = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: refundAmount,
        currency: payment.currency,
        status: 'pending',
        reason: refundRequest.reason,
        description: refundRequest.description,
        processedAt: new Date()
      };

      // Update payment record with refund information
      const updatedPayment: PaymentHistory = {
        ...payment,
        status: refundAmount === payment.amount ? 'refunded' : 'succeeded',
        refundAmount,
        refundReason: refundRequest.reason,
        refundedAt: new Date(),
        metadata: {
          ...payment.metadata,
          refundId: refund.id,
          refundedBy: 'system'
        }
      };

      // Save both records
      await this.savePaymentToDatabase(updatedPayment);
      await this.saveRefundToDatabase(refund);

      // Update revenue cache
      this.updateRevenueCache(updatedPayment);

      // Send notifications
      if (this.config.notifications.enabled) {
        await this.sendRefundNotification(refund, payment);
      }

      logger.info('Refund processed', {
        refundId: refund.id,
        paymentId: refundRequest.paymentId,
        userId: payment.userId,
        amount: refundAmount,
        reason: refundRequest.reason
      });

      return refund;
    } catch (error) {
      logger.error('Failed to process refund', {
        error: error instanceof Error ? error.message : error,
        refundRequest
      });
      throw error;
    }
  }

  // =============================================================================
  // BILLING PREFERENCES
  // =============================================================================

  /**
   * Get billing preferences for a user
   */
  async getBillingPreferences(userId: string): Promise<BillingPreferences | null> {
    try {
      return await this.loadBillingPreferencesFromDatabase(userId);
    } catch (error) {
      logger.error('Failed to get billing preferences', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      return null;
    }
  }

  /**
   * Update billing preferences
   */
  async updateBillingPreferences(
    userId: string,
    preferences: Partial<BillingPreferences>
  ): Promise<BillingPreferences> {
    try {
      const current = await this.getBillingPreferences(userId) || this.getDefaultBillingPreferences(userId);
      
      const updated: BillingPreferences = {
        ...current,
        ...preferences,
        userId
      };

      await this.saveBillingPreferencesToDatabase(updated);

      logger.info('Billing preferences updated', {
        userId,
        updatedFields: Object.keys(preferences)
      });

      return updated;
    } catch (error) {
      logger.error('Failed to update billing preferences', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  // =============================================================================
  // REVENUE ANALYTICS
  // =============================================================================

  /**
   * Generate revenue analytics for a period
   */
  async generateRevenueAnalytics(
    period: string, // YYYY-MM format
    includeMetrics = true
  ): Promise<RevenueAnalytics> {
    try {
      const cacheKey = `revenue_analytics_${period}`;
      const cached = this.revenueCache.get(cacheKey);
      
      if (cached) {
        return this.buildRevenueAnalytics(period, cached, includeMetrics);
      }

      // Calculate from database
      const periodData = await this.calculateRevenuePeriodData(period);
      this.revenueCache.set(cacheKey, periodData);

      return this.buildRevenueAnalytics(period, periodData, includeMetrics);
    } catch (error) {
      logger.error('Failed to generate revenue analytics', {
        error: error instanceof Error ? error.message : error,
        period
      });
      throw error;
    }
  }

  /**
   * Get revenue trends over multiple periods
   */
  async getRevenueTrends(periods: string[]): Promise<Map<string, RevenueAnalytics>> {
    const trends = new Map<string, RevenueAnalytics>();
    
    for (const period of periods) {
      try {
        const analytics = await this.generateRevenueAnalytics(period, false);
        trends.set(period, analytics);
      } catch (error) {
        logger.warn('Failed to get revenue for period', { period, error });
      }
    }
    
    return trends;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Format amount for display with currency
   */
  formatAmount(amount: number, currency: Currency): string {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const displayAmount = (amount / 100).toFixed(2);
    return `${symbol}${displayAmount}`;
  }

  /**
   * Calculate tax for amount based on region
   */
  async calculateTax(
    amount: number,
    currency: Currency,
    region?: string
  ): Promise<{ taxAmount: number; taxRate: number }> {
    if (!this.config.taxCalculation.enabled) {
      return { taxAmount: 0, taxRate: 0 };
    }

    // This would integrate with a tax calculation service
    // For now, return zero tax
    return { taxAmount: 0, taxRate: 0 };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Generate unique invoice number
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${this.config.invoicePrefix}-${timestamp}-${random}`;
  }

  /**
   * Update revenue cache with payment data
   */
  private updateRevenueCache(payment: PaymentHistory): void {
    const periodKey = this.getPeriodKey(toDate(payment.createdAt));
    
    let periodData = this.revenueCache.get(periodKey);
    if (!periodData) {
      periodData = {
        period: periodKey,
        revenue: 0,
        transactions: 0,
        refunds: 0,
        customers: new Set()
      };
    }

    // Update based on payment status
    if (payment.status === 'succeeded') {
      periodData.revenue += payment.amount;
      periodData.transactions += 1;
      periodData.customers.add(payment.userId);
    } else if (payment.status === 'refunded' && payment.refundAmount) {
      periodData.refunds += payment.refundAmount;
      periodData.revenue -= payment.refundAmount;
    }

    this.revenueCache.set(periodKey, periodData);
  }

  /**
   * Check if status change affects revenue calculation
   */
  private isRevenueAffectingStatusChange(fromStatus: PaymentStatus, toStatus: PaymentStatus): boolean {
    const revenueStatuses: PaymentStatus[] = ['succeeded', 'refunded'];
    return revenueStatuses.includes(fromStatus) || revenueStatuses.includes(toStatus);
  }

  /**
   * Get period key for revenue tracking
   */
  private getPeriodKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Build revenue analytics from period data
   */
  private buildRevenueAnalytics(
    period: string,
    data: RevenuePeriodData,
    includeMetrics: boolean
  ): RevenueAnalytics {
    const analytics: RevenueAnalytics = {
      period,
      totalRevenue: data.revenue,
      currency: this.config.defaultCurrency,
      subscriptionRevenue: data.revenue, // All revenue is currently subscription-based
      oneTimeRevenue: 0,
      refunds: data.refunds,
      netRevenue: data.revenue - data.refunds,
      customerCount: data.customers.size,
      averageRevenuePerUser: data.customers.size > 0 ? data.revenue / data.customers.size : 0,
      conversionRate: 0, // Would need additional data to calculate
      churnRate: 0, // Would need additional data to calculate
      metrics: {
        newSubscriptions: data.transactions,
        cancelledSubscriptions: 0, // Would need additional tracking
        upgrades: 0, // Would need additional tracking
        downgrades: 0 // Would need additional tracking
      }
    };

    return analytics;
  }

  /**
   * Get default billing preferences
   */
  private getDefaultBillingPreferences(userId: string): BillingPreferences {
    return {
      userId,
      currency: this.config.defaultCurrency,
      timezone: 'UTC',
      autoRenew: true,
      notifications: {
        invoiceCreated: true,
        paymentSucceeded: true,
        paymentFailed: true,
        subscriptionExpiring: true
      }
    };
  }

  // Database methods - These would be implemented based on your database choice
  private async savePaymentToDatabase(payment: PaymentHistory): Promise<void> {
    throw new Error('savePaymentToDatabase must be implemented');
  }

  private async loadPaymentHistoryFromDatabase(userId: string, options: any): Promise<PaymentHistory[]> {
    throw new Error('loadPaymentHistoryFromDatabase must be implemented');
  }

  private async getPaymentById(paymentId: string): Promise<PaymentHistory | null> {
    throw new Error('getPaymentById must be implemented');
  }

  private async saveInvoiceToDatabase(invoice: Invoice): Promise<void> {
    throw new Error('saveInvoiceToDatabase must be implemented');
  }

  private async loadInvoicesFromDatabase(userId: string, options: any): Promise<Invoice[]> {
    throw new Error('loadInvoicesFromDatabase must be implemented');
  }

  private async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    throw new Error('getInvoiceById must be implemented');
  }

  private async saveRefundToDatabase(refund: RefundResponse): Promise<void> {
    throw new Error('saveRefundToDatabase must be implemented');
  }

  private async loadBillingPreferencesFromDatabase(userId: string): Promise<BillingPreferences | null> {
    throw new Error('loadBillingPreferencesFromDatabase must be implemented');
  }

  private async saveBillingPreferencesToDatabase(preferences: BillingPreferences): Promise<void> {
    throw new Error('saveBillingPreferencesToDatabase must be implemented');
  }

  private async calculateRevenuePeriodData(period: string): Promise<RevenuePeriodData> {
    throw new Error('calculateRevenuePeriodData must be implemented');
  }

  private async sendPaymentStatusNotification(payment: PaymentHistory): Promise<void> {
    // Implementation would depend on notification service
    logger.info('Payment status notification sent', { paymentId: payment.paymentId });
  }

  private async sendRefundNotification(refund: RefundResponse, payment: PaymentHistory): Promise<void> {
    // Implementation would depend on notification service
    logger.info('Refund notification sent', { refundId: refund.id, userId: payment.userId });
  }
}