global.beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DB_FILE = './data/test-db.json';
});

global.afterEach(() => {
  const fs = require('fs');
  const path = require('path');
  const dbFile = path.join(__dirname, 'data/test-db.json');
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }
});
