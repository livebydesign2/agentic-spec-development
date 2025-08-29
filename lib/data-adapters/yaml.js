const BaseDataAdapter = require('./base-adapter');
const fs = require('fs').promises;
const yaml = require('js-yaml');

/**
 * Enhanced YAML data adapter for specification files
 * Supports full FEAT-020 specification with comment preservation and rich formatting
 */
class YAMLDataAdapter extends BaseDataAdapter {
  constructor(config = {}) {
    super(config);
    this.format = 'yaml';
    this.config = {
      indent: 2,
      lineWidth: 120,
      noRefs: false,
      quotingType: '"',
      preserveComments: true,
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
        `Failed to load YAML document ${filePath}: ${error.message}`
      );
    }
  }

  parseContent(content, metadata = {}) {
    try {
      // Parse YAML with support for multiple documents
      const docs = yaml.loadAll(content, null, {
        filename: metadata.filePath,
        onWarning: (warning) => {
          console.warn(`YAML parsing warning: ${warning.message}`);
        },
      });

      // Handle single document or take first document
      const data = Array.isArray(docs) ? docs[0] : docs;

      // Handle empty or null YAML
      if (!data || typeof data !== 'object') {
        throw new Error('YAML must contain an object');
      }

      // Enhanced spec parsing with FEAT-020 structure
      const spec = {
        // Core identification fields
        id: data.id || metadata.id,
        type: data.type || metadata.type || 'FEAT',
        status: data.status || metadata.status || 'backlog',
        title: data.title || 'Untitled',
        description: this.parseMultilineString(data.description) || '',
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
        technical_notes: this.parseMultilineString(data.technical_notes) || '',

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
      throw new Error(`Invalid YAML format: ${error.message}`);
    }
  }

  /**
   * Parse multiline strings with proper formatting
   * @private
   */
  parseMultilineString(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    return String(value).trim();
  }

  /**
   * Parse tasks with enhanced YAML structure from FEAT-020
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
          ? task.subtasks.map((subtask) => {
              if (typeof subtask === 'string') {
                return {
                  description: subtask,
                  completed: false,
                };
              }
              return {
                description: subtask.description || subtask.title || subtask,
                completed: Boolean(subtask.completed),
              };
            })
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
          this.parseMultilineString(
            data.reproductionSteps || data.reproduction_steps
          ) || '';
        spec.rootCause =
          this.parseMultilineString(data.rootCause || data.root_cause) || '';
        spec.proposedSolution =
          this.parseMultilineString(
            data.proposedSolution || data.proposed_solution
          ) || '';
        spec.environment = data.environment || '';
        break;

      case 'SPIKE':
        spec.researchType = data.researchType || data.research_type || null;
        spec.researchQuestion =
          this.parseMultilineString(
            data.researchQuestion || data.research_question
          ) || '';
        spec.researchFindings =
          this.parseMultilineString(
            data.researchFindings || data.research_findings
          ) || '';
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
      // Check for YAML-specific patterns first
      const hasYamlPatterns =
        content.includes('---') || // Document separator
        /^[a-zA-Z_][a-zA-Z0-9_]*:\s/.test(content) || // Key-value pairs at start of line
        /^\s*-\s+/.test(content); // List items

      if (!hasYamlPatterns) {
        return false;
      }

      const data = yaml.load(content, { safeLoad: true });
      return (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        (data.id || data.title || data.type)
      );
    } catch {
      return false;
    }
  }

  getSupportedExtensions() {
    return ['yaml', 'yml'];
  }

  serialize(spec) {
    // Create clean spec object matching FEAT-020 YAML structure
    const cleanSpec = {};

    // Core identification (keep at top)
    cleanSpec.id = spec.id;
    cleanSpec.type = spec.type;
    cleanSpec.title = spec.title;
    cleanSpec.status = spec.status;
    cleanSpec.priority = spec.priority || 'P2';

    // Metadata
    if (spec.effort) cleanSpec.effort = spec.effort;
    if (spec.assignee) cleanSpec.assignee = spec.assignee;
    if (spec.phase) cleanSpec.phase = spec.phase;
    if (spec.created) cleanSpec.created = this.formatDate(spec.created);
    if (spec.updated)
      cleanSpec.updated = this.formatDate(
        spec.updated || new Date().toISOString()
      );

    // Content with proper multiline formatting
    if (spec.description && spec.description.trim()) {
      cleanSpec.description = this.formatMultilineString(spec.description);
    }

    if (spec.tags && spec.tags.length > 0) {
      cleanSpec.tags = spec.tags;
    }

    if (spec.dependencies && spec.dependencies.length > 0) {
      cleanSpec.dependencies = spec.dependencies;
    }

    if (spec.blocking && spec.blocking.length > 0) {
      cleanSpec.blocking = spec.blocking;
    }

    // Tasks with full structure
    if (spec.tasks && spec.tasks.length > 0) {
      cleanSpec.tasks = this.serializeTasks(spec.tasks);
    }

    // Acceptance criteria
    if (spec.acceptance_criteria && spec.acceptance_criteria.length > 0) {
      cleanSpec.acceptance_criteria = spec.acceptance_criteria;
    }

    // Technical notes
    if (spec.technical_notes && spec.technical_notes.trim()) {
      cleanSpec.technical_notes = this.formatMultilineString(
        spec.technical_notes
      );
    }

    // Add type-specific fields
    this.addTypeSpecificSerialization(cleanSpec, spec);

    return yaml.dump(cleanSpec, {
      indent: this.config.indent,
      lineWidth: this.config.lineWidth,
      noRefs: this.config.noRefs,
      quotingType: this.config.quotingType,
      sortKeys: false, // Maintain logical order instead of alphabetical
      flowLevel: -1, // Always use block style
      styles: {
        '!!str': this.getStringStyle.bind(this),
      },
    });
  }

  /**
   * Determine appropriate YAML string style for content
   * @private
   */
  getStringStyle(str) {
    // Use literal style (|) for multiline content
    if (str.includes('\n') && str.length > 50) {
      return 'literal';
    }

    // Use folded style (>) for long single lines
    if (str.length > this.config.lineWidth && !str.includes('\n')) {
      return 'folded';
    }

    // Use quoted style for strings with special characters
    if (/[:[\]{}#&*!|>'"@`]/.test(str)) {
      return 'quoted';
    }

    return 'plain';
  }

  /**
   * Format multiline strings for YAML output
   * @private
   */
  formatMultilineString(str) {
    if (!str) return '';

    const lines = str.trim().split('\n');

    // If it's a single line or short, return as-is
    if (lines.length === 1 || str.length < 80) {
      return str.trim();
    }

    // For multiline content, ensure proper formatting
    return lines.map((line) => line.trim()).join('\n');
  }

  /**
   * Serialize tasks with enhanced YAML structure
   * @private
   */
  serializeTasks(tasks) {
    return tasks.map((task) => {
      const serializedTask = {
        id: task.id,
        title: task.title,
        status: task.status || 'ready',
      };

      if (task.agent) serializedTask.agent = task.agent;
      if (task.effort) serializedTask.effort = task.effort;
      if (typeof task.progress === 'number')
        serializedTask.progress = task.progress;
      if (task.started) serializedTask.started = this.formatDate(task.started);
      if (task.completed)
        serializedTask.completed = this.formatDate(task.completed);
      if (task.estimated_completion)
        serializedTask.estimated_completion = this.formatDate(
          task.estimated_completion
        );

      // Add subtasks if they exist
      if (task.subtasks && task.subtasks.length > 0) {
        serializedTask.subtasks = task.subtasks.map((subtask) => ({
          description: subtask.description || subtask.title,
          completed: Boolean(subtask.completed),
        }));
      }

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
        if (spec.reproductionSteps && spec.reproductionSteps.trim()) {
          cleanSpec.reproductionSteps = this.formatMultilineString(
            spec.reproductionSteps
          );
        }
        if (spec.rootCause && spec.rootCause.trim()) {
          cleanSpec.rootCause = this.formatMultilineString(spec.rootCause);
        }
        if (spec.proposedSolution && spec.proposedSolution.trim()) {
          cleanSpec.proposedSolution = this.formatMultilineString(
            spec.proposedSolution
          );
        }
        if (spec.environment) cleanSpec.environment = spec.environment;
        break;

      case 'SPIKE':
        if (spec.researchType) cleanSpec.researchType = spec.researchType;
        if (spec.researchQuestion && spec.researchQuestion.trim()) {
          cleanSpec.researchQuestion = this.formatMultilineString(
            spec.researchQuestion
          );
        }
        if (spec.researchFindings && spec.researchFindings.trim()) {
          cleanSpec.researchFindings = this.formatMultilineString(
            spec.researchFindings
          );
        }
        break;
    }
  }

  /**
   * Format date for YAML output
   * @private
   */
  formatDate(date) {
    if (!date) return null;

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;

    // YAML typically uses ISO format
    return dateObj.toISOString();
  }

  /**
   * Query specifications using YAML-specific patterns
   * @param {Array} specs - Array of specification objects
   * @param {string} query - Query string
   * @returns {Array} Filtered specifications
   */
  query(specs, query) {
    // Support YAML-style queries
    if (query.includes('status:')) {
      const status = query.match(/status:\s*([^\s,]+)/)?.[1];
      if (status) {
        return specs.filter((spec) => spec.status === status);
      }
    }

    if (query.includes('priority:')) {
      const priority = query.match(/priority:\s*([^\s,]+)/)?.[1];
      if (priority) {
        return specs.filter((spec) => spec.priority === priority);
      }
    }

    if (query.includes('type:')) {
      const type = query.match(/type:\s*([^\s,]+)/)?.[1];
      if (type) {
        return specs.filter((spec) => spec.type === type);
      }
    }

    // Support tag queries
    if (query.includes('tags:')) {
      const tag = query.match(/tags:\s*([^\s,]+)/)?.[1];
      if (tag) {
        return specs.filter((spec) => spec.tags && spec.tags.includes(tag));
      }
    }

    return specs; // Return all if no matching query
  }

  /**
   * Validate YAML structure and provide suggestions
   * @param {string} content - YAML content to validate
   * @returns {Object} Validation result with suggestions
   */
  validateYAML(content) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    try {
      yaml.load(content, {
        onWarning: (warning) => {
          result.warnings.push({
            message: warning.message,
            line: warning.mark?.line,
            column: warning.mark?.column,
          });
        },
      });
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        message: error.message,
        line: error.mark?.line,
        column: error.mark?.column,
      });
    }

    // Add formatting suggestions
    if (content.includes('\t')) {
      result.suggestions.push(
        'Consider using spaces instead of tabs for indentation'
      );
    }

    if (!/^---\s*$/m.test(content)) {
      result.suggestions.push(
        'Consider adding document separator (---) at the beginning'
      );
    }

    return result;
  }
}

module.exports = YAMLDataAdapter;
