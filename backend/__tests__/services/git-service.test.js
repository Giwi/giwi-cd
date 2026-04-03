const GitService = require('../../src/services/GitService');
const Credential = require('../../src/models/Credential');
const { db } = require('../../src/config/database');
const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('child_process', () => ({
  exec: jest.fn((cmd, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    callback(null, 'mock stdout', '');
  })
}));

describe('GitService', () => {
  let wsManager;
  let gitService;

  beforeEach(() => {
    db.set('credentials', []).write();
    wsManager = { broadcast: jest.fn() };
    gitService = new GitService(wsManager);
  });

  describe('_buildAuthUrl', () => {
    it('should inject username-password into HTTPS URL', () => {
      const cred = { type: 'username-password', username: 'user', password: 'pass123' };
      const result = gitService._buildAuthUrl('https://github.com/user/repo', cred);

      expect(result).toContain('user');
      expect(result).toContain('pass123');
    });

    it('should use oauth2 username for GitLab tokens', () => {
      const cred = { type: 'username-password', username: 'user', password: 'glpat-abc123' };
      const result = gitService._buildAuthUrl('https://gitlab.com/user/repo', cred);

      expect(result).toContain('oauth2');
      expect(result).toContain('glpat-abc123');
    });

    it('should use x-access-token for GitHub tokens', () => {
      const cred = { type: 'username-password', username: 'user', password: 'ghp_abc123' };
      const result = gitService._buildAuthUrl('https://github.com/user/repo', cred);

      expect(result).toContain('x-access-token');
      expect(result).toContain('ghp_abc123');
    });

    it('should use x-access-token for GitHub token type on GitHub', () => {
      const cred = { type: 'token', token: 'ghp_abc123' };
      const result = gitService._buildAuthUrl('https://github.com/user/repo', cred);

      expect(result).toContain('x-access-token');
    });

    it('should use oauth2 for GitLab token type', () => {
      const cred = { type: 'token', token: 'glpat-abc123' };
      const result = gitService._buildAuthUrl('https://gitlab.com/user/repo', cred);

      expect(result).toContain('oauth2');
    });

    it('should use x-token-auth for Bitbucket', () => {
      const cred = { type: 'token', token: 'bb-token' };
      const result = gitService._buildAuthUrl('https://bitbucket.org/user/repo', cred);

      expect(result).toContain('x-token-auth');
    });

    it('should use token as default for unknown hosts', () => {
      const cred = { type: 'token', token: 'some-token' };
      const result = gitService._buildAuthUrl('https://gitea.example.com/user/repo', cred);

      expect(result).toContain('token');
      expect(result).toContain('some-token');
    });

    it('should return original URL if parsing fails', () => {
      const cred = { type: 'token', token: 'abc' };
      const result = gitService._buildAuthUrl('not-a-valid-url', cred);

      expect(result).toBe('not-a-valid-url');
    });
  });

  describe('_maskUrl', () => {
    it('should mask credentials in URL', () => {
      const result = gitService._maskUrl('https://user:secret@github.com/repo');
      expect(result).toBe('https://***:***@github.com/repo');
    });

    it('should leave URLs without credentials unchanged', () => {
      const result = gitService._maskUrl('https://github.com/user/repo');
      expect(result).toBe('https://github.com/user/repo');
    });

    it('should handle empty input', () => {
      expect(gitService._maskUrl('')).toBe('');
      expect(gitService._maskUrl(null)).toBe('');
    });
  });

  describe('_getWorkDir', () => {
    it('should return workspace dir for empty URL', () => {
      const result = gitService._getWorkDir('');
      expect(result).toBe(gitService.workspaceDir);
    });

    it('should return consistent dir for same URL', () => {
      const url = 'https://github.com/user/repo';
      const dir1 = gitService._getWorkDir(url);
      const dir2 = gitService._getWorkDir(url);

      expect(dir1).toBe(dir2);
    });

    it('should return different dirs for different URLs', () => {
      const dir1 = gitService._getWorkDir('https://github.com/user/repo1');
      const dir2 = gitService._getWorkDir('https://github.com/user/repo2');

      expect(dir1).not.toBe(dir2);
    });
  });

  describe('_hashString', () => {
    it('should return consistent hash for same input', () => {
      const h1 = gitService._hashString('test');
      const h2 = gitService._hashString('test');
      expect(h1).toBe(h2);
    });

    it('should return different hashes for different inputs', () => {
      const h1 = gitService._hashString('abc');
      const h2 = gitService._hashString('xyz');
      expect(h1).not.toBe(h2);
    });

    it('should return positive hex string', () => {
      const hash = gitService._hashString('test');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('cloneOrPull', () => {
    it('should skip when no repo URL', async () => {
      const result = await gitService.cloneOrPull('build-1', '', 'main', null);
      expect(result.success).toBe(true);
    });

    it('should clone for new repository', async () => {
      const result = await gitService.cloneOrPull('build-1', 'https://github.com/user/repo', 'main', null);
      expect(result.success).toBe(true);
      expect(result.workDir).toBeDefined();
    });

    it('should pull for existing repository', async () => {
      const workDir = gitService._getWorkDir('https://github.com/user/repo');
      fs.mkdirSync(path.join(workDir, '.git'), { recursive: true });

      const result = await gitService.cloneOrPull('build-1', 'https://github.com/user/repo', 'main', null);
      expect(result.success).toBe(true);

      fs.rmSync(workDir, { recursive: true, force: true });
    });
  });

  describe('getWorkspaceDir', () => {
    it('should return the workspace directory path', () => {
      const dir = gitService.getWorkspaceDir();
      expect(dir).toContain('giwicd-workspace');
    });
  });

  describe('cleanup', () => {
    it('should not throw on empty workspace', () => {
      expect(() => gitService.cleanup()).not.toThrow();
    });

    it('should remove old directories', () => {
      const oldDir = path.join(gitService.workspaceDir, 'old-dir');
      fs.mkdirSync(oldDir, { recursive: true });

      const oldTime = new Date('2020-01-01');
      fs.utimesSync(oldDir, oldTime, oldTime);

      gitService.cleanup(1000);

      expect(fs.existsSync(oldDir)).toBe(false);
    });

    it('should keep recent directories', () => {
      const newDir = path.join(gitService.workspaceDir, 'new-dir');
      fs.mkdirSync(newDir, { recursive: true });

      gitService.cleanup(86400000);

      expect(fs.existsSync(newDir)).toBe(true);

      fs.rmSync(newDir, { recursive: true, force: true });
    });
  });
});
