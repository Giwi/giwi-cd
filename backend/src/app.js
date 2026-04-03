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
const { register, metricsMiddleware, setBuildsRunning, setPipelinesTotal, setQueueSize } = require('./config/metrics');

const dashboardRoutes = require('./routes/dashboard');
const pipelineRoutes = require('./routes/pipelines');
const buildRoutes = require('./routes/builds');
const credentialRoutes = require('./routes/credentials');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');
const pollingRoutes = require('./routes/polling');
const artifactRoutes = require('./routes/artifacts');

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

const apiRouter = express.Router();
app.use('/api', apiRouter);

apiRouter.use('/auth', authRoutes);
apiRouter.use('/health', healthRoutes);
apiRouter.use('/dashboard', optionalAuth, dashboardRoutes);
apiRouter.use('/webhooks', webhookRoutes);
apiRouter.use('/admin', authenticate, adminRoutes);
apiRouter.use('/pipelines', authenticate, pipelineRoutes);
apiRouter.use('/builds', authenticate, buildRoutes);
apiRouter.use('/credentials', authenticate, credentialRoutes);
apiRouter.use('/polling', authenticate, pollingRoutes);
apiRouter.use('/artifacts', authenticate, artifactRoutes);

apiRouter.get('/version', (req, res) => {
  res.json({ version: '1.0.0', apiVersion: 'v1', deprecated: false });
});

const v1Router = express.Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/health', healthRoutes);
v1Router.use('/dashboard', optionalAuth, dashboardRoutes);
v1Router.use('/webhooks', webhookRoutes);
v1Router.use('/admin', authenticate, adminRoutes);
v1Router.use('/pipelines', authenticate, pipelineRoutes);
v1Router.use('/builds', authenticate, buildRoutes);
v1Router.use('/credentials', authenticate, credentialRoutes);
v1Router.use('/polling', authenticate, pollingRoutes);
v1Router.use('/artifacts', authenticate, artifactRoutes);

v1Router.get('/version', (req, res) => {
  res.json({ version: '1.0.0', apiVersion: 'v1', deprecated: false });
});

app.use('/api/v1', v1Router);

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex.message);
  }
});

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
