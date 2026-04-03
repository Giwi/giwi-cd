const { EventEmitter } = require('events');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const Build = require('../models/Build');
const Pipeline = require('../models/Pipeline');
const GitService = require('./GitService');
const CommandExecutor = require('./CommandExecutor');
const StageRunner = require('./StageRunner');
const ArtifactStorage = require('./ArtifactStorage');

class BuildExecutor extends EventEmitter {
  constructor(wsManager) {
    super();
    this.wsManager = wsManager;
    this.runningBuilds = new Map();
    this.gitService = new GitService(wsManager);
    this.commandExecutor = new CommandExecutor(this._emit.bind(this));
    this.stageRunner = new StageRunner(wsManager, this.commandExecutor);
    this.stageWorkers = new Map();
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

    workDir = await this._prepareWorkspace(build, pipeline);

    try {
      const result = await this._executeStages(build, pipeline, workDir);
      await this._finalizeBuild(build, pipeline, result, workDir);
    } catch (err) {
      this._emit(build.id, 'error', `💥 Build error: ${err.message}`);
      Build.updateStatus(build.id, 'error');
      Pipeline.updateStatus(pipeline.id, 'inactive', 'error');
    } finally {
      this.runningBuilds.delete(build.id);
    }
  }

  async _prepareWorkspace(build, pipeline) {
    if (!pipeline.repositoryUrl) {
      return this.gitService.getWorkspaceDir();
    }

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
      throw new Error('Clone failed');
    }

    this._emit(build.id, 'info', `📁 Working directory: ${cloneResult.workDir}`);

    if (build.commit) {
      this._emit(build.id, 'info', `🏷️ Checking out commit: ${build.commit.substring(0, 7)}`);
      await this.gitService.checkoutCommit(build.id, cloneResult.workDir, build.commit);
    } else {
      this._emit(build.id, 'info', `✅ Branch ${branch} checked out`);
    }

    const commitMessage = await this.gitService.getLastCommitMessage(cloneResult.workDir);
    if (commitMessage) {
      Build.update(build.id, { commitMessage });
    }

