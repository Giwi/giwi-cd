class DatabaseAdapter {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    throw new Error('connect() must be implemented');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented');
  }

  get(collection) {
    throw new Error('get() must be implemented');
  }

  getData() {
    throw new Error('getData() must be implemented');
  }

  write() {
    throw new Error('write() must be implemented');
  }
}

class JsonAdapter extends DatabaseAdapter {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    this.data = {};
    this.fs = require('fs');
  }

  connect() {
    try {
      if (this.fs.existsSync(this.filePath)) {
        const content = this.fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(content);
      } else {
        this.data = this._getDefaults();
        this._writeSync();
      }
      this.isConnected = true;
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  disconnect() {
    this.isConnected = false;
    return Promise.resolve();
  }

  _getDefaults() {
    return {
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
    };
  }

  _writeSync() {
    const dir = require('path').dirname(this.filePath);
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true });
    }
    this.fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  get(collection) {
    const self = this;
    return {
      value: () => self.data[collection] || [],
      find: (query) => ({
        value: () => {
          const items = self.data[collection] || [];
          if (typeof query === 'function') return items.filter(query)[0];
          return items.find(item => Object.keys(query).every(k => item[k] === query[k]));
        },
        assign: (updates) => {
          const idx = self.data[collection].findIndex(item => 
            Object.keys(query).every(k => item[k] === query[k])
          );
          if (idx >= 0) {
            self.data[collection][idx] = { ...self.data[collection][idx], ...updates };
            self._writeSync();
          }
          return self.get(collection);
        },
        remove: () => {
          self.data[collection] = self.data[collection].filter(item =>
            !Object.keys(query).every(k => item[k] === query[k])
          );
          self._writeSync();
          return self.get(collection);
        }
      }),
      filter: (query) => ({
        value: () => {
          const items = self.data[collection] || [];
          if (!query) return items;
          return items.filter(item => Object.keys(query).every(k => item[k] === query[k]));
        },
        assign: (updates) => {
          self.data[collection] = self.data[collection].map(item => ({ ...item, ...updates }));
          self._writeSync();
          return self.get(collection);
        }
      }),
      push: (item) => {
        self.data[collection].push(item);
        self._writeSync();
        return self.get(collection);
      },
      assign: (updates) => {
        self.data[collection] = { ...self.data[collection], ...updates };
        self._writeSync();
        return self.get(collection);
      },
      map: (fn) => ({
        value: () => (self.data[collection] || []).map(fn)
      }),
      take: (n) => ({
        value: () => (self.data[collection] || []).slice(0, n)
      }),
      orderBy: (keys, orders) => {
        const items = [...(self.data[collection] || [])];
        return {
          reverse: () => {
            items.reverse();
            return { value: () => items };
          },
          value: () => items
        };
      }
    };
  }

  getData() {
    return this.data;
  }

  write() {
    this._writeSync();
  }
}

class PostgresAdapter extends DatabaseAdapter {
  constructor(connectionString, options = {}) {
    super();
    this.connectionString = connectionString;
    this.options = options;
    this.pool = null;
  }

  async connect() {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString: this.connectionString,
      ...this.options
    });
    
    try {
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      console.log('[DB] PostgreSQL connected');
    } catch (err) {
      console.error('[DB] PostgreSQL connection error:', err.message);
      throw err;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
    }
  }

  get(collection) {
    const tableName = collection;
    const self = this;
    
    return {
      value: async () => {
        const result = await self.pool.query(`SELECT * FROM ${tableName}`);
        return result.rows;
      },
      find: (query) => ({
        value: async () => {
          const conditions = Object.keys(query).map((k, i) => `${k} = $${i + 1}`).join(' AND ');
          const values = Object.values(query);
          const result = await self.pool.query(
            `SELECT * FROM ${tableName} WHERE ${conditions} LIMIT 1`,
            values
          );
          return result.rows[0] || null;
        },
        assign: async (updates) => {
          const conditions = Object.keys(query).map((k, i) => `${k} = $${i + 1}`).join(' AND ');
          const values = [...Object.values(query), ...Object.values(updates)];
          const setClause = Object.keys(updates).map((k, i) => `${k} = $${Object.keys(query).length + i + 1}`).join(', ');
          await self.pool.query(
            `UPDATE ${tableName} SET ${setClause} WHERE ${conditions}`,
            values
          );
          return self.get(collection);
        }
      }),
      push: async (item) => {
        const columns = Object.keys(item).join(', ');
        const placeholders = Object.keys(item).map((_, i) => `$${i + 1}`).join(', ');
        await self.pool.query(
          `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
          Object.values(item)
        );
        return self.get(collection);
      }
    };
  }
}

const createDatabase = (type = 'json', options = {}) => {
  switch (type) {
    case 'postgres':
      return new PostgresAdapter(options.connectionString, options.pool);
    case 'json':
    default:
      return new JsonAdapter(options.filePath || './data/db.json');
  }
};

module.exports = {
  DatabaseAdapter,
  JsonAdapter,
  PostgresAdapter,
  createDatabase
};
