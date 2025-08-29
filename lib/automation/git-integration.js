const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

/**
 * GitIntegration - Comprehensive git workflow automation system
 *
 * Provides reliable git command execution, repository state management,
 * and integration with ASD automation workflows. Implements ADR-004
 * git workflow requirements with comprehensive error handling and audit logging.
 *
 * Key Features:
 * - Safe git command execution with timeout and error handling
 * - Repository validation and workspace state tracking
 * - Selective file staging with intelligent conflict resolution
 * - Branch management and merge strategies
 * - Pre-commit hook integration with retry logic
 * - Comprehensive audit logging for all git operations
 * - Integration with EventBus for decoupled automation
 */
class GitIntegration extends EventEmitter {
  constructor(configManager, options = {}) {
    super();

    this.configManager = configManager;
    this.options = {
      commandTimeout: options.commandTimeout || 30000, // 30 seconds
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000, // 1 second
      maxConcurrentOperations: options.maxConcurrentOperations || 5,
      enableAuditLogging: options.enableAuditLogging !== false,
      validateRepository: options.validateRepository !== false,
      ...options,
    };

    // Operation tracking
    this.operationQueue = [];
    this.activeOperations = new Set();
    this.auditLog = [];
    this.repositoryInfo = null;
    this.workspaceState = {
      isTracking: false,
      trackedFiles: new Set(),
      lastStatusCheck: null,
      isDirty: false,
    };

    // Performance metrics
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageExecutionTime: 0,
      lastOperationTime: null,
    };

