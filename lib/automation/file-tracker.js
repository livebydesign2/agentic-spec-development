const chokidar = require('chokidar');
const path = require('path');
const EventEmitter = require('events');

/**
 * FileTracker - Intelligent file tracking system for work sessions
 *
 * Monitors file system changes during active work sessions, providing
 * selective tracking capabilities for git staging and commit operations.
 * Integrates with GitIntegration for seamless workflow automation.
 *
 * Key Features:
 * - Real-time file system monitoring with configurable patterns
 * - Session-based tracking with start/stop controls
 * - Intelligent file filtering (ignore patterns, file types)
 * - Change categorization (new, modified, deleted, renamed)
 * - Performance optimization with debounced events
 * - Integration with git status for accurate change detection
 * - Comprehensive audit logging for all file operations
 */
class FileTracker extends EventEmitter {
  constructor(configManager, gitIntegration, options = {}) {
    super();

    this.configManager = configManager;
    this.gitIntegration = gitIntegration;
    this.options = {
      debounceDelay: options.debounceDelay || 300, // 300ms debounce
      maxFiles: options.maxFiles || 1000, // Maximum files to track
      enableAuditLogging: options.enableAuditLogging !== false,
      respectGitignore: options.respectGitignore !== false,
      trackBinaryFiles: options.trackBinaryFiles || false,
      ...options
    };

    // Tracking state
    this.isTracking = false;
    this.trackingSession = null;
    this.watcher = null;
    this.trackedChanges = new Map(); // file -> change details
    this.sessionStartTime = null;
    this.auditLog = [];

    // Performance optimization
    this.changeDebounceMap = new Map(); // file -> timeout handle
    this.batchChangeQueue = [];
    this.batchProcessTimer = null;

    // Default watch patterns
    this.defaultWatchPatterns = [
      '**/*.js',
      '**/*.json',
      '**/*.md',
      '**/*.ts',
      '**/*.jsx',
      '**/*.tsx',
      '**/*.css',
      '**/*.scss',
      '**/*.less',
      '**/*.html',
      '**/*.vue',
      '**/*.py',
      '**/*.yml',
      '**/*.yaml'
    ];

    // Default ignore patterns
    this.defaultIgnorePatterns = [
      /node_modules/,
      /.git/,
      /.asd/,
      /\.log$/,
      /\.tmp$/,
      /\.cache/,
      /dist/,
      /build/,
      /coverage/,
      /__pycache__/,
      /\.pyc$/,
      /\.DS_Store$/,
      /Thumbs\.db$/,
      /\.vscode/,
      /\.idea/
    ];

    // Statistics
    this.statistics = {
      sessionsStarted: 0,
      totalFilesTracked: 0,
      totalChangesDetected: 0,
      currentSessionChanges: 0,
      averageSessionDuration: 0,
      lastSessionStart: null,
      lastSessionEnd: null
    };
  }

