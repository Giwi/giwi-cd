const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message}${stack ? '\n' + stack : ''}`;
  })
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  })
];

const MAX_LOG_SIZE = parseInt(process.env.MAX_LOG_SIZE || '10', 10) * 1024 * 1024;
const MAX_LOG_FILES = parseInt(process.env.MAX_LOG_FILES || '5', 10);

function getDiskUsagePercent(dir) {
  try {
    const stat = fs.statfsSync(dir);
    const total = stat.bsize * stat.blocks;
    const free = stat.bsize * stat.bfree;
    return total > 0 ? Math.round(((total - free) / total) * 100) : 0;
  } catch {
    return 0;
  }
}

function shouldEnableFileLogging() {
  const threshold = parseInt(process.env.LOG_DISK_THRESHOLD || '90', 10);
  const usage = getDiskUsagePercent(logDir);
  if (usage >= threshold) {
    console.error(`[Logger] Disk usage at ${usage}% (threshold: ${threshold}%), disabling file logging`);
    return false;
  }
  return true;
}

if (process.env.NODE_ENV === 'production' && shouldEnableFileLogging()) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true,
      format: logFormat
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true,
      format: logFormat
    })
  );
}

const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

function cleanupOldLogs(maxAgeDays = 7) {
  try {
    if (!fs.existsSync(logDir)) return;
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    for (const file of files) {
      if (!file.endsWith('.log')) continue;
      const filePath = path.join(logDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old log file: ${file}`);
      }
    }
  } catch (err) {
    console.error('[Logger] Cleanup error:', err.message);
  }
}

setInterval(() => cleanupOldLogs(parseInt(process.env.LOG_RETENTION_DAYS || '7', 10)), 24 * 60 * 60 * 1000);

module.exports = logger;
