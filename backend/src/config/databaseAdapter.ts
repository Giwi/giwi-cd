interface CollectionQuery {
  [key: string]: unknown;
}

interface CollectionChain {
  value: () => unknown[];
  find: (query: CollectionQuery | ((item: Record<string, unknown>) => boolean)) => FindChain;
  filter: (query: CollectionQuery | null) => FilterChain;
  push: (item: Record<string, unknown>) => CollectionChain;
  assign: (updates: Record<string, unknown>) => CollectionChain;
  map: (fn: (item: Record<string, unknown>) => unknown) => { value: () => unknown[] };
  take: (n: number) => { value: () => unknown[] };
  orderBy: (keys: string[], orders: string[]) => { reverse: () => { value: () => unknown[] }; value: () => unknown[] };
}

interface FindChain {
  value: () => Record<string, unknown> | undefined;
  assign: (updates: Record<string, unknown>) => CollectionChain;
  remove: () => CollectionChain;
}

interface FilterChain {
  value: () => Record<string, unknown>[];
  assign: (updates: Record<string, unknown>) => CollectionChain;
}

abstract class DatabaseAdapter {
  client: unknown = null;
  isConnected = false;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract get(collection: string): CollectionChain;
  abstract getData(): Record<string, unknown>;
  abstract write(): void;
}

class JsonAdapter extends DatabaseAdapter {
  private filePath: string;
  private data: Record<string, unknown[]> = {};
  private fs: typeof import('fs');

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
    this.fs = require('fs');
  }

  connect(): Promise<void> {
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

  disconnect(): Promise<void> {
    this.isConnected = false;
    return Promise.resolve();
  }

  private _getDefaults(): Record<string, unknown[]> {
    return {
      users: [],
      pipelines: [],
      builds: [],
      jobs: [],
      agents: [],
      credentials: [],
      settings: [{
        maxConcurrentBuilds: 3,
        defaultTimeout: 3600,
        retentionDays: 30,
        allowRegistration: true,
        pollingInterval: 60,
        notificationDefaults: {}
      }] as unknown[]
    };
  }

  private _writeSync(): void {
    const path = require('path');
    const dir = path.dirname(this.filePath);
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true });
    }
    this.fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  get(collection: string): CollectionChain {
    const self = this;
    return {
      value: () => (self.data[collection] as unknown[]) || [],
      find: (query) => ({
        value: () => {
          const items = (self.data[collection] as Record<string, unknown>[]) || [];
          if (typeof query === 'function') return items.filter(query)[0];
          return items.find(item => Object.keys(query).every(k => item[k] === (query as CollectionQuery)[k]));
        },
        assign: (updates) => {
          const idx = (self.data[collection] as Record<string, unknown>[]).findIndex(item =>
            Object.keys(query as CollectionQuery).every(k => item[k] === (query as CollectionQuery)[k])
          );
          if (idx >= 0) {
            (self.data[collection] as Record<string, unknown>[])[idx] = { ...(self.data[collection] as Record<string, unknown>[])[idx], ...updates };
            self._writeSync();
          }
          return self.get(collection);
        },
        remove: () => {
          self.data[collection] = (self.data[collection] as Record<string, unknown>[]).filter(item =>
            !Object.keys(query as CollectionQuery).every(k => item[k] === (query as CollectionQuery)[k])
          );
          self._writeSync();
          return self.get(collection);
        }
      }),
      filter: (query) => ({
        value: () => {
          const items = (self.data[collection] as Record<string, unknown>[]) || [];
          if (!query) return items;
          return items.filter(item => Object.keys(query).every(k => item[k] === query[k]));
        },
        assign: (updates) => {
          self.data[collection] = (self.data[collection] as Record<string, unknown>[]).map(item => ({ ...item, ...updates }));
          self._writeSync();
          return self.get(collection);
        }
      }),
      push: (item) => {
        (self.data[collection] as Record<string, unknown>[]).push(item);
        self._writeSync();
        return self.get(collection);
      },
      assign: (updates) => {
        self.data[collection] = { ...(self.data[collection] as Record<string, unknown>[]), ...updates } as unknown as Record<string, unknown>[];
        self._writeSync();
        return self.get(collection);
      },
      map: (fn) => ({
        value: () => ((self.data[collection] as Record<string, unknown>[]) || []).map(fn)
      }),
      take: (n) => ({
        value: () => ((self.data[collection] as Record<string, unknown>[]) || []).slice(0, n)
      }),
      orderBy: (keys, orders) => {
        const items = [...((self.data[collection] as Record<string, unknown>[]) || [])];
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

  getData(): Record<string, unknown> {
    return this.data;
  }

  write(): void {
    this._writeSync();
  }
}

class PostgresAdapter extends DatabaseAdapter {
  private connectionString: string;
  private options: Record<string, unknown>;
  private pool: unknown = null;

  constructor(connectionString: string, options: Record<string, unknown> = {}) {
    super();
    this.connectionString = connectionString;
    this.options = options;
  }

  async connect(): Promise<void> {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString: this.connectionString,
      ...this.options
    });

    try {
      const client = await (this.pool as { connect: () => Promise<{ release: () => void }> }).connect();
      client.release();
      this.isConnected = true;
      console.log('[DB] PostgreSQL connected');
    } catch (err) {
      console.error('[DB] PostgreSQL connection error:', (err as Error).message);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await (this.pool as { end: () => Promise<void> }).end();
      this.isConnected = false;
    }
  }

  get(_collection: string): CollectionChain {
    throw new Error('PostgresAdapter is not fully implemented');
  }

  getData(): Record<string, unknown> {
    return {};
  }

  write(): void {
    // no-op for postgres
  }
}

const createDatabase = (type = 'json', options: Record<string, unknown> = {}): DatabaseAdapter => {
  switch (type) {
    case 'postgres':
      return new PostgresAdapter(options.connectionString as string, options.pool as Record<string, unknown>);
    case 'json':
    default:
      return new JsonAdapter((options.filePath as string) || './data/db.json');
  }
};

export {
  DatabaseAdapter,
  JsonAdapter,
  PostgresAdapter,
  createDatabase
};
