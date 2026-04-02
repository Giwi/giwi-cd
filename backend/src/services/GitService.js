const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const Credential = require('../models/Credential');

class GitService {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.workspaceDir = path.join(os.tmpdir(), 'giwicd-workspace');
    if (!fs.existsSync(this.workspaceDir)) {
      fs.mkdirSync(this.workspaceDir, { recursive: true });
    }
  }

  async cloneOrPull(buildId, repoUrl, branch, credentialId) {
    if (!repoUrl) {
      return { success: true, message: 'No repository URL configured, skipping clone' };
    }

    const emit = (level, message) => {
      if (this.wsManager && buildId) {
        this.wsManager.broadcast({ type: 'build:log', buildId, log: { timestamp: new Date().toISOString(), level, message } });
      }
    };

    const workDir = this._getWorkDir(repoUrl);
    const isSSH = repoUrl.startsWith('git@');
    let authUrl = repoUrl;

    if (credentialId && !isSSH) {
      const cred = Credential.getRaw(credentialId);
      console.log(`[GitService] credentialId=${credentialId}, cred found:`, cred ? 'yes' : 'no', 'type:', cred?.type);
      if (cred) {
        authUrl = this._buildAuthUrl(repoUrl, cred);
        console.log(`[GitService] authUrl:`, this._maskUrl(authUrl));
      }
    }

    const gitDir = path.join(workDir, '.git');
    const isExisting = fs.existsSync(gitDir);

    if (isExisting) {
      return this._pull(buildId, workDir, branch, authUrl, credentialId);
    } else {
      return this._clone(buildId, authUrl, branch, workDir, credentialId);
    }
  }

  _buildAuthUrl(repoUrl, cred) {
    try {
      const url = new URL(repoUrl);
      if (cred.type === 'username-password') {
        if (cred.password && cred.password.startsWith('glpat-')) {
          url.username = 'oauth2';
          url.password = cred.password;
        } else if (cred.password && (cred.password.startsWith('ghp_') || cred.password.startsWith('github_pat_'))) {
          url.username = 'x-access-token';
          url.password = cred.password;
        } else {
          url.username = encodeURIComponent(cred.username || '');
          url.password = cred.password || '';
        }
      } else if (cred.type === 'token') {
        if (repoUrl.includes('github.com')) {
          url.username = 'x-access-token';
          url.password = cred.token || '';
        } else if (repoUrl.includes('gitlab.com')) {
          url.username = 'oauth2';
          url.password = cred.token || '';
        } else if (repoUrl.includes('bitbucket.org')) {
          url.username = 'x-token-auth';
          url.password = cred.token || '';
        } else {
          url.username = 'token';
          url.password = cred.token || '';
        }
      }
      return url.toString();
    } catch {
      return repoUrl;
    }
  }

  _getWorkDir(repoUrl) {
    if (!repoUrl) return this.workspaceDir;
    const hash = this._hashString(repoUrl.replace(/[^a-zA-Z0-9]/g, ''));
    return path.join(this.workspaceDir, hash);
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async _clone(buildId, url, branch, targetDir, credentialId) {
    const emit = (level, message) => {
      if (this.wsManager && buildId) {
        this.wsManager.broadcast({ type: 'build:log', buildId, log: { timestamp: new Date().toISOString(), level, message } });
      }
    };

    return new Promise((resolve) => {
      emit('info', `📥 Cloning repository...`);
      emit('info', `   URL: ${this._maskUrl(url)}`);
      emit('info', `   Branch: ${branch}`);

      const args = ['clone', '--branch', branch, '--single-branch', '--depth', '1'];
      
      if (credentialId) {
        const cred = Credential.getRaw(credentialId);
        if (cred && cred.type === 'ssh-key') {
          args.push('-c', 'core.sshCommand=strictHostKeyChecking=no');
        }
      }

      const cmd = `git ${args.join(' ')} "${url}" "${targetDir}"`;

      exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          emit('error', `❌ Git clone failed: ${error.message}`);
          resolve({ success: false, error: error.message });
        } else {
          emit('success', `✅ Repository cloned successfully`);
          resolve({ success: true, workDir: targetDir });
        }
      });
    });
  }

  async _pull(buildId, workDir, branch, authUrl, credentialId) {
    const emit = (level, message) => {
      if (this.wsManager && buildId) {
        this.wsManager.broadcast({ type: 'build:log', buildId, log: { timestamp: new Date().toISOString(), level, message } });
      }
    };

    return new Promise((resolve) => {
      emit('info', `🔄 Pulling latest changes...`);

      const cmds = [
        `git -C "${workDir}" fetch origin`,
        `git -C "${workDir}" checkout ${branch}`,
        `git -C "${workDir}" pull ${authUrl.includes('@') ? authUrl : ''} origin ${branch}`
      ];

      const fullCmd = cmds.join(' && ');
      exec(fullCmd, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          emit('warn', `⚠️ Git pull failed: ${error.message}`);
          emit('info', `   Using existing repository files`);
          resolve({ success: true, workDir, warning: error.message });
        } else {
          emit('success', `✅ Repository updated successfully`);
          resolve({ success: true, workDir });
        }
      });
    });
  }

  _maskUrl(url) {
    if (!url) return '';
    return url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  }

  async checkoutCommit(buildId, workDir, commit) {
    if (!commit || !workDir) return { success: true };

    const emit = (level, message) => {
      if (this.wsManager && buildId) {
        this.wsManager.broadcast({ type: 'build:log', buildId, log: { timestamp: new Date().toISOString(), level, message } });
      }
    };

    return new Promise((resolve) => {
      emit('info', `📌 Checking out commit: ${commit.substring(0, 7)}`);
      exec(`git -C "${workDir}" checkout ${commit}`, { timeout: 30000 }, (error) => {
        if (error) {
          emit('warn', `⚠️ Checkout failed: ${error.message}`);
          resolve({ success: false, error: error.message });
        } else {
          emit('success', `✅ Checked out ${commit.substring(0, 7)}`);
          resolve({ success: true });
        }
      });
    });
  }

  getWorkspaceDir() {
    return this.workspaceDir;
  }

  async getRemoteCommit(repoUrl, branch, credentialId) {
    if (!repoUrl) return null;

    const isSSH = repoUrl.startsWith('git@') || repoUrl.includes(':');
    let authUrl = repoUrl;

    if (credentialId && !isSSH) {
      const cred = Credential.getRaw(credentialId);
      if (cred) {
        authUrl = this._buildAuthUrl(repoUrl, cred);
      }
    }

    return new Promise((resolve) => {
      const cmd = `git ls-remote ${authUrl} refs/heads/${branch}`;
      exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[GitService] Failed to get remote commit for ${repoUrl}: ${error.message}`);
          resolve(null);
        } else {
          const lines = stdout.trim().split('\n');
          for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length === 2 && parts[1] === `refs/heads/${branch}`) {
              resolve(parts[0]);
              return;
            }
          }
          resolve(null);
        }
      });
    });
  }

  async getLocalCommit(workDir, branch) {
    if (!workDir || !fs.existsSync(path.join(workDir, '.git'))) return null;

    return new Promise((resolve) => {
      exec(`git -C "${workDir}" rev-parse refs/heads/${branch}`, { timeout: 10000 }, (error, stdout) => {
        if (error) {
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  cleanup(ageMs = 24 * 60 * 60 * 1000) {
    try {
      const files = fs.readdirSync(this.workspaceDir);
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(this.workspaceDir, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > ageMs) {
          fs.rmSync(filePath, { recursive: true, force: true });
        }
      }
    } catch (err) {
      console.error('[GitService] Cleanup error:', err.message);
    }
  }
}

module.exports = GitService;