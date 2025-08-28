const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const EventEmitter = require('events');

/**
 * ChangeDetector - Intelligent change analysis for YAML frontmatter and JSON state
 *
 * Provides detailed change analysis, conflict detection, and semantic understanding
 * of file modifications for the automated state synchronization system.
 *
 * Key Features:
 * - Deep diff analysis for YAML frontmatter changes
 * - JSON state change detection with field-level granularity
 * - Conflict detection between concurrent modifications
 * - Semantic change classification (status, assignment, metadata)
 * - Change impact analysis for downstream systems
 * - Performance monitoring for <100ms processing time
 */
class ChangeDetector extends EventEmitter {
  constructor(configManager = null) {
    super();

    this.configManager = configManager;
    this.performanceTarget = 100; // <100ms processing requirement

    // Cache for previous file states to enable diff analysis
    this.fileStateCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes cache timeout

    // Change classification patterns
    this.changePatterns = {
      status: /status\s*:\s*['"]?([^'"\n]+)['"]?/,
      assignment: /assigned_agent\s*:\s*['"]?([^'"\n]+)['"]?/,
      priority: /priority\s*:\s*['"]?([^'"\n]+)['"]?/,
      tasks: /tasks\s*:/,
      progress: /(completed|in_progress|ready|blocked)/i
    };

    // Statistics tracking
    this.stats = {
      totalChanges: 0,
      yamlChanges: 0,
      jsonChanges: 0,
      conflictsDetected: 0,
      averageProcessingTime: 0,
      lastProcessedChange: null
    };
  }

  /**
   * Initialize change detector
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      // Set up cache cleanup interval
      this.cacheCleanupInterval = setInterval(() => {
        this.cleanupCache();
      }, 60000); // Cleanup every minute

      console.log('✅ ChangeDetector initialized successfully');
      return true;
    } catch (error) {
      console.error(`❌ ChangeDetector initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Process file change event from FileWatchers
   * @param {Object} changePayload - Structured change payload from FileWatchers
   * @returns {Promise<Object>} Enhanced change analysis
   */
  async processChange(changePayload) {
    const startTime = Date.now();

    try {
      this.stats.totalChanges++;
      this.stats.lastProcessedChange = new Date().toISOString();

      // Route to appropriate processor based on file type
      let analysisResult;
      if (changePayload.watcherType === 'yaml') {
        analysisResult = await this.processYamlChange(changePayload);
        this.stats.yamlChanges++;
      } else if (changePayload.watcherType === 'json') {
        analysisResult = await this.processJsonChange(changePayload);
        this.stats.jsonChanges++;
      } else {
        throw new Error(`Unsupported watcher type: ${changePayload.watcherType}`);
      }

      // Add processing performance data
      const processingTime = Date.now() - startTime;
      analysisResult.processing = {
        timeMs: processingTime,
        withinTarget: processingTime <= this.performanceTarget,
        target: this.performanceTarget
      };

      // Update performance statistics
      this.stats.averageProcessingTime =
        (this.stats.averageProcessingTime * (this.stats.totalChanges - 1) + processingTime) /
        this.stats.totalChanges;

      // Log performance warning if processing took too long
      if (processingTime > this.performanceTarget) {
        console.warn(`⚠️ Change processing took ${processingTime}ms, exceeding ${this.performanceTarget}ms target`);
      }

      // Emit enhanced change event
      this.emit('change_analyzed', analysisResult);

      return analysisResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error(`❌ Change processing failed: ${error.message}`);

      const errorResult = {
        ...changePayload,
        analysis: {
          success: false,
          error: error.message,
          changeType: 'unknown',
          changes: [],
          conflicts: [],
          impact: 'unknown'
        },
        processing: {
          timeMs: processingTime,
          withinTarget: false,
          target: this.performanceTarget,
          error: true
        }
      };

      this.emit('processing_error', errorResult);
      return errorResult;
    }
  }

