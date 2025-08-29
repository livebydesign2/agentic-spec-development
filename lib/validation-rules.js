/**
 * Validation Rules - Extensible validation rule implementations for ASD
 *
 * Provides base classes and built-in validation rules for spec files, task structures,
 * consistency checking, and workflow operations. Each rule implements auto-fixing
 * capabilities where safe and appropriate.
 */

/**
 * Base ValidationRule class - Interface for all validation rules
 */
class ValidationRule {
  constructor(name, category, severity = 'error') {
    this.name = name;
    this.category = category; // 'spec', 'task', 'workflow', 'consistency'
    this.severity = severity; // 'error', 'warning', 'info'
  }

  /**
   * Validate data using this rule
   * @param {*} data - Data to validate
   * @param {Object} _context - Validation _context
   * @returns {Promise<ValidationRuleResult>} Validation result
   */
  async validate(_data, __context) {
    throw new Error('Subclasses must implement validate method');
  }

  /**
   * Check if this rule can auto-fix the given error
   * @param {Object} error - Error object
   * @returns {boolean} Whether the error can be auto-fixed
   */
  canAutoFix(_error) {
    return false; // Default: no auto-fixing unless implemented
  }

  /**
   * Auto-fix the error in the given content
   * @param {string} content - File content
   * @param {Object} error - Error to fix
   * @returns {Promise<string>} Fixed content
   */
  async autoFix(_content, _error) {
    throw new Error('Auto-fix not implemented for this rule');
  }

  /**
   * Check if the fix is trivial (doesn't require user confirmation)
   * @param {Object} error - Error to check
   * @returns {boolean} Whether the fix is trivial
   */
  isTrivialFix(_error) {
    return false; // Default: require confirmation unless specified
  }

  /**
   * Get fix type for the error
   * @param {Object} error - Error object
   * @returns {string} Fix type ('automatic', 'suggested', 'manual')
   */
  getFixType(error) {
    return this.canAutoFix(error) ? 'automatic' : 'manual';
  }

  /**
   * Get description of this rule
   * @returns {string} Rule description
   */
  getDescription() {
    return `${this.name} validation rule`;
  }

  /**
   * Get fix suggestion for the error
   * @param {Object} error - Error object
   * @returns {Array} Array of fix suggestions
   */
  getFixSuggestion(_error) {
    return ['Manual correction required'];
  }
}

/**
 * Required Fields Validation Rule - Ensures all required frontmatter fields are present
 */
class RequiredFieldsRule extends ValidationRule {
  constructor() {
    super('required-fields', 'spec', 'error');
    this.requiredFields = ['id', 'title', 'type', 'status', 'priority'];
  }

  async validate(spec) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    for (const field of this.requiredFields) {
      if (!spec[field]) {
        result.valid = false;
        result.errors.push({
          type: 'missing_required_field',
          field: field,
          message: `Missing required field: ${field}`,
          file: spec.filePath,
          severity: this.severity,
        });
      }
    }

    return result;
  }

  canAutoFix(error) {
    // Can auto-fix some missing fields with reasonable defaults
    const autoFixableFields = ['priority', 'created', 'estimated_hours'];
    return (
      error.type === 'missing_required_field' &&
      autoFixableFields.includes(error.field)
    );
  }

  isTrivialFix(error) {
    return error.field === 'priority' || error.field === 'estimated_hours';
  }

  async autoFix(content, error) {
    if (!this.canAutoFix(error)) return content;

    const field = error.field;
    const lines = content.split('\n');
    let frontmatterEnd = -1;

    // Find frontmatter end
    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          frontmatterEnd = i;
          break;
        }
      }
    }

    if (frontmatterEnd === -1) {
      // No frontmatter, add it
      const defaultValue = this._getDefaultValue(field);
      const frontmatter = ['---', `${field}: ${defaultValue}`, '---', ''];
      return frontmatter.concat(lines).join('\n');
    }

    // Add to existing frontmatter
    const defaultValue = this._getDefaultValue(field);
    lines.splice(frontmatterEnd, 0, `${field}: ${defaultValue}`);
    return lines.join('\n');
  }

  _getDefaultValue(field) {
    switch (field) {
      case 'priority':
        return 'P2';
      case 'created':
        return `"${new Date().toISOString()}"`;
      case 'estimated_hours':
        return 4;
      default:
        return '""';
    }
  }

  getFixSuggestion(error) {
    if (this.canAutoFix(error)) {
      return [
        `Add ${error.field}: ${this._getDefaultValue(
          error.field
        )} to the frontmatter`,
      ];
    }
    return [`Add the required field '${error.field}' to the frontmatter`];
  }
}

