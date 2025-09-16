/**
 * CVPlus Premium Payment Functions Index
 * Main exports for all payment-related functions
 */

// Stripe Functions
export * from './stripe';

// PayPal Functions
export * from './paypal';

// Core Payment Functions
export * from './core';

// Re-export for backward compatibility
export { 
  createPaymentIntent,
  confirmPayment,
  handleStripeWebhook,
  createCheckoutSession,
} from './stripe';

export {
  createPayPalOrder,
  capturePayPalOrder,
  handlePayPalWebhook,
  refundPayPalPayment,
  getPayPalPaymentStatus,
} from './paypal';

export {
  checkFeatureAccess,
  getUserSubscription,
} from './core';