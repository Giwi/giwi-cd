const crypto = require('crypto');

const csrfCookieName = 'XSRF-TOKEN';

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const csrfMiddleware = (req, res, next) => {
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

  const csrfHeader = req.headers['x-csrf-token'];
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

  return res.status(403).json({ success: false, error: 'Invalid CSRF token' });
};

const isExcludedRoute = (path) => {
  const excluded = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/dashboard',
    '/api/webhooks',
    '/api/health'
  ];
  return excluded.some(route => path.startsWith(route));
};

module.exports = {
  csrfMiddleware,
  generateToken,
  csrfCookieName
};
