const { RateLimiter } = require('../../src/middleware/rateLimiter');

function createMockRequest(ip = '127.0.0.1', url = '/api/webhooks') {
  return {
    ip,
    originalUrl: url,
    connection: { remoteAddress: ip }
  };
}

function createMockResponse() {
  const res = {};
  res.headers = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockImplementation((headers) => {
    Object.assign(res.headers, headers);
    return res;
  });
  return res;
}

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 1000, max: 3 });
  });

  it('should allow requests under the limit', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = jest.fn();

    const middleware = limiter.middleware();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.headers['X-RateLimit-Remaining']).toBe(2);

    next.mockClear();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.headers['X-RateLimit-Remaining']).toBe(1);
  });

  it('should block requests over the limit', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = jest.fn();
    const middleware = limiter.middleware();

    middleware(req, res, next);
    middleware(req, res, next);
    middleware(req, res, next);

    next.mockClear();
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String), retryAfter: expect.any(Number) })
    );
  });

  it('should track different IPs separately', () => {
    const req1 = createMockRequest('1.1.1.1');
    const req2 = createMockRequest('2.2.2.2');
    const res = createMockResponse();
    const next = jest.fn();
    const middleware = limiter.middleware();

    middleware(req1, res, next);
    middleware(req1, res, next);
    middleware(req1, res, next);

    next.mockClear();
    middleware(req2, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should track different URLs separately for same IP', () => {
    const req1 = createMockRequest('1.1.1.1', '/api/webhooks/1');
    const req2 = createMockRequest('1.1.1.1', '/api/webhooks/2');
    const res = createMockResponse();
    const next = jest.fn();
    const middleware = limiter.middleware();

    middleware(req1, res, next);
    middleware(req1, res, next);
    middleware(req1, res, next);

    next.mockClear();
    middleware(req2, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should reset after window expires', (done) => {
    limiter = new RateLimiter({ windowMs: 50, max: 2 });
    const req = createMockRequest();
    const res = createMockResponse();
    const next = jest.fn();
    const middleware = limiter.middleware();

    middleware(req, res, next);
    middleware(req, res, next);

    next.mockClear();
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();

    setTimeout(() => {
      next.mockClear();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should set rate limit headers', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = jest.fn();
    const middleware = limiter.middleware();

    middleware(req, res, next);

    expect(res.headers['X-RateLimit-Limit']).toBe(3);
    expect(res.headers['X-RateLimit-Remaining']).toBe(2);
    expect(res.headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('should use fallback IP when req.ip is undefined', () => {
    const req = { connection: { remoteAddress: '10.0.0.1' }, originalUrl: '/test' };
    const res = createMockResponse();
    const next = jest.fn();
    const middleware = limiter.middleware();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reset all entries', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = jest.fn();
    const middleware = limiter.middleware();

    middleware(req, res, next);
    limiter.reset();

    next.mockClear();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return stats', () => {
    const stats = limiter.getStats();
    expect(stats).toHaveProperty('entries');
    expect(stats).toHaveProperty('windowMs');
    expect(stats).toHaveProperty('max');
    expect(stats.max).toBe(3);
  });
});
