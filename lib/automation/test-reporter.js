const EventEmitter = require('events');
const __path = require('path');

/**
 * TestReporter - Advanced test result analysis and reporting
 *
 * Provides comprehensive test result analysis, trend tracking,
 * and actionable failure reporting with integration capabilities
 * for CI/CD systems and development workflows.
 *
 * Key Features:
 * - Multi-format test result parsing and analysis
 * - Test trend analysis and performance tracking
 * - Failure categorization with actionable suggestions
 * - Coverage analysis and reporting
 * - Flaky test detection and tracking
 * - Integration with external reporting systems
 * - Historical data analysis and insights
 */
class TestReporter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      enableTrendAnalysis: options.enableTrendAnalysis !== false,
      historySize: options.historySize || 100,
      coverageThreshold: options.coverageThreshold || 80,
      performanceThreshold: options.performanceThreshold || 30000, // 30 seconds
      flakyTestThreshold: options.flakyTestThreshold || 3,
      enableAuditLogging: options.enableAuditLogging !== false,
      ...options
    };

    // Test history and analysis
    this.testHistory = [];
    this.coverageHistory = [];
    this.performanceHistory = [];
    this.flakyTestRegistry = new Map();
    this.auditLog = [];

    // Report templates and formatters
    this.reportTemplates = {
      summary: this.generateSummaryReport.bind(this),
      detailed: this.generateDetailedReport.bind(this),
      coverage: this.generateCoverageReport.bind(this),
      trends: this.generateTrendsReport.bind(this),
      flaky: this.generateFlakyTestReport.bind(this)
    };

    // Statistics
    this.statistics = {
      totalReports: 0,
      successfulTests: 0,
      failedTests: 0,
      averageCoverage: 0,
      averageExecutionTime: 0,
      trendsAnalyzed: 0,
      flakyTestsIdentified: 0
    };
  }

  /**
   * Process test results and generate comprehensive report
   * @param {Object} testResult - Test execution result
   * @param {Object} options - Reporting options
   * @returns {Promise<Object>} Report generation result
   */
  async processTestResults(testResult, options = {}) {
    try {
      const {
        reportType = 'summary',
        includeHistory = true,
        analyzeTrends = this.options.enableTrendAnalysis,
        detectFlakyTests = true,
        generateInsights = true
      } = options;

      this.logAuditEvent('test_result_processing_started', {
        reportType,
        hasResults: !!testResult,
        options: options,
        timestamp: new Date().toISOString()
      });

      // Validate input
      if (!testResult || typeof testResult !== 'object') {
        throw new Error('Invalid test result provided');
      }

      // Extract and normalize test data
      const normalizedResult = this.normalizeTestResult(testResult);

      // Store in history
      if (includeHistory) {
        this.addToHistory(normalizedResult);
      }

      // Analyze trends if enabled
      let trendAnalysis = null;
      if (analyzeTrends && this.testHistory.length > 1) {
        trendAnalysis = this.analyzeTrends();
      }

      // Detect flaky tests
      let flakyTestAnalysis = null;
      if (detectFlakyTests) {
        flakyTestAnalysis = this.analyzeFlakyTests(normalizedResult);
      }

      // Generate coverage analysis
      const coverageAnalysis = this.analyzeCoverage(normalizedResult);

      // Generate performance analysis
      const performanceAnalysis = this.analyzePerformance(normalizedResult);

      // Generate insights
      let insights = null;
      if (generateInsights) {
        insights = this.generateInsights(normalizedResult, {
          trends: trendAnalysis,
          flaky: flakyTestAnalysis,
          coverage: coverageAnalysis,
          performance: performanceAnalysis
        });
      }

      // Generate the requested report
      const report = await this.generateReport(reportType, {
        testResult: normalizedResult,
        trends: trendAnalysis,
        flaky: flakyTestAnalysis,
        coverage: coverageAnalysis,
        performance: performanceAnalysis,
        insights: insights
      });

      // Update statistics
      this.updateStatistics(normalizedResult);

      const result = {
        success: true,
        report,
        analysis: {
          trends: trendAnalysis,
          flaky: flakyTestAnalysis,
          coverage: coverageAnalysis,
          performance: performanceAnalysis,
          insights: insights
        },
        metadata: {
          reportType,
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - Date.now() // Will be updated
        }
      };

      this.logAuditEvent('test_result_processing_completed', {
        reportType,
        success: true,
        hasInsights: !!insights,
        timestamp: new Date().toISOString()
      });

      this.emit('report_generated', result);
      return result;

    } catch (error) {
      this.logAuditEvent('test_result_processing_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `Test result processing failed: ${error.message}`
      };
    }
  }

  /**
   * Normalize test result data to standard format
   * @param {Object} testResult - Raw test result
   * @returns {Object} Normalized test result
   */
  normalizeTestResult(testResult) {
    const normalized = {
      timestamp: new Date().toISOString(),
      framework: testResult.framework || 'unknown',
      success: testResult.success || false,
      executionTime: testResult.executionTime || 0,
      tests: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        details: []
      },
      coverage: null,
      errors: [],
      warnings: [],
      performance: {
        executionTime: testResult.executionTime || 0,
        averageTestTime: 0,
        slowTests: []
      },
      metadata: {
        attempts: testResult.attempts || 1,
        retryApplied: testResult.retryApplied || false,
        flakyTestsDetected: testResult.flakyTestsDetected || 0
      }
    };

    // Extract test statistics
    if (testResult.parsedResults) {
      const stats = testResult.parsedResults;
      normalized.tests.total = stats.totalTests || 0;
      normalized.tests.passed = stats.passedTests || 0;
      normalized.tests.failed = (stats.failedTests?.length || 0);
      normalized.tests.skipped = stats.skippedTests || 0;
      normalized.tests.details = stats.failedTests || [];

      if (stats.coverage) {
        normalized.coverage = {
          percentage: stats.coverage.percentage || 0,
          lines: stats.coverage.lines || null,
          branches: stats.coverage.branches || null,
          functions: stats.coverage.functions || null,
          statements: stats.coverage.statements || null
        };
      }
    }

    // Extract errors and warnings from output
    if (testResult.output) {
      normalized.errors = this.extractErrors(testResult.output);
      normalized.warnings = this.extractWarnings(testResult.output);
    }

    // Calculate performance metrics
    if (normalized.tests.total > 0 && normalized.executionTime > 0) {
      normalized.performance.averageTestTime = normalized.executionTime / normalized.tests.total;
    }

    return normalized;
  }

  /**
   * Extract errors from test output
   * @param {string} output - Test output
   * @returns {Array} Extracted errors
   */
  extractErrors(output) {
    const errors = [];
    const errorPatterns = [
      /Error: (.+)/g,
      /AssertionError: (.+)/g,
      /TypeError: (.+)/g,
      /ReferenceError: (.+)/g,
      /SyntaxError: (.+)/g
    ];

    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        errors.push({
          type: match[0].split(':')[0],
          message: match[1],
          timestamp: new Date().toISOString()
        });
      }
    }

    return errors;
  }

  /**
   * Extract warnings from test output
   * @param {string} output - Test output
   * @returns {Array} Extracted warnings
   */
  extractWarnings(output) {
    const warnings = [];
    const warningPatterns = [
      /Warning: (.+)/g,
      /DeprecationWarning: (.+)/g,
      /UnhandledPromiseRejectionWarning: (.+)/g
    ];

    for (const pattern of warningPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        warnings.push({
          type: match[0].split(':')[0],
          message: match[1],
          timestamp: new Date().toISOString()
        });
      }
    }

    return warnings;
  }

  /**
   * Add test result to history
   * @param {Object} normalizedResult - Normalized test result
   */
  addToHistory(normalizedResult) {
    this.testHistory.push(normalizedResult);

    // Limit history size
    if (this.testHistory.length > this.options.historySize) {
      this.testHistory = this.testHistory.slice(-this.options.historySize);
    }

    // Add coverage history
    if (normalizedResult.coverage) {
      this.coverageHistory.push({
        timestamp: normalizedResult.timestamp,
        percentage: normalizedResult.coverage.percentage
      });

      if (this.coverageHistory.length > this.options.historySize) {
        this.coverageHistory = this.coverageHistory.slice(-this.options.historySize);
      }
    }

    // Add performance history
    this.performanceHistory.push({
      timestamp: normalizedResult.timestamp,
      executionTime: normalizedResult.executionTime,
      averageTestTime: normalizedResult.performance.averageTestTime
    });

    if (this.performanceHistory.length > this.options.historySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.options.historySize);
    }
  }

  /**
   * Analyze test trends over time
   * @returns {Object} Trend analysis
   */
  analyzeTrends() {
    if (this.testHistory.length < 2) {
      return null;
    }

    const recent = this.testHistory.slice(-10); // Last 10 runs
    const older = this.testHistory.slice(-20, -10); // Previous 10 runs

    const analysis = {
      testCount: this.analyzeTrendMetric(recent, older, 'tests', 'total'),
      successRate: this.analyzeTrendMetric(recent, older, 'tests', 'passed', (passed, total) => (passed / total) * 100),
      executionTime: this.analyzeTrendMetric(recent, older, 'executionTime'),
      coverage: null,
      stability: this.analyzeStability(recent)
    };

    // Coverage trend analysis
    if (this.coverageHistory.length >= 2) {
      const recentCoverage = this.coverageHistory.slice(-10);
      const olderCoverage = this.coverageHistory.slice(-20, -10);

      if (recentCoverage.length > 0 && olderCoverage.length > 0) {
        const recentAvg = recentCoverage.reduce((sum, item) => sum + item.percentage, 0) / recentCoverage.length;
        const olderAvg = olderCoverage.reduce((sum, item) => sum + item.percentage, 0) / olderCoverage.length;

        analysis.coverage = {
          trend: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
          change: recentAvg - olderAvg,
          current: recentAvg,
          previous: olderAvg
        };
      }
    }

    this.statistics.trendsAnalyzed++;
    return analysis;
  }

  /**
   * Analyze trend for specific metric
   * @param {Array} recent - Recent test results
   * @param {Array} older - Older test results
   * @param {string} path - Property path
   * @param {string} subPath - Sub-property path
   * @param {Function} calculator - Custom calculation function
   * @returns {Object} Trend analysis for metric
   */
  analyzeTrendMetric(recent, older, path, subPath = null, calculator = null) {
    if (recent.length === 0 || older.length === 0) {
      return null;
    }

    const getValue = (item) => {
      let value = subPath ? item[path][subPath] : item[path];
      if (calculator && subPath) {
        value = calculator(item[path][subPath], item[path].total);
      }
      return value || 0;
    };

    const recentAvg = recent.reduce((sum, item) => sum + getValue(item), 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + getValue(item), 0) / older.length;

    const change = recentAvg - olderAvg;
    const changePercent = olderAvg !== 0 ? (change / olderAvg) * 100 : 0;

    return {
      trend: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
      change: change,
      changePercent: changePercent,
      current: recentAvg,
      previous: olderAvg
    };
  }

  /**
   * Analyze test stability
   * @param {Array} results - Recent test results
   * @returns {Object} Stability analysis
   */
  analyzeStability(results) {
    if (results.length < 3) {
      return null;
    }

    const successRates = results.map(r =>
      r.tests.total > 0 ? (r.tests.passed / r.tests.total) * 100 : 0
    );

    const mean = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    const variance = successRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / successRates.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      mean: mean,
      standardDeviation: standardDeviation,
      coefficient: mean !== 0 ? standardDeviation / mean : 0,
      stability: standardDeviation < 5 ? 'stable' : standardDeviation < 15 ? 'moderate' : 'unstable'
    };
  }

  /**
   * Analyze flaky tests
   * @param {Object} testResult - Current test result
   * @returns {Object} Flaky test analysis
   */
  analyzeFlakyTests(testResult) {
    const analysis = {
      detected: [],
      historical: [],
      recommendations: []
    };

    // Detect current flaky tests
    if (testResult.metadata.flakyTestsDetected > 0 || testResult.metadata.retryApplied) {
      // Extract flaky test information from current run
      const flakyTests = testResult.tests.details.filter(test =>
        this.isPotentiallyFlaky(test)
      );

      analysis.detected = flakyTests;

      // Update flaky test registry
      for (const test of flakyTests) {
        this.updateFlakyTestRegistry(test);
      }
    }

    // Get historical flaky tests
    analysis.historical = Array.from(this.flakyTestRegistry.entries()).map(([name, data]) => ({
      name,
      occurrences: data.count,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      pattern: data.pattern
    }));

    // Generate recommendations
    if (analysis.detected.length > 0 || analysis.historical.length > 0) {
      analysis.recommendations = [
        'Consider adding retry logic for flaky tests',
        'Investigate root causes of test instability',
        'Add better test isolation and cleanup',
        'Consider using test doubles for external dependencies',
        'Review timing-dependent assertions'
      ];
    }

    return analysis;
  }

  /**
   * Check if test is potentially flaky
   * @param {Object} test - Test information
   * @returns {boolean} Whether test might be flaky
   */
  isPotentiallyFlaky(test) {
    const flakyIndicators = [
      /timeout/i,
      /network/i,
      /race.condition/i,
      /timing/i,
      /async/i,
      /intermittent/i,
      /flaky/i,
      /random/i
    ];

    const testInfo = test.message || test.error || test.name || '';
    return flakyIndicators.some(indicator => indicator.test(testInfo));
  }

  /**
   * Update flaky test registry
   * @param {Object} test - Test information
   */
  updateFlakyTestRegistry(test) {
    const testName = test.name || test.title || 'unknown';
    const existing = this.flakyTestRegistry.get(testName) || {
      count: 0,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      pattern: null
    };

    existing.count++;
    existing.lastSeen = new Date().toISOString();

    // Identify patterns
    const message = test.message || test.error || '';
    if (message.includes('timeout')) {
      existing.pattern = 'timeout';
    } else if (message.includes('network')) {
      existing.pattern = 'network';
    } else if (message.includes('async')) {
      existing.pattern = 'async';
    }

    this.flakyTestRegistry.set(testName, existing);
  }

  /**
   * Analyze test coverage
   * @param {Object} testResult - Test result
   * @returns {Object} Coverage analysis
   */
  analyzeCoverage(testResult) {
    const analysis = {
      current: null,
      status: 'unknown',
      recommendations: []
    };

    if (!testResult.coverage) {
      analysis.recommendations.push('Enable code coverage reporting');
      return analysis;
    }

    analysis.current = testResult.coverage;
    const percentage = testResult.coverage.percentage;

    // Determine coverage status
    if (percentage >= this.options.coverageThreshold) {
      analysis.status = 'good';
    } else if (percentage >= this.options.coverageThreshold * 0.8) {
      analysis.status = 'moderate';
      analysis.recommendations.push('Increase test coverage to meet threshold');
    } else {
      analysis.status = 'poor';
      analysis.recommendations.push('Significantly increase test coverage');
      analysis.recommendations.push('Focus on testing critical code paths');
    }

    // Add specific recommendations based on coverage details
    if (testResult.coverage.lines && testResult.coverage.lines < percentage) {
      analysis.recommendations.push('Improve line coverage');
    }

    if (testResult.coverage.branches && testResult.coverage.branches < percentage) {
      analysis.recommendations.push('Add tests for conditional branches');
    }

    if (testResult.coverage.functions && testResult.coverage.functions < percentage) {
      analysis.recommendations.push('Test uncovered functions');
    }

    return analysis;
  }

  /**
   * Analyze test performance
   * @param {Object} testResult - Test result
   * @returns {Object} Performance analysis
   */
  analyzePerformance(testResult) {
    const analysis = {
      executionTime: testResult.executionTime,
      status: 'unknown',
      recommendations: []
    };

    // Determine performance status
    if (testResult.executionTime <= this.options.performanceThreshold * 0.5) {
      analysis.status = 'excellent';
    } else if (testResult.executionTime <= this.options.performanceThreshold) {
      analysis.status = 'good';
    } else if (testResult.executionTime <= this.options.performanceThreshold * 1.5) {
      analysis.status = 'slow';
      analysis.recommendations.push('Consider optimizing slow tests');
    } else {
      analysis.status = 'very_slow';
      analysis.recommendations.push('Investigate and optimize very slow tests');
      analysis.recommendations.push('Consider parallel test execution');
    }

    // Analyze average test time
    if (testResult.performance.averageTestTime > 1000) { // > 1 second per test
      analysis.recommendations.push('Individual tests are taking too long');
    }

    return analysis;
  }

  /**
   * Generate insights from all analyses
   * @param {Object} testResult - Test result
   * @param {Object} analyses - All analysis results
   * @returns {Object} Generated insights
   */
  generateInsights(testResult, analyses) {
    const insights = {
      summary: '',
      recommendations: [],
      priorities: [],
      warnings: []
    };

    // Generate summary
    const successRate = testResult.tests.total > 0 ?
      (testResult.tests.passed / testResult.tests.total) * 100 : 0;

    insights.summary = `Test suite ${testResult.success ? 'passed' : 'failed'} ` +
      `with ${successRate.toFixed(1)}% success rate ` +
      `(${testResult.tests.passed}/${testResult.tests.total} tests)`;

    // Coverage insights
    if (analyses.coverage && analyses.coverage.current) {
      const coverage = analyses.coverage.current.percentage;
      insights.summary += `. Code coverage: ${coverage.toFixed(1)}%`;

      if (analyses.coverage.status === 'poor') {
        insights.priorities.push('Improve test coverage');
      }
    }

    // Performance insights
    if (analyses.performance) {
      if (analyses.performance.status === 'slow' || analyses.performance.status === 'very_slow') {
        insights.priorities.push('Optimize test performance');
      }
    }

    // Flaky test insights
    if (analyses.flaky && analyses.flaky.detected.length > 0) {
      insights.warnings.push(`${analyses.flaky.detected.length} flaky tests detected`);
      insights.priorities.push('Address flaky tests');
    }

    // Trend insights
    if (analyses.trends) {
      if (analyses.trends.successRate && analyses.trends.successRate.trend === 'declining') {
        insights.warnings.push('Test success rate is declining');
        insights.priorities.push('Investigate failing tests');
      }

      if (analyses.trends.coverage && analyses.trends.coverage.trend === 'declining') {
        insights.warnings.push('Code coverage is declining');
      }
    }

    // Collect all recommendations
    Object.values(analyses).forEach(analysis => {
      if (analysis && analysis.recommendations) {
        insights.recommendations.push(...analysis.recommendations);
      }
    });

    // Remove duplicates
    insights.recommendations = [...new Set(insights.recommendations)];
    insights.priorities = [...new Set(insights.priorities)];
    insights.warnings = [...new Set(insights.warnings)];

    return insights;
  }

  /**
   * Generate report based on type
   * @param {string} reportType - Type of report to generate
   * @param {Object} data - Report data
   * @returns {Promise<Object>} Generated report
   */
  async generateReport(reportType, data) {
    try {
      const generator = this.reportTemplates[reportType];
      if (!generator) {
        throw new Error(`Unknown report type: ${reportType}`);
      }

      return await generator(data);
    } catch (error) {
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Generate summary report
   * @param {Object} data - Report data
   * @returns {Object} Summary report
   */
  generateSummaryReport(data) {
    const { testResult, insights, coverage, _performance } = data;

    return {
      type: 'summary',
      title: 'Test Execution Summary',
      overview: {
        success: testResult.success,
        tests: testResult.tests,
        executionTime: testResult.executionTime,
        coverage: coverage?.current?.percentage || null,
        framework: testResult.framework
      },
      insights: insights?.summary || 'No insights available',
      recommendations: insights?.recommendations?.slice(0, 5) || [],
      warnings: insights?.warnings || [],
      priorities: insights?.priorities || [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate detailed report
   * @param {Object} data - Report data
   * @returns {Object} Detailed report
   */
  generateDetailedReport(data) {
    return {
      type: 'detailed',
      title: 'Detailed Test Analysis Report',
      summary: this.generateSummaryReport(data),
      testResults: data.testResult,
      analyses: {
        trends: data.trends,
        flaky: data.flaky,
        coverage: data.coverage,
        performance: data.performance
      },
      insights: data.insights,
      history: {
        recentRuns: this.testHistory.slice(-5),
        totalRuns: this.testHistory.length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate coverage report
   * @param {Object} data - Report data
   * @returns {Object} Coverage report
   */
  generateCoverageReport(data) {
    const { coverage } = data;

    return {
      type: 'coverage',
      title: 'Code Coverage Report',
      current: coverage?.current || null,
      status: coverage?.status || 'unknown',
      threshold: this.options.coverageThreshold,
      recommendations: coverage?.recommendations || [],
      history: this.coverageHistory.slice(-10),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate trends report
   * @param {Object} data - Report data
   * @returns {Object} Trends report
   */
  generateTrendsReport(data) {
    const { trends } = data;

    return {
      type: 'trends',
      title: 'Test Trends Analysis',
      trends: trends || null,
      history: {
        tests: this.testHistory.slice(-20),
        coverage: this.coverageHistory.slice(-20),
        performance: this.performanceHistory.slice(-20)
      },
      insights: trends ? [
        `Success rate trend: ${trends.successRate?.trend || 'unknown'}`,
        `Execution time trend: ${trends.executionTime?.trend || 'unknown'}`,
        `Coverage trend: ${trends.coverage?.trend || 'unknown'}`
      ] : [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate flaky test report
   * @param {Object} data - Report data
   * @returns {Object} Flaky test report
   */
  generateFlakyTestReport(data) {
    const { flaky } = data;

    return {
      type: 'flaky',
      title: 'Flaky Tests Report',
      current: flaky?.detected || [],
      historical: flaky?.historical || [],
      recommendations: flaky?.recommendations || [],
      statistics: {
        totalFlakyTests: this.flakyTestRegistry.size,
        recentlyDetected: flaky?.detected?.length || 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update statistics
   * @param {Object} testResult - Test result
   */
  updateStatistics(testResult) {
    this.statistics.totalReports++;
    this.statistics.successfulTests += testResult.tests.passed;
    this.statistics.failedTests += testResult.tests.failed;

    if (testResult.coverage && testResult.coverage.percentage) {
      this.statistics.averageCoverage =
        (this.statistics.averageCoverage * (this.statistics.totalReports - 1) + testResult.coverage.percentage) /
        this.statistics.totalReports;
    }

    this.statistics.averageExecutionTime =
      (this.statistics.averageExecutionTime * (this.statistics.totalReports - 1) + testResult.executionTime) /
      this.statistics.totalReports;
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      history: {
        testRuns: this.testHistory.length,
        coverageEntries: this.coverageHistory.length,
        performanceEntries: this.performanceHistory.length
      },
      flakyTests: {
        total: this.flakyTestRegistry.size,
        active: Array.from(this.flakyTestRegistry.values()).filter(t =>
          new Date(t.lastSeen) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        ).length
      },
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

module.exports = TestReporter;