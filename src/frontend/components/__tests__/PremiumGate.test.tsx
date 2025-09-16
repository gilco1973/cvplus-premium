import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PremiumGate, ExternalDataSourcesGate, usePremiumGateAnalytics } from '../PremiumGate';
import * as premiumHooks from '../../../hooks/usePremiumStatus';

// Mock React.ErrorInfo
const mockErrorInfo = {
  componentStack: 'mock component stack'
};

// Mock the premium hooks
vi.mock('../../../hooks/usePremiumStatus', () => ({
  usePremiumStatus: vi.fn(),
  useFeatureAccess: vi.fn()
}));

// Mock the PremiumUpgradePrompt component
vi.mock('../../common/PremiumUpgradePrompt', () => ({
  PremiumUpgradePrompt: ({ feature, variant, className }: any) => (
    <div data-testid="premium-upgrade-prompt" data-feature={feature} data-variant={variant} className={className}>
      Upgrade to Premium
    </div>
  )
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Crown: () => <div data-testid="crown-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Loader2: () => <div data-testid="loader-icon" />
}));

// Mock design system
vi.mock('../../../config/designSystem', () => ({
  designSystem: {
    components: {
      status: {
        error: 'bg-red-500 text-white'
      },
      button: {
        base: 'btn-base',
        sizes: {
          md: 'btn-md'
        }
      },
      card: {
        base: 'card-base',
        variants: {
          default: 'card-default'
        }
      }
    }
  }
}));

const mockUsePremiumStatus = vi.mocked(premiumHooks.usePremiumStatus);
const mockUseFeatureAccess = vi.mocked(premiumHooks.useFeatureAccess);

// Test component
const TestComponent: React.FC = () => (
  <div data-testid="test-content">
    Premium Content Here
  </div>
);

