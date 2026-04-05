import type { Request, Response } from 'express';
import express, { type Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { User } from '../models/User';
import { db } from '../config/database';
import { authenticate, requireRole, generateToken } from '../middleware/auth';
import { sendError } from '../middleware/errorHandler';
import logger from '../config/logger';

const router: Router = express.Router();

const validate = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg);
  }
  next();
};

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

let logBuffer: LogEntry[] = [];

const originalLogger = {
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger)
};

function pushLog(level: string, msg: unknown): void {
  logBuffer.push({
    timestamp: new Date().toISOString(),
    level,
    message: typeof msg === 'string' ? msg : JSON.stringify(msg)
  });
  if (logBuffer.length > 1000) logBuffer = logBuffer.slice(-500);
}

logger.info = ((msg: unknown, ...args: unknown[]) => {
  originalLogger.info(msg, ...args);
  pushLog('info', msg);
}) as typeof logger.info;

logger.warn = ((msg: unknown, ...args: unknown[]) => {
  originalLogger.warn(msg, ...args);
  pushLog('warn', msg);
}) as typeof logger.warn;

logger.error = ((msg: unknown, ...args: unknown[]) => {
  originalLogger.error(msg, ...args);
  pushLog('error', msg);
}) as typeof logger.error;

logger.debug = ((msg: unknown, ...args: unknown[]) => {
  originalLogger.debug(msg, ...args);
  pushLog('debug', msg);
}) as typeof logger.debug;

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/logs', (req: Request, res: Response) => {
  try {
    const level = req.query.level as string | undefined;
    const search = (req.query.search as string | undefined)?.toLowerCase();
    let logs = [...logBuffer];

    if (level) {
      logs = logs.filter(l => l.level === level);
    }

    if (search) {
      logs = logs.filter(l => l.message.toLowerCase().includes(search));
    }

    const limit = parseInt(req.query.limit as string) || 200;
    logs = logs.slice(-limit);

    res.json({ success: true, data: logs });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch logs');
  }
});

router.delete('/logs', (_req: Request, res: Response) => {
  try {
    logBuffer = [];
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    sendError(res, 500, 'Failed to clear logs');
  }
});

router.get('/users', (_req: Request, res: Response) => {
  try {
    const users = User.findAll();
    res.json({ users });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch users');
  }
});

router.get('/users/:id', [
  param('id').isUUID().withMessage('Invalid user ID')
], validate, (req: Request, res: Response) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    res.json({ user });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch user');
  }
});

router.post('/users', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user')
], validate, async (req: Request, res: Response) => {
  try {
    const { email, password, username, role } = req.body;

    const user = await User.create({ email, password, username, role: role || 'user' });
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user,
      token
    });
  } catch (error) {
    if ((error as Error).message === 'Email already registered') {
      return sendError(res, 409, (error as Error).message);
    }
    sendError(res, 500, 'Failed to create user');
  }
});

router.put('/users/:id', [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validate, async (req: Request, res: Response) => {
  try {
    const { username, role, password } = req.body;

    const targetUser = User.findById(req.params.id);
    if (!targetUser) {
      return sendError(res, 404, 'User not found');
    }

    const user = await User.update(req.params.id, { username, role, password });
    res.json({ user });
  } catch (error) {
    sendError(res, 500, 'Failed to update user');
  }
});

router.delete('/users/:id', [
  param('id').isUUID().withMessage('Invalid user ID')
], validate, (req: Request, res: Response) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const reqUser = (req as unknown as Record<string, { id: string }>).user;
    if (user.id === reqUser?.id) {
      return sendError(res, 400, 'Cannot delete your own account');
    }

    User.delete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    sendError(res, 500, 'Failed to delete user');
  }
});

router.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = db.get('settings').value();
    res.json({ settings });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch settings');
  }
});

router.put('/settings', [
  body('allowRegistration').optional().isBoolean().withMessage('allowRegistration must be a boolean'),
  body('maxConcurrentBuilds').optional().isInt({ min: 1, max: 10 }).withMessage('maxConcurrentBuilds must be 1-10'),
  body('defaultTimeout').optional().isInt({ min: 60 }).withMessage('defaultTimeout must be at least 60'),
  body('retentionDays').optional().isInt({ min: 1, max: 365 }).withMessage('retentionDays must be 1-365'),
  body('pollingInterval').optional().isInt({ min: 10, max: 3600 }).withMessage('pollingInterval must be 10-3600')
], validate, (req: Request, res: Response) => {
  try {
    const { allowRegistration, maxConcurrentBuilds, defaultTimeout, retentionDays, pollingInterval, notificationDefaults } = req.body;

    const updates: Record<string, unknown> = {};

    if (allowRegistration !== undefined) {
      updates.allowRegistration = !!allowRegistration;
    }
    if (maxConcurrentBuilds !== undefined) {
      updates.maxConcurrentBuilds = maxConcurrentBuilds;
    }
    if (defaultTimeout !== undefined) {
      updates.defaultTimeout = defaultTimeout;
    }
    if (retentionDays !== undefined) {
      updates.retentionDays = retentionDays;
    }
    if (pollingInterval !== undefined) {
      updates.pollingInterval = pollingInterval;
    }
    if (notificationDefaults !== undefined) {
      updates.notificationDefaults = notificationDefaults;
    }

    db.get('settings').assign(updates).write();
    const settings = db.get('settings').value();
    res.json({ settings, message: 'Settings updated successfully' });
  } catch (error) {
    sendError(res, 500, 'Failed to update settings');
  }
});

export default router;
