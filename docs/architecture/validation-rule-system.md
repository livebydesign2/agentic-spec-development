# Validation Rule System Architecture

**Document**: Technical Design - Validation Rule System  
**Status**: Proposed  
**Date**: 2024-08-27  
**Architect**: Software Architect AI Agent  

## 🎯 Rule System Overview

The ASD Validation Rule System provides a pluggable, extensible architecture for validating specifications, tasks, and workflow operations. The system follows the existing ASD patterns while providing comprehensive validation capabilities.

## 🏗️ Rule Architecture

```
┌─────────────────── RULE REGISTRY ──────────────────┐
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │           ValidationRuleRegistry                │ │
│ │                                                 │ │
│ │  • Rule registration & discovery                │ │
│ │  • Category-based organization                  │ │
│ │  • Runtime rule loading                         │ │
│ │  • Rule dependency management                   │ │
│ │  • Performance optimization                     │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────── RULE ENGINE ────────────────────┐
│                     │                               │
│ ┌─────────────────┴─────────────────────────────────┐ │
│ │          ValidationRuleEngine                     │ │
│ │                                                   │ │
│ │  • Context preparation & injection                │ │
│ │  • Rule execution orchestration                   │ │
│ │  • Parallel execution management                  │ │
│ │  • Result aggregation & reporting                 │ │
│ │  • Error handling & recovery                      │ │
│ └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────── RULE INTERFACES ────────────────┐
│                     │                               │
│ ┌─────────────────┴─────────────────────────────────┐ │
│ │             ValidationRule                        │ │
│ │                (Base Interface)                   │ │
│ │                                                   │ │
│ │  • validate(data, context) → ValidationResult    │ │
│ │  • canAutoFix(error) → boolean                    │ │
│ │  • autoFix(data, error, context) → fixed data    │ │
│ │  • getDescription() → string                      │ │
│ │  • getFixSuggestion(error) → string               │ │
│ └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────── RULE CATEGORIES ────────────────┐
│                     │                               │
│ ┌─────────────────┴──────────┐ ┌──────────────────┐ │
│ │    SpecValidationRule      │ │ TaskValidationRule│ │
│ │                            │ │                  │ │
│ │ • RequiredFieldsRule       │ │ • DependencyRule │ │
│ │ • IDFormatRule             │ │ • AgentTypeRule  │ │
│ │ • PriorityValidationRule   │ │ • SubtaskRule    │ │
│ │ • StatusValidationRule     │ │ • EstimationRule │ │
│ │ • PhaseValidationRule      │ │ • ContextRule    │ │
│ │ • FrontmatterSchemaRule    │ │ • TimeboxRule    │ │
│ └────────────────────────────┘ └──────────────────┘ │
│                                                     │
│ ┌──────────────────┐ ┌─────────────────────────────┐ │
│ │ConsistencyRule   │ │    QualityGateRule          │ │
│ │                  │ │                             │ │
│ │ • IDUniqueness   │ │ • AssignmentValidation      │ │
│ │ • DependencyChain│ │ • TransitionValidation      │ │
│ │ • StateConsistency│ │ • CompletionValidation      │ │
│ │ • TemplateCompliance│ │ • WorkflowIntegrity        │ │
│ └──────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## 🔧 Core Rule System Components

### 1. ValidationRuleRegistry

```javascript
class ValidationRuleRegistry {
  constructor() {
    this.rules = new Map(); // ruleName -> rule instance
    this.categories = new Map(); // category -> Set of rule names
    this.dependencies = new Map(); // ruleName -> Set of dependency rule names
    this.ruleMetadata = new Map(); // ruleName -> metadata
  }
  
  // Rule registration
  registerRule(rule) {
    this.validateRuleInterface(rule);
    this.rules.set(rule.name, rule);
    this.addToCategory(rule.category, rule.name);
    this.ruleMetadata.set(rule.name, {
      category: rule.category,
      severity: rule.severity,
      autoFixable: rule.autoFixable,
      dependencies: rule.dependencies || [],
      registeredAt: new Date().toISOString()
    });
  }
  
  unregisterRule(ruleName) {
    const rule = this.rules.get(ruleName);
    if (rule) {
      this.rules.delete(ruleName);
      this.removeFromCategory(rule.category, ruleName);
      this.ruleMetadata.delete(ruleName);
    }
  }
  
