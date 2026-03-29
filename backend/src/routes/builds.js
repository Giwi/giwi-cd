const express = require('express');
const router = express.Router();
const Build = require('../models/Build');

// GET /api/builds - List all builds
router.get('/', (req, res) => {
  const filters = {
    pipelineId: req.query.pipelineId,
    status: req.query.status,
    limit: req.query.limit ? parseInt(req.query.limit) : 50
  };
  const builds = Build.findAll(filters);
  res.json({ success: true, data: builds, total: builds.length });
});

// GET /api/builds/stats - Get build statistics
router.get('/stats', (req, res) => {
  const stats = Build.getStats();
  res.json({ success: true, data: stats });
});

// GET /api/builds/:id - Get build by ID
router.get('/:id', (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  res.json({ success: true, data: build });
});

// GET /api/builds/:id/logs - Get build logs
router.get('/:id/logs', (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  res.json({ success: true, data: build.logs || [], total: (build.logs || []).length });
});

// POST /api/builds/:id/cancel - Cancel a running build
router.post('/:id/cancel', (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  if (!['pending', 'running'].includes(build.status)) {
    return res.status(400).json({ success: false, error: 'Build is not running' });
  }

  const executor = req.app.get('buildExecutor');
  const cancelled = executor.cancel(req.params.id);

  if (!cancelled) {
    Build.updateStatus(req.params.id, 'cancelled');
  }

  res.json({ success: true, message: 'Build cancelled' });
});

// DELETE /api/builds/:id - Delete a build
router.delete('/:id', (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });

  Build.delete(req.params.id);
  res.json({ success: true, message: 'Build deleted' });
});

module.exports = router;
