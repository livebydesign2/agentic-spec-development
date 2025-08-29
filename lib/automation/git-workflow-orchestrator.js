const EventEmitter = require('events');
const GitIntegration = require('./git-integration');
const FileTracker = require('./file-tracker');
const LintingSystem = require('./linting-system');
const TestingSystem = require('./testing-system');
const CommitSystem = require('./commit-system');
const HookHandler = require('./hook-handler');
const ErrorResolver = require('./error-resolver');
const TestReporter = require('./test-reporter');

/**
 * GitWorkflowOrchestrator - Comprehensive git workflow automation orchestration
 *
 * Orchestrates the complete git workflow automation pipeline including file
 * tracking, linting, testing, and commit operations. Provides a single interface
 * for complex workflow automation with comprehensive error handling and reporting.
 *
 * Key Features:
 * - End-to-end workflow orchestration
 * - Intelligent error handling and recovery
 * - Performance monitoring and optimization
 * - Rollback capabilities for failed operations
 * - Comprehensive audit logging and reporting
 * - Integration with all automation subsystems
 * - Configurable workflow stages and policies
 */
class GitWorkflowOrchestrator extends EventEmitter {
  constructor(configManager, options = {}) {
    super();

    this.configManager = configManager;
    this.options = {
      enableFileTracking: options.enableFileTracking !== false,
      enableLinting: options.enableLinting !== false,
      enableTesting: options.enableTesting !== false,
      enableCommitAutomation: options.enableCommitAutomation !== false,
      failFast: options.failFast || false,
      enableRollback: options.enableRollback !== false,
      enableAuditLogging: options.enableAuditLogging !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      workflowTimeout: options.workflowTimeout || 600000, // 10 minutes
      ...options
    };

    // Initialize subsystems
    this.gitIntegration = null;
    this.fileTracker = null;
    this.lintingSystem = null;
    this.testingSystem = null;
    this.commitSystem = null;
    this.hookHandler = null;
    this.errorResolver = null;
    this.testReporter = null;

    // Workflow state
    this.isRunning = false;
    this.currentWorkflow = null;
    this.auditLog = [];
    this.rollbackStack = [];

    // Performance metrics
    this.metrics = {
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      rollbacksExecuted: 0,
      averageWorkflowTime: 0,
      stagePerformance: {
        fileTracking: { total: 0, avg: 0 },
        linting: { total: 0, avg: 0 },
        testing: { total: 0, avg: 0 },
        committing: { total: 0, avg: 0 }
      },
      lastWorkflowTime: null
    };

    // Workflow stages configuration
    this.workflowStages = {
      initialize: {
        name: 'Initialize Workflow',
        required: true,
        handler: this.initializeWorkflow.bind(this),
        rollbackable: false
      },
      startFileTracking: {
        name: 'Start File Tracking',
        required: false,
        condition: () => this.options.enableFileTracking,
        handler: this.startFileTrackingStage.bind(this),
        rollbackable: true
      },
      executeLinting: {
        name: 'Execute Linting',
        required: false,
        condition: () => this.options.enableLinting,
        handler: this.executeLintingStage.bind(this),
        rollbackable: true
      },
      executeTesting: {
        name: 'Execute Testing',
        required: false,
        condition: () => this.options.enableTesting,
        handler: this.executeTestingStage.bind(this),
        rollbackable: true
      },
      stopFileTracking: {
        name: 'Stop File Tracking',
        required: false,
        condition: () => this.options.enableFileTracking,
        handler: this.stopFileTrackingStage.bind(this),
        rollbackable: false
      },
      createCommit: {
        name: 'Create Commit',
        required: false,
        condition: () => this.options.enableCommitAutomation,
        handler: this.createCommitStage.bind(this),
        rollbackable: true
      },
      finalize: {
        name: 'Finalize Workflow',
        required: true,
        handler: this.finalizeWorkflow.bind(this),
        rollbackable: false
      }
    };
  }

