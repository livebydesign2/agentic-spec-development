# ASD Agent Context Prompt Template

Use this prompt when onboarding a new agent to work on ASD development tasks. This will be replaced by the automated Context Injection System (FEAT-012) once implemented.

## Agent Onboarding Context

You are working on the **ASD (Agentic Spec Development) CLI** - a tool for managing software development roadmaps and specifications with AI agent workflows. This is a **0.1.0-alpha pre-production** system with **no legacy compatibility** - it's designed as a clean slate architecture.

### Current Project State

**Phase**: PHASE-1A (Core Infrastructure & Agent Workflows)  
**Target**: Build foundation systems for agentic development workflows  
**Goal**: Enable ASD to manage its own development ("eat our own dog food")  
**Next Milestone**: Self-use capability after PHASE-1A completion

### Critical Architecture Decisions

1. **Data Format**: Hybrid YAML frontmatter + Markdown content
2. **Storage**: Atomic hierarchy: Roadmap → Phases → Specs → Tasks → Sub-tasks
3. **Organization**: Phase-based via frontmatter tags (not folder structure)
4. **Agent Definitions**: Claude-style MD files with YAML frontmatter
5. **Context Layers**: 4-tier system (critical, task-specific, agent-specific, process)

### Essential Documents to Read

**MUST READ FIRST** (in this order):

1. `/Users/tylerbarnard/Developer/Apps/asd/docs/roadmap.md` - Complete development plan and phases
2. `/Users/tylerbarnard/Developer/Apps/asd/docs/architecture.md` - System architecture and data flow
3. `/Users/tylerbarnard/Developer/Apps/asd/docs/context-injection-system.md` - Context system design

