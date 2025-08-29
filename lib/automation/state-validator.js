const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const EventEmitter = require('events');

/**
 * StateValidator - Comprehensive state validation and consistency checking
 *
 * Provides real-time state validation across YAML frontmatter and JSON state files
 * with automated repair capabilities for simple inconsistencies and conflict detection
 * for complex scenarios requiring manual intervention.
 *
 * Key Features:
 * - Real-time consistency checking between YAML frontmatter and JSON state
 * - Automated repair for simple inconsistencies (timestamps, status sync)
 * - Conflict detection for complex inconsistencies requiring manual resolution
 * - Deep state validation with semantic understanding
 * - Performance monitoring <100ms validation target
 * - Integration with FileWatchers for change-triggered validation
 */
class StateValidator extends EventEmitter {
  constructor(configManager = null, workflowStateManager = null) {
    super();

    this.configManager = configManager;
    this.workflowStateManager = workflowStateManager;
    this.performanceTarget = 100; // <100ms validation requirement

    // Validation rules and patterns
    this.validationRules = {
      required_yaml_fields: ['id', 'title', 'type', 'status'],
      valid_statuses: [
        'active',
        'backlog',
        'done',
        'blocked',
        'in_progress',
        'ready',
      ],
      valid_types: ['FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE', 'TASK'],
      valid_priorities: ['P0', 'P1', 'P2', 'P3'],
      valid_agents: [
        'software-architect',
        'senior-developer',
        'frontend-specialist',
        'backend-specialist',
        'qa-specialist',
        'devops-specialist',
      ],
    };

    // State consistency patterns
    this.consistencyPatterns = {
      status_sync: {
        yaml_path: 'status',
        json_path: 'assignments.current_assignments.*.*.status',
        repair_strategy: 'sync_from_yaml',
      },
      assignment_sync: {
        yaml_path: 'tasks.*.assigned_agent',
        json_path: 'assignments.current_assignments.*.*.assigned_agent',
        repair_strategy: 'bidirectional_check',
      },
      progress_sync: {
        yaml_path: 'tasks.*.status',
        json_path: 'progress.by_spec.*.tasks.*.status',
        repair_strategy: 'calculate_from_tasks',
      },
    };

    // Statistics tracking
    this.stats = {
      totalValidations: 0,
      inconsistenciesFound: 0,
      automatedRepairs: 0,
      conflictsDetected: 0,
      validationErrors: 0,
      averageValidationTime: 0,
      lastValidation: null,
    };

    // Cache for validation results to avoid redundant checks
    this.validationCache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache timeout
  }

  /**
   * Initialize the State Validation Engine
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      console.log('✅ StateValidator initialized successfully');
      this.emit('initialized', {
        validationRules: this.validationRules,
        consistencyPatterns: this.consistencyPatterns,
        performanceTarget: this.performanceTarget,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error(
        `❌ StateValidator initialization failed: ${error.message}`
      );
      this.emit('initialization_error', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  /**
   * Validate state consistency triggered by file change events
   * @param {Object} changePayload - Change payload from FileWatchers/ChangeDetector
   * @returns {Promise<Object>} Validation result with repair actions taken
   */
  async validateChangeEvent(changePayload) {
    const startTime = Date.now();

    try {
      this.stats.totalValidations++;
      this.stats.lastValidation = new Date().toISOString();

      // Route to appropriate validation based on change type
      let validationResult;
      if (changePayload.watcherType === 'yaml') {
        validationResult = await this.validateYamlChange(changePayload);
      } else if (changePayload.watcherType === 'json') {
        validationResult = await this.validateJsonChange(changePayload);
      } else {
        throw new Error(
          `Unsupported change type: ${changePayload.watcherType}`
        );
      }

      // Add performance metrics
      const validationTime = Date.now() - startTime;
      validationResult.performance = {
        validationTimeMs: validationTime,
        withinTarget: validationTime <= this.performanceTarget,
        target: this.performanceTarget,
      };

      // Update performance statistics
      this.stats.averageValidationTime =
        (this.stats.averageValidationTime * (this.stats.totalValidations - 1) +
          validationTime) /
        this.stats.totalValidations;

      // Log performance warning if validation took too long
      if (validationTime > this.performanceTarget) {
        console.warn(
          `⚠️ State validation took ${validationTime}ms, exceeding ${this.performanceTarget}ms target`
        );
      }

      // Update statistics based on results
      if (validationResult.inconsistencies.length > 0) {
        this.stats.inconsistenciesFound++;
      }
      if (validationResult.repairsPerformed.length > 0) {
        this.stats.automatedRepairs += validationResult.repairsPerformed.length;
      }
      if (validationResult.conflicts.length > 0) {
        this.stats.conflictsDetected++;
      }

      // Emit validation result event
      this.emit('validation_complete', validationResult);

      return validationResult;
    } catch (error) {
      this.stats.validationErrors++;
      const errorResult = {
        success: false,
        error: error.message,
        changePayload,
        inconsistencies: [],
        repairsPerformed: [],
        conflicts: [],
        performance: {
          validationTimeMs: Date.now() - startTime,
          withinTarget: false,
          target: this.performanceTarget,
          error: true,
        },
      };

      this.emit('validation_error', errorResult);
      return errorResult;
    }
  }

