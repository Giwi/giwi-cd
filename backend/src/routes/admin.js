const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const { db } = require('../config/database');
const { authenticate, requireRole, generateToken } = require('../middleware/auth');
const { sendError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg);
  }
  next();
};

let logBuffer = [];

const originalLogger = {
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger)
};

logger.info = (msg, ...args) => {
  originalLogger.info(msg, ...args);
  logBuffer.push({ timestamp: new Date().toISOString(), level: 'info', message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  if (logBuffer.length > 1000) logBuffer = logBuffer.slice(-500);
};

logger.warn = (msg, ...args) => {
  originalLogger.warn(msg, ...args);
  logBuffer.push({ timestamp: new Date().toISOString(), level: 'warn', message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  if (logBuffer.length > 1000) logBuffer = logBuffer.slice(-500);
};

logger.error = (msg, ...args) => {
  originalLogger.error(msg, ...args);
  logBuffer.push({ timestamp: new Date().toISOString(), level: 'error', message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  if (logBuffer.length > 1000) logBuffer = logBuffer.slice(-500);
};

logger.debug = (msg, ...args) => {
  originalLogger.debug(msg, ...args);
  logBuffer.push({ timestamp: new Date().toISOString(), level: 'debug', message: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  if (logBuffer.length > 1000) logBuffer = logBuffer.slice(-500);
};

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/logs', (req, res) => {
  try {
    const level = req.query.level;
    const search = req.query.search?.toLowerCase();
    let logs = [...logBuffer];
    
    if (level) {
      logs = logs.filter(l => l.level === level);
    }
    
    if (search) {
      logs = logs.filter(l => l.message.toLowerCase().includes(search));
    }
    
    const limit = parseInt(req.query.limit) || 200;
    logs = logs.slice(-limit);
    
    res.json({ success: true, data: logs });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch logs');
  }
});

router.delete('/logs', (req, res) => {
  try {
    logBuffer = [];
    res.json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    sendError(res, 500, 'Failed to clear logs');
  }
});

router.get('/users', (req, res) => {
  try {
    const users = User.findAll();
    res.json({ users });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch users');
  }
});

router.get('/users/:id', [
  param('id').isUUID().withMessage('Invalid user ID')
], validate, (req, res) => {
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
], validate, async (req, res) => {
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
    if (error.message === 'Email already registered') {
      return sendError(res, 409, error.message);
    }
    sendError(res, 500, 'Failed to create user');
  }
});

router.put('/users/:id', [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validate, async (req, res) => {
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
], validate, (req, res) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (user.id === req.user.id) {
      return sendError(res, 400, 'Cannot delete your own account');
    }

    User.delete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    sendError(res, 500, 'Failed to delete user');
  }
});

router.get('/settings', (req, res) => {
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
], validate, (req, res) => {
  try {
    const { allowRegistration, maxConcurrentBuilds, defaultTimeout, retentionDays, pollingInterval, notificationDefaults } = req.body;
    
    const updates = {};
    
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

module.exports = router;
