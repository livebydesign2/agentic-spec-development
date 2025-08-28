const Joi = require('joi');
const fs = require('fs').promises;
const path = require('path');

/**
 * Schema validation system for specification documents
 * Provides validation for JSON, YAML, and structured markdown data
 */
class SchemaValidator {
  constructor(config = {}) {
    this.config = config;
    this.customSchemas = new Map();
    this.initializeDefaultSchemas();
  }

  /**
   * Initialize default validation schemas
   * @private
   */
  initializeDefaultSchemas() {
    // Base specification schema
    this.baseSpecSchema = Joi.object({
      id: Joi.string().pattern(/^[A-Z]+-\d+$/).required()
        .messages({'string.pattern.base': 'ID must follow format: TYPE-000 (e.g., FEAT-001)'}),

      type: Joi.string().valid('SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE').required(),

      status: Joi.string().valid('active', 'backlog', 'done', 'blocked', 'draft').required(),

      title: Joi.string().min(1).max(200).required()
        .messages({'string.empty': 'Title cannot be empty'}),

      description: Joi.string().allow('').optional(),

      priority: Joi.string().valid('P0', 'P1', 'P2', 'P3').default('P2'),

      effort: Joi.string().optional(),

      assignee: Joi.string().optional(),

      phase: Joi.string().optional(),

      created: Joi.date().iso().optional(),

      updated: Joi.date().iso().optional(),

      tags: Joi.array().items(Joi.string()).default([]),

      dependencies: Joi.array().items(Joi.string().pattern(/^[A-Z]+-\d+$/)).default([]),

      blocking: Joi.array().items(Joi.string().pattern(/^[A-Z]+-\d+$/)).default([]),

      tasks: Joi.array().items(
        Joi.object({
          id: Joi.string().pattern(/^TASK-\d+$/).required(),
          title: Joi.string().required(),
          status: Joi.string().valid('ready', 'in_progress', 'complete', 'blocked').default('ready'),
          agent: Joi.string().optional(),
          effort: Joi.string().optional(),
          progress: Joi.number().min(0).max(100).optional(),
          started: Joi.date().iso().optional(),
          completed: Joi.date().iso().optional(),
          estimated_completion: Joi.date().iso().optional(),
          subtasks: Joi.array().items(
            Joi.object({
              description: Joi.string().required(),
              completed: Joi.boolean().default(false)
            })
          ).default([])
        })
      ).default([]),

      acceptance_criteria: Joi.array().items(Joi.string()).default([]),

      technical_notes: Joi.string().allow('').optional(),

      // Metadata fields (usually set by system)
      filePath: Joi.string().optional(),
      filename: Joi.string().optional(),
      createdAt: Joi.date().optional(),
      modifiedAt: Joi.date().optional(),
      warnings: Joi.array().items(Joi.string()).default([])
    });

    // Type-specific schemas
    this.bugSpecSchema = this.baseSpecSchema.keys({
      bugSeverity: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
      reproductionSteps: Joi.string().allow('').optional(),
      rootCause: Joi.string().allow('').optional(),
      proposedSolution: Joi.string().allow('').optional(),
      environment: Joi.string().allow('').optional()
    });

    this.spikeSpecSchema = this.baseSpecSchema.keys({
      researchType: Joi.string().optional(),
      researchQuestion: Joi.string().allow('').optional(),
      researchFindings: Joi.string().allow('').optional()
    });
  }

  /**
   * Validate specification document against schema
   * @param {Object} spec - Specification object to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result with isValid, errors, warnings, and fixed spec
   */
  async validate(spec, options = {}) {
    const {
      schema = 'auto',
      _strict = false,
      autoFix = false,
      allowUnknown = true
    } = options;

    try {
      // Determine appropriate schema
      const validationSchema = this.getSchemaForSpec(spec, schema);

      // Perform validation
      const validationOptions = {
        abortEarly: false,
        allowUnknown,
        stripUnknown: !allowUnknown
      };

      const { error, value, warning } = validationSchema.validate(spec, validationOptions);

      const result = {
        isValid: !error,
        errors: error ? this.formatValidationErrors(error) : [],
        warnings: warning ? this.formatValidationWarnings(warning) : [],
        spec: value,
        originalSpec: spec
      };

      // Apply auto-fixes if enabled
      if (autoFix && result.errors.length > 0) {
        result.fixedSpec = await this.applyAutoFixes(spec, result.errors);
        result.autoFixApplied = true;
      }

      return result;
    } catch (validationError) {
      return {
        isValid: false,
        errors: [{
          message: `Schema validation failed: ${validationError.message}`,
          field: 'schema',
          type: 'schema.error'
        }],
        warnings: [],
        spec,
        originalSpec: spec
      };
    }
  }

  /**
   * Validate multiple specifications
   * @param {Array} specs - Array of specification objects
   * @param {Object} options - Validation options
   * @returns {Object} Combined validation results
   */
  async validateMany(specs, options = {}) {
    const results = await Promise.all(
      specs.map(spec => this.validate(spec, options))
    );

    const summary = {
      total: specs.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid).length,
      withWarnings: results.filter(r => r.warnings.length > 0).length,
      results
    };

