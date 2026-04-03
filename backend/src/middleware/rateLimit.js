const rateLimit = require('express-rate-limit');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later' },
    skip: (req) => {
      return req.user?.role === 'admin';
    },
    ...options
  });
};

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many login attempts, please try again in 15 minutes' }
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, error: 'Rate limit exceeded' }
});

const triggerLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many build triggers, please wait' }
});

module.exports = {
  authLimiter,
  apiLimiter,
  triggerLimiter,
  createRateLimiter
};
