import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbFile = process.env.DB_FILE || path.join(dbDir, 'db.json');
const sqliteFile = dbFile.replace(/\.json$/, '.db');

const sqlite = new Database(sqliteFile);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS _kv (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pipelines (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  );
`);

function tableFor(collection: string): string {
  const tables = ['users', 'pipelines', 'builds', 'credentials', 'jobs', 'agents', 'settings'];
  if (!tables.includes(collection)) throw new Error(`Unknown collection: ${collection}`);
  return collection;
}

function rowToRecord(row: { data: string }): Record<string, unknown> {
  return JSON.parse(row.data);
}

class CollectionChain implements QueryChain {
  private collection: string;
  private _items: Record<string, unknown>[] | null = null;
  private _filtered: ((item: Record<string, unknown>) => boolean) | null = null;

  constructor(collection: string) {
    this.collection = collection;
  }

  private getItems(): Record<string, unknown>[] {
    if (this._items === null) {
      const table = tableFor(this.collection);
      const stmt = sqlite.prepare(`SELECT data FROM ${table}`);
      const rows = stmt.all() as { data: string }[];
      this._items = rows.map(r => JSON.parse(r.data));
    }
    return this._items;
  }

  private getFilteredItems(): Record<string, unknown>[] {
    const items = this.getItems();
    if (this._filtered) return items.filter(this._filtered);
    return items;
  }

  private saveItems(items: Record<string, unknown>[]): void {
    const table = tableFor(this.collection);
    const insert = sqlite.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (@id, @data)`);
    const del = sqlite.prepare(`DELETE FROM ${table} WHERE id = @id`);

    const existing = new Set(items.map(i => i.id as string));
    const current = this.getItems();
    for (const item of current) {
      if (!existing.has(item.id as string)) {
        del.run({ id: item.id });
      }
    }
    for (const item of items) {
      insert.run({ id: item.id, data: JSON.stringify(item) });
    }
    this._items = [...items];
  }

  private saveItem(item: Record<string, unknown>): void {
    const table = tableFor(this.collection);
    const insert = sqlite.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (@id, @data)`);
    insert.run({ id: item.id, data: JSON.stringify(item) });
    this._items = null;
  }

  private deleteItem(id: string): void {
    const table = tableFor(this.collection);
    const del = sqlite.prepare(`DELETE FROM ${table} WHERE id = @id`);
    del.run({ id });
    this._items = null;
  }

  value(): unknown {
    return this.getFilteredItems();
  }

  write(): QueryChain {
    return this;
  }

  push(item: Record<string, unknown>): QueryChain {
    this.saveItem(item);
    return this;
  }

  find(query: Record<string, unknown>): FindChain {
    const self = this;
    const item = this.getItems().find(i =>
      Object.keys(query).every(k => i[k] === query[k])
    );
    return {
      value(): Record<string, unknown> | undefined {
        return item;
      },
      assign(updates: Record<string, unknown>): QueryChain {
        if (item) {
          Object.assign(item, updates);
          self.saveItem(item);
        }
        return self;
      },
      remove(): QueryChain {
        if (item) {
          self.deleteItem(item.id as string);
        }
        return self;
      }
    };
  }

  filter(query: Record<string, unknown> | ((item: Record<string, unknown>) => boolean)): FilterChain {
    const self = this;
    const pred = typeof query === 'function'
      ? query
      : (item: Record<string, unknown>) => Object.keys(query).every(k => item[k] === query[k]);

    const chain: FilterChain & {
      orderBy(keys: string[], orders: string[]): { reverse(): { value(): unknown[] }; value(): unknown[]; take(n: number): { value(): unknown[] } };
      sortBy(key: string): { reverse(): { value(): unknown[] }; value(): unknown[] };
      take(n: number): { value(): unknown[] };
    } = {
      value(): Record<string, unknown>[] {
        return self.getItems().filter(pred);
      },
      assign(updates: Record<string, unknown>): QueryChain {
        const items = self.getItems().map(item => ({ ...item, ...updates }));
        self.saveItems(items);
        return self;
      },
      orderBy(keys: string[], orders: string[]): { reverse(): { value(): unknown[] }; value(): unknown[]; take(n: number): { value(): unknown[] } } {
        const items = [...self.getItems().filter(pred)];
        items.sort((a, b) => {
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const order = orders[i] || 'asc';
            const aVal = a[key];
            const bVal = b[key];
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
          }
          return 0;
        });
        const result = {
          reverse(): { value(): unknown[] } { items.reverse(); return { value: () => items }; },
          value(): unknown[] { return items; },
          take(n: number): { value(): unknown[] } { return { value: () => items.slice(0, n) }; }
        };
        return result;
      },
      take(n: number): { value(): unknown[] } {
        const items = self.getItems().filter(pred).slice(0, n);
        return { value: () => items };
      },
      sortBy(key: string): { reverse(): { value(): unknown[] }; value(): unknown[] } {
        const items = [...self.getItems().filter(pred)];
        items.sort((a, b) => {
          const aVal = a[key];
          const bVal = b[key];
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
        });
        return {
          reverse(): { value(): unknown[] } { items.reverse(); return { value: () => items }; },
          value(): unknown[] { return items; }
        };
      }
    };
    return chain;
  }

  remove(query: Record<string, unknown>): QueryChain {
    const items = this.getItems().filter(item =>
      !Object.keys(query).every(k => item[k] === query[k])
    );
    this.saveItems(items);
    return this;
  }

  assign(updates: Record<string, unknown>): QueryChain {
    const items = this.getItems().map(item => ({ ...item, ...updates }));
    this.saveItems(items);
    return this;
  }

  map(fn: (item: Record<string, unknown>) => unknown): { value(): unknown[] } {
    const items = this.getItems().map(fn);
    return { value: () => items };
  }

  take(n: number): { value(): unknown[] } {
    const items = this.getFilteredItems().slice(0, n);
    return { value: () => items };
  }

  orderBy(keys: string[], orders: string[]): { reverse(): { value(): unknown[]; take(n: number): { value(): unknown[] } }; value(): unknown[]; take(n: number): { value(): unknown[] } } {
    const items = [...this.getFilteredItems()];
    items.sort((a, b) => {
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const order = orders[i] || 'asc';
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
    const takeFn = (n: number): { value(): unknown[] } => ({ value: () => items.slice(0, n) });
    return {
      reverse: () => { items.reverse(); return { value: () => items, take: takeFn }; },
      value: () => items,
      take: takeFn
    };
  }
}

const db = {
  get(collection: string): CollectionChain {
    return new CollectionChain(collection);
  },

  set(collection: string, value: unknown): QueryChain & { write(): QueryChain & { write(): QueryChain } } {
    const table = tableFor(collection);
    if (collection === 'settings') {
      const del = sqlite.prepare(`DELETE FROM ${table}`);
      const insert = sqlite.prepare(`INSERT INTO ${table} (id, data) VALUES (1, @data)`);
      del.run();
      insert.run({ data: JSON.stringify(value) });
    } else if (Array.isArray(value)) {
      const del = sqlite.prepare(`DELETE FROM ${table}`);
      const insert = sqlite.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (@id, @data)`);
      del.run();
      for (const item of value) {
        if (item && typeof item === 'object' && 'id' in item) {
          insert.run({ id: item.id, data: JSON.stringify(item) });
        }
      }
    }
    const chain: QueryChain & { write(): QueryChain & { write(): QueryChain } } = {
      value(): unknown { return value; },
      push(): QueryChain { return this; },
      find(): FindChain {
        return { value: () => undefined, assign: () => this, remove: () => this };
      },
      filter(): FilterChain {
        return { value: () => [], assign: () => this };
      },
      remove(): QueryChain { return this; },
      assign(): QueryChain { return this; },
      map(): { value(): unknown[] } { return { value: () => [] }; },
      take(): { value(): unknown[] } { return { value: () => [] }; },
      orderBy(): { reverse(): { value(): unknown[] }; value(): unknown[] } {
        return { reverse: () => ({ value: () => [] }), value: () => [] };
      },
      write(): QueryChain & { write(): QueryChain } {
        return {
          ...this,
          write(): QueryChain & { write(): QueryChain } {
            return this;
          }
        };
      }
    };
    return chain;
  },

  defaults(defaults: Record<string, unknown>): QueryChain {
    for (const [key, value] of Object.entries(defaults)) {
      try {
        const table = tableFor(key);
        const count = sqlite.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as { cnt: number };
        if (count.cnt === 0) {
          if (key === 'settings') {
            const insert = sqlite.prepare(`INSERT INTO ${table} (id, data) VALUES (1, @data)`);
            insert.run({ data: JSON.stringify(value) });
          } else if (Array.isArray(value)) {
            const insert = sqlite.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (@id, @data)`);
            for (const item of value) {
              if (item && typeof item === 'object' && 'id' in item) {
                insert.run({ id: item.id, data: JSON.stringify(item) });
              }
            }
          }
        }
      } catch {
        // table doesn't exist yet
      }
    }
    return {
      value(): unknown { return defaults; },
      push(): QueryChain { return this; },
      find(): FindChain {
        return { value: () => undefined, assign: () => this, remove: () => this };
      },
      filter(): FilterChain {
        return { value: () => [], assign: () => this };
      },
      remove(): QueryChain { return this; },
      assign(): QueryChain { return this; },
      map(): { value(): unknown[] } { return { value: () => [] }; },
      take(): { value(): unknown[] } { return { value: () => [] }; },
      orderBy(): { reverse(): { value(): unknown[] }; value(): unknown[] } {
        return { reverse: () => ({ value: () => [] }), value: () => [] };
      },
      write(): QueryChain { return this; }
    };
  }
};

const dbIndex = null;

const initDbIndex = (): unknown => {
  return null;
};

export { db, dbIndex, initDbIndex };
export default db;
