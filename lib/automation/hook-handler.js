const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

/**
 * HookHandler - Advanced git hook management and automation
 *
 * Provides comprehensive git hook integration with intelligent failure
 * handling, configuration management, and performance monitoring.
 * Supports popular hook frameworks like Husky and custom hook setups.
 *
 * Key Features:
 * - Hook detection and configuration management
 * - Intelligent failure analysis and recovery
 * - Performance monitoring and timeout handling
 * - Hook bypass mechanisms for automation
 * - Integration with linting and testing systems
 * - Comprehensive hook execution audit trails
 */
class HookHandler extends EventEmitter {
  constructor(gitIntegration, configManager, options = {}) {
    super();

    this.gitIntegration = gitIntegration;
    this.configManager = configManager;
    this.options = {
      hookTimeout: options.hookTimeout || 120000, // 2 minutes
      retryAttempts: options.retryAttempts || 2,
      retryDelay: options.retryDelay || 1000, // 1 second
      enableHookBypass: options.enableHookBypass !== false,
      enablePerformanceMonitoring:
        options.enablePerformanceMonitoring !== false,
      enableAuditLogging: options.enableAuditLogging !== false,
      parallelHookExecution: options.parallelHookExecution || false,
      ...options,
    };

    // Hook management state
    this.detectedHooks = new Map();
    this.hookExecutionHistory = [];
    this.auditLog = [];

    // Performance metrics
    this.metrics = {
      totalHookExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      timeoutExecutions: 0,
      bypassedExecutions: 0,
      averageExecutionTime: 0,
      hookPerformance: new Map(),
      lastExecutionTime: null,
    };

    // Hook type configurations
    this.hookConfigs = {
      'pre-commit': {
        description: 'Runs before commit is created',
        typical_tools: ['lint-staged', 'prettier', 'eslint'],
        timeout: 60000, // 1 minute
        critical: true,
      },
      'pre-push': {
        description: 'Runs before push to remote',
        typical_tools: ['tests', 'build validation'],
        timeout: 300000, // 5 minutes
        critical: true,
      },
      'commit-msg': {
        description: 'Validates commit message format',
        typical_tools: ['commitlint', 'conventional-commits'],
        timeout: 5000, // 5 seconds
        critical: false,
      },
      'post-commit': {
        description: 'Runs after commit is created',
        typical_tools: ['notifications', 'logging'],
        timeout: 10000, // 10 seconds
        critical: false,
      },
      'pre-rebase': {
        description: 'Runs before rebase operation',
        typical_tools: ['validation', 'backup'],
        timeout: 30000, // 30 seconds
        critical: false,
      },
    };

    // Hook failure patterns
    this.failurePatterns = {
      formatting: {
        patterns: [/prettier/i, /format/i, /indent/i, /whitespace/i],
        recovery: 'restage_files',
        retryable: true,
      },
      linting: {
        patterns: [/eslint/i, /lint/i, /style/i],
        recovery: 'fix_or_bypass',
        retryable: false,
      },
      testing: {
        patterns: [/test/i, /jest/i, /mocha/i, /spec/i],
        recovery: 'fix_or_bypass',
        retryable: false,
      },
      build: {
        patterns: [/build/i, /compile/i, /typescript/i],
        recovery: 'fix_required',
        retryable: false,
      },
      dependency: {
        patterns: [/npm/i, /yarn/i, /package/i, /module.*not.*found/i],
        recovery: 'install_deps',
        retryable: true,
      },
      permission: {
        patterns: [/permission/i, /access/i, /eacces/i],
        recovery: 'fix_permissions',
        retryable: true,
      },
    };
  }

