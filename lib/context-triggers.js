const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const ContextManager = require('./context-manager');
const ContextValidator = require('./context-validator');

/**
 * Context Update Trigger System
 * Automatically updates context files based on task lifecycle events
 * and CLI command triggers
 */
class ContextTriggerSystem extends EventEmitter {
  constructor(configManager) {
    super();
    this.configManager = configManager;
    this.contextManager = new ContextManager(configManager);
    this.contextValidator = new ContextValidator(configManager);
    this.triggers = new Map();
    this.initialized = false;

    this.setupDefaultTriggers();
  }

  /**
   * Initialize the trigger system
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      // Load trigger configuration
      await this.loadTriggerConfiguration();

      // Initialize context structure if needed
      await this.contextManager.initializeContextStructure();

      this.initialized = true;
      this.emit('initialized');

      return true;
    } catch (error) {
      console.error(
        `Failed to initialize context trigger system: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Setup default triggers based on update_triggers configuration
   */
  setupDefaultTriggers() {
    // Task lifecycle triggers
    this.registerTrigger('task_start', async (data) => {
      await this.handleTaskStart(data);
    });

    this.registerTrigger('task_progress', async (data) => {
      await this.handleTaskProgress(data);
    });

    this.registerTrigger('task_complete', async (data) => {
      await this.handleTaskComplete(data);
    });

    // CLI command triggers
    this.registerTrigger('context_add', async (data) => {
      await this.handleContextAdd(data);
    });

    this.registerTrigger('assign', async (data) => {
      await this.handleAssignment(data);
    });

    this.registerTrigger('complete', async (data) => {
      await this.handleCompletion(data);
    });

    this.registerTrigger('research', async (data) => {
      await this.handleResearch(data);
    });

    // System triggers
    this.registerTrigger('context_validate', async (data) => {
      await this.handleValidation(data);
    });
  }

