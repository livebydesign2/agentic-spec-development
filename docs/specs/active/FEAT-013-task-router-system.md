---
id: "FEAT-013"
title: "Task Router System"
type: "FEAT"
phase: "PHASE-1A"
priority: "P0"
status: "active"
created: "2024-08-24T17:00:00Z"
estimated_hours: 16
tags: ["task-routing", "agent-assignment", "workflow", "core-system"]
tasks:
  - id: "TASK-001"
    title: "Core Task Routing Engine"
    agent_type: "backend-specialist"
    status: "ready"
    estimated_hours: 6
    context_requirements: ["spec-parsing", "agent-capabilities", "dependency-tracking"]
    subtasks:
      - id: "SUBTASK-001"
        title: "Implement TaskRouter class with dependency resolution"
        type: "implementation"
        estimated_minutes: 180
        status: "ready"
      - id: "SUBTASK-002"
        title: "Add agent capability matching logic"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-003"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 60
        status: "ready"
  - id: "TASK-002"
    title: "Priority & Constraint System"
    agent_type: "backend-specialist"
    status: "blocked"
    estimated_hours: 4
    context_requirements: ["priority-algorithms", "constraint-solving"]
    depends_on: ["TASK-001"]
    subtasks:
      - id: "SUBTASK-004"
        title: "Implement priority weighting algorithm"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-005"
        title: "Add constraint validation system"
        type: "implementation"
        estimated_minutes: 90
        status: "ready"
      - id: "SUBTASK-006"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 30
        status: "ready"
  - id: "TASK-003"
    title: "Next Task Recommendation API"
    agent_type: "backend-specialist"
    status: "blocked"
    estimated_hours: 4
    context_requirements: ["api-design", "filtering-logic"]
    depends_on: ["TASK-002"]
    subtasks:
      - id: "SUBTASK-007"
        title: "Build getNextTask() with filtering"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-008"
        title: "Add batch recommendation support"
        type: "implementation"
        estimated_minutes: 90
        status: "ready"
      - id: "SUBTASK-009"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 30
        status: "ready"
  - id: "TASK-004"
    title: "CLI Integration & Commands"
    agent_type: "cli-specialist"
    status: "blocked"
    estimated_hours: 2
    context_requirements: ["cli-patterns", "task-routing-api"]
    depends_on: ["TASK-003"]
    subtasks:
      - id: "SUBTASK-010"
        title: "Implement 'asd next' command"
        type: "implementation"
        estimated_minutes: 60
        status: "ready"
      - id: "SUBTASK-011"
        title: "Add task assignment commands"
        type: "implementation"
        estimated_minutes: 60
        status: "ready"
      - id: "SUBTASK-012"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
dependencies: []
acceptance_criteria:
  - "Agents can get next recommended task based on their capabilities"
  - "Task dependencies are validated before assignment"
  - "Priority weighting considers P0/P1/P2/P3 levels and constraints"
  - "System prevents assignment of blocked or unavailable tasks"
  - "CLI commands provide filtering by agent type, priority, phase"
---

# Task Router System

**Status**: Active | **Priority**: P0 (Critical) | **Owner**: Backend Specialist

## 🎯 Quick Start *(30 seconds)*

**What**: Intelligent task routing system that matches available tasks to agent capabilities with dependency validation and priority weighting

**Why**: Foundation for agentic workflows - enables "asd next" command to give agents contextually appropriate work

**Impact**: Core system enabling agent automation - agents can get next task without human intervention

### 🚀 AGENT PICKUP GUIDE
**➡️ Next Available Task**: **TASK-001** - Core Task Routing Engine  
**📋 Your Job**: Work on TASK-001 only, then update docs and hand off  
**🚦 Dependencies**: None - foundational system component

### 🚦 Current State *(AGENTS: Update this when you complete YOUR task)*
- **Next Available Task**: TASK-001 - Core Task Routing Engine
- **Current Task Status**: None - ready for pickup  
- **Overall Progress**: 0 of 4 tasks complete
- **Blockers**: None
- **Last Updated**: 2024-08-24 by System Architect

---

## 📋 Work Definition *(What needs to be built)*

