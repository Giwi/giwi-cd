const config = require('./index');

function validateEnvironment() {
  if (!config.security.jwtSecret || config.security.jwtSecret === 'giwicd-secret-key-change-in-production') {
    if (config.isProduction()) {
      console.error('[CONFIG] ERROR: JWT_SECRET must be set in production');
      process.exit(1);
    }
  }

  if (config.isProduction()) {
    console.log('[CONFIG] Running in PRODUCTION mode');
  } else {
    console.log('[CONFIG] Running in DEVELOPMENT mode');
  }

  console.log('[CONFIG] Environment validation passed');
  return true;
}

module.exports = { validateEnvironment };
