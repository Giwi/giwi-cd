const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const BuildRunner = require('./services/BuildRunner');
const wsManager = require('./services/WebSocketManager');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticate, optionalAuth } = require('./middleware/auth');
const { authLimiter, apiLimiter, triggerLimiter } = require('./middleware/rateLimit');
const { csrfMiddleware } = require('./middleware/csrf');
const { requestLogger } = require('./middleware/logger');

const dashboardRoutes = require('./routes/dashboard');
const pipelineRoutes = require('./routes/pipelines');
const buildRoutes = require('./routes/builds');
const credentialRoutes = require('./routes/credentials');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');
const pollingRoutes = require('./routes/polling');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.get('server.frontendUrl'),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-TOKEN'],
  credentials: true
}));
app.use(cookieParser());
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(csrfMiddleware);

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

const appRoot = process.cwd();
const frontendPath = path.resolve(appRoot, 'frontend/dist');
app.use(express.static(frontendPath));

const buildRunner = new BuildRunner(wsManager);
app.set('buildRunner', buildRunner);
app.set('buildExecutor', buildRunner.executor);

app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);

app.use('/api/dashboard', optionalAuth, dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/pipelines', authenticate, pipelineRoutes);
app.use('/api/builds', authenticate, buildRoutes);
app.use('/api/credentials', authenticate, credentialRoutes);
app.use('/api/polling', authenticate, pollingRoutes);

app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).send('index.html not found');
      }
    });
  } else {
    next();
  }
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
