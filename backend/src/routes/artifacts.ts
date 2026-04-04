import type { Request, Response } from 'express';
import express from 'express';
import { param, query, validationResult } from 'express-validator';
import ArtifactStorage from '../services/ArtifactStorage';
import { authenticate } from '../middleware/auth';

const router = express.Router();

const artifactStorage = new ArtifactStorage();

const validate = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

router.post('/', authenticate, [
  param('buildId').isUUID().withMessage('Invalid build ID'),
  query('filename').optional().isString().withMessage('Filename must be a string')
], validate, async (req: Request, res: Response) => {
  const { buildId } = req.params;
  const { content, filename, pipelineId } = req.body;

  if (!content && !(req as Record<string, unknown>).file) {
    return res.status(400).json({ success: false, error: 'Content or file is required' });
  }

  if (!pipelineId) {
    return res.status(400).json({ success: false, error: 'Pipeline ID is required' });
  }

  const files: { name: string; content?: string; path?: string }[] = [];

  if (content) {
    files.push({
      name: filename || 'output.log',
      content: typeof content === 'string' ? content : JSON.stringify(content)
    });
  }

  const file = (req as Record<string, { originalname: string; path: string }>).file;
  if (file) {
    files.push({
      name: file.originalname,
      path: file.path
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
], validate, (req: Request, res: Response) => {
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
], validate, (req: Request, res: Response) => {
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
], validate, (req: Request, res: Response) => {
  const { pipelineId, buildId } = req.params;

  artifactStorage.delete(pipelineId, buildId);

  res.json({
    success: true,
    message: 'Artifacts deleted successfully'
  });
});

router.get('/stats', authenticate, (req: Request, res: Response) => {
  const stats = artifactStorage.getStorageStats();

  res.json({
    success: true,
    data: stats
  });
});

export default router;
