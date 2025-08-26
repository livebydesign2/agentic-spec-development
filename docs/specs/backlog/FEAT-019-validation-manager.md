---
id: "FEAT-019"
title: "Validation Manager System"
type: "FEAT"
phase: "PHASE-1A"
priority: "P1"
status: "backlog"
created: "2024-08-24T17:45:00Z"
estimated_hours: 12
tags: ["validation", "quality-gates", "consistency", "automation"]
tasks:
  - id: "TASK-001"
    title: "Core Validation Framework"
    agent_type: "software-architect"
    status: "ready"
    estimated_hours: 4
    context_requirements: ["validation-patterns", "quality-systems"]
    subtasks:
      - id: "SUBTASK-001"
        title: "Implement ValidationManager class"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-002"
        title: "Add validation rule engine"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-003"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
  - id: "TASK-002"
    title: "Spec & Task Validation Rules"
    agent_type: "backend-specialist"
    status: "blocked"
    estimated_hours: 4
    context_requirements: ["spec-schemas", "task-validation"]
    depends_on: ["TASK-001"]
    subtasks:
      - id: "SUBTASK-004"
        title: "Implement spec validation rules"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-005"
        title: "Add task dependency validation"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-006"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
  - id: "TASK-003"
    title: "Quality Gates & Auto-Fixing"
    agent_type: "backend-specialist"
    status: "blocked"
    estimated_hours: 3
    context_requirements: ["auto-fixing", "quality-gates"]
    depends_on: ["TASK-002"]
    subtasks:
      - id: "SUBTASK-007"
        title: "Implement auto-fixing for common issues"
        type: "implementation"
        estimated_minutes: 120
        status: "ready"
      - id: "SUBTASK-008"
        title: "Add quality gate enforcement"
        type: "implementation"
        estimated_minutes: 60
        status: "ready"
      - id: "SUBTASK-009"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
  - id: "TASK-004"
    title: "CLI Integration & Reporting"
    agent_type: "cli-specialist"
    status: "blocked"
    estimated_hours: 1
    context_requirements: ["cli-integration", "validation-reporting"]
    depends_on: ["TASK-003"]
    subtasks:
      - id: "SUBTASK-010"
        title: "Implement validation CLI commands"
        type: "implementation"
        estimated_minutes: 30
        status: "ready"
      - id: "SUBTASK-011"
        title: "Add validation reporting and summaries"
        type: "implementation"
        estimated_minutes: 30
        status: "ready"
      - id: "SUBTASK-012"
        title: "Validation & testing"
        type: "validation"
        estimated_minutes: 0
        status: "ready"
dependencies: []
acceptance_criteria:
  - "Comprehensive validation of specs, tasks, and system consistency"
  - "Auto-fixing capability for common formatting and structural issues"
  - "Quality gates prevent invalid assignments and workflow violations"
  - "Clear validation reports with actionable error messages"
  - "CLI integration for validation commands and automated checks"
---

# Validation Manager System

**Status**: Backlog | **Priority**: P1 (High) | **Owner**: Software Architect

## 🎯 Quick Start _(30 seconds)_

**What**: Comprehensive validation system with quality gates, auto-fixing, and consistency checking for specs, tasks, and workflows

**Why**: Ensure data integrity and prevent workflow issues before they impact agents or project progress

**Impact**: Quality assurance system - catches issues early, auto-fixes common problems, maintains system consistency

### 🚀 AGENT PICKUP GUIDE

**➡️ Next Available Task**: **TASK-001** - Core Validation Framework  
**📋 Your Job**: Work on TASK-001 only, then update docs and hand off  
**🚦 Dependencies**: None - standalone validation system

### 🚦 Current State _(AGENTS: Update this when you complete YOUR task)_

- **Next Available Task**: TASK-001 - Core Validation Framework
- **Current Task Status**: None - ready for pickup
- **Overall Progress**: 0 of 4 tasks complete
- **Blockers**: None
- **Last Updated**: 2024-08-24 by System Architect

---

## 📋 Work Definition _(What needs to be built)_

### Problem Statement

Currently, there's no systematic validation of spec files, task structures, or workflow consistency. This can lead to:

- Malformed spec files that break the UI or parsing
- Invalid task dependencies and circular references
- Inconsistent data across specs (duplicate IDs, missing required fields)
- Workflow violations (blocked tasks assigned to agents)
- Poor data quality affecting system reliability

### Solution Approach

Implement ValidationManager with comprehensive validation rules, auto-fixing capabilities, quality gate enforcement, and clear error reporting to maintain system integrity.

### Success Criteria

- [ ] Comprehensive validation of all spec files and task structures
- [ ] Auto-fixing capability for common formatting and structural issues
- [ ] Quality gates prevent invalid task assignments and workflow violations
- [ ] Clear validation reports with specific error locations and fix suggestions
- [ ] CLI integration for validation commands and automated consistency checks
- [ ] Performance: Validation completes in < 2s for projects with 100+ specs

---

## 🏗️ Implementation Plan

### Technical Approach

Create ValidationManager with pluggable validation rules, auto-fixing system, quality gate enforcement, and integration with CLI and workflow systems.

### Implementation Tasks _(Each task = one agent handoff)_

**TASK-001** 🤖 **Core Validation Framework** ⏳ **← READY FOR PICKUP** | Agent: Software-Architect

- [ ] Implement ValidationManager class with pluggable validation rule system
- [ ] Create validation rule interface and rule registration system
- [ ] Add validation context system for rules to access project data
- [ ] Build validation result reporting with error levels and fix suggestions
- [ ] Create validation rule inheritance and composition patterns
- [ ] Add performance optimization for large-scale validation
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that validation framework is ready for rules
- **Files**: `lib/validation-manager.js`, validation rule interfaces
- **Agent Instructions**: Focus on extensibility and clear error reporting

**TASK-002** 🤖 **Spec & Task Validation Rules** ⏸️ **← BLOCKED (waiting for TASK-001)** | Agent: Backend-Specialist

- [ ] Implement spec file validation rules (required fields, valid statuses, priorities)
- [ ] Add task structure validation (subtasks, dependencies, agent types)
- [ ] Create ID uniqueness and format validation across all specs
- [ ] Build dependency chain validation (detect cycles, validate references)
- [ ] Add phase and status transition validation rules
- [ ] Implement frontmatter schema validation with detailed error messages
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify next agent that validation rules are ready for quality gates
- **Dependencies**: TASK-001 must be complete
- **Files**: Spec validation rules, task validation rules, dependency validation

**TASK-003** 🤖 **Quality Gates & Auto-Fixing** ⏸️ **← BLOCKED (waiting for TASK-002)** | Agent: Backend-Specialist

- [ ] Implement auto-fixing for common issues (format cleanup, missing fields)
- [ ] Add quality gate enforcement (prevent invalid assignments, workflow violations)
- [ ] Create validation hooks for critical operations (task assignment, completion)
- [ ] Build batch auto-fixing with user confirmation for non-trivial changes
- [ ] Add validation result caching for performance optimization
- [ ] Implement validation rule priority system (errors vs warnings vs info)
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify CLI specialist that validation system is ready for integration
- **Dependencies**: TASK-002 must be complete
- **Files**: Auto-fixing system, quality gates, validation hooks

**TASK-004** 🤖 **CLI Integration & Reporting** ⏸️ **← BLOCKED (waiting for TASK-003)** | Agent: CLI-Specialist

- [ ] Implement `asd validate` command with comprehensive project checking
- [ ] Add `asd validate --fix` command for auto-fixing common issues
- [ ] Create validation reporting with clear error summaries and fix suggestions
- [ ] Build `asd lint` command for continuous validation during development
- [ ] Add validation integration with existing CLI commands (prevent invalid operations)
- [ ] Implement validation configuration and rule customization
- [ ] Validate (types, lint, tests, DB/RLS) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify product management that validation system is complete
- **Dependencies**: TASK-003 must be complete
- **Files**: CLI validation commands, validation reporting, configuration

**Legend**: ⏳ Ready for pickup | 🔄 In progress | ✅ Complete | ⏸️ Blocked

---

## ✅ Validation Requirements

### 📝 Documentation Checklist _(REQUIRED before committing YOUR task)_

