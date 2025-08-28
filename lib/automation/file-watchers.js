const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const EventEmitter = require('events');

/**
 * FileWatchers - Real-time file system monitoring for YAML frontmatter and JSON state
 *
 * Provides reliable cross-platform file system monitoring with debouncing, error recovery,
 * and structured change events for the ASD automated synchronization system.
 *
 * Key Features:
 * - YAML frontmatter monitoring (docs/specs directory and subdirectories)
 * - JSON state file monitoring (.asd/state/*.json)
 * - Debounced change detection (500ms window)
 * - Structured event payloads with metadata
 * - Error recovery and graceful degradation
 * - Performance monitoring <1s change detection
 */
class FileWatchers extends EventEmitter {
  constructor(configManager = null) {
    super();

    this.configManager = configManager;
    this.watchers = new Map();
    this.debounceTimers = new Map();
    this.debounceDelay = 500; // 500ms as specified
    this.performanceTarget = 1000; // <1s change detection requirement

    // Track watcher state
    this.watcherState = {
      yamlWatcher: { active: false, error: null, lastEvent: null },
      jsonWatcher: { active: false, error: null, lastEvent: null }
    };

    // Event tracking for monitoring
    this.eventStats = {
      totalEvents: 0,
      debouncedEvents: 0,
      errorEvents: 0,
      lastEventTime: null,
      averageDetectionTime: 0
    };

    // File patterns for watching
    this.patterns = {
      yaml: 'docs/specs/**/*.md',
      json: '.asd/state/*.json'
    };
  }

