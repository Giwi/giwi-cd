import type { Request, Response } from 'express';
import express, { type Router } from 'express';
import PollingService from '../services/PollingService';
import { sendError } from '../middleware/errorHandler';

const router: Router = express.Router();

router.post('/check/:pipelineId', (req: Request, res: Response) => {
  const pollingService = req.app.get('pollingService');
  if (!pollingService) {
    return sendError(res, 503, 'Polling service not available');
  }

  pollingService.checkPipelineNow(req.params.pipelineId)
    .then(() => {
      res.json({ success: true, message: 'Pipeline checked and build triggered if needed' });
    })
    .catch((err: Error) => {
      sendError(res, 400, err.message);
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
    .catch((err: Error) => {
      sendError(res, 500, err.message);
    });
});

export default router;
