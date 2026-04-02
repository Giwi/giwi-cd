const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const BuildExecutor = require('./services/BuildExecutor');
const wsManager = require('./services/WebSocketManager');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticate, optionalAuth } = require('./middleware/auth');

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
const appRoot = process.cwd();
const frontendPath = path.resolve(appRoot, 'frontend/dist');
app.use(express.static(frontendPath));

// Build executor (singleton)
const buildExecutor = new BuildExecutor(wsManager);
app.set('buildExecutor', buildExecutor);

// API Routes
app.use('/api/auth', authRoutes);

// Public routes
app.use('/api/dashboard', optionalAuth, dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);

// Protected routes
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/pipelines', authenticate, pipelineRoutes);
app.use('/api/builds', authenticate, buildRoutes);
app.use('/api/credentials', authenticate, credentialRoutes);
app.use('/api/polling', authenticate, pollingRoutes);

// Catch-all for SPA - serve index.html for any non-API routes
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

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
