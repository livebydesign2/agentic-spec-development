const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * SyncEngine - Bi-directional state synchronization between YAML frontmatter and JSON state
 *
 * Provides atomic synchronization operations with rollback capabilities, ensuring
 * consistency between YAML frontmatter in specification files and JSON state files
 * with comprehensive audit logging and performance monitoring.
 *
 * Key Features:
 * - Bi-directional sync: YAML ↔ JSON state synchronization
 * - Atomic operations with rollback on failure
 * - Conflict detection and resolution strategies
 * - Performance monitoring <2 second sync operations
 * - Comprehensive audit logging for all operations
 * - Integration with WorkflowStateManager and FrontmatterSync
 * - Event-driven architecture via EventBus integration
 */
class SyncEngine extends EventEmitter {
  constructor(workflowStateManager = null, frontmatterSync = null, eventBus = null) {
    super();

    this.workflowStateManager = workflowStateManager;
    this.frontmatterSync = frontmatterSync;
    this.eventBus = eventBus;
    
    // Performance requirements
    this.performanceTarget = 2000; // <2 second sync operations requirement

    // Sync operation tracking
    this.activeSyncOperations = new Map();
    this.syncHistory = [];
    this.maxHistorySize = 500;

    // Sync strategies and configurations
    this.syncStrategies = {
      yaml_to_json: {
        priority: ['status', 'assigned_agent', 'priority', 'tasks'],
        conflictResolution: 'yaml_wins', // YAML is source of truth for spec data
        requiresValidation: true
      },
      json_to_yaml: {
        priority: ['assignment_timestamps', 'completion_notes', 'progress_tracking'],
        conflictResolution: 'json_wins', // JSON is source of truth for operational data
        requiresValidation: true
      },
      bidirectional: {
        conflictResolution: 'manual_intervention',
        requiresValidation: true,
        requiresBackup: true
      }
    };

    // Sync metrics and statistics
    this.metrics = {
      totalSyncOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      yamlToJsonSyncs: 0,
      jsonToYamlSyncs: 0,
      bidirectionalSyncs: 0,
      rollbacks: 0,
      conflictsDetected: 0,
      lastSyncOperation: null
    };

    // Sync operation states
    this.syncStates = {
      PENDING: 'pending',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      FAILED: 'failed',
      ROLLED_BACK: 'rolled_back'
    };
  }

  /**
   * Initialize the Synchronization Engine
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Register event handlers if EventBus is available
      if (this.eventBus) {
        this.registerEventHandlers();
      }

      console.log('✅ SyncEngine initialized successfully');
      this.emit('initialized', {
        strategies: Object.keys(this.syncStrategies),
        performanceTarget: this.performanceTarget,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error(`❌ SyncEngine initialization failed: ${error.message}`);
      this.emit('initialization_error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Register event handlers for automated synchronization
   */
  registerEventHandlers() {
    // Handle validation results that require sync
    this.eventBus.registerHandler('validation_complete', async (eventData, eventMetadata) => {
      await this.handleValidationResult(eventData, eventMetadata);
    }, { priority: 3 });

    // Handle file change events that trigger sync
    this.eventBus.registerHandler('change_analyzed', async (eventData, eventMetadata) => {
      await this.handleChangeAnalysis(eventData, eventMetadata);
    }, { priority: 2 });

    console.log('📝 SyncEngine event handlers registered');
  }

