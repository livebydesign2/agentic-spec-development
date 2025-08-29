# ASD CLI Test Suite

Comprehensive test suite for the Agentic Spec Development (ASD) CLI tool, providing thorough coverage of all core modules and integration scenarios.

## 📋 Test Structure

```
test/
├── setup.js                           # Global test setup and utilities
├── fixtures/                          # Test data and sample files
│   ├── spec-001-example.md           # Sample SPEC format
│   ├── feat-042-legacy.md            # Legacy FEAT format
│   ├── bug-001-critical.md           # Bug specification
│   ├── spike-005-research.md         # Research spike
│   ├── malformed-spec.md             # Invalid file for error testing
│   └── test-config.js                # Sample configuration
├── config-manager.test.js             # ConfigManager unit tests
├── spec-parser.test.js               # SpecParser unit tests
├── progress-calc.test.js             # ProgressCalculator unit tests
├── ui-components.test.js             # UIComponents unit tests
├── cli.test.js                       # CLI command tests
├── performance.test.js               # Performance and stress tests
└── integration/                      # Integration tests
    ├── full-workflow.test.js         # End-to-end workflow tests
    └── backwards-compatibility.test.js # Legacy format support
```

## 🚀 Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch

# Debug mode with verbose output
npm run test:debug
```

### Specific Test Categories

```bash
# Unit tests only (fast)
npm run test:unit

# Integration tests (comprehensive)
npm run test:integration

# Performance tests (resource intensive)
npm run test:performance

# CI/CD optimized run
npm run test:ci
```

## 📊 Test Coverage

The test suite aims for high coverage across all modules:

### Target Coverage Goals

- **Lines**: >80%
- **Functions**: >80%
- **Branches**: >80%
- **Statements**: >80%

### Coverage Areas

#### ConfigManager (`config-manager.test.js`)

- ✅ Configuration loading from multiple sources
- ✅ Validation and normalization
- ✅ Path resolution (relative/absolute)
- ✅ Default value handling
- ✅ Error handling for malformed configs
- ✅ Helper methods (getters, validators)

#### SpecParser (`spec-parser.test.js`)

- ✅ Multi-format parsing (SPEC, FEAT, BUG, SPIKE, MAINT)
- ✅ Task and subtask parsing
- ✅ Agent assignment extraction
- ✅ Priority and status handling
- ✅ YAML front matter support
- ✅ Required documentation parsing
- ✅ Error handling for malformed files
- ✅ Backwards compatibility methods

#### ProgressCalculator (`progress-calc.test.js`)

- ✅ Task-based progress calculation
- ✅ Subtask-based progress calculation
- ✅ Mixed format progress handling
- ✅ Overall progress aggregation
- ✅ Task status filtering
- ✅ Velocity and estimation calculations
- ✅ Edge case handling

#### UIComponents (`ui-components.test.js`)

- ✅ Progress bar generation
- ✅ Status and priority icons
- ✅ Color formatting
- ✅ Text formatting and wrapping
- ✅ Feature list item creation
- ✅ Task list formatting
- ✅ Tabbed header generation
- ✅ Help text generation

#### CLI Commands (`cli.test.js`)

- ✅ Help and version output
- ✅ Project initialization (`asd init`)
- ✅ Configuration display (`asd config`)
- ✅ Health checking (`asd doctor`)
- ✅ Command-line option handling
- ✅ Error handling and validation

## 🔧 Integration Tests

### Full Workflow (`full-workflow.test.js`)

Tests complete ASD workflows with realistic data:

- **Multi-format support**: SPEC, FEAT, BUG, SPIKE, MAINT formats
- **Complex task structures**: Mixed tasks and subtasks
- **Agent assignments**: Role-based task assignments
- **Progress tracking**: Accurate progress calculations
- **Statistics generation**: Project health metrics
- **UI component integration**: End-to-end rendering
- **Error resilience**: Graceful handling of malformed data
- **Large dataset handling**: Performance with 100+ specs

### Backwards Compatibility (`backwards-compatibility.test.js`)

Ensures compatibility with legacy Campfire projects:

- **Legacy configuration**: `.roadmaprc.json`, `roadmap.config.js`
- **FEAT format parsing**: Original Campfire feature format
- **Task format variations**: Multiple task header formats
- **Migration support**: Smooth transition paths
- **Mixed format projects**: SPEC + FEAT coexistence

## ⚡ Performance Tests

### Large Dataset Performance (`performance.test.js`)

Validates performance with realistic loads:

- **500+ specifications**: Stress testing with large datasets
- **Memory efficiency**: Memory usage monitoring
- **Concurrent access**: Multi-operation performance
- **Error resilience**: Performance with malformed files
- **Individual large specs**: 100+ tasks per specification

### Performance Thresholds

- **Loading**: <5 seconds for 500 specs
- **Progress calculation**: <1 second for all specs
- **UI generation**: <2 seconds for all components
- **Memory usage**: <100MB for large datasets

## 🛠️ Test Utilities

### Global Test Setup (`setup.js`)

Provides common testing utilities:

```javascript
// Test directory management
global.setupTestDir(); // Create clean test environment
global.cleanupTestDir(); // Remove test files
global.TEST_DIR; // Path to test directory

