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
      // Provide more detailed error messages for configuration issues
      const chalk = require('chalk');

      if (error.code === 'ENOENT') {
        console.warn(chalk.yellow('⚠ Configuration file not found, using defaults'));
      } else if (error instanceof SyntaxError) {
        console.error(chalk.red('❌ Configuration file has syntax errors:'));
        console.error(chalk.red(`   ${error.message}`));
        console.error(chalk.yellow('   Suggestions:'));
        console.error(chalk.yellow('   • Check asd.config.js for syntax errors'));
        console.error(chalk.yellow('   • Validate JavaScript syntax'));
        console.error(chalk.yellow('   • Remove config file to use defaults'));
        console.error(chalk.yellow('   • Using fallback configuration for now'));
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        console.error(chalk.red('❌ Permission denied reading configuration file'));
        console.error(chalk.yellow('   Check file permissions on asd.config.js'));
        console.error(chalk.yellow('   Using default configuration'));
      } else {
        console.warn(chalk.yellow('⚠ Failed to load configuration:'), error.message);
        console.warn(chalk.yellow('   Using default configuration'));
      }

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
      const chalk = require('chalk');
      console.warn(chalk.yellow('⚠ Could not load default config file:'), error.message);
      console.warn(chalk.yellow('   Using built-in fallback configuration'));

      if (error.code === 'ENOENT') {
        console.warn(chalk.yellow('   Default config file is missing from installation'));
      } else if (error instanceof SyntaxError) {
        console.warn(chalk.yellow('   Default config file has invalid JSON syntax'));
      }
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
      dataFormat: config.dataFormat || 'auto',
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

      // Multi-format support configuration
      formatOptions: config.formatOptions || {
        json: { indent: 2, sortKeys: true, dateFormat: 'iso' },
        yaml: { indent: 2, lineWidth: 120, noRefs: false },
        markdown: { taskFormat: 'asd', frontMatter: true }
      },
      validation: config.validation || {
        schema: 'strict',
        requiredFields: ['id', 'title', 'status', 'priority'],
        autoFix: true
      },
      conversion: config.conversion || {
        preserveMetadata: true,
        validateOnConvert: true,
        backupOriginals: true
      },

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
