const logger = require('../config/logger');

const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  onRetry: null,
  retryableErrors: []
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

class RetryableError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'RetryableError';
    this.originalError = originalError;
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryable = (error, retryableErrors) => {
  if (!error) return false;
  
  const errorMessage = (error.message || error.code || '').toLowerCase();
  
  const patterns = [...DEFAULT_RETRYABLE, ...retryableErrors];
  return patterns.some(pattern => errorMessage.includes(pattern.toLowerCase()));
};

const retry = async (fn, options = {}) => {
  const {
    maxAttempts,
    delayMs,
    backoffMultiplier,
    maxDelayMs,
    onRetry,
    retryableErrors: customErrors
  } = { ...DEFAULT_OPTIONS, ...options };

  let lastError;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const shouldRetry = attempt < maxAttempts && isRetryable(error, customErrors);
      
      if (!shouldRetry) {
        throw error;
      }

      const delay = Math.min(delayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
      
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${delay}ms...`);
      
      if (onRetry) {
        onRetry({ attempt, maxAttempts, error, delay });
      }
      
      await sleep(delay);
    }
  }

  throw lastError;
};

const retrySync = (fn, options = {}) => {
  const { maxAttempts, delayMs, backoffMultiplier, maxDelayMs, onRetry } = { ...DEFAULT_OPTIONS, ...options };

  let lastError;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    
    try {
      return fn();
    } catch (error) {
      lastError = error;
      
      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error;
      }

      const delay = Math.min(delayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
      
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${delay}ms...`);
      
      if (onRetry) {
        onRetry({ attempt, maxAttempts, error, delay });
      }
      
      sleep.sync(delay);
    }
  }

  throw lastError;
};

sleep.sync = (ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
};

module.exports = {
  retry,
  retrySync,
  RetryableError,
  DEFAULT_OPTIONS,
  DEFAULT_RETRYABLE,
  isRetryable,
  sleep
};
