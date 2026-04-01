const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const BuildExecutor = require('./services/BuildExecutor');
const wsManager = require('./services/WebSocketManager');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const dashboardRoutes = require('./routes/dashboard');
const pipelineRoutes = require('./routes/pipelines');
const buildRoutes = require('./routes/builds');
const credentialRoutes = require('./routes/credentials');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const pollingRoutes = require('./routes/polling');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const frontendPath = path.resolve(process.cwd(), 'frontend/dist');
app.use(express.static(frontendPath));

// Build executor (singleton)
const buildExecutor = new BuildExecutor(wsManager);
app.set('buildExecutor', buildExecutor);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/polling', pollingRoutes);

// Catch-all for Angular routes - serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'GiwiCD API',
    version: '1.0.0',
    description: 'CI/CD Engine REST API',
    endpoints: {
      dashboard: '/api/dashboard',
      pipelines: '/api/pipelines',
      builds: '/api/builds',
      webhooks: '/api/webhooks',
      polling: '/api/polling',
      health: '/api/dashboard/health'
    }
  });
});

// 404 and Error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
