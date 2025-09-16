/**
 * CVPlus Payment Flow State Management Hook
 * Phase 5-6: Service Integration & Frontend
 * 
 * React hook for managing payment flow state with multi-step flow support,
 * provider switching, error recovery, and loading states.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PaymentProviderName,
  PaymentRequest,
  PaymentResult,
  PaymentIntent,
  PaymentError,
  PaymentStatus
} from '../../types/payments.types';
import {
  PaymentContext
} from '../../types/providers.types';
import { getUnifiedPaymentService } from '../services/unified-payment.service';

// Hook-specific types
interface PaymentFlowConfig {
  enableAutoRetry?: boolean;
  maxRetries?: number;
  enableFailover?: boolean;
  enableAnalytics?: boolean;
  timeoutMs?: number;
}

interface PaymentFlowStep {
  id: string;
  name: string;
  title: string;
  description: string;
  canSkip: boolean;
  isComplete: boolean;
  hasError: boolean;
}

interface PaymentFlowState {
  // Current state
  currentStep: string;
  steps: PaymentFlowStep[];
  
  // Provider selection
  selectedProvider?: PaymentProviderName;
  availableProviders: PaymentProviderName[];
  providerRecommendations: any[];
  
  // Payment data
  paymentRequest?: PaymentRequest;
  paymentIntent?: PaymentIntent;
  paymentResult?: PaymentResult;
  
  // UI state
  isLoading: boolean;
  isProcessing: boolean;
  canRetry: boolean;
  canCancel: boolean;
  
  // Error handling
  error?: PaymentError;
  retryCount: number;
  lastAttemptAt?: Date;
  
  // Progress tracking
  progress: number; // 0-100
  timeElapsed: number; // seconds
  estimatedTimeRemaining?: number; // seconds
}

interface UsePaymentFlowReturn {
  // State
  state: PaymentFlowState;
  
  // Step navigation
  goToStep: (stepId: string) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  
  // Provider management
  selectProvider: (provider: PaymentProviderName) => void;
  switchProvider: (provider: PaymentProviderName) => Promise<void>;
  getProviderRecommendations: () => Promise<void>;
  
  // Payment flow
  initializePayment: (request: PaymentRequest, context: PaymentContext) => Promise<PaymentResult>;
  processPayment: () => Promise<PaymentResult>;
  retryPayment: () => Promise<PaymentResult>;
  cancelPayment: () => void;
  
  // Utility functions
  reset: () => void;
  validateCurrentStep: () => boolean;
  getStepErrors: () => string[];
  
  // Event handlers
  onStepComplete: (callback: (step: PaymentFlowStep) => void) => void;
  onPaymentSuccess: (callback: (result: PaymentResult) => void) => void;
  onPaymentError: (callback: (error: PaymentError) => void) => void;
}

/**
 * Default payment flow steps
  */
const DEFAULT_PAYMENT_STEPS: PaymentFlowStep[] = [
  {
    id: 'provider_selection',
    name: 'provider_selection',
    title: 'Choose Payment Method',
    description: 'Select your preferred payment provider',
    canSkip: false,
    isComplete: false,
    hasError: false
  },
  {
    id: 'payment_details',
    name: 'payment_details',
    title: 'Payment Details',
    description: 'Enter your payment information',
    canSkip: false,
    isComplete: false,
    hasError: false
  },
  {
    id: 'confirmation',
    name: 'confirmation',
    title: 'Confirm Payment',
    description: 'Review and confirm your payment',
    canSkip: false,
    isComplete: false,
    hasError: false
  },
  {
    id: 'processing',
    name: 'processing',
    title: 'Processing Payment',
    description: 'Please wait while we process your payment',
    canSkip: false,
    isComplete: false,
    hasError: false
  },
  {
    id: 'complete',
    name: 'complete',
    title: 'Payment Complete',
    description: 'Your payment has been processed successfully',
    canSkip: false,
    isComplete: false,
    hasError: false
  }
];

/**
 * Payment Flow State Management Hook
  */
