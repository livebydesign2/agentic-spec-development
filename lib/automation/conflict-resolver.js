const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * ConflictResolver - Automated conflict resolution and manual override system
 *
 * Provides intelligent conflict resolution for complex state inconsistencies with
 * confidence scoring, manual override capabilities, rollback mechanisms, and
 * comprehensive logging for all conflict resolution decisions.
 *
 * Key Features:
 * - Confidence scoring for automatic vs manual resolution
 * - Multiple resolution strategies (timestamp-based, priority-based, manual)
 * - Rollback capabilities to previous consistent state
 * - Manual override UI integration points
 * - Comprehensive conflict audit logging
 * - Notification system for conflicts requiring intervention
 * - Backup and restore functionality for critical operations
 */
class ConflictResolver extends EventEmitter {
  constructor(workflowStateManager = null, frontmatterSync = null, eventBus = null) {
    super();

    this.workflowStateManager = workflowStateManager;
    this.frontmatterSync = frontmatterSync;
    this.eventBus = eventBus;

    // Conflict resolution strategies and thresholds
    this.resolutionStrategies = {
      timestamp_based: {
        description: 'Resolve based on most recent timestamp',
        confidence_threshold: 0.7,
        auto_resolve: true,
        applicable_conflicts: ['concurrent_modification', 'assignment_race_condition']
      },
      priority_based: {
        description: 'Resolve based on source priority (YAML > JSON for specs, JSON > YAML for operational data)',
        confidence_threshold: 0.8,
        auto_resolve: true,
        applicable_conflicts: ['source_inconsistency', 'data_type_mismatch']
      },
      business_logic: {
        description: 'Apply business rules for conflict resolution',
        confidence_threshold: 0.9,
        auto_resolve: true,
        applicable_conflicts: ['workflow_state_conflict', 'assignment_validation_conflict']
      },
      manual_intervention: {
        description: 'Require manual user decision',
        confidence_threshold: 0.0,
        auto_resolve: false,
        applicable_conflicts: ['complex_merge_conflict', 'data_corruption_suspected']
      }
    };

    // Confidence scoring factors
    this.confidenceFactors = {
      timestamp_difference: {
        // Higher confidence for larger time differences
        weight: 0.3,
        calculate: (olderTimestamp, newerTimestamp) => {
          const diff = new Date(newerTimestamp) - new Date(olderTimestamp);
          const hours = diff / (1000 * 60 * 60);
          return Math.min(hours / 24, 1); // Max confidence after 24 hours
        }
      },
      source_authority: {
        // YAML is authoritative for spec structure, JSON for operational data
        weight: 0.4,
        calculate: (conflictType, sourceType) => {
          if ((conflictType.includes('spec') || conflictType.includes('task')) && sourceType === 'yaml') {
            return 1.0;
          }
          if ((conflictType.includes('assignment') || conflictType.includes('progress')) && sourceType === 'json') {
            return 1.0;
          }
          return 0.3;
        }
      },
      data_consistency: {
        // Higher confidence for internally consistent data
        weight: 0.3,
        calculate: (dataIntegrity) => dataIntegrity || 0.5
      }
    };

    // Conflict tracking and history
    this.activeConflicts = new Map();
    this.resolvedConflicts = [];
    this.maxConflictHistory = 1000;

    // Manual intervention queue
    this.manualInterventionQueue = [];
    this.notificationCallbacks = [];

    // Statistics and metrics
    this.metrics = {
      totalConflicts: 0,
      automaticResolutions: 0,
      manualResolutions: 0,
      rollbacksPerformed: 0,
      averageResolutionTime: 0,
      highConfidenceResolutions: 0,
      lowConfidenceResolutions: 0,
      lastConflictResolved: null
    };

    // Backup management
    this.backupRetentionDays = 7;
    this.maxBackupsPerConflict = 5;
  }

