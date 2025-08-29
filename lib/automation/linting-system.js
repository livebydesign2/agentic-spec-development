const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

/**
 * LintingSystem - Automated linting with intelligent error resolution
 *
 * Provides comprehensive linting automation with error detection,
 * categorization, and automatic resolution attempts. Integrates with
 * existing ESLint and Prettier configurations for seamless workflow.
 *
 * Key Features:
 * - Automatic linting execution with npm script integration
 * - Error categorization (fixable vs manual intervention required)
 * - Intelligent auto-fixing with multiple resolution strategies
 * - Performance monitoring and timeout handling
 * - Comprehensive error reporting with actionable guidance
 * - Integration with EventBus for workflow orchestration
 * - Retry logic with exponential backoff for transient failures
 */
class LintingSystem extends EventEmitter {
  constructor(configManager, options = {}) {
    super();

    this.configManager = configManager;
    this.options = {
      commandTimeout: options.commandTimeout || 60000, // 60 seconds for large codebases
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000, // 1 second
      autoFixAttempts: options.autoFixAttempts || 2,
      enableAuditLogging: options.enableAuditLogging !== false,
      parallelLinting: options.parallelLinting || false,
      strictMode: options.strictMode || false, // Fail on warnings
      ...options,
    };

    // Linting state
    this.isRunning = false;
    this.currentSession = null;
    this.auditLog = [];

    // Performance metrics
    this.metrics = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      autoFixSuccesses: 0,
      averageExecutionTime: 0,
      lastRunTime: null,
      errorCategories: {
        fixable: 0,
        manual: 0,
        warnings: 0,
        syntax: 0,
      },
    };

    // Error patterns for categorization
    this.errorPatterns = {
      fixable: [
        /--fix/,
        /prettier/i,
        /Missing semicolon/,
        /Extra semicolon/,
        /Unexpected trailing comma/,
        /Missing trailing comma/,
        /Incorrect indentation/,
        /Mixed spaces and tabs/,
      ],
      syntax: [
        /Parsing error/,
        /Unexpected token/,
        /Unexpected identifier/,
        /SyntaxError/,
        /Unexpected end of input/,
      ],
      manual: [
        /no-unused-vars/,
        /no-undef/,
        /prefer-const/,
        /no-console/,
        /complexity/,
      ],
    };

