# ASD Project - AI Agent Workflow System

## 🎯 PROJECT CONTEXT

**ASD (Agentic Spec Development)** is a Node.js CLI tool that has achieved its **DOG FOOD MILESTONE** - it now manages its own development using AI agent workflow automation.

- **Current Phase**: PHASE-1B (46 hours remaining)
- **Status**: Self-managing development operational
- **Key Achievement**: Context injection, task routing, and workflow automation working

## 🚀 ESSENTIAL ASD COMMANDS FOR AGENTS

### **Project Status & Navigation**

```bash
# Get project overview
asd workflow dashboard           # Full project status
asd workflow status             # Current assignments
asd tasks                       # Available tasks

# Check progress
asd workflow progress           # PHASE progress tracking
asd workflow handoffs          # Ready handoffs
```

### **Task Management Workflow**

```bash
# 1. Get next recommended task
asd next --agent software-architect
asd next --agent cli-specialist
asd next --agent testing-specialist

# 2. Assign task to yourself
asd assign FEAT-018 TASK-001

# 3. Complete task when done
asd complete FEAT-018 TASK-001

# 4. Validate assignment (optional)
asd validate-assignment FEAT-018 TASK-001 --agent cli-specialist
```

### **Research & Documentation**

```bash
# Capture research findings
asd research FEAT-019

# Manage temporary documentation
asd report
```

## 📋 CURRENT PROJECT STATE (PHASE-1B)

### **Ready Tasks (3 tasks, 46 hours)**

1. **FEAT-018**: Advanced CLI Commands (P1) - cli-specialist - 20 hours
2. **FEAT-019**: Validation Manager System (P1) - software-architect - 12 hours
3. **FEAT-020**: Multi-format Data Support (P1) - software-architect - 8 hours
4. **FEAT-021**: Project Templates (P1) - cli-specialist - 6 hours

### **Completed (PHASE-1A)**

- ✅ FEAT-012: Context Injection System
- ✅ FEAT-013: Task Router System
- ✅ FEAT-014: Workflow State Manager

### **File Structure**

- **Active specs**: `docs/specs/active/`
- **Backlog**: `docs/specs/backlog/`
- **Completed**: `docs/specs/done/`
- **Agent definitions**: `.claude/agents/`

## 🔄 AGENT WORKFLOW PATTERNS

### **Starting Development Session**

1. Check status: `asd workflow dashboard`
2. Get next task: `asd next --agent [your-type]`
3. Assign task: `asd assign [SPEC-ID] [TASK-ID]`
4. Do the work
5. Complete task: `asd complete [SPEC-ID] [TASK-ID]`
6. Check handoffs: `asd workflow handoffs`

### **Cross-Agent Coordination**

- Use `asd workflow assignments` to see who's working on what
- Check `asd workflow handoffs` for ready transitions
- Use `asd research [SPEC-ID]` to document findings for other agents

## 🎯 AGENT SPECIALIZATIONS

- **software-architect**: System design, architecture decisions
- **cli-specialist**: TUI development, CLI commands, UX
- **testing-specialist**: Test suites, quality assurance
- **documentation-specialist**: Documentation, README files
- **code-quality-specialist**: ESLint, code standards
- **git-specialist**: Git workflow, commits, branches

## 🚨 IMPORTANT WORKFLOW RULES

### **Self-Managing Development**

- ASD manages its own development - use ASD commands to coordinate work
- Always check `asd workflow status` before starting
- Mark tasks complete to trigger handoffs
- Use the task assignment system for coordination

### **Quality Standards**

- Run `npm run lint` and `npm run validate` before completing tasks
- Use `asd validate-assignment` to ensure proper task routing
- Document research with `asd research` for context sharing

## 💡 DOG FOOD MILESTONE SUCCESS

**Why This Matters**: ASD successfully uses itself to manage development, proving:

- AI-first workflow automation works
- Context injection enables smart task routing
- Agent specialization improves development efficiency
- Self-managing systems reduce coordination overhead

## 🔧 QUICK TROUBLESHOOTING

**Commands not working?**

- Ensure you're in the ASD project directory
- Run `npm link` to make `asd` globally available
- Check `asd doctor` for setup issues

**No tasks found?**

- Check `asd workflow status` for current assignments
- Try different agent types with `asd next --agent [type]`
- Check if tasks are blocked or need different agents
