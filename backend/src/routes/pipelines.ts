import type { Request, Response } from 'express';
import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Pipeline } from '../models/Pipeline';
import { Build } from '../models/Build';
import { Credential } from '../models/Credential';
import { triggerLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { createPagination, paginate } from '../middleware/pagination';
import { sanitizePipeline } from '../utils/sanitize';
import type { Pipeline as IPipeline } from '../types/index';

const router = express.Router();

const validateRepoUrl = (value: unknown): boolean => {
  if (!value || typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^git:\/\//i.test(trimmed)) return true;
  if (/^ssh:\/\//i.test(trimmed)) return true;
  if (/^git@[\w.-]+:[\w./-]+\.?[\w-]*$/.test(trimmed)) return true;
  return false;
};

const validate = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

function enrichWithCredential(pipeline: IPipeline | undefined): IPipeline | null {
  if (!pipeline) return null;
  if (pipeline.credentialId) {
    const cred = Credential.findById(pipeline.credentialId);
    if (cred) {
      (pipeline as Record<string, unknown>).credentialName = cred.name;
      (pipeline as Record<string, unknown>).credentialType = cred.type;
    }
  }
  return pipeline;
}

router.get('/', createPagination(20, 50), (req: Request, res: Response) => {
  const allPipelines = Pipeline.findAll().map(p => enrichWithCredential(p));
  const result = paginate(allPipelines, allPipelines.length, (req as Record<string, { page: number; limit: number; offset: number }>).pagination);
  res.json({ success: true, ...result });
});

router.get('/:id', [
  param('id').isUUID().withMessage('Invalid pipeline ID')
], validate, (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
  res.json({ success: true, data: enrichWithCredential(pipeline) });
});

router.post('/', [
  body('name').notEmpty().trim().withMessage('Pipeline name is required')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('branch').optional().trim().isLength({ max: 100 }).withMessage('Branch must be less than 100 characters'),
  body('repositoryUrl').optional().trim().custom(validateRepoUrl).withMessage('Invalid repository URL. Accepted formats: http(s)://, git://, ssh://, git@host:path'),
  body('credentialId').optional().isUUID().withMessage('Invalid credential ID'),
  body('stages').optional().isArray().withMessage('Stages must be an array'),
  body('keepBuilds').optional().isInt({ min: 1, max: 100 }).withMessage('keepBuilds must be 1-100'),
  body('artifactPaths').optional().isArray().withMessage('artifactPaths must be an array'),
  body('artifactPaths.*').optional().isString().trim().isLength({ max: 500 }).withMessage('Artifact path must be a string under 500 chars'),
  body('errorNotification').optional().isObject().withMessage('errorNotification must be an object'),
  body('errorNotification.provider').optional().isIn(['telegram', 'slack', 'teams', 'mail']).withMessage('Invalid notification provider')
], validate, (req: Request, res: Response) => {
  const sanitized = sanitizePipeline(req.body);
  const { name, description, repositoryUrl, credentialId, branch, stages, triggers, environment, keepBuilds, artifactPaths, errorNotification } = sanitized as Record<string, unknown>;

  const pipeline = Pipeline.create({ name: name as string, description: description as string, repositoryUrl: repositoryUrl as string, credentialId: credentialId as string, branch: branch as string, stages: stages as never[], triggers: triggers as never, environment: environment as never[], keepBuilds: keepBuilds as number, artifactPaths: artifactPaths as string[], errorNotification: errorNotification as never });
  res.status(201).json({ success: true, data: pipeline, message: 'Pipeline created successfully' });
});

router.post('/import', [
  body('name').notEmpty().trim().withMessage('Pipeline name is required')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('repositoryUrl').optional().trim().custom(validateRepoUrl).withMessage('Invalid repository URL. Accepted formats: http(s)://, git://, ssh://, git@host:path')
], validate, (req: Request, res: Response) => {
  const sanitized = sanitizePipeline(req.body);
  const { name, description, repositoryUrl, credentialId, branch, stages, triggers, environment, artifactPaths } = sanitized as Record<string, unknown>;

  const pipeline = Pipeline.create({
    name: name as string,
    description: (description as string) || '',
    repositoryUrl: (repositoryUrl as string) || '',
    credentialId: (credentialId as string) || null,
    branch: (branch as string) || 'main',
    stages: (stages as never[]) || [],
    triggers: (triggers as never) || [],
    environment: (environment as never[]) || [],
    artifactPaths: (artifactPaths as string[]) || []
  });
  res.status(201).json({ success: true, data: pipeline, message: 'Pipeline imported successfully' });
});

router.put('/:id', [
  param('id').isUUID().withMessage('Invalid pipeline ID'),
  body('name').optional().trim().notEmpty().withMessage('Pipeline name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('branch').optional().trim().isLength({ max: 100 }).withMessage('Branch must be less than 100 characters'),
  body('repositoryUrl').optional().trim().custom(validateRepoUrl).withMessage('Invalid repository URL. Accepted formats: http(s)://, git://, ssh://, git@host:path'),
  body('credentialId').optional().isUUID().withMessage('Invalid credential ID'),
  body('stages').optional().isArray().withMessage('Stages must be an array'),
  body('keepBuilds').optional().isInt({ min: 1, max: 100 }).withMessage('keepBuilds must be 1-100'),
  body('artifactPaths').optional().isArray().withMessage('artifactPaths must be an array'),
  body('artifactPaths.*').optional().isString().trim().isLength({ max: 500 }).withMessage('Artifact path must be a string under 500 chars'),
  body('errorNotification').optional().isObject().withMessage('errorNotification must be an object'),
  body('errorNotification.provider').optional().isIn(['telegram', 'slack', 'teams', 'mail']).withMessage('Invalid notification provider')
], validate, (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const sanitized = sanitizePipeline(req.body);
  const updated = Pipeline.update(req.params.id, sanitized as Partial<IPipeline>);
  res.json({ success: true, data: updated, message: 'Pipeline updated successfully' });
});

router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid pipeline ID')
], validate, (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  Pipeline.delete(req.params.id);
  res.json({ success: true, message: 'Pipeline deleted successfully' });
});

router.get('/:id/builds', createPagination(20, 50), [
  param('id').isUUID().withMessage('Invalid pipeline ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
], validate, (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const allBuilds = Build.findAll({ pipelineId: req.params.id });
  const { offset, limit } = (req as Record<string, { offset: number; limit: number }>).pagination;
  const paginatedBuilds = allBuilds.slice(offset, offset + limit);
  const result = paginate(paginatedBuilds, allBuilds.length, (req as Record<string, { page: number; limit: number; offset: number }>).pagination);
  res.json({ success: true, ...result });
});

router.post('/:id/trigger', triggerLimiter, [
  param('id').isUUID().withMessage('Invalid pipeline ID'),
  body('branch').optional().trim().isLength({ max: 100 }).withMessage('Branch must be less than 100 characters'),
  body('commit').optional().trim().isLength({ max: 100 }).withMessage('Commit must be less than 100 characters')
], validate, asyncHandler(async (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
  if (!pipeline.enabled) return res.status(400).json({ success: false, error: 'Pipeline is disabled' });

  const build = Build.create({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    branch: req.body.branch || pipeline.branch,
    commit: req.body.commit || null,
    commitMessage: req.body.commitMessage || 'Manual trigger',
    triggeredBy: (req as Record<string, { username?: string }>).user?.username || req.body.triggeredBy || 'manual',
    stages: (pipeline.stages || []).map(s => ({ ...s, status: 'pending' }))
  });

  const wsManager = req.app.get('wsManager');
  if (wsManager) {
    wsManager.broadcast({ type: 'build:created', buildId: build.id, pipelineId: pipeline.id });
  }

  setImmediate(() => {
    const executor = req.app.get('buildExecutor');
    executor.execute(build, pipeline).catch(err => {
      console.error('[BUILD] Execution error:', (err as Error).message);
    });
  });

  res.status(202).json({ success: true, data: build, message: 'Build triggered successfully' });
}));

router.patch('/:id/toggle', [
  param('id').isUUID().withMessage('Invalid pipeline ID')
], validate, (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const updated = Pipeline.update(req.params.id, { enabled: !pipeline.enabled });
  res.json({ success: true, data: updated, message: `Pipeline ${updated?.enabled ? 'enabled' : 'disabled'}` });
});

export default router;
