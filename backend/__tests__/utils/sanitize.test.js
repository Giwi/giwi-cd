const { sanitizeString, sanitizeObject, sanitizePipeline, sanitizeCredential, sanitizeUser, sanitizeNotification } = require('../../src/utils/sanitize');

describe('Sanitize Utility', () => {
  describe('sanitizeString', () => {
    it('should strip all HTML tags', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('');
      expect(sanitizeString('<b>Bold</b>')).toBe('Bold');
      expect(sanitizeString('<p>Hello</p>')).toBe('Hello');
    });

    it('should return non-string values unchanged', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize specified string fields', () => {
      const input = { name: '<b>Test</b>', description: '<p>Desc</p>', count: 42 };
      const result = sanitizeObject(input, ['name', 'description']);

      expect(result.name).toBe('Test');
      expect(result.description).toBe('Desc');
      expect(result.count).toBe(42);
    });

    it('should handle null/undefined fields gracefully', () => {
      const input = { name: null, description: undefined };
      const result = sanitizeObject(input, ['name', 'description']);

      expect(result.name).toBeNull();
      expect(result.description).toBeUndefined();
    });

    it('should return non-objects unchanged', () => {
      expect(sanitizeObject(null, ['name'])).toBeNull();
      expect(sanitizeObject('string', ['name'])).toBe('string');
    });
  });

  describe('sanitizePipeline', () => {
    it('should sanitize name, description, repositoryUrl, branch', () => {
      const input = {
        name: '<b>Test</b>',
        description: '<p>Desc</p>',
        repositoryUrl: '<script>evil</script>https://github.com',
        branch: '<i>main</i>'
      };
      const result = sanitizePipeline(input);

      expect(result.name).toBe('Test');
      expect(result.description).toBe('Desc');
      expect(result.repositoryUrl).toBe('https://github.com');
      expect(result.branch).toBe('main');
    });

    it('should not sanitize non-string fields', () => {
      const input = { stages: [{ name: 'Build' }], enabled: true, keepBuilds: 10 };
      const result = sanitizePipeline(input);

      expect(result.stages).toEqual([{ name: 'Build' }]);
      expect(result.enabled).toBe(true);
      expect(result.keepBuilds).toBe(10);
    });
  });

  describe('sanitizeCredential', () => {
    it('should sanitize name, description, username', () => {
      const input = { name: '<b>Cred</b>', description: '<p>Desc</p>', username: '<i>user</i>' };
      const result = sanitizeCredential(input);

      expect(result.name).toBe('Cred');
      expect(result.description).toBe('Desc');
      expect(result.username).toBe('user');
    });

    it('should not sanitize secret fields', () => {
      const input = { token: 'ghp_abc', password: 'secret', privateKey: 'key' };
      const result = sanitizeCredential(input);

      expect(result.token).toBe('ghp_abc');
      expect(result.password).toBe('secret');
      expect(result.privateKey).toBe('key');
    });
  });

  describe('sanitizeUser', () => {
    it('should sanitize username and email', () => {
      const input = { username: '<b>admin</b>', email: '<script>x</script>admin@test.com' };
      const result = sanitizeUser(input);

      expect(result.username).toBe('admin');
      expect(result.email).toBe('admin@test.com');
    });

    it('should not sanitize password', () => {
      const input = { password: '$2b$10$abc' };
      const result = sanitizeUser(input);

      expect(result.password).toBe('$2b$10$abc');
    });
  });

  describe('sanitizeNotification', () => {
    it('should sanitize message and channel', () => {
      const input = { message: '<b>Build</b> failed', channel: '<i>#builds</i>' };
      const result = sanitizeNotification(input);

      expect(result.message).toBe('Build failed');
      expect(result.channel).toBe('#builds');
    });
  });
});