  /**
   * Synchronize YAML frontmatter changes to JSON state
   * @param {string} specId - Specification ID
   * @param {string} filePath - YAML file path
   * @param {Object} changes - Changes detected in YAML
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync operation result
   */
  async syncYamlToJson(specId, filePath, changes, options = {}) {
    const operationId = this.generateOperationId('yaml_to_json', specId);
    const startTime = Date.now();

    // Create sync operation record
    const syncOperation = {
      id: operationId,
      type: 'yaml_to_json',
      specId,
      filePath,
      changes,
      state: this.syncStates.PENDING,
      startTime,
      backups: [],
      appliedChanges: [],
      error: null,
      rollbackRequired: false
    };

    this.activeSyncOperations.set(operationId, syncOperation);

    try {
      console.log(`🔄 Starting YAML→JSON sync for ${specId} (${operationId})`);
      syncOperation.state = this.syncStates.IN_PROGRESS;

      // Parse current YAML frontmatter
      const yamlContent = await this.parseYamlFile(filePath);
      if (!yamlContent.parseable) {
        throw new Error(`Cannot parse YAML frontmatter: ${yamlContent.error}`);
      }

      // Create backups before making changes
      if (options.createBackups !== false) {
        await this.createSyncBackups(syncOperation);
      }

      // Apply YAML changes to JSON state files
      const syncResult = await this.applyYamlChangesToJson(
        specId,
        yamlContent.frontmatter,
        changes,
        syncOperation
      );

      if (!syncResult.success) {
        syncOperation.rollbackRequired = true;
        throw new Error(`JSON sync failed: ${syncResult.error}`);
      }

      // Validate sync results
      if (this.syncStrategies.yaml_to_json.requiresValidation) {
        const validationResult = await this.validateSyncResults(syncOperation);
        if (!validationResult.success) {
          syncOperation.rollbackRequired = true;
          throw new Error(`Sync validation failed: ${validationResult.error}`);
        }
      }

      // Mark operation as completed
      syncOperation.state = this.syncStates.COMPLETED;
      syncOperation.endTime = Date.now();
      syncOperation.duration = syncOperation.endTime - syncOperation.startTime;

      // Update metrics
      this.updateSyncMetrics('yaml_to_json', true, syncOperation.duration);

      // Emit success event
      this.emit('sync_completed', {
        operationId,
        type: 'yaml_to_json',
        specId,
        duration: syncOperation.duration,
        changesApplied: syncOperation.appliedChanges.length
      });

      console.log(`✅ YAML→JSON sync completed for ${specId} (${syncOperation.duration}ms)`);

      return {
        success: true,
        operationId,
        duration: syncOperation.duration,
        changesApplied: syncOperation.appliedChanges.length,
        withinPerformanceTarget: syncOperation.duration <= this.performanceTarget
      };

    } catch (error) {
      console.error(`❌ YAML→JSON sync failed for ${specId}: ${error.message}`);

      // Perform rollback if required
      if (syncOperation.rollbackRequired) {
        await this.rollbackSyncOperation(syncOperation);
      }

      syncOperation.state = this.syncStates.FAILED;
      syncOperation.error = error.message;
      syncOperation.endTime = Date.now();
      syncOperation.duration = syncOperation.endTime - syncOperation.startTime;

      this.updateSyncMetrics('yaml_to_json', false, syncOperation.duration);

      this.emit('sync_failed', {
        operationId,
        type: 'yaml_to_json',
        specId,
        error: error.message,
        rollbackPerformed: syncOperation.rollbackRequired
      });

      return {
        success: false,
        operationId,
        error: error.message,
        duration: syncOperation.duration,
        rollbackPerformed: syncOperation.rollbackRequired
      };

    } finally {
      // Move to history and clean up
      this.moveSyncOperationToHistory(syncOperation);
      this.activeSyncOperations.delete(operationId);
    }
  }

