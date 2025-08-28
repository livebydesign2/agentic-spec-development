// const { spawn } = require('child_process');  // Unused import
const path = require('path');
const EventEmitter = require('events');

/**
 * CommitSystem - Intelligent commit automation with pre-commit hook integration
 *
 * Provides comprehensive commit workflow automation with intelligent message
 * generation, pre-commit hook handling, and rollback capabilities. Integrates
 * with git workflow systems for seamless task completion automation.
 *
 * Key Features:
 * - Intelligent commit message generation with templates
 * - Pre-commit hook integration with failure handling
 * - Rollback capabilities for failed operations
 * - Commit verification and integrity checking
 * - Integration with file tracking and staging systems
 * - Comprehensive audit logging for all commit operations
 * - Support for conventional commit formats
 */
class CommitSystem extends EventEmitter {
  constructor(gitIntegration, configManager, options = {}) {
    super();

    this.gitIntegration = gitIntegration;
    this.configManager = configManager;
    this.options = {
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 2000, // 2 seconds
      enableHookHandling: options.enableHookHandling !== false,
      enableRollback: options.enableRollback !== false,
      conventionalCommits: options.conventionalCommits !== false,
      enableAuditLogging: options.enableAuditLogging !== false,
      signCommits: options.signCommits || false,
      ...options
    };

    // Commit state
    this.isCommitting = false;
    this.currentCommitSession = null;
    this.auditLog = [];
    this.rollbackStack = [];

    // Performance metrics
    this.metrics = {
      totalCommits: 0,
      successfulCommits: 0,
      failedCommits: 0,
      hookFailures: 0,
      rollbacksExecuted: 0,
      averageCommitTime: 0,
      lastCommitTime: null
    };

    // Commit message templates
    this.messageTemplates = {
      task_completion: {
        format: 'feat({scope}): complete {taskId} - {description}',
        example: 'feat(cli): complete TASK-001 - implement git integration system'
      },
      bug_fix: {
        format: 'fix({scope}): {description}',
        example: 'fix(parser): resolve null pointer exception in feature parsing'
      },
      documentation: {
        format: 'docs({scope}): {description}',
        example: 'docs(api): update API documentation for new endpoints'
      },
      refactor: {
        format: 'refactor({scope}): {description}',
        example: 'refactor(core): extract common validation logic'
      },
      test: {
        format: 'test({scope}): {description}',
        example: 'test(integration): add comprehensive workflow tests'
      },
      chore: {
        format: 'chore({scope}): {description}',
        example: 'chore(deps): update dependencies to latest versions'
      },
      release: {
        format: 'release: {version}',
        example: 'release: v1.2.0'
      }
    };

    // Pre-commit hook patterns
    this.hookPatterns = {
      husky: {
        configFiles: ['.husky/pre-commit', '.husky/_/husky.sh'],
        indicators: ['husky', 'pre-commit']
      },
      lint_staged: {
        configFiles: ['.lintstagedrc', '.lintstagedrc.json', 'lint-staged.config.js'],
        indicators: ['lint-staged']
      },
      prettier: {
        configFiles: ['.prettierrc', 'prettier.config.js'],
        indicators: ['prettier']
      },
      eslint: {
        configFiles: ['.eslintrc.js', '.eslintrc.json'],
        indicators: ['eslint']
      }
    };
  }