/**
 * ID Format Validation Rule - Ensures spec IDs follow the correct pattern
 */
class IDFormatRule extends ValidationRule {
  constructor() {
    super('id-format', 'spec', 'error');
  }

  async validate(spec, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!spec.id) {
      return result; // Required fields rule will catch this
    }

    const supportedTypes = _context.supportedTypes || [
      'SPEC',
      'FEAT',
      'BUG',
      'SPIKE',
      'MAINT',
      'RELEASE',
    ];
    const pattern = new RegExp(`^(${supportedTypes.join('|')})-\\d{3}$`);

    if (!pattern.test(spec.id)) {
      result.valid = false;
      result.errors.push({
        type: 'invalid_id_format',
        message: `Invalid ID format: ${spec.id}. Expected pattern: TYPE-###`,
        file: spec.filePath,
        expectedPattern: `(${supportedTypes.join('|')})-###`,
        severity: this.severity,
      });
    }

    return result;
  }

  canAutoFix(error) {
    // Can attempt to fix some common ID format issues
    return error.type === 'invalid_id_format';
  }

  async autoFix(content, _error) {
    // This is a complex fix that might need user input, so we'll skip for now
    return content;
  }

  getFixSuggestion(error) {
    return [
      `Update ID to follow the pattern: ${error.expectedPattern}`,
      'Examples: FEAT-001, BUG-042, SPEC-123',
    ];
  }
}

/**
 * Priority Validation Rule - Ensures priority values are valid
 */
class PriorityValidationRule extends ValidationRule {
  constructor() {
    super('priority-validation', 'spec', 'error');
  }

  async validate(spec, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!spec.priority) {
      return result; // Required fields rule will catch this
    }

    const validPriorities = _context.priorities || ['P0', 'P1', 'P2', 'P3'];
    if (!validPriorities.includes(spec.priority)) {
      result.valid = false;
      result.errors.push({
        type: 'invalid_priority',
        message: `Invalid priority: ${
          spec.priority
        }. Must be one of: ${validPriorities.join(', ')}`,
        file: spec.filePath,
        validValues: validPriorities,
        severity: this.severity,
      });
    }

    return result;
  }

  canAutoFix(error) {
    return error.type === 'invalid_priority';
  }

  isTrivialFix(_error) {
    return true; // Priority normalization is trivial
  }

  async autoFix(content, _error) {
    // Attempt to normalize common priority formats
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^priority:/i)) {
        // Normalize common formats
        let normalized = line
          .replace(/priority:\s*(high|critical)/i, 'priority: P0')
          .replace(/priority:\s*(urgent|important)/i, 'priority: P1')
          .replace(/priority:\s*(normal|medium)/i, 'priority: P2')
          .replace(/priority:\s*(low|minor)/i, 'priority: P3')
          .replace(
            /priority:\s*p([0-3])/i,
            (match, num) => `priority: P${num}`
          );

        if (normalized !== line) {
          lines[i] = normalized;
          return lines.join('\n');
        }
      }
    }

    return content;
  }

  getFixSuggestion(error) {
    return [
      `Change priority to one of: ${error.validValues.join(', ')}`,
      'Use P0 for critical, P1 for high, P2 for normal, P3 for low priority',
    ];
  }
}

/**
 * Status Validation Rule - Ensures status values are valid
 */
class StatusValidationRule extends ValidationRule {
  constructor() {
    super('status-validation', 'spec', 'error');
  }

  async validate(spec, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!spec.status) {
      return result;
    }

    const validStatuses = _context.statusFolders || [
      'active',
      'backlog',
      'done',
    ];
    if (!validStatuses.includes(spec.status)) {
      result.valid = false;
      result.errors.push({
        type: 'invalid_status',
        message: `Invalid status: ${
          spec.status
        }. Must be one of: ${validStatuses.join(', ')}`,
        file: spec.filePath,
        validValues: validStatuses,
        severity: this.severity,
      });
    }

