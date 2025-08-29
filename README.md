# 🤖 Agentic Spec Development (ASD)

> AI Agent Workflow Automation Platform - Self-managing development through intelligent agent coordination

[![Pre-Production](https://img.shields.io/badge/Status-Pre--Production-orange.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

> ⚠️ **Pre-Production Software**: ASD is currently in active development and not yet published to npm. Features and APIs may change before the first stable release.

**ASD** is a sophisticated AI agent workflow automation platform that enables self-managing development teams. It coordinates AI agents to automatically assign tasks, manage contexts, track progress, and orchestrate complex development workflows - achieving the "dog food milestone" by successfully managing its own development.

![ASD Terminal Interface](https://via.placeholder.com/800x400/2d3748/cbd5e0?text=ASD%20Terminal%20Interface)

## ✨ Key Features

- 🤖 **AI Agent Coordination** - Intelligent task routing and agent specialization (software-architect, cli-specialist, etc.)
- 🔄 **Self-Managing Workflows** - Automatic task assignment, context injection, and progress tracking
- 📊 **Workflow Automation** - Smart handoffs between agents with context preservation
- 🎯 **Task Intelligence** - AI-powered task recommendation based on agent capabilities and project state
- 📋 **Context Management** - Automatic context injection and state management across agent handoffs
- 🔍 **Validation Gates** - Quality assurance through agent assignment validation and completion checks
- 📈 **Progress Analytics** - Comprehensive workflow metrics, dashboards, and progress visualization
- 🛠️ **Development Orchestration** - Manages its own development using AI agent workflows (dog food milestone)

## 🚀 Quick Start

### Installation

> **Note**: ASD is not yet published to npm. Install from source:

```bash
# Clone the repository
git clone https://github.com/livebydesign2/agentic-spec-development.git
cd agentic-spec-development

# Install dependencies
npm install

# Link for global usage (recommended)
npm link

# Verify installation
asd doctor
```

### Initialize AI Workflow Automation

```bash
# Set up ASD workflow automation in your project
asd init

# Initialize with specification-focused structure
asd init --type spec

# Check project health after initialization
asd doctor
```

This creates:

```
docs/specs/
├── active/     # Currently active specifications and tasks
├── backlog/    # Planned specifications awaiting assignment
├── done/       # Completed specifications
└── .asd/
    ├── context/    # Context files for agent coordination
    └── agents/     # Agent definitions and specializations
```

### Start AI Agent Workflow

```bash
# Get project overview and current status
asd workflow dashboard

# Get next recommended task for your agent type
asd next --agent software-architect
asd next --agent cli-specialist
asd next --agent documentation-specialist

# Assign task to yourself
asd assign FEAT-018 TASK-001

# Work on the task, then complete it
asd complete FEAT-018 TASK-001

# Check for ready handoffs to other agents
asd workflow handoffs
```

## 📋 AI Agent Workflow Automation

ASD orchestrates AI agents to manage complex development workflows automatically:

### 🤖 Agent Specializations

- **software-architect**: System design, architecture decisions, technical planning
- **cli-specialist**: Terminal interfaces, CLI commands, user experience
- **testing-specialist**: Test suites, quality assurance, validation systems
- **documentation-specialist**: Documentation, README files, user guides
- **code-quality-specialist**: ESLint, code standards, refactoring
- **git-specialist**: Git workflows, commits, branches, releases

### 🔄 Workflow Automation Process

```bash
# 1. Smart Task Discovery
$ asd next --agent software-architect
→ Recommends: FEAT-019 TASK-001 - Validation Manager System (12 hours, P1)

# 2. Context-Aware Assignment
$ asd assign FEAT-019 TASK-001
→ Updates context files, validates agent capability, prepares workspace

# 3. Intelligent Progress Tracking
$ asd workflow status
→ Shows current assignments, blockers, ready handoffs

# 4. Automated Handoffs
$ asd complete FEAT-019 TASK-001
→ Triggers handoff to cli-specialist for implementation

# 5. Quality Gates
$ asd validate-assignment FEAT-020 TASK-001 --agent testing-specialist
→ Validates task readiness and agent capability match
```

## 🛠️ CLI Commands Reference

### Core Workflow Commands

| Command | Description | Example |
|---------|-------------|---------|
| `asd workflow dashboard` | Comprehensive project status dashboard | Shows all specs, progress, assignments |
| `asd workflow status` | Current workflow status and assignments | Active tasks, blocked items, handoffs |
| `asd workflow progress` | Project progress breakdown with metrics | Phase progress, completion rates |
| `asd workflow handoffs` | Ready handoffs between agents | Tasks ready for agent transitions |
| `asd tasks` | Enhanced task listing with filtering | `--agent cli-specialist --priority P1` |
| `asd next --agent <type>` | AI-powered task recommendations | Smart task suggestions for agent type |
| `asd assign <spec> <task>` | Assign task with context updates | Full workflow context preparation |
| `asd complete <spec> <task>` | Complete task and trigger handoffs | Automatic next-agent determination |

### Quality & Validation Commands

| Command | Description | Example |
|---------|-------------|---------|
| `asd validate-assignment <spec> <task> --agent <type>` | Validate task assignment capability | Quality gate before assignment |
| `asd validate` | Validate entire project or specific specs | `--spec FEAT-018` for targeted validation |
| `asd lint` | Quick validation for development | Continuous validation during development |
| `asd doctor` | Comprehensive environment health check | Validates setup, dependencies, structure |

### Context & Research Commands

| Command | Description | Example |
|---------|-------------|---------|
| `asd research <spec-id>` | Manage research findings and documentation | Capture findings for agent handoffs |
| `asd context` | Manage context files and injection system | Context management for agent coordination |
| `asd report` | Structured temporary documentation management | Automatic lifecycle management |

### Project Management Commands

| Command | Description | Example |
|---------|-------------|---------|
| `asd export-project` | Export complete project data and state | Full backup with specs, context, state |
| `asd import-project <file>` | Import project data from backup | Restore complete project state |
| `asd format` | Multi-format data operations | JSON, YAML, Markdown processing |

### Basic Setup Commands

| Command | Description | Example |
|---------|-------------|---------|
| `asd init` | Initialize ASD workflow automation | `--type spec` for specification focus |
| `asd config` | Show current configuration | Display all configuration settings |
| `asd` | Start interactive terminal interface | Legacy TUI mode (when needed) |

## ⚙️ Configuration

ASD uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) for flexible configuration loading.

### Configuration Files (Supported Formats)

ASD will search for configuration in the following order:

1. `asd.config.js` (recommended)
2. `.asdrc.js`
3. `.asdrc.json`
4. `.asdrc`
5. `package.json` (in `asd` property)
6. Legacy roadmap configs (backwards compatibility)

### Basic Workflow Configuration

**asd.config.js**

```javascript
module.exports = {
  // Workflow automation settings
  featuresPath: 'docs/specs',
  contextPath: '.asd/context',
  agentsPath: '.asd/agents',

  // Agent workflow configuration
  agents: {
    'software-architect': { specialization: 'design', priority: 1 },
    'cli-specialist': { specialization: 'implementation', priority: 2 },
    'testing-specialist': { specialization: 'validation', priority: 3 },
    'documentation-specialist': { specialization: 'documentation', priority: 4 }
  },

  // Task management
  supportedTypes: ['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE'],
  statusFolders: ['active', 'backlog', 'done'],
  priorities: ['P0', 'P1', 'P2', 'P3'],

  // Workflow automation features
  autoHandoffs: true,
  contextInjection: true,
  taskValidation: true,
  progressTracking: true
};
```

### Advanced Workflow Configuration

```javascript
module.exports = {
  // Advanced workflow paths
  featuresPath: 'docs/specifications',
  contextPath: '.asd/context',
  agentsPath: '.asd/agents',
  templatesPath: 'templates/specs',

  // Agent specialization and routing
  agents: {
    'senior-architect': { 
      specialization: 'complex-design', 
      priority: 1,
      capabilities: ['system-design', 'architecture', 'technical-planning'],
      workloadLimit: 3
    },
    'frontend-specialist': { 
      specialization: 'ui-implementation',
      priority: 2,
      capabilities: ['react', 'cli', 'tui', 'user-experience'],
      workloadLimit: 5
    },
    'backend-specialist': {
      specialization: 'api-implementation',
      priority: 2,
      capabilities: ['nodejs', 'databases', 'apis'],
      workloadLimit: 5
    }
  },

  // Workflow automation settings
  autoHandoffs: true,
  contextInjection: true,
  taskValidation: true,
  progressTracking: true,
  qualityGates: true,

  // Task routing intelligence
  taskRouting: {
    enableAIRecommendations: true,
    considerWorkload: true,
    enforceCapabilities: true,
    allowCrossAgentHandoffs: true
  },

  // Custom project structure
  supportedTypes: ['SPEC', 'EPIC', 'STORY', 'TASK', 'BUG'],
  statusFolders: ['todo', 'doing', 'review', 'done'],
  priorities: ['critical', 'high', 'medium', 'low']
};
```

### Package.json Configuration

```json
{
  "asd": {
    "featuresPath": "specifications",
    "autoRefresh": false,
    "supportedTypes": ["SPEC", "FEAT"]
  }
}
```

## 📄 AI-Enhanced Specification Format

ASD uses AI-enhanced specifications with workflow automation metadata for intelligent task routing and agent coordination.

### AI-Enhanced Specification Format

```markdown
# SPEC-001: User Authentication System

**Priority:** P1  
**Status:** active  
**Type:** SPEC  
**Created:** 2024-01-15  
**Phase:** PHASE-2A  
**Current Agent:** software-architect  

## Overview

Implement comprehensive authentication system with OAuth2, 2FA, and RBAC.

## Requirements

- [ ] OAuth2 provider integration
- [x] JWT token management  
- [ ] Two-factor authentication
- [ ] Role-based access control

## Tasks

### TASK-001: Setup OAuth2 Integration

**Status:** done  
**Agent:** software-architect → cli-specialist  
**Estimated:** 5 days  
**Context:** `.asd/context/SPEC-001-TASK-001.md`  
**Handoff Ready:** 2024-01-20

Configure OAuth2 providers (Google, GitHub, Microsoft).

**Agent Capabilities Required:**
- System design, API integration planning

**Handoff Notes:**
- Architecture complete, ready for CLI implementation
- Context files updated with technical specifications

### TASK-002: Implement 2FA with TOTP

**Status:** assigned  
**Agent:** cli-specialist  
**Assigned:** 2024-01-20  
**Estimated:** 3 days  
**Blockers:** None

Add TOTP-based two-factor authentication with CLI interface.

**Agent Capabilities Required:**
- CLI development, user interface design, terminal UX

## Workflow Automation

**Next Handoff:** testing-specialist (after TASK-002 completion)  
**Quality Gates:** Validate assignment before handoff  
**Context Injection:** Automatic for agent transitions
```

### Legacy Format Support

ASD also supports existing FEAT-XXX formats:

```markdown
# FEAT-001: Dashboard UI Components

**Priority:** P2  
**Status:** backlog  
**Epic:** User Interface

## Description

Create reusable UI components for the admin dashboard.

## Requirements

- Component library setup
- Storybook documentation
- Accessibility compliance

## Tasks

- [ ] Setup component library
- [ ] Create base components
- [ ] Add accessibility tests
```

## 🔧 Comprehensive CLI Reference

### Workflow Management Commands

#### `asd workflow dashboard`
Comprehensive project status with all metrics, progress tracking, and current assignments.

```bash
asd workflow dashboard
asd workflow dashboard --phase PHASE-1B
asd workflow dashboard --format json
```

#### `asd workflow status`
Current workflow status showing active assignments and handoff readiness.

```bash
asd workflow status                    # Current assignments
asd workflow status --agent cli-specialist  # Agent-specific status
asd workflow status --verbose          # Detailed status with context
```

#### `asd workflow handoffs`
Show ready handoffs between agents with context and validation status.

```bash
asd workflow handoffs                  # All ready handoffs
asd workflow handoffs --to testing-specialist  # Handoffs to specific agent
asd workflow handoffs --history        # Handoff history
```

### Task Management Commands

#### `asd tasks`
Enhanced task listing with comprehensive filtering and output formats.

```bash
asd tasks                              # All available tasks
asd tasks --agent software-architect   # Tasks for specific agent
asd tasks --priority P0,P1             # High priority tasks only
asd tasks --format json                # JSON output for scripts
asd tasks --show-dependencies          # Show task relationships
asd tasks --only-unassigned            # Available tasks only
```

#### `asd next --agent <type>`
AI-powered task recommendations based on agent capabilities and project state.

```bash
asd next --agent software-architect    # Architecture tasks
asd next --agent cli-specialist        # CLI implementation tasks
asd next --agent testing-specialist    # Testing and validation tasks
asd next --agent documentation-specialist  # Documentation tasks
```

#### `asd assign <spec-id> <task-id>`
Assign task to agent with full context preparation and validation.

```bash
asd assign FEAT-018 TASK-001          # Assign task with context update
asd assign SPEC-019 TASK-002 --agent cli-specialist  # Override agent
asd assign FEAT-020 TASK-001 --validate  # Pre-validate assignment
```

#### `asd complete <spec-id> <task-id>`
Complete task and trigger automatic handoffs with workflow progression.

```bash
asd complete FEAT-018 TASK-001        # Complete task, trigger handoffs
asd complete SPEC-019 TASK-002 --no-handoff  # Complete without handoff
asd complete FEAT-020 TASK-001 --notes "Implementation complete"
```

### Quality & Validation Commands

#### `asd validate-assignment <spec> <task> --agent <type>`
Quality gate validation before task assignment.

```bash
asd validate-assignment FEAT-018 TASK-001 --agent cli-specialist
asd validate-assignment SPEC-019 TASK-002 --agent testing-specialist --strict
```

#### `asd validate`
Comprehensive project validation using ValidationManager.

```bash
asd validate                           # Validate entire project
asd validate --spec FEAT-018          # Validate specific specification
asd validate --format json            # JSON validation report
```

#### `asd doctor`
Comprehensive environment and startup validation.

```bash
asd doctor                             # Full health check
asd doctor --quick                     # Fast essential checks only
asd doctor --verbose                   # Detailed diagnostic output
```

### Research & Context Commands

#### `asd research <spec-id>`
Manage research findings and capture for agent handoffs.

```bash
asd research FEAT-019                  # Capture research for spec
asd research FEAT-019 --export         # Export research findings
asd research --list                    # List all research files
```

#### `asd context`
Manage context files and injection system for agent coordination.

```bash
asd context                            # List all context files
asd context FEAT-018 TASK-001         # Show specific task context
asd context --validate                 # Validate context integrity
```

### Setup & Configuration Commands

#### `asd init`
Initialize ASD workflow automation in current directory.

```bash
asd init                               # Default workflow structure
asd init --type spec                   # Specification-focused setup
asd init --agents-only                 # Just agent definitions
```

#### `asd config`
Display comprehensive configuration with workflow settings.

```bash
asd config                             # Show all configuration
asd config --agents                    # Agent configurations only
asd config --workflow                  # Workflow automation settings
```

## 📚 Programmatic Workflow API

Use ASD's workflow automation programmatically in your applications:

### Basic Workflow Client

```javascript
const { ASDClient } = require('agentic-spec-development');

const asd = new ASDClient({
  cwd: '/path/to/project',
  enableWorkflowAutomation: true,
  agents: ['software-architect', 'cli-specialist', 'testing-specialist']
});

await asd.init();

// Get workflow status
const status = await asd.workflow.getStatus();
console.log(`Active tasks: ${status.activeTasks.length}`);

// AI-powered task recommendation
const nextTask = await asd.tasks.getNextRecommendation('software-architect');
console.log(`Recommended: ${nextTask.spec} ${nextTask.task}`);
```

### Agent Coordination API

```javascript
const { WorkflowManager, AgentRouter } = require('agentic-spec-development');

const workflowManager = new WorkflowManager('/project/root');
const agentRouter = new AgentRouter(workflowManager);

// Assign task with context injection
await agentRouter.assignTask('FEAT-018', 'TASK-001', {
  agent: 'cli-specialist',
  context: 'Implementation ready from architecture phase'
});

// Complete task with automatic handoff
const handoffResult = await agentRouter.completeTask('FEAT-018', 'TASK-001', {
  triggerHandoff: true,
  nextAgent: 'testing-specialist'
});

console.log(`Handoff to: ${handoffResult.nextAgent}`);
```

### Context Management API

```javascript
const { ContextManager } = require('agentic-spec-development');

const contextManager = new ContextManager('/project/.asd/context');

// Inject context for agent handoff
await contextManager.injectContext('FEAT-018', 'TASK-001', {
  previousAgent: 'software-architect',
  nextAgent: 'cli-specialist',
  handoffNotes: 'Architecture complete, ready for implementation',
  artifacts: ['system-design.md', 'api-spec.json']
});

// Retrieve context for task
const context = await contextManager.getTaskContext('FEAT-018', 'TASK-001');
console.log(`Context: ${context.handoffNotes}`);
```

### Workflow Analytics API

```javascript
const asd = new ASDClient({ cwd: process.cwd() });
await asd.init();

// Comprehensive analytics
const analytics = await asd.workflow.getAnalytics();
console.log(`Project Progress: ${analytics.completionRate}%`);
console.log(`Agent Workloads: ${JSON.stringify(analytics.agentWorkloads)}`);

// Progress tracking
const progress = await asd.workflow.getProgress('PHASE-1B');
console.log(`Phase Progress: ${progress.completed}/${progress.total} tasks`);

// Handoff predictions
const predictions = await asd.workflow.predictHandoffs();
console.log(`Next handoffs: ${predictions.map(p => p.taskId).join(', ')}`);
```

## 📂 AI Workflow Directory Structure

### Basic AI-Managed Project

```
my-ai-project/
├── asd.config.js                    # Workflow automation config
├── .asd/
│   ├── context/                     # Context files for agent handoffs
│   │   ├── SPEC-001-TASK-001.md    # Task-specific context
│   │   └── FEAT-018-TASK-002.md    # Handoff documentation
│   ├── agents/                      # Agent definitions and capabilities
│   │   ├── software-architect.json
│   │   ├── cli-specialist.json
│   │   └── testing-specialist.json
│   └── workflow/                    # Workflow state and progress
│       ├── assignments.json         # Current task assignments
│       ├── handoffs.json           # Handoff queue and history
│       └── progress.json           # Phase and project progress
└── docs/specs/
    ├── active/                      # Currently active specifications
    │   ├── SPEC-001-auth-system.md
    │   └── FEAT-018-cli-commands.md
    ├── backlog/                     # AI-triaged backlog
    │   ├── SPEC-003-analytics.md
    │   └── FEAT-019-validation.md
    └── done/                        # Completed by AI workflow
        └── SPEC-000-project-setup.md
```

### Enterprise AI Workflow Project

```
enterprise-ai-project/
├── .asdrc.js                        # Enterprise workflow config
├── .asd/
│   ├── context/
│   │   ├── phases/
│   │   │   ├── PHASE-1A/           # Phase-specific contexts
│   │   │   └── PHASE-1B/
│   │   ├── agents/                 # Agent-specific contexts
│   │   └── handoffs/               # Detailed handoff documentation
│   ├── agents/
│   │   ├── senior-architect.json   # Specialized agent roles
│   │   ├── frontend-specialist.json
│   │   ├── backend-specialist.json
│   │   ├── devops-specialist.json
│   │   └── qa-specialist.json
│   └── workflow/
│       ├── phases.json             # Phase definitions and progress
│       ├── dependencies.json       # Task dependency management
│       └── metrics.json            # Workflow analytics
├── specifications/
│   ├── active/
│   │   ├── architecture/           # Architecture specifications
│   │   ├── features/               # Feature implementations
│   │   └── infrastructure/         # Infrastructure requirements
│   ├── backlog/
│   │   ├── epics/                  # Large-scale epics
│   │   ├── features/               # Feature backlog
│   │   └── technical-debt/         # Technical debt tracking
│   └── completed/
│       ├── PHASE-1A/               # Completed by phase
│       └── PHASE-1B/
└── templates/
    ├── agents/                     # Agent definition templates
    ├── specs/                      # Specification templates
    └── contexts/                   # Context file templates
```

### Legacy Project (Backwards Compatible)

```
legacy-project/
├── .roadmaprc.json
├── docs/product/features/
│   ├── active/
│   │   ├── FEAT-001-user-auth.md
│   │   └── FEAT-002-dashboard.md
│   └── backlog/
│       └── FEAT-003-analytics.md
└── roadmap.config.js
```

## 🎨 Customization

### Themes and Branding

```javascript
// asd.config.js
module.exports = {
  // Custom branding
  appName: 'Product Specifications',
  appIcon: '📋',

  // UI customization
  theme: {
    primaryColor: 'brightBlue',
    accentColor: 'brightGreen',
    backgroundColor: 'bgBlack',
  },
};
```

### Custom Commands

```bash
# Start with custom branding
asd --app-name "Product Specs" --app-icon "📋"
```

## 🔗 Integration Examples

### GitHub Actions

```yaml
name: Spec Validation
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install ASD
        run: npm install -g agentic-spec-development
      - name: Validate specs
        run: asd doctor
```

### VS Code Integration

```json
{
  "tasks": [
    {
      "label": "Open ASD",
      "type": "shell",
      "command": "asd",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": true,
        "panel": "new"
      }
    }
  ]
}
```

## 🚀 AI Workflow Best Practices

### Agent Workflow Patterns

1. **Start with AI Task Discovery**
   ```bash
   # Always check status first
   asd workflow dashboard
   
   # Get AI-recommended next task
   asd next --agent software-architect
   
   # Validate assignment before starting
   asd validate-assignment FEAT-018 TASK-001 --agent software-architect
   ```

2. **Context-Driven Development**
   ```bash
   # Assign with full context preparation
   asd assign FEAT-018 TASK-001
   
   # Work with context awareness
   asd context FEAT-018 TASK-001
   
   # Complete with handoff preparation
   asd complete FEAT-018 TASK-001
   ```

3. **Quality Gates and Validation**
   ```bash
   # Validate before handoff
   asd validate-assignment FEAT-019 TASK-001 --agent cli-specialist
   
   # Check handoff readiness
   asd workflow handoffs
   
   # Ensure clean handoffs
   asd complete FEAT-019 TASK-001 --validate-handoff
   ```

### Specification Organization

- **AI-Enhanced Metadata**: Include agent assignments, context references, handoff notes
- **Workflow Automation Tags**: Use `**Agent:**`, `**Handoff Ready:**`, `**Context:**` markers
- **Phase Organization**: Group specifications by development phases (PHASE-1A, PHASE-1B, etc.)
- **Context Linking**: Reference context files for complex handoffs

### Multi-Agent Collaboration

1. **Specialized Agent Roles**
   - `software-architect`: High-level design, system architecture
   - `cli-specialist`: Terminal interfaces, user experience
   - `testing-specialist`: Quality assurance, validation systems
   - `documentation-specialist`: User guides, API documentation

2. **Smart Handoff Patterns**
   ```bash
   # Architecture → Implementation
   architect: asd complete SPEC-001 TASK-001
   # → Triggers automatic handoff to cli-specialist
   
   # Implementation → Testing
   cli: asd complete SPEC-001 TASK-002
   # → Triggers automatic handoff to testing-specialist
   
   # Testing → Documentation
   testing: asd complete SPEC-001 TASK-003
   # → Triggers automatic handoff to documentation-specialist
   ```

3. **Context Preservation**
   - Always use `asd research` to capture findings for next agent
   - Include implementation artifacts in context files
   - Document architectural decisions for implementation agents
   - Provide test criteria for testing specialists

### Self-Managing Development

- **Dog Food Principle**: Use ASD to manage ASD development
- **Continuous Workflow**: Check `asd workflow status` regularly
- **Automated Handoffs**: Let ASD determine next agent assignments
- **Quality-First**: Use validation gates to prevent broken handoffs

## 🛠️ Troubleshooting AI Workflows

### Common Workflow Issues

**No tasks found for agent**

```bash
# Check available tasks
asd tasks --agent software-architect

# Check workflow status
asd workflow status

# Validate agent configuration
asd config --agents

# Check if tasks are blocked or assigned
asd tasks --show-dependencies
```

**Agent assignment validation fails**

```bash
# Check agent capabilities
asd validate-assignment FEAT-018 TASK-001 --agent cli-specialist --verbose

# Verify task requirements
asd context FEAT-018 TASK-001

# Check task dependencies
asd tasks FEAT-018 TASK-001 --show-dependencies
```

**Context injection not working**

```bash
# Verify context system
asd context --validate

# Check context files
asd context FEAT-018 TASK-001

# Regenerate context
asd assign FEAT-018 TASK-001 --force-context-update
```

**Handoffs not triggering**

```bash
# Check handoff readiness
asd workflow handoffs

# Validate handoff configuration
asd config --workflow

# Force handoff validation
asd complete FEAT-018 TASK-001 --validate-handoff
```

### System Setup Issues

**ASD workflow commands not working**

```bash
# Check installation and linking
asd doctor

# Verify Node.js version (>= 16.0.0)
node --version

# Re-link global installation
npm link
```

**Configuration not loading**

```bash
# Check configuration discovery
asd config --verbose

# Verify configuration file syntax
node -c asd.config.js

# Use explicit config path
asd --config ./asd.config.js workflow dashboard
```

### Performance Tips

- Keep specification files under 1MB for best performance
- Use `.asdignore` for large directories (coming soon)
- Limit deep directory nesting
- Regular cleanup of completed specifications

### Debug Mode

Enable debug output for troubleshooting:

```bash
asd --debug
```

This provides:

- Terminal size detection details
- Layout calculations
- Configuration loading steps
- File system operations
- Memory usage information

## 🚧 Development Status

**Current Status**: AI Workflow Automation Platform (v0.1.0-alpha)

- ✅ **DOG FOOD MILESTONE ACHIEVED**: ASD manages its own development using AI workflows
- ✅ **Core workflow automation**: Agent coordination, task routing, context injection
- ✅ **Advanced CLI commands**: 20+ workflow management commands operational
- ✅ **Self-managing development**: Context injection, handoffs, quality gates working
- 🔄 **In active development**: Advanced agent features, workflow optimizations
- ❌ **Not yet published to npm**: Install from source only
- ❌ **API may change**: Workflow interfaces stabilizing but not frozen

### Key Achievements

- **Self-Managing Development**: ASD successfully uses itself for development coordination
- **AI Agent Workflows**: Multi-agent task assignment and handoff automation
- **Context Intelligence**: Automatic context injection for seamless agent transitions
- **Quality Automation**: Validation gates and assignment verification

### Roadmap to v1.0.0

- [ ] Advanced agent intelligence and learning capabilities
- [ ] Workflow optimization and performance improvements
- [ ] Enterprise-grade security and multi-user support
- [ ] Plugin architecture for custom agent types
- [ ] Advanced analytics and workflow insights
- [ ] Stable workflow API freeze for programmatic usage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and [Development Setup](DEVELOPMENT.md) for details.

### Quick Development Setup

```bash
git clone https://github.com/livebydesign2/agentic-spec-development.git
cd agentic-spec-development
npm install

# Link for global usage (optional)
npm link

# Test your setup
node bin/asd --help
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration # Integration tests
npm run test:coverage # Coverage report
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by modern AI-first development workflows
- Built with [terminal-kit](https://github.com/cronvel/terminal-kit) for beautiful terminal UIs
- Configuration powered by [cosmiconfig](https://github.com/davidtheclark/cosmiconfig)
- Originally developed for the [Campfire](https://github.com/livebydesign2/campfire) project

## 📞 Support

- 📚 **Documentation**: [Full docs](docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/livebydesign2/agentic-spec-development/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/livebydesign2/agentic-spec-development/discussions)
- 📧 **Email**: [support@agentic-spec-development.dev](mailto:support@agentic-spec-development.dev)

---

> **"Revolutionize development with AI agent workflow automation - where teams manage themselves"**

🚀 **Ready to try self-managing development?** Start with `asd workflow dashboard` and experience AI-coordinated workflows.

⭐ If you find ASD's workflow automation valuable, please consider giving it a star on GitHub!
