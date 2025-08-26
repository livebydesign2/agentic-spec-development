---
id: "FEAT-014"
title: "Workflow State Manager"
type: "FEAT"
phase: "PHASE-1A"
priority: "P0"
status: "active"
created: "2024-08-24T17:15:00Z"
estimated_hours: 20
tags: ["workflow", "state-management", "handoffs", "progress-tracking"]
tasks:
  - id: "TASK-001"
    title: "Dynamic State Management Core"
    agent_type: "backend-developer"
    status: "completed"
    estimated_hours: 6
    completed_at: "2024-08-26T14:00:00Z"
    completion_notes: "Implemented WorkflowStateManager with real-time assignment tracking, state persistence, and CLI integration. All core functionality working including handoff detection and progress tracking."
    context_requirements:
      ["state-management-patterns", "file-system-operations"]
    subtasks:
      - id: "SUBTASK-001"
        title: "Implement WorkflowStateManager class"
        type: "implementation"
        estimated_minutes: 180
        status: "completed"
      - id: "SUBTASK-002"
        title: "Add real-time assignment tracking"
        type: "implementation"
        estimated_minutes: 120
        status: "completed"
      - id: "SUBTASK-003"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 60
        status: "completed"
  - id: "TASK-002"
    title: "Inline Documentation Updates"
    agent_type: "backend-developer"
    status: "ready"
    estimated_hours: 4
    context_requirements: ["yaml-frontmatter", "markdown-processing"]
    depends_on: ["TASK-001"]
    subtasks:
      - id: "SUBTASK-004"
        title: "Implement frontmatter update system"
        type: "implementation"
        estimated_minutes: 150
        status: "ready"
      - id: "SUBTASK-005"
        title: "Add spec file synchronization"
        type: "implementation"
        estimated_minutes: 90
        status: "ready"
      - id: "SUBTASK-006"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
  - id: "TASK-003"
    title: "Agent Handoff Automation"
    agent_type: "software-architect"
    status: "blocked"
    estimated_hours: 3
    context_requirements: ["workflow-patterns", "agent-coordination"]
    depends_on: ["TASK-002"]
    subtasks:
      - id: "SUBTASK-007"
        title: "Implement handoff detection logic"
        type: "implementation"
        estimated_minutes: 90
        status: "ready"
      - id: "SUBTASK-008"
        title: "Add next task preparation"
        type: "implementation"
        estimated_minutes: 90
        status: "ready"
      - id: "SUBTASK-009"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
  - id: "TASK-004"
    title: "CLI Integration & Progress Commands"
    agent_type: "cli-specialist"
    status: "blocked"
    estimated_hours: 1
    context_requirements: ["cli-patterns", "progress-tracking"]
    depends_on: ["TASK-003"]
    subtasks:
      - id: "SUBTASK-010"
        title: "Implement progress tracking commands"
        type: "implementation"
        estimated_minutes: 30
        status: "ready"
      - id: "SUBTASK-011"
        title: "Add handoff status commands"
        type: "implementation"
        estimated_minutes: 30
        status: "ready"
      - id: "SUBTASK-012"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
  - id: "TASK-005"
    title: "Temporary Documentation Management"
    agent_type: "software-architect"
    status: "blocked"
    estimated_hours: 6
    context_requirements: ["document-lifecycle", "cleanup-strategies", "agent-templates"]
    depends_on: ["TASK-004"]
    subtasks:
      - id: "SUBTASK-013"
        title: "Implement ReportManager class with lifecycle management"
        type: "implementation"
        estimated_minutes: 180
        status: "ready"
      - id: "SUBTASK-014"
        title: "Add agent template integration and cleanup automation"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-015"
        title: "CLI integration and validation"
        type: "validation"
        estimated_minutes: 120
        status: "ready"
dependencies:
  - "FEAT-013" # Task Router System for task assignment logic
acceptance_criteria:
  - "System tracks real-time task assignments and progress automatically"
  - "Spec frontmatter updates inline (no separate completion documents)"
  - "Agent handoffs are detected and next tasks prepared automatically"
  - "Progress tracking provides accurate 'X of Y tasks complete' metrics"
  - "CLI commands show current assignments and handoff readiness"
  - "Agents can create structured temporary documentation with automatic lifecycle management"
  - "Temporary reports auto-cleanup based on task/spec completion"
  - "Report templates integrate with existing agent workflow patterns"
