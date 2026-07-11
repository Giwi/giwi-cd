import { Pipeline } from '../models/Pipeline';
import { Build } from '../models/Build';
import GitService from './GitService';
import wsManager from './WebSocketManager';
import { db } from '../config/database';
import logger from '../config/logger';
import type { Pipeline as IPipeline, Build as IBuild } from '../types/index';

interface BuildExecutor {
  execute: (build: IBuild, pipeline: IPipeline) => Promise<void>;
}

class PollingService {
  private buildExecutor: BuildExecutor | undefined;
  private gitService: GitService;
  private intervalId: NodeJS.Timeout | null;
  private isRunning: boolean;
  private defaultInterval: number;

  constructor(buildExecutor?: BuildExecutor) {
    this.buildExecutor = buildExecutor;
    this.gitService = new GitService(wsManager);
    this.intervalId = null;
    this.isRunning = false;
    this.defaultInterval = 60;
  }

  getInterval(): number {
    const settings = db.get('settings').value() as { pollingInterval?: number } | undefined;
    return settings?.pollingInterval || this.defaultInterval;
  }

  start(): void {
    if (this.intervalId) {
      logger.warn('[PollingService] Polling service already running');
      return;
    }

    logger.info('[PollingService] Starting polling service...');
    this.poll();

    const interval = this.getInterval();
    this.intervalId = setInterval(() => {
      this.poll();
    }, interval * 1000);

    logger.info(`[PollingService] Polling service started (interval: ${interval}s)`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[PollingService] Polling service stopped');
    }
  }

  async poll(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[PollingService] Poll already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const pipelines = Pipeline.getPushTriggerPipelines();
      logger.info(`[PollingService] Checking ${pipelines.length} pipeline(s) for updates...`);

      for (const pipeline of pipelines) {
        await this.checkPipeline(pipeline);
      }

      const elapsed = Date.now() - startTime;
      logger.info(`[PollingService] Poll completed in ${elapsed}ms`);
    } catch (err) {
      logger.error(`[PollingService] Poll error: ${(err as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }

  async checkPipeline(pipeline: IPipeline): Promise<void> {
    try {
      const { id, name, repositoryUrl, branch, credentialId, lastCommit } = pipeline;

      const currentCommit = await this.gitService.getRemoteCommit(repositoryUrl as string, branch as string, credentialId);

      if (!currentCommit) {
        logger.warn(`[PollingService] Could not fetch commit for pipeline "${name}"`);
        return;
      }

      if (lastCommit && lastCommit === currentCommit) {
        logger.info(`[PollingService] No new commits for pipeline "${name}" (${branch})`);
        return;
      }

      if (lastCommit) {
        logger.info(`[PollingService] New commit detected for pipeline "${name}": ${currentCommit.substring(0, 7)}`);
      }

      const build = Build.create({
        pipelineId: id,
        pipelineName: name,
        branch: branch as string,
        commit: currentCommit,
        commitMessage: 'Commit detected by polling',
        triggeredBy: 'polling'
      });

      Pipeline.updateLastCommit(id, currentCommit);

      if (this.buildExecutor) {
        this.buildExecutor.execute(build, pipeline).catch(err => {
          logger.error(`[PollingService] Build execution error for pipeline "${name}": ${(err as Error).message}`);
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

      logger.info(`[PollingService] Build triggered for pipeline "${name}", build #${build.id}`);
    } catch (err) {
      logger.error(`[PollingService] Error checking pipeline "${pipeline.name}": ${(err as Error).message}`);
    }
  }

  async checkPipelineNow(pipelineId: string): Promise<void> {
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

export default PollingService;
