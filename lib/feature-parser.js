const fs = require("fs").promises;
const path = require("path");
const ConfigManager = require("./config-manager");
const { DataAdapterFactory } = require("./data-adapters");

class SpecParser {
  constructor(configManager = null) {
    this.specs = [];
    this.configManager = configManager || new ConfigManager();

    // Load configuration
    const config = this.configManager.loadConfig();
    this.dataPath = config.dataPath;
    this.enforceSpec = config.enforceSpec;
    this.statusFolders = config.statusFolders;
    this.supportedTypes = config.supportedTypes;
    this.dataFormat = config.dataFormat || "markdown";

    // Initialize data adapter factory
    this.adapterFactory = new DataAdapterFactory();
  }

  async loadSpecs() {
    this.specs = [];

    for (const folder of this.statusFolders) {
      const folderPath = path.join(this.dataPath, folder);

      try {
        const files = await fs.readdir(folderPath);

        // Get all supported extensions from adapters
        const supportedExts = ["md", "json", "yaml", "yml"];
        const specFiles = files.filter((file) => {
          const ext = path.extname(file).slice(1).toLowerCase();
          return supportedExts.includes(ext);
        });

        for (const file of specFiles) {
          const filePath = path.join(folderPath, file);
          const spec = await this.parseSpecFile(filePath, folder);
          if (spec) {
            this.specs.push(spec);
          }
        }
      } catch (error) {
        console.warn(
          `Warning: Could not read folder ${folder}:`,
          error.message
        );
      }
    }

    // Sort specs: P0 first, then by ID
    this.specs.sort((a, b) => {
      if (a.priority === "P0" && b.priority !== "P0") return -1;
      if (b.priority === "P0" && a.priority !== "P0") return 1;
      return a.id.localeCompare(b.id);
    });
  }

  async parseSpecFile(filePath, status) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      // Parse YAML frontmatter if present
      let yamlData = {};
      let contentStart = 0;
      if (lines[0] === "---") {
        const yamlEndIndex = lines.findIndex(
          (line, index) => index > 0 && line === "---"
        );
        if (yamlEndIndex > 0) {
          const yamlContent = lines.slice(1, yamlEndIndex).join("\n");
          try {
            yamlData = require("js-yaml").load(yamlContent) || {};
          } catch (e) {
            // Ignore YAML parsing errors
          }
          contentStart = yamlEndIndex + 1;
        }
      }

      const contentLines = lines.slice(contentStart);
      const contentText = contentLines.join("\n");

      // Extract basic information
      const title = this.extractTitle(contentText);
      const id = this.extractId(title, path.basename(filePath));

      if (!id) {
        return null; // Skip if no valid ID found
      }

      // Validate the spec ID matches supported types
      const typePattern = this.supportedTypes.join("|");
      const idMatch = id.match(new RegExp(`^(${typePattern})-(\\d+)`));

      if (!idMatch) {
        return null; // Skip files that don't match expected pattern
      }

      // Skip report documents
      const isReportDocument = id.match(
        /-(?:report|audit-report|analysis|findings|summary)$/i
      );
      if (isReportDocument) {
        return null;
      }

      const [, type, number] = idMatch;

      // Extract other fields
      const priority = yamlData.priority || this.extractPriority(contentText);
      let description = this.extractDescription(contentText);
      const warnings = [];

      // Generate fallback description if needed
      if (!description || description.trim() === "") {
        description = this.computeFallbackDescription(contentLines);
        if (description) {
          warnings.push("Missing Description; used fallback");
        }
      }

      // Parse tasks
      const tasks = this.extractTasks(contentText);

      // Extract type-specific fields
      const spec = {
        id,
        type,
        number: parseInt(number),
        status,
        title,
        description,
        priority: priority || "P2", // Default priority
        tasks,
        warnings,
        filename: path.basename(filePath, path.extname(filePath)),
        requiredDocs: yamlData.required_docs || [],
      };

      // Add completion date for done specs
      if (status === "done") {
        spec.completedDate = new Date().toISOString().split("T")[0];
      }

