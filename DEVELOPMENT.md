# ASD Development Setup

**ASD (Agentic Spec Development)** - AI Agent Workflow Automation Platform

> **System Status**: Production-ready AI workflow automation platform managing its own development

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- Git
- Terminal with good Unicode support (iTerm2, Windows Terminal, etc.)

## Quick Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/livebydesign2/agentic-spec-development.git
   cd agentic-spec-development
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Link for global development**
   ```bash
   npm link
   # Now you can use `asd` command globally for workflow automation
   ```

4. **Verify setup**
   ```bash
   asd doctor          # Check system health
   asd workflow dashboard  # View project overview
   ```

## Running ASD Workflow System

### Direct Development

```bash
# Direct execution
node bin/asd workflow dashboard
node bin/asd next --agent cli-specialist
node bin/asd --debug
```

### Linked Globally (Recommended)

```bash
# Complete workflow automation
asd workflow dashboard     # Full project status
asd next --agent [type]   # Get next recommended task
asd assign FEAT-001 TASK-001  # Assign task
asd complete FEAT-001 TASK-001  # Complete task
asd --help                # Full command reference
```

### Legacy Mode

```bash
# Basic TUI mode (legacy)
asd                       # Start interactive interface
asd init                  # Initialize project structure
```

### Development Scripts

```bash
# Start ASD workflow system
npm start                 # Start interactive interface (legacy mode)
npm run dev              # Same as start

# Test workflow automation
npm test                 # Run full test suite
npm run test:watch       # Watch mode for development
npm run test:coverage    # Coverage reporting

# Code quality (required before task completion)
npm run lint             # ESLint validation
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Prettier formatting
npm run format:check     # Check formatting

# Full validation (run before completing tasks)
npm run validate         # lint + format + unit tests
```

## Project Structure

```
asd/
├── bin/asd                      # CLI executable entry point
├── lib/                         # Core workflow automation modules
│   ├── index.js                 # Main ASD client class
│   ├── config-manager.js        # Configuration management
│   ├── feature-parser.js        # Specification parsing
│   ├── progress-calc.js         # Progress calculation
│   ├── ui-components.js         # Terminal UI components
│   ├── workflow/                # Workflow automation system
│   │   ├── task-router.js       # AI task routing
│   │   ├── context-injector.js  # Context management
│   │   └── state-manager.js     # Workflow state
│   └── commands/                # CLI command implementations
├── .claude/                     # AI agent definitions
│   ├── agents/                  # Specialized agent configurations
│   └── context/                 # Agent context and workflows
├── .asd/                        # ASD project configuration
│   ├── context/                 # Project context files
│   └── tasks/                   # Task tracking
├── docs/                        # Project documentation
│   └── specs/                   # Specification management
│       ├── active/              # Current specifications
│       ├── backlog/             # Future specifications
│       ├── done/                # Completed specifications
│       └── archived/            # Archived specifications
├── templates/                   # Specification templates
└── test/                        # Comprehensive test suite
```

## AI Agent Workflow Development

🎉 **DOG FOOD MILESTONE ACHIEVED**: ASD now manages its own development using agent workflow automation!

### Primary Development Workflow (AI Agent Coordination)

**ASD uses itself to manage development** - follow the workflow automation patterns:

```bash
# 1. Check current project status
asd workflow dashboard           # Full project overview
asd workflow status             # Current assignments

# 2. Get next recommended task for your agent type
asd next --agent software-architect
asd next --agent cli-specialist
asd next --agent testing-specialist
asd next --agent documentation-specialist

# 3. Assign task to yourself
asd assign FEAT-018 TASK-001

# 4. Do the development work
# ... implement feature, write tests, update docs ...

# 5. Complete task and trigger handoffs
asd complete FEAT-018 TASK-001

# 6. Check for ready handoffs
asd workflow handoffs
```

### Agent Specialization Patterns

- **software-architect**: System design, architecture decisions, core features
- **cli-specialist**: CLI commands, TUI development, user experience
- **testing-specialist**: Test suites, validation frameworks, quality assurance
- **documentation-specialist**: Documentation, README files, user guides
- **code-quality-specialist**: ESLint rules, code standards, formatting
- **git-specialist**: Git workflows, commit management, branching strategy

