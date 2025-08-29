const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

/**
 * TestingSystem - Comprehensive testing automation with intelligent failure analysis
 *
 * Provides automated test execution with detailed failure reporting, performance
 * monitoring, and intelligent retry strategies. Integrates with popular testing
 * frameworks and provides actionable failure analysis.
 *
 * Key Features:
 * - Multi-framework test execution (Jest, Mocha, etc.)
 * - Intelligent test result parsing and categorization
 * - Performance monitoring with timeout handling
 * - Flaky test detection and retry logic
 * - Comprehensive failure reporting with suggested fixes
 * - Test coverage analysis and reporting
 * - Parallel test execution support
 * - Integration with CI/CD systems
 */
class TestingSystem extends EventEmitter {
  constructor(configManager, errorResolver, options = {}) {
    super();

    this.configManager = configManager;
    this.errorResolver = errorResolver;
    this.options = {
      commandTimeout: options.commandTimeout || 300000, // 5 minutes for test suites
      retryAttempts: options.retryAttempts || 2,
      retryDelay: options.retryDelay || 2000, // 2 seconds
      flakyTestThreshold: options.flakyTestThreshold || 3, // Retries for flaky tests
      enableCoverage: options.enableCoverage !== false,
      parallelExecution: options.parallelExecution || false,
      enableAuditLogging: options.enableAuditLogging !== false,
      failFast: options.failFast || false,
      ...options
    };

    // Testing state
    this.isRunning = false;
    this.currentSession = null;
    this.auditLog = [];

    // Performance metrics
    this.metrics = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      flakyTests: 0,
      averageExecutionTime: 0,
      averageTestTime: 0,
      lastRunTime: null,
      coverageData: null
    };

    // Test framework configurations
    this.supportedFrameworks = {
      jest: {
        command: 'npm',
        args: ['test'],
        coverageArgs: ['run', 'test:coverage'],
        configFiles: ['jest.config.js', 'jest.config.json', 'package.json'],
        resultParser: this.parseJestResults.bind(this)
      },
      mocha: {
        command: 'npx',
        args: ['mocha'],
        coverageArgs: ['nyc', 'mocha'],
        configFiles: ['.mocharc.js', '.mocharc.json', 'mocha.opts'],
        resultParser: this.parseMochaResults.bind(this)
      },
      vitest: {
        command: 'npx',
        args: ['vitest', 'run'],
        coverageArgs: ['vitest', 'run', '--coverage'],
        configFiles: ['vitest.config.js', 'vitest.config.ts'],
        resultParser: this.parseVitestResults.bind(this)
      }
    };

    // Failure categorization patterns
    this.failurePatterns = {
      timeout: {
        patterns: [/timeout/i, /exceeded.*timeout/i, /timed out/i],
        category: 'timeout',
        suggestions: [
          'Increase test timeout values',
          'Check for infinite loops or hanging promises',
          'Optimize slow operations in tests'
        ]
      },
      assertion: {
        patterns: [/assertion/i, /expected.*actual/i, /AssertionError/i, /toBe.*toEqual/i],
        category: 'assertion',
        suggestions: [
          'Review test expectations vs actual behavior',
          'Check test data and mock setup',
          'Verify function implementation matches expected behavior'
        ]
      },
      async: {
        patterns: [/async/i, /promise/i, /await/i, /callback/i],
        category: 'async',
        suggestions: [
          'Ensure proper async/await usage',
          'Check promise resolution/rejection handling',
          'Verify callback execution timing'
        ]
      },
      dependency: {
        patterns: [/module.*not.*found/i, /cannot.*find.*module/i, /import.*error/i],
        category: 'dependency',
        suggestions: [
          'Install missing dependencies',
          'Check import/require paths',
          'Verify module availability in test environment'
        ]
      },
      network: {
        patterns: [/ENOTFOUND/i, /ECONNREFUSED/i, /network/i, /http.*error/i, /fetch.*failed/i],
        category: 'network',
        suggestions: [
          'Mock external API calls in tests',
          'Check network connectivity',
          'Verify external service availability',
          'Use test doubles for network dependencies'
        ]
      },
      environment: {
        patterns: [/environment/i, /env.*variable/i, /config.*missing/i],
        category: 'environment',
        suggestions: [
          'Set required environment variables',
          'Check test configuration',
          'Verify test environment setup'
        ]
      }
    };

