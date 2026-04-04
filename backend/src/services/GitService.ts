import { exec, ExecException } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { Credential } from '../models/Credential';
import { retry } from '../utils/retry';
import logger from '../config/logger';
import type { Credential as ICredential } from '../types/index';

interface WSManager {
  broadcast: (data: Record<string, unknown>) => void;
}

interface CloneResult {
  success: boolean;
  error?: string;
  workDir?: string;
  message?: string;
  warning?: string;
}

class GitService {
  private wsManager: WSManager;
  private workspaceDir: string;

  constructor(wsManager: WSManager) {
    this.wsManager = wsManager;
    this.workspaceDir = path.join(os.tmpdir(), 'giwicd-workspace');
    if (!fs.existsSync(this.workspaceDir)) {
      fs.mkdirSync(this.workspaceDir, { recursive: true });
    }
  }

  async cloneOrPull(buildId: string, repoUrl: string, branch: string, credentialId?: string | null): Promise<CloneResult> {
    if (!repoUrl) {
      return { success: true, message: 'No repository URL configured, skipping clone' };
    }

    const emit = (level: string, message: string) => {
      if (this.wsManager && buildId) {
        this.wsManager.broadcast({ type: 'build:log', buildId, log: { timestamp: new Date().toISOString(), level, message } });
      }
    };

    const workDir = this._getWorkDir(repoUrl);
    const isSSH = repoUrl.startsWith('git@');
    let authUrl = repoUrl;

    if (credentialId && !isSSH) {
      const cred = Credential.getRaw(credentialId);
      if (cred) {
        authUrl = this._buildAuthUrl(repoUrl, cred);
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

  private _buildAuthUrl(repoUrl: string, cred: ICredential & { userId: string }): string {
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

  private _getWorkDir(repoUrl: string): string {
    if (!repoUrl) return this.workspaceDir;
    const hash = this._hashString(repoUrl.replace(/[^a-zA-Z0-9]/g, ''));
    return path.join(this.workspaceDir, hash);
  }

  private _hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private async _clone(buildId: string, url: string, branch: string, targetDir: string, credentialId?: string | null): Promise<CloneResult> {
    const emit = (level: string, message: string) => {
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

      exec(cmd, { timeout: 300000 }, (error: ExecException | null, _stdout: string, _stderr: string) => {
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

  private async _pull(buildId: string, workDir: string, branch: string, authUrl: string, _credentialId?: string | null): Promise<CloneResult> {
    const emit = (level: string, message: string) => {
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
      exec(fullCmd, { timeout: 120000 }, (error: ExecException | null, _stdout: string, _stderr: string) => {
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

  private _maskUrl(url: string): string {
    if (!url) return '';
    return url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  }

  async checkoutCommit(buildId: string, workDir: string, commit: string): Promise<{ success: boolean; error?: string }> {
    if (!commit || !workDir) return { success: true };

    const emit = (level: string, message: string) => {
      if (this.wsManager && buildId) {
        this.wsManager.broadcast({ type: 'build:log', buildId, log: { timestamp: new Date().toISOString(), level, message } });
      }
    };

    return new Promise((resolve) => {
      emit('info', `📌 Checking out commit: ${commit.substring(0, 7)}`);
      exec(`git -C "${workDir}" checkout ${commit}`, { timeout: 30000 }, (error: ExecException | null) => {
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

  getWorkspaceDir(): string {
    return this.workspaceDir;
  }

  async getRemoteCommit(repoUrl: string, branch: string, credentialId?: string | null): Promise<string | null> {
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
      exec(cmd, { timeout: 60000 }, (error: ExecException | null, stdout: string) => {
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

  async getLocalCommit(workDir: string, branch: string): Promise<string | null> {
    if (!workDir || !fs.existsSync(path.join(workDir, '.git'))) return null;

    return new Promise((resolve) => {
      exec(`git -C "${workDir}" rev-parse refs/heads/${branch}`, { timeout: 10000 }, (error: ExecException | null, stdout: string) => {
        if (error) {
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async getLastCommitMessage(workDir: string): Promise<string | null> {
    if (!workDir || !fs.existsSync(path.join(workDir, '.git'))) return null;

    return new Promise((resolve) => {
      exec(`git -C "${workDir}" log -1 --format=%s`, { timeout: 10000 }, (error: ExecException | null, stdout: string) => {
        if (error) {
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  cleanup(ageMs = 24 * 60 * 60 * 1000): void {
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
      console.error('[GitService] Cleanup error:', (err as Error).message);
    }
  }
}

export default GitService;
