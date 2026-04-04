const GitService = require('../../src/services/GitService').default;
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('GitService Integration', () => {
  let wsManager;
  let gitService;
  let testRepoDir;
  let bareRepoDir;

  beforeAll(() => {
    wsManager = { broadcast: jest.fn() };
    gitService = new GitService(wsManager);

    bareRepoDir = path.join(os.tmpdir(), 'giwicd-test-bare-' + Date.now());
    testRepoDir = path.join(os.tmpdir(), 'giwicd-test-repo-' + Date.now());

    fs.mkdirSync(bareRepoDir, { recursive: true });
    execSync(`git -C "${bareRepoDir}" init --bare --quiet`);

    fs.mkdirSync(testRepoDir, { recursive: true });
    execSync(`git -C "${testRepoDir}" init --quiet --initial-branch=main`);
    execSync(`git -C "${testRepoDir}" config user.email "test@test.com"`, { stdio: 'pipe' });
    execSync(`git -C "${testRepoDir}" config user.name "Test"`, { stdio: 'pipe' });
    fs.writeFileSync(path.join(testRepoDir, 'README.md'), '# Test Repo');
    execSync(`git -C "${testRepoDir}" add .`, { stdio: 'pipe' });
    execSync(`git -C "${testRepoDir}" commit -m "Initial commit" --quiet`, { stdio: 'pipe' });
    execSync(`git -C "${testRepoDir}" remote add origin "${bareRepoDir}"`, { stdio: 'pipe' });
    execSync(`git -C "${testRepoDir}" push -u origin main --quiet`, { stdio: 'pipe' });
  });

  afterAll(() => {
    fs.rmSync(bareRepoDir, { recursive: true, force: true });
    fs.rmSync(testRepoDir, { recursive: true, force: true });
    const workDir = gitService._getWorkDir(bareRepoDir);
    if (fs.existsSync(workDir)) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  });

  describe('cloneOrPull', () => {
    it('should clone a local bare repo', async () => {
      const result = await gitService.cloneOrPull('test-build', bareRepoDir, 'main', null);

      expect(result.success).toBe(true);
      expect(result.workDir).toBeDefined();
      expect(fs.existsSync(path.join(result.workDir, '.git'))).toBe(true);
      expect(fs.existsSync(path.join(result.workDir, 'README.md'))).toBe(true);
    });

    it('should pull existing clone', async () => {
      const workDir = gitService._getWorkDir(bareRepoDir);

      fs.writeFileSync(path.join(testRepoDir, 'file2.txt'), 'new file');
      execSync(`git -C "${testRepoDir}" add .`, { stdio: 'pipe' });
      execSync(`git -C "${testRepoDir}" commit -m "Second commit" --quiet`, { stdio: 'pipe' });
      execSync(`git -C "${testRepoDir}" push --quiet`, { stdio: 'pipe' });

      const result = await gitService.cloneOrPull('test-build-2', bareRepoDir, 'main', null);

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(workDir, 'file2.txt'))).toBe(true);
    });
  });

  describe('getLastCommitMessage', () => {
    it('should return the last commit message', async () => {
      const workDir = gitService._getWorkDir(bareRepoDir);
      const message = await gitService.getLastCommitMessage(workDir);

      expect(message).toBe('Second commit');
    });

    it('should return null for non-git directory', async () => {
      const message = await gitService.getLastCommitMessage(os.tmpdir());
      expect(message).toBeNull();
    });
  });

  describe('checkoutCommit', () => {
    it('should checkout a specific commit', async () => {
      const workDir = gitService._getWorkDir(bareRepoDir);

      execSync(`git -C "${workDir}" log -1 --format=%H`, { stdio: 'pipe' });
      const commitHash = execSync(`git -C "${workDir}" log -1 --format=%H`).toString().trim();

      const result = await gitService.checkoutCommit('test-build-3', workDir, commitHash);

      expect(result.success).toBe(true);
    });

    it('should fail for invalid commit', async () => {
      const workDir = gitService._getWorkDir(bareRepoDir);
      const result = await gitService.checkoutCommit('test-build-4', workDir, 'invalidhash123');

      expect(result.success).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove old workspace directories', () => {
      const oldDir = path.join(gitService.workspaceDir, 'old-workspace');
      fs.mkdirSync(oldDir, { recursive: true });
      const oldTime = new Date('2020-01-01');
      fs.utimesSync(oldDir, oldTime, oldTime);

      gitService.cleanup(1000);

      expect(fs.existsSync(oldDir)).toBe(false);
    });
  });
});
