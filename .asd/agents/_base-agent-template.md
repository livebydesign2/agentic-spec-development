---
# Base Agent Template
# This template provides the foundation for all ASD agent definitions
# Inherit from this template when creating new agents

agent_type: "base-template"
template_version: "1.0"
is_template: true
extends: null

# Core structure that all agents should include
required_fields:
  - "agent_type"
  - "specializations"
  - "context_requirements"
  - "capabilities"
  - "workflow_steps"
  - "validation_requirements"
  - "handoff_checklist"

# Optional but recommended fields
recommended_fields:
  - "technology_focus"
  - "quality_standards"
  - "success_criteria"
  - "common_patterns"

# Template inheritance patterns
inheritance_options:
  extend_capabilities: true # Add to base capabilities
  override_workflow: false # Replace workflow steps
  merge_context_requirements: true # Merge with parent requirements
  customize_validation: true # Add custom validation rules

# Validation patterns for agent definitions
validation_rules:
  agent_type:
    required: true
    pattern: "^[a-z-]+$"
    description: "Agent type must be lowercase with hyphens"

  specializations:
    required: true
    min_items: 2
    description: "Each agent must have at least 2 specialization areas"

  context_requirements:
    required: true
    min_items: 2
    description: "Each agent must specify context requirements"

  capabilities:
    required: true
    min_items: 3
    description: "Each agent must define at least 3 core capabilities"

  workflow_steps:
    required: true
    min_items: 3
    structure:
      step: "required"
      description: "required"
      validation: "required_array"
    description: "Each agent must define workflow with validation criteria"

# Common capability patterns that can be inherited
common_capability_patterns:
  code_quality:
    - "Follow established coding standards and conventions"
    - "Implement comprehensive error handling and validation"
    - "Create maintainable, well-documented code"

  testing:
    - "Create appropriate test coverage for implemented functionality"
    - "Validate functionality against acceptance criteria"
    - "Ensure integration points work correctly"

  documentation:
    - "Document implementation decisions and key approaches"
    - "Update relevant documentation and specifications"
    - "Provide clear handoff notes for subsequent agents"

  collaboration:
    - "Communicate effectively with other agents and stakeholders"
    - "Provide constructive feedback during reviews"
    - "Contribute to team knowledge sharing and improvement"

# Common workflow step patterns
common_workflow_patterns:
  analysis:
    step: "analyze_requirements"
    description: "Review and understand requirements, constraints, and context"
    validation:
      ["requirements_clear", "scope_understood", "constraints_identified"]

  design:
    step: "design_solution"
    description: "Create solution design appropriate for agent specialization"
    validation: ["design_complete", "approach_validated", "patterns_followed"]

  implementation:
    step: "implement_solution"
    description: "Execute implementation according to design and standards"
    validation:
      ["functionality_complete", "quality_standards_met", "testing_adequate"]

  validation:
    step: "validate_results"
    description: "Validate implementation against requirements and quality criteria"
    validation:
      [
        "acceptance_criteria_met",
        "quality_gates_passed",
        "integration_verified",
      ]

# Common validation requirements
common_validation_requirements:
  functional:
    - "All acceptance criteria are demonstrably met"
    - "Functionality works as specified in requirements"
    - "Error cases and edge conditions are handled appropriately"

  quality:
    - "Code follows established patterns and conventions"
    - "Implementation is maintainable and well-documented"
    - "Performance requirements are satisfied"

  integration:
    - "Changes integrate properly with existing systems"
    - "No breaking changes to other components"
    - "Configuration updates are properly applied"

# Common handoff checklist patterns
common_handoff_patterns:
  technical:
    - "All implementation is complete and tested"
    - "Code quality standards are met"
    - "Integration points are functional"
    - "Documentation is updated and accurate"

  process:
    - "Task status is updated in specifications"
    - "Next steps are clearly defined"
    - "Blockers and dependencies are documented"
    - "Relevant stakeholders are informed"

  knowledge_transfer:
    - "Implementation approach is documented"
    - "Key decisions and rationale are explained"
    - "Next agent has sufficient context to continue"
    - "Lessons learned are captured for future reference"

# Customization guidelines for creating new agents
customization_guidelines:
  specializations:
    - "Define 3-5 specific areas where agent excels"
    - "Use clear, searchable terminology"
    - "Align with industry standard role definitions"

  capabilities:
    - "Focus on what agent can deliver, not just skills"
    - "Make capabilities specific and measurable"
    - "Include both technical and process capabilities"

  workflow_steps:
    - "Define 3-5 key steps in agent's typical workflow"
    - "Include specific validation criteria for each step"
    - "Ensure steps are logical and sequential"

  context_requirements:
    - "Specify what information agent needs to be effective"
    - "Use consistent terminology across agents"
    - "Balance specificity with flexibility"

