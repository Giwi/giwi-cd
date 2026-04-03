const { EventEmitter } = require('events');
const Build = require('../models/Build');
const Pipeline = require('../models/Pipeline');
const GitService = require('./GitService');
const CommandExecutor = require('./CommandExecutor');
const StageRunner = require('./StageRunner');

class BuildExecutor extends EventEmitter {
  constructor(wsManager) {
    super();
    this.wsManager = wsManager;
    this.runningBuilds = new Map();
    this.gitService = new GitService(wsManager);
    this.commandExecutor = new CommandExecutor(this._emit.bind(this));
    this.stageRunner = new StageRunner(wsManager, this.commandExecutor);
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
      await this._finalizeBuild(build, pipeline, result);
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

      const stageSuccess = await this.stageRunner.executeStage(build.id, stage, pipeline, workDir, this._emit.bind(this));
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

  _updateStageStatus(buildId, stages, currentIndex, stageResults) {
    Build.update(buildId, {
      stages: stages.map((s, idx) => ({
        ...s,
        status: idx < currentIndex ? stageResults[idx] || 'success' :
                idx === currentIndex ? 'running' : 'pending'
      }))
    });
  }

  async _finalizeBuild(build, pipeline, allSuccess) {
    const finalStatus = allSuccess ? 'success' : 'failed';
    const duration = this._getDuration(build.id);
    this._emit(build.id, allSuccess ? 'info' : 'error',
      `\n${allSuccess ? '🎉 Build SUCCESS' : '💥 Build FAILED'} - Duration: ${duration}`);

    Build.updateStatus(build.id, finalStatus);
    Pipeline.updateStatus(pipeline.id, 'inactive', finalStatus);

    const keepBuilds = pipeline.keepBuilds || 10;
    Build.cleanOldBuilds(pipeline.id, keepBuilds);

    this.wsManager.broadcast({ type: 'build:complete', buildId: build.id, status: finalStatus });
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
