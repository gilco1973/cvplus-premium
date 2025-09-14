# @cvplus/premium

A comprehensive premium subscription and billing module for CVPlus with Stripe integration, feature gating, and usage tracking.

## Features

- 🔒 **Secure Stripe Integration** - PCI-compliant payment processing with comprehensive error handling
- 📊 **Subscription Management** - Complete lifecycle management with caching and validation
- 🚪 **Feature Gating** - Granular access control with real-time validation
- 📈 **Usage Tracking** - Detailed analytics and usage monitoring
- 💳 **Billing Management** - Invoice generation, payment history, and refund processing
- 🌍 **Global Payment Infrastructure** - Multi-currency, regional payments, tax compliance, fraud prevention
- 🎯 **Performance & Monitoring** - Real-time monitoring, auto-scaling, CDN optimization (99.99% SLA)
- 🛡️ **Advanced Security** - ML-based fraud prevention, risk assessment, compliance reporting
- 💱 **Multi-Currency Support** - 17 currencies, regional pricing, tax calculation for 15+ jurisdictions
- 📊 **Enterprise Analytics** - Advanced analytics, dynamic pricing, ML predictions, A/B testing
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

## Global Payment Infrastructure

### Multi-Currency Support

```typescript
import {
  CurrencyManager,
  TaxComplianceService,
  FraudPreventionService
} from '@cvplus/premium';

const currencyManager = new CurrencyManager();

// Get localized pricing
const localizedPrice = await currencyManager.calculateLocalizedPrice(
  100, // $100 USD
  'USD',
  'DE' // Germany
);

console.log(localizedPrice);
// {
//   currency: 'EUR',
//   price: 85.50,
//   priceWithTax: 101.75, // With German VAT
//   adjustmentReason: 'Purchasing power adjustment for Germany'
// }

// Convert currency with fees
const conversion = await currencyManager.convertCurrency(
  100,
  'USD',
  'EUR',
  true // Include fees
);
```

### Tax Compliance

```typescript
const taxCompliance = new TaxComplianceService();

// Calculate tax for customer
const taxCalculation = await taxCompliance.calculateTax(
  100, // Amount
  'EUR', // Currency
  {
    countryCode: 'DE',
    region: 'Bavaria',
    taxId: 'DE123456789',
    isBusinessCustomer: false
  }
);

// Validate VAT number
const vatValidation = await taxCompliance.validateVATNumber(
  'DE123456789',
  'DE'
);

// Generate tax report (Admin only)
const taxReport = await taxCompliance.generateTaxReport(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  'DE' // Jurisdiction
);
```

### Fraud Prevention

```typescript
const fraudPrevention = new FraudPreventionService();

// Assess transaction risk
const riskAssessment = await fraudPrevention.assessTransactionRisk({
  transactionId: 'txn_123',
  customerId: 'user_123',
  amount: 100,
  currency: 'USD',
  paymentMethod: 'card',
  customerHistory: {
    totalTransactions: 10,
    successfulTransactions: 10,
    accountAgeInDays: 365,
    previousChargebacks: 0,
    paymentMethodChanges: 0
  },
  transactionContext: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    deviceFingerprint: 'device_123',
    location: {
      country: 'US',
      region: 'CA',
      city: 'San Francisco'
    },
    sessionId: 'session_123',
    referrer: 'direct'
  },
  timestamp: new Date()
});

console.log(riskAssessment);
// {
//   riskLevel: 'LOW',
//   decision: 'approve',
//   reviewRequired: false,
//   riskScore: 15.5,
//   indicators: []
// }
```

### Global Payment Functions

```typescript
// Firebase Functions for global payments
import {
  getLocalizedPricing,
  validateVATNumber,
  assessFraudRisk,
  convertCurrency
} from '@cvplus/premium/backend';

// Client-side usage
const pricingResponse = await firebase.functions().httpsCallable('getLocalizedPricing')({
  basePrice: 100,
  baseCurrency: 'USD',
  targetRegion: 'DE',
  customerTaxInfo: {
    countryCode: 'DE',
    isBusinessCustomer: false
  }
});

// Get supported regions and payment methods
const regionsResponse = await firebase.functions().httpsCallable('getSupportedRegions')();
console.log(`Supports ${regionsResponse.data.supportedRegions} regions`);
console.log(`${regionsResponse.data.globalPaymentMethods.length} payment methods available`);
```

## Performance & Monitoring

### Real-time Performance Monitoring

