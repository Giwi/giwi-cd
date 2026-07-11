const { retry } = require('../../src/utils/retry');

describe('Retry Utility', () => {
  describe('retry', () => {
    it('should return result on first success', async () => {
      const result = await retry(async () => 42, { maxAttempts: 3, delayMs: 10 });
      expect(result).toBe(42);
    });

    it('should retry on retryable error and succeed', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) throw new Error('ECONNRESET');
        return 'success';
      };

      const result = await retry(fn, { maxAttempts: 3, delayMs: 10 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after maxAttempts', async () => {
      const fn = async () => { throw new Error('ECONNRESET'); };

      await expect(retry(fn, { maxAttempts: 2, delayMs: 10 })).rejects.toThrow('ECONNRESET');
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('invalid syntax');
      };

      await expect(retry(fn, { maxAttempts: 3, delayMs: 10 })).rejects.toThrow('invalid syntax');
      expect(attempts).toBe(1);
    });

    it('should call onRetry callback', async () => {
      let attempts = 0;
      const onRetry = jest.fn();
      const fn = async () => {
        attempts++;
        if (attempts < 2) throw new Error('ETIMEDOUT');
        return 'success';
      };

      await retry(fn, { maxAttempts: 3, delayMs: 10, onRetry });
      expect(onRetry).toHaveBeenCalled();
      expect(onRetry.mock.calls[0][0]).toHaveProperty('attempt');
      expect(onRetry.mock.calls[0][0]).toHaveProperty('error');
    });
  });
});
