/**
 * CVPlus Unified Payment Form Component
 * Phase 5-6: Service Integration & Frontend
 * 
 * Dynamic payment form that renders appropriate UI based on selected provider,
 * with real-time validation, progress indicators, and accessibility compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PaymentProviderName,
  PaymentRequest,
  PaymentResult,
  PaymentError,
  PaymentMethod
} from '../../../types/payments.types';
import { PaymentContext } from '../../../types/providers.types';
import { usePaymentFlow } from '../../hooks/usePaymentFlow';
import { getUnifiedPaymentService } from '../../services/unified-payment.service';

// Form-specific types
interface PaymentFormData {
  // Card details (for Stripe)
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
  
  // Billing details
  email?: string;
  firstName?: string;
  lastName?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // PayPal details (minimal - handled by PayPal)
  paypalEmail?: string;
  
  // Consent and preferences
  savePaymentMethod?: boolean;
  agreeToTerms?: boolean;
  marketingOptIn?: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

interface UnifiedPaymentFormProps {
  /** Payment request data */
  paymentRequest: PaymentRequest;
  
  /** Payment context */
  paymentContext: PaymentContext;
  
  /** Selected payment provider */
  selectedProvider: PaymentProviderName;
  
  /** Form submission callback */
  onSubmit: (formData: PaymentFormData) => Promise<PaymentResult>;
  
  /** Form validation callback */
  onValidation?: (isValid: boolean, errors: ValidationErrors) => void;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Disable form */
  disabled?: boolean;
  
  /** Show billing address form */
  requireBillingAddress?: boolean;
  
  /** Auto-focus first field */
  autoFocus?: boolean;
  
  /** Custom styling */
  className?: string;
  
  /** Analytics callback */
  onAnalytics?: (event: string, data: any) => void;
}

/**
 * Default form data
 */
const DEFAULT_FORM_DATA: PaymentFormData = {
  savePaymentMethod: false,
  agreeToTerms: false,
  marketingOptIn: false
};

/**
 * Unified Payment Form Component
 */