  /**
   * Validate YAML frontmatter changes and check consistency with JSON state
   * @param {Object} changePayload - YAML change payload
   * @returns {Promise<Object>} Validation result
   */
  async validateYamlChange(changePayload) {
    const { filePath, analysis } = changePayload;
    const specId = this.extractSpecId(filePath);

    const validationResult = {
      success: true,
      changeType: 'yaml',
      specId,
      filePath,
      inconsistencies: [],
      repairsPerformed: [],
      conflicts: [],
      validationDetails: {
        yamlStructure: null,
        consistencyCheck: null,
        repairActions: [],
      },
    };

    try {
      // Parse current YAML frontmatter
      const yamlState = await this.parseYamlFile(filePath);
      validationResult.validationDetails.yamlStructure = {
        parseable: yamlState.parseable,
        hasRequiredFields: yamlState.parseable
          ? this.hasRequiredYamlFields(yamlState.frontmatter)
          : false,
        error: yamlState.error,
      };

      if (!yamlState.parseable) {
        validationResult.conflicts.push({
          type: 'yaml_parsing_error',
          severity: 'high',
          description: `YAML frontmatter parsing failed: ${yamlState.error}`,
          filePath,
          repairStrategy: 'manual_intervention_required',
        });
        return validationResult;
      }

      // Validate YAML structure and required fields
      const structureValidation = await this.validateYamlStructure(
        yamlState.frontmatter,
        filePath
      );
      if (!structureValidation.isValid) {
        validationResult.inconsistencies.push(
          ...structureValidation.inconsistencies
        );
      }

      // Check consistency with JSON state if change affects critical fields
      if (analysis && this.affectsCriticalFields(analysis.semanticChanges)) {
        const consistencyResult = await this.validateYamlJsonConsistency(
          specId,
          yamlState.frontmatter
        );
        validationResult.validationDetails.consistencyCheck = consistencyResult;

        if (consistencyResult.inconsistencies.length > 0) {
          validationResult.inconsistencies.push(
            ...consistencyResult.inconsistencies
          );

          // Attempt automated repairs for simple inconsistencies
          const repairResult = await this.attemptAutomatedRepairs(
            consistencyResult.inconsistencies,
            specId,
            yamlState.frontmatter
          );
          validationResult.repairsPerformed = repairResult.repairsPerformed;
          validationResult.conflicts.push(...repairResult.conflicts);
        }
      }

      return validationResult;
    } catch (error) {
      validationResult.success = false;
      validationResult.error = error.message;
      return validationResult;
    }
  }

