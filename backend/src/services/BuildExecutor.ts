import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { Build } from '../models/Build';
import { Pipeline } from '../models/Pipeline';
import type { Pipeline as IPipeline, Build as IBuild, Stage, LogEntry } from '../types/index';

interface WSMessage {
  type: string;
  buildId?: string;
  pipelineId?: string;
  stageIndex?: number;
  stageName?: string;
  status?: string;
  log?: LogEntry;
  [key: string]: unknown;
}

interface WSManager {
  broadcast: (data: WSMessage) => void;
}

interface RunningBuild {
  build: IBuild;
  pipeline: IPipeline;
  process: null;
}

class BuildExecutor extends EventEmitter {
  private wsManager: WSManager;
  private runningBuilds: Map<string, RunningBuild>;
  private stageWorkers: Map<string, Worker>;
  public gitService: {
    cloneOrPull: (buildId: string, repoUrl: string, branch: string, credentialId: string | null) => Promise<{ success: boolean; workDir: string }>;
    getWorkspaceDir: () => string;
    getLastCommitMessage: (workDir: string) => Promise<string | null>;
    checkoutCommit: (buildId: string, workDir: string, commit: string) => Promise<{ success: boolean }>;
    _workDir?: string;
  };

  constructor(wsManager: WSManager) {
    super();
    this.wsManager = wsManager;
    this.runningBuilds = new Map();
    this.stageWorkers = new Map();
    const GitService = require('./GitService').default;
    this.gitService = new GitService(this.wsManager);
  }

  async execute(build: IBuild, pipeline: IPipeline): Promise<void> {
    if (this.runningBuilds.has(build.id)) {
      throw new Error('Build already running');
    }

    this.runningBuilds.set(build.id, { build, pipeline, process: null });
    Pipeline.updateStatus(pipeline.id, 'running');
    Build.updateStatus(build.id, 'running');
    this.wsManager.broadcast({ type: 'build:start', buildId: build.id, pipelineId: pipeline.id });
    this._emit(build.id, 'info', `🚀 Starting build #${build.number} for pipeline: ${pipeline.name}`);
    this._emit(build.id, 'info', `📌 Branch: ${build.branch}`);
    this._emit(build.id, 'info', `⏱️ Started at: ${new Date().toLocaleString()}`);

    const workDir = await this._prepareWorkspace(build, pipeline);

    try {
      const result = await this._executeStages(build, pipeline, workDir);
      await this._finalizeBuild(build, pipeline, result, workDir);
    } catch (err) {
      this._emit(build.id, 'error', `💥 Build error: ${(err as Error).message}`);
      Build.updateStatus(build.id, 'error');
      Pipeline.updateStatus(pipeline.id, 'inactive', 'error');
    } finally {
      this.runningBuilds.delete(build.id);
    }
  }

  private async _prepareWorkspace(build: IBuild, pipeline: IPipeline): Promise<string | null> {
    if (!pipeline.repositoryUrl) {
      return null;
    }

    const branch = build.branch || pipeline.branch;
    this._emit(build.id, 'info', `📦 Checking out branch: ${branch}`);

    const GitService = require('./GitService.js').default;
    const gitService = new GitService(this.wsManager);

    const cloneResult = await gitService.cloneOrPull(
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
      this._emit(build.id, 'info', `🏷️ Checking out commit: ${(build.commit as string).substring(0, 7)}`);
      await gitService.checkoutCommit(build.id, cloneResult.workDir, build.commit as string);
    } else {
      this._emit(build.id, 'info', `✅ Branch ${branch} checked out`);
    }

    const commitMessage = await gitService.getLastCommitMessage(cloneResult.workDir);
    if (commitMessage) {
      Build.update(build.id, { commitMessage });
    }

    return cloneResult.workDir;
  }

