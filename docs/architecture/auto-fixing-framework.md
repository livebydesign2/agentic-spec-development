# Auto-Fixing Framework Architecture

**Document**: Technical Design - Auto-Fixing Framework  
**Status**: Proposed  
**Date**: 2024-08-27  
**Architect**: Software Architect AI Agent  

## 🎯 Auto-Fixing Overview

The ASD Auto-Fixing Framework provides safe, user-controlled automatic resolution of validation issues with comprehensive safety mechanisms, user confirmation, and rollback capabilities.

## 🏗️ Auto-Fixing Architecture

```
┌─────────────────── USER INTERFACE ──────────────────┐
│                                                      │
│ ┌─────────────────────────────────────────────────┐  │
│ │           CLI Auto-Fix Interface                │  │
│ │                                                 │  │
│ │  asd validate --fix                             │  │
│ │  asd validate --preview-fixes                   │  │
│ │  asd validate --fix --confirm-all               │  │
│ │  asd validate --fix --safe-only                 │  │
│ └─────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────┘
                       │
┌─────────────────── AUTO-FIX ENGINE ─────────────────┐
│                      │                               │
│ ┌─────────────────┴─────────────────────────────────┐ │
│ │              AutoFixEngine                        │ │
│ │                                                   │ │
│ │  • Fix discovery & prioritization                 │ │
│ │  • Safety validation & risk assessment            │ │
│ │  • User confirmation management                   │ │
│ │  • Atomic fix execution                          │ │
│ │  • Rollback & recovery mechanisms                │ │
│ │  • Fix result reporting                          │ │
│ └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                       │
┌─────────────────── SAFETY SYSTEM ───────────────────┐
│                      │                               │
│ ┌─────────────────┴─────────────────────────────────┐ │
│ │             SafetyValidator                       │ │
│ │                                                   │ │
│ │  • Pre-fix validation                            │ │
│ │  • Content integrity checks                     │ │
│ │  • Backup creation & management                 │ │
│ │  • Risk level assessment                        │ │
│ │  • Post-fix validation                          │ │
│ └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                       │
┌─────────────────── FIX STRATEGIES ──────────────────┐
│                      │                               │
│ ┌─────────────────┴─────────┐ ┌─────────────────────┐ │
│ │   StructuralFixes         │ │   ContentFixes      │ │
│ │                           │ │                     │ │
│ │ • Missing field addition  │ │ • Format cleanup    │ │
│ │ • YAML structure repair   │ │ • Text normalization│ │
│ │ • ID format standardization│ │ • Date formatting   │ │
│ │ • Default value population│ │ • Priority mapping  │ │
│ │ • Template compliance     │ │ • Status correction │ │
│ └───────────────────────────┘ └─────────────────────┘ │
│                                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │              CustomFixStrategies                    │ │
│ │                                                     │ │
│ │  • User-defined fix patterns                       │ │
│ │  • Project-specific transformations               │ │
│ │  • Rule-specific auto-fixes                       │ │
│ │  • Advanced content generation                    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                       │
┌─────────────────── CONFIRMATION SYSTEM ─────────────┐
│                      │                               │
│ ┌─────────────────┴─────────────────────────────────┐ │
│ │           UserConfirmationManager                 │ │
│ │                                                   │ │
│ │  • Interactive confirmation prompts              │ │
│ │  • Batch confirmation options                    │ │
│ │  • Risk-based approval workflows                 │ │
│ │  • Preview generation & display                  │ │
│ │  • Confirmation result tracking                  │ │
│ └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                       │
┌─────────────────── INTEGRATION LAYER ───────────────┐
│                      │                               │
│ • FrontmatterSync: Safe file modifications          │ │
│ • ValidationManager: Fix execution coordination     │ │
│ • BackupManager: File backup & recovery            │ │
│ • ConfigManager: Auto-fix configuration            │ │
│ • CLI Interface: User interaction & reporting      │ │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Core Auto-Fix Components

### 1. AutoFixEngine (Primary Orchestrator)

```javascript
class AutoFixEngine {
  constructor(validationManager, backupManager) {
    this.validationManager = validationManager;
    this.backupManager = backupManager;
    this.safetyValidator = new SafetyValidator();
    this.confirmationManager = new UserConfirmationManager();
    this.fixStrategies = new Map();
    this.executionHistory = [];
    
    // Configuration
    this.requireConfirmation = true;
    this.safetyChecksEnabled = true;
    this.maxFixesPerOperation = 50;
    this.backupEnabled = true;
    
    // Initialize built-in fix strategies
    this.initializeFixStrategies();
  }
  