  /**
   * Validate JSON state changes and check consistency with YAML frontmatter
   * @param {Object} changePayload - JSON change payload
   * @returns {Promise<Object>} Validation result
   */
  async validateJsonChange(changePayload) {
    const { filePath } = changePayload;
    const stateType = path.basename(filePath, '.json');

    const validationResult = {
      success: true,
      changeType: 'json',
      stateType,
      filePath,
      inconsistencies: [],
      repairsPerformed: [],
      conflicts: [],
      validationDetails: {
        jsonStructure: null,
        consistencyCheck: null,
        repairActions: [],
      },
    };

    try {
      // Parse current JSON state
      const jsonState = await this.parseJsonFile(filePath);
      validationResult.validationDetails.jsonStructure = {
        parseable: jsonState.parseable,
        hasExpectedStructure: jsonState.parseable
          ? this.hasExpectedJsonStructure(jsonState.data, stateType)
          : false,
        error: jsonState.error,
      };

      if (!jsonState.parseable) {
        validationResult.conflicts.push({
          type: 'json_parsing_error',
          severity: 'high',
          description: `JSON parsing failed: ${jsonState.error}`,
          filePath,
          repairStrategy: 'manual_intervention_required',
        });
        return validationResult;
      }

      // Validate JSON structure for this state type
      const structureValidation = await this.validateJsonStructure(
        jsonState.data,
        stateType,
        filePath
      );
      if (!structureValidation.isValid) {
        validationResult.inconsistencies.push(
          ...structureValidation.inconsistencies
        );
      }

      // Check consistency with YAML frontmatter for assignment and progress changes
      if (['assignments', 'progress'].includes(stateType)) {
        const consistencyResult = await this.validateJsonYamlConsistency(
          jsonState.data,
          stateType
        );
        validationResult.validationDetails.consistencyCheck = consistencyResult;

        if (consistencyResult.inconsistencies.length > 0) {
          validationResult.inconsistencies.push(
            ...consistencyResult.inconsistencies
          );

          // Attempt automated repairs for simple inconsistencies
          const repairResult = await this.attemptJsonStateRepairs(
            consistencyResult.inconsistencies,
            jsonState.data,
            stateType
          );
          validationResult.repairsPerformed = repairResult.repairsPerformed;
          validationResult.conflicts.push(...repairResult.conflicts);
        }
      }

      return validationResult;
    } catch (error) {
      validationResult.success = false;
      validationResult.error = error.message;
      return validationResult;
    }
  }

  /**
   * Validate YAML structure and required fields
   * @param {Object} frontmatter - YAML frontmatter object
   * @param {string} filePath - File path for context
   * @returns {Promise<Object>} Structure validation result
   */
  async validateYamlStructure(frontmatter, filePath) {
    const validation = {
      isValid: true,
      inconsistencies: [],
    };

    // Check required fields
    for (const requiredField of this.validationRules.required_yaml_fields) {
      if (!frontmatter[requiredField]) {
        validation.inconsistencies.push({
          type: 'missing_required_field',
          severity: 'high',
          field: requiredField,
          description: `Missing required field: ${requiredField}`,
          filePath,
          repairStrategy: 'manual_intervention_required',
        });
        validation.isValid = false;
      }
    }

    // Validate field values
    if (
      frontmatter.status &&
      !this.validationRules.valid_statuses.includes(frontmatter.status)
    ) {
      validation.inconsistencies.push({
        type: 'invalid_status',
        severity: 'medium',
        field: 'status',
        value: frontmatter.status,
        description: `Invalid status: ${
          frontmatter.status
        }. Valid values: ${this.validationRules.valid_statuses.join(', ')}`,
        filePath,
        repairStrategy: 'suggest_valid_values',
      });
    }

    if (
      frontmatter.type &&
      !this.validationRules.valid_types.includes(frontmatter.type)
    ) {
      validation.inconsistencies.push({
        type: 'invalid_type',
        severity: 'medium',
        field: 'type',
        value: frontmatter.type,
        description: `Invalid type: ${
          frontmatter.type
        }. Valid values: ${this.validationRules.valid_types.join(', ')}`,
        filePath,
        repairStrategy: 'suggest_valid_values',
      });
    }

    if (
      frontmatter.priority &&
      !this.validationRules.valid_priorities.includes(frontmatter.priority)
    ) {
      validation.inconsistencies.push({
        type: 'invalid_priority',
        severity: 'low',
        field: 'priority',
        value: frontmatter.priority,
        description: `Invalid priority: ${
          frontmatter.priority
        }. Valid values: ${this.validationRules.valid_priorities.join(', ')}`,
        filePath,
        repairStrategy: 'suggest_valid_values',
      });
    }

    // Validate tasks structure if present
    if (frontmatter.tasks && Array.isArray(frontmatter.tasks)) {
      for (let i = 0; i < frontmatter.tasks.length; i++) {
        const task = frontmatter.tasks[i];
        if (!task.id || !task.title) {
          validation.inconsistencies.push({
            type: 'invalid_task_structure',
            severity: 'high',
            field: `tasks[${i}]`,
            description: `Task ${i} missing required fields (id, title)`,
            filePath,
            repairStrategy: 'manual_intervention_required',
          });
          validation.isValid = false;
        }

        if (
          task.assigned_agent &&
          !this.validationRules.valid_agents.includes(task.assigned_agent)
        ) {
          validation.inconsistencies.push({
            type: 'invalid_agent',
            severity: 'medium',
            field: `tasks[${i}].assigned_agent`,
            value: task.assigned_agent,
            description: `Invalid agent: ${
              task.assigned_agent
            }. Valid values: ${this.validationRules.valid_agents.join(', ')}`,
            filePath,
            repairStrategy: 'suggest_valid_values',
          });
        }
      }
    }

    return validation;
  }

