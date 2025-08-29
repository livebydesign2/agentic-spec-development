---
id: FEAT-026
title: Enhanced Task Automation Commands
type: FEAT
status: done
priority: P0
phase: PHASE-1B
estimated_hours: 8
tags: [cli, automation, task-management, commands]
created: 2025-08-29
updated: 2025-08-29
assignee: null
dependencies: []
blocking: []
related: []
---

# Enhanced Task Automation Commands

## **🎯 Quick Start** _(30 seconds)_

**Priority:** P0

**What**: Enhanced CLI commands (asd start-next, asd complete-current) that automate task assignment and completion workflows  
**Status**: Backlog | **Owner**: cli-specialist

### **🚀 AGENT PICKUP GUIDE**

**➡️ Next Available Task**: **TASK-001** - Build enhanced start-next command with auto-assignment  
**📋 Your Job**: Work on TASK-001 only, then update docs and hand off  
**🚦 Dependencies**: None - this is foundational for ADR-004 automation

### **Required Reading**

- docs/adr/ADR-004-automated-task-status-workflow.md
- docs/ai-context/agent-workflow.md
- docs/ai-context/implementation-rules.md
- docs/development/testing-workflow.md ← **MANDATORY: Testing workflow for AI agents**

### **🚦 Current State** _(AGENTS: Update this when you complete YOUR task)_

- **Next Available Task**: All tasks complete - FEAT-026 ready for product handoff
- **Current Task Status**: All tasks complete
- **Overall Progress**: 3 of 3 tasks complete
- **Blockers**: None
- **Last Updated**: 2025-08-28 by cli-specialist after completing all FEAT-026 tasks

---

## **🤖 Agent Workflow**

See: `docs/ai-context/agent-workflow.md`

**⚠️ IMPORTANT: Each agent works on ONE TASK, then hands off to next agent**

**When picking up a task (e.g., TASK-001):**

1. **🎯 Product Check** _(Product-manager subagent)_: Ensure spec exists, numbering is correct, priority is set, and spec is in proper lifecycle state (backlog → active)
2. **📊 Check Status**: What's the next available task? (look for ⏳ status)
3. **🔍 Gather Context**: Read the context files below for this specific task
4. **📋 Plan Work**: Use `todowrite` if this task has >3 subtasks
5. **⚡ Execute**: Complete ONLY your assigned task AND check off [x] subtasks

Closure: For every task, complete the Task Closure Checklist inside the task (Validate + User Visual Validation, Update & Commit with [x], Product Handoff).

### **📚 Context Priority Levels** _(Prevent context window overload)_

#### **🔥 CRITICAL - Always Read First** _(Required for any task)_

- `docs/adr/ADR-004-automated-task-status-workflow.md` ← **THE AUTOMATION REQUIREMENTS**
- `docs/ai-context/implementation-rules.md` ← **THE CODE STANDARDS & PATTERNS**

#### **📋 TASK-SPECIFIC - Read for Your Task** _(Only what you're working on)_

**TASK-001 (Enhanced start-next command)**:

- `lib/task-router.js` ← **Existing task routing system**
- `lib/workflow-state-manager.js` ← **Current state management**
- `bin/asd` ← **Main CLI entry point**

**TASK-002 (Enhanced complete-current command)**:

- `lib/handoff-automation-engine.js` ← **Handoff automation system**
- `lib/workflow-state-manager.js` ← **State management for completion**
- Pre-existing automation command patterns

**TASK-003 (Integration and validation)**:

- `test/` ← **Testing patterns**
- Integration test files for workflow commands

#### **📖 REFERENCE - Read When Stuck** _(Background/debugging only)_

- `docs/ai-context/current-state.md` ← **System context**
- `docs/development/development-guide.md` ← **Development patterns**

---

## **📋 Work Definition** _(What needs to be built)_

## **Description**

Implement enhanced CLI commands that automate the manual task assignment and completion workflows, reducing cognitive load by 80% while maintaining quality and audit trails. This is the foundation component for ADR-004's automated task status workflow system.

### **Problem Statement**

Current ASD workflows require 40+ manual CLI commands for task management, leading to high failure rates due to human error and cognitive load. The ideal workflow should allow agents to use single commands to start tasks with auto-assignment/validation and complete work with automated status updates, testing, and git commits.

### **Solution Approach**

Build enhanced CLI commands (`asd start-next`, `asd complete-current`) that integrate with existing TaskRouter and WorkflowStateManager systems to provide intelligent automation while preserving human control and comprehensive audit trails.

