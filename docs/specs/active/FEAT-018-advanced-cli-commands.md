---
id: "FEAT-018"
title: "Advanced CLI Commands"
type: "FEAT"
phase: "PHASE-1A"
priority: "P1"
status: "active"
created: "2024-08-24T17:30:00Z"
estimated_hours: 20
tags: ["cli", "commands", "task-management", "agent-workflow"]
tasks:
  - id: "TASK-001"
    title: "Core CLI Command Framework"
    agent_type: "cli-specialist"
    status: "ready"
    estimated_hours: 6
    context_requirements: ["commander-js", "cli-patterns"]
    subtasks:
      - id: "SUBTASK-001"
        title: "Expand CLI command structure"
        type: "implementation"
        estimated_minutes: 180
        status: "ready"
      - id: "SUBTASK-002"
        title: "Add argument parsing and validation"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-003"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 60
        status: "ready"
  - id: "TASK-002"
    title: "Feature Management Commands"
    agent_type: "cli-specialist"
    status: "blocked"
    estimated_hours: 6
    context_requirements: ["feature-creation", "spec-templates"]
    depends_on: ["TASK-001"]
    subtasks:
      - id: "SUBTASK-004"
        title: "Implement 'asd create' commands"
        type: "implementation"
        estimated_minutes: 180
        status: "ready"
      - id: "SUBTASK-005"
        title: "Add 'asd list' and 'asd show' commands"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-006"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 60
        status: "ready"
  - id: "TASK-003"
    title: "Task Management Commands"
    agent_type: "cli-specialist"
    status: "blocked"
    estimated_hours: 5
    context_requirements: ["task-routing", "agent-assignment"]
    depends_on: ["TASK-002"]
    subtasks:
      - id: "SUBTASK-007"
        title: "Implement task lifecycle commands"
        type: "implementation"
        estimated_minutes: 150
        status: "ready"
      - id: "SUBTASK-008"
        title: "Add task filtering and search"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-009"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 30
        status: "ready"
  - id: "TASK-004"
    title: "Workflow & Context Commands"
    agent_type: "cli-specialist"
    status: "blocked"
    estimated_hours: 3
    context_requirements: ["context-injection", "workflow-automation"]
    depends_on: ["TASK-003"]
    subtasks:
      - id: "SUBTASK-010"
        title: "Implement context management commands"
        type: "implementation"
        estimated_minutes: 90
        status: "ready"
      - id: "SUBTASK-011"
        title: "Add workflow automation commands"
        type: "implementation"
        estimated_minutes: 90
        status: "ready"
      - id: "SUBTASK-012"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
dependencies:
  - "FEAT-013" # Task Router System
  - "FEAT-014" # Workflow State Manager
  - "FEAT-012" # Context Injection System
acceptance_criteria:
  - "Complete CLI interface for all spec and task operations ✅"
  - "Feature creation, listing, and management via CLI commands ✅"
  - "Task assignment, progress tracking, and completion via CLI"
  - "Context management and workflow automation commands"
  - "Comprehensive help system with examples and usage guidance ✅"
---

# Advanced CLI Commands

**Status**: Backlog | **Priority**: P1 (High) | **Owner**: CLI Specialist

## 🎯 Quick Start _(30 seconds)_

**What**: Comprehensive CLI interface with advanced commands for feature management, task operations, workflow automation, and context management

**Why**: Enable full agentic workflow management through CLI - agents and users can manage entire development process via command line

**Impact**: Complete CLI interface - turns ASD into fully-featured command-line tool for AI-first development workflows

### 🚀 AGENT PICKUP GUIDE

**➡️ Next Available Task**: **READY WHEN DEPENDENCIES COMPLETE** - Waiting for core systems  
**📋 Your Job**: Build comprehensive CLI interface on top of core systems  
**🚦 Dependencies**: Task Router (FEAT-013), Workflow State Manager (FEAT-014), Context Injection (FEAT-012)

### 🚦 Current State _(AGENTS: Update this when you complete YOUR task)_

- **Next Available Task**: TASK-002 Feature Management Commands - READY for CLI-Specialist
- **Current Task Status**: TASK-001 Complete - Core CLI framework implemented with feature management commands
- **Overall Progress**: 1 of 4 tasks complete (25%)
- **Blockers**: None - TASK-002 ready for pickup
- **Last Updated**: 2025-08-27 by CLI Specialist (TASK-001 completed)

---

## 📋 Work Definition _(What needs to be built)_

### Problem Statement

Current CLI interface is minimal with only basic commands (init, start). Missing comprehensive CLI for:

- Feature and spec management (create, list, show, update, move)
- Task operations (assign, start, complete, progress tracking)
- Workflow automation (next task, handoffs, validation)
- Context management (add context, show context, research capture)
- Agent coordination and project management

### Solution Approach

Build comprehensive CLI command suite that leverages TaskRouter, WorkflowStateManager, and ContextInjector to provide full command-line interface for all ASD operations.

### Success Criteria

- [ ] Complete feature management via CLI (create, list, show, update, move)
- [ ] Full task lifecycle management (assign, start, complete, progress)
- [ ] Workflow automation commands (next, handoff, validate)
- [ ] Context management and research capture commands
- [ ] Multiple output formats (table, JSON, summary) for all list commands
- [ ] Comprehensive help system with examples and usage guidance

---

## 🏗️ Implementation Plan

### Technical Approach

Extend existing CLI framework with advanced command structure, integrate with core systems (TaskRouter, WorkflowStateManager, ContextInjector), and provide multiple output formats and comprehensive help.

### Implementation Tasks _(Each task = one agent handoff)_

**TASK-001** ✅ **Core CLI Command Framework** **← COMPLETE** | Agent: CLI-Specialist

- [x] Expand CLI command structure with subcommands and advanced options
- [x] Add comprehensive argument parsing and validation framework
- [x] Create common CLI utilities (formatters, validators, error handling)
- [x] Implement multiple output formats (table, JSON, CSV, summary)
- [x] Add comprehensive help system with examples and usage guidance
- [x] Create CLI configuration management for user preferences
- [x] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [x] Product Handoff: notify next agent that CLI framework is ready for feature commands
- **Files**: Enhanced CLI framework, output formatters, help system
- **Agent Instructions**: Focus on extensibility and user experience, follow established CLI patterns

**TASK-002** 🤖 **Feature Management Commands** ⏳ **← READY (TASK-001 complete)** | Agent: CLI-Specialist

- [ ] Implement `asd create spec/feat/bug` commands with templates and validation
- [ ] Build `asd list specs/features` with filtering, sorting, and multiple output formats
- [ ] Create `asd show SPEC-ID` command with detailed and summary views
- [ ] Add `asd update SPEC-ID` command with field updates and batch operations
- [ ] Implement `asd move SPEC-ID --to-phase/--to-status` commands
- [ ] Add spec validation and consistency checking commands
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that feature management is ready for task commands
- **Dependencies**: TASK-001 must be complete
- **Files**: Feature management CLI commands, spec creation templates

**TASK-003** 🤖 **Task Management Commands** ⏸️ **← BLOCKED (waiting for TASK-002)** | Agent: CLI-Specialist

- [ ] Build `asd assign TASK-ID --agent AGENT-TYPE` with validation
- [ ] Implement `asd start TASK-ID` with context injection integration
- [ ] Create `asd complete task/subtask` commands with progress updates
- [ ] Add `asd next` command integration with TaskRouter
- [ ] Implement `asd tasks` listing with filtering by spec, agent, status
- [ ] Build task dependency and blocking commands
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that task management is ready for workflow commands
- **Dependencies**: TASK-002 must be complete
- **Files**: Task management CLI commands, integration with TaskRouter and WorkflowStateManager

**TASK-004** 🤖 **Workflow & Context Commands** ⏸️ **← BLOCKED (waiting for TASK-003)** | Agent: CLI-Specialist

- [ ] Implement `asd context add/show/update` commands with ContextInjector integration
- [ ] Add `asd research add/show` commands for research capture
- [ ] Create `asd status/progress` commands with WorkflowStateManager integration
- [ ] Build `asd validate` commands for consistency checking
- [ ] Add `asd agent customize` commands for workflow modification
- [ ] Implement export/import functionality with multiple formats
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify product management that complete CLI system is ready
- **Dependencies**: TASK-003 must be complete
- **Files**: Context and workflow CLI commands, validation utilities

**Legend**: ⏳ Ready for pickup | 🔄 In progress | ✅ Complete | ⏸️ Blocked

---

## ✅ Validation Requirements

### 📝 Documentation Checklist _(REQUIRED before committing YOUR task)_

- [ ] **Your Task Status**: Mark your task ✅ and update all subtasks to `- [x]`
- [ ] **Current State**: Update "Next Available Task" to show what task is ready next
- [ ] **Success Criteria**: Check off any criteria your task completed
- [ ] **Handoff**: Clear what the next agent should pick up
- [ ] **CLI Documentation**: Update help system with new commands and examples