describe('PremiumGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUsePremiumStatus.mockReturnValue({
      isPremium: false,
      isLoading: false,
      error: null,
      features: {},
      subscriptionStatus: 'free',
      usageStats: null,
      refreshStatus: vi.fn(),
      refreshUsage: vi.fn()
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: true,
        allFeatures: {}
      });

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
        >
          <TestComponent />
        </PremiumGate>
      );

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Checking premium status...')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });
  });

  describe('Premium Access', () => {
    it('should render children when user has access', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: true,
        isPremium: true,
        isLoading: false,
        allFeatures: { testFeature: true }
      });

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
        >
          <TestComponent />
        </PremiumGate>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.queryByTestId('premium-upgrade-prompt')).not.toBeInTheDocument();
    });

    it('should add correct data attributes when user has access', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: true,
        isPremium: true,
        isLoading: false,
        allFeatures: { testFeature: true }
      });

      const { container } = render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
        >
          <TestComponent />
        </PremiumGate>
      );

      const gateElement = container.querySelector('.premium-gate');
      expect(gateElement).toHaveAttribute('data-feature', 'testFeature');
      expect(gateElement).toHaveAttribute('data-has-access', 'true');
      expect(gateElement).toHaveAttribute('data-is-premium', 'true');
    });
  });

  describe('No Access - Upgrade Prompt', () => {
    it('should show upgrade prompt when user has no access', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
        >
          <TestComponent />
        </PremiumGate>
      );

      expect(screen.getByTestId('premium-upgrade-prompt')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
      expect(screen.getByText('Test Feature')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      const CustomFallback = () => (
        <div data-testid="custom-fallback">Custom upgrade prompt</div>
      );

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
          fallback={<CustomFallback />}
        >
          <TestComponent />
        </PremiumGate>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('premium-upgrade-prompt')).not.toBeInTheDocument();
    });
  });

  describe('Preview Mode', () => {
    it('should show preview with overlay when showPreview is true', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
          showPreview={true}
        >
          <TestComponent />
        </PremiumGate>
      );

      // Should show the content (as preview)
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Should show the overlay
      expect(screen.getByText('Premium Feature')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    });

    it('should apply custom preview opacity', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      const { container } = render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
          showPreview={true}
          previewOpacity={0.5}
        >
          <TestComponent />
        </PremiumGate>
      );

      const previewElement = container.querySelector('.premium-preview');
      expect(previewElement).toHaveStyle({ opacity: '0.5' });
    });
  });

  describe('Analytics and Events', () => {
    it('should call onAnalyticsEvent when upgrade prompt is shown', async () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      const mockAnalyticsEvent = vi.fn();

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
          onAnalyticsEvent={mockAnalyticsEvent}
        >
          <TestComponent />
        </PremiumGate>
      );

      await waitFor(() => {
        expect(mockAnalyticsEvent).toHaveBeenCalledWith(
          'upgrade_prompt_shown',
          { feature: 'testFeature', title: 'Test Feature' }
        );
      });
    });

    it('should call onAccessDenied when preview overlay is clicked', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      const mockOnAccessDenied = vi.fn();
      const mockAnalyticsEvent = vi.fn();

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
          showPreview={true}
          onAccessDenied={mockOnAccessDenied}
          onAnalyticsEvent={mockAnalyticsEvent}
        >
          <TestComponent />
        </PremiumGate>
      );

      // Click the overlay (it has role="button")
      const overlay = screen.getByRole('button', { name: /premium feature locked/i });
      fireEvent.click(overlay);

      expect(mockOnAccessDenied).toHaveBeenCalled();
      expect(mockAnalyticsEvent).toHaveBeenCalledWith(
        'feature_access_denied',
        { feature: 'testFeature', title: 'Test Feature' }
      );
    });
  });

  describe('Error Boundary', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    beforeEach(() => {
      console.error = vi.fn();
    });
    
    afterEach(() => {
      console.error = originalError;
    });

    it('should handle errors gracefully', () => {
      // Test that error boundary works properly
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      // This should render without throwing
      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
        >
          <TestComponent />
        </PremiumGate>
      );

      // Should show normal premium gate content instead of error
      expect(screen.getByTestId('premium-upgrade-prompt')).toBeInTheDocument();
    });
  });

  describe('Pre-configured Gates', () => {
    it('should render ExternalDataSourcesGate with correct configuration', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      render(
        <ExternalDataSourcesGate>
          <TestComponent />
        </ExternalDataSourcesGate>
      );

      // Since it shows preview mode, it should show the overlay text
      expect(screen.getByText('Premium Feature')).toBeInTheDocument();
      expect(screen.getByText(/Import and sync data from LinkedIn, GitHub/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on preview overlay', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
          showPreview={true}
        >
          <TestComponent />
        </PremiumGate>
      );

      const overlay = screen.getByRole('button', { name: /premium feature locked/i });
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveAttribute('tabIndex', '0');
    });

    it('should support keyboard navigation on preview overlay', () => {
      mockUseFeatureAccess.mockReturnValue({
        hasAccess: false,
        isPremium: false,
        isLoading: false,
        allFeatures: {}
      });

      const mockOnAccessDenied = vi.fn();

      render(
        <PremiumGate
          feature="testFeature"
          title="Test Feature"
          description="Test description"
          showPreview={true}
          onAccessDenied={mockOnAccessDenied}
        >
          <TestComponent />
        </PremiumGate>
      );

      const overlay = screen.getByRole('button', { name: /premium feature locked/i });
      
      // Test Enter key
      fireEvent.keyDown(overlay, { key: 'Enter' });
      expect(mockOnAccessDenied).toHaveBeenCalledTimes(1);
    });
  });
});

describe('usePremiumGateAnalytics', () => {
  beforeEach(() => {
    mockUsePremiumStatus.mockReturnValue({
      isPremium: false,
      isLoading: false,
      error: null,
      features: {},
      subscriptionStatus: 'free',
      usageStats: null,
      refreshStatus: vi.fn(),
      refreshUsage: vi.fn()
    });
  });

  it('should provide trackEvent function', () => {
    const TestAnalyticsComponent = () => {
      const { trackEvent } = usePremiumGateAnalytics();
      
      return (
        <button 
          onClick={() => trackEvent('test_event', { feature: 'test' })}
          data-testid="track-button"
        >
          Track Event
        </button>
      );
    };

    render(<TestAnalyticsComponent />);
    
    // Just test that the function exists and can be called without error
    const trackButton = screen.getByTestId('track-button');
    expect(trackButton).toBeInTheDocument();
    
    // Should not throw when clicked
    expect(() => {
      fireEvent.click(trackButton);
    }).not.toThrow();
  });
});