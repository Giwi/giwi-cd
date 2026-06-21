import * as cron from 'node-cron';
import { Pipeline } from '../models/Pipeline';
import { Build } from '../models/Build';
import logger from '../config/logger';
import type BuildExecutor from './BuildExecutor';
import type { Pipeline as IPipeline } from '../types';

class ScheduleService {
  readonly jobs: Map<string, cron.ScheduledTask> = new Map();
  get jobCount(): number { return this.jobs.size; }
  private executor: BuildExecutor | null = null;

  setExecutor(executor: BuildExecutor): void {
    this.executor = executor;
  }

  start(): void {
    const pipelines = Pipeline.getScheduledPipelines();
    for (const pipeline of pipelines) {
      this.schedulePipeline(pipeline);
    }
    logger.info(`[SCHEDULER] Loaded ${this.jobs.size} scheduled pipeline(s)`);
  }

  stop(): void {
    for (const [id, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    logger.info('[SCHEDULER] All cron jobs stopped');
  }

  refreshPipeline(pipelineId: string): void {
    this.unschedulePipeline(pipelineId);

    const pipeline = Pipeline.findById(pipelineId);
    if (pipeline && pipeline.enabled && pipeline.triggers?.schedule) {
      this.schedulePipeline(pipeline);
    }
  }

  removePipeline(pipelineId: string): void {
    this.unschedulePipeline(pipelineId);
  }

  private schedulePipeline(pipeline: IPipeline): void {
    const cronExpr = pipeline.triggers?.schedule;
    if (!cronExpr) return;

    if (!cron.validate(cronExpr)) {
      logger.warn(`[SCHEDULER] Invalid cron expression for pipeline "${pipeline.name}" (${pipeline.id}): ${cronExpr}`);
      return;
    }

    const job = cron.schedule(cronExpr, () => {
      if (!this.executor) return;

      const refreshed = Pipeline.findById(pipeline.id);
      if (!refreshed || !refreshed.enabled) {
        this.unschedulePipeline(pipeline.id);
        return;
      }

      const build = Build.create({
        pipelineId: refreshed.id,
        pipelineName: refreshed.name,
        branch: refreshed.branch,
        commitMessage: `Scheduled build (${cronExpr})`,
        triggeredBy: 'schedule',
        stages: (refreshed.stages || []).map(s => ({ ...s, status: 'pending' as const }))
      });

      logger.info(`[SCHEDULER] Triggering scheduled build for "${refreshed.name}" (build #${build.number})`);
      this.executor.execute(build, refreshed).catch((err: Error) => {
        logger.error(`[SCHEDULER] Build execution error for "${refreshed.name}": ${err.message}`);
      });
    }, {
      timezone: 'UTC'
    });

    this.jobs.set(pipeline.id, job);
    logger.info(`[SCHEDULER] Scheduled pipeline "${pipeline.name}" (${pipeline.id}) with cron "${cronExpr}"`);
  }

  private unschedulePipeline(pipelineId: string): void {
    const existing = this.jobs.get(pipelineId);
    if (existing) {
      existing.stop();
      this.jobs.delete(pipelineId);
    }
  }
}

export default ScheduleService;
