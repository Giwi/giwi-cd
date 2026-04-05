import logger from '../config/logger';

const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  onRetry: null as ((info: RetryInfo) => void) | null,
  retryableErrors: [] as string[]
};

const DEFAULT_RETRYABLE = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'fetch failed',
  'connection',
  'timeout',
  'network',
  'temporary failure',
  'Could not resolve host',
  'The remote end hung up unexpectedly',
  'SSL connection'
];

interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  error: Error;
  delay: number;
}

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: ((info: RetryInfo) => void) | null;
  retryableErrors?: string[];
}

class RetryableError extends Error {
  originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'RetryableError';
    this.originalError = originalError;
  }
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const isRetryable = (error: Error, retryableErrors: string[]): boolean => {
  if (!error) return false;

  const errorMessage = (error.message || (error as NodeJS.ErrnoException).code || '').toLowerCase();

  const patterns = [...DEFAULT_RETRYABLE, ...retryableErrors];
  return patterns.some(pattern => errorMessage.includes(pattern.toLowerCase()));
};

const retry = async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier,
    maxDelayMs,
    onRetry,
    retryableErrors: customErrors
  } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error = new Error('No attempts made');
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const shouldRetry = attempt < maxAttempts && isRetryable(error as Error, customErrors);

      if (!shouldRetry) {
        throw error;
      }

      const delay = Math.min(delayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);

      logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);

      if (onRetry) {
        onRetry({ attempt, maxAttempts, error: error as Error, delay });
      }

      await sleep(delay);
    }
  }

  throw lastError;
};

const retrySync = <T>(fn: () => T, options: RetryOptions = {}): T => {
  const { maxAttempts, delayMs, backoffMultiplier, maxDelayMs, onRetry, retryableErrors: customErrors } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error = new Error('No attempts made');
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      return fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt >= maxAttempts || !isRetryable(error as Error, customErrors)) {
        throw error;
      }

      const delay = Math.min(delayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);

      logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);

      if (onRetry) {
        onRetry({ attempt, maxAttempts, error: error as Error, delay });
      }

      sleep.sync(delay);
    }
  }

  throw lastError;
};

sleep.sync = (ms: number): void => {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
};

export {
  retry,
  retrySync,
  RetryableError,
  DEFAULT_OPTIONS,
  DEFAULT_RETRYABLE,
  isRetryable,
  sleep
};
