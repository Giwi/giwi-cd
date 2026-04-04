const Credential = require('../../src/models/Credential').default;
const { db } = require('../../src/config/database');
const { credentialCache } = require('../../src/services/CredentialCache');

describe('Credential Model', () => {
  beforeEach(() => {
    db.set('credentials', []).write();
    credentialCache.invalidateAll();
  });

  describe('create', () => {
    it('should create a credential with defaults', () => {
      const cred = Credential.create({ name: 'Test Cred' });

      expect(cred).toHaveProperty('id');
      expect(cred.name).toBe('Test Cred');
      expect(cred.type).toBe('username-password');
      expect(cred.username).toBe('');
      expect(cred.password).toBe('');
      expect(cred.token).toBe('');
      expect(cred.privateKey).toBe('');
      expect(cred.passphrase).toBe('');
      expect(cred.description).toBe('');
      expect(cred.provider).toBeNull();
    });

    it('should accept custom values', () => {
      const cred = Credential.create({
        name: 'Git Token',
        type: 'token',
        token: 'ghp_abc123',
        description: 'GitHub token',
        provider: 'github'
      });

      expect(cred.type).toBe('token');
      expect(cred.token).toBe('********');
      expect(cred.description).toBe('GitHub token');
      expect(cred.provider).toBe('github');
    });
  });

  describe('findAll', () => {
    it('should return all credentials sanitized', () => {
      Credential.create({ name: 'C1', password: 'secret1', token: 'tok1' });
      Credential.create({ name: 'C2', token: 'tok2' });

      const creds = Credential.findAll();
      expect(creds.length).toBe(2);
      expect(creds[0].password).toBe('********');
      expect(creds[0].token).toBe('********');
      expect(creds[1].token).toBe('********');
    });
  });

  describe('findById', () => {
    it('should find a credential by id sanitized', () => {
      const created = Credential.create({ name: 'Test', password: 'secret', token: 'tok' });
      const found = Credential.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.password).toBe('********');
      expect(found.token).toBe('********');
    });

    it('should return null for non-existent id', () => {
      const found = Credential.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getRaw', () => {
    it('should return raw credential values', () => {
      const created = Credential.create({ name: 'Test', password: 'secret', token: 'tok' });
      const raw = Credential.getRaw(created.id);

      expect(raw.password).toBe('secret');
      expect(raw.token).toBe('tok');
    });

    it('should return null for non-existent id', () => {
      const raw = Credential.getRaw('non-existent');
      expect(raw).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find a credential by name case-insensitive', () => {
      Credential.create({ name: 'MyCred', token: 'tok123' });
      const found = Credential.findByName('mycred');

      expect(found).toBeDefined();
      expect(found.name).toBe('MyCred');
      expect(found.token).toBe('********');
    });

    it('should return null for non-existent name', () => {
      const found = Credential.findByName('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update credential fields', () => {
      const cred = Credential.create({ name: 'Test', token: 'old' });
      const updated = Credential.update(cred.id, { name: 'Updated', token: 'new' });

      expect(updated.name).toBe('Updated');
      expect(updated.token).toBe('********');
    });

    it('should preserve existing fields when not provided', () => {
      const cred = Credential.create({ name: 'Test', description: 'desc', token: 'tok' });
      const updated = Credential.update(cred.id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
      expect(updated.description).toBe('desc');
    });

    it('should return null for non-existent id', () => {
      const updated = Credential.update('non-existent', { name: 'Updated' });
      expect(updated).toBeNull();
    });

    it('should invalidate cache on update', () => {
      const cred = Credential.create({ name: 'Test', token: 'tok' });
      Credential.findById(cred.id);
      Credential.update(cred.id, { token: 'newtok' });

      const raw = Credential.getRaw(cred.id);
      expect(raw.token).toBe('newtok');
    });
  });

  describe('delete', () => {
    it('should delete a credential', () => {
      const cred = Credential.create({ name: 'Test' });
      const result = Credential.delete(cred.id);

      expect(result).toBe(true);
      expect(Credential.findById(cred.id)).toBeNull();
    });
  });

  describe('sanitize', () => {
    it('should mask all secret fields', () => {
      const cred = {
        id: '1',
        name: 'Test',
        password: 'secret',
        token: 'tok',
        privateKey: 'key',
        passphrase: 'pass'
      };
      const sanitized = Credential.sanitize(cred);

      expect(sanitized.password).toBe('********');
      expect(sanitized.token).toBe('********');
      expect(sanitized.privateKey).toBe('********');
      expect(sanitized.passphrase).toBe('********');
    });

    it('should leave empty fields empty', () => {
      const cred = { name: 'Test', password: '', token: '', privateKey: '', passphrase: '' };
      const sanitized = Credential.sanitize(cred);

      expect(sanitized.password).toBe('');
      expect(sanitized.token).toBe('');
      expect(sanitized.privateKey).toBe('');
      expect(sanitized.passphrase).toBe('');
    });
  });
});
