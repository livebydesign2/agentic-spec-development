const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Advanced format detection and validation system
 * Auto-detects data format from content structure and file extensions
 */
class FormatDetector {
  constructor() {
    this.detectionStrategies = new Map([
      ['json', this.detectJSON.bind(this)],
      ['yaml', this.detectYAML.bind(this)],
      ['markdown', this.detectMarkdown.bind(this)],
    ]);
  }

  /**
   * Detect format from file path and optionally content
   * @param {string} filePath - Path to the file
   * @param {string} [content] - Optional file content for validation
   * @returns {Promise<string>} Detected format (json, yaml, markdown)
   */
  async detectFormat(filePath, content = null) {
    // First try extension-based detection
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const extensionMap = {
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      markdown: 'markdown',
    };

    const formatFromExt = extensionMap[ext];

    // If no content provided, read the file
    if (!content && formatFromExt) {
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        // If we can't read the file, return format based on extension
        return formatFromExt || 'markdown';
      }
    }

    // If we have content, validate the format
    if (content) {
      // Check if extension-based detection is correct
      if (formatFromExt && this.validateFormat(content, formatFromExt)) {
        return formatFromExt;
      }

      // Try content-based detection if extension failed
      for (const [format, detector] of this.detectionStrategies) {
        if (detector(content)) {
          return format;
        }
      }
    }

    // Fallback to extension or default to markdown
    return formatFromExt || 'markdown';
  }

  /**
   * Validate that content matches the specified format
   * @param {string} content - File content to validate
   * @param {string} format - Expected format (json, yaml, markdown)
   * @returns {boolean} Whether content is valid for the format
   */
  validateFormat(content, format) {
    const _detector = this.detectionStrategies.get(format);
    return detector ? detector(content) : false;
  }

  /**
   * Get format confidence score for content
   * @param {string} content - File content
   * @returns {Object} Format confidence scores
   */
  getFormatConfidence(content) {
    const scores = {};

    for (const [format, detector] of this.detectionStrategies) {
      try {
        scores[format] = this.getConfidenceScore(content, format);
      } catch {
        scores[format] = 0;
      }
    }

    return scores;
  }

  /**
   * Detect JSON format
   * @private
   */
  detectJSON(content) {
    try {
      const parsed = JSON.parse(content.trim());
      // Must be an object with some expected spec fields
      return (
        typeof parsed === 'object' &&
        parsed !== null &&
        (parsed.id || parsed.title || parsed.type)
      );
    } catch {
      return false;
    }
  }

  /**
   * Detect YAML format
   * @private
   */
  detectYAML(content) {
    try {
      // Check for YAML-specific patterns first
      const hasYamlPatterns =
        content.includes('---') || // Document separator
        /^[a-zA-Z_][a-zA-Z0-9_]*:\s/.test(content) || // Key-value pairs at start of line
        /^\s*-\s+/.test(content); // List items

      if (!hasYamlPatterns) {
        return false;
      }

      const parsed = yaml.load(content, { safeLoad: true });
      return (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        (parsed.id || parsed.title || parsed.type)
      );
    } catch {
      return false;
    }
  }

  /**
   * Detect Markdown format
   * @private
   */
  detectMarkdown(content) {
    // Look for common markdown patterns
    const markdownPatterns = [
      /^#+\s/m,              // Headers
      /\*\*.*?\*\*/,         // Bold text
      /^\s*[-*]\s/m,         // Lists
      /^\s*\d+\.\s/m,        // Numbered lists
      /`[^`]+`/,             // Inline code
      /^\s*>/m,              // Blockquotes
      /\[.*?\]\(.*?\)/,      // Links
    ];

    let patternMatches = 0;
    for (const pattern of markdownPatterns) {
      if (pattern.test(content)) {
        patternMatches++;
      }
    }

    // Consider it markdown if it has 2+ patterns or contains spec-like structure
    return (
      patternMatches >= 2 ||
      (patternMatches >= 1 && this.hasSpecStructure(content))
    );
  }

  /**
   * Check if content has spec-like structure
   * @private
   */
  hasSpecStructure(content) {
    const specPatterns = [
      /\*\*Status\*\*:/i,
      /\*\*Priority\*\*:/i,
      /\*\*Type\*\*:/i,
      /##\s+(Description|Tasks|Implementation)/i,
      /FEAT-\d+|SPEC-\d+|BUG-\d+/,
    ];

    return specPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Get confidence score for a specific format
   * @private
   */
  getConfidenceScore(content, format) {
    switch (format) {
      case 'json':
        return this.getJSONConfidence(content);
      case 'yaml':
        return this.getYAMLConfidence(content);
      case 'markdown':
        return this.getMarkdownConfidence(content);
      default:
        return 0;
    }
  }

  /**
   * Calculate JSON confidence score
   * @private
   */
  getJSONConfidence(content) {
    try {
      const parsed = JSON.parse(content.trim());
      let score = 0.6; // Base score for valid JSON

      // Bonus points for spec-like structure
      if (parsed.id) score += 0.2;
      if (parsed.title) score += 0.1;
      if (parsed.status) score += 0.1;
      if (parsed.tasks && Array.isArray(parsed.tasks)) score += 0.1;

      return Math.min(score, 1.0);
    } catch {
      return 0;
    }
  }

  /**
   * Calculate YAML confidence score
   * @private
   */
  getYAMLConfidence(content) {
    try {
      const parsed = yaml.load(content, { safeLoad: true });
      if (!parsed || typeof parsed !== 'object') return 0;

      let score = 0.5; // Base score for valid YAML

      // Look for YAML-specific formatting
      if (content.includes('---')) score += 0.1; // Document separators
      if (/^[a-zA-Z_][a-zA-Z0-9_]*:\s*\|/.test(content)) score += 0.1; // Multi-line strings
      if (/^\s*-\s+/.test(content)) score += 0.1; // List syntax

      // Bonus for spec structure
      if (parsed.id) score += 0.2;
      if (parsed.title) score += 0.1;

      return Math.min(score, 1.0);
    } catch {
      return 0;
    }
  }

  /**
   * Calculate Markdown confidence score
   * @private
   */
  getMarkdownConfidence(content) {
    let score = 0;

    const patterns = [
      { pattern: /^#+\s/m, weight: 0.3 },              // Headers (high weight)
      { pattern: /\*\*.*?\*\*/, weight: 0.2 },         // Bold text
      { pattern: /^\s*[-*]\s/m, weight: 0.2 },         // Lists
      { pattern: /`[^`]+`/, weight: 0.1 },             // Inline code
      { pattern: /\[.*?\]\(.*?\)/, weight: 0.1 },      // Links
      { pattern: /^\s*>/m, weight: 0.1 },              // Blockquotes
    ];

    for (const { pattern, weight } of patterns) {
      if (pattern.test(content)) {
        score += weight;
      }
    }

    // Bonus for spec structure
    if (this.hasSpecStructure(content)) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get supported formats
   * @returns {string[]} Array of supported format names
   */
  getSupportedFormats() {
    return Array.from(this.detectionStrategies.keys());
  }
}

module.exports = FormatDetector;