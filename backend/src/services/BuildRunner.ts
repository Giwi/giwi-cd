import type { Build as IBuild, Pipeline as IPipeline } from '../types/index';
import BuildExecutor from './BuildExecutor';
import BuildQueue from './BuildQueue';

interface WSManager {
  broadcast: (data: Record<string, unknown>) => void;
}

class BuildRunner {
  wsManager: WSManager;
  executor: BuildExecutor;
  queue: BuildQueue;

  constructor(wsManager: WSManager) {
    this.wsManager = wsManager;
    this.executor = new BuildExecutor(wsManager);
    this.queue = new BuildQueue(3);
  }

  async execute(build: IBuild, pipeline: IPipeline): Promise<{ queued: boolean; position: number }> {
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

  cancel(buildId: string): boolean {
    const cancelled = this.executor.cancel(buildId);
    if (!cancelled) {
      return this.queue.cancel(buildId);
    }
    return cancelled;
  }

  getRunningBuilds(): string[] {
    return this.executor.getRunningBuilds();
  }

  getQueueStatus(): Record<string, unknown> {
    return this.queue.getQueueStatus();
  }

  setMaxConcurrent(max: number): void {
    this.queue.setMaxConcurrent(max);
  }

  getMaxConcurrent(): number {
    return this.queue.getMaxConcurrent();
  }
}

export default BuildRunner;
