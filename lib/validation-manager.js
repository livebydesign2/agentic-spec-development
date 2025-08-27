const fs = require('fs').promises;
const SpecParser = require('./feature-parser');
const ConfigManager = require('./config-manager');

/**
 * ValidationManager - Core validation framework for ASD specifications
 *
 * Provides comprehensive validation of spec files, task structures, and workflow consistency
 * with extensible validation rules, auto-fixing capabilities, and detailed error reporting.
 *
 * Features:
 * - Pluggable validation rule system with clear interfaces
 * - High-performance validation with caching and batching
 * - Auto-fixing for common issues with user confirmation
 * - Quality gate enforcement for workflow operations
 * - Detailed error reporting with file locations and fix suggestions
 */
class ValidationManager {
  constructor(configManager = null, specParser = null) {
    this.configManager = configManager || new ConfigManager();
    this.specParser = specParser || new SpecParser(this.configManager);

    // Validation rule registry - organized by category
    this.rules = new Map();
    this.ruleCategories = ['spec', 'task', 'workflow', 'consistency'];

    // Performance and caching
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    this.performanceThreshold = 2000; // 2 seconds per FEAT-019 requirement

    // Auto-fixing configuration
    this.autoFixingEnabled = true;
    this.confirmationRequired = true; // Require confirmation for non-trivial fixes

    // Initialize built-in validation rules
    this._initializeBuiltInRules();
  }

