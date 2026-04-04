interface PipelineIndexEntry {
  [id: string]: Record<string, unknown>;
}

interface BuildIndexEntry {
  [id: string]: Record<string, unknown> | Record<string, unknown>[];
}

interface CredentialIndexEntry {
  [id: string]: Record<string, unknown>;
}

interface UserIndexEntry {
  [id: string]: Record<string, unknown>;
}

class DatabaseIndex {
  indexes: {
    pipelines: Map<string, Record<string, unknown>>;
    builds: Map<string, Record<string, unknown> | Record<string, unknown>[]>;
    credentials: Map<string, Record<string, unknown>>;
    users: Map<string, Record<string, unknown>>;
  };
  initialized: boolean;

  constructor() {
    this.indexes = {
      pipelines: new Map(),
      builds: new Map(),
      credentials: new Map(),
      users: new Map()
    };
    this.initialized = false;
  }

  initialize(db: { get: (collection: string) => { value: () => Record<string, unknown>[] } }): void {
    if (this.initialized) return;

    const pipelines = db.get('pipelines').value();
    const builds = db.get('builds').value();
    const credentials = db.get('credentials').value();
    const users = db.get('users').value();

    pipelines.forEach(p => {
      this.indexes.pipelines.set(p.id as string, p);
    });

    builds.forEach(b => {
      this.indexes.builds.set(b.id as string, b);
      const pipelineBuilds = this.indexes.builds.get(`pipeline:${b.pipelineId}`) as Record<string, unknown>[] || [];
      if (Array.isArray(pipelineBuilds)) {
        pipelineBuilds.push(b);
      }
      this.indexes.builds.set(`pipeline:${b.pipelineId}`, pipelineBuilds);
    });

    credentials.forEach(c => {
      this.indexes.credentials.set(c.id as string, c);
      this.indexes.credentials.set(`name:${(c.name as string).toLowerCase()}`, c);
    });

    users.forEach(u => {
      this.indexes.users.set(u.id as string, u);
      this.indexes.users.set(`email:${(u.email as string).toLowerCase()}`, u);
    });

    this.initialized = true;
    console.log('[DB_INDEX] Database indexes initialized');
  }

  getPipeline(id: string): Record<string, unknown> | undefined {
    return this.indexes.pipelines.get(id);
  }

  getBuild(id: string): Record<string, unknown> | undefined {
    return this.indexes.builds.get(id) as Record<string, unknown> | undefined;
  }

  getBuildsByPipeline(pipelineId: string): Record<string, unknown>[] {
    return (this.indexes.builds.get(`pipeline:${pipelineId}`) as Record<string, unknown>[]) || [];
  }

  getCredential(id: string): Record<string, unknown> | undefined {
    return this.indexes.credentials.get(id);
  }

  getCredentialByName(name: string): Record<string, unknown> | undefined {
    return this.indexes.credentials.get(`name:${name.toLowerCase()}`);
  }

  getUser(id: string): Record<string, unknown> | undefined {
    return this.indexes.users.get(id);
  }

  getUserByEmail(email: string): Record<string, unknown> | undefined {
    return this.indexes.users.get(`email:${email.toLowerCase()}`);
  }

  rebuild(db: { get: (collection: string) => { value: () => Record<string, unknown>[] } }): void {
    this.initialized = false;
    this.indexes = {
      pipelines: new Map(),
      builds: new Map(),
      credentials: new Map(),
      users: new Map()
    };
    this.initialize(db);
  }
}

const dbIndex = new DatabaseIndex();

export { dbIndex, DatabaseIndex };
