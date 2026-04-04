import { Build } from '../models/Build';
import type { Build as IBuild, Pipeline as IPipeline } from '../types/index';

interface BuildExecutor {
  execute: (build: IBuild, pipeline: IPipeline) => Promise<void>;
}

interface QueueItem {
  buildId: string;
  build: IBuild;
  pipeline: IPipeline;
  executor: BuildExecutor;
}

class BuildQueue {
  private queue: QueueItem[];
  private running: Set<string>;
  private maxConcurrent: number;
  private processing: boolean;

  constructor(maxConcurrent = 3) {
    this.queue = [];
    this.running = new Set();
    this.maxConcurrent = maxConcurrent;
    this.processing = false;
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
    this.processQueue();
  }

  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  getRunningCount(): number {
    return this.running.size;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isFull(): boolean {
    return this.running.size >= this.maxConcurrent;
  }

  enqueue(buildId: string, build: IBuild, pipeline: IPipeline, executor: BuildExecutor): { queued: boolean; position: number } {
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

  processQueue(): void {
    if (this.processing) return;
    this.processing = true;

    while (!this.isFull() && this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.running.add(next.buildId);

      next.executor.execute(next.build, next.pipeline).finally(() => {
        this.running.delete(next.buildId);
        this.processQueue();
      });
    }

    this.processing = false;
  }

  cancel(buildId: string): boolean {
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

  getQueueStatus(): {
    running: string[];
    queued: string[];
    queueLength: number;
    runningCount: number;
    maxConcurrent: number;
    availableSlots: number;
  } {
    return {
      running: Array.from(this.running),
      queued: this.queue.map(item => item.buildId),
      queueLength: this.queue.length,
      runningCount: this.running.size,
      maxConcurrent: this.maxConcurrent,
      availableSlots: Math.max(0, this.maxConcurrent - this.running.size)
    };
  }

  clear(): void {
    for (const item of this.queue) {
      Build.updateStatus(item.buildId, 'cancelled');
    }
    this.queue = [];
  }
}

export default BuildQueue;
