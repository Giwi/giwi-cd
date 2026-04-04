interface CacheEntry {
  data: Record<string, unknown>;
  name?: string;
  timestamp: number;
}

class CredentialCache {
  private cache: Map<string, CacheEntry>;
  private ttl: number;

  constructor(ttlMs = 300000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(id: string): Record<string, unknown> | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(id);
      return null;
    }

    return entry.data;
  }

  getByName(name: string): Record<string, unknown> | null {
    for (const [, entry] of this.cache) {
      if (entry.name?.toLowerCase() === name.toLowerCase()) {
        if (Date.now() - entry.timestamp > this.ttl) {
          this.cache.delete(entry.data.id as string);
          return null;
        }
        return entry.data;
      }
    }
    return null;
  }

  set(id: string, data: Record<string, unknown>): void {
    this.cache.set(id, {
      data,
      name: data?.name as string,
      timestamp: Date.now()
    });
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getStats(): { total: number; valid: number; expired: number } {
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

  cleanup(): void {
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

export { credentialCache, CredentialCache };
