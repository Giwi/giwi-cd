const { retry, retrySync, isRetryable, RetryableError, DEFAULT_RETRYABLE } = require('../../src/utils/retry');

describe('Retry Utility', () => {
  describe('retrySync', () => {
    it('should return result on first success', () => {
      const result = retrySync(() => 42, { maxAttempts: 3, delayMs: 10 });
      expect(result).toBe(42);
    });

    it('should retry on default retryable error and succeed', () => {
      let attempts = 0;
      const fn = () => {
        attempts++;
        if (attempts < 3) throw new Error('ETIMEDOUT');
        return 'success';
      };

      const result = retrySync(fn, { maxAttempts: 3, delayMs: 10 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after maxAttempts', () => {
      const fn = () => { throw new Error('ETIMEDOUT'); };

      expect(() => retrySync(fn, { maxAttempts: 2, delayMs: 10 })).toThrow('ETIMEDOUT');
    });

    it('should not retry on non-retryable errors', () => {
      let attempts = 0;
      const fn = () => {
        attempts++;
        throw new Error('invalid syntax');
      };

      expect(() => retrySync(fn, { maxAttempts: 3, delayMs: 10 })).toThrow('invalid syntax');
      expect(attempts).toBe(1);
    });
  });

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

  describe('isRetryable', () => {
    it('should return true for network errors', () => {
      expect(isRetryable(new Error('ECONNRESET'), [])).toBe(true);
      expect(isRetryable(new Error('ETIMEDOUT'), [])).toBe(true);
      expect(isRetryable(new Error('ECONNREFUSED'), [])).toBe(true);
      expect(isRetryable(new Error('ENOTFOUND'), [])).toBe(true);
    });

    it('should return true for timeout errors', () => {
      expect(isRetryable(new Error('timeout of 5000ms exceeded'), [])).toBe(true);
    });

    it('should return true for transient errors', () => {
      expect(isRetryable(new Error('temporary failure'), [])).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryable(new Error('invalid syntax'), [])).toBe(false);
      expect(isRetryable(new Error('not found'), [])).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isRetryable(null, [])).toBe(false);
      expect(isRetryable(undefined, [])).toBe(false);
    });

    it('should match error code when message is empty', () => {
      const error = new Error('');
      error.code = 'ECONNRESET';
      expect(isRetryable(error, [])).toBe(true);
    });
  });

  describe('RetryableError', () => {
    it('should create a retryable error with original error', () => {
      const original = new Error('original');
      const retryable = new RetryableError('retry failed', original);

      expect(retryable.name).toBe('RetryableError');
      expect(retryable.message).toBe('retry failed');
      expect(retryable.originalError).toBe(original);
    });
  });
});
