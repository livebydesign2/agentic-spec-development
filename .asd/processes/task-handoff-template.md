---
process_type: "task-handoff"
version: "1.0"
applies_to: ["all-agents"]
required_steps:
  - "complete_current_work"
  - "update_documentation"
  - "prepare_handoff_notes"
  - "validate_completion"
validation_checklist:
  - "All task acceptance criteria met"
  - "Tests pass and code quality standards met"
  - "Documentation updated with implementation details"
  - "Next steps clearly defined for subsequent agent"
---

# Task Handoff Process Template

This template guides agents through the process of completing their assigned work and handing off to the next agent in the workflow.

## Pre-Handoff Checklist

### 1. Complete Current Work

- [ ] All acceptance criteria for your task have been met
- [ ] Code is implemented and functionally complete
- [ ] All tests pass (`npm test`)
- [ ] Code quality checks pass (`npm run lint`)
- [ ] Manual testing completed successfully

### 2. Update Documentation

- [ ] Mark your task as complete in the specification file
- [ ] Update any progress indicators or status fields
- [ ] Add implementation notes and key decisions made
- [ ] Document any challenges encountered and solutions found
- [ ] Update architecture documentation if changes were made

### 3. Prepare Handoff Notes

- [ ] Clearly state what was completed in this task
- [ ] Identify what the next agent should pick up
- [ ] Document any blockers or dependencies for next steps
- [ ] Provide specific guidance for continuing the work
- [ ] Note any deviations from original plan and rationale

### 4. Context Preservation

- [ ] Update relevant context files with new information learned
- [ ] Add any new constraints or requirements discovered
- [ ] Document integration points that affect other components
- [ ] Ensure all configuration changes are documented

## Handoff Documentation Format

```markdown
## TASK COMPLETION: [Task ID] - [Task Title]

### ✅ Completed Work

- Brief description of what was implemented
- Key features or components delivered
- Any architecture or design decisions made

### 🔍 Key Findings

- Important discoveries made during implementation
- Technical challenges and how they were resolved
- Performance considerations or optimizations added

### ➡️ Next Steps

- Specific task or work area for next agent
- Dependencies that must be completed first
- Any setup or preparation needed

### ⚠️ Important Notes

- Critical information for next agent to know
- Potential gotchas or areas requiring careful attention
- Configuration changes or environment updates needed

### 🧪 Testing Notes

- Tests that were added or modified
- Manual testing procedures used
- Any testing gaps that should be addressed
```

## Quality Gates

Before marking your task complete, ensure:

**Functional Completeness**:

- All acceptance criteria are demonstrably met
- Feature works as specified in requirements
- Error cases are handled appropriately

**Code Quality**:

- Code follows established patterns and conventions
- Appropriate comments and documentation added
- No obvious technical debt introduced

**Integration**:

- Changes integrate properly with existing codebase
- No breaking changes to other components
- Configuration updates are properly applied

**Knowledge Transfer**:

- Implementation approach is clearly documented
- Next agent has sufficient context to continue
- Any new patterns or techniques are explained

## Common Handoff Patterns

### Architecture → Implementation

- Technical design is complete and documented
- Implementation tasks are clearly defined
- Integration points and interfaces are specified
- Technology choices are explained and justified

### Implementation → Testing

- Core functionality is implemented and working
- Unit tests are in place for new code
- Integration points are functional
- Testing scenarios are documented

### Backend → Frontend

- APIs are implemented and documented
- Data models and contracts are finalized
- Authentication and authorization are working
- Example usage and integration patterns provided

### Development → Review

- All code is complete and committed
- Documentation is updated and accurate
- Test coverage meets requirements
- Performance characteristics are acceptable

## Validation Commands

Before handoff, run these validation steps:

```bash
# Code quality
npm run lint
npm run typecheck  # if using TypeScript

# Testing
npm test
npm run test:integration  # if available

# Build verification
npm run build  # if applicable

# Manual verification
node bin/asd --help  # verify CLI still works
# Test specific functionality you implemented
```

## Emergency Handoff

If you must hand off work before completion:

1. **Document Current State**: Clearly explain what is partially complete
2. **Identify Blockers**: Explain what prevented completion
3. **Provide Context**: Give next agent enough context to continue
4. **Mark Status**: Update task status to reflect partial completion
5. **Escalate if Needed**: Flag any issues that may require product owner input

Remember: A good handoff enables the next agent to be immediately productive without having to reverse-engineer your work.