### **Success Criteria**

- [x] `asd start-next` command finds, validates, and assigns next recommended task automatically
- [x] `asd complete-current` command handles status updates, validation, testing, and git workflow
- [x] Commands integrate seamlessly with existing ASD infrastructure
- [x] Comprehensive audit logging for all automated actions
- [x] Manual override capabilities preserved
- [x] Command response times under 5 seconds

---

## **🏗️ Implementation Plan**

### **Technical Approach**

Extend existing Commander.js CLI structure by building new automated commands that leverage TaskRouter for intelligent task selection, WorkflowStateManager for state synchronization, and integrate with git workflows for comprehensive completion automation.

### **Implementation Tasks** _(Each task = one agent handoff)_

**TASK-001** 🤖 **Enhanced start-next Command** ✅ **COMPLETE** | Agent: cli-specialist

- [x] Build `asd start-next --agent [type]` command using Commander.js
- [x] Integrate with TaskRouter.getNextTask() for intelligent task recommendation
- [x] Add AssignmentValidator to validate agent capability and assignment constraints
- [x] Implement automatic status update: ready → in_progress in YAML and JSON
- [x] Add dependency block checking and resolution
- [x] Include comprehensive error handling with actionable error messages
- [x] Add audit logging for all automated actions
- [x] Create unit tests for command functionality
- [x] Validate (tests, lint, functionality) per "Validation Requirements"
- [x] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [x] Product Handoff: notify Product-manager subagent to move lifecycle and update roadmap
- **Files**: `bin/asd` (add command), `lib/commands/start-next.js` (new), `lib/automation/assignment-validator.js` (new)
- **Agent Instructions**: Build the start-next command as single atomic operation leveraging existing TaskRouter infrastructure
- **Completion Notes**: Successfully implemented enhanced start-next command with comprehensive validation, audit logging, and error handling. Command integrates with existing TaskRouter and WorkflowStateManager systems. All major features implemented including dry-run mode, critical task confirmation, workload balancing, and actionable error messages.

**TASK-002** 🤖 **Enhanced complete-current Command** ✅ **COMPLETE** | Agent: cli-specialist

- [x] Build `asd complete-current` command with optional specific task targeting
- [x] Implement automatic status update: in_progress → complete across all systems
- [x] Add git integration for file tracking and commit automation
- [x] Integrate automatic `npm run lint` with error resolution attempts
- [x] Add test suite execution with failure reporting
- [x] Implement properly formatted commit message generation
- [x] Add pre-commit hook failure handling with retry logic
- [x] Integrate with HandoffAutomationEngine for dependent task triggering
- [x] Add comprehensive audit logging
- [x] Create unit tests for command functionality
- [x] Validate (tests, lint, functionality) per "Validation Requirements"
- [x] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [x] Product Handoff: notify Product-manager subagent to move lifecycle and update roadmap
- **Dependencies**: TASK-001 must be complete for command pattern consistency
- **Files**: `bin/asd` (add command), `lib/commands/complete-current.js` (new)
- **Completion Notes**: Successfully implemented enhanced complete-current command with comprehensive automation workflow including git integration, linting with auto-fix, test execution, commit automation with retry logic, and handoff automation. All features implemented including file tracking, pre-commit hook handling, and comprehensive audit logging.

**TASK-003** 🤖 **Integration Testing and Documentation** ✅ **COMPLETE** | Agent: cli-specialist

- [x] Create comprehensive integration tests for both commands
- [x] Test end-to-end workflow: start-next → work → complete-current
- [x] Test error scenarios and edge cases (blocked tasks, validation failures, git errors)
- [x] Test integration with existing WorkflowStateManager and TaskRouter
- [x] Validate audit logging completeness and accuracy
- [x] Test manual override capabilities work correctly
- [x] Performance testing: ensure <5 second response times
- [x] Create documentation for new commands in CLI help system
- [x] Validate (tests, lint, functionality) per "Validation Requirements"
- [x] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [x] Product Handoff: notify Product-manager subagent to move lifecycle and update roadmap
- **Dependencies**: TASK-002 must be complete
- **Files**: `test/commands/start-next.test.js` (enhanced), `test/commands/complete-current.test.js` (new), `test/integration/automation-workflow.test.js` (enhanced)
- **Completion Notes**: Created comprehensive integration tests covering end-to-end automation workflows, error handling, performance validation, manual overrides, and system integration. Added enhanced test scenarios for concurrent execution, git workflow integration, and comprehensive error context validation.

