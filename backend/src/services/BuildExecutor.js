const { exec } = require('child_process');
const { EventEmitter } = require('events');
const Build = require('../models/Build');
const Pipeline = require('../models/Pipeline');
const Credential = require('../models/Credential');
const GitService = require('./GitService');

class BuildExecutor extends EventEmitter {
  constructor(wsManager) {
    super();
    this.wsManager = wsManager;
    this.runningBuilds = new Map();
    this.gitService = new GitService(wsManager);
    this.credentialCache = new Map();
  }

  async execute(build, pipeline) {
    if (this.runningBuilds.has(build.id)) {
      throw new Error('Build already running');
    }

    let workDir = null;
    this.runningBuilds.set(build.id, { build, pipeline, process: null });
    Pipeline.updateStatus(pipeline.id, 'running');
    Build.updateStatus(build.id, 'running');
    this._emit(build.id, 'info', `🚀 Starting build #${build.number} for pipeline: ${pipeline.name}`);
    this._emit(build.id, 'info', `📌 Branch: ${build.branch}`);
    this._emit(build.id, 'info', `⏱️ Started at: ${new Date().toLocaleString()}`);

    if (pipeline.repositoryUrl) {
      const cloneResult = await this.gitService.cloneOrPull(
        build.id,
        pipeline.repositoryUrl,
        build.branch || pipeline.branch,
        pipeline.credentialId
      );

      if (!cloneResult.success) {
        this._emit(build.id, 'error', `💥 Failed to clone repository: ${cloneResult.error}`);
        Build.updateStatus(build.id, 'failed');
        Pipeline.updateStatus(pipeline.id, 'inactive', 'failed');
        this.runningBuilds.delete(build.id);
        return;
      }

      workDir = cloneResult.workDir;
      this._emit(build.id, 'info', `📁 Working directory: ${workDir}`);

      if (build.commit) {
        await this.gitService.checkoutCommit(build.id, workDir, build.commit);
      }
    } else {
      workDir = this.gitService.getWorkspaceDir();
    }

    try {
      const stages = pipeline.stages || [];
      let allSuccess = true;
      const stageResults = [];

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const current = this.runningBuilds.get(build.id);
        if (!current) {
          this._emit(build.id, 'warn', '⚠️ Build was cancelled');
          break;
        }

        this._emit(build.id, 'info', `\n━━━ Stage [${i + 1}/${stages.length}]: ${stage.name} ━━━`);
        Build.update(build.id, {
          stages: stages.map((s, idx) => ({
            ...s,
            status: idx < i ? stageResults[idx] || 'success' :
                    idx === i ? 'running' : 'pending'
          }))
        });
        this.wsManager.broadcast({ type: 'build:stage', buildId: build.id, stageIndex: i, stageName: stage.name });

        const stageSuccess = await this._executeStage(build.id, stage, pipeline, workDir);
        stageResults.push(stageSuccess ? 'success' : 'failed');

        Build.update(build.id, {
          stages: stages.map((s, idx) => ({
            ...s,
            status: idx <= i ? stageResults[idx] : 'pending'
          }))
        });

        if (!stageSuccess) {
          allSuccess = false;
          this._emit(build.id, 'error', `❌ Stage "${stage.name}" failed`);
          if (stage.continueOnError !== true) {
            break;
          }
        } else {
          this._emit(build.id, 'info', `✅ Stage "${stage.name}" completed successfully`);
        }
      }

      const finalStatus = allSuccess ? 'success' : 'failed';
      this._emit(build.id, allSuccess ? 'info' : 'error',
        `\n${allSuccess ? '🎉 Build SUCCESS' : '💥 Build FAILED'} - Duration: ${this._getDuration(build.id)}s`);

      Build.updateStatus(build.id, finalStatus);
      Pipeline.updateStatus(pipeline.id, 'inactive', finalStatus);
      this.wsManager.broadcast({ type: 'build:complete', buildId: build.id, status: finalStatus });

    } catch (err) {
      this._emit(build.id, 'error', `💥 Build error: ${err.message}`);
      Build.updateStatus(build.id, 'error');
      Pipeline.updateStatus(pipeline.id, 'inactive', 'error');
    } finally {
      this.runningBuilds.delete(build.id);
    }
  }

  async _executeStage(buildId, stage, pipeline, workDir) {
    const steps = stage.steps || [];
    for (const step of steps) {
      const interpolatedCommand = this._interpolateCredentials(step.command, pipeline);
      this._emit(buildId, 'info', `  ▶ Step: ${step.name || interpolatedCommand}`);
      const stepWorkingDir = step.workingDir || workDir;
      const success = await this._runCommand(buildId, interpolatedCommand, stepWorkingDir, pipeline);
      if (!success && step.continueOnError !== true) {
        return false;
      }
    }
    return true;
  }

  _interpolateCredentials(command, pipeline) {
    if (!command) return command;

    const credPattern = /\$\{CRED:([^}]+)\}/g;
    let result = command;
    let match;

    while ((match = credPattern.exec(command)) !== null) {
      const credName = match[1];
      const credValue = this._getCredentialValue(credName, pipeline);
      if (credValue !== null) {
        result = result.replace(match[0], credValue);
      } else {
        this._emit(pipeline.id, 'warn', `⚠️ Credential "${credName}" not found, keeping placeholder`);
      }
    }

    return result;
  }

  _getCredentialValue(name, pipeline) {
    const cacheKey = `${pipeline.id}:${name}`;
    if (this.credentialCache.has(cacheKey)) {
      return this.credentialCache.get(cacheKey);
    }

    const cred = Credential.findAll().find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!cred) return null;

    let value = null;
    switch (cred.type) {
      case 'username-password':
        value = cred.password || '';
        break;
      case 'token':
        value = cred.token || '';
        break;
      case 'ssh-key':
        value = cred.privateKey || '';
        break;
    }

    this.credentialCache.set(cacheKey, value);
    return value;
  }

  _runCommand(buildId, command, workingDir, pipeline) {
    return new Promise((resolve) => {
      if (!command) {
        resolve(true);
        return;
      }
      const maskedCommand = this._maskCredentials(command);
      this._emit(buildId, 'info', `    $ ${maskedCommand}`);
      
      const execOptions = {
        cwd: workingDir || process.cwd(),
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024
      };
      
      require('child_process').exec(command, execOptions, (error, stdout, stderr) => {
        if (stdout) {
          stdout.split('\n').forEach(line => {
            if (line.trim()) {
              this._emit(buildId, 'info', `    ${line}`);
            }
          });
        }
        if (stderr && stderr.trim()) {
          stderr.split('\n').forEach(line => {
            if (line.trim()) {
              this._emit(buildId, 'error', `    ${line}`);
            }
          });
        }
        
        if (error) {
          this._emit(buildId, 'error', `    ❌ Exit code: ${error.code || 1}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  _maskCredentials(command) {
    if (!command) return command;
    return command.replace(/\$\{CRED:([^}]+)\}/g, '${CRED:$1}');
  }

  _simulateCommand(command) {
    const cmd = command.toLowerCase();
    if (cmd.includes('npm install') || cmd.includes('yarn install')) {
      return { success: true, delay: 1500, lines: ['📦 Installing packages...', '✔ Packages installed'] };
    }
    if (cmd.includes('npm run build') || cmd.includes('ng build')) {
      return { success: true, delay: 2000, lines: ['🔨 Building...', '✔ Build successful', '📁 Output: dist/'] };
    }
    if (cmd.includes('npm test') || cmd.includes('ng test')) {
      return { success: true, delay: 1200, lines: ['🧪 Running tests...', 'PASS: 12 tests', '✔ All tests passed'] };
    }
    if (cmd.includes('docker build')) {
      return { success: true, delay: 2500, lines: ['🐳 Building Docker image...', 'Step 1/8: FROM node:18', '✔ Image built successfully'] };
    }
    if (cmd.includes('docker push')) {
      return { success: true, delay: 1800, lines: ['📤 Pushing image...', '✔ Image pushed to registry'] };
    }
    if (cmd.includes('fail') || cmd.includes('exit 1')) {
      return { success: false, delay: 500, lines: ['❌ Command failed with exit code 1'] };
    }
    return { success: true, delay: 800, lines: [`✔ Command completed: ${command}`] };
  }

  _emit(buildId, level, message) {
    const log = Build.addLog(buildId, { level, message });
    if (log) {
      this.wsManager.broadcast({ type: 'build:log', buildId, log });
    }
  }

  _getDuration(buildId) {
    const build = Build.findById(buildId);
    if (build && build.startedAt) {
      return Math.floor((new Date() - new Date(build.startedAt)) / 1000);
    }
    return 0;
  }

  cancel(buildId) {
    const running = this.runningBuilds.get(buildId);
    if (running) {
      if (running.process) {
        running.process.kill();
      }
      this.runningBuilds.delete(buildId);
      Build.updateStatus(buildId, 'cancelled');
      this._emit(buildId, 'warn', '⚠️ Build cancelled by user');
      this.wsManager.broadcast({ type: 'build:cancelled', buildId });
      return true;
    }
    return false;
  }

  getRunningBuilds() {
    return Array.from(this.runningBuilds.keys());
  }
}

module.exports = BuildExecutor;
