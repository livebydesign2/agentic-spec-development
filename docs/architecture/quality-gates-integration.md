# Quality Gates Integration Architecture

**Document**: Technical Design - Quality Gates Integration  
**Status**: Proposed  
**Date**: 2024-08-27  
**Architect**: Software Architect AI Agent

## 🎯 Quality Gates Overview

Quality Gates provide automated validation checkpoints that prevent invalid workflow operations before they can cause inconsistencies or system issues. They integrate deeply with ASD's existing WorkflowStateManager and TaskRouter systems.

## 🏗️ Quality Gates Architecture

```
┌─────────────────── WORKFLOW OPERATIONS ─────────────────┐
│                                                          │
│ ┌─────────────────────────────────────────────────────┐  │
│ │              ASD Workflow Operations                │  │
│ │                                                     │  │
│ │  • Task Assignment (WorkflowStateManager)          │  │
│ │  • Task Completion (WorkflowStateManager)          │  │
│ │  • Status Transitions (SpecParser updates)         │  │
│ │  • Agent Routing (TaskRouter)                      │  │
│ │  • Dependency Management                           │  │
│ └─────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │ Pre-operation validation
┌─────────────────── QUALITY GATE MANAGER ───────────────┐
│                      │                                   │
│ ┌─────────────────┴─────────────────────────────────────┐ │
│ │             QualityGateManager                        │ │
│ │                                                       │ │
│ │  • Operation interception & validation               │ │
│ │  • Gate rule orchestration                           │ │
│ │  • Validation result evaluation                      │ │
│ │  • Operation blocking & error reporting              │ │
│ │  • Performance monitoring (<50ms target)            │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                       │
┌─────────────────── GATE HOOKS SYSTEM ───────────────────┐
│                      │                                   │
│ ┌─────────────────┴─────────────────────────────────────┐ │
│ │              WorkflowHookManager                      │ │
│ │                                                       │ │
│ │  • Pre-operation hooks (before execution)            │ │
│ │  • Post-operation hooks (after execution)            │ │
│ │  • Hook registration & management                    │ │
│ │  • Async hook execution                              │ │
│ │  • Hook failure handling                             │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                       │
┌─────────────────── QUALITY GATE RULES ──────────────────┐
│                      │                                   │
│ ┌─────────────────┴──────────┐ ┌─────────────────────────┐ │
│ │   AssignmentGateRules      │ │  TransitionGateRules    │ │
│ │                            │ │                         │ │
│ │ • Agent capability check   │ │ • Status validation     │ │
│ │ • Task readiness check     │ │ • Completion requirements│ │
│ │ • Workload validation      │ │ • Phase progression     │ │
│ │ • Dependency satisfaction  │ │ • Business rules        │ │
│ │ • Resource availability    │ │ • Template compliance   │ │
│ └────────────────────────────┘ └─────────────────────────┘ │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │              CompletionGateRules                    │   │
│ │                                                     │   │
│ │  • Task completion validation                       │   │
│ │  • Deliverable verification                        │   │
│ │  • Quality criteria satisfaction                   │   │
│ │  • Documentation requirements                      │   │
│ │  • Handoff preparation validation                  │   │
│ └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                       │
┌─────────────────── INTEGRATION LAYER ───────────────────┐
│                      │                                   │
│ • WorkflowStateManager: Operation interception          │ │
│ • TaskRouter: Assignment validation integration         │ │
│ • ValidationManager: Rule execution delegation          │ │
│ • SpecParser: State consistency validation              │ │
│ • CLI Commands: Quality gate reporting                  │ │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Core Quality Gate Components

### 1. QualityGateManager (Primary Orchestrator)

```javascript
class QualityGateManager {
  constructor(validationManager, workflowStateManager, taskRouter) {
    this.validationManager = validationManager;
    this.workflowStateManager = workflowStateManager;
    this.taskRouter = taskRouter;

    this.hookManager = new WorkflowHookManager();
    this.gateRules = new Map();
    this.gateResults = new Map(); // Cache recent gate results

    // Performance tracking
    this.performanceTarget = 50; // 50ms for quality gate checks
    this.metrics = {
      gateExecutions: 0,
      averageExecutionTime: 0,
      blockedOperations: 0,
      passedOperations: 0,
    };

    // Initialize gate rules
    this.initializeGateRules();

    // Register workflow hooks
    this.registerWorkflowHooks();
  }

