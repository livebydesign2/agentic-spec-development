const path = require('path');

const MarkdownAdapter = require('./markdown');
const JSONAdapter = require('./json');
const YAMLAdapter = require('./yaml');

/**
 * Simple factory for data format adapters
 * Follows modern, maintainable patterns
 */
class DataAdapterFactory {
  constructor() {
    this.adapters = new Map([
      ['markdown', MarkdownAdapter],
      ['json', JSONAdapter],
      ['yaml', YAMLAdapter],
    ]);
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
    return new AdapterClass(config);
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
}

// Export both factory and individual adapters
module.exports = {
  DataAdapterFactory,
  MarkdownAdapter,
  JSONAdapter,
  YAMLAdapter,
};