// File creation utilities
global.createTestFile(path, content); // Create test file
global.readFixture(name); // Read fixture file

// Mock management
// Terminal-kit mocked to prevent actual terminal operations
```

### Test Fixtures (`fixtures/`)

Realistic sample data for testing:

- **spec-001-example.md**: Standard SPEC format with tasks/subtasks
- **feat-042-legacy.md**: Legacy FEAT format for compatibility
- **bug-001-critical.md**: Bug specification with reproduction steps
- **spike-005-research.md**: Research spike with success criteria
- **malformed-spec.md**: Invalid file for error testing

## 🚨 Error Testing

### Error Scenarios Covered

- **Malformed configuration files**: Invalid JSON/JavaScript
- **Missing directories**: Non-existent spec folders
- **Invalid spec files**: Files without proper IDs or format
- **Corrupted file content**: Broken markdown or encoding issues
- **Permission errors**: Read-only directories
- **Network timeouts**: Simulated API failures
- **Memory constraints**: Large dataset handling

### Error Handling Validation

- **Graceful degradation**: Continue with valid data
- **Informative warnings**: Clear error messages
- **Fallback behavior**: Default values and configurations
- **No crashes**: Robust error boundaries

## 📈 Test Metrics

### Execution Time Targets

- **Unit tests**: <10 seconds total
- **Integration tests**: <30 seconds total
- **Performance tests**: <60 seconds total
- **Full suite**: <90 seconds total

### Quality Metrics

- **Zero test failures**: All tests must pass
- **High coverage**: >80% across all modules
- **No memory leaks**: Stable memory usage
- **Cross-platform**: Works on macOS, Linux, Windows

## 🔍 Debugging Tests

### Debug Mode

```bash
# Enable debug output
npm run test:debug

# Run specific test file
npx jest test/config-manager.test.js --verbose

# Run with coverage for specific file
npx jest test/spec-parser.test.js --coverage --verbose
```

### Common Debug Patterns

```javascript
// Log test data during development
if (process.env.DEBUG_TESTS) {
  console.log('Test data:', testData);
}

// Inspect test directory contents
console.log('Test dir contents:', fs.readdirSync(global.TEST_DIR));

// Check memory usage
console.log('Memory usage:', process.memoryUsage());
```

## 🎯 Best Practices

### Test Writing Guidelines

- **Descriptive test names**: Clear what is being tested
- **Independent tests**: No dependencies between tests
- **Realistic data**: Use representative test data
- **Error testing**: Include negative test cases
- **Performance awareness**: Monitor execution time

### Test Data Management

- **Use fixtures**: Shared test data in `fixtures/`
- **Clean state**: Reset between tests
- **Realistic content**: Representative of actual usage
- **Edge cases**: Boundary conditions and limits

### Assertion Patterns

```javascript
// Prefer specific assertions
expect(result.id).toBe('SPEC-001');
expect(result.tasks).toHaveLength(3);
expect(result.progress.percentage).toBe(50);

// Use custom matchers when helpful
expect(result.loadTime).toBeLessThan(1000);
expect(result.memory).toBeCloseTo(50.5, 1);
```

## 🚀 Contributing to Tests

### Adding New Tests

1. Follow existing naming conventions
2. Add to appropriate test file or create new one
3. Include both positive and negative test cases
4. Update coverage expectations if needed
5. Add fixtures for complex test data

### Test Categories

- **Unit tests**: Single module/function testing
- **Integration tests**: Multi-module interaction
- **Performance tests**: Load and stress testing
- **Regression tests**: Prevent known issue recurrence

### Coverage Goals

When adding new functionality:

1. Write tests before or during implementation
2. Aim for >90% coverage of new code
3. Include error handling tests
4. Add performance tests for critical paths
5. Document any testing limitations

---

## 📚 Additional Resources

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Node.js Testing**: https://nodejs.org/api/test.html
- **Performance Testing**: https://nodejs.org/api/perf_hooks.html
- **Code Coverage**: https://github.com/istanbuljs/nyc

---

> 💡 **Testing Philosophy**: Comprehensive testing ensures reliability, performance, and maintainability. Every feature should be tested, every error path should be validated, and every performance requirement should be verified.