  /**
   * Process YAML frontmatter changes with deep analysis
   * @param {Object} changePayload - Change payload for YAML file
   * @returns {Promise<Object>} YAML change analysis
   */
  async processYamlChange(changePayload) {
    const { filePath, changeType } = changePayload;

    // Get cached previous state
    const previousState = this.fileStateCache.get(filePath);

    // Build analysis result structure
    const analysis = {
      success: true,
      changeType: 'yaml_frontmatter',
      changes: [],
      conflicts: [],
      impact: 'none',
      semanticChanges: {
        statusChange: null,
        assignmentChange: null,
        priorityChange: null,
        taskChanges: [],
        metadataChanges: []
      }
    };

    try {
      if (changeType === 'delete') {
        analysis.changeType = 'yaml_deleted';
        analysis.impact = 'high';
        analysis.changes = [{
          field: 'file_existence',
          type: 'deletion',
          oldValue: 'exists',
          newValue: 'deleted',
          timestamp: changePayload.timestamp
        }];
      } else {
        // Parse current file state
        const currentState = await this.parseYamlFile(filePath);

        // Update cache with current state
        this.updateFileCache(filePath, currentState);

        // Perform diff analysis if we have previous state
        if (previousState && previousState.parseable && currentState.parseable) {
          analysis.changes = await this.diffYamlStates(previousState, currentState);
          analysis.conflicts = await this.detectYamlConflicts(analysis.changes, changePayload);
        } else if (currentState.parseable) {
          // First time seeing this file or previous state was unparseable
          analysis.changeType = currentState.frontmatter ? 'yaml_structure_available' : 'yaml_added';
          analysis.changes = await this.extractInitialYamlState(currentState);
        }

        // Classify semantic changes
        await this.classifyYamlChanges(analysis, currentState);

        // Determine impact level
        analysis.impact = this.assessYamlImpact(analysis.changes, analysis.semanticChanges);
      }

      // Conflict detection
      if (analysis.conflicts.length > 0) {
        this.stats.conflictsDetected++;
        console.warn(`⚠️ ${analysis.conflicts.length} conflicts detected in ${path.basename(filePath)}`);
      }

      return {
        ...changePayload,
        analysis
      };

    } catch (error) {
      analysis.success = false;
      analysis.error = error.message;
      analysis.impact = 'error';

      return {
        ...changePayload,
        analysis
      };
    }
  }

  /**
   * Process JSON state file changes
   * @param {Object} changePayload - Change payload for JSON file
   * @returns {Promise<Object>} JSON change analysis
   */
  async processJsonChange(changePayload) {
    const { filePath, changeType } = changePayload;

    // Get cached previous state
    const previousState = this.fileStateCache.get(filePath);

    // Build analysis result structure
    const analysis = {
      success: true,
      changeType: 'json_state',
      changes: [],
      conflicts: [],
      impact: 'none',
      stateChanges: {
        assignments: null,
        progress: null,
        handoffs: null,
        metadata: null
      }
    };

    try {
      if (changeType === 'delete') {
        analysis.changeType = 'json_deleted';
        analysis.impact = 'high';
        analysis.changes = [{
          field: 'file_existence',
          type: 'deletion',
          oldValue: 'exists',
          newValue: 'deleted',
          timestamp: changePayload.timestamp
        }];
      } else {
        // Parse current JSON state
        const currentState = await this.parseJsonFile(filePath);

        // Update cache with current state
        this.updateFileCache(filePath, currentState);

        // Perform diff analysis if we have previous state
        if (previousState && previousState.parseable && currentState.parseable) {
          analysis.changes = await this.diffJsonStates(previousState, currentState);
          analysis.conflicts = await this.detectJsonConflicts(analysis.changes, changePayload);
        } else if (currentState.parseable) {
          // First time seeing this file or previous state was unparseable
          analysis.changeType = 'json_structure_available';
          analysis.changes = await this.extractInitialJsonState(currentState);
        }

        // Classify state changes by type
        await this.classifyJsonChanges(analysis, currentState, filePath);

        // Determine impact level
        analysis.impact = this.assessJsonImpact(analysis.changes, analysis.stateChanges);
      }

      return {
        ...changePayload,
        analysis
      };

    } catch (error) {
      analysis.success = false;
      analysis.error = error.message;
      analysis.impact = 'error';

      return {
        ...changePayload,
        analysis
      };
    }
  }