# Integration with ASD systems
system_integration:
  context_injection:
    - "Context requirements are used by ContextInjector for filtering"
    - "Specializations guide context relevance scoring"
    - "Workflow steps inform process template selection"

  cli_commands:
    - "Agent type used in 'asd agent' commands"
    - "Capabilities displayed in agent listings"
    - "Validation requirements used in quality checks"

  capability_matching:
    - "Specializations used for task assignment recommendations"
    - "Capabilities matched against task keywords"
    - "Handoff patterns guide workflow coordination"
---

# Base Agent Template

This template serves as the foundation for all ASD agent definitions. It provides common patterns, validation rules, and inheritance structures that ensure consistency and functionality across all agents.

## 🎯 Purpose

The base agent template provides:

- **Consistent Structure**: All agents follow the same basic format and include required fields
- **Inheritance Patterns**: New agents can inherit common capabilities and workflows
- **Validation Framework**: Ensures all agent definitions meet quality standards
- **Integration Support**: Provides hooks for ASD system integration and context injection

## 🏗️ Agent Structure

### Required Components

Every agent definition must include:

1. **Agent Type**: Unique identifier for the agent (lowercase, hyphenated)
2. **Specializations**: Areas where the agent has expertise
3. **Context Requirements**: Information the agent needs to be effective
4. **Capabilities**: Specific deliverables the agent can produce
5. **Workflow Steps**: Typical process the agent follows
6. **Validation Requirements**: Quality standards the agent must meet
7. **Handoff Checklist**: Items needed for successful task completion

### Optional Components

Agents can also include:

- **Technology Focus**: Specific tools and technologies
- **Quality Standards**: Detailed quality criteria
- **Success Criteria**: Measurable outcomes
- **Common Patterns**: Reusable approaches and solutions

## 🔄 Template Inheritance

### Creating New Agents

When creating a new agent, you can inherit from this base template:

1. **Copy Structure**: Use the same YAML frontmatter structure
2. **Inherit Capabilities**: Extend common capability patterns
3. **Customize Workflows**: Adapt workflow steps to agent specialization
4. **Add Specializations**: Define specific areas of expertise

### Inheritance Options

- **extend_capabilities**: Add capabilities to inherited ones
- **override_workflow**: Replace inherited workflow entirely
- **merge_context_requirements**: Combine with parent requirements
- **customize_validation**: Add agent-specific validation rules

## ✅ Validation Framework

### Automatic Validation

All agent definitions are automatically validated for:

- **Required Fields**: Ensures all mandatory fields are present
- **Field Formats**: Validates field types and formats
- **Minimum Requirements**: Checks minimum number of items in arrays
- **Consistency**: Ensures consistent terminology and structure

### Quality Standards

Agent definitions must meet these standards:

- **Clarity**: All descriptions are clear and actionable
- **Completeness**: All required information is provided
- **Consistency**: Follows established patterns and terminology
- **Specificity**: Capabilities and requirements are specific and measurable

## 🔗 System Integration

### Context Injection

The base template integrates with ASD's context injection system:

- **Context Requirements**: Used to filter relevant context information
- **Specializations**: Guide context relevance scoring
- **Workflow Steps**: Inform process template selection

### CLI Integration

Agent definitions integrate with ASD CLI commands:

- **Agent Listing**: `asd agent list` shows agent capabilities
- **Agent Customization**: `asd agent customize` uses template structure
- **Task Assignment**: `asd assign` uses capability matching

### Capability Matching

The template supports automatic task assignment:

- **Specialization Matching**: Tasks matched to agent specializations
- **Keyword Mapping**: Capabilities mapped to task keywords
- **Handoff Patterns**: Guide workflow coordination between agents

## 📚 Best Practices

### Creating Effective Agents

- **Focus on Outcomes**: Define what the agent delivers, not just what they know
- **Be Specific**: Avoid vague capabilities and requirements
- **Consider Handoffs**: Plan how work flows between agents
- **Test Integration**: Ensure agent works with ASD's context and CLI systems

### Maintaining Consistency

- **Use Standard Terminology**: Follow established patterns for similar concepts
- **Align with Industry Standards**: Use recognized role definitions where applicable
- **Regular Updates**: Keep agent definitions current with system changes
- **Document Changes**: Track template evolution for backward compatibility

## 🚀 Getting Started

To create a new agent based on this template:

1. **Copy Template**: Start with the base structure
2. **Define Specializations**: Identify 3-5 key expertise areas
3. **List Capabilities**: Define specific deliverables
4. **Design Workflow**: Create 3-5 logical workflow steps
5. **Set Quality Standards**: Define validation and handoff requirements
6. **Test Integration**: Verify agent works with ASD systems

This base template ensures that all ASD agents are consistent, functional, and well-integrated with the broader system while allowing for specialization and customization.
