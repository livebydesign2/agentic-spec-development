const EventEmitter = require('events');

/**
 * Memory monitoring system for ASD
 * Tracks memory usage patterns and provides alerts for potential leaks
 */
class MemoryMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      // Monitoring intervals
      monitorInterval: options.monitorInterval || 5000, // 5 seconds
      alertInterval: options.alertInterval || 30000, // 30 seconds

      // Memory thresholds (in MB)
      warningThreshold: options.warningThreshold || 150,
      criticalThreshold: options.criticalThreshold || 200,
      leakDetectionThreshold: options.leakDetectionThreshold || 50,

      // History tracking
      maxHistoryEntries: options.maxHistoryEntries || 100,
      leakDetectionSamples: options.leakDetectionSamples || 10,

      // Cleanup options
      autoCleanup: options.autoCleanup !== false,
      gcThreshold: options.gcThreshold || 100, // Force GC above this RSS

      // Logging
      enableLogging: options.enableLogging !== false,
      logLevel: options.logLevel || 'warn', // 'debug', 'info', 'warn', 'error'
    };

    this.memoryHistory = [];
    this.lastAlert = null;
    this.monitoring = false;
    this.monitoringTimer = null;
    this.startTime = Date.now();

    // Statistics
    this.stats = {
      totalSamples: 0,
      averageRSS: 0,
      averageHeap: 0,
      maxRSS: 0,
      maxHeap: 0,
      leaksDetected: 0,
      gcTriggered: 0,
    };
  }

  /**
   * Start memory monitoring
   */
  start() {
    if (this.monitoring) {
      this.log('warn', 'Memory monitoring already started');
      return;
    }

    this.monitoring = true;
    this.startTime = Date.now();

    this.log('info', 'Starting memory monitoring', {
      interval: this.options.monitorInterval,
      warningThreshold: this.options.warningThreshold,
      criticalThreshold: this.options.criticalThreshold
    });

    // Take initial measurement
    this.recordMemoryUsage();

    // Start monitoring timer
    this.monitoringTimer = setInterval(() => {
      this.recordMemoryUsage();
    }, this.options.monitorInterval);

    this.emit('started');
  }

  /**
   * Stop memory monitoring
   */
  stop() {
    if (!this.monitoring) {
      return;
    }

    this.monitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    this.log('info', 'Memory monitoring stopped', {
      duration: Date.now() - this.startTime,
      totalSamples: this.stats.totalSamples,
      maxRSS: this.stats.maxRSS,
      leaksDetected: this.stats.leaksDetected
    });

    this.emit('stopped', this.getStats());
  }

  /**
   * Record current memory usage
   */
  recordMemoryUsage() {
    const memUsage = process.memoryUsage();
    const timestamp = Date.now();

    const entry = {
      timestamp,
      uptime: timestamp - this.startTime,
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    };

    // Add to history
    this.memoryHistory.push(entry);

    // Maintain history size limit
    if (this.memoryHistory.length > this.options.maxHistoryEntries) {
      this.memoryHistory.shift();
    }

    // Update statistics
    this.updateStats(entry);

    // Check for issues
    this.checkMemoryThresholds(entry);
    this.detectMemoryLeaks();

    this.emit('measurement', entry);

    return entry;
  }

  /**
   * Update internal statistics
   */
  updateStats(entry) {
    this.stats.totalSamples++;

    // Calculate running averages
    const n = this.stats.totalSamples;
    this.stats.averageRSS = ((this.stats.averageRSS * (n - 1)) + entry.rss) / n;
    this.stats.averageHeap = ((this.stats.averageHeap * (n - 1)) + entry.heapUsed) / n;

    // Track maximums
    this.stats.maxRSS = Math.max(this.stats.maxRSS, entry.rss);
    this.stats.maxHeap = Math.max(this.stats.maxHeap, entry.heapUsed);
  }

  /**
   * Check if current memory usage exceeds thresholds
   */
  checkMemoryThresholds(entry) {
    const now = Date.now();

    // Avoid too frequent alerts
    if (this.lastAlert && (now - this.lastAlert) < this.options.alertInterval) {
      return;
    }

    // Critical threshold
    if (entry.rss > this.options.criticalThreshold) {
      this.lastAlert = now;
      this.log('error', 'Critical memory usage detected!', entry);
      this.emit('critical', entry);

      if (this.options.autoCleanup) {
        this.triggerGarbageCollection('critical');
      }
    }
    // Warning threshold
    else if (entry.rss > this.options.warningThreshold) {
      this.lastAlert = now;
      this.log('warn', 'High memory usage detected', entry);
      this.emit('warning', entry);

      if (this.options.autoCleanup && entry.rss > this.options.gcThreshold) {
        this.triggerGarbageCollection('warning');
      }
    }
  }

  /**
   * Detect potential memory leaks by analyzing growth patterns
   */
  detectMemoryLeaks() {
    const samples = this.options.leakDetectionSamples;

    if (this.memoryHistory.length < samples) {
      return; // Not enough data
    }

    const recent = this.memoryHistory.slice(-samples);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    const timeDiff = newest.timestamp - oldest.timestamp;
    const rssGrowth = newest.rss - oldest.rss;
    const heapGrowth = newest.heapUsed - oldest.heapUsed;

    // Calculate growth rates (MB per minute)
    const growthRateMBPerMin = (rssGrowth / (timeDiff / 1000 / 60));
    const heapGrowthRateMBPerMin = (heapGrowth / (timeDiff / 1000 / 60));

    // Detect sustained growth patterns
    const isSteadyGrowth = this.detectSteadyGrowth(recent);
    const exceedsThreshold = rssGrowth > this.options.leakDetectionThreshold;

    if (isSteadyGrowth && exceedsThreshold) {
      this.stats.leaksDetected++;

      const leakInfo = {
        detected: true,
        rssGrowth,
        heapGrowth,
        growthRateMBPerMin,
        heapGrowthRateMBPerMin,
        samples: samples,
        timePeriod: timeDiff,
        steadyGrowth: isSteadyGrowth
      };

      this.log('error', 'Potential memory leak detected!', leakInfo);
      this.emit('leak-detected', leakInfo);

      if (this.options.autoCleanup) {
        this.triggerGarbageCollection('leak');
      }
    }
  }

  /**
   * Check if memory usage shows steady growth pattern
   */
  detectSteadyGrowth(samples) {
    if (samples.length < 3) return false;

    let increases = 0;
    let decreases = 0;

    for (let i = 1; i < samples.length; i++) {
      if (samples[i].rss > samples[i - 1].rss) {
        increases++;
      } else if (samples[i].rss < samples[i - 1].rss) {
        decreases++;
      }
    }

    // Consider it steady growth if > 70% of samples show increase
    const growthRatio = increases / (samples.length - 1);
    return growthRatio > 0.7;
  }

  /**
   * Trigger garbage collection if available
   */
  triggerGarbageCollection(reason = 'manual') {
    if (global.gc) {
      const before = process.memoryUsage();

      try {
        global.gc();
        this.stats.gcTriggered++;

        const after = process.memoryUsage();
        const freed = Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024);

        this.log('info', `Garbage collection triggered (${reason})`, {
          freedMB: freed,
          beforeHeap: Math.round(before.heapUsed / 1024 / 1024),
          afterHeap: Math.round(after.heapUsed / 1024 / 1024)
        });

        this.emit('gc-triggered', { reason, freedMB: freed });

        return freed;
      } catch (error) {
        this.log('error', 'Failed to trigger garbage collection', error);
      }
    } else {
      this.log('warn', 'Garbage collection not available (use --expose-gc)');
    }

    return 0;
  }

  /**
   * Get current memory statistics
   */
  getStats() {
    const current = this.memoryHistory.length > 0 ?
      this.memoryHistory[this.memoryHistory.length - 1] : null;

    return {
      monitoring: this.monitoring,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime,
      current,
      stats: { ...this.stats },
      memoryHistory: this.memoryHistory.slice(), // Copy
      options: { ...this.options }
    };
  }

  /**
   * Get memory usage report
   */
  generateReport() {
    const stats = this.getStats();
    const current = stats.current;

    if (!current) {
      return 'No memory data available';
    }

    const report = [];
    report.push('=== MEMORY USAGE REPORT ===');
    report.push(`Monitoring Duration: ${Math.round(stats.uptime / 1000)}s`);
    report.push(`Total Samples: ${stats.stats.totalSamples}`);
    report.push('');
    report.push('Current Usage:');
    report.push(`  RSS: ${current.rss}MB`);
    report.push(`  Heap Used: ${current.heapUsed}MB`);
    report.push(`  Heap Total: ${current.heapTotal}MB`);
    report.push(`  External: ${current.external}MB`);
    report.push('');
    report.push('Statistics:');
    report.push(`  Average RSS: ${Math.round(stats.stats.averageRSS)}MB`);
    report.push(`  Average Heap: ${Math.round(stats.stats.averageHeap)}MB`);
    report.push(`  Max RSS: ${stats.stats.maxRSS}MB`);
    report.push(`  Max Heap: ${stats.stats.maxHeap}MB`);
    report.push(`  Leaks Detected: ${stats.stats.leaksDetected}`);
    report.push(`  GC Triggered: ${stats.stats.gcTriggered}`);

    return report.join('\n');
  }

  /**
   * Reset monitoring data
   */
  reset() {
    this.memoryHistory = [];
    this.lastAlert = null;
    this.startTime = Date.now();
    this.stats = {
      totalSamples: 0,
      averageRSS: 0,
      averageHeap: 0,
      maxRSS: 0,
      maxHeap: 0,
      leaksDetected: 0,
      gcTriggered: 0,
    };

    this.emit('reset');
  }

  /**
   * Log messages with configurable levels
   */
  log(level, message, data = null) {
    if (!this.options.enableLogging) {
      return;
    }

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.options.logLevel] || 2;
    const messageLevel = levels[level] || 2;

    if (messageLevel < currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [MemoryMonitor] [${level.toUpperCase()}]`;

    if (data) {
      console[level === 'error' ? 'error' : 'log'](`${prefix} ${message}`, data);
    } else {
      console[level === 'error' ? 'error' : 'log'](`${prefix} ${message}`);
    }
  }
}

module.exports = MemoryMonitor;