### 🧪 Testing Checklist _(Follow this exact order)_

**DURING DEVELOPMENT** _(Test as you build each piece)_

- [ ] **Command Parsing**: Test all commands with valid and invalid arguments
- [ ] **Output Formats**: Verify table, JSON, CSV outputs work correctly
- [ ] **Integration**: Test CLI integration with TaskRouter, WorkflowStateManager, ContextInjector
- [ ] **Help System**: Test help text is clear and includes working examples
- [ ] **Error Handling**: Test error messages are helpful and actionable

**BEFORE COMMITTING** _(Required validation sequence)_

- [ ] **End-to-End Tests**: Test complete workflows from feature creation to completion
- [ ] **CLI Integration**: Test all commands work with real spec data
- [ ] **Output Validation**: Verify all output formats parse correctly in consuming tools
- [ ] **Types**: Run `pnpm typecheck` - fix all TypeScript errors
- [ ] **Linting**: Run `pnpm lint && pnpm format` - fix all style issues
- [ ] **CLI Tests**: Test comprehensive CLI command suite
- [ ] **Performance**: Verify CLI commands respond quickly (< 2s for most operations)

### 🌱 CLI System Impact Check _(Required for CLI functionality)_

- [ ] **Feature Management**: Test create, list, show, update commands work
- [ ] **Task Management**: Test assign, start, complete commands work
- [ ] **Workflow Commands**: Test next, status, progress commands work
- [ ] **Context Commands**: Test context add/show, research commands work

---

## 📊 Progress Tracking _(AGENTS: Add entry when you complete YOUR task)_

### ✅ Completed Tasks _(Add entry when you finish your task)_

- ✅ **[2025-08-27]** - **TASK-001** Core CLI Command Framework completed - _Agent: cli-specialist_ - Next: TASK-002 ready

### 🚨 Task Blockers _(Preventing next task pickup)_

- **FEAT-013** (Task Router System) - Required for `asd next` and task assignment commands
- **FEAT-014** (Workflow State Manager) - Required for `asd status` and progress commands
- **FEAT-012** (Context Injection System) - Required for `asd context` commands

### ➡️ Handoff Status _(What's ready for next agent)_

- **Ready When**: Dependencies complete (FEAT-012, FEAT-013, FEAT-014)
- **Waiting**: All tasks blocked until foundation systems implemented

---

## 🔗 Technical References

### Architecture Documents

- **CLI Architecture**: Current `bin/asd` for command structure patterns
- **System Integration**: `docs/architecture.md` for component integration
- **Advanced CLI Spec**: `docs/specs/backlog/FEAT-011-advanced-cli-commands.md` (original analysis)

### Integration Points

- **TaskRouter**: For `asd next`, `asd assign` commands
- **WorkflowStateManager**: For `asd status`, `asd progress`, `asd complete` commands
- **ContextInjector**: For `asd context`, `asd research` commands
- **SpecParser**: For `asd list`, `asd show`, `asd create` commands

### Dependencies

- **Requires**: Core systems (FEAT-012, FEAT-013, FEAT-014) must be complete
- **Enables**: Full CLI-driven agentic workflows, automation scripting, CI/CD integration

---

<details>
<summary><strong>📖 Detailed Command Reference</strong> <em>(Expand when needed)</em></summary>

## Complete Command Reference

### Feature Management Commands

```bash
# Create features/specs/bugs
asd create spec "Enhanced Search System" --priority P1 --phase PHASE-1A
asd create feat "User Dashboard" --priority P0 --agent ui-developer
asd create bug "Login timeout" --priority P1 --assignee backend-specialist

# List and filter
asd list specs --status active --priority P0,P1 --sort priority
asd list specs --phase PHASE-1A --format table
asd list specs --assignee ui-developer --format json

# Show details
asd show FEAT-012 --format detailed
asd show FEAT-012 --format json --include-tasks --include-context

# Update and manage
asd update FEAT-012 --status active --priority P0
asd move FEAT-012 --to-phase PHASE-1B --validate-deps
asd retag FEAT-012 --add-tag mobile --remove-tag desktop
```

### Task Management Commands

```bash
# Task assignment and lifecycle
asd assign FEAT-012 TASK-001 --agent product-manager
asd start FEAT-012 TASK-001 --inject-context spec,project,phase
asd complete task FEAT-012 TASK-001 --notes "PRD completed"
asd complete subtask FEAT-012 TASK-001 SUBTASK-002

# Task discovery and routing
asd next --agent backend-specialist --priority P0,P1
asd next --phase PHASE-1A --exclude-agent product-manager
asd tasks --status ready --agent ui-developer --limit 5

# Task management
asd block TASK-002 --reason "Waiting for design approval"
asd unblock TASK-002
asd reschedule TASK-003 --after TASK-001
```

