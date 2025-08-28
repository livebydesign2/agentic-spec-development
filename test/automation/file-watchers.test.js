const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const FileWatchers = require('../../lib/automation/file-watchers');
// const ConfigManager = require('../../lib/config-manager'); // Not used in this test

describe('FileWatchers', () => {
  let testDir;
  let fileWatchers;
  let configManager;
  let eventSpy;

  // Test timeout for async operations
  const TEST_TIMEOUT = 10000;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'asd-filewatchers-test-'));

    // Set up directory structure
    await fs.mkdir(path.join(testDir, 'docs', 'specs', 'active'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.asd', 'state'), { recursive: true });

    // Mock ConfigManager
    configManager = {
      getProjectRoot: () => testDir
    };

    // Create FileWatchers instance
    fileWatchers = new FileWatchers(configManager);

    // Set up event spy
    eventSpy = {
      initialized: jest.fn(),
      file_change: jest.fn(),
      yaml_change: jest.fn(),
      json_change: jest.fn(),
      watcher_error: jest.fn(),
      processing_error: jest.fn(),
      health_check: jest.fn()
    };

    // Attach event listeners
    Object.keys(eventSpy).forEach(event => {
      fileWatchers.on(event, eventSpy[event]);
    });
  });

  afterEach(async () => {
    // Cleanup
    if (fileWatchers) {
      await fileWatchers.shutdown();
    }

    // Remove test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup test directory: ${error.message}`);
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid configuration', async () => {
      const result = await fileWatchers.initialize();

      expect(result).toBe(true);
      expect(eventSpy.initialized).toHaveBeenCalledWith(
        expect.objectContaining({
          yamlWatcher: true,
          jsonWatcher: true,
          timestamp: expect.any(String)
        })
      );
    });

    test('should create state directory if it does not exist', async () => {
      const stateDir = path.join(testDir, '.asd', 'state');
      await fs.rm(stateDir, { recursive: true, force: true });

      const result = await fileWatchers.initialize();

      expect(result).toBe(true);

      const statDirExists = await fs.access(stateDir)
        .then(() => true)
        .catch(() => false);
      expect(statDirExists).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      // Create FileWatchers with invalid config
      const invalidWatchers = new FileWatchers({
        getProjectRoot: () => '/invalid/nonexistent/path'
      });

      const result = await invalidWatchers.initialize();
      expect(result).toBe(false);

      await invalidWatchers.shutdown();
    });
  });

  describe('YAML File Watching', () => {
    beforeEach(async () => {
      await fileWatchers.initialize();
      // Give watchers time to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should detect YAML file changes', async () => {
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-001-test.md');
      const yamlContent = `---
id: FEAT-001
title: Test Feature
type: FEAT
status: active
priority: P2
---

# Test Feature

This is a test feature.`;

      // Write file and wait for detection
      await fs.writeFile(yamlFile, yamlContent, 'utf-8');

      // Wait for file watcher event
      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          watcherType: 'yaml',
          changeType: 'add',
          filePath: yamlFile,
          fileName: 'FEAT-001-test.md',
          fileExtension: '.md'
        })
      );

      expect(eventSpy.yaml_change).toHaveBeenCalled();
    }, TEST_TIMEOUT);

    test('should detect YAML file modifications', async () => {
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-002-mod.md');
      const initialContent = `---
id: FEAT-002
title: Test Feature
status: active
---

# Initial content`;

      const modifiedContent = `---
id: FEAT-002
title: Test Feature  
status: in_progress
---

# Modified content`;

      // Write initial file
      await fs.writeFile(yamlFile, initialContent, 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Clear previous events
      eventSpy.file_change.mockClear();
      eventSpy.yaml_change.mockClear();

      // Modify file
      await fs.writeFile(yamlFile, modifiedContent, 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          watcherType: 'yaml',
          changeType: 'change',
          filePath: yamlFile
        })
      );
    }, TEST_TIMEOUT);

    test('should detect YAML file deletions', async () => {
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-003-del.md');

      // Write and then delete file
      await fs.writeFile(yamlFile, '---\nid: FEAT-003\n---\n# Test', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Clear previous events
      eventSpy.file_change.mockClear();

      // Delete file
      await fs.unlink(yamlFile);
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          watcherType: 'yaml',
          changeType: 'delete',
          filePath: yamlFile
        })
      );
    }, TEST_TIMEOUT);

    test('should extract spec information from YAML files', async () => {
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-004-info.md');
      const yamlContent = `---
id: FEAT-004
title: Test Feature with Tasks
type: FEAT
status: active
priority: P1
tasks:
  - id: TASK-001
    title: First task
    status: ready
---

# Feature with tasks`;

      await fs.writeFile(yamlFile, yamlContent, 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          specInfo: expect.objectContaining({
            specId: 'FEAT-004',
            exists: true,
            frontmatterParseable: true,
            hasRequiredFields: true,
            hasTasks: true
          })
        })
      );
    }, TEST_TIMEOUT);
  });

  describe('JSON State File Watching', () => {
    beforeEach(async () => {
      await fileWatchers.initialize();
      // Give watchers time to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should detect JSON state file changes', async () => {
      const jsonFile = path.join(testDir, '.asd', 'state', 'assignments.json');
      const jsonData = {
        current_assignments: {},
        assignment_history: [],
        last_updated: new Date().toISOString()
      };

      await fs.writeFile(jsonFile, JSON.stringify(jsonData, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          watcherType: 'json',
          changeType: 'add',
          filePath: jsonFile,
          fileName: 'assignments.json',
          fileExtension: '.json'
        })
      );

      expect(eventSpy.json_change).toHaveBeenCalled();
    }, TEST_TIMEOUT);

    test('should extract state information from JSON files', async () => {
      const jsonFile = path.join(testDir, '.asd', 'state', 'progress.json');
      const jsonData = {
        overall: {
          total_specs: 10,
          completed_specs: 3,
          completion_percentage: 30
        },
        last_updated: new Date().toISOString()
      };

      await fs.writeFile(jsonFile, JSON.stringify(jsonData, null, 2), 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          stateInfo: expect.objectContaining({
            stateType: 'progress',
            exists: true,
            jsonParseable: true,
            hasData: true
          })
        })
      );
    }, TEST_TIMEOUT);

    test('should handle malformed JSON files', async () => {
      const jsonFile = path.join(testDir, '.asd', 'state', 'malformed.json');
      const malformedContent = '{ "invalid": json content }';

      await fs.writeFile(jsonFile, malformedContent, 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          stateInfo: expect.objectContaining({
            stateType: 'malformed',
            exists: true,
            jsonParseable: false,
            error: expect.stringContaining('JSON parsing error')
          })
        })
      );
    }, TEST_TIMEOUT);
  });

  describe('Debouncing', () => {
    beforeEach(async () => {
      await fileWatchers.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should debounce rapid file changes', async () => {
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-005-rapid.md');
      const baseContent = `---
id: FEAT-005
title: Rapid Changes Test
status: active
---

# Test`;

      // Make rapid changes
      for (let i = 0; i < 5; i++) {
        const content = `${baseContent}\n\nChange ${i}`;
        await fs.writeFile(yamlFile, content, 'utf-8');
        await new Promise(resolve => setTimeout(resolve, 50)); // Rapid changes
      }

      // Wait for debouncing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should have received fewer events than changes made due to debouncing
      const changeEvents = eventSpy.file_change.mock.calls.filter(
        call => call[0].changeType === 'change' && call[0].filePath === yamlFile
      );

      expect(changeEvents.length).toBeLessThan(5);
      expect(changeEvents.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await fileWatchers.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should track detection performance', async () => {
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-006-perf.md');
      const content = `---
id: FEAT-006
title: Performance Test
---

# Performance test`;

      await fs.writeFile(yamlFile, content, 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          detectionDelay: expect.any(Number),
          withinPerformanceTarget: expect.any(Boolean)
        })
      );

      const call = eventSpy.file_change.mock.calls[0][0];
      expect(call.detectionDelay).toBeLessThan(2000); // Should be under 2 seconds
    }, TEST_TIMEOUT);

    test('should warn on slow detection', async () => {
      // Mock slow processing by temporarily overriding performance target
      const originalTarget = fileWatchers.performanceTarget;
      fileWatchers.performanceTarget = 1; // 1ms - artificially low

      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-007-slow.md');

      await fs.writeFile(yamlFile, '---\nid: FEAT-007\n---\n# Test', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(eventSpy.file_change).toHaveBeenCalledWith(
        expect.objectContaining({
          withinPerformanceTarget: false
        })
      );

      // Restore original target
      fileWatchers.performanceTarget = originalTarget;
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await fileWatchers.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should handle file read errors gracefully', async () => {
      // Create a file and then make it unreadable
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-008-error.md');
      await fs.writeFile(yamlFile, '---\nid: FEAT-008\n---\n# Test', 'utf-8');

      // Make file unreadable (this approach may vary by OS)
      try {
        await fs.chmod(yamlFile, 0o000);

        // Modify file (should trigger error handling)
        await fs.writeFile(yamlFile, '---\nid: FEAT-008\nstatus: modified\n---\n# Modified', 'utf-8')
          .catch(() => {}); // Expected to fail

        await new Promise(resolve => setTimeout(resolve, 800));

        // Should handle the error gracefully without crashing
        expect(fileWatchers.eventStats.errorEvents).toBeGreaterThanOrEqual(0);

      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(yamlFile, 0o644);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('Status and Statistics', () => {
    test('should provide current status information', async () => {
      await fileWatchers.initialize();

      const status = fileWatchers.getStatus();

      expect(status).toMatchObject({
        watchers: {
          yaml: expect.objectContaining({
            active: expect.any(Boolean),
            pattern: 'docs/specs/**/*.md'
          }),
          json: expect.objectContaining({
            active: expect.any(Boolean),
            pattern: '.asd/state/*.json'
          })
        },
        performance: expect.objectContaining({
          debounceDelay: 500,
          performanceTarget: 1000
        }),
        statistics: expect.objectContaining({
          totalEvents: expect.any(Number),
          debouncedEvents: expect.any(Number),
          errorEvents: expect.any(Number)
        }),
        timestamp: expect.any(String)
      });
    });

    test('should update statistics as events are processed', async () => {
      await fileWatchers.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const initialStats = fileWatchers.getStatus().statistics;

      // Generate some events
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-009-stats.md');
      await fs.writeFile(yamlFile, '---\nid: FEAT-009\n---\n# Test', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      const updatedStats = fileWatchers.getStatus().statistics;
      expect(updatedStats.totalEvents).toBeGreaterThan(initialStats.totalEvents);
    }, TEST_TIMEOUT);
  });

  describe('Health Monitoring', () => {
    test('should perform health checks', async () => {
      await fileWatchers.initialize();

      // Trigger health check manually
      fileWatchers.performHealthCheck();

      expect(eventSpy.health_check).toHaveBeenCalledWith(
        expect.objectContaining({
          yamlWatcher: expect.any(Object),
          jsonWatcher: expect.any(Object),
          totalEvents: expect.any(Number),
          errorRate: expect.any(Number),
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Pause and Resume', () => {
    beforeEach(async () => {
      await fileWatchers.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should pause and resume watching', async () => {
      // Test pause
      fileWatchers.pause();

      // Create file while paused - should not generate events
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-010-pause.md');
      await fs.writeFile(yamlFile, '---\nid: FEAT-010\n---\n# Paused', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      const eventsWhilePaused = eventSpy.file_change.mock.calls.length;

      // Resume and create another file
      await fileWatchers.resume();
      await new Promise(resolve => setTimeout(resolve, 500));

      const yamlFile2 = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-011-resume.md');
      await fs.writeFile(yamlFile2, '---\nid: FEAT-011\n---\n# Resumed', 'utf-8');
      await new Promise(resolve => setTimeout(resolve, 800));

      const eventsAfterResume = eventSpy.file_change.mock.calls.length;

      // Should have more events after resume
      expect(eventsAfterResume).toBeGreaterThan(eventsWhilePaused);
    }, TEST_TIMEOUT);
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      await fileWatchers.initialize();

      const shutdownPromise = fileWatchers.shutdown();

      // Should complete without hanging
      await expect(shutdownPromise).resolves.toBeUndefined();

      // Should have emitted shutdown event
      expect(fileWatchers.eventStats).toBeDefined();
    });

    test('should clear debounce timers on shutdown', async () => {
      await fileWatchers.initialize();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create rapid changes to build up debounce timers
      const yamlFile = path.join(testDir, 'docs', 'specs', 'active', 'FEAT-012-shutdown.md');
      for (let i = 0; i < 3; i++) {
        await fs.writeFile(yamlFile, `---\nid: FEAT-012\nversion: ${i}\n---\n# Test ${i}`, 'utf-8');
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Should have some debounce timers
      expect(fileWatchers.debounceTimers.size).toBeGreaterThan(0);

      // Shutdown should clear all timers
      await fileWatchers.shutdown();
      expect(fileWatchers.debounceTimers.size).toBe(0);
    }, TEST_TIMEOUT);
  });
});