```typescript
import {
  PerformanceMonitor,
  AutoScalingService,
  CDNOptimizer
} from '@cvplus/premium';

const performanceMonitor = new PerformanceMonitor();

// Record performance metrics
await performanceMonitor.recordMetric({
  type: 'RESPONSE_TIME',
  value: 150, // milliseconds
  service: 'cvplus-api',
  endpoint: '/api/cv/analyze',
  timestamp: new Date()
});

// Generate SLA report
const slaReport = await performanceMonitor.generateSLAReport(
  'cvplus-api',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

console.log(`SLA Compliance: ${slaReport.compliance.availability}%`);
// Target: 99.99% availability, <500ms response time, <0.1% error rate
```

### Auto-scaling

```typescript
const autoScaling = new AutoScalingService();

// Monitor and scale resources
const scalingDecision = await autoScaling.evaluateScaling('cvplus-functions');

if (scalingDecision.shouldScale) {
  await autoScaling.scaleResource(
    'FIREBASE_FUNCTIONS',
    scalingDecision.targetInstances
  );
}

// Get scaling recommendations
const recommendations = await autoScaling.getScalingRecommendations(
  'cvplus-api',
  7 // days of data
);
```

### CDN Optimization

```typescript
const cdnOptimizer = new CDNOptimizer();

// Optimize content delivery
const optimization = await cdnOptimizer.optimizeContent({
  contentType: 'CV_DOCUMENTS',
  region: 'US_EAST_1',
  cachePolicy: 'AGGRESSIVE'
});

// Get performance report
const perfReport = await cdnOptimizer.generateGlobalPerformanceReport();
console.log(`Global average response time: ${perfReport.averageResponseTime}ms`);
console.log(`Cache hit ratio: ${perfReport.cacheHitRatio}%`);
```

### Health Monitoring

```typescript
// Check system health
const healthStatus = await firebase.functions().httpsCallable('globalPaymentsHealthCheck')();

console.log(`Overall Status: ${healthStatus.data.overallStatus}`);
console.log('Service Health:', healthStatus.data.services);

// Monitor SLA compliance
const complianceCheck = await performanceMonitor.checkSLACompliance('cvplus-payment');
if (complianceCheck.status === 'VIOLATION') {
  console.log('SLA violations detected:', complianceCheck.violations);
}

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

#### Core Services
- **StripeService** - Secure Stripe API wrapper with error handling and retry logic
- **SubscriptionService** - Subscription lifecycle management with caching
- **BillingService** - Invoice generation, payment tracking, and refund processing
- **FeatureService** - Feature gating with rollout management
- **UsageService** - Usage tracking and analytics

#### Global Payment Services
- **CurrencyManager** - Multi-currency support with 17 currencies and regional pricing
- **TaxComplianceService** - Tax calculation for 15+ jurisdictions, VAT validation, compliance reporting
- **RegionalPaymentMethodsService** - 14 regional payment methods with market analysis
- **FraudPreventionService** - ML-based fraud detection with 11 risk indicators

#### Performance & Monitoring Services
- **PerformanceMonitor** - Real-time monitoring with 99.99% SLA compliance tracking
- **AutoScalingService** - Intelligent auto-scaling for 10,000+ concurrent users
- **CDNOptimizer** - Global CDN optimization with 15 edge locations

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
# Run all tests
npm test

# Run comprehensive test suite with security audit
npm run test:comprehensive

# Run tests with coverage (90%+ required for financial operations)
npm run test:coverage

# Run specific test suites
npm run test:payments          # Global payment infrastructure tests
npm run test:monitoring        # Performance & monitoring tests
npm run test:functions         # Firebase Functions integration tests

# Run specific test file
npm test -- --testPathPattern=subscription
npm test -- --testPathPattern=fraud-prevention
```

### Test Coverage Requirements

- **Global Payment Services**: 95% coverage (financial operations)
- **Performance Monitoring**: 90% coverage
- **Core Services**: 90% coverage
- **Security Testing**: Mandatory for all payment flows
- **Compliance Testing**: PCI DSS and fraud prevention validation

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

### v4.0.0 (Latest)
- 🌍 **Global Payment Infrastructure** - Multi-currency support (17 currencies), regional pricing, tax compliance
- 🛡️ **Advanced Fraud Prevention** - ML-based risk assessment with 11 fraud indicators
- 💱 **Tax Compliance** - Automated tax calculation for 15+ jurisdictions, VAT validation
- 🎯 **Performance & Monitoring** - Real-time monitoring with 99.99% SLA compliance
- 🚀 **Auto-scaling** - Intelligent scaling for 10,000+ concurrent users
- 🌐 **CDN Optimization** - Global CDN with 15 edge locations for optimal performance
- 📊 **Advanced Analytics** - Enhanced analytics with dynamic pricing and ML predictions
- 🧪 **Comprehensive Testing** - 95% coverage for financial operations, PCI compliance testing
- 📚 **Enhanced Documentation** - Complete API reference and integration guides

### v1.0.0
- Initial release
- Stripe integration
- Subscription management
- Feature gating
- Usage tracking
- React components and hooks
- TypeScript support