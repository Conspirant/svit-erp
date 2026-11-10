/**
 * In-memory TTL cache and single-flight request coalescer for ERP data.
 * Prevents hammering Accredia with duplicate requests and provides 0ms responses
 * for frequent tab switches and page transitions.
 */

class ErpCache {
  constructor() {
    this.cache = new Map();
    this.inFlight = new Map();
  }

  /**
   * Get cached entry if not expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Set cached entry with TTL in seconds (default 15 minutes)
   */
  set(key, value, ttlSeconds = 900) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate a key or clear all
   */
  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  /**
   * Single-flight request coalescing.
   * If an async fetch for `key` is already in progress, return the existing promise
   * instead of spawning another duplicate network request to Accredia.
   */
  async coalesce(key, fetcherFn) {
    // 1. Check cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // 2. Check if a request is already in-flight
    if (this.inFlight.has(key)) {
      return await this.inFlight.get(key);
    }

    // 3. Launch new request and track promise
    const promise = (async () => {
      try {
        const result = await fetcherFn();
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return await promise;
  }
}

// Global singleton to persist across hot reloads in dev and warm serverless containers
const globalForErpCache = global;
if (!globalForErpCache.__erpCacheInstance) {
  globalForErpCache.__erpCacheInstance = new ErpCache();
}

export const erpCache = globalForErpCache.__erpCacheInstance;