    return cloneResult.workDir;
  }

  async _executeStages(build, pipeline, workDir) {
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
      this._updateStageStatus(build.id, stages, i, stageResults);

      this.wsManager.broadcast({ type: 'build:stage', buildId: build.id, stageIndex: i, stageName: stage.name });

      const stageSuccess = await this._executeStageInWorker(build.id, stage, pipeline, workDir);
      stageResults.push(stageSuccess ? 'success' : 'failed');

      this._updateStageStatus(build.id, stages, i, stageResults);

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

    return allSuccess;
  }

  _executeStageInWorker(buildId, stage, pipeline, workDir) {
    return new Promise((resolve) => {
      const worker = new Worker(path.join(__dirname, 'stageWorker.js'), {
        workerData: { buildId, stage, pipeline, workDir }
      });

      this.stageWorkers.set(buildId, worker);

      worker.on('message', (msg) => {
        if (msg.type === 'log') {
          this._emit(msg.buildId, msg.level, msg.message);
        } else if (msg.type === 'stageStatus') {
          Build.update(msg.buildId, { stages: Build.findById(msg.buildId)?.stages });
        } else if (msg.type === 'broadcast') {
          this.wsManager.broadcast(msg);
        } else if (msg.type === 'complete') {
          this.stageWorkers.delete(msg.buildId);
          resolve(msg.success);
        } else if (msg.type === 'error') {
          this.stageWorkers.delete(msg.buildId);
          this._emit(msg.buildId, 'error', `💥 Stage worker error: ${msg.message}`);
          resolve(false);
        }
      });

      worker.on('error', (err) => {
        this.stageWorkers.delete(buildId);
        this._emit(buildId, 'error', `💥 Stage worker error: ${err.message}`);
        resolve(false);
      });

      worker.on('exit', (code) => {
        this.stageWorkers.delete(buildId);
        if (code !== 0) {
          this._emit(buildId, 'error', `💥 Stage worker exited with code ${code}`);
          resolve(false);
        }
      });
    });
  }

  _updateStageStatus(buildId, stages, currentIndex, stageResults) {
    Build.update(buildId, {
      stages: stages.map((s, idx) => ({
        ...s,
        status: idx < stageResults.length ? stageResults[idx] :
                idx === currentIndex ? 'running' : 'pending'
      }))
    });
  }

  async _finalizeBuild(build, pipeline, allSuccess, workDir) {
    const finalStatus = allSuccess ? 'success' : 'failed';
    const duration = this._getDuration(build.id);
    this._emit(build.id, allSuccess ? 'info' : 'error',
      `\n${allSuccess ? '🎉 Build SUCCESS' : '💥 Build FAILED'} - Duration: ${duration}`);

    if (allSuccess && pipeline.artifactPaths?.length > 0 && workDir) {
      await this._collectArtifacts(build, pipeline, workDir);
    }

    if (!allSuccess && pipeline.errorNotification?.provider) {
      await this._sendErrorNotification(build, pipeline, duration);
    }

    Build.updateStatus(build.id, finalStatus);
    Pipeline.updateStatus(pipeline.id, 'inactive', finalStatus);

    const keepBuilds = pipeline.keepBuilds || 10;
    Build.cleanOldBuilds(pipeline.id, keepBuilds);

    this.wsManager.broadcast({ type: 'build:complete', buildId: build.id, status: finalStatus });
  }

  async _sendErrorNotification(build, pipeline, duration) {
    const NotificationService = require('./NotificationService');
    const notifService = new NotificationService(this.wsManager);

    const step = {
      provider: pipeline.errorNotification.provider,
      credentialId: pipeline.errorNotification.credentialId,
      channel: pipeline.errorNotification.channel,
      message: pipeline.errorNotification.message
    };

    try {
      await notifService.send(build.id, step, build, pipeline);
      this._emit(build.id, 'info', '  📧 Error notification sent');
    } catch (err) {
      this._emit(build.id, 'error', `  ❌ Failed to send error notification: ${err.message}`);
    }
  }

  async _collectArtifacts(build, pipeline, workDir) {
    const artifactStorage = new ArtifactStorage();
    const files = [];

    for (const pattern of pipeline.artifactPaths) {
      const matched = this._matchGlob(workDir, pattern);
      if (matched.length === 0) {
        this._emit(build.id, 'warn', `  ⚠️ No files matched artifact pattern: ${pattern}`);
        continue;
      }
      for (const filePath of matched) {
        const relativePath = path.relative(workDir, filePath);
        this._emit(build.id, 'info', `  📦 Collecting artifact: ${relativePath}`);
        files.push({
          name: relativePath.replace(/\\/g, '/'),
          path: filePath
        });
      }
    }

    if (files.length > 0) {
      const stored = await artifactStorage.store(pipeline.id, build.id, files);
      this._emit(build.id, 'info', `  ✅ Collected ${stored.length} artifact(s)`);
    }
  }

  _matchGlob(baseDir, pattern) {
    const results = [];
    const normalizedPattern = pattern.replace(/\\/g, '/');
    const parts = normalizedPattern.split('/').filter(Boolean);

    this._walkDir(baseDir, baseDir, parts, results);

    return results;
  }

  _walkDir(baseDir, currentDir, patternParts, results) {
    if (patternParts.length === 0) {
      return;
    }

    const [current, ...rest] = patternParts;

    if (current === '**') {
      if (rest.length === 0) {
        this._collectAllFiles(baseDir, currentDir, results);
        return;
      }

      this._walkDir(baseDir, currentDir, rest, results);

      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            const subDir = path.join(currentDir, entry.name);
            this._walkDir(baseDir, subDir, patternParts, results);
          }
        }
      } catch {
        return;
      }
      return;
    }

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (this._matchesPattern(entry.name, current)) {
          const fullPath = path.join(currentDir, entry.name);
          if (rest.length === 0) {
            if (entry.isFile()) {
              results.push(fullPath);
            }
          } else if (entry.isDirectory()) {
            this._walkDir(baseDir, fullPath, rest, results);
          }
        }
      }
    } catch {
      return;
    }
  }

  _collectAllFiles(baseDir, currentDir, results) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          this._collectAllFiles(baseDir, path.join(currentDir, entry.name), results);
        } else if (entry.isFile()) {
          results.push(path.join(currentDir, entry.name));
        }
      }
    } catch {
      return;
    }
  }

  _matchesPattern(name, pattern) {
    if (pattern === '*' || pattern === '**') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return regex.test(name);
    }
    return name === pattern;
  }

  _emit(buildId, level, message) {
    const log = Build.addLog(buildId, { level, message });
    if (log) {
      this.wsManager.broadcast({ type: 'build:log', buildId, log });
    }
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
