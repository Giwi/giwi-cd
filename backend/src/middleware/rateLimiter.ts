import type { Request, Response, NextFunction } from 'express';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

interface RateLimiterEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private windowMs: number;
  private max: number;
  private message: string;
  private store: Map<string, RateLimiterEntry>;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs || 60000;
    this.max = options.max || 10;
    this.message = options.message || 'Too many requests, please try again later';
    this.store = new Map();
  }

  private _cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.resetTime > 0) {
        this.store.delete(key);
      }
    }
  }

  private _getKey(req: Request): string {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    this._cleanup();

    return (req: Request, res: Response, next: NextFunction) => {
      const key = `${this._getKey(req)}:${req.originalUrl}`;
      const now = Date.now();
      let entry = this.store.get(key);

      if (!entry) {
        entry = { count: 0, resetTime: now + this.windowMs };
        this.store.set(key, entry);
      }

      if (now > entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + this.windowMs;
      }

      entry.count++;

      const remaining = Math.max(0, this.max - entry.count);
      const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

      res.set({
        'X-RateLimit-Limit': this.max,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': entry.resetTime
      });

      if (entry.count > this.max) {
        return res.status(429).json({
          error: this.message,
          retryAfter: resetSeconds
        });
      }

      next();
    };
  }

  reset(): void {
    this.store.clear();
  }

  getStats(): { entries: number; windowMs: number; max: number } {
    return {
      entries: this.store.size,
      windowMs: this.windowMs,
      max: this.max
    };
  }
}

export { RateLimiter };
