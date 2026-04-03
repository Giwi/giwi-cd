const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const { db } = require('../config/database');
const { authenticate, requireRole, generateToken } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/users', (req, res) => {
  try {
    const users = User.findAll();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', [
  param('id').isUUID().withMessage('Invalid user ID')
], validate, (req, res) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
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
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create user' });
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
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.update(req.params.id, { username, role, password });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', [
  param('id').isUUID().withMessage('Invalid user ID')
], validate, (req, res) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    User.delete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/settings', (req, res) => {
  try {
    const settings = db.get('settings').value();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
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
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
