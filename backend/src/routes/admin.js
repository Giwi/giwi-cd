const express = require('express');
const router = express.Router();
const User = require('../models/User');
const db = require('../config/database');
const { authenticate, requireRole, generateToken } = require('../middleware/auth');

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

router.get('/users/:id', (req, res) => {
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

router.post('/users', async (req, res) => {
  try {
    const { email, password, username, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const validRoles = ['admin', 'contributor'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or contributor' });
    }

    const user = await User.create({ email, password, username, role: role || 'contributor' });
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

router.put('/users/:id', async (req, res) => {
  try {
    const { username, role, password } = req.body;

    const targetUser = User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role) {
      const validRoles = ['admin', 'contributor'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.update(req.params.id, { username, role, password });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', (req, res) => {
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

router.put('/settings', (req, res) => {
  try {
    const { allowRegistration, maxConcurrentBuilds, defaultTimeout, retentionDays, pollingInterval, notificationDefaults } = req.body;
    
    const updates = {};
    
    if (allowRegistration !== undefined) {
      updates.allowRegistration = !!allowRegistration;
    }
    if (maxConcurrentBuilds !== undefined) {
      const value = parseInt(maxConcurrentBuilds, 10);
      if (value < 1 || value > 10) {
        return res.status(400).json({ error: 'maxConcurrentBuilds must be between 1 and 10' });
      }
      updates.maxConcurrentBuilds = value;
    }
    if (defaultTimeout !== undefined) {
      const value = parseInt(defaultTimeout, 10);
      if (value < 60) {
        return res.status(400).json({ error: 'defaultTimeout must be at least 60 seconds' });
      }
      updates.defaultTimeout = value;
    }
    if (retentionDays !== undefined) {
      const value = parseInt(retentionDays, 10);
      if (value < 1 || value > 365) {
        return res.status(400).json({ error: 'retentionDays must be between 1 and 365' });
      }
      updates.retentionDays = value;
    }
    if (pollingInterval !== undefined) {
      const value = parseInt(pollingInterval, 10);
      if (value < 10 || value > 3600) {
        return res.status(400).json({ error: 'pollingInterval must be between 10 and 3600 seconds' });
      }
      updates.pollingInterval = value;
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
