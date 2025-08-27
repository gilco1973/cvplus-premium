# @cvplus/premium

A comprehensive premium subscription and billing module for CVPlus with Stripe integration, feature gating, and usage tracking.

## Features

- 🔒 **Secure Stripe Integration** - PCI-compliant payment processing with comprehensive error handling
- 📊 **Subscription Management** - Complete lifecycle management with caching and validation
- 🚪 **Feature Gating** - Granular access control with real-time validation
- 📈 **Usage Tracking** - Detailed analytics and usage monitoring
- 💳 **Billing Management** - Invoice generation, payment history, and refund processing
- ⚛️ **React Components** - Ready-to-use UI components for subscription flows
- 🎣 **React Hooks** - Comprehensive hooks for state management
- 🔧 **TypeScript Support** - Full type safety and IntelliSense support

## Installation

```bash
npm install @cvplus/premium
```

## Dependencies

This package has peer dependencies on:
- `@cvplus/core` - Core utilities and logging
- `react` ^18.0.0 - React framework
- `firebase` ^10.0.0 - Firebase services
- `stripe` ^15.0.0 - Stripe API

## Quick Start

### 1. Configure Services

```typescript
import { 
  StripeService, 
  SubscriptionService, 
  FeatureService,
  createDefaultPremiumConfig 
} from '@cvplus/premium';

// Create configuration
const config = createDefaultPremiumConfig('production');

// Initialize services
const stripeService = new StripeService({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  environment: 'production',
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrorCodes: ['rate_limit', 'api_connection_error'],
    retryableErrorTypes: ['StripeConnectionError', 'StripeAPIError']
  },
  idempotency: {
    enabled: true,
    keyPrefix: 'cvplus',
    keyGenerator: (op, params) => `cvplus:${op}:${hash(params)}`,
    timeout: 30000
  }
});

const subscriptionService = new SubscriptionService();
const featureService = new FeatureService(subscriptionService);
```

### 2. React Components

```tsx
import { 
  SubscriptionPlans, 
  FeatureGate, 
  BillingHistory,
  UpgradePrompt 
} from '@cvplus/premium';

function PricingPage() {
  const handlePlanSelect = (tier) => {
    // Handle plan selection
    console.log('Selected tier:', tier);
  };

  return (
    <SubscriptionPlans
      currentTier="FREE"
      onPlanSelect={handlePlanSelect}
      showComparison={true}
    />
  );
}

function FeatureComponent() {
  return (
    <FeatureGate
      feature="advancedAnalytics"
      fallback={<div>Upgrade to access analytics</div>}
      showUpgradePrompt={true}
    >
      <AdvancedAnalyticsComponent />
    </FeatureGate>
  );
}

function BillingPage({ userId }) {
  return (
    <BillingHistory 
      userId={userId}
      limit={20}
    />
  );
}
```

### 3. React Hooks

```tsx
import { 
  useSubscription, 
  useFeatureGate, 
  useBilling 
} from '@cvplus/premium';

function useUserPremiumStatus(userId: string) {
  const { 
    subscription, 
    isLoading, 
    hasFeature, 
    refresh 
  } = useSubscription({ userId });

  const canAccessAnalytics = hasFeature('advancedAnalytics');
  const canGenerateVideos = hasFeature('videoIntroduction');

  return {
    subscription,
    isLoading,
    canAccessAnalytics,
    canGenerateVideos,
    refresh
  };
}

function usePremiumFeature(userId: string, feature: string) {
  const { hasAccess, isLoading, upgrade } = useFeatureGate({
    userId,
    feature,
    onAccessDenied: () => console.log('Access denied'),
    onUpgradeRequired: () => console.log('Upgrade required')
  });

  return { hasAccess, isLoading, upgrade };
}

function UserBilling({ userId }) {
  const { paymentHistory, invoices, isLoading } = useBilling({ userId });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h3>Payments: {paymentHistory.length}</h3>
      <h3>Invoices: {invoices.length}</h3>
    </div>
  );
}
```

## Advanced Usage

### Stripe Integration

