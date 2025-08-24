---
id: "FEAT-012"
title: "Context Injection System"
type: "FEAT"
phase: "PHASE-1A"
priority: "P0"
status: "active"
created: "2024-08-24T16:00:00Z"
estimated_hours: 32
tags: ["context", "agents", "workflow", "core-system"]
tasks:
  - id: "TASK-001"
    title: "Core Context Storage & File Structure"
    agent_type: "software-architect"
    status: "ready"
    estimated_hours: 8
    context_requirements: ["architecture-patterns", "file-system-design"]
    subtasks:
      - id: "SUBTASK-001"
        title: "Design .asd/ directory structure"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-002"
        title: "Create context file schemas"
        type: "implementation"
        estimated_minutes: 180
        status: "ready"
      - id: "SUBTASK-003"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 120
        status: "ready"
  - id: "TASK-002"
    title: "Context Injection Engine"
    agent_type: "backend-specialist"
    status: "blocked"
    estimated_hours: 10
    context_requirements: ["task-routing", "yaml-processing"]
    depends_on: ["TASK-001"]
    subtasks:
      - id: "SUBTASK-004"
        title: "Implement multi-layer context loading"
        type: "implementation"
        estimated_minutes: 360
        status: "ready"
      - id: "SUBTASK-005"
        title: "Agent-specific filtering logic"
        type: "implementation"
        estimated_minutes: 180
        status: "ready"
      - id: "SUBTASK-006"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 120
        status: "ready"
  - id: "TASK-003"
    title: "CLI Commands & Update Triggers"
    agent_type: "cli-specialist"
    status: "blocked"
    estimated_hours: 8
    context_requirements: ["cli-patterns", "commander-js"]
    depends_on: ["TASK-002"]
    subtasks:
      - id: "SUBTASK-007"
        title: "Context management CLI commands"
        type: "implementation"
        estimated_minutes: 240
        status: "ready"
      - id: "SUBTASK-008"
        title: "Auto-update trigger system"
        type: "implementation"
        estimated_minutes: 180
        status: "ready"
      - id: "SUBTASK-009"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 60
        status: "ready"
  - id: "TASK-004"
    title: "Agent Definition System & Templates"
    agent_type: "software-architect"
    status: "blocked"
    estimated_hours: 6
    context_requirements: ["agent-patterns", "yaml-frontmatter"]
    depends_on: ["TASK-003"]
    subtasks:
      - id: "SUBTASK-010"
        title: "Agent definition file format"
        type: "implementation"
        estimated_minutes: 180
        status: "ready"
      - id: "SUBTASK-011"
        title: "Process template system"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-012"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 60
        status: "ready"
dependencies: []
acceptance_criteria:
  - "Agents receive 4-layer context injection (critical, task-specific, agent-specific, process)"
  - "Context files auto-update based on CLI command triggers"
  - "Users can customize agent workflows via MD files with YAML frontmatter"
  - "Context system is self-maintaining and accumulates learning over time"
  - "CLI commands support both automated and manual context management"
---

# Context Injection System

**Status**: Active | **Priority**: P0 (Critical) | **Owner**: Software Architect

## 🎯 Quick Start *(30 seconds)*

**What**: Implement comprehensive context injection system for AI agents with multi-layer context, automatic updates, and customizable workflows

**Why**: Enable sophisticated agent handoffs with rich context while maintaining human observability and customization

**Impact**: Foundation for all agentic workflows - agents get relevant context automatically, system learns and improves over time

### 🚀 AGENT PICKUP GUIDE
**➡️ Next Available Task**: **TASK-001** - Core Context Storage & File Structure  
**📋 Your Job**: Work on TASK-001 only, then update docs and hand off  
**🚦 Dependencies**: None - foundational system component

### 🚦 Current State *(AGENTS: Update this when you complete YOUR task)*
- **Next Available Task**: TASK-001 - Core Context Storage & File Structure
- **Current Task Status**: None - ready for pickup  
- **Overall Progress**: 0 of 4 tasks complete
- **Blockers**: None
- **Last Updated**: 2024-08-24 by System Architect

---

## 📋 Work Definition *(What needs to be built)*

