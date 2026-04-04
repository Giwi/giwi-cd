import type { Request, Response } from 'express';
import express from 'express';
import PollingService from '../services/PollingService';
import { sendError } from '../middleware/errorHandler';

const router = express.Router();

router.post('/check/:pipelineId', (req: Request, res: Response) => {
  const pollingService = req.app.get('pollingService');
  if (!pollingService) {
    return sendError(res, 503, 'Polling service not available');
  }

  pollingService.checkPipelineNow(req.params.pipelineId)
    .then(() => {
      res.json({ success: true, message: 'Pipeline checked and build triggered if needed' });
    })
    .catch(err => {
      sendError(res, 400, (err as Error).message);
    });
});

router.post('/check-all', (req: Request, res: Response) => {
  const pollingService = req.app.get('pollingService');
  if (!pollingService) {
    return sendError(res, 503, 'Polling service not available');
  }

  pollingService.poll()
    .then(() => {
      res.json({ success: true, message: 'All pipelines checked' });
    })
    .catch(err => {
      sendError(res, 500, (err as Error).message);
    });
});

export default router;
