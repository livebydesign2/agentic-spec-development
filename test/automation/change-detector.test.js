const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const ChangeDetector = require('../../lib/automation/change-detector');

describe('ChangeDetector', () => {
  let testDir;
  let changeDetector;
  let eventSpy;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'asd-changedetector-test-'));

    // Mock ConfigManager
    const configManager = {
      getProjectRoot: () => testDir
    };

    // Create ChangeDetector instance
    changeDetector = new ChangeDetector(configManager);
    await changeDetector.initialize();

    // Set up event spy
    eventSpy = {
      change_analyzed: jest.fn(),
      processing_error: jest.fn()
    };

    // Attach event listeners
    Object.keys(eventSpy).forEach(event => {
      changeDetector.on(event, eventSpy[event]);
    });
  });

  afterEach(async () => {
    if (changeDetector) {
      changeDetector.shutdown();
    }

    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup test directory: ${error.message}`);
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const detector = new ChangeDetector();
      const result = await detector.initialize();

      expect(result).toBe(true);

      detector.shutdown();
    });
  });

  describe('YAML Change Processing', () => {
    test('should process YAML file addition', async () => {
      const yamlFile = path.join(testDir, 'test-spec.md');
      const yamlContent = `---
id: FEAT-001
title: Test Feature
type: FEAT
status: active
priority: P2
tasks:
  - id: TASK-001
    title: First task
    status: ready
---

# Test Feature

Content here.`;

      await fs.writeFile(yamlFile, yamlContent, 'utf-8');

      const changePayload = {
        watcherType: 'yaml',
        changeType: 'add',
        filePath: yamlFile,
        fileName: 'test-spec.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-001'
      };

      const result = await changeDetector.processChange(changePayload);

      expect(result.analysis.success).toBe(true);
      expect(result.analysis.changeType).toBe('yaml_structure_available');
      expect(result.analysis.changes.length).toBeGreaterThan(0);
      expect(result.analysis.semanticChanges).toBeDefined();
      expect(result.processing.withinTarget).toBe(true);

      expect(eventSpy.change_analyzed).toHaveBeenCalledWith(result);
    });

    test('should detect YAML frontmatter modifications', async () => {
      const yamlFile = path.join(testDir, 'mod-spec.md');

      // Initial content
      const initialContent = `---
id: FEAT-002
title: Test Feature
status: active
priority: P2
---

# Initial`;

      // Modified content
      const modifiedContent = `---
id: FEAT-002
title: Test Feature
status: in_progress
priority: P1
assigned_agent: cli-specialist
---

# Modified`;

      // Write initial file and cache it
      await fs.writeFile(yamlFile, initialContent, 'utf-8');
      const initialPayload = {
        watcherType: 'yaml',
        changeType: 'add',
        filePath: yamlFile,
        fileName: 'mod-spec.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-002'
      };

      await changeDetector.processChange(initialPayload);

      // Now modify the file
      await fs.writeFile(yamlFile, modifiedContent, 'utf-8');
      const modificationPayload = {
        watcherType: 'yaml',
        changeType: 'change',
        filePath: yamlFile,
        fileName: 'mod-spec.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-003'
      };

      const result = await changeDetector.processChange(modificationPayload);

      expect(result.analysis.success).toBe(true);
      expect(result.analysis.changes.length).toBeGreaterThan(0);

      // Should detect status change
      expect(result.analysis.semanticChanges.statusChange).toMatchObject({
        oldStatus: 'active',
        newStatus: 'in_progress',
        isWorkflowChange: true
      });

      // Should detect priority escalation
      expect(result.analysis.semanticChanges.priorityChange).toMatchObject({
        oldPriority: 'P2',
        newPriority: 'P1',
        priorityEscalation: true
      });

      // Should detect assignment
      expect(result.analysis.semanticChanges.assignmentChange).toMatchObject({
        newAgent: 'cli-specialist'
      });

      expect(result.analysis.impact).toBe('high');
    });

    test('should handle YAML file deletion', async () => {
      const yamlFile = path.join(testDir, 'deleted-spec.md');

      const deletePayload = {
        watcherType: 'yaml',
        changeType: 'delete',
        filePath: yamlFile,
        fileName: 'deleted-spec.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-004'
      };

      const result = await changeDetector.processChange(deletePayload);

      expect(result.analysis.success).toBe(true);
      expect(result.analysis.changeType).toBe('yaml_deleted');
      expect(result.analysis.impact).toBe('high');
      expect(result.analysis.changes).toEqual([{
        field: 'file_existence',
        type: 'deletion',
        oldValue: 'exists',
        newValue: 'deleted',
        timestamp: expect.any(String)
      }]);
    });

    test('should handle malformed YAML gracefully', async () => {
      const yamlFile = path.join(testDir, 'malformed-spec.md');
      const malformedContent = `---
id: FEAT-003
title: Test Feature
status: active
invalid: yaml: content: here
---

# Malformed`;

      await fs.writeFile(yamlFile, malformedContent, 'utf-8');

      const changePayload = {
        watcherType: 'yaml',
        changeType: 'add',
        filePath: yamlFile,
        fileName: 'malformed-spec.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-005'
      };

      const result = await changeDetector.processChange(changePayload);

      expect(result.analysis.success).toBe(true);
      expect(result.analysis.changeType).toBe('yaml_added');
      // Should handle parsing errors gracefully
    });
  });

  describe('JSON State Change Processing', () => {
    test('should process JSON state file addition', async () => {
      const jsonFile = path.join(testDir, 'assignments.json');
      const jsonData = {
        current_assignments: {
          'FEAT-001': {
            'TASK-001': {
              assigned_agent: 'cli-specialist',
              status: 'in_progress',
              started_at: new Date().toISOString()
            }
          }
        },
        assignment_history: [],
        last_updated: new Date().toISOString()
      };

      await fs.writeFile(jsonFile, JSON.stringify(jsonData, null, 2), 'utf-8');

      const changePayload = {
        watcherType: 'json',
        changeType: 'add',
        filePath: jsonFile,
        fileName: 'assignments.json',
        fileExtension: '.json',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-006'
      };

      const result = await changeDetector.processChange(changePayload);

      expect(result.analysis.success).toBe(true);
      expect(result.analysis.changeType).toBe('json_structure_available');
      expect(result.analysis.changes.length).toBeGreaterThan(0);
      expect(result.analysis.stateChanges.assignments).toBeDefined();
    });

    test('should detect JSON state modifications', async () => {
      const jsonFile = path.join(testDir, 'progress.json');

      // Initial state
      const initialData = {
        overall: {
          total_specs: 5,
          completed_specs: 2,
          completion_percentage: 40
        },
        last_updated: '2023-01-01T10:00:00.000Z'
      };

      // Modified state
      const modifiedData = {
        overall: {
          total_specs: 5,
          completed_specs: 3,
          completion_percentage: 60
        },
        by_spec: {
          'FEAT-001': {
            completed_tasks: 2,
            total_tasks: 3
          }
        },
        last_updated: new Date().toISOString()
      };

      // Write initial and cache
      await fs.writeFile(jsonFile, JSON.stringify(initialData, null, 2), 'utf-8');
      const initialPayload = {
        watcherType: 'json',
        changeType: 'add',
        filePath: jsonFile,
        fileName: 'progress.json',
        fileExtension: '.json',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-007'
      };

      await changeDetector.processChange(initialPayload);

      // Write modified
      await fs.writeFile(jsonFile, JSON.stringify(modifiedData, null, 2), 'utf-8');
      const modificationPayload = {
        watcherType: 'json',
        changeType: 'change',
        filePath: jsonFile,
        fileName: 'progress.json',
        fileExtension: '.json',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-008'
      };

      const result = await changeDetector.processChange(modificationPayload);

      expect(result.analysis.success).toBe(true);
      expect(result.analysis.changes.length).toBeGreaterThan(0);
      expect(result.analysis.stateChanges.progress).toBeDefined();

      // Should detect significant changes
      const progressChanges = result.analysis.stateChanges.progress;
      expect(progressChanges.significantChanges.length).toBeGreaterThan(0);
    });

    test('should handle malformed JSON gracefully', async () => {
      const jsonFile = path.join(testDir, 'malformed.json');
      const malformedContent = '{ "invalid": json content }';

      await fs.writeFile(jsonFile, malformedContent, 'utf-8');

      const changePayload = {
        watcherType: 'json',
        changeType: 'add',
        filePath: jsonFile,
        fileName: 'malformed.json',
        fileExtension: '.json',
        timestamp: new Date().toISOString(),
        eventId: 'test-event-009'
      };

      const result = await changeDetector.processChange(changePayload);

      expect(result.analysis.success).toBe(true);
      expect(result.analysis.changeType).toBe('json_structure_available');
      // Should handle parsing errors gracefully
    });
  });

  describe('Deep Object Diff', () => {
    test('should detect nested object changes', () => {
      const oldObj = {
        level1: {
          level2: {
            field1: 'value1',
            field2: 'value2'
          },
          simpleField: 'simple'
        }
      };

      const newObj = {
        level1: {
          level2: {
            field1: 'modified_value1',
            field2: 'value2',
            field3: 'new_field'
          },
          simpleField: 'modified'
        },
        newTopLevel: 'added'
      };

      const diffs = changeDetector.deepObjectDiff(oldObj, newObj, 'test');

      expect(diffs).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'test.level1.level2.field1',
          type: 'modification',
          oldValue: 'value1',
          newValue: 'modified_value1'
        }),
        expect.objectContaining({
          field: 'test.level1.level2.field3',
          type: 'addition',
          oldValue: 'undefined',
          newValue: 'new_field'
        }),
        expect.objectContaining({
          field: 'test.level1.simpleField',
          type: 'modification',
          oldValue: 'simple',
          newValue: 'modified'
        }),
        expect.objectContaining({
          field: 'test.newTopLevel',
          type: 'addition',
          oldValue: 'undefined',
          newValue: 'added'
        })
      ]));
    });

    test('should detect array changes', () => {
      const oldObj = {
        items: ['item1', 'item2']
      };

      const newObj = {
        items: ['item1', 'modified_item2', 'item3']
      };

      const diffs = changeDetector.deepObjectDiff(oldObj, newObj, 'test');

      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'test.items',
          type: 'modification'
        })
      ]));
    });
  });

  describe('Change Classification', () => {
    test('should classify workflow status changes', () => {
      const isWorkflowChange = changeDetector.isWorkflowStatusChange('ready', 'in_progress');
      expect(isWorkflowChange).toBe(true);

      const isNotWorkflowChange = changeDetector.isWorkflowStatusChange('active', 'draft');
      expect(isNotWorkflowChange).toBe(false);
    });

    test('should identify priority escalations', () => {
      const isEscalation = changeDetector.isPriorityEscalation('P2', 'P0');
      expect(isEscalation).toBe(true);

      const isNotEscalation = changeDetector.isPriorityEscalation('P1', 'P2');
      expect(isNotEscalation).toBe(false);
    });

    test('should extract task IDs from field paths', () => {
      const taskId1 = changeDetector.extractTaskIdFromField('tasks.TASK-001.status');
      expect(taskId1).toBe('TASK-001');

      const taskId2 = changeDetector.extractTaskIdFromField('tasks.0.title');
      expect(taskId2).toBe('0');

      const noTaskId = changeDetector.extractTaskIdFromField('global.status');
      expect(noTaskId).toBe(null);
    });

    test('should identify metadata fields', () => {
      expect(changeDetector.isMetadataField('last_updated')).toBe(true);
      expect(changeDetector.isMetadataField('created_at')).toBe(true);
      expect(changeDetector.isMetadataField('version')).toBe(true);
      expect(changeDetector.isMetadataField('status')).toBe(false);
      expect(changeDetector.isMetadataField('title')).toBe(false);
    });

    test('should identify significant state changes', () => {
      expect(changeDetector.isSignificantStateChange('current_assignments.FEAT-001.TASK-001.assigned_agent', 'modification', 'agent1', 'agent2')).toBe(true);
      expect(changeDetector.isSignificantStateChange('overall.status', 'modification', 'active', 'completed')).toBe(true);
      expect(changeDetector.isSignificantStateChange('last_updated', 'modification', '2023-01-01', '2023-01-02')).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track processing performance', async () => {
      const yamlFile = path.join(testDir, 'perf-test.md');
      const yamlContent = '---\nid: FEAT-PERF\ntitle: Performance Test\n---\n# Test';

      await fs.writeFile(yamlFile, yamlContent, 'utf-8');

      const changePayload = {
        watcherType: 'yaml',
        changeType: 'add',
        filePath: yamlFile,
        fileName: 'perf-test.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'perf-test-001'
      };

      const result = await changeDetector.processChange(changePayload);

      expect(result.processing).toMatchObject({
        timeMs: expect.any(Number),
        withinTarget: expect.any(Boolean),
        target: 100
      });

      expect(result.processing.timeMs).toBeLessThan(1000); // Should be reasonably fast
    });

    test('should update performance statistics', async () => {
      const initialStats = changeDetector.getStatistics();

      const yamlFile = path.join(testDir, 'stats-test.md');
      await fs.writeFile(yamlFile, '---\nid: FEAT-STATS\n---\n# Test', 'utf-8');

      const changePayload = {
        watcherType: 'yaml',
        changeType: 'add',
        filePath: yamlFile,
        fileName: 'stats-test.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'stats-test-001'
      };

      await changeDetector.processChange(changePayload);

      const updatedStats = changeDetector.getStatistics();

      expect(updatedStats.totalChanges).toBe(initialStats.totalChanges + 1);
      expect(updatedStats.yamlChanges).toBe(initialStats.yamlChanges + 1);
      expect(updatedStats.lastProcessedChange).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle processing errors gracefully', async () => {
      const invalidPayload = {
        watcherType: 'invalid',
        changeType: 'add',
        filePath: '/nonexistent/file.txt',
        fileName: 'file.txt',
        fileExtension: '.txt',
        timestamp: new Date().toISOString(),
        eventId: 'error-test-001'
      };

      const result = await changeDetector.processChange(invalidPayload);

      expect(result.analysis.success).toBe(false);
      expect(result.analysis.error).toBeDefined();
      expect(result.processing.error).toBe(true);

      expect(eventSpy.processing_error).toHaveBeenCalledWith(result);
    });

    test('should handle file system errors', async () => {
      const changePayload = {
        watcherType: 'yaml',
        changeType: 'add',
        filePath: '/nonexistent/path/file.md',
        fileName: 'file.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'fs-error-test-001'
      };

      const result = await changeDetector.processChange(changePayload);

      expect(result.analysis.success).toBe(true); // Should handle gracefully
      // Error should be captured in analysis
    });
  });

  describe('Cache Management', () => {
    test('should cache file states for diff analysis', async () => {
      const yamlFile = path.join(testDir, 'cache-test.md');
      const initialContent = '---\nid: FEAT-CACHE\nstatus: active\n---\n# Initial';

      await fs.writeFile(yamlFile, initialContent, 'utf-8');

      const initialPayload = {
        watcherType: 'yaml',
        changeType: 'add',
        filePath: yamlFile,
        fileName: 'cache-test.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'cache-test-001'
      };

      await changeDetector.processChange(initialPayload);

      // Check that file state is cached
      expect(changeDetector.fileStateCache.has(yamlFile)).toBe(true);
      const cachedState = changeDetector.fileStateCache.get(yamlFile);
      expect(cachedState.frontmatter).toBeDefined();
      expect(cachedState.frontmatter.id).toBe('FEAT-CACHE');
    });

    test('should clean up expired cache entries', async () => {
      // Manually add an expired cache entry
      const expiredFile = path.join(testDir, 'expired.md');
      changeDetector.fileStateCache.set(expiredFile, {
        parseable: true,
        frontmatter: { id: 'expired' },
        cachedAt: Date.now() - 400000 // 400 seconds ago (> 5 min timeout)
      });

      expect(changeDetector.fileStateCache.has(expiredFile)).toBe(true);

      // Run cleanup
      changeDetector.cleanupCache();

      expect(changeDetector.fileStateCache.has(expiredFile)).toBe(false);
    });

    test('should provide cache statistics', () => {
      const stats = changeDetector.getStatistics();

      expect(stats).toMatchObject({
        totalChanges: expect.any(Number),
        yamlChanges: expect.any(Number),
        jsonChanges: expect.any(Number),
        conflictsDetected: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        cacheSize: expect.any(Number),
        cacheTimeout: 300000,
        performanceTarget: 100,
        timestamp: expect.any(String)
      });
    });

    test('should clear cache on demand', () => {
      // Add some cache entries
      changeDetector.fileStateCache.set('file1', { data: 'test' });
      changeDetector.fileStateCache.set('file2', { data: 'test' });

      expect(changeDetector.fileStateCache.size).toBe(2);

      changeDetector.clearCache();

      expect(changeDetector.fileStateCache.size).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    test('should correctly identify objects', () => {
      expect(changeDetector.isObject({})).toBe(true);
      expect(changeDetector.isObject({ key: 'value' })).toBe(true);
      expect(changeDetector.isObject([])).toBe(false);
      expect(changeDetector.isObject(null)).toBe(false);
      expect(changeDetector.isObject('string')).toBe(false);
      expect(changeDetector.isObject(123)).toBe(false);
    });

    test('should serialize values correctly', () => {
      expect(changeDetector.serializeValue(undefined)).toBe('undefined');
      expect(changeDetector.serializeValue(null)).toBe('null');
      expect(changeDetector.serializeValue('string')).toBe('string');
      expect(changeDetector.serializeValue(123)).toBe('123');
      expect(changeDetector.serializeValue({ key: 'value' })).toBe('{"key":"value"}');
      expect(changeDetector.serializeValue([1, 2, 3])).toBe('[1,2,3]');
    });

    test('should flatten objects correctly', () => {
      const obj = {
        level1: {
          level2: {
            field1: 'value1',
            field2: 'value2'
          },
          simple: 'value'
        },
        top: 'topValue'
      };

      const flattened = changeDetector.flattenObject(obj);

      expect(flattened).toEqual(expect.arrayContaining([
        ['level1.level2.field1', 'value1'],
        ['level1.level2.field2', 'value2'],
        ['level1.simple', 'value'],
        ['top', 'topValue']
      ]));
    });
  });
});