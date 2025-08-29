const fs = require('fs').promises;
const path = require('path');
const WorkflowStateManager = require('./workflow-state-manager');
const ConfigManager = require('./config-manager');

/**
 * DocumentationTemplateManager - Structured temporary documentation with automatic lifecycle management
 *
 * Provides structured templates for temporary agent documentation that integrate with existing
 * workflow patterns, automatically clean up based on task/spec completion, and support different
 * report types (analysis, findings, recommendations) with performance under 100ms operations.
 *
 * Features:
 * - Structured temporary documentation with automatic lifecycle management
 * - Report templates that integrate with existing agent workflow patterns
 * - Auto-cleanup based on task/spec completion prevents documentation cruft
 * - Template system for different types of agent reports
 * - Integration with context and handoff systems
 * - Performance: Template operations under 100ms
 */
class DocumentationTemplateManager {
  constructor(configManager = null, workflowStateManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.workflowStateManager =
      workflowStateManager || new WorkflowStateManager(this.configManager);

    // Performance tracking
    this.performanceTimeout = 100; // 100ms requirement from spec

    // Template and report directories
    this.projectRoot = this.configManager.getProjectRoot();
    this.reportsDir = path.join(this.projectRoot, '.asd', 'reports');
    this.templatesDir = path.join(this.projectRoot, '.asd', 'templates');

    // Report type configurations
    this.reportTypes = {
      analysis: {
        name: 'Analysis Report',
        description: 'Detailed analysis with findings and recommendations',
        template: 'analysis-report-template.md',
        lifecycle: 'task_completion', // Cleanup when task completes
        retention_hours: 72, // Keep for 72 hours after task completion
      },
      findings: {
        name: 'Findings Document',
        description: 'Key discoveries and insights from investigation',
        template: 'findings-document-template.md',
        lifecycle: 'spec_completion', // Cleanup when spec completes
        retention_hours: 168, // Keep for 1 week after spec completion
      },
      recommendations: {
        name: 'Recommendations Report',
        description: 'Strategic recommendations and next steps',
        template: 'recommendations-report-template.md',
        lifecycle: 'manual', // Manual cleanup only
        retention_hours: null,
      },
      handoff: {
        name: 'Handoff Summary',
        description: 'Agent handoff documentation and context transfer',
        template: 'handoff-summary-template.md',
        lifecycle: 'immediate', // Cleanup after successful handoff
        retention_hours: 24, // Keep for 24 hours after handoff
      },
      audit: {
        name: 'Audit Report',
        description: 'Quality and compliance audit documentation',
        template: 'audit-report-template.md',
        lifecycle: 'spec_completion',
        retention_hours: 336, // Keep for 2 weeks
      },
    };

    // Lifecycle tracking
    this.cleanupSchedule = new Map();
    this.reportRegistry = new Map();
  }

