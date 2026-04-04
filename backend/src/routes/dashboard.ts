import type { Request, Response } from 'express';
import express from 'express';
import { Pipeline } from '../models/Pipeline';
import { Build } from '../models/Build';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
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

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