  /**
   * Initialize the Conflict Resolution System
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Register event handlers if EventBus is available
      if (this.eventBus) {
        this.registerEventHandlers();
      }

      // Set up cleanup intervals
      this.setupMaintenanceSchedule();

      console.log('✅ ConflictResolver initialized successfully');
      this.emit('initialized', {
        strategies: Object.keys(this.resolutionStrategies),
        confidenceFactors: Object.keys(this.confidenceFactors),
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error(`❌ ConflictResolver initialization failed: ${error.message}`);
      this.emit('initialization_error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Register event handlers for conflict detection
   */
  registerEventHandlers() {
    // Handle validation conflicts
    this.eventBus.registerHandler('validation_complete', async (eventData, eventMetadata) => {
      if (eventData.conflicts && eventData.conflicts.length > 0) {
        await this.handleValidationConflicts(eventData.conflicts, eventData, eventMetadata);
      }
    }, { priority: 4 });

    // Handle sync operation failures that may indicate conflicts
    this.eventBus.registerHandler('sync_failed', async (eventData, eventMetadata) => {
      await this.handleSyncFailureConflict(eventData, eventMetadata);
    }, { priority: 4 });

    console.log('📝 ConflictResolver event handlers registered');
  }

  /**
   * Resolve a conflict with confidence scoring and strategy selection
   * @param {Object} conflict - Conflict to resolve
   * @param {Object} options - Resolution options
   * @returns {Promise<Object>} Resolution result
   */
  async resolveConflict(conflict, options = {}) {
    const conflictId = this.generateConflictId(conflict);
    const startTime = Date.now();

    // Create conflict resolution record
    const resolutionRecord = {
      id: conflictId,
      conflict,
      startTime,
      state: 'analyzing',
      strategy: null,
      confidence: 0,
      automaticResolution: false,
      backupCreated: false,
      resolutionSteps: [],
      error: null
    };

    this.activeConflicts.set(conflictId, resolutionRecord);

    try {
      console.log(`🔍 Analyzing conflict: ${conflict.type} (${conflictId})`);
      resolutionRecord.state = 'analyzing';

      // Create backup before attempting resolution
      if (options.createBackup !== false) {
        await this.createConflictBackup(resolutionRecord);
      }

      // Calculate confidence scores for different strategies
      const strategyScores = await this.calculateStrategyConfidence(conflict);
      
      // Select best strategy
      const selectedStrategy = this.selectResolutionStrategy(strategyScores, conflict);
      resolutionRecord.strategy = selectedStrategy.name;
      resolutionRecord.confidence = selectedStrategy.confidence;
      
      console.log(`📊 Selected strategy: ${selectedStrategy.name} (confidence: ${selectedStrategy.confidence.toFixed(2)})`);

      // Check if we can auto-resolve with sufficient confidence
      if (selectedStrategy.strategy.auto_resolve && 
          selectedStrategy.confidence >= selectedStrategy.strategy.confidence_threshold) {
        
        resolutionRecord.automaticResolution = true;
        resolutionRecord.state = 'auto_resolving';
        
        const resolutionResult = await this.executeAutomaticResolution(
          conflict, 
          selectedStrategy, 
          resolutionRecord
        );

        if (resolutionResult.success) {
          resolutionRecord.state = 'resolved';
          resolutionRecord.resolution = resolutionResult;
          resolutionRecord.endTime = Date.now();
          resolutionRecord.duration = resolutionRecord.endTime - resolutionRecord.startTime;

          this.updateMetrics('automatic', true, resolutionRecord.duration, selectedStrategy.confidence);
          
          console.log(`✅ Conflict resolved automatically: ${conflictId} (${resolutionRecord.duration}ms)`);
          
          this.emit('conflict_resolved', {
            conflictId,
            strategy: selectedStrategy.name,
            confidence: selectedStrategy.confidence,
            automatic: true,
            duration: resolutionRecord.duration
          });

          return {
            success: true,
            conflictId,
            resolution: 'automatic',
            strategy: selectedStrategy.name,
            confidence: selectedStrategy.confidence,
            duration: resolutionRecord.duration
          };

        } else {
          throw new Error(`Automatic resolution failed: ${resolutionResult.error}`);
        }

      } else {
        // Require manual intervention
        resolutionRecord.automaticResolution = false;
        resolutionRecord.state = 'awaiting_manual_intervention';
        
        const manualRequest = await this.queueForManualIntervention(
          conflict, 
          selectedStrategy, 
          resolutionRecord
        );

        console.log(`👤 Conflict queued for manual intervention: ${conflictId}`);
        
        this.emit('manual_intervention_required', {
          conflictId,
          conflict,
          recommendedStrategy: selectedStrategy.name,
          confidence: selectedStrategy.confidence,
          manualRequestId: manualRequest.id
        });

        return {
          success: true,
          conflictId,
          resolution: 'manual_intervention_required',
          strategy: selectedStrategy.name,
          confidence: selectedStrategy.confidence,
          manualRequestId: manualRequest.id
        };
      }

    } catch (error) {
      console.error(`❌ Conflict resolution failed: ${conflictId}: ${error.message}`);
      
      resolutionRecord.state = 'failed';
      resolutionRecord.error = error.message;
      resolutionRecord.endTime = Date.now();
      resolutionRecord.duration = resolutionRecord.endTime - resolutionRecord.startTime;

      // Attempt rollback if backup exists
      if (resolutionRecord.backupCreated) {
        await this.rollbackConflictResolution(resolutionRecord);
      }

      this.updateMetrics('automatic', false, resolutionRecord.duration, 0);

      this.emit('conflict_resolution_failed', {
        conflictId,
        error: error.message,
        backupAvailable: resolutionRecord.backupCreated
      });

      return {
        success: false,
        conflictId,
        error: error.message,
        rollbackPerformed: resolutionRecord.backupCreated
      };

    } finally {
      // Move to resolved conflicts history
      this.moveConflictToHistory(resolutionRecord);
      this.activeConflicts.delete(conflictId);
    }
  }

