import type { Request, Response } from 'express';
import express, { type Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { User } from '../models/User';
import { db } from '../config/database';
import { authenticate, generateToken } from '../middleware/auth';
import { sendError } from '../middleware/errorHandler';

const router: Router = express.Router();

const validate = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg);
  }
  next();
};

router.post('/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
], validate, async (req: Request, res: Response) => {
  try {
    const settings = db.get('settings').value() as { allowRegistration?: boolean } | undefined;

    if (!settings?.allowRegistration) {
      return sendError(res, 403, 'Registration is disabled');
    }

    const { email, password, username } = req.body;
    const user = await User.create({ email, password, username });
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    if ((error as Error).message === 'Email already registered') {
      return sendError(res, 409, (error as Error).message);
    }
    sendError(res, 500, 'Registration failed');
  }
});

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], validate, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = User.findByEmail(email);
    if (!user) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    sendError(res, 500, 'Login failed');
  }
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: (req as unknown as Record<string, unknown>).user });
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logout successful' });
});

router.put('/me', authenticate, [
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validate, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await User.update((req as unknown as Record<string, string>).userId, { username, password });
    res.json({ user });
  } catch (error) {
    sendError(res, 500, 'Update failed');
  }
});

router.put('/password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], validate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = User.findByEmail((req as unknown as Record<string, { email: string }>).user?.email);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    const isValidPassword = await User.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      return sendError(res, 401, 'Current password is incorrect');
    }

    await User.update((req as unknown as Record<string, string>).userId, { password: newPassword });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    sendError(res, 500, 'Password update failed');
  }
});

export default router;
