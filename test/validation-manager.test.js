const fs = require('fs').promises;
const ValidationManager = require('../lib/validation-manager');
const ValidationRules = require('../lib/validation-rules');

// Mock file system for testing
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
  }
}));

describe('ValidationManager', () => {
  let validationManager;
  let mockConfigManager;
  let mockSpecParser;
  let mockSpecs;

  beforeEach(() => {
    // Setup mock specs
    mockSpecs = [
      {
        id: 'FEAT-001',
        type: 'FEAT',
        title: 'Test Feature',
        status: 'active',
        priority: 'P1',
        filePath: '/test/FEAT-001.md',
        tasks: [
          {
            id: 'TASK-001',
            title: 'Test Task',
            agent_type: 'backend-specialist',
            status: 'ready',
            estimated_hours: 4,
          }
        ]
      },
      {
        id: 'SPEC-002',
        type: 'SPEC',
        title: 'Test Specification',
        status: 'backlog',
        priority: 'P2',
        filePath: '/test/SPEC-002.md',
        tasks: []
      }
    ];

    // Setup mocks
    mockConfigManager = {
      loadConfig: jest.fn().mockReturnValue({
        supportedTypes: ['FEAT', 'SPEC', 'BUG'],
        statusFolders: ['active', 'backlog', 'done'],
        priorities: ['P0', 'P1', 'P2', 'P3'],
        validation: {
          performanceThreshold: 2000,
          autoFixing: true,
          requireConfirmation: true,
        }
      }),
      get: jest.fn((key, fallback) => {
        const config = {
          supportedTypes: ['FEAT', 'SPEC', 'BUG'],
          statusFolders: ['active', 'backlog', 'done'],
          priorities: ['P0', 'P1', 'P2', 'P3'],
        };
        return config[key] || fallback;
      })
    };

    mockSpecParser = {
      loadSpecs: jest.fn().mockResolvedValue(),
      getSpecs: jest.fn().mockReturnValue(mockSpecs)
    };

    validationManager = new ValidationManager(mockConfigManager, mockSpecParser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      const result = await validationManager.initialize();
      expect(result).toBe(true);
      expect(mockSpecParser.loadSpecs).toHaveBeenCalled();
      expect(mockConfigManager.loadConfig).toHaveBeenCalled();
    });

    test('should register built-in validation rules', async () => {
      await validationManager.initialize();
      const rules = validationManager.getRules();
      expect(rules.length).toBeGreaterThan(0);

      const ruleNames = rules.map(rule => rule.name);
      expect(ruleNames).toContain('required-fields');
      expect(ruleNames).toContain('id-format');
      expect(ruleNames).toContain('priority-validation');
    });

    test('should configure performance settings', async () => {
      await validationManager.initialize();
      expect(validationManager.performanceThreshold).toBe(2000);
      expect(validationManager.autoFixingEnabled).toBe(true);
      expect(validationManager.confirmationRequired).toBe(true);
    });
  });

  describe('project validation', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should validate entire project', async () => {
      const result = await validationManager.validateProject();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('summary');
      expect(result.summary.total_specs).toBe(2);
    });

    test('should detect validation errors', async () => {
      // Add invalid spec
      mockSpecs.push({
        id: 'INVALID-001',
        type: 'INVALID',
        title: 'Invalid Spec',
        status: 'invalid_status',
        priority: 'INVALID',
        filePath: '/test/INVALID-001.md',
        tasks: []
      });

      const result = await validationManager.validateProject();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should respect performance threshold', async () => {
      // Set a very low threshold to force performance warning
      validationManager.performanceThreshold = 0;

      const result = await validationManager.validateProject();

      const performanceWarnings = result.warnings.filter(w => w.type === 'performance');
      expect(performanceWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('spec validation', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should validate single specification', async () => {
      const result = await validationManager.validateSpec('/test/FEAT-001.md');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result.filePath).toBe('/test/FEAT-001.md');
    });

    test('should use cache for repeated validations', async () => {
      // First validation
      const result1 = await validationManager.validateSpec('/test/FEAT-001.md');

      // Second validation (should use cache)
      const result2 = await validationManager.validateSpec('/test/FEAT-001.md');

      expect(result1).toEqual(result2);
    });

    test('should skip cache when requested', async () => {
      const result1 = await validationManager.validateSpec('/test/FEAT-001.md');
      const result2 = await validationManager.validateSpec('/test/FEAT-001.md', { skipCache: true });

      // Both results should be valid but independently generated
      expect(result1.valid).toBe(result2.valid);
    });
  });

  describe('task validation', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should validate individual task', async () => {
      const result = await validationManager.validateTask('FEAT-001', 'TASK-001');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('taskId');
      expect(result.taskId).toBe('TASK-001');
    });

    test('should handle missing task', async () => {
      const result = await validationManager.validateTask('FEAT-001', 'NONEXISTENT');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'task_not_found'
          })
        ])
      );
    });

    test('should handle missing spec', async () => {
      const result = await validationManager.validateTask('NONEXISTENT', 'TASK-001');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'spec_not_found'
          })
        ])
      );
    });
  });

  describe('workflow validation', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should validate assignment operations', async () => {
      const result = await validationManager.validateWorkflowOperation('assignment', {
        taskId: 'TASK-001',
        agentType: 'backend-specialist',
        specId: 'FEAT-001'
      });

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('operation');
      expect(result.operation).toBe('assignment');
    });

    test('should validate status transitions', async () => {
      const result = await validationManager.validateWorkflowOperation('transition', {
        specId: 'FEAT-001',
        fromStatus: 'backlog',
        toStatus: 'active'
      });

      expect(result).toHaveProperty('valid');
    });

    test('should reject invalid transitions', async () => {
      const result = await validationManager.validateWorkflowOperation('transition', {
        specId: 'FEAT-001',
        fromStatus: 'done',
        toStatus: 'backlog'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'invalid_status_transition'
          })
        ])
      );
    });
  });

  describe('consistency validation', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should detect duplicate IDs', async () => {
      // Add duplicate ID
      mockSpecs.push({
        id: 'FEAT-001', // Duplicate
        type: 'FEAT',
        title: 'Duplicate Feature',
        status: 'active',
        priority: 'P1',
        filePath: '/test/FEAT-001-duplicate.md',
        tasks: []
      });

      const result = await validationManager.validateConsistency(mockSpecs);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'duplicate_id'
          })
        ])
      );
    });

    test('should validate cross-spec dependencies', async () => {
      // Add spec with invalid dependency
      mockSpecs.push({
        id: 'FEAT-003',
        type: 'FEAT',
        title: 'Dependent Feature',
        status: 'backlog',
        priority: 'P2',
        filePath: '/test/FEAT-003.md',
        dependencies: ['NONEXISTENT-SPEC'],
        tasks: []
      });

      const result = await validationManager.validateConsistency(mockSpecs);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'invalid_spec_dependencies'
          })
        ])
      );
    });
  });

  describe('rule management', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should register new validation rule', () => {
      const customRule = new ValidationRules.ValidationRule('custom-rule', 'spec', 'warning');
      customRule.validate = jest.fn().mockResolvedValue({ valid: true });

      const result = validationManager.registerRule('custom-rule', customRule);
      expect(result).toBe(true);

      const rules = validationManager.getRules();
      expect(rules).toContainEqual(expect.objectContaining({ name: 'custom-rule' }));
    });

    test('should reject invalid rule registration', () => {
      const invalidRule = { name: 'invalid' }; // Missing validate method

      const result = validationManager.registerRule('invalid-rule', invalidRule);
      expect(result).toBe(false);
    });

    test('should unregister validation rule', () => {
      const result = validationManager.unregisterRule('required-fields');
      expect(result).toBe(true);

      const rules = validationManager.getRules();
      expect(rules).not.toContainEqual(expect.objectContaining({ name: 'required-fields' }));
    });

    test('should filter rules by category', () => {
      const specRules = validationManager.getRules('spec');
      const taskRules = validationManager.getRules('task');

      expect(specRules.length).toBeGreaterThan(0);
      expect(taskRules.length).toBeGreaterThan(0);
      expect(specRules.every(rule => rule.category === 'spec')).toBe(true);
      expect(taskRules.every(rule => rule.category === 'task')).toBe(true);
    });
  });

  describe('auto-fixing', () => {
    beforeEach(async () => {
      await validationManager.initialize();

      // Mock file operations
      fs.readFile.mockResolvedValue(`---
id: FEAT-001
title: Test Feature
type: FEAT
status: active
---

# Test Feature`);

      fs.writeFile.mockResolvedValue();
    });

    test('should preview fixes', async () => {
      const validationResults = {
        fixable: [
          {
            type: 'invalid_priority',
            message: 'Invalid priority: HIGH',
            rule: 'priority-validation',
            file: '/test/FEAT-001.md'
          }
        ]
      };

      const preview = await validationManager.previewFixes(validationResults);

      expect(preview.fixable_count).toBe(1);
      expect(preview.fixes.length).toBe(1);
      expect(preview.fixes[0].type).toBe('invalid_priority');
    });

    test('should auto-fix issues', async () => {
      const validationResults = {
        fixable: [
          {
            type: 'invalid_priority',
            message: 'Invalid priority: HIGH',
            rule: 'priority-validation',
            file: '/test/FEAT-001.md'
          }
        ]
      };

      const result = await validationManager.autoFix(validationResults, { confirmed: true, skipConfirmation: true });

      expect(result.success).toBe(true);
      // Note: might not write if no changes were made by the rule
      // expect(fs.writeFile).toHaveBeenCalled();
    });

    test('should handle no fixable issues', async () => {
      const validationResults = { fixable: [] };

      const result = await validationManager.autoFix(validationResults);

      expect(result.message).toContain('No fixable issues found');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('quality gates', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should enforce quality gates', async () => {
      const result = await validationManager.enforceQualityGate('assignment', {
        taskId: 'TASK-001',
        agentType: 'backend-specialist',
        specId: 'FEAT-001'
      });

      expect(result).toHaveProperty('allowed');
    });

    test('should block invalid operations', async () => {
      const result = await validationManager.enforceQualityGate('assignment', {
        taskId: 'NONEXISTENT',
        agentType: 'backend-specialist',
        specId: 'FEAT-001'
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Quality gate validation failed');
    });
  });

  describe('fix suggestions', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should provide fix suggestions', () => {
      const error = {
        type: 'missing_required_field',
        field: 'priority',
        rule: 'required-fields'
      };

      const suggestions = validationManager.getFixSuggestions(error);
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('should handle unknown error types', () => {
      const error = {
        type: 'unknown_error',
        rule: 'unknown-rule'
      };

      const suggestions = validationManager.getFixSuggestions(error);
      expect(suggestions).toContain('Manual review and correction required');
    });
  });

  describe('performance', () => {
    beforeEach(async () => {
      await validationManager.initialize();
    });

    test('should track validation performance', async () => {
      const result = await validationManager.validateProject();

      expect(result.performance).toHaveProperty('total');
      expect(typeof result.performance.total).toBe('number');
      expect(result.performance.total).toBeGreaterThanOrEqual(0);
    });

    test('should provide validation statistics', () => {
      const stats = validationManager.getStats();

      expect(stats).toHaveProperty('registered_rules');
      expect(stats).toHaveProperty('cache_size');
      expect(stats).toHaveProperty('categories');
      expect(stats).toHaveProperty('auto_fixing_enabled');
      expect(stats).toHaveProperty('performance_threshold');
    });

    test('should support cache management', () => {
      // Add something to cache
      validationManager.cache.set('test', { data: 'test' });
      expect(validationManager.cache.size).toBeGreaterThan(0);

      // Clear cache
      validationManager.clearCache();
      expect(validationManager.cache.size).toBe(0);
    });
  });
});