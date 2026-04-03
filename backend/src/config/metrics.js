const promClient = require('prom-client');
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

function metricsMiddleware(req, res, next) {
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

function recordBuildComplete(status, pipelineId) {
  buildsTotal.inc({ status, pipeline_id: pipelineId || 'unknown' });
}

function setBuildsRunning(count) {
  buildsRunning.set(count);
}

function setPipelinesTotal(enabled, disabled) {
  pipelinesTotal.set({ enabled: 'true' }, enabled);
  pipelinesTotal.set({ enabled: 'false' }, disabled);
}

function setQueueSize(size) {
  queueSize.set(size);
}

function getMetrics() {
  return register.metrics();
}

function getContentType() {
  return register.contentType;
}

module.exports = {
  register,
  metricsMiddleware,
  recordBuildComplete,
  setBuildsRunning,
  setPipelinesTotal,
  setQueueSize,
  getMetrics,
  getContentType
};
