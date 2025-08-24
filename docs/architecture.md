# Architecture Documentation

This document describes the technical architecture of the Agentic Spec Development (ASD) CLI tool.

## Overview

ASD is designed as a modular, terminal-based application optimized for AI agent workflows. The architecture supports intelligent task routing, context continuity, and seamless agent handoffs while maintaining human readability and git-friendly storage.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ASD CLI                              │
├─────────────────────────────────────────────────────────────┤
│  CLI Layer (bin/asd)                                       │
│  ├── Command Parser (commander.js)                         │
│  ├── Core Commands (create, next, start, complete)        │
│  ├── Context Commands (research, context, assign)         │
│  └── Legacy Commands (init, config, doctor, start)        │
├─────────────────────────────────────────────────────────────┤
│  Agentic Workflow Layer                                   │
│  ├── TaskRouter - Intelligent task recommendations        │
│  ├── ContextInjector - Multi-layer context injection     │
│  ├── ProcessTemplateManager - Agent workflow templates    │
│  ├── WorkflowStateManager - Dynamic state & handoffs     │
│  └── AgentAssignment - Task-agent matching               │
├─────────────────────────────────────────────────────────────┤
│  Core Application Layer (lib/index.js)                     │
│  ├── ASDClient - Main application controller               │
│  ├── Terminal Management - Screen handling & events        │
│  ├── Panel System - Multi-panel layout engine             │
│  └── Memory Management - Performance optimization          │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                      │
│  ├── ConfigManager - Modern configuration management       │
│  ├── SpecParser - Hybrid frontmatter + markdown parsing   │
│  ├── DataAdapterFactory - Multi-format support           │
│  ├── ProgressCalculator - Progress tracking               │
│  ├── ValidationManager - Quality gates & checklists       │
│  └── UIComponents - Reusable UI elements                  │
├─────────────────────────────────────────────────────────────┤
│  Storage Layer                                            │
│  ├── Specifications (docs/specs/*.md) - Frontmatter specs │
│  ├── Context Storage (.asd/context/) - Research & notes   │
│  ├── Workflow State (.asd/assignments/) - Task tracking   │
│  └── Cache (.asd/cache/) - Performance optimization       │
├─────────────────────────────────────────────────────────────┤
│  External Dependencies                                     │
│  ├── terminal-kit - Terminal UI framework                  │
│  ├── js-yaml - YAML frontmatter parsing                   │
│  ├── chokidar - File system watching                      │
│  └── commander - CLI argument parsing                     │
└─────────────────────────────────────────────────────────────┘
```

## Data Architecture

### 1. Atomic Hierarchy Storage Model

The architecture follows a strict atomic hierarchy: **Roadmap → Phases → Specs → Tasks → Sub-tasks**, with each level optimized for different types of agent work and context injection.

**Human-Readable Project Structure**:
```
docs/
├── roadmap.md                           # Project roadmap with phase definitions
└── specs/
    ├── active/
    │   ├── FEAT-012-notifications.md    # phase: "PHASE-1A" in frontmatter
    │   └── FEAT-020-analytics.md        # phase: "PHASE-1B" in frontmatter
    ├── backlog/
    │   ├── SPEC-001-auth.md             # phase: "PHASE-1A" in frontmatter
    │   └── FEAT-021-exports.md          # phase: "PHASE-2" in frontmatter
    └── done/
        └── BUG-005-login-fix.md         # phase: "PHASE-1A" in frontmatter
```

**Agent Operational Data (Machine-Readable)**:
```
.asd/
├── context/
│   ├── roadmap.json                 # Project-level context & phase definitions
│   ├── specs/SPEC-*.json            # Feature research & architectural decisions
│   ├── tasks/TASK-*.json            # Task context & agent handoff data
│   └── subtasks/SUBTASK-*.json      # Sub-task execution context
├── assignments/
│   ├── current-specs.json           # Active feature-level assignments (with phase tags)
│   ├── current-tasks.json           # Active task-level assignments
│   └── current-subtasks.json        # Active sub-task assignments
├── workflows/
│   ├── agent-handoffs.json          # Agent transition tracking
│   ├── process-templates.json       # Standard workflow templates
│   └── context-requirements.json    # Agent-specific context needs
└── cache/
    ├── recommendations.json         # Multi-level task routing cache
    ├── phase-groupings.json         # Dynamic phase-based spec groupings
    └── dependencies.json            # Cross-level dependency graph
```

### 2. Atomic Hierarchy Specification Formats

**Roadmap Level (roadmap.md)**: Project organization and phase definitions
```yaml
---
id: "PROJECT-ROADMAP"
title: "ASD CLI Development Roadmap"
version: "0.1.0-alpha"
created: "2024-08-24T10:00:00Z"
phases:
  - id: "PHASE-1A"
    title: "Core Infrastructure & CLI"
    description: "Foundation components and basic CLI functionality"
    priority: 1
    target_completion: "2024-09-15"
    success_criteria:
      - "CLI installs and runs correctly"
      - "Basic TUI functionality complete"
      - "Configuration system working"
  - id: "PHASE-1B"
    title: "Advanced Features & Agent Integration"
    description: "Agentic workflows and context injection"
    priority: 2
    target_completion: "2024-10-15"
    depends_on: ["PHASE-1A"]
    success_criteria:
      - "Task routing system operational"
      - "Context injection working"
      - "Agent handoffs smooth"
  - id: "PHASE-2"
    title: "Integrations & Ecosystem"
    description: "External tool integrations and plugin system"
    priority: 3
    target_completion: "2024-11-15"
    depends_on: ["PHASE-1B"]
constraints:
  - "Must maintain backwards compatibility"
  - "Performance: < 2s response time"
  - "Node.js 18+ required"
---

# Project Roadmap

## Phase 1A: Core Infrastructure
[Context and goals for this phase]
```

**Spec Level (FEAT-012-notifications.md)**: Feature with phase tagging and task breakdown
```yaml
---
id: "FEAT-012"
title: "Real-time Chat Notifications"
type: "FEAT"
phase: "PHASE-1A"                        # Tag linking to roadmap phase definition
status: "active"
priority: "P1"
created: "2024-08-24T10:30:00Z"
assignee: "backend-specialist"
estimated_hours: 20
tags: ["chat", "real-time", "notifications"]
tasks:
  - id: "TASK-001"
    title: "Research WebSocket architecture"
    agent_type: "research-specialist"
    status: "completed"
    estimated_hours: 4
    context_requirements: ["project-constraints", "tech-stack"]
    subtasks:
      - id: "SUBTASK-001"
        title: "Evaluate WebSocket libraries"
        type: "implementation"
        estimated_minutes: 120
        status: "completed"
      - id: "SUBTASK-002"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 60
        status: "completed"
      - id: "SUBTASK-003"
        title: "Product management tasks"
        type: "product_management"
        estimated_minutes: 30
        status: "completed"
  - id: "TASK-002"
    title: "Implement push notification service"
    agent_type: "backend-specialist"
    status: "ready"
    estimated_hours: 8
    context_requirements: ["task-001-research", "api-patterns"]
    depends_on: ["TASK-001"]
    subtasks:
      - id: "SUBTASK-004"
        title: "Core service implementation"
        type: "implementation"
        estimated_minutes: 360
        status: "ready"
      - id: "SUBTASK-005"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-006"
        title: "Product management tasks"
        type: "product_management"
        estimated_minutes: 60
        status: "ready"
dependencies:
  - "FEAT-008"  # Notification permissions
acceptance_criteria:
  - "Users receive notifications within 2 seconds"
  - "Custom sounds work on all platforms"
  - "Works across Chrome, Firefox, Safari"
---

# Real-time Chat Notifications

## User Story
As a chat user, I want instant notifications for new messages so I can respond quickly.

## Technical Implementation
- WebSocket connection for real-time updates
- Service Worker for background notifications
- Integration with existing permission system

## Research Notes
- Evaluated WebSocket vs Server-Sent Events
- Tested notification reliability across browsers
- Analyzed performance impact on mobile devices
```

## Workflow Components

### 1. ProcessTemplateManager (Agent Workflow Standardization)

**Location**: `lib/workflow/process-template-manager.js`  
**Purpose**: Standardizes agent workflows, validation checklists, and context requirements across specifications.

**Key Features**:
- Agent-specific workflow templates (product-manager, ui-developer, etc.)
- Reusable validation checklists by task type
- Context requirement patterns for consistent agent experience
- Documentation rules enforcement ("UPDATE THIS DOCUMENT INLINE")

```javascript
class ProcessTemplateManager {
  getAgentWorkflow(agentType, taskType)        // Standard workflow steps
  getValidationChecklist(taskType)            // Quality gates by task
  getContextRequirements(taskId, agentType)   // Required context injection
  getDocumentationRules()                     // Inline update patterns
}
```

**Real-world Example** (from FEAT-037 PRD analysis):
```json
{
  "product-manager": {
    "workflow_steps": [
      "Product Check: Ensure feature spec exists and numbering correct",
      "Check Status: Identify next available task",
      "Gather Context: Read task-specific context files",
      "Plan Work: Use todowrite for >3 subtasks",
      "Execute: Complete ONLY assigned task"
    ],
    "documentation_rules": {
      "never_create": "completion documents at project root",
      "always_update": "this document inline with task status",
      "handoff_required": "update Next Available Task section"
    }
  }
}
```

### 2. WorkflowStateManager (Dynamic State & Handoffs)

**Location**: `lib/workflow/workflow-state-manager.js`  
**Purpose**: Manages real-time workflow state, task handoffs, and inline documentation updates.

**Key Features**:
- Dynamic "next available task" calculation
- Inline frontmatter updates (no separate completion docs)
- Agent handoff detection and automation
- Progress tracking with dependency validation

```javascript
class WorkflowStateManager {
  updateTaskProgress(specId, taskId, status)   // Update task status
  getNextAvailableTask(specId, constraints)    // Smart task routing
  updateInlineDocumentation(specPath, updates) // Frontmatter updates
  validateHandoffReadiness(specId, taskId)     // Check completion requirements
}
```

**State Management Pattern**:
```javascript
// Updates spec frontmatter directly
const stateUpdate = {
  tasks: [
    {
      id: "TASK-001",
      status: "completed",      // Changed from "in_progress"
      completed_at: "2024-08-24T15:30:00Z"
    },
    {
      id: "TASK-002", 
      status: "ready"           // Auto-updated when TASK-001 completes
    }
  ],
  current_task: "TASK-002",     // Auto-calculated next available
  progress: "1 of 4 tasks complete"
};
```

### 3. ContextInjector (Multi-Layer Context)

**Location**: `lib/workflow/context-injector.js`  
**Purpose**: Sophisticated context injection with layered relevance and agent-specific filtering.

**Context Layers** (by injection priority):
1. **Critical Context**: Always injected (success criteria, documentation rules)
2. **Task-Specific Context**: Required reading and focus areas for current task
3. **Agent-Specific Context**: Context filtered by agent type requirements
4. **Process Context**: Validation templates and workflow patterns

```javascript
class ContextInjector {
  injectTaskContext(taskId, agentType) {
    return {
      critical: this.getCriticalContext(specId),
      task_specific: this.getTaskContext(taskId),
      agent_specific: this.getAgentContext(agentType),
      process_templates: this.getProcessContext(taskType)
    };
  }
  
  filterByRelevance(context, agentType, taskType)  // Smart filtering
  getRequiredReading(taskId, agentType)           // Dynamic reading lists
}
```

**Context Injection Example** (TASK-001: Product Manager):
```json
{
  "critical": {
    "success_criteria": ["3+ minutes on dashboard", "40% DAU increase"],
    "documentation_rules": "UPDATE THIS DOCUMENT INLINE - never create completion docs",
    "handoff_process": "Work on ONE TASK then hand off to next agent"
  },
  "task_specific": {
    "required_reading": [
      "@docs/product/ai-context/implementation-rules.md",
      "@apps/web/app/home/(user)/page.tsx",
      "@docs/product/strategic/vision.md"
    ],
    "focus_areas": ["user retention", "engagement patterns", "mobile-first"]
  },
  "agent_specific": {
    "product_manager": {
      "deliverables": ["PRD document", "user research", "wireframes"],
      "validation_focus": ["strategic alignment", "user story quality"]
    }
  },
  "process_templates": {
    "validation_checklist": ["Mark task complete", "Update next task", "Commit changes"]
  }
}
```

## Core Components

### 1. ASDClient (Main Controller)

**Location**: `lib/index.js`  
**Purpose**: Central application controller orchestrating all components.

**Enhanced Responsibilities**:
- Application lifecycle management
- Agentic workflow coordination
- Context-aware UI rendering
- Agent handoff management

### 2. TaskRouter (Agentic Workflow)

**Location**: `lib/workflow/task-router.js`  
**Purpose**: Intelligent task recommendation and routing system.

**Key Features**:
- Agent capability matching
- Dependency-aware scheduling
- Priority-based recommendations
- Context-driven task selection

```javascript
class TaskRouter {
  getNextTask(agentType, constraints = {})     // Smart task recommendation
  assignTask(taskId, agentId)                  // Task assignment
  getDependencyChain(taskId)                   // Dependency analysis
  getReadyTasks(filter = {})                   // Available work queue
}
```

**Task Selection Algorithm**:
```
Input: Agent Type + Constraints
↓
1. Filter by Agent Capabilities
2. Check Dependencies (ready tasks only)
3. Apply Priority Weighting
4. Consider Context Relevance
5. Return Ranked Recommendations
```

### 3. ContextInjector (Knowledge Management)

**Location**: `lib/workflow/context-injector.js`  
**Purpose**: Research continuity and context preservation across agent handoffs.

**Context Layers**:
1. **Project Context**: Tech stack, standards, constraints
2. **Feature Context**: Research, user stories, acceptance criteria  
3. **Task Context**: Prerequisites, implementation notes, blockers
4. **Agent Context**: Previous work, patterns, learned approaches

```javascript
class ContextInjector {
  injectContext(taskId, agentType)            // Get relevant context
  saveResearch(taskId, content, type)         // Store research findings
  getRelatedContext(entityId, depth = 2)      // Find related knowledge
  updateProjectKnowledge(findings)            // Update global context
}
```

**Context Relevance Scoring**:
```javascript
const relevanceScore = {
  directDependency: 1.0,      // Prerequisite task output
  featureResearch: 0.9,       // Same feature research
  projectConstraint: 0.8,     // Project-wide rules
  similarPattern: 0.7,        // Related implementation
  agentHistory: 0.6           // Agent's previous work
};
```

### 4. SpecParser (Enhanced Data Layer)

**Location**: `lib/spec-parser.js`  
**Purpose**: Robust parsing with bulletproof error handling.

**Parsing Pipeline**:
```
Specification File
↓
1. YAML Frontmatter Extraction (structured data)
2. Markdown Body Parsing (optional context)
3. Schema Validation (ensure data integrity)
4. Fallback Generation (graceful degradation)
5. Context Enrichment (inject related data)
↓
Structured Specification Object
```

**Error Handling Strategy**:
- **Critical Data**: Always from frontmatter (never fails)
- **Optional Data**: Markdown parsing with fallbacks
- **UI Protection**: Never crash on malformed files
- **Auto-Correction**: Fix common formatting issues

```javascript
class SpecParser {
  async loadSpecs()                           // Load all specifications
  parseSpecFile(filePath, fallbackData)      // Parse with error recovery
  validateStructure(spec)                     // Schema validation
  enrichWithContext(spec)                     // Add related context
}
```

### 5. ConfigManager (Simplified)

**Location**: `lib/config-manager.js`  
**Purpose**: Clean, modern configuration management.

**Configuration Schema**:
```javascript
const modernConfig = {
  dataPath: "docs/specs",           // Specification storage
  templatePath: "docs/templates",   // Spec templates
  dataFormat: "markdown",           // Primary format
  structure: {
    active: "active",
    backlog: "backlog", 
    done: "done"
  },
  cli: {
    defaultPriority: "P2",
    supportedTypes: ["SPEC", "FEAT", "BUG", "SPIKE", "MAINT"],
    statusFolders: ["active", "backlog", "done"],
    priorities: ["P0", "P1", "P2", "P3"]
  },
  workflow: {
    autoAssignTasks: true,
    contextDepth: 2,
    cacheRecommendations: true
  }
};
```

**Removed Legacy Support**: No backward compatibility baggage for clean alpha.

## Agentic Workflow System

### 1. Atomic Hierarchy CLI Commands

**Roadmap Level Commands**:
```bash
# Project roadmap management
asd roadmap status                 # Show overall project status
asd roadmap phases                 # List all defined phases
asd roadmap phase PHASE-1A --specs --progress  # Show phase status and tagged specs
asd roadmap validate-deps          # Check phase dependency violations
asd roadmap next-ready --current PHASE-1A  # Find specs ready for next phase
```

**Spec Level Commands**:
```bash
# Feature/spec management with phase tagging
asd create spec "Feature Name" --phase PHASE-1A --priority P1
asd assign spec FEAT-012 --agent backend-specialist
asd list specs --phase PHASE-1A --status active
asd move spec FEAT-012 --to-phase PHASE-1B --validate-deps
asd retag spec FEAT-012 --phase PHASE-2    # Simple retag without validation
asd list specs --phase PHASE-1A,PHASE-1B --priority P0  # Cross-phase filtering
```

**Task Level Commands**:
```bash
# Task workflow (context-rich agent handoffs with phase awareness)
asd next task --agent research-specialist --phase PHASE-1A
asd next task --exclude-phase PHASE-2      # Work on anything except Phase 2
asd start task FEAT-012 TASK-001 --inject-context spec,project,phase
asd complete task FEAT-012 TASK-001 --research "WebSocket analysis complete"
asd create subtasks FEAT-012 TASK-001 --template standard
```

**Sub-task Level Commands**:
```bash
# Granular work management
asd next subtask --agent current --task TASK-001
asd complete subtask FEAT-012 TASK-001 SUBTASK-001
asd status subtasks --task TASK-001 --type validation
```

**Context Injection Commands**:
```bash
# Multi-level context management with phase context
asd context roadmap                # Project-level constraints & phase definitions
asd context phase PHASE-1A         # Phase-specific goals & success criteria
asd context spec FEAT-012          # Feature research & decisions  
asd context task FEAT-012 TASK-001 # Task-specific context
asd research add --task TASK-001 "Performance benchmarks"
```

### 2. Atomic Hierarchy Workflow States

**Multi-Level State Management**:
```
Spec Level:    backlog → active → done
Task Level:    ready → assigned → in_progress → complete
Sub-task Level: ready → in_progress → validation → complete
```

**State Transitions by Level**:

**Spec States**:
- `backlog`: Waiting for phase activation
- `active`: Tasks being worked on
- `done`: All tasks completed

**Task States** (Agent handoff points):
- `ready`: Available for agent assignment
- `assigned`: Allocated to specific agent type
- `in_progress`: Agent working with injected context
- `complete`: Finished with research/findings captured

**Sub-task States** (Granular progress tracking):
- `ready`: Available within active task
- `in_progress`: Current focus of agent work
- `validation`: Being tested/reviewed
- `complete`: Finished and validated

**Standard Sub-task Template** (Applied to every task):
- Implementation sub-task (core work)
- Validation sub-task (testing/review)
- Product management sub-task (documentation/handoff)

### 3. Context Injection System

> **📋 Complete Documentation**: See [Context Injection System](./context-injection-system.md) for detailed workflows, file structures, update triggers, and CLI commands.

**Multi-Layer Context Injection Overview**:

**Multi-Layer Context Injection Flow** (Based on real-world PRD analysis):
```
asd start task FEAT-037 TASK-001 --agent product-manager
↓
1. CRITICAL Context (Always Injected):
   - Success criteria, documentation rules, handoff process
2. TASK-SPECIFIC Context (Per task requirements):
   - Required reading: implementation-rules.md, current-dashboard.tsx, vision.md
   - Focus areas: user retention, engagement patterns, mobile-first
3. AGENT-SPECIFIC Context (Filtered by agent type):
   - Product manager needs: strategic alignment, user research patterns
   - Deliverables: PRD document, wireframes, user stories
4. PROCESS Context (Template-based):
   - Validation checklist, documentation rules, quality gates
5. Begin Multi-Layer Context-Aware Work
```

**Context Prioritization Strategy**:
```javascript
const contextPriority = {
  critical: 1.0,           // Success criteria, core workflow rules
  task_specific: 0.9,      // Required reading, focus areas
  agent_specific: 0.8,     // Agent type requirements, deliverables  
  process_templates: 0.7,  // Validation checklists, quality gates
  reference: 0.5           // Background material, debugging info
};
```

**Task → Sub-task Context Inheritance** (With process templates):
```
asd next subtask --task TASK-001 --type implementation
↓
1. Inherit Layered Task Context (all 4 layers from task start)
2. Load Sub-task Template:
   - Implementation: Core development work (est. 60-80% of task time)
   - Validation: Testing, quality gates (est. 15-25% of task time)
   - Product Management: Documentation, handoffs (est. 5-15% of task time)
3. Apply Process Workflow (from ProcessTemplateManager):
   - Agent-specific validation requirements
   - Quality gate checklists by sub-task type
   - Documentation update patterns
4. Begin Template-Guided Sub-task Work
```

**Standard Sub-task Templates** (Applied to every task):
```yaml
subtask_templates:
  implementation:
    focus: "Core feature development"
    typical_duration: "60-80% of task estimate"
    validation_required: ["unit tests", "integration tests", "type checking"]
  validation:
    focus: "Testing, quality assurance, performance"
    typical_duration: "15-25% of task estimate" 
    validation_required: ["E2E tests", "performance tests", "accessibility"]
  product_management:
    focus: "Documentation, handoffs, progress tracking"
    typical_duration: "5-15% of task estimate"
    validation_required: ["inline doc updates", "next task preparation", "handoff notes"]
```

**Multi-Level Context Storage**:
```javascript
// .asd/context/tasks/TASK-001.json
{
  "task_id": "TASK-001",
  "spec_id": "FEAT-012",
  "phase_id": "PHASE-1A",
  "agent_type": "research-specialist",
  "started_at": "2024-08-24T14:00:00Z",
  "context_layers": {
    "roadmap": {
      "constraints": ["Node.js 18+", "< 2s response time"],
      "tech_stack": ["terminal-kit", "commander.js"],
      "phases": {"PHASE-1A": "Core Infrastructure", "PHASE-1B": "Advanced Features"}
    },
    "phase": {
      "id": "PHASE-1A",
      "title": "Core Infrastructure & CLI",
      "priority": 1,
      "success_criteria": ["CLI installs correctly", "Basic TUI complete"],
      "target_completion": "2024-09-15"
    },
    "spec": {
      "feature_goal": "Real-time notifications",
      "acceptance_criteria": ["< 2s delivery", "cross-browser"]
    },
    "agent_requirements": {
      "research-specialist": ["project-constraints", "tech-stack", "existing-research"]
    }
  },
  "subtasks_created": [
    {"id": "SUBTASK-001", "type": "implementation"},
    {"id": "SUBTASK-002", "type": "validation"},  
    {"id": "SUBTASK-003", "type": "product_management"}
  ],
  "research_findings": []
}
```

## Atomic Hierarchy Data Flow

### 1. Multi-Level Agent Workflow Initialization

**Spec-Level Agent Assignment**:
```
Agent Request: "Get next spec to work on"
↓
RoadmapRouter Analysis:
- Phase readiness assessment
- Agent capability matching
- Cross-spec dependency validation
↓
Spec Context Preparation:
- Project constraints & goals
- Phase objectives & timeline
- Related spec research
↓ 
Spec Assignment with Multi-Layer Context
```

**Task-Level Agent Handoff** (Most common):
```
Agent Request: "Get next task" --agent research-specialist
↓
TaskRouter Analysis:
- Agent type capability matching
- Task dependency validation (within spec)
- Priority and phase alignment
↓
Task Context Injection:
- Inherit spec context (feature goals, constraints)
- Load agent-specific requirements
- Prepare task workspace (.asd/context/tasks/)
↓
Task Assignment with Hierarchical Context
```

**Sub-task Workflow** (Granular execution):
```
Current Agent: "Get next sub-task" --task TASK-001
↓
Sub-task Template Application:
- Standard template: implementation → validation → product_management
- Inherit task context and research
- Apply agent process workflows
↓
Sub-task Execution with Process Context
```

### 2. Hierarchical Context-Aware Execution

**Task Execution with Multi-Level Context**:
```
Agent Starts Task (e.g., research-specialist on TASK-001)
↓
Hierarchical Context Loading:
- Roadmap Level: project constraints, tech stack
- Phase Level: objectives, timeline, dependencies  
- Spec Level: feature goals, acceptance criteria, research
- Task Level: specific requirements, agent type needs
↓
Agent-Specific Context Filtering:
- research-specialist needs: ["project-constraints", "existing-research", "tech-stack"]
- backend-specialist needs: ["api-patterns", "database-schema", "performance-requirements"]
↓
Sub-task Template Creation:
- SUBTASK-001: Core research/implementation (est. 120 min)
- SUBTASK-002: Validation & testing (est. 60 min)
- SUBTASK-003: Product management tasks (est. 30 min)
↓
Context-Rich Task Execution
```

**Sub-task Execution Pattern**:
```
Agent Works on Sub-task (e.g., SUBTASK-001: "Evaluate WebSocket libraries")
↓
Inherited Context:
- Task research requirements
- Project technical constraints
- Agent process workflows
↓
Focused Sub-task Work:
- Specific deliverable (library comparison)
- Time-boxed execution (120 minutes)
- Process-guided workflow
↓
Sub-task Completion → Next Sub-task (validation)
```

### 3. Multi-Level Knowledge Accumulation

**Sub-task → Task Knowledge Roll-up**:
```
Sub-task Completion (SUBTASK-001: WebSocket library evaluation)
↓
Sub-task Knowledge Capture:
- Specific findings ("socket.io recommended")
- Process insights ("library comparison took 90 min vs 120 est")
- Validation results ("performance benchmarks completed")
↓
Task Context Update:
- Research findings aggregated
- Implementation decisions recorded
- Next sub-task context prepared
```

**Task → Spec Knowledge Roll-up**:
```
Task Completion (TASK-001: Research complete)
↓
Task Knowledge Extraction:
- Technical decisions ("WebSocket > Server-Sent Events")
- Architectural constraints ("Must integrate with existing auth")
- Implementation guidance ("Use socket.io v4.7+")
↓
Spec Context Update:
- Feature research consolidated
- Next task context prepared
- Cross-task dependencies updated
```

**Spec → Phase Knowledge Roll-up**:
```
Spec Completion (FEAT-012: Notifications complete)
↓
Spec Knowledge Accumulation:
- Feature patterns ("Real-time notification architecture")
- Integration lessons ("Auth system integration approach")
- Performance insights ("WebSocket connection pooling")
↓
Phase & Project Context Update:
- Reusable patterns cataloged
- Project constraints refined
- Future spec guidance enhanced
```

## Performance Considerations

### 1. Context Loading Optimization
- **Lazy Loading**: Context loaded only when needed
- **Relevance Filtering**: Only high-relevance context included
- **Caching Strategy**: Frequently accessed context cached
- **Size Limits**: Context summaries to prevent prompt bloat

### 2. File System Efficiency
- **Structured Storage**: JSON for structured data, markdown for content
- **Selective Watching**: Monitor only active specifications
- **Batch Operations**: Group file system operations
- **Cache Invalidation**: Smart cache updates on file changes

### 3. Memory Management
- **Context Cleanup**: Remove stale context data
- **Cache Rotation**: Expire old recommendations
- **Workflow Garbage Collection**: Archive completed workflows
- **Progressive Loading**: Load specifications on demand

## Security and Safety

### 1. File System Safety
- **Path Validation**: Prevent directory traversal
- **Sandbox Operations**: Limit file system access
- **Permission Checking**: Validate write permissions
- **Backup Strategy**: Automated backups before modifications

### 2. Context Privacy
- **Sensitive Data Filtering**: Remove credentials from context
- **Access Control**: Context scoped to relevant agents
- **Audit Logging**: Track context access patterns
- **Data Retention**: Automatic cleanup of old context

### 3. Agent Safety
- **Input Validation**: Sanitize all agent inputs
- **Command Restrictions**: Whitelist allowed operations
- **Resource Limits**: Prevent resource exhaustion
- **Error Boundaries**: Graceful failure handling

## Atomic Workflow Features

### 1. Smart Agent Assignment & Context Matching
- **Agent Capability Profiles**: Track specializations and performance patterns
- **Context Requirement Matching**: Auto-assign based on `context_requirements` field
- **Learning from Handoffs**: Improve agent-task matching from completion data
- **Multi-Agent Coordination**: Handle dependencies between concurrent tasks

### 2. Hierarchical Context Management
- **Context Inheritance Optimization**: Smart filtering of relevant context layers
- **Agent-Specific Context Templates**: Pre-configured context sets by agent type
- **Research Continuity**: Seamless knowledge transfer between agent handoffs  
- **Cross-Spec Pattern Recognition**: Identify reusable approaches across features

### 3. Process Template System
- **Customizable Sub-task Templates**: Beyond standard implementation/validation/PM
- **Agent Process Workflows**: Specialized procedures for different agent types
- **Quality Gates**: Automated validation between sub-task transitions
- **Time Estimation Learning**: Improve estimates from actual completion data

### 4. Atomic Hierarchy Extensions
- **Epic Level**: For multi-phase initiatives spanning releases
- **Cross-Phase Dependencies**: Manage dependencies between phase boundaries
- **Phase Transition Automation**: Auto-promote specs based on completion criteria
- **Roadmap Analytics**: Progress tracking across all hierarchy levels

This atomic hierarchy architecture provides a robust foundation for agentic development workflows with clear separation of concerns at each level. The hierarchical storage model ensures optimal context injection for different types of agent work while maintaining human readability and git-friendly collaboration.

**Key Documentation**:
- [Context Injection System](./context-injection-system.md) - Complete context workflow, file structures, and CLI commands
- This document (architecture.md) - High-level system architecture and component relationships

Each level of the hierarchy (Roadmap → Phases → Specs → Tasks → Sub-tasks) serves specific purposes in the agent workflow, from high-level project planning to granular execution tracking, creating a seamless collaborative environment between human product managers and AI development agents.