const StartNextCommand = require('../../lib/commands/start-next');
const CompleteCurrentCommand = require('../../lib/commands/complete-current');
const ConfigManager = require('../../lib/config-manager');
const WorkflowStateManager = require('../../lib/workflow-state-manager');
const HandoffAutomationEngine = require('../../lib/handoff-automation-engine');
const { TaskRecommendationAPI } = require('../../lib/task-router');

// Integration tests for the complete automation workflow
describe('Automation Workflow Integration', () => {
  let configManager;
  let workflowStateManager;
  let handoffAutomationEngine;
  let taskRecommendationAPI;

  beforeAll(async () => {
    // Setup test configuration
    configManager = new ConfigManager();
    workflowStateManager = new WorkflowStateManager(configManager);
    handoffAutomationEngine = new HandoffAutomationEngine(configManager);
    taskRecommendationAPI = new TaskRecommendationAPI(configManager);

    // Initialize systems
    await workflowStateManager.initialize();
    await handoffAutomationEngine.initialize();
    await taskRecommendationAPI.initialize();
  });

  afterEach(async () => {
    // Clean up any test state
    if (workflowStateManager) {
      try {
        // Reset workflow state for next test
        const assignments = await workflowStateManager.getCurrentAssignments();
        for (const assignment of assignments.current_assignments) {
          if (assignment.status === 'in_progress') {
            await workflowStateManager.completeTask(
              assignment.spec_id,
              assignment.task_id,
              { notes: 'Test cleanup' }
            );
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('End-to-end workflow: start-next → work → complete-current', () => {
    it('should execute complete automation workflow successfully', async () => {
      // Step 1: Start next task
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        dryRun: false,
      });

      if (!startResult.success || !startResult.assigned) {
        // Skip test if no tasks available
        console.log('Skipping workflow test - no tasks available');
        return;
      }

      expect(startResult.success).toBe(true);
      expect(startResult.assigned).toBe(true);
      expect(startResult.task).toBeDefined();
      expect(startResult.task.id).toBeDefined();
      expect(startResult.task.specId).toBeDefined();

      const { specId, id: taskId } = startResult.task;

      // Step 2: Verify task is in progress
      const assignments = await workflowStateManager.getCurrentAssignments();
      const activeAssignment = assignments.current_assignments.find(
        (a) =>
          a.spec_id === specId &&
          a.task_id === taskId &&
          a.status === 'in_progress'
      );

      expect(activeAssignment).toBeDefined();
      expect(activeAssignment.assigned_agent).toBe('cli-specialist');

      // Step 3: Complete current task
      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      const completeResult = await completeCurrentCommand.execute({
        notes: 'Integration test completion',
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      });

      expect(completeResult.success).toBe(true);
      expect(completeResult.completed).toBe(true);
      expect(completeResult.task.specId).toBe(specId);
      expect(completeResult.task.taskId).toBe(taskId);

      // Step 4: Verify task is completed
      const updatedAssignments =
        await workflowStateManager.getCurrentAssignments();
      const completedAssignment = updatedAssignments.completed_assignments.find(
        (a) => a.spec_id === specId && a.task_id === taskId
      );

      expect(completedAssignment).toBeDefined();
      expect(completedAssignment.status).toBe('completed');
    }, 30000);

    it('should handle start-next with no available tasks', async () => {
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startResult = await startNextCommand.execute({
        agent: 'non-existent-agent',
        dryRun: false,
      });

      expect(startResult.success).toBe(true);
      expect(startResult.assigned).toBe(false);
      expect(startResult.suggestions).toBeDefined();
    });

    it('should handle complete-current with no active assignments', async () => {
      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      const completeResult = await completeCurrentCommand.execute({
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      });

      expect(completeResult.success).toBe(false);
      expect(completeResult.error).toContain(
        'No active task assignments found'
      );
    });
  });

  describe('Error scenarios and edge cases', () => {
    it('should handle blocked tasks in start-next', async () => {
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      // Try to get a task that might be blocked
      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        priority: 'P0', // P0 tasks might require confirmation
        dryRun: false,
      });

      // Should either succeed or provide actionable error messages
      if (!startResult.success) {
        expect(startResult.error).toBeDefined();
        expect(typeof startResult.error).toBe('string');
        expect(startResult.error.length).toBeGreaterThan(0);
      }
    });

    it('should handle validation failures gracefully', async () => {
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      // Test with invalid agent type
      const startResult = await startNextCommand.execute({
        agent: '', // Invalid agent
        dryRun: false,
      });

      expect(startResult.success).toBe(false);
      expect(startResult.error).toContain('Agent type is required');
    });

    it('should handle specific task completion when task not in progress', async () => {
      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      const completeResult = await completeCurrentCommand.execute({
        task: 'NON-EXISTENT-TASK',
        spec: 'NON-EXISTENT-SPEC',
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      });

      expect(completeResult.success).toBe(false);
      expect(completeResult.error).toContain('is not currently in progress');
    });
  });

  describe('Integration with existing WorkflowStateManager and TaskRouter', () => {
    it('should properly integrate with TaskRouter for recommendations', async () => {
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      // Test TaskRouter integration
      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        showReasoning: true,
        dryRun: true,
      });

      if (startResult.success && startResult.wouldAssign) {
        // Verify reasoning is provided when available
        expect(startResult.validation).toBeDefined();
        expect(startResult.validation.isValid).toBeDefined();
      }
    });

    it('should properly integrate with WorkflowStateManager for state updates', async () => {
      // Test that state management is working correctly
      const initialAssignments =
        await workflowStateManager.getCurrentAssignments();
      const initialCount = initialAssignments.current_assignments.length;

      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        dryRun: false,
      });

      if (startResult.success && startResult.assigned) {
        // Verify assignment was recorded
        const updatedAssignments =
          await workflowStateManager.getCurrentAssignments();
        expect(updatedAssignments.current_assignments.length).toBe(
          initialCount + 1
        );

        // Complete the task to clean up
        const completeCurrentCommand = new CompleteCurrentCommand(
          configManager
        );
        await completeCurrentCommand.initialize();

        await completeCurrentCommand.execute({
          skipLint: true,
          skipTests: true,
          skipCommit: true,
        });

        // Verify task was completed
        const finalAssignments =
          await workflowStateManager.getCurrentAssignments();
        expect(finalAssignments.current_assignments.length).toBe(initialCount);
      }
    });

    it('should integrate with HandoffAutomationEngine for dependent tasks', async () => {
      // First, start and complete a task
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        dryRun: false,
      });

      if (!startResult.success || !startResult.assigned) {
        console.log('Skipping handoff test - no tasks available');
        return;
      }

      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      const completeResult = await completeCurrentCommand.execute({
        notes: 'Integration test for handoff',
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      });

      expect(completeResult.success).toBe(true);
      expect(completeResult.handoff).toBeDefined();

      // Handoff should have been attempted
      expect(completeResult.handoff.success).toBeDefined();
    });
  });

  describe('Audit logging completeness and accuracy', () => {
    it('should maintain comprehensive audit logs in start-next', async () => {
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        dryRun: true,
      });

      expect(startResult.auditLog).toBeDefined();
      expect(Array.isArray(startResult.auditLog)).toBe(true);
      expect(startResult.auditLog.length).toBeGreaterThan(0);

      // Verify audit log structure
      const logEntry = startResult.auditLog[0];
      expect(logEntry.event).toBeDefined();
      expect(logEntry.data).toBeDefined();
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should maintain comprehensive audit logs in complete-current', async () => {
      // First need an active task
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        dryRun: false,
      });

      if (!startResult.success || !startResult.assigned) {
        console.log('Skipping audit test - no tasks available');
        return;
      }

      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      const completeResult = await completeCurrentCommand.execute({
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      });

      expect(completeResult.auditLog).toBeDefined();
      expect(Array.isArray(completeResult.auditLog)).toBeDefined();
      expect(completeResult.auditLog.length).toBeGreaterThan(0);

      // Verify key events are logged
      const eventTypes = completeResult.auditLog.map((entry) => entry.event);
      expect(eventTypes).toContain('command_initialized');
      expect(eventTypes).toContain('command_started');
    });
  });

  describe('Manual override capabilities', () => {
    it('should preserve manual task specification in complete-current', async () => {
      // First create a task assignment manually
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        dryRun: false,
      });

      if (!startResult.success || !startResult.assigned) {
        console.log('Skipping manual override test - no tasks available');
        return;
      }

      const { specId, id: taskId } = startResult.task;

      // Complete with manual task specification
      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      const completeResult = await completeCurrentCommand.execute({
        task: taskId,
        spec: specId,
        notes: 'Manual override test',
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      });

      expect(completeResult.success).toBe(true);
      expect(completeResult.task.taskId).toBe(taskId);
      expect(completeResult.task.specId).toBe(specId);
    });
  });

  describe('Performance validation', () => {
    it('should complete commands under performance targets', async () => {
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startTime = Date.now();
      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        dryRun: true,
      });
      const startDuration = Date.now() - startTime;

      expect(startResult.performance.total).toBeLessThan(5000); // 5 second target
      expect(startDuration).toBeLessThan(10000); // Allow some test overhead

      if (!startResult.wouldAssign) {
        return; // Skip complete-current test if no task available
      }

      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      const completeStartTime = Date.now();
      const completeResult = await completeCurrentCommand.execute({
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      });
      const completeDuration = Date.now() - completeStartTime;

      // If we have a result, check performance
      if (completeResult.performance) {
        expect(completeResult.performance.total).toBeLessThan(5000);
      }
      expect(completeDuration).toBeLessThan(10000);
    }, 15000);
  });

  describe('Enhanced automation features', () => {
    it('should handle git workflow integration', async () => {
      // First need an active task for git workflow
      const startNextCommand = new StartNextCommand(configManager);
      await startNextCommand.initialize();

      const startResult = await startNextCommand.execute({
        agent: 'cli-specialist',
        dryRun: false,
      });

      if (!startResult.success || !startResult.assigned) {
        console.log('Skipping git workflow test - no tasks available');
        return;
      }

      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      // Test git integration (but skip actual commit for safety)
      const completeResult = await completeCurrentCommand.execute({
        notes: 'Integration test with git workflow',
        skipLint: true,
        skipTests: true,
        skipCommit: true, // Skip actual git operations in tests
      });

      expect(completeResult.success).toBe(true);
      expect(completeResult.auditLog).toBeDefined();

      // Check audit log contains expected events
      const eventTypes = completeResult.auditLog.map((entry) => entry.event);
      expect(eventTypes).toContain('command_started');
      expect(eventTypes).toContain('task_completed');
    });

    it('should provide comprehensive error context', async () => {
      const completeCurrentCommand = new CompleteCurrentCommand(configManager);
      await completeCurrentCommand.initialize();

      // Test with invalid task specification
      const result = await completeCurrentCommand.execute({
        task: 'INVALID-TASK',
        spec: 'INVALID-SPEC',
        skipLint: true,
        skipTests: true,
        skipCommit: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('is not currently in progress');
      expect(result.auditLog).toBeDefined();
    });

    it('should handle concurrent execution safely', async () => {
      // Test that concurrent executions don't interfere
      const completeCurrentCommand1 = new CompleteCurrentCommand(configManager);
      const completeCurrentCommand2 = new CompleteCurrentCommand(configManager);

      await completeCurrentCommand1.initialize();
      await completeCurrentCommand2.initialize();

      const results = await Promise.all([
        completeCurrentCommand1.execute({
          skipLint: true,
          skipTests: true,
          skipCommit: true,
        }),
        completeCurrentCommand2.execute({
          skipLint: true,
          skipTests: true,
          skipCommit: true,
        }),
      ]);

      // Both should handle the same error condition consistently
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
      expect(results[0].error).toContain('No active task assignments');
      expect(results[1].error).toContain('No active task assignments');
    });

    it('should validate command integration architecture', async () => {
      // Test that commands properly integrate with all required systems
      const startNextCommand = new StartNextCommand(configManager);
      const completeCurrentCommand = new CompleteCurrentCommand(configManager);

      await startNextCommand.initialize();
      await completeCurrentCommand.initialize();

      // Verify all required dependencies are initialized
      expect(startNextCommand.taskAPI).toBeDefined();
      expect(startNextCommand.workflowStateManager).toBeDefined();
      expect(startNextCommand.assignmentValidator).toBeDefined();

      expect(completeCurrentCommand.workflowStateManager).toBeDefined();
      expect(completeCurrentCommand.handoffAutomationEngine).toBeDefined();

      // Verify command isolation - each has its own instances
      expect(startNextCommand.auditLog).not.toBe(
        completeCurrentCommand.auditLog
      );
    });
  });
});
