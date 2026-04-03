const express = require('express');
const router = express.Router();
const { param, query, validationResult } = require('express-validator');
const ArtifactStorage = require('../services/ArtifactStorage');
const { authenticate } = require('../middleware/auth');

const artifactStorage = new ArtifactStorage();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

router.post('/', authenticate, [
  param('buildId').isUUID().withMessage('Invalid build ID'),
  query('filename').optional().isString().withMessage('Filename must be a string')
], validate, async (req, res) => {
  const { buildId } = req.params;
  const { content, filename, pipelineId } = req.body;

  if (!content && !req.file) {
    return res.status(400).json({ success: false, error: 'Content or file is required' });
  }

  if (!pipelineId) {
    return res.status(400).json({ success: false, error: 'Pipeline ID is required' });
  }

  const files = [];

  if (content) {
    files.push({
      name: filename || 'output.log',
      content: typeof content === 'string' ? content : JSON.stringify(content)
    });
  }

  if (req.file) {
    files.push({
      name: req.file.originalname,
      path: req.file.path
    });
  }

  const stored = await artifactStorage.store(pipelineId, buildId, files);

  res.json({
    success: true,
    data: stored,
    message: 'Artifact stored successfully'
  });
});

router.get('/:pipelineId/:buildId', authenticate, [
  param('pipelineId').isUUID().withMessage('Invalid pipeline ID'),
  param('buildId').isUUID().withMessage('Invalid build ID')
], validate, (req, res) => {
  const { pipelineId, buildId } = req.params;

  const artifacts = artifactStorage.list(pipelineId, buildId);

  res.json({
    success: true,
    data: artifacts
  });
});

router.get('/:pipelineId/:buildId/:filename', authenticate, [
  param('pipelineId').isUUID().withMessage('Invalid pipeline ID'),
  param('buildId').isUUID().withMessage('Invalid build ID')
], validate, (req, res) => {
  const { pipelineId, buildId, filename } = req.params;

  const stream = artifactStorage.get(pipelineId, buildId, filename);
  if (!stream) {
    return res.status(404).json({ success: false, error: 'Artifact not found' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  stream.pipe(res);
});

router.delete('/:pipelineId/:buildId', authenticate, [
  param('pipelineId').isUUID().withMessage('Invalid pipeline ID'),
  param('buildId').isUUID().withMessage('Invalid build ID')
], validate, (req, res) => {
  const { pipelineId, buildId } = req.params;

  artifactStorage.delete(pipelineId, buildId);

  res.json({
    success: true,
    message: 'Artifacts deleted successfully'
  });
});

router.get('/stats', authenticate, (req, res) => {
  const stats = artifactStorage.getStorageStats();

  res.json({
    success: true,
    data: stats
  });
});

module.exports = router;
