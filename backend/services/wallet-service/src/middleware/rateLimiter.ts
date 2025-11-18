import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

// General API rate limiter
export const apiRateLimiter = new RateLimiterMemory({
  keyPrefix: 'wallet_api_limit',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Sensitive operation rate limiter (stricter)
export const sensitiveOperationRateLimiter = new RateLimiterMemory({
  keyPrefix: 'wallet_sensitive_limit',
  points: 10, // Number of requests
  duration: 300, // Per 5 minutes
  blockDuration: 600, // Block for 10 minutes if limit exceeded
});

/**
 * Generic rate limiting middleware
 */
export const createRateLimitMiddleware = (rateLimiter: RateLimiterMemory) => {
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
export const createUserRateLimitMiddleware = (rateLimiter: RateLimiterMemory) => {
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
  sensitiveOperation: createRateLimitMiddleware(sensitiveOperationRateLimiter),
};