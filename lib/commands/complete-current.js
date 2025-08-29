const chalk = require('chalk');
const { spawn } = require('child_process');
const chokidar = require('chokidar');
const WorkflowStateManager = require('../workflow-state-manager');
const HandoffAutomationEngine = require('../handoff-automation-engine');
const ConfigManager = require('../config-manager');

/**
 * Enhanced complete-current command implementation
 *
 * Provides intelligent task completion with full automation workflow.
 * Implements ADR-004 automated task status workflow requirements including:
 * - Automatic status updates (in_progress → complete)
 * - Git integration for file tracking and commit automation
 * - Linting validation with error resolution attempts
 * - Test suite execution with failure reporting
 * - Properly formatted commit message generation
 * - Pre-commit hook failure handling with retry logic
 * - Integration with HandoffAutomationEngine for dependent task triggering
 * - Comprehensive audit logging for all automated actions
 */
class CompleteCurrentCommand {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.workflowStateManager = null;
    this.handoffAutomationEngine = null;
    this.auditLog = [];
    this.performanceTarget = 5000; // 5 second target from ADR-004
    this.trackedFiles = new Set();
    this.fileWatcher = null;
  }

  /**
   * Initialize the command with required dependencies
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    const startTime = Date.now();

    try {
      // Initialize WorkflowStateManager
      this.workflowStateManager = new WorkflowStateManager(this.configManager);
      await this.workflowStateManager.initialize();

      // Initialize HandoffAutomationEngine
      this.handoffAutomationEngine = new HandoffAutomationEngine(
        this.configManager
      );
      await this.handoffAutomationEngine.initialize();

      const initTime = Date.now() - startTime;
      this.logAuditEvent('command_initialized', {
        initializationTime: initTime,
        timestamp: new Date().toISOString(),
      });

      if (initTime > 1000) {
        console.warn(chalk.yellow(`⚠️  Initialization took ${initTime}ms`));
      }

      return true;
    } catch (error) {
      this.logAuditEvent('initialization_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw new Error(
        `CompleteCurrentCommand initialization failed: ${error.message}`
      );
    }
  }

  /**
   * Execute the complete-current command
   * @param {Object} options - Command options
   * @param {string} options.task - Specific task ID to complete (optional)
   * @param {string} options.spec - Specification ID (required if task specified)
   * @param {string} options.notes - Completion notes
   * @param {boolean} options.skipLint - Skip linting validation
   * @param {boolean} options.skipTests - Skip test execution
   * @param {boolean} options.skipCommit - Skip git commit automation
   * @param {string} options.commitMessage - Custom commit message
   * @returns {Promise<Object>} Execution result
   */
  async execute(options) {
    const startTime = Date.now();

    try {
      this.logAuditEvent('command_started', {
        options: this.sanitizeOptionsForLog(options),
        timestamp: new Date().toISOString(),
      });

      console.log(chalk.cyan('🎯 Completing Current Task'));
      console.log(chalk.gray('='.repeat(50)));

      // Step 1: Determine which task to complete
      const taskInfo = await this.determineTaskToComplete(options);
      if (!taskInfo.success) {
        return taskInfo;
      }

      const { specId, taskId } = taskInfo;
      console.log(
        chalk.white(`Task: ${chalk.cyan(specId)}:${chalk.yellow(taskId)}`)
      );

      // Step 2: Start file tracking for git operations
      if (!options.skipCommit) {
        await this.startFileTracking();
      }

      // Step 3: Execute linting (unless skipped)
      if (!options.skipLint) {
        const lintResult = await this.executeLinting();
        if (!lintResult.success) {
          return this.createErrorResult(
            `Linting failed: ${lintResult.error}`,
            startTime
          );
        }
      }

      // Step 4: Execute tests (unless skipped)
      if (!options.skipTests) {
        const testResult = await this.executeTests();
        if (!testResult.success) {
          return this.createErrorResult(
            `Tests failed: ${testResult.error}`,
            startTime
          );
        }
      }

      // Step 5: Complete the task in workflow state
      const completionResult = await this.completeTask(specId, taskId, options);
      if (!completionResult.success) {
        return completionResult;
      }

      // Step 6: Git integration (unless skipped)
      let gitResult = null;
      if (!options.skipCommit) {
        gitResult = await this.executeGitWorkflow(specId, taskId, options);
        if (!gitResult.success) {
          console.warn(
            chalk.yellow(`⚠️  Git workflow failed: ${gitResult.error}`)
          );
          // Git failures are warnings, not failures - task is still complete
        }
      }

      // Step 7: Trigger handoff automation for dependent tasks
      const handoffResult = await this.triggerHandoffAutomation(specId, taskId);

      // Step 8: Display success message and next steps
      this.displaySuccessMessage(
        specId,
        taskId,
        completionResult,
        handoffResult,
        gitResult
      );

      const totalTime = Date.now() - startTime;
      this.logAuditEvent('command_completed_successfully', {
        specId,
        taskId,
        totalTime,
        timestamp: new Date().toISOString(),
      });

      if (totalTime > this.performanceTarget) {
        console.log(
          chalk.yellow(
            `\n⚠️  Command took ${totalTime}ms (target: ${this.performanceTarget}ms)`
          )
        );
      }

      return this.createResult({
        success: true,
        completed: true,
        task: {
          specId,
          taskId,
          completedAt: completionResult.completion.completed_at,
        },
        completion: completionResult,
        handoff: handoffResult,
        git: gitResult,
        performance: { total: totalTime },
      });
    } catch (error) {
      this.logAuditEvent('command_failed', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return this.createErrorResult(
        `Command execution failed: ${error.message}`,
        startTime
      );
    } finally {
      // Cleanup file tracking
      if (this.fileWatcher) {
        await this.fileWatcher.close();
        this.fileWatcher = null;
      }
    }
  }

  /**
   * Determine which task to complete
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Task identification result
   */
  async determineTaskToComplete(options) {
    try {
      // If specific task provided, validate it
      if (options.task) {
        if (!options.spec) {
          return this.createErrorResult('--spec is required when using --task');
        }

        // Validate task exists and is in progress
        const assignments =
          await this.workflowStateManager.getCurrentAssignments();
        const targetAssignment = assignments.current_assignments.find(
          (a) =>
            a.spec_id === options.spec &&
            a.task_id === options.task &&
            a.status === 'in_progress'
        );

        if (!targetAssignment) {
          return this.createErrorResult(
            `Task ${options.spec}:${options.task} is not currently in progress`
          );
        }

        return {
          success: true,
          specId: options.spec,
          taskId: options.task,
          assignment: targetAssignment,
        };
      }

      // Find current active assignment
      const assignments =
        await this.workflowStateManager.getCurrentAssignments();
      const activeAssignments = assignments.current_assignments.filter(
        (a) => a.status === 'in_progress'
      );

      if (activeAssignments.length === 0) {
        return this.createErrorResult(
          'No active task assignments found. Use --task and --spec to specify a task, or use start-next to get a new task.'
        );
      }

      if (activeAssignments.length > 1) {
        console.log(chalk.yellow('⚠️  Multiple active assignments found:'));
        activeAssignments.forEach((assignment, index) => {
          console.log(
            chalk.white(
              `  ${index + 1}. ${assignment.spec_id}:${assignment.task_id} (${
                assignment.assigned_agent
              })`
            )
          );
        });
        return this.createErrorResult(
          'Multiple active assignments. Use --task and --spec to specify which task to complete.'
        );
      }

      const assignment = activeAssignments[0];
      return {
        success: true,
        specId: assignment.spec_id,
        taskId: assignment.task_id,
        assignment,
      };
    } catch (error) {
      return this.createErrorResult(
        `Failed to determine task to complete: ${error.message}`
      );
    }
  }

  /**
   * Start file tracking for git operations
   * @returns {Promise<void>}
   */
  async startFileTracking() {
    console.log(chalk.blue('\n📁 Starting file tracking...'));

    try {
      // Get initial git status
      const initialFiles = await this.getGitStatus();
      this.trackedFiles = new Set(initialFiles);

      // Start watching for file changes
      const projectRoot = this.configManager.getProjectRoot();
      this.fileWatcher = chokidar.watch(
        [
          `${projectRoot}/lib/**/*`,
          `${projectRoot}/bin/**/*`,
          `${projectRoot}/test/**/*`,
          `${projectRoot}/docs/**/*`,
          `${projectRoot}/*.js`,
          `${projectRoot}/*.json`,
          `${projectRoot}/*.md`,
        ],
        {
          ignored: [/node_modules/, /.git/, /.asd/, /\.log$/],
          persistent: false,
        }
      );

      this.fileWatcher.on('change', (path) => {
        this.trackedFiles.add(path);
      });

      this.fileWatcher.on('add', (path) => {
        this.trackedFiles.add(path);
      });

      this.logAuditEvent('file_tracking_started', {
        trackedPaths: Array.from(this.trackedFiles),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  File tracking failed: ${error.message}`));
    }
  }

  /**
   * Execute linting with automatic fix attempts
   * @returns {Promise<Object>} Linting result
   */
  async executeLinting() {
    console.log(chalk.blue('\n🔍 Running linting validation...'));

    try {
      // First attempt: Run linter
      let lintResult = await this.runCommand('npm', ['run', 'lint'], {
        description: 'Initial lint check',
      });

      if (lintResult.success) {
        console.log(chalk.green('✅ Linting passed'));
        this.logAuditEvent('lint_passed', {
          attempt: 1,
          timestamp: new Date().toISOString(),
        });
        return { success: true };
      }

      // Second attempt: Try auto-fix
      console.log(
        chalk.yellow('⚠️  Linting failed, attempting automatic fixes...')
      );
      const fixResult = await this.runCommand(
        'npm',
        ['run', 'lint', '--', '--fix'],
        {
          description: 'Auto-fix lint issues',
        }
      );

      if (fixResult.success) {
        console.log(chalk.blue('🔧 Auto-fixes applied, re-running lint...'));

        // Third attempt: Re-run after fixes
        lintResult = await this.runCommand('npm', ['run', 'lint'], {
          description: 'Lint check after fixes',
        });

        if (lintResult.success) {
          console.log(chalk.green('✅ Linting passed after auto-fixes'));
          this.logAuditEvent('lint_passed_after_fixes', {
            attempt: 3,
            timestamp: new Date().toISOString(),
          });
          return { success: true };
        }
      }

      // Report final failure
      console.error(chalk.red('❌ Linting failed and could not be auto-fixed'));
      console.log(chalk.gray('Lint output:'));
      console.log(lintResult.output);

      this.logAuditEvent('lint_failed', {
        attempts: 3,
        finalOutput: lintResult.output,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: 'Linting validation failed',
        output: lintResult.output,
      };
    } catch (error) {
      return {
        success: false,
        error: `Linting execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Execute test suites with clear failure reporting
   * @returns {Promise<Object>} Test result
   */
  async executeTests() {
    console.log(chalk.blue('\n🧪 Running test suites...'));

    try {
      const testResult = await this.runCommand('npm', ['test'], {
        description: 'Run test suite',
      });

      if (testResult.success) {
        console.log(chalk.green('✅ All tests passed'));
        this.logAuditEvent('tests_passed', {
          timestamp: new Date().toISOString(),
        });
        return { success: true, output: testResult.output };
      }

      // Report test failures
      console.error(chalk.red('❌ Tests failed'));
      console.log(chalk.gray('Test output:'));
      console.log(testResult.output);

      this.logAuditEvent('tests_failed', {
        output: testResult.output,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: 'Test execution failed',
        output: testResult.output,
      };
    } catch (error) {
      return {
        success: false,
        error: `Test execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Complete the task in workflow state
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Completion result
   */
  async completeTask(specId, taskId, options) {
    console.log(chalk.blue('\n📋 Completing task in workflow...'));

    try {
      const completionResult = await this.workflowStateManager.completeTask(
        specId,
        taskId,
        {
          notes:
            options.notes || 'Task completed via complete-current automation',
          completedBy: 'complete-current-automation',
        }
      );

      if (!completionResult.success) {
        this.logAuditEvent('task_completion_failed', {
          specId,
          taskId,
          error: completionResult.error,
          timestamp: new Date().toISOString(),
        });
        return this.createErrorResult(
          `Task completion failed: ${completionResult.error}`
        );
      }

      console.log(chalk.green('✅ Task marked as complete'));

      this.logAuditEvent('task_completed', {
        specId,
        taskId,
        completedAt: completionResult.completion.completed_at,
        timestamp: new Date().toISOString(),
      });

      return completionResult;
    } catch (error) {
      return this.createErrorResult(
        `Failed to complete task: ${error.message}`
      );
    }
  }

  /**
   * Execute git workflow with commit automation
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Git workflow result
   */
  async executeGitWorkflow(specId, taskId, options) {
    console.log(chalk.blue('\n📝 Executing git workflow...'));

    try {
      // Add tracked files to git
      const addResult = await this.addTrackedFiles();
      if (!addResult.success) {
        return addResult;
      }

      // Generate commit message
      const commitMessage =
        options.commitMessage || this.generateCommitMessage(specId, taskId);
      console.log(chalk.white(`Commit message: ${commitMessage}`));

      // Create git commit with retry logic for pre-commit hooks
      const commitResult = await this.createCommitWithRetry(commitMessage);
      if (!commitResult.success) {
        return commitResult;
      }

      console.log(chalk.green('✅ Git commit created successfully'));

      this.logAuditEvent('git_commit_created', {
        commitMessage,
        specId,
        taskId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        commitMessage,
        commitHash: commitResult.commitHash,
      };
    } catch (error) {
      return {
        success: false,
        error: `Git workflow failed: ${error.message}`,
      };
    }
  }

  /**
   * Add tracked files to git staging area
   * @returns {Promise<Object>} Add result
   */
  async addTrackedFiles() {
    try {
      // Get current git status to see what needs to be staged
      const status = await this.getGitStatus();

      if (status.length === 0) {
        console.log(chalk.blue('ℹ️  No files to stage'));
        return { success: true, stagedFiles: [] };
      }

      // Stage all modified and new files
      const addResult = await this.runCommand('git', ['add', '.'], {
        description: 'Stage files for commit',
      });

      if (addResult.success) {
        console.log(chalk.green(`✅ Staged ${status.length} files`));
        return { success: true, stagedFiles: status };
      }

      return {
        success: false,
        error: 'Failed to stage files for commit',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add tracked files: ${error.message}`,
      };
    }
  }

  /**
   * Create git commit with retry logic for pre-commit hook failures
   * @param {string} commitMessage - Commit message
   * @returns {Promise<Object>} Commit result
   */
  async createCommitWithRetry(commitMessage) {
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(
          chalk.blue(`🔄 Commit attempt ${attempt}/${maxRetries}...`)
        );

        const commitResult = await this.runCommand(
          'git',
          ['commit', '-m', commitMessage],
          {
            description: `Git commit (attempt ${attempt})`,
          }
        );

        if (commitResult.success) {
          // Get commit hash
          const hashResult = await this.runCommand(
            'git',
            ['rev-parse', 'HEAD'],
            {
              description: 'Get commit hash',
            }
          );

          return {
            success: true,
            commitHash: hashResult.success
              ? hashResult.output.trim()
              : 'unknown',
            attempt,
          };
        }

        // Check if it's a pre-commit hook failure that might be fixed by re-staging
        if (commitResult.output && commitResult.output.includes('pre-commit')) {
          console.log(
            chalk.yellow('⚠️  Pre-commit hook modified files, re-staging...')
          );

          // Re-stage files modified by pre-commit hooks
          await this.runCommand('git', ['add', '.'], {
            description: 'Re-stage after pre-commit',
          });

          attempt++;
          continue;
        }

        // Non-recoverable commit failure
        return {
          success: false,
          error: `Git commit failed: ${commitResult.output}`,
          attempt,
        };
      } catch (error) {
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Git commit failed after ${maxRetries} attempts: ${error.message}`,
            attempt,
          };
        }

        console.log(
          chalk.yellow(`⚠️  Commit attempt ${attempt} failed, retrying...`)
        );
        attempt++;
      }
    }

    return {
      success: false,
      error: `Git commit failed after ${maxRetries} attempts`,
      attempt: maxRetries,
    };
  }

  /**
   * Trigger handoff automation for dependent tasks
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Handoff result
   */
  async triggerHandoffAutomation(specId, taskId) {
    console.log(chalk.blue('\n🔄 Triggering handoff automation...'));

    try {
      const handoffTrigger = {
        type: 'TASK_COMPLETED',
        specId,
        taskId,
        fromAgent: 'complete-current-automation',
        context: {
          completionMethod: 'automated',
          timestamp: new Date().toISOString(),
        },
      };

      const handoffResult = await this.handoffAutomationEngine.executeHandoff(
        handoffTrigger
      );

      if (handoffResult.success && handoffResult.handoffNeeded) {
        console.log(chalk.green('✅ Handoff executed successfully'));
        console.log(
          chalk.white(
            `Next task: ${chalk.cyan(handoffResult.nextTask)} → ${chalk.yellow(
              handoffResult.nextAgent
            )}`
          )
        );

        this.logAuditEvent('handoff_triggered', {
          specId,
          taskId,
          nextTask: handoffResult.nextTask,
          nextAgent: handoffResult.nextAgent,
          timestamp: new Date().toISOString(),
        });
      } else if (handoffResult.success && !handoffResult.handoffNeeded) {
        console.log(chalk.blue('ℹ️  No handoff needed'));
        console.log(chalk.gray(`Reason: ${handoffResult.reason}`));
      } else {
        console.warn(
          chalk.yellow(`⚠️  Handoff failed: ${handoffResult.error}`)
        );
      }

      return handoffResult;
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  Handoff automation failed: ${error.message}`)
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate properly formatted commit message
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @returns {string} Formatted commit message
   */
  generateCommitMessage(specId, taskId) {
    const baseMessage = `Complete ${specId} ${taskId}`;

    const footer = `

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    return baseMessage + footer;
  }

  /**
   * Get current git status (modified and new files)
   * @returns {Promise<Array<string>>} List of modified files
   */
  async getGitStatus() {
    try {
      const statusResult = await this.runCommand(
        'git',
        ['status', '--porcelain'],
        {
          description: 'Get git status',
        }
      );

      if (!statusResult.success) {
        return [];
      }

      // Parse git status output
      const lines = statusResult.output
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
      return lines.map((line) => line.substring(3)); // Remove status indicators
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  Failed to get git status: ${error.message}`)
      );
      return [];
    }
  }

  /**
   * Run a command with proper error handling and logging
   * @param {string} command - Command to run
   * @param {Array<string>} args - Command arguments
   * @param {Object} options - Run options
   * @returns {Promise<Object>} Command result
   */
  runCommand(command, args, options = {}) {
    return new Promise((resolve) => {
      const { description = 'Command execution' } = options;

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.configManager.getProjectRoot(),
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const output = (stdout + stderr).trim();

        this.logAuditEvent('command_executed', {
          command: `${command} ${args.join(' ')}`,
          description,
          exitCode: code,
          hasOutput: output.length > 0,
          timestamp: new Date().toISOString(),
        });

        resolve({
          success: code === 0,
          output,
          exitCode: code,
        });
      });

      child.on('error', (error) => {
        this.logAuditEvent('command_error', {
          command: `${command} ${args.join(' ')}`,
          description,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        resolve({
          success: false,
          error: error.message,
          output: '',
        });
      });
    });
  }

  /**
   * Display success message and next steps
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {Object} completionResult - Task completion result
   * @param {Object} handoffResult - Handoff result
   * @param {Object} gitResult - Git result
   */
  displaySuccessMessage(
    specId,
    taskId,
    completionResult,
    handoffResult,
    gitResult
  ) {
    console.log(chalk.green('\n🎉 Task Successfully Completed!'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(
      chalk.white(`Task: ${chalk.cyan(specId)}:${chalk.yellow(taskId)}`)
    );
    console.log(chalk.white(`Status: ${chalk.green('complete')}`));
    console.log(
      chalk.white(`Completed: ${completionResult.completion.completed_at}`)
    );

    if (completionResult.completion.duration_hours) {
      console.log(
        chalk.white(
          `Duration: ${completionResult.completion.duration_hours} hours`
        )
      );
    }

    if (gitResult && gitResult.success) {
      console.log(
        chalk.white(`Commit: ${chalk.cyan(gitResult.commitHash || 'created')}`)
      );
    }

    console.log(chalk.blue('\n📝 Next Steps:'));

    if (handoffResult && handoffResult.success && handoffResult.handoffNeeded) {
      console.log(
        chalk.white(
          `  1. Next task ready: ${chalk.cyan(
            handoffResult.nextTask
          )} → ${chalk.yellow(handoffResult.nextAgent)}`
        )
      );
      console.log(chalk.white('  2. Use start-next to continue workflow'));
    } else {
      console.log(chalk.white('  1. Use start-next to get your next task'));
    }

    console.log(
      chalk.white('  2. Check project progress with workflow status')
    );

    if (completionResult.completion.notes) {
      console.log(
        chalk.gray(`\n💬 Notes: ${completionResult.completion.notes}`)
      );
    }
  }

  /**
   * Create standardized result object
   * @param {Object} data - Result data
   * @returns {Object} Standardized result
   */
  createResult(data) {
    return {
      ...data,
      auditLog: this.getAuditLog(),
      command: 'complete-current',
    };
  }

  /**
   * Create standardized error result
   * @param {string} message - Error message
   * @param {number} startTime - Start time for performance calculation (optional)
   * @param {Object} additionalData - Additional data to include
   * @returns {Object} Error result
   */
  createErrorResult(message, startTime = Date.now(), additionalData = {}) {
    return this.createResult({
      success: false,
      error: message,
      performance: { total: Date.now() - startTime },
      ...additionalData,
    });
  }

  /**
   * Sanitize options for logging (remove sensitive data)
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   */
  sanitizeOptionsForLog(options) {
    const { commitMessage, ...safeOptions } = options;
    return {
      ...safeOptions,
      hasCommitMessage: !!commitMessage,
    };
  }

  /**
   * Log audit events
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  logAuditEvent(event, data) {
    this.auditLog.push({
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get audit log
   * @returns {Array} Audit log entries
   */
  getAuditLog() {
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog() {
    this.auditLog = [];
  }
}

module.exports = CompleteCurrentCommand;
