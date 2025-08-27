/**
 * CVPlus Premium Module - Billing History Component
 * 
 * Displays user's payment history, invoices, and billing information
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PaymentHistory, 
  Invoice, 
  BillingHistoryProps,
  PaymentStatus,
  InvoiceStatus,
  Currency
} from '../types';
import {
  PAYMENT_STATUS_DISPLAY,
  INVOICE_STATUS_DISPLAY,
  CURRENCY_SYMBOLS
} from '../constants/premium.constants';

/**
 * Payment history item component
 */
interface PaymentItemProps {
  payment: PaymentHistory;
  onViewDetails?: (payment: PaymentHistory) => void;
}

const PaymentItem: React.FC<PaymentItemProps> = ({ payment, onViewDetails }) => {
  const getStatusColor = (status: PaymentStatus): string => {
    switch (status) {
      case 'succeeded':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'refunded':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'disputed':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatAmount = (amount: number, currency: Currency): string => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span 
              className={`
                inline-flex px-2 py-1 rounded-full text-xs font-medium border
                ${getStatusColor(payment.status)}
              `}
            >
              {PAYMENT_STATUS_DISPLAY[payment.status]}
            </span>
            <span className="ml-3 text-sm text-gray-500">
              {payment.paymentMethod?.type && (
                <>
                  {payment.paymentMethod.type}
                  {payment.paymentMethod.last4 && ` ****${payment.paymentMethod.last4}`}
                </>
              )}
            </span>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold text-gray-900">
              {formatAmount(payment.amount, payment.currency)}
            </span>
            <span className="text-sm text-gray-500">
              {formatDate(payment.createdAt)}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            Payment ID: {payment.paymentId}
          </div>
          
          {payment.failureReason && (
            <div className="mt-2 text-sm text-red-600">
              Failure reason: {payment.failureReason}
            </div>
          )}
          
          {payment.refundAmount && payment.refundAmount > 0 && (
            <div className="mt-2 text-sm text-purple-600">
              Refunded: {formatAmount(payment.refundAmount, payment.currency)}
              {payment.refundReason && ` (${payment.refundReason})`}
            </div>
          )}
        </div>
        
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(payment)}
            className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Invoice item component
 */
interface InvoiceItemProps {
  invoice: Invoice;
  onViewInvoice?: (invoice: Invoice) => void;
}

const InvoiceItem: React.FC<InvoiceItemProps> = ({ invoice, onViewInvoice }) => {
  const getStatusColor = (status: InvoiceStatus): string => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'open':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'void':
      case 'uncollectible':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatAmount = (amount: number, currency: Currency): string => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span 
              className={`
                inline-flex px-2 py-1 rounded-full text-xs font-medium border
                ${getStatusColor(invoice.status)}
              `}
            >
              {INVOICE_STATUS_DISPLAY[invoice.status]}
            </span>
            <span className="ml-3 text-sm font-medium text-gray-900">
              #{invoice.number}
            </span>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold text-gray-900">
              {formatAmount(invoice.amount, invoice.currency)}
            </span>
            <span className="text-sm text-gray-500">
              Due: {formatDate(invoice.dueDate)}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 mb-2">
            Created: {formatDate(invoice.createdAt)}
            {invoice.paidAt && ` • Paid: ${formatDate(invoice.paidAt)}`}
          </div>
          
          {invoice.items.length > 0 && (
            <div className="text-sm text-gray-600">
              {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
              {invoice.items.length === 1 && `: ${invoice.items[0].description}`}
            </div>
          )}
        </div>
        
        {onViewInvoice && (
          <button
            onClick={() => onViewInvoice(invoice)}
            className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Invoice
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Main billing history component
 */
export const BillingHistory: React.FC<BillingHistoryProps> = ({
  userId,
  limit = 10,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices'>('payments');
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data - in real implementation, this would fetch from API
  useEffect(() => {
    const loadBillingData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock payment data
        const mockPayments: PaymentHistory[] = [
          {
            paymentId: 'pi_1234567890',
            userId,
            amount: 4900, // $49.00
            currency: 'USD',
            status: 'succeeded',
            paymentMethod: {
              type: 'card',
              brand: 'visa',
              last4: '4242',
              expiryMonth: 12,
              expiryYear: 2025
            },
            createdAt: new Date('2024-01-15'),
            processedAt: new Date('2024-01-15')
          },
          {
            paymentId: 'pi_0987654321',
            userId,
            amount: 2500, // $25.00
            currency: 'USD',
            status: 'refunded',
            paymentMethod: {
              type: 'card',
              brand: 'mastercard',
              last4: '5555'
            },
            refundAmount: 2500,
            refundReason: 'requested_by_customer',
            createdAt: new Date('2023-12-01'),
            processedAt: new Date('2023-12-01'),
            refundedAt: new Date('2023-12-05')
          }
        ];
        
        // Mock invoice data
        const mockInvoices: Invoice[] = [
          {
            id: 'inv_001',
            userId,
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
            paidAt: new Date('2024-01-15'),
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15')
          }
        ];
        
        setPayments(mockPayments);
        setInvoices(mockInvoices);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBillingData();
  }, [userId, limit]);

  const handleViewPaymentDetails = (payment: PaymentHistory) => {
    // In real implementation, this would open a detailed view
    console.log('View payment details:', payment);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    // In real implementation, this would open the invoice
    console.log('View invoice:', invoice);
  };

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-lg font-medium">Error Loading Billing History</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Billing History
        </h2>
        <p className="text-gray-600">
          View your payment history, invoices, and billing information.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'payments', label: 'Payment History', count: payments.length },
            { key: 'invoices', label: 'Invoices', count: invoices.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'payments' | 'invoices')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading billing history...</p>
        </div>
      ) : (
        <>
          {/* Payments tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {payments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
                  <p className="text-gray-500">You haven't made any payments yet.</p>
                </div>
              ) : (
                payments.slice(0, limit).map((payment) => (
                  <PaymentItem
                    key={payment.paymentId}
                    payment={payment}
                    onViewDetails={handleViewPaymentDetails}
                  />
                ))
              )}
            </div>
          )}

          {/* Invoices tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices</h3>
                  <p className="text-gray-500">You don't have any invoices yet.</p>
                </div>
              ) : (
                invoices.slice(0, limit).map((invoice) => (
                  <InvoiceItem
                    key={invoice.id}
                    invoice={invoice}
                    onViewInvoice={handleViewInvoice}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Load more button */}
      {((activeTab === 'payments' && payments.length > limit) ||
        (activeTab === 'invoices' && invoices.length > limit)) && (
        <div className="text-center mt-8">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default BillingHistory;