const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  try {
    db.get('pipelines').value();
    checks.checks.database = 'ok';
  } catch (err) {
    checks.checks.database = 'error';
    checks.status = 'degraded';
  }

  checks.checks.memory = process.memoryUsage();
  checks.checks.memory.usedMB = Math.round(checks.checks.memory.heapUsed / 1024 / 1024);

  const httpCode = checks.status === 'ok' ? 200 : 503;
  res.status(httpCode).json(checks);
});

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', (req, res) => {
  try {
    db.get('pipelines').value();
    res.status(200).json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready' });
  }
});

module.exports = router;
