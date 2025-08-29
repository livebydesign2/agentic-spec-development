/**
 * Startup Test Results Processor
 * Processes test results to extract performance metrics and generate reports
 */

const fs = require('fs');
const path = require('path');

module.exports = (testResults) => {
  const startupMetrics = {
    timestamp: new Date().toISOString(),
    totalTests: testResults.numTotalTests,
    passedTests: testResults.numPassedTests,
    failedTests: testResults.numFailedTests,
    testSuites: [],
    performanceMetrics: {},
    regressionAlerts: [],
  };

  // Process each test suite
  testResults.testResults.forEach((testResult) => {
    const suiteName = path.basename(testResult.testFilePath, '.test.js');
    const suiteMetrics = {
      name: suiteName,
      duration: testResult.perfStats.end - testResult.perfStats.start,
      tests: testResult.testResults.length,
      passed: testResult.testResults.filter((t) => t.status === 'passed')
        .length,
      failed: testResult.testResults.filter((t) => t.status === 'failed')
        .length,
      performanceTests: [],
    };

    // Extract performance data from console logs
    testResult.testResults.forEach((test) => {
      if (test.title && test.title.includes('performance')) {
        const performanceData = extractPerformanceFromTest(test);
        if (performanceData) {
          suiteMetrics.performanceTests.push(performanceData);
        }
      }
    });

    startupMetrics.testSuites.push(suiteMetrics);
  });

  // Calculate overall performance metrics
  startupMetrics.performanceMetrics = calculateOverallMetrics(
    startupMetrics.testSuites
  );

  // Check for performance regressions
  startupMetrics.regressionAlerts = checkForRegressions(
    startupMetrics.performanceMetrics
  );

  // Save results to file
  saveMetricsToFile(startupMetrics);

  // Generate performance report
  generatePerformanceReport(startupMetrics);

  // Return original test results for Jest
  return testResults;
};

function extractPerformanceFromTest(test) {
  // Extract performance data from test output
  const performanceRegex = /([\w-]+):\s*(\d+\.?\d*)ms/g;
  const matches = [];
  let match;

  const output = test.failureMessages.join(' ') + ' ' + (test.title || '');
  while ((match = performanceRegex.exec(output)) !== null) {
    matches.push({
      operation: match[1],
      duration: parseFloat(match[2]),
      timestamp: new Date().toISOString(),
    });
  }

  return matches.length > 0
    ? {
        testName: test.title,
        metrics: matches,
      }
    : null;
}

function calculateOverallMetrics(testSuites) {
  const allPerformanceTests = testSuites.reduce((acc, suite) => {
    return acc.concat(suite.performanceTests);
  }, []);

  const metrics = {};

  allPerformanceTests.forEach((test) => {
    test.metrics.forEach((metric) => {
      if (!metrics[metric.operation]) {
        metrics[metric.operation] = {
          samples: [],
          average: 0,
          min: Infinity,
          max: 0,
        };
      }

      metrics[metric.operation].samples.push(metric.duration);
      metrics[metric.operation].min = Math.min(
        metrics[metric.operation].min,
        metric.duration
      );
      metrics[metric.operation].max = Math.max(
        metrics[metric.operation].max,
        metric.duration
      );
    });
  });

  // Calculate averages
  Object.keys(metrics).forEach((operation) => {
    const samples = metrics[operation].samples;
    metrics[operation].average =
      samples.reduce((sum, val) => sum + val, 0) / samples.length;
    metrics[operation].sampleCount = samples.length;
  });

  return metrics;
}

function checkForRegressions(performanceMetrics) {
  const alerts = [];
  const thresholds = {
    '--version': 1000, // 1 second
    '--help': 1500, // 1.5 seconds
    doctor: 3000, // 3 seconds
    'validate-startup': 2000, // 2 seconds
  };

  Object.keys(performanceMetrics).forEach((operation) => {
    const metric = performanceMetrics[operation];
    const threshold = thresholds[operation];

    if (threshold && metric.average > threshold) {
      alerts.push({
        type: 'performance_regression',
        operation,
        average: metric.average,
        threshold,
        severity: metric.average > threshold * 1.5 ? 'high' : 'medium',
      });
    }

    // Check for high variance (inconsistent performance)
    if (metric.sampleCount > 3) {
      const variance = calculateVariance(metric.samples);
      const coefficient = Math.sqrt(variance) / metric.average;

      if (coefficient > 0.3) {
        // More than 30% coefficient of variation
        alerts.push({
          type: 'performance_inconsistency',
          operation,
          coefficient,
          severity: 'medium',
        });
      }
    }
  });

  return alerts;
}

function calculateVariance(samples) {
  const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
  const squaredDiffs = samples.map((val) => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / samples.length;
}

function saveMetricsToFile(metrics) {
  try {
    const outputDir = 'test-results';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `startup-metrics-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(metrics, null, 2));

    // Also save latest metrics
    const latestPath = path.join(outputDir, 'startup-metrics-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.warn('Failed to save startup metrics:', error.message);
  }
}

function generatePerformanceReport(metrics) {
  try {
    const outputDir = 'test-results';
    const reportPath = path.join(outputDir, 'startup-performance-report.md');

    let report = '# ASD Startup Performance Report\n\n';
    report += `**Generated:** ${metrics.timestamp}\n\n`;
    report += '## Test Summary\n\n';
    report += `- **Total Tests:** ${metrics.totalTests}\n`;
    report += `- **Passed:** ${metrics.passedTests}\n`;
    report += `- **Failed:** ${metrics.failedTests}\n\n`;

    // Performance metrics section
    if (Object.keys(metrics.performanceMetrics).length > 0) {
      report += '## Performance Metrics\n\n';
      report +=
        '| Operation | Average (ms) | Min (ms) | Max (ms) | Samples |\n';
      report +=
        '|-----------|--------------|----------|----------|---------|\n';

      Object.entries(metrics.performanceMetrics).forEach(
        ([operation, data]) => {
          report += `| ${operation} | ${data.average.toFixed(
            2
          )} | ${data.min.toFixed(2)} | ${data.max.toFixed(2)} | ${
            data.sampleCount
          } |\n`;
        }
      );
      report += '\n';
    }

    // Regression alerts section
    if (metrics.regressionAlerts.length > 0) {
      report += '## ⚠️ Performance Alerts\n\n';

      metrics.regressionAlerts.forEach((alert) => {
        const severity = alert.severity === 'high' ? '🔴' : '🟡';
        report += `${severity} **${alert.type
          .replace('_', ' ')
          .toUpperCase()}** - ${alert.operation}\n`;

        if (alert.average && alert.threshold) {
          report += `  - Average: ${alert.average.toFixed(2)}ms (threshold: ${
            alert.threshold
          }ms)\n`;
        }
        if (alert.coefficient) {
          report += `  - Performance variance: ${(
            alert.coefficient * 100
          ).toFixed(1)}%\n`;
        }
        report += '\n';
      });
    } else {
      report += '## ✅ No Performance Issues Detected\n\n';
    }

    // Test suite details
    report += '## Test Suite Details\n\n';
    metrics.testSuites.forEach((suite) => {
      report += `### ${suite.name}\n`;
      report += `- Duration: ${suite.duration}ms\n`;
      report += `- Tests: ${suite.tests} (${suite.passed} passed, ${suite.failed} failed)\n`;
      if (suite.performanceTests.length > 0) {
        report += `- Performance tests: ${suite.performanceTests.length}\n`;
      }
      report += '\n';
    });

    fs.writeFileSync(reportPath, report);
  } catch (error) {
    console.warn('Failed to generate performance report:', error.message);
  }
}
