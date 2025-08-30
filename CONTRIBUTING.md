# Contributing to ASD - AI Agent Workflow Automation Platform

Thank you for your interest in contributing to ASD! ASD is a production-ready AI agent workflow automation platform that **manages its own development using AI agent specialization patterns**.

This document provides guidelines for contributing to an AI-first development workflow.

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started with AI Agent Workflow

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- Git
- Terminal with Unicode support (iTerm2, Windows Terminal recommended)
- Understanding of AI agent specialization patterns

### Development Setup

1. **Fork and clone the repository**:

   ```bash
   git clone https://github.com/your-username/agentic-spec-development.git
   cd agentic-spec-development
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Link for global workflow access**:

   ```bash
   npm link
   ```

4. **Verify workflow automation setup**:

   ```bash
   asd doctor                  # Check system health
   asd workflow dashboard      # View project status
   npm test                   # Run test suite
   ```

5. **Understand the workflow system**:
   ```bash
   asd --help                 # View all workflow commands
   asd workflow --help        # View workflow-specific commands
   asd tasks --help           # View task management commands
   ```

## 🔄 AI Agent Workflow Development

### Understanding Agent Specialization

ASD uses **agent specialization patterns** for development coordination:

- **software-architect**: System design, architecture, core features
- **cli-specialist**: CLI commands, TUI development, user experience  
- **testing-specialist**: Test suites, validation, quality assurance
- **documentation-specialist**: Documentation, guides, README files
- **code-quality-specialist**: ESLint, formatting, code standards
- **git-specialist**: Git workflows, commits, branching

### AI-First Development Workflow

**ASD manages its own development** - follow these patterns:

```bash
# 1. Check current project state
asd workflow dashboard           # Full project overview
asd workflow status             # Current assignments

# 2. Find your next task
asd next --agent [your-specialization]
# Example: asd next --agent cli-specialist

# 3. Assign task to yourself  
asd assign FEAT-XXX TASK-XXX

# 4. Create branch and implement
git checkout -b feature/feat-xxx-task-xxx
# ... make your changes ...

# 5. Validate your work
npm run validate               # lint + format + tests
asd validate-assignment FEAT-XXX TASK-XXX --agent [your-type]

# 6. Complete task (triggers handoffs)
asd complete FEAT-XXX TASK-XXX

# 7. Check for ready handoffs
asd workflow handoffs
```

### Manual Development (Legacy)

For non-workflow development:

1. **Create feature branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make changes following agent specialization**
3. **Add/update tests as needed**  
4. **Run validation suite**:
   ```bash
   npm run validate
   npm test
   npm run lint
   npm run format:check
   ```

5. **Commit with conventional format**:
   ```bash
   git commit -m "feat: add support for custom spec templates"
   ```

6. **Push and create Pull Request**

### Commit Message Convention

We use [Conventional Commits](https://conventionalcommits.org/) for our commit messages:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:

- `feat: add YAML configuration support`
- `fix: resolve CLI argument parsing issue`
- `docs: update installation instructions`

## 🧪 Testing Workflow Automation

### Running Tests

```bash
# Run full validation suite (required before task completion)
npm run validate              # lint + format + tests

# Individual test commands
npm test                     # Run all tests
npm run test:watch           # Watch mode for development
npm run test:coverage        # Coverage reporting

# Workflow-specific testing
asd doctor                   # Check system health
asd workflow dashboard       # Verify project state
asd tasks --format json      # Test task discovery
```

### Writing Tests for Workflow Features

- **Place tests in `test/` directory** following existing patterns
- **Test workflow automation features**: Task routing, context injection, agent handoffs
- **Test CLI commands**: All 20+ workflow commands with options
- **Test agent specialization**: Ensure proper task routing to agent types
- **Integration tests**: Full workflow scenarios end-to-end
- **Mock external dependencies**: File system, git operations, etc.

### Test Categories

- `test/unit/` - Individual function/class tests
- `test/integration/` - Workflow automation scenarios
- `test/cli/` - CLI command testing
- `test/fixtures/` - Test data and mock projects

## 📝 Documentation for AI Workflow Platform

### Documentation Standards

- **README.md**: Focus on AI workflow automation capabilities (not basic spec viewing)
- **CLI Command Documentation**: All 20+ commands with examples and use cases  
- **Agent Specialization Guide**: Clear patterns for each agent type
- **Workflow Examples**: Real scenarios showing task assignment and completion
- **JSDoc Comments**: Document workflow automation APIs and agent interfaces

### Documentation Updates

```bash
# Research and document findings for other agents
asd research FEAT-XXX