  /**
   * Parse YAML file and extract frontmatter structure
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
          error: 'No YAML frontmatter found'
        };
      }

      try {
        const frontmatter = yaml.load(frontmatterMatch[1]) || {};
        return {
          parseable: true,
          content,
          frontmatter,
          yamlContent: frontmatterMatch[1],
          parsedAt: new Date().toISOString()
        };
      } catch (yamlError) {
        return {
          parseable: false,
          content,
          frontmatter: null,
          yamlContent: frontmatterMatch[1],
          error: `YAML parsing error: ${yamlError.message}`
        };
      }

    } catch (error) {
      return {
        parseable: false,
        content: null,
        frontmatter: null,
        error: `File read error: ${error.message}`
      };
    }
  }

  /**
   * Parse JSON state file
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
          parsedAt: new Date().toISOString()
        };
      } catch (jsonError) {
        return {
          parseable: false,
          content,
          data: null,
          error: `JSON parsing error: ${jsonError.message}`
        };
      }

    } catch (error) {
      return {
        parseable: false,
        content: null,
        data: null,
        error: `File read error: ${error.message}`
      };
    }
  }

  /**
   * Perform deep diff between YAML states
   * @param {Object} previousState - Previous YAML state
   * @param {Object} currentState - Current YAML state
   * @returns {Promise<Array>} Array of detected changes
   */
  async diffYamlStates(previousState, currentState) {
    const changes = [];

    if (!previousState.frontmatter || !currentState.frontmatter) {
      return changes;
    }

    // Deep comparison of frontmatter objects
    const diffs = this.deepObjectDiff(
      previousState.frontmatter,
      currentState.frontmatter,
      'frontmatter'
    );

    return diffs.map(diff => ({
      ...diff,
      timestamp: new Date().toISOString(),
      changeSource: 'yaml_frontmatter'
    }));
  }

  /**
   * Perform deep diff between JSON states
   * @param {Object} previousState - Previous JSON state
   * @param {Object} currentState - Current JSON state
   * @returns {Promise<Array>} Array of detected changes
   */
  async diffJsonStates(previousState, currentState) {
    const changes = [];

    if (!previousState.data || !currentState.data) {
      return changes;
    }

    // Deep comparison of JSON data objects
    const diffs = this.deepObjectDiff(
      previousState.data,
      currentState.data,
      'json_state'
    );

    return diffs.map(diff => ({
      ...diff,
      timestamp: new Date().toISOString(),
      changeSource: 'json_state'
    }));
  }