  /**
   * Initialize CommitSystem
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      this.logAuditEvent('commit_system_initializing', {
        options: this.sanitizeOptionsForLog(this.options),
        timestamp: new Date().toISOString()
      });

      // Detect pre-commit hooks
      const hooksDetected = await this.detectPreCommitHooks();

      // Validate git integration
      if (!this.gitIntegration) {
        throw new Error('GitIntegration instance is required');
      }

      this.logAuditEvent('commit_system_initialized', {
        hooksDetected: hooksDetected,
        gitIntegrationAvailable: !!this.gitIntegration,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ CommitSystem initialized - detected hooks: ${hooksDetected.join(', ') || 'none'}`);
      this.emit('initialized', { hooks: hooksDetected });
      return true;

    } catch (error) {
      this.logAuditEvent('commit_system_initialization_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ CommitSystem initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect pre-commit hooks in the repository
   * @returns {Promise<Array<string>>} Detected hooks
   */
  async detectPreCommitHooks() {
    const detected = [];
    const projectRoot = this.configManager.getProjectRoot();
    const fs = require('fs').promises;

    try {
      // Check for hook configuration files
      for (const [hookName, config] of Object.entries(this.hookPatterns)) {
        for (const configFile of config.configFiles) {
          try {
            await fs.access(path.join(projectRoot, configFile));
            if (!detected.includes(hookName)) {
              detected.push(hookName);
            }
            break;
          } catch (error) {
            // Config file doesn't exist, continue
          }
        }
      }

      // Check package.json for hook configurations
      try {
        const packageJsonPath = path.join(projectRoot, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

        if (packageJson.husky) detected.push('husky');
        if (packageJson['lint-staged']) detected.push('lint_staged');
        if (packageJson.scripts) {
          const scripts = Object.keys(packageJson.scripts);
          if (scripts.some(s => s.includes('pre-commit'))) {
            detected.push('pre-commit-script');
          }
        }
      } catch (error) {
        // Package.json check failed, continue
      }

    } catch (error) {
      console.warn(`⚠️  Hook detection failed: ${error.message}`);
    }

    return [...new Set(detected)];
  }

  /**
   * Create commit with comprehensive workflow automation
   * @param {Object} options - Commit options
   * @returns {Promise<Object>} Commit result
   */
  async createCommit(options = {}) {
    if (this.isCommitting) {
      return {
        success: false,
        error: 'Commit operation already in progress'
      };
    }

    const startTime = Date.now();

    try {
      const {
        message = null,
        template = 'task_completion',
        templateData = {},
        files = null, // Auto-detect if null
        skipHooks = false,
        allowEmpty = false,
        author = null,
        signOff = false,
        dryRun = false
      } = options;

      this.isCommitting = true;
      this.currentCommitSession = {
        startTime: new Date().toISOString(),
        options: this.sanitizeOptionsForLog(options),
        attempts: 0,
        results: [],
        rollbackPoints: []
      };

      this.logAuditEvent('commit_session_started', {
        hasMessage: !!message,
        template: template,
        dryRun: dryRun,
        timestamp: new Date().toISOString()
      });

      console.log('📋 Creating commit...');

      // Step 1: Generate commit message if not provided
      let commitMessage = message;
      if (!commitMessage) {
        const messageResult = this.generateCommitMessage(template, templateData);
        if (!messageResult.success) {
          throw new Error(`Message generation failed: ${messageResult.error}`);
        }
        commitMessage = messageResult.message;
      }

      console.log(`📝 Commit message: ${commitMessage.split('\n')[0]}`);

      // Step 2: Stage files if not already staged
      const stagingResult = await this.handleFileStaging(files);
      if (!stagingResult.success) {
        throw new Error(`File staging failed: ${stagingResult.error}`);
      }

      if (dryRun) {
        const result = {
          success: true,
          message: commitMessage,
          stagedFiles: stagingResult.stagedFiles,
          dryRun: true,
          executionTime: Date.now() - startTime
        };

        console.log('🗺 Dry run completed - no commit created');
        return result;
      }

      // Step 3: Create rollback point
      if (this.options.enableRollback) {
        const rollbackPoint = await this.createRollbackPoint();
        this.currentCommitSession.rollbackPoints.push(rollbackPoint);
      }

      // Step 4: Execute commit with retry logic
      let finalResult = null;
      let attempt = 1;
      const maxAttempts = this.options.retryAttempts;

      while (attempt <= maxAttempts) {
        console.log(`🔄 Commit attempt ${attempt}/${maxAttempts}...`);

        const commitResult = await this.executeCommit(commitMessage, {
          skipHooks,
          allowEmpty,
          author,
          signOff: false,
          attempt
        });

        this.currentCommitSession.attempts = attempt;
        this.currentCommitSession.results.push(commitResult);

        if (commitResult.success) {
          finalResult = commitResult;
          break;
        }

        // Handle pre-commit hook failures
        if (this.isPreCommitHookFailure(commitResult) && this.options.enableHookHandling) {
          const hookHandlingResult = await this.handlePreCommitHookFailure(commitResult, attempt);

          if (hookHandlingResult.retryRecommended && attempt < maxAttempts) {
            console.log('🔄 Hook handling applied, retrying commit...');
            await this.delay(this.options.retryDelay * attempt);
            attempt++;
            continue;
          }
        }

        // Non-recoverable failure
        if (attempt === maxAttempts) {
          finalResult = commitResult;
        } else {
          await this.delay(this.options.retryDelay * attempt);
          attempt++;
        }
      }

      const executionTime = Date.now() - startTime;
      this.updateMetrics(finalResult.success, executionTime, finalResult);

      const result = {
        ...finalResult,
        message: commitMessage,
        attempts: attempt,
        executionTime,
        session: this.currentCommitSession,
        rollbackAvailable: this.currentCommitSession.rollbackPoints.length > 0
      };

      this.logAuditEvent('commit_session_completed', {
        success: result.success,
        attempts: result.attempts,
        executionTime,
        commitHash: result.commitHash,
        timestamp: new Date().toISOString()
      });

      if (result.success) {
        console.log(`✅ Commit created successfully: ${result.commitHash?.substring(0, 8) || 'unknown'}`);
        this.emit('commit_created', result);
      } else {
        console.error(`❌ Commit failed: ${result.error}`);
        this.displayCommitFailureHelp(result);
        this.emit('commit_failed', result);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logAuditEvent('commit_session_failed', {
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `Commit creation failed: ${error.message}`,
        executionTime
      };
    } finally {
      this.isCommitting = false;
      this.currentCommitSession = null;
    }
  }

  /**
   * Generate commit message using template
   * @param {string} template - Template name
   * @param {Object} data - Template data
   * @returns {Object} Message generation result
   */
  generateCommitMessage(template, data) {
    try {
      const templateConfig = this.messageTemplates[template];
      if (!templateConfig) {
        return {
          success: false,
          error: `Unknown template: ${template}`
        };
      }

      let message = templateConfig.format;

      // Replace template variables
      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{${key}}`;
        if (message.includes(placeholder)) {
          message = message.replace(new RegExp(placeholder, 'g'), value);
        }
      }

      // Check for unreplaced placeholders
      const unreplacedPlaceholders = message.match(/{[^}]+}/g);
      if (unreplacedPlaceholders) {
        return {
          success: false,
          error: `Missing template data for: ${unreplacedPlaceholders.join(', ')}`
        };
      }

      // Add conventional commit footer
      const footer = '\n\n🤖 Generated with [Claude Code](https://claude.ai/code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>';

      return {
        success: true,
        message: message + footer,
        template: template
      };

    } catch (error) {
      return {
        success: false,
        error: `Message generation failed: ${error.message}`
      };
    }
  }

  /**
   * Handle file staging for commit
   * @param {Array|string|null} files - Files to stage
   * @returns {Promise<Object>} Staging result
   */
  async handleFileStaging(files) {
    try {
      // If no files specified, check current git status
      if (!files) {
        const statusResult = await this.gitIntegration.getGitStatus();
        if (!statusResult.success) {
          throw new Error(`Failed to get git status: ${statusResult.error}`);
        }

        if (statusResult.files.length === 0) {
          return {
            success: true,
            message: 'No files to stage',
            stagedFiles: [],
            skipped: true
          };
        }

        // Stage all modified files
        files = '.';
      }

      // Use GitIntegration to stage files
      const stagingResult = await this.gitIntegration.stageFiles(files, {
        skipValidation: false,
        allowEmpty: false
      });

      if (!stagingResult.success) {
        throw new Error(stagingResult.error);
      }

      console.log(`📁 Staged ${stagingResult.stagedFiles?.length || 0} files`);

      return {
        success: true,
        stagedFiles: stagingResult.stagedFiles || [],
        stagedCount: stagingResult.stagedCount || 0
      };

    } catch (error) {
      return {
        success: false,
        error: `File staging failed: ${error.message}`
      };
    }
  }

  /**
   * Execute git commit with options
   * @param {string} message - Commit message
   * @param {Object} options - Commit execution options
   * @returns {Promise<Object>} Commit execution result
   */
  async executeCommit(message, options = {}) {
    try {
      const {
        skipHooks = false,
        allowEmpty = false,
        author = null,
        signOff = false,
        attempt = 1
      } = options;

      // Use GitIntegration to create commit
      const commitResult = await this.gitIntegration.createCommit(message, {
        retryOnHookFailure: this.options.enableHookHandling,
        maxRetries: 1, // We handle retries at this level
        allowEmpty,
        skipHooks,
        author
      });

      if (commitResult.success) {
        // Verify commit was created
        const verificationResult = await this.verifyCommit(commitResult.commitHash);
        if (!verificationResult.success) {
          return {
            success: false,
            error: `Commit verification failed: ${verificationResult.error}`,
            commitHash: commitResult.commitHash
          };
        }

        return {
          success: true,
          commitHash: commitResult.commitHash,
          message: message,
          attempt: attempt,
          verified: true
        };
      } else {
        return {
          success: false,
          error: commitResult.error,
          output: commitResult.output || '',
          attempt: attempt
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Commit execution failed: ${error.message}`,
        attempt: 1
      };
    }
  }

  /**
   * Verify commit was created successfully
   * @param {string} commitHash - Commit hash to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyCommit(commitHash) {
    try {
      if (!commitHash || commitHash === 'unknown') {
        return {
          success: false,
          error: 'No commit hash provided for verification'
        };
      }

      // Use GitIntegration to verify commit exists
      const verifyResult = await this.gitIntegration.runGitCommand(
        ['show', '--format=%H %s', '--no-patch', commitHash],
        { description: 'Verify commit' }
      );

      if (verifyResult.success && verifyResult.output.includes(commitHash)) {
        return {
          success: true,
          commitInfo: verifyResult.output.trim()
        };
      } else {
        return {
          success: false,
          error: 'Commit not found in repository'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Commit verification failed: ${error.message}`
      };
    }
  }

  /**
   * Check if error is from pre-commit hook failure
   * @param {Object} commitResult - Commit result
   * @returns {boolean} Whether it's a pre-commit hook failure
   */
  isPreCommitHookFailure(commitResult) {
    if (!commitResult.output && !commitResult.error) {
      return false;
    }

    const output = (commitResult.output || commitResult.error || '').toLowerCase();
    const hookIndicators = [
      'pre-commit',
      'pre-commit hook',
      'husky',
      'lint-staged',
      'prettier',
      'eslint',
      'hook failed',
      'hook script failed'
    ];

    return hookIndicators.some(indicator => output.includes(indicator));
  }

  /**
   * Handle pre-commit hook failures
   * @param {Object} commitResult - Failed commit result
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Hook handling result
   */
  async handlePreCommitHookFailure(commitResult, attempt) {
    try {
      this.metrics.hookFailures++;

      this.logAuditEvent('pre_commit_hook_failure', {
        attempt: attempt,
        error: commitResult.error,
        output: commitResult.output,
        timestamp: new Date().toISOString()
      });

      console.log('⚠️  Pre-commit hook failed, analyzing...');

      const analysis = this.analyzeHookFailure(commitResult.output || commitResult.error);

      let retryRecommended = false;
      let actionsApplied = [];

      // Handle specific hook failure types
      if (analysis.type === 'formatting') {
        console.log('🔧 Detected formatting issues, re-staging files...');

        // Re-stage files that may have been modified by formatters
        const restageResult = await this.gitIntegration.stageFiles('.', {
          allowEmpty: true
        });

        if (restageResult.success) {
          actionsApplied.push('re-staged modified files');
          retryRecommended = true;
        }
      } else if (analysis.type === 'linting') {
        console.log('⚠️  Linting errors detected - manual intervention may be required');
        actionsApplied.push('identified linting errors');
        // Don't retry for linting errors as they likely require manual fixes
      } else if (analysis.type === 'testing') {
        console.log('⚠️  Test failures detected - manual intervention required');
        actionsApplied.push('identified test failures');
        // Don't retry for test failures
      } else {
        console.log('🔄 Generic hook failure, will retry with re-staging');

        // Generic retry strategy - re-stage files
        const restageResult = await this.gitIntegration.stageFiles('.', {
          allowEmpty: true
        });

        if (restageResult.success) {
          actionsApplied.push('re-staged files');
          retryRecommended = true;
        }
      }

      return {
        success: true,
        retryRecommended: retryRecommended,
        analysis: analysis,
        actionsApplied: actionsApplied,
        suggestions: analysis.suggestions
      };

    } catch (error) {
      return {
        success: false,
        error: `Hook failure handling failed: ${error.message}`,
        retryRecommended: false
      };
    }
  }

  /**
   * Analyze hook failure output
   * @param {string} output - Hook failure output
   * @returns {Object} Failure analysis
   */
  analyzeHookFailure(output) {
    const analysis = {
      type: 'unknown',
      suggestions: [],
      details: []
    };

    if (!output) {
      return analysis;
    }

    const lowerOutput = output.toLowerCase();

    // Categorize failure type
    if (lowerOutput.includes('prettier') || lowerOutput.includes('format')) {
      analysis.type = 'formatting';
      analysis.suggestions = [
        'Files were reformatted by Prettier',
        'Re-staging files and retrying commit'
      ];
    } else if (lowerOutput.includes('eslint') || lowerOutput.includes('lint')) {
      analysis.type = 'linting';
      analysis.suggestions = [
        'Fix linting errors in the code',
        'Run linter manually to see detailed errors',
        'Consider using --fix flag for auto-fixable issues'
      ];
    } else if (lowerOutput.includes('test') || lowerOutput.includes('jest') || lowerOutput.includes('mocha')) {
      analysis.type = 'testing';
      analysis.suggestions = [
        'Fix failing tests before committing',
        'Run tests manually to debug failures',
        'Ensure all tests pass locally'
      ];
    } else if (lowerOutput.includes('husky') || lowerOutput.includes('lint-staged')) {
      analysis.type = 'hook_setup';
      analysis.suggestions = [
        'Check hook configuration',
        'Ensure all required dependencies are installed',
        'Verify hook setup is correct'
      ];
    }

    // Extract specific error details
    const lines = output.split('\n');
    analysis.details = lines
      .filter(line => line.trim().length > 0)
      .slice(0, 10) // Limit to first 10 lines
      .map(line => line.trim());

    return analysis;
  }

  /**
   * Create rollback point for commit operation
   * @returns {Promise<Object>} Rollback point
   */
  async createRollbackPoint() {
    try {
      // Get current HEAD commit
      const headResult = await this.gitIntegration.runGitCommand(
        ['rev-parse', 'HEAD'],
        { description: 'Get current HEAD' }
      );

      // Get current staged files
      const statusResult = await this.gitIntegration.getGitStatus();

      const rollbackPoint = {
        timestamp: new Date().toISOString(),
        headCommit: headResult.success ? headResult.output.trim() : null,
        stagedFiles: statusResult.success ? statusResult.detailedFiles || [] : []
      };

      this.rollbackStack.push(rollbackPoint);

      // Limit rollback stack size
      if (this.rollbackStack.length > 10) {
        this.rollbackStack = this.rollbackStack.slice(-10);
      }

      return rollbackPoint;

    } catch (error) {
      console.warn(`⚠️  Failed to create rollback point: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute rollback to previous state
   * @param {Object} rollbackPoint - Rollback point to restore
   * @returns {Promise<Object>} Rollback result
   */
  async executeRollback(rollbackPoint) {
    try {
      if (!rollbackPoint) {
        throw new Error('No rollback point provided');
      }

      console.log('🔄 Executing rollback...');

      // Reset to previous HEAD if it changed
      if (rollbackPoint.headCommit) {
        const currentHeadResult = await this.gitIntegration.runGitCommand(
          ['rev-parse', 'HEAD'],
          { description: 'Get current HEAD for rollback' }
        );

        if (currentHeadResult.success &&
            currentHeadResult.output.trim() !== rollbackPoint.headCommit) {

          // Reset to previous commit
          const resetResult = await this.gitIntegration.runGitCommand(
            ['reset', '--hard', rollbackPoint.headCommit],
            { description: 'Reset to previous HEAD' }
          );

          if (!resetResult.success) {
            throw new Error(`Failed to reset HEAD: ${resetResult.output}`);
          }
        }
      }

      // Restore staged files
      if (rollbackPoint.stagedFiles.length > 0) {
        const filesToRestore = rollbackPoint.stagedFiles
          .filter(f => f.isStaged)
          .map(f => f.path);

        if (filesToRestore.length > 0) {
          const restoreResult = await this.gitIntegration.stageFiles(filesToRestore);
          if (!restoreResult.success) {
            console.warn(`⚠️  Failed to restore staged files: ${restoreResult.error}`);
          }
        }
      }

      this.metrics.rollbacksExecuted++;

      this.logAuditEvent('rollback_executed', {
        rollbackPoint: {
          timestamp: rollbackPoint.timestamp,
          headCommit: rollbackPoint.headCommit
        },
        timestamp: new Date().toISOString()
      });

      console.log('✅ Rollback completed successfully');
      this.emit('rollback_executed', rollbackPoint);

      return {
        success: true,
        rollbackPoint: rollbackPoint
      };

    } catch (error) {
      this.logAuditEvent('rollback_failed', {
        error: error.message,
        rollbackPoint: rollbackPoint ? {
          timestamp: rollbackPoint.timestamp
        } : null,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `Rollback failed: ${error.message}`
      };
    }
  }

  /**
   * Display commit failure help
   * @param {Object} result - Commit failure result
   */
  displayCommitFailureHelp(result) {
    console.log('\n❌ Commit Failure Help:');
    console.log('='.repeat(30));

    if (result.session && result.session.results.length > 0) {
      const lastResult = result.session.results[result.session.results.length - 1];

      if (lastResult.output || lastResult.error) {
        console.log('📜 Error Details:');
        console.log((lastResult.output || lastResult.error).substring(0, 500));
      }
    }

    console.log('\n💡 Suggested Actions:');
    console.log('  1. Check git status and resolve any conflicts');
    console.log('  2. Ensure all files are properly staged');
    console.log('  3. Fix any linting or formatting errors');
    console.log('  4. Run tests to ensure they pass');

    if (result.rollbackAvailable) {
      console.log('  5. Use rollback if needed to restore previous state');
    }
  }

  /**
   * Update performance metrics
   * @param {boolean} success - Whether operation was successful
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Object} result - Operation result
   */
  updateMetrics(success, executionTime, _result) {
    this.metrics.totalCommits++;
    if (success) {
      this.metrics.successfulCommits++;
    } else {
      this.metrics.failedCommits++;
    }

    this.metrics.averageCommitTime =
      (this.metrics.averageCommitTime * (this.metrics.totalCommits - 1) + executionTime) /
      this.metrics.totalCommits;

    this.metrics.lastCommitTime = new Date().toISOString();
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Statistics and metrics
   */
  getStatistics() {
    return {
      metrics: { ...this.metrics },
      state: {
        isCommitting: this.isCommitting,
        currentSession: this.currentCommitSession ? {
          startTime: this.currentCommitSession.startTime,
          attempts: this.currentCommitSession.attempts
        } : null
      },
      rollback: {
        stackSize: this.rollbackStack.length,
        available: this.rollbackStack.length > 0
      },
      templates: Object.keys(this.messageTemplates),
      configuration: this.sanitizeOptionsForLog(this.options),
      timestamp: new Date().toISOString()
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
      timestamp: data.timestamp || new Date().toISOString()
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
    const { author, ...safeOptions } = options;
    return {
      ...safeOptions,
      hasAuthor: !!author
    };
  }

  /**
   * Delay utility for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown CommitSystem
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down CommitSystem...');

      // Cancel any active commit operations
      this.isCommitting = false;
      this.currentCommitSession = null;

      this.logAuditEvent('commit_system_shutdown', {
        finalStats: this.getStatistics(),
        timestamp: new Date().toISOString()
      });

      this.removeAllListeners();

      console.log('✅ CommitSystem shutdown complete');
      this.emit('shutdown_complete');

    } catch (error) {
      console.error(`❌ CommitSystem shutdown failed: ${error.message}`);
    }
  }
}

module.exports = CommitSystem;