  // Main auto-fix methods
  async executeFixes(validationResults, options = {}) {
    const startTime = Date.now();
    const execution = {
      id: this.generateExecutionId(),
      startTime,
      options,
      fixes: [],
      results: {},
      backupId: null,
      status: 'running'
    };
    
    this.executionHistory.push(execution);
    
    try {
      // 1. Discover available fixes
      const availableFixes = await this.discoverFixes(validationResults);
      
      if (availableFixes.length === 0) {
        return {
          success: true,
          message: 'No auto-fixable issues found',
          execution,
          performance: { total: Date.now() - startTime }
        };
      }
      
      // 2. Filter and prioritize fixes
      const applicableFixes = await this.filterAndPrioritizeFixes(
        availableFixes, 
        options
      );
      
      if (applicableFixes.length === 0) {
        return {
          success: true,
          message: 'No applicable fixes after filtering',
          availableFixes,
          execution,
          performance: { total: Date.now() - startTime }
        };
      }
      
      execution.fixes = applicableFixes;
      
      // 3. Safety validation
      const safetyResult = await this.validateFixSafety(applicableFixes);
      if (!safetyResult.safe) {
        execution.status = 'blocked';
        execution.blockReason = safetyResult.reason;
        
        return {
          success: false,
          error: `Fixes blocked by safety validation: ${safetyResult.reason}`,
          safetyResult,
          execution,
          performance: { total: Date.now() - startTime }
        };
      }
      
      // 4. User confirmation (if required)
      if (this.requireConfirmation && !options.skipConfirmation) {
        const confirmation = await this.confirmationManager.requestConfirmation(
          applicableFixes, 
          options
        );
        
        if (!confirmation.approved) {
          execution.status = 'cancelled';
          execution.cancellationReason = 'User cancelled';
          
          return {
            success: false,
            message: 'Auto-fix cancelled by user',
            confirmation,
            execution,
            performance: { total: Date.now() - startTime }
          };
        }
        
        // Apply user selections
        execution.fixes = confirmation.selectedFixes || applicableFixes;
      }
      
      // 5. Create backup (if enabled)
      if (this.backupEnabled) {
        execution.backupId = await this.backupManager.createBackup(
          this.getAffectedFiles(execution.fixes),
          `autofix_${execution.id}`
        );
      }
      
      // 6. Execute fixes atomically
      const fixResults = await this.executeFixesAtomically(execution.fixes);
      execution.results = fixResults;
      
      // 7. Post-fix validation
      const postValidation = await this.validateFixResults(fixResults);
      
      if (!postValidation.success) {
        // Rollback on validation failure
        if (execution.backupId) {
          await this.rollbackChanges(execution.backupId);
        }
        
        execution.status = 'failed';
        execution.error = postValidation.error;
        
        return {
          success: false,
          error: `Post-fix validation failed: ${postValidation.error}`,
          fixResults,
          postValidation,
          execution,
          performance: { total: Date.now() - startTime }
        };
      }
      
      execution.status = 'completed';
      
      return {
        success: true,
        message: `Successfully applied ${fixResults.applied.length} fixes`,
        fixResults,
        postValidation,
        execution,
        performance: { total: Date.now() - startTime }
      };
      
    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      
      // Attempt rollback on error
      if (execution.backupId) {
        try {
          await this.rollbackChanges(execution.backupId);
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError.message);
        }
      }
      
      return {
        success: false,
        error: `Auto-fix execution failed: ${error.message}`,
        execution,
        performance: { total: Date.now() - startTime }
      };
    }
  }
  
  async previewFixes(validationResults, options = {}) {
    const availableFixes = await this.discoverFixes(validationResults);
    const applicableFixes = await this.filterAndPrioritizeFixes(availableFixes, options);
    
    const previews = await Promise.all(
      applicableFixes.map(async (fix) => ({
        ...fix,
        preview: await this.generateFixPreview(fix),
        safetyAssessment: await this.safetyValidator.assessFix(fix)
      }))
    );
    
    return {
      totalFixes: availableFixes.length,
      applicableFixes: previews.length,
      fixes: previews,
      summary: this.generatePreviewSummary(previews)
    };
  }
  
  // Fix discovery and management
  async discoverFixes(validationResults) {
    const fixes = [];
    
    for (const result of validationResults.results || []) {
      if (!result.success && result.errors) {
        for (const error of result.errors) {
          const applicableStrategies = this.findFixStrategies(error, result.rule);
          
          for (const strategy of applicableStrategies) {
            const fix = await strategy.createFix(error, result, validationResults);
            if (fix) {
              fixes.push({
                id: this.generateFixId(),
                error,
                rule: result.rule,
                category: result.category,
                strategy: strategy.name,
                fix,
                riskLevel: strategy.riskLevel || 'low',
                requiresConfirmation: strategy.requiresConfirmation || false,
                estimatedTime: strategy.estimatedTime || 100 // ms
              });
            }
          }
        }
      }
    }
    
    return fixes;
  }
  
  async filterAndPrioritizeFixes(fixes, options = {}) {
    let filtered = [...fixes];
    
    // Apply filters
    if (options.safeOnly) {
      filtered = filtered.filter(fix => fix.riskLevel === 'low');
    }
    
    if (options.categories) {
      const categories = Array.isArray(options.categories) 
        ? options.categories 
        : [options.categories];
      filtered = filtered.filter(fix => categories.includes(fix.category));
    }
    
    if (options.maxRiskLevel) {
      const riskOrder = { low: 0, medium: 1, high: 2 };
      const maxRisk = riskOrder[options.maxRiskLevel] || 0;
      filtered = filtered.filter(fix => 
        riskOrder[fix.riskLevel] <= maxRisk
      );
    }
    
    // Apply limit
    if (options.maxFixes || this.maxFixesPerOperation) {
      const limit = options.maxFixes || this.maxFixesPerOperation;
      filtered = filtered.slice(0, limit);
    }
    
    // Prioritize fixes
    filtered.sort((a, b) => {
      // Priority factors
      const priorityOrder = { 
        error: 3, 
        warning: 2, 
        info: 1 
      };
      
      const riskPenalty = { 
        low: 0, 
        medium: -1, 
        high: -2 
      };
      
      const aPriority = priorityOrder[a.error.severity || 'error'] + 
                      riskPenalty[a.riskLevel];
      const bPriority = priorityOrder[b.error.severity || 'error'] + 
                       riskPenalty[b.riskLevel];
      
      return bPriority - aPriority; // Higher priority first
    });
    
    return filtered;
  }
  
  async executeFixesAtomically(fixes) {
    const results = {
      applied: [],
      failed: [],
      skipped: [],
      summary: {
        total: fixes.length,
        applied: 0,
        failed: 0,
        skipped: 0
      }
    };
    
    // Group fixes by file to enable atomic file operations
    const fixesByFile = this.groupFixesByFile(fixes);
    
    for (const [filePath, fileFixes] of Object.entries(fixesByFile)) {
      try {
        const fileResult = await this.applyFixesToFile(filePath, fileFixes);
        
        results.applied.push(...fileResult.applied);
        results.failed.push(...fileResult.failed);
        results.skipped.push(...fileResult.skipped);
        
      } catch (error) {
        // Mark all fixes for this file as failed
        fileFixes.forEach(fix => {
          results.failed.push({
            fix,
            error: `File operation failed: ${error.message}`,
            filePath
          });
        });
      }
    }
    
    // Update summary
    results.summary.applied = results.applied.length;
    results.summary.failed = results.failed.length;
    results.summary.skipped = results.skipped.length;
    
    return results;
  }
  
  async applyFixesToFile(filePath, fixes) {
    const fileResults = {
      applied: [],
      failed: [],
      skipped: []
    };
    
    try {
      // Read current file content
      const originalContent = await fs.readFile(filePath, 'utf-8');
      let modifiedContent = originalContent;
      
      // Apply fixes in order
      for (const fixEntry of fixes) {
        try {
          const strategy = this.fixStrategies.get(fixEntry.strategy);
          if (!strategy) {
            throw new Error(`Fix strategy not found: ${fixEntry.strategy}`);
          }
          
          const fixResult = await strategy.applyFix(
            modifiedContent, 
            fixEntry.fix, 
            fixEntry.error
          );
          
          if (fixResult.success) {
            modifiedContent = fixResult.content;
            fileResults.applied.push({
              fix: fixEntry,
              changes: fixResult.changes || [],
              filePath
            });
          } else {
            fileResults.failed.push({
              fix: fixEntry,
              error: fixResult.error,
              filePath
            });
          }
          
        } catch (error) {
          fileResults.failed.push({
            fix: fixEntry,
            error: error.message,
            filePath
          });
        }
      }
      
      // Write modified content atomically if changes were made
      if (modifiedContent !== originalContent) {
        await this.atomicWrite(filePath, modifiedContent);
      }
      
    } catch (error) {
      // Mark all fixes as failed if file operations fail
      fixes.forEach(fix => {
        fileResults.failed.push({
          fix,
          error: `File operation failed: ${error.message}`,
          filePath
        });
      });
    }
    
    return fileResults;
  }
  
  // Safety and validation methods
  async validateFixSafety(fixes) {
    return this.safetyValidator.validateFixes(fixes);
  }
  
  async validateFixResults(fixResults) {
    try {
      const affectedFiles = [...new Set(
        [...fixResults.applied, ...fixResults.failed].map(r => r.filePath)
      )];
      
      // Re-validate affected files
      for (const filePath of affectedFiles) {
        const validationResult = await this.validationManager.validateSpecFile(filePath);
        if (!validationResult.success) {
          return {
            success: false,
            error: `Post-fix validation failed for ${filePath}`,
            validationResult
          };
        }
      }
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Post-fix validation error: ${error.message}`
      };
    }
  }
  
  // Utility methods
  async atomicWrite(filePath, content) {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    
    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw error;
    }
  }
  
  generateExecutionId() {
    return `fix_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
  
  generateFixId() {
    return `fix_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  groupFixesByFile(fixes) {
    const grouped = {};
    
    for (const fix of fixes) {
      const filePath = fix.fix.filePath || fix.error.data?.filePath;
      if (filePath) {
        if (!grouped[filePath]) {
          grouped[filePath] = [];
        }
        grouped[filePath].push(fix);
      }
    }
    
    return grouped;
  }
  
  getAffectedFiles(fixes) {
    return [...new Set(fixes.map(fix => 
      fix.fix.filePath || fix.error.data?.filePath
    ).filter(Boolean))];
  }
}
```

### 2. SafetyValidator (Risk Assessment)

```javascript
class SafetyValidator {
  constructor() {
    this.riskAssessmentRules = new Map();
    this.safeOperations = new Set([
      'add-missing-field',
      'format-whitespace',
      'normalize-dates',
      'fix-yaml-syntax'
    ]);
    this.unsafeOperations = new Set([
      'modify-id',
      'change-file-structure',
      'remove-content',
      'modify-dependencies'
    ]);
  }
  
  async validateFixes(fixes) {
    const assessment = {
      safe: true,
      reason: null,
      fixAssessments: [],
      overallRisk: 'low',
      warnings: []
    };
    
    let highestRisk = 'low';
    
    for (const fix of fixes) {
      const fixAssessment = await this.assessFix(fix);
      assessment.fixAssessments.push(fixAssessment);
      
      if (!fixAssessment.safe) {
        assessment.safe = false;
        if (!assessment.reason) {
          assessment.reason = fixAssessment.reason;
        }
      }
      
      if (fixAssessment.warnings.length > 0) {
        assessment.warnings.push(...fixAssessment.warnings);
      }
      
      // Track highest risk level
      const riskLevels = { low: 0, medium: 1, high: 2 };
      if (riskLevels[fixAssessment.riskLevel] > riskLevels[highestRisk]) {
        highestRisk = fixAssessment.riskLevel;
      }
    }
    
    assessment.overallRisk = highestRisk;
    
    return assessment;
  }
  
  async assessFix(fix) {
    const assessment = {
      fixId: fix.id,
      safe: true,
      riskLevel: 'low',
      reason: null,
      warnings: [],
      risks: [],
      mitigations: []
    };
    
    // Check operation type safety
    const operationType = fix.fix.operation || fix.strategy;
    
    if (this.unsafeOperations.has(operationType)) {
      assessment.safe = false;
      assessment.riskLevel = 'high';
      assessment.reason = `Unsafe operation: ${operationType}`;
      assessment.risks.push(`Operation ${operationType} can cause data loss`);
    } else if (this.safeOperations.has(operationType)) {
      assessment.riskLevel = 'low';
    } else {
      assessment.riskLevel = 'medium';
      assessment.warnings.push(`Unknown operation safety: ${operationType}`);
    }
    
    // Content integrity checks
    if (fix.fix.contentChanges) {
      const contentAssessment = this.assessContentChanges(fix.fix.contentChanges);
      if (!contentAssessment.safe) {
        assessment.safe = false;
        assessment.reason = contentAssessment.reason;
        assessment.risks.push(...contentAssessment.risks);
      }
      assessment.warnings.push(...contentAssessment.warnings);
    }
    
    // File modification scope
    const scopeAssessment = this.assessModificationScope(fix);
    if (scopeAssessment.riskLevel === 'high') {
      assessment.riskLevel = 'high';
      assessment.warnings.push(...scopeAssessment.warnings);
    }
    
    // Add suggested mitigations
    assessment.mitigations = this.suggestMitigations(assessment);
    
    return assessment;
  }
  
  assessContentChanges(contentChanges) {
    const assessment = {
      safe: true,
      reason: null,
      risks: [],
      warnings: []
    };
    
    // Check for potentially dangerous changes
    const dangerousPatterns = [
      /^\s*id\s*:/m, // ID field changes
      /^\s*depends_on\s*:/m, // Dependency changes
      /^\s*status\s*:\s*done/m // Status changes to done
    ];
    
    for (const change of contentChanges) {
      if (change.type === 'delete') {
        assessment.risks.push(`Content deletion: ${change.description}`);
        if (change.critical) {
          assessment.safe = false;
          assessment.reason = 'Critical content deletion detected';
        }
      }
      
      if (change.type === 'modify') {
        const content = change.newContent || '';
        for (const pattern of dangerousPatterns) {
          if (pattern.test(content)) {
            assessment.warnings.push(
              `Potentially risky modification: ${change.description}`
            );
          }
        }
      }
    }
    
    return assessment;
  }
  
  assessModificationScope(fix) {
    const assessment = {
      riskLevel: 'low',
      warnings: []
    };
    
    // Check if fix affects multiple files
    const affectedFiles = fix.fix.affectedFiles || [fix.fix.filePath];
    if (affectedFiles.length > 1) {
      assessment.riskLevel = 'medium';
      assessment.warnings.push(
        `Fix affects multiple files: ${affectedFiles.length}`
      );
    }
    
    // Check if fix affects critical sections
    const criticalSections = fix.fix.criticalSections || [];
    if (criticalSections.length > 0) {
      assessment.riskLevel = 'high';
      assessment.warnings.push(
        `Fix affects critical sections: ${criticalSections.join(', ')}`
      );
    }
    
    return assessment;
  }
  
  suggestMitigations(assessment) {
    const mitigations = [];
    
    if (assessment.riskLevel === 'high') {
      mitigations.push('Create backup before applying fix');
      mitigations.push('Review changes manually before confirmation');
      mitigations.push('Test validation after applying fix');
    }
    
    if (assessment.riskLevel === 'medium') {
      mitigations.push('Preview changes before applying');
      mitigations.push('Validate affected files after fix');
    }
    
    if (assessment.risks.length > 0) {
      mitigations.push('Enable rollback capability');
      mitigations.push('Monitor fix results closely');
    }
    
    return mitigations;
  }
}
```

### 3. Fix Strategies (Specific Fix Implementations)

```javascript
class FixStrategy {
  constructor(name, options = {}) {
    this.name = name;
    this.riskLevel = options.riskLevel || 'low';
    this.requiresConfirmation = options.requiresConfirmation || false;
    this.estimatedTime = options.estimatedTime || 100;
    this.applicableErrors = options.applicableErrors || [];
  }
  
  // Methods to be implemented by specific strategies
  async createFix(error, ruleResult, validationResults) {
    throw new Error('FixStrategy subclasses must implement createFix');
  }
  
  async applyFix(content, fix, error) {
    throw new Error('FixStrategy subclasses must implement applyFix');
  }
  
  // Helper methods
  canHandle(error, ruleResult) {
    return this.applicableErrors.includes(error.code) || 
           this.applicableErrors.length === 0;
  }
}

// Missing Field Fix Strategy
class MissingFieldFixStrategy extends FixStrategy {
  constructor() {
    super('missing-field-fix', {
      riskLevel: 'low',
      requiresConfirmation: false,
      applicableErrors: ['MISSING_REQUIRED_FIELDS']
    });
    
    this.defaultValues = {
      created: () => new Date().toISOString(),
      priority: 'P2',
      status: 'backlog',
      estimated_hours: 8,
      tags: () => [],
      acceptance_criteria: () => []
    };
  }
  
  async createFix(error, ruleResult, validationResults) {
    const missingFields = error.data?.missingFields;
    if (!missingFields || missingFields.length === 0) {
      return null;
    }
    
    const fixes = {};
    for (const field of missingFields) {
      if (this.defaultValues[field]) {
        const defaultValue = this.defaultValues[field];
        fixes[field] = typeof defaultValue === 'function' 
          ? defaultValue() 
          : defaultValue;
      } else {
        fixes[field] = ''; // Let user fill in manually
      }
    }
    
    return {
      operation: 'add-missing-fields',
      fields: fixes,
      filePath: error.data?.filePath,
      description: `Add missing fields: ${missingFields.join(', ')}`
    };
  }
  
  async applyFix(content, fix, error) {
    try {
      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (!frontmatterMatch) {
        return {
          success: false,
          error: 'No frontmatter found in file'
        };
      }
      
      const yaml = require('js-yaml');
      const frontmatter = yaml.load(frontmatterMatch[1]) || {};
      const markdownContent = frontmatterMatch[2] || '';
      
      // Add missing fields
      const updatedFrontmatter = { ...frontmatter, ...fix.fields };
      
      // Generate new content
      const newYaml = yaml.dump(updatedFrontmatter, { 
        indent: 2,
        lineWidth: -1 // Prevent line wrapping
      });
      
      const newContent = `---\n${newYaml}---\n${markdownContent}`;
      
      return {
        success: true,
        content: newContent,
        changes: Object.keys(fix.fields).map(field => ({
          type: 'add',
          field,
          value: fix.fields[field],
          description: `Added missing field: ${field}`
        }))
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to apply missing field fix: ${error.message}`
      };
    }
  }
}

