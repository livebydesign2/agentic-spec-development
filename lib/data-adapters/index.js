const path = require('path');

const MarkdownAdapter = require('./markdown');
const JSONAdapter = require('./json');
const YAMLAdapter = require('./yaml');
const FormatDetector = require('./format-detector');
const SchemaValidator = require('./schema-validator');
const FormatConverter = require('./converter');

/**
 * Enhanced factory for data format adapters
 * Supports auto-detection, validation, and conversion
 */
class DataAdapterFactory {
  constructor(config = {}) {
    this.config = config;
    this.adapters = new Map([
      ['markdown', MarkdownAdapter],
      ['json', JSONAdapter],
      ['yaml', YAMLAdapter],
    ]);
    this.formatDetector = new FormatDetector();
    this.schemaValidator = new SchemaValidator(config.validation);
    this.converter = new FormatConverter(config);
  }

  /**
   * Create adapter instance for specified format
   * @param {string} format - Data format (markdown, json, yaml)
   * @param {Object} config - Configuration options
   * @returns {BaseDataAdapter} Adapter instance
   */
  create(format, config = {}) {
    const AdapterClass = this.adapters.get(format.toLowerCase());
    if (!AdapterClass) {
      throw new Error(`Unsupported data format: ${format}`);
    }

    // Merge factory config with adapter-specific config
    const adapterConfig = {
      ...this.config[format.toLowerCase()],
      ...config
    };

    return new AdapterClass(adapterConfig);
  }

  /**
   * Auto-detect format from file extension
   * @param {string} filePath - Path to the file
   * @param {Object} config - Configuration options
   * @returns {BaseDataAdapter} Adapter instance
   */
  createFromFile(filePath, config = {}) {
    const ext = path.extname(filePath).slice(1).toLowerCase();

    // Map extensions to formats
    const extensionMap = {
      md: 'markdown',
      markdown: 'markdown',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
    };

    const format = extensionMap[ext] || 'markdown';
    return this.create(format, config);
  }

  /**
   * Auto-detect format from content and create appropriate adapter
   * @param {string} content - File content
   * @param {string} filePath - Optional file path for context
   * @param {Object} config - Configuration options
   * @returns {Promise<BaseDataAdapter>} Adapter instance
   */
  async createFromContent(content, filePath = null, config = {}) {
    const format = await this.formatDetector.detectFormat(filePath || 'unknown', content);
    return this.create(format, config);
  }

  /**
   * Get format confidence scores for content
   * @param {string} content - Content to analyze
   * @returns {Object} Format confidence scores
   */
  getFormatConfidence(content) {
    return this.formatDetector.getFormatConfidence(content);
  }

  /**
   * Validate content against format and schema
   * @param {string} content - Content to validate
   * @param {string} format - Expected format
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateContent(content, format, options = {}) {
    try {
      // First validate format
      if (!this.formatDetector.validateFormat(content, format)) {
        return {
          isValid: false,
          errors: [`Content does not match expected format: ${format}`],
          warnings: []
        };
      }

      // Parse and validate against schema
      const adapter = this.create(format);
      const spec = adapter.parseContent(content, {});
      return await this.schemaValidator.validate(spec, options);

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Convert content between formats
   * @param {string} content - Source content
   * @param {string} sourceFormat - Source format
   * @param {string} targetFormat - Target format
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Conversion result
   */
  async convertContent(content, sourceFormat, targetFormat, options = {}) {
    return this.converter.convert(content, sourceFormat, targetFormat, options);
  }

  /**
   * Convert file between formats
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Conversion result
   */
  async convertFile(inputPath, outputPath, options = {}) {
    return this.converter.convertFile(inputPath, outputPath, options);
  }

  /**
   * Batch convert multiple files
   * @param {Array} filePaths - Array of input file paths
   * @param {Object} options - Batch conversion options
   * @returns {Promise<Array>} Array of conversion results
   */
  async convertBatch(filePaths, options = {}) {
    return this.converter.convertBatch(filePaths, options);
  }

  /**
   * Get all supported formats
   * @returns {string[]} Array of supported format names
   */
  getSupportedFormats() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if format is supported
   * @param {string} format - Format name to check
   * @returns {boolean} Whether format is supported
   */
  isFormatSupported(format) {
    return this.adapters.has(format.toLowerCase());
  }

  /**
   * Get supported conversion paths
   * @returns {Object} Available conversion paths
   */
  getSupportedConversions() {
    return this.converter.getSupportedConversions();
  }

  /**
   * Get available validation schemas
   * @returns {Object} Available schemas with descriptions
   */
  getAvailableSchemas() {
    return this.schemaValidator.getAvailableSchemas();
  }

  /**
   * Load custom validation schema
   * @param {string} schemaName - Name to register schema under
   * @param {string} schemaPath - Path to schema file
   * @returns {Promise<boolean>} Success status
   */
  async loadCustomSchema(schemaName, schemaPath) {
    return this.schemaValidator.loadCustomSchema(schemaName, schemaPath);
  }

  /**
   * Generate example specification for format
   * @param {string} format - Format to generate example for
   * @param {string} specType - Type of specification (FEAT, BUG, etc.)
   * @returns {string} Example content in specified format
   */
  async generateExample(format, specType = 'FEAT') {
    const example = this.schemaValidator.generateExample(specType);
    const adapter = this.create(format);
    return adapter.serialize(example);
  }

  /**
   * Get factory statistics
   * @returns {Object} Usage and capability statistics
   */
  getStats() {
    return {
      supportedFormats: this.getSupportedFormats(),
      supportedConversions: this.getSupportedConversions(),
      availableSchemas: Object.keys(this.getAvailableSchemas()),
      factoryConfig: Object.keys(this.config)
    };
  }
}

// Export factory and all components
module.exports = {
  DataAdapterFactory,
  MarkdownAdapter,
  JSONAdapter,
  YAMLAdapter,
  FormatDetector,
  SchemaValidator,
  FormatConverter
};
