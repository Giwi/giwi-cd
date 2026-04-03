const BuildExecutor = require('./BuildExecutor');
const BuildQueue = require('./BuildQueue');
const db = require('../config/database');

class BuildRunner {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.executor = new BuildExecutor(wsManager);
    this.queue = new BuildQueue(3);
  }

  async execute(build, pipeline) {
    const result = this.queue.enqueue(build.id, build, pipeline, this.executor);
    
    if (result.queued) {
      this.wsManager.broadcast({ 
        type: 'build:queued', 
        buildId: build.id, 
        pipelineId: pipeline.id,
        position: result.position 
      });
    }
    
    return result;
  }

  cancel(buildId) {
    const cancelled = this.executor.cancel(buildId);
    if (!cancelled) {
      return this.queue.cancel(buildId);
    }
    return cancelled;
  }

  getRunningBuilds() {
    return this.executor.getRunningBuilds();
  }

  getQueueStatus() {
    return this.queue.getQueueStatus();
  }

  setMaxConcurrent(max) {
    this.queue.setMaxConcurrent(max);
  }

  getMaxConcurrent() {
    return this.queue.getMaxConcurrent();
  }
}

module.exports = BuildRunner;