    return result;
  }

  canAutoFix(error) {
    return error.type === 'invalid_status';
  }

  isTrivialFix(_error) {
    return true;
  }

  async autoFix(content, _error) {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^status:/i)) {
        // Normalize common status formats
        let normalized = line
          .replace(
            /status:\s*(in.progress|in_progress|inprogress)/i,
            'status: active'
          )
          .replace(/status:\s*(complete|completed|finished)/i, 'status: done')
          .replace(/status:\s*(todo|pending|new)/i, 'status: backlog');

        if (normalized !== line) {
          lines[i] = normalized;
          return lines.join('\n');
        }
      }
    }

    return content;
  }

  getFixSuggestion(error) {
    return [
      `Change status to one of: ${error.validValues.join(', ')}`,
      'Use active for in-progress work, backlog for pending, done for completed',
    ];
  }
}

/**
 * Task Dependency Validation Rule - Validates task dependencies
 */
class TaskDependencyRule extends ValidationRule {
  constructor() {
    super('task-dependencies', 'task', 'error');
  }

  async validate(task, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!task.depends_on || !Array.isArray(task.depends_on)) {
      return result;
    }

    // Get all tasks from the spec and other specs
    const allTasks = new Set();

    // Add tasks from current spec
    if (_context.spec && _context.spec.tasks) {
      for (const specTask of _context.spec.tasks) {
        allTasks.add(specTask.id);
      }
    }

    // Add tasks from all specs if available
    if (_context.allSpecs) {
      for (const spec of _context.allSpecs) {
        if (spec.tasks) {
          for (const specTask of spec.tasks) {
            allTasks.add(specTask.id);
          }
        }
      }
    }

    // Check for invalid dependencies
    const invalidDeps = task.depends_on.filter((dep) => !allTasks.has(dep));
    if (invalidDeps.length > 0) {
      result.valid = false;
      result.errors.push({
        type: 'invalid_dependencies',
        message: `Invalid task dependencies: ${invalidDeps.join(', ')}`,
        invalidDeps: invalidDeps,
        taskId: task.id,
        severity: this.severity,
      });
    }

    // Check for circular dependencies
    if (this._hasCircularDependency(task, _context)) {
      result.valid = false;
      result.errors.push({
        type: 'circular_dependency',
        message: `Circular dependency detected for task ${task.id}`,
        taskId: task.id,
        severity: this.severity,
      });
    }

    return result;
  }

  _hasCircularDependency(task, _context) {
    const visited = new Set();
    const visiting = new Set();

    const visit = (taskId) => {
      if (visiting.has(taskId)) return true; // Circular dependency found
      if (visited.has(taskId)) return false;

      visiting.add(taskId);

      // Find the task and check its dependencies
      let taskToCheck = null;
      if (_context.spec && _context.spec.tasks) {
        taskToCheck = _context.spec.tasks.find((t) => t.id === taskId);
      }

      if (taskToCheck && taskToCheck.depends_on) {
        for (const dep of taskToCheck.depends_on) {
          if (visit(dep)) return true;
        }
      }

      visiting.delete(taskId);
      visited.add(taskId);
      return false;
    };

    return visit(task.id);
  }

  getFixSuggestion(error) {
    if (error.type === 'invalid_dependencies') {
      return [
        `Remove invalid dependencies: ${error.invalidDeps.join(', ')}`,
        'Ensure all dependency task IDs exist in the project',
      ];
    } else if (error.type === 'circular_dependency') {
      return [
        'Remove circular dependency by breaking the dependency chain',
        'Review task dependencies to ensure they form a directed acyclic graph',
      ];
    }
    return ['Review and fix task dependencies'];
  }
}

/**
 * Agent Type Validation Rule - Validates agent types are recognized
 */
class AgentTypeValidationRule extends ValidationRule {
  constructor() {
    super('agent-type-validation', 'task', 'warning');
  }

