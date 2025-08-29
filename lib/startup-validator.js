const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Startup Environment Validator
 * Validates environment, dependencies, and terminal capabilities before TUI startup
 */
class StartupValidator {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.debug = options.debug || false;
    this.startTime = Date.now();
  }

  /**
   * Perform all startup validations
   * @returns {Promise<{valid: boolean, warnings: string[], errors: string[], metrics: object}>}
   */
  async validateEnvironment() {
    const results = {
      valid: true,
      warnings: [],
      errors: [],
      metrics: {
        startTime: this.startTime,
        validationTime: null,
        phases: {}
      }
    };

    try {
      // Phase 1: Node.js version validation
      const nodePhaseStart = Date.now();
      const nodeValidation = this.validateNodeVersion();
      results.metrics.phases.nodeValidation = Date.now() - nodePhaseStart;

      if (!nodeValidation.valid) {
        results.valid = false;
        results.errors.push(...nodeValidation.errors);
      }
      results.warnings.push(...nodeValidation.warnings);

      // Phase 2: Terminal capabilities validation
      const terminalPhaseStart = Date.now();
      const terminalValidation = await this.validateTerminalCapabilities();
      results.metrics.phases.terminalValidation = Date.now() - terminalPhaseStart;

      if (!terminalValidation.valid) {
        results.valid = false;
        results.errors.push(...terminalValidation.errors);
      }
      results.warnings.push(...terminalValidation.warnings);

      // Phase 3: Dependencies validation
      const depsPhaseStart = Date.now();
      const depsValidation = await this.validateDependencies();
      results.metrics.phases.dependencyValidation = Date.now() - depsPhaseStart;

      if (!depsValidation.valid) {
        results.valid = false;
        results.errors.push(...depsValidation.errors);
      }
      results.warnings.push(...depsValidation.warnings);

      // Phase 4: Project structure validation
      const projectPhaseStart = Date.now();
      const projectValidation = this.validateProjectStructure();
      results.metrics.phases.projectValidation = Date.now() - projectPhaseStart;

      if (!projectValidation.valid) {
        results.valid = false;
        results.errors.push(...projectValidation.errors);
      }
      results.warnings.push(...projectValidation.warnings);

      // Phase 5: File system permissions validation
      const permissionsPhaseStart = Date.now();
      const permissionsValidation = await this.validateFileSystemPermissions();
      results.metrics.phases.permissionsValidation = Date.now() - permissionsPhaseStart;

      if (!permissionsValidation.valid) {
        results.valid = false;
        results.errors.push(...permissionsValidation.errors);
      }
      results.warnings.push(...permissionsValidation.warnings);

      // Phase 6: Enhanced terminal size validation
      const terminalSizePhaseStart = Date.now();
      const terminalSizeValidation = this.validateTerminalSize();
      results.metrics.phases.terminalSizeValidation = Date.now() - terminalSizePhaseStart;

      if (!terminalSizeValidation.valid) {
        results.valid = false;
        results.errors.push(...terminalSizeValidation.errors);
      }
      results.warnings.push(...terminalSizeValidation.warnings);

      // Phase 7: CLI environment validation (non-blocking)
      const cliEnvPhaseStart = Date.now();
      const cliEnvValidation = this.validateCLIEnvironment();
      results.metrics.phases.cliEnvironmentValidation = Date.now() - cliEnvPhaseStart;

      // CLI environment issues are typically warnings, not failures
      results.warnings.push(...cliEnvValidation.warnings);
      if (cliEnvValidation.errors.length > 0) {
        results.warnings.push(...cliEnvValidation.errors);
      }

      results.metrics.validationTime = Date.now() - this.startTime;

      return results;

    } catch (error) {
      results.valid = false;
      results.errors.push(`Startup validation failed: ${error.message}`);
      results.metrics.validationTime = Date.now() - this.startTime;
      return results;
    }
  }

  /**
   * Validate Node.js version compatibility
   */
  validateNodeVersion() {
    const result = { valid: true, errors: [], warnings: [] };

    try {
      const currentVersion = process.version;
      const major = parseInt(currentVersion.slice(1).split('.')[0]);
      const minor = parseInt(currentVersion.slice(1).split('.')[1]);

      // Minimum required: Node 16.0.0
      const minMajor = 16;
      const minMinor = 0;

      if (major < minMajor || (major === minMajor && minor < minMinor)) {
        result.valid = false;
        result.errors.push(
          `Node.js ${minMajor}.${minMinor}.0 or higher is required. Current version: ${currentVersion}`
        );
        result.errors.push(
          'Please upgrade Node.js: https://nodejs.org/en/download/'
        );
      } else if (major >= 20) {
        // Node 20+ is optimal
        if (this.debug) {
          result.warnings.push(`Using Node.js ${currentVersion} (optimal)`);
        }
      } else if (major >= 18) {
        // Node 18+ is good
        if (this.debug) {
          result.warnings.push(`Using Node.js ${currentVersion} (recommended)`);
        }
      } else {
        // Node 16-17 is supported but older
        result.warnings.push(
          `Using Node.js ${currentVersion}. Consider upgrading to Node.js 18+ for better performance.`
        );
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Failed to validate Node.js version: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate terminal capabilities and detect fallback needs
   */
  async validateTerminalCapabilities() {
    const result = { valid: true, errors: [], warnings: [] };

    try {
      // Check if running in a terminal
      if (!process.stdout.isTTY) {
        result.warnings.push('Not running in a TTY environment. Some features may be limited.');
      }

      // Check terminal dimensions
      const width = process.stdout.columns || 80;
      const height = process.stdout.rows || 24;

      if (width < 80) {
        result.warnings.push(
          `Terminal width (${width}) is below recommended minimum (80 columns). Layout may be cramped.`
        );
      }

      if (height < 24) {
        result.warnings.push(
          `Terminal height (${height}) is below recommended minimum (24 rows). Content may be truncated.`
        );
      }

      // Check for color support
      if (!process.stdout.hasColors || !process.stdout.hasColors()) {
        result.warnings.push('Terminal does not support colors. Output will be monochrome.');
      }

      // Check for Unicode support (basic test)
      const testUnicode = '✓▲●';
      if (this.debug) {
        result.warnings.push(`Terminal Unicode test: ${testUnicode}`);
      }

      // Detect terminal type for compatibility
      const termType = process.env.TERM || 'unknown';
      if (termType === 'unknown') {
        result.warnings.push('Terminal type unknown. Some features may not work correctly.');
      } else if (this.debug) {
        result.warnings.push(`Terminal type: ${termType}`);
      }

      // Check for Windows-specific terminal issues
      if (process.platform === 'win32') {
        const windowsVersion = this.getWindowsVersion();
        if (windowsVersion && windowsVersion < 10) {
          result.warnings.push(
            'Windows version may have limited terminal support. Consider upgrading to Windows 10+ or using Windows Terminal.'
          );
        }
      }

    } catch (error) {
      result.warnings.push(`Terminal capability detection failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate core dependencies are loadable
   */
  async validateDependencies() {
    const result = { valid: true, errors: [], warnings: [] };

    const criticalDependencies = [
      'terminal-kit',
      'chalk',
      'commander',
      'chokidar',
      'joi',
      'js-yaml',
      'handlebars'
    ];

    for (const dep of criticalDependencies) {
      try {
        require.resolve(dep);
        if (this.debug) {
          result.warnings.push(`✓ ${dep} dependency available`);
        }
      } catch (error) {
        result.valid = false;
        result.errors.push(`Critical dependency '${dep}' not found or not loadable`);
        result.errors.push('Run: npm install');
      }
    }

    // Check for optional dependencies
    const optionalDependencies = ['cosmiconfig'];
    for (const dep of optionalDependencies) {
      try {
        require.resolve(dep);
        if (this.debug) {
          result.warnings.push(`✓ ${dep} optional dependency available`);
        }
      } catch (error) {
        result.warnings.push(`Optional dependency '${dep}' not found. Some features may be limited.`);
      }
    }

    return result;
  }

  /**
   * Validate basic project structure
   */
  validateProjectStructure() {
    const result = { valid: true, errors: [], warnings: [] };

    try {
      // Check if we're in a directory that looks like an ASD project
      const expectedPaths = [
        'docs',
        'docs/specs',
        'docs/specs/active',
        'docs/specs/backlog',
        'docs/specs/done'
      ];

      let hasAnyStructure = false;
      let missingPaths = [];

      for (const expectedPath of expectedPaths) {
        const fullPath = path.join(this.cwd, expectedPath);
        if (fs.existsSync(fullPath)) {
          hasAnyStructure = true;
          if (this.debug) {
            result.warnings.push(`✓ Found ${expectedPath}`);
          }
        } else {
          missingPaths.push(expectedPath);
        }
      }

      if (!hasAnyStructure) {
        result.warnings.push(
          'No ASD project structure detected. This appears to be a new or non-ASD project.'
        );
        result.warnings.push(
          'ASD will create the necessary directories when you start adding specifications.'
        );
        result.warnings.push(
          'To initialize a new ASD project, consider running: asd init (when available)'
        );
      } else if (missingPaths.length > 0) {
        result.warnings.push(
          `Some project directories are missing: ${missingPaths.join(', ')}`
        );
        result.warnings.push(
          'ASD will create missing directories as needed.'
        );
      }

      // Check for config file
      const configPath = path.join(this.cwd, 'asd.config.js');
      if (fs.existsSync(configPath)) {
        try {
          require.resolve(configPath);
          if (this.debug) {
            result.warnings.push('✓ Configuration file found and loadable');
          }
        } catch (error) {
          result.errors.push(`Configuration file exists but has syntax errors: ${error.message}`);
          result.errors.push('Fix the configuration file or remove it to use defaults');
        }
      }

    } catch (error) {
      result.warnings.push(`Project structure validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate file system permissions
   */
  async validateFileSystemPermissions() {
    const result = { valid: true, errors: [], warnings: [] };

    try {
      // Test read permissions on current directory
      try {
        await fs.promises.access(this.cwd, fs.constants.R_OK);
        if (this.debug) {
          result.warnings.push('✓ Read access to current directory');
        }
      } catch (error) {
        result.valid = false;
        result.errors.push(`No read access to current directory: ${this.cwd}`);
        result.errors.push('Check directory permissions and try again');
      }

      // Test write permissions on current directory
      try {
        await fs.promises.access(this.cwd, fs.constants.W_OK);
        if (this.debug) {
          result.warnings.push('✓ Write access to current directory');
        }
      } catch (error) {
        result.warnings.push(`Limited write access to current directory: ${this.cwd}`);
        result.warnings.push('You may not be able to create new specifications');
      }

      // Test specific ASD directories if they exist
      const testPaths = ['docs', 'docs/specs'];
      for (const testPath of testPaths) {
        const fullPath = path.join(this.cwd, testPath);
        if (fs.existsSync(fullPath)) {
          try {
            await fs.promises.access(fullPath, fs.constants.R_OK | fs.constants.W_OK);
            if (this.debug) {
              result.warnings.push(`✓ Read/write access to ${testPath}`);
            }
          } catch (error) {
            result.warnings.push(`Limited access to ${testPath}. Some features may not work.`);
          }
        }
      }

    } catch (error) {
      result.warnings.push(`File system permissions check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Get Windows version (simplified)
   */
  getWindowsVersion() {
    if (process.platform !== 'win32') return null;

    try {
      const release = require('os').release();
      const major = parseInt(release.split('.')[0]);
      return major;
    } catch (error) {
      return null;
    }
  }

  /**
   * Display validation results to user
   */
  displayResults(results) {
    // Log startup attempt (for debugging/monitoring)
    this.logStartupAttempt(results);

    if (results.valid) {
      if (this.debug && results.metrics.validationTime) {
        console.log(chalk.green(`✓ Environment validation passed (${results.metrics.validationTime}ms)`));
      }
    } else {
      console.error(chalk.red('❌ Environment validation failed:'));
      results.errors.forEach(error => {
        console.error(chalk.red(`  • ${error}`));
      });
    }

    // Show warnings if any
    if (results.warnings.length > 0) {
      if (this.debug || !results.valid) {
        results.warnings.forEach(warning => {
          console.warn(chalk.yellow(`  ⚠ ${warning}`));
        });
      }
    }

    // Show performance metrics in debug mode
    if (this.debug && results.metrics.phases) {
      console.log(chalk.gray('\nValidation performance:'));
      Object.entries(results.metrics.phases).forEach(([phase, time]) => {
        console.log(chalk.gray(`  ${phase}: ${time}ms`));
      });
    }
  }

  /**
   * Generate actionable error suggestions
   */
  generateErrorSuggestions(results) {
    const suggestions = [];

    if (!results.valid) {
      suggestions.push('To resolve startup issues:');

      // Node version issues
      if (results.errors.some(err => err.includes('Node.js'))) {
        suggestions.push('1. Update Node.js to version 16 or higher');
        suggestions.push('   Visit: https://nodejs.org/en/download/');
      }

      // Dependency issues
      if (results.errors.some(err => err.includes('dependency'))) {
        suggestions.push('2. Install missing dependencies:');
        suggestions.push('   Run: npm install');
        suggestions.push('   Or: npm ci (for clean install)');
      }

      // Permission issues
      if (results.errors.some(err => err.includes('access')) ||
          results.errors.some(err => err.includes('permission'))) {
        suggestions.push('3. Fix file permissions:');
        suggestions.push('   Check directory ownership and permissions');
        suggestions.push('   Consider running with appropriate permissions');
      }

      // Configuration issues
      if (results.errors.some(err => err.includes('configuration'))) {
        suggestions.push('4. Fix configuration issues:');
        suggestions.push('   Review asd.config.js for syntax errors');
        suggestions.push('   Or remove config file to use defaults');
      }
    }

    return suggestions;
  }

  /**
   * Log startup attempt for debugging and monitoring
   * @param {object} results - Validation results
   */
  logStartupAttempt(results) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      cwd: this.cwd,
      nodeVersion: process.version,
      platform: process.platform,
      success: results.valid,
      validationTime: results.metrics.validationTime,
      errorCount: results.errors.length,
      warningCount: results.warnings.length
    };

    // In debug mode, show full log entry
    if (this.debug) {
      console.log(chalk.gray('\n--- Startup Log Entry ---'));
      console.log(chalk.gray(JSON.stringify(logEntry, null, 2)));
    }

    // Log to file for production debugging (non-blocking)
    this.writeStartupLog(logEntry).catch(error => {
      // Silent failure - don't interrupt startup for logging issues
      if (this.debug) {
        console.warn(chalk.yellow(`Warning: Failed to write startup log: ${error.message}`));
      }
    });
  }

  /**
   * Write startup log to file (async, non-blocking)
   * @param {object} logEntry - Log entry to write
   */
  async writeStartupLog(logEntry) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const logDir = path.join(this.cwd, '.asd', 'logs');
      const logFile = path.join(logDir, 'startup.log');

      // Ensure log directory exists
      try {
        await fs.mkdir(logDir, { recursive: true });
      } catch (error) {
        // If we can't create the directory, skip logging
        return;
      }

      // Append log entry as JSON line
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logFile, logLine, 'utf-8');
    } catch (error) {
      // Silent failure - don't interrupt startup
      return;
    }
  }

  /**
   * Enhanced terminal size validation
   */
  validateTerminalSize() {
    const result = { valid: true, errors: [], warnings: [] };

    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;

    // Minimum usable dimensions for ASD TUI
    const minWidth = 80;
    const minHeight = 24;
    const recommendedWidth = 120;
    const recommendedHeight = 30;

    if (width < minWidth) {
      result.errors.push(
        `Terminal width (${width}) is too small. Minimum required: ${minWidth} columns`
      );
      result.errors.push('Please resize your terminal window or use a larger display');
      result.valid = false;
    } else if (width < recommendedWidth) {
      result.warnings.push(
        `Terminal width (${width}) is below recommended size (${recommendedWidth} columns). Some content may be cramped.`
      );
    }

    if (height < minHeight) {
      result.errors.push(
        `Terminal height (${height}) is too small. Minimum required: ${minHeight} rows`
      );
      result.errors.push('Please resize your terminal window or use a larger display');
      result.valid = false;
    } else if (height < recommendedHeight) {
      result.warnings.push(
        `Terminal height (${height}) is below recommended size (${recommendedHeight} rows). Some content may be truncated.`
      );
    }

    return result;
  }

  /**
   * Validate CLI environment (PATH, shell, etc.)
   */
  validateCLIEnvironment() {
    const result = { valid: true, errors: [], warnings: [] };

    try {
      // Check if 'asd' command is available globally
      const { spawn } = require('child_process');
      const which = process.platform === 'win32' ? 'where' : 'which';

      // Non-blocking check for global installation
      try {
        const proc = spawn(which, ['asd'], {
          stdio: 'pipe',
          timeout: 1000
        });

        proc.on('error', () => {
          result.warnings.push('ASD not found in PATH. Consider running: npm link (for development)');
        });

        proc.on('exit', (code) => {
          if (code === 0 && this.debug) {
            result.warnings.push('✓ ASD command available globally');
          }
        });
      } catch (error) {
        // Non-critical, just skip
      }

      // Check for common development tools
      const devTools = ['git', 'npm', 'node'];
      devTools.forEach(tool => {
        try {
          require('child_process').execSync(`${which} ${tool}`, {
            stdio: 'ignore',
            timeout: 500
          });
          if (this.debug) {
            result.warnings.push(`✓ ${tool} available`);
          }
        } catch (error) {
          if (tool === 'git') {
            result.warnings.push('Git not found. Some ASD features may be limited.');
          }
        }
      });

    } catch (error) {
      result.warnings.push(`CLI environment check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Provide startup performance analysis
   * @param {object} metrics - Performance metrics
   */
  analyzePerformance(metrics) {
    const analysis = {
      overall: 'good',
      slowPhases: [],
      recommendations: []
    };

    const totalTime = metrics.validationTime || 0;
    const phases = metrics.phases || {};

    // Performance thresholds
    const SLOW_PHASE_THRESHOLD = 50; // ms
    const SLOW_TOTAL_THRESHOLD = 500; // ms

    // Analyze overall performance
    if (totalTime > SLOW_TOTAL_THRESHOLD) {
      analysis.overall = 'slow';
      analysis.recommendations.push('Startup validation is slower than expected');
    }

    // Analyze individual phases
    Object.entries(phases).forEach(([phase, time]) => {
      if (time > SLOW_PHASE_THRESHOLD) {
        analysis.slowPhases.push({ phase, time });
      }
    });

    // Generate specific recommendations
    if (analysis.slowPhases.some(p => p.phase.includes('dependency'))) {
      analysis.recommendations.push('Consider using npm ci instead of npm install for faster dependency resolution');
    }

    if (analysis.slowPhases.some(p => p.phase.includes('permissions'))) {
      analysis.recommendations.push('File system permissions check is slow - check disk performance or antivirus interference');
    }

    if (analysis.slowPhases.some(p => p.phase.includes('project'))) {
      analysis.recommendations.push('Project structure scan is slow - consider organizing spec files more efficiently');
    }

    return analysis;
  }

  /**
   * Generate a comprehensive startup report
   * @param {object} results - Validation results
   */
  generateStartupReport(results) {
    const report = {
      status: results.valid ? 'SUCCESS' : 'FAILURE',
      validationTime: results.metrics.validationTime,
      errorCount: results.errors.length,
      warningCount: results.warnings.length,
      performance: this.analyzePerformance(results.metrics),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: this.cwd,
        terminalSize: `${process.stdout.columns || 80}x${process.stdout.rows || 24}`
      }
    };

    return report;
  }
}

module.exports = StartupValidator;