  // Rule discovery
  getAllRules() { return Array.from(this.rules.values()); }
  getRulesByCategory(category) {
    const ruleNames = this.categories.get(category) || new Set();
    return Array.from(ruleNames).map(name => this.rules.get(name));
  }
  
  getRule(name) { return this.rules.get(name); }
  
  // Rule metadata
  getRuleMetadata(name) { return this.ruleMetadata.get(name); }
  getCategories() { return Array.from(this.categories.keys()); }
  
  // Rule dependencies
  resolveDependencies(rules) {
    // Topological sort of rules based on dependencies
    const resolved = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (ruleName) => {
      if (visiting.has(ruleName)) {
        throw new Error(`Circular dependency detected: ${ruleName}`);
      }
      if (visited.has(ruleName)) return;
      
      visiting.add(ruleName);
      const metadata = this.ruleMetadata.get(ruleName);
      if (metadata && metadata.dependencies) {
        metadata.dependencies.forEach(depName => {
          if (rules.some(r => r.name === depName)) {
            visit(depName);
          }
        });
      }
      visiting.delete(ruleName);
      visited.add(ruleName);
      resolved.push(ruleName);
    };
    
    rules.forEach(rule => visit(rule.name));
    return resolved.map(name => this.rules.get(name));
  }
  
  // Interface validation
  validateRuleInterface(rule) {
    const required = ['name', 'category', 'validate'];
    const missing = required.filter(prop => !(prop in rule));
    if (missing.length > 0) {
      throw new Error(`Rule missing required properties: ${missing.join(', ')}`);
    }
    
    if (typeof rule.validate !== 'function') {
      throw new Error('Rule validate method must be a function');
    }
  }
}
```

### 2. ValidationRuleEngine

```javascript
class ValidationRuleEngine {
  constructor(registry) {
    this.registry = registry;
    this.context = null;
    this.executionMetrics = new Map();
  }
  
  // Context management
  prepareContext(projectData, specData = null, taskData = null) {
    return {
      // Project-wide context
      project: {
        specs: projectData.specs || [],
        config: projectData.config || {},
        metadata: projectData.metadata || {}
      },
      
      // Current spec context (if validating specific spec)
      spec: specData ? {
        ...specData,
        tasks: specData.tasks || [],
        dependencies: specData.dependencies || []
      } : null,
      
      // Current task context (if validating specific task) 
      task: taskData || null,
      
      // Utility methods
      getAllSpecs: () => projectData.specs || [],
      getSpec: (id) => (projectData.specs || []).find(s => s.id === id),
      getTask: (specId, taskId) => {
        const spec = this.getSpec(specId);
        return spec ? (spec.tasks || []).find(t => t.id === taskId) : null;
      },
      
      // Cross-reference helpers
      findSpecById: (id) => (projectData.specs || []).find(s => s.id === id),
      findTaskById: (taskId) => {
        for (const spec of projectData.specs || []) {
          const task = (spec.tasks || []).find(t => t.id === taskId);
          if (task) return { spec, task };
        }
        return null;
      },
      
      // Validation metadata
      validatedAt: new Date().toISOString(),
      validationId: this.generateValidationId()
    };
  }
  