  /**
   * Initialize file system watchers
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      const projectRoot = this.configManager ? this.configManager.getProjectRoot() : process.cwd();

      // Initialize YAML frontmatter watcher
      await this.initializeYamlWatcher(projectRoot);

      // Initialize JSON state watcher
      await this.initializeJsonWatcher(projectRoot);

      // Set up error recovery monitoring
      this.setupErrorRecovery();

      console.log('✅ FileWatchers initialized successfully');
      this.emit('initialized', {
        yamlWatcher: this.watcherState.yamlWatcher.active,
        jsonWatcher: this.watcherState.jsonWatcher.active,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error(`❌ FileWatchers initialization failed: ${error.message}`);
      this.emit('error', {
        type: 'initialization_failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Initialize YAML frontmatter watcher for specification files
   * @param {string} projectRoot - Project root directory
   */
  async initializeYamlWatcher(projectRoot) {
    const yamlPattern = path.join(projectRoot, this.patterns.yaml);

    try {
      const yamlWatcher = chokidar.watch(yamlPattern, {
        ignored: /(^|[/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true, // Don't fire events for existing files
        followSymlinks: false,
        depth: 10,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });

      // Handle YAML file changes
      yamlWatcher.on('change', (filePath, stats) => {
        this.handleFileChange('yaml', 'change', filePath, stats);
      });

      yamlWatcher.on('add', (filePath, stats) => {
        this.handleFileChange('yaml', 'add', filePath, stats);
      });

      yamlWatcher.on('unlink', (filePath) => {
        this.handleFileChange('yaml', 'delete', filePath, null);
      });

      yamlWatcher.on('error', (error) => {
        console.error(`YAML watcher error: ${error.message}`);
        this.watcherState.yamlWatcher.error = error.message;
        this.watcherState.yamlWatcher.active = false;
        this.eventStats.errorEvents++;

        this.emit('watcher_error', {
          watcherType: 'yaml',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

      yamlWatcher.on('ready', () => {
        console.log('📁 YAML frontmatter watcher ready');
        this.watcherState.yamlWatcher.active = true;
        this.watcherState.yamlWatcher.error = null;
      });

      this.watchers.set('yaml', yamlWatcher);

    } catch (error) {
      throw new Error(`Failed to initialize YAML watcher: ${error.message}`);
    }
  }

  /**
   * Initialize JSON state file watcher
   * @param {string} projectRoot - Project root directory
   */
  async initializeJsonWatcher(projectRoot) {
    const jsonPattern = path.join(projectRoot, this.patterns.json);

    // Ensure state directory exists
    const stateDir = path.join(projectRoot, '.asd', 'state');
    try {
      await fs.mkdir(stateDir, { recursive: true });
    } catch (error) {
      console.warn(`Could not create state directory: ${error.message}`);
    }

    try {
      const jsonWatcher = chokidar.watch(jsonPattern, {
        ignored: /(^|[/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        followSymlinks: false,
        depth: 2,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });

      // Handle JSON state file changes
      jsonWatcher.on('change', (filePath, stats) => {
        this.handleFileChange('json', 'change', filePath, stats);
      });

      jsonWatcher.on('add', (filePath, stats) => {
        this.handleFileChange('json', 'add', filePath, stats);
      });

      jsonWatcher.on('unlink', (filePath) => {
        this.handleFileChange('json', 'delete', filePath, null);
      });

      jsonWatcher.on('error', (error) => {
        console.error(`JSON watcher error: ${error.message}`);
        this.watcherState.jsonWatcher.error = error.message;
        this.watcherState.jsonWatcher.active = false;
        this.eventStats.errorEvents++;

        this.emit('watcher_error', {
          watcherType: 'json',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

      jsonWatcher.on('ready', () => {
        console.log('📁 JSON state watcher ready');
        this.watcherState.jsonWatcher.active = true;
        this.watcherState.jsonWatcher.error = null;
      });

      this.watchers.set('json', jsonWatcher);

    } catch (error) {
      throw new Error(`Failed to initialize JSON watcher: ${error.message}`);
    }
  }

  /**
   * Handle file change events with debouncing and structured payloads
   * @param {string} watcherType - Type of watcher (yaml/json)
   * @param {string} changeType - Type of change (change/add/delete)
   * @param {string} filePath - Path to changed file
   * @param {Object} stats - File stats object
   */
  handleFileChange(watcherType, changeType, filePath, stats) {
    const changeKey = `${watcherType}:${filePath}`;
    const changeTime = Date.now();

    // Clear existing debounce timer
    if (this.debounceTimers.has(changeKey)) {
      clearTimeout(this.debounceTimers.get(changeKey));
      this.eventStats.debouncedEvents++;
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processFileChange(watcherType, changeType, filePath, stats, changeTime);
      this.debounceTimers.delete(changeKey);
    }, this.debounceDelay);

    this.debounceTimers.set(changeKey, timer);
  }

  /**
   * Process debounced file change event
   * @param {string} watcherType - Type of watcher
   * @param {string} changeType - Type of change
   * @param {string} filePath - Path to changed file
   * @param {Object} stats - File stats
   * @param {number} changeTime - Time change was detected
   */
  async processFileChange(watcherType, changeType, filePath, stats, changeTime) {
    try {
      const processingTime = Date.now();
      const detectionDelay = processingTime - changeTime;

      // Update performance statistics
      this.eventStats.totalEvents++;
      this.eventStats.lastEventTime = new Date().toISOString();
      this.eventStats.averageDetectionTime =
        (this.eventStats.averageDetectionTime * (this.eventStats.totalEvents - 1) + detectionDelay) /
        this.eventStats.totalEvents;

      // Log performance warning if detection took too long
      if (detectionDelay > this.performanceTarget) {
        console.warn(`⚠️ File change detection took ${detectionDelay}ms, exceeding ${this.performanceTarget}ms target`);
      }

      // Create structured change payload
      const changePayload = await this.createChangePayload(
        watcherType,
        changeType,
        filePath,
        stats,
        changeTime,
        detectionDelay
      );

      // Update watcher state
      this.watcherState[`${watcherType}Watcher`].lastEvent = changePayload.timestamp;

      // Emit change event with structured payload
      this.emit('file_change', changePayload);

      // Emit specific event types for targeted handling
      this.emit(`${watcherType}_change`, changePayload);
      this.emit(`${changeType}_event`, changePayload);

      console.log(`📝 ${watcherType.toUpperCase()} ${changeType}: ${path.basename(filePath)} (${detectionDelay}ms)`);

    } catch (error) {
      console.error(`Error processing file change: ${error.message}`);
      this.eventStats.errorEvents++;

      this.emit('processing_error', {
        watcherType,
        changeType,
        filePath,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Create structured change event payload
   * @param {string} watcherType - Watcher type
   * @param {string} changeType - Change type
   * @param {string} filePath - File path
   * @param {Object} stats - File stats
   * @param {number} changeTime - Original change time
   * @param {number} detectionDelay - Detection delay in ms
   * @returns {Promise<Object>} Structured change payload
   */
  async createChangePayload(watcherType, changeType, filePath, stats, changeTime, detectionDelay) {
    const payload = {
      // Core event information
      watcherType,
      changeType,
      filePath: path.normalize(filePath),
      fileName: path.basename(filePath),
      fileExtension: path.extname(filePath),

      // Timing information
      timestamp: new Date().toISOString(),
      changeTime: new Date(changeTime).toISOString(),
      detectionDelay,
      withinPerformanceTarget: detectionDelay <= this.performanceTarget,

      // File metadata
      fileStats: stats ? {
        size: stats.size,
        modified: stats.mtime ? stats.mtime.toISOString() : null,
        created: stats.birthtime ? stats.birthtime.toISOString() : null,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      } : null,

      // Context information
      relativePath: this.configManager ?
        path.relative(this.configManager.getProjectRoot(), filePath) : filePath,

      // Event tracking
      eventId: `${watcherType}_${changeType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Add type-specific metadata
    if (watcherType === 'yaml') {
      payload.specInfo = await this.extractSpecInfo(filePath, changeType);
    } else if (watcherType === 'json') {
      payload.stateInfo = await this.extractStateInfo(filePath, changeType);
    }

    return payload;
  }

  /**
   * Extract specification information from YAML file
   * @param {string} filePath - YAML file path
   * @param {string} changeType - Type of change
   * @returns {Promise<Object>} Spec information
   */
  async extractSpecInfo(filePath, changeType) {
    if (changeType === 'delete') {
      return {
        specId: this.extractSpecIdFromPath(filePath),
        exists: false,
        frontmatterParseable: false
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      if (!frontmatterMatch) {
        return {
          specId: this.extractSpecIdFromPath(filePath),
          exists: true,
          frontmatterParseable: false,
          error: 'No YAML frontmatter found'
        };
      }

      // Basic frontmatter validation without full parsing
      const yamlContent = frontmatterMatch[1];
      const hasId = yamlContent.includes('id:');
      const hasStatus = yamlContent.includes('status:');
      const hasTasks = yamlContent.includes('tasks:');

      return {
        specId: this.extractSpecIdFromPath(filePath),
        exists: true,
        frontmatterParseable: true,
        hasRequiredFields: hasId && hasStatus,
        hasTasks,
        frontmatterLength: yamlContent.length
      };

    } catch (error) {
      return {
        specId: this.extractSpecIdFromPath(filePath),
        exists: true,
        frontmatterParseable: false,
        error: error.message
      };
    }
  }

  /**
   * Extract state information from JSON file
   * @param {string} filePath - JSON file path
   * @param {string} changeType - Type of change
   * @returns {Promise<Object>} State information
   */
  async extractStateInfo(filePath, changeType) {
    const fileName = path.basename(filePath, '.json');

    if (changeType === 'delete') {
      return {
        stateType: fileName,
        exists: false,
        jsonParseable: false
      };
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      return {
        stateType: fileName,
        exists: true,
        jsonParseable: true,
        hasData: Object.keys(data).length > 0,
        dataSize: content.length,
        lastUpdated: data.last_updated || null
      };

    } catch (error) {
      return {
        stateType: fileName,
        exists: true,
        jsonParseable: false,
        error: error.message
      };
    }
  }

  /**
   * Extract spec ID from file path
   * @param {string} filePath - File path
   * @returns {string} Extracted spec ID
   */
  extractSpecIdFromPath(filePath) {
    const fileName = path.basename(filePath, '.md');

    // Try to extract ID from common patterns like FEAT-001-title.md
    const idMatch = fileName.match(/^([A-Z]+-\d+)/);
    if (idMatch) {
      return idMatch[1];
    }

    // Fall back to filename
    return fileName;
  }

  /**
   * Set up error recovery and monitoring
   */
  setupErrorRecovery() {
    // Monitor watcher health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Handle process cleanup
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Perform health check on watchers
   */
  performHealthCheck() {
    const healthStatus = {
      yamlWatcher: this.watcherState.yamlWatcher,
      jsonWatcher: this.watcherState.jsonWatcher,
      totalEvents: this.eventStats.totalEvents,
      errorRate: this.eventStats.totalEvents > 0 ?
        (this.eventStats.errorEvents / this.eventStats.totalEvents) * 100 : 0,
      averageDetectionTime: this.eventStats.averageDetectionTime,
      timestamp: new Date().toISOString()
    };

    this.emit('health_check', healthStatus);

    // Attempt to restart failed watchers
    if (!this.watcherState.yamlWatcher.active && !this.watcherState.yamlWatcher.error) {
      console.warn('⚠️ YAML watcher inactive, attempting restart...');
      this.restartWatcher('yaml');
    }

    if (!this.watcherState.jsonWatcher.active && !this.watcherState.jsonWatcher.error) {
      console.warn('⚠️ JSON watcher inactive, attempting restart...');
      this.restartWatcher('json');
    }
  }

  /**
   * Restart a specific watcher
   * @param {string} watcherType - Type of watcher to restart
   */
  async restartWatcher(watcherType) {
    try {
      const watcher = this.watchers.get(watcherType);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(watcherType);
      }

      const projectRoot = this.configManager ? this.configManager.getProjectRoot() : process.cwd();

      if (watcherType === 'yaml') {
        await this.initializeYamlWatcher(projectRoot);
      } else if (watcherType === 'json') {
        await this.initializeJsonWatcher(projectRoot);
      }

      console.log(`✅ ${watcherType.toUpperCase()} watcher restarted successfully`);
      this.emit('watcher_restarted', {
        watcherType,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Failed to restart ${watcherType} watcher: ${error.message}`);
      this.emit('watcher_restart_failed', {
        watcherType,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get current watcher status and statistics
   * @returns {Object} Status and statistics
   */
  getStatus() {
    return {
      watchers: {
        yaml: {
          active: this.watcherState.yamlWatcher.active,
          error: this.watcherState.yamlWatcher.error,
          lastEvent: this.watcherState.yamlWatcher.lastEvent,
          pattern: this.patterns.yaml
        },
        json: {
          active: this.watcherState.jsonWatcher.active,
          error: this.watcherState.jsonWatcher.error,
          lastEvent: this.watcherState.jsonWatcher.lastEvent,
          pattern: this.patterns.json
        }
      },
      performance: {
        debounceDelay: this.debounceDelay,
        performanceTarget: this.performanceTarget,
        averageDetectionTime: this.eventStats.averageDetectionTime,
        withinTarget: this.eventStats.averageDetectionTime <= this.performanceTarget
      },
      statistics: {
        ...this.eventStats,
        activeDebounceTimers: this.debounceTimers.size,
        healthCheckInterval: !!this.healthCheckInterval
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Pause file watching (for maintenance or testing)
   */
  pause() {
    for (const [type, watcher] of this.watchers) {
      watcher.unwatch('*');
      console.log(`⏸️ ${type.toUpperCase()} watcher paused`);
    }
    this.emit('watchers_paused', { timestamp: new Date().toISOString() });
  }

  /**
   * Resume file watching
   */
  async resume() {
    const projectRoot = this.configManager ? this.configManager.getProjectRoot() : process.cwd();

    for (const [type, watcher] of this.watchers) {
      const pattern = path.join(projectRoot, this.patterns[type]);
      watcher.add(pattern);
      console.log(`▶️ ${type.toUpperCase()} watcher resumed`);
    }
    this.emit('watchers_resumed', { timestamp: new Date().toISOString() });
  }

  /**
   * Shutdown all watchers gracefully
   */
  async shutdown() {
    console.log('🔄 Shutting down file watchers...');

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Close all watchers
    const shutdownPromises = [];
    for (const [type, watcher] of this.watchers) {
      shutdownPromises.push(
        watcher.close().then(() => {
          console.log(`✅ ${type.toUpperCase()} watcher closed`);
        }).catch((error) => {
          console.error(`❌ Error closing ${type} watcher: ${error.message}`);
        })
      );
    }

    await Promise.all(shutdownPromises);
    this.watchers.clear();

    this.emit('shutdown_complete', {
      timestamp: new Date().toISOString(),
      finalStats: this.eventStats
    });

    console.log('✅ File watchers shutdown complete');
  }
}

module.exports = FileWatchers;