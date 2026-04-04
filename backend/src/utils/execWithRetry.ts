import { exec, ExecException, ExecOptions } from 'child_process';
import { retry } from './retry';
import logger from '../config/logger';

interface ExecResult {
  stdout: string;
  stderr: string;
}

interface ExecWithRetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: (info: { attempt: number; delay: number; error: Error }) => void;
  retryableErrors?: string[];
  [key: string]: unknown;
}

const execWithRetry = (command: string, options: ExecWithRetryOptions = {}): Promise<ExecResult> => {
  const defaultOptions = {
    maxAttempts: 3,
    delayMs: 2000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
    onRetry: ({ attempt, delay, error }: { attempt: number; delay: number; error: Error }) => {
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
  const execOptions: ExecOptions = typeof options === 'object' && !Array.isArray(options)
    ? options as ExecOptions
    : {};

  return retry(() => {
    return new Promise<ExecResult>((resolve, reject) => {
      exec(command, execOptions, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }, mergedOptions);
};

export { execWithRetry };