export const UnifiedPaymentForm: React.FC<UnifiedPaymentFormProps> = ({
  paymentRequest,
  paymentContext,
  selectedProvider,
  onSubmit,
  onValidation,
  isLoading = false,
  disabled = false,
  requireBillingAddress = false,
  autoFocus = true,
  className = '',
  onAnalytics
}) => {
  const [formData, setFormData] = useState<PaymentFormData>(DEFAULT_FORM_DATA);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  const paymentService = getUnifiedPaymentService();

  // =============================================================================
  // FORM VALIDATION
  // =============================================================================

  const validateField = useCallback((name: string, value: any): string | null => {
    switch (name) {
      case 'cardNumber':
        if (!value || value.replace(/\s/g, '').length < 13) {
          return 'Please enter a valid card number';
        }
        if (!isValidCardNumber(value.replace(/\s/g, ''))) {
          return 'Card number is not valid';
        }
        return null;
        
      case 'expiryDate':
        if (!value || !/^\d{2}\/\d{2}$/.test(value)) {
          return 'Please enter a valid expiry date (MM/YY)';
        }
        const [month, year] = value.split('/');
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
          return 'Card has expired';
        }
        if (parseInt(month) < 1 || parseInt(month) > 12) {
          return 'Invalid month';
        }
        return null;
        
      case 'cvv':
        if (!value || value.length < 3 || value.length > 4) {
          return 'Please enter a valid CVV';
        }
        return null;
        
      case 'cardholderName':
        if (!value || value.trim().length < 2) {
          return 'Please enter the cardholder name';
        }
        return null;
        
      case 'email':
        if (!value || !isValidEmail(value)) {
          return 'Please enter a valid email address';
        }
        return null;
        
      case 'firstName':
        if (!value || value.trim().length < 1) {
          return 'First name is required';
        }
        return null;
        
      case 'lastName':
        if (!value || value.trim().length < 1) {
          return 'Last name is required';
        }
        return null;
        
      case 'address.line1':
        if (requireBillingAddress && (!value || value.trim().length < 3)) {
          return 'Please enter your address';
        }
        return null;
        
      case 'address.city':
        if (requireBillingAddress && (!value || value.trim().length < 2)) {
          return 'Please enter your city';
        }
        return null;
        
      case 'address.state':
        if (requireBillingAddress && (!value || value.trim().length < 2)) {
          return 'Please enter your state/province';
        }
        return null;
        
      case 'address.postalCode':
        if (requireBillingAddress && (!value || value.trim().length < 3)) {
          return 'Please enter your postal code';
        }
        return null;
        
      case 'address.country':
        if (requireBillingAddress && (!value || value.trim().length < 2)) {
          return 'Please select your country';
        }
        return null;
        
      case 'agreeToTerms':
        if (!value) {
          return 'You must agree to the terms and conditions';
        }
        return null;
        
      default:
        return null;
    }
  }, [requireBillingAddress]);

  const validateForm = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Common validations
    const emailError = validateField('email', formData.email);
    if (emailError) errors.email = emailError;
    
    const firstNameError = validateField('firstName', formData.firstName);
    if (firstNameError) errors.firstName = firstNameError;
    
    const lastNameError = validateField('lastName', formData.lastName);
    if (lastNameError) errors.lastName = lastNameError;
    
    const termsError = validateField('agreeToTerms', formData.agreeToTerms);
    if (termsError) errors.agreeToTerms = termsError;
    
    // Provider-specific validations
    if (selectedProvider === 'stripe') {
      const cardNumberError = validateField('cardNumber', formData.cardNumber);
      if (cardNumberError) errors.cardNumber = cardNumberError;
      
      const expiryError = validateField('expiryDate', formData.expiryDate);
      if (expiryError) errors.expiryDate = expiryError;
      
      const cvvError = validateField('cvv', formData.cvv);
      if (cvvError) errors.cvv = cvvError;
      
      const cardholderError = validateField('cardholderName', formData.cardholderName);
      if (cardholderError) errors.cardholderName = cardholderError;
    }
    
    // Billing address validations
    if (requireBillingAddress) {
      const addressFields = ['line1', 'city', 'state', 'postalCode', 'country'];
      addressFields.forEach(field => {
        const error = validateField(`address.${field}`, formData.address?.[field as keyof typeof formData.address]);
        if (error) errors[`address.${field}`] = error;
      });
    }
    
    return errors;
  }, [formData, selectedProvider, requireBillingAddress, validateField]);

  // =============================================================================
  // FORM HANDLERS
  // =============================================================================

  const handleFieldChange = useCallback((name: string, value: any) => {
    // Format specific fields
    if (name === 'cardNumber') {
      value = formatCardNumber(value);
    } else if (name === 'expiryDate') {
      value = formatExpiryDate(value);
    } else if (name === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    
    // Update form data
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(name));
    
    // Validate field if it's been touched
    if (touchedFields.has(name)) {
      const error = validateField(name, value);
      setValidationErrors(prev => ({
        ...prev,
        [name]: error || undefined
      }));
    }
  }, [touchedFields, validateField]);

  const handleFieldFocus = useCallback((name: string) => {
    setFocusedField(name);
    
    if (onAnalytics) {
      onAnalytics('payment_field_focused', {
        field: name,
        provider: selectedProvider
      });
    }
  }, [selectedProvider, onAnalytics]);

  const handleFieldBlur = useCallback((name: string) => {
    setFocusedField(null);
    setTouchedFields(prev => new Set(prev).add(name));
    
    // Validate on blur
    const value = name.startsWith('address.') 
      ? formData.address?.[name.split('.')[1] as keyof typeof formData.address]
      : (formData as any)[name];
    
    const error = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      [name]: error || undefined
    }));
  }, [formData, validateField]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (disabled || isLoading) return;
    
    setIsValidating(true);
    
    // Validate entire form
    const errors = validateForm();
    setValidationErrors(errors);
    
    const isValid = Object.keys(errors).length === 0;
    
    if (onValidation) {
      onValidation(isValid, errors);
    }
    
    if (!isValid) {
      setIsValidating(false);
      
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      const fieldElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      if (fieldElement) {
        fieldElement.focus();
      }
      
      return;
    }
    
    try {
      const result = await onSubmit(formData);
      
      if (onAnalytics) {
        onAnalytics('payment_form_submitted', {
          provider: selectedProvider,
          success: result.success,
          validation_errors: Object.keys(errors).length
        });
      }
      
      return result;
    } catch (error) {
      console.error('Payment form submission error:', error);
      
      if (onAnalytics) {
        onAnalytics('payment_form_error', {
          provider: selectedProvider,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } finally {
      setIsValidating(false);
    }
  }, [disabled, isLoading, validateForm, onValidation, onSubmit, formData, selectedProvider, onAnalytics]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Auto-focus first field
  useEffect(() => {
    if (autoFocus) {
      const firstField = selectedProvider === 'stripe' ? 'cardNumber' : 'email';
      const fieldElement = document.querySelector(`[name="${firstField}"]`) as HTMLElement;
      if (fieldElement) {
        setTimeout(() => fieldElement.focus(), 100);
      }
    }
  }, [selectedProvider, autoFocus]);

  // Notify parent of validation state
  useEffect(() => {
    const errors = validateForm();
    const isValid = Object.keys(errors).length === 0;
    
    if (onValidation) {
      onValidation(isValid, errors);
    }
  }, [formData, selectedProvider, onValidation, validateForm]);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const renderInputField = ({
    name,
    label,
    type = 'text',
    placeholder,
    required = false,
    autoComplete,
    maxLength,
    pattern
  }: {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    autoComplete?: string;
    maxLength?: number;
    pattern?: string;
  }) => {
    const value = name.startsWith('address.') 
      ? formData.address?.[name.split('.')[1] as keyof typeof formData.address] || ''
      : (formData as any)[name] || '';
    
    const error = validationErrors[name];
    const isFocused = focusedField === name;
    const isTouched = touchedFields.has(name);
    
    return (
      <div className="form-field">
        <label 
          htmlFor={name}
          className={`block text-sm font-medium mb-2 transition-colors ${
            error && isTouched ? 'text-red-600' : isFocused ? 'text-blue-600' : 'text-gray-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          pattern={pattern}
          required={required}
          disabled={disabled || isLoading}
          className={`
            w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
            ${error && isTouched 
              ? 'border-red-300 bg-red-50 focus:border-red-500' 
              : isFocused 
                ? 'border-blue-300 bg-blue-50 focus:border-blue-500'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }
            ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          onFocus={() => handleFieldFocus(name)}
          onBlur={() => handleFieldBlur(name)}
        />
        {error && isTouched && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  };

  const renderCheckboxField = ({
    name,
    label,
    description,
    required = false
  }: {
    name: string;
    label: string;
    description?: string;
    required?: boolean;
  }) => {
    const value = (formData as any)[name] || false;
    const error = validationErrors[name];
    const isTouched = touchedFields.has(name);
    
    return (
      <div className="form-field">
        <div className="flex items-start">
          <div className="flex items-center h-6">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={value}
              required={required}
              disabled={disabled || isLoading}
              className={`
                w-4 h-4 text-blue-600 border-2 rounded transition-colors
                focus:ring-2 focus:ring-blue-500/20
                ${error && isTouched ? 'border-red-300' : 'border-gray-300'}
                ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onChange={(e) => handleFieldChange(name, e.target.checked)}
              onFocus={() => handleFieldFocus(name)}
              onBlur={() => handleFieldBlur(name)}
            />
          </div>
          <div className="ml-3 flex-1">
            <label 
              htmlFor={name}
              className={`text-sm font-medium cursor-pointer ${
                error && isTouched ? 'text-red-600' : 'text-gray-700'
              }`}
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
        </div>
        {error && isTouched && (
          <div className="mt-2 ml-7 flex items-center text-sm text-red-600">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  };

  const renderSelectField = ({
    name,
    label,
    options,
    required = false
  }: {
    name: string;
    label: string;
    options: { value: string; label: string; }[];
    required?: boolean;
  }) => {
    const value = name.startsWith('address.') 
      ? formData.address?.[name.split('.')[1] as keyof typeof formData.address] || ''
      : (formData as any)[name] || '';
    
    const error = validationErrors[name];
    const isFocused = focusedField === name;
    const isTouched = touchedFields.has(name);
    
    return (
      <div className="form-field">
        <label 
          htmlFor={name}
          className={`block text-sm font-medium mb-2 transition-colors ${
            error && isTouched ? 'text-red-600' : isFocused ? 'text-blue-600' : 'text-gray-700'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          id={name}
          name={name}
          value={value}
          required={required}
          disabled={disabled || isLoading}
          className={`
            w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
            ${error && isTouched 
              ? 'border-red-300 bg-red-50 focus:border-red-500' 
              : isFocused 
                ? 'border-blue-300 bg-blue-50 focus:border-blue-500'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }
            ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onChange={(e) => handleFieldChange(name, e.target.value)}
          onFocus={() => handleFieldFocus(name)}
          onBlur={() => handleFieldBlur(name)}
        >
          <option value="">Select {label}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && isTouched && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className={`unified-payment-form ${className}`}>
      <form onSubmit={handleSubmit} noValidate>
        {/* Provider-specific payment details */}
        {selectedProvider === 'stripe' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Card Information
            </h3>
            
            {/* Card number */}
            {renderInputField({
              name: 'cardNumber',
              label: 'Card Number',
              placeholder: '1234 5678 9012 3456',
              required: true,
              autoComplete: 'cc-number',
              maxLength: 19
            })}
            
            <div className="grid grid-cols-2 gap-4">
              {/* Expiry date */}
              {renderInputField({
                name: 'expiryDate',
                label: 'Expiry Date',
                placeholder: 'MM/YY',
                required: true,
                autoComplete: 'cc-exp',
                maxLength: 5,
                pattern: '\d{2}/\d{2}'
              })}
              
              {/* CVV */}
              {renderInputField({
                name: 'cvv',
                label: 'CVV',
                placeholder: '123',
                required: true,
                autoComplete: 'cc-csc',
                maxLength: 4,
                pattern: '\d{3,4}'
              })}
            </div>
            
            {/* Cardholder name */}
            {renderInputField({
              name: 'cardholderName',
              label: 'Cardholder Name',
              placeholder: 'John Doe',
              required: true,
              autoComplete: 'cc-name'
            })}
          </div>
        )}
        
        {selectedProvider === 'paypal' && (
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center mb-3">
                <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center mr-3">
                  <span className="text-white text-xs font-bold">PP</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  PayPal Payment
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                You'll be redirected to PayPal to complete your payment securely. 
                No credit card details are stored on our servers.
              </p>
              
              {/* Optional PayPal email for pre-filling */}
              {renderInputField({
                name: 'paypalEmail',
                label: 'PayPal Email (Optional)',
                type: 'email',
                placeholder: 'your-paypal@email.com',
                autoComplete: 'email'
              })}
            </div>
          </div>
        )}
        
        {/* Common billing information */}
        <div className="space-y-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Contact Information
          </h3>
          
          {/* Email */}
          {renderInputField({
            name: 'email',
            label: 'Email Address',
            type: 'email',
            placeholder: 'your@email.com',
            required: true,
            autoComplete: 'email'
          })}
          
          <div className="grid grid-cols-2 gap-4">
            {/* First name */}
            {renderInputField({
              name: 'firstName',
              label: 'First Name',
              placeholder: 'John',
              required: true,
              autoComplete: 'given-name'
            })}
            
            {/* Last name */}
            {renderInputField({
              name: 'lastName',
              label: 'Last Name',
              placeholder: 'Doe',
              required: true,
              autoComplete: 'family-name'
            })}
          </div>
        </div>
        
        {/* Billing address */}
        {requireBillingAddress && (
          <div className="space-y-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Billing Address
            </h3>
            
            {/* Address line 1 */}
            {renderInputField({
              name: 'address.line1',
              label: 'Address Line 1',
              placeholder: '123 Main Street',
              required: true,
              autoComplete: 'address-line1'
            })}
            
            {/* Address line 2 */}
            {renderInputField({
              name: 'address.line2',
              label: 'Address Line 2 (Optional)',
              placeholder: 'Apartment, suite, unit, etc.',
              autoComplete: 'address-line2'
            })}
            
            <div className="grid grid-cols-2 gap-4">
              {/* City */}
              {renderInputField({
                name: 'address.city',
                label: 'City',
                placeholder: 'New York',
                required: true,
                autoComplete: 'address-level2'
              })}
              
              {/* State */}
              {renderInputField({
                name: 'address.state',
                label: 'State/Province',
                placeholder: 'NY',
                required: true,
                autoComplete: 'address-level1'
              })}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Postal code */}
              {renderInputField({
                name: 'address.postalCode',
                label: 'Postal Code',
                placeholder: '10001',
                required: true,
                autoComplete: 'postal-code'
              })}
              
              {/* Country */}
              {renderSelectField({
                name: 'address.country',
                label: 'Country',
                required: true,
                options: [
                  { value: 'US', label: 'United States' },
                  { value: 'CA', label: 'Canada' },
                  { value: 'GB', label: 'United Kingdom' },
                  { value: 'AU', label: 'Australia' },
                  { value: 'DE', label: 'Germany' },
                  { value: 'FR', label: 'France' },
                  { value: 'JP', label: 'Japan' },
                  // Add more countries as needed
                ]
              })}
            </div>
          </div>
        )}
        
        {/* Preferences and consent */}
        <div className="space-y-4 mt-8 pt-6 border-t border-gray-200">
          {/* Save payment method */}
          {renderCheckboxField({
            name: 'savePaymentMethod',
            label: 'Save payment method for future purchases',
            description: 'We\'ll securely store your payment information for faster checkout next time.'
          })}
          
          {/* Terms and conditions */}
          {renderCheckboxField({
            name: 'agreeToTerms',
            label: 'I agree to the Terms of Service and Privacy Policy',
            required: true
          })}
          
          {/* Marketing opt-in */}
          {renderCheckboxField({
            name: 'marketingOptIn',
            label: 'Send me promotional emails and updates',
            description: 'You can unsubscribe at any time.'
          })}
        </div>
        
        {/* Submit button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={disabled || isLoading || isValidating}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200
              focus:outline-none focus:ring-4 focus:ring-blue-500/20
              ${disabled || isLoading || isValidating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }
            `}
          >
            {isLoading || isValidating ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isValidating ? 'Validating...' : 'Processing...'}
              </div>
            ) : (
              `Pay ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: paymentRequest.currency
              }).format(paymentRequest.amount / 100)}`
            )}
          </button>
          
          {/* Security notice */}
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Your payment information is encrypted and secure
          </div>
        </div>
      </form>
    </div>
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Basic card number validation (Luhn algorithm)
 */
function isValidCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Format card number with spaces
 */
function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  return formatted.slice(0, 19); // Max length with spaces
}

/**
 * Format expiry date as MM/YY
 */
function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 2) {
    return digits.slice(0, 2) + '/' + digits.slice(2, 4);
  }
  return digits;
}

export default UnifiedPaymentForm;