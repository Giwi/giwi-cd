import config from './index';
import logger from './logger';

function validateEnvironment(): boolean {
  if (!config.security.jwtSecret || config.security.jwtSecret === 'giwicd-secret-key-change-in-production') {
    if (config.isProduction()) {
      logger.error('JWT_SECRET must be set in production');
      process.exit(1);
    }
  }

  if (config.isProduction()) {
    logger.info('Running in PRODUCTION mode');
  } else {
    logger.info('Running in DEVELOPMENT mode');
  }

  logger.info('Environment validation passed');
  return true;
}

export { validateEnvironment };