  /**
   * Validate JSON structure for specific state types
   * @param {Object} data - JSON data object
   * @param {string} stateType - Type of state file
   * @param {string} filePath - File path for context
   * @returns {Promise<Object>} Structure validation result
   */
  async validateJsonStructure(data, stateType, filePath) {
    const validation = {
      isValid: true,
      inconsistencies: [],
    };

    switch (stateType) {
      case 'assignments':
        if (
          !data.current_assignments ||
          typeof data.current_assignments !== 'object'
        ) {
          validation.inconsistencies.push({
            type: 'missing_assignments_structure',
            severity: 'high',
            description: 'Missing or invalid current_assignments structure',
            filePath,
            repairStrategy: 'initialize_default_structure',
          });
          validation.isValid = false;
        }

        if (!Array.isArray(data.assignment_history)) {
          validation.inconsistencies.push({
            type: 'missing_assignment_history',
            severity: 'medium',
            description: 'Missing or invalid assignment_history array',
            filePath,
            repairStrategy: 'initialize_empty_array',
          });
        }
        break;

      case 'progress':
        if (!data.overall || typeof data.overall !== 'object') {
          validation.inconsistencies.push({
            type: 'missing_progress_structure',
            severity: 'high',
            description: 'Missing or invalid overall progress structure',
            filePath,
            repairStrategy: 'initialize_default_structure',
          });
          validation.isValid = false;
        }

        if (!data.by_spec || typeof data.by_spec !== 'object') {
          validation.inconsistencies.push({
            type: 'missing_spec_progress',
            severity: 'high',
            description: 'Missing or invalid by_spec progress structure',
            filePath,
            repairStrategy: 'initialize_default_structure',
          });
          validation.isValid = false;
        }
        break;

      case 'handoffs':
        if (!Array.isArray(data.ready_handoffs)) {
          validation.inconsistencies.push({
            type: 'missing_handoffs_structure',
            severity: 'high',
            description: 'Missing or invalid ready_handoffs array',
            filePath,
            repairStrategy: 'initialize_empty_array',
          });
          validation.isValid = false;
        }

        if (!Array.isArray(data.handoff_history)) {
          validation.inconsistencies.push({
            type: 'missing_handoff_history',
            severity: 'medium',
            description: 'Missing or invalid handoff_history array',
            filePath,
            repairStrategy: 'initialize_empty_array',
          });
        }
        break;

      case 'metadata':
        if (!data.last_updated) {
          validation.inconsistencies.push({
            type: 'missing_timestamp',
            severity: 'low',
            description: 'Missing last_updated timestamp',
            filePath,
            repairStrategy: 'set_current_timestamp',
          });
        }
        break;
    }

    return validation;
  }

