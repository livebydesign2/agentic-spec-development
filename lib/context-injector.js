const fs = require("fs").promises;
const path = require("path");
const yaml = require("js-yaml");
const { DataAdapterFactory } = require("./data-adapters");
const ContextManager = require("./context-manager");
const ContextFilter = require("./context-filter");
const ContextValidator = require("./context-validator");

/**
 * Context Injection Engine for ASD CLI
 * Provides 4-layer context injection (critical, task-specific, agent-specific, process)
 * with agent filtering, context inheritance, and performance optimization
 */
class ContextInjector {
  constructor(configManager) {
    this.configManager = configManager;
    this.dataAdapterFactory = new DataAdapterFactory();
    this.contextManager = new ContextManager(configManager);
    this.contextFilter = new ContextFilter(configManager);
    this.contextValidator = new ContextValidator(configManager);
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.performanceTimeout = 500; // 500ms requirement
  }

  /**
   * Main entry point - inject context for an agent working on a specific task
   * @param {Object} options - Context injection options
   * @param {string} options.agentType - Type of agent (e.g., 'backend-developer')
   * @param {string} [options.specId] - Specification ID (e.g., 'FEAT-012')
   * @param {string} [options.taskId] - Task ID (e.g., 'TASK-002')
   * @param {boolean} [options.useCache=true] - Whether to use cached context
   * @returns {Promise<Object>} Injected context object
   */
  async injectContext(options) {
    const startTime = Date.now();

    try {
      const { agentType, specId, taskId, useCache = true } = options;

      if (!agentType) {
        throw new Error("Agent type is required for context injection");
      }

      // Check cache first if enabled
      const cacheKey = `${agentType}-${specId || "none"}-${taskId || "none"}`;
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.context;
        }
        this.cache.delete(cacheKey);
      }

      // Load agent definition to understand context requirements
      const agentDefinition = await this.loadAgentDefinition(agentType);

      // Build 4-layer context
      const context = {
        metadata: {
          agentType,
          specId,
          taskId,
          injectionTime: new Date().toISOString(),
          performance: {},
        },
        layers: {},
      };

      // Layer 1: Critical context (highest priority)
      const criticalStart = Date.now();
      context.layers.critical = await this.loadCriticalContext();
      context.metadata.performance.critical = Date.now() - criticalStart;

      // Layer 2: Task-specific context
      const taskStart = Date.now();
      context.layers.taskSpecific = await this.loadTaskSpecificContext(
        specId,
        taskId
      );
      context.metadata.performance.taskSpecific = Date.now() - taskStart;

      // Layer 3: Agent-specific context
      const agentStart = Date.now();
      context.layers.agentSpecific = await this.loadAgentSpecificContext(
        agentType,
        agentDefinition
      );
      context.metadata.performance.agentSpecific = Date.now() - agentStart;

      // Layer 4: Process context (workflow templates)
      const processStart = Date.now();
      context.layers.process = await this.loadProcessContext(
        agentType,
        agentDefinition
      );
      context.metadata.performance.process = Date.now() - processStart;

      // Apply context inheritance first (before filtering)
      const inheritanceStart = Date.now();
      const inheritedContext = await this.applyContextInheritance(
        context,
        specId,
        taskId
      );
      inheritedContext.metadata.performance.inheritance =
        Date.now() - inheritanceStart;

      // Apply agent-specific filtering with enhanced filtering
      const filterStart = Date.now();
      const filteredContext = await this.applyAdvancedFiltering(
        inheritedContext,
        agentDefinition
      );
      filteredContext.metadata.performance.filtering = Date.now() - filterStart;

      // Record total performance
      const totalTime = Date.now() - startTime;
      filteredContext.metadata.performance.total = totalTime;

      // Check performance requirement
      if (totalTime > this.performanceTimeout) {
        console.warn(
          `Context injection took ${totalTime}ms, exceeding ${this.performanceTimeout}ms target`
        );
      }

      // Validate the final context
      const validationStart = Date.now();
      const validationResults =
        await this.contextValidator.validateInjectedContext(filteredContext);
      filteredContext.metadata.performance.validation =
        Date.now() - validationStart;
      filteredContext.validation = validationResults;

      // Log validation issues
      if (validationResults.errors.length > 0) {
        console.warn("Context validation errors:", validationResults.errors);
      }
      if (validationResults.warnings.length > 0) {
        console.debug(
          "Context validation warnings:",
          validationResults.warnings
        );
      }

      // Cache the result
      if (useCache) {
        this.cache.set(cacheKey, {
          context: filteredContext,
          timestamp: Date.now(),
        });
      }

