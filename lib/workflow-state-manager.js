const fs = require('fs').promises;
const path = require('path');
const SpecParser = require('./feature-parser');
const ConfigManager = require('./config-manager');
const FrontmatterSync = require('./frontmatter-sync');

/**
 * WorkflowStateManager - Core state management for ASD workflow tracking
 *
 * Provides real-time task assignment tracking, progress calculation, and handoff detection
 * with persistent JSON state storage for performance under 100ms operations.
 *
 * Features:
 * - Real-time assignment tracking with agent handoff detection
 * - Dynamic state persistence in .asd/state/ directory
 * - Integration with existing task router and context systems
 * - State consistency and recovery mechanisms
 * - Inline spec frontmatter updates (no separate completion documents)
 */
class WorkflowStateManager {
  constructor(configManager = null, specParser = null) {
    this.configManager = configManager || new ConfigManager();
    this.specParser = specParser || new SpecParser(this.configManager);
    this.stateDir = path.join(
      this.configManager.getProjectRoot(),
      '.asd',
      'state'
    );

    // Initialize enhanced frontmatter synchronization
    this.frontmatterSync = new FrontmatterSync(this.configManager);

    // Performance tracking
    this.performanceTimeout = 100; // 100ms requirement from spec

    // State cache for performance
    this.stateCache = new Map();
    this.cacheTimeout = 30000; // 30 second cache for state files

    // File paths for state storage
    this.statePaths = {
      assignments: path.join(this.stateDir, 'assignments.json'),
      progress: path.join(this.stateDir, 'progress.json'),
      handoffs: path.join(this.stateDir, 'handoffs.json'),
      metadata: path.join(this.stateDir, 'metadata.json'),
    };
  }

  /**
   * Initialize the WorkflowStateManager by ensuring state directory structure
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    const startTime = Date.now();

    try {
      // Ensure state directory exists
      await fs.mkdir(this.stateDir, { recursive: true });

      // Initialize state files if they don't exist
      await this.initializeStateFiles();

      // Initialize enhanced frontmatter sync system
      await this.frontmatterSync.initialize();

      // Load specs to cache task data
      await this.specParser.loadSpecs();

      const initTime = Date.now() - startTime;
      if (initTime > 50) {
        console.warn(`WorkflowStateManager initialization took ${initTime}ms`);
      }

      return true;
    } catch (error) {
      throw new Error(
        `WorkflowStateManager initialization failed: ${error.message}`
      );
    }
  }

  /**
   * Initialize state files with default structure if they don't exist
   * @private
   */
  async initializeStateFiles() {
    const defaultStates = {
      assignments: {
        current_assignments: {},
        assignment_history: [],
      },
      progress: {
        overall: {
          total_specs: 0,
          completed_specs: 0,
          active_specs: 0,
          total_tasks: 0,
          completed_tasks: 0,
          completion_percentage: 0,
        },
        by_phase: {},
        by_spec: {},
      },
      handoffs: {
        ready_handoffs: [],
        handoff_history: [],
      },
      metadata: {
        last_updated: new Date().toISOString(),
        version: '1.0.0',
        state_consistency_check: new Date().toISOString(),
      },
    };

    for (const [stateType, defaultState] of Object.entries(defaultStates)) {
      const filePath = this.statePaths[stateType];

      try {
        await fs.access(filePath);
        // File exists, validate it
        const content = await fs.readFile(filePath, 'utf-8');
        JSON.parse(content); // Validate JSON structure
      } catch (error) {
        // File doesn't exist or is corrupted, create with defaults
        await this.atomicWrite(filePath, defaultState);
      }
    }
  }

