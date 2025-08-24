# AI Agent Workflow for ASD Projects

## 🤖 Agent Coordination Pattern

### **Core Principle**: One Agent, One Task, Clean Handoff

Each AI agent works on **exactly one task** within a specification, then cleanly hands off to the next agent. This prevents context conflicts and ensures clear accountability.

---

## 🔄 Standard Agent Workflow

### **1. Task Pickup**

```bash
# Agent picks up work
1. Read specification document (SPEC-XXX-name.md)
2. Find next available task (marked with ⏳)
3. Read context files specific to that task
4. Use TodoWrite for complex tasks (>3 subtasks)
5. Execute assigned task only
```

### **2. Task Execution**

```bash
# During development
1. Work on assigned subtasks only
2. Check off completed subtasks: - [x]
3. Test as you build (unit → integration → manual)
4. Document any issues found outside scope as bug tickets
5. Keep scope discipline - don't fix unrelated issues
```

### **3. Task Completion**

```bash
# Before committing
1. Complete validation checklist (tests, lint, functionality)
2. Mark task as ✅ complete
3. Update "Next Available Task" for handoff
4. Commit with proper message including task reference
5. Notify Product-manager if this completes the specification
```

---

## 🎯 Agent Types & Responsibilities

### **Product-Manager**

- **When**: Before any implementation (Step 1) and after completion (Step 8)
- **Role**: Specification creation, numbering, lifecycle management, roadmap updates
- **Handoff**: Creates properly numbered specifications, moves between backlog/active/done

### **Software-Architect**

- **When**: Foundation and design tasks
- **Role**: System design, architecture decisions, technical strategy
- **Handoff**: Technical specifications and architectural patterns

### **Code-Quality-Specialist**

- **When**: Implementation and testing tasks
- **Role**: Code implementation, testing, quality assurance
- **Handoff**: Working, tested code with proper documentation

### **UI-Developer**

- **When**: User interface and documentation tasks
- **Role**: User experience, visual design, user-facing documentation
- **Handoff**: Polished interfaces and clear documentation

### **Git-Specialist**

- **When**: Repository management and deployment
- **Role**: Version control, CI/CD, deployment processes
- **Handoff**: Deployed code and proper git history

---

## 📋 Context Management Strategy

### **🔥 CRITICAL - Always Read (Required)**

- `docs/ai-context/implementation-rules.md` - Code standards and patterns
- Current specification document - Complete technical requirements

### **📋 TASK-SPECIFIC - Read for Your Task Only**

- Files specific to your assigned task
- Dependencies and related components for your task
- Testing guidance for your implementation area

### **📖 REFERENCE - Read When Stuck**

- Background context and system overview
- Decision frameworks and debugging guides
- Related specifications for context

### **Context Window Management**

Start with CRITICAL docs only (~400-500 lines). Only add TASK-SPECIFIC content for your specific task. Avoid REFERENCE material unless debugging issues.

---

## 🚦 Task Status System

### **Status Indicators**

- ⏳ **Ready for pickup** - Task can be started immediately
- 🔄 **In progress** - Agent is actively working on task
- ✅ **Complete** - Task finished and validated
- ⏸️ **Blocked** - Task waiting for dependencies

### **Task Handoff Protocol**

```markdown
**TASK-001** 🤖 **Foundation Setup** ✅ **← COMPLETE** | Agent: Software-Architect

- [x] Set up project structure
- [x] Configure build system
- [x] Create initial documentation
- **Completed**: 2024-01-15 by Software-Architect
- **Next**: TASK-002 ready for Code-Quality-Specialist

**TASK-002** 🤖 **Core Implementation** ⏳ **← READY FOR PICKUP** | Agent: Code-Quality-Specialist

- [ ] Implement core functionality
- [ ] Add unit tests
- [ ] Integration testing
```

---

## 🔍 Quality Gates

### **Before Starting Task**

- [ ] Specification exists and is properly numbered
- [ ] Task is marked as "ready for pickup" (⏳)
- [ ] Dependencies are complete
- [ ] Context files identified and prioritized

### **During Task Execution**

- [ ] Use TodoWrite for complex tasks
- [ ] Test incrementally (don't save all testing for end)
- [ ] Document issues found outside scope
- [ ] Stay focused on assigned task only

### **Before Task Completion**

- [ ] All subtasks checked off as complete
- [ ] Validation checklist completed (tests, lint, functionality)
- [ ] Task marked as ✅ complete
- [ ] "Next Available Task" updated for handoff
- [ ] Clean commit with task reference

### **After Task Completion**

- [ ] Product-manager notified if specification complete
- [ ] Documentation updated if needed
- [ ] Next agent has clear pickup instructions

---

## 🐛 Issue Management During Development

### **Found Bug/Issue Outside Your Task?**

**DO NOT** fix it immediately. Instead:

1. **Create Bug Ticket**: Use `BUG-XXX-description.md` template
2. **Document Thoroughly**: Reproduction steps, expected vs actual behavior
3. **Save to Backlog**: Place in `docs/specs/backlog/` folder
4. **Note in Handoff**: Mention bug ticket in task completion
5. **Continue Task**: Return focus to your assigned work

### **Bug Ticket Format**

```markdown
# BUG-001: [Brief Description]

**Priority**: [P0-P3]
**Discovered During**: TASK-XXX in SPEC-YYY
**Reported By**: [Agent Name] on [Date]

## Problem

[Clear description of the issue]

## Reproduction Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Files Affected

- [File 1]
- [File 2]
```

---

## 🔄 Specification Lifecycle

### **Lifecycle States**

- **Backlog**: Specification created, not yet started
- **Active**: Specification being actively developed
- **Done**: Specification completed and validated

### **State Transitions**

```
Backlog → Active: Product-manager moves when development starts
Active → Done: Product-manager moves when all tasks complete
Done → Active: Only if major changes needed (rare)
```

### **Agent Responsibilities**

- **All Agents**: Work on tasks within Active specifications
- **Product-manager**: Manages specification lifecycle transitions
- **No Agent**: Should modify specification state directly

---

## 🎯 Success Patterns

### **Effective Agent Behaviors**

- ✅ Read only required context for your task
- ✅ Use TodoWrite for complex task planning
- ✅ Test incrementally during development
- ✅ Document issues found outside scope
- ✅ Complete validation before committing
- ✅ Clear handoff notes for next agent

### **Anti-Patterns to Avoid**

- ❌ Reading all context files upfront (context overload)
- ❌ Working on multiple tasks simultaneously
- ❌ Fixing issues outside assigned task scope
- ❌ Committing without completing validation checklist
- ❌ Unclear handoff - next agent doesn't know what to do

---

## 📊 Workflow Metrics

### **Cycle Time Tracking**

- Task pickup to completion time
- Handoff quality (clear instructions vs confusion)
- Rework frequency (tasks that need to be redone)

### **Quality Indicators**

- Test coverage for implemented features
- Documentation completeness
- Issue discovery rate during development
- Successful handoffs without blocking

### **Team Coordination**

- Clean handoffs between agents
- Minimal context confusion
- Efficient task progression
- Clear specification completion

---

_This workflow enables AI agents to collaborate effectively while maintaining code quality and clear accountability._