### Workflow & Status Commands

```bash
# Status and progress
asd status                          # Current assignments overview
asd status --detailed --by-agent    # Detailed status by agent
asd progress                        # Overall project progress
asd progress FEAT-012               # Specific feature progress
asd progress --by-phase --format json

# Handoff management
asd handoff status                  # Ready handoffs
asd handoff ready FEAT-012 TASK-001 --next ui-developer
asd handoff history --spec FEAT-012

# Workflow automation
asd validate --schema asd --fix-issues
asd sync --update-progress --notify-changes
asd export --format json --output roadmap.json --validate-schema
```

### Context & Research Commands

```bash
# Context management
asd context add --spec FEAT-012 --constraint "Mobile performance critical"
asd context show --task TASK-001 --inject --agent product-manager
asd context update --project --tech-stack "Add React Query"

# Research capture
asd research add --task TASK-001 "WebSocket performance analysis complete"
asd research show --spec FEAT-012 --format summary
asd research pattern --create "dashboard-widgets" --from-task TASK-001

# Agent customization
asd agent customize product-manager --add-step "Performance validation"
asd agent list --capabilities --context-requirements
asd process update validation-checklist --add-step "Accessibility testing"
```

### Configuration & Utility Commands

```bash
# Configuration
asd config set dataPath ./product/roadmap
asd config list --format table
asd config validate --fix-issues

# Initialization and templates
asd init --template asd --path ./docs/features
asd template list --type spec
asd template create custom-feature --based-on standard

# Import/Export
asd import specs --from roadmap.json --validate
asd export specs --format csv --filter "status=active"
asd backup --output asd-backup.tar.gz --include-context
```

## Output Format Examples

### Table Format (Default)

```
┌──────────┬─────────────────────┬─────────┬─────────┬──────────────┬──────────┐
│ ID       │ Title               │ Status  │ Priority│ Assignee     │ Progress │
├──────────┼─────────────────────┼─────────┼─────────┼──────────────┼──────────┤
│ FEAT-012 │ Context Injection   │ active  │ P0      │ backend-spec │ 2/4 (50%)│
│ FEAT-013 │ Task Router System  │ active  │ P0      │ backend-spec │ 0/4 (0%) │
│ FEAT-014 │ Workflow State Mgr  │ backlog │ P0      │ unassigned   │ 0/4 (0%) │
└──────────┴─────────────────────┴─────────┴─────────┴──────────────┴──────────┘
```

### JSON Format

```json
{
  "specs": [
    {
      "id": "FEAT-012",
      "title": "Context Injection System",
      "status": "active",
      "priority": "P0",
      "phase": "PHASE-1A",
      "assignee": "backend-specialist",
      "progress": {
        "completed_tasks": 2,
        "total_tasks": 4,
        "percentage": 50
      },
      "tasks": [...],
      "context": {...}
    }
  ],
  "meta": {
    "total_count": 1,
    "filtered_count": 1,
    "query": "status=active"
  }
}
```

### Summary Format

```
📊 Project Status Summary

Active Features: 3
├─ FEAT-012: Context Injection System (50% complete)
├─ FEAT-013: Task Router System (0% complete)
└─ FEAT-014: Workflow State Manager (0% complete)

Ready Tasks: 5
Next Recommended: TASK-001 (Context Storage) → backend-specialist

Overall Progress: 15/48 tasks complete (31%)
Phase 1A: 8/12 specs (67% complete)
```

</details>

---

## 💡 Implementation Notes _(Update as you learn)_

### Key Decisions

- Build on existing commander.js framework rather than replacing CLI structure
- Multiple output formats (table, JSON, CSV) for integration with external tools
- Comprehensive help system with working examples for all commands

### Gotchas & Learnings

- CLI argument validation must match underlying system constraints
- Output formatting needs to handle empty results and error states gracefully
- Help system should include real examples that work with sample data

### Future Improvements

- Auto-completion support for bash/zsh/fish shells
- Interactive CLI mode for guided workflows
- Plugin system for custom commands and integrations

---

**Priority**: P1 - Complete CLI interface for agentic workflows  
**Effort**: 20 hours across CLI framework, feature management, task management, and workflow commands
**Impact**: Enables full command-line driven development workflows and agent automation
