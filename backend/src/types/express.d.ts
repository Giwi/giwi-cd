import type BuildRunner from '../services/BuildRunner';
import type { BuildExecutor } from '../services/BuildExecutor';
import type PollingService from '../services/PollingService';
import type WebSocketManager from '../services/WebSocketManager';

declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
      csrfToken?: string;
      user?: { id?: string; email?: string; role?: string; [key: string]: unknown };
      userId?: string;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Application {
    set(name: 'buildRunner', val: BuildRunner): this;
    set(name: 'buildExecutor', val: BuildExecutor): this;
    set(name: 'pollingService', val: PollingService): this;
    set(name: 'wsManager', val: WebSocketManager): this;
    set(name: string, val: unknown): this;
    get(name: 'buildRunner'): BuildRunner | undefined;
    get(name: 'buildExecutor'): BuildExecutor | undefined;
    get(name: 'pollingService'): PollingService | undefined;
    get(name: 'wsManager'): WebSocketManager | undefined;
    get(name: string): unknown;
  }
}
