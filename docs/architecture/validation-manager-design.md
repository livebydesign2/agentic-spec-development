# ValidationManager System Architecture

**Document**: ADR-001: ValidationManager Core Architecture Design  
**Status**: Proposed  
**Date**: 2024-08-27  
**Architect**: Software Architect AI Agent

## 🎯 Architecture Overview

The ValidationManager system provides comprehensive validation for ASD specifications, tasks, and workflow operations with auto-fixing capabilities and quality gate enforcement.

### Core Design Principles

1. **Performance First**: <2s for 100+ specs, <100ms for single spec validation
2. **Pluggable Architecture**: Rules can be registered, extended, and customized
3. **Safe Auto-fixing**: User confirmation required for non-trivial changes
4. **Progressive Enhancement**: Core validation works, advanced features enhance
5. **Integration Native**: Deep integration with existing ASD systems

## 🏗️ System Architecture

```
┌─────────────────── CLI INTERFACE ──────────────────┐
│ asd validate [options]                             │
│ • Full project validation                          │
│ • Auto-fixing with --fix flag                     │
│ • Specific spec/task validation                    │
└────────────────────┬───────────────────────────────┘
                     │
┌─────────────────── VALIDATION MANAGER ─────────────┐
│                    │                                │
│ ┌─────────────────┴────────────────┐                │
│ │      ValidationManager           │                │
│ │  • Rule registration & execution │                │
│ │  • Result aggregation           │                │
│ │  • Performance optimization      │                │
│ │  • Caching & parallelization    │                │
│ └─────────────────┬────────────────┘                │
│                   │                                 │
│ ┌─────────────────┴────────────────┐                │
│ │    ValidationRuleEngine          │                │
│ │  • Rule discovery & loading      │                │
│ │  • Context preparation          │                │
│ │  • Rule execution orchestration  │                │
│ │  • Error aggregation            │                │
│ └─────────────────┬────────────────┘                │
└───────────────────┼─────────────────────────────────┘
                    │
┌─────────────────── RULE SYSTEM ────────────────────┐
│                   │                                 │
│ ┌─────────────────┴────────────────┐                │
│ │       ValidationRule             │                │
│ │  • Base rule interface          │                │
│ │  • Context access methods       │                │
│ │  • Result reporting             │                │
│ │  • Auto-fix capabilities        │                │
│ └─────────────────┬────────────────┘                │
│                   │                                 │
│ ┌─────────────────┴────────────────┐                │
│ │    SpecValidationRules           │                │
│ │  • Required field validation     │                │
│ │  • ID format & uniqueness       │                │
│ │  • Priority & status validation  │                │
│ │  • Phase transition rules        │                │
│ └──────────────────────────────────┘                │
│                                                     │
│ ┌──────────────────────────────────┐                │
│ │    TaskValidationRules           │                │
│ │  • Dependency validation         │                │
│ │  • Agent type validation         │                │
│ │  • Subtask structure validation  │                │
│ │  • Context requirements          │                │
│ └──────────────────────────────────┘                │
│                                                     │
│ ┌──────────────────────────────────┐                │
│ │   ConsistencyValidationRules     │                │
│ │  • Cross-spec ID uniqueness     │                │
│ │  • Dependency chain validation   │                │
│ │  • Workflow state consistency    │                │
│ └──────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────── AUTO-FIXING SYSTEM ─────────────┐
│                     │                               │
│ ┌─────────────────┴────────────────┐                │
│ │       AutoFixEngine              │                │
│ │  • Fix strategy registration     │                │
│ │  • Safety validation            │                │
│ │  • User confirmation prompts     │                │
│ │  • Atomic fix operations         │                │
│ └─────────────────┬────────────────┘                │
│                   │                                 │
│ ┌─────────────────┴────────────────┐                │
│ │      FixStrategies               │                │
│ │  • Format normalization          │                │
│ │  • Missing field population      │                │
│ │  • ID format standardization     │                │
│ │  • Safe content updates          │                │
│ └──────────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────── QUALITY GATES ──────────────────┐
│                     │                               │
│ ┌─────────────────┴────────────────┐                │
│ │      QualityGateManager          │                │
│ │  • Workflow operation hooks      │                │
│ │  • Validation requirement checks │                │
│ │  • Assignment blocking           │                │
│ │  • Status transition validation  │                │
│ └─────────────────┬────────────────┘                │
└───────────────────┼─────────────────────────────────┘
                    │
┌─────────────────── INTEGRATION LAYER ──────────────┐
│                   │                                 │
│ • SpecParser: Spec file access                     │
│ • WorkflowStateManager: Quality gate hooks         │
│ • TaskRouter: Assignment validation                │
│ • ConfigManager: Validation configuration          │
│ • FrontmatterSync: File update operations          │
│ • CLI System: Command integration                  │
└─────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### 1. ValidationManager (Primary Interface)

```javascript
class ValidationManager {
  constructor(specParser, configManager, workflowStateManager) {
    this.specParser = specParser;
    this.configManager = configManager;
    this.workflowStateManager = workflowStateManager;

    // Core systems
    this.ruleEngine = new ValidationRuleEngine();
    this.autoFixEngine = new AutoFixEngine();
    this.qualityGateManager = new QualityGateManager();

    // Performance optimization
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.performanceTarget = 2000; // 2s for 100+ specs
  }

