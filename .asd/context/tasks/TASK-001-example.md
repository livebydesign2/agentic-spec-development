---
context_type: "task"
task_id: "TASK-001"
spec_id: "FEAT-012"
task_title: "Core Context Storage & File Structure"
assigned_agent: "software-architect"
status: "in_progress"
started: "2024-08-24"
progress:
  subtasks_completed: 0
  subtasks_total: 3
  current_subtask: "Design .asd/ directory structure"
implementation_notes:
  - "Created .asd/ directory with proper structure"
  - "Agent definitions follow Claude sub-agent pattern successfully"
  - "Context inheritance pattern enables project → spec → task flow"
  - "File format schemas defined for validation"
research_findings:
  - "Claude's MD + YAML pattern provides excellent human/machine readability balance"
  - "Directory structure mirrors project organization for intuitive navigation"
  - "Context inheritance reduces duplication while maintaining specificity"
decisions_made:
  - "Use .asd/ directory to avoid conflicts with existing project structure"
  - "Separate agents/, processes/, context/, state/ for clear organization"
  - "JSON for performance-critical config, MD+YAML for human-readable content"
blockers: []
next_steps:
  - "Complete file schema validation"
  - "Create additional example agent definitions"
  - "Test context inheritance patterns"
handoff_notes:
  - "Directory structure established and documented"
  - "Agent definition pattern proven with software-architect example"
  - "Next agent can begin context injection engine implementation"
---

# TASK-001: Core Context Storage & File Structure - Task Context

## Current Implementation Status

**Progress**: In Progress - Directory structure created, schemas defined
**Current Focus**: File format validation and example content creation
**Estimated Completion**: Directory structure and schemas complete

## Implementation Decisions Made

### Directory Structure Choice

Selected `.asd/` directory structure with clear separation:

- `agents/` - Agent definitions using Claude's MD + YAML pattern
- `processes/` - Workflow templates and validation checklists
- `context/` - Hierarchical context storage (project, specs, tasks)
- `state/` - Dynamic state in JSON format for performance
- `config/` - Context system configuration and agent capabilities

**Rationale**: Clear separation of concerns, human navigable, follows existing ASD organizational patterns

### File Format Strategy

- **Agent Definitions**: Markdown + YAML frontmatter (human readable, programmatically parseable)
- **Context Files**: Same pattern for consistency and inheritance support
- **Configuration**: JSON for structured data and performance
- **State Files**: JSON for real-time updates and query performance

### Context Inheritance Pattern

Established three-tier inheritance:

1. **Project Context**: Shared constraints and architecture decisions
2. **Spec Context**: Inherits project, adds spec-specific research and decisions
3. **Task Context**: Inherits spec and project, adds implementation notes and progress

## Key Research Findings

### Claude Sub-Agent Pattern Success

The Claude MD + YAML frontmatter pattern works exceptionally well for agent definitions:

- YAML frontmatter provides structured metadata (capabilities, requirements, validation)
- Markdown content provides human-readable instructions and context
- Pattern is familiar to developers and enables easy customization
- Programmatic parsing is straightforward with existing js-yaml library

### Context File Performance Considerations

File system operations for context injection need optimization:

- Individual context files should remain under 10KB for fast loading
- JSON format for frequently updated state files (assignments, progress)
- Caching strategy needed for repeated context injections
- Lazy loading for context layers not needed by specific agents

### Human Observability Requirements

All generated content must remain human-readable and editable:

- Clear markdown structure with logical section organization
- Descriptive field names in YAML frontmatter
- Avoid machine-generated complexity that obscures meaning
- Enable manual editing when needed for customization

## Integration Points Identified

### ConfigManager Integration

Context system needs to extend existing configuration:

- Add `.asd/` directory path configuration
- Integrate context file paths with existing `getDataPath()` pattern
- Maintain compatibility with existing configuration structure

### SpecParser Integration

Context loading should integrate with spec parsing workflow:

- Load spec-specific context during `parseSpecFile()` execution
- Enable context inheritance when loading task-specific information
- Maintain performance of existing spec loading operations

### DataAdapterFactory Leverage

Use existing multi-format support for context files:

- Leverage existing YAML frontmatter parsing
- Maintain consistency with spec file format handling
- Enable future format extensibility

## Next Agent Preparation

### What's Ready for Handoff

- Complete `.asd/` directory structure with documentation
- Agent definition format proven with working examples
- Context file schemas defined and validated
- Configuration structure established for context system

### Implementation Guidance for Context Engine

- Use established patterns from ConfigManager for file path resolution
- Leverage DataAdapterFactory for consistent file format handling
- Implement context inheritance through file system traversal
- Cache frequently accessed context for performance optimization

### Context Injection Requirements

- 4-layer context system: critical, task-specific, agent-specific, process
- Agent filtering based on `context_requirements` from agent definitions
- Performance target: < 500ms for context injection
- Graceful degradation if context files missing or corrupted

## Challenges and Solutions

### Challenge: File System Performance

**Issue**: Frequent context file reads could impact CLI responsiveness
**Solution**: Implement intelligent caching with TTL, lazy loading for unused context layers

### Challenge: Context Relevance

**Issue**: Agents could receive too much irrelevant information
**Solution**: Agent-specific filtering using pattern matching on `context_requirements`

### Challenge: Human Usability

**Issue**: Generated context files could become unreadable
**Solution**: Maintain clear markdown structure, avoid nested complexity, enable manual editing

---

**Completion Status**: Directory structure and schemas complete, ready for context engine implementation
**Next Task**: TASK-002 - Context Injection Engine (Backend-Specialist)
**Handoff Context**: Foundation established, context engine can begin implementation using defined patterns
