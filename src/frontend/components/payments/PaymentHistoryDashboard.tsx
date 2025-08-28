/**
 * CVPlus Payment History Dashboard Component
 * Phase 5-6: Service Integration & Frontend
 * 
 * Comprehensive payment history with multi-provider support, detailed views,
 * refund management, and export functionality.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PaymentProviderName,
  PaymentIntent,
  PaymentStatus,
  PaymentError,
  RefundRequest,
  RefundResult
} from '../../../types/payments.types';
import { getUnifiedPaymentService } from '../../services/unified-payment.service';

// Dashboard-specific types
interface PaymentTransaction {
  id: string;
  provider: PaymentProviderName;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  customerEmail?: string;
  created_at: Date;
  updated_at: Date;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
  };
  refunds?: RefundTransaction[];
  metadata?: Record<string, any>;
}

interface RefundTransaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason?: string;
  created_at: Date;
}

interface PaymentHistoryFilters {
  dateRange: 'all' | '7d' | '30d' | '90d' | 'custom';
  startDate?: Date;
  endDate?: Date;
  status: PaymentStatus | 'all';
  provider: PaymentProviderName | 'all';
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
}

interface PaymentHistoryStats {
  totalTransactions: number;
  totalAmount: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedAmount: number;
  averageTransactionAmount: number;
  providerBreakdown: Record<PaymentProviderName, {
    count: number;
    amount: number;
    successRate: number;
  }>;
}

interface PaymentHistoryDashboardProps {
  /** User ID to fetch payments for */
  userId?: string;
  
  /** Show admin view with all users */
  isAdminView?: boolean;
  
  /** Initial filters */
  initialFilters?: Partial<PaymentHistoryFilters>;
  
  /** Enable refund functionality */
  enableRefunds?: boolean;
  
  /** Enable export functionality */
  enableExport?: boolean;
  
  /** Items per page */
  pageSize?: number;
  
  /** Custom styling */
  className?: string;
  
  /** Analytics callback */
  onAnalytics?: (event: string, data: any) => void;
}

/**
 * Default filters
 */
const DEFAULT_FILTERS: PaymentHistoryFilters = {
  dateRange: '30d',
  status: 'all',
  provider: 'all'
};

/**
 * Payment History Dashboard Component
 */
