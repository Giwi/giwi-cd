const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const Build = require('../models/Build');
const { createPagination, paginate } = require('../middleware/pagination');
const { dbIndex } = require('../config/databaseIndex');

const validationResultHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

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

router.get('/stats', (req, res) => {
  const stats = Build.getStats();
  res.json({ success: true, data: stats });
});

router.get('/stats/indexed', (req, res) => {
  const builds = dbIndex.getBuildsByPipeline('*') || [];
  const all = builds;
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recent24h = all.filter(b => new Date(b.createdAt) > last24h);
  const recent7d = all.filter(b => new Date(b.createdAt) > last7d);
  const success = all.filter(b => b.status === 'success');
  const failed = all.filter(b => b.status === 'failed');

  res.json({
    success: true,
    data: {
      total: all.length,
      last24h: recent24h.length,
      last7d: recent7d.length,
      successRate: all.length ? Math.round((success.length / all.length) * 100) : 0,
      byStatus: {
        pending: all.filter(b => b.status === 'pending').length,
        running: all.filter(b => b.status === 'running').length,
        success: success.length,
        failed: failed.length,
        cancelled: all.filter(b => b.status === 'cancelled').length
      },
      avgDuration: success.length
        ? Math.round(success.reduce((s, b) => s + (b.duration || 0), 0) / success.length)
        : 0
    }
  });
});

router.get('/:id', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  res.json({ success: true, data: build });
});

router.get('/:id/logs', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  res.json({ success: true, data: build.logs || [], total: (build.logs || []).length });
});

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

router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req, res) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });

  Build.delete(req.params.id);
  res.json({ success: true, message: 'Build deleted' });
});

module.exports = router;
