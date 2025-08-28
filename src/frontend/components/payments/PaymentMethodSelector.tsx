/**
 * CVPlus Payment Method Selector Component
 * Allows users to choose between Stripe and PayPal payment methods
 */

import React, { useState, useCallback } from 'react';
import { PaymentProviderName, PaymentRequest } from '../../../payments/src/types';

interface PaymentMethodSelectorProps {
  /** Available payment providers */
  availableProviders: PaymentProviderName[];
  
  /** Payment request data */
  paymentRequest: PaymentRequest;
  
  /** Selected provider callback */
  onProviderSelected: (provider: PaymentProviderName) => void;
  
  /** Currently selected provider */
  selectedProvider?: PaymentProviderName;
  
  /** Custom styling */
  className?: string;
  
  /** Show provider features */
  showFeatures?: boolean;
  
  /** Disable selection */
  disabled?: boolean;
}

interface PaymentProviderInfo {
  name: PaymentProviderName;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  supportedCurrencies: string[];
  processingTime: string;
  fees: string;
}

/**
 * Payment Method Selector Component
 */
export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  availableProviders,
  paymentRequest,
  onProviderSelected,
  selectedProvider,
  className = '',
  showFeatures = true,
  disabled = false,
}) => {
  const [hoveredProvider, setHoveredProvider] = useState<PaymentProviderName | null>(null);

  // Provider information
  const providerInfo: Record<PaymentProviderName, PaymentProviderInfo> = {
    stripe: {
      name: 'stripe',
      displayName: 'Credit/Debit Card',
      description: 'Pay securely with your credit or debit card',
      icon: (
        <div className="w-10 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">CARD</span>
        </div>
      ),
      features: ['Instant processing', 'Fraud protection', 'Global acceptance', 'Saved payment methods'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
      processingTime: 'Instant',
      fees: '2.9% + $0.30',
    },
    paypal: {
      name: 'paypal',
      displayName: 'PayPal',
      description: 'Pay with your PayPal account or card',
      icon: (
        <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">PP</span>
        </div>
      ),
      features: ['Buyer protection', 'No card details needed', 'PayPal balance', 'International payments'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BRL'],
      processingTime: 'Instant',
      fees: '2.9% + $0.30',
    },
  };

  const handleProviderSelect = useCallback(
    (provider: PaymentProviderName) => {
      if (disabled) return;
      onProviderSelected(provider);
    },
    [onProviderSelected, disabled]
  );

  const isProviderSupported = useCallback(
    (provider: PaymentProviderName): boolean => {
      const info = providerInfo[provider];
      return info.supportedCurrencies.includes(paymentRequest.currency.toUpperCase());
    },
    [paymentRequest.currency, providerInfo]
  );

  const filteredProviders = availableProviders.filter(isProviderSupported);

  if (filteredProviders.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-yellow-800">
            No payment methods are available for {paymentRequest.currency.toUpperCase()}
          </span>
        </div>
      </div>
    );
  }

  if (filteredProviders.length === 1) {
    const provider = filteredProviders[0];
    const info = providerInfo[provider];
    
    return (
      <div className={`payment-method-selector single-provider ${className}`}>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <div className="mr-3">{info.icon}</div>
            <div>
              <h3 className="font-medium text-gray-900">{info.displayName}</h3>
              <p className="text-sm text-gray-600">{info.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`payment-method-selector ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Payment Method</h3>
      
      <div className="grid gap-3">
        {filteredProviders.map((provider) => {
          const info = providerInfo[provider];
          const isSelected = selectedProvider === provider;
          const isHovered = hoveredProvider === provider;
          
          return (
            <div
              key={provider}
              className={`
                relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => handleProviderSelect(provider)}
              onMouseEnter={() => setHoveredProvider(provider)}
              onMouseLeave={() => setHoveredProvider(null)}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="rounded-full bg-blue-500 p-1">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
              
              {/* Provider info */}
              <div className="flex items-start">
                <div className="mr-4 mt-1">{info.icon}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{info.displayName}</h4>
                  <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                  
                  {/* Processing time and fees */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                    <span>Processing: {info.processingTime}</span>
                    <span>Fees: {info.fees}</span>
                  </div>
                  
                  {/* Features (show on hover or selection) */}
                  {showFeatures && (isSelected || isHovered) && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-2">
                        {info.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-600">
                            <svg className="w-3 h-3 text-green-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Payment amount summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Amount:</span>
          <span className="font-semibold text-lg">
            {paymentRequest.currency.toUpperCase()} {paymentRequest.amount.toFixed(2)}
          </span>
        </div>
        {paymentRequest.description && (
          <div className="text-sm text-gray-500 mt-1">
            {paymentRequest.description}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;