### Problem Statement
Currently, agents receive minimal context and have no systematic way to accumulate learning or pass knowledge to subsequent agents. This results in:
- Repeated research across similar tasks
- Agents lacking project-specific context and constraints  
- No learning accumulation or pattern recognition
- Manual handoffs without structured context transfer
- Inconsistent agent behavior across different specs

### Solution Approach
Implement a comprehensive 4-layer context injection system with:
1. **Static Context**: Project config and agent capabilities
2. **Dynamic Context**: Real-time task assignments and progress
3. **Semi-Dynamic Context**: Research findings and implementation decisions
4. **Process Context**: Customizable workflow templates and validation checklists

### Success Criteria
- [x] Multi-layer context injection provides relevant context to agents automatically
- [x] Context files update automatically based on agent actions and CLI commands
- [x] System accumulates learning over time (research findings, decisions, patterns)
- [x] Users can customize agent workflows and validation templates
- [x] Context system integrates seamlessly with existing spec/task workflow
- [x] Performance: Context injection completes in < 500ms for typical tasks

---

## 🏗️ Implementation Plan

### Technical Approach
Create `.asd/` directory structure following Claude's MD + YAML pattern, implement multi-layer context injection engine, build CLI commands for context management, and establish automatic update triggers based on workflow events.

### Implementation Tasks *(Each task = one agent handoff)*

**TASK-001** 🤖 **Core Context Storage & File Structure** ⏳ **← READY FOR PICKUP** | Agent: Software-Architect

- [ ] Design `.asd/` directory structure with agents/, context/, state/, processes/ folders
- [ ] Create file schemas for agent definitions (MD + YAML like Claude sub-agents)
- [ ] Define context file formats for specs, tasks, and project-level context
- [ ] Establish naming conventions and file organization patterns
- [ ] Create example files for each context type with proper YAML frontmatter
- [ ] Document file relationships and inheritance patterns
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that context storage foundation is ready
- **Files**: `.asd/` directory structure, schema definitions, example context files
- **Agent Instructions**: Focus on extensibility and human readability, follow Claude's sub-agent pattern

**TASK-002** 🤖 **Context Injection Engine** ⏸️ **← BLOCKED (waiting for TASK-001)** | Agent: Backend-Specialist

- [ ] Implement ContextInjector class with 4-layer injection (critical, task-specific, agent-specific, process)
- [ ] Create context loading logic for static, dynamic, and semi-dynamic context types  
- [ ] Build agent-specific filtering based on context_requirements in agent definitions
- [ ] Implement context relevance scoring and prioritization
- [ ] Create context inheritance patterns (task context inherits from spec context)
- [ ] Add context validation and schema checking
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify CLI specialist that context injection engine is ready for CLI integration
- **Dependencies**: TASK-001 must be complete
- **Files**: ContextInjector class, context loading utilities, validation logic

**TASK-003** 🤖 **CLI Commands & Update Triggers** ⏸️ **← BLOCKED (waiting for TASK-002)** | Agent: CLI-Specialist

- [ ] Implement context management CLI commands (asd context add/update/show)
- [ ] Create automatic update triggers for task lifecycle events (start, complete, research)
- [ ] Build agent customization commands (asd agent customize, asd process update)  
- [ ] Add context validation and consistency checking commands
- [ ] Implement batch update operations and conflict resolution
- [ ] Create context export/import functionality for backup and sharing
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that CLI commands are ready for agent template integration
- **Dependencies**: TASK-002 must be complete  
- **Files**: CLI command implementations, update trigger system, validation utilities

**TASK-004** 🤖 **Agent Definition System & Templates** ⏸️ **← BLOCKED (waiting for TASK-003)** | Agent: Software-Architect

- [ ] Create agent definition templates following Claude's sub-agent pattern (MD + YAML)
- [ ] Implement process template system for customizable workflows and validation checklists
- [ ] Build agent capability matching and context requirement validation
- [ ] Create default agent definitions (product-manager, ui-developer, backend-specialist, etc.)
- [ ] Implement template inheritance and customization patterns
- [ ] Add agent workflow validation and consistency checking
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements" 
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify product management that context injection system is ready for integration
- **Dependencies**: TASK-003 must be complete
- **Files**: Agent definition templates, process templates, default agent configurations