### Problem Statement
Currently, there's no systematic way for agents to determine what task to work on next. The system can parse specs and track progress, but lacks:
- Intelligent task recommendation based on agent capabilities
- Dependency validation to prevent blocked task assignment
- Priority weighting and constraint filtering
- Agent capability matching for appropriate task assignment

### Solution Approach
Implement TaskRouter class that analyzes available tasks, validates dependencies, matches agent capabilities, and provides intelligent recommendations with priority weighting and filtering support.

### Success Criteria
- [ ] Agents can request next available task via "asd next" command
- [ ] Task dependencies prevent assignment of blocked tasks
- [ ] Agent capability matching ensures appropriate task assignment
- [ ] Priority weighting considers P0/P1/P2/P3 levels and phase constraints
- [ ] System supports filtering by agent type, priority, and phase
- [ ] Performance: Task routing completes in < 200ms for projects with 100+ specs

---

## 🏗️ Implementation Plan

### Technical Approach
Create TaskRouter class that loads all specs, analyzes task states, validates dependencies, matches agent capabilities, and provides filtered recommendations through CLI commands and programmatic API.

### Implementation Tasks *(Each task = one agent handoff)*

**TASK-001** 🤖 **Core Task Routing Engine** ⏳ **← READY FOR PICKUP** | Agent: Backend-Specialist

- [ ] Implement TaskRouter class with core routing logic
- [ ] Add dependency resolution system (task depends_on validation)
- [ ] Create agent capability matching based on agent_type and context_requirements
- [ ] Build task state filtering (ready/blocked/in_progress/complete)
- [ ] Add integration with existing SpecParser for loading task data
- [ ] Create task availability validation (not assigned, dependencies met)
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that core routing engine is ready
- **Files**: `lib/task-router.js`, integration with existing spec parser
- **Agent Instructions**: Focus on correctness and dependency validation, integrate with existing code patterns

**TASK-002** 🤖 **Priority & Constraint System** ⏸️ **← BLOCKED (waiting for TASK-001)** | Agent: Backend-Specialist

- [ ] Implement priority weighting algorithm (P0 > P1 > P2 > P3)
- [ ] Add phase constraint filtering (include/exclude phases)
- [ ] Create agent workload balancing (avoid over-assignment)
- [ ] Add estimated hours consideration for task selection
- [ ] Implement constraint validation system for agent assignments
- [ ] Add support for blocking/unblocking tasks dynamically
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that priority system is ready for API integration
- **Dependencies**: TASK-001 must be complete
- **Files**: Priority weighting logic, constraint validation system

**TASK-003** 🤖 **Next Task Recommendation API** ⏸️ **← BLOCKED (waiting for TASK-002)** | Agent: Backend-Specialist

- [ ] Build getNextTask(agentType, constraints) API method
- [ ] Implement task filtering by agent type, priority, phase, status
- [ ] Add batch recommendation support (getNextTasks with limit)
- [ ] Create task ranking algorithm combining priority, dependencies, agent fit
- [ ] Add "reason" metadata explaining why task was recommended
- [ ] Implement caching for performance with large spec sets
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify CLI specialist that routing API is ready for command integration
- **Dependencies**: TASK-002 must be complete  
- **Files**: Task recommendation API, ranking algorithms, caching layer

**TASK-004** 🤖 **CLI Integration & Commands** ⏸️ **← BLOCKED (waiting for TASK-003)** | Agent: CLI-Specialist

- [ ] Implement "asd next" command with agent type filtering
- [ ] Add "asd next --agent TYPE --priority P0,P1 --phase PHASE-1A" filtering
- [ ] Create "asd assign TASK-ID --agent AGENT-TYPE" command
- [ ] Add "asd block TASK-ID" and "asd unblock TASK-ID" commands
- [ ] Implement "asd tasks --status ready --agent TYPE" listing command
- [ ] Add help documentation and usage examples for all commands
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify product management that task routing system is complete
- **Dependencies**: TASK-003 must be complete
- **Files**: CLI command implementations, help documentation

**Legend**: ⏳ Ready for pickup | 🔄 In progress | ✅ Complete | ⏸️ Blocked

---

## ✅ Validation Requirements

### 📝 Documentation Checklist *(REQUIRED before committing YOUR task)*
- [ ] **Your Task Status**: Mark your task ✅ and update all subtasks to `- [x]`
- [ ] **Current State**: Update "Next Available Task" to show what task is ready next
- [ ] **Success Criteria**: Check off any criteria your task completed
- [ ] **Handoff**: Clear what the next agent should pick up
- [ ] **Architecture Updates**: Update architecture.md with TaskRouter implementation details