  async validate(task, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!task.agent_type) {
      result.warnings.push({
        type: 'missing_agent_type',
        message: `Task ${task.id} has no assigned agent type`,
        taskId: task.id,
        severity: 'warning',
      });
      return result;
    }

    // Define known agent types
    const knownAgentTypes = [
      'software-architect',
      'backend-specialist',
      'frontend-specialist',
      'cli-specialist',
      'devops-specialist',
      'qa-specialist',
      'data-specialist',
      'ai-specialist',
      'product-manager',
    ];

    if (!knownAgentTypes.includes(task.agent_type)) {
      result.warnings.push({
        type: 'unknown_agent_type',
        message: `Unknown agent type: ${task.agent_type}`,
        taskId: task.id,
        agentType: task.agent_type,
        knownTypes: knownAgentTypes,
        severity: 'warning',
      });
    }

    return result;
  }

  getFixSuggestion(error) {
    if (error.type === 'unknown_agent_type') {
      return [
        `Consider using a known agent type: ${error.knownTypes
          .slice(0, 5)
          .join(', ')}...`,
        'Or add the new agent type to the known types list',
      ];
    }
    return ['Assign an appropriate agent type to the task'];
  }
}

/**
 * Task Structure Validation Rule - Validates task structure is complete
 */
class TaskStructureRule extends ValidationRule {
  constructor() {
    super('task-structure', 'task', 'warning');
  }

  async validate(task, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Check for missing estimated hours
    if (!task.estimated_hours) {
      result.warnings.push({
        type: 'missing_estimated_hours',
        message: `Task ${task.id} has no estimated hours`,
        taskId: task.id,
        severity: 'warning',
      });
    }

    // Check for empty subtasks
    if (!task.subtasks || task.subtasks.length === 0) {
      result.warnings.push({
        type: 'no_subtasks',
        message: `Task ${task.id} has no subtasks defined`,
        taskId: task.id,
        severity: 'info',
      });
    }

    return result;
  }

  getFixSuggestion(error) {
    if (error.type === 'missing_estimated_hours') {
      return ['Add estimated_hours field to the task'];
    } else if (error.type === 'no_subtasks') {
      return ['Consider adding subtasks for better task breakdown'];
    }
    return ['Review and complete task structure'];
  }
}

/**
 * ID Uniqueness Validation Rule - Ensures all spec IDs are unique
 */
class IDUniquenessRule extends ValidationRule {
  constructor() {
    super('id-uniqueness', 'consistency', 'error');
  }

  async validate(specs, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const idCounts = new Map();

    // Count occurrences of each ID
    for (const spec of specs) {
      if (spec.id) {
        const count = idCounts.get(spec.id) || 0;
        idCounts.set(spec.id, count + 1);
      }
    }

    // Find duplicates
    for (const [id, count] of idCounts) {
      if (count > 1) {
        result.valid = false;
        const duplicateSpecs = specs.filter((s) => s.id === id);
        result.errors.push({
          type: 'duplicate_id',
          message: `Duplicate spec ID found: ${id} (appears ${count} times)`,
          duplicateId: id,
          files: duplicateSpecs.map((s) => s.filePath),
          severity: this.severity,
        });
      }
    }

    return result;
  }

  getFixSuggestion(error) {
    return [
      'Rename duplicate spec IDs to make them unique',
      `Affected files: ${error.files.join(', ')}`,
    ];
  }
}

/**
 * Dependency Validation Rule - Validates cross-spec dependencies
 */
class DependencyValidationRule extends ValidationRule {
  constructor() {
    super('dependency-validation', 'consistency', 'error');
  }

  async validate(specs, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const allSpecIds = new Set(specs.map((s) => s.id));

    // Check each spec's dependencies
    for (const spec of specs) {
      if (spec.dependencies && Array.isArray(spec.dependencies)) {
        const invalidDeps = spec.dependencies.filter(
          (dep) => !allSpecIds.has(dep)
        );

        if (invalidDeps.length > 0) {
          result.valid = false;
          result.errors.push({
            type: 'invalid_spec_dependencies',
            message: `Invalid spec dependencies in ${
              spec.id
            }: ${invalidDeps.join(', ')}`,
            specId: spec.id,
            file: spec.filePath,
            invalidDeps: invalidDeps,
            severity: this.severity,
          });
        }
      }
    }

    return result;
  }

