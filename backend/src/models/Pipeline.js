const { v4: uuidv4 } = require('uuid');
const { db, dbIndex } = require('../config/database');

class Pipeline {
  static create(data) {
    const pipeline = {
      id: uuidv4(),
      name: data.name,
      description: data.description || '',
      repositoryUrl: data.repositoryUrl || '',
      credentialId: data.credentialId || null,
      branch: data.branch || 'main',
      stages: data.stages || [],
      triggers: data.triggers || { manual: true, push: false, schedule: null },
      environment: data.environment || [],
      status: 'inactive',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastBuildAt: null,
      lastBuildStatus: null,
      lastCommit: null,
      pollingInterval: 60,
      keepBuilds: data.keepBuilds || 10
    };
    db.get('pipelines').push(pipeline).write();
    return pipeline;
  }

  static findAll() {
    return db.get('pipelines').value();
  }

  static findById(id) {
    return db.get('pipelines').find({ id }).value();
  }

  static update(id, data) {
    const updated = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    db.get('pipelines').find({ id }).assign(updated).write();
    return this.findById(id);
  }

  static delete(id) {
    db.get('pipelines').remove({ id }).write();
    return true;
  }

  static updateStatus(id, status, buildStatus = null) {
    const update = { status, updatedAt: new Date().toISOString() };
    if (buildStatus) {
      update.lastBuildStatus = buildStatus;
      update.lastBuildAt = new Date().toISOString();
    }
    db.get('pipelines').find({ id }).assign(update).write();
    return this.findById(id);
  }

  static updateLastCommit(id, commit) {
    db.get('pipelines').find({ id }).assign({ lastCommit: commit, updatedAt: new Date().toISOString() }).write();
    return this.findById(id);
  }

  static getPushTriggerPipelines() {
    return db.get('pipelines').filter(p => 
      p.enabled && 
      p.triggers?.push && 
      p.repositoryUrl
    ).value();
  }
}

module.exports = Pipeline;
