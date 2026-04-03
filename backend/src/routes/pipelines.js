const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Pipeline = require('../models/Pipeline');
const Build = require('../models/Build');
const Credential = require('../models/Credential');
const { triggerLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/asyncHandler');
const { createPagination, paginate } = require('../middleware/pagination');
const { sanitizePipeline } = require('../utils/sanitize');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

function enrichWithCredential(pipeline) {
  if (!pipeline) return null;
  if (pipeline.credentialId) {
    const cred = Credential.findById(pipeline.credentialId);
    if (cred) {
      pipeline.credentialName = cred.name;
      pipeline.credentialType = cred.type;
    }
  }
  return pipeline;
}

// GET /api/pipelines - List all pipelines
router.get('/', createPagination(20, 50), (req, res) => {
  const allPipelines = Pipeline.findAll().map(p => enrichWithCredential(p));
  const result = paginate(allPipelines, allPipelines.length, req.pagination);
  res.json({ success: true, ...result });
});

// GET /api/pipelines/:id - Get pipeline by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid pipeline ID')
], validate, (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
  res.json({ success: true, data: enrichWithCredential(pipeline) });
});

// POST /api/pipelines - Create pipeline
router.post('/', [
  body('name').notEmpty().trim().withMessage('Pipeline name is required')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('branch').optional().trim().isLength({ max: 100 }).withMessage('Branch must be less than 100 characters'),
  body('repositoryUrl').optional().trim().isURL().withMessage('Invalid repository URL'),
  body('credentialId').optional().isUUID().withMessage('Invalid credential ID'),
  body('stages').optional().isArray().withMessage('Stages must be an array'),
  body('keepBuilds').optional().isInt({ min: 1, max: 100 }).withMessage('keepBuilds must be 1-100')
], validate, (req, res) => {
  const sanitized = sanitizePipeline(req.body);
  const { name, description, repositoryUrl, credentialId, branch, stages, triggers, environment, keepBuilds } = sanitized;

  const pipeline = Pipeline.create({ name, description, repositoryUrl, credentialId, branch, stages, triggers, environment, keepBuilds });
  res.status(201).json({ success: true, data: pipeline, message: 'Pipeline created successfully' });
});

// POST /api/pipelines/import - Import pipeline
router.post('/import', [
  body('name').notEmpty().trim().withMessage('Pipeline name is required')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters')
], validate, (req, res) => {
  const sanitized = sanitizePipeline(req.body);
  const { name, description, repositoryUrl, credentialId, branch, stages, triggers, environment } = sanitized;

  const pipeline = Pipeline.create({ 
    name, 
    description: description || '', 
    repositoryUrl: repositoryUrl || '', 
    credentialId: credentialId || null, 
    branch: branch || 'main', 
    stages: stages || [], 
    triggers: triggers || [], 
    environment: environment || [] 
  });
  res.status(201).json({ success: true, data: pipeline, message: 'Pipeline imported successfully' });
});

// PUT /api/pipelines/:id - Update pipeline
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid pipeline ID'),
  body('name').optional().trim().notEmpty().withMessage('Pipeline name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('branch').optional().trim().isLength({ max: 100 }).withMessage('Branch must be less than 100 characters'),
  body('repositoryUrl').optional().trim().isURL().withMessage('Invalid repository URL'),
  body('credentialId').optional().isUUID().withMessage('Invalid credential ID'),
  body('stages').optional().isArray().withMessage('Stages must be an array'),
  body('keepBuilds').optional().isInt({ min: 1, max: 100 }).withMessage('keepBuilds must be 1-100')
], validate, (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const sanitized = sanitizePipeline(req.body);
  const updated = Pipeline.update(req.params.id, sanitized);
  res.json({ success: true, data: updated, message: 'Pipeline updated successfully' });
});

// DELETE /api/pipelines/:id - Delete pipeline
router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid pipeline ID')
], validate, (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  Pipeline.delete(req.params.id);
  res.json({ success: true, message: 'Pipeline deleted successfully' });
});

// GET /api/pipelines/:id/builds - Get builds for a pipeline
router.get('/:id/builds', createPagination(20, 50), [
  param('id').isUUID().withMessage('Invalid pipeline ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
], validate, (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const allBuilds = Build.findAll({ pipelineId: req.params.id });
  const { offset, limit } = req.pagination;
  const paginatedBuilds = allBuilds.slice(offset, offset + limit);
  const result = paginate(paginatedBuilds, allBuilds.length, req.pagination);
  res.json({ success: true, ...result });
});

// POST /api/pipelines/:id/trigger - Trigger a new build
router.post('/:id/trigger', triggerLimiter, [
  param('id').isUUID().withMessage('Invalid pipeline ID'),
  body('branch').optional().trim().isLength({ max: 100 }).withMessage('Branch must be less than 100 characters'),
  body('commit').optional().trim().isLength({ max: 100 }).withMessage('Commit must be less than 100 characters')
], validate, asyncHandler(async (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
  if (!pipeline.enabled) return res.status(400).json({ success: false, error: 'Pipeline is disabled' });

  const build = Build.create({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    branch: req.body.branch || pipeline.branch,
    commit: req.body.commit || null,
    commitMessage: req.body.commitMessage || 'Manual trigger',
    triggeredBy: req.body.triggeredBy || 'manual',
    stages: (pipeline.stages || []).map(s => ({ ...s, status: 'pending' }))
  });

  const wsManager = req.app.get('wsManager');
  if (wsManager) {
    wsManager.broadcast({ type: 'build:created', buildId: build.id, pipelineId: pipeline.id });
  }

  setImmediate(() => {
    const executor = req.app.get('buildExecutor');
    executor.execute(build, pipeline).catch(err => {
      console.error('[BUILD] Execution error:', err.message);
    });
  });

  res.status(202).json({ success: true, data: build, message: 'Build triggered successfully' });
}));

// PATCH /api/pipelines/:id/toggle - Toggle pipeline enabled/disabled
router.patch('/:id/toggle', [
  param('id').isUUID().withMessage('Invalid pipeline ID')
], validate, (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const updated = Pipeline.update(req.params.id, { enabled: !pipeline.enabled });
  res.json({ success: true, data: updated, message: `Pipeline ${updated.enabled ? 'enabled' : 'disabled'}` });
});

module.exports = router;
