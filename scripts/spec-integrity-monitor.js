#!/usr/bin/env node

/**
 * Specification Integrity Monitor - MAINT-003 TASK-004
 * 
 * Continuous monitoring system for specification integrity:
 * - File system watcher for real-time validation
 * - Periodic integrity checks
 * - Integration with ASD CLI for automated monitoring
 * - Dashboard-style reporting
 */

const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const chalk = require('chalk');
const SpecificationIntegrityValidator = require('./validate-spec-integrity');

class SpecIntegrityMonitor {
  constructor(projectPath = '.', options = {}) {
    this.projectPath = path.resolve(projectPath);
    this.specsPath = path.join(this.projectPath, 'docs', 'specs');
    
    // Configuration
    this.options = {
      watchMode: options.watchMode || false,
      checkInterval: options.checkInterval || 300000, // 5 minutes
      reportPath: options.reportPath || path.join(this.projectPath, '.asd', 'integrity-reports'),
      maxReports: options.maxReports || 50,
      ...options
    };
    
    // State tracking
    this.validator = new SpecificationIntegrityValidator(this.projectPath);
    this.watcher = null;
    this.intervalTimer = null;
    this.lastValidation = null;
    this.validationHistory = [];
    
    // Metrics
    this.metrics = {
      totalChecks: 0,
      totalErrors: 0,
      totalWarnings: 0,
      avgValidationTime: 0,
      lastHealthyCheck: null,
      currentIssues: new Set(),
      resolvedIssues: new Set()
    };
  }

