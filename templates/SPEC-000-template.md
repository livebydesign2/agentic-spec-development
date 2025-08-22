# [Specification Name]

## **🎯 Quick Start** *(30 seconds)*

**Priority:** P1

**What**: [One-line description of what this specification defines]  
**Status**: [Backlog/Active/Done] | **Owner**: [AI Agent/Human]  

### **🚀 AGENT PICKUP GUIDE**
**➡️ Next Available Task**: **[TASK-XXX]** - [Brief task description]  
**📋 Your Job**: Work on TASK-XXX only, then update docs and hand off  
**🚦 Dependencies**: [None, or "Wait for TASK-YYY to complete first"]

### **Required Reading**
- docs/ai-context/agent-workflow.md
- docs/ai-context/implementation-rules.md
- docs/development/testing-workflow.md ← **MANDATORY: Testing workflow for AI agents**

### **🚦 Current State** *(AGENTS: Update this when you complete YOUR task)*
- **Next Available Task**: [TASK-XXX - what task is ready to be picked up]
- **Current Task Status**: [TASK being worked on, or "None - ready for pickup"]  
- **Overall Progress**: [X of Y tasks complete]
- **Blockers**: [Any blockers preventing next task, or "None"]
- **Last Updated**: [YYYY-MM-DD] by [Agent name] after completing [TASK-XXX]

---

## **🤖 Agent Workflow**
See: `docs/ai-context/agent-workflow.md`

**⚠️ IMPORTANT: Each agent works on ONE TASK, then hands off to next agent**

**When picking up a task (e.g., TASK-001):**

1. **🎯 Product Check** *(Product-manager subagent)*: Ensure spec exists, numbering is correct, priority is set, and spec is in proper lifecycle state (backlog → active)
2. **📊 Check Status**: What's the next available task? (look for ⏳ status)  
3. **🔍 Gather Context**: Read the context files below for this specific task
4. **📋 Plan Work**: Use `todowrite` if this task has >3 subtasks  
5. **⚡ Execute**: Complete ONLY your assigned task AND check off [x] subtasks

Closure: For every task, complete the Task Closure Checklist inside the task (Validate + User Visual Validation, Update & Commit with [x], Product Handoff).

### **📚 Context Priority Levels** *(Prevent context window overload)*

#### **🔥 CRITICAL - Always Read First** *(Required for any task)*
- `docs/ai-context/implementation-rules.md` ← **THE CODE STANDARDS & PATTERNS**
- **Implementation Context Section** *(This document, detailed requirements)* ← **Complete technical guide**

#### **📋 TASK-SPECIFIC - Read for Your Task** *(Only what you're working on)*
**TASK-001 (Foundation/Setup)**:
- `docs/ai-context/current-state.md` ← **Current system state**
- `docs/development/project-setup.md` ← **If setting up new components**

**TASK-002 (Core Implementation)**:
- `[Specific files and line numbers for this task]` ← **Main files to modify**
- `[Related component files]` ← **Dependencies**

**TASK-003 (Integration/Testing)**:
- `docs/development/testing-patterns.md` ← **Testing approach**
- `[Test files]` ← **Integration testing**

#### **📖 REFERENCE - Read When Stuck** *(Background/debugging only)*
- `docs/ai-context/current-state.md` ← **System context** (if not task-specific)
- `docs/ai-context/decision-framework.md` ← **Decision guidelines**
- `docs/development/development-guide.md` ← **Development patterns** (if debugging setup issues)

### **💡 Agent Tips**
- **Context Management**: Start with 🔥 CRITICAL docs only (~450 lines). Only read 📋 TASK-SPECIFIC for your task. Avoid 📖 REFERENCE unless stuck.
- **Product-manager Integration**: 
  - **Step 1**: Call Product-manager subagent BEFORE starting any new specification work
  - **Step 8**: Call Product-manager subagent AFTER completing all specification tasks
  - Let Product-manager handle: specs, numbering, priorities, lifecycle states, roadmap updates
- **Pick ONE TASK**: Look for ⏳ status, work on that task only
- **Get current date**: Run `date +%Y-%m-%d` before status updates  
- **MANDATORY**: Check off subtasks `- [x]` as you complete them
- **BEFORE COMMITTING**: Mark your task ✅, update "Next Available Task", hand off cleanly
- **Multi-step work**: Use `todowrite` if YOUR task has >3 subtasks
- **Scope discipline**: Don't work on other tasks - finish yours and hand off

