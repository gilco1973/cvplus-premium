export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastCleared?: Date;
}

class CacheService {
  private cache = new Map<string, { value: any; expiry: number }>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };

  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
    this.stats.size = this.cache.size;
  }

  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return undefined;
    }

    this.stats.hits++;
    return item.value as T;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, lastCleared: new Date() };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }
}

export const cacheService = new CacheService();
