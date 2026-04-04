import promClient from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

const { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } = promClient;

const register = new Registry();

collectDefaultMetrics({ register, prefix: 'giwicd_' });

const httpRequestsTotal = new Counter({
  name: 'giwicd_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDuration = new Histogram({
  name: 'giwicd_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const buildsTotal = new Counter({
  name: 'giwicd_builds_total',
  help: 'Total number of builds',
  labelNames: ['status', 'pipeline_id'],
  registers: [register]
});

const buildsRunning = new Gauge({
  name: 'giwicd_builds_running',
  help: 'Number of currently running builds',
  registers: [register]
});

const pipelinesTotal = new Gauge({
  name: 'giwicd_pipelines_total',
  help: 'Total number of pipelines',
  labelNames: ['enabled'],
  registers: [register]
});

const queueSize = new Gauge({
  name: 'giwicd_queue_size',
  help: 'Number of builds in queue',
  registers: [register]
});

function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status: res.statusCode
    });

    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status: res.statusCode
    }, duration);
  });

  next();
}

function recordBuildComplete(status: string, pipelineId: string | undefined): void {
  buildsTotal.inc({ status, pipeline_id: pipelineId || 'unknown' });
}

function setBuildsRunning(count: number): void {
  buildsRunning.set(count);
}

function setPipelinesTotal(enabled: number, disabled: number): void {
  pipelinesTotal.set({ enabled: 'true' }, enabled);
  pipelinesTotal.set({ enabled: 'false' }, disabled);
}

function setQueueSize(size: number): void {
  queueSize.set(size);
}

function getMetrics(): Promise<string> {
  return register.metrics();
}

function getContentType(): string {
  return register.contentType;
}

export {
  register,
  metricsMiddleware,
  recordBuildComplete,
  setBuildsRunning,
  setPipelinesTotal,
  setQueueSize,
  getMetrics,
  getContentType
};
