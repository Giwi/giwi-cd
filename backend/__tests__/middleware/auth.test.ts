const { authenticate, optionalAuth, requireRole, generateToken } = require('../../src/middleware/auth');
const User = require('../../src/models/User').default;
const { db } = require('../../src/config/database');

function createMockRequest(token = null) {
  const headers = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return { headers };
}

function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function createNextMock() {
  return jest.fn();
}

describe('Auth Middleware', () => {
  let user = null;
  let token = null;

  beforeEach(async () => {
    db.set('users', []).write();
    user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      role: 'user'
    });
    token = generateToken(user.id);
  });

  describe('authenticate', () => {
    it('should return 401 when no token is provided', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createNextMock();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      const req = createMockRequest('invalid-token');
      const res = createMockResponse();
      const next = createNextMock();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should set req.user and call next for valid token', async () => {
      const req = createMockRequest(token);
      const res = createMockResponse();
      const next = createNextMock();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(user.id);
    });
  });

  describe('optionalAuth', () => {
    it('should pass through without user when no token', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createNextMock();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should set req.user when valid token is provided', async () => {
      const req = createMockRequest(token);
      const res = createMockResponse();
      const next = createNextMock();

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(user.id);
    });
  });

  describe('requireRole', () => {
    it('should return 403 when user does not have required role', async () => {
      const req = { user: { role: 'user' } };
      const res = createMockResponse();
      const next = createNextMock();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should call next when user has required role', async () => {
      const req = { user: { role: 'admin' } };
      const res = createMockResponse();
      const next = createNextMock();

      const middleware = requireRole('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow multiple roles', async () => {
      const req = { user: { role: 'user' } };
      const res = createMockResponse();
      const next = createNextMock();

      const middleware = requireRole('admin', 'user');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken('test-user-id');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });
});
