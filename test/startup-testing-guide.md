# ASD Startup Testing Guide

## Overview

This guide covers the comprehensive automated testing system for ASD CLI startup functionality. The testing system ensures startup reliability, performance, and error handling across all supported environments.

## Test Structure

### Test Files

```
test/
├── startup-validation.test.js     # StartupValidator class unit tests
├── cli-startup.test.js            # CLI command integration tests
├── startup-performance.test.js    # Performance and timing tests
├── startup-error-scenarios.test.js # Error handling and edge cases
├── startup-results-processor.js   # Performance monitoring
└── startup-testing-guide.md       # This documentation
```

### Test Categories

1. **Unit Tests** (`startup-validation.test.js`)

   - StartupValidator class functionality
   - Individual validation methods
   - Error handling and edge cases
   - Performance analysis features

2. **Integration Tests** (`cli-startup.test.js`)

   - Full CLI command execution
   - Cross-platform compatibility
   - Environment variable handling
   - Real-world usage scenarios

3. **Performance Tests** (`startup-performance.test.js`)

   - Startup timing requirements (<2s)
   - Performance consistency
   - Load testing
   - Regression detection

4. **Error Scenario Tests** (`startup-error-scenarios.test.js`)
   - Configuration file errors
   - Permission issues
   - Environment problems
   - Recovery mechanisms

## Running Tests

### Individual Test Suites

```bash
# Run specific startup test suites
npm run test:startup-validation    # Unit tests for StartupValidator
npm run test:cli-startup           # CLI integration tests
npm run test:startup-performance   # Performance tests
npm run test:startup-errors        # Error scenario tests
```

### Comprehensive Testing

```bash
# Run all startup tests
npm run test:startup-full

# Run startup tests with CI configuration
npm run test:ci-startup

# Run with performance monitoring
npm run test:startup -- --verbose
```

### Development Testing

```bash
# Watch mode for development
npm run test:startup -- --watch

# Debug mode with detailed output
npm run test:debug -- --testPathPattern="startup"
```

## Performance Requirements

### Critical Thresholds

| Command                | Maximum Time | Typical Time |
| ---------------------- | ------------ | ------------ |
| `asd --version`        | 2000ms       | <200ms       |
| `asd --help`           | 2000ms       | <300ms       |
| `asd doctor`           | 5000ms       | <1000ms      |
| `asd validate-startup` | 3000ms       | <500ms       |

### Performance Monitoring

The test suite automatically:

- Measures execution time for all commands
- Detects performance regressions
- Generates performance reports
- Alerts on critical slowdowns

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure ASD is available globally (for integration tests)
npm link
```

### Environment Variables

```bash
# Enable debug output
DEBUG_TESTS=true npm run test:startup

# CI mode (reduces output, enables coverage)
CI=true npm run test:startup

# Custom timeout for slow systems
JEST_TIMEOUT=60000 npm run test:startup
```

## Test Coverage

### Covered Scenarios

#### ✅ Success Cases

- Normal startup in ASD project
- Startup in empty directory
- All CLI commands work correctly
- Performance meets requirements
- Cross-platform compatibility

#### ⚠️ Warning Cases

- Missing project structure
- Small terminal dimensions
- Non-TTY environment
- Missing optional dependencies

#### ❌ Error Cases

- Corrupted configuration files
- Insufficient permissions
- Missing critical dependencies
- Terminal too small
- Invalid command arguments

### Platform Coverage

- **macOS** (Darwin)
- **Linux** (Ubuntu, CentOS)
- **Windows** (Windows 10+)
- **Node.js versions**: 16, 18, 20

## CI Integration

### GitHub Actions Workflow

The startup testing system includes a comprehensive CI workflow:

```yaml
# .github/workflows/startup-testing.yml
- Runs on every push/PR
- Tests across multiple OS and Node versions
- Performance regression detection
- Automatic issue creation for critical failures
```

### CI Test Execution

1. **Matrix Testing**: OS × Node.js version combinations
2. **Performance Monitoring**: Tracks trends over time
3. **Regression Detection**: Alerts on performance degradation
4. **Report Generation**: Creates detailed reports and artifacts

## Performance Reporting

### Automated Reports

The test suite generates:

```
test-results/
├── startup-metrics-latest.json     # Latest performance data
├── startup-performance-report.md   # Human-readable report
├── startup-test-results.xml        # JUnit format for CI
└── startup-metrics-<timestamp>.json # Historical data
```

### Report Contents

- **Test Summary**: Pass/fail counts, duration
- **Performance Metrics**: Average, min, max times
- **Regression Alerts**: Performance issues detected
- **Platform Comparison**: Cross-platform performance data

## Troubleshooting

### Common Issues

#### Tests Timeout

```bash
# Increase timeout for slower systems
JEST_TIMEOUT=30000 npm run test:startup
```

#### Permission Errors

```bash
# Ensure proper permissions
chmod +x bin/asd

# On Windows, run as administrator if needed
```

#### Performance Failures

```bash
# Check system load
top

# Run performance tests in isolation
npm run test:startup-performance -- --maxWorkers=1
```

### Debugging Test Failures

```bash
# Enable verbose output
npm run test:startup -- --verbose

# Run specific test
npm run test:startup -- --testNamePattern="startup performance"

# Debug mode with detailed logs
DEBUG_TESTS=true npm run test:startup
```

## Development Guidelines

### Adding New Tests

1. **Choose appropriate test file**:

   - Unit tests → `startup-validation.test.js`
   - CLI tests → `cli-startup.test.js`
   - Performance → `startup-performance.test.js`
   - Error cases → `startup-error-scenarios.test.js`

2. **Follow naming conventions**:

   ```javascript
   describe("Feature Category", () => {
     test("specific behavior description", async () => {
       // Test implementation
     });
   });
   ```

3. **Include performance measurements**:
   ```javascript
   const startTime = Date.now();
   // ... test execution
   const duration = Date.now() - startTime;
   expect(duration).toBeLessThan(2000);
   ```

### Test Maintenance

1. **Update performance thresholds** when making optimizations
2. **Add new error scenarios** when fixing bugs
3. **Maintain cross-platform compatibility** for all tests
4. **Update documentation** when adding new test categories

## Integration with ASD Workflow

### Pre-commit Hooks

```bash
# Add to .pre-commit-config.yaml or similar
- repo: local
  hooks:
    - id: startup-tests
      name: ASD Startup Tests
      entry: npm run test:startup-full
      language: system
      pass_filenames: false
```

### Release Validation

```bash
# Before version bump
npm run validate-startup

# Part of preversion script
npm run preversion  # Includes startup tests
```

## Monitoring and Alerts

### Performance Monitoring

The system continuously monitors:

- **Average execution times** for all commands
- **Performance variance** (consistency)
- **Cross-platform differences**
- **Regression trends** over time

### Alert Conditions

- **Critical**: Commands exceed 2x performance threshold
- **Warning**: Commands exceed normal threshold
- **Info**: High performance variance detected

### Response Actions

1. **Immediate**: CI fails, blocks merge
2. **Notification**: GitHub issue created automatically
3. **Investigation**: Performance report attached
4. **Resolution**: Fix and validate with tests

---

## Quick Reference

```bash
# Essential startup test commands
npm run test:startup-full           # Run all startup tests
npm run test:startup -- --watch     # Watch mode for development
npm run validate-startup             # Full validation including linting
DEBUG_TESTS=true npm run test:startup # Debug mode with detailed output
```

For more information, see individual test files and the main project documentation.