### 🧪 Testing Checklist *(Follow this exact order)*

**DURING DEVELOPMENT** *(Test as you build each piece)*
- [ ] **Dependency Validation**: Test task dependency resolution with various scenarios
- [ ] **Agent Matching**: Verify agent capability matching works correctly
- [ ] **Priority Sorting**: Test priority weighting with different P0-P3 combinations
- [ ] **Constraint Filtering**: Test phase and agent type filtering
- [ ] **Performance**: Verify routing performance with large spec datasets

**BEFORE COMMITTING** *(Required validation sequence)*
- [ ] **Integration Tests**: Test TaskRouter integration with existing SpecParser
- [ ] **CLI Commands**: Test all routing commands with various filter combinations
- [ ] **Edge Cases**: Test with empty specs, missing dependencies, invalid agent types
- [ ] **Types**: Run `pnpm typecheck` - fix all TypeScript errors
- [ ] **Linting**: Run `pnpm lint && pnpm format` - fix all style issues
- [ ] **Unit Tests**: Test individual routing components in isolation
- [ ] **Performance**: Verify routing stays under 200ms for 100+ spec projects

### 🌱 Task Routing Impact Check *(Required for routing functionality)*
- [ ] **Next Command**: Verify "asd next" returns appropriate task for different agent types
- [ ] **Dependency Blocking**: Test that blocked tasks are not recommended
- [ ] **Priority Ordering**: Confirm P0 tasks are prioritized over lower priorities
- [ ] **Agent Matching**: Verify tasks are only recommended to capable agents

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
- **System Architecture**: `docs/architecture.md` (TaskRouter component)
- **Existing Code**: `lib/feature-parser.js` (spec parsing), `lib/config-manager.js` (configuration)
- **CLI Patterns**: `bin/asd` (existing command structure)

### Implementation Patterns
- **Spec Parsing**: Use existing SpecParser for loading task data
- **Configuration**: Integrate with ConfigManager for agent capabilities
- **CLI Commands**: Follow existing commander.js patterns in bin/asd

### Dependencies
- **Requires**: SpecParser, ConfigManager, existing spec structure
- **Enables**: Agent automation, "asd next" workflow, intelligent task assignment

---

<details>
<summary><strong>📖 Detailed Requirements & Design</strong> <em>(Expand when needed)</em></summary>

## Detailed Requirements

### REQ-001: Intelligent Task Recommendation
**As a** AI agent  
**I want** to get the next most appropriate task for my capabilities  
**So that** I can work efficiently without manual task assignment

**Acceptance Criteria**:
- [ ] TaskRouter analyzes all available tasks and recommends best match
- [ ] Recommendations consider agent type, capabilities, and context requirements
- [ ] Blocked tasks (missing dependencies) are never recommended
- [ ] Priority weighting ensures P0 tasks are preferred over lower priorities
- [ ] System provides reasoning for why a task was recommended

### REQ-002: Dependency Validation
**As a** system user  
**I want** task dependencies to be validated before assignment  
**So that** agents don't work on tasks that can't be completed

**Acceptance Criteria**:
- [ ] Tasks with unmet dependencies are marked as blocked
- [ ] Dependency chains are resolved correctly (A depends on B depends on C)
- [ ] Circular dependencies are detected and flagged
- [ ] Dynamic dependency updates are supported (blocking/unblocking)
- [ ] Clear error messages explain why tasks are blocked

### REQ-003: Agent Capability Matching
**As a** project manager  
**I want** tasks assigned only to agents with appropriate capabilities  
**So that** work quality remains high and tasks are completed successfully

**Acceptance Criteria**:
- [ ] Tasks specify required agent types (product-manager, ui-developer, etc.)
- [ ] Tasks specify context requirements (strategic-vision, technical-patterns, etc.)
- [ ] Agent capability profiles define what each agent type can handle
- [ ] Mismatched assignments are prevented with clear explanations
- [ ] System suggests alternative agents when primary choice unavailable

### REQ-004: Performance & Scalability
**As a** system user  
**I want** task routing to be fast and responsive  
**So that** agent workflows aren't slowed down by routing overhead

