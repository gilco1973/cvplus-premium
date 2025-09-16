/**
 * CVPlus Premium Security Services
 *
 * SECURITY CONSOLIDATION: Rate limiting has been moved to @cvplus/core
 * for platform-wide security consistency. Import rate limiting from core module.
 *
 * @author Gil Klainert
 * @version 4.0.0 - CVPlus Premium Module
 */

// Rate limiting services - CONSOLIDATED TO CORE MODULE
// Use: import { SecureRateLimitGuard, secureRateLimitGuard } from '@cvplus/core';
export { SecureRateLimitGuard, secureRateLimitGuard } from '@cvplus/core';

// Security monitoring services (premium-specific)
export * from './security-monitor.service';

// Service instances for direct import
export { securityMonitor } from './security-monitor.service';

// Legacy compatibility - redirect to core module
export { secureRateLimitGuard as rateLimitGuard } from '@cvplus/core';