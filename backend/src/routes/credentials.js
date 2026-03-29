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
  if (!['username-password', 'token', 'ssh-key'].includes(type)) {
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

module.exports = router;