  /**
   * Load trigger configuration from context-config.json
   */
  async loadTriggerConfiguration() {
    try {
      const projectRoot = this.configManager.getProjectRoot();
      const configPath = path.join(
        projectRoot,
        '.asd',
        'config',
        'context-config.json'
      );

      if (await this.fileExists(configPath)) {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);

        this.triggerConfig = config.update_triggers || {};
      } else {
        // Use default configuration
        this.triggerConfig = {
          task_lifecycle: {
            task_start: ['create_task_context', 'update_agent_assignment'],
            task_progress: ['update_task_context', 'log_progress'],
            task_complete: [
              'finalize_task_context',
              'update_spec_context',
              'trigger_handoff',
            ],
          },
          cli_commands: {
            asd_context_add: ['append_to_context'],
            asd_assign: ['update_assignments'],
            asd_complete: ['update_completion_status'],
            asd_research: ['capture_research_findings'],
          },
        };
      }
    } catch (error) {
      console.warn(`Failed to load trigger configuration: ${error.message}`);
      this.triggerConfig = {};
    }
  }

  /**
   * Register a trigger handler
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Handler function
   */
  registerTrigger(eventName, handler) {
    this.triggers.set(eventName, handler);
  }

  /**
   * Fire a trigger
   * @param {string} eventName - Name of the event
   * @param {Object} data - Event data
   * @returns {Promise<boolean>} Success status
   */
  async fireTrigger(eventName, data = {}) {
    try {
      const handler = this.triggers.get(eventName);
      if (handler) {
        await handler(data);
        this.emit('trigger_fired', { eventName, data });
        return true;
      } else {
        console.warn(`No trigger handler found for event: ${eventName}`);
        return false;
      }
    } catch (error) {
      console.error(`Trigger ${eventName} failed: ${error.message}`);
      this.emit('trigger_error', { eventName, data, error });
      return false;
    }
  }

  /**
   * Handle task start event
   * @param {Object} data - Task start data
   */
  async handleTaskStart(data) {
    const { specId, taskId, agentType, priority } = data;

    if (!specId || !taskId) {
      throw new Error('Task start requires specId and taskId');
    }

    // Create/update task context
    const taskContext = {
      frontmatter: {
        context_type: 'task',
        task_id: taskId,
        spec_id: specId,
        task_title: data.title || taskId,
        assigned_agent: agentType,
        status: 'in_progress',
        priority: priority || 'P2',
        started: new Date().toISOString(),
        progress: {
          subtasks_completed: 0,
          subtasks_total: data.subtasksTotal || 0,
          percentage: 0,
        },
      },
      content: `# Task Context: ${taskId}\n\n## Implementation Notes\n\n*Task started ${new Date().toLocaleString()}*\n\n## Research Findings\n\n## Decisions Made\n\n## Next Steps\n`,
    };

    await this.contextManager.updateContext('task', taskId, taskContext);

    // Update agent assignment tracking
    await this.updateAssignmentTracking(
      specId,
      taskId,
      agentType,
      'in_progress'
    );

    // Log the start
    console.log(
      `🔄 Context trigger: Task ${taskId} started for agent ${agentType}`
    );
  }

  /**
   * Handle task progress update
   * @param {Object} data - Task progress data
   */
  async handleTaskProgress(data) {
    const { specId, taskId, progress, notes, blockers, decisions } = data;

    if (!taskId) {
      throw new Error('Task progress requires taskId');
    }

    const updates = {
      frontmatter: {
        last_updated: new Date().toISOString(),
      },
    };

    if (progress) {
      updates.frontmatter.progress = progress;
    }

    if (notes && notes.length > 0) {
      updates.frontmatter.implementation_notes = notes;
    }

    if (blockers && blockers.length > 0) {
      updates.frontmatter.blockers = blockers;
    }

    if (decisions && decisions.length > 0) {
      updates.frontmatter.decisions_made = decisions;
    }

    await this.contextManager.updateContext('task', taskId, updates);

    // Update progress tracking
    await this.updateProgressTracking(specId, taskId, progress);

    console.log(`📈 Context trigger: Task ${taskId} progress updated`);
  }

  /**
   * Handle task completion
   * @param {Object} data - Task completion data
   */
  async handleTaskComplete(data) {
    const {
      specId,
      taskId,
      agentType,
      completionNotes,
      handoffTo,
      researchFindings,
      decisions,
    } = data;

    if (!specId || !taskId) {
      throw new Error('Task completion requires specId and taskId');
    }

    // Update task context with completion
    const updates = {
      frontmatter: {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: completionNotes || null,
        handoff_to: handoffTo || null,
      },
    };

    if (researchFindings && researchFindings.length > 0) {
      updates.frontmatter.research_findings = researchFindings;
    }

    if (decisions && decisions.length > 0) {
      updates.frontmatter.decisions_made = decisions;
    }

    await this.contextManager.updateContext('task', taskId, updates);

    // Update spec context with task learnings
    await this.rollupTaskContextToSpec(specId, taskId, {
      researchFindings,
      decisions,
      completionNotes,
    });

    // Update assignment and progress tracking
    await this.updateAssignmentTracking(specId, taskId, agentType, 'completed');
    await this.updateProgressTracking(specId, taskId, { status: 'completed' });

    // Trigger handoff if specified
    if (handoffTo) {
      this.emit('handoff_ready', {
        fromTask: taskId,
        toTask: handoffTo,
        specId,
        completedBy: agentType,
      });
    }

    console.log(`✅ Context trigger: Task ${taskId} completed by ${agentType}`);
  }

  /**
   * Handle context addition
   * @param {Object} data - Context addition data
   */
  async handleContextAdd(data) {
    const { contextType, contextId, updates } = data;

    if (!contextType || !updates) {
      throw new Error('Context add requires contextType and updates');
    }

    // Add metadata to updates
    const enhancedUpdates = {
      ...updates,
      frontmatter: {
        ...updates.frontmatter,
        last_updated: new Date().toISOString(),
        updated_by: 'context_trigger_system',
      },
    };

    await this.contextManager.updateContext(
      contextType,
      contextId,
      enhancedUpdates
    );

    console.log(`📝 Context trigger: Added content to ${contextType} context`);
  }

  /**
   * Handle task assignment
   * @param {Object} data - Assignment data
   */
  async handleAssignment(data) {
    const { specId, taskId, agentType, priority } = data;

    if (!specId || !taskId || !agentType) {
      throw new Error('Assignment requires specId, taskId, and agentType');
    }

    // Update task context
    await this.contextManager.updateContext('task', taskId, {
      frontmatter: {
        assigned_agent: agentType,
        assigned_at: new Date().toISOString(),
        status: 'in_progress',
        priority: priority || 'P2',
      },
    });

    // Update assignment tracking
    await this.updateAssignmentTracking(
      specId,
      taskId,
      agentType,
      'in_progress'
    );

    console.log(`👤 Context trigger: Assigned ${taskId} to ${agentType}`);
  }

  /**
   * Handle task completion trigger
   * @param {Object} data - Completion data
   */
  async handleCompletion(data) {
    await this.handleTaskComplete(data);
  }

  /**
   * Handle research capture
   * @param {Object} data - Research data
   */
  async handleResearch(data) {
    const { specId, taskId, finding, source, agentType } = data;

    if (!finding) {
      throw new Error('Research capture requires finding');
    }

    const contextType = taskId ? 'task' : 'spec';
    const contextId = taskId || specId;

    const researchEntry = {
      finding,
      timestamp: new Date().toISOString(),
      source: source || 'manual',
      agent: agentType,
      context: taskId ? `${specId}:${taskId}` : specId,
    };

    await this.contextManager.updateContext(contextType, contextId, {
      frontmatter: {
        research_findings: [researchEntry],
      },
    });

    console.log(
      `🔬 Context trigger: Research captured for ${contextType} ${contextId}`
    );
  }

  /**
   * Handle validation trigger
   * @param {Object} data - Validation data
   */
  async handleValidation(data) {
    const { files } = data;

    let validationResults;

    if (files && files.length > 0) {
      validationResults = await this.contextValidator.validateContextFiles(
        files
      );
    } else {
      // Validate all context files
      const glob = require('glob');
      const projectRoot = this.configManager.getProjectRoot();
      const allContextFiles = glob.sync(path.join(projectRoot, '.asd/**/*.md'));
      validationResults = await this.contextValidator.validateContextFiles(
        allContextFiles
      );
    }

    // Log validation results
    if (validationResults.invalidFiles === 0) {
      console.log(
        `✅ Context validation passed: ${validationResults.validFiles} files valid`
      );
    } else {
      console.warn(
        `⚠️  Context validation issues: ${validationResults.invalidFiles} invalid files`
      );
    }

    this.emit('validation_complete', validationResults);

    return validationResults;
  }

  /**
   * Update assignment tracking in state files
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {string} agentType - Agent type
   * @param {string} status - Assignment status
   */
  async updateAssignmentTracking(specId, taskId, agentType, status) {
    try {
      const paths = this.contextManager.getContextPaths();
      const assignmentsPath = path.join(paths.state, 'assignments.json');

      let assignments = {};

      if (await this.fileExists(assignmentsPath)) {
        const content = await fs.readFile(assignmentsPath, 'utf-8');
        assignments = JSON.parse(content);
      }

      assignments[specId] = assignments[specId] || {};
      assignments[specId][taskId] = {
        agent: agentType,
        assigned_at:
          assignments[specId][taskId]?.assigned_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status,
      };

      // Ensure directory exists
      await fs.mkdir(paths.state, { recursive: true });
      await fs.writeFile(
        assignmentsPath,
        JSON.stringify(assignments, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error(`Failed to update assignment tracking: ${error.message}`);
    }
  }

  /**
   * Update progress tracking in state files
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {Object} progress - Progress data
   */
  async updateProgressTracking(specId, taskId, progress) {
    try {
      const paths = this.contextManager.getContextPaths();
      const progressPath = path.join(paths.state, 'progress.json');

      let progressData = {};

      if (await this.fileExists(progressPath)) {
        const content = await fs.readFile(progressPath, 'utf-8');
        progressData = JSON.parse(content);
      }

      progressData[specId] = progressData[specId] || {};
      progressData[specId][taskId] = {
        ...progressData[specId][taskId],
        ...progress,
        updated_at: new Date().toISOString(),
      };

      // Ensure directory exists
      await fs.mkdir(paths.state, { recursive: true });
      await fs.writeFile(
        progressPath,
        JSON.stringify(progressData, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error(`Failed to update progress tracking: ${error.message}`);
    }
  }

  /**
   * Roll up task context learnings to spec level
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {Object} learnings - Task learnings to roll up
   */
  async rollupTaskContextToSpec(specId, taskId, learnings) {
    try {
      if (!learnings) return;

      const updates = { frontmatter: {} };

      // Roll up research findings
      if (learnings.researchFindings && learnings.researchFindings.length > 0) {
        updates.frontmatter.research_findings = learnings.researchFindings.map(
          (finding) => ({
            ...finding,
            source_task: taskId,
            rolled_up_at: new Date().toISOString(),
          })
        );
      }

      // Roll up implementation decisions
      if (learnings.decisions && learnings.decisions.length > 0) {
        updates.frontmatter.implementation_decisions = learnings.decisions.map(
          (decision) => ({
            ...decision,
            source_task: taskId,
            rolled_up_at: new Date().toISOString(),
          })
        );
      }

      // Add task completion summary
      if (learnings.completionNotes) {
        updates.frontmatter.task_completions = [
          {
            task_id: taskId,
            completed_at: new Date().toISOString(),
            notes: learnings.completionNotes,
          },
        ];
      }

      if (Object.keys(updates.frontmatter).length > 0) {
        await this.contextManager.updateContext('spec', specId, updates);
        console.log(`📈 Rolled up learnings from ${taskId} to spec ${specId}`);
      }
    } catch (error) {
      console.error(
        `Failed to rollup context from task ${taskId} to spec ${specId}: ${error.message}`
      );
    }
  }

  /**
   * Get current system status
   * @returns {Object} System status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      triggersRegistered: this.triggers.size,
      triggerConfig: this.triggerConfig,
    };
  }

  /**
   * Utility method to check if file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} Whether file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = ContextTriggerSystem;
