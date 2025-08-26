const WorkflowStateManager = require("../lib/workflow-state-manager");
const ConfigManager = require("../lib/config-manager");
const SpecParser = require("../lib/feature-parser");
const fs = require("fs").promises;
const path = require("path");

describe("WorkflowStateManager", () => {
  let stateManager;
  let configManager;
  let specParser;
  let testDir;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(__dirname, "temp", "workflow-state-test");
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, ".asd", "state"), { recursive: true });
    await fs.mkdir(path.join(testDir, "docs", "specs", "active"), {
      recursive: true,
    });

    // Create test spec file
    const testSpecContent = `---
id: "FEAT-TEST"
title: "Test Feature"
type: "FEAT"
phase: "PHASE-1A"
priority: "P1"
status: "active"
tasks:
  - id: "TASK-001"
    title: "Test Task 1"
    agent_type: "backend-developer"
    status: "ready"
    estimated_hours: 4
    depends_on: []
  - id: "TASK-002"
    title: "Test Task 2"
    agent_type: "ui-developer"
    status: "ready"
    estimated_hours: 3
    depends_on: ["TASK-001"]
---

# Test Feature

Test feature for WorkflowStateManager validation.
`;

    await fs.writeFile(
      path.join(testDir, "docs", "specs", "active", "FEAT-TEST.md"),
      testSpecContent
    );

    // Create test config file to help ConfigManager find the right paths
    const testConfigContent = `module.exports = {
  dataPath: "${path.join(testDir, "docs", "specs")}",
  statusFolders: ["active", "backlog", "done"],
  supportedTypes: ["FEAT", "BUG", "SPIKE"],
  autoRefresh: true
};`;

    await fs.writeFile(path.join(testDir, "asd.config.js"), testConfigContent);

    // Create config for test
    configManager = new ConfigManager(testDir);
    specParser = new SpecParser(configManager);

    // Load specs explicitly for testing
    await specParser.loadSpecs();

    stateManager = new WorkflowStateManager(configManager, specParser);

    // Initialize the state manager
    await stateManager.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Initialization", () => {
    test("should initialize state directory structure", async () => {
      const stateDir = path.join(testDir, ".asd", "state");
      const statFiles = [
        "assignments.json",
        "progress.json",
        "handoffs.json",
        "metadata.json",
      ];

      for (const file of statFiles) {
        const filePath = path.join(stateDir, file);
        await expect(fs.access(filePath)).resolves.toBeUndefined();

        // Verify JSON structure is valid
        const content = await fs.readFile(filePath, "utf-8");
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });

    test("should initialize within performance timeout", async () => {
      const startTime = Date.now();
      const newStateManager = new WorkflowStateManager(
        configManager,
        specParser
      );
      await newStateManager.initialize();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // Allow 200ms for test environment
    });
  });

  describe("Task Assignment", () => {
    test("should assign task to agent successfully", async () => {
      const result = await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer",
        { priority: "P1", estimatedHours: 4 }
      );

      expect(result.success).toBe(true);
      expect(result.assignment.task_id).toBe("TASK-001");
      expect(result.assignment.assigned_agent).toBe("backend-developer");
      expect(result.assignment.status).toBe("in_progress");
      expect(result.performance.total).toBeLessThan(100);
    });

    test("should track assignments in current_assignments", async () => {
      await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer"
      );

      const assignments = await stateManager.getCurrentAssignments();

      expect(assignments.current_assignments).toHaveLength(1);
      expect(assignments.current_assignments[0].task_id).toBe("TASK-001");
      expect(assignments.agent_workloads["backend-developer"]).toBeDefined();
      expect(
        assignments.agent_workloads["backend-developer"].current_tasks
      ).toBe(1);
    });

    test("should add assignment to history", async () => {
      await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer"
      );

      const assignmentsState = await stateManager.loadState("assignments");

      expect(assignmentsState.assignment_history).toHaveLength(1);
      expect(assignmentsState.assignment_history[0].action).toBe("assigned");
      expect(assignmentsState.assignment_history[0].task_id).toBe("TASK-001");
    });
  });

  describe("Task Completion", () => {
    test("should complete task successfully", async () => {
      // First assign the task
      await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer"
      );

      // Then complete it
      const result = await stateManager.completeTask("FEAT-TEST", "TASK-001", {
        notes: "Task completed successfully",
      });

      expect(result.success).toBe(true);
      expect(result.completion.status).toBe("completed");
      expect(result.completion.completion_notes).toBe(
        "Task completed successfully"
      );
      expect(result.performance.total).toBeLessThan(100);
    });

    test("should detect handoff opportunities", async () => {
      // Assign and complete TASK-001
      await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer"
      );
      const result = await stateManager.completeTask("FEAT-TEST", "TASK-001");

      // Should detect TASK-002 as handoff opportunity
      expect(result.handoff).toBeDefined();
      expect(result.handoff.nextTask).toBe("TASK-002");
      expect(result.handoff.nextAgent).toBe("ui-developer");
    });

    test("should update progress tracking", async () => {
      await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer"
      );
      await stateManager.completeTask("FEAT-TEST", "TASK-001");

      const progress = await stateManager.getSpecProgress("FEAT-TEST");

      expect(progress.completed_tasks).toBe(1);
      expect(progress.completion_percentage).toBeGreaterThan(0);
    });
  });

  describe("Progress Tracking", () => {
    test("should calculate project progress accurately", async () => {
      const progress = await stateManager.getProjectProgress();

      expect(progress.overall.total_specs).toBeGreaterThan(0);
      expect(progress.overall.total_tasks).toBeGreaterThan(0);
      expect(progress.overall.completion_percentage).toBeGreaterThanOrEqual(0);
    });

    test("should track progress by phase", async () => {
      const progress = await stateManager.getProjectProgress();

      expect(progress.by_phase["PHASE-1A"]).toBeDefined();
      expect(progress.by_phase["PHASE-1A"].specs).toBeGreaterThan(0);
    });

    test("should update progress when tasks complete", async () => {
      const initialProgress = await stateManager.getProjectProgress();

      await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer"
      );
      await stateManager.completeTask("FEAT-TEST", "TASK-001");

      const updatedProgress = await stateManager.getProjectProgress();

      expect(updatedProgress.overall.completed_tasks).toBeGreaterThan(
        initialProgress.overall.completed_tasks
      );
    });
  });

  describe("Subtask Management", () => {
    test("should complete subtask successfully", async () => {
      const result = await stateManager.completeSubtask(
        "FEAT-TEST",
        "TASK-001",
        "SUBTASK-001",
        { notes: "Subtask completed" }
      );

      expect(result.success).toBe(true);
      expect(result.subtask_completion.subtask_id).toBe("SUBTASK-001");
      expect(result.performance.total).toBeLessThan(100);
    });
  });

  describe("Handoff Management", () => {
    test("should get handoff status", async () => {
      // Create a handoff scenario
      await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer"
      );
      await stateManager.completeTask("FEAT-TEST", "TASK-001");

      const handoffStatus = await stateManager.getHandoffStatus();

      expect(handoffStatus.ready_handoffs).toBeDefined();
      expect(handoffStatus.agent_availability).toBeDefined();
    });

    test("should prepare next task context", async () => {
      const context = await stateManager.prepareNextTask(
        "FEAT-TEST",
        "TASK-002"
      );

      expect(context.task.id).toBe("TASK-002");
      expect(context.spec.id).toBe("FEAT-TEST");
      expect(context.prepared_at).toBeDefined();
    });
  });

  describe("State Validation", () => {
    test("should validate state consistency", async () => {
      // Create some state
      await stateManager.assignTask(
        "FEAT-TEST",
        "TASK-001",
        "backend-developer"
      );

      const validation = await stateManager.validateState();

      expect(validation.isValid).toBe(true);
      expect(validation.performance.total).toBeLessThan(100);
      expect(validation.statistics).toBeDefined();
    });

    test("should detect inconsistencies", async () => {
      // Manually corrupt state to test validation
      const corruptedState = {
        current_assignments: {
          "FEAT-TEST": {
            "TASK-001": {
              // Missing required fields
              status: "in_progress",
            },
          },
        },
        assignment_history: [],
      };

      await stateManager.saveState("assignments", corruptedState);

      const validation = await stateManager.validateState();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Spec Synchronization", () => {
    test("should sync spec state with file contents", async () => {
      const result = await stateManager.syncSpecState("FEAT-TEST");

      expect(result.success).toBe(true);
      expect(result.synchronized_data.total_tasks).toBe(2); // TASK-001 and TASK-002
    });
  });

  describe("Performance Requirements", () => {
    test("should complete operations under 100ms", async () => {
      const operations = [
        () =>
          stateManager.assignTask("FEAT-TEST", "TASK-001", "backend-developer"),
        () => stateManager.getCurrentAssignments(),
        () => stateManager.getProjectProgress(),
        () => stateManager.getSpecProgress("FEAT-TEST"),
        () => stateManager.validateState(),
      ];

      for (const operation of operations) {
        const startTime = Date.now();
        await operation();
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(100);
      }
    });

    test("should handle concurrent operations safely", async () => {
      const concurrentAssignments = [
        stateManager.assignTask("FEAT-TEST", "TASK-001", "backend-developer"),
        stateManager.updateTaskProgress("FEAT-TEST", "TASK-001", {
          progress: 50,
        }),
        stateManager.getProjectProgress(),
      ];

      const results = await Promise.all(concurrentAssignments);

      // All operations should complete successfully
      results.forEach((result) => {
        if (result.success !== undefined) {
          expect(result.success).toBe(true);
        }
      });
    });
  });

  describe("Cache Management", () => {
    test("should use cache for performance", async () => {
      // Load state multiple times
      await stateManager.loadState("assignments");
      await stateManager.loadState("assignments");

      const cacheStats = stateManager.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    test("should clear cache", () => {
      stateManager.clearCache();
      const cacheStats = stateManager.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });
  });

  describe("Error Handling", () => {
    test("should handle missing spec gracefully", async () => {
      const result = await stateManager.assignTask(
        "NONEXISTENT-SPEC",
        "TASK-001",
        "backend-developer"
      );

      // Should complete but may have warnings
      expect(result.success).toBe(true); // Assignment can succeed even if spec update fails
    });

    test("should handle corrupted state files", async () => {
      // Corrupt a state file
      const corruptedPath = path.join(
        testDir,
        ".asd",
        "state",
        "assignments.json"
      );
      await fs.writeFile(corruptedPath, "invalid json content");

      // Should handle gracefully by recreating the file
      const newStateManager = new WorkflowStateManager(
        configManager,
        specParser
      );
      await expect(newStateManager.initialize()).resolves.not.toThrow();
    });
  });

  describe("Integration with Existing Systems", () => {
    test("should work with SpecParser", async () => {
      const specs = specParser.getSpecs();
      expect(specs.length).toBeGreaterThan(0);

      // Should be able to assign tasks from parsed specs
      const testSpec = specs.find((s) => s.id === "FEAT-TEST");
      expect(testSpec).toBeDefined();
      expect(testSpec.tasks.length).toBe(2);
    });

    test("should integrate with ConfigManager", () => {
      const projectRoot = configManager.getProjectRoot();
      expect(projectRoot).toBe(testDir);

      const stateDir = path.join(projectRoot, ".asd", "state");
      expect(stateManager.stateDir).toBe(stateDir);
    });
  });
});