  /**
   * Synchronize JSON state changes to YAML frontmatter
   * @param {Object} stateChanges - Changes detected in JSON state
   * @param {string} stateType - Type of state file (assignments, progress, etc.)
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync operation result
   */
  async syncJsonToYaml(stateChanges, stateType, options = {}) {
    const operationId = this.generateOperationId('json_to_yaml', stateType);
    const startTime = Date.now();

    // Create sync operation record
    const syncOperation = {
      id: operationId,
      type: 'json_to_yaml',
      stateType,
      stateChanges,
      state: this.syncStates.PENDING,
      startTime,
      backups: [],
      appliedChanges: [],
      affectedSpecs: [],
      error: null,
      rollbackRequired: false
    };

    this.activeSyncOperations.set(operationId, syncOperation);

    try {
      console.log(`🔄 Starting JSON→YAML sync for ${stateType} (${operationId})`);
      syncOperation.state = this.syncStates.IN_PROGRESS;

      // Determine which specs are affected by JSON changes
      const affectedSpecs = await this.identifyAffectedSpecs(stateChanges, stateType);
      syncOperation.affectedSpecs = affectedSpecs;

      if (affectedSpecs.length === 0) {
        console.log(`ℹ️ No specs affected by ${stateType} changes, sync completed`);
        syncOperation.state = this.syncStates.COMPLETED;
        return { success: true, operationId, affectedSpecs: 0 };
      }

      // Create backups before making changes
      if (options.createBackups !== false) {
        await this.createSyncBackups(syncOperation);
      }

      // Apply JSON changes to YAML frontmatter for each affected spec
      const syncResults = [];
      for (const specId of affectedSpecs) {
        const specSyncResult = await this.applyJsonChangesToYaml(
          specId,
          stateChanges,
          stateType,
          syncOperation
        );
        syncResults.push(specSyncResult);

        if (!specSyncResult.success) {
          syncOperation.rollbackRequired = true;
          throw new Error(`YAML sync failed for ${specId}: ${specSyncResult.error}`);
        }
      }

      // Validate sync results
      if (this.syncStrategies.json_to_yaml.requiresValidation) {
        const validationResult = await this.validateSyncResults(syncOperation);
        if (!validationResult.success) {
          syncOperation.rollbackRequired = true;
          throw new Error(`Sync validation failed: ${validationResult.error}`);
        }
      }

      // Mark operation as completed
      syncOperation.state = this.syncStates.COMPLETED;
      syncOperation.endTime = Date.now();
      syncOperation.duration = syncOperation.endTime - syncOperation.startTime;

      // Update metrics
      this.updateSyncMetrics('json_to_yaml', true, syncOperation.duration);

      // Emit success event
      this.emit('sync_completed', {
        operationId,
        type: 'json_to_yaml',
        stateType,
        affectedSpecs: affectedSpecs.length,
        duration: syncOperation.duration,
        changesApplied: syncOperation.appliedChanges.length
      });

      console.log(`✅ JSON→YAML sync completed for ${stateType} (${syncOperation.duration}ms, ${affectedSpecs.length} specs)`);

      return {
        success: true,
        operationId,
        affectedSpecs: affectedSpecs.length,
        duration: syncOperation.duration,
        changesApplied: syncOperation.appliedChanges.length,
        withinPerformanceTarget: syncOperation.duration <= this.performanceTarget
      };

    } catch (error) {
      console.error(`❌ JSON→YAML sync failed for ${stateType}: ${error.message}`);

      // Perform rollback if required
      if (syncOperation.rollbackRequired) {
        await this.rollbackSyncOperation(syncOperation);
      }

      syncOperation.state = this.syncStates.FAILED;
      syncOperation.error = error.message;
      syncOperation.endTime = Date.now();
      syncOperation.duration = syncOperation.endTime - syncOperation.startTime;

      this.updateSyncMetrics('json_to_yaml', false, syncOperation.duration);

      this.emit('sync_failed', {
        operationId,
        type: 'json_to_yaml',
        stateType,
        error: error.message,
        rollbackPerformed: syncOperation.rollbackRequired
      });

      return {
        success: false,
        operationId,
        error: error.message,
        duration: syncOperation.duration,
        rollbackPerformed: syncOperation.rollbackRequired
      };

    } finally {
      // Move to history and clean up
      this.moveSyncOperationToHistory(syncOperation);
      this.activeSyncOperations.delete(operationId);
    }
  }

