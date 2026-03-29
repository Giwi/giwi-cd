require('dotenv').config();
const http = require('http');
const app = require('./app');
const wsManager = require('./services/WebSocketManager');
const { createDefaultAdmin } = require('./utils/createDefaultAdmin');
const PollingService = require('./services/PollingService');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize WebSocket
wsManager.initialize(server);
app.set('wsManager', wsManager);

// Create default admin user
createDefaultAdmin();

// Start polling service
const pollingService = new PollingService(app.get('buildExecutor'));
pollingService.start();
app.set('pollingService', pollingService);

// Graceful shutdown
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
  console.log(`
╔═══════════════════════════════════════════╗
║           GiwiCD - CI/CD Engine           ║
╠═══════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}           ║
║  📡 WebSocket: ws://localhost:${PORT}/ws     ║
║  🔗 API: http://localhost:${PORT}/api        ║
║  🔄 Polling: enabled (60s interval)       ║
║  🌍 ENV: ${(process.env.NODE_ENV || 'development').padEnd(14)}              ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = server;
