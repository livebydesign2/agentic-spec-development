const BaseDataAdapter = require('./base-adapter');
const fs = require('fs').promises;

/**
 * Enhanced JSON data adapter for specification files
 * Supports full FEAT-020 specification with rich data structures
 */
class JSONDataAdapter extends BaseDataAdapter {
  constructor(config = {}) {
    super(config);
    this.format = 'json';
    this.config = {
      indent: 2,
      sortKeys: true,
      dateFormat: 'iso',
      ...config,
    };
  }

  async loadDocument(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const metadata = this.extractMetadata(filePath);
      return this.parseContent(content, metadata);
    } catch (error) {
      throw new Error(
        `Failed to load JSON document ${filePath}: ${error.message}`
      );
    }
  }

  parseContent(content, metadata = {}) {
    try {
      const data = JSON.parse(content);

      // Ensure required fields with sensible defaults from FEAT-020 spec
      const spec = {
        // Core identification fields
        id: data.id || metadata.id,
        type: data.type || metadata.type || 'FEAT',
        status: data.status || metadata.status || 'backlog',
        title: data.title || 'Untitled',
        description: data.description || '',
        priority: data.priority || 'P2',

        // Metadata fields
        effort: data.effort || null,
        assignee: data.assignee || null,
        phase: data.phase || null,
        created: this.parseDate(data.created),
        updated: this.parseDate(data.updated),

        // Organizational fields
        tags: Array.isArray(data.tags) ? data.tags : [],
        dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
        blocking: Array.isArray(data.blocking) ? data.blocking : [],

        // Task management
        tasks: Array.isArray(data.tasks) ? this.parseTasks(data.tasks) : [],
        acceptance_criteria: Array.isArray(data.acceptance_criteria)
          ? data.acceptance_criteria
          : [],
        technical_notes: data.technical_notes || '',

        // Completion tracking
        completedDate: this.parseDate(
          data.completedDate || data.completion_date
        ),

        // System metadata
        filePath: metadata.filePath,
        filename: metadata.filename,
        warnings: [],

        // Include all original data to preserve custom fields
        ...data,

        // Override with metadata for system fields
        ...metadata,
      };

      // Type-specific field handling
      this.addTypeSpecificFields(spec, data);

      return spec;
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
  }

  /**
   * Parse tasks with enhanced structure from FEAT-020
   * @private
   */
  parseTasks(tasks) {
    return tasks.map((task, index) => {
      if (typeof task === 'string') {
        // Simple string task - convert to structured format
        return {
          id: task.match(/TASK-\d+/)
            ? task.match(/TASK-\d+/)[0]
            : `TASK-${String(index + 1).padStart(3, '0')}`,
          title: task.replace(/TASK-\d+:?\s*/, ''),
          status: 'ready',
          subtasks: [],
        };
      }

      // Enhanced task structure
      return {
        id: task.id || `TASK-${String(index + 1).padStart(3, '0')}`,
        title: task.title || 'Untitled Task',
        status: task.status || 'ready',
        agent: task.agent || task.assignee || null,
        effort: task.effort || null,
        progress:
          typeof task.progress === 'number'
            ? Math.max(0, Math.min(100, task.progress))
            : null,
        started: this.parseDate(task.started),
        completed: this.parseDate(task.completed || task.completion_date),
        estimated_completion: this.parseDate(task.estimated_completion),
        subtasks: Array.isArray(task.subtasks)
          ? task.subtasks.map((subtask) => ({
              description: subtask.description || subtask.title || subtask,
              completed: Boolean(subtask.completed),
            }))
          : [],
        // Preserve any additional task fields
        ...task,
      };
    });
  }

  /**
   * Add type-specific fields based on specification type
   * @private
   */
  addTypeSpecificFields(spec, data) {
    switch (spec.type) {
      case 'BUG':
        spec.bugSeverity = data.bugSeverity || data.severity || null;
        spec.reproductionSteps =
          data.reproductionSteps || data.reproduction_steps || '';
        spec.rootCause = data.rootCause || data.root_cause || '';
        spec.proposedSolution =
          data.proposedSolution || data.proposed_solution || '';
        spec.environment = data.environment || '';
        break;

      case 'SPIKE':
        spec.researchType = data.researchType || data.research_type || null;
        spec.researchQuestion =
          data.researchQuestion || data.research_question || '';
        spec.researchFindings =
          data.researchFindings || data.research_findings || '';
        break;
    }
  }

  /**
   * Parse date strings with multiple format support
   * @private
   */
  parseDate(dateValue) {
    if (!dateValue) return null;

    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  canParse(content) {
    try {
      const parsed = JSON.parse(content);
      // Must be an object with some spec-like structure
      return (
        typeof parsed === 'object' &&
        parsed !== null &&
        (parsed.id || parsed.title || parsed.type)
      );
    } catch {
      return false;
    }
  }

  getSupportedExtensions() {
    return ['json'];
  }

  serialize(spec) {
    // Create clean spec object matching FEAT-020 structure
    const cleanSpec = {
      // Core identification
      id: spec.id,
      type: spec.type,
      title: spec.title,
      status: spec.status,
      priority: spec.priority || 'P2',

      // Metadata
      effort: spec.effort || undefined,
      assignee: spec.assignee || undefined,
      phase: spec.phase || undefined,
      created: this.formatDate(spec.created),
      updated: this.formatDate(spec.updated || new Date().toISOString()),

      // Content
      description: spec.description || '',
      tags: spec.tags && spec.tags.length > 0 ? spec.tags : undefined,
      dependencies:
        spec.dependencies && spec.dependencies.length > 0
          ? spec.dependencies
          : undefined,
      blocking:
        spec.blocking && spec.blocking.length > 0 ? spec.blocking : undefined,

      // Tasks with full structure
      tasks:
        spec.tasks && spec.tasks.length > 0
          ? this.serializeTasks(spec.tasks)
          : undefined,

      // Acceptance criteria
      acceptance_criteria:
        spec.acceptance_criteria && spec.acceptance_criteria.length > 0
          ? spec.acceptance_criteria
          : undefined,

      // Technical notes
      technical_notes: spec.technical_notes || undefined,

      // Completion
      completedDate: this.formatDate(spec.completedDate),
    };

    // Add type-specific fields
    this.addTypeSpecificSerialization(cleanSpec, spec);

    // Remove undefined values for cleaner JSON
    Object.keys(cleanSpec).forEach((key) => {
      if (cleanSpec[key] === undefined) {
        delete cleanSpec[key];
      }
    });

    // Sort keys if configured
    if (this.config.sortKeys) {
      const sortedSpec = {};
      Object.keys(cleanSpec)
        .sort()
        .forEach((key) => {
          sortedSpec[key] = cleanSpec[key];
        });
      return JSON.stringify(sortedSpec, null, this.config.indent);
    }

    return JSON.stringify(cleanSpec, null, this.config.indent);
  }

  /**
   * Serialize tasks with enhanced structure
   * @private
   */
  serializeTasks(tasks) {
    return tasks.map((task) => {
      const serializedTask = {
        id: task.id,
        title: task.title,
        status: task.status || 'ready',
        agent: task.agent || undefined,
        effort: task.effort || undefined,
        progress: typeof task.progress === 'number' ? task.progress : undefined,
        started: this.formatDate(task.started),
        completed: this.formatDate(task.completed),
        estimated_completion: this.formatDate(task.estimated_completion),
      };

      // Add subtasks if they exist
      if (task.subtasks && task.subtasks.length > 0) {
        serializedTask.subtasks = task.subtasks.map((subtask) => ({
          description: subtask.description || subtask.title,
          completed: Boolean(subtask.completed),
        }));
      }

      // Remove undefined values
      Object.keys(serializedTask).forEach((key) => {
        if (serializedTask[key] === undefined) {
          delete serializedTask[key];
        }
      });

      return serializedTask;
    });
  }

  /**
   * Add type-specific serialization
   * @private
   */
  addTypeSpecificSerialization(cleanSpec, spec) {
    switch (spec.type) {
      case 'BUG':
        if (spec.bugSeverity) cleanSpec.bugSeverity = spec.bugSeverity;
        if (spec.reproductionSteps)
          cleanSpec.reproductionSteps = spec.reproductionSteps;
        if (spec.rootCause) cleanSpec.rootCause = spec.rootCause;
        if (spec.proposedSolution)
          cleanSpec.proposedSolution = spec.proposedSolution;
        if (spec.environment) cleanSpec.environment = spec.environment;
        break;

      case 'SPIKE':
        if (spec.researchType) cleanSpec.researchType = spec.researchType;
        if (spec.researchQuestion)
          cleanSpec.researchQuestion = spec.researchQuestion;
        if (spec.researchFindings)
          cleanSpec.researchFindings = spec.researchFindings;
        break;
    }
  }

  /**
   * Format date according to configuration
   * @private
   */
  formatDate(date) {
    if (!date) return null;

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;

    switch (this.config.dateFormat) {
      case 'iso':
        return dateObj.toISOString();
      case 'date':
        return dateObj.toISOString().split('T')[0];
      default:
        return dateObj.toISOString();
    }
  }

  /**
   * Query specifications using JSON path-like syntax
   * @param {Array} specs - Array of specification objects
   * @param {string} query - Query string (simplified JSONPath)
   * @returns {Array} Filtered specifications
   */
  query(specs, query) {
    // This is a simplified implementation - could be extended with full JSONPath
    if (query.includes('status==')) {
      const status = query.match(/status=="([^"]+)"/)?.[1];
      if (status) {
        return specs.filter((spec) => spec.status === status);
      }
    }

    if (query.includes('priority==')) {
      const priority = query.match(/priority=="([^"]+)"/)?.[1];
      if (priority) {
        return specs.filter((spec) => spec.priority === priority);
      }
    }

    if (query.includes('type==')) {
      const type = query.match(/type=="([^"]+)"/)?.[1];
      if (type) {
        return specs.filter((spec) => spec.type === type);
      }
    }

    return specs; // Return all if no matching query
  }
}

module.exports = JSONDataAdapter;
