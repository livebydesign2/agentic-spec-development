const ConfigManager = require('../lib/config-manager');
const SpecParser = require('../lib/feature-parser');
const MemoryMonitor = require('../lib/memory-monitor');
const LRUCache = require('../lib/lru-cache');

describe('BUG-003: Memory Leak Fixes', () => {
  let testDir;

  beforeEach(() => {
    testDir = global.TEST_DIR;
    global.setupTestDir();
  });

  afterEach(() => {
    global.cleanupTestDir();
  });

  describe('LRU Cache Implementation', () => {
    it('should implement proper LRU eviction policy', () => {
      const cache = new LRUCache(3);

      // Fill cache
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.size()).toBe(3);

      // Access 'a' to make it most recent
      expect(cache.get('a')).toBe(1);

      // Add new item - should evict 'b' (least recently used)
      cache.set('d', 4);

      expect(cache.has('a')).toBe(true); // Most recent
      expect(cache.has('b')).toBe(false); // Evicted
      expect(cache.has('c')).toBe(true); // Still there
      expect(cache.has('d')).toBe(true); // Newly added

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.evictionCount).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should provide cache statistics and memory estimates', () => {
      const cache = new LRUCache(10);

      cache.set('key1', 'value1');
      cache.set('key2', { data: 'complex object' });
      cache.get('key1'); // Hit
      cache.get('nonexistent'); // Miss

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(50);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should clean up old entries by age', async () => {
      const cache = new LRUCache(10);

      cache.set('old1', 'value');
      cache.set('old2', 'value');

      // Wait to create age difference
      await new Promise((resolve) => setTimeout(resolve, 50));

      cache.set('new1', 'value');
      cache.set('new2', 'value');

      // Clean entries older than 25ms
      const evicted = cache.evictOldEntries(25);
      expect(evicted).toBe(2);
      expect(cache.has('old1')).toBe(false);
      expect(cache.has('old2')).toBe(false);
      expect(cache.has('new1')).toBe(true);
      expect(cache.has('new2')).toBe(true);
    });
  });

  describe('Enhanced SpecParser with Caching', () => {
    beforeEach(() => {
      // Create test spec files
      global.createTestFile(
        'docs/specs/active/SPEC-001-cache-test.md',
        `# SPEC-001: Cache Test

**Priority:** P1

## Description
Test specification for caching functionality.

## Tasks
### **TASK-001** 🤖 **Test Task**
- [ ] Test caching behavior
`
      );

      global.createTestFile(
        'docs/specs/active/FEAT-002-feature-test.md',
        `# FEAT-002: Feature Test

**Priority:** P2

## Description
Another test specification.
`
      );
    });

    it('should cache parsed specifications', async () => {
      const configManager = new ConfigManager(testDir);
      configManager.config.specCacheSize = 50; // Set cache size

      const specParser = new SpecParser(configManager);

      // First load - should populate cache
      await specParser.loadSpecs();
      const specs1 = specParser.getSpecs();

      expect(specs1.length).toBeGreaterThan(0);

      // Get initial stats
      const stats1 = specParser.getCacheStats();
      expect(stats1.cache_stats.size).toBeGreaterThan(0);

      // Second load - should use cache
      await specParser.loadSpecs();
      const specs2 = specParser.getSpecs();

      expect(specs2.length).toBe(specs1.length);

      // Check cache effectiveness
      const stats2 = specParser.getCacheStats();
      expect(stats2.load_stats.totalLoads).toBe(2);
    });

    it('should invalidate cache when files change', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      // Initial load
      await specParser.loadSpecs();
      const initialSpecs = specParser.getSpecs();
      const spec001 = initialSpecs.find((s) => s.id === 'SPEC-001');
      expect(spec001).toBeDefined();
      expect(spec001.priority).toBe('P1');

      // Wait a moment for file system
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Modify the file
      global.createTestFile(
        'docs/specs/active/SPEC-001-cache-test.md',
        `# SPEC-001: Modified Cache Test

**Priority:** P0

## Description
This spec has been modified to test cache invalidation.

## Tasks
### **TASK-001** 🤖 **Modified Task**
- [ ] Test cache invalidation
`
      );

      // Reload specs
      await specParser.loadSpecs();
      const modifiedSpecs = specParser.getSpecs();
      const modifiedSpec001 = modifiedSpecs.find((s) => s.id === 'SPEC-001');

      expect(modifiedSpec001).toBeDefined();
      expect(modifiedSpec001.priority).toBe('P0'); // Should reflect the change
    });

    it('should perform cache maintenance', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      // Create many files to test cache limits
      for (let i = 10; i < 30; i++) {
        global.createTestFile(
          `docs/specs/active/TEST-${i.toString().padStart(3, '0')}-test.md`,
          `# TEST-${i.toString().padStart(3, '0')}: Test Spec ${i}
**Priority:** P2
## Description
Test spec ${i}`
        );
      }

      await specParser.loadSpecs();

      const beforeMaintenance = specParser.getCacheStats();
      const __cleanedUp = specParser.performCacheMaintenance(); // eslint-disable-line no-unused-vars
      const afterMaintenance = specParser.getCacheStats();

      // Cache should be managed properly
      expect(afterMaintenance.cache_stats.size).toBeLessThanOrEqual(
        beforeMaintenance.cache_stats.maxSize
      );

      // Generate cache report
      const report = specParser.generateCacheReport();
      expect(report).toContain('SPEC PARSER CACHE REPORT');
      expect(report).toContain('Cache Hit Rate');
    });
  });

  describe('Memory Monitoring System', () => {
    it('should track basic memory usage', (done) => {
      const monitor = new MemoryMonitor({
        monitorInterval: 100,
        maxHistoryEntries: 5,
        enableLogging: false,
      });

      let measurements = 0;
      monitor.on('measurement', (entry) => {
        measurements++;
        expect(entry.rss).toBeGreaterThan(0);
        expect(entry.heapUsed).toBeGreaterThan(0);
        expect(entry.timestamp).toBeDefined();

        if (measurements >= 3) {
          monitor.stop();

          const stats = monitor.getStats();
          expect(stats.monitoring).toBe(false);
          expect(stats.stats.totalSamples).toBe(3);
          expect(stats.memoryHistory.length).toBe(3);

          done();
        }
      });

      monitor.start();
    });

    it('should generate memory usage report', () => {
      const monitor = new MemoryMonitor({
        enableLogging: false,
      });

      // Record some measurements
      monitor.recordMemoryUsage();
      monitor.recordMemoryUsage();

      const report = monitor.generateReport();
      expect(report).toContain('MEMORY USAGE REPORT');
      expect(report).toContain('Current Usage:');
      expect(report).toContain('RSS:');
      expect(report).toContain('Heap Used:');

      const stats = monitor.getStats();
      expect(stats.stats.totalSamples).toBe(2);
    });

    it('should trigger garbage collection when available', () => {
      const monitor = new MemoryMonitor({
        enableLogging: false,
        autoCleanup: true,
      });

      const freedMB = monitor.triggerGarbageCollection('test');

      // Should work if gc is available, otherwise return 0
      expect(typeof freedMB).toBe('number');
      expect(freedMB).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics properly', () => {
      const monitor = new MemoryMonitor({
        enableLogging: false,
      });

      // Take some measurements
      monitor.recordMemoryUsage();
      monitor.recordMemoryUsage();

      let stats = monitor.getStats();
      expect(stats.stats.totalSamples).toBe(2);

      // Reset
      monitor.reset();

      stats = monitor.getStats();
      expect(stats.stats.totalSamples).toBe(0);
      expect(stats.memoryHistory.length).toBe(0);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should handle repeated operations without excessive growth', async () => {
      const configManager = new ConfigManager(testDir);

      // Create test files
      for (let i = 1; i <= 20; i++) {
        global.createTestFile(
          `docs/specs/active/REPEAT-${i.toString().padStart(3, '0')}-test.md`,
          `# REPEAT-${i.toString().padStart(3, '0')}: Repeat Test ${i}
**Priority:** P2
## Description
Repeat test ${i} for memory leak prevention.
## Tasks
### **TASK-001** 🤖 **Repeat Task**
- [ ] Test repeated operations
`
        );
      }

      const specParser = new SpecParser(configManager);
      const initialMemory = process.memoryUsage();

      // Perform repeated operations
      for (let i = 0; i < 10; i++) {
        await specParser.loadSpecs();
        const specs = specParser.getSpecs();

        // Simulate typical operations
        specs.forEach((spec) => {
          spec.tasks?.forEach((task) => task.title);
          spec.description?.length;
        });

        // Periodic cache maintenance
        if (i % 3 === 0) {
          specParser.performCacheMaintenance();
        }
      }

      const finalMemory = process.memoryUsage();
      const heapGrowth =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      // Memory growth should be reasonable
      expect(heapGrowth).toBeLessThan(20); // Less than 20MB heap growth

      // Cache should be working
      const stats = specParser.getCacheStats();
      expect(stats.load_stats.totalLoads).toBe(10);
      expect(stats.cache_stats.size).toBeGreaterThan(0);

      // Clean up
      specParser.clearCache();
    });

    it('should maintain performance with caching', async () => {
      const configManager = new ConfigManager(testDir);

      // Create more test files
      for (let i = 1; i <= 50; i++) {
        global.createTestFile(
          `docs/specs/active/PERF-${i.toString().padStart(3, '0')}-test.md`,
          `# PERF-${i.toString().padStart(3, '0')}: Performance Test ${i}
**Priority:** P${(i % 3) + 1}
## Description
Performance test specification ${i}.
## Tasks
### **TASK-001** 🤖 **Performance Task**
- [ ] Measure performance
- [ ] Optimize if needed
`
        );
      }

      const specParser = new SpecParser(configManager);

      // First load (cold)
      const start1 = Date.now();
      await specParser.loadSpecs();
      const time1 = Date.now() - start1;

      // Second load (warm cache)
      const start2 = Date.now();
      await specParser.loadSpecs();
      const time2 = Date.now() - start2;

      // Cache should improve performance
      expect(time2).toBeLessThan(time1);

      const stats = specParser.getCacheStats();
      expect(stats.cache_hit_rate).toBeGreaterThan(0);
      expect(stats.load_stats.cacheHits).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should provide comprehensive memory management', () => {
      // Test LRU Cache
      const cache = new LRUCache(5);
      for (let i = 1; i <= 10; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }
      expect(cache.size()).toBe(5);

      // Test Memory Monitor
      const monitor = new MemoryMonitor({
        enableLogging: false,
      });
      monitor.recordMemoryUsage();
      const stats = monitor.getStats();
      expect(stats.stats.totalSamples).toBe(1);

      // Test report generation
      const cacheReport = cache.generateReport();
      const memoryReport = monitor.generateReport();

      expect(cacheReport).toContain('LRU CACHE REPORT');
      expect(memoryReport).toContain('MEMORY USAGE REPORT');
    });
  });
});
