const logger = require('../config/logger');

const createLogger = (module) => {
  return {
    error: (message, meta) => logger.error(message, { module, ...meta }),
    warn: (message, meta) => logger.warn(message, { module, ...meta }),
    info: (message, meta) => logger.info(message, { module, ...meta }),
    debug: (message, meta) => logger.debug(message, { module, ...meta })
  };
};

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(level, `${req.method} ${req.originalUrl}`, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || null
    });
  });
  
  next();
};

module.exports = { logger, createLogger, requestLogger };