      // Type-specific parsing
      if (type === "BUG") {
        spec.bugSeverity = this.extractBugSeverity(contentText);
        spec.reproductionSteps = this.extractSection(
          contentText,
          "Reproduction Steps"
        );
        spec.rootCause = this.extractSection(
          contentText,
          "Root Cause Analysis"
        );
        spec.proposedSolution = this.extractSection(
          contentText,
          "Proposed Solution"
        );
        spec.environment = this.extractSection(contentText, "Environment");
      } else if (type === "SPIKE") {
        spec.researchType = this.extractResearchType(contentText);
        spec.researchQuestion = this.extractSection(
          contentText,
          "Research Question"
        );
        spec.researchFindings = this.extractSection(
          contentText,
          "Success Criteria"
        );
      }

      return spec;
    } catch (error) {
      console.warn(
        `Warning: Could not parse spec file ${filePath}:`,
        error.message
      );
      return null;
    }
  }

  // Modern getter methods
  getSpecs() {
    return this.specs;
  }

  getSpecById(id) {
    return this.specs.find((spec) => spec.id === id);
  }

  getSpecsByStatus(status) {
    return this.specs.filter((spec) => spec.status === status);
  }

  getSpecsByType(type) {
    return this.specs.filter((spec) => spec.type === type);
  }

  getSpecsByPriority(priority) {
    return this.specs.filter((spec) => spec.priority === priority);
  }

  getCriticalReady() {
    return this.specs.filter(
      (spec) =>
        spec.priority === "P0" &&
        spec.status !== "done" &&
        spec.status !== "active"
    );
  }

  getStats() {
    const stats = {
      total: this.specs.length,
      active: this.getSpecsByStatus("active").length,
      backlog: this.getSpecsByStatus("backlog").length,
      done: this.getSpecsByStatus("done").length,
      p0: this.getSpecsByPriority("P0").length,
      byStatus: {},
      byPriority: {},
      byType: {},
    };

    // Count by status
    for (const folder of this.statusFolders) {
      stats.byStatus[folder] = this.getSpecsByStatus(folder).length;
    }

    // Count by priority
    const priorities = ["P0", "P1", "P2", "P3"];
    for (const priority of priorities) {
      stats.byPriority[priority] = this.getSpecsByPriority(priority).length;
    }

    // Count by type
    for (const type of this.supportedTypes) {
      stats.byType[type] = this.getSpecsByType(type).length;
    }

    return stats;
  }

  parseTask(taskLine) {
    if (!taskLine || typeof taskLine !== "string") {
      return null;
    }

    // Standard task format: ### **TASK-001** 🤖 **Task Title**
    let match = taskLine.match(
      /^###\s*\*\*(.+?TASK-(\d+))\*\*\s*🤖\s*\*\*(.+?)\*\*(?:\s*\|\s*Agent:\s*([^|]+))?/
    );

    if (match) {
      const [, fullId, number, title, agent] = match;
      let taskId = fullId.trim();

      // Check for emoji status prefix
      let status = "ready";
      let icon = null;

      if (taskId.startsWith("✅")) {
        status = "complete";
        icon = "✅";
        taskId = taskId.replace(/^✅\s*/, "");
      } else if (taskId.startsWith("🔴")) {
        status = "ready";
        icon = "🔴";
        taskId = taskId.replace(/^🔴\s*/, "");
      } else if (taskId.startsWith("🔄")) {
        status = "in_progress";
        icon = "🔄";
        taskId = taskId.replace(/^🔄\s*/, "");
      }

      return {
        id: taskId,
        number: parseInt(number),
        status,
        title: title.trim(),
        assigneeRole: agent ? agent.trim() : undefined,
        icon,
        subtasks: [],
      };
    }

    // MAINT task format: ### **✅ TASK-003**: Task Title (STATUS)
    match = taskLine.match(/^###\s*\*\*([✅🔴🔄]?\s*TASK-\d+)\*\*:\s*(.*)/);

    if (match) {
      const [, fullIdPart, titleAndStatus] = match;

      // Extract emoji and task ID
      let emoji = null;
      let taskId = fullIdPart.trim();

      if (taskId.startsWith("✅")) {
        emoji = "✅";
        taskId = taskId.replace(/^✅\s*/, "");
      } else if (taskId.startsWith("🔴")) {
        emoji = "🔴";
        taskId = taskId.replace(/^🔴\s*/, "");
      } else if (taskId.startsWith("🔄")) {
        emoji = "🔄";
        taskId = taskId.replace(/^🔄\s*/, "");
      }

      // Extract title and status
      let title = titleAndStatus.trim();
      let status = "ready";

      // Check for status in parentheses
      const statusMatch = title.match(
        /^(.*?)\s*\((COMPLETED|READY|IN PROGRESS)\)\s*$/
      );
      if (statusMatch) {
        title = statusMatch[1].trim();
        const statusText = statusMatch[2];

        if (statusText === "COMPLETED") {
          status = "complete";
        } else if (statusText === "IN PROGRESS") {
          status = "in_progress";
        }
      }

      // Set status based on emoji if no explicit status
      if (!statusMatch) {
        if (emoji === "✅") {
          status = "complete";
        } else if (emoji === "🔄") {
          status = "in_progress";
        }
      }

      return {
        id: taskId,
        number: parseInt(taskId.split("-")[1]),
        status,
        title: title,
        icon: emoji || undefined,
        subtasks: [],
      };
    }

    // Subtask format: - [x] Subtask title
    match = taskLine.match(/^\s*-\s*\[([ x])\]\s*(.*)/);

    if (match) {
      const [, checked, title] = match;
      return {
        type: "subtask",
        completed: checked === "x",
        title: title.trim(),
      };
    }

    return null;
  }

  computeFallbackDescription(lines) {
    if (!Array.isArray(lines)) {
      return "";
    }

    let problemStatement = "";
    let solutionApproach = "";
    let currentSection = null;

    for (const line of lines) {
      if (line.match(/^##\s*Problem\s*Statement/i)) {
        currentSection = "problem";
        continue;
      } else if (line.match(/^##\s*Solution\s*Approach/i)) {
        currentSection = "solution";
        continue;
      } else if (line.match(/^##/)) {
        currentSection = null;
        continue;
      }

      if (currentSection === "problem" && line.trim()) {
        problemStatement += line.trim() + " ";
      } else if (currentSection === "solution" && line.trim()) {
        solutionApproach += line.trim() + " ";
      }
    }

    const result = [];
    if (problemStatement.trim()) {
      result.push(problemStatement.trim());
    }
    if (solutionApproach.trim()) {
      result.push(solutionApproach.trim());
    }

    return result.join(" ");
  }

  extractTitle(content) {
    const titleMatch = content.match(/^#\s+(.+)/m);
    return titleMatch ? titleMatch[1].trim() : "";
  }

  extractId(title, filename) {
    // Try to extract from title first
    const titleMatch = title.match(
      /^((?:SPEC|FEAT|BUG|SPIKE|MAINT|RELEASE)-\d+)/
    );
    if (titleMatch) {
      return titleMatch[1];
    }

    // Try to extract from filename
    const filenameMatch = filename.match(/^([A-Z]+-\d+)/);
    if (filenameMatch) {
      return filenameMatch[1];
    }

    return null;
  }

  extractDescription(content) {
    const descMatch = content.match(
      /##\s+Description\s*\n([\s\S]*?)(?=\n##|\n###|$)/i
    );
    return descMatch ? descMatch[1].trim() : "";
  }

  extractPriority(content) {
    const priorityMatch = content.match(/\*\*Priority:\*\*\s*(P[0-3])/i);
    return priorityMatch ? priorityMatch[1] : null;
  }

  extractTasks(content) {
    const tasks = [];
    const taskRegex = /^###\s+\*\*(.*?)\*\*.*$/gm;
    let match;

    while ((match = taskRegex.exec(content)) !== null) {
      const taskLine = match[0];
      const task = this.parseTask(taskLine);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  extractSection(content, sectionName) {
    const regex = new RegExp(
      `##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|\\n###|$)`,
      "i"
    );
    const match = content.match(regex);
    return match ? match[1].trim() : "";
  }

  extractBugSeverity(content) {
    const severityMatch = content.match(/\*\*Severity:\*\*\s*(\w+)/i);
    return severityMatch ? severityMatch[1] : null;
  }

  extractResearchType(content) {
    const researchMatch = content.match(/\*\*Research Type:\*\*\s*([^\n]+)/i);
    return researchMatch ? researchMatch[1].trim() : null;
  }
}

module.exports = SpecParser;
