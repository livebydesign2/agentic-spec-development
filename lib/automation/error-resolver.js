const EventEmitter = require('events');

/**
 * ErrorResolver - Intelligent error resolution system
 *
 * Provides automated error analysis and resolution strategies for
 * linting, testing, and git operations. Uses pattern matching and
 * heuristics to suggest and attempt automatic fixes.
 *
 * Key Features:
 * - Error pattern recognition and categorization
 * - Automated resolution strategy selection
 * - Context-aware fix suggestions
 * - Learning from successful resolutions
 * - Integration with linting and testing systems
 * - Comprehensive resolution audit trail
 */
class ErrorResolver extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      enableLearning: options.enableLearning !== false,
      maxResolutionAttempts: options.maxResolutionAttempts || 3,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      enableAuditLogging: options.enableAuditLogging !== false,
      ...options
    };

    // Resolution patterns and strategies
    this.resolutionPatterns = this.initializeResolutionPatterns();
    this.resolutionHistory = [];
    this.auditLog = [];

    // Statistics
    this.statistics = {
      totalResolutionAttempts: 0,
      successfulResolutions: 0,
      automaticFixes: 0,
      manualInterventionsRequired: 0,
      patternMatches: 0,
      learningUpdates: 0
    };
  }

  /**
   * Initialize error resolution patterns
   * @returns {Object} Resolution patterns by category
   */
  initializeResolutionPatterns() {
    return {
      linting: {
        // ESLint patterns
        'Missing semicolon': {
          pattern: /Missing semicolon/i,
          resolution: 'automatic',
          strategy: 'add_semicolon',
          confidence: 0.95,
          tools: ['eslint --fix', 'prettier']
        },
        'Extra semicolon': {
          pattern: /Extra semicolon/i,
          resolution: 'automatic',
          strategy: 'remove_semicolon',
          confidence: 0.95,
          tools: ['eslint --fix']
        },
        'Unexpected trailing comma': {
          pattern: /Unexpected trailing comma/i,
          resolution: 'automatic',
          strategy: 'remove_trailing_comma',
          confidence: 0.9,
          tools: ['eslint --fix', 'prettier']
        },
        'Missing trailing comma': {
          pattern: /Missing trailing comma/i,
          resolution: 'automatic',
          strategy: 'add_trailing_comma',
          confidence: 0.9,
          tools: ['eslint --fix', 'prettier']
        },
        'Incorrect indentation': {
          pattern: /(incorrect|wrong|bad)\s+indent/i,
          resolution: 'automatic',
          strategy: 'fix_indentation',
          confidence: 0.85,
          tools: ['prettier', 'eslint --fix']
        },
        'Mixed spaces and tabs': {
          pattern: /(mixed|mixing)\s+(spaces?|tabs?)/i,
          resolution: 'automatic',
          strategy: 'normalize_whitespace',
          confidence: 0.9,
          tools: ['prettier', 'eslint --fix']
        },
        'Unused variable': {
          pattern: /(unused|defined but never used)\s+(variable|var|let|const)/i,
          resolution: 'manual',
          strategy: 'review_usage',
          confidence: 0.6,
          suggestions: [
            'Remove unused variable if not needed',
            'Add usage for the variable',
            'Add underscore prefix to indicate intentional non-use'
          ]
        },
        'Undefined variable': {
          pattern: /(undefined|not defined)\s+(variable|identifier)/i,
          resolution: 'manual',
          strategy: 'define_variable',
          confidence: 0.7,
          suggestions: [
            'Import the variable/function if from another module',
            'Define the variable in current scope',
            'Check for typos in variable name'
          ]
        }
      },
      testing: {
        'Module not found': {
          pattern: /Cannot find module|Module not found/i,
          resolution: 'automatic',
          strategy: 'install_dependency',
          confidence: 0.8,
          tools: ['npm install'],
          suggestions: [
            'Run npm install to install missing dependencies',
            'Check if module name is correct',
            'Verify module is listed in package.json'
          ]
        },
        'Async test timeout': {
          pattern: /timeout|async.*timeout|exceeded.*timeout/i,
          resolution: 'manual',
          strategy: 'increase_timeout',
          confidence: 0.7,
          suggestions: [
            'Increase test timeout value',
            'Check for infinite loops or hanging promises',
            'Add proper async/await handling'
          ]
        },
        'Assertion failure': {
          pattern: /assertion|expected.*actual|AssertionError/i,
          resolution: 'manual',
          strategy: 'review_assertion',
          confidence: 0.5,
          suggestions: [
            'Review test expectations vs actual behavior',
            'Check test data and setup',
            'Verify function implementation'
          ]
        },
        'Network/HTTP error': {
          pattern: /ENOTFOUND|ECONNREFUSED|network|http.*error/i,
          resolution: 'manual',
          strategy: 'check_network',
          confidence: 0.6,
          suggestions: [
            'Check network connectivity',
            'Verify external service availability',
            'Mock network calls in tests'
          ]
        }
      },
      git: {
        'Pre-commit hook failed': {
          pattern: /pre-commit.*failed|hook.*failed/i,
          resolution: 'automatic',
          strategy: 'retry_after_staging',
          confidence: 0.8,
          tools: ['git add', 'git commit']
        },
        'Merge conflict': {
          pattern: /merge conflict|conflict.*merge/i,
          resolution: 'manual',
          strategy: 'resolve_conflict',
          confidence: 0.4,
          suggestions: [
            'Resolve conflicts manually in affected files',
            'Use git mergetool for guided resolution',
            'Consider rebasing instead of merging'
          ]
        },
        'Nothing to commit': {
          pattern: /nothing to commit|working.*clean/i,
          resolution: 'informational',
          strategy: 'no_action',
          confidence: 1.0,
          suggestions: ['No changes to commit']
        },
        'Branch not found': {
          pattern: /branch.*not found|no such branch/i,
          resolution: 'manual',
          strategy: 'create_or_checkout_branch',
          confidence: 0.6,
          suggestions: [
            'Create new branch with git checkout -b <branch>',
            'Check available branches with git branch -a',
            'Verify branch name spelling'
          ]
        }
      },
      general: {
        'Permission denied': {
          pattern: /permission denied|access denied|EACCES/i,
          resolution: 'manual',
          strategy: 'fix_permissions',
          confidence: 0.6,
          suggestions: [
            'Check file/directory permissions',
            'Run command with appropriate privileges',
            'Verify ownership of files'
          ]
        },
        'File not found': {
          pattern: /no such file|file not found|ENOENT/i,
          resolution: 'manual',
          strategy: 'locate_file',
          confidence: 0.7,
          suggestions: [
            'Verify file path is correct',
            'Check if file exists in expected location',
            'Create missing file if needed'
          ]
        },
        'Command not found': {
          pattern: /command not found|not recognized.*command/i,
          resolution: 'manual',
          strategy: 'install_command',
          confidence: 0.8,
          suggestions: [
            'Install required command/tool',
            'Check PATH environment variable',
            'Verify command spelling'
          ]
        }
      }
    };
  }

  /**
   * Analyze error and determine resolution strategy
   * @param {string} error - Error message or output
   * @param {string} context - Error context (linting, testing, git, etc.)
   * @returns {Object} Error analysis and resolution recommendations
   */
  analyzeError(error, context = 'general') {
    const startTime = Date.now();

    try {
      this.logAuditEvent('error_analysis_started', {
        context,
        hasError: !!error,
        errorLength: error ? error.length : 0,
        timestamp: new Date().toISOString()
      });

      if (!error || error.trim().length === 0) {
        return {
          success: false,
          error: 'No error message provided for analysis'
        };
      }

      const analysis = {
        context,
        originalError: error,
        patterns: [],
        resolutions: [],
        confidence: 0,
        automaticFixAvailable: false,
        manualInterventionRequired: false,
        suggestions: [],
        tools: [],
        analysisTime: 0
      };

      // Get patterns for the specified context and general patterns
      const contextPatterns = this.resolutionPatterns[context] || {};
      const generalPatterns = this.resolutionPatterns.general || {};
      const allPatterns = { ...contextPatterns, ...generalPatterns };

      // Match error against patterns
      for (const [patternName, patternInfo] of Object.entries(allPatterns)) {
        if (patternInfo.pattern.test(error)) {
          this.statistics.patternMatches++;

          const match = {
            name: patternName,
            confidence: patternInfo.confidence,
            resolution: patternInfo.resolution,
            strategy: patternInfo.strategy,
            tools: patternInfo.tools || [],
            suggestions: patternInfo.suggestions || []
          };

          analysis.patterns.push(match);
          analysis.resolutions.push(match);
          analysis.suggestions.push(...match.suggestions);
          analysis.tools.push(...match.tools);

          // Update confidence (use highest confidence match)
          analysis.confidence = Math.max(analysis.confidence, match.confidence);

          // Determine if automatic fix is available
          if (match.resolution === 'automatic' && match.confidence >= this.options.confidenceThreshold) {
            analysis.automaticFixAvailable = true;
          }

          if (match.resolution === 'manual') {
            analysis.manualInterventionRequired = true;
          }
        }
      }

      // Remove duplicate tools and suggestions
      analysis.tools = [...new Set(analysis.tools)];
      analysis.suggestions = [...new Set(analysis.suggestions)];

      // Sort resolutions by confidence
      analysis.resolutions.sort((a, b) => b.confidence - a.confidence);

      analysis.analysisTime = Date.now() - startTime;
      this.statistics.totalResolutionAttempts++;

      this.logAuditEvent('error_analysis_completed', {
        patternsMatched: analysis.patterns.length,
        confidence: analysis.confidence,
        automaticFixAvailable: analysis.automaticFixAvailable,
        analysisTime: analysis.analysisTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        analysis
      };

    } catch (error) {
      this.logAuditEvent('error_analysis_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `Error analysis failed: ${error.message}`
      };
    }
  }

  /**
   * Generate resolution recommendations
   * @param {Object} analysis - Error analysis result
   * @returns {Object} Resolution recommendations
   */
  generateResolutionRecommendations(analysis) {
    try {
      const recommendations = {
        immediate: [], // High confidence automatic fixes
        suggested: [], // Medium confidence suggestions
        manual: [], // Manual intervention required
        informational: [] // Information only
      };

      for (const resolution of analysis.resolutions) {
        const recommendation = {
          name: resolution.name,
          strategy: resolution.strategy,
          confidence: resolution.confidence,
          tools: resolution.tools,
          suggestions: resolution.suggestions
        };

        if (resolution.resolution === 'automatic' && resolution.confidence >= this.options.confidenceThreshold) {
          recommendations.immediate.push(recommendation);
        } else if (resolution.resolution === 'automatic') {
          recommendations.suggested.push(recommendation);
        } else if (resolution.resolution === 'manual') {
          recommendations.manual.push(recommendation);
        } else {
          recommendations.informational.push(recommendation);
        }
      }

      // Sort each category by confidence
      for (const category of Object.keys(recommendations)) {
        recommendations[category].sort((a, b) => b.confidence - a.confidence);
      }

      return {
        success: true,
        recommendations,
        summary: {
          immediateActions: recommendations.immediate.length,
          suggestedActions: recommendations.suggested.length,
          manualActions: recommendations.manual.length,
          informationalItems: recommendations.informational.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to generate recommendations: ${error.message}`
      };
    }
  }

  /**
   * Learn from successful resolution
   * @param {Object} resolution - Successful resolution details
   * @param {Object} context - Resolution context
   */
  learnFromResolution(resolution, context) {
    if (!this.options.enableLearning) {
      return;
    }

    try {
      const learningEntry = {
        timestamp: new Date().toISOString(),
        resolution: resolution,
        context: context,
        success: true
      };

      this.resolutionHistory.push(learningEntry);
      this.statistics.learningUpdates++;

      // Limit history size
      if (this.resolutionHistory.length > 1000) {
        this.resolutionHistory = this.resolutionHistory.slice(-500);
      }

      this.logAuditEvent('resolution_learned', {
        resolution: resolution.name || resolution.strategy,
        context: context.type || 'unknown',
        timestamp: learningEntry.timestamp
      });

      this.emit('learning_update', learningEntry);

    } catch (error) {
      console.warn(`⚠️  Learning update failed: ${error.message}`);
    }
  }

  /**
   * Get resolution suggestions for display
   * @param {Object} analysis - Error analysis
   * @returns {Array} Formatted suggestions
   */
  getFormattedSuggestions(analysis) {
    const formatted = [];

    if (analysis.automaticFixAvailable) {
      formatted.push({
        type: 'automatic',
        icon: '🔧',
        message: 'Automatic fixes available - run auto-fix tools',
        tools: analysis.tools.filter(tool =>
          analysis.resolutions.some(r =>
            r.resolution === 'automatic' &&
            r.tools.includes(tool)
          )
        )
      });
    }

    if (analysis.manualInterventionRequired) {
      const manualSuggestions = analysis.suggestions.filter(s =>
        analysis.resolutions.some(r =>
          r.resolution === 'manual' &&
          r.suggestions.includes(s)
        )
      );

      formatted.push({
        type: 'manual',
        icon: '✍️',
        message: 'Manual intervention required',
        suggestions: manualSuggestions
      });
    }

    if (analysis.patterns.length === 0) {
      formatted.push({
        type: 'unknown',
        icon: '❓',
        message: 'No known resolution patterns found',
        suggestions: [
          'Review error message manually',
          'Check documentation for the tool/command',
          'Search online for similar errors'
        ]
      });
    }

    return formatted;
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      resolutionHistory: this.resolutionHistory.length,
      patternCount: Object.keys(this.resolutionPatterns).reduce((total, category) =>
        total + Object.keys(this.resolutionPatterns[category]).length, 0
      ),
      successRate: this.statistics.totalResolutionAttempts > 0 ?
        this.statistics.successfulResolutions / this.statistics.totalResolutionAttempts : 0,
      timestamp: new Date().toISOString()
    };
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
      this.auditLog = this.auditLog.slice(-250);
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
}

module.exports = ErrorResolver;