  /**
   * Initialize the DocumentationTemplateManager
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    const startTime = Date.now();

    try {
      // Ensure directory structure exists
      await this.ensureDirectoryStructure();

      // Initialize workflow state manager
      await this.workflowStateManager.initialize();

      // Create default templates if they don't exist
      await this.ensureDefaultTemplates();

      // Load existing report registry
      await this.loadReportRegistry();

      // Setup lifecycle monitoring
      await this.setupLifecycleMonitoring();

      const initTime = Date.now() - startTime;
      if (initTime > 50) {
        console.warn(
          `DocumentationTemplateManager initialization took ${initTime}ms`
        );
      }

      return true;
    } catch (error) {
      throw new Error(
        `DocumentationTemplateManager initialization failed: ${error.message}`
      );
    }
  }

  /**
   * Create a new report from template
   * @param {Object} options - Report creation options
   * @param {string} options.type - Report type (analysis, findings, recommendations, etc.)
   * @param {string} options.title - Report title
   * @param {string} options.specId - Associated specification ID
   * @param {string} [options.taskId] - Associated task ID
   * @param {string} options.agentType - Agent type creating the report
   * @param {Object} [options.context] - Additional context data
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {Promise<Object>} Report creation result
   */
  async createReport(options) {
    const startTime = Date.now();

    try {
      // Validate options
      const validation = this.validateReportOptions(options);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid report options: ${validation.errors.join(', ')}`,
          performance: { total: Date.now() - startTime },
        };
      }

      // Generate report ID and paths
      const reportId = this.generateReportId(options);
      const reportPath = this.getReportPath(options.type, reportId);

      // Load and populate template
      const template = await this.loadTemplate(options.type);
      const populatedContent = await this.populateTemplate(
        template,
        options,
        reportId
      );

      // Create report metadata
      const metadata = {
        id: reportId,
        type: options.type,
        title: options.title,
        specId: options.specId,
        taskId: options.taskId || null,
        agentType: options.agentType,
        createdAt: new Date().toISOString(),
        lifecycle: this.reportTypes[options.type].lifecycle,
        retentionHours: this.reportTypes[options.type].retention_hours,
        status: 'active',
        path: reportPath,
        context: options.context || {},
        ...(options.metadata || {}),
      };

      // Write report file
      await fs.writeFile(reportPath, populatedContent, 'utf-8');

      // Register report in registry
      this.reportRegistry.set(reportId, metadata);
      await this.saveReportRegistry();

      // Schedule cleanup based on lifecycle
      await this.scheduleCleanup(reportId, metadata);

      const totalTime = Date.now() - startTime;
      if (totalTime > this.performanceTimeout) {
        console.warn(
          `Report creation took ${totalTime}ms, exceeding ${this.performanceTimeout}ms target`
        );
      }

      return {
        success: true,
        reportId,
        reportPath,
        metadata,
        performance: { total: totalTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Report creation failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Update existing report content
   * @param {string} reportId - Report ID
   * @param {Object} updates - Content and metadata updates
   * @returns {Promise<Object>} Update result
   */
  async updateReport(reportId, updates) {
    const startTime = Date.now();

    try {
      const metadata = this.reportRegistry.get(reportId);
      if (!metadata) {
        return {
          success: false,
          error: `Report ${reportId} not found`,
          performance: { total: Date.now() - startTime },
        };
      }

      // Update content if provided
      if (updates.content) {
        await fs.writeFile(metadata.path, updates.content, 'utf-8');
      }

      // Update metadata
      if (updates.metadata) {
        Object.assign(metadata, updates.metadata);
        metadata.lastModified = new Date().toISOString();
        this.reportRegistry.set(reportId, metadata);
        await this.saveReportRegistry();
      }

      const totalTime = Date.now() - startTime;
      return {
        success: true,
        reportId,
        metadata,
        performance: { total: totalTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Report update failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Get report information and content
   * @param {string} reportId - Report ID
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} Report data
   */
  async getReport(reportId, options = {}) {
    const startTime = Date.now();

    try {
      const metadata = this.reportRegistry.get(reportId);
      if (!metadata) {
        return {
          success: false,
          error: `Report ${reportId} not found`,
          performance: { total: Date.now() - startTime },
        };
      }

      let content = null;
      if (options.includeContent !== false) {
        try {
          content = await fs.readFile(metadata.path, 'utf-8');
        } catch (error) {
          // File may have been cleaned up
          if (error.code === 'ENOENT') {
            await this.removeReportFromRegistry(reportId);
            return {
              success: false,
              error: `Report ${reportId} file not found (may have been cleaned up)`,
              performance: { total: Date.now() - startTime },
            };
          }
          throw error;
        }
      }

      return {
        success: true,
        reportId,
        metadata,
        content,
        performance: { total: Date.now() - startTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Report retrieval failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * List reports with filtering options
   * @param {Object} filters - Filtering options
   * @returns {Promise<Object>} List of reports
   */
  async listReports(filters = {}) {
    const startTime = Date.now();

    try {
      let reports = Array.from(this.reportRegistry.values());

      // Apply filters
      if (filters.type) {
        reports = reports.filter((r) => r.type === filters.type);
      }
      if (filters.specId) {
        reports = reports.filter((r) => r.specId === filters.specId);
      }
      if (filters.taskId) {
        reports = reports.filter((r) => r.taskId === filters.taskId);
      }
      if (filters.agentType) {
        reports = reports.filter((r) => r.agentType === filters.agentType);
      }
      if (filters.status) {
        reports = reports.filter((r) => r.status === filters.status);
      }

      // Sort reports
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      reports.sort((a, b) => {
        const aVal = a[sortBy] || '';
        const bVal = b[sortBy] || '';
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      const paginatedReports = reports.slice(offset, offset + limit);

      return {
        success: true,
        reports: paginatedReports,
        total: reports.length,
        offset,
        limit,
        performance: { total: Date.now() - startTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Report listing failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Execute cleanup based on lifecycle rules
   * @param {Object} options - Cleanup options
   * @returns {Promise<Object>} Cleanup results
   */
  async executeCleanup(options = {}) {
    const startTime = Date.now();

    try {
      const results = {
        cleaned: [],
        errors: [],
        totalCleaned: 0,
        totalErrors: 0,
      };

      // Get all reports eligible for cleanup
      const reports = Array.from(this.reportRegistry.values());
      const currentTime = new Date();

      for (const report of reports) {
        try {
          if (await this.shouldCleanupReport(report, currentTime, options)) {
            const cleanupResult = await this.cleanupSingleReport(report.id);
            if (cleanupResult.success) {
              results.cleaned.push({
                reportId: report.id,
                reason: cleanupResult.reason,
                type: report.type,
              });
              results.totalCleaned++;
            } else {
              results.errors.push({
                reportId: report.id,
                error: cleanupResult.error,
              });
              results.totalErrors++;
            }
          }
        } catch (error) {
          results.errors.push({
            reportId: report.id,
            error: error.message,
          });
          results.totalErrors++;
        }
      }

      return {
        success: true,
        cleanup: results,
        performance: { total: Date.now() - startTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Cleanup execution failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Get available report templates
   * @returns {Promise<Object>} Available templates
   */
  async getAvailableTemplates() {
    const startTime = Date.now();

    try {
      const templates = {};

      for (const [type, config] of Object.entries(this.reportTypes)) {
        const templatePath = path.join(this.templatesDir, config.template);
        let templateExists = false;
        let templateContent = null;

        try {
          await fs.access(templatePath);
          templateExists = true;
          templateContent = await fs.readFile(templatePath, 'utf-8');
        } catch (error) {
          // Template doesn't exist yet
        }

        templates[type] = {
          ...config,
          templatePath,
          templateExists,
          templateContent: templateExists ? templateContent : null,
        };
      }

      return {
        success: true,
        templates,
        performance: { total: Date.now() - startTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Template retrieval failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  /**
   * Get system statistics and health
   * @returns {Promise<Object>} System statistics
   */
  async getSystemStats() {
    const startTime = Date.now();

    try {
      const reports = Array.from(this.reportRegistry.values());
      const currentTime = new Date();

      // Calculate statistics
      const stats = {
        totalReports: reports.length,
        activeReports: reports.filter((r) => r.status === 'active').length,
        reportsByType: {},
        reportsByAgent: {},
        reportsBySpec: {},
        upcomingCleanups: 0,
        oldestReport: null,
        newestReport: null,
        averageRetentionHours: 0,
      };

      // Calculate detailed statistics
      for (const report of reports) {
        // By type
        stats.reportsByType[report.type] =
          (stats.reportsByType[report.type] || 0) + 1;

        // By agent
        stats.reportsByAgent[report.agentType] =
          (stats.reportsByAgent[report.agentType] || 0) + 1;

        // By spec
        stats.reportsBySpec[report.specId] =
          (stats.reportsBySpec[report.specId] || 0) + 1;

        // Check if cleanup is upcoming (within 24 hours)
        if (report.retentionHours && report.lifecycle !== 'manual') {
          const cleanupTime = new Date(
            new Date(report.createdAt).getTime() +
              report.retentionHours * 60 * 60 * 1000
          );
          const hoursUntilCleanup =
            (cleanupTime - currentTime) / (60 * 60 * 1000);
          if (hoursUntilCleanup <= 24 && hoursUntilCleanup > 0) {
            stats.upcomingCleanups++;
          }
        }

        // Track oldest and newest
        const reportTime = new Date(report.createdAt);
        if (
          !stats.oldestReport ||
          reportTime < new Date(stats.oldestReport.createdAt)
        ) {
          stats.oldestReport = report;
        }
        if (
          !stats.newestReport ||
          reportTime > new Date(stats.newestReport.createdAt)
        ) {
          stats.newestReport = report;
        }
      }

      // Calculate average retention hours
      const reportsWithRetention = reports.filter((r) => r.retentionHours);
      if (reportsWithRetention.length > 0) {
        stats.averageRetentionHours =
          reportsWithRetention.reduce((sum, r) => sum + r.retentionHours, 0) /
          reportsWithRetention.length;
      }

      return {
        success: true,
        stats,
        generatedAt: currentTime.toISOString(),
        performance: { total: Date.now() - startTime },
      };
    } catch (error) {
      return {
        success: false,
        error: `Stats generation failed: ${error.message}`,
        performance: { total: Date.now() - startTime },
      };
    }
  }

  // Private helper methods

  /**
   * Ensure directory structure exists
   * @private
   */
  async ensureDirectoryStructure() {
    const directories = [
      this.reportsDir,
      this.templatesDir,
      path.join(this.reportsDir, 'analysis'),
      path.join(this.reportsDir, 'findings'),
      path.join(this.reportsDir, 'recommendations'),
      path.join(this.reportsDir, 'handoff'),
      path.join(this.reportsDir, 'audit'),
      path.join(this.reportsDir, 'archived'),
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Ensure default templates exist
   * @private
   */
  async ensureDefaultTemplates() {
    for (const [type, config] of Object.entries(this.reportTypes)) {
      const templatePath = path.join(this.templatesDir, config.template);

      try {
        await fs.access(templatePath);
      } catch (error) {
        // Create default template
        const defaultTemplate = this.generateDefaultTemplate(type, config);
        await fs.writeFile(templatePath, defaultTemplate, 'utf-8');
      }
    }
  }

  /**
   * Generate default template content
   * @private
   */
  generateDefaultTemplate(type, config) {
    const templates = {
      analysis: `---
type: analysis
title: "{{title}}"
spec_id: "{{specId}}"
task_id: "{{taskId}}"
agent_type: "{{agentType}}"
created_at: "{{createdAt}}"
status: active
---

# Analysis Report: {{title}}

**Specification**: {{specId}}  
**Task**: {{taskId}}  
**Agent**: {{agentType}}  
**Created**: {{createdAt}}

## Executive Summary

_Provide a brief overview of the analysis and key findings_

## Detailed Analysis

### Key Findings

1. **Finding 1**: Description and implications
2. **Finding 2**: Description and implications
3. **Finding 3**: Description and implications

### Technical Assessment

- **Strengths**: What works well
- **Weaknesses**: Areas needing attention
- **Risks**: Potential issues identified
- **Opportunities**: Areas for improvement

## Recommendations

### High Priority
- [ ] Recommendation 1 with rationale
- [ ] Recommendation 2 with rationale

### Medium Priority
- [ ] Recommendation 3 with rationale
- [ ] Recommendation 4 with rationale

### Low Priority
- [ ] Recommendation 5 with rationale

## Next Steps

1. **Immediate Actions**: What should happen next
2. **Dependencies**: What needs to be resolved first
3. **Timeline**: Suggested timeline for implementation

## Context & References

{{#if context}}
### Additional Context
{{context}}
{{/if}}

---
*Generated by ASD Documentation Template Manager*
`,

      findings: `---
type: findings
title: "{{title}}"
spec_id: "{{specId}}"
task_id: "{{taskId}}"
agent_type: "{{agentType}}"
created_at: "{{createdAt}}"
status: active
---

# Findings Document: {{title}}

**Specification**: {{specId}}  
**Task**: {{taskId}}  
**Agent**: {{agentType}}  
**Created**: {{createdAt}}

## Key Discoveries

### Critical Findings
- **Finding**: Description and impact
- **Finding**: Description and impact

### Important Observations
- **Observation**: What was learned
- **Observation**: What was learned

### Technical Insights
- **Insight**: Technical discovery
- **Insight**: Technical discovery

## Evidence & Data

### Code Analysis
\`\`\`
// Relevant code examples or patterns discovered
\`\`\`

### Performance Data
- Metric: Value and context
- Metric: Value and context

### Integration Points
- System: How it integrates
- System: How it integrates

## Implications

### For Current Work
- How these findings affect the current task
- Adjustments needed based on discoveries

### For Future Development
- Long-term implications
- Considerations for next phases

## Recommendations Based on Findings

1. **Immediate**: Action based on critical findings
2. **Short-term**: Actions for important observations  
3. **Long-term**: Strategic actions based on insights

---
*Generated by ASD Documentation Template Manager*
`,

      recommendations: `---
type: recommendations
title: "{{title}}"
spec_id: "{{specId}}"
task_id: "{{taskId}}"
agent_type: "{{agentType}}"
created_at: "{{createdAt}}"
status: active
---

# Recommendations Report: {{title}}

**Specification**: {{specId}}  
**Task**: {{taskId}}  
**Agent**: {{agentType}}  
**Created**: {{createdAt}}

## Strategic Recommendations

### High Priority (P0)
1. **Recommendation**: Description and rationale
   - **Impact**: Expected outcome
   - **Effort**: Time/resource estimate  
   - **Risk**: Mitigation strategies

### Medium Priority (P1)
1. **Recommendation**: Description and rationale
   - **Impact**: Expected outcome
   - **Effort**: Time/resource estimate
   - **Risk**: Mitigation strategies

### Low Priority (P2)  
1. **Recommendation**: Description and rationale
   - **Impact**: Expected outcome
   - **Effort**: Time/resource estimate
   - **Risk**: Mitigation strategies

## Implementation Guidance

### Recommended Sequence
1. **Phase 1**: High priority items
2. **Phase 2**: Medium priority items
3. **Phase 3**: Low priority items

### Resource Requirements
- **Development**: Skills and time needed
- **Testing**: QA requirements
- **Infrastructure**: System resources
- **Documentation**: Knowledge management needs

### Success Metrics
- **Metric 1**: How to measure success
- **Metric 2**: How to measure success
- **Metric 3**: How to measure success

## Risk Assessment

### Implementation Risks
- **Risk**: Description and mitigation
- **Risk**: Description and mitigation

### Technical Risks  
- **Risk**: Description and mitigation
- **Risk**: Description and mitigation

## Dependencies & Prerequisites

- **Dependency**: What needs to happen first
- **Dependency**: What needs to happen first

---
*Generated by ASD Documentation Template Manager*
`,

      handoff: `---
type: handoff
title: "{{title}}"
spec_id: "{{specId}}"
task_id: "{{taskId}}"
agent_type: "{{agentType}}"
created_at: "{{createdAt}}"
status: active
---

# Agent Handoff Summary: {{title}}

**From**: {{agentType}}  
**Specification**: {{specId}}  
**Task**: {{taskId}}  
**Handoff Time**: {{createdAt}}

## Work Completed

### Deliverables
- [x] **Deliverable 1**: Description of what was completed
- [x] **Deliverable 2**: Description of what was completed
- [x] **Deliverable 3**: Description of what was completed

### Key Achievements
- Achievement and its significance
- Achievement and its significance

## Context for Next Agent

### Current State
- Where the work stands now
- What is ready for the next phase

### Critical Information
- Important details the next agent must know
- Configuration changes made
- Dependencies established

### Files Modified
- \`path/to/file1.js\` - Description of changes
- \`path/to/file2.js\` - Description of changes

## Next Steps

### Immediate Tasks
1. **Task**: Description for next agent
2. **Task**: Description for next agent

### Setup Requirements
- Environmental setup needed
- Dependencies to install
- Configuration changes required

### Validation Steps
- [ ] Verify deliverable 1 works as expected
- [ ] Verify deliverable 2 integrates properly
- [ ] Run test suite to ensure no regressions

## Important Notes

### Challenges Encountered
- Challenge and how it was resolved
- Challenge and how it was resolved

### Decisions Made
- Decision and rationale
- Decision and rationale

### Areas Requiring Attention
- Area that needs careful handling
- Area that needs careful handling

---
*Generated by ASD Documentation Template Manager*
`,

      audit: `---
type: audit
title: "{{title}}"
spec_id: "{{specId}}"
task_id: "{{taskId}}"
agent_type: "{{agentType}}"
created_at: "{{createdAt}}"
status: active
---

# Audit Report: {{title}}

**Specification**: {{specId}}  
**Task**: {{taskId}}  
**Auditor**: {{agentType}}  
**Audit Date**: {{createdAt}}

## Audit Scope

### Areas Covered
- Area 1: Description
- Area 2: Description
- Area 3: Description

### Methodology
- Approach used for the audit
- Tools and techniques employed

## Findings

### Compliance Status

#### ✅ Compliant Areas
- **Standard/Requirement**: Status and evidence
- **Standard/Requirement**: Status and evidence

#### ⚠️ Partial Compliance
- **Standard/Requirement**: Issues identified and recommendations
- **Standard/Requirement**: Issues identified and recommendations

#### ❌ Non-Compliant Areas
- **Standard/Requirement**: Critical issues requiring immediate attention
- **Standard/Requirement**: Critical issues requiring immediate attention

## Risk Assessment

### High Risk Issues
1. **Issue**: Description, impact, and recommended action
2. **Issue**: Description, impact, and recommended action

### Medium Risk Issues
1. **Issue**: Description, impact, and recommended action
2. **Issue**: Description, impact, and recommended action

### Low Risk Issues
1. **Issue**: Description, impact, and recommended action

## Recommendations

### Immediate Actions Required
- [ ] Action 1: Description and deadline
- [ ] Action 2: Description and deadline

### Short-term Improvements
- [ ] Improvement 1: Description and timeline
- [ ] Improvement 2: Description and timeline

### Long-term Enhancements
- [ ] Enhancement 1: Description and strategic value
- [ ] Enhancement 2: Description and strategic value

## Summary

### Overall Assessment
- General compliance status
- Key strengths identified
- Primary areas for improvement

### Next Audit
- Recommended timeline for follow-up audit
- Areas to focus on in next review

---
*Generated by ASD Documentation Template Manager*
`,
    };

    return (
      templates[type] ||
      `# ${config.name}\n\nTemplate content for ${type} reports.\n`
    );
  }

  /**
   * Load and parse template
   * @private
   */
  async loadTemplate(type) {
    const config = this.reportTypes[type];
    if (!config) {
      throw new Error(`Unknown report type: ${type}`);
    }

    const templatePath = path.join(this.templatesDir, config.template);
    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to load template ${config.template}: ${error.message}`
      );
    }
  }

  /**
   * Populate template with data
   * @private
   */
  async populateTemplate(template, options, reportId) {
    // Simple template variable replacement
    // In a more sophisticated implementation, you might use a template engine like Handlebars
    let content = template;

    const replacements = {
      '{{title}}': options.title,
      '{{specId}}': options.specId,
      '{{taskId}}': options.taskId || 'N/A',
      '{{agentType}}': options.agentType,
      '{{createdAt}}': new Date().toISOString(),
      '{{reportId}}': reportId,
      '{{context}}': options.context
        ? JSON.stringify(options.context, null, 2)
        : '',
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        value
      );
    }

    return content;
  }

  /**
   * Generate unique report ID
   * @private
   */
  generateReportId(options) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const prefix = options.type.substring(0, 3).toUpperCase();
    return `${prefix}-${options.specId}-${timestamp}-${random}`;
  }

  /**
   * Get report file path
   * @private
   */
  getReportPath(type, reportId) {
    const filename = `${reportId}.md`;
    return path.join(this.reportsDir, type, filename);
  }

  /**
   * Validate report creation options
   * @private
   */
  validateReportOptions(options) {
    const validation = { isValid: true, errors: [] };

    if (!options.type || !this.reportTypes[options.type]) {
      validation.isValid = false;
      validation.errors.push(`Invalid or missing report type: ${options.type}`);
    }

    if (!options.title || typeof options.title !== 'string') {
      validation.isValid = false;
      validation.errors.push('Report title is required and must be a string');
    }

    if (!options.specId || typeof options.specId !== 'string') {
      validation.isValid = false;
      validation.errors.push('Spec ID is required and must be a string');
    }

    if (!options.agentType || typeof options.agentType !== 'string') {
      validation.isValid = false;
      validation.errors.push('Agent type is required and must be a string');
    }

    return validation;
  }

  /**
   * Load report registry from disk
   * @private
   */
  async loadReportRegistry() {
    try {
      const registryPath = path.join(this.reportsDir, 'registry.json');
      try {
        const content = await fs.readFile(registryPath, 'utf-8');
        const data = JSON.parse(content);

        // Convert array back to Map
        if (Array.isArray(data)) {
          for (const report of data) {
            this.reportRegistry.set(report.id, report);
          }
        } else if (data.reports) {
          for (const report of data.reports) {
            this.reportRegistry.set(report.id, report);
          }
        }
      } catch (error) {
        // Registry doesn't exist yet - that's ok
        console.debug('No existing report registry found, starting fresh');
      }
    } catch (error) {
      console.warn(`Failed to load report registry: ${error.message}`);
    }
  }

  /**
   * Save report registry to disk
   * @private
   */
  async saveReportRegistry() {
    try {
      const registryPath = path.join(this.reportsDir, 'registry.json');
      const reports = Array.from(this.reportRegistry.values());
      const data = {
        reports,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
      };

      await fs.writeFile(registryPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.warn(`Failed to save report registry: ${error.message}`);
    }
  }

  /**
   * Setup lifecycle monitoring for automatic cleanup
   * @private
   */
  async setupLifecycleMonitoring() {
    // In a real implementation, this might set up file watchers or periodic checks
    // For this implementation, cleanup is triggered manually or via CLI
    console.debug(
      'Lifecycle monitoring initialized - use executeCleanup() for cleanup operations'
    );
  }

  /**
   * Schedule cleanup for a report based on its lifecycle rules
   * @private
   */
  async scheduleCleanup(reportId, metadata) {
    if (metadata.lifecycle === 'manual' || !metadata.retentionHours) {
      return; // No automatic cleanup
    }

    const cleanupTime = new Date(
      new Date(metadata.createdAt).getTime() +
        metadata.retentionHours * 60 * 60 * 1000
    );
    this.cleanupSchedule.set(reportId, cleanupTime);
  }

  /**
   * Check if report should be cleaned up
   * @private
   */
  async shouldCleanupReport(report, currentTime, options) {
    // Manual cleanup only
    if (report.lifecycle === 'manual') {
      return options.forceCleanup === true;
    }

    // Immediate cleanup (after handoff completion)
    if (report.lifecycle === 'immediate') {
      return options.triggerType === 'handoff_complete';
    }

    // Task completion cleanup
    if (report.lifecycle === 'task_completion') {
      if (
        options.completedTaskIds &&
        options.completedTaskIds.includes(report.taskId)
      ) {
        return true;
      }
      // Also check retention time
      if (report.retentionHours) {
        const cleanupTime = new Date(
          new Date(report.createdAt).getTime() +
            report.retentionHours * 60 * 60 * 1000
        );
        return currentTime >= cleanupTime;
      }
    }

    // Spec completion cleanup
    if (report.lifecycle === 'spec_completion') {
      if (
        options.completedSpecIds &&
        options.completedSpecIds.includes(report.specId)
      ) {
        return true;
      }
      // Also check retention time
      if (report.retentionHours) {
        const cleanupTime = new Date(
          new Date(report.createdAt).getTime() +
            report.retentionHours * 60 * 60 * 1000
        );
        return currentTime >= cleanupTime;
      }
    }

    // Age-based cleanup
    if (report.retentionHours && options.respectRetentionTime !== false) {
      const cleanupTime = new Date(
        new Date(report.createdAt).getTime() +
          report.retentionHours * 60 * 60 * 1000
      );
      return currentTime >= cleanupTime;
    }

    return false;
  }

  /**
   * Clean up a single report
   * @private
   */
  async cleanupSingleReport(reportId) {
    try {
      const metadata = this.reportRegistry.get(reportId);
      if (!metadata) {
        return { success: false, error: 'Report not found in registry' };
      }

      // Move file to archived folder instead of deleting
      const archivePath = path.join(
        this.reportsDir,
        'archived',
        path.basename(metadata.path)
      );

      try {
        await fs.access(metadata.path);
        await fs.rename(metadata.path, archivePath);
      } catch (error) {
        // File may already be gone
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Update metadata
      metadata.status = 'archived';
      metadata.archivedAt = new Date().toISOString();
      metadata.path = archivePath;

      // Remove from cleanup schedule
      this.cleanupSchedule.delete(reportId);

      return {
        success: true,
        reason: `Report archived due to ${metadata.lifecycle} lifecycle rule`,
        archivedPath: archivePath,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to cleanup report ${reportId}: ${error.message}`,
      };
    }
  }

  /**
   * Remove report from registry (when file is missing)
   * @private
   */
  async removeReportFromRegistry(reportId) {
    this.reportRegistry.delete(reportId);
    this.cleanupSchedule.delete(reportId);
    await this.saveReportRegistry();
  }

  /**
   * Integration method for WorkflowStateManager lifecycle events
   * @param {string} eventType - Event type (task_completed, spec_completed, etc.)
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Cleanup result
   */
  async handleLifecycleEvent(eventType, eventData) {
    const cleanupOptions = { triggerType: eventType };

    if (eventType === 'task_completed' && eventData.taskId) {
      cleanupOptions.completedTaskIds = [eventData.taskId];
    } else if (eventType === 'spec_completed' && eventData.specId) {
      cleanupOptions.completedSpecIds = [eventData.specId];
    } else if (eventType === 'handoff_complete') {
      cleanupOptions.triggerType = 'handoff_complete';
    }

    return await this.executeCleanup(cleanupOptions);
  }
}

module.exports = DocumentationTemplateManager;
