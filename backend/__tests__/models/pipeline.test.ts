const Pipeline = require('../../src/models/Pipeline').default;
const { db } = require('../../src/config/database');

describe('Pipeline Model', () => {
  beforeEach(() => {
    db.set('pipelines', []).write();
  });

  describe('create', () => {
    it('should create a pipeline with defaults', () => {
      const pipeline = Pipeline.create({ name: 'Test Pipeline' });

      expect(pipeline).toHaveProperty('id');
      expect(pipeline.name).toBe('Test Pipeline');
      expect(pipeline.description).toBe('');
      expect(pipeline.repositoryUrl).toBe('');
      expect(pipeline.credentialId).toBeNull();
      expect(pipeline.branch).toBe('main');
      expect(pipeline.stages).toEqual([]);
      expect(pipeline.triggers).toEqual({ manual: true, push: false, schedule: null });
      expect(pipeline.environment).toEqual([]);
      expect(pipeline.status).toBe('inactive');
      expect(pipeline.enabled).toBe(true);
      expect(pipeline.lastBuildAt).toBeNull();
      expect(pipeline.lastBuildStatus).toBeNull();
      expect(pipeline.lastCommit).toBeNull();
      expect(pipeline.pollingInterval).toBe(60);
      expect(pipeline.keepBuilds).toBe(10);
      expect(pipeline.artifactPaths).toEqual([]);
    });

    it('should accept custom values', () => {
      const pipeline = Pipeline.create({
        name: 'Custom Pipeline',
        description: 'A test pipeline',
        repositoryUrl: 'https://github.com/user/repo',
        branch: 'develop',
        stages: [{ name: 'Build', steps: [] }],
        triggers: { manual: false, push: true, schedule: null },
        keepBuilds: 5,
        artifactPaths: ['dist/**', '*.log']
      });

      expect(pipeline.description).toBe('A test pipeline');
      expect(pipeline.repositoryUrl).toBe('https://github.com/user/repo');
      expect(pipeline.branch).toBe('develop');
      expect(pipeline.stages).toHaveLength(1);
      expect(pipeline.triggers.push).toBe(true);
      expect(pipeline.keepBuilds).toBe(5);
      expect(pipeline.artifactPaths).toEqual(['dist/**', '*.log']);
    });
  });

  describe('findById', () => {
    it('should find a pipeline by id', () => {
      const created = Pipeline.create({ name: 'Test' });
      const found = Pipeline.findById(created.id);

      expect(found).toEqual(created);
    });

    it('should return undefined for non-existent id', () => {
      const found = Pipeline.findById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all pipelines', () => {
      Pipeline.create({ name: 'P1' });
      Pipeline.create({ name: 'P2' });

      const pipelines = Pipeline.findAll();
      expect(pipelines.length).toBe(2);
    });
  });

  describe('update', () => {
    it('should update pipeline fields', () => {
      const pipeline = Pipeline.create({ name: 'Test' });
      const updated = Pipeline.update(pipeline.id, { name: 'Updated', branch: 'feature' });

      expect(updated.name).toBe('Updated');
      expect(updated.branch).toBe('feature');
    });

    it('should update updatedAt timestamp', () => {
      const pipeline = Pipeline.create({ name: 'Test' });
      const updated = Pipeline.update(pipeline.id, { name: 'Updated' });

      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete a pipeline', () => {
      const pipeline = Pipeline.create({ name: 'Test' });
      const result = Pipeline.delete(pipeline.id);

      expect(result).toBe(true);
      expect(Pipeline.findById(pipeline.id)).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should update status and timestamp', () => {
      const pipeline = Pipeline.create({ name: 'Test' });
      const updated = Pipeline.updateStatus(pipeline.id, 'running');

      expect(updated.status).toBe('running');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should update lastBuildStatus when provided', () => {
      const pipeline = Pipeline.create({ name: 'Test' });
      const updated = Pipeline.updateStatus(pipeline.id, 'inactive', 'success');

      expect(updated.status).toBe('inactive');
      expect(updated.lastBuildStatus).toBe('success');
      expect(updated.lastBuildAt).toBeDefined();
    });
  });

  describe('updateLastCommit', () => {
    it('should update lastCommit', () => {
      const pipeline = Pipeline.create({ name: 'Test' });
      const updated = Pipeline.updateLastCommit(pipeline.id, 'abc123');

      expect(updated.lastCommit).toBe('abc123');
      expect(updated.updatedAt).toBeDefined();
    });
  });

  describe('getPushTriggerPipelines', () => {
    it('should return only enabled pipelines with push trigger', () => {
      Pipeline.create({ name: 'P1', triggers: { manual: true, push: true, schedule: null }, repositoryUrl: 'https://github.com/user/repo' });
      Pipeline.create({ name: 'P2', triggers: { manual: true, push: false, schedule: null }, repositoryUrl: 'https://github.com/user/repo' });
      Pipeline.create({ name: 'P3', triggers: { manual: true, push: true, schedule: null }, repositoryUrl: '', enabled: false });

      const pipelines = Pipeline.getPushTriggerPipelines();

      expect(pipelines.length).toBe(1);
      expect(pipelines[0].name).toBe('P1');
    });

    it('should return empty array when no matching pipelines', () => {
      Pipeline.create({ name: 'P1', triggers: { manual: true, push: false, schedule: null } });

      const pipelines = Pipeline.getPushTriggerPipelines();
      expect(pipelines).toEqual([]);
    });
  });
});
