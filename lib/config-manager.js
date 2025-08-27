const path = require('path');
const fs = require('fs');

/**
 * Modern Configuration manager for ASD CLI
 * Simple, robust, and maintainable configuration handling
 */
class ConfigManager {
  constructor(searchFrom = process.cwd()) {
    this.searchFrom = searchFrom;
    this.config = null;
    this.configPath = null;
  }

  /**
   * Load configuration from asd.config.js or use defaults
   * Simplified approach focusing on main use case
   */
  loadConfig() {
    if (this.config) {
      return this.config;
    }

    // Try to load from asd.config.js (main config file)
    const configPath = path.join(this.searchFrom, 'asd.config.js');

    try {
      if (fs.existsSync(configPath)) {
        // Clear require cache to allow config reloading
        delete require.cache[require.resolve(configPath)];
        const userConfig = require(configPath);
        this.config = this.validateAndNormalizeConfig(userConfig);
        this.configPath = configPath;
      } else {
        // Use default configuration
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.warn(
        'Warning: Failed to load configuration, using defaults:',
        error.message
      );
      this.config = this.getDefaultConfig();
    }

    return this.config;
  }

  /**
   * Get default configuration using config/default.json
   */
  getDefaultConfig() {
    try {
      const defaultConfigPath = path.join(
        __dirname,
        '..',
        'config',
        'default.json'
      );
      if (fs.existsSync(defaultConfigPath)) {
        const defaultConfig = JSON.parse(
          fs.readFileSync(defaultConfigPath, 'utf-8')
        );
        return this.normalizeConfig(defaultConfig);
      }
    } catch (error) {
      console.warn('Warning: Could not load default config, using fallback');
    }

    // Fallback if config/default.json is missing
    return {
      dataPath: 'docs/specs',
      templatePath: 'templates',
      dataFormat: 'markdown',
      structure: {
        active: 'active',
        backlog: 'backlog',
        done: 'done',
      },
      cli: {
        defaultPriority: 'P2',
        defaultStatus: 'backlog',
        supportedTypes: ['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE'],
        statusFolders: ['active', 'backlog', 'done'],
        priorities: ['P0', 'P1', 'P2', 'P3'],
      },
      display: {
        autoRefresh: true,
        refreshDebounce: 500,
      },
    };
  }

  /**
   * Normalize configuration to internal format
   */
  normalizeConfig(config) {
    return {
      // Modern ASD configuration fields
      dataPath: config.dataPath,
      templatePath: config.templatePath,
      dataFormat: config.dataFormat || 'markdown',
      autoRefresh: config.display?.autoRefresh ?? true,
      refreshDebounce: config.display?.refreshDebounce ?? 500,

      // CLI settings from structured config
      defaultPriority: config.cli?.defaultPriority || 'P2',
      defaultStatus: config.cli?.defaultStatus || 'backlog',
      supportedTypes: config.cli?.supportedTypes || [
        'SPEC',
        'FEAT',
        'BUG',
        'SPIKE',
        'MAINT',
        'RELEASE',
      ],
      statusFolders: config.cli?.statusFolders || ['active', 'backlog', 'done'],
      priorities: config.cli?.priorities || ['P0', 'P1', 'P2', 'P3'],

      // Structured configuration sections
      structure: config.structure,
      parsing: config.parsing,
      display: config.display,
      cli: config.cli,

      // Raw config for advanced usage
      _raw: config,
    };
  }

  /**
   * Validate and normalize configuration - simplified approach
   */
  validateAndNormalizeConfig(config) {
    const defaults = this.getDefaultConfig();
    const normalized = this.normalizeConfig({ ...defaults._raw, ...config });

    // Ensure paths are absolute
    if (normalized.dataPath && !path.isAbsolute(normalized.dataPath)) {
      normalized.dataPath = path.resolve(this.searchFrom, normalized.dataPath);
    }

    if (normalized.templatePath && !path.isAbsolute(normalized.templatePath)) {
      normalized.templatePath = path.resolve(
        this.searchFrom,
        normalized.templatePath
      );
    }

    // Simple validation - use defaults if invalid
    if (!Array.isArray(normalized.supportedTypes)) {
      normalized.supportedTypes = defaults.supportedTypes;
    }
    if (!Array.isArray(normalized.statusFolders)) {
      normalized.statusFolders = defaults.statusFolders;
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
   * Essential getter methods for commonly used paths
   */
  getDataPath() {
    return this.get('dataPath');
  }

  getTemplatePath() {
    return this.get('templatePath');
  }

  getProjectRoot() {
    return this.searchFrom;
  }

  /**
   * Validation helpers - simplified to direct config access
   */
  isValidType(type) {
    return this.get('supportedTypes', []).includes(type.toUpperCase());
  }

  isValidPriority(priority) {
    return this.get('priorities', []).includes(priority.toUpperCase());
  }

  isValidStatus(status) {
    return this.get('statusFolders', []).includes(status.toLowerCase());
  }

  /**
   * Create example configuration file - simplified
   */
  createExampleConfig(filePath) {
    const configContent = `module.exports = ${JSON.stringify(
      this.getDefaultConfig(),
      null,
      2
    )};
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
      projectRoot: this.searchFrom,
    };
  }
}

module.exports = ConfigManager;
