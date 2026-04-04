import type { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

interface ModuleLogger {
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

const createLogger = (module: string): ModuleLogger => {
  return {
    error: (message, meta) => logger.error(message, { module, ...meta }),
    warn: (message, meta) => logger.warn(message, { module, ...meta }),
    info: (message, meta) => logger.info(message, { module, ...meta }),
    debug: (message, meta) => logger.debug(message, { module, ...meta })
  };
};

const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, `${req.method} ${req.originalUrl}`, {
      requestId: (req as unknown as Record<string, unknown>).id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as unknown as Record<string, unknown>).user ? ((req as unknown as Record<string, unknown>).user as { id: string }).id : null
    });
  });

  next();
};

export { logger, createLogger, requestLogger };
