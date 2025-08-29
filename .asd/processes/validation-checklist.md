---
process_type: 'validation-checklist'
version: '1.0'
applies_to: ['all-agents']
mandatory_checks:
  - 'functional_completeness'
  - 'code_quality'
  - 'test_coverage'
  - 'documentation_accuracy'
recommended_checks:
  - 'performance_validation'
  - 'security_review'
  - 'accessibility_check'
---

# Universal Validation Checklist

This checklist ensures consistent quality standards across all agent work. Complete all mandatory checks before marking any task as complete.

## 🔍 Mandatory Validation (Required for All Tasks)

### Functional Completeness

- [ ] All acceptance criteria explicitly met and demonstrable
- [ ] Core functionality works as specified in requirements
- [ ] Error cases and edge cases are handled appropriately
- [ ] User workflows complete successfully end-to-end
- [ ] Integration points function correctly with existing systems

### Code Quality Standards

- [ ] **Linting**: Code passes `npm run lint` without errors
- [ ] **Formatting**: Code formatting is consistent with project standards
- [ ] **Patterns**: Code follows established architectural patterns
- [ ] **Comments**: Complex logic is documented with clear comments
- [ ] **Naming**: Variables, functions, and classes have descriptive names

### Test Coverage

- [ ] **Unit Tests**: New functionality has appropriate unit test coverage
- [ ] **Integration Tests**: Integration points are tested
- [ ] **Test Execution**: All tests pass (`npm test`)
- [ ] **Error Scenarios**: Test coverage includes error and edge cases
- [ ] **Regression Prevention**: Tests prevent known issues from reoccurring

### Documentation Accuracy

- [ ] **Specification Updates**: Task completion reflected in specification files
- [ ] **API Documentation**: New APIs or interfaces are documented
- [ ] **Architecture Updates**: Architecture documentation updated if needed
- [ ] **Configuration Changes**: Any config changes are documented
- [ ] **Usage Examples**: Clear examples provided for new functionality

## 🚀 Performance Validation (High-Priority Tasks)

### Response Time Standards

- [ ] CLI commands respond within 2 seconds for typical operations
- [ ] Database queries complete within acceptable time limits
- [ ] File operations don't block user interface unnecessarily
- [ ] Startup time remains under 500ms for simple commands

### Resource Usage

- [ ] Memory usage is reasonable for typical use cases
- [ ] File system operations are optimized and don't create excessive I/O
- [ ] Network requests are efficient and include proper timeout handling
- [ ] CPU usage is acceptable for background operations

## 🛡️ Security Review (Data/Integration Tasks)

### Input Validation

- [ ] All user inputs are properly validated and sanitized
- [ ] File path inputs prevent directory traversal attacks
- [ ] Command injection vulnerabilities are prevented
- [ ] SQL injection prevention (if applicable)

### Data Protection

- [ ] Sensitive data (API keys, tokens) is not logged or exposed
- [ ] Configuration files with secrets are properly protected
- [ ] File permissions are set appropriately for created files
- [ ] Network communications use secure protocols where applicable

## ♿ Accessibility Check (UI/CLI Tasks)

### CLI Accessibility

- [ ] Help text is comprehensive and easily discoverable
- [ ] Error messages are clear and provide actionable guidance
- [ ] Commands work consistently across different terminal environments
- [ ] Output is readable and well-formatted

### Documentation Accessibility

- [ ] Documentation uses clear, plain language
- [ ] Code examples are complete and runnable
- [ ] Screenshots include alt text or descriptions where applicable
- [ ] Information hierarchy is logical and easy to navigate

## 🔧 Technical Validation by Component Type

### Backend/API Components

- [ ] API endpoints follow RESTful or established conventions
- [ ] Error responses include appropriate HTTP status codes
- [ ] Data validation is comprehensive at API boundaries
- [ ] Database operations are optimized and secure
- [ ] Logging provides appropriate information for debugging

### CLI Components

- [ ] Commands follow established CLI conventions (help, version, etc.)
- [ ] Progress indicators provided for long-running operations
- [ ] Graceful handling of interruption (Ctrl+C)
- [ ] Cross-platform compatibility verified
- [ ] Command aliases and shortcuts work as expected

### Configuration/Data Components

- [ ] Schema validation prevents invalid configurations
- [ ] Default values are sensible and well-documented
- [ ] Migration paths exist for configuration changes
- [ ] Backward compatibility maintained where required
- [ ] Configuration errors provide clear resolution guidance

## 🧪 Testing Validation Commands

Run these commands to validate your implementation:

```bash
# Basic validation
npm run lint              # Code style and quality
npm test                  # Unit and integration tests
npm run typecheck         # Type validation (if TypeScript)

# Functional validation
node bin/asd --help       # CLI still works
node bin/asd status       # Core functionality works
# Test your specific feature here

# Performance validation (if applicable)
npm run test:performance  # Performance tests
time node bin/asd status  # Command timing

# Integration validation
npm run test:integration  # Integration tests
# Manual integration testing with real data
```

## 📝 Documentation Validation

### Specification Files

- [ ] Task status updated to reflect completion
- [ ] Implementation notes added for future reference
- [ ] Any scope changes or discoveries documented
- [ ] Dependencies updated if they changed

### Architecture Documentation

- [ ] New components added to architecture diagrams
- [ ] Integration points documented
- [ ] Data flow updates reflected
- [ ] Decision rationale explained

### User-Facing Documentation

- [ ] New features explained with examples
- [ ] Configuration options documented
- [ ] Troubleshooting guidance provided
- [ ] Migration instructions included (if needed)

## ⚠️ Common Validation Failures

### Incomplete Implementation

- Feature works in happy path but fails on edge cases
- Error handling missing or provides poor user experience
- Integration testing skipped, causing downstream failures

### Poor Documentation

- Code comments don't explain "why", only "what"
- Configuration changes not reflected in documentation
- Examples are incomplete or don't work

### Performance Issues

- Database queries not optimized, causing slow responses
- File operations blocking unnecessarily
- Memory leaks in long-running processes

### Security Gaps

- User inputs not properly validated
- Sensitive information logged or exposed
- File operations creating security vulnerabilities

## 🎯 Success Criteria

Your validation is complete when:

- [ ] All mandatory checks pass
- [ ] Applicable component-specific checks pass
- [ ] Automated tests demonstrate functionality works
- [ ] Manual testing confirms user scenarios work end-to-end
- [ ] Documentation enables next agent to continue work effectively

**Remember**: Validation is not just about your code working—it's about ensuring the entire system remains robust, maintainable, and user-friendly.
