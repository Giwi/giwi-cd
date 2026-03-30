const express = require('express');
const router = express.Router();
const Credential = require('../models/Credential');

// GET /api/credentials - List all credentials
router.get('/', (req, res) => {
  const credentials = Credential.findAll();
  res.json({ success: true, data: credentials, total: credentials.length });
});

// GET /api/credentials/:id - Get credential by ID
router.get('/:id', (req, res) => {
  const credential = Credential.findById(req.params.id);
  if (!credential) return res.status(404).json({ success: false, error: 'Credential not found' });
  res.json({ success: true, data: credential });
});

// POST /api/credentials - Create credential
router.post('/', (req, res) => {
  const { name, type, username, password, token, privateKey, passphrase, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Credential name is required' });
  if (!['username-password', 'token', 'ssh-key', 'telegram', 'slack', 'teams', 'mail'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Invalid credential type' });
  }

  const credential = Credential.create({
    name, type, username, password, token, privateKey, passphrase, description
  });
  res.status(201).json({ success: true, data: credential, message: 'Credential created successfully' });
});

// PUT /api/credentials/:id - Update credential
router.put('/:id', (req, res) => {
  const credential = Credential.findById(req.params.id);
  if (!credential) return res.status(404).json({ success: false, error: 'Credential not found' });

  const updated = Credential.update(req.params.id, req.body);
  res.json({ success: true, data: updated, message: 'Credential updated successfully' });
});

// DELETE /api/credentials/:id - Delete credential
router.delete('/:id', (req, res) => {
  const credential = Credential.findById(req.params.id);
  if (!credential) return res.status(404).json({ success: false, error: 'Credential not found' });

  Credential.delete(req.params.id);
  res.json({ success: true, message: 'Credential deleted successfully' });
});

// POST /api/credentials/:id/test - Test a notification credential
router.post('/:id/test', (req, res) => {
  console.log('[Test Notification] Route called with id:', req.params.id);
  const credential = Credential.findById(req.params.id);
  console.log('[Test Notification] findById result:', credential);
  if (!credential) return res.status(404).json({ success: false, error: 'Credential not found' });

  const { provider } = req.body;
  const { channel, message } = req.body;
  console.log('[Test Notification] channel:', channel, 'message:', message);

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