  getFixSuggestion(error) {
    return [
      `Remove or correct invalid dependencies: ${error.invalidDeps.join(', ')}`,
      'Ensure all dependency spec IDs exist in the project',
    ];
  }
}

/**
 * Assignment Validation Rule - Validates task assignments
 */
class AssignmentValidationRule extends ValidationRule {
  constructor() {
    super('assignment-validation', 'workflow', 'error');
  }

  async validate(data, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (_context.operation !== 'assignment') {
      return result;
    }

    const { taskId, agentType, specId } = data;

    if (!taskId || !agentType || !specId) {
      result.valid = false;
      result.errors.push({
        type: 'incomplete_assignment_data',
        message: 'Assignment requires taskId, agentType, and specId',
        severity: this.severity,
      });
      return result;
    }

    // Check if task exists and is ready for assignment
    const specs = _context.specParser.getSpecs();
    const spec = specs.find((s) => s.id === specId);

    if (!spec) {
      result.valid = false;
      result.errors.push({
        type: 'spec_not_found',
        message: `Specification ${specId} not found`,
        specId: specId,
        severity: this.severity,
      });
      return result;
    }

    const task = spec.tasks?.find((t) => t.id === taskId);
    if (!task) {
      result.valid = false;
      result.errors.push({
        type: 'task_not_found',
        message: `Task ${taskId} not found in specification ${specId}`,
        taskId: taskId,
        specId: specId,
        severity: this.severity,
      });
      return result;
    }

    // Check if task is ready for assignment
    if (task.status === 'in_progress') {
      result.valid = false;
      result.errors.push({
        type: 'task_already_assigned',
        message: `Task ${taskId} is already in progress`,
        taskId: taskId,
        severity: this.severity,
      });
    }

    if (task.status === 'completed' || task.status === 'done') {
      result.valid = false;
      result.errors.push({
        type: 'task_already_completed',
        message: `Task ${taskId} is already completed`,
        taskId: taskId,
        severity: this.severity,
      });
    }

    return result;
  }

  getFixSuggestion(error) {
    switch (error.type) {
      case 'task_already_assigned':
        return ['Wait for current assignment to complete or reassign the task'];
      case 'task_already_completed':
        return ['Cannot assign completed tasks'];
      case 'task_not_found':
        return ['Verify task ID exists in the specification'];
      case 'spec_not_found':
        return ['Verify specification ID exists'];
      default:
        return ['Review assignment parameters'];
    }
  }
}

/**
 * Transition Validation Rule - Validates status transitions
 */
class TransitionValidationRule extends ValidationRule {
  constructor() {
    super('transition-validation', 'workflow', 'error');
  }

  async validate(data, _context) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (_context.operation !== 'transition') {
      return result;
    }

    const { fromStatus, toStatus } = data;

    // Define valid transitions
    const validTransitions = {
      backlog: ['active'],
      active: ['done', 'backlog'],
      done: [], // Terminal state
    };

    if (
      !validTransitions[fromStatus] ||
      !validTransitions[fromStatus].includes(toStatus)
    ) {
      result.valid = false;
      result.errors.push({
        type: 'invalid_status_transition',
        message: `Invalid status transition from ${fromStatus} to ${toStatus}`,
        fromStatus: fromStatus,
        toStatus: toStatus,
        validTransitions: validTransitions[fromStatus] || [],
        severity: this.severity,
      });
    }

    return result;
  }

  getFixSuggestion(error) {
    const valid =
      error.validTransitions.length > 0
        ? `Valid transitions: ${error.validTransitions.join(', ')}`
        : 'No valid transitions available';

    return [
      `Cannot transition from ${error.fromStatus} to ${error.toStatus}`,
      valid,
    ];
  }
}

module.exports = {
  ValidationRule,
  RequiredFieldsRule,
  IDFormatRule,
  PriorityValidationRule,
  StatusValidationRule,
  TaskDependencyRule,
  AgentTypeValidationRule,
  TaskStructureRule,
  IDUniquenessRule,
  DependencyValidationRule,
  AssignmentValidationRule,
  TransitionValidationRule,
};
