const Build = require('../models/Build');

class BuildQueue {
  constructor(maxConcurrent = 3) {
    this.queue = [];
    this.running = new Set();
    this.maxConcurrent = maxConcurrent;
    this.processing = false;
  }

  setMaxConcurrent(max) {
    this.maxConcurrent = max;
    this.processQueue();
  }

  getMaxConcurrent() {
    return this.maxConcurrent;
  }

  getRunningCount() {
    return this.running.size;
  }

  getQueueLength() {
    return this.queue.length;
  }

  isFull() {
    return this.running.size >= this.maxConcurrent;
  }

  enqueue(buildId, build, pipeline, executor) {
    if (!this.isFull()) {
      this.running.add(buildId);
      executor.execute(build, pipeline).finally(() => {
        this.running.delete(buildId);
        this.processQueue();
      });
      return { queued: false, position: 0 };
    }

    const position = this.queue.length + 1;
    this.queue.push({ buildId, build, pipeline, executor });
    
    Build.updateStatus(buildId, 'pending');
    
    return { queued: true, position };
  }

  processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (!this.isFull() && this.queue.length > 0) {
      const next = this.queue.shift();
      this.running.add(next.buildId);
      
      next.executor.execute(next.build, next.pipeline).finally(() => {
        this.running.delete(next.buildId);
        this.processQueue();
      });
    }

    this.processing = false;
  }

  cancel(buildId) {
    const queueIndex = this.queue.findIndex(item => item.buildId === buildId);
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1);
      Build.updateStatus(buildId, 'cancelled');
      return true;
    }

    if (this.running.has(buildId)) {
      this.running.delete(buildId);
      return false;
    }

    return false;
  }

  getQueueStatus() {
    return {
      running: Array.from(this.running),
      queued: this.queue.map(item => item.buildId),
      queueLength: this.queue.length,
      runningCount: this.running.size,
      maxConcurrent: this.maxConcurrent,
      availableSlots: Math.max(0, this.maxConcurrent - this.running.size)
    };
  }

  clear() {
    for (const item of this.queue) {
      Build.updateStatus(item.buildId, 'cancelled');
    }
    this.queue = [];
  }
}

module.exports = BuildQueue;
