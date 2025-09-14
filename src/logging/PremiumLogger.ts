/**
 * T033: Premium service logging in packages/premium/src/logging/PremiumLogger.ts
 *
 * Specialized logger for subscription, billing, and premium feature events
 */

import { PremiumLogger as BasePremiumLogger, premiumLogger } from '@cvplus/core';

// Re-export the premium logger
export { premiumLogger };
export default premiumLogger;