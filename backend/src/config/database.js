const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const adapter = new FileSync(path.join(dbDir, 'db.json'));
const db = low(adapter);

// Set default data structure
db.defaults({
  users: [],
  pipelines: [],
  builds: [],
  jobs: [],
  agents: [],
  credentials: [],
  settings: {
    maxConcurrentBuilds: 3,
    defaultTimeout: 3600,
    retentionDays: 30,
    allowRegistration: true,
    pollingInterval: 60,
    notificationDefaults: {}
  }
}).write();

module.exports = db;
