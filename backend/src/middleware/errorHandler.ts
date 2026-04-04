import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

const errorHandler = (err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error(err.stack || err.message);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const notFound = (req: Request, res: Response): void => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`
  });
};

const sendError = (res: Response, statusCode: number, message: string): void => {
  res.status(statusCode).json({ success: false, error: message });
};

class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export { errorHandler, notFound, sendError, AppError };