  // Core validation methods
  async validateProject(options = {}) {
    /* Project-wide validation */
  }
  async validateSpec(specId, options = {}) {
    /* Single spec validation */
  }
  async validateTask(specId, taskId, options = {}) {
    /* Task validation */
  }

  // Quality gate integration
  async enforceQualityGate(operation, data) {
    /* Block invalid operations */
  }
  async validateAssignment(taskId, agentType) {
    /* Agent assignment validation */
  }
  async validateTransition(specId, fromStatus, toStatus) {
    /* Status transition */
  }

  // Auto-fixing capabilities
  async autoFix(validationResults, options = {}) {
    /* Fix common issues */
  }
  async previewFixes(validationResults) {
    /* Show what would be fixed */
  }

  // Reporting and CLI integration
  async generateReport(results, format = 'terminal') {
    /* Validation reports */
  }
  async getSummary(results) {
    /* Brief summary */
  }
}
```

### 2. ValidationRuleEngine (Rule Orchestration)

```javascript
class ValidationRuleEngine {
  constructor() {
    this.rules = new Map();
    this.ruleCategories = new Map();
    this.context = null;
  }

  // Rule management
  registerRule(rule) {
    /* Register validation rule */
  }
  unregisterRule(ruleName) {
    /* Remove rule */
  }
  getRulesByCategory(category) {
    /* Get rules by type */
  }

  // Execution
  async executeRules(data, context, options = {}) {
    /* Run all applicable rules */
  }
  async executeRule(rule, data, context) {
    /* Run single rule */
  }

  // Context management
  prepareContext(specData, projectData) {
    /* Build validation context */
  }

  // Performance optimization
  async executeRulesParallel(rules, data, context) {
    /* Parallel execution */
  }
}
```

### 3. ValidationRule (Base Interface)

```javascript
class ValidationRule {
  constructor(name, category, severity = 'error') {
    this.name = name;
    this.category = category; // 'spec', 'task', 'consistency', 'workflow'
    this.severity = severity; // 'error', 'warning', 'info'
    this.autoFixable = false;
  }

  // Core validation
  async validate(data, context) {
    /* Return ValidationResult */
  }

  // Auto-fixing (optional)
  canAutoFix(error) {
    return this.autoFixable;
  }
  async autoFix(data, error, context) {
    /* Return fixed data or null */
  }

  // Metadata
  getDescription() {
    return 'Rule description';
  }
  getFixSuggestion(error) {
    return 'How to fix this error';
  }

  // Context helpers
  getProjectContext(context) {
    return context.project;
  }
  getSpecContext(context, specId) {
    return context.specs[specId];
  }
  getAllSpecs(context) {
    return context.specs;
  }
}
```

### 4. AutoFixEngine (Safe Auto-fixing)

```javascript
class AutoFixEngine {
  constructor() {
    this.fixStrategies = new Map();
    this.userConfirmationRequired = true;
    this.safetyChecks = true;
  }

  // Fix execution
  async executeFixes(validationResults, options = {}) {
    /* Apply fixes with safety checks */
  }