export const usePaymentFlow = (
  initialConfig: PaymentFlowConfig = {}
): UsePaymentFlowReturn => {
  const config: PaymentFlowConfig = {
    enableAutoRetry: true,
    maxRetries: 3,
    enableFailover: true,
    enableAnalytics: true,
    timeoutMs: 30000,
    ...initialConfig
  };

  // Core state
  const [state, setState] = useState<PaymentFlowState>({
    currentStep: 'provider_selection',
    steps: DEFAULT_PAYMENT_STEPS.map(step => ({ ...step })),
    availableProviders: [],
    providerRecommendations: [],
    isLoading: false,
    isProcessing: false,
    canRetry: true,
    canCancel: true,
    retryCount: 0,
    progress: 0,
    timeElapsed: 0
  });

  // Service instance and timers
  const paymentService = getUnifiedPaymentService();
  const startTimeRef = useRef<Date>();
  const timerRef = useRef<NodeJS.Timeout>();
  const eventCallbacksRef = useRef<{
    onStepComplete?: (step: PaymentFlowStep) => void;
    onPaymentSuccess?: (result: PaymentResult) => void;
    onPaymentError?: (error: PaymentError) => void;
  }>({});

  // =============================================================================
  // STATE UPDATE HELPERS
  // =============================================================================

  const updateState = useCallback((updates: Partial<PaymentFlowState>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      progress: calculateProgress(updates.currentStep || prev.currentStep, prev.steps)
    }));
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<PaymentFlowStep>) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  }, []);

  const markStepComplete = useCallback((stepId: string) => {
    updateStep(stepId, { isComplete: true, hasError: false });
    const step = state.steps.find(s => s.id === stepId);
    if (step && eventCallbacksRef.current.onStepComplete) {
      eventCallbacksRef.current.onStepComplete({ ...step, isComplete: true });
    }
  }, [state.steps, updateStep]);

  const markStepError = useCallback((stepId: string) => {
    updateStep(stepId, { hasError: true, isComplete: false });
  }, [updateStep]);

  // =============================================================================
  // STEP NAVIGATION
  // =============================================================================

  const goToStep = useCallback((stepId: string) => {
    const stepExists = state.steps.some(step => step.id === stepId);
    if (!stepExists) {
      console.warn(`Step '${stepId}' does not exist`);
      return;
    }

    updateState({ 
      currentStep: stepId,
      error: undefined // Clear errors when navigating
    });
  }, [state.steps, updateState]);

  const goToNextStep = useCallback(() => {
    const currentIndex = state.steps.findIndex(step => step.id === state.currentStep);
    if (currentIndex < state.steps.length - 1) {
      const nextStep = state.steps[currentIndex + 1];
      goToStep(nextStep.id);
    }
  }, [state.steps, state.currentStep, goToStep]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = state.steps.findIndex(step => step.id === state.currentStep);
    if (currentIndex > 0) {
      const prevStep = state.steps[currentIndex - 1];
      goToStep(prevStep.id);
    }
  }, [state.steps, state.currentStep, goToStep]);

  // =============================================================================
  // PROVIDER MANAGEMENT
  // =============================================================================

  const selectProvider = useCallback((provider: PaymentProviderName) => {
    updateState({
      selectedProvider: provider,
      error: undefined
    });
    markStepComplete('provider_selection');
    
    // Auto-advance to next step
    setTimeout(() => goToNextStep(), 100);
  }, [updateState, markStepComplete, goToNextStep]);

  const switchProvider = useCallback(async (provider: PaymentProviderName) => {
    updateState({ isLoading: true });
    
    try {
      await paymentService.switchProvider(provider);
      updateState({
        selectedProvider: provider,
        error: undefined,
        isLoading: false
      });
    } catch (error) {
      const paymentError: PaymentError = {
        code: 'PROVIDER_SWITCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to switch provider',
        type: 'api_error'
      };
      
      updateState({
        error: paymentError,
        isLoading: false
      });
    }
  }, [paymentService, updateState]);

  const getProviderRecommendations = useCallback(async () => {
    if (!state.paymentRequest) return;
    
    updateState({ isLoading: true });
    
    try {
      const context: PaymentContext = {
        userId: state.paymentRequest.customerId,
        currency: state.paymentRequest.currency,
        amount: state.paymentRequest.amount
      };
      
      const recommendations = await paymentService.getPaymentRecommendations(
        state.paymentRequest,
        context
      );
      
      const availableProviders = await paymentService.getAvailableProviders(context);
      
      updateState({
        providerRecommendations: recommendations,
        availableProviders: availableProviders.map(p => p.provider),
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to get provider recommendations:', error);
      updateState({ isLoading: false });
    }
  }, [state.paymentRequest, paymentService, updateState]);

  // =============================================================================
  // PAYMENT FLOW
  // =============================================================================

  const initializePayment = useCallback(async (
    request: PaymentRequest,
    context: PaymentContext
  ): Promise<PaymentResult> => {
    startTimeRef.current = new Date();
    startTimer();
    
    updateState({
      paymentRequest: request,
      currentStep: 'provider_selection',
      isLoading: true,
      error: undefined,
      retryCount: 0
    });

    try {
      // Get available providers and recommendations
      await getProviderRecommendations();
      
      // Auto-select optimal provider if only one is available
      const availableProviders = await paymentService.getAvailableProviders(context);
      if (availableProviders.length === 1) {
        selectProvider(availableProviders[0].provider);
      }
      
      updateState({ isLoading: false });
      
      return { success: true };
    } catch (error) {
      const paymentError: PaymentError = {
        code: 'INITIALIZATION_FAILED',
        message: error instanceof Error ? error.message : 'Payment initialization failed',
        type: 'api_error'
      };
      
      updateState({
        error: paymentError,
        isLoading: false
      });
      
      if (eventCallbacksRef.current.onPaymentError) {
        eventCallbacksRef.current.onPaymentError(paymentError);
      }
      
      return {
        success: false,
        error: paymentError
      };
    }
  }, [paymentService, updateState, getProviderRecommendations, selectProvider]);

  const processPayment = useCallback(async (): Promise<PaymentResult> => {
    if (!state.paymentRequest || !state.selectedProvider) {
      throw new Error('Payment not properly initialized');
    }

    updateState({
      currentStep: 'processing',
      isProcessing: true,
      canCancel: false,
      error: undefined
    });
    
    markStepComplete('confirmation');

    const context: PaymentContext = {
      userId: state.paymentRequest.customerId,
      currency: state.paymentRequest.currency,
      amount: state.paymentRequest.amount,
      preferred_provider: state.selectedProvider
    };

    try {
      const result = await paymentService.processPayment(
        state.paymentRequest,
        context,
        {
          enableFailover: config.enableFailover,
          maxRetries: config.maxRetries
        }
      );

      if (result.success) {
        updateState({
          currentStep: 'complete',
          paymentResult: result,
          paymentIntent: result.payment_intent,
          isProcessing: false,
          canRetry: false
        });
        
        markStepComplete('processing');
        markStepComplete('complete');
        
        if (eventCallbacksRef.current.onPaymentSuccess) {
          eventCallbacksRef.current.onPaymentSuccess(result);
        }
      } else {
        updateState({
          currentStep: 'confirmation', // Go back to confirmation
          error: result.error,
          isProcessing: false,
          canRetry: true,
          canCancel: true,
          retryCount: state.retryCount + 1,
          lastAttemptAt: new Date()
        });
        
        markStepError('processing');
        
        if (eventCallbacksRef.current.onPaymentError) {
          eventCallbacksRef.current.onPaymentError(result.error!);
        }
      }

      return result;
    } catch (error) {
      const paymentError: PaymentError = {
        code: 'PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Payment processing failed',
        type: 'api_error'
      };
      
      updateState({
        currentStep: 'confirmation',
        error: paymentError,
        isProcessing: false,
        canRetry: true,
        canCancel: true,
        retryCount: state.retryCount + 1,
        lastAttemptAt: new Date()
      });
      
      markStepError('processing');
      
      if (eventCallbacksRef.current.onPaymentError) {
        eventCallbacksRef.current.onPaymentError(paymentError);
      }
      
      return {
        success: false,
        error: paymentError
      };
    }
  }, [
    state.paymentRequest,
    state.selectedProvider,
    state.retryCount,
    paymentService,
    config,
    updateState,
    markStepComplete,
    markStepError
  ]);

  const retryPayment = useCallback(async (): Promise<PaymentResult> => {
    if (!state.canRetry || !state.paymentRequest) {
      throw new Error('Payment retry not available');
    }

    if (state.retryCount >= (config.maxRetries || 3)) {
      const error: PaymentError = {
        code: 'MAX_RETRIES_EXCEEDED',
        message: 'Maximum retry attempts exceeded',
        type: 'api_error'
      };
      
      updateState({ error, canRetry: false });
      return { success: false, error };
    }

    // Reset error state and try again
    updateState({
      error: undefined,
      isProcessing: true
    });
    
    // Clear step errors
    updateStep('processing', { hasError: false });

    return processPayment();
  }, [
    state.canRetry,
    state.paymentRequest,
    state.retryCount,
    config.maxRetries,
    updateState,
    updateStep,
    processPayment
  ]);

  const cancelPayment = useCallback(() => {
    updateState({
      currentStep: 'provider_selection',
      error: undefined,
      isProcessing: false,
      canRetry: true,
      canCancel: true
    });
    
    // Reset all steps
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(step => ({
        ...step,
        isComplete: false,
        hasError: false
      }))
    }));
    
    stopTimer();
  }, [updateState]);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const reset = useCallback(() => {
    setState({
      currentStep: 'provider_selection',
      steps: DEFAULT_PAYMENT_STEPS.map(step => ({ ...step })),
      availableProviders: [],
      providerRecommendations: [],
      selectedProvider: undefined,
      paymentRequest: undefined,
      paymentIntent: undefined,
      paymentResult: undefined,
      isLoading: false,
      isProcessing: false,
      canRetry: true,
      canCancel: true,
      error: undefined,
      retryCount: 0,
      lastAttemptAt: undefined,
      progress: 0,
      timeElapsed: 0,
      estimatedTimeRemaining: undefined
    });
    
    stopTimer();
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    switch (state.currentStep) {
      case 'provider_selection':
        return !!state.selectedProvider;
      case 'payment_details':
        return !!state.paymentRequest;
      case 'confirmation':
        return !!state.paymentRequest && !!state.selectedProvider;
      case 'processing':
        return !state.error;
      case 'complete':
        return !!state.paymentResult?.success;
      default:
        return true;
    }
  }, [state.currentStep, state.selectedProvider, state.paymentRequest, state.error, state.paymentResult]);

  const getStepErrors = useCallback((): string[] => {
    const errors: string[] = [];
    
    state.steps.forEach(step => {
      if (step.hasError) {
        errors.push(`Error in ${step.title}`);
      }
    });
    
    if (state.error) {
      errors.push(state.error.message);
    }
    
    return errors;
  }, [state.steps, state.error]);

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const onStepComplete = useCallback((callback: (step: PaymentFlowStep) => void) => {
    eventCallbacksRef.current.onStepComplete = callback;
  }, []);

  const onPaymentSuccess = useCallback((callback: (result: PaymentResult) => void) => {
    eventCallbacksRef.current.onPaymentSuccess = callback;
  }, []);

  const onPaymentError = useCallback((callback: (error: PaymentError) => void) => {
    eventCallbacksRef.current.onPaymentError = callback;
  }, []);

  // =============================================================================
  // TIMER AND PROGRESS TRACKING
  // =============================================================================

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
        updateState({ timeElapsed: elapsed });
      }
    }, 1000);
  }, [updateState]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Cleanup timer on unmount
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // Subscribe to payment service events
  useEffect(() => {
    const handleStateChange = (serviceState: any) => {
      updateState({
        isLoading: serviceState.isLoading,
        error: serviceState.error
      });
    };

    paymentService.on('payment_state_changed', handleStateChange);
    
    return () => {
      paymentService.off('payment_state_changed', handleStateChange);
    };
  }, [paymentService, updateState]);

  return {
    // State
    state,
    
    // Step navigation
    goToStep,
    goToNextStep,
    goToPreviousStep,
    
    // Provider management
    selectProvider,
    switchProvider,
    getProviderRecommendations,
    
    // Payment flow
    initializePayment,
    processPayment,
    retryPayment,
    cancelPayment,
    
    // Utility functions
    reset,
    validateCurrentStep,
    getStepErrors,
    
    // Event handlers
    onStepComplete,
    onPaymentSuccess,
    onPaymentError
  };
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate progress percentage based on current step
  */
function calculateProgress(currentStep: string, steps: PaymentFlowStep[]): number {
  const currentIndex = steps.findIndex(step => step.id === currentStep);
  if (currentIndex === -1) return 0;
  
  const completedSteps = steps.slice(0, currentIndex).filter(step => step.isComplete).length;
  const totalSteps = steps.length;
  
  return Math.round((completedSteps / totalSteps) * 100);
}

export default usePaymentFlow;