- [ ] **Your Task Status**: Mark your task ✅ and update all subtasks to `- [x]`
- [ ] **Current State**: Update "Next Available Task" to show what task is ready next
- [ ] **Success Criteria**: Check off any criteria your task completed
- [ ] **Handoff**: Clear what the next agent should pick up
- [ ] **Architecture Updates**: Update architecture.md with ValidationManager details

### 🧪 Testing Checklist _(Follow this exact order)_

**DURING DEVELOPMENT** _(Test as you build each piece)_

- [ ] **Rule Engine**: Test validation rules with valid and invalid spec files
- [ ] **Auto-Fixing**: Test auto-fixing doesn't corrupt valid files
- [ ] **Quality Gates**: Test quality gates prevent invalid operations
- [ ] **Performance**: Test validation performance with large spec sets
- [ ] **Error Reporting**: Test error messages are clear and actionable

**BEFORE COMMITTING** _(Required validation sequence)_

- [ ] **Validation Suite**: Test comprehensive validation of all spec types
- [ ] **Integration**: Test ValidationManager integration with existing systems
- [ ] **CLI Commands**: Test validation CLI commands work correctly
- [ ] **Types**: Run `pnpm typecheck` - fix all TypeScript errors
- [ ] **Linting**: Run `pnpm lint && pnpm format` - fix all style issues
- [ ] **Unit Tests**: Test individual validation components
- [ ] **Performance**: Verify validation completes within 2s for 100+ specs

### 🌱 Validation System Impact Check _(Required for validation functionality)_

- [ ] **Spec Validation**: Test validation catches common spec file errors
- [ ] **Task Validation**: Test task dependency and structure validation
- [ ] **Auto-Fixing**: Test auto-fixing resolves common issues correctly
- [ ] **Quality Gates**: Test invalid operations are prevented with clear messages

---

## 📊 Progress Tracking _(AGENTS: Add entry when you complete YOUR task)_

### ✅ Completed Tasks _(Add entry when you finish your task)_

- ✅ **[YYYY-MM-DD]** - **TASK-XXX** completed - _Agent: [name]_ - Next: TASK-YYY ready

### 🚨 Task Blockers _(Preventing next task pickup)_

- No blockers currently identified

### ➡️ Handoff Status _(What's ready for next agent)_

- **Ready Now**: TASK-001 (no dependencies)
- **Waiting**: TASK-002 through TASK-004 (sequential dependencies)

---

## 🔗 Technical References

### Architecture Documents

- **System Architecture**: `docs/architecture.md` (ValidationManager component)
- **Existing Code**: `lib/feature-parser.js` (spec parsing), `lib/config-manager.js` (validation patterns)
- **Quality Standards**: Existing test suites for validation patterns

### Implementation Patterns

- **Validation Rules**: Pluggable rule system with clear interfaces
- **Error Reporting**: Detailed error messages with file locations and fix suggestions
- **Auto-Fixing**: Safe transformations with user confirmation for non-trivial changes

### Dependencies

- **Requires**: SpecParser for loading specs, ConfigManager for validation config
- **Enables**: System reliability, quality assurance, automated problem detection

---

<details>
<summary><strong>📖 Detailed Requirements & Design</strong> <em>(Expand when needed)</em></summary>

## Detailed Requirements

### REQ-001: Comprehensive Spec Validation

**As a** system user  
**I want** all spec files to be validated for correctness and consistency  
**So that** the system remains reliable and agents receive valid data

**Acceptance Criteria**:

- [ ] Validation covers all spec file types (FEAT, BUG, SPEC, SPIKE, MAINT)
- [ ] Required fields validation (id, title, type, status, priority)
- [ ] Format validation (priority levels, status values, date formats)
- [ ] ID uniqueness validation across all spec files
- [ ] Cross-reference validation (dependencies, phase references)

### REQ-002: Task Structure Validation

**As a** system user  
**I want** task structures to be validated for completeness and consistency  
**So that** task routing and assignment work correctly

**Acceptance Criteria**:

- [ ] Task dependency validation (valid references, no cycles)
- [ ] Agent type validation (valid agent types, capability matching)
- [ ] Subtask structure validation (required fields, status consistency)
- [ ] Task hierarchy validation (tasks belong to specs, subtasks to tasks)
- [ ] Estimated hours and time tracking validation

### REQ-003: Auto-Fixing Capability

