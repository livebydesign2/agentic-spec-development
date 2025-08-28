/**
 * LRU (Least Recently Used) Cache implementation
 * Used for caching parsed specifications and preventing memory leaks
 */
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map(); // Maintains insertion order
    this.accessTimes = new Map();
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * Get value from cache
   */
  get(key) {
    if (this.cache.has(key)) {
      this.hitCount++;
      this.accessTimes.set(key, Date.now());
      
      // Move to end to mark as recently used
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      
      return value;
    }
    
    this.missCount++;
    return undefined;
  }

  /**
   * Set value in cache
   */
  set(key, value) {
    const now = Date.now();
    
    // If key exists, update it
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.cache.set(key, value);
      this.accessTimes.set(key, now);
      return this;
    }

    // If at capacity, remove least recently used
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, value);
    this.accessTimes.set(key, now);
    
    return this;
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Delete specific key from cache
   */
  delete(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Evict the least recently used item
   */
  evictLRU() {
    // The first item in Map is the least recently used (oldest)
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
      this.accessTimes.delete(firstKey);
      this.evictionCount++;
    }
  }

  /**
   * Clear all cached items
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }

  /**
   * Get current cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all keys in cache (most recent first)
   */
  keys() {
    return Array.from(this.cache.keys()).reverse();
  }

  /**
   * Get all values in cache (most recent first)
   */
  values() {
    return Array.from(this.cache.values()).reverse();
  }

  /**
   * Get all entries in cache (most recent first)
   */
  entries() {
    return Array.from(this.cache.entries()).reverse();
  }

  /**
   * Force eviction of old entries based on age
   */
  evictOldEntries(maxAge = 300000) { // 5 minutes default
    const now = Date.now();
    const toEvict = [];
    
    for (const [key, accessTime] of this.accessTimes.entries()) {
      if (now - accessTime > maxAge) {
        toEvict.push(key);
      }
    }
    
    for (const key of toEvict) {
      this.delete(key);
      this.evictionCount++;
    }
    
    return toEvict.length;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalAccess = this.hitCount + this.missCount;
    const hitRate = totalAccess > 0 ? (this.hitCount / totalAccess) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      evictionCount: this.evictionCount,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, value] of this.cache.entries()) {
      // Rough estimation: string keys + JSON serialization of values
      totalSize += key.length * 2; // 2 bytes per character
      try {
        totalSize += JSON.stringify(value).length * 2;
      } catch (error) {
        // If value can't be serialized, estimate based on type
        if (typeof value === 'string') {
          totalSize += value.length * 2;
        } else {
          totalSize += 100; // Default estimate
        }
      }
    }
    
    return Math.max(1, Math.round(totalSize / 1024)); // Return at least 1KB
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * Get a formatted report of cache status
   */
  generateReport() {
    const stats = this.getStats();
    
    const report = [];
    report.push('=== LRU CACHE REPORT ===');
    report.push(`Cache Size: ${stats.size}/${stats.maxSize}`);
    report.push(`Hit Rate: ${stats.hitRate}%`);
    report.push(`Hits: ${stats.hitCount}`);
    report.push(`Misses: ${stats.missCount}`);
    report.push(`Evictions: ${stats.evictionCount}`);
    report.push(`Estimated Memory: ${stats.memoryUsage}KB`);
    
    if (stats.size > 0) {
      report.push('');
      report.push('Recent Keys (most recent first):');
      const recentKeys = this.keys().slice(0, 10); // Show first 10
      recentKeys.forEach((key, i) => {
        const accessTime = this.accessTimes.get(key);
        const age = Math.round((Date.now() - accessTime) / 1000);
        report.push(`  ${i + 1}. ${key} (${age}s ago)`);
      });
      
      if (this.cache.size > 10) {
        report.push(`  ... and ${this.cache.size - 10} more`);
      }
    }
    
    return report.join('\n');
  }

  /**
   * Perform cache maintenance
   * Returns number of items cleaned up
   */
  performMaintenance(options = {}) {
    const {
      maxAge = 300000, // 5 minutes
      targetSize = Math.floor(this.maxSize * 0.8), // 80% of max size
      force = false
    } = options;
    
    let cleaned = 0;
    
    // Evict old entries
    cleaned += this.evictOldEntries(maxAge);
    
    // If still over target size and force is enabled, evict until target
    if (force && this.cache.size > targetSize) {
      const toEvict = this.cache.size - targetSize;
      for (let i = 0; i < toEvict; i++) {
        this.evictLRU();
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Create a cache snapshot for debugging
   */
  createSnapshot() {
    return {
      timestamp: Date.now(),
      size: this.cache.size,
      maxSize: this.maxSize,
      stats: this.getStats(),
      keys: this.keys(),
      accessTimes: Object.fromEntries(this.accessTimes.entries())
    };
  }
}

module.exports = LRUCache;