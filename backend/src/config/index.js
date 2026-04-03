const path = require('path');

class Config {
  constructor() {
    this._loaded = false;
  }

  load() {
    if (this._loaded) return;

    this.server = {
      port: parseInt(process.env.PORT, 10) || 3000,
      env: process.env.NODE_ENV || 'development',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200'
    };

    this.database = {
      type: process.env.DB_TYPE || 'json',
      file: path.resolve(process.cwd(), process.env.DB_FILE || './data/db.json'),
      connectionString: process.env.DATABASE_URL || ''
    };

    this.security = {
      jwtSecret: process.env.JWT_SECRET || 'giwicd-secret-key-change-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };

    this.smtp = {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || ''
    };

    this.build = {
      timeout: parseInt(process.env.BUILD_TIMEOUT, 10) || 300000,
      maxBuffer: parseInt(process.env.BUILD_MAX_BUFFER, 10) || 10 * 1024 * 1024,
      pollingInterval: parseInt(process.env.POLLING_INTERVAL, 10) || 60
    };

    this.limits = {
      maxConcurrentBuilds: parseInt(process.env.MAX_CONCURRENT_BUILDS, 10) || 3,
      defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT, 10) || 3600,
      retentionDays: parseInt(process.env.RETENTION_DAYS, 10) || 30,
      allowRegistration: process.env.ALLOW_REGISTRATION !== 'false'
    };

    this.logging = {
      level: process.env.LOG_LEVEL || 'info'
    };

    this._loaded = true;
  }

  get(key) {
    this.load();
    const keys = key.split('.');
    let value = this;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  }

  getAll() {
    this.load();
    return {
      server: { ...this.server, env: this.server.env },
      database: { ...this.database },
      security: { jwtSecret: '***', jwtExpiresIn: this.security.jwtExpiresIn },
      smtp: { host: this.smtp.host, port: this.smtp.port },
      build: { ...this.build },
      limits: { ...this.limits },
      logging: { ...this.logging }
    };
  }

  isProduction() {
    return this.server.env === 'production';
  }

  isDevelopment() {
    return this.server.env === 'development';
  }
}

const config = new Config();
config.load();

module.exports = config;