  async previewFixes(validationResults) {
    /* Show what would be changed without applying */
  }

  // Safety mechanisms
  async validateFixSafety(fix, originalData) {
    /* Ensure fix won't corrupt data */
  }

  async getUserConfirmation(fixes) {
    /* Prompt user for non-trivial changes */
  }

  // Fix strategies
  registerFixStrategy(name, strategy) {
    /* Add fix strategy */
  }
  getApplicableFixes(error) {
    /* Get fixes for error type */
  }
}
```

### 5. QualityGateManager (Workflow Integration)

```javascript
class QualityGateManager {
  constructor(workflowStateManager) {
    this.workflowStateManager = workflowStateManager;
    this.qualityRules = new Map();
    this.hooks = new Map();
  }

  // Quality gate enforcement
  async enforceAssignmentGate(taskId, agentType) {
    /* Validate assignment before allowing */
  }

  async enforceTransitionGate(specId, fromStatus, toStatus) {
    /* Validate status transitions */
  }

  async enforceCompletionGate(specId, taskId) {
    /* Validate task completion requirements */
  }

  // Hook management
  registerHook(operation, validator) {
    /* Add workflow hook */
  }
  async executeHooks(operation, data) {
    /* Run operation hooks */
  }
}
```

## 📊 Validation Rule Categories

### Spec Validation Rules

1. **RequiredFieldsRule**: Validates presence of required frontmatter fields
2. **IDFormatRule**: Validates spec ID format and uniqueness
3. **PriorityValidationRule**: Validates priority values (P0-P3)
4. **StatusValidationRule**: Validates status values and transitions
5. **PhaseValidationRule**: Validates phase alignment and progression
6. **FrontmatterSchemaRule**: Validates YAML frontmatter structure

### Task Validation Rules

1. **TaskDependencyRule**: Validates dependency references and cycles
2. **AgentTypeValidationRule**: Validates agent type assignments
3. **SubtaskStructureRule**: Validates subtask completeness and format
4. **ContextRequirementsRule**: Validates context requirement specifications
5. **EstimationValidationRule**: Validates time estimates and planning

### Consistency Validation Rules

1. **CrossSpecIDUniquenessRule**: Ensures unique IDs across all specs
2. **DependencyChainValidationRule**: Validates dependency chains
3. **WorkflowStateConsistencyRule**: Validates workflow state integrity
4. **TemplateComplianceRule**: Validates compliance with spec templates

### Quality Gate Rules

1. **AssignmentValidationRule**: Validates task assignments
2. **CompletionRequirementsRule**: Validates completion criteria
3. **TransitionValidationRule**: Validates status transitions
4. **WorkflowIntegrityRule**: Validates workflow state consistency

## 🔄 Integration Patterns

### SpecParser Integration

```javascript
// ValidationManager integrates with existing SpecParser
async validateProject() {
  await this.specParser.loadSpecs();
  const specs = this.specParser.getSpecs();

  const results = await Promise.all(
    specs.map(spec => this.validateSpec(spec.id))
  );

  return this.aggregateResults(results);
}
```

### WorkflowStateManager Integration

```javascript
// Quality gates integrate with workflow operations
async assignTask(specId, taskId, agentType, options = {}) {
  // Quality gate validation before assignment
  const gateResult = await this.qualityGateManager.enforceAssignmentGate(
    taskId,
    agentType
  );

  if (!gateResult.allowed) {
    throw new Error(`Assignment blocked: ${gateResult.reason}`);
  }

  // Proceed with assignment via WorkflowStateManager
  return this.workflowStateManager.assignTask(specId, taskId, agentType, options);
}
```

### CLI Integration

```javascript
// New CLI commands for validation
commander
  .command('validate [spec-id]')
  .option('--fix', 'Auto-fix issues where possible')
  .option('--format <format>', 'Output format (terminal, json)', 'terminal')
  .option('--rules <rules>', 'Specific rule categories to run')
  .action(async (specId, options) => {
    const validationManager = new ValidationManager(specParser, configManager);

    let results;
    if (specId) {
      results = await validationManager.validateSpec(specId, options);
    } else {
      results = await validationManager.validateProject(options);
    }

    if (options.fix) {
      await validationManager.autoFix(results, options);
    }

    const report = await validationManager.generateReport(
      results,
      options.format
    );
    console.log(report);
  });
