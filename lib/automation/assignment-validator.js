/**
 * AssignmentValidator - Validates agent capability and assignment constraints
 *
 * Provides comprehensive validation for automated task assignments including:
 * - Agent capability validation against task requirements
 * - Dependency block checking and resolution
 * - Workload balancing and capacity constraints
 * - Business rule enforcement and quality gates
 */
class AssignmentValidator {
  constructor(configManager, taskRouter, workflowStateManager) {
    this.configManager = configManager;
    this.taskRouter = taskRouter;
    this.workflowStateManager = workflowStateManager;
    this.auditLog = [];
  }

  /**
   * Validate a task assignment comprehensively
   * @param {Object} assignment - Assignment to validate
   * @param {string} assignment.taskId - Task ID
   * @param {string} assignment.specId - Specification ID
   * @param {string} assignment.agentType - Agent type
   * @param {Object} options - Additional validation options
   * @returns {Promise<Object>} Validation result with detailed feedback
   */
  async validateAssignment(assignment, options = {}) {
    const startTime = Date.now();
    const { taskId, specId, agentType } = assignment;

    // Initialize validation result
    const validation = {
      isValid: true,
      violations: [],
      warnings: [],
      canProceed: true,
      confidence: 1.0,
      validationDetails: {
        taskAvailability: null,
        agentCapability: null,
        dependencyCheck: null,
        workloadBalance: null,
        businessRules: null,
      },
      auditTrail: [],
      performance: {},
    };

    try {
      // Log validation start
      this.logValidationEvent('assignment_validation_started', {
        taskId,
        specId,
        agentType,
        timestamp: new Date().toISOString(),
      });

      // 1. Task Availability Validation
      validation.validationDetails.taskAvailability =
        await this.validateTaskAvailability(specId, taskId);

      if (!validation.validationDetails.taskAvailability.isValid) {
        validation.isValid = false;
        validation.violations.push(
          ...validation.validationDetails.taskAvailability.violations
        );
      }

      // 2. Agent Capability Validation
      validation.validationDetails.agentCapability =
        await this.validateAgentCapability(agentType, specId, taskId);

      if (!validation.validationDetails.agentCapability.isValid) {
        validation.isValid = false;
        validation.violations.push(
          ...validation.validationDetails.agentCapability.violations
        );
      }
      validation.confidence *=
        validation.validationDetails.agentCapability.confidenceMultiplier ||
        1.0;

      // 3. Dependency Block Validation
      validation.validationDetails.dependencyCheck =
        await this.validateDependencies(specId, taskId);

      if (!validation.validationDetails.dependencyCheck.isValid) {
        validation.isValid = false;
        validation.violations.push(
          ...validation.validationDetails.dependencyCheck.violations
        );
      }

      // 4. Workload Balance Validation
      if (options.checkWorkload) {
        validation.validationDetails.workloadBalance =
          await this.validateWorkloadBalance(
            agentType,
            options.workloadConstraints
          );

        if (!validation.validationDetails.workloadBalance.isValid) {
          validation.isValid = false;
          validation.violations.push(
            ...validation.validationDetails.workloadBalance.violations
          );
        }
        validation.warnings.push(
          ...validation.validationDetails.workloadBalance.warnings
        );
      }

      // 5. Business Rules Validation
      validation.validationDetails.businessRules =
        await this.validateBusinessRules(assignment, options);

      if (!validation.validationDetails.businessRules.isValid) {
        validation.isValid = false;
        validation.violations.push(
          ...validation.validationDetails.businessRules.violations
        );
      }

      // Determine if assignment can proceed
      validation.canProceed = validation.isValid || options.allowViolations;

      // Calculate final confidence score
      validation.confidence = Math.max(
        0.1,
        Math.min(1.0, validation.confidence)
      );

      // Log validation completion
      this.logValidationEvent('assignment_validation_completed', {
        taskId,
        specId,
        agentType,
        isValid: validation.isValid,
        canProceed: validation.canProceed,
        confidence: validation.confidence,
        violationCount: validation.violations.length,
        warningCount: validation.warnings.length,
        timestamp: new Date().toISOString(),
      });

      validation.performance.total = Date.now() - startTime;
      validation.auditTrail = [...this.auditLog];

      return validation;
    } catch (error) {
      this.logValidationEvent('assignment_validation_error', {
        taskId,
        specId,
        agentType,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return {
        isValid: false,
        violations: [`Validation failed: ${error.message}`],
        warnings: [],
        canProceed: false,
        confidence: 0.0,
        validationDetails: {},
        auditTrail: [...this.auditLog],
        performance: { total: Date.now() - startTime },
        error: error.message,
      };
    }
  }

  /**
   * Validate task is available for assignment
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task availability validation result
   */
  async validateTaskAvailability(specId, taskId) {
    const validation = {
      isValid: true,
      violations: [],
      taskFound: false,
      currentStatus: null,
      isAvailable: false,
    };

    try {
      // Get all tasks using TaskRouter
      const allTasks = await this.taskRouter.getAllTasks();
      const task = allTasks.find(
        (t) =>
          (t.id === taskId || t.id === `${specId}:${taskId}`) &&
          t.specId === specId
      );

      if (!task) {
        validation.isValid = false;
        validation.violations.push(`Task ${specId}:${taskId} not found`);
        return validation;
      }

      validation.taskFound = true;
      validation.currentStatus = task.status || 'ready';

      // Check if task is in a valid state for assignment
      const availableStatuses = ['ready', 'pending', undefined, null];
      validation.isAvailable = availableStatuses.includes(
        validation.currentStatus
      );

      if (!validation.isAvailable) {
        validation.isValid = false;
        validation.violations.push(
          `Task ${taskId} is not available for assignment (current status: ${validation.currentStatus})`
        );
      }

      // Check if task is already assigned
      const currentAssignments =
        await this.workflowStateManager.getCurrentAssignments();
      const existingAssignment = currentAssignments.current_assignments.find(
        (a) =>
          a.spec_id === specId &&
          a.task_id === taskId &&
          a.status === 'in_progress'
      );

      if (existingAssignment) {
        validation.isValid = false;
        validation.violations.push(
          `Task ${taskId} is already assigned to ${existingAssignment.assigned_agent}`
        );
      }
    } catch (error) {
      validation.isValid = false;
      validation.violations.push(
        `Task availability check failed: ${error.message}`
      );
    }

    return validation;
  }

  /**
   * Validate agent capability against task requirements
   * @param {string} agentType - Agent type
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Agent capability validation result
   */
  async validateAgentCapability(agentType, specId, taskId) {
    const validation = {
      isValid: true,
      violations: [],
      confidenceMultiplier: 1.0,
      capabilityMatch: null,
      requiredSkills: [],
      agentSkills: [],
      matchingSkills: [],
      missingSkills: [],
    };

    try {
      // Get task details
      const allTasks = await this.taskRouter.getAllTasks();
      const task = allTasks.find(
        (t) =>
          (t.id === taskId || t.id === `${specId}:${taskId}`) &&
          t.specId === specId
      );

      if (!task) {
        validation.isValid = false;
        validation.violations.push(
          `Task ${specId}:${taskId} not found for capability validation`
        );
        return validation;
      }

      // Use TaskRouter's built-in capability validation
      const canHandle = this.taskRouter.validateAgentCapability(
        task,
        agentType
      );

      if (!canHandle) {
        validation.isValid = false;
        validation.violations.push(
          `Agent type '${agentType}' cannot handle task '${taskId}' based on capability requirements`
        );
        validation.confidenceMultiplier = 0.2;
      }

      // Get detailed capability analysis using constraint engine
      const constraintEngine = this.taskRouter.getConstraintEngine();
      const skillValidation = await constraintEngine.validateSkillConstraints(
        task,
        agentType
      );

      validation.requiredSkills = task.context_requirements || [];
      validation.capabilityMatch = skillValidation;
      validation.confidenceMultiplier *= skillValidation.scoreMultiplier;

      if (!skillValidation.isValid) {
        validation.isValid = false;
        validation.violations.push(...skillValidation.violations);
      }

      // Extract skill matching details
      if (skillValidation.matchingSkills) {
        validation.matchingSkills = skillValidation.matchingSkills;
        validation.missingSkills = skillValidation.missingSkills;
        validation.agentSkills = skillValidation.agentSkills;
      }
    } catch (error) {
      validation.isValid = false;
      validation.violations.push(
        `Agent capability validation failed: ${error.message}`
      );
      validation.confidenceMultiplier = 0.1;
    }

    return validation;
  }

  /**
   * Validate task dependencies are met
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Dependency validation result
   */
  async validateDependencies(specId, taskId) {
    const validation = {
      isValid: true,
      violations: [],
      dependencies: [],
      blockedBy: [],
      dependencyStatus: {},
    };

    try {
      // Get all tasks to check dependencies
      const allTasks = await this.taskRouter.getAllTasks();
      const task = allTasks.find(
        (t) =>
          (t.id === taskId || t.id === `${specId}:${taskId}`) &&
          t.specId === specId
      );

      if (!task) {
        validation.isValid = false;
        validation.violations.push(
          `Task ${specId}:${taskId} not found for dependency validation`
        );
        return validation;
      }

      // Check if task is blocked by dependencies
      const isBlocked = this.taskRouter.isTaskBlocked(task, allTasks);

      if (isBlocked) {
        validation.isValid = false;

        // Get detailed dependency information
        const dependencyChain = await this.taskRouter.getDependencyChain(
          taskId
        );
        validation.dependencies = dependencyChain.dependencies;
        validation.blockedBy = dependencyChain.blockedBy;

        if (validation.blockedBy.length > 0) {
          validation.violations.push(
            `Task ${taskId} is blocked by unmet dependencies: ${validation.blockedBy.join(
              ', '
            )}`
          );
        }

        // Get status of each dependency
        for (const dep of validation.dependencies) {
          validation.dependencyStatus[dep.id] = {
            found: dep.found,
            status: dep.status,
            completed: dep.completed,
          };
        }
      }
    } catch (error) {
      validation.isValid = false;
      validation.violations.push(
        `Dependency validation failed: ${error.message}`
      );
    }

    return validation;
  }

  /**
   * Validate workload balance for agent
   * @param {string} agentType - Agent type
   * @param {Object} constraints - Workload constraints
   * @returns {Promise<Object>} Workload validation result
   */
  async validateWorkloadBalance(agentType, constraints = {}) {
    const validation = {
      isValid: true,
      violations: [],
      warnings: [],
      currentWorkload: 0,
      projectedWorkload: 0,
      maxWorkload: constraints.maxWorkloadPerAgent || 40,
    };

    try {
      // Get current agent workload
      const constraintEngine = this.taskRouter.getConstraintEngine();
      validation.currentWorkload = constraintEngine.getAgentWorkload(agentType);

      // Assume 2 hour task for projection
      const estimatedHours = constraints.estimatedHours || 2;
      validation.projectedWorkload =
        validation.currentWorkload + estimatedHours;

      // Validate workload constraints
      const workloadValidation =
        await constraintEngine.validateWorkloadConstraints(
          { estimated_hours: estimatedHours },
          agentType,
          constraints
        );

      if (!workloadValidation.isValid) {
        validation.isValid = false;
        validation.violations.push(...workloadValidation.violations);
      }

      validation.warnings.push(...workloadValidation.warnings);
    } catch (error) {
      validation.warnings.push(`Workload validation failed: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate business rules for assignment
   * @param {Object} assignment - Assignment details
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Business rules validation result
   */
  async validateBusinessRules(assignment, options = {}) {
    const validation = {
      isValid: true,
      violations: [],
      rulesApplied: [],
    };

    try {
      const { taskId, specId, agentType } = assignment;

      // Rule 1: P0 tasks should not be auto-assigned without explicit confirmation
      const allTasks = await this.taskRouter.getAllTasks();
      const task = allTasks.find(
        (t) =>
          (t.id === taskId || t.id === `${specId}:${taskId}`) &&
          t.specId === specId
      );

      if (task && (task.priority === 'P0' || task.specPriority === 'P0')) {
        if (!options.confirmCritical) {
          validation.isValid = false;
          validation.violations.push(
            'P0 (Critical) tasks require explicit confirmation for auto-assignment'
          );
        }
        validation.rulesApplied.push('critical_task_confirmation');
      }

      // Rule 2: Cross-agent handoffs should have context prepared
      if (options.isHandoff && !options.contextPrepared) {
        validation.violations.push(
          'Cross-agent handoffs require context preparation'
        );
        validation.rulesApplied.push('handoff_context_preparation');
      }

      // Rule 3: Agent should not have more than configured max concurrent tasks
      const maxConcurrentTasks = options.maxConcurrentTasks || 3;
      const currentAssignments =
        await this.workflowStateManager.getCurrentAssignments();
      const agentAssignments = currentAssignments.current_assignments.filter(
        (a) => a.assigned_agent === agentType && a.status === 'in_progress'
      );

      if (agentAssignments.length >= maxConcurrentTasks) {
        validation.isValid = false;
        validation.violations.push(
          `Agent ${agentType} already has maximum concurrent tasks (${maxConcurrentTasks})`
        );
        validation.rulesApplied.push('max_concurrent_tasks');
      }
    } catch (error) {
      validation.violations.push(
        `Business rules validation failed: ${error.message}`
      );
    }

    return validation;
  }

  /**
   * Get actionable error messages for validation failures
   * @param {Object} validation - Validation result
   * @returns {Array<string>} Actionable error messages
   */
  getActionableErrors(validation) {
    const actionableErrors = [];

    for (const violation of validation.violations) {
      if (violation.includes('not found')) {
        actionableErrors.push(
          `${violation}. Check task ID and spec ID are correct.`
        );
      } else if (violation.includes('already assigned')) {
        actionableErrors.push(
          `${violation}. Use 'asd tasks --agent ${validation.agentType}' to see current assignments.`
        );
      } else if (violation.includes('blocked by')) {
        actionableErrors.push(
          `${violation}. Complete dependencies first or check dependency status.`
        );
      } else if (violation.includes('cannot handle')) {
        actionableErrors.push(
          `${violation}. Check agent capabilities or assign to appropriate agent type.`
        );
      } else if (
        violation.includes('workload') ||
        violation.includes('capacity')
      ) {
        actionableErrors.push(
          `${violation}. Consider load balancing or increasing agent capacity.`
        );
      } else if (
        violation.includes('P0') &&
        violation.includes('confirmation')
      ) {
        actionableErrors.push(
          `${violation}. Use --confirm-critical flag for critical task assignment.`
        );
      } else {
        actionableErrors.push(violation);
      }
    }

    return actionableErrors;
  }

  /**
   * Log validation events for audit trail
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  logValidationEvent(event, data) {
    this.auditLog.push({
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get validation audit log
   * @returns {Array} Audit log entries
   */
  getAuditLog() {
    return [...this.auditLog];
  }

  /**
   * Clear validation audit log
   */
  clearAuditLog() {
    this.auditLog = [];
  }
}

module.exports = AssignmentValidator;
