# Claude AI Documentation for ASD

This directory contains comprehensive documentation for Claude AI to effectively use the ASD (Agentic Spec Development) system.

## Documentation Files

### 📖 [ASD_USAGE_GUIDE.md](./ASD_USAGE_GUIDE.md)
**Main comprehensive guide covering:**
- System overview and current project state
- Complete command reference with examples
- Workflow guidance for task management
- Best practices and troubleshooting
- Agent types and specializations
- Project structure and priorities

### 🎯 [COMMAND_REFERENCE.md](./COMMAND_REFERENCE.md)
**Quick reference for all ASD commands:**
- Essential commands for daily use
- Complete command list with options
- Common patterns and filters
- Status values and agent types
- Example workflows for common tasks

### 🔄 [WORKFLOW_SCENARIOS.md](./WORKFLOW_SCENARIOS.md)
**Detailed workflow scenarios covering:**
- Starting fresh development sessions
- Continuing previous work
- Handling handoffs between agents
- Cross-agent collaboration patterns
- Blocked task resolution
- Research and investigation workflows
- Quality assurance integration
- Error recovery procedures

## Quick Start for Claude

### 1. First Steps - Always Do This
```bash
# Get project overview
node bin/asd workflow dashboard

# Check what's ready for your agent type
node bin/asd next --agent software-architect
```

### 2. Standard Work Pattern
```bash
# Validate assignment
node bin/asd validate-assignment FEAT-XXX TASK-XXX --agent your-agent-type

# Assign to yourself
node bin/asd assign FEAT-XXX TASK-XXX

# Do the development work...

# Complete with automatic handoff
node bin/asd workflow complete-task FEAT-XXX TASK-XXX
```

### 3. Common Status Commands
```bash
node bin/asd workflow status        # Current assignments
node bin/asd workflow progress      # Project progress
node bin/asd workflow handoffs      # Available handoffs
node bin/asd tasks --status ready   # Available tasks
```

## Current Project Context

### Project Status
- **DOG FOOD MILESTONE**: ✅ ACHIEVED - ASD manages its own development
- **Phase**: PHASE-1A Complete, PHASE-1B Active
- **Active Specs**: 1 (with transitions happening)
- **Completed Specs**: 4
- **Ready Tasks**: 3 available for immediate development
- **Overall Progress**: 24% complete

### Immediate Priorities
1. **FEAT-012 TASK-001**: Core Context Storage & File Structure (P0 Critical)
2. **FEAT-018 TASK-001**: Core CLI Command Framework (P1 High)
3. **FEAT-019 TASK-001**: Core Validation Framework (P1 High)

### Agent Types Available
- `software-architect`: System design and technical architecture
- `cli-specialist`: Command-line interface development
- `backend-developer`: Server-side logic and APIs
- `ui-developer`: User interfaces and frontend
- `devops-engineer`: Deployment and infrastructure
- `qa-engineer`: Testing and quality assurance
- `product-manager`: Specifications and roadmap management

## Key System Features

### 1. Automated Workflow Management
- Task assignment and validation
- Automatic handoffs between agents
- Progress tracking and metrics
- Dependency management

### 2. Agent Specialization
- Role-based task routing
- Skill-specific assignments
- Context injection for agents
- Validation of agent capabilities

### 3. Systematic Task Management
- Priority-based task ordering
- Status tracking and updates
- Blocker identification and resolution
- Research and documentation capture

### 4. Self-Managing Development
- ASD manages its own development
- Specifications drive the process
- Automated progress reporting
- Quality assurance integration

## How to Use This Documentation

1. **Start with ASD_USAGE_GUIDE.md** for comprehensive understanding
2. **Use COMMAND_REFERENCE.md** for quick command lookup
3. **Refer to WORKFLOW_SCENARIOS.md** for specific situations
4. **Always begin sessions by checking project status**
5. **Follow agent specialization guidelines**
6. **Use ASD commands for all task management**

## Integration with Claude Code

This documentation is designed for use with Claude Code. You can:
- Run ASD commands through the Bash tool
- Edit specifications in `docs/specs/` using file editing tools
- Follow systematic development workflows
- Maintain project state through ASD commands
- Document progress and research findings

## Project Structure

```
/Users/tylerbarnard/Developer/Apps/asd/
├── docs/specs/          # Specifications
│   ├── active/          # Currently active
│   ├── backlog/         # Ready for development
│   ├── done/            # Completed
│   └── template/        # Templates
├── docs/context/        # Agent context files
├── docs/agents/         # Agent definitions
├── docs/roadmap/        # Strategic documentation
└── .claude/             # This documentation
```

## Support and Troubleshooting

### Health Check
```bash
node bin/asd doctor
```

### Workflow Validation
```bash
node bin/asd workflow validate
```

### Get Help
```bash
node bin/asd --help
node bin/asd <command> --help
```

Remember: You are working within a live, self-managing development system where ASD coordinates its own evolution. Your work contributes to both the project goals and validates ASD's capabilities as an AI-first development tool.