export const PaymentHistoryDashboard: React.FC<PaymentHistoryDashboardProps> = ({
  userId,
  isAdminView = false,
  initialFilters = {},
  enableRefunds = false,
  enableExport = true,
  pageSize = 20,
  className = '',
  onAnalytics
}) => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [stats, setStats] = useState<PaymentHistoryStats | null>(null);
  const [filters, setFilters] = useState<PaymentHistoryFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefunding, setIsRefunding] = useState<string | null>(null);
  
  const paymentService = getUnifiedPaymentService();

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const queryParams = {
        userId: isAdminView ? undefined : userId,
        status: filters.status === 'all' ? undefined : filters.status,
        provider: filters.provider === 'all' ? undefined : filters.provider,
        dateRange: filters.dateRange,
        startDate: filters.startDate,
        endDate: filters.endDate,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        search: filters.searchQuery,
        page: currentPage,
        limit: pageSize
      };
      
      // Mock API call - would be replaced with actual service call
      const response = await mockFetchPaymentHistory(queryParams);
      
      setTransactions(response.transactions);
      setStats(response.stats);
      
      if (onAnalytics) {
        onAnalytics('payment_history_viewed', {
          filters,
          transaction_count: response.transactions.length,
          page: currentPage
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment history');
      console.error('Error fetching payment history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize, userId, isAdminView, onAnalytics]);

  // =============================================================================
  // FILTERS AND SEARCH
  // =============================================================================

  const handleFilterChange = useCallback((key: keyof PaymentHistoryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handleDateRangeChange = useCallback((range: PaymentHistoryFilters['dateRange']) => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        // Keep existing custom dates
        break;
      default:
        startDate = undefined;
        endDate = undefined;
    }
    
    setFilters(prev => ({
      ...prev,
      dateRange: range,
      startDate: range === 'custom' ? prev.startDate : startDate,
      endDate: range === 'custom' ? prev.endDate : endDate
    }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  // =============================================================================
  // REFUND MANAGEMENT
  // =============================================================================

  const handleRefund = useCallback(async (
    transactionId: string,
    amount?: number,
    reason?: RefundRequest['reason']
  ) => {
    if (!enableRefunds) return;
    
    try {
      setIsRefunding(transactionId);
      
      // Mock refund API call
      const refundResult = await mockProcessRefund({
        payment_intent_id: transactionId,
        amount,
        reason
      });
      
      if (refundResult.success) {
        // Refresh transactions to show updated refund status
        await fetchTransactions();
        
        if (onAnalytics) {
          onAnalytics('payment_refunded', {
            transaction_id: transactionId,
            refund_amount: amount,
            reason
          });
        }
      } else {
        setError(refundResult.error?.message || 'Refund failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund processing failed');
    } finally {
      setIsRefunding(null);
    }
  }, [enableRefunds, fetchTransactions, onAnalytics]);

  // =============================================================================
  // EXPORT FUNCTIONALITY
  // =============================================================================

  const handleExport = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    if (!enableExport) return;
    
    try {
      if (onAnalytics) {
        onAnalytics('payment_history_exported', {
          format,
          filters,
          transaction_count: transactions.length
        });
      }
      
      // Mock export functionality
      const exportData = transactions.map(tx => ({
        id: tx.id,
        provider: tx.provider,
        amount: tx.amount / 100,
        currency: tx.currency,
        status: tx.status,
        description: tx.description,
        customer_email: tx.customerEmail,
        payment_method: tx.paymentMethod ? `${tx.paymentMethod.brand} ****${tx.paymentMethod.last4}` : '',
        created_at: tx.created_at.toISOString(),
        refunded_amount: tx.refunds?.reduce((sum, refund) => sum + refund.amount, 0) || 0
      }));
      
      if (format === 'csv') {
        downloadCSV(exportData, 'payment-history');
      } else if (format === 'json') {
        downloadJSON(exportData, 'payment-history');
      } else {
        // PDF export would require a proper PDF library
        console.log('PDF export not implemented in this demo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }, [enableExport, transactions, filters, onAnalytics]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const filteredTransactions = useMemo(() => {
    return transactions; // Filtering is handled server-side in real implementation
  }, [transactions]);
  
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTransactions.length / pageSize);
  }, [filteredTransactions.length, pageSize]);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderStatsCard = ({
    title,
    value,
    change,
    icon,
    color = 'blue'
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: React.ReactNode;
    color?: 'blue' | 'green' | 'red' | 'yellow';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      green: 'bg-green-50 text-green-600 border-green-100',
      red: 'bg-red-50 text-red-600 border-red-100',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100'
    };
    
    return (
      <div className={`p-6 rounded-xl border-2 ${colorClasses[color]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change && (
              <p className="text-sm text-gray-500 mt-1">{change}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionRow = (transaction: PaymentTransaction) => {
    const statusColors = {
      succeeded: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      requires_action: 'bg-orange-100 text-orange-800',
      canceled: 'bg-gray-100 text-gray-800',
      refunded: 'bg-purple-100 text-purple-800',
      partially_refunded: 'bg-purple-100 text-purple-800'
    };
    
    const providerIcons = {
      stripe: (
        <div className="w-6 h-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">S</span>
        </div>
      ),
      paypal: (
        <div className="w-6 h-4 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
      )
    };
    
    return (
      <tr
        key={transaction.id}
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setSelectedTransaction(transaction)}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="mr-3">
              {providerIcons[transaction.provider]}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {transaction.id.slice(-8).toUpperCase()}
              </div>
              <div className="text-sm text-gray-500">
                {transaction.provider}
              </div>
            </div>
          </div>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: transaction.currency
            }).format(transaction.amount / 100)}
          </div>
          {transaction.paymentMethod && (
            <div className="text-sm text-gray-500">
              {transaction.paymentMethod.brand} ****{transaction.paymentMethod.last4}
            </div>
          )}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            statusColors[transaction.status] || 'bg-gray-100 text-gray-800'
          }`}>
            {transaction.status.replace('_', ' ')}
          </span>
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {transaction.description || 'No description'}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {isAdminView && transaction.customerEmail}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {transaction.created_at.toLocaleDateString()}
        </td>
        
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex space-x-2">
            <button
              className="text-blue-600 hover:text-blue-800 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTransaction(transaction);
              }}
            >
              View
            </button>
            
            {enableRefunds && transaction.status === 'succeeded' && !transaction.refunds?.length && (
              <button
                className="text-red-600 hover:text-red-800 transition-colors"
                disabled={isRefunding === transaction.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefund(transaction.id);
                }}
              >
                {isRefunding === transaction.id ? 'Processing...' : 'Refund'}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  if (isLoading && transactions.length === 0) {
    return (
      <div className={`payment-history-dashboard loading ${className}`}>
        <div className="animate-pulse space-y-6">
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          
          {/* Filters skeleton */}
          <div className="h-16 bg-gray-200 rounded-xl"></div>
          
          {/* Table skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`payment-history-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isAdminView ? 'All Payments' : 'Payment History'}
        </h1>
        <p className="text-gray-600">
          {isAdminView 
            ? 'Manage and monitor all payment transactions across the platform'
            : 'View and manage your payment transactions and receipts'
          }
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {renderStatsCard({
            title: 'Total Transactions',
            value: stats.totalTransactions.toLocaleString(),
            icon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
            ),
            color: 'blue'
          })}
          
          {renderStatsCard({
            title: 'Total Amount',
            value: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(stats.totalAmount / 100),
            icon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
            ),
            color: 'green'
          })}
          
          {renderStatsCard({
            title: 'Success Rate',
            value: `${Math.round((stats.successfulTransactions / stats.totalTransactions) * 100)}%`,
            icon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ),
            color: 'green'
          })}
          
          {renderStatsCard({
            title: 'Refunded',
            value: new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(stats.refundedAmount / 100),
            icon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            ),
            color: 'red'
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          
          {/* Provider filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <select
              value={filters.provider}
              onChange={(e) => handleFilterChange('provider', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Providers</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
          
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by transaction ID, email, or description"
              value={filters.searchQuery || ''}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-end space-x-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear
            </button>
            
            {enableExport && (
              <div className="relative">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => handleExport('csv')}
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                {isAdminView && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(renderTransactionRow)
              ) : (
                <tr>
                  <td colSpan={isAdminView ? 7 : 6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m6 0h6m-6 6v6m-6-6v6m6 0v6m0-12v12" />
                      </svg>
                      <p className="text-lg font-medium">No transactions found</p>
                      <p className="text-sm">Try adjusting your filters or search criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
          </p>
          
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm rounded ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Transaction detail modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Transaction Details
                </h2>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTransaction.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedTransaction.provider}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: selectedTransaction.currency
                    }).format(selectedTransaction.amount / 100)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedTransaction.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTransaction.created_at.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTransaction.updated_at.toLocaleString()}</p>
                </div>
              </div>
              
              {selectedTransaction.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedTransaction.description}</p>
                </div>
              )}
              
              {selectedTransaction.paymentMethod && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.paymentMethod.brand} ending in {selectedTransaction.paymentMethod.last4}
                  </p>
                </div>
              )}
              
              {selectedTransaction.refunds && selectedTransaction.refunds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Refunds</label>
                  <div className="space-y-2">
                    {selectedTransaction.refunds.map(refund => (
                      <div key={refund.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-900">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: refund.currency
                            }).format(refund.amount / 100)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {refund.created_at.toLocaleDateString()}
                          </span>
                        </div>
                        {refund.reason && (
                          <p className="text-xs text-gray-600 mt-1">Reason: {refund.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MOCK API FUNCTIONS (Replace with actual API calls)
// =============================================================================

/**
 * Mock function to fetch payment history
 */
async function mockFetchPaymentHistory(params: any): Promise<{
  transactions: PaymentTransaction[];
  stats: PaymentHistoryStats;
}> {
  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock data
  const transactions: PaymentTransaction[] = [
    {
      id: 'pi_1234567890',
      provider: 'stripe',
      amount: 9999, // $99.99 in cents
      currency: 'USD',
      status: 'succeeded',
      description: 'Premium subscription',
      customerEmail: 'user@example.com',
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15'),
      paymentMethod: {
        type: 'card',
        last4: '4242',
        brand: 'Visa'
      }
    },
    {
      id: 'paypal_abcdef123456',
      provider: 'paypal',
      amount: 2999, // $29.99 in cents
      currency: 'USD',
      status: 'succeeded',
      description: 'One-time purchase',
      customerEmail: 'user@example.com',
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-01-10')
    }
  ];
  
  const stats: PaymentHistoryStats = {
    totalTransactions: 2,
    totalAmount: 12998,
    successfulTransactions: 2,
    failedTransactions: 0,
    refundedAmount: 0,
    averageTransactionAmount: 6499,
    providerBreakdown: {
      stripe: { count: 1, amount: 9999, successRate: 1.0 },
      paypal: { count: 1, amount: 2999, successRate: 1.0 }
    }
  };
  
  return { transactions, stats };
}

/**
 * Mock function to process refunds
 */
async function mockProcessRefund(request: RefundRequest): Promise<RefundResult> {
  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    refund_id: 're_' + Math.random().toString(36).substr(2, 9),
    amount: request.amount,
    status: 'succeeded',
    created_at: new Date()
  };
}

/**
 * Download data as CSV
 */
function downloadCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download data as JSON
 */
function downloadJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default PaymentHistoryDashboard;