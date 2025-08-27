const ConfigManager = require('../lib/config-manager');
const SpecParser = require('../lib/feature-parser');
const ProgressCalculator = require('../lib/progress-calc');
const UIComponents = require('../lib/ui-components');

describe('Performance Tests', () => {
  let testDir;

  beforeEach(() => {
    testDir = global.TEST_DIR;
    global.setupTestDir();
  });

  afterEach(() => {
    global.cleanupTestDir();
  });

  describe('Large Dataset Performance', () => {
    const LARGE_DATASET_SIZE = 500;
    const PERFORMANCE_THRESHOLD = {
      load: 5000, // 5 seconds for loading
      progress: 1000, // 1 second for progress calculation
      ui: 2000, // 2 seconds for UI rendering
      memory: 100, // 100MB memory usage
    };

    beforeEach(async () => {
      await createLargeDataset(LARGE_DATASET_SIZE);
    });

    async function createLargeDataset(size) {
      console.log(`Creating dataset with ${size} specifications...`);

      const specs = [];
      const statuses = ['active', 'backlog', 'done'];
      const types = ['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT'];
      const priorities = ['P0', 'P1', 'P2', 'P3'];

      for (let i = 1; i <= size; i++) {
        const type = types[i % types.length];
        const status = statuses[i % statuses.length];
        const priority = priorities[i % priorities.length];
        const taskCount = Math.floor(Math.random() * 8) + 2; // 2-10 tasks

        let tasksContent = '';
        for (let j = 1; j <= taskCount; j++) {
          const taskStatus = ['complete', 'in_progress', 'ready', 'blocked'][
            j % 4
          ];
          const emoji = {
            complete: '✅',
            in_progress: '🔄',
            ready: '⏳',
            blocked: '⏸️',
          }[taskStatus];

          tasksContent += `### **${emoji} TASK-${j
            .toString()
            .padStart(
              3,
              '0'
            )}** 🤖 **Task ${j} for ${type}-${i}** | Agent: Developer-${
            (j % 3) + 1
          }\n`;

          // Add subtasks to some tasks
          if (j % 3 === 0) {
            const subtaskCount = Math.floor(Math.random() * 5) + 1;
            for (let k = 1; k <= subtaskCount; k++) {
              const completed = Math.random() > 0.5;
              tasksContent += `- [${
                completed ? 'x' : ' '
              }] Subtask ${k} for task ${j}\n`;
            }
          }

          tasksContent += '\n';
        }

        const content = `# ${type}-${i
          .toString()
          .padStart(3, '0')}: Performance Test Specification ${i}

**Priority:** ${priority}

## Description

This is a performance test specification number ${i}. It contains realistic content to test parsing performance with large datasets.

This specification simulates real-world complexity with multiple paragraphs, task assignments, and varied content structures.

## Problem Statement

Performance testing requires realistic data that represents actual usage patterns. This specification provides that test data.

## Solution Approach

Generate large numbers of specifications with varied but realistic content to stress-test the ASD parsing and processing systems.

## Tasks

${tasksContent}

## Testing Checklist

- [ ] Performance test passes
- [ ] Memory usage within limits
- [ ] Parsing time acceptable
- [ ] UI responsiveness maintained

## Required Reading

- docs/performance/benchmarks.md
- docs/testing/load-testing.md`;

        specs.push({
          path: `docs/specs/${status}/${type}-${i
            .toString()
            .padStart(3, '0')}-perf-test.md`,
          content,
        });
      }

      console.log(`Writing ${specs.length} specification files...`);

      for (const spec of specs) {
        global.createTestFile(spec.path, spec.content);
      }

      console.log('Dataset creation complete');
    }

    it('should load large dataset within performance threshold', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      await specParser.loadSpecs();

      const loadTime = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      const memoryUsed =
        (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024; // MB

      const specs = specParser.getSpecs();

      console.log('Performance Results:');
      console.log(`- Loaded ${specs.length} specifications`);
      console.log(`- Load time: ${loadTime}ms`);
      console.log(`- Memory used: ${memoryUsed.toFixed(2)}MB`);

      expect(specs.length).toBe(LARGE_DATASET_SIZE);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLD.load);
      expect(memoryUsed).toBeLessThan(PERFORMANCE_THRESHOLD.memory);
    });

    it('should calculate progress for large dataset efficiently', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);
      const progressCalc = new ProgressCalculator();

      await specParser.loadSpecs();
      const specs = specParser.getSpecs();

      const startTime = Date.now();

      // Calculate progress for all specifications
      const progressResults = specs.map((spec) =>
        progressCalc.calculateProgress(spec)
      );
      const overallProgress = progressCalc.calculateOverallProgress(specs);

      const progressTime = Date.now() - startTime;

      console.log('Progress Calculation Results:');
      console.log(`- Processed ${specs.length} specifications`);
      console.log(`- Calculation time: ${progressTime}ms`);
      console.log(`- Overall progress: ${overallProgress.percentage}%`);

      expect(progressResults.length).toBe(LARGE_DATASET_SIZE);
      expect(progressTime).toBeLessThan(PERFORMANCE_THRESHOLD.progress);
      expect(overallProgress.total).toBeGreaterThan(0);
      expect(overallProgress.percentage).toBeGreaterThanOrEqual(0);
      expect(overallProgress.percentage).toBeLessThanOrEqual(100);
    });

    it('should generate UI components for large dataset efficiently', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);
      const progressCalc = new ProgressCalculator();
      const ui = new UIComponents();

      await specParser.loadSpecs();
      const specs = specParser.getSpecs();
      const stats = specParser.getStats();

      const startTime = Date.now();

      // Generate UI components
      const summaryStats = ui.createSummaryStats(stats);
      const featureListItems = specs.map((spec) => {
        const progress = progressCalc.calculateProgress(spec);
        return ui.createFeatureListItem(spec, progress, false);
      });

      const taskLists = specs
        .filter((spec) => spec.tasks && spec.tasks.length > 0)
        .map((spec) => ui.createTaskList(spec.tasks));

      const uiTime = Date.now() - startTime;

      console.log('UI Generation Results:');
      console.log(`- Generated ${featureListItems.length} feature list items`);
      console.log(`- Generated ${taskLists.length} task lists`);
      console.log(`- UI generation time: ${uiTime}ms`);

      expect(summaryStats).toContain(LARGE_DATASET_SIZE.toString());
      expect(featureListItems.length).toBe(LARGE_DATASET_SIZE);
      expect(uiTime).toBeLessThan(PERFORMANCE_THRESHOLD.ui);
    });

    it('should handle memory efficiently with repeated operations', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);
      const progressCalc = new ProgressCalculator();

      await specParser.loadSpecs();
      // const specs = specParser.getSpecs();

      const startMemory = process.memoryUsage();

      // Perform repeated operations to test memory leaks
      const iterations = 10;
      for (let i = 0; i < iterations; i++) {
        // Simulate typical operations
        // const _stats = specParser.getStats();
        const activeSpecs = specParser.getSpecsByStatus('active');
        // const _p0Specs = specParser.getSpecsByPriority('P0');

        activeSpecs.forEach((spec) => {
          progressCalc.calculateProgress(spec);
          progressCalc.getNextAvailableTask(spec);
          progressCalc.getBlockedTasks(spec);
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const endMemory = process.memoryUsage();
      const memoryGrowth =
        (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024; // MB

      console.log('Memory Test Results:');
      console.log(`- Performed ${iterations} iterations`);
      console.log(`- Memory growth: ${memoryGrowth.toFixed(2)}MB`);

      // Memory growth should be minimal (less than 10MB for repeated operations)
      expect(memoryGrowth).toBeLessThan(10);
    });

    it('should handle concurrent access efficiently', async () => {
      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      await specParser.loadSpecs();
      // const specs = specParser.getSpecs();

      const startTime = Date.now();

      // Simulate concurrent access patterns
      const concurrentOperations = [
        () => specParser.getSpecsByStatus('active'),
        () => specParser.getSpecsByStatus('backlog'),
        () => specParser.getSpecsByPriority('P0'),
        () => specParser.getSpecsByPriority('P1'),
        () => specParser.getStats(),
        () => specParser.getCriticalReady(),
      ];

      // Run operations concurrently multiple times
      const promises = [];
      for (let i = 0; i < 20; i++) {
        for (const operation of concurrentOperations) {
          promises.push(Promise.resolve(operation()));
        }
      }

      await Promise.all(promises);

      const concurrentTime = Date.now() - startTime;

      console.log('Concurrent Access Results:');
      console.log(`- Performed ${promises.length} concurrent operations`);
      console.log(`- Total time: ${concurrentTime}ms`);

      expect(concurrentTime).toBeLessThan(PERFORMANCE_THRESHOLD.progress);
    });
  });

  describe('Stress Testing', () => {
    it('should handle malformed files in large datasets gracefully', async () => {
      // Create mix of valid and malformed files
      const validSpecs = 100;
      const malformedSpecs = 50;

      // Create valid specs
      for (let i = 1; i <= validSpecs; i++) {
        const content = `# SPEC-${i.toString().padStart(3, '0')}: Valid Spec
**Priority:** P1
## Description
Valid specification.
## Tasks
### **TASK-001** 🤖 **Task**
Valid task.`;

        global.createTestFile(
          `docs/specs/active/SPEC-${i.toString().padStart(3, '0')}-valid.md`,
          content
        );
      }

      // Create malformed specs
      const malformedContents = [
        'Invalid content without proper format',
        '# No ID spec\nContent without spec ID',
        '# INVALID-001\nInvalid type',
        '', // Empty file
        'Corrupted\nFile\nContent\n{broken',
        '# SPEC-999\n**Priority:** INVALID\n## Broken\nBroken format',
      ];

      for (let i = 1; i <= malformedSpecs; i++) {
        const content = malformedContents[i % malformedContents.length];
        global.createTestFile(`docs/specs/active/malformed-${i}.md`, content);
      }

      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const startTime = Date.now();

      await specParser.loadSpecs();

      const loadTime = Date.now() - startTime;
      const specs = specParser.getSpecs();

      console.log('Stress Test Results:');
      console.log(`- Valid specs loaded: ${specs.length}`);
      console.log(`- Load time with errors: ${loadTime}ms`);
      console.log(`- Warnings generated: ${consoleSpy.mock.calls.length}`);

      // Should load only valid specs
      expect(specs.length).toBe(validSpecs);

      // Should complete within reasonable time even with errors
      expect(loadTime).toBeLessThan(10000); // 10 seconds

      // Should generate warnings for malformed files
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('should handle extremely large individual specifications', async () => {
      // Create a specification with many tasks and subtasks
      const largeTasks = [];
      for (let i = 1; i <= 100; i++) {
        largeTasks.push(
          `### **TASK-${i
            .toString()
            .padStart(3, '0')}** 🤖 **Task ${i}** | Agent: Developer-${i % 10}`
        );

        // Add subtasks to every task
        for (let j = 1; j <= 20; j++) {
          largeTasks.push(
            `- [${j % 2 === 0 ? 'x' : ' '}] Subtask ${j} for task ${i}`
          );
        }
        largeTasks.push('');
      }

      const largeContent = `# SPEC-LARGE: Extremely Large Specification

**Priority:** P1

## Description

This is an extremely large specification with many tasks and subtasks to test parsing performance on individual large files.

${'This specification has a very long description. '.repeat(100)}

## Problem Statement

${'Large specifications can cause performance issues. '.repeat(50)}

## Solution Approach

${'We need to handle large specifications efficiently. '.repeat(50)}

## Tasks

${largeTasks.join('\n')}

## Testing Checklist

${Array.from({ length: 50 }, (_, i) => `- [ ] Test item ${i + 1}`).join('\n')}

## Required Reading

${Array.from({ length: 20 }, (_, i) => `- docs/reference/doc-${i + 1}.md`).join(
  '\n'
)}`;

      global.createTestFile(
        'docs/specs/active/SPEC-LARGE-test.md',
        largeContent
      );

      const configManager = new ConfigManager(testDir);
      const specParser = new SpecParser(configManager);

      const startTime = Date.now();

      await specParser.loadSpecs();

      const loadTime = Date.now() - startTime;
      const specs = specParser.getSpecs();
      const largeSpec = specs.find((s) => s.id === 'SPEC-LARGE');

      console.log('Large Spec Test Results:');
      console.log(`- Parse time: ${loadTime}ms`);
      console.log(`- Tasks parsed: ${largeSpec?.tasks?.length || 0}`);
      console.log(
        `- Subtasks parsed: ${
          largeSpec?.tasks?.reduce(
            (sum, t) => sum + (t.subtasks?.length || 0),
            0
          ) || 0
        }`
      );

      expect(largeSpec).toBeDefined();
      expect(largeSpec.tasks).toHaveLength(100);
      expect(loadTime).toBeLessThan(5000); // 5 seconds for one large file

      // Test progress calculation on large spec
      const progressCalc = new ProgressCalculator();
      const progressStartTime = Date.now();

      const progress = progressCalc.calculateProgress(largeSpec);

      const progressTime = Date.now() - progressStartTime;

      expect(progress.total).toBeGreaterThan(0);
      expect(progressTime).toBeLessThan(1000); // 1 second for progress calculation
    });
  });

  describe('Node.js Version Compatibility', () => {
    it('should work with current Node.js version features', () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

      console.log(`Testing on Node.js ${nodeVersion}`);

      // Should work on Node.js 16+
      expect(majorVersion).toBeGreaterThanOrEqual(16);

      // Test modern JavaScript features used in the codebase
      expect(() => {
        // Optional chaining
        const obj = { a: { b: { c: 1 } } };
        const value = obj?.a?.b?.c;
        expect(value).toBe(1);

        // Nullish coalescing
        const defaultValue = null ?? 'default';
        expect(defaultValue).toBe('default');

        // Array methods
        const arr = [1, 2, 3];
        const result = arr.flatMap((x) => [x, x * 2]);
        expect(result).toEqual([1, 2, 2, 4, 3, 6]);
      }).not.toThrow();
    });
  });
});