  // Rule execution
  async executeRules(data, rules, context, options = {}) {
    const startTime = Date.now();
    const results = [];
    
    try {
      // Resolve rule dependencies
      const orderedRules = this.registry.resolveDependencies(rules);
      
      // Execute rules (parallel or sequential based on options)
      if (options.parallel && options.parallel !== false) {
        results.push(...await this.executeRulesParallel(orderedRules, data, context));
      } else {
        results.push(...await this.executeRulesSequential(orderedRules, data, context));
      }
      
      // Aggregate and categorize results
      const aggregated = this.aggregateResults(results);
      
      // Performance tracking
      const executionTime = Date.now() - startTime;
      this.recordExecutionMetrics(rules, executionTime, aggregated);
      
      return {
        success: true,
        results: aggregated,
        performance: {
          executionTime,
          rulesExecuted: rules.length,
          parallelExecution: options.parallel
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Rule execution failed: ${error.message}`,
        results: this.aggregateResults(results), // Return partial results
        performance: {
          executionTime: Date.now() - startTime,
          rulesExecuted: rules.length,
          failed: true
        }
      };
    }
  }
  
  async executeRule(rule, data, context) {
    const startTime = Date.now();
    
    try {
      // Execute the rule validation
      const result = await rule.validate(data, context);
      
      // Ensure result follows expected format
      const normalizedResult = this.normalizeRuleResult(result, rule);
      
      return {
        rule: rule.name,
        category: rule.category,
        severity: rule.severity,
        executionTime: Date.now() - startTime,
        ...normalizedResult
      };
      
    } catch (error) {
      return {
        rule: rule.name,
        category: rule.category,
        severity: 'error',
        success: false,
        executionTime: Date.now() - startTime,
        errors: [{
          code: 'RULE_EXECUTION_ERROR',
          message: `Rule execution failed: ${error.message}`,
          data: { originalError: error.message }
        }]
      };
    }
  }
  
  async executeRulesParallel(rules, data, context) {
    const promises = rules.map(rule => this.executeRule(rule, data, context));
    return Promise.all(promises);
  }
  
  async executeRulesSequential(rules, data, context) {
    const results = [];
    for (const rule of rules) {
      const result = await this.executeRule(rule, data, context);
      results.push(result);
      
      // Early termination for critical errors if configured
      if (result.severity === 'error' && context.stopOnError) {
        break;
      }
    }
    return results;
  }
  
  // Result processing
  normalizeRuleResult(result, rule) {
    // Handle different result formats rules might return
    if (typeof result === 'boolean') {
      return {
        success: result,
        errors: result ? [] : [{ 
          code: 'VALIDATION_FAILED', 
          message: `${rule.name} validation failed` 
        }],
        warnings: [],
        info: []
      };
    }
    
    if (result && typeof result === 'object') {
      return {
        success: result.success || (result.errors && result.errors.length === 0),
        errors: result.errors || [],
        warnings: result.warnings || [],
        info: result.info || [],
        data: result.data || {},
        fixes: result.fixes || []
      };
    }
    
    throw new Error(`Invalid result format from rule ${rule.name}`);
  }
  
  aggregateResults(results) {
    const aggregated = {
      success: true,
      summary: {
        total: results.length,
        passed: 0,
        failed: 0,
        errors: 0,
        warnings: 0,
        info: 0
      },
      byCategory: {},
      bySeverity: { error: [], warning: [], info: [] },
      results,
      fixes: [],
      performance: {
        totalExecutionTime: results.reduce((sum, r) => sum + (r.executionTime || 0), 0),
        averageExecutionTime: 0
      }
    };
    
    // Process each result
    for (const result of results) {
      // Update summary counts
      if (result.success) {
        aggregated.summary.passed++;
      } else {
        aggregated.summary.failed++;
        aggregated.success = false;
      }
      
      // Count message types
      aggregated.summary.errors += (result.errors || []).length;
      aggregated.summary.warnings += (result.warnings || []).length;
      aggregated.summary.info += (result.info || []).length;
      
      // Group by category
      const category = result.category || 'unknown';
      if (!aggregated.byCategory[category]) {
        aggregated.byCategory[category] = {
          results: [],
          passed: 0,
          failed: 0,
          errors: 0,
          warnings: 0,
          info: 0
        };
      }
      aggregated.byCategory[category].results.push(result);
      aggregated.byCategory[category][result.success ? 'passed' : 'failed']++;
      aggregated.byCategory[category].errors += (result.errors || []).length;
      aggregated.byCategory[category].warnings += (result.warnings || []).length;
      aggregated.byCategory[category].info += (result.info || []).length;
      
      // Group by severity
      const severity = result.severity || 'info';
      if (aggregated.bySeverity[severity]) {
        aggregated.bySeverity[severity].push(result);
      }
      
      // Collect fixes
      if (result.fixes && result.fixes.length > 0) {
        aggregated.fixes.push(...result.fixes);
      }
    }
    
    // Calculate performance metrics
    if (results.length > 0) {
      aggregated.performance.averageExecutionTime = 
        aggregated.performance.totalExecutionTime / results.length;
    }
    
    return aggregated;
  }
  
  // Utility methods
  generateValidationId() {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  recordExecutionMetrics(rules, executionTime, results) {
    const key = rules.map(r => r.name).join(',');
    this.executionMetrics.set(key, {
      rules: rules.length,
      executionTime,
      success: results.success,
      errors: results.summary.errors,
      warnings: results.summary.warnings,
      timestamp: new Date().toISOString()
    });
  }
  
  getExecutionMetrics() {
    return Object.fromEntries(this.executionMetrics);
  }
}
```

### 3. ValidationRule Base Interface

```javascript
class ValidationRule {
  constructor(name, category, options = {}) {
    this.name = name;
    this.category = category; // 'spec', 'task', 'consistency', 'workflow', 'quality-gate'
    this.severity = options.severity || 'error'; // 'error', 'warning', 'info'
    this.autoFixable = options.autoFixable || false;
    this.dependencies = options.dependencies || []; // Other rule names this depends on
    this.enabled = options.enabled !== false;
    this.metadata = options.metadata || {};
  }
  
  // Core validation method - must be implemented by subclasses
  async validate(data, context) {
    throw new Error(`Rule ${this.name} must implement validate method`);
  }
  
  // Auto-fixing capabilities (optional)
  canAutoFix(error) {
    return this.autoFixable;
  }
  
  async autoFix(data, error, context) {
    if (!this.canAutoFix(error)) {
      return null;
    }
    throw new Error(`Rule ${this.name} marked as auto-fixable but autoFix method not implemented`);
  }
  
  // Metadata and help
  getDescription() {
    return this.metadata.description || `Validation rule: ${this.name}`;
  }
  
  getFixSuggestion(error) {
    return this.metadata.fixSuggestion || 'No fix suggestion available';
  }
  
  // Context helper methods
  getProjectContext(context) {
    return context.project || {};
  }
  
  getSpecContext(context, specId = null) {
    if (specId) {
      return context.findSpecById(specId);
    }
    return context.spec;
  }
  
  getAllSpecs(context) {
    return context.getAllSpecs();
  }
  
  getTaskContext(context, taskId = null) {
    if (taskId) {
      return context.findTaskById(taskId);
    }
    return context.task;
  }
  
  // Result helper methods
  success(data = {}) {
    return {
      success: true,
      errors: [],
      warnings: [],
      info: [],
      data
    };
  }
  
  error(message, code = null, data = {}) {
    return {
      success: false,
      errors: [{
        code: code || 'VALIDATION_ERROR',
        message,
        data,
        rule: this.name
      }],
      warnings: [],
      info: [],
      data
    };
  }
  
  warning(message, code = null, data = {}) {
    return {
      success: true,
      errors: [],
      warnings: [{
        code: code || 'VALIDATION_WARNING',
        message,
        data,
        rule: this.name
      }],
      info: [],
      data
    };
  }
  
  info(message, code = null, data = {}) {
    return {
      success: true,
      errors: [],
      warnings: [],
      info: [{
        code: code || 'VALIDATION_INFO',
        message,
        data,
        rule: this.name
      }],
      data
    };
  }
  
  multiple(errors = [], warnings = [], info = [], data = {}) {
    return {
      success: errors.length === 0,
      errors: errors.map(e => ({ ...e, rule: this.name })),
      warnings: warnings.map(w => ({ ...w, rule: this.name })),
      info: info.map(i => ({ ...i, rule: this.name })),
      data
    };
  }
}
```

## 📊 Specific Rule Implementations

### Spec Validation Rules

#### RequiredFieldsRule

```javascript
class RequiredFieldsRule extends ValidationRule {
  constructor() {
    super('required-fields', 'spec', {
      severity: 'error',
      autoFixable: true,
      description: 'Validates presence of required frontmatter fields',
      fixSuggestion: 'Add missing required fields to spec frontmatter'
    });
    
    this.requiredFields = [
      'id', 'title', 'type', 'phase', 'priority', 'status', 
      'created', 'estimated_hours', 'tags'
    ];
  }
  
  async validate(spec, context) {
    const missing = this.requiredFields.filter(field => {
      return spec[field] === undefined || spec[field] === null || spec[field] === '';
    });
    
    if (missing.length === 0) {
      return this.success();
    }
    
    return this.error(
      `Missing required fields: ${missing.join(', ')}`,
      'MISSING_REQUIRED_FIELDS',
      { missingFields: missing, specId: spec.id }
    );
  }
  
  async autoFix(spec, error, context) {
    const missingFields = error.data.missingFields;
    const fixes = {};
    
    // Generate default values for missing fields
    for (const field of missingFields) {
      switch (field) {
        case 'created':
          fixes[field] = new Date().toISOString();
          break;
        case 'priority':
          fixes[field] = 'P2';
          break;
        case 'status':
          fixes[field] = 'backlog';
          break;
        case 'estimated_hours':
          fixes[field] = 8; // Default estimate
          break;
        case 'tags':
          fixes[field] = [];
          break;
        default:
          fixes[field] = ''; // Let user fill in
      }
    }
    
    return { ...spec, ...fixes };
  }
}
```

#### IDFormatRule

```javascript
class IDFormatRule extends ValidationRule {
  constructor() {
    super('id-format', 'spec', {
      severity: 'error',
      autoFixable: false, // ID format changes are too risky to auto-fix
      description: 'Validates spec ID format matches expected pattern',
      fixSuggestion: 'Rename spec file and update ID to match pattern: TYPE-NNN'
    });
    
    this.validTypes = ['FEAT', 'BUG', 'SPEC', 'SPIKE', 'MAINT', 'RELEASE'];
    this.idPattern = /^(FEAT|BUG|SPEC|SPIKE|MAINT|RELEASE)-(\d{3})$/;
  }
  
  async validate(spec, context) {
    if (!spec.id) {
      return this.error('Spec missing ID field', 'MISSING_ID');
    }
    
    const match = spec.id.match(this.idPattern);
    if (!match) {
      return this.error(
        `Invalid ID format: ${spec.id}. Expected format: TYPE-NNN (e.g., FEAT-001)`,
        'INVALID_ID_FORMAT',
        { specId: spec.id, pattern: this.idPattern.source }
      );
    }
    
    const [, type, number] = match;
    
    // Validate type
    if (!this.validTypes.includes(type)) {
      return this.error(
        `Invalid spec type: ${type}. Valid types: ${this.validTypes.join(', ')}`,
        'INVALID_SPEC_TYPE',
        { specId: spec.id, type, validTypes: this.validTypes }
      );
    }
    
    // Check for ID uniqueness across project
    const allSpecs = context.getAllSpecs();
    const duplicates = allSpecs.filter(s => s.id === spec.id && s.filePath !== spec.filePath);
    
    if (duplicates.length > 0) {
      return this.error(
        `Duplicate spec ID: ${spec.id}`,
        'DUPLICATE_ID',
        { 
          specId: spec.id, 
          duplicateFiles: duplicates.map(d => d.filePath) 
        }
      );
    }
    
    return this.success();
  }
}
```

### Task Validation Rules

#### TaskDependencyRule

```javascript
class TaskDependencyRule extends ValidationRule {
  constructor() {
    super('task-dependencies', 'task', {
      severity: 'error',
      autoFixable: false,
      description: 'Validates task dependency references and prevents circular dependencies',
      fixSuggestion: 'Update task dependencies to reference valid tasks and remove circular references'
    });
  }
  
  async validate(task, context) {
    if (!task.depends_on || task.depends_on.length === 0) {
      return this.success(); // No dependencies to validate
    }
    
    const allSpecs = context.getAllSpecs();
    const allTasks = [];
    
    // Build comprehensive task list
    for (const spec of allSpecs) {
      if (spec.tasks) {
        allTasks.push(...spec.tasks.map(t => ({ ...t, specId: spec.id })));
      }
    }
    
    const errors = [];
    const warnings = [];
    
    // Validate each dependency reference
    for (const depId of task.depends_on) {
      const dependency = allTasks.find(t => t.id === depId);
      
      if (!dependency) {
        errors.push({
          code: 'INVALID_DEPENDENCY',
          message: `Task dependency not found: ${depId}`,
          data: { taskId: task.id, dependencyId: depId }
        });
      } else {
        // Check for circular dependencies
        if (this.hasCircularDependency(task, dependency, allTasks)) {
          errors.push({
            code: 'CIRCULAR_DEPENDENCY',
            message: `Circular dependency detected: ${task.id} → ${depId}`,
            data: { taskId: task.id, dependencyId: depId }
          });
        }
        
        // Check dependency status (warning level)
        if (dependency.status === 'ready' || dependency.status === 'pending') {
          warnings.push({
            code: 'DEPENDENCY_NOT_COMPLETE',
            message: `Dependency ${depId} is not completed (status: ${dependency.status})`,
            data: { taskId: task.id, dependencyId: depId, dependencyStatus: dependency.status }
          });
        }
      }
    }
    
    if (errors.length > 0) {
      return this.multiple(errors, warnings);
    } else if (warnings.length > 0) {
      return this.multiple([], warnings);
    }
    
    return this.success();
  }
  
  hasCircularDependency(task, dependency, allTasks, visited = new Set()) {
    if (visited.has(task.id)) {
      return true; // Found a cycle
    }
    
    visited.add(task.id);
    
    // Check if dependency eventually depends on the original task
    if (dependency.depends_on) {
      for (const depId of dependency.depends_on) {
        if (depId === task.id) {
          return true; // Direct circular dependency
        }
        
        const nextDep = allTasks.find(t => t.id === depId);
        if (nextDep && this.hasCircularDependency(task, nextDep, allTasks, new Set(visited))) {
          return true; // Indirect circular dependency
        }
      }
    }
    
    return false;
  }
}
```

## 🔌 Rule Integration Patterns

### Context Injection Pattern

```javascript
// Rules receive rich context with helper methods
const context = {
  project: { specs: [], config: {}, metadata: {} },
  spec: currentSpec, // When validating specific spec
  task: currentTask, // When validating specific task
  
  // Helper methods
  getAllSpecs: () => [...],
  getSpec: (id) => {...},
  findTaskById: (id) => {...},
  
  // Validation metadata
  validatedAt: '2024-08-27T...',
  validationId: 'val_...'
};

// Rules can access context easily
class MyRule extends ValidationRule {
  async validate(data, context) {
    const allSpecs = context.getAllSpecs();
    const projectConfig = context.project.config;
    // ... validation logic
  }
}
```

### Result Composition Pattern

```javascript
// Rules return standardized result objects
const result = {
  success: boolean,
  errors: [{ code, message, data, rule }],
  warnings: [{ code, message, data, rule }],
  info: [{ code, message, data, rule }],
  data: {}, // Additional result data
  fixes: [] // Available auto-fixes
};

// Engine aggregates results across all rules
const aggregated = {
  success: boolean,
  summary: { total, passed, failed, errors, warnings, info },
  byCategory: { spec: {...}, task: {...} },
  bySeverity: { error: [...], warning: [...], info: [...] },
  results: [], // Individual rule results
  fixes: [], // All available fixes
  performance: { executionTime, averageTime }
};
```

### Configuration Integration

```javascript
// Rules can be configured via asd.config.js
module.exports = {
  validation: {
    rules: {
      'required-fields': { 
        enabled: true, 
        severity: 'error',
        requiredFields: ['id', 'title', 'type', 'priority'] // Custom config
      },
      'id-format': { 
        enabled: true, 
        severity: 'error',
        pattern: '^(FEAT|BUG)-\\d{3}$', // Custom pattern
        validTypes: ['FEAT', 'BUG'] // Custom types
      }
    }
  }
};

// Rules access configuration through context
class ConfigurableRule extends ValidationRule {
  async validate(data, context) {
    const config = context.project.config.validation?.rules?.[this.name] || {};
    const requiredFields = config.requiredFields || this.defaultRequiredFields;
    // ... use configuration
  }
}
```

## 🚀 Performance Optimization

### Rule Caching

```javascript
class CachedValidationRule extends ValidationRule {
  constructor(name, category, options = {}) {
    super(name, category, options);
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
  }
  
  async validate(data, context) {
    const cacheKey = this.generateCacheKey(data, context);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    
    const result = await this.doValidate(data, context);
    
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  async doValidate(data, context) {
    // Actual validation logic implemented by subclasses
    throw new Error('Subclasses must implement doValidate');
  }
  
  generateCacheKey(data, context) {
    // Generate cache key based on data that affects validation
    return `${data.id || 'unknown'}_${data.filePath || 'unknown'}_${context.validatedAt}`;
  }
}
```

### Parallel Execution

```javascript
// Rules can specify if they're safe for parallel execution
class ParallelSafeRule extends ValidationRule {
  constructor(name, category, options = {}) {
    super(name, category, { 
      ...options, 
      parallelSafe: true // This rule can run in parallel with others
    });
  }
  
  // Parallel-safe rules should not modify shared state during validation
  async validate(data, context) {
    // Read-only operations only
    return this.success();
  }
}
```

This rule system architecture provides a robust, extensible foundation for ASD validation while following established patterns and maintaining performance requirements.