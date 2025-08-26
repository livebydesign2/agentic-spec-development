const WorkflowStateManager = require("../lib/workflow-state-manager");
const ConfigManager = require("../lib/config-manager");
const SpecParser = require("../lib/feature-parser");
const fs = require("fs").promises;
const path = require("path");

describe("WorkflowStateManager Integration", () => {
  let stateManager;
  let configManager;
  let specParser;

  beforeAll(async () => {
    // Use the actual project directory for integration testing
    configManager = new ConfigManager(process.cwd());
    specParser = new SpecParser(configManager);
    
    // Load real specs
    await specParser.loadSpecs();
    
    stateManager = new WorkflowStateManager(configManager, specParser);
    
    // Initialize state manager
    await stateManager.initialize();
  });

  describe("Real Project Integration", () => {
    test("should initialize with real project structure", async () => {
      expect(stateManager.stateDir).toContain(".asd/state");
      
      // Check that state files exist
      const stateFiles = ["assignments.json", "progress.json", "handoffs.json", "metadata.json"];
      for (const file of stateFiles) {
        const filePath = path.join(stateManager.stateDir, file);
        await expect(fs.access(filePath)).resolves.toBeUndefined();
      }
    });

    test("should calculate real project progress", async () => {
      const progress = await stateManager.getProjectProgress();
      
      expect(progress.overall).toBeDefined();
      expect(progress.overall.total_specs).toBeGreaterThanOrEqual(0);
      expect(progress.overall.total_tasks).toBeGreaterThanOrEqual(0);
      expect(progress.overall.completion_percentage).toBeGreaterThanOrEqual(0);
      expect(progress.overall.completion_percentage).toBeLessThanOrEqual(100);
    });

    test("should work with real spec files", async () => {
      const specs = specParser.getSpecs();
      
      if (specs.length > 0) {
        const testSpec = specs[0];
        
        // Should be able to sync spec state
        const result = await stateManager.syncSpecState(testSpec.id);
        expect(result.success).toBe(true);
        
        // Should track spec progress
        const specProgress = await stateManager.getSpecProgress(testSpec.id);
        expect(specProgress.spec_id).toBe(testSpec.id);
      }
    });

    test("should handle task assignment workflow", async () => {
      const specs = specParser.getSpecs();
      
      if (specs.length > 0) {
        const testSpec = specs.find(s => s.tasks && s.tasks.length > 0);
        
        if (testSpec && testSpec.tasks.length > 0) {
          const testTask = testSpec.tasks[0];
          
          // Assign task
          const assignResult = await stateManager.assignTask(
            testSpec.id,
            testTask.id,
            "test-agent",
            { priority: "P2" }
          );
          
          expect(assignResult.success).toBe(true);
          
          // Check assignments
          const assignments = await stateManager.getCurrentAssignments();
          expect(assignments.current_assignments.length).toBeGreaterThan(0);
          
          // Complete task
          const completeResult = await stateManager.completeTask(
            testSpec.id,
            testTask.id,
            { notes: "Test completion" }
          );
          
          expect(completeResult.success).toBe(true);
        }
      }
    });

    test("should meet performance requirements", async () => {
      const operations = [
        () => stateManager.getCurrentAssignments(),
        () => stateManager.getProjectProgress(),
        () => stateManager.validateState()
      ];

      for (const operation of operations) {
        const startTime = Date.now();
        await operation();
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(100); // 100ms requirement
      }
    });

    test("should validate state consistency", async () => {
      const validation = await stateManager.validateState();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.performance.total).toBeLessThan(100);
    });
  });

  describe("State File Management", () => {
    test("should create and manage state files", async () => {
      const stateTypes = ["assignments", "progress", "handoffs", "metadata"];
      
      for (const stateType of stateTypes) {
        const state = await stateManager.loadState(stateType);
        expect(state).toBeDefined();
        expect(typeof state).toBe("object");
      }
    });

    test("should handle cache operations", async () => {
      // Load state to populate cache
      await stateManager.loadState("assignments");
      
      const cacheStats = stateManager.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
      
      // Clear cache
      stateManager.clearCache();
      const emptyCacheStats = stateManager.getCacheStats();
      expect(emptyCacheStats.size).toBe(0);
    });
  });
});

describe("WorkflowStateManager CLI Integration", () => {
  let stateManager;

  beforeAll(async () => {
    const configManager = new ConfigManager(process.cwd());
    const specParser = new SpecParser(configManager);
    await specParser.loadSpecs();
    
    stateManager = new WorkflowStateManager(configManager, specParser);
    await stateManager.initialize();
  });

  test("should integrate with CLI command patterns", async () => {
    // Test CLI-style operations that the bin/asd would perform
    
    // Get next available assignments (like 'asd next' command)
    const assignments = await stateManager.getCurrentAssignments();
    expect(assignments).toBeDefined();
    expect(assignments.current_assignments).toBeDefined();
    
    // Get progress information (like 'asd progress' command)
    const progress = await stateManager.getProjectProgress();
    expect(progress.overall).toBeDefined();
    
    // Get handoff status (like 'asd handoff status' command)
    const handoffs = await stateManager.getHandoffStatus();
    expect(handoffs.ready_handoffs).toBeDefined();
  });

  test("should handle FEAT-014 specific operations", async () => {
    // Test operations specific to FEAT-014 (our current feature)
    const feat014Progress = await stateManager.getSpecProgress("FEAT-014");
    
    if (feat014Progress.spec_id) {
      expect(feat014Progress.spec_id).toBe("FEAT-014");
      expect(feat014Progress.total_tasks).toBeGreaterThanOrEqual(0);
    }
  });
});