### **🎯 When to Call Product-manager Subagent**

**STEP 1 - Before Implementation (🎯 Product Check):**
- **New Specifications**: Creating specs, assigning spec numbers, setting priorities
- **Existing Specifications**: Verify spec is properly documented and in active/ folder
- **Priority Questions**: When unsure about spec priority or strategic alignment
- **Lifecycle Moves**: Moving specs from backlog/ to active/ folder

**STEP 8 - After Implementation (🚀 Product Handoff):**
- **Specification Completion**: Moving completed specs from active/ to done/ folder
- **Roadmap Updates**: Updating strategic roadmap with completed specifications
- **Success Metrics**: Recording completion and impact assessment
- **Next Priorities**: Identifying what should be worked on next

### **🐛 Found Issues Outside Your Task Scope?**

**If you discover bugs or issues that are NOT part of your current task:**

1. **🛑 DON'T FIX IT NOW** - Stay focused on your assigned task
2. **📝 CREATE BUG TICKET**: Copy `templates/BUG-000-template.md`
3. **📂 SAVE TO BACKLOG**: Place the new bug file in `docs/specs/backlog/`
4. **🏷️ NAME IT**: Use format `BUG-XXX-brief-description.md`
5. **✍️ DOCUMENT IT**: Fill out the bug template with:
   - Clear reproduction steps
   - What you expected vs what you saw
   - Which files/areas are affected
   - Priority level (your best guess)
6. **📋 ADD TO YOUR HANDOFF**: Mention the bug ticket in your task completion notes
7. **🔄 CONTINUE YOUR TASK**: Get back to your assigned work

---

## **📋 Work Definition** *(What needs to be built)*

## **Description**
[2–3 lines summarizing user value and scope]

### **Problem Statement**
[2-3 sentences: What specific problem does this solve? Why does it matter?]