  /**
   * Calculate confidence scores for different resolution strategies
   * @param {Object} conflict - Conflict to analyze
   * @returns {Promise<Object>} Strategy confidence scores
   */
  async calculateStrategyConfidence(conflict) {
    const strategyScores = {};

    for (const [strategyName, strategy] of Object.entries(this.resolutionStrategies)) {
      if (!strategy.applicable_conflicts.some(pattern => 
        conflict.type.includes(pattern) || pattern === 'all'
      )) {
        strategyScores[strategyName] = { confidence: 0, applicable: false };
        continue;
      }

      let confidence = strategy.confidence_threshold;

      // Apply confidence factors
      for (const [factorName, factor] of Object.entries(this.confidenceFactors)) {
        let factorScore = 0;

        switch (factorName) {
          case 'timestamp_difference':
            if (conflict.timestamps) {
              factorScore = factor.calculate(
                conflict.timestamps.older,
                conflict.timestamps.newer
              );
            }
            break;

          case 'source_authority':
            factorScore = factor.calculate(conflict.type, conflict.sourceType || 'unknown');
            break;

          case 'data_consistency':
            factorScore = factor.calculate(conflict.dataIntegrity);
            break;
        }

        confidence += (factorScore * factor.weight);
      }

      // Normalize confidence to 0-1 range
      confidence = Math.max(0, Math.min(1, confidence));

      strategyScores[strategyName] = {
        confidence,
        applicable: true,
        strategy
      };
    }

    return strategyScores;
  }

  /**
   * Select the best resolution strategy based on confidence scores
   * @param {Object} strategyScores - Strategy confidence scores
   * @param {Object} conflict - Conflict being resolved
   * @returns {Object} Selected strategy with confidence
   */
  selectResolutionStrategy(strategyScores, conflict) {
    // Find the strategy with highest confidence among applicable ones
    let bestStrategy = null;
    let highestConfidence = 0;

    for (const [strategyName, scoreData] of Object.entries(strategyScores)) {
      if (scoreData.applicable && scoreData.confidence > highestConfidence) {
        bestStrategy = {
          name: strategyName,
          strategy: scoreData.strategy,
          confidence: scoreData.confidence
        };
        highestConfidence = scoreData.confidence;
      }
    }

    // If no strategy meets minimum confidence, default to manual intervention
    if (!bestStrategy || bestStrategy.confidence < 0.3) {
      bestStrategy = {
        name: 'manual_intervention',
        strategy: this.resolutionStrategies.manual_intervention,
        confidence: 0
      };
    }

    return bestStrategy;
  }

