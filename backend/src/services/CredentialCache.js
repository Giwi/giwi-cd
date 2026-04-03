class CredentialCache {
  constructor(ttlMs = 300000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(id) {
    const entry = this.cache.get(id);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(id);
      return null;
    }
    
    return entry.data;
  }

  getByName(name) {
    for (const [id, entry] of this.cache) {
      if (entry.name.toLowerCase() === name.toLowerCase()) {
        if (Date.now() - entry.timestamp > this.ttl) {
          this.cache.delete(id);
          return null;
        }
        return entry.data;
      }
    }
    return null;
  }

  set(id, data) {
    this.cache.set(id, {
      data,
      name: data?.name,
      timestamp: Date.now()
    });
  }

  invalidate(id) {
    this.cache.delete(id);
  }

  invalidateAll() {
    this.cache.clear();
  }

  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > this.ttl) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(id);
      }
    }
  }
}

const credentialCache = new CredentialCache(300000);

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => credentialCache.cleanup(), 60000);
}

module.exports = { credentialCache, CredentialCache };
