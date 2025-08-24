# Context Injection System

This document defines the complete context injection workflow for ASD's agentic development system.

## Overview

The context injection system provides multi-layer context to AI agents based on their role, current task, and project state. It follows Claude's pattern of MD files with YAML frontmatter that can be managed via CLI commands.

## File Structure

```
.asd/
├── agents/                           # Agent Definitions (Like Claude sub-agents)
│   ├── product-manager.md            # YAML + workflow instructions
│   ├── ui-developer.md               # Agent capabilities + context needs
│   ├── backend-specialist.md
│   └── research-specialist.md
├── processes/                        # Workflow Templates (Customizable)
│   ├── validation-checklist.md      # Quality gates by task type
│   ├── handoff-process.md            # Agent transition workflows
│   ├── documentation-rules.md       # Inline update patterns
│   └── testing-standards.md         # E2E and validation requirements
├── context/                          # Context Storage (MD + YAML)
│   ├── project.md                   # Project-wide constraints & tech stack
│   ├── specs/
│   │   ├── FEAT-037.md              # Spec-specific research & decisions
│   │   └── FEAT-038.md
│   ├── tasks/
│   │   ├── TASK-001.md              # Task context & agent handoff data
│   │   └── TASK-002.md
│   └── patterns/                    # Learned patterns & best practices
│       ├── dashboard-components.md
│       └── testing-approaches.md
├── state/                           # Dynamic State (JSON for performance)
│   ├── assignments.json             # Current task assignments
│   ├── progress.json                # Real-time progress tracking
│   └── handoffs.json                # Agent transition state
└── config/                          # Configuration (JSON)
    ├── agent-capabilities.json      # What each agent type can do
    └── workflow-templates.json      # Configurable process patterns
```

## Context Types & Update Patterns

### Static Context (Config-Based, Rarely Changes)

**Storage**: `.asd/config/` and `.asd/agents/`
**Update Method**: Manual edit + CLI customization
**Examples**: Agent capabilities, workflow templates, project tech stack

### Dynamic Context (Frequently Updated, Auto-Managed)

**Storage**: `.asd/state/`
**Update Method**: Automatic (triggered by CLI commands)
**Examples**: Task assignments, progress tracking, handoff state

### Semi-Dynamic Context (Research & Learning)

**Storage**: `.asd/context/`
**Update Method**: CLI commands + automatic accumulation
**Examples**: Research findings, implementation decisions, learned patterns

### Process Context (Workflow Templates)

**Storage**: `.asd/processes/`
**Update Method**: Manual edit (customizable by user)
**Examples**: Validation checklists, handoff procedures, quality gates

## Update Triggers

### Automatic Update Triggers

| **CLI Command** | **Files Updated** | **Update Type** |
|----------------|------------------|-----------------|
| `asd start task FEAT-037 TASK-001 --agent product-manager` | `.asd/state/assignments.json`, `.asd/context/tasks/TASK-001.md`, spec frontmatter | Real-time |
| `asd complete subtask FEAT-037 TASK-001 SUBTASK-002` | `.asd/state/assignments.json`, task context, spec frontmatter | Real-time |
| `asd research add --task TASK-001 "Performance data"` | `.asd/context/tasks/TASK-001.md`, `.asd/context/specs/FEAT-037.md` | Immediate |
| `asd complete task FEAT-037 TASK-001` | Multiple: state, context, handoff preparation | Batched |

### CLI-Triggered Updates

| **CLI Command** | **Purpose** | **Files Updated** |
|----------------|-------------|------------------|
| `asd context add --spec FEAT-037 --constraint "Mobile performance critical"` | Add spec context | `.asd/context/specs/FEAT-037.md` |
| `asd agent customize product-manager --add-step "Performance validation"` | Customize workflow | `.asd/agents/product-manager.md` |
| `asd process update validation-checklist --add-step "Accessibility testing"` | Update quality gates | `.asd/processes/validation-checklist.md` |

### Manual Edit Support

Users can directly edit any `.asd/` files for advanced customization:
- `.asd/agents/product-manager.md` - Modify agent workflow and context requirements
- `.asd/processes/validation-checklist.md` - Update quality gates and testing requirements
- `.asd/context/project.md` - Add project constraints and learned patterns

## Context Injection Flow

### 4-Layer Context System

When an agent starts a task, context is injected in priority order:

1. **Critical Context** (Always injected)
   - Success criteria from spec
   - Documentation rules and handoff process
   - Project constraints and tech stack

2. **Task-Specific Context** (Per task requirements)
   - Required reading lists
   - Focus areas and deliverables
   - Task dependencies and prerequisites

3. **Agent-Specific Context** (Filtered by agent type)
   - Agent capabilities and validation focus
   - Previous work patterns and learnings
   - Specialized tools and approaches

4. **Process Context** (Template-based)
   - Validation checklists for task type
   - Quality gates and testing requirements
   - Handoff procedures and documentation rules

### Context Injection Example

```bash
asd start task FEAT-037 TASK-001 --agent product-manager
```

