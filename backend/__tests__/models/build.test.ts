const Build = require('../../src/models/Build').default;
const { db } = require('../../src/config/database');

describe('Build Model', () => {
  beforeEach(() => {
    db.set('builds', []).write();
  });

  describe('create', () => {
    it('should create a build with defaults', () => {
      const build = Build.create({
        pipelineId: 'pipeline-1',
        pipelineName: 'Test Pipeline'
      });

      expect(build).toHaveProperty('id');
      expect(build.pipelineId).toBe('pipeline-1');
      expect(build.pipelineName).toBe('Test Pipeline');
      expect(build.branch).toBe('main');
      expect(build.commit).toBeNull();
      expect(build.commitMessage).toBe('');
      expect(build.triggeredBy).toBe('manual');
      expect(build.status).toBe('pending');
      expect(build.logs).toEqual([]);
      expect(build.stages).toEqual([]);
      expect(build.startedAt).toBeNull();
      expect(build.finishedAt).toBeNull();
      expect(build.duration).toBeNull();
      expect(build.number).toBe(1);
    });

    it('should increment build number per pipeline', () => {
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const build2 = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const build3 = Build.create({ pipelineId: 'p2', pipelineName: 'P2' });

      expect(build2.number).toBe(2);
      expect(build3.number).toBe(1);
    });

    it('should accept custom values', () => {
      const build = Build.create({
        pipelineId: 'p1',
        pipelineName: 'P1',
        branch: 'develop',
        commit: 'abc123',
        commitMessage: 'Fix bug',
        triggeredBy: 'webhook',
        stages: [{ name: 'Build', status: 'pending' }]
      });

      expect(build.branch).toBe('develop');
      expect(build.commit).toBe('abc123');
      expect(build.commitMessage).toBe('Fix bug');
      expect(build.triggeredBy).toBe('webhook');
      expect(build.stages).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should find a build by id', () => {
      const created = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const found = Build.findById(created.id);

      expect(found).toEqual(created);
    });

    it('should return undefined for non-existent id', () => {
      const found = Build.findById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all builds ordered by createdAt desc', () => {
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p2', pipelineName: 'P2' });

      const builds = Build.findAll();
      expect(builds.length).toBe(3);
      expect(new Date(builds[0].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(builds[1].createdAt).getTime());
    });

    it('should filter by pipelineId', () => {
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p2', pipelineName: 'P2' });

      const builds = Build.findAll({ pipelineId: 'p2' });
      expect(builds.length).toBe(1);
      expect(builds[0].pipelineId).toBe('p2');
    });

    it('should filter by status', () => {
      const b1 = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.updateStatus(b1.id, 'success');

      const builds = Build.findAll({ status: 'success' });
      expect(builds.length).toBe(1);
      expect(builds[0].status).toBe('success');
    });

    it('should respect limit', () => {
      for (let i = 0; i < 5; i++) {
        Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      }

      const builds = Build.findAll({ limit: 2 });
      expect(builds.length).toBe(2);
    });
  });

  describe('update', () => {
    it('should update build fields', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const updated = Build.update(build.id, { commit: 'def456', branch: 'feature' });

      expect(updated.commit).toBe('def456');
      expect(updated.branch).toBe('feature');
    });
  });

  describe('updateStatus', () => {
    it('should set startedAt when status is running', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const updated = Build.updateStatus(build.id, 'running');

      expect(updated.status).toBe('running');
      expect(updated.startedAt).toBeDefined();
    });

    it('should set finishedAt and duration for success', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.updateStatus(build.id, 'running');
      const updated = Build.updateStatus(build.id, 'success');

      expect(updated.status).toBe('success');
      expect(updated.finishedAt).toBeDefined();
      expect(updated.duration).toBeDefined();
      expect(typeof updated.duration).toBe('number');
    });

    it('should set finishedAt for failed status', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.updateStatus(build.id, 'running');
      const updated = Build.updateStatus(build.id, 'failed');

      expect(updated.status).toBe('failed');
      expect(updated.finishedAt).toBeDefined();
    });

    it('should set finishedAt for cancelled status', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const updated = Build.updateStatus(build.id, 'cancelled');

      expect(updated.status).toBe('cancelled');
      expect(updated.finishedAt).toBeDefined();
    });

    it('should set finishedAt for error status', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const updated = Build.updateStatus(build.id, 'error');

      expect(updated.status).toBe('error');
      expect(updated.finishedAt).toBeDefined();
    });
  });

  describe('addLog', () => {
    it('should add a log entry to the build', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const log = Build.addLog(build.id, { level: 'info', message: 'Starting build' });

      expect(log).toHaveProperty('timestamp');
      expect(log.level).toBe('info');
      expect(log.message).toBe('Starting build');
      expect(log.stage).toBeNull();
    });

    it('should default level to info', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const log = Build.addLog(build.id, { message: 'Test' });

      expect(log.level).toBe('info');
    });

    it('should accept custom stage', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const log = Build.addLog(build.id, { level: 'warn', message: 'Warning', stage: 'Build' });

      expect(log.stage).toBe('Build');
    });

    it('should return null for non-existent build', () => {
      const log = Build.addLog('non-existent', { message: 'Test' });
      expect(log).toBeNull();
    });

    it('should accumulate logs', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.addLog(build.id, { message: 'Log 1' });
      Build.addLog(build.id, { message: 'Log 2' });

      const updated = Build.findById(build.id);
      expect(updated.logs.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return stats for empty builds', () => {
      const stats = Build.getStats();

      expect(stats.total).toBe(0);
      expect(stats.last24h).toBe(0);
      expect(stats.last7d).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });

    it('should calculate stats correctly', () => {
      const b1 = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const b2 = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const b3 = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });

      Build.updateStatus(b1.id, 'success');
      Build.update(b1.id, { duration: 10 });
      Build.updateStatus(b2.id, 'failed');
      Build.updateStatus(b3.id, 'success');
      Build.update(b3.id, { duration: 20 });

      const stats = Build.getStats();

      expect(stats.total).toBe(3);
      expect(stats.successRate).toBe(67);
      expect(stats.avgDuration).toBe(15);
      expect(stats.byStatus.success).toBe(2);
      expect(stats.byStatus.failed).toBe(1);
      expect(stats.byStatus.pending).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a build', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const result = Build.delete(build.id);

      expect(result).toBe(true);
      expect(Build.findById(build.id)).toBeUndefined();
    });
  });

  describe('cleanOldBuilds', () => {
    it('should not delete when under keepCount', () => {
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });

      Build.cleanOldBuilds('p1', 5);

      const builds = Build.findAll({ pipelineId: 'p1' });
      expect(builds.length).toBe(2);
    });

    it('should delete oldest builds when over keepCount', () => {
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });

      Build.cleanOldBuilds('p1', 1);

      const builds = Build.findAll({ pipelineId: 'p1' });
      expect(builds.length).toBe(1);
      expect(builds[0].number).toBe(3);
    });

    it('should not affect other pipelines', () => {
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.create({ pipelineId: 'p2', pipelineName: 'P2' });

      Build.cleanOldBuilds('p1', 1);

      const p1Builds = Build.findAll({ pipelineId: 'p1' });
      const p2Builds = Build.findAll({ pipelineId: 'p2' });
      expect(p1Builds.length).toBe(1);
      expect(p2Builds.length).toBe(1);
    });

    it('should do nothing when keepCount is 0', () => {
      Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.cleanOldBuilds('p1', 0);

      const builds = Build.findAll({ pipelineId: 'p1' });
      expect(builds.length).toBe(1);
    });
  });
});
