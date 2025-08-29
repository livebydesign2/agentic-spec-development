const fs = require('fs').promises;
const path = require('path');
const ConfigManager = require('./config-manager');
const { DataAdapterFactory } = require('./data-adapters');
const LRUCache = require('./lru-cache');

class SpecParser {
  constructor(configManager = null) {
    this.specs = [];
    this.configManager = configManager || new ConfigManager();

    // Load configuration
    const config = this.configManager.loadConfig();
    this.dataPath = config.dataPath;
    this.enforceSpec = config.enforceSpec;
    this.statusFolders = config.statusFolders;
    this.supportedTypes = config.supportedTypes;
    this.dataFormat = config.dataFormat || 'markdown';

    // Initialize data adapter factory with config
    this.adapterFactory = new DataAdapterFactory({
      formatOptions: config.formatOptions,
      validation: config.validation,
      conversion: config.conversion,
    });

    // Initialize LRU cache for parsed specifications
    const cacheSize = config.specCacheSize || 100;
    this.specCache = new LRUCache(cacheSize);

    // Track file modification times for cache invalidation
    this.fileMTimes = new Map();

    // Statistics for performance monitoring
    this.loadStats = {
      totalLoads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      parseTime: 0,
      lastLoadTime: null,
    };
  }

  async loadSpecs() {
    const startTime = Date.now();
    this.specs = [];
    this.loadStats.totalLoads++;

    for (const folder of this.statusFolders) {
      const folderPath = path.join(this.dataPath, folder);

      try {
        const files = await fs.readdir(folderPath);

        // Get all supported extensions from factory
        const supportedExts = this.adapterFactory
          .getSupportedFormats()
          .flatMap((format) => {
            const adapter = this.adapterFactory.create(format);
            return adapter.getSupportedExtensions();
          });

        const specFiles = files.filter((file) => {
          const ext = path.extname(file).slice(1).toLowerCase();
          return supportedExts.includes(ext);
        });

        for (const file of specFiles) {
          const filePath = path.join(folderPath, file);
          const spec = await this.parseSpecFile(filePath, folder);
          if (spec) {
            this.specs.push(spec);
          }
        }
      } catch (error) {
        console.warn(
          `Warning: Could not read folder ${folder}:`,
          error.message
        );
      }
    }

    // Sort specs: P0 first, then by ID
    this.specs.sort((a, b) => {
      if (a.priority === 'P0' && b.priority !== 'P0') return -1;
      if (b.priority === 'P0' && a.priority !== 'P0') return 1;
      return a.id.localeCompare(b.id);
    });

    // Update load statistics
    this.loadStats.parseTime = Date.now() - startTime;
    this.loadStats.lastLoadTime = new Date().toISOString();

    // Perform cache maintenance periodically
    if (this.loadStats.totalLoads % 10 === 0) {
      this.performCacheMaintenance();
    }
  }

