import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/index';
import BuildRunner from './services/BuildRunner';
import wsManager from './services/WebSocketManager';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authenticate, optionalAuth } from './middleware/auth';
import { authLimiter, apiLimiter } from './middleware/rateLimit';
import { csrfMiddleware } from './middleware/csrf';
import { requestLogger } from './middleware/logger';
import { register } from './config/metrics';

import dashboardRoutes from './routes/dashboard';
import pipelineRoutes from './routes/pipelines';
import buildRoutes from './routes/builds';
import credentialRoutes from './routes/credentials';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import healthRoutes from './routes/health';
import pollingRoutes from './routes/polling';
import artifactRoutes from './routes/artifacts';

const app: Application = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.get('server.frontendUrl') as string,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-TOKEN'],
  credentials: true
}));
app.use(cookieParser());
app.use(requestLogger as express.RequestHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(csrfMiddleware as express.RequestHandler);

app.use('/api', apiLimiter as express.RequestHandler);
app.use('/api/auth', authLimiter as express.RequestHandler);

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
apiRouter.use('/dashboard', optionalAuth as express.RequestHandler, dashboardRoutes);
apiRouter.use('/webhooks', webhookRoutes);
apiRouter.use('/admin', authenticate as express.RequestHandler, adminRoutes);
apiRouter.use('/pipelines', authenticate as express.RequestHandler, pipelineRoutes);
apiRouter.use('/builds', authenticate as express.RequestHandler, buildRoutes);
apiRouter.use('/credentials', authenticate as express.RequestHandler, credentialRoutes);
apiRouter.use('/polling', authenticate as express.RequestHandler, pollingRoutes);
apiRouter.use('/artifacts', authenticate as express.RequestHandler, artifactRoutes);

apiRouter.get('/version', (_req: express.Request, res: express.Response) => {
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

v1Router.get('/version', (_req: express.Request, res: express.Response) => {
  res.json({ version: '1.0.0', apiVersion: 'v1', deprecated: false });
});

app.use('/api/v1', v1Router);

app.get('/metrics', async (req: express.Request, res: express.Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end((ex as Error).message);
  }
});

app.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export default app;
