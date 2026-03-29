const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

class Build {
  static create(data) {
    const build = {
      id: uuidv4(),
      number: this.getNextBuildNumber(data.pipelineId),
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
      createdAt: new Date().toISOString()
    };
    db.get('builds').push(build).write();
    return build;
  }

  static getNextBuildNumber(pipelineId) {
    const builds = db.get('builds').filter({ pipelineId }).value();
    return builds.length + 1;
  }

  static findAll(filters = {}) {
    let query = db.get('builds');
    if (filters.pipelineId) {
      query = query.filter({ pipelineId: filters.pipelineId });
    }
    if (filters.status) {
      query = query.filter({ status: filters.status });
    }
    return query.orderBy(['createdAt'], ['desc']).take(filters.limit || 100).value();
  }

  static findById(id) {
    return db.get('builds').find({ id }).value();
  }

  static update(id, data) {
    db.get('builds').find({ id }).assign(data).write();
    return this.findById(id);
  }

  static updateStatus(id, status) {
    const update = { status };
    if (status === 'running') {
      update.startedAt = new Date().toISOString();
    } else if (['success', 'failed', 'cancelled', 'error'].includes(status)) {
      update.finishedAt = new Date().toISOString();
      const build = this.findById(id);
      if (build && build.startedAt) {
        update.duration = Math.floor(
          (new Date(update.finishedAt) - new Date(build.startedAt)) / 1000
        );
      }
    }
    db.get('builds').find({ id }).assign(update).write();
    return this.findById(id);
  }

  static addLog(id, log) {
    const build = this.findById(id);
    if (build) {
      const logEntry = {
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
    const all = db.get('builds').value();
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

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

  static delete(id) {
    db.get('builds').remove({ id }).write();
    return true;
  }
}

module.exports = Build;
