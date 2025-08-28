const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const Handlebars = require('handlebars');

/**
 * Sub-agent Prompt Generator for FEAT-028
 * Creates optimized prompts for different agent types with task-specific examples and constraints
 */
class PromptGenerator {
  constructor(configManager) {
    this.configManager = configManager;
    this.templateCache = new Map();
    this.templateTimeout = 600000; // 10 minutes
    this.maxPromptLength = 32000; // Character limit for prompts
    
    // Initialize Handlebars helpers
    this.initializeHelpers();
  }

  /**
   * Generate optimized prompt for sub-agent with task context
   * @param {Object} options - Prompt generation options
   * @param {string} options.agentType - Type of agent to generate prompt for
   * @param {Object} options.taskContext - Task-specific context from ContextGatherer
   * @param {Object} options.baseContext - Base context from ContextInjector
   * @param {Object} [options.preferences] - Agent preferences and constraints
   * @returns {Promise<Object>} Generated prompt with metadata
   */
  async generateTaskPrompt(options) {
    const { agentType, taskContext, baseContext, preferences = {} } = options;
    
    if (!agentType || !taskContext) {
      throw new Error('agentType and taskContext are required for prompt generation');
    }

    const startTime = Date.now();
    
    try {
      // Step 1: Load agent-specific prompt template
      const template = await this.loadPromptTemplate(agentType);
      
      // Step 2: Prepare context for prompt generation
      const promptContext = await this.preparePromptContext({
        agentType,
        taskContext,
        baseContext,
        preferences
      });
      
      // Step 3: Apply context prioritization to prevent overload
      const prioritizedContext = await this.prioritizeContext(promptContext, agentType);
      
      // Step 4: Generate prompt using template
      const generatedPrompt = await this.renderPrompt(template, prioritizedContext);
      
      // Step 5: Validate and optimize prompt
      const validatedPrompt = await this.validateAndOptimizePrompt(generatedPrompt, agentType);
      
      // Step 6: Add prompt metadata
      const promptWithMetadata = {
        ...validatedPrompt,
        metadata: {
          agentType,
          taskId: taskContext.metadata.taskId,
          specId: taskContext.metadata.specId,
          generatedAt: new Date().toISOString(),
          performance: {
            generationTimeMs: Date.now() - startTime,
            templateCacheHit: this.templateCache.has(`${agentType}-main`),
            contextSizeBytes: JSON.stringify(prioritizedContext).length,
            finalPromptLength: validatedPrompt.prompt.length
          },
          version: '1.0.0'
        }
      };
      
      return promptWithMetadata;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      throw new Error(`Prompt generation failed after ${totalTime}ms: ${error.message}`);
    }
  }