# Export project documentation
asd export-project --format markdown

# Update agent context
asd assign [task] --update-context
```

### Automated Documentation

- **CHANGELOG.md**: Handled automatically by semantic-release
- **API Documentation**: Generated from JSDoc comments
- **Command Help**: Built into CLI with `--help` flags

## 🎯 Project Structure for AI Workflow Platform

```
agentic-spec-development/
├── bin/asd                      # CLI executable (20+ commands)
├── lib/                         # Core workflow automation modules
│   ├── workflow/                # Workflow automation system
│   │   ├── task-router.js       # AI task routing
│   │   ├── context-injector.js  # Agent context management
│   │   └── state-manager.js     # Workflow state tracking
│   ├── commands/                # CLI command implementations
│   ├── config-manager.js        # Configuration management
│   └── ui-components.js         # Terminal UI components
├── .claude/                     # AI agent definitions
│   ├── agents/                  # Agent specialization configs
│   └── context/                 # Agent workflow context
├── .asd/                        # ASD project configuration
│   ├── context/                 # Project context files
│   └── tasks/                   # Task tracking and state
├── docs/specs/                  # Specification management
│   ├── active/                  # Current development specs
│   ├── backlog/                 # Future specifications
│   ├── done/                    # Completed specifications
│   └── archived/                # Archived specifications
├── templates/                   # Specification templates
├── test/                        # Comprehensive test suite
└── .github/                     # CI/CD and workflow automation
```

## 💡 Contributing to AI Workflow Platform

### Good First Issues for Agent Specialization

```bash
# Find tasks suitable for your agent specialization
asd next --agent [your-type] --difficulty beginner
asd tasks --agent-type cli-specialist --priority P3
```

Look for issues labeled with your agent specialization:
- `agent:cli-specialist` - CLI commands, user experience
- `agent:testing-specialist` - Test coverage, quality assurance
- `agent:documentation-specialist` - Docs, guides, examples

### Areas for Contribution by Agent Type

**CLI Specialist**:
- New workflow commands and options
- Terminal UI improvements
- Command help and usage patterns
- Interactive workflow experiences

**Testing Specialist**:
- Workflow automation test coverage
- Integration test scenarios
- Performance testing for large projects
- Error handling and edge case coverage

**Documentation Specialist**:
- Agent workflow tutorials
- Advanced usage examples
- API documentation
- Onboarding guides for new contributors

**Software Architect**:
- Workflow automation architecture
- Agent coordination patterns
- Performance optimizations
- Plugin and extension systems

**Code Quality Specialist**:
- ESLint rules for workflow patterns
- Code formatting standards
- Type safety improvements
- Dependency management

## 🐛 Reporting Issues in AI Workflow Context

Before creating an issue:

1. **Check workflow status first**:
   ```bash
   asd doctor                  # System health check
   asd workflow dashboard      # Current project state  
   asd --version              # Version information
   ```

2. **Search existing issues** to avoid duplicates
3. **Use issue templates** provided for your agent specialization
4. **Provide workflow context**:
   - Which agent specialization is affected
   - Current task assignment state
   - Workflow command that failed
   - Context injection status

### Issue Categories

- **Workflow Automation**: Task routing, agent coordination, handoffs
- **CLI Commands**: Command failures, option parsing, help text
- **Agent Specialization**: Context injection, task assignment
- **Integration**: Git workflow, file system, external tools
- **Performance**: Large projects, complex workflows

## 📋 Pull Request Guidelines for AI Workflow

### Before Submitting (Agent Workflow)

**If using ASD workflow automation**:
```bash
# Complete your assigned task
asd complete FEAT-XXX TASK-XXX

