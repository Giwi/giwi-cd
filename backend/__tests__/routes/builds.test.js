const request = require('supertest');
const app = require('../../src/app');
const Build = require('../../src/models/Build');
const Pipeline = require('../../src/models/Pipeline');
const { generateToken } = require('../../src/middleware/auth');
const User = require('../../src/models/User');
const { db } = require('../../src/config/database');

let token = '';
let adminUser = null;

describe('Build Routes', () => {
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
    db.set('builds', []).write();
    db.set('pipelines', []).write();
  });

  describe('GET /api/builds', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/builds');
      expect(res.status).toBe(401);
    });

    it('should return builds with auth', async () => {
      const res = await request(app)
        .get('/api/builds')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('GET /api/builds/stats', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/builds/stats');
      expect(res.status).toBe(401);
    });

    it('should return build stats', async () => {
      const res = await request(app)
        .get('/api/builds/stats')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
      expect(res.body.data).toHaveProperty('total');
    });
  });

  describe('GET /api/builds/:id', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/builds/non-existent');
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid build id format', async () => {
      const res = await request(app)
        .get('/api/builds/non-existent')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('should return a build', async () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'Test' });

      const res = await request(app)
        .get(`/api/builds/${build.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(build.id);
    });
  });

  describe('GET /api/builds/:id/logs', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/builds/non-existent/logs');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/builds/:id', () => {
    it('should require authentication', async () => {
      const res = await request(app).delete('/api/builds/non-existent');
      expect(res.status).toBe(401);
    });

    it('should delete a build', async () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'Test' });

      const res = await request(app)
        .delete(`/api/builds/${build.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Build.findById(build.id)).toBeUndefined();
    });
  });
});