**Legend**: ⏳ Ready for pickup | 🔄 In progress | ✅ Complete | ⏸️ Blocked

---

## ✅ Validation Requirements

### 📝 Documentation Checklist *(REQUIRED before committing YOUR task)*
- [ ] **Your Task Status**: Mark your task ✅ and update all subtasks to `- [x]`
- [ ] **Current State**: Update "Next Available Task" to show what task is ready next
- [ ] **Success Criteria**: Check off any criteria your task completed
- [ ] **Handoff**: Clear what the next agent should pick up
- [ ] **Context Documentation**: Update context-injection-system.md with implementation details

### 🧪 Testing Checklist *(Follow this exact order)*

**DURING DEVELOPMENT** *(Test as you build each piece)*
- [ ] **Schema Validation**: Test context file schemas with valid and invalid YAML/JSON
- [ ] **Context Loading**: Verify context files load correctly and inheritance works
- [ ] **Agent Filtering**: Test agent-specific context filtering based on requirements
- [ ] **CLI Commands**: Test context management commands with various inputs
- [ ] **Update Triggers**: Verify automatic updates trigger correctly on workflow events

**BEFORE COMMITTING** *(Required validation sequence)*
- [ ] **Integration Tests**: Test context injection with existing spec/task workflow
- [ ] **Performance Tests**: Verify context injection completes within 500ms performance budget
- [ ] **CLI Validation**: Run `asd context validate` to check system consistency
- [ ] **Types**: Run `pnpm typecheck` - fix all TypeScript errors
- [ ] **Linting**: Run `pnpm lint && pnpm format` - fix all style issues
- [ ] **Unit Tests**: Test individual context components in isolation
- [ ] **Documentation**: Update architecture.md reference to context-injection-system.md

### 🌱 Context System Impact Check *(Required for context functionality)*
- [ ] **File Structure**: Verify `.asd/` directory structure is created correctly
- [ ] **Agent Definitions**: Test agent definition files load and validate properly
- [ ] **Context Injection**: Verify 4-layer context injection works with test scenarios
- [ ] **Auto-Updates**: Test automatic context updates on task lifecycle events

---

## 📊 Progress Tracking *(AGENTS: Add entry when you complete YOUR task)*

### ✅ Completed Tasks *(Add entry when you finish your task)*
- ✅ **[YYYY-MM-DD]** - **TASK-XXX** completed - *Agent: [name]* - Next: TASK-YYY ready

### 🚨 Task Blockers *(Preventing next task pickup)*
- No blockers currently identified

### ➡️ Handoff Status *(What's ready for next agent)*
- **Ready Now**: TASK-001 (no dependencies)
- **Waiting**: TASK-002 through TASK-004 (sequential dependencies)

---

## 🔗 Technical References

### Architecture Documents  
- **System Overview**: `docs/architecture.md` (high-level architecture)
- **Detailed Specification**: `docs/context-injection-system.md` (complete workflows and file structures)
- **Configuration**: `asd.config.js` (project-level configuration patterns)

### Implementation Patterns
- **Claude Sub-Agents**: Reference pattern for agent definition files (MD + YAML frontmatter)
- **Commander.js**: CLI command implementation patterns
- **YAML Processing**: js-yaml library for frontmatter parsing
- **File System**: Node.js fs module for context file management

### Dependencies
- **Requires**: Existing spec parser, task router, and CLI foundation  
- **Enables**: Sophisticated agent workflows, learning accumulation, customizable processes

---

<details>
<summary><strong>📖 Detailed Requirements & Design</strong> <em>(Expand when needed)</em></summary>

## Detailed Requirements

### REQ-001: Multi-Layer Context Injection
**As a** AI agent  
**I want** to receive relevant context based on my role and current task  
**So that** I can work effectively without repeating research or missing constraints

**Acceptance Criteria**:
- [ ] Context injection provides 4 layers: critical, task-specific, agent-specific, process
- [ ] Context is filtered based on agent type and requirements
- [ ] Context loading completes in < 500ms for typical tasks
- [ ] Context includes project constraints, research findings, and workflow templates
- [ ] Context inheritance works from project → spec → task levels

### REQ-002: Automatic Context Updates  
**As a** system user  
**I want** context files to update automatically based on agent actions  
**So that** knowledge accumulates without manual intervention

