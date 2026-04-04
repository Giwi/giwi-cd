const CommandExecutor = require('../../src/services/CommandExecutor').default;

describe('CommandExecutor', () => {
  let emitFn;
  let executor;

  beforeEach(() => {
    emitFn = jest.fn();
    executor = new CommandExecutor(emitFn);
  });

  describe('execute', () => {
    it('should return success for empty command', async () => {
      const result = await executor.execute('build-1', '', '/tmp');
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('should return success for null command', async () => {
      const result = await executor.execute('build-1', null, '/tmp');
      expect(result.success).toBe(true);
    });

    it('should execute a simple command', async () => {
      const result = await executor.execute('build-1', 'echo hello', process.cwd());
      expect(result.success).toBe(true);
      expect(result.output).toContain('hello');
    });

    it('should emit command and output', async () => {
      await executor.execute('build-1', 'echo test', process.cwd());
      expect(emitFn).toHaveBeenCalledWith('build-1', 'info', expect.stringContaining('echo test'));
    });

    it('should return failure for failing command', async () => {
      const result = await executor.execute('build-1', 'exit 1', process.cwd());
      expect(result.success).toBe(false);
    });

    it('should use process.cwd when no workingDir provided', async () => {
      const result = await executor.execute('build-1', 'pwd');
      expect(result.success).toBe(true);
    });
  });

  describe('maskCredentials', () => {
    it('should return unchanged command without credentials', () => {
      const result = executor.maskCredentials('echo hello');
      expect(result).toBe('echo hello');
    });

    it('should return null for null input', () => {
      expect(executor.maskCredentials(null)).toBeNull();
    });

    it('should preserve credential pattern for display', () => {
      const result = executor.maskCredentials('curl -u ${CRED:token}');
      expect(result).toContain('${CRED:token}');
    });
  });
});