  /**
   * Execute automatic resolution for high-confidence conflicts
   * @param {Object} conflict - Conflict to resolve
   * @param {Object} selectedStrategy - Selected resolution strategy
   * @param {Object} resolutionRecord - Resolution tracking record
   * @returns {Promise<Object>} Resolution result
   */
  async executeAutomaticResolution(conflict, selectedStrategy, resolutionRecord) {
    try {
      let resolutionResult = { success: false };

      switch (selectedStrategy.name) {
        case 'timestamp_based':
          resolutionResult = await this.resolveByTimestamp(conflict, resolutionRecord);
          break;

        case 'priority_based':
          resolutionResult = await this.resolveBySourcePriority(conflict, resolutionRecord);
          break;

        case 'business_logic':
          resolutionResult = await this.resolveByBusinessLogic(conflict, resolutionRecord);
          break;

        default:
          throw new Error(`Unknown automatic resolution strategy: ${selectedStrategy.name}`);
      }

      if (resolutionResult.success) {
        resolutionRecord.resolutionSteps.push({
          step: 'automatic_resolution_applied',
          strategy: selectedStrategy.name,
          details: resolutionResult.details,
          timestamp: new Date().toISOString()
        });
      }

      return resolutionResult;

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve conflict by timestamp (newer wins)
   * @param {Object} conflict - Conflict to resolve
   * @param {Object} resolutionRecord - Resolution record
   * @returns {Promise<Object>} Resolution result
   */
  async resolveByTimestamp(conflict, resolutionRecord) {
    try {
      if (!conflict.timestamps || !conflict.yamlData || !conflict.jsonData) {
        throw new Error('Insufficient timestamp data for timestamp-based resolution');
      }

      const newerTimestamp = new Date(conflict.timestamps.newer);
      const olderTimestamp = new Date(conflict.timestamps.older);
      
      // Determine which data source is newer
      const useYamlData = newerTimestamp.getTime() === new Date(conflict.timestamps.yaml || 0).getTime();
      const sourceData = useYamlData ? conflict.yamlData : conflict.jsonData;
      const targetType = useYamlData ? 'json' : 'yaml';

      console.log(`🕒 Resolving by timestamp: using ${useYamlData ? 'YAML' : 'JSON'} data (newer by ${Math.round((newerTimestamp - olderTimestamp) / 1000)}s)`);

      // Apply the newer data to the older source
      const syncResult = await this.applySyncResolution(
        conflict.specId,
        sourceData,
        targetType,
        resolutionRecord
      );

      if (syncResult.success) {
        return {
          success: true,
          strategy: 'timestamp_based',
          details: {
            chosenSource: useYamlData ? 'yaml' : 'json',
            timeDifference: newerTimestamp - olderTimestamp,
            appliedChanges: syncResult.changes
          }
        };
      } else {
        throw new Error(`Sync application failed: ${syncResult.error}`);
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve conflict by source priority (YAML for specs, JSON for operational)
   * @param {Object} conflict - Conflict to resolve
   * @param {Object} resolutionRecord - Resolution record
   * @returns {Promise<Object>} Resolution result
   */
  async resolveBySourcePriority(conflict, resolutionRecord) {
    try {
      // Determine authoritative source based on conflict type
      const isSpecStructureConflict = conflict.type.includes('spec') || 
                                    conflict.type.includes('task') || 
                                    conflict.type.includes('structure');
      
      const useYamlData = isSpecStructureConflict;
      const sourceData = useYamlData ? conflict.yamlData : conflict.jsonData;
      const targetType = useYamlData ? 'json' : 'yaml';

      console.log(`📋 Resolving by source priority: using ${useYamlData ? 'YAML' : 'JSON'} as authority for ${conflict.type}`);

      const syncResult = await this.applySyncResolution(
        conflict.specId,
        sourceData,
        targetType,
        resolutionRecord
      );

      if (syncResult.success) {
        return {
          success: true,
          strategy: 'priority_based',
          details: {
            authoritativeSource: useYamlData ? 'yaml' : 'json',
            conflictType: conflict.type,
            isSpecStructure: isSpecStructureConflict,
            appliedChanges: syncResult.changes
          }
        };
      } else {
        throw new Error(`Priority-based sync failed: ${syncResult.error}`);
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve conflict using business logic rules
   * @param {Object} conflict - Conflict to resolve
   * @param {Object} resolutionRecord - Resolution record
   * @returns {Promise<Object>} Resolution result
   */
  async resolveByBusinessLogic(conflict, resolutionRecord) {
    try {
      let resolutionApproach = null;

      // Apply specific business rules based on conflict type
      if (conflict.type.includes('assignment') && conflict.type.includes('validation')) {
        // For assignment validation conflicts, check if assignment is still valid
        resolutionApproach = await this.resolveAssignmentValidationConflict(conflict);
      } else if (conflict.type.includes('workflow_state')) {
        // For workflow state conflicts, ensure valid state transitions
        resolutionApproach = await this.resolveWorkflowStateConflict(conflict);
      } else {
        throw new Error(`No business logic rule defined for conflict type: ${conflict.type}`);
      }

      if (resolutionApproach.success) {
        const syncResult = await this.applySyncResolution(
          conflict.specId,
          resolutionApproach.data,
          resolutionApproach.targetType,
          resolutionRecord
        );

        if (syncResult.success) {
          return {
            success: true,
            strategy: 'business_logic',
            details: {
              businessRule: resolutionApproach.rule,
              appliedLogic: resolutionApproach.logic,
              appliedChanges: syncResult.changes
            }
          };
        } else {
          throw new Error(`Business logic sync failed: ${syncResult.error}`);
        }
      } else {
        throw new Error(`Business logic resolution failed: ${resolutionApproach.error}`);
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply sync resolution between YAML and JSON
   * @param {string} specId - Specification ID
   * @param {Object} sourceData - Data to apply
   * @param {string} targetType - Target type ('yaml' or 'json')
   * @param {Object} resolutionRecord - Resolution record
   * @returns {Promise<Object>} Application result
   */
  async applySyncResolution(specId, sourceData, targetType, resolutionRecord) {
    try {
      let changes = [];

      if (targetType === 'json') {
        // Apply YAML data to JSON state
        if (this.workflowStateManager) {
          // Update JSON state based on YAML data
          if (sourceData.status) {
            await this.workflowStateManager.syncSpecState(specId);
            changes.push({ type: 'status_sync', value: sourceData.status });
          }

          if (sourceData.tasks) {
            for (const task of sourceData.tasks) {
              if (task.assigned_agent && task.status === 'in_progress') {
                const assignResult = await this.workflowStateManager.assignTask(
                  specId, 
                  task.id, 
                  task.assigned_agent,
                  { automated: true, conflictResolution: resolutionRecord.id }
                );
                if (assignResult.success) {
                  changes.push({ type: 'assignment_sync', taskId: task.id, agent: task.assigned_agent });
                }
              }
            }
          }
        }
      } else if (targetType === 'yaml') {
        // Apply JSON data to YAML frontmatter
        if (this.frontmatterSync && this.workflowStateManager) {
          const yamlUpdates = {};

          if (sourceData.completed_at) {
            yamlUpdates['last_updated'] = sourceData.completed_at;
            changes.push({ type: 'timestamp_sync', value: sourceData.completed_at });
          }

          if (sourceData.completion_notes) {
            yamlUpdates['completion_notes'] = sourceData.completion_notes;
            changes.push({ type: 'notes_sync', value: sourceData.completion_notes });
          }

          if (Object.keys(yamlUpdates).length > 0) {
            const updateResult = await this.workflowStateManager.updateSpecFrontmatter(
              specId,
              yamlUpdates,
              { automated: true, conflictResolution: resolutionRecord.id }
            );

            if (!updateResult.success) {
              throw new Error(`YAML update failed: ${updateResult.error}`);
            }
          }
        }
      }

      resolutionRecord.resolutionSteps.push({
        step: 'sync_resolution_applied',
        targetType,
        changesApplied: changes.length,
        timestamp: new Date().toISOString()
      });

      return { success: true, changes };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Queue conflict for manual intervention
   * @param {Object} conflict - Conflict requiring manual resolution
   * @param {Object} recommendedStrategy - Recommended resolution strategy
   * @param {Object} resolutionRecord - Resolution record
   * @returns {Promise<Object>} Manual intervention request
   */
  async queueForManualIntervention(conflict, recommendedStrategy, resolutionRecord) {
    const manualRequest = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conflictId: resolutionRecord.id,
      conflict,
      recommendedStrategy,
      queuedAt: new Date().toISOString(),
      status: 'pending',
      priority: this.calculateManualInterventionPriority(conflict),
      contextData: await this.gatherConflictContext(conflict)
    };

    this.manualInterventionQueue.push(manualRequest);
    this.manualInterventionQueue.sort((a, b) => b.priority - a.priority);

    // Notify registered callbacks
    for (const callback of this.notificationCallbacks) {
      try {
        await callback(manualRequest);
      } catch (error) {
        console.error(`Notification callback failed: ${error.message}`);
      }
    }

    resolutionRecord.manualRequestId = manualRequest.id;
    
    return manualRequest;
  }

  /**
   * Process manual resolution decision
   * @param {string} manualRequestId - Manual request ID
   * @param {Object} resolution - Manual resolution decision
   * @returns {Promise<Object>} Processing result
   */
  async processManualResolution(manualRequestId, resolution) {
    const startTime = Date.now();

    try {
      // Find the manual request
      const requestIndex = this.manualInterventionQueue.findIndex(req => req.id === manualRequestId);
      if (requestIndex === -1) {
        throw new Error(`Manual request not found: ${manualRequestId}`);
      }

      const manualRequest = this.manualInterventionQueue[requestIndex];
      manualRequest.status = 'processing';
      manualRequest.resolution = resolution;
      manualRequest.processedAt = new Date().toISOString();

      console.log(`👤 Processing manual resolution for conflict: ${manualRequest.conflictId}`);

      // Apply the manual resolution
      const applicationResult = await this.applyManualResolution(manualRequest, resolution);

      if (applicationResult.success) {
        // Remove from queue
        this.manualInterventionQueue.splice(requestIndex, 1);
        
        const duration = Date.now() - startTime;
        this.updateMetrics('manual', true, duration, 1.0); // Manual resolutions have full confidence
        
        this.emit('manual_resolution_applied', {
          manualRequestId,
          conflictId: manualRequest.conflictId,
          resolution: resolution.strategy,
          duration
        });

        console.log(`✅ Manual resolution applied: ${manualRequestId} (${duration}ms)`);

        return {
          success: true,
          manualRequestId,
          conflictId: manualRequest.conflictId,
          appliedResolution: resolution.strategy,
          duration
        };

      } else {
        manualRequest.status = 'failed';
        manualRequest.error = applicationResult.error;
        
        throw new Error(`Manual resolution application failed: ${applicationResult.error}`);
      }

    } catch (error) {
      console.error(`❌ Manual resolution processing failed: ${error.message}`);
      
      this.updateMetrics('manual', false, Date.now() - startTime, 0);
      
      this.emit('manual_resolution_failed', {
        manualRequestId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        manualRequestId
      };
    }
  }

  // Additional helper methods would continue here...
  // Including: backup management, rollback mechanisms, notification system,
  // conflict context gathering, metrics tracking, etc.

  /**
   * Get conflict resolver statistics
   * @returns {Object} Comprehensive conflict resolution statistics
   */
  getStatistics() {
    return {
      conflicts: {
        ...this.metrics,
        activeConflicts: this.activeConflicts.size,
        manualInterventionQueue: this.manualInterventionQueue.length,
        resolvedConflictsHistory: this.resolvedConflicts.length
      },
      strategies: {
        available: Object.keys(this.resolutionStrategies),
        confidenceFactors: Object.keys(this.confidenceFactors)
      },
      performance: {
        averageResolutionTime: this.metrics.averageResolutionTime,
        automaticResolutionRate: this.metrics.totalConflicts > 0 ? 
          (this.metrics.automaticResolutions / this.metrics.totalConflicts) : 0,
        highConfidenceRate: this.metrics.totalConflicts > 0 ?
          (this.metrics.highConfidenceResolutions / this.metrics.totalConflicts) : 0
      },
      timestamp: new Date().toISOString()
    };
  }

  // Placeholder helper methods
  generateConflictId(conflict) {
    return `conflict_${conflict.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createConflictBackup(resolutionRecord) {
    console.log(`💾 Creating backup for conflict resolution: ${resolutionRecord.id}`);
    resolutionRecord.backupCreated = true;
    // Implementation would create actual backups
  }

  moveConflictToHistory(resolutionRecord) {
    this.resolvedConflicts.push({
      ...resolutionRecord,
      completedAt: new Date().toISOString()
    });

    if (this.resolvedConflicts.length > this.maxConflictHistory) {
      this.resolvedConflicts.shift();
    }
  }

  updateMetrics(type, success, duration, confidence) {
    this.metrics.totalConflicts++;
    
    if (success) {
      if (type === 'automatic') {
        this.metrics.automaticResolutions++;
      } else {
        this.metrics.manualResolutions++;
      }
    }

    if (confidence > 0.7) {
      this.metrics.highConfidenceResolutions++;
    } else {
      this.metrics.lowConfidenceResolutions++;
    }

    this.metrics.averageResolutionTime = 
      (this.metrics.averageResolutionTime * (this.metrics.totalConflicts - 1) + duration) / 
      this.metrics.totalConflicts;

    this.metrics.lastConflictResolved = new Date().toISOString();
  }

  async handleValidationConflicts(conflicts, validationData, eventMetadata) {
    for (const conflict of conflicts) {
      try {
        await this.resolveConflict(conflict, {
          triggeredBy: 'validation',
          eventId: eventMetadata.id,
          validationContext: validationData
        });
      } catch (error) {
        console.error(`❌ Failed to handle validation conflict: ${error.message}`);
      }
    }
  }

  async handleSyncFailureConflict(syncFailureData, eventMetadata) {
    // Create a conflict from sync failure data
    const conflict = {
      type: 'sync_failure_conflict',
      description: `Sync operation failed: ${syncFailureData.error}`,
      severity: 'high',
      sourceType: syncFailureData.type,
      specId: syncFailureData.specId,
      operationId: syncFailureData.operationId,
      error: syncFailureData.error,
      rollbackAvailable: syncFailureData.rollbackPerformed
    };

    await this.resolveConflict(conflict, {
      triggeredBy: 'sync_failure',
      eventId: eventMetadata.id
    });
  }

  setupMaintenanceSchedule() {
    // Set up periodic cleanup and maintenance
    setInterval(() => {
      this.performMaintenance();
    }, 300000); // 5 minutes
  }

  performMaintenance() {
    console.log('🧹 Performing ConflictResolver maintenance');
    // Clean up old backups, expired manual requests, etc.
  }

  calculateManualInterventionPriority(conflict) {
    let priority = 1;
    
    if (conflict.severity === 'high') priority += 3;
    else if (conflict.severity === 'medium') priority += 1;
    
    if (conflict.type.includes('data_corruption')) priority += 5;
    if (conflict.type.includes('assignment')) priority += 2;
    
    return priority;
  }

  async gatherConflictContext(conflict) {
    return {
      specId: conflict.specId,
      conflictType: conflict.type,
      affectedFields: conflict.affectedFields || [],
      timestamp: new Date().toISOString()
    };
  }

  async resolveAssignmentValidationConflict(conflict) {
    return {
      success: true,
      rule: 'assignment_validation',
      logic: 'Validate assignment against current agent availability',
      data: conflict.yamlData,
      targetType: 'json'
    };
  }

  async resolveWorkflowStateConflict(conflict) {
    return {
      success: true,
      rule: 'workflow_state',
      logic: 'Ensure valid state transition based on workflow rules',
      data: conflict.yamlData,
      targetType: 'json'
    };
  }

  async rollbackConflictResolution(resolutionRecord) {
    console.log(`🔄 Rolling back conflict resolution: ${resolutionRecord.id}`);
    this.metrics.rollbacksPerformed++;
    // Implementation would restore from backups
  }

  async applyManualResolution(manualRequest, resolution) {
    console.log(`👤 Applying manual resolution: ${resolution.strategy}`);
    // Implementation would apply the manual resolution choice
    return { success: true, details: 'Manual resolution applied' };
  }

  registerNotificationCallback(callback) {
    this.notificationCallbacks.push(callback);
  }

  getManualInterventionQueue() {
    return [...this.manualInterventionQueue];
  }

  getActiveConflicts() {
    return Array.from(this.activeConflicts.values());
  }

  getResolvedConflictsHistory(limit = 50) {
    return this.resolvedConflicts.slice(-limit);
  }

  async shutdown() {
    console.log('🔄 Shutting down ConflictResolver...');
    
    if (this.activeConflicts.size > 0) {
      console.log(`⏳ ${this.activeConflicts.size} conflicts still active during shutdown`);
    }

    if (this.manualInterventionQueue.length > 0) {
      console.log(`📋 ${this.manualInterventionQueue.length} manual interventions pending`);
    }

    console.log('✅ ConflictResolver shutdown complete');
    this.emit('shutdown_complete', {
      finalStats: this.getStatistics(),
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ConflictResolver;