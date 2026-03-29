const express = require('express');
const router = express.Router();
const Pipeline = require('../models/Pipeline');
const Build = require('../models/Build');
const Credential = require('../models/Credential');

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
router.get('/', (req, res) => {
  const pipelines = Pipeline.findAll().map(p => enrichWithCredential(p));
  res.json({ success: true, data: pipelines, total: pipelines.length });
});

// GET /api/pipelines/:id - Get pipeline by ID
router.get('/:id', (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
  res.json({ success: true, data: enrichWithCredential(pipeline) });
});

// POST /api/pipelines - Create pipeline
router.post('/', (req, res) => {
  const { name, description, repositoryUrl, credentialId, branch, stages, triggers, environment } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Pipeline name is required' });

  const pipeline = Pipeline.create({ name, description, repositoryUrl, credentialId, branch, stages, triggers, environment });
  res.status(201).json({ success: true, data: pipeline, message: 'Pipeline created successfully' });
});

// PUT /api/pipelines/:id - Update pipeline
router.put('/:id', (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const updated = Pipeline.update(req.params.id, req.body);
  res.json({ success: true, data: updated, message: 'Pipeline updated successfully' });
});

// DELETE /api/pipelines/:id - Delete pipeline
router.delete('/:id', (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  Pipeline.delete(req.params.id);
  res.json({ success: true, message: 'Pipeline deleted successfully' });
});

// GET /api/pipelines/:id/builds - Get builds for a pipeline
router.get('/:id/builds', (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const builds = Build.findAll({ pipelineId: req.params.id, limit: req.query.limit });
  res.json({ success: true, data: builds, total: builds.length });
});

// POST /api/pipelines/:id/trigger - Trigger a new build
router.post('/:id/trigger', async (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
  if (!pipeline.enabled) return res.status(400).json({ success: false, error: 'Pipeline is disabled' });

  const executor = req.app.get('buildExecutor');
  const runningBuilds = executor.getRunningBuilds();

  const build = Build.create({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    branch: req.body.branch || pipeline.branch,
    commit: req.body.commit || null,
    commitMessage: req.body.commitMessage || 'Manual trigger',
    triggeredBy: req.body.triggeredBy || 'manual',
    stages: (pipeline.stages || []).map(s => ({ ...s, status: 'pending' }))
  });

  // Execute build asynchronously
  executor.execute(build, pipeline).catch(err => {
    console.error('[BUILD] Execution error:', err.message);
  });

  res.status(202).json({ success: true, data: build, message: 'Build triggered successfully' });
});

// PATCH /api/pipelines/:id/toggle - Toggle pipeline enabled/disabled
router.patch('/:id/toggle', (req, res) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const updated = Pipeline.update(req.params.id, { enabled: !pipeline.enabled });
  res.json({ success: true, data: updated, message: `Pipeline ${updated.enabled ? 'enabled' : 'disabled'}` });
});

module.exports = router;
