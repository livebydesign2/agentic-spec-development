const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Context Validator for schema checking and validation of context files
 * Ensures context integrity, format compliance, and structural correctness
 */
class ContextValidator {
  constructor(configManager) {
    this.configManager = configManager;
    this.schemas = {};
    this.validationRules = {};
    this.loadSchemas();
  }

  /**
   * Load validation schemas and rules
   */
  loadSchemas() {
    // Agent definition schema
    this.schemas.agent = {
      required: ['agent_type', 'capabilities', 'context_requirements'],
      optional: [
        'specializations',
        'workflow_steps',
        'validation_requirements',
        'handoff_checklist',
      ],
      types: {
        agent_type: 'string',
        capabilities: 'array',
        context_requirements: 'array',
        specializations: 'array',
        workflow_steps: 'array',
        validation_requirements: 'array',
        handoff_checklist: 'array',
      },
    };

    // Project context schema
    this.schemas.project = {
      required: ['context_type', 'project_name', 'version', 'phase'],
      optional: [
        'constraints',
        'architecture_decisions',
        'technology_stack',
        'last_updated',
      ],
      types: {
        context_type: 'string',
        project_name: 'string',
        version: 'string',
        phase: 'string',
        constraints: 'array',
        architecture_decisions: 'array',
        technology_stack: 'array',
        last_updated: 'string',
      },
    };

    // Spec context schema
    this.schemas.spec = {
      required: ['context_type', 'spec_id', 'spec_title', 'priority', 'status'],
      optional: [
        'phase',
        'assigned_agents',
        'research_findings',
        'implementation_decisions',
        'constraints',
      ],
      types: {
        context_type: 'string',
        spec_id: 'string',
        spec_title: 'string',
        priority: 'string',
        status: 'string',
        phase: 'string',
        assigned_agents: 'array',
        research_findings: 'array',
        implementation_decisions: 'array',
        constraints: 'array',
      },
    };

    // Task context schema
    this.schemas.task = {
      required: [
        'context_type',
        'task_id',
        'spec_id',
        'task_title',
        'assigned_agent',
        'status',
      ],
      optional: [
        'started',
        'progress',
        'implementation_notes',
        'research_findings',
        'decisions_made',
        'blockers',
        'next_steps',
        'handoff_notes',
      ],
      types: {
        context_type: 'string',
        task_id: 'string',
        spec_id: 'string',
        task_title: 'string',
        assigned_agent: 'string',
        status: 'string',
        started: 'string',
        progress: 'object',
        implementation_notes: 'array',
        research_findings: 'array',
        decisions_made: 'array',
        blockers: 'array',
        next_steps: 'array',
        handoff_notes: 'array',
      },
    };

    // Validation rules
    this.validationRules = {
      priority: ['P0', 'P1', 'P2', 'P3'],
      status: [
        'active',
        'ready',
        'in_progress',
        'blocked',
        'completed',
        'cancelled',
      ],
      context_type: ['project', 'spec', 'task', 'agent', 'process'],
      agent_type: [
        'software-architect',
        'backend-developer',
        'cli-specialist',
        'qa-engineer',
      ],
    };
  }

