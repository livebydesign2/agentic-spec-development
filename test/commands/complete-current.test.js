const CompleteCurrentCommand = require('../../lib/commands/complete-current');
const WorkflowStateManager = require('../../lib/workflow-state-manager');
const HandoffAutomationEngine = require('../../lib/handoff-automation-engine');
const ConfigManager = require('../../lib/config-manager');

// Mock dependencies
jest.mock('../../lib/workflow-state-manager');
jest.mock('../../lib/handoff-automation-engine');
jest.mock('../../lib/config-manager');
jest.mock('child_process');
jest.mock('chokidar');

describe('CompleteCurrentCommand', () => {
  let command;
  let mockConfigManager;
  let mockWorkflowStateManager;
  let mockHandoffAutomationEngine;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock instances
    mockConfigManager = {
      getProjectRoot: jest.fn().mockReturnValue('/test/project'),
    };

    mockWorkflowStateManager = {
      initialize: jest.fn().mockResolvedValue(true),
      getCurrentAssignments: jest.fn(),
      completeTask: jest.fn(),
    };

    mockHandoffAutomationEngine = {
      initialize: jest.fn().mockResolvedValue(true),
      executeHandoff: jest.fn(),
    };

    // Setup constructor mocks
    ConfigManager.mockImplementation(() => mockConfigManager);
    WorkflowStateManager.mockImplementation(() => mockWorkflowStateManager);
    HandoffAutomationEngine.mockImplementation(
      () => mockHandoffAutomationEngine
    );

    // Create command instance
    command = new CompleteCurrentCommand(mockConfigManager);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const result = await command.initialize();

      expect(result).toBe(true);
      expect(mockWorkflowStateManager.initialize).toHaveBeenCalled();
      expect(mockHandoffAutomationEngine.initialize).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      mockWorkflowStateManager.initialize.mockRejectedValue(
        new Error('Init failed')
      );

      await expect(command.initialize()).rejects.toThrow(
        'CompleteCurrentCommand initialization failed: Init failed'
      );
    });
  });

  describe('determineTaskToComplete', () => {
    beforeEach(async () => {
      await command.initialize();
    });

    it('should use specific task when provided', async () => {
      const options = { task: 'TASK-001', spec: 'FEAT-001' };

      mockWorkflowStateManager.getCurrentAssignments.mockResolvedValue({
        current_assignments: [
          { spec_id: 'FEAT-001', task_id: 'TASK-001', status: 'in_progress' },
        ],
      });

      const result = await command.determineTaskToComplete(options);

      expect(result.success).toBe(true);
      expect(result.specId).toBe('FEAT-001');
      expect(result.taskId).toBe('TASK-001');
    });

    it('should reject task without spec', async () => {
      const options = { task: 'TASK-001' };

      const result = await command.determineTaskToComplete(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('--spec is required when using --task');
    });

    it('should find current active assignment', async () => {
      const options = {};

      mockWorkflowStateManager.getCurrentAssignments.mockResolvedValue({
        current_assignments: [
          { spec_id: 'FEAT-002', task_id: 'TASK-003', status: 'in_progress' },
        ],
      });

      const result = await command.determineTaskToComplete(options);

      expect(result.success).toBe(true);
      expect(result.specId).toBe('FEAT-002');
      expect(result.taskId).toBe('TASK-003');
    });

    it('should handle no active assignments', async () => {
      const options = {};

      mockWorkflowStateManager.getCurrentAssignments.mockResolvedValue({
        current_assignments: [],
      });

      const result = await command.determineTaskToComplete(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active task assignments found');
    });

    it('should handle multiple active assignments', async () => {
      const options = {};

      mockWorkflowStateManager.getCurrentAssignments.mockResolvedValue({
        current_assignments: [
          { spec_id: 'FEAT-001', task_id: 'TASK-001', status: 'in_progress' },
          { spec_id: 'FEAT-002', task_id: 'TASK-002', status: 'in_progress' },
        ],
      });

      const result = await command.determineTaskToComplete(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Multiple active assignments');
    });
  });

  describe('completeTask', () => {
    beforeEach(async () => {
      await command.initialize();
    });

    it('should complete task successfully', async () => {
      const completionResult = {
        success: true,
        completion: {
          completed_at: '2023-01-01T00:00:00Z',
          duration_hours: 2,
        },
      };

      mockWorkflowStateManager.completeTask.mockResolvedValue(completionResult);

      const result = await command.completeTask('FEAT-001', 'TASK-001', {
        notes: 'Test completion',
      });

      expect(result.success).toBe(true);
      expect(mockWorkflowStateManager.completeTask).toHaveBeenCalledWith(
        'FEAT-001',
        'TASK-001',
        { notes: 'Test completion', completedBy: 'complete-current-automation' }
      );
    });

    it('should handle completion failure', async () => {
      mockWorkflowStateManager.completeTask.mockResolvedValue({
        success: false,
        error: 'Task not found',
      });

      const result = await command.completeTask('FEAT-001', 'TASK-001', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Task completion failed: Task not found');
    });
  });

  describe('triggerHandoffAutomation', () => {
    beforeEach(async () => {
      await command.initialize();
    });

    it('should trigger handoff successfully with next task', async () => {
      const handoffResult = {
        success: true,
        handoffNeeded: true,
        nextTask: 'TASK-002',
        nextAgent: 'backend-developer',
      };

      mockHandoffAutomationEngine.executeHandoff.mockResolvedValue(
        handoffResult
      );

      const result = await command.triggerHandoffAutomation(
        'FEAT-001',
        'TASK-001'
      );

      expect(result.success).toBe(true);
      expect(result.handoffNeeded).toBe(true);
      expect(mockHandoffAutomationEngine.executeHandoff).toHaveBeenCalledWith({
        type: 'TASK_COMPLETED',
        specId: 'FEAT-001',
        taskId: 'TASK-001',
        fromAgent: 'complete-current-automation',
        context: {
          completionMethod: 'automated',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle no handoff needed', async () => {
      mockHandoffAutomationEngine.executeHandoff.mockResolvedValue({
        success: true,
        handoffNeeded: false,
        reason: 'No dependent tasks',
      });

      const result = await command.triggerHandoffAutomation(
        'FEAT-001',
        'TASK-001'
      );

      expect(result.success).toBe(true);
      expect(result.handoffNeeded).toBe(false);
    });

    it('should handle handoff failure gracefully', async () => {
      mockHandoffAutomationEngine.executeHandoff.mockRejectedValue(
        new Error('Handoff system down')
      );

      const result = await command.triggerHandoffAutomation(
        'FEAT-001',
        'TASK-001'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Handoff system down');
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate properly formatted commit message', () => {
      const result = command.generateCommitMessage('FEAT-001', 'TASK-001');

      expect(result).toContain('Complete FEAT-001 TASK-001');
      expect(result).toContain(
        '🤖 Generated with [Claude Code](https://claude.ai/code)'
      );
      expect(result).toContain(
        'Co-Authored-By: Claude <noreply@anthropic.com>'
      );
    });
  });

  describe('execute - integration', () => {
    beforeEach(async () => {
      await command.initialize();

      // Mock successful task determination
      mockWorkflowStateManager.getCurrentAssignments.mockResolvedValue({
        current_assignments: [
          { spec_id: 'FEAT-001', task_id: 'TASK-001', status: 'in_progress' },
        ],
      });

      // Mock successful task completion
      mockWorkflowStateManager.completeTask.mockResolvedValue({
        success: true,
        completion: {
          completed_at: '2023-01-01T00:00:00Z',
          duration_hours: 2,
        },
      });

      // Mock successful handoff
      mockHandoffAutomationEngine.executeHandoff.mockResolvedValue({
        success: true,
        handoffNeeded: false,
        reason: 'No dependent tasks',
      });
    });

    it('should execute complete workflow successfully', async () => {
      // Mock child_process for linting and testing
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        }),
      };
      spawn.mockReturnValue(mockChild);

      // Mock chokidar
      const chokidar = require('chokidar');
      const mockWatcher = {
        on: jest.fn().mockReturnThis(),
        close: jest.fn().mockResolvedValue(),
      };
      chokidar.watch.mockReturnValue(mockWatcher);

      const options = {
        notes: 'Test completion',
        skipCommit: true, // Skip git to avoid complexity in tests
      };

      const result = await command.execute(options);

      expect(result.success).toBe(true);
      expect(result.completed).toBe(true);
      expect(result.task.specId).toBe('FEAT-001');
      expect(result.task.taskId).toBe('TASK-001');
    });

    it('should handle linting failure', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Failure exit code
          }
        }),
      };
      spawn.mockReturnValue(mockChild);

      const options = {};
      const result = await command.execute(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Linting failed');
    });

    it('should skip linting when requested', async () => {
      const { spawn } = require('child_process');
      spawn.mockReturnValue({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        }),
      });

      const options = {
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      };

      const result = await command.execute(options);

      expect(result.success).toBe(true);
      // Lint command should not have been called
      expect(spawn).not.toHaveBeenCalledWith(
        'npm',
        ['run', 'lint'],
        expect.any(Object)
      );
    });
  });

  describe('audit logging', () => {
    beforeEach(async () => {
      await command.initialize();
    });

    it('should log command execution events', async () => {
      command.logAuditEvent('test_event', { test: 'data' });

      const auditLog = command.getAuditLog();

      expect(auditLog).toHaveLength(2); // Initialize + test event
      expect(auditLog[1].event).toBe('test_event');
      expect(auditLog[1].data.test).toBe('data');
      expect(auditLog[1].timestamp).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });

    it('should clear audit log', () => {
      command.logAuditEvent('test_event', {});
      expect(command.getAuditLog()).toHaveLength(2);

      command.clearAuditLog();
      expect(command.getAuditLog()).toHaveLength(0);
    });
  });
});
