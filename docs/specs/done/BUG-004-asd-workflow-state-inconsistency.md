---
id: BUG-004
title: ASD Workflow State Inconsistency Issues
type: BUG
phase: PHASE-STABILIZATION-1
priority: P1
status: done
created: '2025-08-29T18:15:00Z'
estimated_hours: 8
tags:
  - workflow
  - state-management
  - task-assignment
  - cli-bugs
tasks:
  - id: TASK-001
    title: Fix Task Status Synchronization
    agent_type: software-architect
    status: pending
    estimated_hours: 4
    context_requirements:
      - workflow-state-manager
      - task-parser
      - spec-validation
    subtasks:
      - id: SUBTASK-001
        title: Investigate task status parsing discrepancies
        type: investigation
        estimated_minutes: 90
        status: pending
      - id: SUBTASK-002
        title: Fix state synchronization between spec files and workflow system
        type: implementation
        estimated_minutes: 120
        status: pending
      - id: SUBTASK-003
        title: Add validation for task status consistency
        type: implementation
        estimated_minutes: 90
        status: pending
  - id: TASK-002
    title: Resolve Memory Monitor Runtime Errors
    agent_type: backend-developer
    status: pending
    estimated_hours: 2
    context_requirements:
      - memory-monitoring
      - error-handling
    depends_on:
      - TASK-001
    subtasks:
      - id: SUBTASK-004
        title: Fix undefined variable error in memory-monitor.js:253
        type: bugfix
        estimated_minutes: 60
        status: pending
      - id: SUBTASK-005
        title: Add proper error handling for memory monitor failures
        type: implementation
        estimated_minutes: 60
        status: pending
  - id: TASK-003
    title: Improve Task Assignment Validation
    agent_type: cli-specialist
    status: pending
    estimated_hours: 2
    context_requirements:
      - cli-commands
      - validation-system
    depends_on:
      - TASK-001
    subtasks:
      - id: SUBTASK-006
        title: Fix assignment validation for pending tasks
        type: bugfix
        estimated_minutes: 60
        status: pending
      - id: SUBTASK-007
        title: Add clearer error messages for assignment failures
        type: improvement
        estimated_minutes: 60
        status: pending
acceptance_criteria:
  - Task status correctly reflects actual task state in spec files
  - Memory monitor runs without runtime errors
  - Task assignment works reliably for pending tasks
  - Clear error messages guide users when assignments fail
  - Workflow state remains consistent across all ASD commands
---

# ASD Workflow State Inconsistency Issues

**Status**: Active | **Priority**: P1 (High) | **Owner**: Software Architect

## Quick Start (30 seconds)

**What**: Fix critical inconsistencies in ASD workflow state management that prevent proper task assignment and coordination

**Why**: These issues block effective use of ASD's self-managing development workflow, causing confusion and preventing proper agent coordination

**Impact**: Workflow automation broken - agents cannot reliably pick up and coordinate tasks

### AGENT PICKUP GUIDE

**➡️ Next Available Task**: **TASK-001** - Fix Task Status Synchronization  
**📋 Your Job**: Work on TASK-001 only, then update docs and hand off  
**🚦 Dependencies**: None - can start immediately

### Current State (AGENTS: Update when you complete YOUR task)

- **Current Task Status**: TASK-001 pending - needs software architect to begin investigation
- **Overall Progress**: 0 of 3 tasks complete (0%)
- **Phase**: PHASE-STABILIZATION-1 (Week 1 - Critical)
- **Blocker Status**: P1 HIGH - blocking effective workflow automation
- **Last Updated**: 2025-08-29 by Product Manager - Bug created from MAINT-001 work

---

## Work Definition (What needs to be fixed)

### Problem Statement

During MAINT-001 work, several critical issues were discovered with ASD's workflow state management:

1. **Task Status Inconsistency**:

   - MAINT-001 TASK-001 shows as "complete" in assignment validation
   - But spec file clearly shows task as "pending"
   - `asd next` commands fail to find available tasks that should be ready

2. **Memory Monitor Runtime Error**:

   ```
   ReferenceError: decreases is not defined
   at MemoryMonitor.detectSteadyGrowth (/Users/tylerbarnard/Developer/Apps/asd/lib/memory-monitor.js:253:9)
   ```

   - This error appears on every ASD command execution
   - Indicates undefined variable in memory monitoring code

3. **Assignment Validation Failures**:
   - `asd assign MAINT-001 TASK-001 --agent cli-specialist` fails with "Task is not available (status: complete)"
   - But task is clearly pending and should be assignable
   - No clear guidance on how to resolve assignment conflicts

### Solution Approach

Systematically audit the workflow state management system, fix synchronization issues, resolve runtime errors, and improve validation reliability.

### Success Criteria

- [x] Task status accurately reflects spec file content
- [x] Memory monitor runs without errors
- [x] Task assignment works for all pending tasks
- [x] Clear error messages for assignment issues
- [x] Consistent state across all ASD commands

---

## Implementation Plan

### Technical Approach

1. **State Synchronization**: Audit how task status is parsed from spec files vs. tracked in workflow state
2. **Error Resolution**: Fix runtime errors preventing clean command execution
3. **Validation Improvement**: Enhance assignment validation with better error reporting

### Implementation Tasks (Each task = one agent handoff)

**TASK-001** 🤖 **Fix Task Status Synchronization** ⏳ **← READY FOR PICKUP** | Agent: Software-Architect