  /**
   * Initialize HookHandler
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      this.logAuditEvent('hook_handler_initializing', {
        options: this.sanitizeOptionsForLog(this.options),
        timestamp: new Date().toISOString(),
      });

      // Detect available git hooks
      const __hooksDetected = await this.detectGitHooks(); // eslint-disable-line no-unused-vars

      // Analyze hook configurations
      await this.analyzeHookConfigurations();

      this.logAuditEvent('hook_handler_initialized', {
        hooksDetected: Array.from(this.detectedHooks.keys()),
        hookCount: this.detectedHooks.size,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `✅ HookHandler initialized - detected ${this.detectedHooks.size} hooks`
      );
      this.emit('initialized', {
        hooks: Array.from(this.detectedHooks.keys()),
        configurations: Array.from(this.detectedHooks.values()),
      });

      return true;
    } catch (error) {
      this.logAuditEvent('hook_handler_initialization_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      console.error(`❌ HookHandler initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect git hooks in the repository
   * @returns {Promise<Array<string>>} Detected hook names
   */
  async detectGitHooks() {
    const projectRoot = this.configManager.getProjectRoot();
    const fs = require('fs').promises;

    try {
      // Check .git/hooks directory for installed hooks
      const gitHooksDir = path.join(projectRoot, '.git', 'hooks');
      const detectedHooks = [];

      try {
        const hookFiles = await fs.readdir(gitHooksDir);

        for (const file of hookFiles) {
          // Skip sample files
          if (file.endsWith('.sample')) continue;

          const hookPath = path.join(gitHooksDir, file);
          try {
            const stats = await fs.stat(hookPath);
            if (stats.isFile() && stats.mode & 0o111) {
              // Executable
              const content = await fs.readFile(hookPath, 'utf8');

              this.detectedHooks.set(file, {
                name: file,
                path: hookPath,
                type: 'native',
                executable: true,
                content: content.substring(0, 500), // First 500 chars for analysis
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
              });

              detectedHooks.push(file);
            }
          } catch (error) {
            // Skip files we can't read
          }
        }
      } catch (error) {
        // .git/hooks directory doesn't exist or not readable
      }

      // Check for Husky hooks
      const huskyHooks = await this.detectHuskyHooks();
      detectedHooks.push(...huskyHooks);

      // Check for package.json hook configurations
      const packageHooks = await this.detectPackageJsonHooks();
      detectedHooks.push(...packageHooks);

      return [...new Set(detectedHooks)];
    } catch (error) {
      console.warn(`⚠️  Hook detection failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Detect Husky hooks
   * @returns {Promise<Array<string>>} Detected Husky hooks
   */
  async detectHuskyHooks() {
    const projectRoot = this.configManager.getProjectRoot();
    const fs = require('fs').promises;
    const huskyHooks = [];

    try {
      const huskyDir = path.join(projectRoot, '.husky');

      try {
        const huskyFiles = await fs.readdir(huskyDir);

        for (const file of huskyFiles) {
          if (file.startsWith('_')) continue; // Skip Husky internal files

          const hookPath = path.join(huskyDir, file);
          try {
            const stats = await fs.stat(hookPath);
            if (stats.isFile()) {
              const content = await fs.readFile(hookPath, 'utf8');

              this.detectedHooks.set(`husky-${file}`, {
                name: file,
                path: hookPath,
                type: 'husky',
                executable: true,
                content: content,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
              });

              huskyHooks.push(file);
            }
          } catch (error) {
            // Skip files we can't read
          }
        }
      } catch (error) {
        // .husky directory doesn't exist
      }
    } catch (error) {
      // Husky detection failed
    }

    return huskyHooks;
  }

  /**
   * Detect package.json hook configurations
   * @returns {Promise<Array<string>>} Detected package.json hooks
   */
  async detectPackageJsonHooks() {
    const projectRoot = this.configManager.getProjectRoot();
    const fs = require('fs').promises;
    const packageHooks = [];

    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8')
      );

      // Check for Husky configuration
      if (packageJson.husky && packageJson.husky.hooks) {
        for (const [hookName, command] of Object.entries(
          packageJson.husky.hooks
        )) {
          this.detectedHooks.set(`package-${hookName}`, {
            name: hookName,
            path: packageJsonPath,
            type: 'package-husky',
            executable: true,
            content: command,
            source: 'package.json',
          });

          packageHooks.push(hookName);
        }
      }

      // Check for lint-staged configuration
      if (packageJson['lint-staged']) {
        this.detectedHooks.set('package-lint-staged', {
          name: 'lint-staged',
          path: packageJsonPath,
          type: 'lint-staged',
          executable: true,
          content: JSON.stringify(packageJson['lint-staged'], null, 2),
          source: 'package.json',
        });

        packageHooks.push('lint-staged');
      }
    } catch (error) {
      // Package.json check failed
    }

    return packageHooks;
  }

  /**
   * Analyze hook configurations for performance and compatibility
   * @returns {Promise<void>}
   */
  async analyzeHookConfigurations() {
    for (const [hookName, hookInfo] of this.detectedHooks) {
      try {
        const analysis = {
          complexity: 'unknown',
          tools: [],
          estimatedTime: 0,
          risks: [],
          recommendations: [],
        };

        // Analyze hook content for tools and complexity
        const content = hookInfo.content || '';
        const lowerContent = content.toLowerCase();

        // Detect tools used in hook
        const toolIndicators = {
          prettier: /prettier/i,
          eslint: /eslint/i,
          'lint-staged': /lint-staged/i,
          jest: /jest/i,
          mocha: /mocha/i,
          typescript: /tsc|typescript/i,
          webpack: /webpack/i,
          npm: /npm\s+(run|test|build)/i,
          yarn: /yarn\s+(run|test|build)/i,
        };

        for (const [tool, pattern] of Object.entries(toolIndicators)) {
          if (pattern.test(content)) {
            analysis.tools.push(tool);
          }
        }

        // Estimate complexity based on content
        if (analysis.tools.length > 3) {
          analysis.complexity = 'high';
          analysis.estimatedTime = 60000; // 1 minute
        } else if (analysis.tools.length > 1) {
          analysis.complexity = 'medium';
          analysis.estimatedTime = 30000; // 30 seconds
        } else {
          analysis.complexity = 'low';
          analysis.estimatedTime = 10000; // 10 seconds
        }

        // Identify potential risks
        if (
          lowerContent.includes('npm install') ||
          lowerContent.includes('yarn install')
        ) {
          analysis.risks.push('dependency_installation');
        }
        if (lowerContent.includes('rm ') || lowerContent.includes('delete')) {
          analysis.risks.push('file_deletion');
        }
        if (content.length > 1000) {
          analysis.risks.push('complex_script');
        }

        // Generate recommendations
        if (analysis.complexity === 'high') {
          analysis.recommendations.push(
            'Consider splitting into multiple hooks'
          );
        }
        if (analysis.tools.includes('npm') && analysis.tools.includes('yarn')) {
          analysis.recommendations.push(
            'Standardize on single package manager'
          );
        }
        if (analysis.risks.length > 0) {
          analysis.recommendations.push('Add error handling and validation');
        }

        // Update hook info with analysis
        hookInfo.analysis = analysis;
      } catch (error) {
        console.warn(
          `⚠️  Hook analysis failed for ${hookName}: ${error.message}`
        );
      }
    }
  }

  /**
   * Execute git hook with comprehensive monitoring
   * @param {string} hookName - Name of hook to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Hook execution result
   */
  async executeHook(hookName, options = {}) {
    const startTime = Date.now();

    try {
      const {
        bypassOnFailure = false,
        maxRetries = this.options.retryAttempts,
        timeout = this.options.hookTimeout,
        environment = {},
      } = options;

      const hookInfo = this.detectedHooks.get(hookName);
      if (!hookInfo) {
        return {
          success: false,
          error: `Hook '${hookName}' not found`,
          skipped: true,
        };
      }

      this.logAuditEvent('hook_execution_started', {
        hookName,
        hookType: hookInfo.type,
        options: this.sanitizeOptionsForLog(options),
        timestamp: new Date().toISOString(),
      });

      console.log(`🔧 Executing ${hookName} hook...`);

      let finalResult = null;
      let attempt = 1;

      while (attempt <= maxRetries) {
        console.log(`🔄 Hook execution attempt ${attempt}/${maxRetries}...`);

        const executionResult = await this.runHook(hookInfo, {
          timeout,
          environment,
          attempt,
        });

        if (executionResult.success) {
          finalResult = executionResult;
          break;
        }

        // Analyze failure and determine if retry is warranted
        const failureAnalysis = this.analyzeHookFailure(executionResult);

        if (failureAnalysis.retryable && attempt < maxRetries) {
          console.log(
            `🔄 Hook failure is retryable: ${failureAnalysis.reason}`
          );

          // Apply recovery actions if available
          if (failureAnalysis.recovery) {
            const recoveryResult = await this.applyRecoveryAction(
              failureAnalysis.recovery,
              executionResult
            );
            if (recoveryResult.success) {
              console.log(
                `🔧 Recovery action applied: ${recoveryResult.action}`
              );
            }
          }

          await this.delay(this.options.retryDelay * attempt);
          attempt++;
          continue;
        } else {
          finalResult = executionResult;
          break;
        }
      }

      const executionTime = Date.now() - startTime;
      this.updateMetrics(
        hookName,
        finalResult.success,
        executionTime,
        finalResult
      );

      const result = {
        ...finalResult,
        hookName,
        hookType: hookInfo.type,
        attempts: attempt,
        executionTime,
        analysis: hookInfo.analysis,
      };

      // Add to execution history
      this.addToExecutionHistory(result);

      this.logAuditEvent('hook_execution_completed', {
        hookName,
        success: result.success,
        attempts: result.attempts,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      if (result.success) {
        console.log(`✅ Hook ${hookName} executed successfully`);
        this.emit('hook_success', result);
      } else {
        console.error(`❌ Hook ${hookName} failed`);

        // Handle bypass option
        if (bypassOnFailure && this.options.enableHookBypass) {
          console.log('⚠️  Bypassing hook failure as requested');
          result.bypassed = true;
          result.success = true; // Mark as success for automation purposes
          this.metrics.bypassedExecutions++;
        }

        this.displayHookFailureHelp(result);
        this.emit('hook_failed', result);
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logAuditEvent('hook_execution_error', {
        hookName,
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: `Hook execution failed: ${error.message}`,
        hookName,
        executionTime,
      };
    }
  }

  /**
   * Run individual hook
   * @param {Object} hookInfo - Hook information
   * @param {Object} options - Run options
   * @returns {Promise<Object>} Hook run result
   */
  async runHook(hookInfo, options = {}) {
    try {
      const {
        timeout = this.options.hookTimeout,
        environment = {},
        attempt = 1,
      } = options;

      let command, args, cwd;

      // Determine execution method based on hook type
      if (hookInfo.type === 'native') {
        // Native git hook - execute directly
        command = hookInfo.path;
        args = [];
        cwd = this.configManager.getProjectRoot();
      } else if (hookInfo.type === 'husky') {
        // Husky hook - execute through husky
        command = 'npx';
        args = ['husky', 'run', hookInfo.name];
        cwd = this.configManager.getProjectRoot();
      } else if (hookInfo.type === 'package-husky') {
        // Package.json husky configuration - execute command directly
        const cmdParts = hookInfo.content.split(' ');
        command = cmdParts[0];
        args = cmdParts.slice(1);
        cwd = this.configManager.getProjectRoot();
      } else if (hookInfo.type === 'lint-staged') {
        // Lint-staged hook
        command = 'npx';
        args = ['lint-staged'];
        cwd = this.configManager.getProjectRoot();
      } else {
        throw new Error(`Unsupported hook type: ${hookInfo.type}`);
      }

      // Execute hook
      const result = await this.executeCommand(command, args, {
        timeout,
        cwd,
        environment,
        description: `Execute ${hookInfo.name} hook`,
      });

      return {
        success: result.success,
        output: result.output,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        command: `${command} ${args.join(' ')}`,
        attempt,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        attempt: options.attempt || 1,
      };
    }
  }

  /**
   * Analyze hook failure for retry logic
   * @param {Object} executionResult - Hook execution result
   * @returns {Object} Failure analysis
   */
  analyzeHookFailure(executionResult) {
    const analysis = {
      retryable: false,
      reason: 'unknown',
      category: 'unknown',
      recovery: null,
      suggestions: [],
    };

    const output = executionResult.output || executionResult.error || '';
    const lowerOutput = output.toLowerCase();

    // Categorize failure using patterns
    for (const [category, config] of Object.entries(this.failurePatterns)) {
      if (config.patterns.some((pattern) => pattern.test(output))) {
        analysis.category = category;
        analysis.retryable = config.retryable;
        analysis.recovery = config.recovery;
        analysis.reason = `${category} issue detected`;
        break;
      }
    }

    // Check for timeout
    if (executionResult.timedOut) {
      analysis.category = 'timeout';
      analysis.retryable = true;
      analysis.reason = 'Hook execution timed out';
      analysis.suggestions.push('Increase hook timeout');
      analysis.suggestions.push('Optimize hook performance');
    }

    // Check for network issues
    if (lowerOutput.includes('enotfound') || lowerOutput.includes('network')) {
      analysis.category = 'network';
      analysis.retryable = true;
      analysis.reason = 'Network connectivity issue';
      analysis.suggestions.push('Check network connectivity');
      analysis.suggestions.push('Retry operation');
    }

    // Generate category-specific suggestions
    switch (analysis.category) {
      case 'formatting':
        analysis.suggestions.push(
          'Files were reformatted - re-staging required'
        );
        break;
      case 'linting':
        analysis.suggestions.push('Fix linting errors in code');
        analysis.suggestions.push('Use --fix flag for auto-fixable issues');
        break;
      case 'testing':
        analysis.suggestions.push('Fix failing tests');
        analysis.suggestions.push('Check test environment setup');
        break;
      case 'dependency':
        analysis.suggestions.push('Install missing dependencies');
        analysis.suggestions.push('Check package.json configuration');
        break;
    }

    return analysis;
  }

  /**
   * Apply recovery action for hook failure
   * @param {string} recoveryAction - Recovery action to apply
   * @param {Object} executionResult - Failed execution result
   * @returns {Promise<Object>} Recovery result
   */
  async applyRecoveryAction(recoveryAction, _executionResult) {
    try {
      switch (recoveryAction) {
        case 'restage_files': {
          // Re-stage files that may have been modified
          const restageResult = await this.gitIntegration.stageFiles('.', {
            allowEmpty: true,
          });
          return {
            success: restageResult.success,
            action: 'Re-staged modified files',
            details: restageResult,
          };
        }

        case 'install_deps': {
          // Try to install dependencies
          const installResult = await this.executeCommand('npm', ['install'], {
            timeout: 60000,
            cwd: this.configManager.getProjectRoot(),
            description: 'Install dependencies',
          });
          return {
            success: installResult.success,
            action: 'Installed dependencies',
            details: installResult,
          };
        }

        case 'fix_permissions':
          // This would be platform-specific - for now just return guidance
          return {
            success: false,
            action: 'Permission fix required',
            details: {
              message: 'Manual permission fix required',
              suggestions: [
                'Check file/directory permissions',
                'Run with appropriate privileges',
              ],
            },
          };

        default:
          return {
            success: false,
            action: 'No recovery action available',
            details: { message: `Unknown recovery action: ${recoveryAction}` },
          };
      }
    } catch (error) {
      return {
        success: false,
        action: `Recovery action failed: ${recoveryAction}`,
        details: { error: error.message },
      };
    }
  }

  /**
   * Add execution result to history
   * @param {Object} result - Hook execution result
   */
  addToExecutionHistory(result) {
    this.hookExecutionHistory.push({
      ...result,
      timestamp: new Date().toISOString(),
    });

    // Limit history size
    if (this.hookExecutionHistory.length > 100) {
      this.hookExecutionHistory = this.hookExecutionHistory.slice(-50);
    }
  }

  /**
   * Display hook failure help
   * @param {Object} result - Hook failure result
   */
  displayHookFailureHelp(result) {
    console.log(`\n❌ Hook Failure Help: ${result.hookName}`);
    console.log('='.repeat(40));

    if (result.analysis) {
      const analysis = result.analysis;
      console.log(`Estimated Complexity: ${analysis.complexity}`);
      console.log(`Tools Detected: ${analysis.tools.join(', ') || 'none'}`);

      if (analysis.risks.length > 0) {
        console.log(`Risks: ${analysis.risks.join(', ')}`);
      }
    }

    if (result.output) {
      console.log('\n📜 Hook Output:');
      console.log(result.output.substring(0, 1000)); // First 1000 chars
    }

    console.log('\n💡 Suggested Actions:');
    console.log('  1. Review hook configuration and dependencies');
    console.log('  2. Run hook manually to debug issues');
    console.log('  3. Consider bypassing hook if non-critical');
    console.log('  4. Check project documentation for hook requirements');
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
        timeout = this.options.hookTimeout,
        cwd = process.cwd(),
        environment = {},
      } = options;

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: cwd,
        env: { ...process.env, ...environment },
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
   * @param {string} hookName - Hook name
   * @param {boolean} success - Whether operation was successful
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Object} result - Operation result
   */
  updateMetrics(hookName, success, executionTime, result) {
    this.metrics.totalHookExecutions++;
    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    if (result.timedOut) {
      this.metrics.timeoutExecutions++;
    }

    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime *
        (this.metrics.totalHookExecutions - 1) +
        executionTime) /
      this.metrics.totalHookExecutions;

    this.metrics.lastExecutionTime = new Date().toISOString();

    // Update per-hook metrics
    if (!this.metrics.hookPerformance.has(hookName)) {
      this.metrics.hookPerformance.set(hookName, {
        executions: 0,
        successes: 0,
        failures: 0,
        averageTime: 0,
        totalTime: 0,
      });
    }

    const hookMetrics = this.metrics.hookPerformance.get(hookName);
    hookMetrics.executions++;
    hookMetrics.totalTime += executionTime;
    hookMetrics.averageTime = hookMetrics.totalTime / hookMetrics.executions;

    if (success) {
      hookMetrics.successes++;
    } else {
      hookMetrics.failures++;
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Statistics and metrics
   */
  getStatistics() {
    return {
      metrics: {
        ...this.metrics,
        hookPerformance: Object.fromEntries(
          this.metrics.hookPerformance.entries()
        ),
      },
      hooks: {
        detected: this.detectedHooks.size,
        byType: this.getHooksByType(),
        configurations: Array.from(this.detectedHooks.entries()).map(
          ([name, info]) => ({
            name,
            type: info.type,
            complexity: info.analysis?.complexity || 'unknown',
            tools: info.analysis?.tools || [],
          })
        ),
      },
      history: {
        recentExecutions: this.hookExecutionHistory.slice(-10),
        totalExecutions: this.hookExecutionHistory.length,
      },
      configuration: this.sanitizeOptionsForLog(this.options),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get hooks grouped by type
   * @returns {Object} Hooks grouped by type
   */
  getHooksByType() {
    const byType = {};
    for (const [name, info] of this.detectedHooks) {
      if (!byType[info.type]) {
        byType[info.type] = [];
      }
      byType[info.type].push(name);
    }
    return byType;
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
   * Sanitize options for logging
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   */
  sanitizeOptionsForLog(options) {
    const { environment, ...safeOptions } = options;
    return {
      ...safeOptions,
      hasEnvironment: !!environment,
    };
  }

  /**
   * Delay utility for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Shutdown HookHandler
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down HookHandler...');

      this.logAuditEvent('hook_handler_shutdown', {
        finalStats: this.getStatistics(),
        timestamp: new Date().toISOString(),
      });

      this.removeAllListeners();

      console.log('✅ HookHandler shutdown complete');
      this.emit('shutdown_complete');
    } catch (error) {
      console.error(`❌ HookHandler shutdown failed: ${error.message}`);
    }
  }
}

module.exports = HookHandler;