**Acceptance Criteria**:
- [ ] Task start/complete triggers context file updates
- [ ] Research findings automatically captured and stored
- [ ] Implementation decisions roll up from task to spec to project level
- [ ] Progress tracking updates in real-time
- [ ] Learned patterns become available for future tasks

### REQ-003: Agent Workflow Customization
**As a** project manager  
**I want** to customize agent workflows and validation requirements  
**So that** the system adapts to my project's specific needs

**Acceptance Criteria**:
- [ ] Agent definitions stored in human-readable MD files with YAML frontmatter
- [ ] Workflow steps and context requirements are customizable
- [ ] Process templates can be modified and applied to specific agents
- [ ] Changes can be made via CLI commands or direct file editing
- [ ] Custom workflows validate correctly and maintain system consistency

### REQ-004: Context System Performance
**As a** system user  
**I want** the context system to be fast and reliable  
**So that** it doesn't slow down agent workflows

**Acceptance Criteria**:
- [ ] Context injection completes in < 500ms for typical tasks
- [ ] File system operations are optimized for frequent reads/writes
- [ ] Context validation prevents corrupted or inconsistent states
- [ ] System handles concurrent context updates safely
- [ ] Memory usage remains reasonable for projects with 100+ specs

## Technical Design Details

### Context File Architecture
```
.asd/
├── agents/                    # Agent Definitions (Claude-style)
│   ├── product-manager.md     # YAML frontmatter + workflow instructions
│   └── ui-developer.md        
├── processes/                 # Customizable Templates  
│   ├── validation-checklist.md
│   └── handoff-process.md
├── context/                   # Context Storage
│   ├── project.md             # Project-wide constraints
│   ├── specs/FEAT-*.md        # Spec-specific research
│   └── tasks/TASK-*.md        # Task context
├── state/                     # Dynamic State (JSON)
│   ├── assignments.json       # Current assignments
│   └── progress.json          # Real-time progress
└── config/                    # Configuration
    └── agent-capabilities.json
```

### Context Injection Flow
1. **Agent starts task** → Load static config and agent definition
2. **Gather context layers** → Critical, task-specific, agent-specific, process
3. **Filter by relevance** → Apply agent requirements and task constraints  
4. **Inject context** → Provide structured context object to agent
5. **Auto-update triggers** → Capture research, decisions, and progress

### CLI Command Design
```bash
# Context management
asd context add --project --constraint "Node.js 20+ required"
asd context show --task TASK-001 --inject --agent product-manager
asd context validate --fix-issues

# Agent customization  
asd agent customize product-manager --add-step "Performance validation"
asd process update validation-checklist --add-requirement "Accessibility"

# State management (automatic + manual)
asd assign task FEAT-012 TASK-001 --agent product-manager
asd progress update FEAT-012 TASK-001 --subtask 1 --complete
```

## Testing Strategy Details

### Unit Tests
- Context file loading and validation
- Agent filtering and requirement matching
- CLI command parsing and execution
- Update trigger mechanisms

### Integration Tests  
- End-to-end context injection flow
- Multi-agent workflow with context handoffs
- Automatic update cascades (task → spec → project)
- Performance testing with large context datasets

### System Tests
- Context system integration with existing ASD workflow
- Agent customization via file editing
- Concurrent context updates and conflict resolution
- Recovery from corrupted or invalid context files

</details>

---

## 💡 Implementation Notes *(Update as you learn)*

### Key Decisions
- Use Claude's MD + YAML pattern for agent definitions (human readable + programmatic)
- 4-layer context system balances relevance with completeness
- Automatic update triggers capture learning without manual intervention

### Gotchas & Learnings  
- Context files must remain human-readable while supporting programmatic access
- Agent filtering prevents context overload but must not miss critical information
- File system performance critical for frequent context updates

### Future Improvements
- Semantic search for context relevance scoring
- Machine learning for context recommendation optimization
- Cross-project context sharing and pattern libraries

---

**Priority**: P0 - Foundation for all agentic workflows  
**Effort**: 32 hours across storage, injection, CLI, and agent template systems
**Impact**: Enables sophisticated agent collaboration with learning accumulation and customizable workflows