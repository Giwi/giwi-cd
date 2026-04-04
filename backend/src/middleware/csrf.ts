import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const csrfCookieName = 'XSRF-TOKEN';

const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const isExcludedRoute = (path: string): boolean => {
  const excluded = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/dashboard',
    '/api/webhooks',
    '/api/health'
  ];
  return excluded.some(route => path.startsWith(route));
};

const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    const csrfToken = req.cookies?.[csrfCookieName] || generateToken();
    res.cookie(csrfCookieName, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    req.csrfToken = csrfToken;
    return next();
  }

  const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
  const csrfCookie = req.cookies?.[csrfCookieName];

  if (isExcludedRoute(req.path)) {
    return next();
  }

  if (req.user?.role === 'admin') {
    return next();
  }

  if (!csrfHeader && !csrfCookie) {
    return next();
  }

  if (csrfHeader && csrfCookie && csrfHeader === csrfCookie) {
    return next();
  }

  res.status(403).json({ success: false, error: 'Invalid CSRF token' });
};

export {
  csrfMiddleware,
  generateToken,
  csrfCookieName
};