# Validation happens automatically
asd workflow handoffs  # Check for ready transitions
```

**Manual PR preparation**:
- [ ] Code follows project style guidelines
- [ ] `npm run validate` passes (lint + format + tests)
- [ ] Agent specialization boundaries respected
- [ ] Workflow automation features tested
- [ ] Documentation updated for workflow changes
- [ ] Commit messages follow conventional format

### PR Requirements

1. **Clear description** with agent specialization context
2. **Task/Feature linkage** (completes FEAT-XXX TASK-XXX)
3. **Agent workflow impact** described
4. **Breaking changes** to workflow automation documented
5. **Screenshots/demos** for CLI or TUI changes

### Review Process

1. **Automated validation** must pass:
   - ESLint and Prettier checks
   - Test suite execution
   - Workflow command testing

2. **Agent specialization review**:
   - Changes reviewed by appropriate agent specialist
   - Workflow automation impact assessed
   - Cross-agent coordination verified

3. **Integration testing**:
   - Full workflow scenarios tested
   - Task routing and handoffs verified
   - No regression in existing workflows

## 🏗️ AI Workflow Architecture Guidelines

### Core Principles

- **AI-First**: Agent specialization drives development coordination
- **Self-Managing**: System uses itself for development workflow
- **Context-Driven**: Automated context injection for agent coordination
- **Terminal-Native**: CLI/TUI optimized for workflow automation
- **Agent-Extensible**: Easy to add new agent specializations
- **Backwards Compatible**: Legacy TUI mode still functional

### Workflow Architecture Patterns

- **Task Router**: Intelligent next task recommendations based on agent type
- **Context Injector**: Automatic context management for agent handoffs
- **State Manager**: Real-time workflow state tracking and persistence
- **Agent Coordinator**: Seamless transitions between specialized agents
- **Command Dispatcher**: 20+ CLI commands with rich option parsing

### Code Style for AI Workflow

- **ESLint/Prettier**: Use project configurations (npm run validate)
- **Agent Patterns**: Follow specialization boundaries in code organization
- **Workflow APIs**: Design for agent automation, not just human interaction
- **Context Preservation**: Maintain state across agent handoffs
- **CLI Design**: Rich help, progressive disclosure, workflow guidance

## 🚀 Release Process for AI Workflow Platform

### Automated Workflow-Driven Releases

**ASD's own workflow automation triggers releases**:

```bash
# Complete features using workflow automation  
asd complete FEAT-XXX TASK-XXX

# Quality validation (automated)
npm run validate

# Workflow automation handles commit and PR creation
# Semantic-release handles version and publishing
```

### Release Automation Flow

1. **Feature completion** via `asd complete` command
2. **Conventional commits** generated by workflow automation
3. **Semantic-release** analyzes commit types:
   - `feat:` → minor version bump
   - `fix:` → patch version bump
   - `BREAKING CHANGE:` → major version bump
4. **Automated publishing** to npm
5. **GitHub release** with generated changelog

### Manual Release (Emergency)

```bash
# Check workflow state
asd workflow dashboard
asd doctor

# Validate everything
npm run validate

# Manual version and publish
npm version [patch|minor|major]
npm publish
```

## 🆘 Getting Help with AI Workflow Development

### Workflow-Related Help

```bash
# Built-in help system
asd --help                    # All commands overview
asd workflow --help           # Workflow automation help
asd next --help              # Task routing help
asd tasks --help             # Task management help

# System diagnostics
asd doctor                   # Health check and troubleshooting
asd workflow dashboard       # Current project state
```

### Community Support

- **GitHub Discussions**: Workflow patterns, agent specialization questions
- **Issues**: Bugs, feature requests, workflow automation improvements
- **Workflow Examples**: Check `docs/examples/` for real usage patterns

### Contact Information

- **General Questions**: GitHub Discussions
- **Bug Reports**: GitHub Issues with workflow context
- **Security Issues**: Follow responsible disclosure practices
- **Agent Workflow Help**: Documentation and built-in help system

## 📜 License

By contributing to ASD, you agree that your contributions will be licensed under the MIT License.

---

## 🎉 Welcome to AI-First Development

**Thank you for contributing to ASD - AI Agent Workflow Automation Platform!**

You're joining a **production-ready system that manages its own development** using AI agent specialization patterns. This is the future of software development - where AI agents coordinate seamlessly to build better software faster.

**Key Resources**:
- [DEVELOPMENT.md](DEVELOPMENT.md) - Complete development setup
- [CLAUDE.md](CLAUDE.md) - Agent workflow patterns and commands  
- Built-in help: `asd --help` and `asd workflow --help`
- Live workflow status: `asd workflow dashboard`

**Ready to contribute?** Find your next task: `asd next --agent [your-specialization]`
