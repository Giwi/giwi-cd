const { exec } = require('child_process');
const { retry } = require('./utils/retry');

const execWithRetry = (command, options = {}) => {
  const defaultOptions = {
    maxAttempts: 3,
    delayMs: 2000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
    onRetry: ({ attempt, delay, error }) => {
      logger.debug(`Retry attempt ${attempt} after ${delay}ms: ${error.message}`);
    },
    retryableErrors: [
      'Could not resolve host',
      'The remote end hung up unexpectedly',
      'SSL connection',
      'Connection reset',
      'Connection timed out',
      'Network is unreachable',
      'Temporary failure'
    ]
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const execOptions = typeof options === 'object' && !Array.isArray(options) 
    ? options 
    : {};

  return retry(() => {
    return new Promise((resolve, reject) => {
      exec(command, execOptions, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }, mergedOptions);
};

module.exports = { execWithRetry };
