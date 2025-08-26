const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Agent Template Validator
 * Validates agent definitions against base template requirements and ensures
 * consistency, completeness, and integration compatibility.
 */
class AgentTemplateValidator {
  constructor(configManager) {
    this.configManager = configManager;
    this.baseTemplatePath = path.join(
      configManager.getProjectRoot(),
      '.asd',
      'agents',
      '_base-agent-template.md'
    );
    this.validationRules = null;
  }

  /**
   * Load base template validation rules
   * @returns {Promise<Object>} Base template configuration
   */
  async loadBaseTemplate() {
    try {
      const baseContent = await fs.readFile(this.baseTemplatePath, 'utf-8');
      const frontmatterMatch = baseContent.match(/^---\n([\s\S]*?)\n---/);
      
      if (!frontmatterMatch) {
        throw new Error('Base template missing frontmatter');
      }

      const baseConfig = yaml.load(frontmatterMatch[1]);
      this.validationRules = baseConfig.validation_rules;
      return baseConfig;
    } catch (error) {
      throw new Error(`Failed to load base template: ${error.message}`);
    }
  }

  /**
   * Validate a single agent definition
   * @param {string} agentFilePath - Path to agent definition file
   * @returns {Promise<Object>} Validation result
   */
  async validateAgent(agentFilePath) {
    const validation = {
      filePath: agentFilePath,
      agentType: null,
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Load agent definition
      const content = await fs.readFile(agentFilePath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      
      if (!frontmatterMatch) {
        validation.errors.push('Agent definition missing YAML frontmatter');
        validation.isValid = false;
        return validation;
      }

      const agentConfig = yaml.load(frontmatterMatch[1]);
      validation.agentType = agentConfig.agent_type;

      // Load base template if not already loaded
      if (!this.validationRules) {
        await this.loadBaseTemplate();
      }

      // Run validation checks
      this.validateRequiredFields(agentConfig, validation);
      this.validateFieldFormats(agentConfig, validation);
      this.validateWorkflowSteps(agentConfig, validation);
      this.validateCapabilities(agentConfig, validation);
      this.validateContextRequirements(agentConfig, validation);
      this.validateHandoffChecklist(agentConfig, validation);
      this.validateConsistency(agentConfig, validation);
      this.generateSuggestions(agentConfig, validation);

    } catch (error) {
      validation.errors.push(`Failed to parse agent definition: ${error.message}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Validate required fields are present
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} validation - Validation result object
   */
  validateRequiredFields(agentConfig, validation) {
    const requiredFields = [
      'agent_type',
      'specializations', 
      'context_requirements',
      'capabilities',
      'workflow_steps',
      'validation_requirements',
      'handoff_checklist'
    ];

    for (const field of requiredFields) {
      if (!agentConfig[field]) {
        validation.errors.push(`Missing required field: ${field}`);
        validation.isValid = false;
      }
    }
  }

  /**
   * Validate field formats and types
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} validation - Validation result object
   */
  validateFieldFormats(agentConfig, validation) {
    // Validate agent_type format
    if (agentConfig.agent_type) {
      if (!/^[a-z-]+$/.test(agentConfig.agent_type)) {
        validation.errors.push('agent_type must be lowercase with hyphens only');
        validation.isValid = false;
      }
    }

    // Validate arrays have minimum items
    const arrayFields = {
      specializations: 2,
      context_requirements: 2, 
      capabilities: 3,
      workflow_steps: 3,
      validation_requirements: 2,
      handoff_checklist: 3
    };

    for (const [field, minItems] of Object.entries(arrayFields)) {
      if (agentConfig[field] && Array.isArray(agentConfig[field])) {
        if (agentConfig[field].length < minItems) {
          validation.errors.push(`${field} must have at least ${minItems} items`);
          validation.isValid = false;
        }
      }
    }
  }

  /**
   * Validate workflow steps structure
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} validation - Validation result object
   */
  validateWorkflowSteps(agentConfig, validation) {
    if (!agentConfig.workflow_steps || !Array.isArray(agentConfig.workflow_steps)) {
      return;
    }

    agentConfig.workflow_steps.forEach((step, index) => {
      if (!step.step) {
        validation.errors.push(`Workflow step ${index + 1} missing 'step' field`);
        validation.isValid = false;
      }

      if (!step.description) {
        validation.errors.push(`Workflow step ${index + 1} missing 'description' field`);
        validation.isValid = false;
      }

      if (!step.validation || !Array.isArray(step.validation)) {
        validation.errors.push(`Workflow step ${index + 1} missing 'validation' array`);
        validation.isValid = false;
      } else if (step.validation.length === 0) {
        validation.warnings.push(`Workflow step ${index + 1} has empty validation criteria`);
      }
    });
  }

  /**
   * Validate capabilities are specific and actionable
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} validation - Validation result object
   */
  validateCapabilities(agentConfig, validation) {
    if (!agentConfig.capabilities || !Array.isArray(agentConfig.capabilities)) {
      return;
    }

    agentConfig.capabilities.forEach((capability, index) => {
      // Check for vague language
      const vagueWords = ['help', 'assist', 'support', 'work on'];
      if (vagueWords.some(word => capability.toLowerCase().includes(word))) {
        validation.warnings.push(`Capability ${index + 1} uses vague language: "${capability}"`);
      }

      // Check minimum length for meaningful descriptions
      if (capability.length < 20) {
        validation.warnings.push(`Capability ${index + 1} may be too brief: "${capability}"`);
      }

      // Check for action verbs
      const actionVerbs = ['design', 'implement', 'create', 'build', 'optimize', 'validate', 'ensure'];
      if (!actionVerbs.some(verb => capability.toLowerCase().startsWith(verb))) {
        validation.suggestions.push(`Consider starting capability ${index + 1} with an action verb`);
      }
    });
  }

  /**
   * Validate context requirements use consistent terminology
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} validation - Validation result object
   */
  validateContextRequirements(agentConfig, validation) {
    if (!agentConfig.context_requirements || !Array.isArray(agentConfig.context_requirements)) {
      return;
    }

    // Check for consistent naming patterns
    const standardPatterns = [
      'requirements',
      'specifications', 
      'constraints',
      'patterns',
      'standards',
      'dependencies',
      'objectives'
    ];

    agentConfig.context_requirements.forEach((requirement, index) => {
      const hasStandardPattern = standardPatterns.some(pattern => 
        requirement.toLowerCase().includes(pattern)
      );

      if (!hasStandardPattern) {
        validation.suggestions.push(
          `Context requirement ${index + 1} could use more standard terminology: "${requirement}"`
        );
      }

      // Check for hyphens vs underscores consistency
      if (requirement.includes('_') && requirement.includes('-')) {
        validation.warnings.push(
          `Context requirement ${index + 1} mixes hyphens and underscores: "${requirement}"`
        );
      }
    });
  }

  /**
   * Validate handoff checklist completeness
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} validation - Validation result object
   */
  validateHandoffChecklist(agentConfig, validation) {
    if (!agentConfig.handoff_checklist || !Array.isArray(agentConfig.handoff_checklist)) {
      return;
    }

    const essentialCategories = [
      'implementation', 
      'documentation',
      'validation',
      'context'
    ];

    const checklistText = agentConfig.handoff_checklist.join(' ').toLowerCase();
    
    essentialCategories.forEach(category => {
      const categoryKeywords = {
        implementation: ['implemented', 'complete', 'functional'],
        documentation: ['documented', 'documentation', 'notes'],
        validation: ['tested', 'validated', 'quality'],
        context: ['context', 'handoff', 'next']
      };

      const hasCategory = categoryKeywords[category].some(keyword =>
        checklistText.includes(keyword)
      );

      if (!hasCategory) {
        validation.suggestions.push(
          `Consider adding ${category}-related items to handoff checklist`
        );
      }
    });
  }

  /**
   * Validate consistency with other agents and system expectations
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} validation - Validation result object
   */
  validateConsistency(agentConfig, validation) {
    // Check for template indicators that shouldn't be in production agents
    if (agentConfig.is_template === true) {
      validation.warnings.push('Agent definition marked as template - remove is_template for production use');
    }

    // Validate specializations use consistent formatting
    if (agentConfig.specializations) {
      agentConfig.specializations.forEach((spec, index) => {
        if (spec.includes(' ')) {
          validation.warnings.push(
            `Specialization ${index + 1} contains spaces, consider using hyphens: "${spec}"`
          );
        }
      });
    }
  }

  /**
   * Generate improvement suggestions
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} validation - Validation result object
   */
  generateSuggestions(agentConfig, validation) {
    // Suggest adding technology focus if missing
    if (!agentConfig.technology_focus) {
      validation.suggestions.push('Consider adding technology_focus section for better context');
    }

    // Suggest adding quality standards if missing
    if (!agentConfig.quality_standards) {
      validation.suggestions.push('Consider adding quality_standards section for clarity');
    }

    // Check workflow step naming consistency
    if (agentConfig.workflow_steps) {
      const stepNames = agentConfig.workflow_steps.map(s => s.step);
      const hasConsistentNaming = stepNames.every(name => 
        name.includes('_') || stepNames.every(n => !n.includes('_'))
      );

      if (!hasConsistentNaming) {
        validation.suggestions.push('Consider consistent naming convention for workflow steps');
      }
    }
  }

  /**
   * Validate all agents in the agents directory
   * @returns {Promise<Object>} Validation summary for all agents
   */
  async validateAllAgents() {
    const agentsDir = path.join(this.configManager.getProjectRoot(), '.asd', 'agents');
    const summary = {
      totalAgents: 0,
      validAgents: 0,
      invalidAgents: 0,
      totalErrors: 0,
      totalWarnings: 0,
      totalSuggestions: 0,
      results: []
    };

    try {
      const files = await fs.readdir(agentsDir);
      const agentFiles = files.filter(file => 
        file.endsWith('.md') && !file.startsWith('_')
      );

      for (const file of agentFiles) {
        const filePath = path.join(agentsDir, file);
        const validation = await this.validateAgent(filePath);
        
        summary.totalAgents++;
        summary.results.push(validation);
        
        if (validation.isValid) {
          summary.validAgents++;
        } else {
          summary.invalidAgents++;
        }
        
        summary.totalErrors += validation.errors.length;
        summary.totalWarnings += validation.warnings.length;
        summary.totalSuggestions += validation.suggestions.length;
      }

    } catch (error) {
      throw new Error(`Failed to validate agents: ${error.message}`);
    }

    return summary;
  }

  /**
   * Fix common validation issues automatically
   * @param {string} agentFilePath - Path to agent definition file
   * @returns {Promise<Object>} Fix results
   */
  async autoFixAgent(agentFilePath) {
    const fixResults = {
      filePath: agentFilePath,
      fixed: [],
      skipped: [],
      errors: []
    };

    try {
      const content = await fs.readFile(agentFilePath, 'utf-8');
      let updatedContent = content;

      // Fix common formatting issues
      // Add more auto-fix logic here as needed

      if (updatedContent !== content) {
        await fs.writeFile(agentFilePath, updatedContent, 'utf-8');
        fixResults.fixed.push('Updated file formatting');
      }

    } catch (error) {
      fixResults.errors.push(`Auto-fix failed: ${error.message}`);
    }

    return fixResults;
  }
}

module.exports = AgentTemplateValidator;