  /**
   * Check consistency between YAML frontmatter and JSON state
   * @param {string} specId - Specification ID
   * @param {Object} frontmatter - YAML frontmatter object
   * @returns {Promise<Object>} Consistency check result
   */
  async validateYamlJsonConsistency(specId, frontmatter) {
    const consistencyResult = {
      inconsistencies: [],
      checkedPatterns: [],
    };

    try {
      // Load JSON state files
      const assignments = await this.loadJsonState('assignments');
      const progress = await this.loadJsonState('progress');

      // Check assignment consistency
      if (frontmatter.tasks && Array.isArray(frontmatter.tasks)) {
        for (const task of frontmatter.tasks) {
          if (task.assigned_agent && task.status === 'in_progress') {
            const jsonAssignment =
              assignments?.current_assignments?.[specId]?.[task.id];

            if (!jsonAssignment) {
              consistencyResult.inconsistencies.push({
                type: 'missing_json_assignment',
                severity: 'medium',
                specId,
                taskId: task.id,
                yamlAgent: task.assigned_agent,
                description: `YAML shows task assigned to ${task.assigned_agent} but no JSON assignment exists`,
                repairStrategy: 'create_json_assignment',
              });
            } else if (jsonAssignment.assigned_agent !== task.assigned_agent) {
              consistencyResult.inconsistencies.push({
                type: 'agent_assignment_mismatch',
                severity: 'high',
                specId,
                taskId: task.id,
                yamlAgent: task.assigned_agent,
                jsonAgent: jsonAssignment.assigned_agent,
                description: `Assignment mismatch: YAML shows ${task.assigned_agent}, JSON shows ${jsonAssignment.assigned_agent}`,
                repairStrategy: 'sync_assignments',
              });
            }
          }
        }
      }

      // Check progress consistency
      if (progress?.by_spec?.[specId]) {
        const specProgress = progress.by_spec[specId];
        const yamlTaskCount = frontmatter.tasks ? frontmatter.tasks.length : 0;

        if (specProgress.total_tasks !== yamlTaskCount) {
          consistencyResult.inconsistencies.push({
            type: 'task_count_mismatch',
            severity: 'medium',
            specId,
            yamlTaskCount,
            jsonTaskCount: specProgress.total_tasks,
            description: `Task count mismatch: YAML has ${yamlTaskCount} tasks, JSON progress shows ${specProgress.total_tasks}`,
            repairStrategy: 'recalculate_progress',
          });
        }
      }

      consistencyResult.checkedPatterns = ['assignment_sync', 'progress_sync'];
      return consistencyResult;
    } catch (error) {
      consistencyResult.error = error.message;
      return consistencyResult;
    }
  }

  /**
   * Check consistency between JSON state and YAML frontmatter
   * @param {Object} jsonData - JSON state data
   * @param {string} stateType - Type of JSON state
   * @returns {Promise<Object>} Consistency check result
   */
  async validateJsonYamlConsistency(jsonData, stateType) {
    const consistencyResult = {
      inconsistencies: [],
      checkedPatterns: [],
    };

    try {
      if (stateType === 'assignments' && jsonData.current_assignments) {
        // Check each assignment against YAML frontmatter
        for (const [specId, specAssignments] of Object.entries(
          jsonData.current_assignments
        )) {
          const yamlState = await this.getYamlStateForSpec(specId);

          if (yamlState?.frontmatter?.tasks) {
            for (const [taskId, assignment] of Object.entries(
              specAssignments
            )) {
              const yamlTask = yamlState.frontmatter.tasks.find(
                (t) => t.id === taskId
              );

              if (!yamlTask) {
                consistencyResult.inconsistencies.push({
                  type: 'orphaned_json_assignment',
                  severity: 'medium',
                  specId,
                  taskId,
                  description: `JSON assignment exists for ${taskId} but no corresponding YAML task found`,
                  repairStrategy: 'remove_orphaned_assignment',
                });
              } else if (
                yamlTask.assigned_agent !== assignment.assigned_agent
              ) {
                consistencyResult.inconsistencies.push({
                  type: 'agent_assignment_mismatch',
                  severity: 'high',
                  specId,
                  taskId,
                  yamlAgent: yamlTask.assigned_agent,
                  jsonAgent: assignment.assigned_agent,
                  description: `Agent mismatch: YAML shows ${yamlTask.assigned_agent}, JSON shows ${assignment.assigned_agent}`,
                  repairStrategy: 'sync_assignments',
                });
              }
            }
          }
        }
      }

      consistencyResult.checkedPatterns = [`${stateType}_consistency`];
      return consistencyResult;
    } catch (error) {
      consistencyResult.error = error.message;
      return consistencyResult;
    }
  }