  /**
   * Initialize the validation manager and load configuration
   * @returns {Promise<boolean>} Initialization success status
   */
  async initialize() {
    const startTime = Date.now();

    try {
      // Load specifications for validation context
      await this.specParser.loadSpecs();

      // Load validation configuration
      const config = this.configManager.loadConfig();
      this.validationConfig = config.validation || {};

      // Configure performance settings
      this.performanceThreshold = this.validationConfig.performanceThreshold || 2000;
      this.autoFixingEnabled = this.validationConfig.autoFixing !== false;
      this.confirmationRequired = this.validationConfig.requireConfirmation !== false;

      const initTime = Date.now() - startTime;
      if (initTime > 100) {
        console.warn(`ValidationManager initialization took ${initTime}ms`);
      }

      return true;
    } catch (error) {
      throw new Error(`ValidationManager initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate entire project with comprehensive checks
   * @param {Object} options - Validation options
   * @returns {Promise<ValidationResult>} Complete validation results
   */
  async validateProject() {
    const startTime = Date.now();

    try {
      const results = {
        valid: true,
        errors: [],
        warnings: [],
        info: [],
        performance: {},
        summary: {},
        fixable: [],
      };

      // Load fresh spec data
      await this.specParser.loadSpecs();
      const specs = this.specParser.getSpecs();

      // Validate each specification
      for (const spec of specs) {
        const specResult = await this.validateSpec(spec.filePath, { skipCache: true });
        this._mergeResults(results, specResult, spec.id);
      }

      // Run consistency checks across all specs
      const consistencyResult = await this.validateConsistency(specs);
      this._mergeResults(results, consistencyResult, 'consistency');

      // Generate summary
      results.summary = {
        total_specs: specs.length,
        errors: results.errors.length,
        warnings: results.warnings.length,
        info: results.info.length,
        fixable_issues: results.fixable.length,
        validation_time: Date.now() - startTime,
      };

      results.performance.total = Date.now() - startTime;

      // Check performance threshold
      if (results.performance.total > this.performanceThreshold) {
        results.warnings.push({
          type: 'performance',
          message: `Validation took ${results.performance.total}ms, exceeding ${this.performanceThreshold}ms threshold`,
          category: 'performance',
        });
      }

      return results;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'system',
          message: `Project validation failed: ${error.message}`,
          category: 'system',
        }],
        warnings: [],
        info: [],
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Validate a single specification file
   * @param {string} specPath - Path to specification file
   * @param {Object} options - Validation options
   * @returns {Promise<ValidationResult>} Validation results for the spec
   */
  async validateSpec(specPath, options = {}) {
    const startTime = Date.now();

    try {
      // Check cache first (unless skipCache is specified)
      const cacheKey = `spec_${specPath}`;
      if (!options.skipCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.result;
        }
      }

      const results = {
        valid: true,
        errors: [],
        warnings: [],
        info: [],
        fixable: [],
        filePath: specPath,
        performance: {},
      };

      // Parse the specification
      const spec = await this._parseSpecForValidation(specPath);
      if (!spec) {
        results.errors.push({
          type: 'parse_error',
          message: 'Failed to parse specification file',
          file: specPath,
          category: 'spec',
        });
        results.valid = false;
        return results;
      }

      // Run spec-category validation rules
      const specRules = this._getRulesByCategory('spec');
      for (const rule of specRules) {
        try {
          const ruleResult = await rule.validate(spec, this._getValidationContext());
          if (ruleResult && !ruleResult.valid) {
            this._processRuleResult(results, ruleResult, rule);
          }
        } catch (error) {
          results.warnings.push({
            type: 'rule_error',
            message: `Validation rule ${rule.name} failed: ${error.message}`,
            category: 'system',
            rule: rule.name,
          });
        }
      }

      // Validate tasks if present
      if (spec.tasks && Array.isArray(spec.tasks)) {
        for (const task of spec.tasks) {
          const taskResult = await this.validateTask(spec.id, task.id, { task, spec });
          this._mergeResults(results, taskResult, `${spec.id}:${task.id}`);
        }
      }

      results.performance.total = Date.now() - startTime;

      // Cache the result
      this.cache.set(cacheKey, {
        result: results,
        timestamp: Date.now(),
      });

      return results;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'validation_error',
          message: `Spec validation failed: ${error.message}`,
          file: specPath,
          category: 'system',
        }],
        warnings: [],
        info: [],
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Validate a specific task structure and dependencies
   * @param {string} specId - Specification ID containing the task
   * @param {string} taskId - Task ID to validate
   * @param {Object} context - Additional validation context
   * @returns {Promise<ValidationResult>} Task validation results
   */
  async validateTask(specId, taskId, context = {}) {
    const startTime = Date.now();

    try {
      const results = {
        valid: true,
        errors: [],
        warnings: [],
        info: [],
        fixable: [],
        taskId: taskId,
        performance: {},
      };

      // Get task data from context or load it
      let task = context.task;
      let spec = context.spec;

      if (!task || !spec) {
        const specs = this.specParser.getSpecs();
        spec = specs.find(s => s.id === specId);
        if (!spec) {
          results.valid = false;
          results.errors.push({
            type: 'spec_not_found',
            message: `Specification ${specId} not found`,
            category: 'task',
          });
          return results;
        }

        task = spec.tasks?.find(t => t.id === taskId);
        if (!task) {
          results.valid = false;
          results.errors.push({
            type: 'task_not_found',
            message: `Task ${taskId} not found in specification ${specId}`,
            category: 'task',
          });
          return results;
        }
      }

      // Run task-category validation rules
      const taskRules = this._getRulesByCategory('task');
      const validationContext = this._getValidationContext();
      validationContext.spec = spec;
      validationContext.allSpecs = this.specParser.getSpecs();

      for (const rule of taskRules) {
        try {
          const ruleResult = await rule.validate(task, validationContext);
          if (ruleResult && !ruleResult.valid) {
            this._processRuleResult(results, ruleResult, rule);
          }
        } catch (error) {
          results.warnings.push({
            type: 'rule_error',
            message: `Task validation rule ${rule.name} failed: ${error.message}`,
            category: 'system',
            rule: rule.name,
          });
        }
      }

      results.performance.total = Date.now() - startTime;
      return results;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'task_validation_error',
          message: `Task validation failed: ${error.message}`,
          category: 'system',
        }],
        warnings: [],
        info: [],
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Validate workflow operations for quality gates
   * @param {string} operation - Operation type (assignment, completion, transition)
   * @param {Object} data - Operation data to validate
   * @returns {Promise<ValidationResult>} Workflow validation results
   */
  async validateWorkflowOperation(operation, data) {
    const startTime = Date.now();

    try {
      const results = {
        valid: true,
        errors: [],
        warnings: [],
        info: [],
        operation: operation,
        performance: {},
      };

      // Run workflow validation rules
      const workflowRules = this._getRulesByCategory('workflow');
      const validationContext = this._getValidationContext();
      validationContext.operation = operation;
      validationContext.operationData = data;

      for (const rule of workflowRules) {
        try {
          const ruleResult = await rule.validate(data, validationContext);
          if (ruleResult && !ruleResult.valid) {
            this._processRuleResult(results, ruleResult, rule);
          }
        } catch (error) {
          results.warnings.push({
            type: 'rule_error',
            message: `Workflow validation rule ${rule.name} failed: ${error.message}`,
            category: 'system',
            rule: rule.name,
          });
        }
      }

      results.performance.total = Date.now() - startTime;
      return results;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'workflow_validation_error',
          message: `Workflow validation failed: ${error.message}`,
          category: 'system',
        }],
        warnings: [],
        info: [],
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Validate consistency across all specifications
   * @param {Array} specs - Array of all specifications
   * @returns {Promise<ValidationResult>} Consistency validation results
   */
  async validateConsistency(specs) {
    const startTime = Date.now();

    try {
      const results = {
        valid: true,
        errors: [],
        warnings: [],
        info: [],
        fixable: [],
        performance: {},
      };

      // Run consistency validation rules
      const consistencyRules = this._getRulesByCategory('consistency');
      const validationContext = this._getValidationContext();
      validationContext.allSpecs = specs;

      for (const rule of consistencyRules) {
        try {
          const ruleResult = await rule.validate(specs, validationContext);
          if (ruleResult && !ruleResult.valid) {
            this._processRuleResult(results, ruleResult, rule);
          }
        } catch (error) {
          results.warnings.push({
            type: 'rule_error',
            message: `Consistency validation rule ${rule.name} failed: ${error.message}`,
            category: 'system',
            rule: rule.name,
          });
        }
      }

      results.performance.total = Date.now() - startTime;
      return results;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'consistency_validation_error',
          message: `Consistency validation failed: ${error.message}`,
          category: 'system',
        }],
        warnings: [],
        info: [],
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Register a new validation rule
   * @param {string} name - Rule name
   * @param {ValidationRule} rule - Rule implementation
   * @returns {boolean} Registration success
   */
  registerRule(name, rule) {
    try {
      if (!rule || typeof rule.validate !== 'function') {
        throw new Error('Rule must have a validate method');
      }

      if (!rule.category || !this.ruleCategories.includes(rule.category)) {
        throw new Error(`Rule must have a valid category: ${this.ruleCategories.join(', ')}`);
      }

      rule.name = name; // Ensure rule has a name
      this.rules.set(name, rule);
      return true;
    } catch (error) {
      console.warn(`Failed to register validation rule ${name}: ${error.message}`);
      return false;
    }
  }

  /**
   * Unregister a validation rule
   * @param {string} name - Rule name to remove
   * @returns {boolean} Unregistration success
   */
  unregisterRule(name) {
    return this.rules.delete(name);
  }

  /**
   * Get all registered rules, optionally filtered by category
   * @param {string} category - Optional category filter
   * @returns {Array} Array of validation rules
   */
  getRules(category = null) {
    const allRules = Array.from(this.rules.values());
    return category ? allRules.filter(rule => rule.category === category) : allRules;
  }

  /**
   * Auto-fix validation issues with user confirmation
   * @param {ValidationResult} validationResults - Results containing fixable issues
   * @param {Object} options - Auto-fixing options
   * @returns {Promise<Object>} Auto-fixing results
   */
  async autoFix(validationResults, options = {}) {
    const startTime = Date.now();

    try {
      const results = {
        success: true,
        fixed: [],
        skipped: [],
        failed: [],
        performance: {},
      };

      if (!validationResults.fixable || validationResults.fixable.length === 0) {
        return {
          ...results,
          message: 'No fixable issues found',
          performance: { total: Date.now() - startTime },
        };
      }

      // Group fixable issues by file for batch processing
      const fixableByFile = new Map();
      for (const issue of validationResults.fixable) {
        const filePath = issue.file || issue.filePath;
        if (!filePath) continue;

        if (!fixableByFile.has(filePath)) {
          fixableByFile.set(filePath, []);
        }
        fixableByFile.get(filePath).push(issue);
      }

      // Process fixes file by file
      for (const [filePath, issues] of fixableByFile) {
        try {
          const fileResult = await this._autoFixFile(filePath, issues, options);
          results.fixed.push(...fileResult.fixed);
          results.skipped.push(...fileResult.skipped);
          results.failed.push(...fileResult.failed);
        } catch (error) {
          results.failed.push({
            file: filePath,
            error: error.message,
            issues: issues.length,
          });
        }
      }

      results.performance.total = Date.now() - startTime;
      return results;
    } catch (error) {
      return {
        success: false,
        error: `Auto-fixing failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Get fix suggestions for validation errors
   * @param {Object} error - Validation error
   * @returns {Array} Array of fix suggestions
   */
  getFixSuggestions(error) {
    try {
      const ruleName = error.rule;
      const rule = this.rules.get(ruleName);

      if (rule && typeof rule.getFixSuggestion === 'function') {
        return rule.getFixSuggestion(error);
      }

      // Default suggestions based on error type
      const suggestions = [];

      switch (error.type) {
        case 'missing_required_field':
          suggestions.push(`Add the missing field '${error.field}' to the frontmatter`);
          break;
        case 'invalid_id_format':
          suggestions.push(`Update ID to follow pattern: ${error.expectedPattern}`);
          break;
        case 'invalid_priority':
          suggestions.push('Change priority to one of: P0, P1, P2, P3');
          break;
        case 'invalid_dependencies':
          suggestions.push(`Remove invalid dependencies: ${error.invalidDeps?.join(', ')}`);
          break;
        case 'circular_dependency':
          suggestions.push('Remove circular dependency in task chain');
          break;
        default:
          suggestions.push('Manual review and correction required');
      }

      return suggestions;
    } catch (error) {
      return ['Unable to generate fix suggestions'];
    }
  }

  /**
   * Preview what would be fixed without making changes
   * @param {ValidationResult} validationResults - Results to preview fixes for
   * @returns {Promise<Object>} Preview of potential fixes
   */
  async previewFixes(validationResults) {
    const startTime = Date.now();

    try {
      const preview = {
        fixable_count: 0,
        fixes: [],
        non_fixable: [],
        performance: {},
      };

      if (!validationResults.fixable || validationResults.fixable.length === 0) {
        return {
          ...preview,
          message: 'No fixable issues found',
          performance: { total: Date.now() - startTime },
        };
      }

      for (const issue of validationResults.fixable) {
        const rule = this.rules.get(issue.rule);

        if (rule && typeof rule.canAutoFix === 'function' && rule.canAutoFix(issue)) {
          preview.fixable_count++;
          preview.fixes.push({
            type: issue.type,
            description: issue.message,
            file: issue.file,
            fix_type: rule.getFixType ? rule.getFixType(issue) : 'automatic',
            suggestions: this.getFixSuggestions(issue),
          });
        } else {
          preview.non_fixable.push({
            type: issue.type,
            description: issue.message,
            file: issue.file,
            reason: 'Manual correction required',
          });
        }
      }

      preview.performance.total = Date.now() - startTime;
      return preview;
    } catch (error) {
      return {
        error: `Fix preview failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Enforce quality gate for workflow operations
   * @param {string} operation - Operation type
   * @param {Object} data - Operation data
   * @returns {Promise<Object>} Quality gate enforcement result
   */
  async enforceQualityGate(operation, data) {
    try {
      const validationResult = await this.validateWorkflowOperation(operation, data);

      if (!validationResult.valid) {
        return {
          allowed: false,
          reason: 'Quality gate validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        };
      }

      return {
        allowed: true,
        validation: validationResult,
      };
    } catch (error) {
      return {
        allowed: false,
        reason: 'Quality gate enforcement failed',
        error: error.message,
      };
    }
  }

  /**
   * Clear validation cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get validation statistics
   * @returns {Object} Validation statistics
   */
  getStats() {
    return {
      registered_rules: this.rules.size,
      cache_size: this.cache.size,
      categories: this.ruleCategories,
      auto_fixing_enabled: this.autoFixingEnabled,
      performance_threshold: this.performanceThreshold,
    };
  }

  // Private helper methods

  /**
   * Initialize built-in validation rules
   * @private
   */
  _initializeBuiltInRules() {
    // Import and register built-in validation rules
    const ValidationRules = require('./validation-rules');

    // Register spec validation rules
    this.registerRule('required-fields', new ValidationRules.RequiredFieldsRule());
    this.registerRule('id-format', new ValidationRules.IDFormatRule());
    this.registerRule('priority-validation', new ValidationRules.PriorityValidationRule());
    this.registerRule('status-validation', new ValidationRules.StatusValidationRule());

    // Register task validation rules
    this.registerRule('task-dependencies', new ValidationRules.TaskDependencyRule());
    this.registerRule('agent-type-validation', new ValidationRules.AgentTypeValidationRule());
    this.registerRule('task-structure', new ValidationRules.TaskStructureRule());

    // Register consistency validation rules
    this.registerRule('id-uniqueness', new ValidationRules.IDUniquenessRule());
    this.registerRule('dependency-validation', new ValidationRules.DependencyValidationRule());

    // Register workflow validation rules
    this.registerRule('assignment-validation', new ValidationRules.AssignmentValidationRule());
    this.registerRule('transition-validation', new ValidationRules.TransitionValidationRule());
  }

  /**
   * Get rules by category
   * @private
   */
  _getRulesByCategory(category) {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }

  /**
   * Get validation context for rules
   * @private
   */
  _getValidationContext() {
    return {
      configManager: this.configManager,
      specParser: this.specParser,
      supportedTypes: this.configManager.get('supportedTypes', []),
      statusFolders: this.configManager.get('statusFolders', []),
      priorities: this.configManager.get('priorities', []),
    };
  }

  /**
   * Parse specification file for validation
   * @private
   */
  async _parseSpecForValidation(specPath) {
    try {
      // Use the existing spec parser but get raw spec data
      const specs = this.specParser.getSpecs();
      const spec = specs.find(s => s.filePath === specPath);
      return spec;
    } catch (error) {
      console.warn(`Failed to parse spec for validation: ${error.message}`);
      return null;
    }
  }

  /**
   * Process validation rule result
   * @private
   */
  _processRuleResult(results, ruleResult, rule) {
    if (ruleResult.errors) {
      for (const error of ruleResult.errors) {
        error.rule = rule.name;
        error.category = error.category || rule.category;
        results.errors.push(error);
      }
      results.valid = false;
    }

    if (ruleResult.warnings) {
      for (const warning of ruleResult.warnings) {
        warning.rule = rule.name;
        warning.category = warning.category || rule.category;
        results.warnings.push(warning);
      }
    }

    if (ruleResult.info) {
      for (const info of ruleResult.info) {
        info.rule = rule.name;
        info.category = info.category || rule.category;
        results.info.push(info);
      }
    }

    // Check for fixable issues
    if (rule.canAutoFix && ruleResult.errors) {
      for (const error of ruleResult.errors) {
        if (rule.canAutoFix(error)) {
          results.fixable.push(error);
        }
      }
    }
  }

  /**
   * Merge validation results
   * @private
   */
  _mergeResults(target, source, context) {
    if (!source) return;

    if (source.errors) {
      target.errors.push(...source.errors.map(e => ({ ...e, context })));
      if (source.errors.length > 0) target.valid = false;
    }

    if (source.warnings) {
      target.warnings.push(...source.warnings.map(w => ({ ...w, context })));
    }

    if (source.info) {
      target.info.push(...source.info.map(i => ({ ...i, context })));
    }

    if (source.fixable) {
      target.fixable.push(...source.fixable.map(f => ({ ...f, context })));
    }
  }

  /**
   * Auto-fix issues in a single file
   * @private
   */
  async _autoFixFile(filePath, issues, options) {
    const results = {
      fixed: [],
      skipped: [],
      failed: [],
    };

    try {
      let fileContent = await fs.readFile(filePath, 'utf-8');
      let hasChanges = false;

      for (const issue of issues) {
        try {
          const rule = this.rules.get(issue.rule);

          if (!rule || !rule.canAutoFix || !rule.canAutoFix(issue)) {
            results.skipped.push({
              issue: issue.type,
              reason: 'Not auto-fixable',
            });
            continue;
          }

          // Check if confirmation is required for non-trivial fixes
          if (this.confirmationRequired && !options.skipConfirmation) {
            const isTrivia = rule.isTrivialFix && rule.isTrivialFix(issue);
            if (!isTrivia && !options.confirmed) {
              results.skipped.push({
                issue: issue.type,
                reason: 'Confirmation required',
              });
              continue;
            }
          }

          // Apply the fix
          const fixedContent = await rule.autoFix(fileContent, issue);
          if (fixedContent && fixedContent !== fileContent) {
            fileContent = fixedContent;
            hasChanges = true;
            results.fixed.push({
              issue: issue.type,
              description: issue.message,
            });
          } else {
            results.skipped.push({
              issue: issue.type,
              reason: 'No changes made by fix',
            });
          }
        } catch (error) {
          results.failed.push({
            issue: issue.type,
            error: error.message,
          });
        }
      }

      // Write changes if any were made
      if (hasChanges) {
        await fs.writeFile(filePath, fileContent, 'utf-8');
      }

    } catch (error) {
      throw new Error(`Failed to auto-fix file ${filePath}: ${error.message}`);
    }

    return results;
  }
}

module.exports = ValidationManager;