  /**
   * Assign task to agent with real-time state tracking
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {string} agentType - Agent type
   * @param {Object} options - Additional assignment options
   * @returns {Promise<Object>} Assignment result with state changes
   */
  async assignTask(specId, taskId, agentType, options = {}) {
    const startTime = Date.now();

    try {
      // Load current assignments state
      const assignments = await this.loadState('assignments');

      // Create assignment record
      const assignmentRecord = {
        spec_id: specId,
        task_id: taskId,
        assigned_agent: agentType,
        started_at: new Date().toISOString(),
        priority: options.priority || 'P2',
        estimated_hours: options.estimatedHours || 2,
        status: 'in_progress',
        assigned_by: options.assignedBy || 'system',
      };

      // Update current assignments
      if (!assignments.current_assignments[specId]) {
        assignments.current_assignments[specId] = {};
      }
      assignments.current_assignments[specId][taskId] = assignmentRecord;

      // Add to assignment history
      assignments.assignment_history.push({
        ...assignmentRecord,
        action: 'assigned',
      });

      // Save assignments state
      await this.saveState('assignments', assignments);

      // Update spec frontmatter inline with enhanced sync
      const frontmatterResult = await this.updateSpecFrontmatter(specId, {
        [`tasks.${taskId}.status`]: 'in_progress',
        [`tasks.${taskId}.assigned_agent`]: agentType,
        [`tasks.${taskId}.assigned_at`]: assignmentRecord.started_at,
      });

      if (!frontmatterResult.success) {
        console.warn(
          `Failed to update frontmatter for ${specId}: ${frontmatterResult.error}`
        );
      }

      // Update overall progress
      await this.updateProjectProgress();

      const totalTime = Date.now() - startTime;
      if (totalTime > this.performanceTimeout) {
        console.warn(
          `Task assignment took ${totalTime}ms, exceeding ${this.performanceTimeout}ms target`
        );
      }

      return {
        success: true,
        assignment: assignmentRecord,
        performance: { total: totalTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Task assignment failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Complete task and detect handoff opportunities
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {Object} options - Completion options including notes and handoff info
   * @returns {Promise<Object>} Completion result with handoff detection
   */
  async completeTask(specId, taskId, options = {}) {
    const startTime = Date.now();

    try {
      // Load current state
      const assignments = await this.loadState('assignments');
      const progress = await this.loadState('progress');
      const handoffs = await this.loadState('handoffs');

      // Get current assignment
      const currentAssignment =
        assignments.current_assignments[specId]?.[taskId];
      if (!currentAssignment) {
        throw new Error(`No active assignment found for ${specId}:${taskId}`);
      }

      // Create completion record
      const completionRecord = {
        ...currentAssignment,
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: options.notes || null,
        duration_hours: this.calculateDuration(currentAssignment.started_at),
      };

      // Update assignments
      assignments.current_assignments[specId][taskId] = completionRecord;
      assignments.assignment_history.push({
        ...completionRecord,
        action: 'completed',
      });

      // Update progress tracking
      if (!progress.by_spec[specId]) {
        progress.by_spec[specId] = {
          total_tasks: 0,
          completed_tasks: 0,
          completion_percentage: 0,
        };
      }
      progress.by_spec[specId].completed_tasks += 1;
      progress.by_spec[specId].completion_percentage =
        (progress.by_spec[specId].completed_tasks /
          progress.by_spec[specId].total_tasks) *
        100;

      // Detect handoff opportunities
      const handoffOpportunity = await this.detectHandoffs(specId, taskId);
      if (handoffOpportunity) {
        handoffs.ready_handoffs.push({
          from_task: taskId,
          to_task: handoffOpportunity.nextTask,
          spec_id: specId,
          next_agent: handoffOpportunity.nextAgent,
          ready_at: new Date().toISOString(),
          context_prepared: true,
          handoff_reason: handoffOpportunity.reason,
        });
      }

      // Save all state changes atomically
      await Promise.all([
        this.saveState('assignments', assignments),
        this.saveState('progress', progress),
        this.saveState('handoffs', handoffs),
      ]);

      // Update spec frontmatter inline with enhanced sync
      const frontmatterResult = await this.updateSpecFrontmatter(specId, {
        [`tasks.${taskId}.status`]: 'completed',
        [`tasks.${taskId}.completed_at`]: completionRecord.completed_at,
        [`tasks.${taskId}.completion_notes`]: options.notes,
      });

      if (!frontmatterResult.success) {
        console.warn(
          `Failed to update frontmatter for ${specId}: ${frontmatterResult.error}`
        );
      }

      // Update overall progress
      await this.updateProjectProgress();

      // Trigger documentation lifecycle events if DocumentationTemplateManager is available
      try {
        const DocumentationTemplateManager = require('./documentation-template-manager');
        const docManager = new DocumentationTemplateManager(this.configManager);
        await docManager.initialize();

        // Trigger task completion cleanup
        await docManager.handleLifecycleEvent('task_completed', {
          taskId: taskId,
          specId: specId,
          completedAt: completionRecord.completed_at
        });
      } catch (error) {
        // DocumentationTemplateManager may not be available - that's ok
        console.debug(`Documentation lifecycle event failed: ${error.message}`);
      }

      const totalTime = Date.now() - startTime;
      if (totalTime > this.performanceTimeout) {
        console.warn(
          `Task completion took ${totalTime}ms, exceeding ${this.performanceTimeout}ms target`
        );
      }

      return {
        success: true,
        completion: completionRecord,
        handoff: handoffOpportunity,
        performance: { total: totalTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Task completion failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Complete subtask and update progress
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {string} subtaskId - Subtask ID
   * @param {Object} options - Completion options
   * @returns {Promise<Object>} Subtask completion result
   */
  async completeSubtask(specId, taskId, subtaskId, options = {}) {
    const startTime = Date.now();

    try {
      const progress = await this.loadState('progress');

      // Update subtask progress tracking
      if (!progress.by_spec[specId]) {
        progress.by_spec[specId] = { subtasks: {} };
      }
      if (!progress.by_spec[specId].subtasks[taskId]) {
        progress.by_spec[specId].subtasks[taskId] = { completed: [] };
      }

      progress.by_spec[specId].subtasks[taskId].completed.push({
        subtask_id: subtaskId,
        completed_at: new Date().toISOString(),
        notes: options.notes,
      });

      await this.saveState('progress', progress);

      // Update spec frontmatter for subtask with enhanced sync
      const frontmatterResult = await this.updateSpecFrontmatter(specId, {
        [`tasks.${taskId}.subtasks.${subtaskId}.status`]: 'completed',
        [`tasks.${taskId}.subtasks.${subtaskId}.completed_at`]:
          new Date().toISOString(),
      });

      if (!frontmatterResult.success) {
        console.warn(
          `Failed to update subtask frontmatter for ${specId}: ${frontmatterResult.error}`
        );
      }

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        subtask_completion: {
          spec_id: specId,
          task_id: taskId,
          subtask_id: subtaskId,
          completed_at: new Date().toISOString(),
        },
        performance: { total: totalTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Subtask completion failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Get current assignments across all specs
   * @returns {Promise<Object>} Current assignments with agent workload info
   */
  async getCurrentAssignments() {
    try {
      const assignments = await this.loadState('assignments');
      const currentTime = new Date().toISOString();

      // Calculate agent workloads
      const agentWorkloads = {};
      const assignmentSummary = [];

      for (const [specId, specAssignments] of Object.entries(
        assignments.current_assignments
      )) {
        for (const [taskId, assignment] of Object.entries(specAssignments)) {
          if (assignment.status === 'in_progress') {
            // Track agent workload
            const agent = assignment.assigned_agent;
            if (!agentWorkloads[agent]) {
              agentWorkloads[agent] = {
                current_tasks: 0,
                total_hours: 0,
                assignments: [],
              };
            }

            agentWorkloads[agent].current_tasks += 1;
            agentWorkloads[agent].total_hours +=
              assignment.estimated_hours || 2;
            agentWorkloads[agent].assignments.push({
              spec_id: specId,
              task_id: taskId,
              started_at: assignment.started_at,
              priority: assignment.priority,
            });

            assignmentSummary.push({
              ...assignment,
              spec_id: specId,
              task_id: taskId,
            });
          }
        }
      }

      return {
        current_assignments: assignmentSummary,
        agent_workloads: agentWorkloads,
        total_active_assignments: assignmentSummary.length,
        generated_at: currentTime,
      };
    } catch (error) {
      throw new Error(`Failed to get current assignments: ${error.message}`);
    }
  }

  /**
   * Update task progress with detailed tracking
   * @param {string} specId - Specification ID
   * @param {string} taskId - Task ID
   * @param {Object} progressUpdate - Progress update object
   * @returns {Promise<Object>} Progress update result
   */
  async updateTaskProgress(specId, taskId, progressUpdate) {
    const startTime = Date.now();

    try {
      const progress = await this.loadState('progress');

      // Initialize spec progress if needed
      if (!progress.by_spec[specId]) {
        progress.by_spec[specId] = {
          tasks: {},
          last_updated: new Date().toISOString(),
        };
      }

      // Update task progress
      progress.by_spec[specId].tasks[taskId] = {
        ...progress.by_spec[specId].tasks[taskId],
        ...progressUpdate,
        updated_at: new Date().toISOString(),
      };

      await this.saveState('progress', progress);

      // Update overall progress calculation
      await this.updateProjectProgress();

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        updated_progress: progress.by_spec[specId].tasks[taskId],
        performance: { total: totalTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Progress update failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Calculate and update overall project progress across all specs
   * @returns {Promise<Object>} Updated project progress
   */
  async updateProjectProgress() {
    try {
      const progress = await this.loadState('progress');
      const specs = this.specParser.getSpecs();

      let totalSpecs = 0;
      let completedSpecs = 0;
      let activeSpecs = 0;
      let totalTasks = 0;
      let completedTasks = 0;
      const phaseProgress = {};

      // Calculate progress from loaded specs
      for (const spec of specs) {
        totalSpecs++;

        if (spec.status === 'active') {
          activeSpecs++;
        }

        if (spec.status === 'done' || spec.status === 'completed') {
          completedSpecs++;
        }

        // Count tasks
        if (spec.tasks && Array.isArray(spec.tasks)) {
          totalTasks += spec.tasks.length;

          const completedSpecTasks = spec.tasks.filter(
            (task) => task.status === 'complete' || task.status === 'done'
          ).length;
          completedTasks += completedSpecTasks;
        }

        // Track by phase
        const phase = spec.phase || 'no-phase';
        if (!phaseProgress[phase]) {
          phaseProgress[phase] = {
            specs: 0,
            completed_specs: 0,
            completion_percentage: 0,
          };
        }
        phaseProgress[phase].specs++;
        if (spec.status === 'done' || spec.status === 'completed') {
          phaseProgress[phase].completed_specs++;
        }
      }

      // Calculate phase completion percentages
      for (const phase in phaseProgress) {
        phaseProgress[phase].completion_percentage =
          (phaseProgress[phase].completed_specs / phaseProgress[phase].specs) *
          100;
      }

      // Update overall progress
      progress.overall = {
        total_specs: totalSpecs,
        completed_specs: completedSpecs,
        active_specs: activeSpecs,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_percentage:
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        last_updated: new Date().toISOString(),
      };

      progress.by_phase = phaseProgress;

      await this.saveState('progress', progress);

      return progress.overall;
    } catch (error) {
      throw new Error(`Failed to update project progress: ${error.message}`);
    }
  }

  /**
   * Get comprehensive project progress information
   * @returns {Promise<Object>} Complete progress breakdown
   */
  async getProjectProgress() {
    try {
      const progress = await this.loadState('progress');
      const assignments = await this.loadState('assignments');

      // Add active assignment counts
      let activeAssignments = 0;
      for (const specAssignments of Object.values(
        assignments.current_assignments
      )) {
        for (const assignment of Object.values(specAssignments)) {
          if (assignment.status === 'in_progress') {
            activeAssignments++;
          }
        }
      }

      return {
        ...progress,
        active_assignments: activeAssignments,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get project progress: ${error.message}`);
    }
  }

  /**
   * Get progress for a specific spec
   * @param {string} specId - Specification ID
   * @returns {Promise<Object>} Spec-specific progress information
   */
  async getSpecProgress(specId) {
    try {
      const progress = await this.loadState('progress');
      const assignments = await this.loadState('assignments');

      const specProgress = progress.by_spec[specId] || {
        total_tasks: 0,
        completed_tasks: 0,
        completion_percentage: 0,
      };

      // Add current assignments for this spec
      const specAssignments = assignments.current_assignments[specId] || {};
      const activeAssignments = Object.values(specAssignments).filter(
        (assignment) => assignment.status === 'in_progress'
      );

      return {
        spec_id: specId,
        ...specProgress,
        active_assignments: activeAssignments,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Failed to get spec progress for ${specId}: ${error.message}`
      );
    }
  }

  /**
   * Detect handoff opportunities when tasks complete
   * @param {string} specId - Specification ID
   * @param {string} completedTaskId - ID of completed task
   * @returns {Promise<Object|null>} Handoff opportunity or null
   */
  async detectHandoffs(specId, completedTaskId) {
    try {
      // Reload specs to get fresh data
      await this.specParser.loadSpecs();
      const specs = this.specParser.getSpecs();
      const spec = specs.find((s) => s.id === specId);

      if (!spec || !spec.tasks) {
        console.warn(
          `Spec ${specId} or its tasks not found for handoff detection`
        );
        return null;
      }

      // Find completed task
      const completedTask = spec.tasks.find((t) => t.id === completedTaskId);
      if (!completedTask) {
        console.warn(
          `Completed task ${completedTaskId} not found in spec ${specId}`
        );
        return null;
      }

      // Look for tasks that depend on the completed task
      const dependentTasks = spec.tasks.filter(
        (task) =>
          task.depends_on &&
          Array.isArray(task.depends_on) &&
          task.depends_on.includes(completedTaskId) &&
          (task.status === 'ready' || !task.status)
      );

      if (dependentTasks.length === 0) {
        console.debug(
          `No dependent tasks found for ${completedTaskId} in ${specId}`
        );
        return null;
      }

      // Find the next task to hand off to (first ready dependent)
      const nextTask = dependentTasks[0];

      return {
        nextTask: nextTask.id,
        nextAgent: nextTask.agent_type || 'unspecified',
        reason: `Task ${completedTaskId} completed, ${nextTask.id} is now ready`,
        dependencies_met: true,
        ready_at: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(`Handoff detection failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Prepare context and information for next task in handoff
   * @param {string} specId - Specification ID
   * @param {string} taskId - Next task ID
   * @returns {Promise<Object>} Prepared handoff context
   */
  async prepareNextTask(specId, taskId) {
    try {
      const assignments = await this.loadState('assignments');
      const progress = await this.loadState('progress');

      // Get task dependencies and context - reload specs to ensure fresh data
      await this.specParser.loadSpecs();
      const specs = this.specParser.getSpecs();
      const spec = specs.find((s) => s.id === specId);

      if (!spec || !spec.tasks) {
        throw new Error(`Spec ${specId} or its tasks not found`);
      }

      const task = spec.tasks.find((t) => t.id === taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found in spec ${specId}`);
      }

      // Gather context from completed dependencies
      const dependencyContext = [];
      if (
        task.depends_on &&
        Array.isArray(task.depends_on) &&
        task.depends_on.length > 0
      ) {
        for (const depId of task.depends_on) {
          const depAssignment =
            assignments.current_assignments[specId]?.[depId];
          if (depAssignment && depAssignment.status === 'completed') {
            dependencyContext.push({
              task_id: depId,
              completed_at: depAssignment.completed_at,
              completion_notes: depAssignment.completion_notes,
              assigned_agent: depAssignment.assigned_agent,
            });
          }
        }
      }

      // Prepare handoff package
      const handoffContext = {
        task: {
          id: taskId,
          title: task.title,
          agent_type: task.agent_type,
          estimated_hours: task.estimated_hours,
          context_requirements: task.context_requirements || [],
          subtasks: task.subtasks || [],
        },
        spec: {
          id: specId,
          title: spec.title,
          priority: spec.priority,
          phase: spec.phase,
        },
        dependencies: dependencyContext,
        project_context: {
          overall_progress: progress.overall,
          spec_progress: progress.by_spec[specId],
        },
        prepared_at: new Date().toISOString(),
      };

      return handoffContext;
    } catch (error) {
      throw new Error(`Failed to prepare next task: ${error.message}`);
    }
  }

  /**
   * Get current handoff status and ready handoffs
   * @returns {Promise<Object>} Handoff status information
   */
  async getHandoffStatus() {
    try {
      const handoffs = await this.loadState('handoffs');

      // Check if handoffs are still valid (dependencies still met)
      const validHandoffs = [];
      for (const handoff of handoffs.ready_handoffs) {
        const isStillValid = await this.validateHandoff(handoff);
        if (isStillValid) {
          validHandoffs.push(handoff);
        }
      }

      // Update handoffs if any became invalid
      if (validHandoffs.length !== handoffs.ready_handoffs.length) {
        handoffs.ready_handoffs = validHandoffs;
        await this.saveState('handoffs', handoffs);
      }

      // Get agent availability for handoffs
      const agentWorkloads = await this.getCurrentAssignments();

      return {
        ready_handoffs: validHandoffs,
        handoff_history: handoffs.handoff_history.slice(-10), // Last 10 handoffs
        agent_availability: agentWorkloads.agent_workloads,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get handoff status: ${error.message}`);
    }
  }

  /**
   * Update spec frontmatter inline (no separate completion documents)
   * @param {string} specId - Specification ID
   * @param {Object} updates - Updates to apply to frontmatter
   * @param {Object} options - Additional options for update behavior
   * @returns {Promise<Object>} Update result with success status and performance metrics
   */
  async updateSpecFrontmatter(specId, updates, options = {}) {
    const startTime = Date.now();

    try {
      // Find spec file path
      const specs = this.specParser.getSpecs();
      const spec = specs.find((s) => s.id === specId);

      if (!spec || !spec.filePath) {
        return {
          success: false,
          error: `Spec file not found for ${specId}`,
          performance: { total: Date.now() - startTime },
        };
      }

      // Use enhanced frontmatter sync system
      const result = await this.frontmatterSync.updateSpecFrontmatter(
        spec.filePath,
        updates,
        options
      );

      // If successful, invalidate spec cache and reload specs
      if (result.success) {
        this.specParser.clearCache?.(); // Clear cache if method exists
        await this.specParser.loadSpecs(); // Reload specs to ensure consistency
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to update spec frontmatter for ${specId}: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Batch update multiple spec frontmatter files
   * @param {Array} updates - Array of {specId, updates} objects
   * @param {Object} options - Batch operation options
   * @returns {Promise<Object>} Batch update results
   */
  async batchUpdateSpecFrontmatter(updates, options = {}) {
    const startTime = Date.now();

    try {
      // Convert specIds to file paths
      const specs = this.specParser.getSpecs();
      const fileUpdates = [];

      for (const update of updates) {
        const spec = specs.find((s) => s.id === update.specId);
        if (spec && spec.filePath) {
          fileUpdates.push({
            filePath: spec.filePath,
            updates: update.updates,
          });
        }
      }

      if (fileUpdates.length === 0) {
        return {
          success: false,
          error: 'No valid spec files found for batch update',
          performance: { total: Date.now() - startTime },
        };
      }

      // Use enhanced frontmatter sync for batch operations
      const result = await this.frontmatterSync.batchUpdateSpecs(
        fileUpdates,
        options
      );

      // Invalidate spec cache after successful batch update and reload
      if (result.success) {
        this.specParser.clearCache?.();
        await this.specParser.loadSpecs();
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Batch frontmatter update failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Synchronize spec state with current file contents
   * @param {string} specId - Specification ID
   * @returns {Promise<Object>} Synchronization result
   */
  async syncSpecState(specId) {
    try {
      // Reload specs to get latest data
      await this.specParser.loadSpecs();

      const specs = this.specParser.getSpecs();
      const spec = specs.find((s) => s.id === specId);

      if (!spec) {
        return {
          success: false,
          error: `Spec ${specId} not found`,
        };
      }

      // Update our state based on current spec file
      const progress = await this.loadState('progress');

      // Initialize spec progress if not exists
      if (!progress.by_spec[specId]) {
        progress.by_spec[specId] = {};
      }

      // Count tasks and completion from spec
      const totalTasks = spec.tasks ? spec.tasks.length : 0;
      const completedTasks = spec.tasks
        ? spec.tasks.filter(
            (task) => task.status === 'complete' || task.status === 'done'
          ).length
        : 0;

      progress.by_spec[specId] = {
        ...progress.by_spec[specId],
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_percentage:
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        last_synced: new Date().toISOString(),
      };

      await this.saveState('progress', progress);

      return {
        success: true,
        spec_id: specId,
        synchronized_data: progress.by_spec[specId],
      };
    } catch (error) {
      return {
        success: false,
        error: `Spec sync failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate state consistency across all state files
   * @returns {Promise<Object>} Validation results
   */
  async validateState() {
    const startTime = Date.now();

    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        performance: {},
      };

      // Load all state files
      const assignments = await this.loadState('assignments');
      const progress = await this.loadState('progress');
      const handoffs = await this.loadState('handoffs');

      // Validate assignments consistency
      let activeAssignmentCount = 0;
      for (const [specId, specAssignments] of Object.entries(
        assignments.current_assignments
      )) {
        for (const [taskId, assignment] of Object.entries(specAssignments)) {
          if (assignment.status === 'in_progress') {
            activeAssignmentCount++;
          }

          // Validate assignment structure
          if (!assignment.assigned_agent || !assignment.started_at) {
            validation.errors.push(
              `Invalid assignment structure for ${specId}:${taskId}`
            );
            validation.isValid = false;
          }
        }
      }

      // Validate progress data consistency
      const specs = this.specParser.getSpecs();
      for (const spec of specs) {
        const specProgress = progress.by_spec[spec.id];
        if (spec.tasks && spec.tasks.length > 0) {
          if (!specProgress) {
            validation.warnings.push(
              `Missing progress data for spec ${spec.id}`
            );
          } else if (specProgress.total_tasks !== spec.tasks.length) {
            validation.warnings.push(
              `Task count mismatch for ${spec.id}: expected ${spec.tasks.length}, got ${specProgress.total_tasks}`
            );
          }
        }
      }

      // Validate handoffs
      for (const handoff of handoffs.ready_handoffs) {
        const isValid = await this.validateHandoff(handoff);
        if (!isValid) {
          validation.warnings.push(
            `Stale handoff detected: ${handoff.from_task} → ${handoff.to_task}`
          );
        }
      }

      validation.performance.total = Date.now() - startTime;
      validation.statistics = {
        total_assignments: activeAssignmentCount,
        total_specs: specs.length,
        ready_handoffs: handoffs.ready_handoffs.length,
        validation_time: validation.performance.total,
      };

      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [`State validation failed: ${error.message}`],
        warnings: [],
        performance: { total: Date.now() - startTime },
      };
    }
  }

  // Private helper methods

  /**
   * Load state from JSON file with caching
   * @param {string} stateType - Type of state to load
   * @returns {Promise<Object>} State data
   */
  async loadState(stateType) {
    const filePath = this.statePaths[stateType];
    const cacheKey = `state_${stateType}`;

    // Check cache first
    if (this.stateCache.has(cacheKey)) {
      const cached = this.stateCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
      this.stateCache.delete(cacheKey);
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Cache the result
      this.stateCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      throw new Error(`Failed to load ${stateType} state: ${error.message}`);
    }
  }

  /**
   * Save state to JSON file with cache invalidation
   * @private
   */
  async saveState(stateType, data) {
    const filePath = this.statePaths[stateType];
    const cacheKey = `state_${stateType}`;

    try {
      await this.atomicWrite(filePath, data);

      // Update cache
      this.stateCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to save ${stateType} state: ${error.message}`);
    }
  }

  /**
   * Atomic write operation to prevent file corruption
   * @private
   */
  async atomicWrite(filePath, data) {
    const tempPath = `${filePath}.tmp`;
    const content =
      typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors - temp file may not exist
      }
      throw error;
    }
  }

  /**
   * Set nested property using dot notation
   * @private
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Calculate duration between start and current time
   * @private
   */
  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Hours with 2 decimal places
  }

  /**
   * Validate if a handoff is still valid
   * @private
   */
  async validateHandoff(handoff) {
    try {
      const specs = this.specParser.getSpecs();
      const spec = specs.find((s) => s.id === handoff.spec_id);

      if (!spec || !spec.tasks) {
        return false;
      }

      const toTask = spec.tasks.find((t) => t.id === handoff.to_task);
      if (!toTask) {
        return false;
      }

      // Check if task is still ready and not already assigned
      const assignments = await this.loadState('assignments');
      const currentAssignment =
        assignments.current_assignments[handoff.spec_id]?.[handoff.to_task];

      return !currentAssignment || currentAssignment.status !== 'in_progress';
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear state cache
   */
  clearCache() {
    this.stateCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.stateCache.size,
      timeout: this.cacheTimeout,
      keys: Array.from(this.stateCache.keys()),
    };
  }
}

module.exports = WorkflowStateManager;
