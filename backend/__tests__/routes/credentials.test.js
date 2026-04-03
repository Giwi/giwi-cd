const request = require('supertest');
const app = require('../../src/app');
const Credential = require('../../src/models/Credential');
const { generateToken } = require('../../src/middleware/auth');
const User = require('../../src/models/User');
const { db } = require('../../src/config/database');

let token = '';
let adminUser = null;

describe('Credential Routes', () => {
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
    db.set('credentials', []).write();
  });

  describe('GET /api/credentials', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/credentials');
      expect(res.status).toBe(401);
    });

    it('should return credentials with auth', async () => {
      const res = await request(app)
        .get('/api/credentials')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('POST /api/credentials', () => {
    it('should create a credential', async () => {
      const res = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Cred', type: 'token', token: 'ghp_abc123' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Cred');
      expect(res.body.data.token).toBe('ghp_abc123');
    });

    it('should reject missing name', async () => {
      const res = await request(app)
        .post('/api/credentials')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'token' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/credentials/:id', () => {
    it('should return a credential', async () => {
      const cred = Credential.create({ name: 'Test', type: 'token', token: 'tok' });

      const res = await request(app)
        .get(`/api/credentials/${cred.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(cred.id);
      expect(res.body.data.token).toBe('********');
    });

    it('should return 404 for non-existent credential', async () => {
      const res = await request(app)
        .get('/api/credentials/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/credentials/:id', () => {
    it('should update a credential', async () => {
      const cred = Credential.create({ name: 'Test', type: 'token', token: 'tok' });

      const res = await request(app)
        .put(`/api/credentials/${cred.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated');
    });
  });

  describe('DELETE /api/credentials/:id', () => {
    it('should delete a credential', async () => {
      const cred = Credential.create({ name: 'Test', type: 'token', token: 'tok' });

      const res = await request(app)
        .delete(`/api/credentials/${cred.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/credentials/:id/test', () => {
    it('should return 400 for non-notification credential', async () => {
      const cred = Credential.create({ name: 'Test Token', type: 'token', token: 'tok' });

      const res = await request(app)
        .post(`/api/credentials/${cred.id}/test`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });
});
