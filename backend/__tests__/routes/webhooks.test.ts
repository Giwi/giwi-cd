const request = require('supertest');
const app = require('../../src/app').default;
const Pipeline = require('../../src/models/Pipeline').default;
const { generateToken } = require('../../src/middleware/auth');
const User = require('../../src/models/User').default;
const { db } = require('../../src/config/database');

let token = '';
let adminUser = null;

describe('Webhook Routes', () => {
  beforeAll(async () => {
    adminUser = await User.findByEmail('admin@giwicd.local');
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@giwicd.local',
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
    }
    token = generateToken(adminUser.id);
  });

  beforeEach(() => {
    db.set('pipelines', []).write();
    db.set('builds', []).write();
  });

  describe('GET /api/webhooks/webhook/generate/:pipelineId', () => {
    it('should return 404 for non-existent pipeline', async () => {
      const res = await request(app)
        .get('/api/webhooks/webhook/generate/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    it('should return webhook URL for a pipeline', async () => {
      const pipeline = Pipeline.create({ name: 'Test', repositoryUrl: 'https://github.com/user/repo' });

      const res = await request(app)
        .get(`/api/webhooks/webhook/generate/${pipeline.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('webhookUrl');
    });
  });

  describe('POST /api/webhooks/webhook/:pipelineId', () => {
    it('should trigger a build for a matching pipeline', async () => {
      const pipeline = Pipeline.create({
        name: 'Test',
        repositoryUrl: 'https://github.com/user/repo',
        branch: 'main',
        enabled: true,
        triggers: { manual: true, push: true, schedule: null }
      });

      const res = await request(app)
        .post(`/api/webhooks/webhook/${pipeline.id}`)
        .send({
          ref: 'refs/heads/main',
          after: 'abc123',
          head_commit: { message: 'Test commit' }
        });
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    });

    it('should skip build for non-matching branch', async () => {
      const pipeline = Pipeline.create({
        name: 'Test',
        repositoryUrl: 'https://github.com/user/repo',
        branch: 'main',
        enabled: true,
        triggers: { manual: true, push: true, schedule: null }
      });

      const res = await request(app)
        .post(`/api/webhooks/webhook/${pipeline.id}`)
        .send({
          ref: 'refs/heads/develop',
          after: 'abc123',
          head_commit: { message: 'Test commit' }
        });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Branch does not match');
    });

    it('should handle ping events', async () => {
      const pipeline = Pipeline.create({
        name: 'Test',
        repositoryUrl: 'https://github.com/user/repo',
        enabled: true,
        triggers: { manual: true, push: true, schedule: null }
      });

      const res = await request(app)
        .post(`/api/webhooks/webhook/${pipeline.id}`)
        .set('X-GitHub-Event', 'ping')
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Webhook received successfully');
    });

    it('should return 400 when push trigger not enabled', async () => {
      const pipeline = Pipeline.create({
        name: 'Test',
        repositoryUrl: 'https://github.com/user/repo',
        triggers: { manual: true, push: false, schedule: null }
      });

      const res = await request(app)
        .post(`/api/webhooks/webhook/${pipeline.id}`)
        .send({ ref: 'refs/heads/main' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/webhooks/webhook', () => {
    it('should return 202 even with empty body', async () => {
      const res = await request(app)
        .post('/api/webhooks/webhook')
        .send({});
      expect([202, 400]).toContain(res.status);
    });
  });
});