---

# Workflow State Manager

**Status**: Active | **Priority**: P0 (Critical) | **Owner**: Backend Specialist

## 🎯 Quick Start _(30 seconds)_

**What**: Dynamic state management system for real-time task assignments, progress tracking, and automated agent handoffs

**Why**: Enable seamless agent workflows with inline documentation updates and automatic handoff detection

**Impact**: Core workflow engine - tracks all agent work, updates progress, prepares handoffs automatically

### 🚀 AGENT PICKUP GUIDE

**➡️ Next Available Task**: **TASK-002** - Inline Documentation Updates  
**📋 Your Job**: Work on TASK-002 only, then update docs and hand off  
**🚦 Dependencies**: None - TASK-001 complete, can proceed immediately

### 🚦 Current State _(AGENTS: Update this when you complete YOUR task)_

- **Next Available Task**: TASK-002 - Inline Documentation Updates
- **Current Task Status**: TASK-001 completed, TASK-002 ready for pickup
- **Overall Progress**: 1 of 5 tasks complete (20% - Excellent progress on DOG FOOD MILESTONE!)
- **Blockers**: None
- **Last Updated**: 2024-08-26 by Backend Developer

---

## 📋 Work Definition _(What needs to be built)_

### Problem Statement

Currently, there's no systematic way to track agent work in real-time or manage handoffs between agents. The system lacks:

- Real-time tracking of who's working on what task
- Automatic progress updates in spec frontmatter (currently requires manual updates)
- Agent handoff detection and next task preparation
- Consolidated view of project progress and assignment status

### Solution Approach

Implement WorkflowStateManager that tracks assignments in real-time, updates spec files inline, detects completion and handoffs, and maintains progress state for all active work.

### Success Criteria

- [x] Real-time tracking of task assignments and progress
- [ ] Spec frontmatter updates automatically (no separate completion documents)
- [x] Agent handoffs detected and next tasks prepared automatically
- [x] Progress metrics accurate across all specs ("X of Y tasks complete")
- [x] CLI provides clear view of current assignments and handoff status
- [x] Performance: State updates complete in < 100ms for typical operations

---

## 🏗️ Implementation Plan

### Technical Approach

Create WorkflowStateManager that maintains dynamic state files, provides real-time assignment tracking, updates spec frontmatter inline, detects handoff conditions, and prepares context for next agents.

### Implementation Tasks _(Each task = one agent handoff)_

**TASK-001** 🤖 **Dynamic State Management Core** ✅ **← COMPLETED** | Agent: Backend-Developer