**Legend**: ⏳ Ready for pickup | 🔄 In progress | ✅ Complete | ⏸️ Blocked

---

## **✅ Validation Requirements**

### **📝 Documentation Checklist** _(REQUIRED before committing YOUR task)_

- [ ] **Your Task Status**: Mark your task ✅ and update all subtasks to `- [x]`
- [ ] **Current State**: Update "Next Available Task" to show what task is ready next
- [ ] **Success Criteria**: Check off any criteria your task completed
- [ ] **Handoff**: Clear what the next agent should pick up
- [ ] **Issues Found**: If you discovered bugs/issues outside your scope, confirm you created bug tickets in backlog folder and mentioned them in your completion notes

### **🧪 Testing Checklist** _(Follow this exact order)_

**DURING DEVELOPMENT** _(Test as you build each piece)_

- [ ] **Unit Logic**: Test individual command functions work in isolation
- [ ] **Integration**: Test commands work with existing TaskRouter and WorkflowStateManager
- [ ] **Error Handling**: Test error scenarios (blocked tasks, validation failures, git errors)

**BEFORE COMMITTING** _(Required validation sequence)_

- [ ] **Tests**: Run test suite - ensure all tests pass
- [ ] **Linting**: Run linter - fix all style issues
- [ ] **Functionality**: Manual test of commands work as expected
- [ ] **Integration**: Test commands work with existing ASD functionality
- [ ] **Documentation**: Update CLI help documentation

---

## **📊 Progress Tracking** _(AGENTS: Add entry when you complete YOUR task)_

### **✅ Completed Tasks** _(Add entry when you finish your task)_

- **TASK-001** ✅ Enhanced start-next Command - Completed 2025-08-28 by cli-specialist

  - Built comprehensive automation command with intelligent task routing
  - Integrated with TaskRouter and WorkflowStateManager systems
  - Added AssignmentValidator with comprehensive constraint validation
  - Implemented audit logging and actionable error handling
  - Added dry-run mode and critical task confirmation
  - Created unit tests and CLI integration

- **TASK-002** ✅ Enhanced complete-current Command - Completed 2025-08-28 by cli-specialist

  - Built comprehensive task completion automation with full workflow integration
  - Implemented git integration with file tracking and commit automation
  - Added linting validation with automatic fix attempts and retry logic
  - Integrated test suite execution with comprehensive failure reporting
  - Added pre-commit hook handling with intelligent retry mechanisms
  - Integrated with HandoffAutomationEngine for seamless dependent task triggering
  - Implemented comprehensive audit logging for all automated operations
  - Created extensive unit tests with comprehensive mocking and edge case coverage

- **TASK-003** ✅ Integration Testing and Documentation - Completed 2025-08-28 by cli-specialist
  - Created comprehensive integration tests for complete automation workflow
  - Implemented end-to-end testing: start-next → work → complete-current
  - Added extensive error scenario and edge case testing
  - Validated integration with existing WorkflowStateManager and TaskRouter systems
  - Verified audit logging completeness and accuracy across all operations
  - Tested manual override capabilities and command isolation
  - Added performance validation ensuring <5 second response time targets
  - Enhanced test coverage with concurrent execution and git workflow testing

### **🚨 Task Blockers** _(Preventing next task pickup)_

- _No blockers - All tasks complete_

### **➡️ Handoff Status** _(What's ready for next agent)_

- **All Complete**: FEAT-026 automation suite fully implemented and tested
- **Ready for**: Product-manager handoff and lifecycle management
- **Enables**: FEAT-027 (State Sync), FEAT-029 (Git Automation) foundations

---

## **🔗 Technical References**

### **Key Files**

- **Main Implementation**: `lib/commands/start-next.js`, `lib/commands/complete-current.js`
- **Integration**: `lib/automation/assignment-validator.js`, `lib/automation/git-integration.js`
- **CLI Entry**: `bin/asd`
- **Tests**: `test/commands/*.test.js`, `test/integration/automation-workflow.test.js`

### **Dependencies**

- **Requires**: TaskRouter, WorkflowStateManager, HandoffAutomationEngine (existing)
- **Enables**: FEAT-027 (State Synchronization), FEAT-028 (Context Injection), FEAT-029 (Git Automation)

---

<details>
<summary><strong>📖 Detailed Requirements & Design</strong> <em>(Expand when needed)</em></summary>

## **Detailed Requirements**

### **REQ-001: Enhanced Task Start - asd start-next Command**

