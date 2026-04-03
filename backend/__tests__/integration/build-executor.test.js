const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('BuildExecutor Integration', () => {
  let BuildExecutor;
  let Build;
  let Pipeline;
  let db;
  let wsManager;
  let executor;
  let testWorkDir;

  beforeAll(() => {
    jest.resetModules();
    jest.unmock('child_process');

    BuildExecutor = require('../../src/services/BuildExecutor');
    Build = require('../../src/models/Build');
    Pipeline = require('../../src/models/Pipeline');
    db = require('../../src/config/database').db;
  });

  beforeEach(() => {
    db.set('builds', []).write();
    db.set('pipelines', []).write();
    wsManager = { broadcast: jest.fn() };
    executor = new BuildExecutor(wsManager);
    testWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'giwicd-build-'));
    executor.gitService._workDir = testWorkDir;
    executor.gitService.cloneOrPull = async () => ({ success: true, workDir: testWorkDir });
    executor.gitService.getWorkspaceDir = () => testWorkDir;
    executor.gitService.getLastCommitMessage = async () => 'Test commit';
  });

  afterEach(() => {
    fs.rmSync(testWorkDir, { recursive: true, force: true });
  });

  describe('execute with real stages', () => {
    it('should execute stages in worker threads', async () => {
      const pipeline = Pipeline.create({
        name: 'Test Pipeline',
        stages: [
          {
            name: 'Build',
            steps: [{ command: 'echo build-step-1', name: 'Echo' }]
          }
        ]
      });
      const build = Build.create({
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        branch: 'main'
      });

      await executor.execute(build, pipeline);

      const updatedBuild = Build.findById(build.id);
      expect(updatedBuild.status).toBe('success');
      expect(updatedBuild.logs.length).toBeGreaterThan(0);
      expect(updatedBuild.stages[0].status).toBe('success');
    });

    it('should fail when a stage command fails', async () => {
      const pipeline = Pipeline.create({
        name: 'Fail Pipeline',
        stages: [
          {
            name: 'Failing Stage',
            steps: [{ command: 'exit 1', name: 'Fail' }]
          }
        ]
      });
      const build = Build.create({
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        branch: 'main'
      });

      await executor.execute(build, pipeline);

      const updatedBuild = Build.findById(build.id);
      expect(updatedBuild.status).toBe('failed');
      expect(updatedBuild.stages[0].status).toBe('failed');
    });

    it('should continue on error when continueOnError is true', async () => {
      const pipeline = Pipeline.create({
        name: 'Continue Pipeline',
        stages: [
          {
            name: 'Failing Stage',
            steps: [{ command: 'exit 1', name: 'Fail', continueOnError: true }]
          },
          {
            name: 'Passing Stage',
            steps: [{ command: 'echo passed', name: 'Pass' }]
          }
        ]
      });
      const build = Build.create({
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        branch: 'main'
      });

      await executor.execute(build, pipeline);

      const updatedBuild = Build.findById(build.id);
      expect(updatedBuild.status).toBe('success');
      expect(updatedBuild.stages[0].status).toBe('success');
      expect(updatedBuild.stages[1].status).toBe('success');
    });
  });

  describe('cancel', () => {
    it('should cancel a running build and terminate worker', async () => {
      const pipeline = Pipeline.create({
        name: 'Long Pipeline',
        stages: [
          {
            name: 'Long Stage',
            steps: [{ command: 'sleep 10', name: 'Sleep' }]
          }
        ]
      });
      const build = Build.create({
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        branch: 'main'
      });

      const execPromise = executor.execute(build, pipeline);

      await new Promise(r => setTimeout(r, 200));

      const cancelled = executor.cancel(build.id);
      expect(cancelled).toBe(true);

      await execPromise;

      const updatedBuild = Build.findById(build.id);
      expect(['cancelled', 'failed']).toContain(updatedBuild.status);
    });
  });

  describe('artifact collection', () => {
    it('should match files with glob patterns', () => {
      fs.writeFileSync(path.join(testWorkDir, 'output.txt'), 'artifact content');
      fs.mkdirSync(path.join(testWorkDir, 'dist'), { recursive: true });
      fs.writeFileSync(path.join(testWorkDir, 'dist', 'app.js'), 'js content');

      const results = executor._matchGlob(testWorkDir, '*.txt');
      expect(results.length).toBe(1);
      expect(results[0]).toContain('output.txt');

      const distResults = executor._matchGlob(testWorkDir, 'dist/**');
      expect(distResults.length).toBe(1);
      expect(distResults[0]).toContain('app.js');
    });

    it('should execute build with artifact paths configured', async () => {
      fs.writeFileSync(path.join(testWorkDir, 'output.txt'), 'artifact content');

      const pipeline = Pipeline.create({
        name: 'Artifact Pipeline',
        stages: [
          {
            name: 'Build',
            steps: [{ command: 'echo done', name: 'Done' }]
          }
        ],
        artifactPaths: ['output.txt']
      });
      const build = Build.create({
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        branch: 'main'
      });

      await executor.execute(build, pipeline);

      const updatedBuild = Build.findById(build.id);
      expect(updatedBuild.status).toBe('success');
    });
  });
});