```typescript
import { StripeService } from '@cvplus/premium';

const stripe = new StripeService(config);

// Create payment intent
const paymentIntent = await stripe.createPaymentIntent({
  amount: 4900, // $49.00 in cents
  currency: 'usd',
  customer: 'cus_customer123',
  description: 'CVPlus Premium Lifetime Access',
  metadata: {
    userId: 'user123',
    tier: 'PREMIUM'
  }
});

// Handle webhook
const result = await stripe.processWebhook(
  rawBody,
  signature,
  {
    'payment_intent.succeeded': async (event) => {
      const paymentIntent = event.data.object;
      // Grant premium access
      return { processed: true };
    }
  }
);
```

### Feature Gating

```typescript
import { FeatureService } from '@cvplus/premium';

const features = new FeatureService(subscriptionService);

// Check single feature
const hasAccess = await features.hasFeatureAccess('user123', 'advancedAnalytics');

// Check multiple features
const accessMap = await features.hasMultipleFeatureAccess('user123', [
  'webPortal',
  'aiChat',
  'podcast'
]);

// Configure feature rollout
features.setFeatureRollout('newFeature', 25); // 25% rollout

// Get upgrade suggestions
const suggestions = await features.getUpgradeSuggestions('user123');
```

### Usage Tracking

```typescript
import { UsageService } from '@cvplus/premium';

const usage = new UsageService({
  realTimeUpdates: true,
  batchProcessing: { enabled: true, batchSize: 100 },
  alerts: { enabled: true, thresholds: [75, 90, 100] }
});

// Track usage
await usage.trackUsage('user123', 'cv_uploads', 1);

// Check limits
const limitCheck = await usage.checkUsageLimit('user123', 'video_generations', 1);
if (!limitCheck.allowed) {
  throw new Error('Usage limit exceeded');
}

// Get analytics
const analytics = await usage.generateUsageAnalytics('user123', '2024-01');
```

## Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRICE_ID_DEV=price_dev_...
STRIPE_PRICE_ID_STAGING=price_staging_...
STRIPE_PRICE_ID_PROD=price_live_...
```

### Firebase Security Rules

```javascript
// Firestore security rules for subscriptions
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userSubscriptions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /paymentHistory/{paymentId} {
      allow read: if request.auth != null && 
                   request.auth.uid == resource.data.userId;
    }
  }
}
```

## API Reference

### Services

- **StripeService** - Secure Stripe API wrapper with error handling and retry logic
- **SubscriptionService** - Subscription lifecycle management with caching
- **BillingService** - Invoice generation, payment tracking, and refund processing
- **FeatureService** - Feature gating with rollout management
- **UsageService** - Usage tracking and analytics

### Components

- **SubscriptionPlans** - Pricing plans display with feature comparison
- **BillingHistory** - Payment history and invoice management
- **FeatureGate** - Component-level feature access control
- **UpgradePrompt** - Customizable upgrade prompts

### Hooks

- **useSubscription** - Subscription state management
- **useBilling** - Billing data and payment methods
- **useFeatureGate** - Feature access control
- **useMultipleFeatureGates** - Multiple feature checking

## Error Handling

The module includes comprehensive error handling:

```typescript
import { isStripeError, getUserFriendlyErrorMessage } from '@cvplus/premium';

try {
  await createPayment();
} catch (error) {
  if (isStripeError(error)) {
    const friendlyMessage = getUserFriendlyErrorMessage(error);
    showError(friendlyMessage);
  } else {
    // Handle other errors
    console.error(error);
  }
}
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=subscription
```

## Security Considerations

- Never expose Stripe secret keys in client-side code
- Always validate webhook signatures
- Implement proper rate limiting
- Use HTTPS in production
- Follow PCI compliance guidelines
- Validate all user inputs
- Implement proper access controls

## Performance

- Subscription data is cached with configurable TTL
- Batch processing for usage tracking
- Lazy loading of components
- Optimistic updates where appropriate
- Database query optimization
- CDN integration for assets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- GitHub Issues: [Create an issue](https://github.com/cvplus/premium/issues)
- Documentation: [View docs](https://docs.cvplus.com/premium)
- Email: support@cvplus.com

## Changelog

### v1.0.0
- Initial release
- Stripe integration
- Subscription management
- Feature gating
- Usage tracking
- React components and hooks
- TypeScript support