**As a** development agent  
**I want** to use a single command to get and start my next recommended task  
**So that** I can eliminate 15+ manual CLI operations and reduce assignment errors

**Acceptance Criteria**:

- [ ] Command finds next recommended task using TaskRouter intelligence
- [ ] Validates agent capability against task requirements
- [ ] Automatically updates task status: ready → in_progress in both YAML and JSON
- [ ] Checks and resolves dependency blocks
- [ ] Provides actionable error messages for validation failures
- [ ] Logs all actions to audit trail
- [ ] Responds in under 5 seconds

### **REQ-002: Automated Task Completion - asd complete-current Command**

**As a** development agent  
**I want** to use a single command to complete my current task with full automation  
**So that** I can eliminate 25+ manual operations including testing, linting, and git workflows

**Acceptance Criteria**:

- [ ] Automatically updates status: in_progress → complete across all systems
- [ ] Executes `npm run lint` with automatic fix attempts
- [ ] Runs test suites with clear failure reporting
- [ ] Tracks modified files during work session
- [ ] Creates properly formatted commit messages
- [ ] Handles pre-commit hook failures with retry logic
- [ ] Triggers HandoffAutomationEngine for dependent tasks
- [ ] Maintains comprehensive audit logging

### **REQ-003: Integration and Safety**

**As a** system administrator  
**I want** enhanced commands to integrate safely with existing infrastructure  
**So that** automation doesn't break existing workflows or lose data

**Acceptance Criteria**:

- [ ] Seamless integration with existing WorkflowStateManager
- [ ] Preserves manual override capabilities at all times
- [ ] Comprehensive rollback capabilities for failed operations
- [ ] State consistency validation across YAML, JSON, and git
- [ ] No breaking changes to existing CLI interface

## **Technical Design Details**

### **Architecture Overview**

```
asd start-next --agent cli-specialist
    ↓
[Assignment Validator] → [Task Router] → [State Update] → [Audit Log]
    ↓
Task assigned and ready for work

asd complete-current
    ↓
[File Tracker] → [Linting] → [Testing] → [Git Commit] → [Handoff Trigger]
    ↓
Task completed and dependent tasks unblocked
```

### **Key Technical Principles**

1. **Atomic Operations**: Each command succeeds or fails completely - no partial states
2. **Audit First**: Every automated action logged before execution
3. **Fail Safe**: Preserve manual override at all times, graceful degradation
4. **Performance**: <5 second response times through efficient existing system integration

### **Implementation Notes**

- Leverage existing TaskRouter intelligence rather than rebuilding recommendation logic
- Integrate with existing WorkflowStateManager for state consistency
- Use chokidar for file system monitoring during work sessions
- Implement retry logic for git operations with exponential backoff
- Create template commit message patterns: "Complete {SPEC-ID} {TASK-ID}: {TASK-TITLE}"

## **Testing Strategy Details**

### **Unit Tests**

- [ ] Individual command functions work correctly in isolation
- [ ] Validation logic handles edge cases (invalid agents, blocked tasks)
- [ ] Error handling provides actionable messages
- [ ] Audit logging captures all required information

### **Integration Tests**

- [ ] Commands integrate properly with TaskRouter and WorkflowStateManager
- [ ] State synchronization works across YAML, JSON, and git
- [ ] HandoffAutomationEngine triggers correctly on task completion
- [ ] Manual override capabilities preserve user control

### **User Acceptance Tests**

- [ ] End-to-end workflow: start-next → complete-current reduces manual operations by 80%
- [ ] Commands respond under 5 seconds in normal conditions
- [ ] Error scenarios provide clear guidance for resolution
- [ ] Audit trails enable full workflow reconstruction

</details>

---

## **💡 Implementation Notes** _(Update as you learn)_

### **Key Decisions**

- **Integration Strategy**: Leverage existing TaskRouter and WorkflowStateManager rather than rebuilding - ensures consistency and reduces complexity
- **Command Pattern**: Use Commander.js extension pattern to maintain CLI consistency with existing commands

### **Gotchas & Learnings**

- ADR-004 requires comprehensive audit logging - ensure all automated actions are logged before execution
- State synchronization must be atomic - YAML and JSON updates must succeed or fail together
- Git integration needs retry logic - pre-commit hooks can fail temporarily and need intelligent retry

### **Future Improvements**

- Confidence scoring for automation decisions (Phase 4 of ADR-004)
- Manual review queues for low-confidence actions
- Performance monitoring and optimization
- Context injection integration (FEAT-028)