  /**
   * Initialize GitWorkflowOrchestrator
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      this.logAuditEvent('orchestrator_initializing', {
        options: this.sanitizeOptionsForLog(this.options),
        timestamp: new Date().toISOString()
      });

      // Initialize subsystems
      await this.initializeSubsystems();

      this.logAuditEvent('orchestrator_initialized', {
        subsystemsInitialized: this.getInitializedSubsystems(),
        timestamp: new Date().toISOString()
      });

      console.log('✅ GitWorkflowOrchestrator initialized successfully');
      this.emit('initialized', {
        subsystems: this.getInitializedSubsystems()
      });

      return true;

    } catch (error) {
      this.logAuditEvent('orchestrator_initialization_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ GitWorkflowOrchestrator initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize all subsystems
   * @returns {Promise<void>}
   */
  async initializeSubsystems() {
    // Initialize ErrorResolver first as other systems may use it
    this.errorResolver = new ErrorResolver(this.options);

    // Initialize GitIntegration (required for all git operations)
    this.gitIntegration = new GitIntegration(this.configManager, this.options);
    const gitInitResult = await this.gitIntegration.initialize();
    if (!gitInitResult) {
      throw new Error('GitIntegration initialization failed');
    }

    // Initialize FileTracker
    if (this.options.enableFileTracking) {
      this.fileTracker = new FileTracker(this.configManager, this.gitIntegration, this.options);
    }

    // Initialize LintingSystem
    if (this.options.enableLinting) {
      this.lintingSystem = new LintingSystem(this.configManager, this.options);
      await this.lintingSystem.initialize();
    }

    // Initialize TestingSystem
    if (this.options.enableTesting) {
      this.testingSystem = new TestingSystem(this.configManager, this.errorResolver, this.options);
      await this.testingSystem.initialize();

      // Initialize TestReporter
      this.testReporter = new TestReporter(this.options);
    }

    // Initialize CommitSystem
    if (this.options.enableCommitAutomation) {
      this.commitSystem = new CommitSystem(this.gitIntegration, this.configManager, this.options);
      await this.commitSystem.initialize();

      // Initialize HookHandler
      this.hookHandler = new HookHandler(this.gitIntegration, this.configManager, this.options);
      await this.hookHandler.initialize();
    }
  }

  /**
   * Get list of initialized subsystems
   * @returns {Array<string>} List of initialized subsystem names
   */
  getInitializedSubsystems() {
    const initialized = [];
    if (this.gitIntegration) initialized.push('GitIntegration');
    if (this.fileTracker) initialized.push('FileTracker');
    if (this.lintingSystem) initialized.push('LintingSystem');
    if (this.testingSystem) initialized.push('TestingSystem');
    if (this.commitSystem) initialized.push('CommitSystem');
    if (this.hookHandler) initialized.push('HookHandler');
    if (this.errorResolver) initialized.push('ErrorResolver');
    if (this.testReporter) initialized.push('TestReporter');
    return initialized;
  }