```

## ⚡ Performance Architecture

### Caching Strategy

1. **Rule Results Cache**: Cache validation results for unchanged specs
2. **Context Cache**: Cache project context for multiple validations
3. **Spec Metadata Cache**: Cache parsed spec metadata for quick access
4. **Dependency Graph Cache**: Cache dependency relationships

### Parallelization

1. **Spec-level Parallelization**: Validate multiple specs concurrently
2. **Rule-level Parallelization**: Run independent rules in parallel
3. **IO Optimization**: Batch file reads and updates
4. **Background Validation**: Optional background validation on file changes

### Performance Targets

- **Single Spec**: <100ms for validation
- **Project Validation**: <2s for 100+ specs
- **Auto-fixing**: <500ms for common fixes
- **Quality Gates**: <50ms for workflow operations

## 🛡️ Safety & Error Handling

### Auto-fixing Safety

1. **Preview Mode**: Show changes before applying
2. **User Confirmation**: Require confirmation for non-trivial changes
3. **Backup Strategy**: Create backups before modifications
4. **Atomic Operations**: All-or-nothing fix applications
5. **Rollback Capability**: Undo changes if validation fails

### Error Handling

1. **Graceful Degradation**: Continue validation even with rule failures
2. **Error Categorization**: Separate errors, warnings, and info messages
3. **Context Preservation**: Maintain validation context for debugging
4. **Recovery Strategies**: Suggest fixes and next steps

## 🔧 Configuration & Customization

### Validation Configuration

```javascript
// asd.config.js validation section
module.exports = {
  validation: {
    // Performance tuning
    cacheTimeout: 300000, // 5 minutes
    performanceTarget: 2000, // 2s for project validation
    parallelization: true,

    // Rule configuration
    rules: {
      'spec-required-fields': { enabled: true, severity: 'error' },
      'id-format': { enabled: true, severity: 'error', pattern: 'FEAT-\\d{3}' },
      'task-dependencies': { enabled: true, severity: 'warning' },
    },

    // Auto-fixing
    autoFix: {
      enabled: true,
      requireConfirmation: true,
      safetyChecks: true,
      maxFixes: 10, // Limit fixes per operation
    },

    // Quality gates
    qualityGates: {
      enforceAssignments: true,
      enforceTransitions: true,
      enforceCompletion: false, // Optional
    },

    // Reporting
    reporting: {
      format: 'terminal', // 'terminal', 'json', 'html'
      verbosity: 'normal', // 'minimal', 'normal', 'detailed'
      showPerformance: true,
    },
  },
};
```

## 📈 Future Extensions

### Phase 2 Enhancements

1. **Custom Rule Development**: User-defined validation rules
2. **Machine Learning**: Intelligent error detection and suggestions
3. **Integration Plugins**: External tool integration (GitHub, Jira, etc.)
4. **Advanced Auto-fixing**: Context-aware content generation
5. **Real-time Validation**: File system watching with live feedback

### Extensibility Points

1. **Rule Plugin System**: Load rules from external modules
2. **Fix Strategy Registry**: Custom auto-fix strategies
3. **Report Format Extensions**: Custom output formats
4. **Quality Gate Extensions**: Custom workflow validations
5. **Integration Hooks**: External system notifications

## 🎯 Implementation Priority

### MVP (TASK-001: Core Validation Framework)

1. **ValidationManager**: Core class with basic validation
2. **ValidationRuleEngine**: Rule registration and execution
3. **Basic Rules**: Required fields, ID format, basic task validation
4. **Result System**: Error reporting and aggregation
5. **SpecParser Integration**: Validate parsed specifications

### Phase 1B Extensions

1. **Auto-fixing System**: Safe automatic issue resolution
2. **Quality Gates**: Workflow operation validation
3. **CLI Integration**: `asd validate` commands
4. **Performance Optimization**: Caching and parallelization
5. **Advanced Rules**: Dependency validation, consistency checks

This architecture provides a solid foundation for the ASD validation system while maintaining compatibility with existing patterns and ensuring future extensibility.
