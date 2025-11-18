import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '../config/database';
import { Request, Response, NextFunction } from 'express';

// General API rate limiter
export const apiRateLimiter = new RateLimiterMemory({
  keyPrefix: 'api_limit',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Authentication rate limiter (stricter)
export const authRateLimiter = new RateLimiterMemory({
  keyPrefix: 'auth_limit',
  points: 10, // Number of requests
  duration: 300, // Per 5 minutes
  blockDuration: 900, // Block for 15 minutes if limit exceeded
});

// Password reset rate limiter
export const passwordResetRateLimiter = new RateLimiterMemory({
  keyPrefix: 'password_reset_limit',
  points: 3, // Number of requests
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for 1 hour if limit exceeded
});

// 2FA verification rate limiter
export const twoFactorRateLimiter = new RateLimiterMemory({
  keyPrefix: '2fa_limit',
  points: 5, // Number of attempts
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes if limit exceeded
});

// Registration rate limiter
export const registrationRateLimiter = new RateLimiterMemory({
  keyPrefix: 'registration_limit',
  points: 3, // Number of registrations
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for 1 hour if limit exceeded
});

// IP-based rate limiter for suspicious activity
export const ipSuspiciousRateLimiter = new RateLimiterMemory({
  keyPrefix: 'ip_suspicious',
  points: 50, // Number of requests
  duration: 300, // Per 5 minutes
  blockDuration: 1800, // Block for 30 minutes if limit exceeded
});

/**
 * Generic rate limiting middleware
 */
export const createRateLimitMiddleware = (rateLimiter: RateLimiterMemory | RateLimiterRedis) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use IP address as key
      const key = req.ip || 'unknown';

      await rateLimiter.consume(key);
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;

      // Set rate limit headers
      res.set('Retry-After', String(secs));
      res.set('X-RateLimit-Limit', String(rateLimiter.points));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', new Date(Date.now() + secs * 1000).toISOString());

      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${secs} seconds.`,
        retryAfter: secs,
      });
    }
  };
};

/**
 * User-specific rate limiting middleware
 */
export const createUserRateLimitMiddleware = (rateLimiter: RateLimiterMemory | RateLimiterRedis) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to get user ID from request (if authenticated)
      const userId = (req as any).user?.userId;
      const key = userId ? `user:${userId}` : `ip:${req.ip || 'unknown'}`;

      await rateLimiter.consume(key);
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;

      res.set('Retry-After', String(secs));
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${secs} seconds.`,
        retryAfter: secs,
      });
    }
  };
};

/**
 * Pre-made middleware for common use cases
 */
export const rateLimitMiddleware = {
  general: createRateLimitMiddleware(apiRateLimiter),
  auth: createRateLimitMiddleware(authRateLimiter),
  passwordReset: createRateLimitMiddleware(passwordResetRateLimiter),
  twoFactor: createRateLimitMiddleware(twoFactorRateLimiter),
  registration: createRateLimitMiddleware(registrationRateLimiter),
  ipSuspicious: createRateLimitMiddleware(ipSuspiciousRateLimiter),
};

/**
 * Dynamic rate limiting based on user tier
 */
export const createTieredRateLimit = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      let points = 100; // Default tier
      let duration = 60;

      if (user) {
        switch (user.accountType) {
          case 'premium':
            points = 500;
            duration = 60;
            break;
          case 'enterprise':
            points = 1000;
            duration = 60;
            break;
          case 'demo':
            points = 50;
            duration = 60;
            break;
          default:
            points = 100;
            duration = 60;
        }
      }

      const tieredLimiter = new RateLimiterMemory({
        keyPrefix: `tiered_${user?.accountType || 'standard'}`,
        points,
        duration,
        blockDuration: duration,
      });

      const key = user?.userId ? `user:${user.userId}` : `ip:${req.ip || 'unknown'}`;
      await tieredLimiter.consume(key);

      // Set tier-specific headers
      res.set('X-RateLimit-Limit', String(points));
      res.set('X-RateLimit-Tier', user?.accountType || 'standard');

      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;

      res.set('Retry-After', String(secs));
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Rate limit exceeded for your account tier. Try again in ${secs} seconds.`,
        retryAfter: secs,
      });
    }
  };
};

/**
 * Rate limiting for sensitive operations (password changes, 2FA setup, etc.)
 */
export const sensitiveOperationRateLimit = createRateLimitMiddleware(
  new RateLimiterMemory({
    keyPrefix: 'sensitive_ops',
    points: 2, // Only 2 sensitive operations
    duration: 300, // Per 5 minutes
    blockDuration: 1800, // Block for 30 minutes
  })
);

/**
 * Check if IP is suspicious (too many requests in short time)
 */
export const checkSuspiciousIP = async (ip: string): Promise<boolean> => {
  try {
    await ipSuspiciousRateLimiter.consume(ip);
    return false;
  } catch (error) {
    return true;
  }
};

/**
 * Reset rate limit for a specific key
 */
export const resetRateLimit = async (key: string, rateLimiter: RateLimiterMemory | RateLimiterRedis): Promise<void> => {
  try {
    await rateLimiter.delete(key);
  } catch (error) {
    console.error('Error resetting rate limit:', error);
  }
};

/**
 * Get rate limit status for a key
 */
export const getRateLimitStatus = async (key: string, rateLimiter: RateLimiterMemory | RateLimiterRedis): Promise<{
  remainingPoints: number;
  msBeforeNext: number;
}> => {
  try {
    const res = await rateLimiter.get(key);
    return {
      remainingPoints: res.remainingPoints || 0,
      msBeforeNext: res.msBeforeNext || 0,
    };
  } catch (error) {
    return {
      remainingPoints: 0,
      msBeforeNext: 0,
    };
  }
};