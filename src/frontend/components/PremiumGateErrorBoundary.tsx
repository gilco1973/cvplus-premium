import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { designSystem } from '../../config/designSystem';

/**
 * Error boundary state interface
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Props for the error boundary
 */
interface PremiumGateErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Internal error boundary for premium status failures
 * Handles errors gracefully and provides user-friendly error messages
 */
export class PremiumGateErrorBoundary extends Component<
  PremiumGateErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: PremiumGateErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PremiumGate Error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={`${designSystem.components.status.error} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold">Premium Status Error</h3>
          </div>
          <p className="text-sm opacity-90">
            Unable to check premium status. Please refresh the page or contact support if the issue persists.
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-3 text-sm underline hover:no-underline opacity-80 hover:opacity-100 transition-opacity"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}