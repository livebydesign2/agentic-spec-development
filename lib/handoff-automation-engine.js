const fs = require("fs").promises;
const path = require("path");
const WorkflowStateManager = require("./workflow-state-manager");
const ContextInjector = require("./context-injector");
const { TaskRecommendationAPI } = require("./task-router");
const ConfigManager = require("./config-manager");

/**
 * HandoffAutomationEngine - Core automation engine for agent handoffs
 *
 * Intelligently detects when tasks complete or agents change, automatically prepares
 * next tasks with context injection, integrates with task routing for recommendations,
 * and orchestrates seamless agent transitions with state consistency.
 *
 * Features:
 * - Automatic handoff detection when task status changes or agents switch
 * - Next task preparation with context injection for incoming agents
 * - Integration with ContextInjector (FEAT-012) for seamless agent onboarding
 * - Integration with TaskRouter (FEAT-013) for intelligent next task recommendations
 * - Handoff notification system and workflow orchestration
 * - State consistency management during agent transitions
 * - Performance: Handoff operations under 500ms
 */
class HandoffAutomationEngine {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.workflowStateManager = new WorkflowStateManager(this.configManager);
    this.contextInjector = new ContextInjector(this.configManager);
    this.taskRecommendationAPI = new TaskRecommendationAPI(this.configManager);
    
    // Performance tracking
    this.performanceTimeout = 500; // 500ms requirement from spec
    
    // Handoff state tracking
    this.activeHandoffs = new Map();
    this.handoffHistory = [];
    
    // Notification system
    this.notificationHandlers = new Map();
    this.handoffQueue = [];
    
    // State consistency tracking
    this.transitionLocks = new Set();
    