**As a** system user  
**I want** common formatting and structural issues to be fixed automatically  
**So that** I don't need to manually correct trivial problems

**Acceptance Criteria**:

- [ ] Format cleanup (whitespace, YAML indentation, date formats)
- [ ] Missing field population (creation dates, default priorities)
- [ ] ID format standardization (consistent prefixes, numbering)
- [ ] Status value normalization (case corrections, valid values)
- [ ] User confirmation required for non-trivial changes

### REQ-004: Quality Gate Enforcement

**As a** system operator  
**I want** invalid operations to be prevented before they cause problems  
**So that** the system maintains integrity during workflow operations

**Acceptance Criteria**:

- [ ] Task assignment validation (agent capabilities, task readiness)
- [ ] Workflow transition validation (valid status changes, prerequisites)
- [ ] Dependency validation before task marking as ready
- [ ] Phase transition validation (completion requirements met)
- [ ] Clear error messages explain why operations are blocked

## Technical Design Details

### ValidationManager Class Architecture

```javascript
class ValidationManager {
  constructor(specParser, configManager) {
    this.specParser = specParser;
    this.configManager = configManager;
    this.rules = new Map();
    this.cache = new Map();
  }

  // Core validation methods
  validateProject()                            // Full project validation
  validateSpec(specPath)                       // Single spec validation
  validateTask(specId, taskId)                 // Task validation
  validateWorkflowOperation(operation, data)   // Quality gate validation

  // Rule management
  registerRule(name, rule)                     // Add validation rule
  unregisterRule(name)                         // Remove validation rule
  getRules(category = null)                    // List registered rules

  // Auto-fixing
  autoFix(validationResults, options = {})     // Fix common issues
  getFixSuggestions(error)                     // Suggest fixes for errors
  previewFixes(validationResults)              // Show what would be fixed

  // Quality gates
  enforceQualityGate(operation, data)          // Block invalid operations
  validateAssignment(taskId, agentType)        // Agent assignment validation
  validateTransition(specId, fromStatus, toStatus) // Status transition validation

  // Reporting
  generateReport(validationResults, format)    // Generate validation reports
  getSummary(validationResults)                // Brief summary of issues

  // Internal methods
  _loadRules()                                 // Load validation rules
  _validateWithRule(rule, data, context)       // Apply single rule
  _cacheResults(key, results)                  // Cache validation results
}
```

### Validation Rule Interface

```javascript
class ValidationRule {
  constructor(name, category, severity) {
    this.name = name;
    this.category = category; // 'spec', 'task', 'workflow', 'consistency'
    this.severity = severity; // 'error', 'warning', 'info'
  }

  // Rule implementation
  validate(data, context) {
    // Return ValidationResult
  }

  // Auto-fixing (optional)
  canAutoFix(error) {
    return false;
  }

  autoFix(data, error) {
    // Return fixed data or null if can't fix
  }

  // Metadata
  getDescription() {
    return "Rule description";
  }

  getFixSuggestion(error) {
    return "How to fix this error";
  }
}
```

### Common Validation Rules

**Spec Validation Rules**:

```javascript
// Required fields validation
class RequiredFieldsRule extends ValidationRule {
  validate(spec) {
    const required = ["id", "title", "type", "status", "priority"];
    const missing = required.filter((field) => !spec[field]);
    if (missing.length > 0) {
      return new ValidationError("missing_required_fields", missing);
    }
    return ValidationResult.success();
  }
}

// ID format validation
class IDFormatRule extends ValidationRule {
  validate(spec) {
    const pattern = /^(FEAT|BUG|SPEC|SPIKE|MAINT|RELEASE)-\d{3}$/;
    if (!pattern.test(spec.id)) {
      return new ValidationError("invalid_id_format", spec.id);
    }
    return ValidationResult.success();
  }
}

// Priority validation
class PriorityValidation extends ValidationRule {
  validate(spec) {
    const validPriorities = ["P0", "P1", "P2", "P3"];
    if (!validPriorities.includes(spec.priority)) {
      return new ValidationError("invalid_priority", spec.priority);
    }
    return ValidationResult.success();
  }
}
```

**Task Validation Rules**:

```javascript
// Dependency validation
class TaskDependencyRule extends ValidationRule {
  validate(task, context) {
    if (!task.depends_on) return ValidationResult.success();

    const allTasks = context.getAllTasks();
    const invalidDeps = task.depends_on.filter((dep) => !allTasks.has(dep));

    if (invalidDeps.length > 0) {
      return new ValidationError("invalid_dependencies", invalidDeps);
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(task, allTasks)) {
      return new ValidationError("circular_dependency", task.id);
    }

    return ValidationResult.success();
  }
}

// Agent type validation
class AgentTypeValidation extends ValidationRule {
  validate(task, context) {
    const validAgentTypes = context.getAgentTypes();
    if (!validAgentTypes.includes(task.agent_type)) {
      return new ValidationError("invalid_agent_type", task.agent_type);
    }
    return ValidationResult.success();
  }
}
```

### CLI Command Examples

```bash
# Project validation
asd validate                        # Full project validation
asd validate --fix                  # Auto-fix common issues
asd validate --rules spec,task      # Run specific rule categories
asd validate --format json          # JSON output for CI/CD

# Specific validation
asd validate FEAT-012               # Single spec validation
asd validate --spec-path ./docs/specs/active/
asd validate --check-dependencies   # Focus on dependency validation

# Linting and continuous validation
asd lint                           # Quick validation during development
asd lint --fix --limit 10          # Fix up to 10 issues
asd lint --watch                   # Continuous validation on file changes

# Quality gates
asd validate assignment TASK-001 backend-specialist  # Test assignment
asd validate transition FEAT-012 backlog active     # Test status change
```

### Validation Report Example

```
🔍 ASD Validation Report

📊 Summary
  ✅ 45 specs validated
  ❌ 8 errors found
  ⚠️  3 warnings
  💡 2 info messages

🚨 Errors (8)
  FEAT-012: Missing required field 'estimated_hours'
    📁 docs/specs/active/FEAT-012-context-injection.md:3
    💡 Fix: Add 'estimated_hours: 32' to frontmatter

  FEAT-013: Invalid dependency 'TASK-999' (task not found)
    📁 docs/specs/active/FEAT-013-task-router.md:15
    💡 Fix: Remove invalid dependency or create missing task

  BUG-001: Invalid priority 'HIGH' (must be P0, P1, P2, or P3)
    📁 docs/specs/backlog/BUG-001-memory-leak.md:8
    💡 Fix: Change priority to 'P1' (auto-fixable)

⚠️  Warnings (3)
  FEAT-014: Task TASK-003 has no subtasks defined
    📁 docs/specs/active/FEAT-014-workflow-state.md:25
    💡 Consider: Add standard subtasks (implementation, validation, pm)

💡 Auto-fixable Issues: 3/8
  Run 'asd validate --fix' to automatically resolve fixable issues

⚡ Performance: Validated 45 specs in 847ms
```

## Testing Strategy Details

### Unit Tests

- Individual validation rules with various input scenarios
- Auto-fixing logic with edge cases and error conditions
- Quality gate enforcement with invalid operations
- Validation result reporting and formatting

### Integration Tests

- Full project validation with complex spec hierarchies
- ValidationManager integration with SpecParser and WorkflowStateManager
- CLI command integration with validation system
- Performance testing with large spec datasets

### Rule-Specific Tests

- Each validation rule with comprehensive test cases
- Auto-fixing rules with before/after validation
- Quality gate rules with workflow operation scenarios
- Error message accuracy and fix suggestion quality

</details>

---

## 💡 Implementation Notes _(Update as you learn)_

### Key Decisions

- Pluggable validation rule system allows easy extension and customization
- Auto-fixing requires user confirmation for non-trivial changes to prevent data loss
- Quality gates integrate with workflow operations to prevent invalid states

### Gotchas & Learnings

- Validation performance critical for large projects - implement caching and optimization
- Auto-fixing must preserve file formatting and comments where possible
- Error messages should include file locations and specific fix suggestions

### Future Improvements

- Machine learning for intelligent error detection and fixing suggestions
- Custom validation rule creation through configuration
- Integration with external quality tools and CI/CD pipelines

---

**Priority**: P1 - Quality assurance and system reliability  
**Effort**: 12 hours across validation framework, rules, auto-fixing, and CLI integration
**Impact**: Ensures system reliability, prevents workflow issues, maintains data quality