    return summary;
  }

  /**
   * Get appropriate schema for specification
   * @private
   */
  getSchemaForSpec(spec, schemaType) {
    if (schemaType !== 'auto') {
      const customSchema = this.customSchemas.get(schemaType);
      if (customSchema) return customSchema;
    }

    // Auto-detect schema based on spec type
    switch (spec.type) {
      case 'BUG':
        return this.bugSpecSchema;
      case 'SPIKE':
        return this.spikeSpecSchema;
      default:
        return this.baseSpecSchema;
    }
  }

  /**
   * Format Joi validation errors into readable format
   * @private
   */
  formatValidationErrors(joiError) {
    return joiError.details.map(detail => ({
      message: detail.message,
      field: detail.path.join('.') || 'root',
      value: detail.context?.value,
      type: detail.type
    }));
  }

  /**
   * Format Joi validation warnings
   * @private
   */
  formatValidationWarnings(joiWarning) {
    // Joi doesn't have built-in warnings, but we can add custom logic here
    return [];
  }

  /**
   * Apply automatic fixes to common validation issues
   * @private
   */
  async applyAutoFixes(spec, errors) {
    const fixedSpec = { ...spec };
    const appliedFixes = [];

    for (const error of errors) {
      switch (error.type) {
        case 'any.required':
          if (error.field === 'priority') {
            fixedSpec.priority = 'P2';
            appliedFixes.push('Added default priority: P2');
          }
          if (error.field === 'status') {
            fixedSpec.status = 'backlog';
            appliedFixes.push('Added default status: backlog');
          }
          break;

        case 'string.pattern.base':
          if (error.field === 'id' && error.value) {
            // Try to normalize ID format
            const normalized = this.normalizeId(error.value);
            if (normalized !== error.value) {
              fixedSpec.id = normalized;
              appliedFixes.push(`Normalized ID: ${error.value} → ${normalized}`);
            }
          }
          break;

        case 'string.empty':
          if (error.field === 'title') {
            fixedSpec.title = 'Untitled';
            appliedFixes.push('Added default title: Untitled');
          }
          break;
      }
    }

    fixedSpec._autoFixSummary = appliedFixes;
    return fixedSpec;
  }

  /**
   * Normalize specification ID to correct format
   * @private
   */
  normalizeId(id) {
    if (typeof id !== 'string') return id;

    // Extract type and number
    const match = id.match(/([A-Z]+)[\s\-_]*(\d+)/i);
    if (!match) return id;

    const [, type, number] = match;
    return `${type.toUpperCase()}-${number.padStart(3, '0')}`;
  }

  /**
   * Load custom schema from file
   * @param {string} schemaName - Name to register schema under
   * @param {string} schemaPath - Path to schema file (JSON or JS)
   */
  async loadCustomSchema(schemaName, schemaPath) {
    try {
      const ext = path.extname(schemaPath);
      let schemaData;

      if (ext === '.json') {
        const content = await fs.readFile(schemaPath, 'utf-8');
        schemaData = JSON.parse(content);
      } else if (ext === '.js') {
        // Clear require cache for dynamic loading
        delete require.cache[require.resolve(schemaPath)];
        schemaData = require(schemaPath);
      } else {
        throw new Error(`Unsupported schema file format: ${ext}`);
      }

      // Convert to Joi schema if it's a plain object
      const joiSchema = Joi.isSchema(schemaData) ? schemaData : Joi.object(schemaData);

      this.customSchemas.set(schemaName, joiSchema);
      return true;
    } catch (error) {
      throw new Error(`Failed to load custom schema ${schemaName}: ${error.message}`);
    }
  }

  /**
   * Register a custom Joi schema
   * @param {string} schemaName - Name to register schema under
   * @param {Object} joiSchema - Joi schema object
   */
  registerSchema(schemaName, joiSchema) {
    if (!Joi.isSchema(joiSchema)) {
      throw new Error('Schema must be a valid Joi schema object');
    }
    this.customSchemas.set(schemaName, joiSchema);
  }

  /**
   * Get list of available schemas
   * @returns {Object} Available schemas with descriptions
   */
  getAvailableSchemas() {
    return {
      default: {
        name: 'Base Specification Schema',
        description: 'Standard schema for all specification types',
        fields: this.getSchemaFields(this.baseSpecSchema)
      },
      bug: {
        name: 'Bug Specification Schema',
        description: 'Extended schema for bug reports',
        fields: this.getSchemaFields(this.bugSpecSchema)
      },
      spike: {
        name: 'Spike Specification Schema',
        description: 'Extended schema for research spikes',
        fields: this.getSchemaFields(this.spikeSpecSchema)
      },
      custom: Array.from(this.customSchemas.keys()).map(name => ({
        name,
        description: 'Custom schema',
        type: 'custom'
      }))
    };
  }

  /**
   * Extract field information from Joi schema
   * @private
   */
  getSchemaFields(schema) {
    // This is a simplified version - in practice you'd need more sophisticated schema introspection
    return Object.keys(schema.describe().keys || {});
  }

  /**
   * Generate example specification based on schema
   * @param {string} specType - Type of specification (FEAT, BUG, etc.)
   * @returns {Object} Example specification object
   */
  generateExample(specType = 'FEAT') {
    const examples = {
      FEAT: {
        id: 'FEAT-001',
        type: 'FEAT',
        status: 'backlog',
        title: 'Example Feature Implementation',
        description: 'This is an example feature specification with all required fields.',
        priority: 'P2',
        tags: ['example', 'feature'],
        tasks: [
          {
            id: 'TASK-001',
            title: 'Design feature architecture',
            status: 'ready',
            agent: 'Software-Architect'
          }
        ],
        acceptance_criteria: [
          'Feature meets performance requirements',
          'All tests pass',
          'Documentation is complete'
        ]
      },
      BUG: {
        id: 'BUG-001',
        type: 'BUG',
        status: 'active',
        title: 'Example Bug Report',
        description: 'This is an example bug report with reproduction steps.',
        priority: 'P1',
        bugSeverity: 'high',
        reproductionSteps: '1. Navigate to page\n2. Click button\n3. Observe error',
        environment: 'Chrome 91, Windows 10'
      }
    };

    return examples[specType] || examples.FEAT;
  }
}

module.exports = SchemaValidator;