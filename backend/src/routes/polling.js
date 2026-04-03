const express = require('express');
const router = express.Router();
const PollingService = require('../services/PollingService');
const { sendError } = require('../middleware/errorHandler');

router.post('/check/:pipelineId', (req, res) => {
  const pollingService = req.app.get('pollingService');
  if (!pollingService) {
    return sendError(res, 503, 'Polling service not available');
  }

  pollingService.checkPipelineNow(req.params.pipelineId)
    .then(() => {
      res.json({ success: true, message: 'Pipeline checked and build triggered if needed' });
    })
    .catch(err => {
      sendError(res, 400, err.message);
    });
});

router.post('/check-all', (req, res) => {
  const pollingService = req.app.get('pollingService');
  if (!pollingService) {
    return sendError(res, 503, 'Polling service not available');
  }

  pollingService.poll()
    .then(() => {
      res.json({ success: true, message: 'All pipelines checked' });
    })
    .catch(err => {
      sendError(res, 500, err.message);
    });
});

module.exports = router;
