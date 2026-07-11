import * as cron from 'node-cron';
import { Pipeline } from '../models/Pipeline';
import { Build } from '../models/Build';
import logger from '../config/logger';
import type BuildExecutor from './BuildExecutor';
import type { Pipeline as IPipeline } from '../types';

/**
 * Manages cron-based scheduled pipeline execution.
 *
 * On startup, loads all pipelines with a `triggers.schedule` cron expression
 * and registers a node-cron job for each. When a cron fires, the pipeline
 * is re-fetched from the DB (to pick up config changes) and a build is
 * created and executed directly via `BuildExecutor`.
 *
 * Note: Scheduled builds bypass `BuildRunner` and its queue — they call
 * `executor.execute()` directly, so there is no concurrency limiting
 * for scheduled runs.
 *
 * All cron jobs run in UTC timezone.
 */
class ScheduleService {
  /** Active cron jobs keyed by pipeline ID. */
  readonly jobs: Map<string, cron.ScheduledTask> = new Map();
  get jobCount(): number { return this.jobs.size; }
  private executor: BuildExecutor | null = null;

  setExecutor(executor: BuildExecutor): void {
    this.executor = executor;
  }

  /** Register cron jobs for all enabled pipelines with a schedule trigger. */
  start(): void {
    const pipelines = Pipeline.getScheduledPipelines();
    for (const pipeline of pipelines) {
      this.schedulePipeline(pipeline);
    }
    logger.info(`[SCHEDULER] Loaded ${this.jobs.size} scheduled pipeline(s)`);
  }

  /** Stop all active cron jobs (called during graceful shutdown). */
  stop(): void {
    for (const [id, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    logger.info('[SCHEDULER] All cron jobs stopped');
  }

  /** Re-register a single pipeline's cron job (call after pipeline config changes). */
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

  /**
   * Register a cron job for a single pipeline.
   *
   * When the cron fires:
   * 1. Re-fetches the pipeline from DB (picks up branch/stage changes)
   * 2. Creates a Build with status 'pending' and stage statuses reset
   * 3. Calls `executor.execute(build, pipeline)` directly
   *
   * Difference from manual trigger route:
   * - No `commit` field on the build (manual can pass a specific commit SHA)
   * - No `build:created` WebSocket broadcast
   * - Executes synchronously in the cron callback (manual wraps in setImmediate)
   * - Pipeline is re-fetched; manual uses the pipeline from the request context
   */
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
