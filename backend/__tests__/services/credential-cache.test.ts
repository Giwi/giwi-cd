const { credentialCache, CredentialCache } = require('../../src/services/CredentialCache');

describe('CredentialCache', () => {
  let cache;

  beforeEach(() => {
    cache = new CredentialCache(100);
  });

  describe('set and get', () => {
    it('should store and retrieve a credential', () => {
      cache.set('cred-1', { id: 'cred-1', name: 'Test' });
      const result = cache.get('cred-1');

      expect(result).toEqual({ id: 'cred-1', name: 'Test' });
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should retrieve by name', () => {
      cache.set('cred-1', { id: 'cred-1', name: 'MyCred' });
      const result = cache.getByName('MyCred');

      expect(result).toEqual({ id: 'cred-1', name: 'MyCred' });
    });

    it('should be case-insensitive', () => {
      cache.set('cred-1', { id: 'cred-1', name: 'MyCred' });
      const result = cache.getByName('mycred');

      expect(result).toEqual({ id: 'cred-1', name: 'MyCred' });
    });

    it('should return null for non-existent name', () => {
      const result = cache.getByName('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove a credential from cache', () => {
      cache.set('cred-1', { id: 'cred-1', name: 'Test' });
      cache.invalidate('cred-1');

      expect(cache.get('cred-1')).toBeNull();
      expect(cache.getByName('Test')).toBeNull();
    });

    it('should not affect other cached items', () => {
      cache.set('cred-1', { id: 'cred-1', name: 'C1' });
      cache.set('cred-2', { id: 'cred-2', name: 'C2' });
      cache.invalidate('cred-1');

      expect(cache.get('cred-2')).toEqual({ id: 'cred-2', name: 'C2' });
    });
  });

  describe('invalidateAll', () => {
    it('should remove all items from cache', () => {
      cache.set('cred-1', { id: 'cred-1', name: 'C1' });
      cache.set('cred-2', { id: 'cred-2', name: 'C2' });
      cache.invalidateAll();

      expect(cache.get('cred-1')).toBeNull();
      expect(cache.get('cred-2')).toBeNull();
    });
  });

  describe('TTL', () => {
    it('should expire items after TTL', (done) => {
      cache = new CredentialCache(50);
      cache.set('cred-1', { id: 'cred-1', name: 'Test' });

      expect(cache.get('cred-1')).not.toBeNull();

      setTimeout(() => {
        expect(cache.get('cred-1')).toBeNull();
        done();
      }, 100);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('cred-1', { id: 'cred-1', name: 'C1' });
      cache.set('cred-2', { id: 'cred-2', name: 'C2' });

      const stats = cache.getStats();
      expect(stats.total).toBe(2);
      expect(stats.valid).toBe(2);
      expect(stats.expired).toBe(0);
    });
  });
});
