class DatabaseIndex {
  constructor() {
    this.indexes = {
      pipelines: new Map(),
      builds: new Map(),
      credentials: new Map(),
      users: new Map()
    };
    this.initialized = false;
  }

  initialize(db) {
    if (this.initialized) return;
    
    const pipelines = db.get('pipelines').value();
    const builds = db.get('builds').value();
    const credentials = db.get('credentials').value();
    const users = db.get('users').value();

    pipelines.forEach(p => {
      this.indexes.pipelines.set(p.id, p);
    });

    builds.forEach(b => {
      this.indexes.builds.set(b.id, b);
      const pipelineBuilds = this.indexes.builds.get(`pipeline:${b.pipelineId}`) || [];
      pipelineBuilds.push(b);
      this.indexes.builds.set(`pipeline:${b.pipelineId}`, pipelineBuilds);
    });

    credentials.forEach(c => {
      this.indexes.credentials.set(c.id, c);
      this.indexes.credentials.set(`name:${c.name.toLowerCase()}`, c);
    });

    users.forEach(u => {
      this.indexes.users.set(u.id, u);
      this.indexes.users.set(`email:${u.email.toLowerCase()}`, u);
    });

    this.initialized = true;
    console.log('[DB_INDEX] Database indexes initialized');
  }

  getPipeline(id) {
    return this.indexes.pipelines.get(id);
  }

  getBuild(id) {
    return this.indexes.builds.get(id);
  }

  getBuildsByPipeline(pipelineId) {
    return this.indexes.builds.get(`pipeline:${pipelineId}`) || [];
  }

  getCredential(id) {
    return this.indexes.credentials.get(id);
  }

  getCredentialByName(name) {
    return this.indexes.credentials.get(`name:${name.toLowerCase()}`);
  }

  getUser(id) {
    return this.indexes.users.get(id);
  }

  getUserByEmail(email) {
    return this.indexes.users.get(`email:${email.toLowerCase()}`);
  }

  rebuild(db) {
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

module.exports = { dbIndex, DatabaseIndex };