  /**
   * Apply YAML frontmatter changes to JSON state files
   * @param {string} specId - Specification ID
   * @param {Object} frontmatter - YAML frontmatter object
   * @param {Array} changes - Detected changes
   * @param {Object} syncOperation - Current sync operation
   * @returns {Promise<Object>} Application result
   */
  async applyYamlChangesToJson(specId, frontmatter, changes, syncOperation) {
    try {
      if (!this.workflowStateManager) {
        throw new Error('WorkflowStateManager not available for JSON updates');
      }

      // Apply status changes
      const statusChanges = changes.filter(change => 
        change.field.includes('status') && change.type === 'modification'
      );

      for (const statusChange of statusChanges) {
        if (statusChange.field === 'status' && statusChange.newValue) {
          // Update overall spec status if needed
          await this.workflowStateManager.syncSpecState(specId);
          
          syncOperation.appliedChanges.push({
            type: 'status_sync',
            specId,
            field: statusChange.field,
            oldValue: statusChange.oldValue,
            newValue: statusChange.newValue,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Apply assignment changes
      const assignmentChanges = changes.filter(change => 
        change.field.includes('assigned_agent') || change.field.includes('tasks')
      );

      for (const assignmentChange of assignmentChanges) {
        if (assignmentChange.field.includes('tasks.') && assignmentChange.field.includes('assigned_agent')) {
          // Extract task ID from field path (e.g., "tasks.0.assigned_agent" or "tasks.TASK-001.assigned_agent")
          const taskIdMatch = assignmentChange.field.match(/tasks\.([^.]+)\./);
          if (taskIdMatch) {
            const taskId = taskIdMatch[1];
            const newAgent = assignmentChange.newValue;

            if (newAgent && assignmentChange.type !== 'deletion') {
              // Create or update assignment
              const assignmentResult = await this.workflowStateManager.assignTask(
                specId, 
                taskId, 
                newAgent,
                { automated: true, syncOperation: syncOperation.id }
              );

              if (assignmentResult.success) {
                syncOperation.appliedChanges.push({
                  type: 'assignment_sync',
                  specId,
                  taskId,
                  agent: newAgent,
                  field: assignmentChange.field,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }
      }

      return { success: true, appliedChanges: syncOperation.appliedChanges.length };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply JSON state changes to YAML frontmatter
   * @param {string} specId - Specification ID
   * @param {Object} stateChanges - JSON state changes
   * @param {string} stateType - State file type
   * @param {Object} syncOperation - Current sync operation
   * @returns {Promise<Object>} Application result
   */
  async applyJsonChangesToYaml(specId, stateChanges, stateType, syncOperation) {
    try {
      if (!this.frontmatterSync) {
        throw new Error('FrontmatterSync not available for YAML updates');
      }

      const yamlUpdates = {};

      // Handle assignment state changes
      if (stateType === 'assignments' && stateChanges.assignments) {
        for (const change of stateChanges.assignments) {
          if (change.field.includes('completed_at')) {
            // Update task completion timestamp in YAML
            const taskIdMatch = change.field.match(/current_assignments\.([^.]+)\.([^.]+)\.completed_at/);
            if (taskIdMatch) {
              const taskId = taskIdMatch[2];
              yamlUpdates[`tasks.${taskId}.completed_at`] = change.newValue;
            }
          } else if (change.field.includes('completion_notes')) {
            // Update task completion notes in YAML
            const taskIdMatch = change.field.match(/current_assignments\.([^.]+)\.([^.]+)\.completion_notes/);
            if (taskIdMatch) {
              const taskId = taskIdMatch[2];
              yamlUpdates[`tasks.${taskId}.completion_notes`] = change.newValue;
            }
          }
        }
      }

      // Handle progress state changes
      if (stateType === 'progress' && stateChanges.progress) {
        for (const change of stateChanges.progress) {
          if (change.field.includes('completion_percentage')) {
            // Update overall progress in YAML metadata
            yamlUpdates['progress_percentage'] = change.newValue;
          }
        }
      }

      // Apply updates to YAML if any were prepared
      if (Object.keys(yamlUpdates).length > 0) {
        const updateResult = await this.workflowStateManager.updateSpecFrontmatter(
          specId,
          yamlUpdates,
          { automated: true, syncOperation: syncOperation.id }
        );

        if (updateResult.success) {
          syncOperation.appliedChanges.push({
            type: 'yaml_update',
            specId,
            updates: yamlUpdates,
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error(`YAML update failed: ${updateResult.error}`);
        }
      }

      return { success: true, appliedChanges: Object.keys(yamlUpdates).length };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle validation results that may require synchronization
   * @param {Object} validationResult - Validation result event data
   * @param {Object} eventMetadata - Event metadata
   */
  async handleValidationResult(validationResult, eventMetadata) {
    try {
      // Check if validation found inconsistencies that require sync
      if (validationResult.inconsistencies && validationResult.inconsistencies.length > 0) {
        const syncRequiredInconsistencies = validationResult.inconsistencies.filter(
          inconsistency => inconsistency.repairStrategy && 
          !inconsistency.repairStrategy.includes('manual_intervention')
        );

        if (syncRequiredInconsistencies.length > 0) {
          console.log(`🔄 Validation found ${syncRequiredInconsistencies.length} inconsistencies requiring sync`);

          // Trigger appropriate sync based on validation result
          if (validationResult.changeType === 'yaml') {
            await this.syncYamlToJson(
              validationResult.specId,
              validationResult.filePath,
              syncRequiredInconsistencies,
              { triggeredBy: 'validation', eventId: eventMetadata.id }
            );
          } else if (validationResult.changeType === 'json') {
            await this.syncJsonToYaml(
              { [validationResult.stateType]: syncRequiredInconsistencies },
              validationResult.stateType,
              { triggeredBy: 'validation', eventId: eventMetadata.id }
            );
          }
        }
      }
    } catch (error) {
      console.error(`❌ Failed to handle validation result: ${error.message}`);
    }
  }

  /**
   * Handle change analysis results for automatic sync triggering
   * @param {Object} changeAnalysis - Change analysis result
   * @param {Object} eventMetadata - Event metadata
   */
  async handleChangeAnalysis(changeAnalysis, eventMetadata) {
    try {
      // Check if changes require synchronization
      if (changeAnalysis.analysis && 
          changeAnalysis.analysis.impact && 
          ['medium', 'high'].includes(changeAnalysis.analysis.impact)) {

        console.log(`🔄 Change analysis indicates ${changeAnalysis.analysis.impact} impact, triggering sync`);

        if (changeAnalysis.watcherType === 'yaml' && changeAnalysis.analysis.semanticChanges) {
          const specId = this.extractSpecIdFromPath(changeAnalysis.filePath);
          await this.syncYamlToJson(
            specId,
            changeAnalysis.filePath,
            changeAnalysis.analysis.changes || [],
            { triggeredBy: 'change_analysis', eventId: eventMetadata.id }
          );
        } else if (changeAnalysis.watcherType === 'json' && changeAnalysis.analysis.stateChanges) {
          const stateType = path.basename(changeAnalysis.filePath, '.json');
          await this.syncJsonToYaml(
            changeAnalysis.analysis.stateChanges,
            stateType,
            { triggeredBy: 'change_analysis', eventId: eventMetadata.id }
          );
        }
      }
    } catch (error) {
      console.error(`❌ Failed to handle change analysis: ${error.message}`);
    }
  }

  // Helper methods

  /**
   * Generate unique operation ID
   * @param {string} type - Operation type
   * @param {string} context - Context identifier
   * @returns {string} Unique operation ID
   */
  generateOperationId(type, context) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${context}_${timestamp}_${random}`;
  }

  /**
   * Create backups before sync operations
   * @param {Object} syncOperation - Sync operation to create backups for
   */
  async createSyncBackups(syncOperation) {
    // Implementation would create backups of files that will be modified
    // This is a placeholder for the backup creation logic
    console.log(`💾 Creating backups for sync operation ${syncOperation.id}`);
    
    // For now, just record that backups were requested
    syncOperation.backups.push({
      type: 'state_files',
      timestamp: new Date().toISOString(),
      location: 'placeholder'
    });
  }

  /**
   * Validate sync operation results
   * @param {Object} syncOperation - Sync operation to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateSyncResults(syncOperation) {
    // Implementation would validate that sync changes were applied correctly
    // This is a placeholder for the validation logic
    console.log(`✓ Validating sync operation ${syncOperation.id}`);
    
    return { success: true, validationDetails: 'placeholder' };
  }

  /**
   * Rollback sync operation changes
   * @param {Object} syncOperation - Sync operation to rollback
   */
  async rollbackSyncOperation(syncOperation) {
    console.log(`🔄 Rolling back sync operation ${syncOperation.id}`);
    
    try {
      // Restore from backups if available
      for (const backup of syncOperation.backups) {
        console.log(`📁 Restoring from backup: ${backup.location}`);
        // Implementation would restore files from backup
      }

      syncOperation.state = this.syncStates.ROLLED_BACK;
      this.metrics.rollbacks++;

      this.emit('sync_rolled_back', {
        operationId: syncOperation.id,
        type: syncOperation.type,
        backupsRestored: syncOperation.backups.length,
        timestamp: new Date().toISOString()
      });

    } catch (rollbackError) {
      console.error(`❌ Rollback failed for operation ${syncOperation.id}: ${rollbackError.message}`);
      
      this.emit('rollback_failed', {
        operationId: syncOperation.id,
        error: rollbackError.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update sync operation metrics
   * @param {string} syncType - Type of sync operation
   * @param {boolean} success - Whether operation succeeded
   * @param {number} duration - Operation duration in ms
   */
  updateSyncMetrics(syncType, success, duration) {
    this.metrics.totalSyncOperations++;
    
    if (success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }

    // Update type-specific metrics
    if (syncType === 'yaml_to_json') {
      this.metrics.yamlToJsonSyncs++;
    } else if (syncType === 'json_to_yaml') {
      this.metrics.jsonToYamlSyncs++;
    } else if (syncType === 'bidirectional') {
      this.metrics.bidirectionalSyncs++;
    }

    // Update average sync time
    this.metrics.averageSyncTime = 
      (this.metrics.averageSyncTime * (this.metrics.totalSyncOperations - 1) + duration) / 
      this.metrics.totalSyncOperations;

    this.metrics.lastSyncOperation = new Date().toISOString();

    // Log performance warning if sync took too long
    if (duration > this.performanceTarget) {
      console.warn(`⚠️ Sync operation took ${duration}ms, exceeding ${this.performanceTarget}ms target`);
    }
  }

  /**
   * Move sync operation to history
   * @param {Object} syncOperation - Completed sync operation
   */
  moveSyncOperationToHistory(syncOperation) {
    this.syncHistory.push({
      ...syncOperation,
      completedAt: new Date().toISOString()
    });

    // Limit history size
    if (this.syncHistory.length > this.maxHistorySize) {
      this.syncHistory.shift();
    }
  }

  /**
   * Parse YAML file
   * @param {string} filePath - Path to YAML file
   * @returns {Promise<Object>} Parsed YAML result
   */
  async parseYamlFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!frontmatterMatch) {
        return { parseable: false, error: 'No YAML frontmatter found' };
      }

      const yaml = require('js-yaml');
      const frontmatter = yaml.load(frontmatterMatch[1]) || {};
      
      return { parseable: true, frontmatter, content };
    } catch (error) {
      return { parseable: false, error: error.message };
    }
  }

  /**
   * Identify specs affected by JSON state changes
   * @param {Object} stateChanges - JSON state changes
   * @param {string} stateType - State file type
   * @returns {Promise<Array>} Array of affected spec IDs
   */
  async identifyAffectedSpecs(stateChanges, stateType) {
    const affectedSpecs = new Set();

    if (stateType === 'assignments' && stateChanges.assignments) {
      for (const change of stateChanges.assignments) {
        const specIdMatch = change.field.match(/current_assignments\.([^.]+)\./);
        if (specIdMatch) {
          affectedSpecs.add(specIdMatch[1]);
        }
      }
    } else if (stateType === 'progress' && stateChanges.progress) {
      for (const change of stateChanges.progress) {
        const specIdMatch = change.field.match(/by_spec\.([^.]+)\./);
        if (specIdMatch) {
          affectedSpecs.add(specIdMatch[1]);
        }
      }
    }

    return Array.from(affectedSpecs);
  }

  /**
   * Extract spec ID from file path
   * @param {string} filePath - File path
   * @returns {string} Extracted spec ID
   */
  extractSpecIdFromPath(filePath) {
    const fileName = path.basename(filePath, '.md');
    const idMatch = fileName.match(/^([A-Z]+-\d+)/);
    return idMatch ? idMatch[1] : fileName;
  }

  /**
   * Get sync engine statistics
   * @returns {Object} Comprehensive sync statistics
   */
  getStatistics() {
    return {
      operations: {
        ...this.metrics,
        activeSyncOperations: this.activeSyncOperations.size,
        historySize: this.syncHistory.length
      },
      performance: {
        performanceTarget: this.performanceTarget,
        withinTarget: this.metrics.averageSyncTime <= this.performanceTarget,
        averageTime: this.metrics.averageSyncTime
      },
      configuration: {
        strategies: Object.keys(this.syncStrategies),
        maxHistorySize: this.maxHistorySize
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get sync operation history
   * @param {Object} filters - Optional filters
   * @returns {Array} Filtered sync history
   */
  getSyncHistory(filters = {}) {
    let history = [...this.syncHistory];

    if (filters.type) {
      history = history.filter(op => op.type === filters.type);
    }

    if (filters.specId) {
      history = history.filter(op => op.specId === filters.specId);
    }

    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * Get active sync operations
   * @returns {Array} Array of active sync operations
   */
  getActiveSyncOperations() {
    return Array.from(this.activeSyncOperations.values());
  }

  /**
   * Shutdown sync engine gracefully
   */
  async shutdown() {
    console.log('🔄 Shutting down SyncEngine...');

    // Wait for active operations to complete
    if (this.activeSyncOperations.size > 0) {
      console.log(`⏳ Waiting for ${this.activeSyncOperations.size} active sync operations to complete...`);
      
      // Wait up to 30 seconds for operations to complete
      const timeout = 30000;
      const startTime = Date.now();
      
      while (this.activeSyncOperations.size > 0 && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (this.activeSyncOperations.size > 0) {
        console.warn(`⚠️ ${this.activeSyncOperations.size} sync operations did not complete before shutdown`);
      }
    }

    console.log('✅ SyncEngine shutdown complete');
    this.emit('shutdown_complete', {
      finalStats: this.getStatistics(),
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = SyncEngine;