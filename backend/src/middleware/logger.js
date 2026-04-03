const crypto = require('crypto');

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  log(level, message, meta = {}) {
    if (this.levels[level] > this.levels[this.level]) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };
    
    if (level === LOG_LEVELS.ERROR) {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  error(message, meta) { this.log(LOG_LEVELS.ERROR, message, meta); }
  warn(message, meta) { this.log(LOG_LEVELS.WARN, message, meta); }
  info(message, meta) { this.log(LOG_LEVELS.INFO, message, meta); }
  debug(message, meta) { this.log(LOG_LEVELS.DEBUG, message, meta); }
}

const logger = new Logger();

const requestLogger = (req, res, next) => {
  const requestId = crypto.randomBytes(8).toString('hex');
  req.id = requestId;
  
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, `${req.method} ${req.originalUrl}`, {
      requestId,
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

module.exports = { logger, requestLogger, LOG_LEVELS };
