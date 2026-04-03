const request = require('supertest');
const app = require('../src/app');
const Pipeline = require('../src/models/Pipeline');
const Credential = require('../src/models/Credential');

let token = '';

describe('Pipeline Routes (Authenticated)', () => {
  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@giwicd.local', password: 'admin123' });
    token = loginRes.body.token;
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
