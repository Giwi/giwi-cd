// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4: uuidv4 } = require('uuid');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require('../config/database');
import type { Build as IBuild, Stage, LogEntry } from '../types';

interface BuildData {
  pipelineId: string;
  pipelineName?: string;
  branch?: string;
  commit?: string;
  commitMessage?: string;
  triggeredBy?: string;
  stages?: Stage[];
}

interface BuildFilters {
  pipelineId?: string;
  status?: string;
  limit?: number;
}

interface LogData {
  level?: 'info' | 'warn' | 'error' | 'success';
  message: string;
  stage?: string;
}

export class Build {
  static create(data: BuildData): IBuild {
    const build: IBuild = {
      id: uuidv4(),
      pipelineId: data.pipelineId,
      pipelineName: data.pipelineName || '',
      branch: data.branch || 'main',
      commit: data.commit || null,
      commitMessage: data.commitMessage || '',
      triggeredBy: data.triggeredBy || 'manual',
      status: 'pending',
      stages: data.stages || [],
      logs: [],
      startedAt: null,
      finishedAt: null,
      duration: null,
      number: this.getNextBuildNumber(data.pipelineId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get('builds').push(build).write();
    return build;
  }

  static getNextBuildNumber(pipelineId: string): number {
    const builds = db.get('builds').filter({ pipelineId }).value();
    return builds.length + 1;
  }

  static findAll(filters: BuildFilters = {}): IBuild[] {
    let query = db.get('builds');
    if (filters.pipelineId) {
      query = query.filter({ pipelineId: filters.pipelineId });
    }
    if (filters.status) {
      query = query.filter({ status: filters.status });
    }
    return query.orderBy(['createdAt'], ['desc']).take(filters.limit || 100).value() as IBuild[];
  }

  static findById(id: string): IBuild | undefined {
    const result = db.get('builds').find({ id }).value();
    return result as IBuild | undefined;
  }

  static update(id: string, data: Partial<IBuild>): IBuild | undefined {
    db.get('builds').find({ id }).assign(data).write();
    return this.findById(id);
  }

  static updateStatus(id: string, status: IBuild['status']): IBuild | undefined {
    const update: Partial<IBuild> = { status };
    if (status === 'running') {
      update.startedAt = new Date().toISOString();
    } else if (['success', 'failed', 'cancelled', 'error'].includes(status)) {
      update.finishedAt = new Date().toISOString();
      const build = this.findById(id);
      if (build?.startedAt) {
        const duration = Math.floor(
          (new Date(update.finishedAt!).getTime() - new Date(build.startedAt).getTime()) / 1000
        );
        update.duration = duration;
      }
    }
    db.get('builds').find({ id }).assign(update).write();
    return this.findById(id);
  }

  static addLog(id: string, log: LogData): LogEntry | null {
    const build = this.findById(id);
    if (build) {
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: log.level || 'info',
        message: log.message,
        stage: log.stage || null
      };
      const logs = [...(build.logs || []), logEntry];
      db.get('builds').find({ id }).assign({ logs }).write();
      return logEntry;
    }
    return null;
  }

  static getStats() {
    const all = db.get('builds').value() as IBuild[];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recent24h = all.filter(b => new Date(b.createdAt) > last24h);
    const recent7d = all.filter(b => new Date(b.createdAt) > last7d);
    const success = all.filter(b => b.status === 'success');
    const failed = all.filter(b => b.status === 'failed');

    return {
      total: all.length,
      last24h: recent24h.length,
      last7d: recent7d.length,
      successRate: all.length ? Math.round((success.length / all.length) * 100) : 0,
      byStatus: {
        pending: all.filter(b => b.status === 'pending').length,
        running: all.filter(b => b.status === 'running').length,
        success: success.length,
        failed: failed.length,
        cancelled: all.filter(b => b.status === 'cancelled').length
      },
      avgDuration: success.length
        ? Math.round(success.reduce((s, b) => s + (b.duration || 0), 0) / success.length)
        : 0
    };
  }

  static delete(id: string): boolean {
    db.get('builds').remove({ id }).write();
    return true;
  }

  static cleanOldBuilds(pipelineId: string, keepCount: number): void {
    if (!keepCount || keepCount <= 0) return;
    
    const builds = db.get('builds')
      .filter({ pipelineId })
      .sortBy('createdAt')
      .reverse()
      .value() as IBuild[];
    
    if (builds.length <= keepCount) return;
    
    const toDelete = builds.slice(keepCount);
    const idsToDelete = toDelete.map(b => b.id);
    
    const allBuilds = db.get('builds').value() as IBuild[];
    const filteredBuilds = allBuilds.filter(b => !idsToDelete.includes(b.id));
    db.set('builds', filteredBuilds).write();
  }
}

export default Build
