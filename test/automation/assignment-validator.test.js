// Using Jest's built-in expect
const sinon = require('sinon');
const AssignmentValidator = require('../../lib/automation/assignment-validator');

describe('AssignmentValidator', function () {
  let validator;
  let mockConfigManager;
  let mockTaskRouter;
  let mockWorkflowStateManager;

  beforeEach(function () {
    mockConfigManager = {};

    mockTaskRouter = {
      getAllTasks: sinon.stub(),
      validateAgentCapability: sinon.stub(),
      isTaskBlocked: sinon.stub(),
      getDependencyChain: sinon.stub(),
      getConstraintEngine: sinon.stub(),
    };

    mockWorkflowStateManager = {
      getCurrentAssignments: sinon.stub(),
    };

    validator = new AssignmentValidator(
      mockConfigManager,
      mockTaskRouter,
      mockWorkflowStateManager
    );
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('validateAssignment', function () {
    it('should validate a good assignment successfully', async function () {
      const assignment = {
        taskId: 'TASK-001',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        status: 'ready',
        context_requirements: ['cli-development'],
      };

      const mockAssignments = {
        current_assignments: [],
      };

      const mockConstraintEngine = {
        validateSkillConstraints: sinon.stub().resolves({
          isValid: true,
          violations: [],
          scoreMultiplier: 1.0,
        }),
        validateWorkloadConstraints: sinon.stub().resolves({
          isValid: true,
          violations: [],
          warnings: [],
          scoreMultiplier: 1.0,
        }),
      };

      mockTaskRouter.getAllTasks.resolves([mockTask]);
      mockTaskRouter.validateAgentCapability.returns(true);
      mockTaskRouter.isTaskBlocked.returns(false);
      mockTaskRouter.getConstraintEngine.returns(mockConstraintEngine);
      mockWorkflowStateManager.getCurrentAssignments.resolves(mockAssignments);

      const result = await validator.validateAssignment(assignment);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(typeof result.validationDetails).toBe('object');
    });

    it('should reject assignment for unavailable task', async function () {
      const assignment = {
        taskId: 'TASK-001',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        status: 'in_progress',
      };

      mockTaskRouter.getAllTasks.resolves([mockTask]);
      mockWorkflowStateManager.getCurrentAssignments.resolves({
        current_assignments: [],
      });

      const result = await validator.validateAssignment(assignment);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(violation => violation.includes('not available for assignment'))).toBe(true);
    });

    it('should reject assignment for already assigned task', async function () {
      const assignment = {
        taskId: 'TASK-001',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        status: 'ready',
      };

      const mockAssignments = {
        current_assignments: [
          {
            spec_id: 'FEAT-026',
            task_id: 'TASK-001',
            status: 'in_progress',
            assigned_agent: 'another-agent',
          },
        ],
      };

      mockTaskRouter.getAllTasks.resolves([mockTask]);
      mockWorkflowStateManager.getCurrentAssignments.resolves(mockAssignments);

      const result = await validator.validateAssignment(assignment);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(violation => violation.includes('already assigned'))).toBe(true);
    });

    it('should reject assignment for blocked task', async function () {
      const assignment = {
        taskId: 'TASK-001',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        status: 'ready',
      };

      const mockConstraintEngine = {
        validateSkillConstraints: sinon.stub().resolves({
          isValid: true,
          violations: [],
          scoreMultiplier: 1.0,
        }),
      };

      mockTaskRouter.getAllTasks.resolves([mockTask]);
      mockTaskRouter.validateAgentCapability.returns(true);
      mockTaskRouter.isTaskBlocked.returns(true);
      mockTaskRouter.getDependencyChain.resolves({
        dependencies: [{ id: 'DEP-001', completed: false }],
        blockedBy: ['DEP-001'],
      });
      mockTaskRouter.getConstraintEngine.returns(mockConstraintEngine);
      mockWorkflowStateManager.getCurrentAssignments.resolves({
        current_assignments: [],
      });

      const result = await validator.validateAssignment(assignment);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(violation => violation.includes('blocked by unmet dependencies'))).toBe(true);
    });

    it('should reject assignment for incapable agent', async function () {
      const assignment = {
        taskId: 'TASK-001',
        specId: 'FEAT-026',
        agentType: 'wrong-specialist',
      };

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        status: 'ready',
      };

      const mockConstraintEngine = {
        validateSkillConstraints: sinon.stub().resolves({
          isValid: false,
          violations: ['Insufficient skill match'],
          scoreMultiplier: 0.2,
        }),
      };

      mockTaskRouter.getAllTasks.resolves([mockTask]);
      mockTaskRouter.validateAgentCapability.returns(false);
      mockTaskRouter.isTaskBlocked.returns(false);
      mockTaskRouter.getConstraintEngine.returns(mockConstraintEngine);
      mockWorkflowStateManager.getCurrentAssignments.resolves({
        current_assignments: [],
      });

      const result = await validator.validateAssignment(assignment);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(violation => violation.includes('cannot handle task'))).toBe(true);
    });

    it('should handle task not found', async function () {
      const assignment = {
        taskId: 'NONEXISTENT',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      mockTaskRouter.getAllTasks.resolves([]);
      mockWorkflowStateManager.getCurrentAssignments.resolves({
        current_assignments: [],
      });

      const result = await validator.validateAssignment(assignment);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(violation => violation.includes('not found'))).toBe(true);
    });
  });

  describe('validateWorkloadBalance', function () {
    it('should validate workload constraints', async function () {
      const mockConstraintEngine = {
        getAgentWorkload: sinon.stub().returns(20),
        validateWorkloadConstraints: sinon.stub().resolves({
          isValid: true,
          violations: [],
          warnings: [],
          scoreMultiplier: 1.0,
        }),
      };

      mockTaskRouter.getConstraintEngine.returns(mockConstraintEngine);

      const result = await validator.validateWorkloadBalance('cli-specialist', {
        maxWorkloadPerAgent: 40,
      });

      expect(result.isValid).toBe(true);
      expect(result.currentWorkload).toBe(20);
    });
  });

  describe('validateBusinessRules', function () {
    it('should require confirmation for P0 tasks', async function () {
      const assignment = {
        taskId: 'TASK-001',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        priority: 'P0',
      };

      mockTaskRouter.getAllTasks.resolves([mockTask]);
      mockWorkflowStateManager.getCurrentAssignments.resolves({
        current_assignments: [],
      });

      const result = await validator.validateBusinessRules(assignment, {
        confirmCritical: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.violations.some(violation => violation.includes('P0 (Critical) tasks require explicit confirmation'))).toBe(true);
    });

    it('should allow P0 tasks with confirmation', async function () {
      const assignment = {
        taskId: 'TASK-001',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        priority: 'P0',
      };

      mockTaskRouter.getAllTasks.resolves([mockTask]);
      mockWorkflowStateManager.getCurrentAssignments.resolves({
        current_assignments: [],
      });

      const result = await validator.validateBusinessRules(assignment, {
        confirmCritical: true,
      });

      expect(result.isValid).toBe(true);
    });

    it('should enforce maximum concurrent tasks per agent', async function () {
      const assignment = {
        taskId: 'TASK-004',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      const mockTask = {
        id: 'TASK-004',
        specId: 'FEAT-026',
        priority: 'P2',
      };

      const mockAssignments = {
        current_assignments: [
          { assigned_agent: 'cli-specialist', status: 'in_progress' },
          { assigned_agent: 'cli-specialist', status: 'in_progress' },
          { assigned_agent: 'cli-specialist', status: 'in_progress' },
        ],
      };

      mockTaskRouter.getAllTasks.resolves([mockTask]);
      mockWorkflowStateManager.getCurrentAssignments.resolves(mockAssignments);

      const result = await validator.validateBusinessRules(assignment, {
        maxConcurrentTasks: 3,
      });

      expect(result.isValid).toBe(false);
      expect(result.violations.some(violation => violation.includes('already has maximum concurrent tasks'))).toBe(true);
    });
  });

  describe('getActionableErrors', function () {
    it('should provide actionable error messages', function () {
      const validation = {
        violations: [
          'Task FEAT-026:TASK-001 not found',
          'Task TASK-002 is already assigned to another-agent',
          'Task TASK-003 is blocked by unmet dependencies: DEP-001, DEP-002',
          'Agent type cli-specialist cannot handle task TASK-004',
          'Assignment would exceed agent capacity: 50h > 40h limit',
        ],
      };

      const actionableErrors = validator.getActionableErrors(validation);

      expect(actionableErrors).toHaveLength(5);
      expect(actionableErrors[0]).toContain('Check task ID and spec ID are correct');
      expect(actionableErrors[1]).toContain("Use 'asd tasks --agent");
      expect(actionableErrors[2]).toContain('Complete dependencies first');
      expect(actionableErrors[3]).toContain('Check agent capabilities');
      expect(actionableErrors[4]).toContain('Consider load balancing');
    });
  });

  describe('audit logging', function () {
    it('should log validation events', async function () {
      const assignment = {
        taskId: 'TASK-001',
        specId: 'FEAT-026',
        agentType: 'cli-specialist',
      };

      mockTaskRouter.getAllTasks.resolves([]);
      mockWorkflowStateManager.getCurrentAssignments.resolves({
        current_assignments: [],
      });

      await validator.validateAssignment(assignment);

      const auditLog = validator.getAuditLog();
      expect(Array.isArray(auditLog)).toBe(true);
      expect(auditLog.length).toBeGreaterThan(0);

      const events = auditLog.map((entry) => entry.event);
      expect(events).toContain('assignment_validation_started');
      expect(events).toContain('assignment_validation_completed');
    });
  });
});
