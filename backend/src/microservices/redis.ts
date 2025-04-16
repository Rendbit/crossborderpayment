import * as cacheManager from "cache-manager";
import * as redisStore from "cache-manager-redis-store";

class InternalCacheService {
  private cache: cacheManager.Cache;

  constructor() {
    this.cache = cacheManager.caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      ttl: 60 * 5,
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(key, value, { ttl });
  }

  async delete(key: string): Promise<void> {
    await this.cache.del(key);
  }

  // Health check method
  async checkConnection(): Promise<void> {
    const testKey = "__redis_health_check__";
    try {
      await this.set(testKey, "ok", 1);
      const result = await this.get<string>(testKey);
      if (result !== "ok") throw new Error("Redis connection failed");
      console.log("✅ Connected to Redis");
    } catch (err: any) {
      throw new Error("Unable to connect to Redis: " + err.message);
    }
  }
}

export const internalCacheService = new InternalCacheService();
