const request = require('supertest');
const app = require('../src/app').default;
const Pipeline = require('../src/models/Pipeline').default;
const Credential = require('../src/models/Credential').default;
const User = require('../src/models/User').default;
const { generateToken } = require('../src/middleware/auth');
const { db } = require('../src/config/database');

let token = '';

describe('Pipeline Routes (Authenticated)', () => {
  beforeEach(async () => {
    db.set('pipelines', []).write();
    let user = await User.findByEmail('admin@giwicd.local');
    if (!user) {
      user = await User.create({
        email: 'admin@giwicd.local',
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
    }
    token = generateToken(user.id);
  });

  describe('GET /api/pipelines', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/pipelines');
      expect(res.status).toBe(401);
    });

    it('should return pipelines with auth', async () => {
      const res = await request(app)
        .get('/api/pipelines')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('POST /api/pipelines', () => {
    it('should create a pipeline', async () => {
      const res = await request(app)
        .post('/api/pipelines')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Pipeline' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject empty name', async () => {
      const res = await request(app)
        .post('/api/pipelines')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });
      expect(res.status).toBe(400);
    });
  });
});

describe('Credential Routes', () => {
  describe('GET /api/credentials', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/credentials');
      expect(res.status).toBe(401);
    });
  });
});
