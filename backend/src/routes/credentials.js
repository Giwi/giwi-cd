const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Credential = require('../models/Credential');
const { asyncHandler } = require('../middleware/asyncHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

const VALID_CREDENTIAL_TYPES = ['username-password', 'token', 'ssh-key', 'telegram', 'slack', 'teams', 'mail'];

// GET /api/credentials - List all credentials
router.get('/', (req, res) => {
  const credentials = Credential.findAll();
  res.json({ success: true, data: credentials, total: credentials.length });
});

// GET /api/credentials/:id - Get credential by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid credential ID')
], validate, (req, res) => {
  const credential = Credential.findById(req.params.id);
  if (!credential) return res.status(404).json({ success: false, error: 'Credential not found' });
  res.json({ success: true, data: credential });
});

// POST /api/credentials - Create credential
router.post('/', [
  body('name').notEmpty().trim().withMessage('Credential name is required')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('type').isIn(VALID_CREDENTIAL_TYPES).withMessage('Invalid credential type'),
  body('username').optional().trim().isLength({ max: 100 }).withMessage('Username must be less than 100 characters'),
  body('password').optional().isLength({ max: 500 }).withMessage('Password must be less than 500 characters'),
  body('token').optional().isLength({ max: 2000 }).withMessage('Token must be less than 2000 characters'),
  body('privateKey').optional().isLength({ max: 10000 }).withMessage('Private key must be less than 10000 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
], validate, (req, res) => {
  const { name, type, username, password, token, privateKey, passphrase, description } = req.body;

  const credential = Credential.create({
    name, type, username, password, token, privateKey, passphrase, description
  });
  res.status(201).json({ success: true, data: credential, message: 'Credential created successfully' });
});

// PUT /api/credentials/:id - Update credential
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid credential ID'),
  body('name').optional().trim().notEmpty().withMessage('Credential name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('type').optional().isIn(VALID_CREDENTIAL_TYPES).withMessage('Invalid credential type'),
  body('username').optional().trim().isLength({ max: 100 }).withMessage('Username must be less than 100 characters'),
  body('password').optional().isLength({ max: 500 }).withMessage('Password must be less than 500 characters'),
  body('token').optional().isLength({ max: 2000 }).withMessage('Token must be less than 2000 characters'),
  body('privateKey').optional().isLength({ max: 10000 }).withMessage('Private key must be less than 10000 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
], validate, (req, res) => {
  const credential = Credential.findById(req.params.id);
  if (!credential) return res.status(404).json({ success: false, error: 'Credential not found' });

  const updated = Credential.update(req.params.id, req.body);
  res.json({ success: true, data: updated, message: 'Credential updated successfully' });
});

// DELETE /api/credentials/:id - Delete credential
router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid credential ID')
], validate, (req, res) => {
  const credential = Credential.findById(req.params.id);
  if (!credential) return res.status(404).json({ success: false, error: 'Credential not found' });

  Credential.delete(req.params.id);
  res.json({ success: true, message: 'Credential deleted successfully' });
});

// POST /api/credentials/:id/test - Test a notification credential
router.post('/:id/test', [
  param('id').isUUID().withMessage('Invalid credential ID'),
  body('channel').optional().trim().isLength({ max: 100 }).withMessage('Channel must be less than 100 characters'),
  body('message').optional().trim().isLength({ max: 2000 }).withMessage('Message must be less than 2000 characters')
], validate, (req, res) => {
  const credential = Credential.findById(req.params.id);
  if (!credential) return res.status(404).json({ success: false, error: 'Credential not found' });

  const { channel, message } = req.body;

  if (!['telegram', 'slack', 'teams', 'mail'].includes(credential.type)) {
    return res.status(400).json({ success: false, error: 'This credential type does not support test notifications' });
  }

  const NotificationService = require('../services/NotificationService');
  const wsManager = req.app.get('wsManager');
  const notificationService = new NotificationService(wsManager);

  const startedAt = new Date();
  const finishedAt = new Date(startedAt.getTime() + 125000);
  const mockBuild = {
    id: 'test-' + Date.now(),
    number: 999,
    status: 'success',
    branch: 'main',
    commit: 'abc1234',
    commitMessage: 'Test notification',
    triggeredBy: 'test',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString()
  };

  const mockPipeline = {
    id: credential.id,
    name: credential.name,
    branch: 'main'
  };

  const testNotification = {
    type: 'notification',
    name: 'Test notification',
    provider: credential.type,
    credentialId: credential.id,
    channel: channel || undefined,
    message: message || `🧪 Test notification from GiwiCD\n✅ This is a test message sent at ${new Date().toLocaleString()}`
  };

  notificationService.send(mockBuild.id, testNotification, mockBuild, mockPipeline)
    .then(result => {
      if (result.success) {
        res.json({ success: true, message: 'Test notification sent successfully' });
      } else {
        res.status(400).json({ success: false, error: result.error || 'Failed to send test notification' });
      }
    })
    .catch(err => {
      res.status(500).json({ success: false, error: err.message });
    });
});

module.exports = router;
