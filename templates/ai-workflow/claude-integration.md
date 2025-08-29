# Claude Integration for Agentic Spec Development

## 🤖 ASD CLI Integration with Claude Code

This document describes how to integrate the Agentic Spec Development (ASD) CLI tool with Claude Code for AI-first development workflows.

---

## 📋 CLAUDE.md Integration

Add this section to your project's `CLAUDE.md` file to enable ASD-aware development:

### **Agentic Spec Development (ASD) Workflow**

This project uses the Agentic Spec Development CLI for AI-first specification and feature management.

#### **Quick Commands**

```bash
# View current specifications
asd

# Check specification status
asd status --spec SPEC-001

# Create new specification
asd create spec --title "Feature Name" --priority P1

# Move specification through lifecycle
asd move --spec SPEC-001 --to active
```

#### **Directory Structure**

```
project/
├── docs/specs/           # Specification documents
│   ├── active/           # Currently being developed
│   ├── backlog/          # Planned for future
│   ├── done/             # Completed specifications
│   └── template/         # Specification templates
├── .asdrc.json          # ASD configuration
└── docs/ai-context/     # AI agent context files
    ├── agent-workflow.md    # Agent coordination patterns
    ├── current-state.md     # System state context
    └── implementation-rules.md # Code standards
```

#### **Agent Workflow Integration**

When working on specifications, always:

1. **Check ASD Status**: Run `asd status` to see active specifications
2. **Use Subagents**: Call appropriate subagents for different phases:

   - `Product-manager`: Specification lifecycle management
   - `Software-architect`: System design and architecture
   - `Code-quality-specialist`: Implementation and testing
   - `UI-developer`: User interface and documentation

3. **Follow Task Discipline**: Work on one task within one specification, then hand off cleanly

4. **Validate Before Commit**: Each task includes validation requirements that must be completed

#### **Claude Code Best Practices**

- **Always check ASD first**: Before starting any development work, check what specifications exist and their current status
- **Use specification templates**: Copy from appropriate template when creating new specifications
- **Maintain task focus**: Stick to assigned task within specification - don't scope creep
- **Clean handoffs**: Mark tasks complete and update next available task for handoff

---

## 🔧 Project Configuration

### **Basic ASD Configuration (.asdrc.json)**

```json
{
  "featuresPath": "./docs/specs",
  "templatePath": "./templates",
  "supportedTypes": ["SPEC", "BUG", "SPIKE", "MAINT", "RELEASE"],
  "statusFolders": ["backlog", "active", "done"],
  "priorities": ["P0", "P1", "P2", "P3"],
  "aiWorkflow": {
    "enabled": true,
    "agentCoordination": true,
    "productManager": {
      "enabled": true,
      "autoLifecycle": true
    }
  },
  "app": {
    "name": "Your Project Specs",
    "version": "1.0.0",
    "icon": "🚀"
  }
}
```

### **Advanced AI Workflow Configuration**

```json
{
  "featuresPath": "./docs/specs",
  "templatePath": "./templates",
  "supportedTypes": ["SPEC", "BUG", "SPIKE", "MAINT", "RELEASE"],
  "statusFolders": ["backlog", "active", "done"],
  "priorities": ["P0", "P1", "P2", "P3"],
  "aiWorkflow": {
    "enabled": true,
    "agentCoordination": true,
    "contextManagement": {
      "criticalDocs": [
        "docs/ai-context/implementation-rules.md",
        "docs/ai-context/agent-workflow.md"
      ],
      "taskSpecificDocs": true,
      "referenceDocs": [
        "docs/ai-context/current-state.md",
        "docs/ai-context/decision-framework.md"
      ]
    },
    "productManager": {
      "enabled": true,
      "autoLifecycle": true,
      "strategicRoadmap": "docs/strategic/roadmap.md",
      "numberingSystem": "docs/specs/numbering-system.md"
    },
    "qualityGates": {
      "preCommitValidation": true,
      "taskHandoffValidation": true,
      "specificationCompletionValidation": true
    }
  },
  "app": {
    "name": "AI-First Development Platform",
    "version": "2.0.0",
    "icon": "🤖"
  }
}
```

---

## 🎯 Agent Coordination Patterns

### **Product Manager Integration**

```javascript
// Before starting any specification work
Task(
  (subagent_type = 'Product-manager'),
  (description = 'Specification validation'),
  (prompt =
    'Validate SPEC-005 is ready for development. Check numbering, priority, dependencies, and move to active state if ready.')
);

// After completing specification work
Task(
  (subagent_type = 'Product-manager'),
  (description = 'Specification completion'),
  (prompt =
    'SPEC-005 implementation complete. Review work, validate criteria, move to done, and update roadmap.')
);
```

### **Context-Aware Development**

```javascript
// Software architecture with ASD context
Task(
  (subagent_type = 'Software-architect'),
  (description = 'System design'),
  (prompt =
    "Design the authentication system per SPEC-003. Read current system state and focus on TASK-001 only. Use the specification's technical requirements and context files.")
);

// Code implementation with quality gates
Task(
  (subagent_type = 'Code-quality-specialist'),
  (description = 'Feature implementation'),
  (prompt =
    "Implement TASK-002 from SPEC-003. Follow the specification's validation requirements. Test thoroughly and update task status for clean handoff.")
);
```

---

## 📊 Quality Assurance Integration

### **Pre-Development Validation**

```bash
# Verify ASD setup is correct
asd doctor

# Check specification status before starting
asd status

# Validate configuration
asd config --validate
```

### **During Development Validation**

```bash
# Check current task status
asd status --spec SPEC-001

# Validate specification completeness
asd lint --spec SPEC-001

# Check for specification consistency
asd validate --all
```

### **Post-Development Validation**

```bash
# Mark specification complete
asd complete --spec SPEC-001

# Generate completion report
asd report --spec SPEC-001

# Update strategic roadmap
asd roadmap --update
```

---

## 🔄 Workflow Examples

### **Creating New Feature Specification**

```bash
# 1. Product Manager creates specification
asd create spec --title "User Profile Management" --priority P1 --type SPEC

# 2. ASD automatically numbers it (e.g., SPEC-007) and places in backlog/

# 3. Developer starts work - Product Manager moves to active
asd move --spec SPEC-007 --to active

# 4. Agents work through tasks using specification template

# 5. Upon completion, Product Manager moves to done
asd move --spec SPEC-007 --to done
```

### **Agent Task Coordination**

```markdown
# In SPEC-007 document:

**TASK-001** 🤖 **Database Design** ⏳ **← READY FOR PICKUP** | Agent: Software-Architect

- [ ] Design user profile schema
- [ ] Create database migration
- [ ] Document data relationships
- **Context**: docs/ai-context/implementation-rules.md, docs/database/schema-patterns.md

**TASK-002** 🤖 **API Implementation** ⏸️ **← BLOCKED** | Agent: Code-Quality-Specialist

- [ ] Implement profile CRUD operations
- [ ] Add input validation
- [ ] Create API tests
- **Dependencies**: TASK-001 must be complete
```

---

## 📈 Success Metrics

### **Development Velocity**

- Specifications completed per sprint
- Average task completion time
- Agent handoff efficiency
- Specification quality score

### **Code Quality**

- Test coverage per specification
- Bug discovery during development
- Specification requirement coverage
- Documentation completeness

### **Team Coordination**

- Clean handoffs between agents
- Context management effectiveness
- Reduced development conflicts
- Improved specification clarity

---

_This integration enables seamless AI-first development using Claude Code with the Agentic Spec Development workflow._
