---
process_type: 'code-review'
version: '1.0'
applies_to:
  ['backend-developer', 'cli-specialist', 'ui-developer', 'software-architect']
mandatory_checks:
  - 'code_quality_standards'
  - 'security_review'
  - 'performance_impact'
  - 'testing_adequacy'
recommended_checks:
  - 'design_pattern_consistency'
  - 'documentation_completeness'
  - 'maintainability_assessment'
---

# Code Review Process Template

This template ensures consistent, thorough code reviews that maintain quality standards while enabling knowledge sharing and continuous improvement.

## 🔍 Pre-Review Checklist (Author)

### Code Preparation

- [ ] **Self-Review**: Author has reviewed their own code for obvious issues
- [ ] **Scope Clarity**: Changes are focused and address specific requirements
- [ ] **Commit Quality**: Commits are logical, well-messaged, and easy to follow
- [ ] **Documentation**: Code comments explain "why" not just "what"
- [ ] **Testing**: Adequate test coverage for new functionality

### Review Request

- [ ] **Context Provided**: Clear description of what changed and why
- [ ] **Testing Instructions**: How to test the changes locally
- [ ] **Dependencies**: Any external dependencies or configuration changes noted
- [ ] **Breaking Changes**: Any breaking changes are clearly highlighted
- [ ] **Screenshots/Examples**: Visual changes include before/after examples

## 🎯 Review Focus Areas

### 1. Functional Correctness

- [ ] Code implements requirements as specified
- [ ] Edge cases and error conditions are handled appropriately
- [ ] Logic is sound and produces expected results
- [ ] Integration points work correctly with existing systems

### 2. Code Quality Standards

- [ ] **Style Consistency**: Code follows established style guidelines
- [ ] **Naming**: Variables, functions, and classes have descriptive names
- [ ] **Structure**: Code is well-organized and follows architectural patterns
- [ ] **Complexity**: Functions and classes are appropriately sized and focused
- [ ] **DRY Principle**: Code duplication is minimized appropriately

### 3. Security Considerations

- [ ] **Input Validation**: All user inputs are properly validated
- [ ] **Authentication**: Authentication and authorization are handled correctly
- [ ] **Data Protection**: Sensitive data is not exposed or logged inappropriately
- [ ] **Injection Prevention**: Code prevents SQL injection, command injection, etc.
- [ ] **Error Handling**: Error messages don't expose sensitive information

### 4. Performance Impact

- [ ] **Efficiency**: Algorithms and data structures are appropriate for the task
- [ ] **Resource Usage**: Memory and CPU usage are reasonable
- [ ] **Database Operations**: Queries are optimized and avoid N+1 problems
- [ ] **Caching**: Appropriate caching strategies are implemented where beneficial
- [ ] **Scalability**: Changes don't introduce performance bottlenecks

### 5. Testing Adequacy

- [ ] **Coverage**: New code has appropriate unit test coverage
- [ ] **Integration Tests**: Integration points are tested
- [ ] **Error Scenarios**: Tests cover error conditions and edge cases
- [ ] **Maintainability**: Tests are clear, focused, and maintainable
- [ ] **Performance Tests**: Critical paths have performance validation

## 🛠️ Component-Specific Review Guidelines

### Backend/API Components

- [ ] API endpoints follow RESTful or established conventions
- [ ] Database operations are optimized and secure
- [ ] Error responses include appropriate HTTP status codes
- [ ] Logging provides useful information without exposing sensitive data
- [ ] Data validation is comprehensive at API boundaries

### CLI Components

- [ ] Commands follow established CLI conventions
- [ ] Help text is comprehensive and user-friendly
- [ ] Error messages provide actionable guidance
- [ ] Interactive features enhance rather than complicate workflows
- [ ] Cross-platform compatibility is maintained

### UI Components

- [ ] Terminal UI components are responsive and accessible
- [ ] Interaction patterns are intuitive and consistent
- [ ] Visual hierarchy guides user attention effectively
- [ ] Performance is smooth with minimal rendering delays
- [ ] Error states provide clear feedback and recovery options

