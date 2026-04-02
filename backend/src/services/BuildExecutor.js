const { exec } = require('child_process');
const { EventEmitter } = require('events');
const Build = require('../models/Build');
const Pipeline = require('../models/Pipeline');
const Credential = require('../models/Credential');
const GitService = require('./GitService');
const NotificationService = require('./NotificationService');

class BuildExecutor extends EventEmitter {
  constructor(wsManager) {
    super();
    this.wsManager = wsManager;
    this.runningBuilds = new Map();
    this.gitService = new GitService(wsManager);
    this.notificationService = new NotificationService(wsManager);
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
    this.wsManager.broadcast({ type: 'build:start', buildId: build.id, pipelineId: pipeline.id });
    this._emit(build.id, 'info', `🚀 Starting build #${build.number} for pipeline: ${pipeline.name}`);
    this._emit(build.id, 'info', `📌 Branch: ${build.branch}`);
    this._emit(build.id, 'info', `⏱️ Started at: ${new Date().toLocaleString()}`);

    if (pipeline.repositoryUrl) {
      const branch = build.branch || pipeline.branch;
      this._emit(build.id, 'info', `📦 Checking out branch: ${branch}`);
      const cloneResult = await this.gitService.cloneOrPull(
        build.id,
        pipeline.repositoryUrl,
        branch,
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
        this._emit(build.id, 'info', `🏷️ Checking out commit: ${build.commit.substring(0, 7)}`);
        await this.gitService.checkoutCommit(build.id, workDir, build.commit);
      } else {
        this._emit(build.id, 'info', `✅ Branch ${branch} checked out`);
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
      const duration = this._getDuration(build.id);
      this._emit(build.id, allSuccess ? 'info' : 'error',
        `\n${allSuccess ? '🎉 Build SUCCESS' : '💥 Build FAILED'} - Duration: ${duration}`);

      Build.updateStatus(build.id, finalStatus);
      Pipeline.updateStatus(pipeline.id, 'inactive', finalStatus);

      const keepBuilds = pipeline.keepBuilds || 10;
      Build.cleanOldBuilds(pipeline.id, keepBuilds);

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
    for (let sIdx = 0; sIdx < steps.length; sIdx++) {
      const step = steps[sIdx];
      if (step.type === 'notification') {
        const currentBuild = Build.findById(buildId);
        try {
          await this.notificationService.send(buildId, step, currentBuild, pipeline);
        } catch (err) {
          this._emit(buildId, 'error', `  ❌ Notification error: ${err.message}`);
        }
      } else {
        const interpolatedCommand = this._interpolateCredentials(step.command, pipeline);
        this._emit(buildId, 'info', `  ▶ Step: ${step.name || interpolatedCommand}`);
        const stepWorkingDir = step.workingDir || workDir;
        const success = await this._runCommand(buildId, interpolatedCommand, stepWorkingDir, pipeline);
        if (!success && step.continueOnError !== true) {
          return false;
        }
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

  _getDuration(buildId) {
    const build = Build.findById(buildId);
    if (!build?.startedAt) return 'N/A';
    const endTime = build.finishedAt || new Date().toISOString();
    const seconds = Math.floor((new Date(endTime) - new Date(build.startedAt)) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
}

module.exports = BuildExecutor;
