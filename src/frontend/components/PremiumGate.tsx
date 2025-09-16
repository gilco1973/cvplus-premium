/**
 * PremiumGate - Comprehensive Premium Feature Access Control
 * 
 * This is the main entry point for the PremiumGate component system.
 * It provides a modular, accessible, and production-ready solution for
 * controlling access to premium features in CVPlus.
 * 
 * Key Features:
 * - Automatic premium access checking
 * - Customizable upgrade prompts
 * - Preview mode with overlay
 * - Analytics integration
 * - Error boundary handling
 * - Full accessibility support
 * 
 * @example
 * ```tsx
 * import { ExternalDataSourcesGate } from './components/premium/PremiumGate';
 * 
 * <ExternalDataSourcesGate>
 *   <ExternalDataSources jobId={jobId} />
 * </ExternalDataSourcesGate>
 * ```
 */

// Core component and types
export { PremiumGate, type PremiumGateProps } from './PremiumGateCore';

// Component building blocks
export {
  LoadingState,
  PreviewOverlay,
  DefaultUpgradePrompt
} from './PremiumGateComponents';

// Error boundary
export { PremiumGateErrorBoundary } from './PremiumGateErrorBoundary';

// Hooks and utilities
export { usePremiumGateAnalytics } from './PremiumGateHooks';

// Pre-configured gates and utilities
export {
  createFeaturePremiumGate,
  ExternalDataSourcesGate,
  AdvancedAnalyticsGate,
  AIInsightsGate,
  MultimediaFeaturesGate
} from './PremiumGatePresets';

// Re-export the main component as default
export { default } from './PremiumGateCore';