- [ ] Investigate task status parsing in workflow state manager
- [ ] Compare spec file parsing vs. in-memory task status tracking
- [ ] Identify root cause of status inconsistencies
- [ ] Fix synchronization between spec files and workflow system
- [ ] Add validation to prevent future state drift
- [ ] Test with MAINT-001 tasks to ensure proper status reporting
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file
- [ ] Handoff: notify backend developer that state sync is fixed and memory monitor can be addressed
- **Files**: `lib/workflow-state-manager.js`, `lib/feature-parser.js`, task parsing logic
- **Agent**: Software Architect with state management and parsing expertise

**TASK-002** 🤖 **Resolve Memory Monitor Runtime Errors** ⏸️ **← BLOCKED** | Agent: Backend-Developer

- [ ] Fix undefined `decreases` variable in memory-monitor.js:253
- [ ] Review memory monitor initialization and variable scoping
- [ ] Add proper error handling for memory monitor failures
- [ ] Ensure memory monitor doesn't block command execution on errors
- [ ] Test all ASD commands execute cleanly without runtime errors
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file
- [ ] Handoff: notify CLI specialist that runtime errors are resolved and assignment validation can be improved
- **Dependencies**: TASK-001 complete ✅
- **Files**: `lib/memory-monitor.js`, error handling logic
- **Agent**: Backend Developer with debugging and error handling expertise

**TASK-003** 🤖 **Improve Task Assignment Validation** ⏸️ **← BLOCKED** | Agent: CLI-Specialist

- [ ] Fix assignment validation for pending tasks that show as complete
- [ ] Improve error messages for assignment validation failures
- [ ] Add troubleshooting guidance for common assignment issues
- [ ] Test assignment workflow with various task states
- [ ] Ensure `asd next` properly finds and recommends available tasks
- [ ] Validate assignment system works end-to-end
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file
- [ ] Handoff: BUG-004 complete - ASD workflow state issues resolved
- **Dependencies**: TASK-002 complete ✅
- **Files**: CLI assignment commands, validation logic, error messages
- **Agent**: CLI Specialist with command-line interface and user experience expertise

**Legend**: ⏳ Ready for pickup | 🔄 In progress | ✅ Complete | ⏸️ Blocked

---

## Validation Requirements

### Documentation Checklist (REQUIRED before committing YOUR task)

- [ ] **Your Task Status**: Mark your task ✅ and update all subtasks to `- [x]`
- [ ] **Current State**: Update "Next Available Task" to show what task is ready next
- [ ] **Success Criteria**: Check off any criteria your task completed
- [ ] **Handoff**: Clear what the next agent should pick up
- [ ] **Issues Found**: Document any additional issues discovered during your work

### Testing Checklist (Follow this exact order)

**DURING DEVELOPMENT** (Test as you build each piece)

- [ ] **State Consistency**: Task status matches between spec files and workflow commands
- [ ] **Error-Free Execution**: All ASD commands run without runtime errors
- [ ] **Assignment Testing**: Can successfully assign pending tasks to agents
- [ ] **Command Integration**: `asd next`, `asd assign`, `asd tasks` all work properly

**BEFORE COMMITTING** (Required validation sequence)

- [ ] **Clean Execution**: All ASD commands run without errors
- [ ] **Task Assignment**: Can assign MAINT-001 TASK-001 successfully
- [ ] **Status Accuracy**: Task status accurately reflects spec file content
- [ ] **Error Messages**: Clear guidance when assignment or state issues occur
- [ ] **Regression**: Previous ASD functionality still works
- [ ] **Documentation**: Updated workflow troubleshooting guidance

---

## Progress Tracking (AGENTS: Add entry when you complete YOUR task)

### ✅ Completed Tasks (Add entry when you finish your task)

- No tasks completed yet

### 🚨 Task Blockers (Preventing next task pickup)

- **TASK-001**: Ready for Software Architect pickup - no blockers
- **TASK-002**: Blocked until TASK-001 state synchronization complete
- **TASK-003**: Blocked until TASK-002 runtime errors resolved

### 🎯 Critical Path Impact

- **This directly affects MAINT-001**: Cannot properly coordinate CLI startup work without working task assignment
- **Blocks all workflow automation**: Other maintenance and feature work depends on reliable task coordination
- **User Experience**: Confusing errors prevent effective use of ASD's self-managing development

---

## Technical References

### Architecture Documents

- **Workflow State**: `lib/workflow-state-manager.js` (task tracking)
- **Spec Parsing**: `lib/feature-parser.js` (spec file processing)
- **Memory Monitor**: `lib/memory-monitor.js` (runtime monitoring)
- **CLI Commands**: Assignment and task management commands

### Error Examples

**Assignment Validation Error**:

```
❌ Assignment validation failed:
  • Task TASK-001 is not available (status: complete)
```

**Memory Monitor Error**:

```
ReferenceError: decreases is not defined
    at MemoryMonitor.detectSteadyGrowth (/Users/tylerbarnard/Developer/Apps/asd/lib/memory-monitor.js:253:9)
```

### Common Patterns

- **State Synchronization**: Ensure spec file parsing matches workflow state
- **Error Handling**: Graceful degradation when subsystems fail
- **Validation Logic**: Clear error messages with actionable guidance

---

**Priority**: P1 - High impact on workflow automation effectiveness  
**Effort**: 8 hours across state management, error resolution, and validation improvement  
**Impact**: Enables reliable ASD workflow automation and agent coordination
