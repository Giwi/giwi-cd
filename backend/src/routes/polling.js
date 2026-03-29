const express = require('express');
const router = express.Router();
const PollingService = require('../services/PollingService');

router.post('/check/:pipelineId', (req, res) => {
  const pollingService = req.app.get('pollingService');
  if (!pollingService) {
    return res.status(503).json({ error: 'Polling service not available' });
  }

  pollingService.checkPipelineNow(req.params.pipelineId)
    .then(() => {
      res.json({ success: true, message: 'Pipeline checked and build triggered if needed' });
    })
    .catch(err => {
      res.status(400).json({ error: err.message });
    });
});

router.post('/check-all', (req, res) => {
  const pollingService = req.app.get('pollingService');
  if (!pollingService) {
    return res.status(503).json({ error: 'Polling service not available' });
  }

  pollingService.poll()
    .then(() => {
      res.json({ success: true, message: 'All pipelines checked' });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

module.exports = router;
