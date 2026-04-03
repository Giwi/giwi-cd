const Pipeline = require('../models/Pipeline');
const Build = require('../models/Build');
const GitService = require('./GitService');
const wsManager = require('./WebSocketManager');
const { db } = require('../config/database');

class PollingService {
  constructor(buildExecutor) {
    this.buildExecutor = buildExecutor;
    this.gitService = new GitService(wsManager);
    this.intervalId = null;
    this.isRunning = false;
    this.defaultInterval = 60;
    this.logger = (level, message) => {
      const prefix = '[PollingService]';
      if (level === 'error') {
        console.error(`${prefix} ${message}`);
      } else if (level === 'warn') {
        console.warn(`${prefix} ${message}`);
      } else {
        console.log(`${prefix} ${message}`);
      }
    };
  }

  getInterval() {
    const settings = db.get('settings').value();
    return settings?.pollingInterval || this.defaultInterval;
  }

  start() {
    if (this.intervalId) {
      this.logger('warn', 'Polling service already running');
      return;
    }

    this.logger('info', 'Starting polling service...');
    this.poll();

    const interval = this.getInterval();
    this.intervalId = setInterval(() => {
      this.poll();
    }, interval * 1000);

    this.logger('info', `Polling service started (interval: ${interval}s)`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger('info', 'Polling service stopped');
    }
  }

  async poll() {
    if (this.isRunning) {
      this.logger('warn', 'Poll already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const pipelines = Pipeline.getPushTriggerPipelines();
      this.logger('info', `Checking ${pipelines.length} pipeline(s) for updates...`);

      for (const pipeline of pipelines) {
        await this.checkPipeline(pipeline);
      }

      const elapsed = Date.now() - startTime;
      this.logger('info', `Poll completed in ${elapsed}ms`);
    } catch (err) {
      this.logger('error', `Poll error: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  async checkPipeline(pipeline) {
    try {
      const { id, name, repositoryUrl, branch, credentialId, lastCommit } = pipeline;
      
      const currentCommit = await this.gitService.getRemoteCommit(repositoryUrl, branch, credentialId);

      if (!currentCommit) {
        this.logger('warn', `Could not fetch commit for pipeline "${name}"`);
        return;
      }

      if (lastCommit && lastCommit === currentCommit) {
        this.logger('info', `No new commits for pipeline "${name}" (${branch})`);
        return;
      }

      if (lastCommit) {
        this.logger('info', `New commit detected for pipeline "${name}": ${currentCommit.substring(0, 7)}`);
      }

      const build = Build.create({
        pipelineId: id,
        pipelineName: name,
        branch: branch,
        commit: currentCommit,
        commitMessage: 'Commit detected by polling',
        triggeredBy: 'polling'
      });

      Pipeline.updateLastCommit(id, currentCommit);

      if (this.buildExecutor) {
        this.buildExecutor.execute(build, pipeline).catch(err => {
          this.logger('error', `Build execution error for pipeline "${name}": ${err.message}`);
        });
      }

      if (wsManager) {
        wsManager.broadcast({
          type: 'polling:triggered',
          pipelineId: id,
          pipelineName: name,
          commit: currentCommit,
          buildId: build.id
        });
      }

      this.logger('info', `Build triggered for pipeline "${name}", build #${build.id}`);
    } catch (err) {
      this.logger('error', `Error checking pipeline "${pipeline.name}": ${err.message}`);
    }
  }

  async checkPipelineNow(pipelineId) {
    const pipeline = Pipeline.findById(pipelineId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }
    if (!pipeline.enabled || !pipeline.triggers?.push) {
      throw new Error('Pipeline does not have push triggers enabled');
    }
    await this.checkPipeline(pipeline);
  }
}

module.exports = PollingService;
