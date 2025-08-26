const path = require("path");
const fs = require("fs").promises;
const ConfigManager = require("../../lib/config-manager");
const SpecParser = require("../../lib/feature-parser");
const ProgressCalculator = require("../../lib/progress-calc");
const UIComponents = require("../../lib/ui-components");

describe("Full Workflow Integration Tests", () => {
  let testDir;
  let configManager;
  let specParser;
  let progressCalc;
  let ui;

  beforeEach(async () => {
    testDir = global.TEST_DIR;
    global.setupTestDir();

    // Initialize components
    configManager = new ConfigManager(testDir);
    specParser = new SpecParser(configManager);
    progressCalc = new ProgressCalculator();
    ui = new UIComponents();

    // Create comprehensive test data
    await createTestProjectStructure();
  });

  afterEach(() => {
    global.cleanupTestDir();
  });

  async function createTestProjectStructure() {
    // Create configuration
    const configContent = `
      module.exports = {
        featuresPath: 'docs/specs',
        autoRefresh: true,
        supportedTypes: ['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT'],
        statusFolders: ['active', 'backlog', 'done'],
        priorities: ['P0', 'P1', 'P2', 'P3']
      };
    `;
    global.createTestFile("asd.config.js", configContent);

    // Create comprehensive spec files
    const specs = [
      // Active P0 feature with mixed task progress
      {
        path: "docs/specs/active/SPEC-001-critical-auth.md",
        content: `# Critical Authentication System
**Priority:** P0

## Description
Implement critical authentication system for production release.

## Tasks
### **✅ TASK-001** 🤖 **Database Schema Setup** | Agent: Database-Engineer
- [x] Create users table
- [x] Create sessions table
- [x] Add indexes

### **🔄 TASK-002** 🤖 **API Development** | Agent: Backend-Developer
- [x] Login endpoint
- [ ] Registration endpoint
- [ ] Password reset endpoint

### **⏳ TASK-003** 🤖 **Frontend Integration** | Agent: Frontend-Developer
Login form and user interface.

## Required Reading
- docs/architecture/auth-design.md
- docs/security/guidelines.md`,
      },

      // Backlog P0 feature (critical ready)
      {
        path: "docs/specs/backlog/BUG-001-login-failure.md",
        content: `# Critical Login Failure
**Priority:** P0
**Severity:** Critical

## Description
Users cannot login after password reset, causing production issues.

## Reproduction Steps
1. Request password reset
2. Click reset link in email
3. Enter new password
4. Attempt to login
5. Error: "Invalid credentials"

## Root Cause Analysis
Password reset tokens are not being properly invalidated after use.

## Proposed Solution
Implement proper token lifecycle management with database cleanup.

## Environment
- Production: Node.js 18.x
- Database: PostgreSQL 14

## Fix Tasks
### **🔴 TASK-001** 🤖 **Token Cleanup Implementation** | Agent: Backend-Developer
Fix token invalidation logic.

### **⏳ TASK-002** 🤖 **Database Migration** | Agent: Database-Engineer
Add token cleanup job.`,
      },

      // Active P1 feature
      {
        path: "docs/specs/active/FEAT-010-user-profiles.md",
        content: `# User Profile Management
**Priority:** P1

## Description
Allow users to manage their profile information and preferences.

## Implementation Tasks
### **TASK-001** 🤖 **Profile Data Model** | Agent: Database-Engineer
- [x] Create profile table
- [ ] Add validation constraints

### **TASK-002** 🤖 **Profile API** | Agent: Backend-Developer
- [ ] GET profile endpoint
- [ ] PUT profile update endpoint
- [ ] Profile image upload

### **TASK-003** 🤖 **Profile UI** | Agent: Frontend-Developer
User interface for profile management.`,
      },

      // Research spike
      {
        path: "docs/specs/active/SPIKE-005-performance.md",
        content: `# Database Performance Research
**Priority:** P2
**Research Type:** Performance Analysis

## Description
Research optimal database indexing strategies for user query patterns.

### **Research Question**
What indexing strategies provide the best performance for our current user query patterns?

### **Success Criteria**
- [ ] Benchmark current performance
- [ ] Test 3 indexing strategies
- [ ] Document findings
- [ ] Recommend optimal approach

## Tasks
### **🔄 TASK-001** 🤖 **Performance Benchmarking** | Agent: Database-Engineer
Create baseline performance measurements.

### **⏳ TASK-002** 🤖 **Index Strategy Testing** | Agent: Database-Engineer
Implement and test different strategies.`,
      },

      // Maintenance task
      {
        path: "docs/specs/backlog/MAINT-001-dependency-updates.md",
        content: `# Quarterly Dependency Updates
**Priority:** P3

## Description
Update all project dependencies to latest stable versions.

## Maintenance Tasks
### **TASK-001** 🤖 **Security Audit** | Agent: DevOps-Engineer
- [ ] Run npm audit
- [ ] Review security advisories
- [ ] Plan update strategy

### **TASK-002** 🤖 **Core Dependencies** | Agent: Backend-Developer
- [ ] Update Express.js
- [ ] Update database drivers
- [ ] Update authentication libraries

### **TASK-003** 🤖 **Testing & Validation** | Agent: QA-Engineer
- [ ] Run test suite
- [ ] Performance regression testing
- [ ] Security validation`,
      },

      // Completed feature
      {
        path: "docs/specs/done/SPEC-100-email-system.md",
        content: `# Email Notification System
**Priority:** P1

## Description
Implement email notification system for user engagement.

## Tasks
### **✅ TASK-001** 🤖 **Email Service Setup** | Agent: Backend-Developer
Email service provider integration completed.

### **✅ TASK-002** 🤖 **Template System** | Agent: Frontend-Developer
Email template engine implemented.

### **✅ TASK-003** 🤖 **Notification Logic** | Agent: Backend-Developer
User notification preferences and triggers.`,
      },
    ];

    for (const spec of specs) {
      global.createTestFile(spec.path, spec.content);
    }
  }

  describe("Complete ASD Workflow", () => {
    it("should load and parse all specifications correctly", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      expect(specs).toHaveLength(6);

      // Verify spec types
      const specTypes = specs.map((s) => s.type);
      expect(specTypes).toContain("SPEC");
      expect(specTypes).toContain("BUG");
      expect(specTypes).toContain("FEAT");
      expect(specTypes).toContain("SPIKE");
      expect(specTypes).toContain("MAINT");

      // Verify priorities
      const p0Specs = specs.filter((s) => s.priority === "P0");
      expect(p0Specs).toHaveLength(2);
    });

    it("should calculate progress across all features correctly", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      const overallProgress = progressCalc.calculateOverallProgress(specs);

      expect(overallProgress.total).toBeGreaterThan(0);
      expect(overallProgress.completed).toBeGreaterThan(0);
      expect(overallProgress.percentage).toBeGreaterThan(0);
      expect(overallProgress.percentage).toBeLessThanOrEqual(100);
    });

    it("should identify critical ready features", async () => {
      await specParser.loadSpecs();

      const criticalReady = specParser.getCriticalReady();

      expect(criticalReady).toHaveLength(1);
      expect(criticalReady[0].id).toBe("BUG-001");
      expect(criticalReady[0].priority).toBe("P0");
      expect(criticalReady[0].status).toBe("backlog");
    });

    it("should track task assignments to agents", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      const tasksWithAgents = specs
        .flatMap((s) => s.tasks || [])
        .filter((t) => t.assigneeRole);

      expect(tasksWithAgents.length).toBeGreaterThan(0);

      const agentRoles = tasksWithAgents.map((t) => t.assigneeRole);
      expect(agentRoles).toContain("Database-Engineer");
      expect(agentRoles).toContain("Backend-Developer");
      expect(agentRoles).toContain("Frontend-Developer");
    });

    it("should handle different task status formats", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      const allTasks = specs.flatMap((s) => s.tasks || []);

      const statusCounts = allTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      expect(statusCounts.complete).toBeGreaterThan(0);
      expect(statusCounts.in_progress).toBeGreaterThan(0);
      expect(statusCounts.ready).toBeGreaterThan(0);
    });

    it("should parse subtasks and calculate partial progress", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      const authSpec = specs.find((s) => s.id === "SPEC-001");

      expect(authSpec).toBeDefined();
      expect(authSpec.tasks).toHaveLength(3);

      // Check subtasks
      const firstTask = authSpec.tasks[0];
      expect(firstTask.subtasks).toHaveLength(3);
      expect(firstTask.subtasks.every((st) => st.completed)).toBe(true);

      const secondTask = authSpec.tasks[1];
      expect(secondTask.subtasks).toHaveLength(3);

      // Calculate progress
      const progress = progressCalc.calculateProgress(authSpec);
      expect(progress.completed).toBeGreaterThan(1);
      expect(progress.total).toBe(3);
    });

    it("should support different specification types with specific fields", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();

      // Bug spec should have bug-specific fields
      const bugSpec = specs.find((s) => s.type === "BUG");
      expect(bugSpec.bugSeverity).toBe("Critical");
      expect(bugSpec.reproductionSteps).toHaveLength(5);
      expect(bugSpec.rootCause).toContain("Password reset tokens");
      expect(bugSpec.proposedSolution).toContain("token lifecycle");

      // Spike spec should have research fields
      const spikeSpec = specs.find((s) => s.type === "SPIKE");
      expect(spikeSpec.researchType).toBe("Performance Analysis");
      expect(spikeSpec.researchQuestion).toContain("indexing strategies");
      expect(spikeSpec.researchFindings).toHaveLength(4);
    });

    it("should generate comprehensive statistics", async () => {
      await specParser.loadSpecs();

      const stats = specParser.getStats();

      expect(stats).toEqual({
        total: 6,
        active: 3,
        backlog: 2,
        done: 1,
        p0: 2,
      });

      // Verify stats match actual data
      const specs = specParser.getSpecs();
      expect(specs.filter((s) => s.status === "active")).toHaveLength(3);
      expect(specs.filter((s) => s.status === "backlog")).toHaveLength(2);
      expect(specs.filter((s) => s.status === "done")).toHaveLength(1);
      expect(specs.filter((s) => s.priority === "P0")).toHaveLength(2);
    });

    it("should create formatted UI output for all components", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      const stats = specParser.getStats();

      // Test summary stats
      const summaryStats = ui.createSummaryStats(stats);
      expect(summaryStats).toContain("6 total features");
      expect(summaryStats).toContain("Active: 3");
      expect(summaryStats).toContain("Critical (P0): 2");

      // Test feature list items
      const activeSpecs = specs.filter((s) => s.status === "active");
      for (const spec of activeSpecs) {
        const progress = progressCalc.calculateProgress(spec);
        const listItem = ui.createFeatureListItem(spec, progress, false);

        expect(listItem).toContain(spec.id);
        expect(listItem).toContain(`${progress.completed}/${progress.total}`);
      }

      // Test task lists
      for (const spec of specs) {
        if (spec.tasks && spec.tasks.length > 0) {
          const taskList = ui.createTaskList(spec.tasks);
          expect(taskList).toContain("TASK-");

          // Check for agent assignments
          const tasksWithAgents = spec.tasks.filter((t) => t.assigneeRole);
          if (tasksWithAgents.length > 0) {
            expect(taskList).toContain("[");
            expect(taskList).toContain("]");
          }
        }
      }
    });

    it("should handle velocity and completion estimates", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();

      // Test velocity calculation
      const velocity = progressCalc.getFeatureVelocity(specs);
      expect(velocity.featuresCompleted).toBe(1); // One done spec
      expect(velocity.periodDays).toBe(30);

      // Test completion estimation
      const estimate = progressCalc.estimateCompletionTime(specs);
      expect(estimate.activeTasks).toBeGreaterThan(0);
      expect(estimate.backlogTasks).toBeGreaterThan(0);
      expect(estimate.totalTasks).toBeGreaterThan(0);
    });

    it("should find next available tasks across all features", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      const nextTasks = [];

      for (const spec of specs) {
        const nextTask = progressCalc.getNextAvailableTask(spec);
        if (nextTask) {
          nextTasks.push({ ...nextTask, featureId: spec.id });
        }
      }

      expect(nextTasks.length).toBeGreaterThan(0);

      // Should include the ready tasks from various specs
      const taskTitles = nextTasks.map((t) => t.title);
      expect(taskTitles).toContain("Frontend Integration");
      expect(taskTitles).toContain("Profile Data Model");
    });

    it("should handle configuration overrides", async () => {
      // Create custom configuration
      const customConfig = `
        module.exports = {
          featuresPath: 'docs/specs',
          supportedTypes: ['SPEC', 'CUSTOM'],
          statusFolders: ['active', 'backlog', 'done', 'review'],
          priorities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        };
      `;
      global.createTestFile("custom.config.js", customConfig);

      // Create new managers with custom config
      const customConfigManager = new ConfigManager(testDir);
      // const _customSpecParser = new SpecParser(customConfigManager);

      // Override config path
      customConfigManager.configPath = path.join(testDir, "custom.config.js");
      customConfigManager.config = null; // Clear cache

      const config = customConfigManager.loadConfig();

      expect(config.supportedTypes).toEqual(["SPEC", "CUSTOM"]);
      expect(config.statusFolders).toEqual([
        "active",
        "backlog",
        "done",
        "review",
      ]);
      expect(config.priorities).toEqual(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
    });
  });

  describe("Error Resilience", () => {
    it("should handle malformed spec files gracefully", async () => {
      // Add some malformed files
      global.createTestFile(
        "docs/specs/active/malformed-no-id.md",
        "Invalid content without ID"
      );
      global.createTestFile(
        "docs/specs/active/INVALID-FORMAT.md",
        "# Invalid\nNo proper format"
      );
      global.createTestFile("docs/specs/active/empty-file.md", "");

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await specParser.loadSpecs();

      const specs = specParser.getSpecs();

      // Should still load valid specs
      expect(specs.length).toBeGreaterThan(0);

      // Should warn about malformed files
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle missing directories", async () => {
      // Remove one status directory
      await fs.rmdir(path.join(testDir, "docs/specs/done"), {
        recursive: true,
      });

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await specParser.loadSpecs();

      const specs = specParser.getSpecs();

      // Should still load specs from existing directories
      expect(specs.length).toBeGreaterThan(0);
      expect(specs.filter((s) => s.status === "done")).toHaveLength(0);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Warning: Could not read folder done:",
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    it("should handle corrupted config files", async () => {
      global.createTestFile("asd.config.js", "corrupted javascript content {");

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const newConfigManager = new ConfigManager(testDir);
      const config = newConfigManager.loadConfig();

      // Should fall back to defaults
      expect(config.featuresPath).toBeDefined();
      expect(config.supportedTypes).toContain("SPEC");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Warning: Failed to load configuration, using defaults:",
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Performance with Large Dataset", () => {
    it("should handle large number of specifications efficiently", async () => {
      // Create many spec files
      const largeDataset = [];
      for (let i = 1; i <= 100; i++) {
        const content = `# Test Spec ${i}
**Priority:** P${Math.floor(Math.random() * 4)}

## Description
Test specification number ${i}.

## Tasks
### **TASK-001** 🤖 **Implementation ${i}**
Implementation task for spec ${i}.

### **TASK-002** 🤖 **Testing ${i}**
Testing task for spec ${i}.`;

        const status = ["active", "backlog", "done"][i % 3];
        largeDataset.push({
          path: `docs/specs/${status}/SPEC-${i
            .toString()
            .padStart(3, "0")}-test.md`,
          content,
        });
      }

      for (const spec of largeDataset) {
        global.createTestFile(spec.path, spec.content);
      }

      const startTime = Date.now();

      await specParser.loadSpecs();

      const loadTime = Date.now() - startTime;

      const specs = specParser.getSpecs();

      // Should load all specs
      expect(specs.length).toBeGreaterThanOrEqual(100);

      // Should complete within reasonable time (adjust as needed)
      expect(loadTime).toBeLessThan(5000); // 5 seconds

      // Test progress calculation performance
      const progressStartTime = Date.now();

      const overallProgress = progressCalc.calculateOverallProgress(specs);

      const progressTime = Date.now() - progressStartTime;

      expect(overallProgress.total).toBeGreaterThan(0);
      expect(progressTime).toBeLessThan(1000); // 1 second
    });
  });

  describe("Multi-Project Structure Support", () => {
    it("should work with different project structures", async () => {
      // Create alternative project structure
      const altStructure = [
        {
          path: "features/current/SPEC-200-alt.md",
          content:
            "# Alternative Structure\n**Priority:** P1\n## Description\nAlternative project structure.",
        },
        {
          path: "features/planned/FEAT-201-alt.md",
          content:
            "# Alternative Feature\n**Priority:** P2\n## Description\nFeature in alternative structure.",
        },
      ];

      for (const spec of altStructure) {
        global.createTestFile(spec.path, spec.content);
      }

      // Create alternative configuration
      const altConfig = `
        module.exports = {
          featuresPath: 'features',
          statusFolders: ['current', 'planned', 'completed'],
          supportedTypes: ['SPEC', 'FEAT']
        };
      `;
      global.createTestFile("alt.config.js", altConfig);

      // Test with alternative structure
      const altConfigManager = new ConfigManager(testDir);
      altConfigManager.configPath = path.join(testDir, "alt.config.js");
      altConfigManager.config = null; // Clear cache

      const altSpecParser = new SpecParser(altConfigManager);

      await altSpecParser.loadSpecs();

      const altSpecs = altSpecParser.getSpecs();

      expect(altSpecs.length).toBeGreaterThanOrEqual(2);
      expect(altSpecs.some((s) => s.id === "SPEC-200")).toBe(true);
      expect(altSpecs.some((s) => s.id === "FEAT-201")).toBe(true);
    });
  });
});
