const fs = require("fs").promises;
const path = require("path");
const yaml = require("js-yaml");
const { DataAdapterFactory } = require("./data-adapters");

/**
 * Context Manager for handling context file operations and lifecycle management
 * Supports static, dynamic, and semi-dynamic context types
 */
class ContextManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.dataAdapterFactory = new DataAdapterFactory();
  }

  /**
   * Load context configuration from .asd/config/context-config.json
   * @returns {Promise<Object>} Context configuration
   */
  async loadContextConfig() {
    const projectRoot = this.configManager.getProjectRoot();
    const configPath = path.join(
      projectRoot,
      ".asd",
      "config",
      "context-config.json"
    );

    try {
      const configContent = await fs.readFile(configPath, "utf-8");
      return JSON.parse(configContent);
    } catch (error) {
      console.warn(`Failed to load context config: ${error.message}`);
      return this.getDefaultContextConfig();
    }
  }

  /**
   * Get default context configuration
   * @returns {Object} Default configuration
   */
  getDefaultContextConfig() {
    return {
      context_system: {
        version: "1.0.0",
        enabled: true,
        performance: {
          injection_timeout_ms: 500,
          cache_enabled: true,
          cache_ttl_seconds: 300,
          lazy_loading: true,
        },
      },
      context_layers: {
        critical: {
          priority: 1,
          max_size_kb: 50,
          sources: ["project.md", "urgent-constraints.md"],
        },
        task_specific: {
          priority: 2,
          max_size_kb: 100,
          sources: ["specs/{spec_id}-context.md", "tasks/{task_id}-context.md"],
        },
        agent_specific: {
          priority: 3,
          max_size_kb: 75,
          sources: ["agents/{agent_type}.md"],
        },
        process: {
          priority: 4,
          max_size_kb: 25,
          sources: [
            "processes/task-handoff-template.md",
            "processes/validation-checklist.md",
          ],
        },
      },
    };
  }

  /**
   * Load static context (project-level constraints and architecture)
   * @returns {Promise<Object>} Static context data
   */
  async loadStaticContext() {
    const projectRoot = this.configManager.getProjectRoot();
    const contextDir = path.join(projectRoot, ".asd", "context");

    const staticContext = {
      type: "static",
      loadedAt: new Date().toISOString(),
      project: null,
      architecture: null,
      constraints: [],
    };

    // Load project.md
    const projectPath = path.join(contextDir, "project.md");
    try {
      if (await this.fileExists(projectPath)) {
        const adapter = this.dataAdapterFactory.createFromFile(projectPath);
        const projectDoc = await adapter.loadDocument(projectPath);

        // Parse frontmatter
        const content = await fs.readFile(projectPath, "utf-8");
        const parsedProject = this.parseMarkdownWithFrontmatter(content);

        staticContext.project = {
          ...projectDoc,
          ...parsedProject.frontmatter,
          content: parsedProject.content,
        };

        // Extract constraints
        if (parsedProject.frontmatter?.constraints) {
          staticContext.constraints.push(
            ...parsedProject.frontmatter.constraints
          );
        }
      }
    } catch (error) {
      console.warn(`Failed to load project static context: ${error.message}`);
    }

    return staticContext;
  }

  /**
   * Load dynamic context (current assignments, progress, real-time state)
   * @returns {Promise<Object>} Dynamic context data
   */
  async loadDynamicContext() {
    const projectRoot = this.configManager.getProjectRoot();
    const stateDir = path.join(projectRoot, ".asd", "state");

    const dynamicContext = {
      type: "dynamic",
      loadedAt: new Date().toISOString(),
      assignments: {},
      progress: {},
      currentState: {},
    };

    // Load assignments.json
    const assignmentsPath = path.join(stateDir, "assignments.json");
    try {
      if (await this.fileExists(assignmentsPath)) {
        const assignmentsContent = await fs.readFile(assignmentsPath, "utf-8");
        dynamicContext.assignments = JSON.parse(assignmentsContent);
      }
    } catch (error) {
      console.warn(`Failed to load assignments: ${error.message}`);
    }

    // Load progress.json
    const progressPath = path.join(stateDir, "progress.json");
    try {
      if (await this.fileExists(progressPath)) {
        const progressContent = await fs.readFile(progressPath, "utf-8");
        dynamicContext.progress = JSON.parse(progressContent);
      }
    } catch (error) {
      console.warn(`Failed to load progress: ${error.message}`);
    }

    return dynamicContext;
  }

  /**
   * Load semi-dynamic context (research findings, implementation decisions)
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Semi-dynamic context data
   */
  async loadSemiDynamicContext(specId, taskId) {
    const projectRoot = this.configManager.getProjectRoot();
    const contextDir = path.join(projectRoot, ".asd", "context");

    const semiDynamicContext = {
      type: "semi-dynamic",
      loadedAt: new Date().toISOString(),
      researchFindings: [],
      implementationDecisions: [],
      learnings: [],
    };

    // Load spec-level research and decisions
    if (specId) {
      const specContextPath = path.join(
        contextDir,
        "specs",
        `${specId}-context.md`
      );
      try {
        if (await this.fileExists(specContextPath)) {
          const content = await fs.readFile(specContextPath, "utf-8");
          const parsed = this.parseMarkdownWithFrontmatter(content);

          if (parsed.frontmatter?.research_findings) {
            semiDynamicContext.researchFindings.push(
              ...parsed.frontmatter.research_findings
            );
          }
          if (parsed.frontmatter?.implementation_decisions) {
            semiDynamicContext.implementationDecisions.push(
              ...parsed.frontmatter.implementation_decisions
            );
          }
        }
      } catch (error) {
        console.warn(
          `Failed to load spec context for ${specId}: ${error.message}`
        );
      }
    }

    // Load task-level implementation notes and decisions
    if (taskId) {
      const taskContextPath = path.join(
        contextDir,
        "tasks",
        `${taskId}-context.md`
      );
      try {
        if (await this.fileExists(taskContextPath)) {
          const content = await fs.readFile(taskContextPath, "utf-8");
          const parsed = this.parseMarkdownWithFrontmatter(content);

          if (parsed.frontmatter?.implementation_notes) {
            semiDynamicContext.implementationDecisions.push(
              ...parsed.frontmatter.implementation_notes
            );
          }
          if (parsed.frontmatter?.research_findings) {
            semiDynamicContext.researchFindings.push(
              ...parsed.frontmatter.research_findings
            );
          }
          if (parsed.frontmatter?.decisions_made) {
            semiDynamicContext.implementationDecisions.push(
              ...parsed.frontmatter.decisions_made
            );
          }
        }
      } catch (error) {
        console.warn(
          `Failed to load task context for ${taskId}: ${error.message}`
        );
      }
    }

    return semiDynamicContext;
  }

  /**
   * Update context files with new information
   * @param {string} contextType - Type of context ('spec', 'task', 'project')
   * @param {string} id - Context ID (spec ID, task ID, etc.)
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>} Success status
   */
  async updateContext(contextType, id, updates) {
    try {
      const projectRoot = this.configManager.getProjectRoot();
      let contextPath;

      switch (contextType) {
        case "spec":
          contextPath = path.join(
            projectRoot,
            ".asd",
            "context",
            "specs",
            `${id}-context.md`
          );
          break;
        case "task":
          contextPath = path.join(
            projectRoot,
            ".asd",
            "context",
            "tasks",
            `${id}-context.md`
          );
          break;
        case "project":
          contextPath = path.join(projectRoot, ".asd", "context", "project.md");
          break;
        default:
          throw new Error(`Unknown context type: ${contextType}`);
      }

      // Load existing context if it exists
      let existingContext = {};
      if (await this.fileExists(contextPath)) {
        const content = await fs.readFile(contextPath, "utf-8");
        const parsed = this.parseMarkdownWithFrontmatter(content);
        existingContext = {
          frontmatter: parsed.frontmatter || {},
          content: parsed.content || "",
        };
      }

      // Merge updates
      const updatedFrontmatter = {
        ...existingContext.frontmatter,
        ...updates.frontmatter,
        last_updated: new Date().toISOString(),
      };

      const updatedContent = updates.content || existingContext.content || "";

      // Write updated context file
      const newContent = this.serializeMarkdownWithFrontmatter(
        updatedFrontmatter,
        updatedContent
      );

      // Ensure directory exists
      await fs.mkdir(path.dirname(contextPath), { recursive: true });
      await fs.writeFile(contextPath, newContent, "utf-8");

      return true;
    } catch (error) {
      console.error(
        `Failed to update ${contextType} context for ${id}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Parse markdown file with YAML frontmatter
   * @param {string} content - File content
   * @returns {Object} Parsed frontmatter and content
   */
  parseMarkdownWithFrontmatter(content) {
    const frontmatterMatch = content.match(
      /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
    );

    if (!frontmatterMatch) {
      return {
        frontmatter: {},
        content: content,
      };
    }

    try {
      const frontmatter = yaml.load(frontmatterMatch[1]) || {};
      const markdownContent = frontmatterMatch[2] || "";

      return {
        frontmatter,
        content: markdownContent,
      };
    } catch (error) {
      console.warn(`Failed to parse YAML frontmatter: ${error.message}`);
      return {
        frontmatter: {},
        content: content,
      };
    }
  }

  /**
   * Serialize frontmatter and content to markdown with YAML frontmatter
   * @param {Object} frontmatter - YAML frontmatter object
   * @param {string} content - Markdown content
   * @returns {string} Serialized markdown with frontmatter
   */
  serializeMarkdownWithFrontmatter(frontmatter, content) {
    const yamlContent = yaml.dump(frontmatter, {
      noRefs: true,
      indent: 2,
      lineWidth: -1,
    });

    return `---\n${yamlContent}---\n\n${content}`;
  }

  /**
   * Utility method to check if file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} Whether file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get context directory paths
   * @returns {Object} Context directory paths
   */
  getContextPaths() {
    const projectRoot = this.configManager.getProjectRoot();

    return {
      base: path.join(projectRoot, ".asd"),
      context: path.join(projectRoot, ".asd", "context"),
      agents: path.join(projectRoot, ".asd", "agents"),
      processes: path.join(projectRoot, ".asd", "processes"),
      state: path.join(projectRoot, ".asd", "state"),
      config: path.join(projectRoot, ".asd", "config"),
    };
  }

  /**
   * Initialize context directory structure if it doesn't exist
   * @returns {Promise<boolean>} Success status
   */
  async initializeContextStructure() {
    try {
      const paths = this.getContextPaths();

      // Create directories
      for (const [name, dirPath] of Object.entries(paths)) {
        await fs.mkdir(dirPath, { recursive: true });

        // Create subdirectories for context
        if (name === "context") {
          await fs.mkdir(path.join(dirPath, "specs"), { recursive: true });
          await fs.mkdir(path.join(dirPath, "tasks"), { recursive: true });
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to initialize context structure: ${error.message}`);
      return false;
    }
  }
}

module.exports = ContextManager;