  async parseSpecFile(filePath, status) {
    try {
      // Check if file has been modified since last cache
      const cacheKey = filePath;
      let fileStats;
      try {
        fileStats = await fs.stat(filePath);
      } catch (error) {
        console.warn(
          `Warning: Could not stat file ${filePath}:`,
          error.message
        );
        return null;
      }

      const lastMTime = this.fileMTimes.get(filePath);
      const currentMTime = fileStats.mtime.getTime();

      // Check cache if file hasn't been modified
      if (lastMTime === currentMTime && this.specCache.has(cacheKey)) {
        this.loadStats.cacheHits++;
        return this.specCache.get(cacheKey);
      }

      // File has been modified or not cached, parse it
      this.loadStats.cacheMisses++;

      // Use data adapter factory to handle different formats
      const adapter = this.adapterFactory.createFromFile(filePath);
      const metadata = adapter.extractMetadata(filePath);

      // Override status from folder structure
      metadata.status = status;

      // Load and parse the document using the appropriate adapter
      const spec = await adapter.loadDocument(filePath);

      // Validate the spec ID matches supported types
      if (!spec.id) {
        return null; // Skip if no valid ID found
      }

      const typePattern = this.supportedTypes.join('|');
      const idMatch = spec.id.match(new RegExp(`^(${typePattern})-(\\d+)`));

      if (!idMatch) {
        return null; // Skip files that don't match expected pattern
      }

      // Skip report documents
      const isReportDocument = spec.id.match(
        /-(?:report|audit-report|analysis|findings|summary)$/i
      );
      if (isReportDocument) {
        return null;
      }

      const [, type, number] = idMatch;

      // Ensure required fields are set with proper defaults
      spec.type = type;
      spec.number = parseInt(number);
      spec.status = status; // Always use folder-based status
      spec.priority = spec.priority || 'P2';
      spec.filename = path.basename(filePath, path.extname(filePath));

      // Add completion date for done specs
      if (status === 'done' && !spec.completedDate) {
        spec.completedDate = new Date().toISOString().split('T')[0];
      }

      // Cache the parsed spec and update modification time
      this.specCache.set(cacheKey, spec);
      this.fileMTimes.set(filePath, currentMTime);

      return spec;
    } catch (error) {
      console.warn(
        `Warning: Could not parse spec file ${filePath}:`,
        error.message
      );
      return null;
    }
  }

  // Modern getter methods
  getSpecs() {
    return this.specs;
  }

  getSpecById(id) {
    return this.specs.find((spec) => spec.id === id);
  }

  getSpecsByStatus(status) {
    return this.specs.filter((spec) => spec.status === status);
  }

  getSpecsByType(type) {
    return this.specs.filter((spec) => spec.type === type);
  }

  getSpecsByPriority(priority) {
    return this.specs.filter((spec) => spec.priority === priority);
  }

  getCriticalReady() {
    return this.specs.filter(
      (spec) =>
        spec.priority === 'P0' &&
        spec.status !== 'done' &&
        spec.status !== 'active'
    );
  }

  getStats() {
    const stats = {
      total: this.specs.length,
      active: this.getSpecsByStatus('active').length,
      backlog: this.getSpecsByStatus('backlog').length,
      done: this.getSpecsByStatus('done').length,
      p0: this.getSpecsByPriority('P0').length,
      byStatus: {},
      byPriority: {},
      byType: {},
    };

    // Count by status
    for (const folder of this.statusFolders) {
      stats.byStatus[folder] = this.getSpecsByStatus(folder).length;
    }

    // Count by priority
    const priorities = ['P0', 'P1', 'P2', 'P3'];
    for (const priority of priorities) {
      stats.byPriority[priority] = this.getSpecsByPriority(priority).length;
    }

    // Count by type
    for (const type of this.supportedTypes) {
      stats.byType[type] = this.getSpecsByType(type).length;
    }

    return stats;
  }

