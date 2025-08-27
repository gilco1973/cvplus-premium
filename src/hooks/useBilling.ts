/**
 * CVPlus Premium Module - useBilling Hook
 * 
 * React hook for billing history and payment management
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UseBillingReturn,
  PaymentHistory,
  Invoice,
  PaymentStatus,
  InvoiceStatus
} from '../types';

/**
 * Hook configuration
 */
interface UseBillingConfig {
  userId?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

/**
 * React hook for billing management
 */
export const useBilling = (config: UseBillingConfig = {}): UseBillingReturn => {
  const {
    userId,
    limit = 10,
    autoRefresh = false,
    refreshInterval = 10 * 60 * 1000 // 10 minutes
  } = config;

  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch billing data
   */
  const fetchBillingData = useCallback(async (): Promise<void> => {
    if (!userId) {
      setError('User ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mock API calls - in real implementation, this would use BillingService
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock payment history
      const mockPayments: PaymentHistory[] = [
        {
          paymentId: 'pi_1234567890abcdef',
          userId,
          amount: 4900, // $49.00
          currency: 'USD',
          status: 'succeeded',
          stripePaymentIntentId: 'pi_1234567890abcdef',
          stripeCustomerId: 'cus_customer123',
          paymentMethod: {
            type: 'card',
            brand: 'visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2025
          },
          createdAt: new Date('2024-01-15T10:30:00Z'),
          processedAt: new Date('2024-01-15T10:30:05Z')
        },
        {
          paymentId: 'pi_0987654321fedcba',
          userId,
          amount: 2500, // $25.00
          currency: 'USD',
          status: 'refunded',
          stripePaymentIntentId: 'pi_0987654321fedcba',
          stripeCustomerId: 'cus_customer123',
          paymentMethod: {
            type: 'card',
            brand: 'mastercard',
            last4: '5555'
          },
          refundAmount: 2500,
          refundReason: 'requested_by_customer',
          createdAt: new Date('2023-12-01T14:20:00Z'),
          processedAt: new Date('2023-12-01T14:20:03Z'),
          refundedAt: new Date('2023-12-05T09:15:00Z')
        },
        {
          paymentId: 'pi_failed123456',
          userId,
          amount: 4900,
          currency: 'USD',
          status: 'failed',
          stripePaymentIntentId: 'pi_failed123456',
          stripeCustomerId: 'cus_customer123',
          paymentMethod: {
            type: 'card',
            brand: 'visa',
            last4: '0002'
          },
          failureReason: 'Your card was declined.',
          createdAt: new Date('2023-11-20T16:45:00Z'),
          failedAt: new Date('2023-11-20T16:45:02Z')
        }
      ];

      // Mock invoices
      const mockInvoices: Invoice[] = [
        {
          id: 'inv_premium_20240115',
          userId,
          stripeInvoiceId: 'in_stripe123456',
          number: 'CVPLUS-2024-001',
          status: 'paid',
          amount: 4900,
          currency: 'USD',
          items: [
            {
              description: 'CVPlus Premium - Lifetime Access',
              amount: 4900,
              currency: 'USD',
              quantity: 1,
              unitPrice: 4900
            }
          ],
          billingPeriodStart: new Date('2024-01-15'),
          billingPeriodEnd: new Date('2024-01-15'),
          dueDate: new Date('2024-01-18'),
          paidAt: new Date('2024-01-15T10:30:05Z'),
          createdAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-15T10:30:05Z')
        },
        {
          id: 'inv_refunded_20231201',
          userId,
          stripeInvoiceId: 'in_refunded789',
          number: 'CVPLUS-2023-089',
          status: 'void',
          amount: 2500,
          currency: 'USD',
          items: [
            {
              description: 'CVPlus Premium - Monthly',
              amount: 2500,
              currency: 'USD',
              quantity: 1,
              unitPrice: 2500
            }
          ],
          billingPeriodStart: new Date('2023-12-01'),
          billingPeriodEnd: new Date('2023-12-31'),
          dueDate: new Date('2023-12-04'),
          paidAt: new Date('2023-12-01T14:20:03Z'),
          createdAt: new Date('2023-12-01T14:20:00Z'),
          updatedAt: new Date('2023-12-05T09:15:00Z')
        }
      ];

      // Apply limit
      setPaymentHistory(mockPayments.slice(0, limit));
      setInvoices(mockInvoices.slice(0, limit));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load billing data';
      setError(errorMessage);
      console.error('Billing fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  /**
   * Refresh billing data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchBillingData();
  }, [fetchBillingData]);

  // Initial load
  useEffect(() => {
    if (userId) {
      fetchBillingData();
    }
  }, [userId, fetchBillingData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !userId || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchBillingData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, userId, refreshInterval, fetchBillingData]);

  return {
    paymentHistory,
    invoices,
    isLoading,
    error,
    refresh
  };
};

/**
 * Hook for payment statistics
 */
export const useBillingStats = (userId?: string) => {
  const { paymentHistory, invoices, isLoading } = useBilling({ userId });

  const stats = {
    totalPayments: paymentHistory.length,
    successfulPayments: paymentHistory.filter(p => p.status === 'succeeded').length,
    failedPayments: paymentHistory.filter(p => p.status === 'failed').length,
    refundedPayments: paymentHistory.filter(p => p.status === 'refunded').length,
    
    totalSpent: paymentHistory
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0),
    
    totalRefunded: paymentHistory
      .filter(p => p.refundAmount)
      .reduce((sum, p) => sum + (p.refundAmount || 0), 0),
    
    lastPaymentDate: paymentHistory.length > 0 
      ? new Date(Math.max(...paymentHistory.map(p => new Date(p.createdAt).getTime())))
      : null,
    
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(i => i.status === 'paid').length,
    openInvoices: invoices.filter(i => i.status === 'open').length,
    
    successRate: paymentHistory.length > 0 
      ? (paymentHistory.filter(p => p.status === 'succeeded').length / paymentHistory.length) * 100
      : 0
  };

  return {
    stats,
    isLoading
  };
};

/**
 * Hook for recent billing activity
 */
export const useRecentBillingActivity = (userId?: string, days = 30) => {
  const { paymentHistory, invoices, isLoading } = useBilling({ userId });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentPayments = paymentHistory.filter(
    p => new Date(p.createdAt) >= cutoffDate
  );

  const recentInvoices = invoices.filter(
    i => new Date(i.createdAt) >= cutoffDate
  );

  const activity = [
    ...recentPayments.map(p => ({
      type: 'payment' as const,
      id: p.paymentId,
      date: new Date(p.createdAt),
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      description: `Payment ${p.status}`
    })),
    ...recentInvoices.map(i => ({
      type: 'invoice' as const,
      id: i.id,
      date: new Date(i.createdAt),
      amount: i.amount,
      currency: i.currency,
      status: i.status,
      description: `Invoice ${i.number}`
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    activity,
    recentPayments,
    recentInvoices,
    isLoading
  };
};

/**
 * Hook for payment method management
 */
export const usePaymentMethods = (userId?: string) => {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock payment methods
      const mockMethods = [
        {
          id: 'pm_card123',
          type: 'card',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
          isDefault: true
        }
      ];

      setPaymentMethods(mockMethods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const addPaymentMethod = useCallback(async (methodData: any) => {
    // Mock adding payment method
    console.log('Adding payment method:', methodData);
  }, []);

  const removePaymentMethod = useCallback(async (methodId: string) => {
    // Mock removing payment method
    console.log('Removing payment method:', methodId);
  }, []);

  const setDefaultPaymentMethod = useCallback(async (methodId: string) => {
    // Mock setting default payment method
    console.log('Setting default payment method:', methodId);
  }, []);

  return {
    paymentMethods,
    isLoading,
    error,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    refresh: fetchPaymentMethods
  };
};

export default useBilling;