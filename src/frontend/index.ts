/**
 * CVPlus Premium Frontend Module Index
 * Phase 5-6: Service Integration & Frontend
 * 
 * Exports for frontend services, hooks, and components
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// Services
export { UnifiedPaymentService, getUnifiedPaymentService } from './services/unified-payment.service';

// Hooks
export { usePaymentFlow } from './hooks/usePaymentFlow';
export type { UsePaymentFlowReturn } from './hooks/usePaymentFlow';

// Components
export * from './components/payments';

// Types (re-export for convenience)
export type {
  PaymentProviderName,
  PaymentRequest,
  PaymentResult,
  PaymentIntent,
  PaymentError,
  PaymentMethod,
  PaymentStatus
} from '../types/payments.types';

export type {
  PaymentContext,
  ProviderSelectionCriteria
} from '../types/providers.types';