  /**
   * Load prompt template for specific agent type
   * @param {string} agentType - Agent type
   * @returns {Promise<Object>} Prompt template with metadata
   */
  async loadPromptTemplate(agentType) {
    const cacheKey = `${agentType}-main`;
    
    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      const cached = this.templateCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.templateTimeout) {
        return cached.template;
      }
      this.templateCache.delete(cacheKey);
    }

    const projectRoot = this.configManager.getProjectRoot();
    const templatePath = path.join(projectRoot, 'templates', 'agent-prompts', `${agentType}.hbs`);
    
    try {
      // Try to load custom template first
      if (await this.fileExists(templatePath)) {
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const template = {
          content: templateContent,
          compiled: Handlebars.compile(templateContent),
          type: 'custom',
          path: templatePath
        };
        
        // Cache the template
        this.templateCache.set(cacheKey, {
          template,
          timestamp: Date.now()
        });
        
        return template;
      }
      
      // Fallback to built-in template
      const builtInTemplate = this.getBuiltInTemplate(agentType);
      
      // Cache built-in template too
      this.templateCache.set(cacheKey, {
        template: builtInTemplate,
        timestamp: Date.now()
      });
      
      return builtInTemplate;
    } catch (error) {
      throw new Error(`Failed to load prompt template for ${agentType}: ${error.message}`);
    }
  }

  /**
   * Prepare context for prompt generation with agent-specific optimization
   * @param {Object} options - Context preparation options
   * @returns {Promise<Object>} Prepared context object
   */
  async preparePromptContext(options) {
    const { agentType, taskContext, baseContext, preferences } = options;
    
    const promptContext = {
      // Task information
      task: {
        id: taskContext.metadata.taskId,
        specId: taskContext.metadata.specId,
        title: taskContext.taskSpecific.task?.title || 'Unknown Task',
        description: taskContext.taskSpecific.task?.content || '',
        checklist: taskContext.taskSpecific.task?.checklist || [],
        files: taskContext.taskSpecific.task?.files || [],
        estimatedHours: taskContext.taskSpecific.task?.estimatedHours,
        status: taskContext.taskSpecific.task?.status || 'pending'
      },
      
      // Specification context
      specification: {
        title: taskContext.taskSpecific.specification?.frontmatter?.title || 'Unknown Specification',
        priority: taskContext.taskSpecific.specification?.frontmatter?.priority || 'P2',
        status: taskContext.taskSpecific.specification?.status || 'unknown',
        description: this.extractSpecDescription(taskContext.taskSpecific.specification?.content || ''),
        requirements: taskContext.taskSpecific.specification?.requirements || [],
        successCriteria: this.extractSuccessCriteria(taskContext.taskSpecific.specification?.content || '')
      },
      
      // Agent-specific information
      agent: {
        type: agentType,
        capabilities: await this.getAgentCapabilities(agentType),
        specializations: await this.getAgentSpecializations(agentType),
        preferences: preferences
      },
      
      // Dependencies and constraints
      dependencies: {
        required: taskContext.dependencies?.required || [],
        enables: taskContext.dependencies?.enables || [],
        blockers: this.identifyBlockers(taskContext)
      },
      
      // Related files and resources
      resources: {
        implementation: taskContext.relatedFiles?.implementation || [],
        tests: taskContext.relatedFiles?.tests || [],
        documentation: taskContext.relatedFiles?.documentation || [],
        configuration: taskContext.relatedFiles?.configuration || []
      },
      
      // Context quality indicators
      quality: {
        relevanceScore: taskContext.validation?.relevanceScore || 0.5,
        completeness: taskContext.validation?.completeness || 0.5,
        confidence: this.calculateConfidenceScore(taskContext, baseContext)
      },
      
      // Project context (from base context)
      project: {
        constraints: baseContext?.layers?.critical?.constraints || [],
        urgentInfo: baseContext?.layers?.critical?.urgentInfo || [],
        architecture: this.extractArchitectureInfo(baseContext)
      },
      
      // Automation context
      automation: {
        isAutomated: true,
        triggerType: 'task_assignment',
        expectedOutcome: this.defineExpectedOutcome(taskContext),
        validationRequirements: this.extractValidationRequirements(taskContext)
      }
    };

    return promptContext;
  }

  /**
   * Prioritize context to prevent prompt overload while maintaining effectiveness
   * @param {Object} promptContext - Full prompt context
   * @param {string} agentType - Agent type for prioritization
   * @returns {Promise<Object>} Prioritized context
   */
  async prioritizeContext(promptContext, agentType) {
    const prioritized = { ...promptContext };
    
    // Get agent-specific priorities
    const priorities = await this.getAgentPriorities(agentType);
    
    // Filter resources based on relevance and agent focus
    prioritized.resources = this.filterResourcesByRelevance(promptContext.resources, agentType, priorities);
    
    // Limit dependencies to most critical ones
    prioritized.dependencies.required = promptContext.dependencies.required
      .filter(dep => dep.priority === 'P0' || dep.priority === 'P1')
      .slice(0, 5); // Max 5 dependencies
    
    // Prioritize success criteria
    prioritized.specification.successCriteria = promptContext.specification.successCriteria.slice(0, 8);
    
    // Filter constraints by relevance
    prioritized.project.constraints = promptContext.project.constraints
      .filter(constraint => this.isConstraintRelevant(constraint, agentType, promptContext.task))
      .slice(0, 10);
    
    return prioritized;
  }

  /**
   * Render prompt using template and context
   * @param {Object} template - Prompt template
   * @param {Object} context - Prioritized context
   * @returns {Promise<Object>} Rendered prompt
   */
  async renderPrompt(template, context) {
    try {
      const renderedPrompt = template.compiled(context);
      
      return {
        prompt: renderedPrompt,
        template: {
          type: template.type,
          path: template.path || 'built-in'
        },
        context: {
          taskId: context.task.id,
          specId: context.task.specId,
          agentType: context.agent.type,
          priority: context.specification.priority
        }
      };
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Validate and optimize generated prompt
   * @param {Object} generatedPrompt - Generated prompt object
   * @param {string} agentType - Agent type
   * @returns {Promise<Object>} Validated and optimized prompt
   */
  async validateAndOptimizePrompt(generatedPrompt, agentType) {
    const validation = {
      isValid: true,
      issues: [],
      optimizations: []
    };

    // Check prompt length
    if (generatedPrompt.prompt.length > this.maxPromptLength) {
      validation.issues.push(`Prompt too long: ${generatedPrompt.prompt.length} characters (max: ${this.maxPromptLength})`);
      
      // Attempt to truncate intelligently
      const truncated = await this.truncatePromptIntelligently(generatedPrompt.prompt, agentType);
      generatedPrompt.prompt = truncated;
      validation.optimizations.push('Truncated prompt to fit length limits');
    }

    // Check for required sections
    const requiredSections = this.getRequiredSections(agentType);
    for (const section of requiredSections) {
      if (!generatedPrompt.prompt.includes(section)) {
        validation.issues.push(`Missing required section: ${section}`);
      }
    }

    // Check for clarity and actionability
    if (!this.hasActionableInstructions(generatedPrompt.prompt)) {
      validation.issues.push('Prompt lacks clear actionable instructions');
    }

    // Optimize for agent-specific patterns
    const optimized = await this.optimizeForAgent(generatedPrompt.prompt, agentType);
    if (optimized !== generatedPrompt.prompt) {
      generatedPrompt.prompt = optimized;
      validation.optimizations.push('Applied agent-specific optimizations');
    }

    validation.isValid = validation.issues.length === 0;

    return {
      ...generatedPrompt,
      validation
    };
  }

  /**
   * Get built-in template for agent type
   * @param {string} agentType - Agent type
   * @returns {Object} Built-in template
   */
  getBuiltInTemplate(agentType) {
    const templates = {
      'software-architect': this.getSoftwareArchitectTemplate(),
      'cli-specialist': this.getCliSpecialistTemplate(),
      'testing-specialist': this.getTestingSpecialistTemplate(),
      'default': this.getDefaultTemplate()
    };

    const templateContent = templates[agentType] || templates.default;
    
    return {
      content: templateContent,
      compiled: Handlebars.compile(templateContent),
      type: 'built-in',
      agentType
    };
  }

  getSoftwareArchitectTemplate() {
    return `# Software Architecture Task: {{task.title}}

## 🎯 TASK CONTEXT

**Specification**: {{specification.title}} ({{specification.priority}})
**Task ID**: {{task.id}}
**Estimated Time**: {{#if task.estimatedHours}}{{task.estimatedHours}} hours{{else}}Unknown{{/if}}

## 📋 TASK REQUIREMENTS

{{task.description}}

### Success Criteria
{{#each specification.successCriteria}}
- {{this}}
{{/each}}

### Task Checklist
{{#each task.checklist}}
- [ ] {{this.item}}
{{/each}}

## 🏗️ ARCHITECTURE FOCUS

**Your Specializations**: {{#each agent.specializations}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

**Key Architecture Considerations**:
{{#each project.constraints}}
- {{this}}
{{/each}}

## 📁 IMPLEMENTATION FILES

{{#if task.files}}
**Files to work with**:
{{#each task.files}}
- {{this}}
{{/each}}
{{/if}}

{{#if resources.implementation}}
**Related Implementation Files**:
{{#each resources.implementation}}
- {{this.path}} (Relevance: {{this.relevance}})
{{/each}}
{{/if}}

## 🔗 DEPENDENCIES

{{#if dependencies.required}}
**Required Dependencies**:
{{#each dependencies.required}}
- **{{this.specId}}**: {{this.title}} ({{this.status}})
{{/each}}
{{/if}}

## ⚡ AUTOMATION REQUIREMENTS

**Expected Outcome**: {{automation.expectedOutcome}}
**Validation Required**: {{#each automation.validationRequirements}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

## 🎯 YOUR MISSION

Design and implement the architectural solution for this task. Focus on:
1. **System Design**: Create scalable, maintainable architecture
2. **Technical Strategy**: Make informed technical decisions
3. **Integration Planning**: Consider how this integrates with existing systems
4. **Performance Planning**: Design for scale and efficiency
5. **Quality Assurance**: Establish validation and testing approaches

**Quality Gate**: Context relevance score is {{quality.relevanceScore}} - {{#if quality.confidence}}high confidence{{else}}verify requirements carefully{{/if}}.

Remember to follow the task checklist exactly and update the specification when complete.`;
  }

  getCliSpecialistTemplate() {
    return `# CLI Development Task: {{task.title}}

## 🎯 TASK CONTEXT

**Specification**: {{specification.title}} ({{specification.priority}})
**Task ID**: {{task.id}}
**CLI Focus**: Terminal interface and user experience

## 📋 TASK REQUIREMENTS

{{task.description}}

### Task Checklist
{{#each task.checklist}}
- [ ] {{this.item}}
{{/each}}

## 🖥️ CLI DEVELOPMENT FOCUS

**Your Specializations**: Terminal UI, Command-line interfaces, User experience

**CLI Considerations**:
- Terminal-kit integration patterns
- Keyboard navigation and shortcuts
- Responsive terminal layouts
- Performance optimization for TUI

## 📁 IMPLEMENTATION FILES

{{#if task.files}}
**Files to work with**:
{{#each task.files}}
- {{this}}
{{/each}}
{{/if}}

## 🔧 TECHNICAL APPROACH

Focus on:
1. **TUI Development**: Create intuitive terminal interfaces
2. **UX Optimization**: Keyboard shortcuts and navigation
3. **Performance**: Fast, responsive interactions
4. **Integration**: Connect with existing CLI infrastructure

**Expected Outcome**: {{automation.expectedOutcome}}

Complete the checklist and ensure all CLI functionality works smoothly.`;
  }

  getTestingSpecialistTemplate() {
    return `# Testing Task: {{task.title}}

## 🎯 TASK CONTEXT

**Specification**: {{specification.title}} ({{specification.priority}})
**Task ID**: {{task.id}}
**Testing Focus**: Quality assurance and validation

## 📋 TASK REQUIREMENTS

{{task.description}}

### Task Checklist
{{#each task.checklist}}
- [ ] {{this.item}}
{{/each}}

## 🧪 TESTING APPROACH

Focus on:
1. **Unit Tests**: Component-level validation
2. **Integration Tests**: System interaction testing
3. **Performance Tests**: Speed and reliability validation
4. **Coverage**: Comprehensive test coverage

**Validation Requirements**: {{#each automation.validationRequirements}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

Complete all tests and ensure they pass before marking task complete.`;
  }

  getDefaultTemplate() {
    return `# Task: {{task.title}}

## 🎯 CONTEXT

**Specification**: {{specification.title}} ({{specification.priority}})
**Task ID**: {{task.id}}

## 📋 REQUIREMENTS

{{task.description}}

### Checklist
{{#each task.checklist}}
- [ ] {{this.item}}
{{/each}}

## 📁 FILES

{{#if task.files}}
{{#each task.files}}
- {{this}}
{{/each}}
{{/if}}

Complete all checklist items and update the specification when done.`;
  }

  // Utility methods

  async getAgentCapabilities(agentType) {
    try {
      const projectRoot = this.configManager.getProjectRoot();
      const agentPath = path.join(projectRoot, '.claude', 'agents', `${agentType}.md`);
      
      if (await this.fileExists(agentPath)) {
        const content = await fs.readFile(agentPath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (frontmatterMatch) {
          const frontmatter = yaml.load(frontmatterMatch[1]);
          return frontmatter.capabilities || [];
        }
      }
    } catch (error) {
      console.warn(`Failed to load capabilities for ${agentType}: ${error.message}`);
    }
    
    return [];
  }

  async getAgentSpecializations(agentType) {
    try {
      const projectRoot = this.configManager.getProjectRoot();
      const agentPath = path.join(projectRoot, '.claude', 'agents', `${agentType}.md`);
      
      if (await this.fileExists(agentPath)) {
        const content = await fs.readFile(agentPath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (frontmatterMatch) {
          const frontmatter = yaml.load(frontmatterMatch[1]);
          return frontmatter.specialization_areas || [];
        }
      }
    } catch (error) {
      console.warn(`Failed to load specializations for ${agentType}: ${error.message}`);
    }
    
    return [];
  }

  extractSpecDescription(content) {
    const descMatch = content.match(/## \*\*Description\*\*([\s\S]*?)(?=## |$)/);
    if (descMatch) {
      return descMatch[1].trim().substring(0, 500) + '...';
    }
    return 'No description available';
  }

  extractSuccessCriteria(content) {
    const criteria = [];
    const matches = content.match(/- \[[ x]\] ([^\n]+)/g);
    
    if (matches) {
      for (const match of matches.slice(0, 10)) { // Limit to 10 criteria
        const criterion = match.replace(/- \[[ x]\] /, '');
        criteria.push(criterion);
      }
    }
    
    return criteria;
  }

  identifyBlockers(taskContext) {
    const blockers = [];
    
    // Check if dependencies are complete
    if (taskContext.dependencies?.required) {
      for (const dep of taskContext.dependencies.required) {
        if (dep.status !== 'done' && dep.status !== 'complete') {
          blockers.push({
            type: 'dependency',
            description: `${dep.specId} must be completed first`,
            status: dep.status
          });
        }
      }
    }
    
    return blockers;
  }

  calculateConfidenceScore(taskContext, baseContext) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on context quality
    if (taskContext.validation?.relevanceScore > 0.8) confidence += 0.2;
    if (taskContext.validation?.completeness > 0.8) confidence += 0.2;
    if (baseContext?.validation?.isValid) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  extractArchitectureInfo(baseContext) {
    const archInfo = {
      patterns: [],
      constraints: [],
      decisions: []
    };
    
    if (baseContext?.inheritance?.decisions) {
      archInfo.decisions = baseContext.inheritance.decisions.slice(0, 5);
    }
    
    return archInfo;
  }

  defineExpectedOutcome(taskContext) {
    const task = taskContext.taskSpecific.task;
    if (!task) return 'Complete task requirements';
    
    if (task.checklist && task.checklist.length > 0) {
      return `Complete all ${task.checklist.length} checklist items and update task status`;
    }
    
    return 'Implement task requirements and mark complete';
  }

  extractValidationRequirements(taskContext) {
    const requirements = ['tests', 'lint', 'functionality'];
    
    // Add specific requirements based on task content
    const taskContent = taskContext.taskSpecific.task?.content || '';
    
    if (taskContent.includes('test')) requirements.push('comprehensive testing');
    if (taskContent.includes('performance')) requirements.push('performance validation');
    if (taskContent.includes('integration')) requirements.push('integration testing');
    
    return [...new Set(requirements)];
  }

  async getAgentPriorities(agentType) {
    const priorities = {
      'software-architect': {
        resources: ['implementation', 'architecture', 'design'],
        content: ['patterns', 'scalability', 'integration']
      },
      'cli-specialist': {
        resources: ['implementation', 'cli', 'interface'],
        content: ['ui', 'ux', 'terminal', 'keyboard']
      },
      'testing-specialist': {
        resources: ['tests', 'validation', 'coverage'],
        content: ['testing', 'quality', 'validation']
      }
    };
    
    return priorities[agentType] || priorities['software-architect'];
  }

  filterResourcesByRelevance(resources, agentType, priorities) {
    const filtered = {};
    const relevanceThreshold = 0.3;
    
    for (const [category, files] of Object.entries(resources)) {
      filtered[category] = files
        .filter(file => file.relevance >= relevanceThreshold)
        .slice(0, 5); // Limit to top 5 per category
    }
    
    return filtered;
  }

  isConstraintRelevant(constraint, agentType, task) {
    const constraintText = constraint.toLowerCase();
    const taskText = task.description.toLowerCase();
    const agentKeywords = this.getAgentKeywords(agentType);
    
    // Check if constraint mentions agent-specific keywords or task content
    return agentKeywords.some(keyword => constraintText.includes(keyword)) ||
           taskText.includes(constraintText.substring(0, 20));
  }

  getAgentKeywords(agentType) {
    const keywords = {
      'software-architect': ['architecture', 'design', 'system', 'integration', 'scalability'],
      'cli-specialist': ['cli', 'terminal', 'interface', 'command', 'ui'],
      'testing-specialist': ['test', 'validation', 'coverage', 'quality']
    };
    
    return keywords[agentType] || [];
  }

  async truncatePromptIntelligently(prompt, agentType) {
    // Preserve critical sections while truncating less important content
    const targetLength = Math.floor(this.maxPromptLength * 0.9);
    
    if (prompt.length <= targetLength) return prompt;
    
    // Split into sections and prioritize
    const sections = prompt.split(/\n## /);
    const criticalSections = ['TASK CONTEXT', 'TASK REQUIREMENTS', 'YOUR MISSION'];
    
    let truncated = sections[0]; // Keep header
    let currentLength = truncated.length;
    
    // Add critical sections first
    for (const section of sections.slice(1)) {
      const sectionName = section.split('\n')[0];
      if (criticalSections.some(critical => sectionName.includes(critical))) {
        if (currentLength + section.length < targetLength) {
          truncated += '\n## ' + section;
          currentLength += section.length;
        }
      }
    }
    
    // Add other sections if space allows
    for (const section of sections.slice(1)) {
      const sectionName = section.split('\n')[0];
      if (!criticalSections.some(critical => sectionName.includes(critical))) {
        if (currentLength + section.length < targetLength) {
          truncated += '\n## ' + section;
          currentLength += section.length;
        } else {
          break;
        }
      }
    }
    
    return truncated;
  }

  getRequiredSections(agentType) {
    const required = {
      'software-architect': ['TASK CONTEXT', 'ARCHITECTURE FOCUS', 'YOUR MISSION'],
      'cli-specialist': ['TASK CONTEXT', 'CLI DEVELOPMENT FOCUS'],
      'testing-specialist': ['TASK CONTEXT', 'TESTING APPROACH'],
      'default': ['TASK CONTEXT', 'REQUIREMENTS']
    };
    
    return required[agentType] || required.default;
  }

  hasActionableInstructions(prompt) {
    const actionWords = ['implement', 'create', 'build', 'design', 'develop', 'test', 'validate', 'complete'];
    const lowerPrompt = prompt.toLowerCase();
    
    return actionWords.some(word => lowerPrompt.includes(word));
  }

  async optimizeForAgent(prompt, agentType) {
    // Agent-specific optimizations
    let optimized = prompt;
    
    if (agentType === 'software-architect') {
      // Ensure architecture focus is prominent
      if (!optimized.includes('🏗️')) {
        optimized = optimized.replace('## 📋', '## 🏗️ ARCHITECTURE FOCUS\n\nFocus on system design, scalability, and integration patterns.\n\n## 📋');
      }
    }
    
    return optimized;
  }

  initializeHelpers() {
    // Register Handlebars helpers for template rendering
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('formatList', function(items, options) {
      if (!items || items.length === 0) return 'None';
      return items.map(item => `- ${item}`).join('\n');
    });

    Handlebars.registerHelper('truncate', function(str, length) {
      if (!str) return '';
      return str.length > length ? str.substring(0, length) + '...' : str;
    });
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templateCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.templateCache.size,
      timeout: this.templateTimeout,
      keys: Array.from(this.templateCache.keys())
    };
  }
}

module.exports = PromptGenerator;