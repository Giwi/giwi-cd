import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import type { Pipeline as IPipeline } from '../types';

interface PipelineData {
  name: string;
  description?: string;
  repositoryUrl?: string;
  credentialId?: string;
  branch?: string;
  stages?: IPipeline['stages'];
  triggers?: IPipeline['triggers'];
  environment?: string[];
  keepBuilds?: number;
  artifactPaths?: string[];
}

export class Pipeline {
  static create(data: PipelineData): IPipeline {
    const pipeline: IPipeline = {
      id: uuidv4(),
      userId: '',
      name: data.name,
      description: data.description || '',
      repositoryUrl: data.repositoryUrl || '',
      credentialId: data.credentialId || null,
      branch: data.branch || 'main',
      stages: data.stages || [],
      triggers: data.triggers || { manual: true, push: false, schedule: null },
      environment: data.environment || [],
      enabled: true,
      status: 'inactive',
      lastBuildAt: null,
      lastBuildStatus: null,
      lastCommit: null,
      pollingInterval: 60,
      keepBuilds: data.keepBuilds || 10,
      artifactPaths: data.artifactPaths || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get('pipelines').push(pipeline).write();
    return pipeline;
  }

  static findAll(): IPipeline[] {
    return db.get('pipelines').value();
  }

  static findById(id: string): IPipeline | undefined {
    return db.get('pipelines').find({ id }).value();
  }

  static update(id: string, data: Partial<PipelineData>): IPipeline | undefined {
    const updated = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    db.get('pipelines').find({ id }).assign(updated).write();
    return this.findById(id);
  }

  static delete(id: string): boolean {
    db.get('pipelines').remove({ id }).write();
    return true;
  }

  static updateStatus(id: string, status: IPipeline['status'], buildStatus?: string): IPipeline | undefined {
    const update: Partial<IPipeline> = { status, updatedAt: new Date().toISOString() };
    if (buildStatus) {
      (update as Record<string, unknown>).lastBuildStatus = buildStatus;
      (update as Record<string, unknown>).lastBuildAt = new Date().toISOString();
    }
    db.get('pipelines').find({ id }).assign(update).write();
    return this.findById(id);
  }

  static updateLastCommit(id: string, commit: string): IPipeline | undefined {
    db.get('pipelines').find({ id }).assign({ lastCommit: commit, updatedAt: new Date().toISOString() }).write();
    return this.findById(id);
  }

  static getPushTriggerPipelines(): IPipeline[] {
    return db.get('pipelines').filter((p: Record<string, unknown>) =>
      (p as IPipeline).enabled &&
      (p as IPipeline).triggers?.push &&
      (p as IPipeline).repositoryUrl
    ).value() as IPipeline[];
  }
}

export default Pipeline
