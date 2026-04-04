import 'dotenv/config';
import http from 'http';
import config from './config/index';
import logger from './config/logger';
import { validateEnvironment } from './config/validateEnv';
import app from './app';
import wsManager from './services/WebSocketManager';
import { createDefaultAdmin } from './utils/createDefaultAdmin';
import PollingService from './services/PollingService';
import type BuildRunner from './services/BuildRunner';

validateEnvironment();

const PORT = config.get('server.port') as number;
const server = http.createServer(app);

wsManager.initialize(server);
app.set('wsManager', wsManager);

createDefaultAdmin();

const buildRunner = app.get('buildRunner') as BuildRunner;
const pollingService = new PollingService(buildRunner.executor);
pollingService.start();
app.set('pollingService', pollingService);

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, initiating graceful shutdown...`);

  pollingService.stop();

  const runningBuilds = buildRunner.executor.getRunningBuilds();
  const queuedBuilds = buildRunner.queue.getQueueLength();

  logger.info(`Running: ${runningBuilds.length}, Queued: ${queuedBuilds}`);

  if (runningBuilds.length > 0 || queuedBuilds > 0) {
    logger.info(`Waiting for ${runningBuilds.length} build(s) to complete...`);

    const maxWaitTime = 30000;
    const checkInterval = 1000;
    let waited = 0;

    while (buildRunner.executor.getRunningBuilds().length > 0 && waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
      const remaining = buildRunner.executor.getRunningBuilds().length;
      if (remaining > 0) {
        logger.info(`${remaining} build(s) still running...`);
      }
    }

    const stillRunning = buildRunner.executor.getRunningBuilds();
    if (stillRunning.length > 0) {
      logger.warn(`${stillRunning.length} build(s) did not complete in time, forcing shutdown`);

      for (const buildId of stillRunning) {
        buildRunner.cancel(buildId);
      }
    } else {
      logger.info('All builds completed');
    }

    buildRunner.queue.clear();
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
  const env = (config.get('server.env') as string).padEnd(14);
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

export default server;
