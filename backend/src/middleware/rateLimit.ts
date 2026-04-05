import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: Record<string, string>;
}

const createRateLimiter = (options: RateLimiterOptions = {}): ReturnType<typeof rateLimit> => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later' },
    skip: (req: Request) => {
      return (req as unknown as Record<string, { role?: string }>).user?.role === 'admin';
    },
    ...options
  } as Parameters<typeof rateLimit>[0]);
};

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again in 15 minutes' }
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Rate limit exceeded' }
});

const triggerLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many build triggers, please wait' }
});

export {
  authLimiter,
  apiLimiter,
  triggerLimiter,
  createRateLimiter
};