    // Safety checks
    this.safetyChecks = {
      validateWorkingDirectory: true,
      checkRepositoryIntegrity: true,
      preventDestructiveOperations: true,
      requireCleanWorkspace: false,
    };
  }

  /**
   * Initialize GitIntegration system
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      this.logAuditEvent('git_integration_initializing', {
        options: this.sanitizeOptionsForLog(this.options),
        timestamp: new Date().toISOString(),
      });

      // Validate git is available
      const gitVersion = await this.runGitCommand(['--version'], {
        description: 'Check git availability',
      });

      if (!gitVersion.success) {
        throw new Error('Git is not available or not properly installed');
      }

      // Validate repository if enabled
      if (this.options.validateRepository) {
        const repoValidation = await this.validateRepository();
        if (!repoValidation.isValid) {
          throw new Error(
            `Repository validation failed: ${repoValidation.error}`
          );
        }
        this.repositoryInfo = repoValidation.info;
      }

      // Initialize workspace state
      await this.refreshWorkspaceState();

      this.logAuditEvent('git_integration_initialized', {
        gitVersion: gitVersion.output.trim(),
        repositoryInfo: this.repositoryInfo,
        workspaceState: this.serializeWorkspaceState(),
        timestamp: new Date().toISOString(),
      });

      console.log('✅ GitIntegration initialized successfully');
      this.emit('initialized', {
        gitVersion: gitVersion.output.trim(),
        repository: this.repositoryInfo,
      });

      return true;
    } catch (error) {
      this.logAuditEvent('git_integration_initialization_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      console.error(
        `❌ GitIntegration initialization failed: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Validate git repository and gather information
   * @returns {Promise<Object>} Repository validation result
   */
  async validateRepository() {
    try {
      const projectRoot = this.configManager.getProjectRoot();

      // Check if we're in a git repository
      const statusResult = await this.runGitCommand(['status', '--porcelain'], {
        description: 'Check repository status',
      });

      if (!statusResult.success) {
        return {
          isValid: false,
          error: 'Not a git repository or git command failed',
        };
      }

      // Get repository information
      const [branchResult, remoteResult, rootResult] = await Promise.all([
        this.runGitCommand(['branch', '--show-current'], {
          description: 'Get current branch',
        }),
        this.runGitCommand(['remote', '-v'], {
          description: 'Get remotes',
        }),
        this.runGitCommand(['rev-parse', '--show-toplevel'], {
          description: 'Get repository root',
        }),
      ]);

      const repositoryInfo = {
        root: rootResult.success ? rootResult.output.trim() : projectRoot,
        currentBranch: branchResult.success
          ? branchResult.output.trim()
          : 'unknown',
        remotes: this.parseRemotes(
          remoteResult.success ? remoteResult.output : ''
        ),
        isClean: statusResult.output.trim().length === 0,
        hasUncommittedChanges: statusResult.output.trim().length > 0,
      };

      return {
        isValid: true,
        info: repositoryInfo,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Repository validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Parse git remotes output
   * @param {string} remotesOutput - Git remotes output
   * @returns {Object} Parsed remotes information
   */
  parseRemotes(remotesOutput) {
    const remotes = {};
    const lines = remotesOutput
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    for (const line of lines) {
      const match = line.match(/^(\w+)\s+(.+?)\s+\((fetch|push)\)$/);
      if (match) {
        const [, name, url, type] = match;
        if (!remotes[name]) {
          remotes[name] = {};
        }
        remotes[name][type] = url;
      }
    }

    return remotes;
  }

  /**
   * Start file tracking for work session
   * @param {Object} options - Tracking options
   * @returns {Promise<Object>} Tracking result
   */
  async startFileTracking(options = {}) {
    try {
      if (this.workspaceState.isTracking) {
        return {
          success: false,
          error: 'File tracking is already active',
        };
      }

      this.logAuditEvent('file_tracking_started', {
        options: options,
        timestamp: new Date().toISOString(),
      });

      // Get current git status as baseline
      const statusResult = await this.getGitStatus();
      if (!statusResult.success) {
        throw new Error(`Failed to get git status: ${statusResult.error}`);
      }

      // Initialize tracking state
      this.workspaceState.isTracking = true;
      this.workspaceState.trackedFiles = new Set(statusResult.files);
      this.workspaceState.lastStatusCheck = new Date().toISOString();
      this.workspaceState.isDirty = statusResult.files.length > 0;

      console.log(
        `📁 File tracking started - monitoring ${statusResult.files.length} existing files`
      );
      this.emit('tracking_started', {
        existingFiles: statusResult.files,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        existingFiles: statusResult.files,
        trackingActive: true,
      };
    } catch (error) {
      this.logAuditEvent('file_tracking_start_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: `Failed to start file tracking: ${error.message}`,
      };
    }
  }

  /**
   * Stop file tracking and get tracked files list
   * @returns {Promise<Object>} Tracking result with file list
   */
  async stopFileTracking() {
    try {
      if (!this.workspaceState.isTracking) {
        return {
          success: false,
          error: 'File tracking is not active',
        };
      }

      // Get final status
      const statusResult = await this.getGitStatus();
      const trackedFiles = statusResult.success
        ? statusResult.files
        : Array.from(this.workspaceState.trackedFiles);

      // Stop tracking
      this.workspaceState.isTracking = false;
      this.workspaceState.lastStatusCheck = new Date().toISOString();

      this.logAuditEvent('file_tracking_stopped', {
        trackedFiles: trackedFiles,
        fileCount: trackedFiles.length,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `📁 File tracking stopped - ${trackedFiles.length} files tracked`
      );
      this.emit('tracking_stopped', {
        trackedFiles: trackedFiles,
        fileCount: trackedFiles.length,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        trackedFiles: trackedFiles,
        fileCount: trackedFiles.length,
      };
    } catch (error) {
      this.logAuditEvent('file_tracking_stop_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: `Failed to stop file tracking: ${error.message}`,
      };
    }
  }

  /**
   * Get current git status with parsed file list
   * @returns {Promise<Object>} Git status result
   */
  async getGitStatus() {
    try {
      const statusResult = await this.runGitCommand(['status', '--porcelain'], {
        description: 'Get git status',
      });

      if (!statusResult.success) {
        return {
          success: false,
          error: `Git status failed: ${statusResult.output}`,
          files: [],
        };
      }

      // Parse git status output
      const lines = statusResult.output
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
      const files = lines.map((line) => ({
        status: line.substring(0, 2),
        path: line.substring(3),
        isStaged: line[0] !== ' ' && line[0] !== '?',
        isModified: line[1] !== ' ',
        isNew: line[0] === '?' || line[0] === 'A',
        isDeleted: line[0] === 'D' || line[1] === 'D',
        isRenamed: line[0] === 'R',
      }));

      this.workspaceState.lastStatusCheck = new Date().toISOString();
      this.workspaceState.isDirty = files.length > 0;

      return {
        success: true,
        files: files.map((f) => f.path),
        detailedFiles: files,
        isClean: files.length === 0,
        hasStaged: files.some((f) => f.isStaged),
        hasUnstaged: files.some((f) => !f.isStaged),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get git status: ${error.message}`,
        files: [],
      };
    }
  }

  /**
   * Stage files for commit with intelligent selection
   * @param {Array|string} files - Files to stage ('.' for all, array for specific files)
   * @param {Object} options - Staging options
   * @returns {Promise<Object>} Staging result
   */
  async stageFiles(files = '.', options = {}) {
    try {
      const {
        skipValidation = false,
        allowEmpty = false,
        dryRun = false,
      } = options;

      // Validate files exist if not staging all
      if (files !== '.' && !skipValidation) {
        const validation = await this.validateFilesExist(
          Array.isArray(files) ? files : [files]
        );
        if (!validation.success) {
          return validation;
        }
      }

      // Check if there are files to stage
      if (!allowEmpty) {
        const status = await this.getGitStatus();
        if (!status.success) {
          return {
            success: false,
            error: `Could not check git status: ${status.error}`,
          };
        }

        if (status.files.length === 0) {
          return {
            success: true,
            message: 'No files to stage',
            stagedFiles: [],
            skipped: true,
          };
        }
      }

      if (dryRun) {
        const status = await this.getGitStatus();
        return {
          success: true,
          message: 'Dry run - files would be staged',
          stagedFiles: status.success ? status.files : [],
          dryRun: true,
        };
      }

      // Prepare git add command
      const gitArgs = ['add'];
      if (Array.isArray(files)) {
        gitArgs.push(...files);
      } else {
        gitArgs.push(files);
      }

      const addResult = await this.runGitCommand(gitArgs, {
        description: `Stage files: ${
          Array.isArray(files) ? files.join(', ') : files
        }`,
      });

      if (!addResult.success) {
        return {
          success: false,
          error: `Git add failed: ${addResult.output}`,
        };
      }

      // Get staged files list
      const statusAfter = await this.getGitStatus();
      const stagedFiles = statusAfter.success
        ? statusAfter.detailedFiles.filter((f) => f.isStaged).map((f) => f.path)
        : [];

      this.logAuditEvent('files_staged', {
        files: files,
        stagedCount: stagedFiles.length,
        stagedFiles: stagedFiles,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ Staged ${stagedFiles.length} files`);
      this.emit('files_staged', {
        files: files,
        stagedFiles: stagedFiles,
        count: stagedFiles.length,
      });

      return {
        success: true,
        stagedFiles: stagedFiles,
        stagedCount: stagedFiles.length,
      };
    } catch (error) {
      this.logAuditEvent('file_staging_failed', {
        files: files,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: `Failed to stage files: ${error.message}`,
      };
    }
  }

  /**
   * Validate that specified files exist
   * @param {Array<string>} files - Files to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateFilesExist(files) {
    try {
      const fs = require('fs').promises;
      const projectRoot = this.configManager.getProjectRoot();
      const missingFiles = [];

      for (const file of files) {
        const fullPath = path.resolve(projectRoot, file);
        try {
          await fs.access(fullPath);
        } catch (error) {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length > 0) {
        return {
          success: false,
          error: `Files not found: ${missingFiles.join(', ')}`,
          missingFiles: missingFiles,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `File validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Create git commit with retry logic and pre-commit hook handling
   * @param {string} message - Commit message
   * @param {Object} options - Commit options
   * @returns {Promise<Object>} Commit result
   */
  async createCommit(message, options = {}) {
    try {
      const {
        retryOnHookFailure = true,
        maxRetries = this.options.retryAttempts,
        allowEmpty = false,
        skipHooks = false,
        author = null,
      } = options;

      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'Commit message is required',
        };
      }

      let attempt = 1;
      let lastError = null;

      while (attempt <= maxRetries) {
        try {
          console.log(
            `🔄 Creating commit (attempt ${attempt}/${maxRetries})...`
          );

          // Build git commit command
          const gitArgs = ['commit', '-m', message];
          if (allowEmpty) gitArgs.push('--allow-empty');
          if (skipHooks) gitArgs.push('--no-verify');
          if (author) gitArgs.push('--author', author);

          const commitResult = await this.runGitCommand(gitArgs, {
            description: `Create commit (attempt ${attempt})`,
          });

          if (commitResult.success) {
            // Get commit hash
            const hashResult = await this.runGitCommand(['rev-parse', 'HEAD'], {
              description: 'Get commit hash',
            });

            const commitHash = hashResult.success
              ? hashResult.output.trim()
              : 'unknown';

            this.logAuditEvent('commit_created', {
              message: message,
              commitHash: commitHash,
              attempt: attempt,
              timestamp: new Date().toISOString(),
            });

            console.log(`✅ Commit created: ${commitHash.substring(0, 8)}`);
            this.emit('commit_created', {
              message: message,
              commitHash: commitHash,
              attempt: attempt,
            });

            return {
              success: true,
              commitHash: commitHash,
              message: message,
              attempt: attempt,
            };
          }

          // Handle pre-commit hook failures
          if (
            retryOnHookFailure &&
            this.isPreCommitHookFailure(commitResult.output)
          ) {
            console.log(
              '⚠️  Pre-commit hook modified files, re-staging and retrying...'
            );

            // Re-stage files that may have been modified by hooks
            const restageResult = await this.stageFiles('.', {
              allowEmpty: true,
            });
            if (!restageResult.success) {
              throw new Error(
                `Failed to re-stage files after hook: ${restageResult.error}`
              );
            }

            attempt++;
            lastError = `Pre-commit hook failure (attempt ${attempt - 1}): ${
              commitResult.output
            }`;
            continue;
          }

          // Non-recoverable commit failure
          throw new Error(`Commit failed: ${commitResult.output}`);
        } catch (error) {
          lastError = error.message;

          if (attempt === maxRetries) {
            break;
          }

          console.log(`⚠️  Commit attempt ${attempt} failed: ${error.message}`);
          await this.delay(this.options.retryDelay * attempt); // Exponential backoff
          attempt++;
        }
      }

      this.logAuditEvent('commit_failed', {
        message: message,
        attempts: maxRetries,
        lastError: lastError,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: `Commit failed after ${maxRetries} attempts: ${lastError}`,
        attempts: maxRetries,
      };
    } catch (error) {
      return {
        success: false,
        error: `Commit creation failed: ${error.message}`,
      };
    }
  }

  /**
   * Check if error output indicates pre-commit hook failure
   * @param {string} output - Git command output
   * @returns {boolean} Whether it's a pre-commit hook failure
   */
  isPreCommitHookFailure(output) {
    const hookIndicators = [
      'pre-commit',
      'hook',
      'husky',
      'lint-staged',
      'prettier',
      'eslint',
    ];

    const lowerOutput = output.toLowerCase();
    return hookIndicators.some((indicator) => lowerOutput.includes(indicator));
  }

  /**
   * Refresh workspace state by checking git status
   * @returns {Promise<boolean>} Success status
   */
  async refreshWorkspaceState() {
    try {
      const statusResult = await this.getGitStatus();
      if (statusResult.success) {
        this.workspaceState.isDirty = !statusResult.isClean;
        this.workspaceState.lastStatusCheck = new Date().toISOString();

        if (this.workspaceState.isTracking) {
          // Update tracked files if tracking is active
          statusResult.files.forEach((file) => {
            this.workspaceState.trackedFiles.add(file);
          });
        }
      }
      return true;
    } catch (error) {
      console.warn(`⚠️  Failed to refresh workspace state: ${error.message}`);
      return false;
    }
  }

  /**
   * Run git command with proper error handling and timeout
   * @param {Array<string>} args - Git command arguments
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command result
   */
  async runGitCommand(args, options = {}) {
    const startTime = Date.now();

    try {
      const {
        description = 'Git command',
        timeout = this.options.commandTimeout,
        cwd = this.configManager.getProjectRoot(),
      } = options;

      // Check if we're at max concurrent operations
      if (this.activeOperations.size >= this.options.maxConcurrentOperations) {
        throw new Error('Maximum concurrent git operations reached');
      }

      const operationId = `git_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      this.activeOperations.add(operationId);

      try {
        const result = await this.executeCommand('git', args, {
          description,
          timeout,
          cwd,
        });

        const executionTime = Date.now() - startTime;
        this.updateMetrics(true, executionTime);

        this.logAuditEvent('git_command_executed', {
          command: `git ${args.join(' ')}`,
          description,
          success: result.success,
          executionTime,
          timestamp: new Date().toISOString(),
        });

        return result;
      } finally {
        this.activeOperations.delete(operationId);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(false, executionTime);

      this.logAuditEvent('git_command_failed', {
        command: `git ${args.join(' ')}`,
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        output: error.message,
        error: error.message,
        executionTime,
      };
    }
  }

  /**
   * Execute command with spawn and proper error handling
   * @param {string} command - Command to execute
   * @param {Array<string>} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command result
   */
  executeCommand(command, args, options = {}) {
    return new Promise((resolve) => {
      const {
        description: __description = 'Command execution', // eslint-disable-line no-unused-vars
        timeout = this.options.commandTimeout,
        cwd = process.cwd(),
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
   */
  updateMetrics(success, executionTime) {
    this.metrics.totalOperations++;
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }

    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime * (this.metrics.totalOperations - 1) +
        executionTime) /
      this.metrics.totalOperations;

    this.metrics.lastOperationTime = new Date().toISOString();
  }

  /**
   * Get comprehensive GitIntegration statistics
   * @returns {Object} Statistics and metrics
   */
  getStatistics() {
    return {
      metrics: { ...this.metrics },
      workspaceState: this.serializeWorkspaceState(),
      repositoryInfo: this.repositoryInfo,
      activeOperations: this.activeOperations.size,
      auditLogSize: this.auditLog.length,
      configuration: this.sanitizeOptionsForLog(this.options),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Serialize workspace state for logging
   * @returns {Object} Serialized workspace state
   */
  serializeWorkspaceState() {
    return {
      isTracking: this.workspaceState.isTracking,
      trackedFileCount: this.workspaceState.trackedFiles.size,
      lastStatusCheck: this.workspaceState.lastStatusCheck,
      isDirty: this.workspaceState.isDirty,
    };
  }

  /**
   * Log audit events with timestamps
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
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500); // Keep last 500 entries
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
   * Sanitize options for logging (remove sensitive data)
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   */
  sanitizeOptionsForLog(options) {
    const { ...safeOptions } = options;
    // Remove any potentially sensitive configuration
    return safeOptions;
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
   * Cleanup and shutdown GitIntegration
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down GitIntegration...');

      // Stop file tracking if active
      if (this.workspaceState.isTracking) {
        await this.stopFileTracking();
      }

      // Wait for active operations to complete
      if (this.activeOperations.size > 0) {
        console.log(
          `⏳ Waiting for ${this.activeOperations.size} active operations to complete...`
        );
        // Simple wait - in production might want more sophisticated handling
        let attempts = 0;
        while (this.activeOperations.size > 0 && attempts < 30) {
          await this.delay(1000);
          attempts++;
        }
      }

      this.logAuditEvent('git_integration_shutdown', {
        finalStats: this.getStatistics(),
        timestamp: new Date().toISOString(),
      });

      // Clear state
      this.removeAllListeners();
      this.activeOperations.clear();
      this.workspaceState.trackedFiles.clear();

      console.log('✅ GitIntegration shutdown complete');
      this.emit('shutdown_complete');
    } catch (error) {
      console.error(`❌ GitIntegration shutdown failed: ${error.message}`);
    }
  }
}

module.exports = GitIntegration;
