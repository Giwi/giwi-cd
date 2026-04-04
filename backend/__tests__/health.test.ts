const request = require('supertest');
const app = require('../src/app').default;

describe('Health Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status with all checks', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('version');
      expect(res.body.checks).toHaveProperty('database');
      expect(res.body.checks).toHaveProperty('disk');
      expect(res.body.checks).toHaveProperty('memory');
    });

    it('should report database status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body.checks.database.status).toBe('ok');
      expect(res.body.checks.database.tables).toHaveProperty('pipelines');
      expect(res.body.checks.database.tables).toHaveProperty('builds');
      expect(res.body.checks.database.tables).toHaveProperty('users');
    });

    it('should report disk usage', async () => {
      const res = await request(app).get('/api/health');
      const disk = res.body.checks.disk;
      expect(disk.status).toBe('ok');
      expect(disk).toHaveProperty('total');
      expect(disk).toHaveProperty('used');
      expect(disk).toHaveProperty('free');
      expect(disk).toHaveProperty('usagePercent');
    });

    it('should report memory usage', async () => {
      const res = await request(app).get('/api/health');
      const mem = res.body.checks.memory;
      expect(mem.status).toBe('ok');
      expect(mem).toHaveProperty('usedMB');
      expect(mem).toHaveProperty('totalMB');
      expect(mem).toHaveProperty('usagePercent');
      expect(mem).toHaveProperty('rssMB');
    });
  });

  describe('GET /api/health/live', () => {
    it('should return liveness', async () => {
      const res = await request(app).get('/api/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return readiness when database is accessible', async () => {
      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });
  });
});