// ID Format Fix Strategy
class IDFormatFixStrategy extends FixStrategy {
  constructor() {
    super('id-format-fix', {
      riskLevel: 'high', // ID changes are risky
      requiresConfirmation: true,
      applicableErrors: ['INVALID_ID_FORMAT']
    });
    
    this.idPattern = /^(FEAT|BUG|SPEC|SPIKE|MAINT|RELEASE)-(\d{3})$/;
  }
  
  async createFix(error, ruleResult, validationResults) {
    const currentId = error.data?.specId;
    if (!currentId) return null;
    
    // Try to extract type from current ID
    const typeMatch = currentId.match(/^([A-Z]+)/);
    const type = typeMatch ? typeMatch[1] : 'FEAT';
    
    // Generate suggested ID
    const suggestedId = await this.generateSuggestedId(type, validationResults);
    
    return {
      operation: 'fix-id-format',
      currentId,
      suggestedId,
      filePath: error.data?.filePath,
      description: `Fix ID format: ${currentId} → ${suggestedId}`,
      requiresRename: true // File may need to be renamed
    };
  }
  
  async applyFix(content, fix, error) {
    try {
      // This is a high-risk operation that requires careful handling
      const updatedContent = content.replace(
        new RegExp(`id:\\s*["']?${fix.currentId}["']?`, 'g'),
        `id: "${fix.suggestedId}"`
      );
      
      return {
        success: true,
        content: updatedContent,
        changes: [{
          type: 'modify',
          field: 'id',
          oldValue: fix.currentId,
          newValue: fix.suggestedId,
          description: `Updated spec ID format`,
          critical: true
        }],
        postActions: [{
          type: 'rename-file',
          oldName: fix.filePath,
          newName: fix.filePath.replace(fix.currentId, fix.suggestedId)
        }]
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to apply ID format fix: ${error.message}`
      };
    }
  }
  
  async generateSuggestedId(type, validationResults) {
    // Find highest number for this type
    let maxNumber = 0;
    const allSpecs = validationResults.context?.getAllSpecs() || [];
    
    for (const spec of allSpecs) {
      if (spec.id) {
        const match = spec.id.match(new RegExp(`^${type}-(\\d+)$`));
        if (match) {
          maxNumber = Math.max(maxNumber, parseInt(match[1]));
        }
      }
    }
    
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${type}-${nextNumber}`;
  }
}
```

## 🔐 Safety Mechanisms

### Backup System Integration

```javascript
class BackupManager {
  constructor() {
    this.backupDir = '.asd/backups';
    this.maxBackups = 50;
    this.backupRetention = 30 * 24 * 60 * 60 * 1000; // 30 days
  }
  
  async createBackup(filePaths, backupId) {
    const backupPath = path.join(this.backupDir, backupId);
    await fs.mkdir(backupPath, { recursive: true });
    
    const backup = {
      id: backupId,
      timestamp: new Date().toISOString(),
      files: [],
      metadata: {
        reason: 'auto-fix',
        fileCount: filePaths.length
      }
    };
    
    // Copy files to backup directory
    for (const filePath of filePaths) {
      try {
        const relativePath = path.relative(process.cwd(), filePath);
        const backupFilePath = path.join(backupPath, relativePath);
        
        await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
        await fs.copyFile(filePath, backupFilePath);
        
        backup.files.push({
          original: filePath,
          backup: backupFilePath,
          relativePath
        });
      } catch (error) {
        console.warn(`Failed to backup ${filePath}: ${error.message}`);
      }
    }
    
    // Save backup metadata
    await fs.writeFile(
      path.join(backupPath, 'backup.json'),
      JSON.stringify(backup, null, 2)
    );
    
    return backupId;
  }
  
  async restoreBackup(backupId) {
    const backupPath = path.join(this.backupDir, backupId);
    const metadataPath = path.join(backupPath, 'backup.json');
    
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    
    for (const file of metadata.files) {
      await fs.copyFile(file.backup, file.original);
    }
    
    return metadata;
  }
}
```

### User Confirmation System

```javascript
class UserConfirmationManager {
  constructor() {
    this.interactiveMode = true;
  }
  
  async requestConfirmation(fixes, options = {}) {
    if (options.confirmAll) {
      return { approved: true, selectedFixes: fixes };
    }
    
    if (options.safeOnly) {
      const safeFixes = fixes.filter(fix => fix.riskLevel === 'low');
      return { approved: true, selectedFixes: safeFixes };
    }
    
    // Interactive confirmation
    const confirmation = {
      approved: false,
      selectedFixes: [],
      userChoices: []
    };
    
    console.log('\n🔧 Auto-Fix Preview\n');
    console.log(`Found ${fixes.length} fixable issues:\n`);
    
    for (let i = 0; i < fixes.length; i++) {
      const fix = fixes[i];
      this.displayFixPreview(fix, i + 1);
      
      if (this.interactiveMode) {
        const choice = await this.promptForFix(fix);
        confirmation.userChoices.push(choice);
        
        if (choice.apply) {
          confirmation.selectedFixes.push(fix);
        }
      }
    }
    
    if (confirmation.selectedFixes.length > 0) {
      const finalConfirm = await this.promptFinalConfirmation(
        confirmation.selectedFixes.length
      );
      confirmation.approved = finalConfirm;
    }
    
    return confirmation;
  }
  
  displayFixPreview(fix, index) {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡', 
      high: '🔴'
    };
    
    console.log(`${index}. ${riskEmoji[fix.riskLevel]} ${fix.fix.description}`);
    console.log(`   Rule: ${fix.rule} (${fix.category})`);
    console.log(`   Risk: ${fix.riskLevel}`);
    console.log(`   File: ${fix.fix.filePath}`);
    
    if (fix.fix.preview) {
      console.log(`   Preview: ${fix.fix.preview}`);
    }
    
    console.log('');
  }
  
  async promptForFix(fix) {
    // Simplified - in real implementation would use interactive prompts
    return {
      apply: fix.riskLevel !== 'high', // Auto-approve low/medium risk
      reason: fix.riskLevel === 'high' ? 'High risk - skipped' : 'Approved'
    };
  }
  
  async promptFinalConfirmation(count) {
    console.log(`\nApply ${count} fixes? [y/N]: `);
    // Simplified - in real implementation would wait for user input
    return true; // For demo purposes
  }
}
```

This auto-fixing framework provides safe, controlled automatic resolution of validation issues while maintaining user control and system integrity through comprehensive safety mechanisms.