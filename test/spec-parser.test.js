const path = require("path");
const fs = require("fs").promises;
const SpecParser = require("../lib/feature-parser"); // Note: uses feature-parser.js (legacy name)
const ConfigManager = require("../lib/config-manager");

describe("SpecParser", () => {
  let testDir;
  let configManager;
  let specParser;

  beforeEach(() => {
    testDir = global.TEST_DIR;
    global.setupTestDir();

    configManager = new ConfigManager(testDir);
    // Clear cached config to ensure fresh loading
    configManager.config = null;
    configManager.configPath = null;

    specParser = new SpecParser(configManager);
  });

  afterEach(() => {
    global.cleanupTestDir();
  });

  describe("constructor", () => {
    it("should initialize with default config manager", () => {
      const parser = new SpecParser();
      expect(parser.configManager).toBeInstanceOf(ConfigManager);
    });

    it("should initialize with provided config manager", () => {
      const parser = new SpecParser(configManager);
      expect(parser.configManager).toBe(configManager);
    });

    it("should load configuration on initialization", () => {
      expect(specParser.dataPath).toBeDefined();
      expect(specParser.statusFolders).toEqual(["active", "backlog", "done"]);
      expect(specParser.supportedTypes).toContain("SPEC");
    });
  });

  describe("loadSpecs", () => {
    beforeEach(async () => {
      // Create test spec files
      const specContent = global.readFixture("spec-001-example.md");
      global.createTestFile("docs/specs/active/SPEC-001-auth.md", specContent);

      const bugContent = global.readFixture("bug-001-critical.md");
      global.createTestFile("docs/specs/backlog/BUG-001-login.md", bugContent);

      const spikeContent = global.readFixture("spike-005-research.md");
      global.createTestFile(
        "docs/specs/done/SPIKE-005-database.md",
        spikeContent
      );
    });

    it("should load specs from all status folders", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      expect(specs).toHaveLength(3);

      const specIds = specs.map((s) => s.id);
      expect(specIds).toContain("SPEC-001");
      expect(specIds).toContain("BUG-001");
      expect(specIds).toContain("SPIKE-005");
    });

    it("should set correct status based on folder location", async () => {
      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      const specByStatus = specs.reduce((acc, spec) => {
        acc[spec.status] = acc[spec.status] || [];
        acc[spec.status].push(spec.id);
        return acc;
      }, {});

      expect(specByStatus.active).toContain("SPEC-001");
      expect(specByStatus.backlog).toContain("BUG-001");
      expect(specByStatus.done).toContain("SPIKE-005");
    });

    it("should handle missing folders gracefully", async () => {
      // Remove one of the status folders
      await fs.rmdir(path.join(testDir, "docs/specs/done"), {
        recursive: true,
      });

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await specParser.loadSpecs();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Warning: Could not read folder done:",
        expect.any(String)
      );

      const specs = specParser.getSpecs();
      expect(specs).toHaveLength(2); // Only active and backlog specs

      consoleSpy.mockRestore();
    });

    it("should sort specs with P0 priority first", async () => {
      // Create P0 spec
      const p0Content =
        "# Critical Feature\n**Priority:** P0\n## Description\nCritical feature.";
      global.createTestFile(
        "docs/specs/backlog/SPEC-002-critical.md",
        p0Content
      );

      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      const priorities = specs.map((s) => s.priority);

      // P0 specs should come first
      const p0Index = priorities.indexOf("P0");
      const otherPriorityIndex = priorities.findIndex((p) => p && p !== "P0");

      if (p0Index !== -1 && otherPriorityIndex !== -1) {
        expect(p0Index).toBeLessThan(otherPriorityIndex);
      }
    });

    it("should support legacy feature format", async () => {
      const legacyContent = global.readFixture("feat-042-legacy.md");
      global.createTestFile(
        "docs/specs/active/FEAT-042-legacy.md",
        legacyContent
      );

      await specParser.loadSpecs();

      const features = specParser.getSpecs(); // Legacy method
      const legacyFeature = features.find((f) => f.id === "FEAT-042");

      expect(legacyFeature).toBeDefined();
      expect(legacyFeature.type).toBe("FEAT");
      expect(legacyFeature.title).toContain("Legacy Feature");
    });

    it("should ignore malformed files", async () => {
      const malformedContent = global.readFixture("malformed-spec.md");
      global.createTestFile("docs/specs/active/malformed.md", malformedContent);

      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      expect(specs.find((s) => s.filename === "malformed.md")).toBeUndefined();
    });

    it("should ignore report documents", async () => {
      const reportContent =
        "# SPEC-001 Implementation Report\n\nThis is a report document.";
      global.createTestFile(
        "docs/specs/done/SPEC-001-report.md",
        reportContent
      );

      await specParser.loadSpecs();

      const specs = specParser.getSpecs();
      expect(specs.find((s) => s.filename.includes("report"))).toBeUndefined();
    });
  });

  describe("parseSpecFile", () => {
    it("should parse basic spec information", async () => {
      const content = `# Test Specification
**Priority:** P1

## Description
This is a test specification.

## Tasks
### **TASK-001** 🤖 **Setup Test Environment**
- [x] Configure test framework
- [ ] Write initial tests
`;

      global.createTestFile("docs/specs/active/SPEC-001-test.md", content);
      const filePath = path.join(testDir, "docs/specs/active/SPEC-001-test.md");

      const spec = await specParser.parseSpecFile(filePath, "active");

      expect(spec).toMatchObject({
        id: "SPEC-001",
        type: "SPEC",
        number: 1,
        status: "active",
        title: "Test Specification",
        description: "This is a test specification.",
        priority: "P1",
      });
    });

    it("should parse tasks with different formats", async () => {
      const content = `# Task Testing

## Tasks
### **TASK-001** 🤖 **First Task**
Basic task format.

### **✅ TASK-002** 🤖 **Completed Task**
Task with emoji status.

### **🔴 TASK-003** 🤖 **Ready Task**
Task with red status.

### **🔄 TASK-004** 🤖 **In Progress Task**
Task in progress.
`;

      global.createTestFile("docs/specs/active/SPEC-002-tasks.md", content);
      const filePath = path.join(
        testDir,
        "docs/specs/active/SPEC-002-tasks.md"
      );

      const spec = await specParser.parseSpecFile(filePath, "active");

      expect(spec.tasks).toHaveLength(4);
      expect(spec.tasks[0]).toMatchObject({
        id: "TASK-001",
        status: "ready",
        title: "First Task",
      });
      expect(spec.tasks[1]).toMatchObject({
        id: "TASK-002",
        status: "complete",
        title: "Completed Task",
      });
      expect(spec.tasks[2]).toMatchObject({
        id: "TASK-003",
        status: "ready",
        title: "Ready Task",
      });
      expect(spec.tasks[3]).toMatchObject({
        id: "TASK-004",
        status: "in_progress",
        title: "In Progress Task",
      });
    });

    it("should parse subtasks", async () => {
      const content = `# Subtask Testing

## Tasks
### **TASK-001** 🤖 **Main Task**
- [x] Completed subtask
- [ ] Pending subtask
- [x] Another completed subtask
`;

      global.createTestFile("docs/specs/active/SPEC-003-subtasks.md", content);
      const filePath = path.join(
        testDir,
        "docs/specs/active/SPEC-003-subtasks.md"
      );

      const spec = await specParser.parseSpecFile(filePath, "active");

      expect(spec.tasks).toHaveLength(1);
      expect(spec.tasks[0].subtasks).toHaveLength(3);
      expect(spec.tasks[0].subtasks[0]).toMatchObject({
        type: "subtask",
        completed: true,
        title: "Completed subtask",
      });
      expect(spec.tasks[0].subtasks[1]).toMatchObject({
        type: "subtask",
        completed: false,
        title: "Pending subtask",
      });
    });

    it("should parse agent assignments", async () => {
      const content = `# Agent Assignment Testing

## Tasks
### **TASK-001** 🤖 **Database Task** | Agent: Database-Engineer
Database related task.

### **TASK-002** 🤖 **UI Task** | Agent: UI-Developer
User interface task.
`;

      global.createTestFile("docs/specs/active/SPEC-004-agents.md", content);
      const filePath = path.join(
        testDir,
        "docs/specs/active/SPEC-004-agents.md"
      );

      const spec = await specParser.parseSpecFile(filePath, "active");

      expect(spec.tasks).toHaveLength(2);
      expect(spec.tasks[0].assigneeRole).toBe("Database-Engineer");
      expect(spec.tasks[1].assigneeRole).toBe("UI-Developer");
    });

    it("should parse bug-specific fields", async () => {
      const content = `# Bug Fix
**Priority:** P0
**Severity:** Critical

## Description
Critical bug description.

## Reproduction Steps
1. Step one
2. Step two
   - Substep

## Root Cause Analysis
The root cause is X.

## Proposed Solution
Fix by doing Y.

## Environment
- OS: Ubuntu 20.04
- Browser: Chrome
`;

      global.createTestFile("docs/specs/backlog/BUG-002-test.md", content);
      const filePath = path.join(testDir, "docs/specs/backlog/BUG-002-test.md");

      const spec = await specParser.parseSpecFile(filePath, "backlog");

      expect(spec.type).toBe("BUG");
      expect(spec.bugSeverity).toBe("Critical");
      expect(spec.reproductionSteps).toContain("1. Step one");
      expect(spec.reproductionSteps).toContain("2. Step two");
      expect(spec.reproductionSteps).toContain("   - Substep");
      expect(spec.rootCause).toContain("The root cause is X.");
      expect(spec.proposedSolution).toContain("Fix by doing Y.");
      expect(spec.environment).toContain("OS: Ubuntu 20.04");
    });

    it("should parse spike-specific fields", async () => {
      const content = `# Research Spike
**Priority:** P2
**Research Type:** Performance Analysis

## Description
Research spike description.

### **Research Question**
How can we improve performance?

### **Success Criteria**
- [ ] Benchmark current state
- [ ] Test alternatives
- [ ] Document findings
`;

      global.createTestFile("docs/specs/active/SPIKE-001-test.md", content);
      const filePath = path.join(
        testDir,
        "docs/specs/active/SPIKE-001-test.md"
      );

      const spec = await specParser.parseSpecFile(filePath, "active");

      expect(spec.type).toBe("SPIKE");
      expect(spec.researchType).toBe("Performance Analysis");
      expect(spec.researchQuestion).toContain(
        "How can we improve performance?"
      );
      expect(spec.researchFindings).toContain("- [ ] Benchmark current state");
      expect(spec.researchFindings).toContain("- [ ] Test alternatives");
    });

    it("should parse YAML front matter", async () => {
      const content = `---
priority: P0
required_docs:
  - docs/architecture.md
  - docs/api-guide.md
---

# Front Matter Test
**Priority:** P1

## Description
This spec has YAML front matter.
`;

      global.createTestFile(
        "docs/specs/active/SPEC-005-frontmatter.md",
        content
      );
      const filePath = path.join(
        testDir,
        "docs/specs/active/SPEC-005-frontmatter.md"
      );

      const spec = await specParser.parseSpecFile(filePath, "active");

      // Front matter priority should override markdown priority
      expect(spec.priority).toBe("P0");
      expect(spec.requiredDocs).toContain("docs/architecture.md");
      expect(spec.requiredDocs).toContain("docs/api-guide.md");
    });

    it("should generate fallback description", async () => {
      const content = `# No Description Spec

## Problem Statement
This is the problem we need to solve.

## Solution Approach
This is how we plan to solve it.

## Tasks
### **TASK-001** 🤖 **Implementation**
Do the work.
`;

      global.createTestFile("docs/specs/active/SPEC-006-fallback.md", content);
      const filePath = path.join(
        testDir,
        "docs/specs/active/SPEC-006-fallback.md"
      );

      const spec = await specParser.parseSpecFile(filePath, "active");

      expect(spec.description).toContain(
        "This is the problem we need to solve"
      );
      expect(spec.description).toContain("This is how we plan to solve it");
      expect(spec.warnings).toContain("Missing Description; used fallback");
    });

    it("should handle malformed files gracefully", async () => {
      global.createTestFile(
        "docs/specs/active/SPEC-999-broken.md",
        "Invalid content"
      );
      const filePath = path.join(
        testDir,
        "docs/specs/active/SPEC-999-broken.md"
      );

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const spec = await specParser.parseSpecFile(filePath, "active");

      expect(spec).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Could not parse"),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    it("should set completion date for done specs", async () => {
      const content = "# Completed Spec\n## Description\nCompleted spec.";
      global.createTestFile("docs/specs/done/SPEC-100-done.md", content);
      const filePath = path.join(testDir, "docs/specs/done/SPEC-100-done.md");

      const spec = await specParser.parseSpecFile(filePath, "done");

      expect(spec.completedDate).toBeDefined();
      expect(spec.completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getters and filters", () => {
    beforeEach(async () => {
      // Create test specs with different statuses and priorities
      const specs = [
        {
          id: "SPEC-001",
          status: "active",
          priority: "P0",
          content: "# Active P0\n**Priority:** P0",
        },
        {
          id: "SPEC-002",
          status: "active",
          priority: "P1",
          content: "# Active P1\n**Priority:** P1",
        },
        {
          id: "BUG-001",
          status: "backlog",
          priority: "P0",
          content: "# Backlog P0\n**Priority:** P0",
        },
        {
          id: "SPIKE-001",
          status: "done",
          priority: "P2",
          content: "# Done P2\n**Priority:** P2",
        },
      ];

      for (const spec of specs) {
        global.createTestFile(
          `docs/specs/${spec.status}/${spec.id.toLowerCase()}.md`,
          spec.content
        );
      }

      await specParser.loadSpecs();
    });

    it("should return all specs", () => {
      const specs = specParser.getSpecs();
      expect(specs).toHaveLength(4);
    });

    it("should return specs by status", () => {
      const activeSpecs = specParser.getSpecsByStatus("active");
      const backlogSpecs = specParser.getSpecsByStatus("backlog");
      const doneSpecs = specParser.getSpecsByStatus("done");

      expect(activeSpecs).toHaveLength(2);
      expect(backlogSpecs).toHaveLength(1);
      expect(doneSpecs).toHaveLength(1);

      expect(activeSpecs.every((s) => s.status === "active")).toBe(true);
      expect(backlogSpecs.every((s) => s.status === "backlog")).toBe(true);
      expect(doneSpecs.every((s) => s.status === "done")).toBe(true);
    });

    it("should return specs by priority", () => {
      const p0Specs = specParser.getSpecsByPriority("P0");
      const p1Specs = specParser.getSpecsByPriority("P1");
      const p2Specs = specParser.getSpecsByPriority("P2");

      expect(p0Specs).toHaveLength(2);
      expect(p1Specs).toHaveLength(1);
      expect(p2Specs).toHaveLength(1);

      expect(p0Specs.every((s) => s.priority === "P0")).toBe(true);
    });

    it("should return critical ready specs", () => {
      const criticalReady = specParser.getCriticalReady();

      expect(criticalReady).toHaveLength(1);
      expect(criticalReady[0].id).toBe("BUG-001");
      expect(criticalReady[0].status).toBe("backlog");
      expect(criticalReady[0].priority).toBe("P0");
    });

    it("should return statistics", () => {
      const stats = specParser.getStats();

      expect(stats).toEqual({
        total: 4,
        active: 2,
        backlog: 1,
        done: 1,
        p0: 2,
      });
    });

    it("should support legacy feature methods", () => {
      const features = specParser.getSpecs();
      const activeFeatures = specParser.getSpecsByStatus("active");
      const p0Features = specParser.getSpecsByPriority("P0");

      expect(features).toHaveLength(4);
      expect(activeFeatures).toHaveLength(2);
      expect(p0Features).toHaveLength(2);
    });
  });

  describe("parseTask", () => {
    it("should parse standard task format", () => {
      const taskLine = "### **TASK-001** 🤖 **Setup Database**";
      const task = specParser.parseTask(taskLine);

      expect(task).toMatchObject({
        id: "TASK-001",
        number: 1,
        status: "ready",
        title: "Setup Database",
        subtasks: [],
      });
    });

    it("should parse task with emoji status", () => {
      const taskLine = "### **✅ TASK-002** 🤖 **Complete Implementation**";
      const task = specParser.parseTask(taskLine);

      expect(task).toMatchObject({
        id: "TASK-002",
        status: "complete",
        title: "Complete Implementation",
        icon: "✅",
      });
    });

    it("should parse MAINT task format", () => {
      const taskLine =
        "### **✅ TASK-003**: Database Cleanup Tasks (COMPLETED)";
      const task = specParser.parseTask(taskLine);

      expect(task).toMatchObject({
        id: "TASK-003",
        status: "complete",
        title: "Database Cleanup Tasks",
      });
    });

    it("should parse task with agent assignment", () => {
      const taskLine =
        "### **TASK-004** 🤖 **API Development** | Agent: Backend-Developer";
      const task = specParser.parseTask(taskLine);

      expect(task).toMatchObject({
        id: "TASK-004",
        title: "API Development",
        assigneeRole: "Backend-Developer",
      });
    });

    it("should parse subtask checkbox format", () => {
      const subtaskLine = "  - [x] Create database schema";
      const subtask = specParser.parseTask(subtaskLine);

      expect(subtask).toMatchObject({
        type: "subtask",
        completed: true,
        title: "Create database schema",
      });
    });

    it("should return null for invalid task format", () => {
      const invalidLine = "This is not a task line";
      const task = specParser.parseTask(invalidLine);

      expect(task).toBeNull();
    });
  });

  describe("computeFallbackDescription", () => {
    it("should extract problem statement and solution approach", () => {
      const lines = [
        "# Title",
        "",
        "## Problem Statement",
        "We need to solve this issue.",
        "It is causing problems.",
        "",
        "## Solution Approach",
        "We will implement a fix.",
        "The fix will work like this.",
        "",
        "## Other Section",
        "Other content",
      ];

      const fallback = specParser.computeFallbackDescription(lines);

      expect(fallback).toContain("We need to solve this issue");
      expect(fallback).toContain("We will implement a fix");
      expect(fallback).not.toContain("Other content");
    });

    it("should handle missing sections", () => {
      const lines = ["# Title", "Just some content"];
      const fallback = specParser.computeFallbackDescription(lines);

      expect(fallback).toBe("");
    });
  });
});
