---
context_type: 'project'
project_name: 'ASD CLI'
version: '0.1.0-alpha'
phase: 'MVP-CRITICAL'
last_updated: '2025-01-03'
constraints:
  - 'Node.js 18+ required'
  - 'Zero legacy compatibility - clean slate architecture'
  - 'Performance: < 2s response time for all operations'
  - 'Self-use capability target after PHASE-1A completion'
architecture_decisions:
  - 'Hybrid YAML frontmatter + Markdown content'
  - 'Atomic hierarchy: Roadmap → Phases → Specs → Tasks'
  - 'Phase-based organization via frontmatter tags'
  - 'Claude-style agent definitions (MD + YAML)'
technology_stack:
  - 'Node.js with Commander.js for CLI'
  - 'terminal-kit for terminal UI'
  - 'js-yaml for YAML processing'
  - 'Multi-format data adapters (JSON, YAML, Markdown)'
---

# ASD CLI Project Context

## Project Overview

**ASD (Agentic Spec Development) CLI** is a tool for managing software development roadmaps and specifications with AI agent workflows. This is a **0.1.0-alpha pre-production** system designed as a clean slate architecture with **no legacy compatibility**.

## Current Phase: MVP-CRITICAL (Smoke Testing Readiness)

**Target**: Make ASD usable for real-world smoke testing
**Goal**: Clean UI, fast performance, easy installation for daily use
**Milestone**: Comfortable to use on real projects

### MVP Critical Path (Priority Order)

1. **FEAT-035**: Improved CLI UI Experience (P0 - BLOCKING - 12 hours)
   - Current UI too cluttered for comfortable use
   - Clean output formatting, better error messages
   - Quiet/verbose modes for different use cases

2. **MAINT-005**: Performance Optimization (P0 - CRITICAL - 8 hours)  
   - CLI startup time < 1 second
   - Command response time < 500ms
   
3. **FEAT-030**: Error Handling (P0 - Partial - 6 hours)
   - No uncaught exceptions
   - Graceful degradation

### Completed Foundation Work

- **FEAT-012**: Context Injection System ✅
- **FEAT-013**: Task Router System ✅
- **FEAT-014**: Workflow State Manager ✅
- **MAINT-001-004**: Core stability issues ✅
- **BUG-003-004**: Critical bugs resolved ✅

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

### MVP Success Criteria

- [x] Core functionality working (specs, tasks, workflow)
- [ ] UI clean and readable (FEAT-035)
- [ ] Performance < 1s startup (MAINT-005)
- [ ] No crashes during normal use (FEAT-030)
- [ ] Installation < 5 minutes
- [ ] **SMOKE TEST MILESTONE**: Can use ASD daily on real projects

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