  private async _executeStages(build: IBuild, pipeline: IPipeline, workDir: string | null): Promise<boolean> {
    const stages = (pipeline.stages as Stage[]) || [];
    let allSuccess = true;
    const stageResults: string[] = [];

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

  private _executeStageInWorker(buildId: string, stage: Stage, pipeline: IPipeline, workDir: string | null): Promise<boolean> {
    return new Promise((resolve) => {
      const worker = new Worker(path.join(__dirname, 'stageWorker.js'), {
        workerData: { buildId, stage, pipeline, workDir }
      });

      this.stageWorkers.set(buildId, worker);

      worker.on('message', (msg: { type: string; buildId: string; level: string; message: string; success: boolean; [key: string]: unknown }) => {
        if (msg.type === 'log') {
          this._emit(msg.buildId, msg.level, msg.message);
        } else if (msg.type === 'stageStatus') {
          Build.update(msg.buildId, { stages: Build.findById(msg.buildId)?.stages });
        } else if (msg.type === 'broadcast') {
          this.wsManager.broadcast(msg as WSMessage);
        } else if (msg.type === 'complete') {
          this.stageWorkers.delete(msg.buildId);
          resolve(msg.success);
        } else if (msg.type === 'error') {
          this.stageWorkers.delete(msg.buildId);
          this._emit(msg.buildId, 'error', `💥 Stage worker error: ${msg.message}`);
          resolve(false);
        }
      });

      worker.on('error', (err: Error) => {
        this.stageWorkers.delete(buildId);
        this._emit(buildId, 'error', `💥 Stage worker error: ${err.message}`);
        resolve(false);
      });

      worker.on('exit', (code: number) => {
        this.stageWorkers.delete(buildId);
        if (code !== 0) {
          this._emit(buildId, 'error', `💥 Stage worker exited with code ${code}`);
          resolve(false);
        }
      });
    });
  }

  private _updateStageStatus(buildId: string, stages: Stage[], currentIndex: number, stageResults: string[]): void {
    Build.update(buildId, {
      stages: stages.map((s, idx) => ({
        ...s,
        status: idx < stageResults.length ? stageResults[idx] :
                idx === currentIndex ? 'running' : 'pending'
      }))
    });
  }

  private async _finalizeBuild(build: IBuild, pipeline: IPipeline, allSuccess: boolean, workDir: string | null): Promise<void> {
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

  private async _sendErrorNotification(build: IBuild, pipeline: IPipeline, duration: string): Promise<void> {
    const NotificationService = require('./NotificationService.js').default;
    const notifService = new NotificationService(this.wsManager);

    const step = {
      provider: pipeline.errorNotification!.provider,
      credentialId: pipeline.errorNotification!.credentialId,
      channel: pipeline.errorNotification!.channel,
      message: pipeline.errorNotification!.message
    };

    try {
      await notifService.send(build.id, step, build, pipeline);
      this._emit(build.id, 'info', '  📧 Error notification sent');
    } catch (err) {
      this._emit(build.id, 'error', `  ❌ Failed to send error notification: ${(err as Error).message}`);
    }
  }

  private async _collectArtifacts(build: IBuild, pipeline: IPipeline, workDir: string): Promise<void> {
    const ArtifactStorage = require('./ArtifactStorage.js').default;
    const artifactStorage = new ArtifactStorage();
    const files: { name: string; path: string }[] = [];

    for (const pattern of pipeline.artifactPaths!) {
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

  private _matchGlob(baseDir: string, pattern: string): string[] {
    const results: string[] = [];
    const normalizedPattern = pattern.replace(/\\/g, '/');
    const parts = normalizedPattern.split('/').filter(Boolean);

    this._walkDir(baseDir, baseDir, parts, results);

    return results;
  }

  private _walkDir(baseDir: string, currentDir: string, patternParts: string[], results: string[]): void {
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

  private _collectAllFiles(baseDir: string, currentDir: string, results: string[]): void {
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

  private _matchesPattern(name: string, pattern: string): boolean {
    if (pattern === '*' || pattern === '**') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      return regex.test(name);
    }
    return name === pattern;
  }

  private _emit(buildId: string, level: string, message: string): void {
    const log = Build.addLog(buildId, { level, message });
    if (log) {
      this.wsManager.broadcast({ type: 'build:log', buildId, log });
    }
  }

  private _getDuration(buildId: string): string {
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

  cancel(buildId: string): boolean {
    const running = this.runningBuilds.get(buildId);
    if (running) {
      this._terminateWorker(buildId);
      this.runningBuilds.delete(buildId);
      Build.updateStatus(buildId, 'cancelled');
      this._emit(buildId, 'warn', '⚠️ Build cancelled by user');
      this.wsManager.broadcast({ type: 'build:cancelled', buildId });
      return true;
    }
    return false;
  }

  private _terminateWorker(buildId: string): void {
    const worker = this.stageWorkers.get(buildId);
    if (worker) {
      worker.terminate().catch(() => {});
      this.stageWorkers.delete(buildId);
      this._emit(buildId, 'warn', '⚠️ Stage worker terminated');
    }
  }

  terminateAll(): void {
    for (const buildId of this.stageWorkers.keys()) {
      this._terminateWorker(buildId);
    }
    for (const buildId of this.runningBuilds.keys()) {
      this.runningBuilds.delete(buildId);
      Build.updateStatus(buildId, 'cancelled');
    }
  }

  getRunningBuilds(): string[] {
    return Array.from(this.runningBuilds.keys());
  }
}

export default BuildExecutor;
