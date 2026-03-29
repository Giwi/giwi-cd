const express = require('express');
const router = express.Router();
const Pipeline = require('../models/Pipeline');
const Build = require('../models/Build');

// GET /api/dashboard - Dashboard summary
router.get('/', (req, res) => {
  const pipelines = Pipeline.findAll();
  const buildStats = Build.getStats();
  const recentBuilds = Build.findAll({ limit: 10 });
  const wsManager = req.app.get('wsManager');

  const pipelineStats = {
    total: pipelines.length,
    active: pipelines.filter(p => p.status === 'running').length,
    enabled: pipelines.filter(p => p.enabled).length,
    disabled: pipelines.filter(p => !p.enabled).length
  };

  res.json({
    success: true,
    data: {
      pipelines: pipelineStats,
      builds: buildStats,
      recentBuilds,
      connectedClients: wsManager ? wsManager.getConnectedClients() : 0,
      serverTime: new Date().toISOString()
    }
  });
});

// GET /api/dashboard/health - Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