  /**
   * Start the monitoring system
   */
  async start() {
    console.log(chalk.blue('🔍 Starting ASD Specification Integrity Monitor'));
    console.log(chalk.gray(`Project: ${this.projectPath}`));
    console.log(chalk.gray(`Watch mode: ${this.options.watchMode ? 'enabled' : 'disabled'}`));
    console.log(chalk.gray(`Check interval: ${this.options.checkInterval / 1000}s`));
    console.log('');
    
    try {
      // Ensure report directory exists
      await fs.mkdir(this.options.reportPath, { recursive: true });
      
      // Initial validation
      console.log(chalk.blue('Running initial validation...'));
      await this.runValidation('startup');
      
      // Start file watcher if enabled
      if (this.options.watchMode) {
        this.startFileWatcher();
      }
      
      // Start periodic checks
      this.startPeriodicChecks();
      
      console.log(chalk.green('✅ Monitor started successfully'));
      console.log(chalk.gray('Press Ctrl+C to stop monitoring'));
      
      // Keep process alive
      process.on('SIGINT', () => this.stop());
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to start monitor: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * Stop the monitoring system
   */
  async stop() {
    console.log(chalk.blue('\n🛑 Stopping monitor...'));
    
    if (this.watcher) {
      await this.watcher.close();
    }
    
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    
    console.log(chalk.green('✅ Monitor stopped'));
    
    // Final summary
    this.printFinalSummary();
    process.exit(0);
  }

  /**
   * Start file system watcher
   */
  startFileWatcher() {
    console.log(chalk.blue('👀 Starting file watcher...'));
    
    this.watcher = chokidar.watch(this.specsPath + '/**/*.md', {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    // Debounce validation to avoid excessive runs
    let validationTimeout = null;
    const scheduleValidation = () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
      validationTimeout = setTimeout(() => {
        this.runValidation('file_change');
      }, 1000); // 1 second debounce
    };

    this.watcher
      .on('add', filePath => {
        console.log(chalk.gray(`📄 Added: ${path.relative(this.projectPath, filePath)}`));
        scheduleValidation();
      })
      .on('change', filePath => {
        console.log(chalk.gray(`📝 Changed: ${path.relative(this.projectPath, filePath)}`));
        scheduleValidation();
      })
      .on('unlink', filePath => {
        console.log(chalk.gray(`🗑️  Deleted: ${path.relative(this.projectPath, filePath)}`));
        scheduleValidation();
      })
      .on('error', error => {
        console.error(chalk.red(`❌ Watcher error: ${error.message}`));
      });
  }

  /**
   * Start periodic integrity checks
   */
  startPeriodicChecks() {
    if (this.options.checkInterval > 0) {
      console.log(chalk.blue(`⏰ Starting periodic checks every ${this.options.checkInterval / 1000}s`));
      
      this.intervalTimer = setInterval(() => {
        this.runValidation('periodic');
      }, this.options.checkInterval);
    }
  }

  /**
   * Run specification validation
   */
  async runValidation(trigger = 'manual') {
    const startTime = Date.now();
    
    try {
      console.log(chalk.blue(`\n🔍 Validation triggered by: ${trigger}`));
      console.log(chalk.gray(`Time: ${new Date().toLocaleString()}`));
      
      // Run validation (suppress console output)
      const originalConsole = { ...console };
      console.log = () => {};
      console.warn = () => {};
      console.error = () => {};
      
      const exitCode = await this.validator.validateProject();
      
      // Restore console
      Object.assign(console, originalConsole);
      
      const validationTime = Date.now() - startTime;
      
      // Update metrics
      this.updateMetrics(this.validator.results, validationTime, exitCode === 0);
      
      // Generate status report
      const report = this.generateStatusReport(trigger, validationTime, exitCode === 0);
      this.lastValidation = report;
      this.validationHistory.push(report);
      
      // Save detailed report
      await this.saveReport(report);
      
      // Print summary
      this.printValidationSummary(report);
      
      return report;
      
    } catch (error) {
      console.error(chalk.red(`❌ Validation failed: ${error.message}`));
      return null;
    }
  }

  /**
   * Update monitoring metrics
   */
  updateMetrics(results, validationTime, isHealthy) {
    this.metrics.totalChecks++;
    this.metrics.totalErrors += results.metadata.errors;
    this.metrics.totalWarnings += results.metadata.warnings;
    
    // Update average validation time
    const currentAvg = this.metrics.avgValidationTime;
    this.metrics.avgValidationTime = currentAvg === 0 
      ? validationTime 
      : Math.round((currentAvg + validationTime) / 2);
    
    if (isHealthy) {
      this.metrics.lastHealthyCheck = new Date().toISOString();
    }
    
    // Track issue resolution
    const currentIssueIds = new Set();
    
    // Track duplicate IDs
    for (const dup of results.duplicateIds) {
      const issueId = `duplicate:${dup.id}`;
      currentIssueIds.add(issueId);
      if (!this.metrics.currentIssues.has(issueId)) {
        console.log(chalk.red(`🆕 New duplicate ID detected: ${dup.id}`));
      }
    }
    
    // Track broken references
    for (const ref of results.brokenReferences) {
      const issueId = `broken_ref:${ref.specId}:${ref.targetId}`;
      currentIssueIds.add(issueId);
      if (!this.metrics.currentIssues.has(issueId)) {
        console.log(chalk.red(`🆕 New broken reference: ${ref.specId} → ${ref.targetId}`));
      }
    }
    
    // Check for resolved issues
    for (const oldIssue of this.metrics.currentIssues) {
      if (!currentIssueIds.has(oldIssue)) {
        this.metrics.resolvedIssues.add(oldIssue);
        console.log(chalk.green(`✅ Issue resolved: ${oldIssue}`));
      }
    }
    
    this.metrics.currentIssues = currentIssueIds;
  }

  /**
   * Generate status report
   */
  generateStatusReport(trigger, validationTime, isHealthy) {
    return {
      timestamp: new Date().toISOString(),
      trigger,
      validationTime,
      isHealthy,
      summary: { ...this.validator.results.metadata },
      issues: {
        duplicateIds: this.validator.results.duplicateIds.length,
        brokenReferences: this.validator.results.brokenReferences.length,
        structuralIssues: this.validator.results.structuralIssues.length
      },
      metrics: { ...this.metrics }
    };
  }

  /**
   * Save validation report
   */
  async saveReport(report) {
    const timestamp = report.timestamp.replace(/[:.]/g, '-');
    const filename = `integrity-report-${timestamp}.json`;
    const filepath = path.join(this.options.reportPath, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    // Clean up old reports
    await this.cleanupOldReports();
  }

  /**
   * Clean up old reports to stay within maxReports limit
   */
  async cleanupOldReports() {
    try {
      const files = await fs.readdir(this.options.reportPath);
      const reportFiles = files
        .filter(f => f.startsWith('integrity-report-') && f.endsWith('.json'))
        .sort()
        .reverse(); // newest first
      
      if (reportFiles.length > this.options.maxReports) {
        const filesToDelete = reportFiles.slice(this.options.maxReports);
        
        for (const file of filesToDelete) {
          await fs.unlink(path.join(this.options.reportPath, file));
        }
        
        console.log(chalk.gray(`🧹 Cleaned up ${filesToDelete.length} old report(s)`));
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to clean up old reports: ${error.message}`));
    }
  }

  /**
   * Print validation summary
   */
  printValidationSummary(report) {
    const { summary, isHealthy, validationTime } = report;
    
    if (isHealthy) {
      console.log(chalk.green(`✅ HEALTHY (${validationTime}ms)`));
      console.log(chalk.green(`   ${summary.totalSpecs} specs validated, all checks passed`));
    } else {
      console.log(chalk.red(`❌ ISSUES DETECTED (${validationTime}ms)`));
      console.log(chalk.red(`   ${summary.errors} errors, ${summary.warnings} warnings`));
      
      if (report.issues.duplicateIds > 0) {
        console.log(chalk.red(`   🚫 ${report.issues.duplicateIds} duplicate IDs`));
      }
      
      if (report.issues.brokenReferences > 0) {
        console.log(chalk.red(`   🔗 ${report.issues.brokenReferences} broken references`));
      }
      
      if (report.issues.structuralIssues > 0) {
        console.log(chalk.yellow(`   🏗️  ${report.issues.structuralIssues} structural issues`));
      }
    }
    
    console.log('');
  }

  /**
   * Print final monitoring summary
   */
  printFinalSummary() {
    console.log(chalk.blue('\n📊 MONITORING SESSION SUMMARY'));
    console.log(chalk.blue('================================'));
    
    console.log(`Total checks performed: ${this.metrics.totalChecks}`);
    console.log(`Average validation time: ${this.metrics.avgValidationTime}ms`);
    console.log(`Total errors found: ${this.metrics.totalErrors}`);
    console.log(`Total warnings found: ${this.metrics.totalWarnings}`);
    console.log(`Issues resolved: ${this.metrics.resolvedIssues.size}`);
    console.log(`Current active issues: ${this.metrics.currentIssues.size}`);
    
    if (this.metrics.lastHealthyCheck) {
      console.log(`Last healthy check: ${new Date(this.metrics.lastHealthyCheck).toLocaleString()}`);
    }
    
    console.log(`\nReports saved to: ${this.options.reportPath}`);
  }

  /**
   * Print monitoring dashboard
   */
  printDashboard() {
    if (!this.lastValidation) {
      console.log(chalk.yellow('📊 No validation data available yet'));
      return;
    }
    
    const report = this.lastValidation;
    
    console.clear();
    console.log(chalk.blue('📊 ASD SPECIFICATION INTEGRITY DASHBOARD'));
    console.log(chalk.blue('=========================================\n'));
    
    // Health status
    const healthStatus = report.isHealthy 
      ? chalk.green('🟢 HEALTHY')
      : chalk.red('🔴 ISSUES DETECTED');
    console.log(`Status: ${healthStatus}`);
    console.log(`Last check: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`Check trigger: ${report.trigger}`);
    console.log(`Validation time: ${report.validationTime}ms\n`);
    
    // Summary metrics
    console.log(chalk.bold('Specifications:'));
    console.log(`  Total: ${report.summary.totalSpecs}`);
    console.log(`  Unique IDs: ${report.summary.uniqueIds.size || 'N/A'}`);
    console.log(`  Parse errors: ${report.summary.totalSpecs - report.summary.validSpecs || 0}\n`);
    
    // Issues breakdown
    console.log(chalk.bold('Issues:'));
    console.log(`  ${chalk.red('Errors:')} ${report.summary.errors}`);
    console.log(`  ${chalk.yellow('Warnings:')} ${report.summary.warnings}`);
    console.log(`  ${chalk.red('Duplicate IDs:')} ${report.issues.duplicateIds}`);
    console.log(`  ${chalk.red('Broken references:')} ${report.issues.brokenReferences}`);
    console.log(`  ${chalk.yellow('Structural issues:')} ${report.issues.structuralIssues}\n`);
    
    // Session metrics
    console.log(chalk.bold('Session metrics:'));
    console.log(`  Total checks: ${this.metrics.totalChecks}`);
    console.log(`  Average time: ${this.metrics.avgValidationTime}ms`);
    console.log(`  Issues resolved: ${this.metrics.resolvedIssues.size}`);
    console.log(`  Active issues: ${this.metrics.currentIssues.size}\n`);
    
    console.log(chalk.gray('Press Ctrl+C to stop monitoring'));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const projectPath = args[0] || '.';
  
  const options = {
    watchMode: args.includes('--watch'),
    checkInterval: args.includes('--interval') ? parseInt(args[args.indexOf('--interval') + 1]) * 1000 : 300000,
    dashboard: args.includes('--dashboard'),
    reportPath: args.includes('--reports') ? args[args.indexOf('--reports') + 1] : undefined
  };
  
  console.log(chalk.blue('ASD Specification Integrity Monitor'));
  console.log(chalk.gray('MAINT-003 TASK-004 - Continuous integrity monitoring\n'));
  
  const monitor = new SpecIntegrityMonitor(projectPath, options);
  
  // Dashboard mode
  if (options.dashboard) {
    setInterval(() => {
      monitor.printDashboard();
    }, 5000); // Update dashboard every 5 seconds
  }
  
  await monitor.start();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

module.exports = SpecIntegrityMonitor;