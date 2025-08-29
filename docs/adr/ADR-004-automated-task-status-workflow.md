# ADR-004: Automated Task Status Workflow System

**Status**: Accepted  
**Date**: 2025-08-28  
**Decision Makers**: Tyler Barnard, Claude (Software Architect)  
**Technical Story**: [Automated Task Status Management for Agent Workflows](https://github.com/asd/issues/TBD)

## Context and Problem Statement

The current ASD task lifecycle relies heavily on manual agent updates using CLI commands (`asd assign`, `asd complete`, etc.), which results in:

- **High failure rate** due to human error and cognitive load
- **State inconsistency** across YAML frontmatter, JSON state files, and git history
- **Process inefficiency** with 40+ manual CLI commands required for task management
- **Poor user experience** requiring agents to remember complex status update sequences

The ideal workflow should be:

1. User requests project status and next task
2. Agent uses single command to start task with auto-assignment and validation
3. Agent works with automatic context injection
4. Agent completes work with automated status updates, testing, and git commits
5. System reports updated status back to user

## Decision Drivers

- **Reduce manual overhead** by 80% while maintaining quality
- **Improve workflow consistency** by 90% through automation
- **Maintain audit trails** and rollback capabilities for safety
- **Leverage existing infrastructure** (WorkflowStateManager, TaskRouter, HandoffAutomationEngine)
- **Preserve human control** with manual override capabilities
- **Achieve <30 second** status update response times

## Considered Options

1. **Event-Driven Automation System** (Selected)
2. Validation-Triggered Automation
3. Hybrid Git + CLI Integration
4. Time-Based + Pattern Recognition

## Decision Outcome

**Chosen option**: Event-Driven Automation System

### Architecture Overview

```mermaid
graph TB
    subgraph "User Interface Layer"
        CLI[Enhanced CLI Commands]
        TUI[Terminal UI]
        CMDS[/commands integration]
    end

    subgraph "Command Processing Layer"
        START[asd start-next]
        COMPLETE[asd complete-current]
        STATUS[asd workflow status]
    end

    subgraph "Automation Engine"
        EVENT_BUS[Event Bus & Router]
        STATE_MACHINE[Automated State Machine]
        VALIDATOR[Assignment Validator]
        CONTEXT_INJ[Context Injector]
    end

    subgraph "State Management Layer"
        WORKFLOW_MGR[WorkflowStateManager]
        TASK_ROUTER[TaskRouter]
        HANDOFF_ENG[HandoffAutomationEngine]
    end

    subgraph "Data Storage Layer"
        JSON_STATE[JSON State Files<br/>.asd/state/*.json]
        YAML_FRONT[YAML Frontmatter<br/>docs/specs/**/*.md]
        GIT_REPO[Git Repository<br/>Commit History & Hooks]
        CONTEXT_FILES[Context Files<br/>.asd/context/**/*.md]
    end

    subgraph "External Systems"
        LINTING[ESLint/Prettier]
        TESTING[Test Suites]
        PRE_COMMIT[Pre-commit Hooks]
        SUB_AGENTS[Claude Sub-agents]
    end

    %% User Interactions
    CLI --> START
    CLI --> COMPLETE
    CLI --> STATUS
    TUI --> EVENT_BUS
    CMDS --> EVENT_BUS

    %% Command Processing
    START --> VALIDATOR
    START --> CONTEXT_INJ
    COMPLETE --> STATE_MACHINE
    STATUS --> WORKFLOW_MGR

    %% Automation Flow
    VALIDATOR --> TASK_ROUTER
    CONTEXT_INJ --> SUB_AGENTS
    STATE_MACHINE --> WORKFLOW_MGR
    EVENT_BUS --> STATE_MACHINE

    %% State Management
    WORKFLOW_MGR --> JSON_STATE
    WORKFLOW_MGR --> YAML_FRONT
    TASK_ROUTER --> JSON_STATE
    HANDOFF_ENG --> CONTEXT_FILES

    %% External Integration
    COMPLETE --> LINTING
    COMPLETE --> TESTING
    COMPLETE --> GIT_REPO
    GIT_REPO --> PRE_COMMIT
    PRE_COMMIT --> STATE_MACHINE

    %% Data Flow
    JSON_STATE -.-> YAML_FRONT
    YAML_FRONT -.-> CONTEXT_FILES
    GIT_REPO -.-> EVENT_BUS
```

## Technical Requirements

### Functional Requirements

**FR1: Enhanced Task Start Command**

```bash
asd start-next --agent cli-specialist
```

- Automatically find next recommended task using TaskRouter
- Validate agent capability and assignment constraints
- Update task status: `ready` → `in_progress` in both YAML and JSON
- Check and resolve dependency blocks
- Inject relevant context to sub-agent with working prompt
- Report validation status or actionable errors

**FR2: Automated Completion Workflow**

```bash
asd complete-current  # or asd complete FEAT-018 TASK-002
```

- Update task status: `in_progress` → `complete` across all systems
- Generate completion documentation and update context files
- Execute `npm run lint` with automatic error resolution attempts
- Run test suites with failure reporting
- Git add all files modified during work session
- Create properly formatted commit message
- Handle pre-commit hook failures with retry logic
- Trigger handoff automation for dependent tasks

**FR3: Real-time State Synchronization**

- File system watchers monitoring YAML frontmatter changes
- Automatic JSON state file updates on YAML modifications
- State consistency validation across all storage systems
- Conflict resolution with manual override capabilities

**FR4: Context Injection System**

- Automatic gathering of task-specific context on start
- Sub-agent prompt generation with relevant examples and constraints
- Work environment setup (file paths, dependencies, requirements)
- Integration with existing ContextInjector system

### Non-Functional Requirements

**NFR1: Performance**

- Command response time: <5 seconds for start/complete operations
- Status synchronization: <2 seconds between YAML and JSON updates
- Context injection: <3 seconds for sub-agent prompt generation
- System throughput: Handle 100+ concurrent task operations

**NFR2: Reliability**

- 95% automation accuracy with <2% false positive rate
- Comprehensive audit logging for all automated actions
- Atomic operations with full rollback capabilities
- State consistency checking with automatic repair

**NFR3: Safety & Control**

- Manual override system always available
- Confidence scoring with human review for low-confidence actions
- Comprehensive rollback to any previous state
- Real-time validation with immediate error reporting

## Technical Architecture Details

### File Structure Changes

```
asd/
├── lib/
│   ├── automation/
│   │   ├── event-bus.js              # NEW - Central event routing
│   │   ├── automated-state-machine.js # NEW - Status transition automation
│   │   ├── context-injector.js       # ENHANCED - Sub-agent context
│   │   ├── git-integration.js        # NEW - Git workflow automation
│   │   └── audit-system.js           # NEW - Comprehensive audit logging
│   ├── workflow-state-manager.js     # ENHANCED - Add automation hooks
│   ├── task-router.js               # ENHANCED - Add confidence scoring
│   └── handoff-automation-engine.js # ENHANCED - Add automated triggers
├── bin/
│   └── asd                          # ENHANCED - New commands + automation
├── .asd/
│   ├── state/
│   │   ├── assignments.json         # ENHANCED - Add automation metadata
│   │   ├── progress.json           # ENHANCED - Add performance metrics
│   │   └── audit-log.json          # NEW - Comprehensive action logging
│   └── config/
│       └── automation-config.json  # NEW - Automation behavior settings
└── docs/
    └── adr/
        └── ADR-004-automated-task-status-workflow.md
```

### Data Flow Architecture

**1. Task Start Flow**

```javascript
// Command: asd start-next --agent cli-specialist
1. TaskRouter.getNextTask(agentType) → recommended task
2. AssignmentValidator.validate(task, agent) → validation result
3. WorkflowStateManager.assignTask(spec, task, agent) → state update
4. AutomatedStateMachine.transitionStatus(ready → in_progress) → YAML/JSON sync
5. ContextInjector.injectContext(task, agent) → sub-agent prompt
6. AuditSystem.logAction(task_start) → audit trail
```

**2. Work Completion Flow**

```javascript
// Command: asd complete-current
1. WorkflowStateManager.getCurrentAssignment() → active task
2. GitIntegration.trackModifiedFiles() → file list for commit
3. LintingSystem.runLint() → fix issues or report failures
4. TestSystem.runTests() → validate passing or report failures
5. GitIntegration.commitWork(files, message) → git commit with proper format
6. PreCommitHooks.handle() → retry on failures, escalate on persistent issues
7. AutomatedStateMachine.transitionStatus(in_progress → complete) → status update
8. HandoffAutomationEngine.triggerHandoffs() → unblock dependent tasks
9. AuditSystem.logAction(task_complete) → audit trail
```

**3. State Synchronization Flow**

```javascript
// File System Watcher Events
1. FileWatcher.detect(yaml_change) → YAML frontmatter modified
2. YamlParser.extractStatus(file) → parse new status
3. StateValidator.checkConsistency() → validate across systems
4. WorkflowStateManager.syncToJson() → update JSON state files
5. EventBus.emit(status_changed) → notify dependent systems
6. HandoffAutomationEngine.checkUnblocks() → process dependent tasks
```

### Technology Integration Points

**CLI Command Enhancement**

- Extend existing Commander.js command structure
- Add automation flags and options to all workflow commands
- Integrate with existing validation and error handling systems

**File System Monitoring**

- Use `chokidar` for real-time file watching
- Monitor `docs/specs/**/*.md` for YAML frontmatter changes
- Monitor `.asd/state/*.json` for direct JSON modifications
- Monitor work files during active sessions for smart commit detection

**Git Integration**

- Shell command integration for commit operations
- Commit message templating: `"Complete {SPEC-ID} {TASK-ID}: {TASK-TITLE}"`
- Pre-commit hook integration with retry logic
- File tracking during work sessions for selective commits

**Sub-agent Integration**

- Context preparation using existing ContextInjector
- Prompt generation with task-specific examples and constraints
- Integration with Claude sub-agent APIs
- Work environment setup and file path management

### Error Handling & Recovery

**Validation Failures**

- Assignment validation errors → clear actionable error messages
- Dependency blocking → suggest resolution paths
- Agent capability mismatches → recommend alternative agents

**Automation Failures**

- File system conflicts → manual resolution with guided workflow
- Git operation failures → retry with escalation to manual intervention
- State inconsistencies → automatic repair with confirmation prompts

**Pre-commit Hook Failures**

- Linting errors → automatic fix attempts with manual fallback
- Test failures → clear reporting with suggested fixes
- Build failures → environment validation with setup guidance

## Pros and Cons of the Decision

### Positive Consequences

- **80% reduction in manual status management overhead**
- **90% improvement in workflow consistency and reliability**
- **Comprehensive audit trails** for all automated actions
- **Maintains human control** with override capabilities
- **Leverages existing robust infrastructure** (minimal architectural changes)
- **Gradual rollout capability** with fallback to manual processes

### Negative Consequences

- **Initial complexity** in setting up automation rules and patterns
- **Team adoption curve** requiring git convention adherence
- **Debugging complexity** when automation fails or produces unexpected results
- **Potential for false positives** requiring rollback mechanisms

## Implementation Plan

### Phase 1: Enhanced Assignment Automation (Weeks 1-2)

- Enhance `asd assign` command with automatic status updates
- Build real-time YAML/JSON synchronization system
- Add comprehensive validation and error reporting
- Create audit logging foundation

### Phase 2: Completion Workflow Automation (Weeks 3-4)

- Build `asd complete-current` command with git integration
- Add automatic linting, testing, and commit workflow
- Implement pre-commit hook error handling and retry logic
- Integrate with HandoffAutomationEngine for dependent task triggering

### Phase 3: Context Injection & Sub-agent Integration (Weeks 5-6)

- Build `asd start-next` as enhanced assignment command
- Add automatic context injection for sub-agents
- Implement work environment setup and file path management
- Add sub-agent prompting with task-specific guidance

### Phase 4: Advanced Features & Optimization (Weeks 7-8)

- Add confidence scoring for automation decisions
- Implement manual review queues for low-confidence actions
- Add performance monitoring and optimization
- Complete documentation and team training materials

## Validation & Success Metrics

### Technical Validation

- **Automation Accuracy**: >95% correct automated actions
- **Performance**: <5 second response times for all commands
- **Reliability**: <2% false positive rate with full rollback capability
- **State Consistency**: >99.9% consistency across all storage systems

### Process Validation

- **Manual Overhead Reduction**: 80% decrease in manual status updates
- **Workflow Consistency**: 90% improvement in process adherence
- **Team Satisfaction**: Positive feedback on reduced cognitive load
- **Error Reduction**: 85% decrease in status management errors

### Business Validation

- **Development Velocity**: Measurable increase in task throughput
- **Quality Maintenance**: No decrease in deliverable quality
- **Team Adoption**: >80% team adoption rate within 30 days
- **ROI**: Positive return on automation investment within 60 days

## Links

- **Related ADRs**: ADR-001 (CLI Architecture), ADR-002 (State Management), ADR-003 (Agent Integration)
- **Implementation Tracking**: [GitHub Project Board](https://github.com/asd/projects/automation-workflow)
- **Technical Documentation**: `/docs/automation/` (to be created during implementation)
- **User Guide**: `/docs/user-guide/automated-workflow.md` (to be created during Phase 4)

---

**Review Notes**: This ADR should be reviewed after Phase 1 implementation to validate technical assumptions and adjust Phase 2-4 planning based on real-world usage data.

**Implementation Owner**: CLI Specialist + Software Architect collaboration  
**Stakeholder Approval Required**: Tyler Barnard (Product Owner)  
**Technical Review Required**: Senior Software Architect
