/**
 * CVPlus Premium Security: Rate Limiting Guard Service
 * 
 * Provides rate limiting functionality for premium endpoints to prevent abuse
 * and ensure fair usage across all premium users.
 * 
 * @author Gil Klainert
 * @version 4.0.0 - CVPlus Premium Module
 */

import { logger } from 'firebase-functions/v2';
import { BaseService } from '../../shared/base-service';

export interface RateLimitConfig {
  windowMs: number;         // Time window in milliseconds
  maxRequests: number;      // Maximum requests allowed in window
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class SecureRateLimitGuard extends BaseService {
  private rateLimitStore: Map<string, { count: number; resetTime: number }>;
  private defaultConfig: RateLimitConfig;

  constructor() {
    super({
      name: 'SecureRateLimitGuard',
      version: '4.0.0',
      enabled: true,
    });
    
    this.rateLimitStore = new Map();
    this.defaultConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,          // 100 requests per window
    };
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(
    identifier: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    const key = `rate_limit:${identifier}`;
    
    // Clean up expired entries
    this.cleanupExpiredEntries(now);
    
    const existing = this.rateLimitStore.get(key);
    
    if (!existing || now > existing.resetTime) {
      // First request in window or window has expired
      const resetTime = now + mergedConfig.windowMs;
      this.rateLimitStore.set(key, { count: 1, resetTime });
      
      return {
        allowed: true,
        remaining: mergedConfig.maxRequests - 1,
        resetTime,
      };
    }
    
    if (existing.count >= mergedConfig.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        retryAfter: existing.resetTime - now,
      };
    }
    
    // Increment counter
    existing.count++;
    this.rateLimitStore.set(key, existing);
    
    return {
      allowed: true,
      remaining: mergedConfig.maxRequests - existing.count,
      resetTime: existing.resetTime,
    };
  }

  /**
   * Create rate limiting middleware for Express-style middleware
   */
  createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
    return async (req: any, res: any, next: any) => {
      try {
        const identifier = config.keyGenerator ? 
          config.keyGenerator(req) : 
          this.extractIdentifier(req);
        
        const result = await this.checkRateLimit(identifier, config);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': config.maxRequests || this.defaultConfig.maxRequests,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        });
        
        if (!result.allowed) {
          if (result.retryAfter) {
            res.set('Retry-After', Math.ceil(result.retryAfter / 1000));
          }
          
          logger.warn('Rate limit exceeded', {
            identifier,
            resetTime: result.resetTime,
            retryAfter: result.retryAfter,
          });
          
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
            resetTime: result.resetTime,
          });
        }
        
        next();
      } catch (error) {
        logger.error('Rate limiting error', error);
        // On error, allow request to proceed to avoid blocking legitimate traffic
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    this.rateLimitStore.delete(key);
  }

  /**
   * Get current rate limit status for identifier
   */
  async getRateLimitStatus(identifier: string): Promise<RateLimitResult | null> {
    const key = `rate_limit:${identifier}`;
    const existing = this.rateLimitStore.get(key);
    const now = Date.now();
    
    if (!existing || now > existing.resetTime) {
      return null;
    }
    
    return {
      allowed: existing.count < this.defaultConfig.maxRequests,
      remaining: Math.max(0, this.defaultConfig.maxRequests - existing.count),
      resetTime: existing.resetTime,
    };
  }

  /**
   * Extract identifier from request (user ID, IP, etc.)
   */
  private extractIdentifier(req: any): string {
    // Try to get user ID from auth context
    if (req.auth?.uid) {
      return `user:${req.auth.uid}`;
    }
    
    // Fall back to IP address
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               req.ip || 
               'unknown';
    
    return `ip:${ip}`;
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(now: number): void {
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (now > value.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStatistics(): Promise<{
    totalTrackedIdentifiers: number;
    activeRateLimits: number;
    expiredEntries: number;
  }> {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;
    
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (now > value.resetTime) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }
    
    return {
      totalTrackedIdentifiers: this.rateLimitStore.size,
      activeRateLimits: activeCount,
      expiredEntries: expiredCount,
    };
  }
}

// Export singleton instance
export const rateLimitGuard = new SecureRateLimitGuard();