### Architecture Components

- [ ] Component relationships are clearly defined
- [ ] Interfaces are well-designed and consistent
- [ ] Integration points are robust and well-tested
- [ ] Design patterns are applied appropriately
- [ ] System modularity and maintainability are preserved

## 💬 Review Communication Guidelines

### Providing Feedback

- **Be Specific**: Point to exact lines and explain the issue clearly
- **Be Constructive**: Suggest improvements rather than just pointing out problems
- **Prioritize Issues**: Distinguish between blocking issues and suggestions
- **Ask Questions**: When unclear, ask questions rather than making assumptions
- **Acknowledge Good Work**: Highlight good practices and elegant solutions

### Receiving Feedback

- **Stay Open**: Treat feedback as learning opportunities
- **Ask for Clarification**: If feedback is unclear, ask for specific guidance
- **Respond Thoughtfully**: Address each comment appropriately
- **Push Back Respectfully**: If you disagree, explain your reasoning
- **Thank Reviewers**: Acknowledge the time and effort reviewers invest

## 🚨 Blocking Issues (Must Fix Before Merge)

### Critical Problems

- **Security Vulnerabilities**: Any potential security issues
- **Breaking Changes**: Unintended breaking changes to existing functionality
- **Performance Regressions**: Significant performance degradations
- **Test Failures**: Failing tests or inadequate test coverage for critical paths
- **Data Loss Risk**: Changes that could result in data loss or corruption

### Quality Issues

- **Major Logic Errors**: Fundamental flaws in business logic
- **Resource Leaks**: Memory leaks or resource management issues
- **Integration Failures**: Broken integration points with existing systems
- **Standards Violations**: Significant deviations from coding standards
- **Missing Documentation**: Critical functionality lacking appropriate documentation

## ✅ Approval Criteria

### Reviewer Approval Requirements

- [ ] **Functional Requirements**: All acceptance criteria are demonstrably met
- [ ] **Quality Standards**: Code meets established quality and style guidelines
- [ ] **Security Standards**: No security vulnerabilities or data exposure risks
- [ ] **Performance Standards**: No significant performance regressions
- [ ] **Testing Standards**: Adequate test coverage and all tests passing

### Documentation Requirements

- [ ] **Code Documentation**: Complex logic is appropriately commented
- [ ] **API Documentation**: New APIs or interfaces are documented
- [ ] **Architecture Updates**: Significant architectural changes are documented
- [ ] **User Documentation**: User-facing changes include documentation updates
- [ ] **Configuration Changes**: Any configuration changes are documented

## 🔄 Post-Merge Actions

### Immediate Actions

- [ ] **Deployment Monitoring**: Monitor deployment for any issues
- [ ] **Performance Monitoring**: Watch for performance impact in production
- [ ] **Error Monitoring**: Check for new errors or exceptions
- [ ] **User Feedback**: Monitor for user reports or issues

### Follow-Up Actions

- [ ] **Documentation Updates**: Ensure all documentation is updated
- [ ] **Knowledge Sharing**: Share learnings with the team if applicable
- [ ] **Refactoring Opportunities**: Note any technical debt created for future cleanup
- [ ] **Process Improvements**: Document any process improvements for future reviews

## 📊 Review Quality Metrics

### Effectiveness Indicators

- **Defect Detection Rate**: Percentage of bugs caught in review vs. production
- **Review Cycle Time**: Time from review request to approval
- **Review Coverage**: Percentage of changes that receive thorough review
- **Knowledge Transfer**: Evidence of learning and skill development

### Continuous Improvement

- **Regular Retrospectives**: Periodically review and improve the review process
- **Tool Enhancement**: Identify and implement tools that improve review efficiency
- **Training Opportunities**: Provide training on code review best practices
- **Process Refinement**: Continuously refine guidelines based on team experience

Remember: Code review is not just about finding problems—it's about knowledge sharing, maintaining quality standards, and continuous learning as a team.
