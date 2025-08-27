const ValidationRules = require('../lib/validation-rules');

describe('ValidationRules', () => {
  describe('ValidationRule base class', () => {
    test('should throw error for unimplemented validate method', async () => {
      const rule = new ValidationRules.ValidationRule('test', 'spec');

      await expect(rule.validate({})).rejects.toThrow('Subclasses must implement validate method');
    });

    test('should throw error for unimplemented autoFix method', async () => {
      const rule = new ValidationRules.ValidationRule('test', 'spec');

      await expect(rule.autoFix('content', {})).rejects.toThrow('Auto-fix not implemented for this rule');
    });

    test('should return default values for methods', () => {
      const rule = new ValidationRules.ValidationRule('test', 'spec', 'warning');

      expect(rule.name).toBe('test');
      expect(rule.category).toBe('spec');
      expect(rule.severity).toBe('warning');
      expect(rule.canAutoFix({})).toBe(false);
      expect(rule.isTrivialFix({})).toBe(false);
      expect(rule.getFixType({})).toBe('manual');
      expect(rule.getDescription()).toBe('test validation rule');
      expect(rule.getFixSuggestion({})).toEqual(['Manual correction required']);
    });
  });

  describe('RequiredFieldsRule', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRules.RequiredFieldsRule();
    });

    test('should validate specs with all required fields', async () => {
      const spec = {
        id: 'FEAT-001',
        title: 'Test Feature',
        type: 'FEAT',
        status: 'active',
        priority: 'P1',
        filePath: '/test/spec.md'
      };

      const result = await rule.validate(spec, {});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required fields', async () => {
      const spec = {
        id: 'FEAT-001',
        title: 'Test Feature',
        // Missing type, status, priority
        filePath: '/test/spec.md'
      };

      const result = await rule.validate(spec, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);

      const missingFields = result.errors.map(e => e.field);
      expect(missingFields).toContain('type');
      expect(missingFields).toContain('status');
      expect(missingFields).toContain('priority');
    });

    test('should auto-fix missing priority field', async () => {
      const content = `---
id: FEAT-001
title: Test Feature
type: FEAT
status: active
---

# Test Feature`;

      const error = { type: 'missing_required_field', field: 'priority' };
      const fixedContent = await rule.autoFix(content, error);

      expect(fixedContent).toContain('priority: P2');
    });

    test('should handle specs without frontmatter', async () => {
      const content = '# Test Feature\n\nContent here';
      const error = { type: 'missing_required_field', field: 'priority' };

      const fixedContent = await rule.autoFix(content, error);
      expect(fixedContent).toContain('---\npriority: P2\n---');
    });

    test('should not auto-fix non-fixable fields', async () => {
      const content = 'test content';
      const error = { type: 'missing_required_field', field: 'id' };

      const fixedContent = await rule.autoFix(content, error);
      expect(fixedContent).toBe(content); // No changes
    });
  });

  describe('IDFormatRule', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRules.IDFormatRule();
    });

    test('should validate correct ID formats', async () => {
      const specs = [
        { id: 'FEAT-001', filePath: '/test/spec.md' },
        { id: 'BUG-042', filePath: '/test/spec.md' },
        { id: 'SPEC-123', filePath: '/test/spec.md' }
      ];

      const context = { supportedTypes: ['FEAT', 'BUG', 'SPEC'] };

      for (const spec of specs) {
        const result = await rule.validate(spec, context);
        expect(result.valid).toBe(true);
      }
    });

    test('should detect invalid ID formats', async () => {
      const specs = [
        { id: 'INVALID-1', filePath: '/test/spec.md' }, // Wrong number format
        { id: 'FEAT_001', filePath: '/test/spec.md' }, // Wrong separator
        { id: 'TASK-001', filePath: '/test/spec.md' }, // Unsupported type
      ];

      const context = { supportedTypes: ['FEAT', 'BUG', 'SPEC'] };

      for (const spec of specs) {
        const result = await rule.validate(spec, context);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('invalid_id_format');
      }
    });

    test('should provide helpful error messages', async () => {
      const spec = { id: 'INVALID-1', filePath: '/test/spec.md' };
      const context = { supportedTypes: ['FEAT', 'BUG', 'SPEC'] };

      const result = await rule.validate(spec, context);
      expect(result.errors[0].message).toContain('Invalid ID format');
      expect(result.errors[0].expectedPattern).toBe('(FEAT|BUG|SPEC)-###');
    });
  });

  describe('PriorityValidationRule', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRules.PriorityValidationRule();
    });

    test('should validate correct priorities', async () => {
      const priorities = ['P0', 'P1', 'P2', 'P3'];
      const context = { priorities };

      for (const priority of priorities) {
        const spec = { priority, filePath: '/test/spec.md' };
        const result = await rule.validate(spec, context);
        expect(result.valid).toBe(true);
      }
    });

    test('should detect invalid priorities', async () => {
      const spec = { priority: 'HIGH', filePath: '/test/spec.md' };
      const context = { priorities: ['P0', 'P1', 'P2', 'P3'] };

      const result = await rule.validate(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('invalid_priority');
    });

    test('should auto-fix common priority formats', async () => {
      const content = `---
id: FEAT-001
priority: high
---

# Test`;

      const error = { type: 'invalid_priority' };
      const fixedContent = await rule.autoFix(content, error);

      expect(fixedContent).toContain('priority: P0');
    });

    test('should normalize case-insensitive priorities', async () => {
      const content = `---
priority: p2
---`;

      const error = { type: 'invalid_priority' };
      const fixedContent = await rule.autoFix(content, error);

      expect(fixedContent).toContain('priority: P2');
    });
  });

  describe('StatusValidationRule', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRules.StatusValidationRule();
    });

    test('should validate correct statuses', async () => {
      const statuses = ['active', 'backlog', 'done'];
      const context = { statusFolders: statuses };

      for (const status of statuses) {
        const spec = { status, filePath: '/test/spec.md' };
        const result = await rule.validate(spec, context);
        expect(result.valid).toBe(true);
      }
    });

    test('should detect invalid statuses', async () => {
      const spec = { status: 'in_progress', filePath: '/test/spec.md' };
      const context = { statusFolders: ['active', 'backlog', 'done'] };

      const result = await rule.validate(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('invalid_status');
    });

    test('should auto-fix common status formats', async () => {
      const testCases = [
        { input: 'in_progress', expected: 'active' },
        { input: 'completed', expected: 'done' },
        { input: 'todo', expected: 'backlog' }
      ];

      for (const testCase of testCases) {
        const content = `status: ${testCase.input}`;
        const error = { type: 'invalid_status' };

        const fixedContent = await rule.autoFix(content, error);
        expect(fixedContent).toContain(`status: ${testCase.expected}`);
      }
    });
  });

  describe('TaskDependencyRule', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRules.TaskDependencyRule();
    });

    test('should validate tasks with valid dependencies', async () => {
      const task = {
        id: 'TASK-002',
        depends_on: ['TASK-001']
      };

      const context = {
        spec: {
          tasks: [
            { id: 'TASK-001' },
            { id: 'TASK-002', depends_on: ['TASK-001'] }
          ]
        }
      };

      const result = await rule.validate(task, context);
      expect(result.valid).toBe(true);
    });

    test('should detect invalid dependencies', async () => {
      const task = {
        id: 'TASK-002',
        depends_on: ['NONEXISTENT-TASK']
      };

      const context = {
        spec: {
          tasks: [{ id: 'TASK-002' }]
        }
      };

      const result = await rule.validate(task, context);
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('invalid_dependencies');
      expect(result.errors[0].invalidDeps).toContain('NONEXISTENT-TASK');
    });

    test('should detect circular dependencies', async () => {
      const task = {
        id: 'TASK-001',
        depends_on: ['TASK-002']
      };

      const context = {
        spec: {
          tasks: [
            { id: 'TASK-001', depends_on: ['TASK-002'] },
            { id: 'TASK-002', depends_on: ['TASK-001'] }
          ]
        }
      };

      const result = await rule.validate(task, context);
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('circular_dependency');
    });

    test('should handle tasks without dependencies', async () => {
      const task = { id: 'TASK-001' };
      const context = { spec: { tasks: [task] } };

      const result = await rule.validate(task, context);
      expect(result.valid).toBe(true);
    });
  });

  describe('AgentTypeValidationRule', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRules.AgentTypeValidationRule();
    });

    test('should validate known agent types', async () => {
      const knownTypes = [
        'software-architect',
        'backend-specialist',
        'frontend-specialist',
        'cli-specialist'
      ];

      for (const agentType of knownTypes) {
        const task = { id: 'TASK-001', agent_type: agentType };
        const result = await rule.validate(task, {});

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    test('should warn about unknown agent types', async () => {
      const task = { id: 'TASK-001', agent_type: 'unknown-specialist' };
      const result = await rule.validate(task, {});

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('unknown_agent_type');
    });

    test('should warn about missing agent types', async () => {
      const task = { id: 'TASK-001' }; // No agent_type
      const result = await rule.validate(task, {});

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('missing_agent_type');
    });
  });

  describe('IDUniquenessRule', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRules.IDUniquenessRule();
    });

    test('should validate unique IDs', async () => {
      const specs = [
        { id: 'FEAT-001', filePath: '/test/feat1.md' },
        { id: 'FEAT-002', filePath: '/test/feat2.md' },
        { id: 'SPEC-001', filePath: '/test/spec1.md' }
      ];

      const result = await rule.validate(specs, {});
      expect(result.valid).toBe(true);
    });

    test('should detect duplicate IDs', async () => {
      const specs = [
        { id: 'FEAT-001', filePath: '/test/feat1.md' },
        { id: 'FEAT-001', filePath: '/test/feat1-duplicate.md' },
        { id: 'SPEC-001', filePath: '/test/spec1.md' }
      ];

      const result = await rule.validate(specs, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('duplicate_id');
      expect(result.errors[0].duplicateId).toBe('FEAT-001');
      expect(result.errors[0].files).toHaveLength(2);
    });

    test('should handle specs without IDs', async () => {
      const specs = [
        { id: 'FEAT-001', filePath: '/test/feat1.md' },
        { filePath: '/test/no-id.md' }, // No ID
        { id: 'SPEC-001', filePath: '/test/spec1.md' }
      ];

      const result = await rule.validate(specs, {});
      expect(result.valid).toBe(true); // Should not crash on missing ID
    });
  });

  describe('AssignmentValidationRule', () => {
    let rule;
    let mockSpecParser;

    beforeEach(() => {
      rule = new ValidationRules.AssignmentValidationRule();
      mockSpecParser = {
        getSpecs: jest.fn().mockReturnValue([
          {
            id: 'FEAT-001',
            tasks: [
              { id: 'TASK-001', status: 'ready' },
              { id: 'TASK-002', status: 'in_progress' },
              { id: 'TASK-003', status: 'completed' }
            ]
          }
        ])
      };
    });

    test('should validate valid assignments', async () => {
      const data = {
        taskId: 'TASK-001',
        agentType: 'backend-specialist',
        specId: 'FEAT-001'
      };

      const context = {
        operation: 'assignment',
        specParser: mockSpecParser
      };

      const result = await rule.validate(data, context);
      expect(result.valid).toBe(true);
    });

    test('should reject assignments with missing data', async () => {
      const data = {
        taskId: 'TASK-001',
        // Missing agentType and specId
      };

      const context = { operation: 'assignment' };

      const result = await rule.validate(data, context);
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('incomplete_assignment_data');
    });

    test('should reject assignments to already assigned tasks', async () => {
      const data = {
        taskId: 'TASK-002', // Already in_progress
        agentType: 'backend-specialist',
        specId: 'FEAT-001'
      };

      const context = {
        operation: 'assignment',
        specParser: mockSpecParser
      };

      const result = await rule.validate(data, context);
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('task_already_assigned');
    });

    test('should reject assignments to completed tasks', async () => {
      const data = {
        taskId: 'TASK-003', // Already completed
        agentType: 'backend-specialist',
        specId: 'FEAT-001'
      };

      const context = {
        operation: 'assignment',
        specParser: mockSpecParser
      };

      const result = await rule.validate(data, context);
      expect(result.valid).toBe(false);
      expect(result.errors[0].type).toBe('task_already_completed');
    });
  });

  describe('TransitionValidationRule', () => {
    let rule;

    beforeEach(() => {
      rule = new ValidationRules.TransitionValidationRule();
    });

    test('should validate valid transitions', async () => {
      const validTransitions = [
        { from: 'backlog', to: 'active' },
        { from: 'active', to: 'done' },
        { from: 'active', to: 'backlog' }
      ];

      for (const transition of validTransitions) {
        const data = {
          specId: 'FEAT-001',
          fromStatus: transition.from,
          toStatus: transition.to
        };

        const context = { operation: 'transition' };

        const result = await rule.validate(data, context);
        expect(result.valid).toBe(true);
      }
    });

    test('should reject invalid transitions', async () => {
      const invalidTransitions = [
        { from: 'done', to: 'active' }, // Done is terminal
        { from: 'done', to: 'backlog' },
        { from: 'backlog', to: 'done' } // Must go through active
      ];

      for (const transition of invalidTransitions) {
        const data = {
          specId: 'FEAT-001',
          fromStatus: transition.from,
          toStatus: transition.to
        };

        const context = { operation: 'transition' };

        const result = await rule.validate(data, context);
        expect(result.valid).toBe(false);
        expect(result.errors[0].type).toBe('invalid_status_transition');
      }
    });

    test('should ignore non-transition operations', async () => {
      const data = { invalid: 'data' };
      const context = { operation: 'assignment' }; // Not transition

      const result = await rule.validate(data, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});