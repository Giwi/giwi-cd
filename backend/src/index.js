require('dotenv').config();
const http = require('http');
const config = require('./config');
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

process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM signal received, shutting down gracefully...');
  pollingService.stop();
  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[SERVER] SIGINT signal received, shutting down gracefully...');
  pollingService.stop();
  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  const env = config.get('server.env').padEnd(14);
  const polling = `enabled (${config.get('build.pollingInterval')}s interval)`;
  console.log(`
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