**FOR CURRENT TASK** (read the specific spec you're assigned):

- Active specs: `/Users/tylerbarnard/Developer/Apps/asd/docs/specs/active/`
- Backlog specs: `/Users/tylerbarnard/Developer/Apps/asd/docs/specs/backlog/`

**FOR CODE UNDERSTANDING**: 4. `/Users/tylerbarnard/Developer/Apps/asd/asd.config.js` - Current configuration 5. `/Users/tylerbarnard/Developer/Apps/asd/lib/index.js` - Main entry point 6. `/Users/tylerbarnard/Developer/Apps/asd/lib/config-manager.js` - Configuration system 7. `/Users/tylerbarnard/Developer/Apps/asd/lib/feature-parser.js` - Spec parsing (modernized)

### Current System Capabilities

**WORKING** ✅:

- Basic CLI commands (`asd status`, `asd list`, `asd show`)
- Spec parsing with YAML frontmatter + markdown
- Multi-format support (JSON, YAML, Markdown)
- Configuration management
- Terminal UI with terminal-kit integration

**RECENTLY IMPLEMENTED** ✅:
- Context injection system with 4-layer context (critical, task, agent, process)
- Agent definition system with customizable workflows
- Context management CLI commands (`asd context`, `asd agent`, `asd assign`)
- Automatic context updates based on task lifecycle events

**NOT YET IMPLEMENTED** ❌:
- Task routing and recommendations (`asd next` command)
- Workflow state management
- Advanced CLI commands for project management

## 🎯 NEXT TASK ASSIGNMENT

**YOUR TASK**: Implement **FEAT-013: Task Router System**

- **Priority**: P0 (Critical)
- **Status**: Ready to start
- **Spec File**: `/Users/tylerbarnard/Developer/Apps/asd/docs/specs/active/FEAT-013-task-router-system.md`
- **First Sub-task**: TASK-001 - Task Routing Engine Architecture

**Dependencies**: ✅ FEAT-012 Context Injection System (COMPLETED) - foundation is ready

Read the specification file above to understand the full requirements, then follow the Task Execution Guide below.

### Active Specifications (PHASE-1A)

**FEAT-012**: Context Injection System (P0) - ✅ _COMPLETED_

- Multi-layer context for agent handoffs
- File: `/Users/tylerbarnard/Developer/Apps/asd/docs/specs/done/FEAT-012-context-injection-system.md`

**FEAT-013**: Task Router System (P0) - _CURRENTLY ASSIGNED_

- Intelligent task recommendations
- File: `/Users/tylerbarnard/Developer/Apps/asd/docs/specs/active/FEAT-013-task-router-system.md`

**FEAT-014**: Workflow State Manager (P0) - _DEPENDS ON FEAT-013_

- Real-time progress tracking
- File: `/Users/tylerbarnard/Developer/Apps/asd/docs/specs/active/FEAT-014-workflow-state-manager.md`

### Codebase Structure

```
/Users/tylerbarnard/Developer/Apps/asd/
├── docs/
│   ├── specs/
│   │   ├── active/          # PHASE-1A specifications
│   │   ├── backlog/         # PHASE-1B & 2A specifications
│   │   └── done/            # Completed specifications
│   ├── roadmap.md           # Development roadmap
│   ├── architecture.md      # System architecture
│   └── context-injection-system.md  # Context system design
├── lib/
│   ├── config-manager.js    # Configuration system
│   ├── feature-parser.js    # Spec parsing (modernized)
│   ├── data-adapters/       # Multi-format support
│   └── index.js            # Main CLI entry
├── asd.config.js           # Project configuration
└── package.json           # Dependencies and scripts
```

### Key Technical Patterns

1. **No Legacy Code**: This is 0.1.0-alpha - avoid any backwards compatibility
2. **YAML + Markdown**: All specs use frontmatter for metadata, markdown for content
3. **DataAdapterFactory**: Handles multi-format file parsing automatically
4. **ConfigManager**: Centralized configuration with getDataPath(), getTemplatePath()
5. **Atomic Task Structure**: Every feature breaks into concrete, actionable tasks

### Development Commands

```bash
# Run the CLI
node bin/asd <command>

# Development
npm run lint        # Check code style
npm run lint:fix   # Auto-fix style issues
npm test           # Run test suite
npm run dev        # Development mode
```

## Task Execution Guide

### 1. Starting a New Task

**BEFORE CODING**:

1. Read the specification document for your assigned task
2. Understand the acceptance criteria and success metrics
3. Check dependencies - ensure prerequisite tasks are complete
4. Review the task breakdown and understand scope
5. Mark the task as `in_progress` in the specification

**CREATE TODO LIST**:
Use the TodoWrite tool to track your work:

```
todos: [
  { content: "Read specification and understand requirements", status: "completed", activeForm: "Reading specification" },
  { content: "Analyze existing code and identify integration points", status: "in_progress", activeForm: "Analyzing existing code" },
  { content: "Implement core functionality", status: "pending", activeForm: "Implementing core functionality" },
  { content: "Write tests for new functionality", status: "pending", activeForm: "Writing tests" },
  { content: "Update documentation", status: "pending", activeForm: "Updating documentation" }
]
```

### 2. Implementation Process

1. **Understand Integration Points**: How does this fit with existing code?
2. **Follow Established Patterns**: Use DataAdapterFactory, ConfigManager patterns
3. **Implement Incrementally**: Start with core functionality, add features
4. **Test as You Go**: Use `npm test` and manual testing
5. **Update Documentation**: Keep architecture.md and related docs current

### 3. Code Quality Standards

- **Linting**: All code must pass `npm run lint`
- **Testing**: New functionality requires tests
- **Documentation**: Public methods need JSDoc comments
- **Error Handling**: Graceful error handling with user-friendly messages
- **Performance**: Consider startup time and memory usage

### 4. Closing Out a Task

**BEFORE MARKING COMPLETE**:

1. ✅ All acceptance criteria met
2. ✅ Tests pass (`npm test`)
3. ✅ Linting passes (`npm run lint`)
4. ✅ Documentation updated
5. ✅ Manual testing completed

**UPDATE SPECIFICATION**:

1. Mark task as completed in the spec file
2. Update any status or progress indicators
3. Add any learnings or implementation notes
4. Update dependencies if they changed

**UPDATE TRACKING**:

1. Mark TodoWrite tasks as completed
2. Update roadmap progress if milestone reached
3. Identify any follow-up tasks discovered during implementation

### 5. Agent Handoff Process

When finishing work that another agent will continue:

**HANDOFF DOCUMENTATION**:

1. Update the specification with current status
2. Document any implementation decisions made
3. Note any blockers or challenges discovered
4. Provide clear next steps for the next agent

**CONTEXT PRESERVATION**:

1. Update relevant architecture documentation
2. Add code comments explaining complex decisions
3. Update configuration or examples if needed
4. Ensure all changes are committed and documented

## Emergency Context

If you encounter issues:

1. **Check Recent Changes**: Look at git history for context
2. **Read Error Messages**: ASD uses clear error messages with guidance
3. **Check Configuration**: Verify `asd.config.js` and local config
4. **Validate Data**: Use `asd validate` to check specification format
5. **Ask for Clarification**: Better to ask than make incorrect assumptions

## Success Metrics

Your work contributes to these phase goals:

**PHASE-1A Success Criteria**:

- [ ] Context injection provides 4-layer context to agents
- [ ] Task routing matches agent capabilities with available work
- [ ] Workflow state updates automatically with inline documentation
- [ ] **DOG FOOD MILESTONE**: ASD manages PHASE-1B development using itself

**Quality Standards**:

- All tests pass
- Code follows established patterns
- Documentation is current and accurate
- Performance meets requirements (< 2s response time)

Remember: This is pre-production software designed for AI agents. Focus on clean, maintainable code that enables the self-development milestone after PHASE-1A completion.