  /**
   * Start file tracking session
   * @param {Object} options - Tracking session options
   * @returns {Promise<Object>} Start result
   */
  async startTracking(options = {}) {
    try {
      if (this.isTracking) {
        return {
          success: false,
          error: 'File tracking is already active'
        };
      }

      const {
        patterns = this.defaultWatchPatterns,
        ignorePatterns = this.defaultIgnorePatterns,
        sessionName = `session_${Date.now()}`,
        initialScan = true
      } = options;

      this.logAuditEvent('tracking_session_starting', {
        sessionName,
        patterns,
        ignorePatternCount: ignorePatterns.length,
        options: this.sanitizeOptionsForLog(options),
        timestamp: new Date().toISOString()
      });

      // Initialize tracking session
      this.trackingSession = {
        name: sessionName,
        startTime: new Date().toISOString(),
        patterns,
        ignorePatterns,
        options
      };

      this.isTracking = true;
      this.sessionStartTime = Date.now();
      this.trackedChanges.clear();
      this.statistics.currentSessionChanges = 0;
      this.statistics.sessionsStarted++;
      this.statistics.lastSessionStart = this.trackingSession.startTime;

      // Get initial git status if requested
      if (initialScan) {
        await this.performInitialScan();
      }

      // Start file watcher
      await this.startFileWatcher(patterns, ignorePatterns);

      this.logAuditEvent('tracking_session_started', {
        sessionName,
        initialFiles: this.trackedChanges.size,
        watcherActive: !!this.watcher,
        timestamp: new Date().toISOString()
      });

      console.log(`📁 File tracking started - monitoring ${patterns.length} patterns`);
      this.emit('tracking_started', {
        sessionName,
        initialFiles: this.trackedChanges.size,
        patterns
      });

      return {
        success: true,
        sessionName,
        initialFiles: this.trackedChanges.size,
        watchingPatterns: patterns.length
      };

    } catch (error) {
      this.logAuditEvent('tracking_session_start_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      // Cleanup on failure
      await this.cleanup();

      return {
        success: false,
        error: `Failed to start file tracking: ${error.message}`
      };
    }
  }

  /**
   * Perform initial scan to detect existing changes
   * @returns {Promise<void>}
   */
  async performInitialScan() {
    try {
      console.log('🔍 Performing initial file scan...');

      // Get git status to find existing changes
      const gitStatus = await this.gitIntegration.getGitStatus();
      if (!gitStatus.success) {
        console.warn(`⚠️  Could not get git status for initial scan: ${gitStatus.error}`);
        return;
      }

      // Process existing git changes
      for (const fileInfo of gitStatus.detailedFiles || []) {
        const changeType = this.determineChangeType(fileInfo.status);
        const changeDetail = {
          path: fileInfo.path,
          type: changeType,
          timestamp: new Date().toISOString(),
          isGitTracked: true,
          gitStatus: fileInfo.status,
          source: 'initial_scan'
        };

        this.trackedChanges.set(fileInfo.path, changeDetail);
        this.statistics.totalFilesTracked++;
      }

      console.log(`📁 Initial scan complete - found ${gitStatus.detailedFiles?.length || 0} existing changes`);

    } catch (error) {
      console.warn(`⚠️  Initial scan failed: ${error.message}`);
    }
  }

  /**
   * Start file system watcher
   * @param {Array<string>} patterns - Patterns to watch
   * @param {Array} ignorePatterns - Patterns to ignore
   * @returns {Promise<void>}
   */
  async startFileWatcher(patterns, ignorePatterns) {
    try {
      const projectRoot = this.configManager.getProjectRoot();
      const watchPaths = patterns.map(pattern => path.join(projectRoot, pattern));

      this.watcher = chokidar.watch(watchPaths, {
        ignored: ignorePatterns,
        persistent: true,
        ignoreInitial: true, // We handle initial scan separately
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100
        },
        depth: 10, // Reasonable depth limit
        usePolling: false
      });

      // Set up event handlers
      this.watcher.on('add', (filePath) => {
        this.handleFileChange(filePath, 'added');
      });

      this.watcher.on('change', (filePath) => {
        this.handleFileChange(filePath, 'modified');
      });

      this.watcher.on('unlink', (filePath) => {
        this.handleFileChange(filePath, 'deleted');
      });

      this.watcher.on('addDir', (dirPath) => {
        this.handleFileChange(dirPath, 'directory_added');
      });

      this.watcher.on('unlinkDir', (dirPath) => {
        this.handleFileChange(dirPath, 'directory_deleted');
      });

      this.watcher.on('error', (error) => {
        console.error(`❌ File watcher error: ${error.message}`);
        this.logAuditEvent('watcher_error', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        this.emit('watcher_error', { error: error.message });
      });

      this.watcher.on('ready', () => {
        console.log('✅ File watcher ready');
        this.emit('watcher_ready');
      });

    } catch (error) {
      throw new Error(`Failed to start file watcher: ${error.message}`);
    }
  }

  /**
   * Handle file system change events with debouncing
   * @param {string} filePath - Path of changed file
   * @param {string} eventType - Type of change event
   */
  handleFileChange(filePath, eventType) {
    try {
      // Skip if tracking is not active
      if (!this.isTracking) {
        return;
      }

      // Convert to relative path
      const projectRoot = this.configManager.getProjectRoot();
      const relativePath = path.relative(projectRoot, filePath);

      // Skip if file exceeds limits
      if (this.trackedChanges.size >= this.options.maxFiles) {
        console.warn(`⚠️  Maximum tracked files limit (${this.options.maxFiles}) reached`);
        return;
      }

      // Debounce rapid changes to same file
      if (this.changeDebounceMap.has(relativePath)) {
        clearTimeout(this.changeDebounceMap.get(relativePath));
      }

      const debounceHandle = setTimeout(() => {
        this.processFileChange(relativePath, eventType);
        this.changeDebounceMap.delete(relativePath);
      }, this.options.debounceDelay);

      this.changeDebounceMap.set(relativePath, debounceHandle);

    } catch (error) {
      console.error(`❌ Error handling file change: ${error.message}`);
    }
  }

  /**
   * Process individual file change
   * @param {string} relativePath - Relative path of changed file
   * @param {string} eventType - Type of change event
   */
  processFileChange(relativePath, eventType) {
    try {
      const changeDetail = {
        path: relativePath,
        type: this.normalizeChangeType(eventType),
        timestamp: new Date().toISOString(),
        isGitTracked: false, // Will be updated with git status
        source: 'file_watcher',
        eventType: eventType
      };

      // Update or add tracked change
      this.trackedChanges.set(relativePath, changeDetail);
      this.statistics.totalChangesDetected++;
      this.statistics.currentSessionChanges++;
      this.statistics.totalFilesTracked = Math.max(
        this.statistics.totalFilesTracked,
        this.trackedChanges.size
      );

      this.logAuditEvent('file_change_detected', {
        path: relativePath,
        type: changeDetail.type,
        eventType: eventType,
        sessionChanges: this.statistics.currentSessionChanges,
        timestamp: changeDetail.timestamp
      });

      // Emit change event
      this.emit('file_changed', {
        path: relativePath,
        type: changeDetail.type,
        eventType: eventType,
        timestamp: changeDetail.timestamp
      });

      // Add to batch processing queue for git status updates
      this.queueForBatchProcessing(relativePath);

    } catch (error) {
      console.error(`❌ Error processing file change: ${error.message}`);
    }
  }

  /**
   * Queue file for batch processing (git status updates)
   * @param {string} filePath - File path to queue
   */
  queueForBatchProcessing(filePath) {
    if (!this.batchChangeQueue.includes(filePath)) {
      this.batchChangeQueue.push(filePath);
    }

    // Debounce batch processing
    if (this.batchProcessTimer) {
      clearTimeout(this.batchProcessTimer);
    }

    this.batchProcessTimer = setTimeout(() => {
      this.processBatchChanges();
    }, 1000); // Process batch after 1 second of inactivity
  }

  /**
   * Process batched changes to update git status
   * @returns {Promise<void>}
   */
  async processBatchChanges() {
    if (this.batchChangeQueue.length === 0) {
      return;
    }

    try {
      const filesToProcess = [...this.batchChangeQueue];
      this.batchChangeQueue = [];

      // Get current git status
      const gitStatus = await this.gitIntegration.getGitStatus();
      if (!gitStatus.success) {
        console.warn(`⚠️  Could not update git status for batch changes: ${gitStatus.error}`);
        return;
      }

      // Create git status lookup
      const gitStatusMap = new Map();
      for (const fileInfo of gitStatus.detailedFiles || []) {
        gitStatusMap.set(fileInfo.path, fileInfo);
      }

      // Update tracked changes with git information
      for (const filePath of filesToProcess) {
        const trackedChange = this.trackedChanges.get(filePath);
        if (trackedChange) {
          const gitInfo = gitStatusMap.get(filePath);
          if (gitInfo) {
            trackedChange.isGitTracked = true;
            trackedChange.gitStatus = gitInfo.status;
            trackedChange.isStaged = gitInfo.isStaged;
            trackedChange.lastGitUpdate = new Date().toISOString();

            // Update change type based on git status if more accurate
            const gitChangeType = this.determineChangeType(gitInfo.status);
            if (gitChangeType !== 'unknown') {
              trackedChange.type = gitChangeType;
            }
          }
        }
      }

      this.emit('batch_processed', {
        processedFiles: filesToProcess.length,
        gitTrackedFiles: filesToProcess.filter(f =>
          this.trackedChanges.get(f)?.isGitTracked
        ).length
      });

    } catch (error) {
      console.error(`❌ Error processing batch changes: ${error.message}`);
    }
  }

  /**
   * Stop file tracking session
   * @returns {Promise<Object>} Stop result
   */
  async stopTracking() {
    try {
      if (!this.isTracking) {
        return {
          success: false,
          error: 'File tracking is not active'
        };
      }

      const sessionDuration = Date.now() - this.sessionStartTime;
      const trackedFiles = Array.from(this.trackedChanges.values());

      this.logAuditEvent('tracking_session_stopping', {
        sessionName: this.trackingSession?.name,
        duration: sessionDuration,
        trackedFiles: trackedFiles.length,
        timestamp: new Date().toISOString()
      });

      // Process any remaining batch changes
      if (this.batchChangeQueue.length > 0) {
        await this.processBatchChanges();
      }

      // Update statistics
      this.statistics.lastSessionEnd = new Date().toISOString();
      this.statistics.averageSessionDuration =
        (this.statistics.averageSessionDuration * (this.statistics.sessionsStarted - 1) + sessionDuration) /
        this.statistics.sessionsStarted;

      // Cleanup
      await this.cleanup();

      const result = {
        success: true,
        sessionName: this.trackingSession?.name,
        duration: sessionDuration,
        trackedFiles: trackedFiles,
        fileCount: trackedFiles.length,
        changes: {
          added: trackedFiles.filter(f => f.type === 'added').length,
          modified: trackedFiles.filter(f => f.type === 'modified').length,
          deleted: trackedFiles.filter(f => f.type === 'deleted').length
        },
        gitTracked: trackedFiles.filter(f => f.isGitTracked).length
      };

      this.logAuditEvent('tracking_session_stopped', {
        result: result,
        timestamp: new Date().toISOString()
      });

      console.log(`📁 File tracking stopped - ${result.fileCount} files tracked over ${Math.round(sessionDuration / 1000)}s`);
      this.emit('tracking_stopped', result);

      return result;

    } catch (error) {
      this.logAuditEvent('tracking_session_stop_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: `Failed to stop file tracking: ${error.message}`
      };
    }
  }

  /**
   * Get list of tracked files with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Array} Filtered list of tracked files
   */
  getTrackedFiles(filters = {}) {
    let files = Array.from(this.trackedChanges.values());

    if (filters.type) {
      files = files.filter(file => file.type === filters.type);
    }

    if (filters.gitTracked !== undefined) {
      files = files.filter(file => file.isGitTracked === filters.gitTracked);
    }

    if (filters.staged !== undefined) {
      files = files.filter(file => file.isStaged === filters.staged);
    }

    if (filters.since) {
      const sinceTime = new Date(filters.since);
      files = files.filter(file => new Date(file.timestamp) >= sinceTime);
    }

    if (filters.limit) {
      files = files.slice(0, filters.limit);
    }

    return files;
  }

  /**
   * Get files ready for git staging
   * @returns {Array} Files ready for staging
   */
  getFilesForStaging() {
    return this.getTrackedFiles({
      gitTracked: true,
      staged: false
    }).map(file => file.path);
  }

  /**
   * Normalize change type from file watcher events
   * @param {string} eventType - File watcher event type
   * @returns {string} Normalized change type
   */
  normalizeChangeType(eventType) {
    const typeMap = {
      'add': 'added',
      'added': 'added',
      'change': 'modified',
      'changed': 'modified',
      'modified': 'modified',
      'unlink': 'deleted',
      'deleted': 'deleted',
      'addDir': 'directory_added',
      'directory_added': 'directory_added',
      'unlinkDir': 'directory_deleted',
      'directory_deleted': 'directory_deleted'
    };

    return typeMap[eventType] || eventType;
  }

  /**
   * Determine change type from git status
   * @param {string} gitStatus - Git status code
   * @returns {string} Change type
   */
  determineChangeType(gitStatus) {
    if (!gitStatus || gitStatus.length < 2) {
      return 'unknown';
    }

    const staged = gitStatus[0];
    const unstaged = gitStatus[1];

    // Check staged changes first
    if (staged === 'A') return 'added';
    if (staged === 'M') return 'modified';
    if (staged === 'D') return 'deleted';
    if (staged === 'R') return 'renamed';
    if (staged === 'C') return 'copied';

    // Check unstaged changes
    if (unstaged === 'M') return 'modified';
    if (unstaged === 'D') return 'deleted';
    if (unstaged === '?') return 'added';

    return 'unknown';
  }

  /**
   * Get comprehensive tracking statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      currentSession: this.trackingSession ? {
        name: this.trackingSession.name,
        startTime: this.trackingSession.startTime,
        duration: this.isTracking ? Date.now() - this.sessionStartTime : 0,
        currentChanges: this.statistics.currentSessionChanges,
        trackedFiles: this.trackedChanges.size
      } : null,
      tracking: {
        isActive: this.isTracking,
        watcherActive: !!this.watcher,
        trackedFiles: this.trackedChanges.size,
        batchQueueSize: this.batchChangeQueue.length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // Clear debounce timers
      for (const handle of this.changeDebounceMap.values()) {
        clearTimeout(handle);
      }
      this.changeDebounceMap.clear();

      // Clear batch processing timer
      if (this.batchProcessTimer) {
        clearTimeout(this.batchProcessTimer);
        this.batchProcessTimer = null;
      }

      // Close file watcher
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }

      // Reset state
      this.isTracking = false;
      this.trackingSession = null;
      this.sessionStartTime = null;
      this.batchChangeQueue = [];

    } catch (error) {
      console.error(`❌ FileTracker cleanup failed: ${error.message}`);
    }
  }

  /**
   * Log audit events
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  logAuditEvent(event, data) {
    if (!this.options.enableAuditLogging) return;

    const auditEntry = {
      event,
      data,
      timestamp: data.timestamp || new Date().toISOString()
    };

    this.auditLog.push(auditEntry);
    this.emit('audit_event', auditEntry);

    // Limit audit log size
    if (this.auditLog.length > 500) {
      this.auditLog = this.auditLog.slice(-250); // Keep last 250 entries
    }
  }

  /**
   * Get audit log with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Array} Filtered audit log
   */
  getAuditLog(filters = {}) {
    let log = [...this.auditLog];

    if (filters.event) {
      log = log.filter(entry => entry.event === filters.event);
    }

    if (filters.since) {
      const sinceTime = new Date(filters.since);
      log = log.filter(entry => new Date(entry.timestamp) >= sinceTime);
    }

    if (filters.limit) {
      log = log.slice(-filters.limit);
    }

    return log;
  }

  /**
   * Sanitize options for logging
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   */
  sanitizeOptionsForLog(options) {
    const { ignorePatterns, ...safeOptions } = options;
    return {
      ...safeOptions,
      ignorePatternsCount: ignorePatterns ? ignorePatterns.length : 0
    };
  }

  /**
   * Shutdown FileTracker
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down FileTracker...');

      if (this.isTracking) {
        await this.stopTracking();
      }

      await this.cleanup();
      this.removeAllListeners();

      console.log('✅ FileTracker shutdown complete');
      this.emit('shutdown_complete');

    } catch (error) {
      console.error(`❌ FileTracker shutdown failed: ${error.message}`);
    }
  }
}

module.exports = FileTracker;