  /**
   * Perform deep object comparison and return differences
   * @param {Object} oldObj - Previous object state
   * @param {Object} newObj - Current object state
   * @param {string} prefix - Field path prefix
   * @returns {Array} Array of differences
   */
  deepObjectDiff(oldObj, newObj, prefix = '') {
    const diffs = [];

    // Get all unique keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {})
    ]);

    for (const key of allKeys) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldObj ? oldObj[key] : undefined;
      const newValue = newObj ? newObj[key] : undefined;

      if (oldValue === undefined && newValue !== undefined) {
        // Field added
        diffs.push({
          field: fieldPath,
          type: 'addition',
          oldValue: undefined,
          newValue: this.serializeValue(newValue)
        });
      } else if (oldValue !== undefined && newValue === undefined) {
        // Field removed
        diffs.push({
          field: fieldPath,
          type: 'deletion',
          oldValue: this.serializeValue(oldValue),
          newValue: undefined
        });
      } else if (oldValue !== newValue) {
        if (this.isObject(oldValue) && this.isObject(newValue)) {
          // Recursively diff nested objects
          diffs.push(...this.deepObjectDiff(oldValue, newValue, fieldPath));
        } else {
          // Field modified
          diffs.push({
            field: fieldPath,
            type: 'modification',
            oldValue: this.serializeValue(oldValue),
            newValue: this.serializeValue(newValue)
          });
        }
      }
    }

    return diffs;
  }

  /**
   * Classify YAML changes into semantic categories
   * @param {Object} analysis - Analysis object to update
   * @param {Object} currentState - Current YAML state
   */
  async classifyYamlChanges(analysis, _currentState) {
    const { changes } = analysis;

    for (const change of changes) {
      const { field, type, oldValue, newValue } = change;

      // Status changes
      if (field.includes('status')) {
        analysis.semanticChanges.statusChange = {
          type,
          field,
          oldStatus: oldValue,
          newStatus: newValue,
          isWorkflowChange: this.isWorkflowStatusChange(oldValue, newValue)
        };
      }

      // Assignment changes
      if (field.includes('assigned_agent') || field.includes('agent')) {
        analysis.semanticChanges.assignmentChange = {
          type,
          field,
          oldAgent: oldValue,
          newAgent: newValue,
          isHandoff: oldValue && newValue && oldValue !== newValue
        };
      }

      // Priority changes
      if (field.includes('priority')) {
        analysis.semanticChanges.priorityChange = {
          type,
          field,
          oldPriority: oldValue,
          newPriority: newValue,
          priorityEscalation: this.isPriorityEscalation(oldValue, newValue)
        };
      }

      // Task-related changes
      if (field.includes('tasks') || field.includes('task')) {
        analysis.semanticChanges.taskChanges.push({
          type,
          field,
          oldValue,
          newValue,
          taskId: this.extractTaskIdFromField(field)
        });
      }

      // Metadata changes
      if (this.isMetadataField(field)) {
        analysis.semanticChanges.metadataChanges.push({
          type,
          field,
          oldValue,
          newValue,
          isAutomated: field.includes('last_updated') || field.includes('timestamp')
        });
      }
    }
  }

  /**
   * Classify JSON state changes by state type
   * @param {Object} analysis - Analysis object to update
   * @param {Object} currentState - Current JSON state
   * @param {string} filePath - File path for context
   */
  async classifyJsonChanges(analysis, currentState, filePath) {
    const stateType = path.basename(filePath, '.json');
    const { changes } = analysis;

    // Initialize state change tracking for this file type
    analysis.stateChanges[stateType] = {
      changeCount: changes.length,
      significantChanges: [],
      automatedChanges: []
    };

    for (const change of changes) {
      const { field, type, oldValue, newValue } = change;

      // Classify as significant or automated change
      if (this.isSignificantStateChange(field, type, oldValue, newValue)) {
        analysis.stateChanges[stateType].significantChanges.push({
          field,
          type,
          oldValue,
          newValue,
          reason: this.getSignificanceReason(field, type)
        });
      } else {
        analysis.stateChanges[stateType].automatedChanges.push({
          field,
          type,
          oldValue,
          newValue
        });
      }
    }
  }

  /**
   * Assess impact level of YAML changes
   * @param {Array} changes - Detected changes
   * @param {Object} semanticChanges - Classified semantic changes
   * @returns {string} Impact level (low/medium/high)
   */
  assessYamlImpact(changes, semanticChanges) {
    // High impact criteria
    if (semanticChanges.statusChange && semanticChanges.statusChange.isWorkflowChange) {
      return 'high';
    }

    if (semanticChanges.assignmentChange && semanticChanges.assignmentChange.isHandoff) {
      return 'high';
    }

    if (semanticChanges.priorityChange && semanticChanges.priorityChange.priorityEscalation) {
      return 'high';
    }

    // Medium impact criteria
    if (semanticChanges.taskChanges.length > 0) {
      return 'medium';
    }

    if (changes.length > 5) {
      return 'medium';
    }

    // Low impact (metadata, minor changes)
    return changes.length > 0 ? 'low' : 'none';
  }

  /**
   * Assess impact level of JSON state changes
   * @param {Array} changes - Detected changes
   * @param {Object} stateChanges - Classified state changes
   * @returns {string} Impact level (low/medium/high)
   */
  assessJsonImpact(changes, stateChanges) {
    let significantChangeCount = 0;

    for (const stateType in stateChanges) {
      if (stateChanges[stateType]) {
        significantChangeCount += stateChanges[stateType].significantChanges.length;
      }
    }

    // High impact: Many significant changes or critical state modifications
    if (significantChangeCount > 3) {
      return 'high';
    }

    // Medium impact: Some significant changes
    if (significantChangeCount > 0) {
      return 'medium';
    }

    // Low impact: Only automated changes
    return changes.length > 0 ? 'low' : 'none';
  }

  /**
   * Detect conflicts in YAML changes
   * @param {Array} changes - Detected changes
   * @param {Object} changePayload - Original change payload
   * @returns {Promise<Array>} Detected conflicts
   */
  async detectYamlConflicts(changes, changePayload) {
    const conflicts = [];

    // Check for rapid successive changes to the same field
    for (const change of changes) {
      if (this.hasRecentConflict(changePayload.filePath, change.field)) {
        conflicts.push({
          type: 'rapid_succession',
          field: change.field,
          description: `Rapid changes detected to ${change.field}`,
          severity: 'medium',
          suggestedAction: 'Review change sequence for potential conflicts'
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts in JSON state changes
   * @param {Array} changes - Detected changes
   * @param {Object} changePayload - Original change payload
   * @returns {Promise<Array>} Detected conflicts
   */
  async detectJsonConflicts(changes, _changePayload) {
    const conflicts = [];

    // Check for concurrent modifications to critical state
    for (const change of changes) {
      if (change.field.includes('current_assignments') && change.type === 'modification') {
        conflicts.push({
          type: 'concurrent_assignment',
          field: change.field,
          description: 'Potential concurrent assignment modification',
          severity: 'high',
          suggestedAction: 'Verify assignment consistency across all state files'
        });
      }
    }

    return conflicts;
  }

  /**
   * Extract initial state information for new files
   * @param {Object} currentState - Current file state
   * @returns {Promise<Array>} Initial state changes
   */
  async extractInitialYamlState(currentState) {
    const changes = [];

    if (currentState.frontmatter) {
      // Create "addition" changes for all frontmatter fields
      this.flattenObject(currentState.frontmatter).forEach(([key, value]) => {
        changes.push({
          field: `frontmatter.${key}`,
          type: 'addition',
          oldValue: undefined,
          newValue: this.serializeValue(value)
        });
      });
    }

    return changes;
  }

  /**
   * Extract initial state information for new JSON files
   * @param {Object} currentState - Current file state
   * @returns {Promise<Array>} Initial state changes
   */
  async extractInitialJsonState(currentState) {
    const changes = [];

    if (currentState.data) {
      // Create "addition" changes for all JSON fields
      this.flattenObject(currentState.data).forEach(([key, value]) => {
        changes.push({
          field: `json_state.${key}`,
          type: 'addition',
          oldValue: undefined,
          newValue: this.serializeValue(value)
        });
      });
    }

    return changes;
  }

  /**
   * Update file cache with current state
   * @param {string} filePath - File path
   * @param {Object} state - Current file state
   */
  updateFileCache(filePath, state) {
    this.fileStateCache.set(filePath, {
      ...state,
      cachedAt: Date.now()
    });
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();

    for (const [filePath, state] of this.fileStateCache.entries()) {
      if (state.cachedAt && (now - state.cachedAt) > this.cacheTimeout) {
        this.fileStateCache.delete(filePath);
      }
    }
  }

  // Utility methods

  /**
   * Check if value is an object (but not array or null)
   * @param {*} value - Value to check
   * @returns {boolean} Whether value is an object
   */
  isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Serialize value for comparison
   * @param {*} value - Value to serialize
   * @returns {string} Serialized value
   */
  serializeValue(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Flatten nested object into key-value pairs
   * @param {Object} obj - Object to flatten
   * @param {string} prefix - Key prefix
   * @returns {Array} Array of [key, value] pairs
   */
  flattenObject(obj, prefix = '') {
    const pairs = [];

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (this.isObject(value)) {
        pairs.push(...this.flattenObject(value, newKey));
      } else {
        pairs.push([newKey, value]);
      }
    }

    return pairs;
  }

  /**
   * Check if a change is a workflow status change
   * @param {string} oldValue - Old status value
   * @param {string} newValue - New status value
   * @returns {boolean} Whether this is a workflow change
   */
  isWorkflowStatusChange(oldValue, newValue) {
    const workflowStatuses = ['ready', 'in_progress', 'completed', 'blocked'];
    return workflowStatuses.includes(oldValue) && workflowStatuses.includes(newValue);
  }

  /**
   * Check if a priority change is an escalation
   * @param {string} oldValue - Old priority
   * @param {string} newValue - New priority
   * @returns {boolean} Whether this is a priority escalation
   */
  isPriorityEscalation(oldValue, newValue) {
    const priorities = { 'P3': 1, 'P2': 2, 'P1': 3, 'P0': 4 };
    return priorities[newValue] > priorities[oldValue];
  }

  /**
   * Extract task ID from field path
   * @param {string} field - Field path
   * @returns {string|null} Extracted task ID
   */
  extractTaskIdFromField(field) {
    const match = field.match(/tasks\.(\d+|[A-Z]+-\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if field is metadata
   * @param {string} field - Field name
   * @returns {boolean} Whether field is metadata
   */
  isMetadataField(field) {
    const metadataPatterns = [
      'last_updated', 'updated_at', 'created_at', 'timestamp',
      'version', 'revision', 'checksum'
    ];
    return metadataPatterns.some(pattern => field.includes(pattern));
  }

  /**
   * Check if state change is significant
   * @param {string} field - Field name
   * @param {string} type - Change type
   * @param {*} oldValue - Old value
   * @param {*} newValue - New value
   * @returns {boolean} Whether change is significant
   */
  isSignificantStateChange(field, type, oldValue, newValue) {
    // Assignment changes are always significant
    if (field.includes('assignment') || field.includes('agent')) {
      return true;
    }

    // Status changes are significant
    if (field.includes('status') && oldValue !== newValue) {
      return true;
    }

    // Progress changes are significant
    if (field.includes('progress') && type !== 'metadata') {
      return true;
    }

    // Handoff changes are significant
    if (field.includes('handoff')) {
      return true;
    }

    // Metadata changes are not significant
    return false;
  }

  /**
   * Get significance reason for a change
   * @param {string} field - Field name
   * @param {string} type - Change type
   * @returns {string} Significance reason
   */
  getSignificanceReason(field, type) {
    if (field.includes('assignment')) return 'Task assignment modification';
    if (field.includes('status')) return 'Workflow status change';
    if (field.includes('progress')) return 'Progress tracking update';
    if (field.includes('handoff')) return 'Task handoff modification';
    return `${type} to critical field`;
  }

  /**
   * Check for recent conflicts on the same field
   * @param {string} filePath - File path
   * @param {string} field - Field name
   * @returns {boolean} Whether there are recent conflicts
   */
  hasRecentConflict(_filePath, _field) {
    // This is a simplified implementation
    // In a real system, this would check a conflict database
    return false;
  }

  /**
   * Get change detector statistics
   * @returns {Object} Current statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      cacheSize: this.fileStateCache.size,
      cacheTimeout: this.cacheTimeout,
      performanceTarget: this.performanceTarget,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all cached states (for testing or reset)
   */
  clearCache() {
    this.fileStateCache.clear();
    console.log('📝 ChangeDetector cache cleared');
  }

  /**
   * Shutdown change detector
   */
  shutdown() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }

    this.clearCache();
    console.log('✅ ChangeDetector shutdown complete');
  }
}

module.exports = ChangeDetector;