    // Handoff detection patterns
    this.handoffTriggers = {
      TASK_COMPLETED: "task_completed",
      SUBTASK_COMPLETED: "subtask_completed", 
      AGENT_CHANGED: "agent_changed",
      DEPENDENCY_MET: "dependency_met",
      MANUAL_TRIGGER: "manual_trigger"
    };
  }

  /**
   * Initialize the HandoffAutomationEngine
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    const startTime = Date.now();

    try {
      // Initialize all component systems
      await this.workflowStateManager.initialize();
      await this.contextInjector.loadAgentDefinition("software-architect"); // Initialize context system
      await this.taskRecommendationAPI.initialize();

      // Set up handoff detection listeners
      await this.setupHandoffDetection();
      
      // Load existing handoff state
      await this.loadHandoffState();

      const initTime = Date.now() - startTime;
      if (initTime > 100) {
        console.warn(`HandoffAutomationEngine initialization took ${initTime}ms`);
      }

      return true;
    } catch (error) {
      throw new Error(`HandoffAutomationEngine initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute automatic handoff when task completes or agent changes
   * @param {Object} trigger - Handoff trigger information
   * @param {string} trigger.type - Type of trigger (TASK_COMPLETED, AGENT_CHANGED, etc.)
   * @param {string} trigger.specId - Specification ID
   * @param {string} trigger.taskId - Task ID that triggered handoff
   * @param {string} [trigger.fromAgent] - Agent handing off work
   * @param {string} [trigger.toAgent] - Agent receiving work
   * @param {Object} [trigger.context] - Additional trigger context
   * @returns {Promise<Object>} Handoff execution result
   */
  async executeHandoff(trigger) {
    const startTime = Date.now();
    const handoffId = `${trigger.specId}-${trigger.taskId}-${Date.now()}`;

    try {
      // Validate trigger
      if (!this.isValidTrigger(trigger)) {
        return {
          success: false,
          error: "Invalid handoff trigger",
          handoffId,
          performance: { total: Date.now() - startTime }
        };
      }

      // Check for transition lock to prevent concurrent handoffs
      const lockKey = `${trigger.specId}-${trigger.taskId}`;
      if (this.transitionLocks.has(lockKey)) {
        return {
          success: false,
          error: "Handoff already in progress for this task",
          handoffId,
          performance: { total: Date.now() - startTime }
        };
      }

      // Acquire transition lock
      this.transitionLocks.add(lockKey);

      const handoff = {
        id: handoffId,
        trigger,
        startedAt: new Date().toISOString(),
        status: "executing",
        steps: [],
        performance: {}
      };

      this.activeHandoffs.set(handoffId, handoff);

      // STEP 1: Detect and validate handoff opportunity
      const detectionStart = Date.now();
      const handoffOpportunity = await this.detectHandoffOpportunity(trigger);
      handoff.performance.detection = Date.now() - detectionStart;
      handoff.steps.push({ step: "detection", status: "completed", opportunity: handoffOpportunity });

      if (!handoffOpportunity.isValidHandoff) {
        this.transitionLocks.delete(lockKey);
        handoff.status = "no_handoff_needed";
        handoff.completedAt = new Date().toISOString();
        
        return {
          success: true,
          handoffNeeded: false,
          reason: handoffOpportunity.reason,
          handoffId,
          performance: { total: Date.now() - startTime }
        };
      }

      // STEP 2: Determine next agent and task using TaskRouter integration
      const routingStart = Date.now();
      const nextAssignment = await this.determineNextAssignment(trigger, handoffOpportunity);
      handoff.performance.routing = Date.now() - routingStart;
      handoff.steps.push({ step: "routing", status: "completed", assignment: nextAssignment });

      if (!nextAssignment.nextTask) {
        this.transitionLocks.delete(lockKey);
        handoff.status = "no_next_task";
        handoff.completedAt = new Date().toISOString();

        return {
          success: true,
          handoffNeeded: false,
          reason: "No suitable next task available",
          handoffId,
          performance: { total: Date.now() - startTime }
        };
      }

      // STEP 3: Prepare context for incoming agent using ContextInjector
      const contextStart = Date.now();
      const handoffContext = await this.prepareHandoffContext(nextAssignment);
      handoff.performance.context = Date.now() - contextStart;
      handoff.steps.push({ step: "context_preparation", status: "completed", context: handoffContext });

      // STEP 4: Execute state transition with consistency management
      const transitionStart = Date.now();
      const stateTransition = await this.executeStateTransition(trigger, nextAssignment, handoffContext);
      handoff.performance.transition = Date.now() - transitionStart;
      handoff.steps.push({ step: "state_transition", status: "completed", transition: stateTransition });

      // STEP 5: Send handoff notifications
      const notificationStart = Date.now();
      const notifications = await this.sendHandoffNotifications(handoff, nextAssignment, handoffContext);
      handoff.performance.notifications = Date.now() - notificationStart;
      handoff.steps.push({ step: "notifications", status: "completed", notifications });

      // STEP 6: Trigger documentation lifecycle events
      try {
        const DocumentationTemplateManager = require("./documentation-template-manager");
        const docManager = new DocumentationTemplateManager(this.configManager);
        await docManager.initialize();
        
        // Trigger handoff completion cleanup
        await docManager.handleLifecycleEvent("handoff_complete", {
          fromTask: trigger.taskId,
          toTask: nextAssignment.nextTask,
          specId: trigger.specId,
          fromAgent: trigger.fromAgent,
          toAgent: nextAssignment.nextAgent,
          handoffId: handoffId
        });
      } catch (error) {
        // DocumentationTemplateManager may not be available - that's ok
        console.debug(`Documentation handoff lifecycle event failed: ${error.message}`);
      }

      // Complete handoff
      this.transitionLocks.delete(lockKey);
      handoff.status = "completed";
      handoff.completedAt = new Date().toISOString();
      handoff.performance.total = Date.now() - startTime;

      // Add to history and cleanup active handoff
      this.handoffHistory.push(handoff);
      this.activeHandoffs.delete(handoffId);

      // Performance check
      if (handoff.performance.total > this.performanceTimeout) {
        console.warn(
          `Handoff execution took ${handoff.performance.total}ms, exceeding ${this.performanceTimeout}ms target`
        );
      }

      return {
        success: true,
        handoffNeeded: true,
        handoff,
        nextTask: nextAssignment.nextTask,
        nextAgent: nextAssignment.nextAgent,
        context: handoffContext,
        performance: handoff.performance
      };

    } catch (error) {
      // Cleanup on error
      const lockKey = `${trigger.specId}-${trigger.taskId}`;
      this.transitionLocks.delete(lockKey);
      
      if (this.activeHandoffs.has(handoffId)) {
        const handoff = this.activeHandoffs.get(handoffId);
        handoff.status = "failed";
        handoff.error = error.message;
        handoff.completedAt = new Date().toISOString();
        handoff.performance.total = Date.now() - startTime;
        this.handoffHistory.push(handoff);
        this.activeHandoffs.delete(handoffId);
      }

      return {
        success: false,
        error: `Handoff execution failed: ${error.message}`,
        handoffId,
        performance: { total: Date.now() - startTime }
      };
    }
  }

  /**
   * Detect handoff opportunity when tasks complete or conditions change
   * @param {Object} trigger - Handoff trigger
   * @returns {Promise<Object>} Handoff opportunity analysis
   */
  async detectHandoffOpportunity(trigger) {
    const analysis = {
      isValidHandoff: false,
      reason: null,
      confidence: 0,
      handoffType: null,
      nextTaskCandidates: [],
      blockers: []
    };

    try {
      // Check trigger-specific handoff conditions
      switch (trigger.type) {
        case this.handoffTriggers.TASK_COMPLETED:
          return await this.detectTaskCompletionHandoff(trigger, analysis);
          
        case this.handoffTriggers.SUBTASK_COMPLETED:
          return await this.detectSubtaskCompletionHandoff(trigger, analysis);
          
        case this.handoffTriggers.AGENT_CHANGED:
          return await this.detectAgentChangeHandoff(trigger, analysis);
          
        case this.handoffTriggers.DEPENDENCY_MET:
          return await this.detectDependencyMetHandoff(trigger, analysis);
          
        case this.handoffTriggers.MANUAL_TRIGGER:
          return await this.detectManualHandoff(trigger, analysis);
          
        default:
          analysis.reason = `Unknown trigger type: ${trigger.type}`;
          return analysis;
      }
    } catch (error) {
      analysis.reason = `Handoff detection failed: ${error.message}`;
      return analysis;
    }
  }

  /**
   * Detect handoff when a task completes
   * @private
   */
  async detectTaskCompletionHandoff(trigger, analysis) {
    // Use existing WorkflowStateManager handoff detection
    const handoffOpportunity = await this.workflowStateManager.detectHandoffs(
      trigger.specId,
      trigger.taskId
    );

    if (handoffOpportunity) {
      analysis.isValidHandoff = true;
      analysis.reason = `Task ${trigger.taskId} completed, ${handoffOpportunity.nextTask} is now ready`;
      analysis.confidence = 0.9;
      analysis.handoffType = "sequential_task";
      analysis.nextTaskCandidates = [{
        taskId: handoffOpportunity.nextTask,
        agentType: handoffOpportunity.nextAgent,
        reason: handoffOpportunity.reason
      }];
    } else {
      analysis.reason = "No dependent tasks ready for handoff";
    }

    return analysis;
  }

  /**
   * Detect handoff when a subtask completes (may trigger early handoff)
   * @private
   */
  async detectSubtaskCompletionHandoff(trigger, analysis) {
    // Check if subtask completion creates opportunities for parallel work
    // or if it's the final subtask that completes the parent task
    
    const specs = this.workflowStateManager.specParser.getSpecs();
    const spec = specs.find(s => s.id === trigger.specId);
    
    if (!spec || !spec.tasks) {
      analysis.reason = `Spec ${trigger.specId} not found`;
      return analysis;
    }

    const task = spec.tasks.find(t => t.id === trigger.taskId);
    if (!task || !task.subtasks) {
      analysis.reason = `Task ${trigger.taskId} or subtasks not found`;
      return analysis;
    }

    // Check if this was the last subtask
    const completedSubtasks = task.subtasks.filter(st => 
      st.status === "completed" || st.status === "done"
    ).length;

    if (completedSubtasks === task.subtasks.length) {
      // All subtasks complete - trigger task completion handoff
      analysis.isValidHandoff = true;
      analysis.reason = `All subtasks complete in ${trigger.taskId}, ready for task completion handoff`;
      analysis.confidence = 0.8;
      analysis.handoffType = "task_completion";
      
      // Look for next task
      const nextTaskHandoff = await this.detectTaskCompletionHandoff(trigger, { ...analysis });
      if (nextTaskHandoff.isValidHandoff) {
        analysis.nextTaskCandidates = nextTaskHandoff.nextTaskCandidates;
      }
    } else {
      analysis.reason = `Subtask completed but task ${trigger.taskId} still has remaining subtasks`;
    }

    return analysis;
  }

  /**
   * Detect handoff when agent assignment changes
   * @private  
   */
  async detectAgentChangeHandoff(trigger, analysis) {
    if (!trigger.fromAgent || !trigger.toAgent) {
      analysis.reason = "Agent change requires both fromAgent and toAgent";
      return analysis;
    }

    if (trigger.fromAgent === trigger.toAgent) {
      analysis.reason = "No agent change detected";
      return analysis;
    }

    analysis.isValidHandoff = true;
    analysis.reason = `Agent changed from ${trigger.fromAgent} to ${trigger.toAgent}`;
    analysis.confidence = 0.7;
    analysis.handoffType = "agent_transition";
    analysis.nextTaskCandidates = [{
      taskId: trigger.taskId,
      agentType: trigger.toAgent,
      reason: "Continuing same task with new agent"
    }];

    return analysis;
  }

  /**
   * Detect handoff when dependency becomes met
   * @private
   */
  async detectDependencyMetHandoff(trigger, analysis) {
    // Find tasks that were blocked by this dependency
    const specs = this.workflowStateManager.specParser.getSpecs();
    const unblockedTasks = [];

    for (const spec of specs) {
      if (!spec.tasks) continue;
      
      for (const task of spec.tasks) {
        if (task.depends_on && 
            task.depends_on.includes(trigger.taskId) && 
            (task.status === "blocked" || !task.status)) {
          unblockedTasks.push({
            specId: spec.id,
            taskId: task.id,
            agentType: task.agent_type,
            reason: `Dependency ${trigger.taskId} completed`
          });
        }
      }
    }

    if (unblockedTasks.length > 0) {
      analysis.isValidHandoff = true;
      analysis.reason = `Dependencies met, ${unblockedTasks.length} tasks now available`;
      analysis.confidence = 0.8;
      analysis.handoffType = "dependency_resolution";
      analysis.nextTaskCandidates = unblockedTasks;
    } else {
      analysis.reason = "No tasks were unblocked by this dependency";
    }

    return analysis;
  }

  /**
   * Detect manual handoff trigger
   * @private
   */
  async detectManualHandoff(trigger, analysis) {
    // Manual triggers are always valid if they include the necessary information
    if (trigger.context && trigger.context.nextTask) {
      analysis.isValidHandoff = true;
      analysis.reason = "Manual handoff triggered";
      analysis.confidence = 1.0;
      analysis.handoffType = "manual";
      analysis.nextTaskCandidates = [{
        taskId: trigger.context.nextTask,
        agentType: trigger.context.nextAgent || "unspecified",
        reason: "Manual assignment"
      }];
    } else {
      analysis.reason = "Manual handoff requires context.nextTask";
    }

    return analysis;
  }

  /**
   * Determine next agent assignment using TaskRouter integration
   * @param {Object} trigger - Original trigger
   * @param {Object} handoffOpportunity - Detected handoff opportunity
   * @returns {Promise<Object>} Next assignment recommendation
   */
  async determineNextAssignment(trigger, handoffOpportunity) {
    const assignment = {
      nextTask: null,
      nextAgent: null,
      confidence: 0,
      reasoning: null,
      alternatives: []
    };

    try {
      // If handoff opportunity specifies next task directly, use it
      if (handoffOpportunity.nextTaskCandidates && handoffOpportunity.nextTaskCandidates.length > 0) {
        const topCandidate = handoffOpportunity.nextTaskCandidates[0];
        assignment.nextTask = topCandidate.taskId;
        assignment.nextAgent = topCandidate.agentType;
        assignment.reasoning = topCandidate.reason;
        assignment.confidence = handoffOpportunity.confidence;
        assignment.alternatives = handoffOpportunity.nextTaskCandidates.slice(1);
        
        return assignment;
      }

      // Use TaskRouter to find the best next task for available agents
      const availableAgents = await this.getAvailableAgents();
      
      for (const agentType of availableAgents) {
        const recommendation = await this.taskRecommendationAPI.getNextTask({
          agentType,
          includeReasoning: true,
          includeAlternatives: true
        });

        if (recommendation.success && recommendation.task) {
          assignment.nextTask = recommendation.task.id;
          assignment.nextAgent = agentType;
          assignment.confidence = 0.8;
          assignment.reasoning = recommendation.reasoning?.summary || "TaskRouter recommendation";
          assignment.alternatives = (recommendation.alternatives || []).map(alt => ({
            taskId: alt.id,
            agentType: agentType,
            reason: alt.reasoning || "Alternative recommendation"
          }));
          
          break; // Use first good recommendation
        }
      }

      if (!assignment.nextTask) {
        assignment.reasoning = "No suitable next task found by TaskRouter";
      }

      return assignment;
    } catch (error) {
      assignment.reasoning = `Next assignment determination failed: ${error.message}`;
      return assignment;
    }
  }

  /**
   * Prepare handoff context using ContextInjector integration
   * @param {Object} nextAssignment - Next task assignment
   * @returns {Promise<Object>} Prepared handoff context
   */
  async prepareHandoffContext(nextAssignment) {
    const contextPreparation = {
      success: false,
      context: null,
      performance: {},
      error: null
    };

    try {
      const contextStart = Date.now();

      // Extract spec and task IDs from next task
      const specs = this.workflowStateManager.specParser.getSpecs();
      let specId = null;
      let taskId = nextAssignment.nextTask;

      // Find which spec contains the next task
      for (const spec of specs) {
        if (spec.tasks && spec.tasks.some(t => t.id === taskId)) {
          specId = spec.id;
          break;
        }
      }

      if (!specId) {
        contextPreparation.error = `Could not find spec for task ${taskId}`;
        return contextPreparation;
      }

      // Use ContextInjector to prepare comprehensive context
      const injectedContext = await this.contextInjector.injectContext({
        agentType: nextAssignment.nextAgent,
        specId: specId,
        taskId: taskId,
        useCache: false // Fresh context for handoffs
      });

      // Add handoff-specific context
      const handoffSpecificContext = {
        handoff: {
          previousTask: null, // Will be set by caller if available
          handoffReason: nextAssignment.reasoning,
          handoffTimestamp: new Date().toISOString(),
          confidence: nextAssignment.confidence
        },
        assignment: {
          taskId: taskId,
          specId: specId,
          agentType: nextAssignment.nextAgent,
          alternatives: nextAssignment.alternatives
        },
        workflow: {
          phase: "agent_handoff",
          readyForWork: true,
          contextPrepared: true
        }
      };

      contextPreparation.success = true;
      contextPreparation.context = {
        ...injectedContext,
        handoffContext: handoffSpecificContext
      };
      contextPreparation.performance.total = Date.now() - contextStart;

      return contextPreparation;
    } catch (error) {
      contextPreparation.error = `Context preparation failed: ${error.message}`;
      contextPreparation.performance.total = Date.now() - (contextPreparation.performance.start || Date.now());
      return contextPreparation;
    }
  }

  /**
   * Execute state transition with consistency management
   * @param {Object} trigger - Original trigger
   * @param {Object} nextAssignment - Next assignment
   * @param {Object} handoffContext - Prepared context
   * @returns {Promise<Object>} State transition result
   */
  async executeStateTransition(trigger, nextAssignment, handoffContext) {
    const transition = {
      success: false,
      changes: [],
      error: null
    };

    try {
      // Update workflow state for completed task (if applicable)
      if (trigger.type === this.handoffTriggers.TASK_COMPLETED) {
        const completionResult = await this.workflowStateManager.completeTask(
          trigger.specId,
          trigger.taskId,
          { notes: "Task completed, handoff executed" }
        );
        
        if (completionResult.success) {
          transition.changes.push({
            type: "task_completion",
            specId: trigger.specId,
            taskId: trigger.taskId,
            result: completionResult
          });
        }
      }

      // Assign next task to new agent
      if (nextAssignment.nextTask && nextAssignment.nextAgent) {
        // Find spec ID for next task
        const specs = this.workflowStateManager.specParser.getSpecs();
        let nextSpecId = null;
        
        for (const spec of specs) {
          if (spec.tasks && spec.tasks.some(t => t.id === nextAssignment.nextTask)) {
            nextSpecId = spec.id;
            break;
          }
        }

        if (nextSpecId) {
          const assignmentResult = await this.workflowStateManager.assignTask(
            nextSpecId,
            nextAssignment.nextTask,
            nextAssignment.nextAgent,
            {
              priority: "P1", // Handoff tasks get elevated priority
              assignedBy: "handoff_automation",
              handoffContext: true
            }
          );

          if (assignmentResult.success) {
            transition.changes.push({
              type: "task_assignment",
              specId: nextSpecId,
              taskId: nextAssignment.nextTask,
              agentType: nextAssignment.nextAgent,
              result: assignmentResult
            });
          }
        }
      }

      // Update project progress
      await this.workflowStateManager.updateProjectProgress();
      transition.changes.push({
        type: "progress_update",
        timestamp: new Date().toISOString()
      });

      transition.success = true;
      return transition;

    } catch (error) {
      transition.error = `State transition failed: ${error.message}`;
      return transition;
    }
  }

  /**
   * Send handoff notifications to relevant agents and systems
   * @param {Object} handoff - Handoff execution details
   * @param {Object} nextAssignment - Next assignment details
   * @param {Object} handoffContext - Prepared context
   * @returns {Promise<Object>} Notification results
   */
  async sendHandoffNotifications(handoff, nextAssignment, handoffContext) {
    const notifications = {
      sent: [],
      failed: [],
      total: 0
    };

    try {
      // Prepare notification data
      const notificationData = {
        handoffId: handoff.id,
        timestamp: new Date().toISOString(),
        fromTask: handoff.trigger.taskId,
        toTask: nextAssignment.nextTask,
        fromAgent: handoff.trigger.fromAgent,
        toAgent: nextAssignment.nextAgent,
        context: handoffContext.context,
        reasoning: nextAssignment.reasoning
      };

      // Send notification to incoming agent
      if (nextAssignment.nextAgent) {
        try {
          await this.sendAgentNotification(nextAssignment.nextAgent, "HANDOFF_RECEIVED", notificationData);
          notifications.sent.push({
            recipient: nextAssignment.nextAgent,
            type: "HANDOFF_RECEIVED",
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          notifications.failed.push({
            recipient: nextAssignment.nextAgent,
            type: "HANDOFF_RECEIVED",
            error: error.message
          });
        }
      }

      // Send notification to outgoing agent (if different)
      if (handoff.trigger.fromAgent && handoff.trigger.fromAgent !== nextAssignment.nextAgent) {
        try {
          await this.sendAgentNotification(handoff.trigger.fromAgent, "HANDOFF_COMPLETED", notificationData);
          notifications.sent.push({
            recipient: handoff.trigger.fromAgent,
            type: "HANDOFF_COMPLETED",
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          notifications.failed.push({
            recipient: handoff.trigger.fromAgent,
            type: "HANDOFF_COMPLETED",
            error: error.message
          });
        }
      }

      // Send system notification to workflow managers
      try {
        await this.sendSystemNotification("HANDOFF_EXECUTED", notificationData);
        notifications.sent.push({
          recipient: "system",
          type: "HANDOFF_EXECUTED",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        notifications.failed.push({
          recipient: "system",
          type: "HANDOFF_EXECUTED",
          error: error.message
        });
      }

      notifications.total = notifications.sent.length + notifications.failed.length;
      return notifications;

    } catch (error) {
      notifications.failed.push({
        recipient: "notification_system",
        error: `Notification system failed: ${error.message}`
      });
      notifications.total = notifications.failed.length;
      return notifications;
    }
  }

  /**
   * Get current handoff status across all active workflows
   * @returns {Promise<Object>} Comprehensive handoff status
   */
  async getHandoffStatus() {
    try {
      const status = {
        active: Array.from(this.activeHandoffs.values()),
        queue: [...this.handoffQueue],
        recentHistory: this.handoffHistory.slice(-10),
        statistics: {
          totalHandoffs: this.handoffHistory.length,
          successfulHandoffs: this.handoffHistory.filter(h => h.status === "completed").length,
          failedHandoffs: this.handoffHistory.filter(h => h.status === "failed").length,
          averageHandoffTime: this.calculateAverageHandoffTime(),
          activeTransitions: this.transitionLocks.size
        },
        systemHealth: await this.checkSystemHealth()
      };

      return status;
    } catch (error) {
      throw new Error(`Failed to get handoff status: ${error.message}`);
    }
  }

  /**
   * Register notification handler for specific handoff events
   * @param {string} eventType - Type of handoff event
   * @param {Function} handler - Handler function
   */
  registerNotificationHandler(eventType, handler) {
    if (!this.notificationHandlers.has(eventType)) {
      this.notificationHandlers.set(eventType, []);
    }
    this.notificationHandlers.get(eventType).push(handler);
  }

  /**
   * Trigger manual handoff for specific task
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {string} toAgent - Target agent type
   * @param {Object} options - Additional handoff options
   * @returns {Promise<Object>} Manual handoff result
   */
  async triggerManualHandoff(specId, taskId, toAgent, options = {}) {
    const trigger = {
      type: this.handoffTriggers.MANUAL_TRIGGER,
      specId,
      taskId,
      fromAgent: options.fromAgent,
      toAgent,
      context: {
        nextTask: options.nextTask || taskId,
        nextAgent: toAgent,
        reason: options.reason || "Manual handoff triggered",
        ...options.context
      }
    };

    return await this.executeHandoff(trigger);
  }

  // Private helper methods

  /**
   * Setup handoff detection system
   * @private
   */
  async setupHandoffDetection() {
    // Note: In a real implementation, this would set up event listeners
    // or polling mechanisms to detect when tasks complete or change.
    // For this demo, handoffs are triggered explicitly via executeHandoff.
    
    console.debug("Handoff detection system initialized");
  }

  /**
   * Load existing handoff state
   * @private
   */
  async loadHandoffState() {
    try {
      const stateDir = path.join(this.configManager.getProjectRoot(), ".asd", "state");
      const handoffStatePath = path.join(stateDir, "handoff-automation.json");

      try {
        const content = await fs.readFile(handoffStatePath, "utf-8");
        const state = JSON.parse(content);
        
        this.handoffHistory = state.history || [];
        // Note: activeHandoffs are not persisted as they should complete quickly
      } catch (error) {
        // File doesn't exist or is corrupted - start fresh
        console.debug("No existing handoff state found, starting fresh");
      }
    } catch (error) {
      console.warn(`Failed to load handoff state: ${error.message}`);
    }
  }

  /**
   * Save handoff state
   * @private
   */
  async saveHandoffState() {
    try {
      const stateDir = path.join(this.configManager.getProjectRoot(), ".asd", "state");
      await fs.mkdir(stateDir, { recursive: true });
      
      const handoffStatePath = path.join(stateDir, "handoff-automation.json");
      const state = {
        history: this.handoffHistory,
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(handoffStatePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.warn(`Failed to save handoff state: ${error.message}`);
    }
  }

  /**
   * Validate handoff trigger
   * @private
   */
  isValidTrigger(trigger) {
    if (!trigger || !trigger.type || !trigger.specId || !trigger.taskId) {
      return false;
    }

    if (!Object.values(this.handoffTriggers).includes(trigger.type)) {
      return false;
    }

    return true;
  }

  /**
   * Get available agents for assignment
   * @private
   */
  async getAvailableAgents() {
    // Return list of available agent types
    // In a real implementation, this would check agent availability and capacity
    return [
      "software-architect",
      "backend-developer", 
      "cli-specialist",
      "testing-specialist",
      "documentation-specialist"
    ];
  }

  /**
   * Send notification to specific agent
   * @private
   */
  async sendAgentNotification(agentType, eventType, data) {
    // In a real implementation, this would send notifications through
    // appropriate channels (CLI output, files, webhooks, etc.)
    
    const handlers = this.notificationHandlers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(agentType, data);
      } catch (error) {
        console.warn(`Notification handler failed: ${error.message}`);
      }
    }

    console.log(`[HANDOFF] ${eventType} notification sent to ${agentType}`);
  }

  /**
   * Send system notification
   * @private
   */
  async sendSystemNotification(eventType, data) {
    const handlers = this.notificationHandlers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        await handler("system", data);
      } catch (error) {
        console.warn(`System notification handler failed: ${error.message}`);
      }
    }

    console.log(`[HANDOFF] ${eventType} system notification sent`);
  }

  /**
   * Calculate average handoff time
   * @private
   */
  calculateAverageHandoffTime() {
    const completedHandoffs = this.handoffHistory.filter(h => 
      h.status === "completed" && h.performance?.total
    );

    if (completedHandoffs.length === 0) return 0;

    const totalTime = completedHandoffs.reduce((sum, h) => sum + h.performance.total, 0);
    return Math.round(totalTime / completedHandoffs.length);
  }

  /**
   * Check system health for handoff operations
   * @private
   */
  async checkSystemHealth() {
    try {
      const health = {
        workflowStateManager: true,
        contextInjector: true,
        taskRecommendationAPI: true,
        handoffEngine: true,
        issues: []
      };

      // Check WorkflowStateManager
      try {
        await this.workflowStateManager.getCurrentAssignments();
      } catch (error) {
        health.workflowStateManager = false;
        health.issues.push(`WorkflowStateManager: ${error.message}`);
      }

      // Check TaskRecommendationAPI
      try {
        const status = await this.taskRecommendationAPI.getSystemStatus();
        if (!status.healthy) {
          health.taskRecommendationAPI = false;
          health.issues.push(`TaskRecommendationAPI: ${status.error || "Unhealthy"}`);
        }
      } catch (error) {
        health.taskRecommendationAPI = false;
        health.issues.push(`TaskRecommendationAPI: ${error.message}`);
      }

      // Check for excessive active transitions
      if (this.transitionLocks.size > 5) {
        health.handoffEngine = false;
        health.issues.push(`Too many active transitions: ${this.transitionLocks.size}`);
      }

      health.overall = health.workflowStateManager && 
                     health.contextInjector && 
                     health.taskRecommendationAPI && 
                     health.handoffEngine;

      return health;
    } catch (error) {
      return {
        overall: false,
        error: error.message
      };
    }
  }
}

module.exports = HandoffAutomationEngine;