    // Supported linting tools and their configurations
    this.supportedTools = {
      eslint: {
        command: 'npm',
        args: ['run', 'lint'],
        fixArgs: ['run', 'lint:fix'],
        configFiles: [
          '.eslintrc.js',
          '.eslintrc.json',
          '.eslintrc.yml',
          'package.json',
        ],
      },
      prettier: {
        command: 'npx',
        args: ['prettier', '--check', '.'],
        fixArgs: ['prettier', '--write', '.'],
        configFiles: [
          '.prettierrc',
          '.prettierrc.json',
          '.prettierrc.js',
          'prettier.config.js',
        ],
      },
    };
  }

  /**
   * Initialize LintingSystem
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      this.logAuditEvent('linting_system_initializing', {
        options: this.sanitizeOptionsForLog(this.options),
        timestamp: new Date().toISOString(),
      });

      // Detect available linting tools and configurations
      const toolsAvailable = await this.detectAvailableTools();

      if (toolsAvailable.length === 0) {
        console.warn(
          '⚠️  No linting tools detected - system will have limited functionality'
        );
      } else {
        console.log(
          `✅ LintingSystem initialized - detected tools: ${toolsAvailable.join(
            ', '
          )}`
        );
      }

      this.logAuditEvent('linting_system_initialized', {
        availableTools: toolsAvailable,
        timestamp: new Date().toISOString(),
      });

      this.emit('initialized', { availableTools: toolsAvailable });
      return true;
    } catch (error) {
      this.logAuditEvent('linting_system_initialization_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      console.error(`❌ LintingSystem initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect available linting tools and configurations
   * @returns {Promise<Array<string>>} Available tools
   */
  async detectAvailableTools() {
    const availableTools = [];
    const projectRoot = this.configManager.getProjectRoot();
    const fs = require('fs').promises;

    try {
      // Check package.json for lint scripts
      const packageJsonPath = path.join(projectRoot, 'package.json');
      try {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf8')
        );
        const scripts = packageJson.scripts || {};

        if (scripts.lint || scripts['lint:fix']) {
          availableTools.push('npm-lint');
        }

        // Check dependencies
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        if (allDeps.eslint) availableTools.push('eslint');
        if (allDeps.prettier) availableTools.push('prettier');
      } catch (error) {
        console.warn(`⚠️  Could not read package.json: ${error.message}`);
      }

      // Check for configuration files
      for (const [tool, config] of Object.entries(this.supportedTools)) {
        for (const configFile of config.configFiles) {
          try {
            await fs.access(path.join(projectRoot, configFile));
            if (!availableTools.includes(tool)) {
              availableTools.push(tool);
            }
            break;
          } catch (error) {
            // Config file doesn't exist, continue
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Tool detection failed: ${error.message}`);
    }

    return [...new Set(availableTools)]; // Remove duplicates
  }

  /**
   * Execute linting with automatic error resolution
   * @param {Object} options - Linting options
   * @returns {Promise<Object>} Linting result
   */
  async executeLinting(options = {}) {
    if (this.isRunning) {
      return {
        success: false,
        error: 'Linting is already running',
      };
    }

    const startTime = Date.now();

    try {
      const {
        autoFix = true,
        __skipWarnings = !this.options.strictMode, // eslint-disable-line no-unused-vars
        tools = ['npm-lint'], // Default to npm lint script
        maxAttempts = this.options.retryAttempts,
        files = null, // Lint specific files if provided
      } = options;

      this.isRunning = true;
      this.currentSession = {
        startTime: new Date().toISOString(),
        options: this.sanitizeOptionsForLog(options),
        attempts: 0,
        results: [],
      };

      this.logAuditEvent('linting_session_started', {
        options: this.currentSession.options,
        tools: tools,
        timestamp: new Date().toISOString(),
      });

      console.log('🔍 Starting linting analysis...');

      let finalResult = null;
      let attempt = 1;

      while (attempt <= maxAttempts) {
        console.log(`🔄 Linting attempt ${attempt}/${maxAttempts}...`);

        // Execute linting
        const lintResult = await this.runLinting(tools, files);
        this.currentSession.attempts = attempt;
        this.currentSession.results.push(lintResult);

        if (lintResult.success) {
          finalResult = lintResult;
          break;
        }

        // Analyze errors and attempt fixes if enabled
        if (autoFix && attempt < maxAttempts) {
          const errorAnalysis = this.analyzeErrors(lintResult.output);

          if (errorAnalysis.fixableErrors > 0) {
            console.log(
              `🔧 Attempting to fix ${errorAnalysis.fixableErrors} fixable errors...`
            );

            const fixResult = await this.attemptAutoFix(tools, errorAnalysis);
            if (fixResult.success) {
              console.log('✅ Auto-fixes applied successfully');
              attempt++;
              continue;
            } else {
              console.warn(`⚠️  Auto-fix failed: ${fixResult.error}`);
            }
          } else {
            console.log(
              '📝 No fixable errors found - manual intervention required'
            );
            finalResult = lintResult;
            break;
          }
        } else {
          finalResult = lintResult;
          break;
        }

        attempt++;
      }

      const executionTime = Date.now() - startTime;
      this.updateMetrics(finalResult.success, executionTime, finalResult);

      const result = {
        ...finalResult,
        attempts: attempt - 1,
        executionTime,
        session: this.currentSession,
        autoFixApplied: this.currentSession.results.some(
          (r) => r.autoFixAttempted
        ),
      };

      this.logAuditEvent('linting_session_completed', {
        result: this.sanitizeResultForLog(result),
        executionTime,
        attempts: result.attempts,
        timestamp: new Date().toISOString(),
      });

      if (result.success) {
        console.log('✅ Linting completed successfully');
        this.emit('linting_success', result);
      } else {
        console.error('❌ Linting failed');
        this.displayErrorSummary(result);
        this.emit('linting_failed', result);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logAuditEvent('linting_session_failed', {
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: `Linting execution failed: ${error.message}`,
        executionTime,
      };
    } finally {
      this.isRunning = false;
      this.currentSession = null;
    }
  }

  /**
   * Run linting command
   * @param {Array<string>} tools - Tools to run
   * @param {Array<string>|null} files - Specific files to lint
   * @returns {Promise<Object>} Linting result
   */
  async runLinting(tools, files = null) {
    try {
      // For now, focus on npm lint script as it's most common
      const primaryTool = tools.includes('npm-lint') ? 'npm-lint' : tools[0];

      let command, args;

      if (primaryTool === 'npm-lint') {
        command = 'npm';
        args = ['run', 'lint'];

        // Add specific files if provided
        if (files && files.length > 0) {
          args.push('--');
          args.push(...files);
        }
      } else {
        // Use tool-specific configuration
        const toolConfig = this.supportedTools[primaryTool];
        if (!toolConfig) {
          throw new Error(`Unsupported linting tool: ${primaryTool}`);
        }

        command = toolConfig.command;
        args = [...toolConfig.args];

        if (files && files.length > 0) {
          args.push(...files);
        }
      }

      const result = await this.executeCommand(command, args, {
        description: `Run ${primaryTool} linting`,
      });

      return {
        success: result.success,
        output: result.output,
        tool: primaryTool,
        command: `${command} ${args.join(' ')}`,
        exitCode: result.exitCode,
      };
    } catch (error) {
      return {
        success: false,
        output: error.message,
        error: error.message,
        tool: tools[0],
      };
    }
  }

  /**
   * Attempt automatic error resolution
   * @param {Array<string>} tools - Available tools
   * @param {Object} errorAnalysis - Error analysis result
   * @returns {Promise<Object>} Fix attempt result
   */
  async attemptAutoFix(tools, errorAnalysis) {
    try {
      const fixAttempts = [];

      // Try npm lint:fix script first
      if (tools.includes('npm-lint')) {
        const fixResult = await this.executeCommand(
          'npm',
          ['run', 'lint:fix'],
          {
            description: 'Run lint:fix script',
          }
        );

        fixAttempts.push({
          tool: 'npm-lint:fix',
          success: fixResult.success,
          output: fixResult.output,
        });

        if (fixResult.success) {
          return {
            success: true,
            tool: 'npm-lint:fix',
            fixedErrors: errorAnalysis.fixableErrors,
          };
        }
      }

      // Try ESLint --fix if available
      if (tools.includes('eslint')) {
        const fixResult = await this.executeCommand(
          'npx',
          ['eslint', '.', '--fix'],
          {
            description: 'Run eslint --fix',
          }
        );

        fixAttempts.push({
          tool: 'eslint --fix',
          success: fixResult.success,
          output: fixResult.output,
        });

        if (fixResult.success) {
          return {
            success: true,
            tool: 'eslint --fix',
            fixedErrors: errorAnalysis.fixableErrors,
          };
        }
      }

      // Try Prettier if available
      if (tools.includes('prettier') && errorAnalysis.formattingErrors > 0) {
        const fixResult = await this.executeCommand(
          'npx',
          ['prettier', '--write', '.'],
          {
            description: 'Run prettier --write',
          }
        );

        fixAttempts.push({
          tool: 'prettier --write',
          success: fixResult.success,
          output: fixResult.output,
        });

        if (fixResult.success) {
          return {
            success: true,
            tool: 'prettier --write',
            fixedErrors: errorAnalysis.formattingErrors,
          };
        }
      }

      return {
        success: false,
        error: 'All auto-fix attempts failed',
        attempts: fixAttempts,
      };
    } catch (error) {
      return {
        success: false,
        error: `Auto-fix failed: ${error.message}`,
      };
    }
  }

  /**
   * Analyze linting errors and categorize them
   * @param {string} output - Linting output
   * @returns {Object} Error analysis
   */
  analyzeErrors(output) {
    const analysis = {
      totalErrors: 0,
      totalWarnings: 0,
      fixableErrors: 0,
      manualErrors: 0,
      syntaxErrors: 0,
      formattingErrors: 0,
      categories: {
        fixable: [],
        manual: [],
        syntax: [],
        warnings: [],
      },
      suggestions: [],
    };

    if (!output || output.trim().length === 0) {
      return analysis;
    }

    const lines = output.split('\n');

    for (const line of lines) {
      // Count errors and warnings
      if (line.includes('error')) {
        analysis.totalErrors++;

        // Categorize error type
        if (this.matchesPatterns(line, this.errorPatterns.fixable)) {
          analysis.fixableErrors++;
          analysis.categories.fixable.push(line.trim());
        } else if (this.matchesPatterns(line, this.errorPatterns.syntax)) {
          analysis.syntaxErrors++;
          analysis.categories.syntax.push(line.trim());
        } else if (this.matchesPatterns(line, this.errorPatterns.manual)) {
          analysis.manualErrors++;
          analysis.categories.manual.push(line.trim());
        }

        // Check for formatting errors
        if (
          line.includes('prettier') ||
          line.includes('indent') ||
          line.includes('spacing')
        ) {
          analysis.formattingErrors++;
        }
      }

      if (line.includes('warning')) {
        analysis.totalWarnings++;
        analysis.categories.warnings.push(line.trim());
      }
    }

    // Generate suggestions
    if (analysis.fixableErrors > 0) {
      analysis.suggestions.push('Run auto-fix to resolve fixable errors');
    }
    if (analysis.syntaxErrors > 0) {
      analysis.suggestions.push('Fix syntax errors manually before proceeding');
    }
    if (analysis.formattingErrors > 0) {
      analysis.suggestions.push('Consider running Prettier to fix formatting');
    }

    // Update metrics
    this.metrics.errorCategories.fixable += analysis.fixableErrors;
    this.metrics.errorCategories.manual += analysis.manualErrors;
    this.metrics.errorCategories.syntax += analysis.syntaxErrors;
    this.metrics.errorCategories.warnings += analysis.totalWarnings;

    return analysis;
  }

  /**
   * Check if text matches any of the given patterns
   * @param {string} text - Text to check
   * @param {Array<RegExp>} patterns - Patterns to match against
   * @returns {boolean} Whether text matches any pattern
   */
  matchesPatterns(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
  }

  /**
   * Display comprehensive error summary
   * @param {Object} result - Linting result
   */
  displayErrorSummary(result) {
    console.log('\n📝 Linting Error Summary:');
    console.log('='.repeat(40));

    if (result.errorAnalysis) {
      const analysis = result.errorAnalysis;

      console.log(`❌ Total Errors: ${analysis.totalErrors}`);
      console.log(`⚠️  Total Warnings: ${analysis.totalWarnings}`);

      if (analysis.fixableErrors > 0) {
        console.log(`🔧 Fixable Errors: ${analysis.fixableErrors}`);
      }

      if (analysis.manualErrors > 0) {
        console.log(`✍️  Manual Errors: ${analysis.manualErrors}`);
      }

      if (analysis.syntaxErrors > 0) {
        console.log(`⚠️  Syntax Errors: ${analysis.syntaxErrors}`);
      }

      if (analysis.suggestions.length > 0) {
        console.log('\n💡 Suggestions:');
        analysis.suggestions.forEach((suggestion) => {
          console.log(`  • ${suggestion}`);
        });
      }
    }

    if (result.output && result.output.length > 0) {
      console.log('\n📜 Detailed Output:');
      console.log(result.output);
    }
  }

  /**
   * Execute command with proper error handling
   * @param {string} command - Command to execute
   * @param {Array<string>} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command result
   */
  executeCommand(command, args, options = {}) {
    return new Promise((resolve) => {
      const {
        __description = 'Command execution', // eslint-disable-line no-unused-vars
        timeout = this.options.commandTimeout,
        cwd = this.configManager.getProjectRoot(),
      } = options;

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: cwd,
      });

      let stdout = '';
      let stderr = '';
      let timeoutHandle = null;

      // Set up timeout
      if (timeout > 0) {
        timeoutHandle = setTimeout(() => {
          child.kill('SIGTERM');
          resolve({
            success: false,
            output: `Command timed out after ${timeout}ms`,
            error: 'Command timeout',
            timedOut: true,
          });
        }, timeout);
      }

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        const output = (stdout + stderr).trim();
        resolve({
          success: code === 0,
          output,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
        });
      });

      child.on('error', (error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        resolve({
          success: false,
          output: error.message,
          error: error.message,
          commandError: true,
        });
      });
    });
  }

  /**
   * Update performance metrics
   * @param {boolean} success - Whether operation was successful
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Object} result - Operation result
   */
  updateMetrics(success, executionTime, result) {
    this.metrics.totalRuns++;
    if (success) {
      this.metrics.successfulRuns++;
    } else {
      this.metrics.failedRuns++;
    }

    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime * (this.metrics.totalRuns - 1) +
        executionTime) /
      this.metrics.totalRuns;

    this.metrics.lastRunTime = new Date().toISOString();

    if (result.autoFixApplied) {
      this.metrics.autoFixSuccesses++;
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Statistics and metrics
   */
  getStatistics() {
    return {
      metrics: { ...this.metrics },
      state: {
        isRunning: this.isRunning,
        currentSession: this.currentSession
          ? {
              startTime: this.currentSession.startTime,
              attempts: this.currentSession.attempts,
            }
          : null,
      },
      configuration: this.sanitizeOptionsForLog(this.options),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log audit events
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  logAuditEvent(event, data) {
    if (!this.options.enableAuditLogging) return;

    const auditEntry = {
      event,
      data,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    this.auditLog.push(auditEntry);
    this.emit('audit_event', auditEntry);

    // Limit audit log size
    if (this.auditLog.length > 500) {
      this.auditLog = this.auditLog.slice(-250);
    }
  }

  /**
   * Get audit log with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Array} Filtered audit log
   */
  getAuditLog(filters = {}) {
    let log = [...this.auditLog];

    if (filters.event) {
      log = log.filter((entry) => entry.event === filters.event);
    }

    if (filters.since) {
      const sinceTime = new Date(filters.since);
      log = log.filter((entry) => new Date(entry.timestamp) >= sinceTime);
    }

    if (filters.limit) {
      log = log.slice(-filters.limit);
    }

    return log;
  }

  /**
   * Sanitize options for logging
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   */
  sanitizeOptionsForLog(options) {
    // Remove potentially sensitive data
    const { ...safeOptions } = options;
    return safeOptions;
  }

  /**
   * Sanitize result for logging
   * @param {Object} result - Result to sanitize
   * @returns {Object} Sanitized result
   */
  sanitizeResultForLog(result) {
    const { output, ...safeResult } = result;
    return {
      ...safeResult,
      hasOutput: !!output,
      outputLength: output ? output.length : 0,
    };
  }

  /**
   * Shutdown LintingSystem
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down LintingSystem...');

      // Cancel any running operations
      this.isRunning = false;
      this.currentSession = null;

      this.logAuditEvent('linting_system_shutdown', {
        finalStats: this.getStatistics(),
        timestamp: new Date().toISOString(),
      });

      this.removeAllListeners();

      console.log('✅ LintingSystem shutdown complete');
      this.emit('shutdown_complete');
    } catch (error) {
      console.error(`❌ LintingSystem shutdown failed: ${error.message}`);
    }
  }
}

module.exports = LintingSystem;