### Cross-Agent Coordination

```bash
# See who's working on what
asd workflow assignments

# Document research findings for other agents
asd research FEAT-019

# Validate proper task routing
asd validate-assignment FEAT-018 TASK-001 --agent cli-specialist

# Export/import project state
asd export-project --format json
asd import-project --file project-state.json
```

### Manual Development (Legacy/Fallback)

For development without workflow automation:

1. **Make changes** to code
2. **Test locally** with `node bin/asd`
3. **Run tests** with `npm test`
4. **Lint code** with `npm run lint:fix`
5. **Commit changes** following conventional commit format
6. **Push to repository**

## Testing Workflow Automation Changes

### 1. Test Workflow Commands

```bash
# Test workflow automation in development repository
asd doctor                      # Check system health
asd workflow dashboard          # Verify project state
asd tasks                      # Test task discovery
asd next --agent cli-specialist # Test task routing
```

### 2. Test in Clean Environment

```bash
# Create isolated test environment
mkdir ../test-asd-workflow
cd ../test-asd-workflow

# Initialize with workflow automation
/path/to/asd/bin/asd init
/path/to/asd/bin/asd workflow dashboard

# Test agent workflow patterns
/path/to/asd/bin/asd next --agent software-architect
/path/to/asd/bin/asd assign SPEC-001 TASK-001
/path/to/asd/bin/asd complete SPEC-001 TASK-001
```

### 3. Test Legacy TUI Mode

```bash
# Test legacy interactive interface
/path/to/asd/bin/asd            # Start TUI mode
# Navigate through specs, test rendering, file watching
```

### 4. Test with Sample Specifications

- Create markdown files in `docs/specs/active/`
- Test workflow automation with real specifications
- Verify task assignment and completion workflows
- Test agent context injection and handoffs

## Production Status

- **Version**: 1.0.0+ (Production Ready)
- **Status**: **Production-ready AI workflow automation platform**
- **Milestone**: 🎯 **DOG FOOD MILESTONE ACHIEVED** - Self-managing development operational
- **Core Features**: ✅ Context Injection, Task Routing, State Management, Agent Coordination
- **Workflow Automation**: ✅ 20+ CLI commands, Agent specialization, Handoff automation
- **API Stability**: Stable workflow automation APIs
- **Self-Management**: ✅ ASD successfully manages its own development

## Release Process

ASD follows semantic versioning with automated releases:

```bash
# Development workflow triggers releases
# 1. Complete features using workflow automation
asd complete FEAT-XXX TASK-XXX

# 2. Quality validation (automated)
npm run validate

# 3. Conventional commits trigger semantic versioning
git commit -m "feat: add new workflow automation feature"
git commit -m "fix: resolve task routing issue"
git commit -m "docs: update workflow documentation"

# 4. Automated release (CI/CD)
# - Version bump based on commit types
# - CHANGELOG.md generation
# - npm publish (if configured)
# - Git tags and GitHub releases
```

### Manual Release (if needed)

```bash
# Check current status
asd workflow dashboard

# Validate everything works
npm run validate
asd doctor

# Version and publish
npm version [patch|minor|major]
npm publish
```

## Contributing to AI Workflow Development

ASD development follows AI agent workflow patterns:

### Quick Start for Contributors

1. **Setup development environment** (see Quick Setup above)
2. **Understand agent specializations** (see Agent Specialization Patterns)
3. **Follow workflow automation patterns** (see Primary Development Workflow)
4. **Review detailed guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md)

### Key Development Principles

- **AI-First**: Use ASD's own workflow automation for development
- **Agent Specialization**: Work within your agent expertise area
- **Context Injection**: Leverage automated context management
- **Quality Gates**: Use validation commands before task completion
- **Self-Management**: Trust the workflow automation system

### Development Environment Health

```bash
# Check development setup
asd doctor                  # System health check
asd workflow status        # Current development state
asd validate-assignment    # Verify proper task routing
```
