import type { Request, Response } from 'express';
import express, { type Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import { Build } from '../models/Build';
import { createPagination, paginate } from '../middleware/pagination';
import { dbIndex } from '../config/databaseIndex';

const router: Router = express.Router();

const validationResultHandler = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: errors.array()[0].msg });
    return;
  }
  next();
};

router.get('/', createPagination(20, 50), [
  query('pipelineId').optional().isUUID().withMessage('Invalid pipeline ID'),
  query('status').optional().isIn(['pending', 'running', 'success', 'failed', 'error', 'cancelled']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
], validationResultHandler, (req: Request, res: Response) => {
  const filters: { pipelineId?: string; status?: string } = {
    pipelineId: req.query.pipelineId as string,
    status: req.query.status as string
  };
  const allBuilds = Build.findAll(filters);
  const pagination = (req as unknown as { pagination: { offset: number; limit: number; page: number } }).pagination;
  const { offset, limit } = pagination;
  const paginatedBuilds = allBuilds.slice(offset, offset + limit);
  const result = paginate(paginatedBuilds, allBuilds.length, pagination);
  res.json({ success: true, ...result });
});

router.get('/stats', (_req: Request, res: Response) => {
  const stats = Build.getStats();
  res.json({ success: true, data: stats });
});

router.get('/stats/indexed', (_req: Request, res: Response) => {
  const builds = dbIndex.getBuildsByPipeline('*') || [];
  const all = builds;
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recent24h = all.filter(b => new Date(b.createdAt as string) > last24h);
  const recent7d = all.filter(b => new Date(b.createdAt as string) > last7d);
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
        ? Math.round(success.reduce((s: number, b: Record<string, unknown>) => s + ((b.duration as number) || 0), 0) / success.length)
        : 0
    }
  });
});

router.get('/:id', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req: Request, res: Response) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  res.json({ success: true, data: build });
});

router.get('/:id/logs', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req: Request, res: Response) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
  res.json({ success: true, data: build.logs || [], total: (build.logs || []).length });
});

router.post('/:id/cancel', [
  param('id').isUUID().withMessage('Invalid build ID')
], validationResultHandler, (req: Request, res: Response) => {
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
], validationResultHandler, (req: Request, res: Response) => {
  const build = Build.findById(req.params.id);
  if (!build) return res.status(404).json({ success: false, error: 'Build not found' });

  Build.delete(req.params.id);
  res.json({ success: true, message: 'Build deleted' });
});

export default router;
