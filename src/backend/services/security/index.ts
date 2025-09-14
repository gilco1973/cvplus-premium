/**
 * CVPlus Premium Security Services
 * 
 * Centralized export for all security-related services including
 * rate limiting, security monitoring, and threat detection.
 * 
 * @author Gil Klainert
 * @version 4.0.0 - CVPlus Premium Module
 */

// Rate limiting services
export * from './rate-limit-guard.service';

// Security monitoring services
export * from './security-monitor.service';

// Service instances for direct import
export { rateLimitGuard } from './rate-limit-guard.service';
export { securityMonitor } from './security-monitor.service';