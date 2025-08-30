# Documentation Maintenance Process

**ASD AI Agent Workflow Automation Platform**

This document establishes the process for maintaining accurate, current documentation as ASD continues to evolve.

## Documentation Health Principles

### 1. **Accuracy First**
- All documentation must accurately reflect current system capabilities
- No conflicting information between files
- Examples and code snippets must be tested and functional

### 2. **AI Workflow Focus**
- Emphasize AI agent workflow automation (not basic spec viewing)
- Document agent specialization patterns
- Highlight workflow commands and automation features

### 3. **User Success Oriented**
- Enable successful onboarding within 5 minutes
- Provide clear paths from installation to productivity
- Include troubleshooting for common issues

## Maintenance Responsibilities

### Documentation Specialist Agent
**Primary responsibility** for all documentation accuracy and maintenance.

**Regular Tasks**:
- Review documentation after each feature completion
- Update CLI command documentation when commands change
- Maintain consistency across all documentation files
- Test installation and setup instructions

**Weekly Reviews**:
- Check all examples and code snippets work correctly
- Validate links and references
- Update any outdated version information
- Review user feedback and common questions

### All Agent Types
**Secondary responsibility** to flag documentation issues.

**When completing any task**:
- Note if documentation needs updates for your changes
- Flag outdated information you discover
- Update relevant examples in your specialization area

## Documentation Update Triggers

### Immediate Updates Required
- **New CLI commands** → Update command reference and help text
- **Changed workflow patterns** → Update workflow documentation
- **New agent types** → Update agent specialization guide
- **Breaking changes** → Update all affected documentation

### Weekly Review Items
- Installation instructions accuracy
- Version information consistency
- Link validation
- Example functionality verification

### Monthly Maintenance
- Complete documentation audit (similar to MAINT-006)
- User journey testing
- Competitive analysis and positioning updates
- Archive outdated content

## Documentation File Ownership

### User-Facing Documentation
**Owner**: Documentation Specialist
- `README.md` - Primary project documentation
- `docs/installation.md` - Installation guides
- `docs/commands.md` - CLI command reference
- `docs/examples/` - Usage examples and tutorials

### Developer Documentation
**Owner**: Documentation Specialist + relevant specialists
- `DEVELOPMENT.md` - Development setup (+ CLI Specialist)
- `CONTRIBUTING.md` - Contribution guidelines (+ Code Quality Specialist)
- `docs/architecture.md` - System architecture (+ Software Architect)
- `docs/api.md` - API documentation (+ Software Architect)

### Agent-Specific Documentation
**Owner**: Respective agent specialists
- `.claude/agents/*.md` - Agent definitions (respective specialists)
- `templates/` - Specification templates (Documentation Specialist)
- `test/` documentation - Testing Specialist

## Quality Gates

### Before Committing Documentation Changes

**Required Validation Checklist**:
- [ ] All code examples tested and functional
- [ ] Installation instructions verified on clean system
- [ ] CLI commands documented with correct syntax and options
- [ ] No conflicting information between files
- [ ] Links validated and working
- [ ] Consistent terminology and formatting

### Documentation Review Process

**For significant documentation changes**:
1. **Author** creates documentation following maintenance guidelines
2. **Peer Review** by appropriate agent specialist
3. **User Testing** - verify instructions work for new users
4. **Final Review** by Documentation Specialist
5. **Commit and Deploy**

## Documentation Standards

### CLI Command Documentation
```markdown
## command-name

Brief description of what the command does.

### Syntax
```bash
asd command-name [options] [arguments]
```

### Options
- `--option-name` - Description of what this option does
- `--flag` - Description of boolean flag

### Examples
```bash
# Basic usage
asd command-name

# With options
asd command-name --option value --flag
```

### Related Commands
- [`related-command`](#related-command) - Brief description
```

### Agent Workflow Documentation
```markdown
## Agent Type: agent-name

**Specialization**: What this agent focuses on

### Workflow Patterns
```bash
# 1. Get next task
asd next --agent agent-name

# 2. Assign task
asd assign FEAT-XXX TASK-XXX

# 3. Complete task
asd complete FEAT-XXX TASK-XXX
```

### Responsibilities
- Primary responsibility 1
- Primary responsibility 2

### Handoff Patterns
- **From**: Previous agent type
- **To**: Next agent type
- **Context**: What information is passed
```

## Common Issues and Solutions

### Outdated Version Information
**Problem**: References to old version numbers or pre-production status
**Solution**: Update all version references to current production status

### Missing CLI Commands
**Problem**: New commands not documented in README or help system
**Solution**: Update command reference, add examples, test functionality

### Conflicting Installation Instructions
**Problem**: Different installation steps in different files
**Solution**: Centralize installation instructions, reference from other files

### Legacy "Spec Viewer" References
**Problem**: Old descriptions that don't reflect workflow automation focus
**Solution**: Update to emphasize AI agent workflow automation capabilities

## Automation Opportunities

### Current Manual Processes
- Link validation
- Example testing
- Version synchronization
- CLI help consistency checking

### Future Automation Potential
```bash
# Potential workflow automation commands
asd docs validate          # Validate all documentation
asd docs update-examples   # Update and test code examples
asd docs check-links       # Validate all links
asd docs version-sync      # Synchronize version information
```

## Monitoring Documentation Health

### Success Metrics
- **User Onboarding Success**: Users can install and start using ASD within 5 minutes
- **Self-Service Success**: <10% of user questions require human intervention
- **Command Discovery**: Users can find and use advanced workflow commands
- **Accuracy Rate**: 100% of documented examples work correctly

### Health Indicators
- No GitHub issues related to documentation accuracy
- Positive user feedback on onboarding experience
- Successful completion of documented workflows
- Consistent information across all documentation files

## Emergency Documentation Updates

### Critical Issues
- Security vulnerabilities in documented procedures
- Broken installation instructions
- Incorrect CLI command syntax
- Misleading workflow guidance

### Emergency Process
1. **Immediate Fix**: Update critical documentation immediately
2. **Verification**: Test fix works correctly
3. **Notification**: Update relevant issues/discussions
4. **Follow-up**: Schedule comprehensive review of related documentation

---

**Next Review**: Update this process based on feedback and experience from maintaining ASD documentation.

**Process Owner**: Documentation Specialist Agent  
**Last Updated**: 2025-08-30 (MAINT-006 TASK-003)