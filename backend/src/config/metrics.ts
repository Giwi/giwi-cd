import promClient from 'prom-client';

const { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } = promClient;

const register = new Registry();

collectDefaultMetrics({ register, prefix: 'giwicd_' });

new Counter({
  name: 'giwicd_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

new Histogram({
  name: 'giwicd_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

new Counter({
  name: 'giwicd_builds_total',
  help: 'Total number of builds',
  labelNames: ['status', 'pipeline_id'],
  registers: [register]
});

new Gauge({
  name: 'giwicd_builds_running',
  help: 'Number of currently running builds',
  registers: [register]
});

new Gauge({
  name: 'giwicd_pipelines_total',
  help: 'Total number of pipelines',
  labelNames: ['enabled'],
  registers: [register]
});

new Gauge({
  name: 'giwicd_queue_size',
  help: 'Number of builds in queue',
  registers: [register]
});

export { register };
