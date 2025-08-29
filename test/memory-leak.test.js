const ConfigManager = require('../lib/config-manager');
const SpecParser = require('../lib/feature-parser');
const ASDClient = require('../lib/index');
const MemoryMonitor = require('../lib/memory-monitor');
const LRUCache = require('../lib/lru-cache');

describe('Memory Leak Tests - BUG-003', () => {
  let testDir;

  beforeEach(() => {
    testDir = global.TEST_DIR;
    global.setupTestDir();
  });

  afterEach(() => {
    global.cleanupTestDir();
  });

  describe('LRU Cache Implementation', () => {
    it('should limit cache size and evict old entries', () => {
      const cache = new LRUCache(5);

      // Fill cache beyond capacity
      for (let i = 1; i <= 10; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      // Should only have 5 entries (latest ones)
      expect(cache.size()).toBe(5);
      expect(cache.has('key-1')).toBe(false); // Should be evicted
      expect(cache.has('key-6')).toBe(true); // Should be present
      expect(cache.has('key-10')).toBe(true); // Should be present

      const stats = cache.getStats();
      expect(stats.evictionCount).toBe(5); // 5 items evicted
    });

    it('should update access order correctly', () => {
      const cache = new LRUCache(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to make it most recent
      cache.get('a');

      // Add new item, should evict 'b' (least recent)
      cache.set('d', 4);

      expect(cache.has('a')).toBe(true); // Should still be present
      expect(cache.has('b')).toBe(false); // Should be evicted
      expect(cache.has('c')).toBe(true); // Should still be present
      expect(cache.has('d')).toBe(true); // Should be present
    });

    it('should clean up old entries by age', async () => {
      const cache = new LRUCache(10);

      // Add some entries
      cache.set('old-1', 'value1');
      cache.set('old-2', 'value2');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      cache.set('new-1', 'value3');
      cache.set('new-2', 'value4');

      // Clean up entries older than 5ms
      const evicted = cache.evictOldEntries(5);

      expect(evicted).toBe(2); // Should evict 2 old entries
      expect(cache.has('old-1')).toBe(false);
      expect(cache.has('old-2')).toBe(false);
      expect(cache.has('new-1')).toBe(true);
      expect(cache.has('new-2')).toBe(true);
    });
  });

  describe('SpecParser Caching', () => {
    beforeEach(async () => {
      // Create test spec files
      global.createTestFile(
        'docs/specs/active/SPEC-001-cache-test.md',
        `# SPEC-001: Cache Test Spec

**Priority:** P1

## Description

This is a test specification for cache validation.

## Tasks

### **TASK-001** 🤖 **Test Caching** | Agent: Developer
- [ ] Implement cache
- [ ] Test cache behavior
`
      );

      global.createTestFile(
        'docs/specs/active/SPEC-002-cache-test.md',
        `# SPEC-002: Another Cache Test

**Priority:** P2

## Description

Another test specification for cache validation.
`
      );
    });

    it('should cache parsed specifications and improve performance', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      // First load (should cache)
      const startTime1 = Date.now();
      await specParser.loadSpecs();
      const loadTime1 = Date.now() - startTime1;

      let stats = specParser.getCacheStats();
      expect(stats.load_stats.cacheHits).toBe(0); // First load, no hits
      expect(stats.load_stats.cacheMisses).toBeGreaterThan(0); // Should have misses

      // Second load (should use cache for unchanged files)
      const startTime2 = Date.now();
      await specParser.loadSpecs();
      const loadTime2 = Date.now() - startTime2;

      stats = specParser.getCacheStats();
      expect(stats.load_stats.cacheHits).toBeGreaterThan(0); // Should have hits
      expect(stats.cache_hit_rate).toBeGreaterThan(0); // Should have positive hit rate

      // Second load should be faster due to caching
      expect(loadTime2).toBeLessThan(loadTime1);
    });

    it('should invalidate cache when files are modified', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      // Initial load
      await specParser.loadSpecs();
      let initialStats = specParser.getCacheStats();

      // Modify a file
      global.createTestFile(
        'docs/specs/active/SPEC-001-cache-test.md',
        `# SPEC-001: Modified Cache Test

**Priority:** P0

## Description

This specification has been modified to test cache invalidation.

## Tasks

### **TASK-001** 🤖 **Test Modified Caching** | Agent: Developer
- [ ] Implement cache invalidation
- [ ] Test modified cache behavior
`
      );

      // Reload specs
      await specParser.loadSpecs();
      let finalStats = specParser.getCacheStats();

      // Should detect the file change and reparse
      expect(finalStats.load_stats.totalLoads).toBe(
        initialStats.load_stats.totalLoads + 1
      );

      // Check that the modification was picked up
      const specs = specParser.getSpecs();
      const modifiedSpec = specs.find((s) => s.id === 'SPEC-001');
      expect(modifiedSpec.priority).toBe('P0'); // Should reflect the change
    });

    it('should perform cache maintenance to prevent unbounded growth', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      // Load initial specs
      await specParser.loadSpecs();

      // Create many more spec files to test cache limits
      for (let i = 10; i <= 150; i++) {
        global.createTestFile(
          `docs/specs/active/SPEC-${i.toString().padStart(3, '0')}-test.md`,
          `# SPEC-${i.toString().padStart(3, '0')}: Test Spec ${i}
          
**Priority:** P2

## Description
Test specification ${i} for cache maintenance testing.
`
        );
      }

      // Load all specs
      await specParser.loadSpecs();

      let beforeMaintenance = specParser.getCacheStats();

      // Force cache maintenance
      const cleanedUp = specParser.performCacheMaintenance();

      let afterMaintenance = specParser.getCacheStats();

      // Cache size should be controlled
      expect(afterMaintenance.cache_stats.size).toBeLessThanOrEqual(
        beforeMaintenance.cache_stats.maxSize
      );

      // Should have cleaned up some entries if cache was over limit
      if (
        beforeMaintenance.cache_stats.size >
        beforeMaintenance.cache_stats.maxSize * 0.8
      ) {
        expect(cleanedUp).toBeGreaterThan(0);
      }
    });
  });

  describe('Memory Monitoring', () => {
    it('should track memory usage patterns', (done) => {
      const monitor = new MemoryMonitor({
        monitorInterval: 50, // Very frequent for testing
        maxHistoryEntries: 10,
        enableLogging: false,
      });

      let measurementCount = 0;

      monitor.on('measurement', (entry) => {
        measurementCount++;
        expect(entry).toHaveProperty('rss');
        expect(entry).toHaveProperty('heapUsed');
        expect(entry).toHaveProperty('timestamp');
        expect(entry.rss).toBeGreaterThan(0);

        if (measurementCount >= 3) {
          monitor.stop();

          const stats = monitor.getStats();
          expect(stats.stats.totalSamples).toBe(measurementCount);
          expect(stats.memoryHistory.length).toBeLessThanOrEqual(10);

          done();
        }
      });

      monitor.start();
    });

    it('should detect memory threshold violations', (done) => {
      const monitor = new MemoryMonitor({
        warningThreshold: 1, // Very low threshold to trigger warning
        criticalThreshold: 2, // Very low threshold to trigger critical
        monitorInterval: 50,
        alertInterval: 10, // Short interval for testing
        enableLogging: false,
      });

      let warningTriggered = false;
      let criticalTriggered = false;

      monitor.on('warning', () => {
        warningTriggered = true;
      });

      monitor.on('critical', () => {
        criticalTriggered = true;

        // Both should trigger with current memory usage
        expect(warningTriggered).toBe(true);
        expect(criticalTriggered).toBe(true);

        monitor.stop();
        done();
      });

      monitor.start();
    });
  });

  describe('ASD Client Memory Management', () => {
    // Disable terminal output for testing
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;

    beforeEach(() => {
      // Mock terminal operations to prevent issues during testing
      console.log = jest.fn();
      console.warn = jest.fn();
    });

    afterEach(() => {
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
    });

    it('should properly clean up resources when terminated', async () => {
      // Create test files
      global.createTestFile(
        'docs/specs/active/SPEC-001-cleanup-test.md',
        `# SPEC-001: Cleanup Test
**Priority:** P1
## Description
Test cleanup behavior.
`
      );

      const configManager = new ConfigManager(testDir);

      // Disable autoRefresh and memory monitoring for simpler testing
      const config = configManager.loadConfig();
      config.autoRefresh = false;
      config.enableMemoryLogging = false;

      const client = new ASDClient({
        configManager,
        appName: 'Test-Client',
      });

      // Track initial memory
      const initialMemory = process.memoryUsage();

      // Simulate some work
      await client.specParser.loadSpecs();
      client.cachedContent = {
        'test-1': { content: 'test data 1', lastAccess: Date.now() },
        'test-2': { content: 'test data 2', lastAccess: Date.now() },
        'test-3': { content: 'test data 3', lastAccess: Date.now() },
      };

      // Cleanup
      client.cleanup();

      // Verify cleanup
      expect(Object.keys(client.cachedContent)).toHaveLength(0);
      expect(client.renderQueue).toHaveLength(0);
      expect(client.watchers).toHaveLength(0);

      // Memory usage shouldn't grow significantly after cleanup
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      // Should have minimal memory growth after cleanup
      expect(memoryGrowth).toBeLessThan(10); // Less than 10MB growth
    });

    it('should handle memory cleanup during extended operations', async () => {
      const configManager = new ConfigManager(testDir);

      // Create many test files
      for (let i = 1; i <= 50; i++) {
        global.createTestFile(
          `docs/specs/active/SPEC-${i.toString().padStart(3, '0')}-mem-test.md`,
          `# SPEC-${i.toString().padStart(3, '0')}: Memory Test ${i}
**Priority:** P2
## Description
Memory test specification ${i}.
## Tasks
### **TASK-001** 🤖 **Memory Test Task** | Agent: Tester
- [ ] Test memory usage
- [ ] Monitor cleanup behavior
`
        );
      }

      const config = configManager.loadConfig();
      config.autoRefresh = false;
      config.maxCacheSize = 20; // Small cache for testing
      config.enableMemoryLogging = false;

      const client = new ASDClient({ configManager });

      const initialMemory = process.memoryUsage();

      // Simulate extended operations
      for (let iteration = 0; iteration < 10; iteration++) {
        await client.specParser.loadSpecs();

        // Add cached content
        client.cachedContent[`iteration-${iteration}`] = {
          content: `Large test data for iteration ${iteration}`.repeat(100),
          lastAccess: Date.now(),
        };

        // Trigger memory cleanup manually
        client.performMemoryCleanup();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      // Cache should be limited by cleanup
      expect(Object.keys(client.cachedContent).length).toBeLessThanOrEqual(
        config.maxCacheSize
      );

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(50); // Less than 50MB growth

      client.cleanup();
    });
  });

  describe('File Watcher Leak Prevention', () => {
    it('should properly clean up file watchers', async () => {
      const configManager = new ConfigManager(testDir);

      // Create test files
      global.createTestFile(
        'docs/specs/active/SPEC-001-watch-test.md',
        `# SPEC-001: Watch Test
**Priority:** P1
## Description
Test file watching cleanup.
`
      );

      const config = configManager.loadConfig();
      config.autoRefresh = true;
      config.enableMemoryLogging = false;

      const client = new ASDClient({ configManager });

      // Setup file watching
      client.setupFileWatching();

      // Should have watchers
      expect(client.watchers.length).toBeGreaterThan(0);

      // Cleanup watchers
      client.cleanupWatchers();

      // Should have no watchers
      expect(client.watchers.length).toBe(0);

      client.cleanup();
    });
  });

  describe('Regression Prevention', () => {
    it('should maintain stable memory usage over time', async () => {
      const configManager = new ConfigManager(testDir);

      // Create realistic test data
      for (let i = 1; i <= 30; i++) {
        global.createTestFile(
          `docs/specs/active/SPEC-${i
            .toString()
            .padStart(3, '0')}-regression.md`,
          `# SPEC-${i.toString().padStart(3, '0')}: Regression Test ${i}
**Priority:** P${(i % 3) + 1}
## Description
Regression test specification ${i} with realistic content.
This specification tests memory stability over extended periods.
## Problem Statement
${'Memory leaks can cause application instability. '.repeat(10)}
## Solution Approach
${'Implement proper memory management and cleanup. '.repeat(10)}
## Tasks
### **TASK-001** 🤖 **Test Task 1** | Agent: Developer
- [ ] Implement feature
- [ ] Test functionality
- [ ] Document changes
### **TASK-002** 🤖 **Test Task 2** | Agent: QA
- [ ] Create test cases
- [ ] Execute tests
- [ ] Report results
`
        );
      }

      const config = configManager.loadConfig();
      config.autoRefresh = false;
      config.enableMemoryLogging = false;

      const specParser = new SpecParser(configManager);

      const memorySnapshots = [];

      // Simulate extended usage pattern
      for (let cycle = 0; cycle < 20; cycle++) {
        // Load specs
        await specParser.loadSpecs();

        // Perform typical operations
        const specs = specParser.getSpecs();
        specs.forEach((spec) => {
          const ____ = spec.tasks || []; // eslint-disable-line no-unused-vars
          const _priority = spec._priority || 'P2'; // eslint-disable-line no-unused-vars
        });

        // Take memory snapshot
        const memUsage = process.memoryUsage();
        memorySnapshots.push({
          cycle,
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        });

        // Trigger maintenance every few cycles
        if (cycle % 5 === 0) {
          specParser.performCacheMaintenance();
          if (global.gc) global.gc();
        }
      }

      // Analyze memory growth
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];

      const rssGrowth = finalMemory.rss - initialMemory.rss;
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be limited
      expect(rssGrowth).toBeLessThan(50); // Less than 50MB RSS growth
      expect(heapGrowth).toBeLessThan(30); // Less than 30MB heap growth

      // Cache should be functioning
      const stats = specParser.getCacheStats();
      expect(stats.cache_hit_rate).toBeGreaterThan(50); // Should have good hit rate

      specParser.clearCache();
    });
  });
});
