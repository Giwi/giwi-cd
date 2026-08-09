import logger from '../config/logger';

const DEFAULT_RETRYABLE = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'EAGAIN',
  'EMFILE',
  'ENFILE',
  'fetch failed',
  'connection',
  'timeout',
  'network',
  'temporary failure',
  'resource temporarily unavailable',
  'Could not resolve host',
  'The remote end hung up unexpectedly',
  'SSL connection'
];

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: ((info: { attempt: number; maxAttempts: number; error: Error; delay: number }) => void) | null;
  retryableErrors?: string[];
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const isRetryable = (error: Error, retryableErrors: string[]): boolean => {
  if (!error) return false;
  const errorMessage = (error.message || (error as NodeJS.ErrnoException).code || '').toLowerCase();
  return [...DEFAULT_RETRYABLE, ...retryableErrors].some(p => errorMessage.includes(p.toLowerCase()));
};

const retry = async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    onRetry = null,
    retryableErrors: customErrors = []
  } = options;

  let lastError: Error = new Error('No attempts made');
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt >= maxAttempts || !isRetryable(error as Error, customErrors)) throw error;
      const delay = Math.min(delayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);
      if (onRetry) onRetry({ attempt, maxAttempts, error: error as Error, delay });
      await sleep(delay);
    }
  }
  throw lastError;
};

export { retry };
