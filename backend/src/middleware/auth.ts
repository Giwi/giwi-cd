import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'giwicd-secret-key-change-in-production';

interface DecodedToken {
  userId: string;
  iat: number;
  exp: number;
}

const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired' });
        return;
      }
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    (req as unknown as Record<string, unknown>).user = user;
    (req as unknown as Record<string, string>).userId = user.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
        const user = User.findById(decoded.userId);
        if (user) {
          (req as unknown as Record<string, unknown>).user = user;
          (req as unknown as Record<string, string>).userId = user.id;
        }
      } catch {
        // Token invalid, continue without user
      }
    }
    next();
  } catch {
    next();
  }
};

const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as unknown as Record<string, { role?: string }>).user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(user.role || '')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
  );
};

export {
  authenticate,
  optionalAuth,
  requireRole,
  generateToken,
  JWT_SECRET
};
