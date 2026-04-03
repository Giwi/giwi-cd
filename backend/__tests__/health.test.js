const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Health Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.checks).toHaveProperty('database');
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
    it('should return readiness', async () => {
      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });
  });
});
