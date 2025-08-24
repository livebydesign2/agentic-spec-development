/**
 * Base class for data format adapters
 * Defines the interface that all adapters must implement
 */
class BaseDataAdapter {
  constructor(config = {}) {
    this.config = config;
    this.format = 'base';
  }

  /**
   * Load and parse a specification document
   * @param {string} filePath - Path to the specification file
   * @returns {Promise<Object>} Parsed specification object
   */
  async loadDocument(_filePath) {
    throw new Error('loadDocument method must be implemented by subclass');
  }

  /**
   * Parse content string into specification object
   * @param {string} content - Raw file content
   * @param {Object} metadata - File metadata (path, stats, etc.)
   * @returns {Object} Parsed specification object
   */
  parseContent(_content, _metadata = {}) {
    throw new Error('parseContent method must be implemented by subclass');
  }

  /**
   * Validate that content matches expected format
   * @param {string} content - Raw file content
   * @returns {boolean} Whether content is valid for this adapter
   */
  canParse(_content) {
    throw new Error('canParse method must be implemented by subclass');
  }

  /**
   * Get file extensions supported by this adapter
   * @returns {string[]} Array of file extensions (without dots)
   */
  getSupportedExtensions() {
    throw new Error('getSupportedExtensions method must be implemented by subclass');
  }

  /**
   * Convert specification object to string format
   * @param {Object} spec - Specification object
   * @returns {string} Formatted content string
   */
  serialize(_spec) {
    throw new Error('serialize method must be implemented by subclass');
  }

  /**
   * Extract metadata from file path
   * @param {string} filePath - Path to specification file
   * @returns {Object} Metadata object with id, status, type, etc.
   */
  extractMetadata(filePath) {
    const fs = require('fs');
    const path = require('path');

    const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    const filename = path.basename(filePath, path.extname(filePath));
    const parentDir = path.basename(path.dirname(filePath));

    // Extract spec ID from filename (e.g., FEAT-001-title -> FEAT-001)
    const idMatch = filename.match(/^([A-Z]+-\d+)/);
    const id = idMatch ? idMatch[1] : filename;

    // Determine type from ID prefix
    const typeMatch = id.match(/^([A-Z]+)-/);
    const type = typeMatch ? typeMatch[1] : 'SPEC';

    return {
      id,
      type,
      status: parentDir, // Assumes file is in status folder
      filename,
      filePath,
      createdAt: stats?.birthtime,
      modifiedAt: stats?.mtime,
      size: stats?.size
    };
  }
}

module.exports = BaseDataAdapter;