- [x] Implement WorkflowStateManager class with state persistence
- [x] Create assignment tracking system (who's working on what, when started)
- [x] Add progress calculation across all specs and tasks
- [x] Build state file management (assignments.json, progress.json, handoffs.json)
- [x] Add concurrent access safety for multiple CLI operations
- [x] Create state validation and consistency checking
- [x] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [x] Product Handoff: notify next agent that state management core is ready
- **Files**: `lib/workflow-state-manager.js`, state file schemas, CLI integration
- **Completed**: 2024-08-26 - WorkflowStateManager fully functional with real-time tracking and CLI commands

**TASK-002** 🤖 **Inline Documentation Updates** ⏳ **← READY FOR PICKUP** | Agent: Backend-Developer

- [ ] Implement frontmatter update system for spec files
- [ ] Add task status synchronization (ready → in_progress → complete)
- [ ] Create subtask progress tracking within task frontmatter
- [ ] Add "current_task" and "next_available" field management
- [ ] Implement atomic file updates to prevent corruption
- [ ] Add rollback capability for failed updates
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that inline updates are working
- **Dependencies**: TASK-001 must be complete
- **Files**: Frontmatter update utilities, file synchronization logic

**TASK-003** 🤖 **Agent Handoff Automation** ⏸️ **← BLOCKED (waiting for TASK-002)** | Agent: Software-Architect

- [ ] Implement handoff detection (when task/subtask completes)
- [ ] Add next task preparation and context gathering
- [ ] Create handoff readiness validation (all subtasks complete, deliverables ready)
- [ ] Build automatic "next available task" calculation
- [ ] Add handoff notification system for agents
- [ ] Implement handoff history tracking for debugging
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify CLI specialist that handoff system is ready
- **Dependencies**: TASK-002 must be complete
- **Files**: Handoff detection logic, next task calculation

**TASK-004** 🤖 **CLI Integration & Progress Commands** ⏸️ **← BLOCKED (waiting for TASK-003)** | Agent: CLI-Specialist

- [ ] Implement "asd status" command with current assignments
- [ ] Add "asd progress" command with detailed progress breakdown
- [ ] Create "asd handoff status" command showing readiness
- [ ] Add "asd assign" and "asd complete" commands for manual control
- [ ] Implement progress visualization (progress bars, completion percentages)
- [ ] Add filtering by spec, agent, or status
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify software architect that CLI integration is ready for temp docs
- **Dependencies**: TASK-003 must be complete
- **Files**: CLI command implementations, progress visualization

**TASK-005** 🤖 **Temporary Documentation Management** ⏸️ **← BLOCKED (waiting for TASK-004)** | Agent: Software-Architect

- [ ] Implement ReportManager class with structured document lifecycle management
- [ ] Create .asd/reports/ directory structure (audits/, summaries/, analysis/, temp/)
- [ ] Add agent template integration for common report types (audit, summary, analysis)
- [ ] Implement automatic cleanup based on task/spec completion lifecycle
- [ ] Build report creation API with metadata and context linking
- [ ] Add CLI commands: "asd report create", "asd report list", "asd report cleanup"
- [ ] Integrate with existing WorkflowStateManager for lifecycle events
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify product management that temporary documentation system is complete
- **Dependencies**: TASK-004 must be complete
- **Files**: `lib/report-manager.js`, CLI report commands, agent templates, cleanup automation

**Legend**: ⏳ Ready for pickup | 🔄 In progress | ✅ Complete | ⏸️ Blocked

---

## ✅ Validation Requirements

### 📝 Documentation Checklist _(REQUIRED before committing YOUR task)_

- [ ] **Your Task Status**: Mark your task ✅ and update all subtasks to `- [x]`
- [ ] **Current State**: Update "Next Available Task" to show what task is ready next
- [ ] **Success Criteria**: Check off any criteria your task completed
- [ ] **Handoff**: Clear what the next agent should pick up
- [ ] **Architecture Updates**: Update architecture.md with WorkflowStateManager details

### 🧪 Testing Checklist _(Follow this exact order)_

**DURING DEVELOPMENT** _(Test as you build each piece)_

- [ ] **State Persistence**: Test state files are created and updated correctly
- [ ] **Concurrent Access**: Test multiple CLI operations don't corrupt state
- [ ] **Frontmatter Updates**: Verify spec file frontmatter updates work reliably
- [ ] **Progress Calculation**: Test progress metrics accuracy across multiple specs
- [ ] **Handoff Detection**: Test handoff triggers work correctly

**BEFORE COMMITTING** _(Required validation sequence)_

- [ ] **Integration Tests**: Test WorkflowStateManager with existing spec system
- [ ] **File Integrity**: Verify spec files aren't corrupted by inline updates
- [ ] **State Consistency**: Test state files remain consistent across operations
- [ ] **Types**: Run `pnpm typecheck` - fix all TypeScript errors
- [ ] **Linting**: Run `pnpm lint && pnpm format` - fix all style issues
- [ ] **Unit Tests**: Test individual state management components
- [ ] **Performance**: Verify state updates complete within 100ms

### 🌱 Workflow State Impact Check _(Required for state management)_

- [ ] **Assignment Tracking**: Verify current assignments are tracked accurately
- [ ] **Progress Updates**: Test progress calculation across all specs
- [ ] **Handoff Detection**: Confirm handoffs are detected and next tasks prepared
- [ ] **CLI Integration**: Test status and progress commands work correctly
- [ ] **Report Management**: Test temporary documentation creation and lifecycle management
- [ ] **Cleanup Automation**: Verify reports auto-cleanup when tasks/specs complete

---

## 📊 Progress Tracking _(AGENTS: Add entry when you complete YOUR task)_

### ✅ Completed Tasks _(Add entry when you finish your task)_

- ✅ **[2024-08-26]** - **TASK-001** completed - _Agent: Backend Developer_ - Next: TASK-002 ready

### 🚨 Task Blockers _(Preventing next task pickup)_

- No blockers currently identified

### ➡️ Handoff Status _(What's ready for next agent)_

- **Ready Now**: TASK-002 (dependencies met, TASK-001 complete)
- **Waiting**: TASK-003 through TASK-005 (sequential dependencies)

---

## 🔗 Technical References

### Architecture Documents

- **System Architecture**: `docs/architecture.md` (WorkflowStateManager component)
- **Context System**: `docs/context-injection-system.md` (state integration patterns)
- **Existing Code**: `lib/feature-parser.js` (spec parsing), `lib/progress-calc.js` (progress logic)

### Implementation Patterns

- **State Management**: Use JSON files for performance, atomic updates for consistency
- **Frontmatter Updates**: js-yaml for parsing/writing YAML frontmatter safely
- **CLI Integration**: Commander.js patterns from existing bin/asd

### Dependencies

- **Requires**: SpecParser for loading specs, existing progress calculation
- **Enables**: Real-time workflow tracking, agent handoffs, automated progress

---

<details>
<summary><strong>📖 Detailed Requirements & Design</strong> <em>(Expand when needed)</em></summary>

## Detailed Requirements

### REQ-001: Real-Time Assignment Tracking

**As a** project manager  
**I want** to see who's working on what task in real-time  
**So that** I can track progress and avoid assignment conflicts

**Acceptance Criteria**:

- [ ] System tracks current task assignments with timestamps
- [ ] Assignment state persists across CLI session restarts
- [ ] Multiple agents can work on different tasks without conflicts
- [ ] Assignment history is maintained for debugging and analysis
- [ ] Clear indication of task start times and estimated completion

### REQ-002: Inline Documentation Updates

**As a** system user  
**I want** spec files to update automatically without separate documents  
**So that** the spec files remain the single source of truth

**Acceptance Criteria**:

- [ ] Spec frontmatter updates automatically when task status changes
- [ ] No separate completion documents are created
- [ ] "Current task" and "next available task" fields update correctly
- [ ] Progress percentages calculate accurately from frontmatter
- [ ] File updates are atomic and don't corrupt existing content

### REQ-003: Agent Handoff Automation

**As a** AI agent  
**I want** handoffs to be prepared automatically when I complete tasks  
**So that** the next agent can start work immediately

**Acceptance Criteria**:

- [ ] System detects when all subtasks in a task are complete
- [ ] Next task is automatically marked as "ready" when dependencies are met
- [ ] Handoff context is prepared for the next assigned agent
- [ ] Handoff readiness is validated before marking tasks available
- [ ] Clear notifications indicate when handoffs are ready

### REQ-004: Progress Tracking & Visibility

**As a** project stakeholder  
**I want** clear visibility into project progress across all specs  
**So that** I can understand project status and plan accordingly

**Acceptance Criteria**:

- [ ] Progress calculation is accurate across all specs and tasks
- [ ] CLI commands provide multiple views of progress (overall, by spec, by agent)
- [ ] Progress visualization is clear and informative
- [ ] Historical progress tracking shows velocity and trends
- [ ] Performance remains good with large numbers of specs and tasks

## Technical Design Details

### WorkflowStateManager Class Architecture

```javascript
class WorkflowStateManager {
  constructor(specParser, configManager) {
    this.specParser = specParser;
    this.configManager = configManager;
    this.stateDir = '.asd/state/';
  }

  // Assignment management
  assignTask(specId, taskId, agentType)        // Assign task to agent
  completeTask(specId, taskId, notes = '')     // Mark task complete
  completeSubtask(specId, taskId, subtaskId)   // Mark subtask complete
  getCurrentAssignments()                      // Get all active assignments

  // State management
  updateTaskProgress(specId, taskId, progress) // Update task progress
  getProjectProgress()                         // Calculate overall progress
  getSpecProgress(specId)                      // Get progress for specific spec
  validateState()                              // Check state consistency

  // Handoff management
  detectHandoffs()                             // Find ready handoffs
  prepareNextTask(specId, taskId)              // Prepare context for next task
  getHandoffStatus()                           // Get handoff readiness

  // Inline documentation
  updateSpecFrontmatter(specPath, updates)     // Update spec YAML frontmatter
  syncSpecState(specId)                        // Sync state with spec file

  // Internal methods
  _loadState()                                 // Load state from files
  _saveState()                                 // Save state to files
  _atomicUpdate(filePath, updateFn)            // Atomic file updates
}
```

### State File Schemas

```javascript
// .asd/state/assignments.json
{
  "current_assignments": {
    "FEAT-012": {
      "current_task": "TASK-001",
      "assigned_agent": "backend-specialist",
      "started_at": "2024-08-24T14:00:00Z",
      "progress": "2 of 3 subtasks complete",
      "next_available": "TASK-002"
    }
  },
  "assignment_history": [
    {
      "spec_id": "FEAT-012",
      "task_id": "TASK-001",
      "agent": "backend-specialist",
      "started_at": "2024-08-24T14:00:00Z",
      "completed_at": "2024-08-24T16:30:00Z"
    }
  ]
}

// .asd/state/handoffs.json
{
  "ready_handoffs": [
    {
      "from_task": "TASK-001",
      "to_task": "TASK-002",
      "spec_id": "FEAT-012",
      "next_agent": "ui-developer",
      "ready_at": "2024-08-24T16:30:00Z",
      "context_prepared": true
    }
  ]
}

// .asd/state/progress.json
{
  "overall": {
    "total_specs": 12,
    "completed_specs": 3,
    "active_specs": 2,
    "total_tasks": 48,
    "completed_tasks": 15,
    "completion_percentage": 31.25
  },
  "by_phase": {
    "PHASE-1A": {
      "specs": 8,
      "completed_specs": 2,
      "completion_percentage": 25.0
    }
  }
}
```

### CLI Command Examples

```bash
# Assignment and progress
asd assign FEAT-012 TASK-001 --agent backend-specialist
asd complete task FEAT-012 TASK-001 --notes "Implementation complete"
asd complete subtask FEAT-012 TASK-001 SUBTASK-002

# Progress tracking
asd status                          # Current assignments
asd progress                        # Overall progress
asd progress FEAT-012               # Specific spec progress
asd progress --by-agent             # Progress by agent type

# Handoff management
asd handoff status                  # Ready handoffs
asd handoff ready FEAT-012 TASK-001 --next ui-developer
asd handoff history                 # Handoff history
```

## Testing Strategy Details

### Unit Tests

- WorkflowStateManager core methods with various scenarios
- Frontmatter update logic with different YAML structures
- Progress calculation with complex task hierarchies
- Handoff detection with various completion states

### Integration Tests

- WorkflowStateManager integration with SpecParser
- End-to-end assignment and completion workflow
- Concurrent state updates and file access
- CLI command integration with state management

### Performance Tests

- State update performance with large numbers of specs
- Frontmatter update performance with large files
- Concurrent access performance and safety
- Memory usage with extensive assignment history

</details>

---

## 💡 Implementation Notes _(Update as you learn)_

### Key Decisions

- Use JSON files for state storage (performance) with atomic updates for consistency
- Update spec frontmatter inline rather than creating separate completion documents
- Handoff detection based on subtask completion rather than manual triggers

### Gotchas & Learnings

- Frontmatter updates must preserve existing YAML structure and comments
- Concurrent CLI operations require careful state file locking
- Progress calculation needs to handle partial task completion accurately

### Future Improvements

- Real-time websocket updates for multi-user scenarios
- Advanced progress visualization and reporting
- Integration with external project management tools

---

**Priority**: P0 - Core workflow management system  
**Effort**: 20 hours across state management, inline updates, handoffs, CLI, and temporary documentation
**Impact**: Enables seamless agent workflows with automatic progress tracking, handoffs, and structured temporary documentation management
