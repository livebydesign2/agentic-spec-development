const { cosmiconfigSync } = require('cosmiconfig');
const path = require('path');
const fs = require('fs');

/**
 * Configuration manager for the Agentic Spec Development CLI
 * Uses cosmiconfig for flexible configuration loading
 */
class ConfigManager {
  constructor(searchFrom = process.cwd()) {
    this.searchFrom = searchFrom;
    this.config = null;
    this.configPath = null;
  }

  /**
   * Load configuration using cosmiconfig
   * Searches for configuration in multiple formats:
   * - package.json (roadmap property)
   * - .roadmaprc, .roadmaprc.json, .roadmaprc.js
   * - roadmap.config.js
   */
  loadConfig() {
    if (this.config) {
      return this.config;
    }

    const explorer = cosmiconfigSync('asd', {
      searchPlaces: [
        'package.json',
        '.asdrc',
        '.asdrc.json',
        '.asdrc.js',
        'asd.config.js',
        // Legacy roadmap config support
        '.roadmaprc',
        '.roadmaprc.json',
        '.roadmaprc.js',
        'roadmap.config.js',
        // Legacy support for existing Campfire projects
        '.roadmap/config.json'
      ]
    });

    try {
      const result = explorer.search(this.searchFrom);

      if (result) {
        this.config = this.validateAndNormalizeConfig(result.config);
        this.configPath = result.filepath;
      } else {
        // Use default configuration
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.warn('Warning: Failed to load configuration, using defaults:', error.message);
      this.config = this.getDefaultConfig();
    }

    return this.config;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      featuresPath: 'docs/specs',
      templatePath: 'docs/specs/template',
      // Legacy feature path support
      legacyFeaturesPath: 'docs/product/features',
      enforceSpec: false,
      autoRefresh: true,
      refreshDebounce: 500,
      defaultPriority: 'P2',
      defaultStatus: 'backlog',
      supportedTypes: ['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE'],
      statusFolders: ['active', 'backlog', 'done'],
      priorities: ['P0', 'P1', 'P2', 'P3']
    };
  }

  /**
   * Validate and normalize configuration
   */
  validateAndNormalizeConfig(config) {
    const defaults = this.getDefaultConfig();
    const normalized = { ...defaults, ...config };

    // Validate required fields
    if (!normalized.featuresPath) {
      throw new Error('featuresPath is required in configuration');
    }

    // Ensure paths are relative to project root
    if (!path.isAbsolute(normalized.featuresPath)) {
      normalized.featuresPath = path.resolve(this.searchFrom, normalized.featuresPath);
    }

    if (normalized.templatePath && !path.isAbsolute(normalized.templatePath)) {
      normalized.templatePath = path.resolve(this.searchFrom, normalized.templatePath);
    }

    // Validate supported types
    if (!Array.isArray(normalized.supportedTypes)) {
      normalized.supportedTypes = defaults.supportedTypes;
    }

    // Validate status folders
    if (!Array.isArray(normalized.statusFolders)) {
      normalized.statusFolders = defaults.statusFolders;
    }

    // Validate priorities
    if (!Array.isArray(normalized.priorities)) {
      normalized.priorities = defaults.priorities;
    }

    return normalized;
  }

  /**
   * Get configuration value with optional fallback
   */
  get(key, fallback = null) {
    const config = this.loadConfig();
    return config[key] !== undefined ? config[key] : fallback;
  }

  /**
   * Get features directory path
   */
  getFeaturesPath() {
    return this.get('featuresPath');
  }

  /**
   * Get template directory path
   */
  getTemplatePath() {
    return this.get('templatePath');
  }

  /**
   * Get status folders (active, backlog, done)
   */
  getStatusFolders() {
    return this.get('statusFolders');
  }

  /**
   * Get supported feature types
   */
  getSupportedTypes() {
    return this.get('supportedTypes');
  }

  /**
   * Get supported priorities
   */
  getSupportedPriorities() {
    return this.get('priorities');
  }

  /**
   * Check if a feature type is supported
   */
  isValidType(type) {
    return this.getSupportedTypes().includes(type.toUpperCase());
  }

  /**
   * Check if a priority is valid
   */
  isValidPriority(priority) {
    return this.getSupportedPriorities().includes(priority.toUpperCase());
  }

  /**
   * Check if a status is valid
   */
  isValidStatus(status) {
    return this.getStatusFolders().includes(status.toLowerCase());
  }

  /**
   * Get project root directory
   */
  getProjectRoot() {
    return this.searchFrom;
  }

  /**
   * Create example configuration file
   */
  createExampleConfig(filePath) {
    const exampleConfig = {
      featuresPath: 'docs/specs',
      templatePath: 'docs/specs/template',
      // Legacy feature path support
      legacyFeaturesPath: 'docs/product/features',
      enforceSpec: false,
      autoRefresh: true,
      refreshDebounce: 500,
      defaultPriority: 'P2',
      defaultStatus: 'backlog',
      supportedTypes: ['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE'],
      statusFolders: ['active', 'backlog', 'done'],
      priorities: ['P0', 'P1', 'P2', 'P3']
    };

    const configContent = `module.exports = ${JSON.stringify(exampleConfig, null, 2)};
`;

    fs.writeFileSync(filePath, configContent, 'utf-8');
    return filePath;
  }

  /**
   * Get configuration source information
   */
  getConfigInfo() {
    this.loadConfig();
    return {
      configPath: this.configPath,
      config: this.config,
      projectRoot: this.searchFrom
    };
  }
}

module.exports = ConfigManager;