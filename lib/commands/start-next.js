const chalk = require('chalk');
const { TaskRecommendationAPI } = require('../task-router');
const WorkflowStateManager = require('../workflow-state-manager');
const AssignmentValidator = require('../automation/assignment-validator');
const ConfigManager = require('../config-manager');

/**
 * Enhanced start-next command implementation
 *
 * Provides intelligent task routing with automatic assignment and validation.
 * Implements ADR-004 automated task status workflow requirements including:
 * - Intelligent task recommendation using TaskRouter
 * - Comprehensive assignment validation
 * - Automatic status updates (ready → in_progress)
 * - Audit logging for all automated actions
 * - Comprehensive error handling with actionable messages
 */
class StartNextCommand {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.taskAPI = null;
    this.workflowStateManager = null;
    this.assignmentValidator = null;
    this.auditLog = [];
    this.performanceTarget = 5000; // 5 second target from ADR-004
  }

  /**
   * Initialize the command with required dependencies
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    const startTime = Date.now();

    try {
      // Initialize TaskRecommendationAPI
      this.taskAPI = new TaskRecommendationAPI(this.configManager);
      const apiInitialized = await this.taskAPI.initialize();
      if (!apiInitialized) {
        throw new Error('Failed to initialize TaskRecommendationAPI');
      }

      // Initialize WorkflowStateManager
      this.workflowStateManager = new WorkflowStateManager(this.configManager);
      await this.workflowStateManager.initialize();

      // Initialize AssignmentValidator
      const { TaskRouter } = require('../task-router');
      const taskRouter = new TaskRouter(this.configManager);
      await taskRouter.initialize();

      this.assignmentValidator = new AssignmentValidator(
        this.configManager,
        taskRouter,
        this.workflowStateManager
      );

      const initTime = Date.now() - startTime;
      this.logAuditEvent('command_initialized', {
        initializationTime: initTime,
        timestamp: new Date().toISOString()
      });

      if (initTime > 1000) {
        console.warn(chalk.yellow(`⚠️  Initialization took ${initTime}ms`));
      }

      return true;
    } catch (error) {
      this.logAuditEvent('initialization_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new Error(`StartNextCommand initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute the start-next command
   * @param {Object} options - Command options
   * @param {string} options.agent - Agent type (required)
   * @param {string} options.priority - Priority filter
   * @param {string} options.phase - Phase filter
   * @param {string} options.specStatus - Spec status filter
   * @param {boolean} options.dryRun - Show what would happen without executing
   * @param {boolean} options.confirmCritical - Confirm critical task assignment
   * @param {boolean} options.showReasoning - Show detailed reasoning
   * @param {Object} options.constraints - Additional constraints
   * @returns {Promise<Object>} Execution result
   */
  async execute(options) {
    const startTime = Date.now();

    try {
      // Validate required parameters
      if (!options.agent) {
        return this.createErrorResult('Agent type is required (use --agent <agent-type>)', startTime);
      }

      this.logAuditEvent('command_started', {
        agent: options.agent,
        options: this.sanitizeOptionsForLog(options),
        timestamp: new Date().toISOString()
      });

      console.log(chalk.cyan('🚀 Finding Next Task'));
      console.log(chalk.gray('='.repeat(50)));
      console.log(chalk.white(`Agent: ${chalk.yellow(options.agent)}`));

      if (options.dryRun) {
        console.log(chalk.blue('🔍 DRY RUN MODE - No changes will be made'));
      }

      // Step 1: Get next task recommendation
      const recommendationResult = await this.getTaskRecommendation(options);
      if (!recommendationResult.success) {
        return recommendationResult;
      }

      const task = recommendationResult.task;
      if (!task) {
        return this.createResult({
          success: true,
          assigned: false,
          message: 'No suitable tasks found for agent',
          recommendation: recommendationResult,
          suggestions: this.generateNoTaskSuggestions(options.agent, recommendationResult),
          performance: { total: Date.now() - startTime }
        });
      }

      console.log(chalk.green(`\n✅ Recommended Task: ${chalk.cyan(task.specId)}:${chalk.yellow(task.id)}`));
      console.log(chalk.white(`Title: ${task.title || 'No title available'}`));
      if (task.specPriority || task.priority) {
        console.log(chalk.white(`Priority: ${chalk.red(task.specPriority || task.priority)}`));
      }

      // Show reasoning if requested
      if (options.showReasoning && recommendationResult.reasoning) {
        this.displayRecommendationReasoning(recommendationResult.reasoning);
      }

      // Step 2: Validate assignment
      const validationResult = await this.validateAssignment(task, options);
      if (!validationResult.success) {
        return validationResult;
      }

      // Show validation warnings
      if (validationResult.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Assignment Warnings:'));
        validationResult.warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
      }

      // Step 3: Execute assignment (unless dry run)
      if (options.dryRun) {
        return this.createDryRunResult(task, validationResult, startTime);
      }

      const assignmentResult = await this.executeAssignment(task, options);
      if (!assignmentResult.success) {
        return assignmentResult;
      }

      // Step 4: Display success and next steps
      this.displaySuccessMessage(task, assignmentResult);

      const totalTime = Date.now() - startTime;
      this.logAuditEvent('command_completed_successfully', {
        taskId: task.id,
        specId: task.specId,
        agent: options.agent,
        totalTime,
        timestamp: new Date().toISOString()
      });

      if (totalTime > this.performanceTarget) {
        console.log(chalk.yellow(`\n⚠️  Command took ${totalTime}ms (target: ${this.performanceTarget}ms)`));
      }

      return this.createResult({
        success: true,
        assigned: true,
        task: {
          id: task.id,
          specId: task.specId,
          title: task.title,
          agent: options.agent,
          assignedAt: assignmentResult.assignment.started_at
        },
        assignment: assignmentResult.assignment,
        validation: validationResult,
        performance: { total: totalTime }
      });

    } catch (error) {
      this.logAuditEvent('command_failed', {
        error: error.message,
        agent: options.agent,
        timestamp: new Date().toISOString()
      });

      return this.createErrorResult(`Command execution failed: ${error.message}`, startTime);
    }
  }

  /**
   * Get task recommendation using TaskRecommendationAPI
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Recommendation result
   */
  async getTaskRecommendation(options) {
    try {
      // Parse filter options
      const priority = options.priority ? options.priority.split(',') : undefined;
      const phase = options.phase ? options.phase.split(',') : undefined;
      const specStatus = options.specStatus ? options.specStatus.split(',') : undefined;

      // Get task recommendation
      const result = await this.taskAPI.getNextTask({
        agentType: options.agent,
        priority,
        phase,
        specStatus,
        includeReasoning: true,
        includeAlternatives: true
      });

      if (!result.success) {
        this.logAuditEvent('recommendation_failed', {
          agent: options.agent,
          error: result.error,
          timestamp: new Date().toISOString()
        });

        return this.createErrorResult(`Task recommendation failed: ${result.error}`);
      }

      this.logAuditEvent('recommendation_retrieved', {
        agent: options.agent,
        taskFound: !!result.task,
        taskId: result.task?.id,
        specId: result.task?.specId,
        alternatives: result.alternatives?.length || 0,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        task: result.task,
        reasoning: result.reasoning,
        alternatives: result.alternatives,
        metadata: result.metadata
      };

    } catch (error) {
      return this.createErrorResult(`Failed to get task recommendation: ${error.message}`);
    }
  }

  /**
   * Validate task assignment
   * @param {Object} task - Task to validate
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Validation result
   */
  async validateAssignment(task, options) {
    try {
      console.log(chalk.blue('\n🔍 Validating Assignment...'));

      const assignment = {
        taskId: task.id,
        specId: task.specId,
        agentType: options.agent
      };

      const validationOptions = {
        checkWorkload: true,
        confirmCritical: options.confirmCritical,
        maxConcurrentTasks: options.constraints?.maxConcurrentTasks || 3,
        workloadConstraints: options.constraints?.workload || {}
      };

      const validation = await this.assignmentValidator.validateAssignment(
        assignment,
        validationOptions
      );

      this.logAuditEvent('assignment_validated', {
        taskId: task.id,
        specId: task.specId,
        agent: options.agent,
        isValid: validation.isValid,
        canProceed: validation.canProceed,
        confidence: validation.confidence,
        violationCount: validation.violations.length,
        timestamp: new Date().toISOString()
      });

      if (!validation.isValid && !validation.canProceed) {
        const actionableErrors = this.assignmentValidator.getActionableErrors(validation);

        console.log(chalk.red('\n❌ Assignment Validation Failed:'));
        actionableErrors.forEach(error => {
          console.log(chalk.red(`  • ${error}`));
        });

        return this.createErrorResult('Assignment validation failed', 0, {
          violations: actionableErrors,
          validation: validation
        });
      }

      if (validation.violations.length > 0) {
        console.log(chalk.yellow('\n⚠️  Validation Issues (proceeding with warnings):'));
        validation.violations.forEach(violation => {
          console.log(chalk.yellow(`  • ${violation}`));
        });
      }

      console.log(chalk.green('✅ Assignment validation passed'));
      if (validation.confidence < 1.0) {
        console.log(chalk.yellow(`   Confidence: ${Math.round(validation.confidence * 100)}%`));
      }

      return {
        success: true,
        isValid: validation.isValid,
        canProceed: validation.canProceed,
        confidence: validation.confidence,
        violations: validation.violations,
        warnings: validation.warnings,
        validationDetails: validation.validationDetails
      };

    } catch (error) {
      return this.createErrorResult(`Assignment validation failed: ${error.message}`);
    }
  }

  /**
   * Execute the task assignment
   * @param {Object} task - Task to assign
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Assignment result
   */
  async executeAssignment(task, options) {
    try {
      console.log(chalk.blue('\n📋 Assigning Task...'));

      const assignmentOptions = {
        priority: task.specPriority || task.priority,
        estimatedHours: task.estimated_hours || 2,
        assignedBy: 'start-next-automation'
      };

      const result = await this.workflowStateManager.assignTask(
        task.specId,
        task.id,
        options.agent,
        assignmentOptions
      );

      this.logAuditEvent('task_assigned', {
        taskId: task.id,
        specId: task.specId,
        agent: options.agent,
        success: result.success,
        assignedAt: result.assignment?.started_at,
        timestamp: new Date().toISOString()
      });

      if (!result.success) {
        return this.createErrorResult(`Task assignment failed: ${result.error}`);
      }

      return result;

    } catch (error) {
      return this.createErrorResult(`Failed to execute assignment: ${error.message}`);
    }
  }

  /**
   * Display recommendation reasoning
   * @param {Object} reasoning - Reasoning object
   */
  displayRecommendationReasoning(reasoning) {
    if (!reasoning) return;

    console.log(chalk.blue('\n💡 Recommendation Reasoning:'));
    if (reasoning.summary) {
      console.log(chalk.white(`   ${reasoning.summary}`));
    }

    if (reasoning.factors && reasoning.factors.length > 0) {
      console.log(chalk.gray('\n   Key Factors:'));
      reasoning.factors.forEach(factor => {
        const color = factor.impact === 'High' ? chalk.green :
                     factor.impact === 'Positive' ? chalk.cyan : chalk.gray;
        console.log(color(`   • ${factor.factor}: ${factor.value}`));
      });
    }

    if (reasoning.confidence) {
      const confidencePercent = Math.round(reasoning.confidence * 100);
      const confidenceColor = confidencePercent >= 80 ? chalk.green :
                             confidencePercent >= 60 ? chalk.yellow : chalk.red;
      console.log(confidenceColor(`\n   Confidence: ${confidencePercent}%`));
    }
  }

  /**
   * Display success message and next steps
   * @param {Object} task - Assigned task
   * @param {Object} assignmentResult - Assignment result
   */
  displaySuccessMessage(task, assignmentResult) {
    console.log(chalk.green('\n🎉 Task Successfully Assigned!'));
    console.log(chalk.gray('='.repeat(40)));
    console.log(chalk.white(`Task: ${chalk.cyan(task.specId)}:${chalk.yellow(task.id)}`));
    console.log(chalk.white(`Status: ${chalk.green('in_progress')}`));
    console.log(chalk.white(`Assigned: ${assignmentResult.assignment.started_at}`));

    console.log(chalk.blue('\n📝 Next Steps:'));
    console.log(chalk.white('  1. Review task context and requirements'));
    console.log(chalk.white('  2. Begin implementation work'));
    console.log(chalk.white('  3. Use \'asd complete-current\' when finished'));

    if (task.context_requirements && task.context_requirements.length > 0) {
      console.log(chalk.yellow('\n🔍 Context Requirements:'));
      task.context_requirements.forEach(req => {
        console.log(chalk.yellow(`  • ${req}`));
      });
    }

    if (task.estimated_hours) {
      console.log(chalk.gray(`\n⏱️  Estimated Time: ${task.estimated_hours} hours`));
    }
  }

  /**
   * Generate suggestions when no tasks found
   * @param {string} agentType - Agent type
   * @param {Object} recommendationResult - Recommendation result
   * @returns {Array<string>} Suggestions
   */
  generateNoTaskSuggestions(agentType, recommendationResult) {
    const suggestions = [];
    const metadata = recommendationResult.metadata;

    if (metadata && metadata.totalAvailable === 0) {
      suggestions.push('No tasks available in the project');
      suggestions.push('Check if new specifications need to be created');
    } else if (metadata && metadata.agentMatches === 0) {
      suggestions.push(`No tasks match ${agentType} agent capabilities`);
      suggestions.push('Try broadening agent specializations or check other agent types');
      suggestions.push("Use 'asd agent list --details' to see available agent types");
    } else {
      suggestions.push('Try broadening filter criteria:');
      suggestions.push('  • Remove priority filters (--priority)');
      suggestions.push('  • Include more phases (--phase)');
      suggestions.push('  • Include backlog specs (--spec-status active,ready,backlog)');
    }

    suggestions.push("Use 'asd tasks' to see all available tasks");

    return suggestions;
  }

  /**
   * Create dry run result
   * @param {Object} task - Task that would be assigned
   * @param {Object} validation - Validation result
   * @param {number} startTime - Start time for performance calculation
   * @returns {Object} Dry run result
   */
  createDryRunResult(task, validation, startTime) {
    console.log(chalk.blue('\n🔍 DRY RUN SUMMARY:'));
    console.log(chalk.gray('='.repeat(30)));
    console.log(chalk.white(`Would assign: ${chalk.cyan(task.specId)}:${chalk.yellow(task.id)}`));
    console.log(chalk.white(`To agent: ${chalk.yellow(task.agent || 'unspecified')}`));
    console.log(chalk.white(`Validation: ${validation.isValid ? chalk.green('PASS') : chalk.red('FAIL')}`));

    if (validation.confidence < 1.0) {
      console.log(chalk.yellow(`Confidence: ${Math.round(validation.confidence * 100)}%`));
    }

    this.logAuditEvent('dry_run_completed', {
      taskId: task.id,
      specId: task.specId,
      validationPassed: validation.isValid,
      confidence: validation.confidence,
      timestamp: new Date().toISOString()
    });

    return this.createResult({
      success: true,
      assigned: false,
      dryRun: true,
      wouldAssign: {
        taskId: task.id,
        specId: task.specId,
        title: task.title,
        validationPassed: validation.isValid,
        confidence: validation.confidence
      },
      validation: validation,
      performance: { total: Date.now() - startTime }
    });
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
      command: 'start-next'
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
      ...additionalData
    });
  }

  /**
   * Sanitize options for logging (remove sensitive data)
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   */
  sanitizeOptionsForLog(options) {
    const { constraints, ...safeOptions } = options;
    return {
      ...safeOptions,
      hasConstraints: !!constraints
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
      timestamp: new Date().toISOString()
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

module.exports = StartNextCommand;