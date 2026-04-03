const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const Build = require('../models/Build');
const { createPagination, paginate } = require('../middleware/pagination');

const validationResultHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

// GET /api/builds - List all builds
router.get('/', createPagination(20, 50), [
  query('pipelineId').optional().isUUID().withMessage('Invalid pipeline ID'),
  query('status').optional().isIn(['pending', 'running', 'success', 'failed', 'error', 'cancelled']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
], validationResultHandler, (req, res) => {
  const filters = {
    pipelineId: req.query.pipelineId,
    status: req.query.status
  };
  const allBuilds = Build.findAll(filters);
  const { offset, limit } = req.pagination;
  const paginatedBuilds = allBuilds.slice(offset, offset + limit);
  const result = paginate(paginatedBuilds, allBuilds.length, req.pagination);
  res.json({ success: true, ...result });
});

// GET /api/builds/stats - Get build statistics
router.get('/stats', (req, res) => {
  const stats = Build.getStats();
  res.json({ success: true, data: stats });
});

// GET /api/builds/:id - Get build by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  res.json({ success: true, data: build });
});

// GET /api/builds/:id/logs - Get build logs
router.get('/:id/logs', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  res.json({ success: true, data: build.logs || [], total: (build.logs || []).length });
});

// POST /api/builds/:id/cancel - Cancel a running build
router.post('/:id/cancel', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req, res) => {
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
router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });

  Build.delete(req.params.id);
  res.json({ success: true, message: 'Build deleted' });
});

module.exports = router;