Results in context injection:
```json
{
  "critical": {
    "success_criteria": ["3+ minutes on dashboard", "40% DAU increase"],
    "documentation_rules": "UPDATE THIS DOCUMENT INLINE - never create completion docs",
    "project_constraints": ["Node.js 18+", "< 2s response time"]
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

## Agent Definition Format

Following Claude's sub-agent pattern, each agent is defined in a markdown file:

**`.asd/agents/product-manager.md`**:
```yaml
---
id: "product-manager"
capabilities:
  - "User research and analysis"
  - "PRD creation and strategic planning"
  - "Feature specification and acceptance criteria"
context_requirements:
  critical: ["strategic-vision", "business-goals"]
  task_specific: ["user-research", "competitive-analysis"]
  reference: ["market-trends", "user-feedback"]
workflow_pattern: "research → analyze → document → validate"
---

# Product Manager Agent

## Role Description
Responsible for feature definition, user research, and strategic alignment of product requirements.

## Workflow Instructions

### Task Pickup Process
1. **Validate Feature Scope**: Ensure feature aligns with strategic vision
2. **Research Requirements**: Gather user research and competitive analysis
3. **Create Documentation**: Develop comprehensive PRDs with acceptance criteria
4. **Strategic Validation**: Confirm alignment with business goals

### Context Injection Priorities
- **Always Need**: Strategic vision, business constraints
- **Usually Need**: User research, competitive landscape
- **Sometimes Need**: Technical constraints, implementation history

### Quality Standards
- All user stories must have clear acceptance criteria
- PRDs must include success metrics and validation methods
- Strategic alignment must be explicitly documented
```

## Context Update Lifecycle

### Task Start → Context Creation
```
asd start task FEAT-037 TASK-001 --agent product-manager
│
├─ AUTO UPDATE: .asd/state/assignments.json (current assignment)
├─ AUTO CREATE: .asd/context/tasks/TASK-001.md (inject 4-layer context)
└─ AUTO UPDATE: docs/specs/FEAT-037.md frontmatter (mark in_progress)
```

### Research → Context Accumulation
```
asd research add --task TASK-001 "Dashboard engagement: 3+ min target achievable"
│
├─ AUTO UPDATE: .asd/context/tasks/TASK-001.md (append research)
└─ AUTO UPDATE: .asd/context/specs/FEAT-037.md (roll up significant findings)
```

### Task Complete → Knowledge Transfer
```
asd complete task FEAT-037 TASK-001 --handoff "PRD complete, ready for UI development"
│
├─ AUTO UPDATE: .asd/state/assignments.json (next available task)
├─ AUTO UPDATE: .asd/context/specs/FEAT-037.md (capture learnings)
├─ AUTO CREATE: .asd/context/tasks/TASK-002.md (inherit + inject UI context)
└─ AUTO UPDATE: docs/specs/FEAT-037.md frontmatter (task complete, current_task update)
```

## CLI Commands

### Context Management
```bash
# Add context to different levels
asd context add --project --constraint "Performance budget: 2s max load time"
asd context add --spec FEAT-037 --research "User engagement analysis complete"
asd context add --task TASK-001 --decision "Modular widget architecture chosen"

# Show context for injection
asd context show --task TASK-001 --inject --agent product-manager

# Create reusable patterns
asd context pattern --create "dashboard-widgets" --from-task TASK-001
```

### Agent Management
```bash
# List agent capabilities and requirements
asd agent list --capabilities --context-requirements

# Customize agent workflows
asd agent customize product-manager --add-step "Performance requirements validation"
asd agent customize ui-developer --context-requirement "accessibility-guidelines"
```

### Process Management
```bash
# Update workflow templates
asd process update validation-checklist --add-step "Performance testing"
asd process create custom-validation --based-on standard
asd process apply custom-validation --to-agent backend-specialist
```

### State Management
```bash
# Task assignment and progress
asd assign task FEAT-037 TASK-001 --agent product-manager
asd progress update FEAT-037 TASK-001 --subtask 1 --complete
asd handoff ready FEAT-037 TASK-001 --next-agent ui-developer
```

## Customization Patterns

### User Wants to Modify Agent Workflow

**Option 1: CLI Customization** (Common changes)
```bash
asd agent customize product-manager \
  --add-step "Strategic alignment validation" \
  --before-step "Create documentation"
```

**Option 2: Direct File Edit** (Advanced)
```bash
code .asd/agents/product-manager.md  # Modify workflow steps, context requirements
```

**Option 3: Project Configuration** (Permanent changes)
```javascript
// asd.config.js
module.exports = {
  agents: {
    "product-manager": {
      workflow_overrides: {
        validation_steps: ["strategic-check", "user-research-complete"]
      }
    }
  }
};
```

## Benefits

### Claude-Style Flexibility
- **MD + YAML files** provide human readability + programmatic interface
- **CLI commands** handle common operations
- **Manual editing** enables deep customization
- **Automatic updates** maintain state consistency

### Layered Context System
- **Static**: Project setup, rarely changes
- **Dynamic**: Real-time workflow state
- **Semi-Dynamic**: Research and learning accumulation
- **Process**: Customizable workflow templates

### Self-Maintaining Context
The system becomes more intelligent over time as:
- Research findings accumulate in context files
- Implementation decisions create reusable patterns
- Agent workflows adapt based on project learnings
- Context injection becomes more relevant and focused

This creates a **learning context system** where each completed task makes future agent work more effective and contextually aware.