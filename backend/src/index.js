require('dotenv').config();
const http = require('http');
const config = require('./config');
const logger = require('./config/logger');
const { validateEnvironment } = require('./config/validateEnv');
validateEnvironment();
const app = require('./app');
const wsManager = require('./services/WebSocketManager');
const { createDefaultAdmin } = require('./utils/createDefaultAdmin');
const PollingService = require('./services/PollingService');

const PORT = config.get('server.port');
const server = http.createServer(app);

wsManager.initialize(server);
app.set('wsManager', wsManager);

createDefaultAdmin();

const pollingService = new PollingService(app.get('buildExecutor'));
pollingService.start();
app.set('pollingService', pollingService);

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, initiating graceful shutdown...`);
  
  pollingService.stop();
  
  const buildExecutor = app.get('buildExecutor');
  const runningBuilds = buildExecutor.getRunningBuilds();
  
  if (runningBuilds.length > 0) {
    logger.info(`Waiting for ${runningBuilds.length} build(s) to complete...`);
    
    const maxWaitTime = 30000;
    const checkInterval = 1000;
    let waited = 0;
    
    while (buildExecutor.getRunningBuilds().length > 0 && waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
      const remaining = buildExecutor.getRunningBuilds().length;
      if (remaining > 0) {
        logger.info(`${remaining} build(s) still running...`);
      }
    }
    
    const stillRunning = buildExecutor.getRunningBuilds();
    if (stillRunning.length > 0) {
      logger.warn(`${stillRunning.length} build(s) did not complete in time, forcing shutdown`);
      
      for (const buildId of stillRunning) {
        buildExecutor.cancel(buildId);
      }
    } else {
      logger.info('All builds completed');
    }
  } else {
    logger.info('No running builds to wait for');
  }
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, () => {
  const env = config.get('server.env').padEnd(14);
  const polling = `enabled (${config.get('build.pollingInterval')}s interval)`;
  logger.info(`
╔═══════════════════════════════════════════╗
║           GiwiCD - CI/CD Engine           ║
╠═══════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}           ║
║  📡 WebSocket: ws://localhost:${PORT}/ws     ║
║  🔗 API: http://localhost:${PORT}/api        ║
║  🔄 Polling: ${polling}       ║
║  🌍 ENV: ${env}              ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = server;