  /**
   * Attempt automated repairs for simple inconsistencies
   * @param {Array} inconsistencies - Array of detected inconsistencies
   * @param {string} specId - Specification ID
   * @param {Object} frontmatter - YAML frontmatter object
   * @returns {Promise<Object>} Repair result
   */
  async attemptAutomatedRepairs(inconsistencies, specId, frontmatter) {
    const repairResult = {
      repairsPerformed: [],
      conflicts: [],
    };

    for (const inconsistency of inconsistencies) {
      try {
        if (
          inconsistency.repairStrategy === 'create_json_assignment' &&
          this.workflowStateManager
        ) {
          // Create missing JSON assignment
          const task = frontmatter.tasks.find(
            (t) => t.id === inconsistency.taskId
          );
          if (task) {
            const assignmentResult = await this.workflowStateManager.assignTask(
              specId,
              task.id,
              task.assigned_agent,
              { automated: true, repairAction: true }
            );

            if (assignmentResult.success) {
              repairResult.repairsPerformed.push({
                type: 'created_json_assignment',
                specId,
                taskId: task.id,
                agent: task.assigned_agent,
                description: 'Created missing JSON assignment from YAML data',
              });
            }
          }
        } else if (inconsistency.repairStrategy === 'sync_assignments') {
          // For now, flag as conflict requiring manual resolution
          repairResult.conflicts.push({
            type: 'assignment_sync_conflict',
            severity: 'high',
            description: `Assignment sync conflict between YAML and JSON for ${inconsistency.specId}:${inconsistency.taskId}`,
            yamlValue: inconsistency.yamlAgent,
            jsonValue: inconsistency.jsonAgent,
            suggestedAction:
              'Review and manually resolve assignment discrepancy',
          });
        } else if (
          inconsistency.repairStrategy === 'recalculate_progress' &&
          this.workflowStateManager
        ) {
          // Recalculate progress based on current state
          await this.workflowStateManager.updateProjectProgress();
          repairResult.repairsPerformed.push({
            type: 'recalculated_progress',
            specId,
            description:
              'Recalculated progress statistics from current task states',
          });
        }
      } catch (repairError) {
        repairResult.conflicts.push({
          type: 'repair_failed',
          severity: 'medium',
          description: `Failed to repair ${inconsistency.type}: ${repairError.message}`,
          originalInconsistency: inconsistency,
          suggestedAction: 'Manual intervention required',
        });
      }
    }

    return repairResult;
  }

  /**
   * Attempt automated repairs for JSON state inconsistencies
   * @param {Array} inconsistencies - Array of detected inconsistencies
   * @param {Object} jsonData - JSON state data
   * @param {string} stateType - Type of JSON state
   * @returns {Promise<Object>} Repair result
   */
  async attemptJsonStateRepairs(inconsistencies, jsonData, stateType) {
    const repairResult = {
      repairsPerformed: [],
      conflicts: [],
    };

    for (const inconsistency of inconsistencies) {
      try {
        if (inconsistency.repairStrategy === 'initialize_default_structure') {
          // Initialize missing structures with defaults
          repairResult.conflicts.push({
            type: 'structure_initialization_needed',
            severity: 'high',
            description: `${stateType} file missing required structure: ${inconsistency.description}`,
            suggestedAction: 'Reinitialize state file with default structure',
          });
        } else if (
          inconsistency.repairStrategy === 'remove_orphaned_assignment'
        ) {
          repairResult.conflicts.push({
            type: 'orphaned_assignment_cleanup',
            severity: 'medium',
            description: `Orphaned assignment found: ${inconsistency.description}`,
            specId: inconsistency.specId,
            taskId: inconsistency.taskId,
            suggestedAction:
              'Remove orphaned assignment or create corresponding YAML task',
          });
        }
      } catch (repairError) {
        repairResult.conflicts.push({
          type: 'json_repair_failed',
          severity: 'medium',
          description: `Failed to repair JSON inconsistency: ${repairError.message}`,
          originalInconsistency: inconsistency,
          suggestedAction: 'Manual intervention required',
        });
      }
    }

    return repairResult;
  }

  /**
   * Get comprehensive validation statistics
   * @returns {Object} Current validation statistics
   */
  getValidationStatistics() {
    return {
      ...this.stats,
      cacheSize: this.validationCache.size,
      validationRules: this.validationRules,
      consistencyPatterns: Object.keys(this.consistencyPatterns),
      performanceTarget: this.performanceTarget,
      timestamp: new Date().toISOString(),
    };
  }

  // Helper methods