  /**
   * Execute complete git workflow
   * @param {Object} options - Workflow execution options
   * @returns {Promise<Object>} Workflow execution result
   */
  async executeWorkflow(options = {}) {
    if (this.isRunning) {
      return {
        success: false,
        error: 'Workflow is already running'
      };
    }

    const startTime = Date.now();

    try {
      const {
        commitMessage = null,
        commitTemplate = 'task_completion',
        commitTemplateData = {},
        skipLinting = false,
        skipTesting = false,
        skipCommit = false,
        dryRun = false,
        rollbackOnFailure = this.options.enableRollback
      } = options;

      this.isRunning = true;
      this.currentWorkflow = {
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startTime: new Date().toISOString(),
        options: this.sanitizeOptionsForLog(options),
        stages: [],
        results: {},
        rollbackPoints: [],
        performance: {}
      };

      this.logAuditEvent('workflow_started', {
        workflowId: this.currentWorkflow.id,
        options: this.currentWorkflow.options,
        dryRun: dryRun,
        timestamp: new Date().toISOString()
      });

      console.log(`🚀 Starting git workflow: ${this.currentWorkflow.id}`);
      console.log('='.repeat(60));

      // Execute workflow stages
      const stageResults = await this.executeWorkflowStages({
        skipLinting,
        skipTesting,
        skipCommit,
        dryRun,
        commitMessage,
        commitTemplate,
        commitTemplateData
      });

      const executionTime = Date.now() - startTime;
      this.updateMetrics(stageResults.success, executionTime, stageResults);

      const result = {
        success: stageResults.success,
        workflowId: this.currentWorkflow.id,
        stages: stageResults.stages,
        results: stageResults.results,
        executionTime,
        performance: this.currentWorkflow.performance,
        dryRun: dryRun,
        rollbackAvailable: this.currentWorkflow.rollbackPoints.length > 0
      };

      if (stageResults.error) {
        result.error = stageResults.error;
        result.failedStage = stageResults.failedStage;
      }

      this.logAuditEvent('workflow_completed', {
        workflowId: this.currentWorkflow.id,
        success: result.success,
        executionTime,
        stagesExecuted: result.stages.length,
        timestamp: new Date().toISOString()
      });

      if (result.success) {
        console.log('\n✅ Workflow completed successfully!');
        this.displayWorkflowSummary(result);
        this.emit('workflow_success', result);
      } else {
        console.error('\n❌ Workflow failed!');

        // Handle rollback if enabled and needed
        if (rollbackOnFailure && this.currentWorkflow.rollbackPoints.length > 0) {
          console.log('🔄 Attempting automatic rollback...');
          const rollbackResult = await this.executeRollback();
          result.rollback = rollbackResult;
        }

        this.displayWorkflowFailure(result);
        this.emit('workflow_failed', result);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logAuditEvent('workflow_error', {
        workflowId: this.currentWorkflow?.id,
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `Workflow execution failed: ${error.message}`,
        workflowId: this.currentWorkflow?.id,
        executionTime
      };
    } finally {
      this.isRunning = false;
      this.currentWorkflow = null;
    }
  }

  /**
   * Execute workflow stages
   * @param {Object} stageOptions - Stage execution options
   * @returns {Promise<Object>} Stage execution results
   */
  async executeWorkflowStages(stageOptions) {
    const executedStages = [];
    const stageResults = {};

    try {
      for (const [stageName, stageConfig] of Object.entries(this.workflowStages)) {
        // Check if stage should be executed
        if (stageConfig.condition && !stageConfig.condition()) {
          console.log(`⏭️  Skipping ${stageConfig.name} (condition not met)`);
          continue;
        }

        // Skip stages based on options
        if ((stageName === 'executeLinting' && stageOptions.skipLinting) ||
            (stageName === 'executeTesting' && stageOptions.skipTesting) ||
            (stageName === 'createCommit' && stageOptions.skipCommit)) {
          console.log(`⏭️  Skipping ${stageConfig.name} (requested skip)`);
          continue;
        }

        console.log(`\n🔄 Executing: ${stageConfig.name}`);
        const stageStartTime = Date.now();

        // Create rollback point if stage is rollbackable
        if (stageConfig.rollbackable && this.options.enableRollback) {
          const rollbackPoint = await this.createRollbackPoint(stageName);
          this.currentWorkflow.rollbackPoints.push(rollbackPoint);
        }

        // Execute stage
        const stageResult = await stageConfig.handler(stageOptions);
        const stageExecutionTime = Date.now() - stageStartTime;

        // Track performance
        this.currentWorkflow.performance[stageName] = stageExecutionTime;

        // Record stage execution
        executedStages.push({
          name: stageName,
          displayName: stageConfig.name,
          success: stageResult.success,
          executionTime: stageExecutionTime,
          timestamp: new Date().toISOString()
        });

        stageResults[stageName] = stageResult;

        if (stageResult.success) {
          console.log(`✅ ${stageConfig.name} completed (${stageExecutionTime}ms)`);
        } else {
          console.error(`❌ ${stageConfig.name} failed: ${stageResult.error}`);

          if (this.options.failFast && stageConfig.required) {
            return {
              success: false,
              error: stageResult.error,
              failedStage: stageName,
              stages: executedStages,
              results: stageResults
            };
          }

          // Continue with non-required stages
          if (!stageConfig.required) {
            console.log(`⚠️  Continuing workflow despite ${stageConfig.name} failure (non-required stage)`);
          }
        }
      }

      return {
        success: true,
        stages: executedStages,
        results: stageResults
      };

    } catch (error) {
      return {
        success: false,
        error: `Stage execution failed: ${error.message}`,
        stages: executedStages,
        results: stageResults
      };
    }
  }

  /**
   * Initialize workflow stage
   * @param {Object} options - Stage options
   * @returns {Promise<Object>} Stage result
   */
  async initializeWorkflow(_options) {
    try {
      // Validate git repository state
      const statusResult = await this.gitIntegration.getGitStatus();
      if (!statusResult.success) {
        throw new Error(`Git status check failed: ${statusResult.error}`);
      }

      return {
        success: true,
        gitStatus: statusResult,
        repositoryState: 'valid'
      };
    } catch (error) {
      return {
        success: false,
        error: `Workflow initialization failed: ${error.message}`
      };
    }
  }

  /**
   * Start file tracking stage
   * @param {Object} options - Stage options
   * @returns {Promise<Object>} Stage result
   */
  async startFileTrackingStage(_options) {
    try {
      if (!this.fileTracker) {
        return {
          success: false,
          error: 'FileTracker not initialized'
        };
      }

      const trackingResult = await this.fileTracker.startTracking({
        sessionName: `workflow_${this.currentWorkflow.id}`,
        initialScan: true
      });

      return {
        success: trackingResult.success,
        error: trackingResult.error,
        sessionName: trackingResult.sessionName,
        initialFiles: trackingResult.initialFiles
      };
    } catch (error) {
      return {
        success: false,
        error: `File tracking start failed: ${error.message}`
      };
    }
  }

  /**
   * Execute linting stage
   * @param {Object} options - Stage options
   * @returns {Promise<Object>} Stage result
   */
  async executeLintingStage(_options) {
    try {
      if (!this.lintingSystem) {
        return {
          success: false,
          error: 'LintingSystem not initialized'
        };
      }

      const lintingResult = await this.lintingSystem.executeLinting({
        autoFix: true,
        skipWarnings: !this.options.strictMode
      });

      return {
        success: lintingResult.success,
        error: lintingResult.error,
        attempts: lintingResult.attempts,
        autoFixApplied: lintingResult.autoFixApplied,
        executionTime: lintingResult.executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: `Linting execution failed: ${error.message}`
      };
    }
  }

  /**
   * Execute testing stage
   * @param {Object} options - Stage options
   * @returns {Promise<Object>} Stage result
   */
  async executeTestingStage(_options) {
    try {
      if (!this.testingSystem) {
        return {
          success: false,
          error: 'TestingSystem not initialized'
        };
      }

      const testingResult = await this.testingSystem.executeTests({
        coverage: true,
        verbose: false
      });

      // Generate test report if reporter is available
      let testReport = null;
      if (this.testReporter && testingResult.success) {
        const reportResult = await this.testReporter.processTestResults(testingResult, {
          reportType: 'summary',
          analyzeTrends: true,
          generateInsights: true
        });

        if (reportResult.success) {
          testReport = reportResult.report;
        }
      }

      return {
        success: testingResult.success,
        error: testingResult.error,
        attempts: testingResult.attempts,
        executionTime: testingResult.executionTime,
        testResults: testingResult.parsedResults,
        report: testReport
      };
    } catch (error) {
      return {
        success: false,
        error: `Testing execution failed: ${error.message}`
      };
    }
  }

  /**
   * Stop file tracking stage
   * @param {Object} options - Stage options
   * @returns {Promise<Object>} Stage result
   */
  async stopFileTrackingStage(_options) {
    try {
      if (!this.fileTracker) {
        return {
          success: false,
          error: 'FileTracker not initialized'
        };
      }

      const stopResult = await this.fileTracker.stopTracking();

      return {
        success: stopResult.success,
        error: stopResult.error,
        trackedFiles: stopResult.trackedFiles,
        fileCount: stopResult.fileCount,
        duration: stopResult.duration
      };
    } catch (error) {
      return {
        success: false,
        error: `File tracking stop failed: ${error.message}`
      };
    }
  }

  /**
   * Create commit stage
   * @param {Object} options - Stage options
   * @returns {Promise<Object>} Stage result
   */
  async createCommitStage(options) {
    try {
      if (!this.commitSystem) {
        return {
          success: false,
          error: 'CommitSystem not initialized'
        };
      }

      const commitResult = await this.commitSystem.createCommit({
        message: options.commitMessage,
        template: options.commitTemplate,
        templateData: options.commitTemplateData,
        dryRun: options.dryRun
      });

      return {
        success: commitResult.success,
        error: commitResult.error,
        commitHash: commitResult.commitHash,
        message: commitResult.message,
        attempts: commitResult.attempts,
        executionTime: commitResult.executionTime,
        dryRun: commitResult.dryRun
      };
    } catch (error) {
      return {
        success: false,
        error: `Commit creation failed: ${error.message}`
      };
    }
  }

  /**
   * Finalize workflow stage
   * @param {Object} options - Stage options
   * @returns {Promise<Object>} Stage result
   */
  async finalizeWorkflow(_options) {
    try {
      // Cleanup resources
      if (this.fileTracker && this.fileTracker.isTracking) {
        await this.fileTracker.stopTracking();
      }

      return {
        success: true,
        finalizedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Workflow finalization failed: ${error.message}`
      };
    }
  }

  /**
   * Create rollback point
   * @param {string} stageName - Stage name
   * @returns {Promise<Object>} Rollback point
   */
  async createRollbackPoint(stageName) {
    try {
      const rollbackPoint = {
        stageName,
        timestamp: new Date().toISOString(),
        gitState: null,
        trackedFiles: null
      };

      // Capture git state
      if (this.gitIntegration) {
        const statusResult = await this.gitIntegration.getGitStatus();
        if (statusResult.success) {
          rollbackPoint.gitState = {
            files: statusResult.files,
            detailedFiles: statusResult.detailedFiles,
            isClean: statusResult.isClean
          };
        }
      }

      // Capture file tracking state
      if (this.fileTracker && this.fileTracker.isTracking) {
        rollbackPoint.trackedFiles = this.fileTracker.getTrackedFiles();
      }

      this.rollbackStack.push(rollbackPoint);

      // Limit rollback stack size
      if (this.rollbackStack.length > 20) {
        this.rollbackStack = this.rollbackStack.slice(-20);
      }

      return rollbackPoint;
    } catch (error) {
      console.warn(`⚠️  Failed to create rollback point for ${stageName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute rollback to previous state
   * @returns {Promise<Object>} Rollback result
   */
  async executeRollback() {
    try {
      if (this.currentWorkflow.rollbackPoints.length === 0) {
        return {
          success: false,
          error: 'No rollback points available'
        };
      }

      console.log('🔄 Executing workflow rollback...');

      // Use the most recent rollback point
      const rollbackPoint = this.currentWorkflow.rollbackPoints[this.currentWorkflow.rollbackPoints.length - 1];

      // Rollback git state if available
      if (rollbackPoint.gitState && this.gitIntegration) {
        // This is a simplified rollback - in practice might need more sophisticated handling
        console.log('🔄 Rolling back git state...');

        // Reset any staged changes
        await this.gitIntegration.runGitCommand(['reset', 'HEAD'], {
          description: 'Reset staged changes for rollback'
        });
      }

      this.metrics.rollbacksExecuted++;

      this.logAuditEvent('workflow_rollback_executed', {
        workflowId: this.currentWorkflow.id,
        rollbackPoint: {
          stageName: rollbackPoint.stageName,
          timestamp: rollbackPoint.timestamp
        },
        timestamp: new Date().toISOString()
      });

      console.log('✅ Workflow rollback completed');
      this.emit('rollback_executed', rollbackPoint);

      return {
        success: true,
        rollbackPoint: rollbackPoint
      };
    } catch (error) {
      return {
        success: false,
        error: `Rollback failed: ${error.message}`
      };
    }
  }

  /**
   * Display workflow summary
   * @param {Object} result - Workflow result
   */
  displayWorkflowSummary(result) {
    console.log('\n📊 Workflow Summary:');
    console.log('='.repeat(30));
    console.log(`Workflow ID: ${result.workflowId}`);
    console.log(`Total Time: ${Math.round(result.executionTime / 1000)}s`);
    console.log(`Stages Executed: ${result.stages.length}`);

    // Display stage performance
    if (result.performance) {
      console.log('\n⏱️  Stage Performance:');
      for (const [stageName, time] of Object.entries(result.performance)) {
        console.log(`  ${stageName}: ${Math.round(time)}ms`);
      }
    }

    // Display key results
    if (result.results.createCommit && result.results.createCommit.commitHash) {
      console.log(`\n📋 Commit: ${result.results.createCommit.commitHash.substring(0, 8)}`);
    }

    if (result.results.executeTesting && result.results.executeTesting.testResults) {
      const tests = result.results.executeTesting.testResults;
      console.log(`\n🧪 Tests: ${tests.passedTests || 0} passed, ${tests.failedTests?.length || 0} failed`);
    }
  }

  /**
   * Display workflow failure information
   * @param {Object} result - Workflow failure result
   */
  displayWorkflowFailure(result) {
    console.log('\n❌ Workflow Failure Details:');
    console.log('='.repeat(40));
    console.log(`Failed Stage: ${result.failedStage || 'unknown'}`);
    console.log(`Error: ${result.error || 'unknown error'}`);

    if (result.rollback) {
      if (result.rollback.success) {
        console.log('\n✅ Rollback completed successfully');
      } else {
        console.log(`\n❌ Rollback failed: ${result.rollback.error}`);
      }
    }

    console.log('\n💡 Next Steps:');
    console.log('  1. Review the error message and fix the underlying issue');
    console.log('  2. Check logs for more detailed information');
    console.log('  3. Retry the workflow after fixing the issue');

    if (result.rollbackAvailable && !result.rollback) {
      console.log('  4. Consider manual rollback if needed');
    }
  }

  /**
   * Update performance metrics
   * @param {boolean} success - Whether operation was successful
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Object} result - Operation result
   */
  updateMetrics(success, executionTime, result) {
    this.metrics.totalWorkflows++;
    if (success) {
      this.metrics.successfulWorkflows++;
    } else {
      this.metrics.failedWorkflows++;
    }

    this.metrics.averageWorkflowTime =
      (this.metrics.averageWorkflowTime * (this.metrics.totalWorkflows - 1) + executionTime) /
      this.metrics.totalWorkflows;

    this.metrics.lastWorkflowTime = new Date().toISOString();

    // Update stage performance metrics
    if (result.stages) {
      for (const stage of result.stages) {
        const stageKey = stage.name;
        if (this.metrics.stagePerformance[stageKey]) {
          this.metrics.stagePerformance[stageKey].total++;
          const currentAvg = this.metrics.stagePerformance[stageKey].avg;
          const total = this.metrics.stagePerformance[stageKey].total;
          this.metrics.stagePerformance[stageKey].avg =
            (currentAvg * (total - 1) + stage.executionTime) / total;
        }
      }
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Statistics and metrics
   */
  getStatistics() {
    return {
      metrics: { ...this.metrics },
      subsystems: {
        initialized: this.getInitializedSubsystems(),
        statistics: {
          gitIntegration: this.gitIntegration?.getStatistics() || null,
          lintingSystem: this.lintingSystem?.getStatistics() || null,
          testingSystem: this.testingSystem?.getStatistics() || null,
          commitSystem: this.commitSystem?.getStatistics() || null,
          hookHandler: this.hookHandler?.getStatistics() || null,
          testReporter: this.testReporter?.getStatistics() || null
        }
      },
      currentWorkflow: this.currentWorkflow ? {
        id: this.currentWorkflow.id,
        startTime: this.currentWorkflow.startTime,
        stages: this.currentWorkflow.stages.length,
        rollbackPoints: this.currentWorkflow.rollbackPoints.length
      } : null,
      rollbackStack: {
        size: this.rollbackStack.length,
        available: this.rollbackStack.length > 0
      },
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
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500);
    }
  }

  /**
   * Sanitize options for logging
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   */
  sanitizeOptionsForLog(options) {
    const { commitMessage, ...safeOptions } = options;
    return {
      ...safeOptions,
      hasCommitMessage: !!commitMessage
    };
  }

  /**
   * Shutdown GitWorkflowOrchestrator
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down GitWorkflowOrchestrator...');

      // Cancel any running workflows
      this.isRunning = false;
      this.currentWorkflow = null;

      // Shutdown all subsystems
      const shutdownPromises = [];
      if (this.gitIntegration) shutdownPromises.push(this.gitIntegration.shutdown());
      if (this.fileTracker) shutdownPromises.push(this.fileTracker.shutdown());
      if (this.lintingSystem) shutdownPromises.push(this.lintingSystem.shutdown());
      if (this.testingSystem) shutdownPromises.push(this.testingSystem.shutdown());
      if (this.commitSystem) shutdownPromises.push(this.commitSystem.shutdown());
      if (this.hookHandler) shutdownPromises.push(this.hookHandler.shutdown());

      await Promise.all(shutdownPromises);

      this.logAuditEvent('orchestrator_shutdown', {
        finalStats: this.getStatistics(),
        timestamp: new Date().toISOString()
      });

      this.removeAllListeners();

      console.log('✅ GitWorkflowOrchestrator shutdown complete');
      this.emit('shutdown_complete');

    } catch (error) {
      console.error(`❌ GitWorkflowOrchestrator shutdown failed: ${error.message}`);
    }
  }
}

module.exports = GitWorkflowOrchestrator;