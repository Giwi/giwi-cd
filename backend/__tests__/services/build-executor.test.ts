const BuildExecutor = require('../../src/services/BuildExecutor').default;
const Build = require('../../src/models/Build').default;
const Pipeline = require('../../src/models/Pipeline').default;
const { db } = require('../../src/config/database');
const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('child_process', () => ({
  exec: jest.fn((cmd, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    callback(null, 'mock stdout', '');
  })
}));

jest.mock('worker_threads', () => {
  const mockWorker = jest.fn().mockImplementation(() => ({
    on: jest.fn((event, cb) => {
      if (event === 'message') {
        setTimeout(() => cb({ type: 'complete', buildId: 'test-build', success: true }), 10);
      }
    }),
    terminate: jest.fn().mockResolvedValue(undefined)
  }));

  return { Worker: mockWorker };
});

describe('BuildExecutor', () => {
  let wsManager;
  let executor;

  beforeEach(() => {
    db.set('builds', []).write();
    db.set('pipelines', []).write();
    wsManager = { broadcast: jest.fn() };
    executor = new BuildExecutor(wsManager);
  });

  describe('execute', () => {
    it('should throw if build already running', async () => {
      const build = { id: 'b1', pipelineId: 'p1', branch: 'main', number: 1 };
      executor.runningBuilds.set('b1', { build, pipeline: {} });

      await expect(executor.execute(build, {})).rejects.toThrow('Build already running');
    });

    it('should handle pipeline without repository URL', async () => {
      const pipeline = Pipeline.create({ name: 'Test', stages: [] });
      const build = Build.create({ pipelineId: pipeline.id, pipelineName: pipeline.name, branch: 'main' });

      await executor.execute(build, pipeline);

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'build:start', buildId: build.id })
      );
      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'build:complete', buildId: build.id })
      );
    });

    it('should set pipeline to running status', async () => {
      const pipeline = Pipeline.create({ name: 'Test', stages: [] });
      const build = Build.create({ pipelineId: pipeline.id, pipelineName: pipeline.name, branch: 'main' });

      await executor.execute(build, pipeline);

      const updatedPipeline = Pipeline.findById(pipeline.id);
      expect(updatedPipeline.status).toBe('inactive');
    });
  });

  describe('cancel', () => {
    it('should cancel a running build', () => {
      const build = { id: 'b1', pipelineId: 'p1' };
      executor.runningBuilds.set('b1', { build, pipeline: {} });

      const result = executor.cancel('b1');

      expect(result).toBe(true);
      expect(executor.runningBuilds.has('b1')).toBe(false);
      expect(wsManager.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'build:cancelled', buildId: 'b1' })
      );
    });

    it('should return false for non-existent build', () => {
      const result = executor.cancel('non-existent');
      expect(result).toBe(false);
    });

    it('should update build status to cancelled', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      executor.runningBuilds.set(build.id, { build, pipeline: {} });

      executor.cancel(build.id);

      const updated = Build.findById(build.id);
      expect(updated.status).toBe('cancelled');
    });
  });

  describe('terminateAll', () => {
    it('should cancel all running builds', () => {
      const b1 = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      const b2 = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      executor.runningBuilds.set(b1.id, { build: b1, pipeline: {} });
      executor.runningBuilds.set(b2.id, { build: b2, pipeline: {} });

      executor.terminateAll();

      expect(executor.runningBuilds.size).toBe(0);
      expect(Build.findById(b1.id).status).toBe('cancelled');
      expect(Build.findById(b2.id).status).toBe('cancelled');
    });
  });

  describe('getRunningBuilds', () => {
    it('should return empty array when nothing running', () => {
      expect(executor.getRunningBuilds()).toEqual([]);
    });

    it('should return list of running build IDs', () => {
      executor.runningBuilds.set('b1', {});
      executor.runningBuilds.set('b2', {});

      expect(executor.getRunningBuilds()).toEqual(['b1', 'b2']);
    });
  });

  describe('_matchGlob', () => {
    it('should match single file pattern', () => {
      const testDir = path.join(os.tmpdir(), 'giwicd-test-glob-' + Date.now());
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'output.txt'), 'test');

      const results = executor._matchGlob(testDir, 'output.txt');
      expect(results.length).toBe(1);

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should match wildcard pattern', () => {
      const testDir = path.join(os.tmpdir(), 'giwicd-test-glob-' + Date.now());
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'file1.log'), 'test');
      fs.writeFileSync(path.join(testDir, 'file2.log'), 'test');
      fs.writeFileSync(path.join(testDir, 'file3.txt'), 'test');

      const results = executor._matchGlob(testDir, '*.log');
      expect(results.length).toBe(2);

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should match double-star pattern', () => {
      const testDir = path.join(os.tmpdir(), 'giwicd-test-glob-' + Date.now());
      const subDir = path.join(testDir, 'dist');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'root.txt'), 'test');
      fs.writeFileSync(path.join(subDir, 'app.js'), 'test');

      const results = executor._matchGlob(testDir, '**');
      expect(results.length).toBe(2);

      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should return empty array when no matches', () => {
      const testDir = path.join(os.tmpdir(), 'giwicd-test-glob-' + Date.now());
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'file.txt'), 'test');

      const results = executor._matchGlob(testDir, '*.log');
      expect(results.length).toBe(0);

      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('_matchesPattern', () => {
    it('should match exact name', () => {
      expect(executor._matchesPattern('file.txt', 'file.txt')).toBe(true);
      expect(executor._matchesPattern('file.txt', 'other.txt')).toBe(false);
    });

    it('should match single wildcard', () => {
      expect(executor._matchesPattern('file.txt', '*.txt')).toBe(true);
      expect(executor._matchesPattern('file.log', '*.txt')).toBe(false);
    });

    it('should match double star', () => {
      expect(executor._matchesPattern('anything', '**')).toBe(true);
      expect(executor._matchesPattern('anything', '*')).toBe(true);
    });
  });

  describe('_getDuration', () => {
    it('should return N/A when no startedAt', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      expect(executor._getDuration(build.id)).toBe('N/A');
    });

    it('should return seconds for short builds', () => {
      const build = Build.create({ pipelineId: 'p1', pipelineName: 'P1' });
      Build.updateStatus(build.id, 'running');
      const startedAt = new Date(Date.now() - 30000).toISOString();
      Build.update(build.id, { startedAt });

      const duration = executor._getDuration(build.id);
      expect(duration).toMatch(/\d+s/);
    });
  });
});