  /**
   * Validate a complete context injection result
   * @param {Object} injectedContext - Context object from injection
   * @returns {Promise<Object>} Validation results
   */
  async validateInjectedContext(injectedContext) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      scores: {},
      layers: {},
      performance: injectedContext.metadata?.performance || {},
    };

    try {
      // Validate structure
      await this.validateContextStructure(injectedContext, validation);

      // Validate each layer
      await this.validateContextLayers(injectedContext.layers, validation);

      // Validate inheritance
      await this.validateInheritance(injectedContext.inheritance, validation);

      // Validate filtering
      await this.validateFiltering(injectedContext.filtering, validation);

      // Validate performance
      await this.validatePerformance(
        injectedContext.metadata?.performance,
        validation
      );

      // Calculate overall validity
      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.errors.push(`Context validation failed: ${error.message}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Validate context file structure
   * @param {Object} context - Context object
   * @param {Object} validation - Validation results object
   */
  async validateContextStructure(context, validation) {
    // Check required top-level structure
    const requiredFields = ['metadata', 'layers'];
    for (const field of requiredFields) {
      if (!context[field]) {
        validation.errors.push(`Missing required field: ${field}`);
      }
    }

    // Check metadata structure
    if (context.metadata) {
      const requiredMetadata = ['agentType', 'injectionTime'];
      for (const field of requiredMetadata) {
        if (!context.metadata[field]) {
          validation.warnings.push(`Missing metadata field: ${field}`);
        }
      }
    }

    // Check layers structure
    if (context.layers) {
      const expectedLayers = [
        'critical',
        'taskSpecific',
        'agentSpecific',
        'process',
      ];
      for (const layer of expectedLayers) {
        if (!context.layers[layer]) {
          validation.warnings.push(`Missing context layer: ${layer}`);
        }
      }
    }
  }

  /**
   * Validate individual context layers
   * @param {Object} layers - Context layers object
   * @param {Object} validation - Validation results object
   */
  async validateContextLayers(layers, validation) {
    validation.layers = {};

    for (const [layerName, layerContent] of Object.entries(layers || {})) {
      const layerValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        contentCheck: {},
      };

      // Validate layer content based on type
      switch (layerName) {
        case 'critical':
          await this.validateCriticalLayer(layerContent, layerValidation);
          break;
        case 'taskSpecific':
          await this.validateTaskSpecificLayer(layerContent, layerValidation);
          break;
        case 'agentSpecific':
          await this.validateAgentSpecificLayer(layerContent, layerValidation);
          break;
        case 'process':
          await this.validateProcessLayer(layerContent, layerValidation);
          break;
      }

      layerValidation.isValid = layerValidation.errors.length === 0;
      validation.layers[layerName] = layerValidation;

      // Add layer errors to main validation
      validation.errors.push(...layerValidation.errors);
      validation.warnings.push(...layerValidation.warnings);
    }
  }

  /**
   * Validate critical context layer
   * @param {Object} content - Layer content
   * @param {Object} validation - Layer validation object
   */
  async validateCriticalLayer(content, validation) {
    if (!content) {
      validation.warnings.push('Critical layer is empty');
      return;
    }

    // Check for constraints
    if (!content.constraints || !Array.isArray(content.constraints)) {
      validation.warnings.push('Critical layer missing constraints array');
    }

    // Check for sources
    if (!content.sources || !Array.isArray(content.sources)) {
      validation.warnings.push('Critical layer missing sources array');
    }

    validation.contentCheck.hasConstraints = !!(
      content.constraints && content.constraints.length > 0
    );
    validation.contentCheck.hasSources = !!(
      content.sources && content.sources.length > 0
    );
  }

  /**
   * Validate task-specific context layer
   * @param {Object} content - Layer content
   * @param {Object} validation - Layer validation object
   */
  async validateTaskSpecificLayer(content, validation) {
    if (!content) {
      validation.warnings.push('Task-specific layer is empty');
      return;
    }

    // Validate spec context if present
    if (content.spec) {
      await this.validateContextSchema(content.spec, 'spec', validation);
    }

    // Validate task context if present
    if (content.task) {
      await this.validateContextSchema(content.task, 'task', validation);
    }

    validation.contentCheck.hasSpec = !!content.spec;
    validation.contentCheck.hasTask = !!content.task;
  }

  /**
   * Validate agent-specific context layer
   * @param {Object} content - Layer content
   * @param {Object} validation - Layer validation object
   */
  async validateAgentSpecificLayer(content, validation) {
    if (!content) {
      validation.errors.push('Agent-specific layer is empty');
      return;
    }

    // Check required agent fields
    const requiredFields = ['agentType', 'capabilities', 'contextRequirements'];
    for (const field of requiredFields) {
      if (!content[field]) {
        validation.errors.push(`Agent layer missing required field: ${field}`);
      }
    }

    // Validate agent type
    if (
      content.agentType &&
      !this.validationRules.agent_type.includes(content.agentType)
    ) {
      validation.warnings.push(`Unknown agent type: ${content.agentType}`);
    }

    validation.contentCheck.hasCapabilities = !!(
      content.capabilities && content.capabilities.length > 0
    );
    validation.contentCheck.hasContextRequirements = !!(
      content.contextRequirements && content.contextRequirements.length > 0
    );
  }

  /**
   * Validate process context layer
   * @param {Object} content - Layer content
   * @param {Object} validation - Layer validation object
   */
  async validateProcessLayer(content, validation) {
    if (!content) {
      validation.warnings.push('Process layer is empty');
      return;
    }

    // Check for templates and checklists
    validation.contentCheck.hasTemplates = !!(
      content.templates && content.templates.length > 0
    );
    validation.contentCheck.hasChecklists = !!(
      content.checklists && content.checklists.length > 0
    );

    if (
      !validation.contentCheck.hasTemplates &&
      !validation.contentCheck.hasChecklists
    ) {
      validation.warnings.push(
        'Process layer lacks both templates and checklists'
      );
    }
  }

  /**
   * Validate inheritance structure
   * @param {Object} inheritance - Inheritance object
   * @param {Object} validation - Validation results object
   */
  async validateInheritance(inheritance, validation) {
    if (!inheritance) {
      validation.warnings.push('No inheritance information available');
      return;
    }

    if (!inheritance.applied) {
      validation.warnings.push('Context inheritance was not applied');
    }

    if (!inheritance.hierarchy || !Array.isArray(inheritance.hierarchy)) {
      validation.warnings.push('Invalid inheritance hierarchy structure');
    }

    // Check inheritance completeness
    const expectedLevels = ['project', 'spec', 'task'];
    const missingLevels = expectedLevels.filter(
      (level) => !inheritance.hierarchy.includes(level)
    );

    if (missingLevels.length > 0) {
      validation.warnings.push(
        `Inheritance missing levels: ${missingLevels.join(', ')}`
      );
    }
  }

  /**
   * Validate filtering results
   * @param {Object} filtering - Filtering object
   * @param {Object} validation - Validation results object
   */
  async validateFiltering(filtering, validation) {
    if (!filtering) {
      validation.warnings.push('No filtering information available');
      return;
    }

    if (!filtering.applied) {
      validation.warnings.push('Context filtering was not applied');
    }

    // Check relevance scores
    if (filtering.relevanceScores) {
      for (const [layer, score] of Object.entries(filtering.relevanceScores)) {
        if (
          typeof score.overallScore !== 'number' ||
          score.overallScore < 0 ||
          score.overallScore > 1
        ) {
          validation.warnings.push(
            `Invalid relevance score for ${layer}: ${score.overallScore}`
          );
        }
      }
    }
  }

  /**
   * Validate performance metrics
   * @param {Object} performance - Performance object
   * @param {Object} validation - Validation results object
   */
  async validatePerformance(performance, validation) {
    if (!performance) {
      validation.warnings.push('No performance metrics available');
      return;
    }

    const performanceTarget = 500; // 500ms requirement

    if (performance.total && performance.total > performanceTarget) {
      validation.warnings.push(
        `Context injection took ${performance.total}ms, exceeding ${performanceTarget}ms target`
      );
    }

    // Check individual layer performance
    const layers = ['critical', 'taskSpecific', 'agentSpecific', 'process'];
    for (const layer of layers) {
      if (performance[layer] && performance[layer] > 100) {
        validation.warnings.push(
          `Layer ${layer} took ${performance[layer]}ms, consider optimization`
        );
      }
    }
  }

  /**
   * Validate context file against schema
   * @param {Object} contextData - Context data to validate
   * @param {string} schemaType - Type of schema to validate against
   * @param {Object} validation - Validation results object
   */
  async validateContextSchema(contextData, schemaType, validation) {
    const schema = this.schemas[schemaType];
    if (!schema) {
      validation.errors.push(`Unknown schema type: ${schemaType}`);
      return;
    }

    // Check required fields
    for (const field of schema.required) {
      if (contextData[field] === undefined || contextData[field] === null) {
        validation.errors.push(`Missing required field: ${field}`);
      }
    }

    // Check field types
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (contextData[field] !== undefined) {
        const actualType = Array.isArray(contextData[field])
          ? 'array'
          : typeof contextData[field];
        if (actualType !== expectedType) {
          validation.errors.push(
            `Field ${field} should be ${expectedType}, got ${actualType}`
          );
        }
      }
    }

    // Validate enum values
    for (const [field, validValues] of Object.entries(this.validationRules)) {
      if (contextData[field] && !validValues.includes(contextData[field])) {
        validation.warnings.push(
          `Field ${field} has unexpected value: ${contextData[field]}`
        );
      }
    }
  }

  /**
   * Validate a context file from the filesystem
   * @param {string} filePath - Path to context file
   * @param {string} expectedType - Expected context type
   * @returns {Promise<Object>} File validation results
   */
  async validateContextFile(filePath, expectedType) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      filePath,
      expectedType,
      actualType: null,
      content: null,
    };

    try {
      // Check file existence
      if (!(await this.fileExists(filePath))) {
        validation.errors.push(`Context file does not exist: ${filePath}`);
        validation.isValid = false;
        return validation;
      }

      // Read and parse file
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = this.parseMarkdownWithFrontmatter(content);

      validation.content = parsed;

      // Validate frontmatter exists
      if (!parsed.frontmatter || Object.keys(parsed.frontmatter).length === 0) {
        validation.errors.push('Context file missing YAML frontmatter');
      } else {
        validation.actualType =
          parsed.frontmatter.context_type || parsed.frontmatter.agent_type;

        // Validate against schema
        await this.validateContextSchema(
          parsed.frontmatter,
          expectedType,
          validation
        );
      }

      // Check markdown content
      if (!parsed.content || parsed.content.trim().length === 0) {
        validation.warnings.push('Context file has no markdown content');
      }

      validation.isValid = validation.errors.length === 0;
    } catch (error) {
      validation.errors.push(
        `Failed to validate context file: ${error.message}`
      );
      validation.isValid = false;
    }

    return validation;
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
      const markdownContent = frontmatterMatch[2] || '';

      return {
        frontmatter,
        content: markdownContent,
      };
    } catch (error) {
      throw new Error(`Failed to parse YAML frontmatter: ${error.message}`);
    }
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
   * Get validation summary for multiple context files
   * @param {Array} filePaths - Array of file paths to validate
   * @returns {Promise<Object>} Validation summary
   */
  async validateContextFiles(filePaths) {
    const summary = {
      totalFiles: filePaths.length,
      validFiles: 0,
      invalidFiles: 0,
      warnings: 0,
      results: [],
    };

    for (const filePath of filePaths) {
      const filename = path.basename(filePath);
      let expectedType = 'unknown';

      // Infer expected type from filename/path
      if (filename.includes('-context.md')) {
        expectedType = filename.startsWith('FEAT-') ? 'spec' : 'task';
      } else if (filename === 'project.md') {
        expectedType = 'project';
      } else if (filePath.includes('/agents/')) {
        expectedType = 'agent';
      }

      const result = await this.validateContextFile(filePath, expectedType);
      summary.results.push(result);

      if (result.isValid) {
        summary.validFiles++;
      } else {
        summary.invalidFiles++;
      }

      summary.warnings += result.warnings.length;
    }

    return summary;
  }
}

module.exports = ContextValidator;