### **Solution Approach**
[2-3 sentences: How will we solve it? What's the core strategy?]

### **Success Criteria**
- [ ] [Specific, measurable outcome 1]
- [ ] [Specific, measurable outcome 2]
- [ ] [Specific, measurable outcome 3]

---

## **🏗️ Implementation Plan**

### **Technical Approach**
[Brief description of the technical strategy - architecture/patterns to use]

### **Implementation Tasks** *(Each task = one agent handoff)*

**TASK-001** 🤖 **[Task Name]** ⏳ **← READY FOR PICKUP** | Agent: [Agent-Type]
- [ ] [Specific subtask 1]
- [ ] [Specific subtask 2]
- [ ] [Specific subtask 3]
- [ ] Validate (tests, lint, functionality) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify Product-manager subagent to move lifecycle and update roadmap
- **Files**: [Key files to create/modify]
- **Agent Instructions**: [Specific guidance for this task]

**TASK-002** 🤖 **[Task Name]** ⏸️ **← BLOCKED (waiting for TASK-001)** | Agent: [Agent-Type]
- [ ] [Specific subtask 1]
- [ ] [Specific subtask 2]
- [ ] Validate (tests, lint, functionality) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify Product-manager subagent to move lifecycle and update roadmap
- **Dependencies**: TASK-001 must be complete
- **Files**: [Key files to create/modify]

**TASK-003** 🤖 **[Task Name]** ⏸️ **← BLOCKED (waiting for TASK-002)** | Agent: [Agent-Type]
- [ ] [Specific subtask 1]
- [ ] [Specific subtask 2]
- [ ] Create comprehensive tests for functionality
- [ ] Validate (tests, lint, functionality) per "Validation Requirements"
- [ ] Update & Commit: mark task [x], update "Next Available Task" + handoff notes in this file, commit
- [ ] Product Handoff: notify Product-manager subagent to move lifecycle and update roadmap
- **Dependencies**: TASK-002 must be complete
- **Files**: [Key files to create/modify], test files
- **Agent Instructions**: Create comprehensive tests for the implemented functionality

**Legend**: ⏳ Ready for pickup | 🔄 In progress | ✅ Complete | ⏸️ Blocked

---

## **✅ Validation Requirements**

### **📝 Documentation Checklist** *(REQUIRED before committing YOUR task)*
- [ ] **Your Task Status**: Mark your task ✅ and update all subtasks to `- [x]`
- [ ] **Current State**: Update "Next Available Task" to show what task is ready next
- [ ] **Success Criteria**: Check off any criteria your task completed
- [ ] **Handoff**: Clear what the next agent should pick up
- [ ] **Issues Found**: If you discovered bugs/issues outside your scope, confirm you created bug tickets in backlog folder and mentioned them in your completion notes

### **🧪 Testing Checklist** *(Follow this exact order)*

**DURING DEVELOPMENT** *(Test as you build each piece)*
- [ ] **Unit Logic**: Test individual functions/components work in isolation
- [ ] **Integration**: Test components work together correctly
- [ ] **Error Handling**: Test error scenarios and edge cases

**BEFORE COMMITTING** *(Required validation sequence)*
- [ ] **Tests**: Run test suite - ensure all tests pass
- [ ] **Linting**: Run linter - fix all style issues
- [ ] **Functionality**: Manual test of the feature works as expected
- [ ] **Integration**: Test your feature works with existing functionality
- [ ] **Documentation**: Update any relevant documentation

---

## **📊 Progress Tracking** *(AGENTS: Add entry when you complete YOUR task)*

### **✅ Completed Tasks** *(Add entry when you finish your task)*
- ✅ **[YYYY-MM-DD]** - **TASK-XXX** completed - *Agent: [name]* - Next: TASK-YYY ready
- ✅ **[YYYY-MM-DD]** - **TASK-XXX** completed - *Agent: [name]* - Next: TASK-YYY ready

### **🚨 Task Blockers** *(Preventing next task pickup)*
- 🚨 **TASK-XXX blocked**: [What's needed to unblock] - *Added [YYYY-MM-DD]*

### **➡️ Handoff Status** *(What's ready for next agent)*
- **Ready Now**: TASK-XXX (no dependencies)
- **Waiting**: TASK-YYY (needs TASK-XXX first)
- **Future**: TASK-ZZZ (needs TASK-YYY first)

---

## **🔗 Technical References**

### **Key Files**
- **Main Implementation**: `[key file paths]`
- **Configuration**: `[config files]`
- **Tests**: `[test file paths]`

### **Dependencies**
- **Requires**: [Specifications this depends on]
- **Enables**: [Specifications this unblocks]

---

<details>
<summary><strong>📖 Detailed Requirements & Design</strong> <em>(Expand when needed)</em></summary>

## **Detailed Requirements**

### **REQ-001: [Category] - [Requirement Name]**
**As a** [user type]  
**I want** [capability]  
**So that** [business value]

**Acceptance Criteria**:
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

### **REQ-002: [Category] - [Requirement Name]**
**As a** [user type]  
**I want** [capability]  
**So that** [business value]

**Acceptance Criteria**:
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]

## **Technical Design Details**

### **Architecture Overview**
```
[Simple diagram showing data/component flow]
```

### **Key Technical Principles**
1. **[Principle 1]**: [Brief description - why it matters]
2. **[Principle 2]**: [Brief description - why it matters]
3. **[Principle 3]**: [Brief description - why it matters]

### **Implementation Notes**
- [Technical pattern or approach to use]
- [Key considerations or gotchas]
- [Dependencies or prerequisites]

## **Testing Strategy Details**

### **Unit Tests**
- [ ] Core logic functions work correctly
- [ ] Edge cases and error conditions handled
- [ ] Input validation works as expected

### **Integration Tests**
- [ ] Components work together correctly
- [ ] Data flows through system properly
- [ ] External dependencies handled correctly

### **User Acceptance Tests**
- [ ] Feature meets all acceptance criteria
- [ ] User workflows complete successfully
- [ ] Performance meets requirements

</details>

---

## **💡 Implementation Notes** *(Update as you learn)*

### **Key Decisions**
- [Important architectural or design decision made]
- [Alternative considered and why this approach was chosen]

### **Gotchas & Learnings**
- [Something tricky that others should know about]
- [Pattern that worked well]
- [Thing to avoid]

### **Future Improvements**
- [Enhancement idea for later]
- [Technical debt to address]