**Acceptance Criteria**:
- [ ] Task routing completes in < 200ms for projects with 100+ specs
- [ ] Caching optimizes repeated routing requests
- [ ] Memory usage stays reasonable for large spec sets
- [ ] System handles concurrent routing requests safely
- [ ] Performance degrades gracefully with very large datasets

## Technical Design Details

### TaskRouter Class Architecture
```javascript
class TaskRouter {
  constructor(specParser, configManager) {
    this.specParser = specParser;
    this.configManager = configManager;
    this.cache = new Map();
  }

  // Core routing methods
  getNextTask(agentType, constraints = {})     // Primary recommendation API
  getNextTasks(agentType, limit = 5)           // Batch recommendations
  assignTask(taskId, agentId)                  // Task assignment
  blockTask(taskId, reason)                    // Dynamic blocking
  unblockTask(taskId)                          // Remove blocks

  // Analysis methods
  getDependencyChain(taskId)                   // Dependency tree analysis
  getReadyTasks(filters = {})                  // Available task queue
  getBlockedTasks()                           // Tasks waiting on dependencies
  validateAssignment(taskId, agentType)        // Assignment validation

  // Internal methods
  _loadAllTasks()                             // Load from SpecParser
  _validateDependencies(taskId)               // Check if dependencies met
  _matchAgentCapabilities(task, agentType)    // Capability matching
  _calculatePriority(task, constraints)       // Priority scoring
  _updateCache()                              // Cache management
}
```

### Priority Weighting Algorithm
```javascript
const priorityWeights = {
  'P0': 1000,  // Critical - always prioritized
  'P1': 100,   // High - important work
  'P2': 10,    // Medium - normal priority
  'P3': 1      // Low - background tasks
};

const calculateTaskScore = (task, agentType, constraints) => {
  let score = priorityWeights[task.priority] || 1;
  
  // Boost for perfect agent match
  if (task.agent_type === agentType) score *= 2;
  
  // Boost for phase alignment
  if (constraints.phase && task.phase === constraints.phase) score *= 1.5;
  
  // Penalty for context mismatch
  const requiredContext = task.context_requirements || [];
  const agentCapabilities = this.getAgentCapabilities(agentType);
  const contextMatch = requiredContext.every(req => 
    agentCapabilities.context_requirements.includes(req)
  );
  if (!contextMatch) score *= 0.5;
  
  return score;
};
```

### CLI Command Examples
```bash
# Basic next task
asd next --agent product-manager

# Filtered recommendations
asd next --agent ui-developer --priority P0,P1 --phase PHASE-1A

# Task management
asd assign TASK-001 --agent backend-specialist
asd block TASK-002 --reason "Waiting for design approval"
asd unblock TASK-002

# Task listing and analysis
asd tasks --status ready --agent product-manager
asd tasks --blocked --show-reasons
asd dependencies --task TASK-001 --depth 2
```

## Testing Strategy Details

### Unit Tests
- TaskRouter core methods with various agent types and constraints
- Dependency validation with complex dependency chains
- Priority weighting algorithm with different scenarios
- Agent capability matching logic

### Integration Tests  
- TaskRouter integration with SpecParser and ConfigManager
- End-to-end task recommendation workflow
- CLI command integration with routing system
- Performance testing with large spec datasets

### Edge Case Tests
- Empty spec sets and missing tasks
- Circular dependencies and invalid references
- Agent types with no matching tasks
- Priority conflicts and constraint violations

</details>

---

## 💡 Implementation Notes *(Update as you learn)*

### Key Decisions
- TaskRouter integrates with existing SpecParser rather than reimplementing parsing
- Caching layer improves performance for repeated routing requests
- Agent capability matching uses context_requirements field from task definitions

### Gotchas & Learnings  
- Dependency validation must handle circular references gracefully
- Priority weighting needs to balance urgency with agent capability fit
- Performance critical for large projects - caching and optimization required

### Future Improvements
- Machine learning for recommendation quality improvement
- Agent workload balancing and capacity planning
- Cross-project task routing and resource sharing

---

**Priority**: P0 - Foundation for agent automation  
**Effort**: 16 hours across routing engine, priority system, API, and CLI integration
**Impact**: Enables "asd next" workflow and intelligent agent task assignment