      return filteredContext;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      throw new Error(
        `Context injection failed after ${totalTime}ms: ${error.message}`
      );
    }
  }

  /**
   * Load agent definition from .asd/agents/ directory
   * @param {string} agentType - Type of agent to load
   * @returns {Promise<Object>} Agent definition with YAML frontmatter and content
   */
  async loadAgentDefinition(agentType) {
    const projectRoot = this.configManager.getProjectRoot();
    const agentFilePath = path.join(
      projectRoot,
      ".asd",
      "agents",
      `${agentType}.md`
    );

    try {
      const adapter = this.dataAdapterFactory.createFromFile(agentFilePath);
      const agentDoc = await adapter.loadDocument(agentFilePath);

      // Parse YAML frontmatter if it's a markdown file
      const content = await fs.readFile(agentFilePath, "utf-8");
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (frontmatterMatch) {
        const frontmatter = yaml.load(frontmatterMatch[1]);
        return {
          ...agentDoc,
          frontmatter,
          content: content.replace(/^---\n[\s\S]*?\n---\n/, ""),
        };
      }

      return agentDoc;
    } catch (error) {
      throw new Error(
        `Failed to load agent definition for ${agentType}: ${error.message}`
      );
    }
  }

  /**
   * Load critical context layer - project constraints and urgent information
   * @returns {Promise<Object>} Critical context data
   */
  async loadCriticalContext() {
    const projectRoot = this.configManager.getProjectRoot();
    const contextDir = path.join(projectRoot, ".asd", "context");

    const criticalSources = ["project.md", "urgent-constraints.md"];

    const criticalContext = {
      sources: [],
      constraints: [],
      urgentInfo: [],
    };

    for (const source of criticalSources) {
      const filePath = path.join(contextDir, source);

      try {
        if (await this.fileExists(filePath)) {
          const adapter = this.dataAdapterFactory.createFromFile(filePath);
          const contextDoc = await adapter.loadDocument(filePath);

          criticalContext.sources.push({
            file: source,
            content: contextDoc,
            loadedAt: new Date().toISOString(),
          });

          // Extract constraints and urgent info
          if (contextDoc.constraints) {
            criticalContext.constraints.push(...contextDoc.constraints);
          }
          if (contextDoc.urgentInfo) {
            criticalContext.urgentInfo.push(...contextDoc.urgentInfo);
          }
        }
      } catch (error) {
        console.warn(
          `Failed to load critical context from ${source}: ${error.message}`
        );
      }
    }

    return criticalContext;
  }

  /**
   * Load task-specific context layer - spec and task context
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task-specific context data
   */
  async loadTaskSpecificContext(specId, taskId) {
    const projectRoot = this.configManager.getProjectRoot();
    const contextDir = path.join(projectRoot, ".asd", "context");

    const taskContext = {
      spec: null,
      task: null,
      sources: [],
    };

    // Load spec context if provided
    if (specId) {
      const specContextPath = path.join(
        contextDir,
        "specs",
        `${specId}-context.md`
      );
      try {
        if (await this.fileExists(specContextPath)) {
          const adapter =
            this.dataAdapterFactory.createFromFile(specContextPath);
          const specContext = await adapter.loadDocument(specContextPath);
          taskContext.spec = specContext;
          taskContext.sources.push(`specs/${specId}-context.md`);
        }
      } catch (error) {
        console.warn(
          `Failed to load spec context for ${specId}: ${error.message}`
        );
      }
    }

    // Load task context if provided
    if (taskId) {
      const taskContextPath = path.join(
        contextDir,
        "tasks",
        `${taskId}-context.md`
      );
      try {
        if (await this.fileExists(taskContextPath)) {
          const adapter =
            this.dataAdapterFactory.createFromFile(taskContextPath);
          const taskContextDoc = await adapter.loadDocument(taskContextPath);
          taskContext.task = taskContextDoc;
          taskContext.sources.push(`tasks/${taskId}-context.md`);
        }
      } catch (error) {
        console.warn(
          `Failed to load task context for ${taskId}: ${error.message}`
        );
      }
    }

    return taskContext;
  }

  /**
   * Load agent-specific context layer
   * @param {string} agentType - Type of agent
   * @param {Object} agentDefinition - Agent definition object
   * @returns {Promise<Object>} Agent-specific context data
   */
  async loadAgentSpecificContext(agentType, agentDefinition) {
    const agentContext = {
      agentType,
      capabilities: agentDefinition.frontmatter?.capabilities || [],
      specializations: agentDefinition.frontmatter?.specialization_areas || [],
      contextRequirements:
        agentDefinition.frontmatter?.context_requirements || [],
      workflowSteps: agentDefinition.frontmatter?.workflow_steps || [],
      validationRequirements:
        agentDefinition.frontmatter?.validation_requirements || [],
      handoffChecklist: agentDefinition.frontmatter?.handoff_checklist || [],
    };

    return agentContext;
  }

  /**
   * Load process context layer - workflow templates and validation checklists
   * @param {string} agentType - Type of agent
   * @param {Object} agentDefinition - Agent definition object
   * @returns {Promise<Object>} Process context data
   */
  async loadProcessContext(agentType, agentDefinition) {
    const projectRoot = this.configManager.getProjectRoot();
    const processesDir = path.join(projectRoot, ".asd", "processes");

    const processSources = [
      "task-handoff-template.md",
      "validation-checklist.md",
    ];

    const processContext = {
      templates: [],
      checklists: [],
      sources: [],
    };

    for (const source of processSources) {
      const filePath = path.join(processesDir, source);

      try {
        if (await this.fileExists(filePath)) {
          const adapter = this.dataAdapterFactory.createFromFile(filePath);
          const processDoc = await adapter.loadDocument(filePath);

          if (source.includes("template")) {
            processContext.templates.push(processDoc);
          } else if (source.includes("checklist")) {
            processContext.checklists.push(processDoc);
          }

          processContext.sources.push(source);
        }
      } catch (error) {
        console.warn(
          `Failed to load process context from ${source}: ${error.message}`
        );
      }
    }

    return processContext;
  }

  /**
   * Apply advanced agent-specific filtering using ContextFilter
   * @param {Object} context - Full context object
   * @param {Object} agentDefinition - Agent definition with context requirements
   * @returns {Promise<Object>} Filtered and scored context object
   */
  async applyAdvancedFiltering(context, agentDefinition) {
    try {
      // Load filtering configuration
      const projectRoot = this.configManager.getProjectRoot();
      const agentCapabilitiesPath = path.join(
        projectRoot,
        ".asd",
        "config",
        "agent-capabilities.json"
      );

      let filteringConfig = {};
      try {
        const configContent = await fs.readFile(agentCapabilitiesPath, "utf-8");
        const fullConfig = JSON.parse(configContent);
        filteringConfig = fullConfig.context_filtering || {};
      } catch (error) {
        console.warn(
          `Failed to load context filtering config: ${error.message}`
        );
      }

      // Apply advanced filtering using ContextFilter
      return await this.contextFilter.filterContextForAgent(
        context,
        agentDefinition,
        filteringConfig
      );
    } catch (error) {
      console.warn(
        `Context filtering failed, using basic filtering: ${error.message}`
      );
      return await this.applyBasicFiltering(context, agentDefinition);
    }
  }

  /**
   * Apply basic agent-specific filtering (fallback)
   * @param {Object} context - Full context object
   * @param {Object} agentDefinition - Agent definition with context requirements
   * @returns {Promise<Object>} Basic filtered context object
   */
  async applyBasicFiltering(context, agentDefinition) {
    const contextRequirements =
      agentDefinition.frontmatter?.context_requirements || [];

    const filteredContext = { ...context };

    // Add basic relevance scoring
    filteredContext.relevanceScore = this.calculateRelevanceScore(
      context,
      contextRequirements
    );
    filteredContext.filtering = {
      applied: true,
      method: "basic",
      contextRequirements,
      agentType: agentDefinition.frontmatter?.agent_type,
    };

    return filteredContext;
  }

  /**
   * Apply context inheritance patterns (task inherits from spec and project)
   * @param {Object} context - Context object to apply inheritance to
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Context with inheritance applied
   */
  async applyContextInheritance(context, specId, taskId) {
    const inheritedContext = { ...context };

    // Load additional context using ContextManager for better inheritance
    const staticContext = await this.contextManager.loadStaticContext();
    const semiDynamicContext = await this.contextManager.loadSemiDynamicContext(
      specId,
      taskId
    );
    const dynamicContext = await this.contextManager.loadDynamicContext();

    // Create inheritance hierarchy: project → spec → task
    const inheritance = {
      applied: true,
      hierarchy: [],
      constraints: [],
      decisions: [],
      researchFindings: [],
      progress: {},
      blockers: [],
      nextSteps: [],
    };

    // Level 1: Project context (from static context)
    if (staticContext.project) {
      inheritance.hierarchy.push("project");

      if (staticContext.constraints) {
        inheritance.constraints.push(...staticContext.constraints);
      }

      if (staticContext.project.constraints) {
        inheritance.constraints.push(...staticContext.project.constraints);
      }

      // Add architecture decisions from project level
      if (staticContext.project.architecture_decisions) {
        inheritance.decisions.push(
          ...staticContext.project.architecture_decisions
        );
      }
    }

    // Level 2: Spec context inheritance
    if (specId && context.layers.taskSpecific?.spec) {
      inheritance.hierarchy.push("spec");
      const specContext = context.layers.taskSpecific.spec;

      // Merge spec constraints with project constraints
      if (specContext.constraints) {
        inheritance.constraints.push(...specContext.constraints);
      }

      // Add spec-level implementation decisions
      if (specContext.implementation_decisions) {
        inheritance.decisions.push(...specContext.implementation_decisions);
      }

      // Add spec-level research findings
      if (specContext.research_findings) {
        inheritance.researchFindings.push(...specContext.research_findings);
      }
    }

    // Level 3: Task context inheritance
    if (taskId && context.layers.taskSpecific?.task) {
      inheritance.hierarchy.push("task");
      const taskContext = context.layers.taskSpecific.task;

      // Add task-specific implementation notes and decisions
      if (taskContext.implementation_notes) {
        inheritance.decisions.push(...taskContext.implementation_notes);
      }

      if (taskContext.decisions_made) {
        inheritance.decisions.push(...taskContext.decisions_made);
      }

      if (taskContext.research_findings) {
        inheritance.researchFindings.push(...taskContext.research_findings);
      }

      // Task progress and blockers
      inheritance.progress = taskContext.progress || {};
      inheritance.blockers = taskContext.blockers || [];
      inheritance.nextSteps = taskContext.next_steps || [];
    }

    // Add semi-dynamic context (accumulated learnings)
    if (semiDynamicContext.researchFindings) {
      inheritance.researchFindings.push(...semiDynamicContext.researchFindings);
    }

    if (semiDynamicContext.implementationDecisions) {
      inheritance.decisions.push(...semiDynamicContext.implementationDecisions);
    }

    // Add dynamic context (current state)
    if (dynamicContext.assignments && dynamicContext.assignments[specId]) {
      inheritance.currentAssignments = dynamicContext.assignments[specId];
    }

    if (dynamicContext.progress && dynamicContext.progress[taskId]) {
      inheritance.currentProgress = dynamicContext.progress[taskId];
    }

    // Remove duplicates and add to context
    inheritedContext.inheritance = {
      ...inheritance,
      constraints: [...new Set(inheritance.constraints)],
      decisions: [...new Set(inheritance.decisions)],
      researchFindings: [...new Set(inheritance.researchFindings)],
      hasProjectContext: inheritance.hierarchy.includes("project"),
      hasSpecContext: inheritance.hierarchy.includes("spec"),
      hasTaskContext: inheritance.hierarchy.includes("task"),
    };

    return inheritedContext;
  }

  /**
   * Calculate relevance score for context based on agent requirements
   * @param {Object} context - Context object
   * @param {Array} contextRequirements - Agent context requirements
   * @returns {number} Relevance score (0-1)
   */
  calculateRelevanceScore(context, contextRequirements) {
    if (contextRequirements.length === 0) return 1;

    let totalScore = 0;
    let checkedRequirements = 0;

    for (const requirement of contextRequirements) {
      checkedRequirements++;

      // Check if requirement matches content in various context layers
      const contextText = JSON.stringify(context).toLowerCase();
      const requirementPattern = requirement.toLowerCase().replace(/-/g, ".*");

      if (
        contextText.includes(requirementPattern) ||
        contextText.match(new RegExp(requirementPattern))
      ) {
        totalScore += 1;
      }
    }

    return checkedRequirements > 0 ? totalScore / checkedRequirements : 0;
  }

  /**
   * Validate context structure and content
   * @param {Object} context - Context object to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateContext(context) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      performance: context.metadata?.performance || {},
    };

    // Check required structure
    if (!context.layers) {
      validation.errors.push("Missing context.layers structure");
      validation.isValid = false;
    }

    // Check layer presence
    const requiredLayers = [
      "critical",
      "taskSpecific",
      "agentSpecific",
      "process",
    ];
    for (const layer of requiredLayers) {
      if (!context.layers[layer]) {
        validation.warnings.push(`Missing ${layer} context layer`);
      }
    }

    // Check performance
    const totalTime = context.metadata?.performance?.total;
    if (totalTime && totalTime > this.performanceTimeout) {
      validation.warnings.push(
        `Context injection took ${totalTime}ms, exceeding ${this.performanceTimeout}ms target`
      );
    }

    return validation;
  }

  /**
   * Clear the context cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      keys: Array.from(this.cache.keys()),
    };
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
}

module.exports = ContextInjector;