    // Flaky test tracking
    this.flakyTestHistory = new Map();
  }

  /**
   * Initialize TestingSystem
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      this.logAuditEvent('testing_system_initializing', {
        options: this.sanitizeOptionsForLog(this.options),
        timestamp: new Date().toISOString()
      });

      // Detect available testing frameworks
      const frameworksDetected = await this.detectTestingFrameworks();

      if (frameworksDetected.length === 0) {
        console.warn('⚠️  No testing frameworks detected - basic test execution only');
      } else {
        console.log(`✅ TestingSystem initialized - detected frameworks: ${frameworksDetected.join(', ')}`);
      }

      this.logAuditEvent('testing_system_initialized', {
        detectedFrameworks: frameworksDetected,
        timestamp: new Date().toISOString()
      });

      this.emit('initialized', { frameworks: frameworksDetected });
      return true;

    } catch (error) {
      this.logAuditEvent('testing_system_initialization_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.error(`❌ TestingSystem initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect available testing frameworks
   * @returns {Promise<Array<string>>} Detected frameworks
   */
  async detectTestingFrameworks() {
    const detectedFrameworks = [];
    const projectRoot = this.configManager.getProjectRoot();
    const fs = require('fs').promises;

    try {
      // Check package.json for test scripts and dependencies
      const packageJsonPath = path.join(projectRoot, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        const scripts = packageJson.scripts || {};
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        // Check for test scripts
        if (scripts.test) {
          detectedFrameworks.push('npm-test');
        }

        // Check for specific framework dependencies
        if (allDeps.jest) detectedFrameworks.push('jest');
        if (allDeps.mocha) detectedFrameworks.push('mocha');
        if (allDeps.vitest) detectedFrameworks.push('vitest');

      } catch (error) {
        console.warn(`⚠️  Could not read package.json: ${error.message}`);
      }

      // Check for framework configuration files
      for (const [framework, config] of Object.entries(this.supportedFrameworks)) {
        for (const configFile of config.configFiles) {
          try {
            await fs.access(path.join(projectRoot, configFile));
            if (!detectedFrameworks.includes(framework)) {
              detectedFrameworks.push(framework);
            }
            break;
          } catch (error) {
            // Config file doesn't exist, continue
          }
        }
      }

    } catch (error) {
      console.warn(`⚠️  Framework detection failed: ${error.message}`);
    }

    return [...new Set(detectedFrameworks)]; // Remove duplicates
  }

  /**
   * Execute test suite with comprehensive reporting
   * @param {Object} options - Test execution options
   * @returns {Promise<Object>} Test execution result
   */
  async executeTests(options = {}) {
    if (this.isRunning) {
      return {
        success: false,
        error: 'Test execution is already running'
      };
    }

    const startTime = Date.now();

    try {
      const {
        framework = 'npm-test',
        coverage = this.options.enableCoverage,
        parallel = this.options.parallelExecution,
        pattern = null, // Test file pattern
        __watchMode = false,
        maxAttempts = this.options.retryAttempts,
        verbose = false
      } = options;

      this.isRunning = true;
      this.currentSession = {
        startTime: new Date().toISOString(),
        framework,
        options: this.sanitizeOptionsForLog(options),
        attempts: 0,
        results: [],
        flakyTests: []
      };

      this.logAuditEvent('test_session_started', {
        framework,
        options: this.currentSession.options,
        timestamp: new Date().toISOString()
      });

      console.log('🧪 Running test suite...');

      let finalResult = null;
      let attempt = 1;

      while (attempt <= maxAttempts) {
        console.log(`🔄 Test execution attempt ${attempt}/${maxAttempts}...`);

        const testResult = await this.runTests(framework, {
          coverage,
          parallel,
          pattern,
          verbose,
          watchMode: false // Never watch mode in automation
        });

        this.currentSession.attempts = attempt;
        this.currentSession.results.push(testResult);

        if (testResult.success) {
          finalResult = testResult;
          break;
        }

        // Analyze failures and determine if retry is warranted
        const failureAnalysis = await this.analyzeTestFailures(testResult);

        if (attempt < maxAttempts && failureAnalysis.retryRecommended) {
          console.log(`🔄 Retrying tests due to: ${failureAnalysis.retryReason}`);

          // Track potentially flaky tests
          if (failureAnalysis.flakyTests.length > 0) {
            this.trackFlakyTests(failureAnalysis.flakyTests);
            this.currentSession.flakyTests.push(...failureAnalysis.flakyTests);
          }

          await this.delay(this.options.retryDelay * attempt);
          attempt++;
          continue;
        } else {
          finalResult = testResult;
          break;
        }
      }

      const executionTime = Date.now() - startTime;
      this.updateMetrics(finalResult.success, executionTime, finalResult);

      const result = {
        ...finalResult,
        attempts: attempt,
        executionTime,
        session: this.currentSession,
        retryApplied: attempt > 1,
        flakyTestsDetected: this.currentSession.flakyTests.length
      };

      this.logAuditEvent('test_session_completed', {
        result: this.sanitizeResultForLog(result),
        executionTime,
        attempts: result.attempts,
        timestamp: new Date().toISOString()
      });

      if (result.success) {
        console.log('✅ All tests passed successfully');
        this.displayTestSummary(result);
        this.emit('tests_passed', result);
      } else {
        console.error('❌ Tests failed');
        this.displayFailureReport(result);
        this.emit('tests_failed', result);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logAuditEvent('test_session_failed', {
        error: error.message,
        executionTime,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: `Test execution failed: ${error.message}`,
        executionTime
      };
    } finally {
      this.isRunning = false;
      this.currentSession = null;
    }
  }

  /**
   * Run tests with specified framework
   * @param {string} framework - Testing framework to use
   * @param {Object} options - Test run options
   * @returns {Promise<Object>} Test run result
   */
  async runTests(framework, options = {}) {
    try {
      const { coverage, parallel, pattern, verbose } = options;

      let command, args;

      if (framework === 'npm-test') {
        command = 'npm';
        args = coverage ? ['run', 'test:coverage'] : ['test'];
      } else {
        const frameworkConfig = this.supportedFrameworks[framework];
        if (!frameworkConfig) {
          throw new Error(`Unsupported testing framework: ${framework}`);
        }

        command = frameworkConfig.command;
        args = coverage ? frameworkConfig.coverageArgs : frameworkConfig.args;

        // Add framework-specific options
        if (parallel && framework === 'jest') {
          args.push('--maxWorkers=50%');
        }

        if (pattern) {
          if (framework === 'jest') {
            args.push('--testPathPattern', pattern);
          } else if (framework === 'mocha') {
            args.push('--grep', pattern);
          }
        }

        if (verbose) {
          args.push('--verbose');
        }
      }

      const result = await this.executeCommand(command, args, {
        description: `Run ${framework} tests`
      });

      // Parse test results using framework-specific parser
      let parsedResults = null;
      if (framework !== 'npm-test' && this.supportedFrameworks[framework]) {
        try {
          parsedResults = this.supportedFrameworks[framework].resultParser(result.output);
        } catch (parseError) {
          console.warn(`⚠️  Failed to parse ${framework} results: ${parseError.message}`);
        }
      }

      return {
        success: result.success,
        output: result.output,
        framework,
        command: `${command} ${args.join(' ')}`,
        exitCode: result.exitCode,
        parsedResults,
        coverage: parsedResults?.coverage || null
      };

    } catch (error) {
      return {
        success: false,
        output: error.message,
        error: error.message,
        framework
      };
    }
  }

  /**
   * Analyze test failures and categorize them
   * @param {Object} testResult - Test execution result
   * @returns {Promise<Object>} Failure analysis
   */
  async analyzeTestFailures(testResult) {
    try {
      const analysis = {
        totalFailures: 0,
        categorizedFailures: {},
        flakyTests: [],
        retryRecommended: false,
        retryReason: null,
        suggestions: [],
        errorResolutions: []
      };

      if (!testResult.output) {
        return analysis;
      }

      // Use ErrorResolver for detailed error analysis
      if (this.errorResolver) {
        const errorAnalysis = this.errorResolver.analyzeError(testResult.output, 'testing');
        if (errorAnalysis.success) {
          analysis.errorResolutions.push(errorAnalysis.analysis);
          analysis.suggestions.push(...errorAnalysis.analysis.suggestions);
        }
      }

      // Categorize failures using patterns
      for (const [category, config] of Object.entries(this.failurePatterns)) {
        const matches = config.patterns.filter(pattern => pattern.test(testResult.output));
        if (matches.length > 0) {
          analysis.categorizedFailures[category] = {
            matches: matches.length,
            suggestions: config.suggestions
          };
          analysis.suggestions.push(...config.suggestions);
        }
      }

      // Check for network/timeout issues that might warrant retry
      if (analysis.categorizedFailures.network || analysis.categorizedFailures.timeout) {
        analysis.retryRecommended = true;
        analysis.retryReason = 'Network/timeout issues detected';
      }

      // Parse test output for specific failing tests (if available)
      if (testResult.parsedResults) {
        const failedTests = testResult.parsedResults.failedTests || [];
        analysis.totalFailures = failedTests.length;

        // Identify potentially flaky tests
        for (const failedTest of failedTests) {
          if (this.isPotentiallyFlaky(failedTest)) {
            analysis.flakyTests.push(failedTest);
          }
        }

        if (analysis.flakyTests.length > 0) {
          analysis.retryRecommended = true;
          analysis.retryReason = `${analysis.flakyTests.length} potentially flaky tests detected`;
        }
      }

      // Remove duplicate suggestions
      analysis.suggestions = [...new Set(analysis.suggestions)];

      return analysis;

    } catch (error) {
      console.warn(`⚠️  Test failure analysis failed: ${error.message}`);
      return {
        totalFailures: 0,
        categorizedFailures: {},
        flakyTests: [],
        retryRecommended: false,
        suggestions: [],
        errorResolutions: []
      };
    }
  }

  /**
   * Check if a test failure is potentially flaky
   * @param {Object} testFailure - Test failure information
   * @returns {boolean} Whether test might be flaky
   */
  isPotentiallyFlaky(testFailure) {
    const flakyIndicators = [
      /timeout/i,
      /network/i,
      /race condition/i,
      /timing/i,
      /async/i,
      /intermittent/i,
      /random/i,
      /flaky/i
    ];

    const failureMessage = testFailure.message || testFailure.error || '';
    return flakyIndicators.some(indicator => indicator.test(failureMessage));
  }

  /**
   * Track flaky tests for future reference
   * @param {Array} flakyTests - List of flaky tests
   */
  trackFlakyTests(flakyTests) {
    for (const test of flakyTests) {
      const testName = test.name || test.title || 'unknown';
      const history = this.flakyTestHistory.get(testName) || {
        count: 0,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        failures: []
      };

      history.count++;
      history.lastSeen = new Date().toISOString();
      history.failures.push({
        timestamp: new Date().toISOString(),
        message: test.message || test.error
      });

      this.flakyTestHistory.set(testName, history);
      this.metrics.flakyTests++;
    }
  }

  /**
   * Display comprehensive test summary
   * @param {Object} result - Test result
   */
  displayTestSummary(result) {
    console.log('\n📊 Test Summary:');
    console.log('='.repeat(30));

    if (result.parsedResults) {
      const stats = result.parsedResults;
      console.log(`✅ Passed: ${stats.passedTests || 0}`);
      console.log(`❌ Failed: ${stats.failedTests?.length || 0}`);
      console.log(`⏭️  Skipped: ${stats.skippedTests || 0}`);
      console.log(`⏱️  Duration: ${Math.round(result.executionTime / 1000)}s`);

      if (stats.coverage) {
        console.log(`📈 Coverage: ${stats.coverage.percentage || 'N/A'}%`);
      }
    } else {
      console.log('✅ Tests completed successfully');
      console.log(`⏱️  Duration: ${Math.round(result.executionTime / 1000)}s`);
    }

    if (result.retryApplied) {
      console.log(`🔄 Retries: ${result.attempts - 1}`);
    }

    if (result.flakyTestsDetected > 0) {
      console.log(`⚠️  Flaky tests detected: ${result.flakyTestsDetected}`);
    }
  }

  /**
   * Display comprehensive failure report
   * @param {Object} result - Test result with failures
   */
  displayFailureReport(result) {
    console.log('\n❌ Test Failure Report:');
    console.log('='.repeat(40));

    if (result.failureAnalysis) {
      const analysis = result.failureAnalysis;

      console.log(`Total Failures: ${analysis.totalFailures}`);

      if (Object.keys(analysis.categorizedFailures).length > 0) {
        console.log('\n📊 Failure Categories:');
        for (const [category, info] of Object.entries(analysis.categorizedFailures)) {
          console.log(`  • ${category}: ${info.matches} occurrences`);
        }
      }

      if (analysis.flakyTests.length > 0) {
        console.log(`\n🔄 Potentially Flaky Tests: ${analysis.flakyTests.length}`);
      }

      if (analysis.suggestions.length > 0) {
        console.log('\n💡 Suggestions:');
        analysis.suggestions.forEach((suggestion, index) => {
          console.log(`  ${index + 1}. ${suggestion}`);
        });
      }
    }

    if (result.output && result.output.length > 0) {
      console.log('\n📜 Detailed Output:');
      // Show first 2000 characters to avoid overwhelming output
      const output = result.output.length > 2000 ?
        result.output.substring(0, 2000) + '\n... (truncated)' :
        result.output;
      console.log(output);
    }
  }

  /**
   * Parse Jest test results
   * @param {string} output - Jest output
   * @returns {Object} Parsed results
   */
  parseJestResults(output) {
    const results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: [],
      skippedTests: 0,
      coverage: null
    };

    try {
      // Parse test counts
      const testSummaryMatch = output.match(/(\d+) passing.*?(\d+) failing.*?(\d+) pending/i);
      if (testSummaryMatch) {
        results.passedTests = parseInt(testSummaryMatch[1]);
        results.failedTests = new Array(parseInt(testSummaryMatch[2])).fill({});
        results.skippedTests = parseInt(testSummaryMatch[3]);
        results.totalTests = results.passedTests + results.failedTests.length + results.skippedTests;
      }

      // Parse coverage if available
      const coverageMatch = output.match(/All files.*?(\d+\.\d+)/s);
      if (coverageMatch) {
        results.coverage = {
          percentage: parseFloat(coverageMatch[1])
        };
      }

    } catch (error) {
      console.warn(`⚠️  Jest result parsing error: ${error.message}`);
    }

    return results;
  }

  /**
   * Parse Mocha test results
   * @param {string} output - Mocha output
   * @returns {Object} Parsed results
   */
  parseMochaResults(output) {
    const results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: [],
      skippedTests: 0,
      coverage: null
    };

    try {
      // Parse test counts from Mocha output
      const summaryMatch = output.match(/(\d+) passing.*?(\d+) failing/i);
      if (summaryMatch) {
        results.passedTests = parseInt(summaryMatch[1]);
        results.failedTests = new Array(parseInt(summaryMatch[2])).fill({});
        results.totalTests = results.passedTests + results.failedTests.length;
      }

      // Parse pending tests
      const pendingMatch = output.match(/(\d+) pending/i);
      if (pendingMatch) {
        results.skippedTests = parseInt(pendingMatch[1]);
        results.totalTests += results.skippedTests;
      }

    } catch (error) {
      console.warn(`⚠️  Mocha result parsing error: ${error.message}`);
    }

    return results;
  }

  /**
   * Parse Vitest test results
   * @param {string} output - Vitest output
   * @returns {Object} Parsed results
   */
  parseVitestResults(output) {
    const results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: [],
      skippedTests: 0,
      coverage: null
    };

    try {
      // Parse Vitest summary
      const summaryMatch = output.match(/Tests\s+(\d+) passed.*?(\d+) failed.*?(\d+) skipped/i);
      if (summaryMatch) {
        results.passedTests = parseInt(summaryMatch[1]);
        results.failedTests = new Array(parseInt(summaryMatch[2])).fill({});
        results.skippedTests = parseInt(summaryMatch[3]);
        results.totalTests = results.passedTests + results.failedTests.length + results.skippedTests;
      }

    } catch (error) {
      console.warn(`⚠️  Vitest result parsing error: ${error.message}`);
    }

    return results;
  }

  /**
   * Execute command with proper error handling
   * @param {string} command - Command to execute
   * @param {Array<string>} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command result
   */
  executeCommand(command, args, options = {}) {
    return new Promise((resolve) => {
      const {
        __description = 'Command execution',
        timeout = this.options.commandTimeout,
        cwd = this.configManager.getProjectRoot()
      } = options;

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: cwd
      });

      let stdout = '';
      let stderr = '';
      let timeoutHandle = null;

      // Set up timeout
      if (timeout > 0) {
        timeoutHandle = setTimeout(() => {
          child.kill('SIGTERM');
          resolve({
            success: false,
            output: `Command timed out after ${timeout}ms`,
            error: 'Command timeout',
            timedOut: true
          });
        }, timeout);
      }

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        const output = (stdout + stderr).trim();
        resolve({
          success: code === 0,
          output,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code
        });
      });

      child.on('error', (error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        resolve({
          success: false,
          output: error.message,
          error: error.message,
          commandError: true
        });
      });
    });
  }

  /**
   * Update performance metrics
   * @param {boolean} success - Whether operation was successful
   * @param {number} executionTime - Execution time in milliseconds
   * @param {Object} result - Operation result
   */
  updateMetrics(success, executionTime, result) {
    this.metrics.totalRuns++;
    if (success) {
      this.metrics.successfulRuns++;
    } else {
      this.metrics.failedRuns++;
    }

    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime * (this.metrics.totalRuns - 1) + executionTime) /
      this.metrics.totalRuns;

    this.metrics.lastRunTime = new Date().toISOString();

    if (result.parsedResults) {
      const stats = result.parsedResults;
      this.metrics.totalTests += stats.totalTests || 0;
      this.metrics.passedTests += stats.passedTests || 0;
      this.metrics.failedTests += (stats.failedTests?.length || 0);
      this.metrics.skippedTests += stats.skippedTests || 0;

      if (stats.totalTests > 0) {
        this.metrics.averageTestTime =
          (this.metrics.averageTestTime * (this.metrics.totalTests - stats.totalTests) + executionTime) /
          this.metrics.totalTests;
      }

      if (stats.coverage) {
        this.metrics.coverageData = stats.coverage;
      }
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Statistics and metrics
   */
  getStatistics() {
    return {
      metrics: { ...this.metrics },
      flakyTests: {
        total: this.flakyTestHistory.size,
        details: Object.fromEntries(this.flakyTestHistory.entries())
      },
      state: {
        isRunning: this.isRunning,
        currentSession: this.currentSession ? {
          startTime: this.currentSession.startTime,
          framework: this.currentSession.framework,
          attempts: this.currentSession.attempts
        } : null
      },
      configuration: this.sanitizeOptionsForLog(this.options),
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
   * Sanitize options for logging
   * @param {Object} options - Options to sanitize
   * @returns {Object} Sanitized options
   */
  sanitizeOptionsForLog(options) {
    const { ...safeOptions } = options;
    return safeOptions;
  }

  /**
   * Sanitize result for logging
   * @param {Object} result - Result to sanitize
   * @returns {Object} Sanitized result
   */
  sanitizeResultForLog(result) {
    const { output, ...safeResult } = result;
    return {
      ...safeResult,
      hasOutput: !!output,
      outputLength: output ? output.length : 0
    };
  }

  /**
   * Delay utility for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown TestingSystem
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down TestingSystem...');

      // Cancel any running operations
      this.isRunning = false;
      this.currentSession = null;

      this.logAuditEvent('testing_system_shutdown', {
        finalStats: this.getStatistics(),
        timestamp: new Date().toISOString()
      });

      this.removeAllListeners();

      console.log('✅ TestingSystem shutdown complete');
      this.emit('shutdown_complete');

    } catch (error) {
      console.error(`❌ TestingSystem shutdown failed: ${error.message}`);
    }
  }
}

module.exports = TestingSystem;