  parseTask(taskLine) {
    if (!taskLine || typeof taskLine !== 'string') {
      return null;
    }

    // Standard task format: ### **TASK-001** 🤖 **Task Title**
    let match = taskLine.match(
      /^###\s*\*\*(.+?TASK-(\d+))\*\*\s*🤖\s*\*\*(.+?)\*\*(?:\s*\|\s*Agent:\s*([^|]+))?/
    );

    if (match) {
      const [, fullId, number, title, agent] = match;
      let taskId = fullId.trim();

      // Check for emoji status prefix
      let status = 'ready';
      let icon = null;

      if (taskId.startsWith('✅')) {
        status = 'complete';
        icon = '✅';
        taskId = taskId.replace(/^✅\s*/, '');
      } else if (taskId.startsWith('🔴')) {
        status = 'ready';
        icon = '🔴';
        taskId = taskId.replace(/^🔴\s*/, '');
      } else if (taskId.startsWith('🔄')) {
        status = 'in_progress';
        icon = '🔄';
        taskId = taskId.replace(/^🔄\s*/, '');
      }

      return {
        id: taskId,
        number: parseInt(number),
        status,
        title: title.trim(),
        assigneeRole: agent ? agent.trim() : undefined,
        icon,
        subtasks: [],
      };
    }

    // MAINT task format: ### **✅ TASK-003**: Task Title (STATUS)
    match = taskLine.match(/^###\s*\*\*([✅🔴🔄]?\s*TASK-\d+)\*\*:\s*(.*)/u);

    if (match) {
      const [, fullIdPart, titleAndStatus] = match;

      // Extract emoji and task ID
      let emoji = null;
      let taskId = fullIdPart.trim();

      if (taskId.startsWith('✅')) {
        emoji = '✅';
        taskId = taskId.replace(/^✅\s*/, '');
      } else if (taskId.startsWith('🔴')) {
        emoji = '🔴';
        taskId = taskId.replace(/^🔴\s*/, '');
      } else if (taskId.startsWith('🔄')) {
        emoji = '🔄';
        taskId = taskId.replace(/^🔄\s*/, '');
      }

      // Extract title and status
      let title = titleAndStatus.trim();
      let status = 'ready';

      // Check for status in parentheses
      const statusMatch = title.match(
        /^(.*?)\s*\((COMPLETED|READY|IN PROGRESS)\)\s*$/
      );
      if (statusMatch) {
        title = statusMatch[1].trim();
        const statusText = statusMatch[2];

        if (statusText === 'COMPLETED') {
          status = 'complete';
        } else if (statusText === 'IN PROGRESS') {
          status = 'in_progress';
        }
      }

      // Set status based on emoji if no explicit status
      if (!statusMatch) {
        if (emoji === '✅') {
          status = 'complete';
        } else if (emoji === '🔄') {
          status = 'in_progress';
        }
      }

      return {
        id: taskId,
        number: parseInt(taskId.split('-')[1]),
        status,
        title: title,
        icon: emoji || undefined,
        subtasks: [],
      };
    }

    // Subtask format: - [x] Subtask title
    match = taskLine.match(/^\s*-\s*\[([ x])\]\s*(.*)/);

    if (match) {
      const [, checked, title] = match;
      return {
        type: 'subtask',
        completed: checked === 'x',
        title: title.trim(),
      };
    }

    return null;
  }

  computeFallbackDescription(lines) {
    if (!Array.isArray(lines)) {
      return '';
    }

    let problemStatement = '';
    let solutionApproach = '';
    let currentSection = null;

    for (const line of lines) {
      if (line.match(/^##\s*Problem\s*Statement/i)) {
        currentSection = 'problem';
        continue;
      } else if (line.match(/^##\s*Solution\s*Approach/i)) {
        currentSection = 'solution';
        continue;
      } else if (line.match(/^##/)) {
        currentSection = null;
        continue;
      }

      if (currentSection === 'problem' && line.trim()) {
        problemStatement += line.trim() + ' ';
      } else if (currentSection === 'solution' && line.trim()) {
        solutionApproach += line.trim() + ' ';
      }
    }

    const result = [];
    if (problemStatement.trim()) {
      result.push(problemStatement.trim());
    }
    if (solutionApproach.trim()) {
      result.push(solutionApproach.trim());
    }

    return result.join(' ');
  }

  extractTitle(content) {
    const titleMatch = content.match(/^#\s+(.+)/m);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  extractId(title, filename) {
    // Try to extract from title first
    const titleMatch = title.match(
      /^((?:SPEC|FEAT|BUG|SPIKE|MAINT|RELEASE)-\d+)/
    );
    if (titleMatch) {
      return titleMatch[1];
    }

    // Try to extract from filename
    const filenameMatch = filename.match(/^([A-Z]+-\d+)/);
    if (filenameMatch) {
      return filenameMatch[1];
    }

    return null;
  }

  extractDescription(content) {
    const descMatch = content.match(
      /##\s+Description\s*\n([\s\S]*?)(?=\n##|\n###|$)/i
    );
    return descMatch ? descMatch[1].trim() : '';
  }

  extractPriority(content) {
    const priorityMatch = content.match(/\*\*Priority:\*\*\s*(P[0-3])/i);
    return priorityMatch ? priorityMatch[1] : null;
  }

  extractTasks(content) {
    const tasks = [];
    const taskRegex = /^###\s+\*\*(.*?)\*\*.*$/gm;
    let match;

    while ((match = taskRegex.exec(content)) !== null) {
      const taskLine = match[0];
      const task = this.parseTask(taskLine);
      if (task) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  extractSection(content, sectionName) {
    const regex = new RegExp(
      `##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|\\n###|$)`,
      'i'
    );
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  }

  extractBugSeverity(content) {
    const severityMatch = content.match(/\*\*Severity:\*\*\s*(\w+)/i);
    return severityMatch ? severityMatch[1] : null;
  }

  extractResearchType(content) {
    const researchMatch = content.match(/\*\*Research Type:\*\*\s*([^\n]+)/i);
    return researchMatch ? researchMatch[1].trim() : null;
  }

  /**
   * Clear internal spec cache to force reload on next access
   */
  clearCache() {
    // Clear LRU cache and file modification times
    this.specCache.clear();
    this.fileMTimes.clear();

    // Force reload of specs on next call to getSpecs() or related methods
    this.specs = [];

    // Reset statistics
    this.loadStats.cacheHits = 0;
    this.loadStats.cacheMisses = 0;
  }

  /**
   * Invalidate cache for specific file
   */
  invalidateFileCache(filePath) {
    this.specCache.delete(filePath);
    this.fileMTimes.delete(filePath);
  }

  /**
   * Perform cache maintenance to prevent memory leaks
   */
  performCacheMaintenance() {
    const cleanedUp = this.specCache.performMaintenance({
      maxAge: 600000, // 10 minutes
      force: true,
    });

    // Clean up file modification times for evicted entries
    const validFiles = new Set(this.specCache.keys());
    for (const filePath of this.fileMTimes.keys()) {
      if (!validFiles.has(filePath)) {
        this.fileMTimes.delete(filePath);
      }
    }

    if (process.env.DEBUG_MEMORY && cleanedUp > 0) {
      console.log(`SpecParser: Cleaned up ${cleanedUp} cache entries`);
    }

    return cleanedUp;
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats() {
    return {
      specs_loaded: this.specs.length,
      cache_stats: this.specCache.getStats(),
      load_stats: { ...this.loadStats },
      file_mtimes_tracked: this.fileMTimes.size,
      cache_hit_rate:
        this.loadStats.cacheHits + this.loadStats.cacheMisses > 0
          ? Math.round(
              (this.loadStats.cacheHits /
                (this.loadStats.cacheHits + this.loadStats.cacheMisses)) *
                100
            )
          : 0,
    };
  }

  /**
   * Generate cache performance report
   */
  generateCacheReport() {
    const stats = this.getCacheStats();

    const report = [];
    report.push('=== SPEC PARSER CACHE REPORT ===');
    report.push(`Loaded Specs: ${stats.specs_loaded}`);
    report.push(`Cache Hit Rate: ${stats.cache_hit_rate}%`);
    report.push(`Cache Hits: ${stats.load_stats.cacheHits}`);
    report.push(`Cache Misses: ${stats.load_stats.cacheMisses}`);
    report.push(`Total Loads: ${stats.load_stats.totalLoads}`);
    report.push(`Last Parse Time: ${stats.load_stats.parseTime}ms`);
    report.push(`File Times Tracked: ${stats.file_mtimes_tracked}`);
    report.push('');
    report.push(this.specCache.generateReport());

    return report.join('\n');
  }
}

module.exports = SpecParser;
