---
context_type: "project"
project_name: "ASD CLI"
version: "0.1.0-alpha"
phase: "PHASE-1A"
last_updated: "2024-08-24"
constraints:
  - "Node.js 18+ required"
  - "Zero legacy compatibility - clean slate architecture"
  - "Performance: < 2s response time for all operations"
  - "Self-use capability target after PHASE-1A completion"
architecture_decisions:
  - "Hybrid YAML frontmatter + Markdown content"
  - "Atomic hierarchy: Roadmap → Phases → Specs → Tasks"
  - "Phase-based organization via frontmatter tags"
  - "Claude-style agent definitions (MD + YAML)"
technology_stack:
  - "Node.js with Commander.js for CLI"
  - "terminal-kit for terminal UI"
  - "js-yaml for YAML processing"
  - "Multi-format data adapters (JSON, YAML, Markdown)"
---

# ASD CLI Project Context

## Project Overview

**ASD (Agentic Spec Development) CLI** is a tool for managing software development roadmaps and specifications with AI agent workflows. This is a **0.1.0-alpha pre-production** system designed as a clean slate architecture with **no legacy compatibility**.

## Current Phase: PHASE-1A (Core Infrastructure)

**Target**: Build foundation systems for agentic development workflows
**Goal**: Enable ASD to manage its own development ("eat our own dog food")
**Milestone**: Self-use capability after PHASE-1A completion

### Active Work

- **FEAT-012**: Context Injection System (Foundation - enables all other features)
- **FEAT-013**: Task Router System (Depends on FEAT-012)
- **FEAT-014**: Workflow State Manager (Depends on FEAT-012)

## Critical Constraints

### Technical Constraints

- **Node.js 18+ Required**: Modern JavaScript features and performance
- **Performance Budget**: < 2 seconds response time for all CLI operations
- **No Legacy Compatibility**: Clean slate architecture, no backwards compatibility burden
- **File System Based**: Uses file system for data storage, not external databases

### Architecture Principles

- **Atomic Hierarchy**: Clear structure from Roadmap → Phases → Specs → Tasks → Sub-tasks
- **YAML + Markdown**: All specs use frontmatter for metadata, markdown for human context
- **Agent-First Design**: System optimized for AI agent workflows and handoffs
- **Human Observable**: All agent interactions and context must be human-readable

### Data Format Standards

- **Specification Files**: YAML frontmatter + Markdown content
- **Agent Definitions**: Claude-style MD files with YAML frontmatter
- **Context Files**: Hybrid format enabling both human and programmatic access
- **Configuration**: JavaScript modules for flexibility, JSON for structured data

## System Architecture

### Core Components

- **ConfigManager**: Centralized configuration with `getDataPath()`, `getTemplatePath()`
- **SpecParser**: Modern spec parsing with multi-format support
- **DataAdapterFactory**: Handles JSON, YAML, and Markdown formats automatically
- **Context System**: 4-layer context injection (critical, task-specific, agent-specific, process)

### File Structure

```
/Users/tylerbarnard/Developer/Apps/asd/
├── docs/specs/          # Specification storage
│   ├── active/          # PHASE-1A specifications
│   ├── backlog/         # PHASE-1B & 2A specifications
│   └── done/            # Completed specifications
├── .asd/                # Context injection system
│   ├── agents/          # Agent definitions
│   ├── context/         # Project/spec/task context
│   └── processes/       # Workflow templates
└── lib/                 # Core implementation
```

## Development Workflow

### Current Working System

- Basic CLI commands (`asd status`, `asd list`, `asd show`)
- Spec parsing with YAML frontmatter + markdown
- Multi-format support (JSON, YAML, Markdown)
- Configuration management
- Terminal UI with terminal-kit integration

### Not Yet Implemented

- Context injection system (FEAT-012 - in progress)
- Task routing and recommendations
- Workflow state management
- Agent assignment and handoffs
- Advanced CLI commands

## Quality Standards

### Code Quality Requirements

- All code must pass `npm run lint`
- New functionality requires tests
- Public methods need JSDoc comments
- Graceful error handling with user-friendly messages
- Performance considerations (startup time, memory usage)

### Integration Requirements

- Must work with existing ConfigManager and SpecParser
- Follow DataAdapterFactory patterns for file handling
- Maintain consistency with terminal-kit UI components
- Preserve human readability of all data files

## Key Implementation Patterns

### Configuration Pattern

```javascript
const configManager = new ConfigManager();
const dataPath = configManager.getDataPath();
const templatePath = configManager.getTemplatePath();
```

### Spec Parsing Pattern

```javascript
const specParser = new SpecParser(configManager);
await specParser.loadSpecs();
const specs = specParser.getSpecs();
```

### Data Adapter Pattern

```javascript
const adapter = adapterFactory.createFromFile(filePath);
const spec = await adapter.loadDocument(filePath);
```

## Success Criteria

### PHASE-1A Success Criteria

- [ ] Context injection provides 4-layer context to agents
- [ ] Task routing matches agent capabilities with available work
- [ ] Workflow state updates automatically with inline documentation
- [ ] **DOG FOOD MILESTONE**: ASD manages PHASE-1B development using itself

### Quality Gates

- All tests pass
- Code follows established patterns
- Documentation is current and accurate
- Performance meets requirements (< 2s response time)

## Critical Dependencies

- **External**: Node.js 18+, npm packages (commander, terminal-kit, js-yaml)
- **Internal**: ConfigManager, SpecParser, DataAdapterFactory must remain stable
- **File System**: Reliable access to `docs/specs/` and `.asd/` directories
- **Environment**: Cross-platform compatibility (macOS, Linux, Windows)

## Risk Factors

### Technical Risks

- File system performance with large numbers of specs
- Context injection complexity could impact CLI responsiveness
- Agent workflow complexity may create maintenance burden

### Mitigation Strategies

- Performance testing with large datasets
- Incremental implementation with validation at each step
- Clear separation between core functionality and agent features
- Comprehensive test coverage for critical paths

---

This project context provides the foundation for all agent work. Agents should reference this for understanding constraints, architecture decisions, and quality requirements.