  // Core quality gate methods
  async enforceAssignmentGate(taskId, agentType, options = {}) {
    const startTime = Date.now();
    const gateId = `assignment_${taskId}_${agentType}`;

    try {
      // Get comprehensive context for validation
      const context = await this.buildAssignmentContext(taskId, agentType);

      // Execute assignment gate rules
      const gateRules = this.gateRules.get("assignment") || [];
      const gateResults = await this.executeGateRules(gateRules, {
        operation: "assignment",
        taskId,
        agentType,
        context,
        options,
      });

      const result = this.evaluateGateResults(gateResults, "assignment");

      // Update metrics
      this.updateMetrics("assignment", Date.now() - startTime, result.allowed);

      // Cache result for potential retry
      this.cacheGateResult(gateId, result, 60000); // 1 minute cache

      return {
        ...result,
        gateId,
        executionTime: Date.now() - startTime,
        context,
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Quality gate error: ${error.message}`,
        gateId,
        executionTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async enforceTransitionGate(specId, fromStatus, toStatus, options = {}) {
    const startTime = Date.now();
    const gateId = `transition_${specId}_${fromStatus}_${toStatus}`;

    try {
      // Build transition context
      const context = await this.buildTransitionContext(
        specId,
        fromStatus,
        toStatus
      );

      // Execute transition gate rules
      const gateRules = this.gateRules.get("transition") || [];
      const gateResults = await this.executeGateRules(gateRules, {
        operation: "transition",
        specId,
        fromStatus,
        toStatus,
        context,
        options,
      });

      const result = this.evaluateGateResults(gateResults, "transition");

      // Update metrics
      this.updateMetrics("transition", Date.now() - startTime, result.allowed);

      return {
        ...result,
        gateId,
        executionTime: Date.now() - startTime,
        context,
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Transition gate error: ${error.message}`,
        gateId,
        executionTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async enforceCompletionGate(specId, taskId, options = {}) {
    const startTime = Date.now();
    const gateId = `completion_${specId}_${taskId}`;

    try {
      // Build completion context
      const context = await this.buildCompletionContext(specId, taskId);

      // Execute completion gate rules
      const gateRules = this.gateRules.get("completion") || [];
      const gateResults = await this.executeGateRules(gateRules, {
        operation: "completion",
        specId,
        taskId,
        context,
        options,
      });

      const result = this.evaluateGateResults(gateResults, "completion");

      // Update metrics
      this.updateMetrics("completion", Date.now() - startTime, result.allowed);

      return {
        ...result,
        gateId,
        executionTime: Date.now() - startTime,
        context,
      };
    } catch (error) {
      return {
        allowed: false,
        reason: `Completion gate error: ${error.message}`,
        gateId,
        executionTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  // Gate rule execution
  async executeGateRules(rules, operationData) {
    const results = [];

    // Execute rules in parallel for performance
    const rulePromises = rules.map(async (rule) => {
      const ruleStartTime = Date.now();

      try {
        const result = await rule.validate(operationData);

        return {
          rule: rule.name,
          category: rule.category,
          severity: rule.severity,
          success: result.success || result.errors?.length === 0,
          result,
          executionTime: Date.now() - ruleStartTime,
        };
      } catch (error) {
        return {
          rule: rule.name,
          category: rule.category,
          severity: "error",
          success: false,
          result: {
            success: false,
            errors: [
              {
                code: "GATE_RULE_ERROR",
                message: `Gate rule execution failed: ${error.message}`,
                data: { originalError: error.message },
              },
            ],
            warnings: [],
            info: [],
          },
          executionTime: Date.now() - ruleStartTime,
          error: error.message,
        };
      }
    });

    const ruleResults = await Promise.all(rulePromises);
    return ruleResults;
  }

  evaluateGateResults(gateResults, operation) {
    const evaluation = {
      allowed: true,
      reason: null,
      errors: [],
      warnings: [],
      info: [],
      ruleResults: gateResults,
      summary: {
        total: gateResults.length,
        passed: 0,
        failed: 0,
        errors: 0,
        warnings: 0,
      },
    };

    // Evaluate each rule result
    for (const ruleResult of gateResults) {
      if (ruleResult.success) {
        evaluation.summary.passed++;
      } else {
        evaluation.summary.failed++;

        // Collect errors, warnings, info
        if (ruleResult.result.errors) {
          evaluation.errors.push(...ruleResult.result.errors);
          evaluation.summary.errors += ruleResult.result.errors.length;
        }

        if (ruleResult.result.warnings) {
          evaluation.warnings.push(...ruleResult.result.warnings);
          evaluation.summary.warnings += ruleResult.result.warnings.length;
        }

        if (ruleResult.result.info) {
          evaluation.info.push(...ruleResult.result.info);
        }

        // Block operation if rule failed and is blocking
        if (ruleResult.severity === "error") {
          evaluation.allowed = false;
          if (!evaluation.reason) {
            const primaryError = ruleResult.result.errors?.[0];
            evaluation.reason =
              primaryError?.message ||
              `Quality gate blocked by rule: ${ruleResult.rule}`;
          }
        }
      }
    }

    return evaluation;
  }

  // Context building methods
  async buildAssignmentContext(taskId, agentType) {
    try {
      // Get task and spec data
      const allTasks = await this.taskRouter.getAllTasks();
      const task = allTasks.find((t) => t.id === taskId);

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const spec = await this.validationManager.specParser.getSpecById(
        task.specId
      );

      // Get current assignments
      const currentAssignments =
        await this.workflowStateManager.getCurrentAssignments();

      // Get agent workload information
      const agentWorkload = currentAssignments.agent_workloads[agentType] || {
        current_tasks: 0,
        total_hours: 0,
        assignments: [],
      };

      return {
        task,
        spec,
        agentType,
        currentAssignments,
        agentWorkload,
        project: {
          totalActiveAssignments: currentAssignments.total_active_assignments,
          agentWorkloads: currentAssignments.agent_workloads,
        },
        dependencies: await this.taskRouter.getDependencyChain(taskId),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to build assignment context: ${error.message}`);
    }
  }

  async buildTransitionContext(specId, fromStatus, toStatus) {
    try {
      // Get spec data
      const spec = await this.validationManager.specParser.getSpecById(specId);
      if (!spec) {
        throw new Error(`Spec not found: ${specId}`);
      }

      // Get spec progress
      const specProgress = await this.workflowStateManager.getSpecProgress(
        specId
      );

      // Get project progress for context
      const projectProgress =
        await this.workflowStateManager.getProjectProgress();

      return {
        spec,
        fromStatus,
        toStatus,
        specProgress,
        projectProgress,
        validTransitions: this.getValidStatusTransitions(),
        phaseRequirements: this.getPhaseRequirements(spec.phase),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to build transition context: ${error.message}`);
    }
  }

  async buildCompletionContext(specId, taskId) {
    try {
      // Get task and spec data
      const spec = await this.validationManager.specParser.getSpecById(specId);
      if (!spec) {
        throw new Error(`Spec not found: ${specId}`);
      }

      const task = (spec.tasks || []).find((t) => t.id === taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found in spec ${specId}`);
      }

      // Get current assignment
      const assignments =
        await this.workflowStateManager.getCurrentAssignments();
      const currentAssignment =
        assignments.current_assignments[specId]?.[taskId];

      // Get dependent tasks
      const allTasks = await this.taskRouter.getAllTasks();
      const dependentTasks = allTasks.filter(
        (t) => t.depends_on && t.depends_on.includes(taskId)
      );

      return {
        spec,
        task,
        currentAssignment,
        dependentTasks,
        completionRequirements: this.getCompletionRequirements(task),
        deliverableChecks: this.getDeliverableChecks(task),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to build completion context: ${error.message}`);
    }
  }

  // Workflow integration
  registerWorkflowHooks() {
    // Hook into WorkflowStateManager operations
    this.hookManager.registerPreHook("assignTask", async (data) => {
      const gateResult = await this.enforceAssignmentGate(
        data.taskId,
        data.agentType,
        data.options
      );

      if (!gateResult.allowed) {
        throw new Error(`Assignment blocked: ${gateResult.reason}`);
      }

      return data; // Allow operation to proceed
    });

    this.hookManager.registerPreHook("completeTask", async (data) => {
      const gateResult = await this.enforceCompletionGate(
        data.specId,
        data.taskId,
        data.options
      );

      if (!gateResult.allowed) {
        throw new Error(`Completion blocked: ${gateResult.reason}`);
      }

      return data;
    });

    // Hook into spec status transitions (would require SpecParser integration)
    this.hookManager.registerPreHook("updateSpecStatus", async (data) => {
      const gateResult = await this.enforceTransitionGate(
        data.specId,
        data.fromStatus,
        data.toStatus,
        data.options
      );

      if (!gateResult.allowed) {
        throw new Error(`Status transition blocked: ${gateResult.reason}`);
      }

      return data;
    });
  }

  // Utility methods
  cacheGateResult(gateId, result, ttl) {
    this.gateResults.set(gateId, {
      result,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up expired results
    setTimeout(() => {
      this.gateResults.delete(gateId);
    }, ttl);
  }

  getCachedGateResult(gateId) {
    const cached = this.gateResults.get(gateId);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }
    return null;
  }

  updateMetrics(operation, executionTime, allowed) {
    this.metrics.gateExecutions++;

    // Update average execution time
    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime * (this.metrics.gateExecutions - 1) +
        executionTime) /
      this.metrics.gateExecutions;

    if (allowed) {
      this.metrics.passedOperations++;
    } else {
      this.metrics.blockedOperations++;
    }

    // Performance warning
    if (executionTime > this.performanceTarget) {
      console.warn(
        `Quality gate ${operation} took ${executionTime}ms, exceeding ${this.performanceTarget}ms target`
      );
    }
  }

  getValidStatusTransitions() {
    return {
      backlog: ["active", "cancelled"],
      active: ["done", "backlog"],
      done: [], // Terminal state
      cancelled: ["backlog"], // Can be reactivated
    };
  }

  getPhaseRequirements(phase) {
    return {
      "PHASE-1A": {
        requiredForCompletion: ["all_tasks_complete"],
        blocksTransition: ["incomplete_dependencies"],
      },
      "PHASE-1B": {
        requiredForCompletion: ["all_tasks_complete", "documentation_complete"],
        blocksTransition: ["phase_1a_incomplete"],
      },
    };
  }

  getCompletionRequirements(task) {
    return {
      requiredChecks: [
        "implementation_complete",
        "validation_passed",
        "documentation_updated",
      ],
      optionalChecks: ["performance_validated", "security_reviewed"],
    };
  }

  getDeliverableChecks(task) {
    const deliverables = [];

    if (task.agent_type === "software-architect") {
      deliverables.push(
        "architecture_documented",
        "design_decisions_recorded",
        "technical_specifications_complete"
      );
    }

    if (task.agent_type === "backend-specialist") {
      deliverables.push("code_implemented", "tests_written", "api_documented");
    }

    return deliverables;
  }

  initializeGateRules() {
    // Assignment gate rules
    this.gateRules.set("assignment", [
      new AgentCapabilityGateRule(),
      new TaskReadinessGateRule(),
      new WorkloadValidationGateRule(),
      new DependencyGateRule(),
    ]);

    // Transition gate rules
    this.gateRules.set("transition", [
      new StatusTransitionGateRule(),
      new CompletionRequirementGateRule(),
      new PhaseProgressionGateRule(),
    ]);

    // Completion gate rules
    this.gateRules.set("completion", [
      new DeliverableValidationGateRule(),
      new QualityCriteriaGateRule(),
      new HandoffPreparationGateRule(),
    ]);
  }
}
```

### 2. Quality Gate Rules (Specific Gate Implementations)

```javascript
class QualityGateRule {
  constructor(name, category, severity = "error") {
    this.name = name;
    this.category = category; // 'assignment', 'transition', 'completion'
    this.severity = severity; // 'error', 'warning', 'info'
  }

  async validate(operationData) {
    throw new Error(`Gate rule ${this.name} must implement validate method`);
  }

  // Result helper methods (similar to ValidationRule)
  success(data = {}) {
    return {
      success: true,
      errors: [],
      warnings: [],
      info: [],
      data,
    };
  }

  error(message, code = null, data = {}) {
    return {
      success: false,
      errors: [
        {
          code: code || "GATE_ERROR",
          message,
          data,
          gate: this.name,
        },
      ],
      warnings: [],
      info: [],
      data,
    };
  }
}

// Agent Capability Gate Rule
class AgentCapabilityGateRule extends QualityGateRule {
  constructor() {
    super("agent-capability-check", "assignment", "error");
  }

  async validate(operationData) {
    const { taskId, agentType, context } = operationData;
    const { task, spec } = context;

    // Check basic agent type match
    if (task.agent_type && task.agent_type !== agentType) {
      return this.error(
        `Task requires ${task.agent_type} agent, but attempting to assign to ${agentType}`,
        "AGENT_TYPE_MISMATCH",
        { requiredAgent: task.agent_type, providedAgent: agentType }
      );
    }

    // Check context requirements (integration with TaskRouter)
    const taskContextReqs = task.context_requirements || [];
    if (taskContextReqs.length > 0) {
      // This would integrate with TaskRouter's agent capability validation
      const capabilityCheck = await this.validateAgentCapabilities(
        agentType,
        taskContextReqs
      );

      if (!capabilityCheck.capable) {
        return this.error(
          `Agent ${agentType} lacks required capabilities: ${capabilityCheck.missing.join(
            ", "
          )}`,
          "INSUFFICIENT_CAPABILITIES",
          { missing: capabilityCheck.missing, required: taskContextReqs }
        );
      }
    }

    return this.success();
  }

  async validateAgentCapabilities(agentType, requirements) {
    // This would integrate with the TaskRouter's capability validation
    // For now, simplified implementation
    const agentCapabilities = {
      "software-architect": [
        "system-design",
        "architecture",
        "technical-decisions",
      ],
      "backend-specialist": [
        "api-development",
        "database-design",
        "integration",
      ],
      "cli-specialist": [
        "terminal-interfaces",
        "user-experience",
        "automation",
      ],
    };

    const capabilities = agentCapabilities[agentType] || [];
    const missing = requirements.filter(
      (req) =>
        !capabilities.some((cap) => cap.includes(req) || req.includes(cap))
    );

    return {
      capable: missing.length === 0,
      missing,
      available: capabilities,
    };
  }
}

// Task Readiness Gate Rule
class TaskReadinessGateRule extends QualityGateRule {
  constructor() {
    super("task-readiness-check", "assignment", "error");
  }

  async validate(operationData) {
    const { taskId, context } = operationData;
    const { task, dependencies } = context;

    // Check task status
    if (task.status && task.status !== "ready" && task.status !== "pending") {
      return this.error(
        `Task ${taskId} is not ready for assignment (status: ${task.status})`,
        "TASK_NOT_READY",
        { currentStatus: task.status, taskId }
      );
    }

    // Check dependencies
    if (dependencies && dependencies.blockedBy.length > 0) {
      return this.error(
        `Task ${taskId} is blocked by unmet dependencies: ${dependencies.blockedBy.join(
          ", "
        )}`,
        "DEPENDENCIES_NOT_MET",
        { blockedBy: dependencies.blockedBy, taskId }
      );
    }

    // Check if already assigned
    if (
      context.currentAssignment &&
      context.currentAssignment.status === "in_progress"
    ) {
      return this.error(
        `Task ${taskId} is already assigned to ${context.currentAssignment.assigned_agent}`,
        "TASK_ALREADY_ASSIGNED",
        { currentAgent: context.currentAssignment.assigned_agent, taskId }
      );
    }

    return this.success();
  }
}

// Workload Validation Gate Rule
class WorkloadValidationGateRule extends QualityGateRule {
  constructor() {
    super("workload-validation", "assignment", "warning"); // Warning level
  }

  async validate(operationData) {
    const { agentType, context } = operationData;
    const { task, agentWorkload } = context;

    const maxWorkloadPerAgent = 40; // 40 hours per week
    const taskHours = task.estimated_hours || 2;
    const currentWorkload = agentWorkload.total_hours || 0;
    const projectedWorkload = currentWorkload + taskHours;

    if (projectedWorkload > maxWorkloadPerAgent) {
      return this.error(
        `Assignment would exceed agent capacity: ${projectedWorkload}h > ${maxWorkloadPerAgent}h limit`,
        "WORKLOAD_EXCEEDED",
        {
          currentWorkload,
          taskHours,
          projectedWorkload,
          maxWorkload: maxWorkloadPerAgent,
        }
      );
    }

    if (projectedWorkload > maxWorkloadPerAgent * 0.9) {
      // Warning level for high utilization
      return {
        success: true,
        errors: [],
        warnings: [
          {
            code: "HIGH_WORKLOAD",
            message: `Assignment approaches capacity limit: ${projectedWorkload}h (${maxWorkloadPerAgent}h max)`,
            data: { currentWorkload, taskHours, projectedWorkload },
            gate: this.name,
          },
        ],
        info: [],
        data: { workloadUtilization: projectedWorkload / maxWorkloadPerAgent },
      };
    }

    return this.success();
  }
}

// Status Transition Gate Rule
class StatusTransitionGateRule extends QualityGateRule {
  constructor() {
    super("status-transition-validation", "transition", "error");
  }

  async validate(operationData) {
    const { specId, fromStatus, toStatus, context } = operationData;
    const { validTransitions } = context;

    // Check if transition is valid
    const allowedTransitions = validTransitions[fromStatus] || [];
    if (!allowedTransitions.includes(toStatus)) {
      return this.error(
        `Invalid status transition: ${fromStatus} → ${toStatus}. Allowed transitions: ${allowedTransitions.join(
          ", "
        )}`,
        "INVALID_STATUS_TRANSITION",
        { fromStatus, toStatus, allowedTransitions }
      );
    }

    // Special validations for specific transitions
    if (toStatus === "done") {
      const completionCheck = await this.validateCompletionRequirements(
        context
      );
      if (!completionCheck.valid) {
        return this.error(
          `Cannot transition to 'done': ${completionCheck.reason}`,
          "COMPLETION_REQUIREMENTS_NOT_MET",
          { requirements: completionCheck.missingRequirements }
        );
      }
    }

    return this.success();
  }

  async validateCompletionRequirements(context) {
    const { spec, specProgress } = context;

    // Check if all tasks are complete
    const incompleteTasks = (spec.tasks || []).filter(
      (task) => task.status !== "complete" && task.status !== "done"
    );

    if (incompleteTasks.length > 0) {
      return {
        valid: false,
        reason: `${incompleteTasks.length} tasks not completed`,
        missingRequirements: ["all_tasks_complete"],
        incompleteTasks: incompleteTasks.map((t) => t.id),
      };
    }

    // Check acceptance criteria (if present)
    if (spec.acceptance_criteria && spec.acceptance_criteria.length > 0) {
      // This would require additional validation logic
      return {
        valid: true,
        reason: "All completion requirements satisfied",
      };
    }

    return {
      valid: true,
      reason: "All completion requirements satisfied",
    };
  }
}
```

### 3. WorkflowHookManager (Hook System)

```javascript
class WorkflowHookManager {
  constructor() {
    this.preHooks = new Map(); // operation -> array of hooks
    this.postHooks = new Map(); // operation -> array of hooks
    this.hookMetrics = new Map(); // track hook performance
  }

  // Hook registration
  registerPreHook(operation, hookFunction) {
    if (!this.preHooks.has(operation)) {
      this.preHooks.set(operation, []);
    }
    this.preHooks.get(operation).push(hookFunction);
  }

  registerPostHook(operation, hookFunction) {
    if (!this.postHooks.has(operation)) {
      this.postHooks.set(operation, []);
    }
    this.postHooks.get(operation).push(hookFunction);
  }

  // Hook execution
  async executePreHooks(operation, data) {
    const hooks = this.preHooks.get(operation) || [];

    if (hooks.length === 0) {
      return data; // No hooks to execute
    }

    const startTime = Date.now();
    let currentData = data;

    try {
      for (const hook of hooks) {
        currentData = await hook(currentData);
      }

      this.recordHookMetrics(operation, "pre", Date.now() - startTime, true);
      return currentData;
    } catch (error) {
      this.recordHookMetrics(operation, "pre", Date.now() - startTime, false);
      throw new Error(`Pre-hook failed for ${operation}: ${error.message}`);
    }
  }

  async executePostHooks(operation, data, result) {
    const hooks = this.postHooks.get(operation) || [];

    if (hooks.length === 0) {
      return result; // No hooks to execute
    }

    const startTime = Date.now();
    let currentResult = result;

    try {
      for (const hook of hooks) {
        currentResult = await hook(data, currentResult);
      }

      this.recordHookMetrics(operation, "post", Date.now() - startTime, true);
      return currentResult;
    } catch (error) {
      this.recordHookMetrics(operation, "post", Date.now() - startTime, false);
      // Post-hooks failing shouldn't block the operation
      console.warn(`Post-hook failed for ${operation}: ${error.message}`);
      return result;
    }
  }

  recordHookMetrics(operation, type, executionTime, success) {
    const key = `${operation}_${type}`;
    const existing = this.hookMetrics.get(key) || {
      executions: 0,
      totalTime: 0,
      averageTime: 0,
      failures: 0,
    };

    existing.executions++;
    existing.totalTime += executionTime;
    existing.averageTime = existing.totalTime / existing.executions;

    if (!success) {
      existing.failures++;
    }

    this.hookMetrics.set(key, existing);
  }

  getHookMetrics() {
    return Object.fromEntries(this.hookMetrics);
  }
}
```

## 🔌 Integration with Existing Systems

### WorkflowStateManager Integration

```javascript
// Modified WorkflowStateManager.assignTask method
async assignTask(specId, taskId, agentType, options = {}) {
  const startTime = Date.now();

  try {
    // Execute pre-hooks (including quality gates)
    const hookData = await this.qualityGateManager.hookManager.executePreHooks(
      'assignTask',
      { specId, taskId, agentType, options }
    );

    // Proceed with original assignment logic
    const assignmentResult = await this.originalAssignTask(
      hookData.specId,
      hookData.taskId,
      hookData.agentType,
      hookData.options
    );

    // Execute post-hooks
    await this.qualityGateManager.hookManager.executePostHooks(
      'assignTask',
      hookData,
      assignmentResult
    );

    return assignmentResult;

  } catch (error) {
    if (error.message.includes('Assignment blocked')) {
      // Quality gate blocked the operation
      return {
        success: false,
        error: error.message,
        blocked: true,
        performance: { total: Date.now() - startTime }
      };
    }
    throw error; // Re-throw other errors
  }
}
```

### CLI Integration

```javascript
// New CLI commands for quality gate management
commander
  .command("validate assignment <task-id> <agent-type>")
  .description("Test if task assignment would pass quality gates")
  .action(async (taskId, agentType) => {
    const qualityGateManager = new QualityGateManager(
      validationManager,
      workflowStateManager,
      taskRouter
    );

    const result = await qualityGateManager.enforceAssignmentGate(
      taskId,
      agentType
    );

    console.log(`\n🚦 Assignment Gate Check: ${taskId} → ${agentType}\n`);

    if (result.allowed) {
      console.log("✅ Assignment allowed");
    } else {
      console.log(`❌ Assignment blocked: ${result.reason}`);

      if (result.errors && result.errors.length > 0) {
        console.log("\nErrors:");
        result.errors.forEach((error) => {
          console.log(`  • ${error.message}`);
        });
      }

      if (result.warnings && result.warnings.length > 0) {
        console.log("\nWarnings:");
        result.warnings.forEach((warning) => {
          console.log(`  ⚠️  ${warning.message}`);
        });
      }
    }

    console.log(`\nExecution time: ${result.executionTime}ms`);
  });

commander
  .command("quality-gates status")
  .description("Show quality gate metrics and status")
  .action(async () => {
    const metrics = qualityGateManager.metrics;
    const hookMetrics = qualityGateManager.hookManager.getHookMetrics();

    console.log("\n📊 Quality Gate Metrics\n");
    console.log(`Gate Executions: ${metrics.gateExecutions}`);
    console.log(
      `Average Execution Time: ${metrics.averageExecutionTime.toFixed(2)}ms`
    );
    console.log(`Operations Passed: ${metrics.passedOperations}`);
    console.log(`Operations Blocked: ${metrics.blockedOperations}`);
    console.log(
      `Block Rate: ${(
        (metrics.blockedOperations / metrics.gateExecutions) *
        100
      ).toFixed(1)}%`
    );

    if (Object.keys(hookMetrics).length > 0) {
      console.log("\n🪝 Hook Metrics\n");
      for (const [hook, stats] of Object.entries(hookMetrics)) {
        console.log(
          `${hook}: ${stats.executions} executions, ${stats.averageTime.toFixed(
            2
          )}ms avg`
        );
      }
    }
  });
```

This quality gates integration provides comprehensive validation checkpoints that ensure workflow operations maintain system consistency and prevent invalid state transitions while integrating seamlessly with existing ASD systems.