  /**
   * Parse YAML file and extract frontmatter
   * @param {string} filePath - Path to YAML file
   * @returns {Promise<Object>} Parsed YAML state
   */
  async parseYamlFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!frontmatterMatch) {
        return {
          parseable: false,
          content,
          frontmatter: null,
          error: 'No YAML frontmatter found',
        };
      }

      try {
        const frontmatter = yaml.load(frontmatterMatch[1]) || {};
        return {
          parseable: true,
          content,
          frontmatter,
          yamlContent: frontmatterMatch[1],
        };
      } catch (yamlError) {
        return {
          parseable: false,
          content,
          frontmatter: null,
          error: `YAML parsing error: ${yamlError.message}`,
        };
      }
    } catch (error) {
      return {
        parseable: false,
        content: null,
        frontmatter: null,
        error: `File read error: ${error.message}`,
      };
    }
  }

  /**
   * Parse JSON file
   * @param {string} filePath - Path to JSON file
   * @returns {Promise<Object>} Parsed JSON state
   */
  async parseJsonFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      try {
        const data = JSON.parse(content);
        return {
          parseable: true,
          content,
          data,
        };
      } catch (jsonError) {
        return {
          parseable: false,
          content,
          data: null,
          error: `JSON parsing error: ${jsonError.message}`,
        };
      }
    } catch (error) {
      return {
        parseable: false,
        content: null,
        data: null,
        error: `File read error: ${error.message}`,
      };
    }
  }

  /**
   * Load JSON state file
   * @param {string} stateType - Type of state to load
   * @returns {Promise<Object|null>} State data or null
   */
  async loadJsonState(stateType) {
    if (!this.workflowStateManager) {
      return null;
    }

    try {
      return await this.workflowStateManager.loadState(stateType);
    } catch (error) {
      console.warn(`Failed to load ${stateType} state: ${error.message}`);
      return null;
    }
  }

  /**
   * Get YAML state for a specific spec
   * @param {string} specId - Specification ID
   * @returns {Promise<Object|null>} YAML state or null
   */
  async getYamlStateForSpec(specId) {
    if (!this.configManager) {
      return null;
    }

    try {
      const specsDir = this.configManager.getFeaturesPath();

      // Look for spec file in different directories
      const possiblePaths = [
        path.join(specsDir, 'active', `${specId}.md`),
        path.join(specsDir, 'backlog', `${specId}.md`),
        path.join(specsDir, 'done', `${specId}.md`),
      ];

      for (const filePath of possiblePaths) {
        try {
          const yamlState = await this.parseYamlFile(filePath);
          if (yamlState.parseable) {
            return yamlState;
          }
        } catch (error) {
          // Continue to next path
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract spec ID from file path
   * @param {string} filePath - File path
   * @returns {string} Extracted spec ID
   */
  extractSpecId(filePath) {
    const fileName = path.basename(filePath, '.md');
    const idMatch = fileName.match(/^([A-Z]+-\d+)/);
    return idMatch ? idMatch[1] : fileName;
  }

  /**
   * Check if YAML has required fields
   * @param {Object} frontmatter - Frontmatter object
   * @returns {boolean} Whether all required fields are present
   */
  hasRequiredYamlFields(frontmatter) {
    return this.validationRules.required_yaml_fields.every(
      (field) => frontmatter && frontmatter[field]
    );
  }

  /**
   * Check if JSON has expected structure for state type
   * @param {Object} data - JSON data
   * @param {string} stateType - State type
   * @returns {boolean} Whether structure is as expected
   */
  hasExpectedJsonStructure(data, stateType) {
    if (!data) return false;

    switch (stateType) {
      case 'assignments':
        return data.current_assignments && data.assignment_history;
      case 'progress':
        return data.overall && data.by_spec;
      case 'handoffs':
        return data.ready_handoffs && data.handoff_history;
      case 'metadata':
        return data.last_updated;
      default:
        return true;
    }
  }

  /**
   * Check if semantic changes affect critical fields requiring validation
   * @param {Object} semanticChanges - Semantic changes object
   * @returns {boolean} Whether changes affect critical fields
   */
  affectsCriticalFields(semanticChanges) {
    if (!semanticChanges) return false;

    return !!(
      semanticChanges.statusChange ||
      semanticChanges.assignmentChange ||
      semanticChanges.taskChanges?.length > 0
    );
  }

  /**
   * Clear validation cache
   */
  clearValidationCache() {
    this.validationCache.clear();
    console.log('📝 StateValidator cache cleared');
  }

  /**
   * Shutdown state validator
   */
  shutdown() {
    this.clearValidationCache();
    console.log('✅ StateValidator shutdown complete');
  }
}

module.exports = StateValidator;
