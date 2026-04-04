const NotificationService = require('../../src/services/NotificationService').default;
const Credential = require('../../src/models/Credential');
const { db } = require('../../src/config/database');

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn((opts, cb) => cb(null, { messageId: 'test' }))
  }))
}));

describe('NotificationService', () => {
  let wsManager;
  let service;

  beforeEach(() => {
    db.set('credentials', []).write();
    wsManager = { broadcast: jest.fn() };
    service = new NotificationService(wsManager);
  });

  describe('send', () => {
    it('should return error when provider is missing', async () => {
      const result = await service.send('build-1', {}, {}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider is required');
    });

    it('should return error for unknown provider', async () => {
      const result = await service.send('build-1', { provider: 'unknown' }, {}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown provider');
    });

    it('should use default message when none provided', async () => {
      const build = { number: 5, status: 'success', branch: 'main', commit: 'abc123', commitMessage: 'Fix', triggeredBy: 'manual' };
      const pipeline = { name: 'Test Pipeline' };

      await service.send('build-1', { provider: 'slack', webhookUrl: 'https://hooks.slack.com/test' }, build, pipeline);

      const calls = wsManager.broadcast.mock.calls;
      const logCalls = calls.filter(c => c[0].type === 'build:log');
      expect(logCalls.length).toBeGreaterThan(0);
    });

    it('should interpolate variables in message before sending', async () => {
      const build = { number: 42, status: 'failed', branch: 'develop', commit: 'deadbeef123', commitMessage: 'Bug fix', triggeredBy: 'webhook' };
      const pipeline = { name: 'MyPipeline' };

      const interpolated = service._interpolate(build, pipeline, 'Pipeline {{PIPELINE_NAME}} failed on {{BRANCH}} commit {{COMMIT}}');

      expect(interpolated).toContain('MyPipeline');
      expect(interpolated).toContain('develop');
      expect(interpolated).toContain('deadbee');
    });
  });

  describe('_interpolate', () => {
    it('should replace all template variables', () => {
      const build = {
        number: 10,
        status: 'success',
        branch: 'main',
        commit: 'abcdef1234567890',
        commitMessage: 'Initial commit',
        triggeredBy: 'push',
        startedAt: '2024-01-01T00:00:00Z',
        finishedAt: '2024-01-01T00:01:30Z',
        id: 'build-1'
      };
      const pipeline = { name: 'TestPipeline' };

      const msg = '{{PIPELINE_NAME}} {{BRANCH}} {{STATUS}} {{BUILD_NUMBER}} {{COMMIT}} {{COMMIT_MESSAGE}} {{TRIGGERED_BY}} {{DURATION}} {{BUILD_URL}}';
      const result = service._interpolate(build, pipeline, msg);

      expect(result).toContain('TestPipeline');
      expect(result).toContain('main');
      expect(result).toContain('success');
      expect(result).toContain('10');
      expect(result).toContain('abcdef1');
      expect(result).toContain('Initial commit');
      expect(result).toContain('push');
      expect(result).toContain('1m 30s');
      expect(result).toContain('builds/build-1');
    });

    it('should handle missing build and pipeline', () => {
      const msg = '{{PIPELINE_NAME}} {{BRANCH}} {{STATUS}}';
      const result = service._interpolate(null, null, msg);

      expect(result).toBe('Unknown Unknown Unknown');
    });

    it('should handle missing commit', () => {
      const build = { number: 1 };
      const result = service._interpolate(build, {}, '{{COMMIT}}');

      expect(result).toBe('N/A');
    });

    it('should truncate commit to 7 chars', () => {
      const build = { commit: 'a'.repeat(40) };
      const result = service._interpolate(build, {}, '{{COMMIT}}');

      expect(result).toBe('a'.repeat(7));
    });
  });

  describe('_getDuration', () => {
    it('should return seconds for short durations', () => {
      const build = { startedAt: '2024-01-01T00:00:00Z', finishedAt: '2024-01-01T00:00:30Z' };
      expect(service._getDuration(build)).toBe('30s');
    });

    it('should return minutes and seconds', () => {
      const build = { startedAt: '2024-01-01T00:00:00Z', finishedAt: '2024-01-01T00:02:15Z' };
      expect(service._getDuration(build)).toBe('2m 15s');
    });

    it('should return hours', () => {
      const build = { startedAt: '2024-01-01T00:00:00Z', finishedAt: '2024-01-01T01:30:00Z' };
      expect(service._getDuration(build)).toBe('1h 30m');
    });

    it('should return N/A when no startedAt', () => {
      expect(service._getDuration(null)).toBe('N/A');
      expect(service._getDuration({})).toBe('N/A');
    });
  });

  describe('_defaultMessage', () => {
    it('should use success emoji for successful build', () => {
      const build = { status: 'success' };
      const msg = service._defaultMessage(build, {});
      expect(msg).toContain('✅');
    });

    it('should use error emoji for failed build', () => {
      const build = { status: 'failed' };
      const msg = service._defaultMessage(build, {});
      expect(msg).toContain('❌');
    });

    it('should include template placeholders for build number and pipeline name', () => {
      const build = { status: 'success', number: 5 };
      const pipeline = { name: 'Test' };
      const msg = service._defaultMessage(build, pipeline);
      expect(msg).toContain('{{BUILD_NUMBER}}');
      expect(msg).toContain('{{PIPELINE_NAME}}');
    });
  });

  describe('_getBuildUrl', () => {
    it('should return build URL', () => {
      expect(service._getBuildUrl({ id: 'abc' })).toBe('builds/abc');
    });

    it('should handle missing build', () => {
      expect(service._getBuildUrl(null)).toBe('builds/unknown');
    });
  });

  describe('Telegram notification', () => {
    it('should fail without bot token', async () => {
      const result = await service.send('build-1', { provider: 'telegram' }, {}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('bot token');
    });

    it('should fail without chat ID', async () => {
      const result = await service.send('build-1', { provider: 'telegram', credentialId: 'cred-1' }, {}, {});
      expect(result.success).toBe(false);
    });
  });

  describe('Slack notification', () => {
    it('should fail without webhook URL', async () => {
      const result = await service.send('build-1', { provider: 'slack' }, {}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('webhook URL');
    });

    it('should fail with invalid webhook URL', async () => {
      const result = await service.send('build-1', { provider: 'slack', webhookUrl: 'not-a-url' }, {}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Teams notification', () => {
    it('should fail without webhook URL', async () => {
      const result = await service.send('build-1', { provider: 'teams' }, {}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('webhook URL');
    });

    it('should fail with invalid webhook URL', async () => {
      const result = await service.send('build-1', { provider: 'teams', webhookUrl: 'not-a-url' }, {}, {});
      expect(result.success).toBe(false);
    });
  });

  describe('Mail notification', () => {
    it('should fail without recipient', async () => {
      const result = await service.send('build-1', { provider: 'mail' }, {}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });
  });
});
