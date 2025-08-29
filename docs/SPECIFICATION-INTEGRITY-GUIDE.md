# Specification Integrity Management Guide

**MAINT-003 TASK-004 Implementation**  
**Created**: 2025-08-29  
**Status**: Active Protection System

## 🎯 Overview

This guide documents the comprehensive specification integrity validation system implemented to prevent duplicate IDs, broken references, and structural inconsistencies in ASD project specifications.

## 🔧 Tools & Systems

### 1. Validation Script (`scripts/validate-spec-integrity.js`)

**Purpose**: Comprehensive validation of all specifications in the project.

**Usage**:
```bash
# Basic validation
npm run validate-specs

# Generate JSON report
npm run validate-specs-json

# Direct usage
node scripts/validate-spec-integrity.js .
node scripts/validate-spec-integrity.js . --json report.json
```

**What it validates**:
- ✅ Duplicate specification IDs across all directories
- ✅ Inter-specification references (dependencies, blocking, related)
- ✅ Cross-spec task dependencies
- ✅ Structural integrity (required fields, valid formats)
- ✅ File location consistency with status
- ✅ Filename conventions

### 2. Continuous Monitor (`scripts/spec-integrity-monitor.js`)

**Purpose**: Real-time monitoring and periodic integrity checks.

**Usage**:
```bash
# Watch mode with real-time validation
npm run monitor-specs

# Dashboard mode with live updates
npm run monitor-specs-dashboard

# Custom configuration
node scripts/spec-integrity-monitor.js . --watch --interval 60 --dashboard
```

**Features**:
- 📁 File system watching for real-time validation
- ⏰ Periodic integrity checks
- 📊 Live dashboard with health metrics
- 📄 Automatic report generation and cleanup
- 🔔 Issue detection and resolution tracking

### 3. Pre-commit Hook (`.githooks/pre-commit`)

**Purpose**: Prevents commits that would introduce integrity violations.

**Installation**:
```bash
# Install hooks for current repository
npm run install-hooks

# Manual installation
bash scripts/install-hooks.sh
```

**What it prevents**:
- 🚫 Duplicate specification IDs
- 🚫 Broken inter-spec references
- 🚫 Structural integrity violations
- 🚫 Invalid metadata formats

### 4. Enhanced Validation Rules (`lib/validation-rules.js`)

**New validation rules added**:
- `ReferenceIntegrityRule` - Validates all inter-spec references
- `FilenameConsistencyRule` - Ensures filenames match spec IDs
- `CircularReferenceRule` - Detects circular dependencies

## 📋 Conflict Prevention Procedures

### When Creating New Specifications

1. **Check ID Availability**:
   ```bash
   # Validate before committing
   npm run validate-specs
   ```

2. **Follow ID Conventions**:
   - Format: `TYPE-###` (e.g., `FEAT-025`, `BUG-007`, `MAINT-004`)
   - Valid types: `FEAT`, `BUG`, `SPEC`, `MAINT`, `SPIKE`, `RELEASE`
   - Use next available number in sequence

3. **Filename Conventions**:
   - Format: `{ID}-{description}.md`
   - Example: `FEAT-025-claude-code-commands.md`
   - Must start with the specification ID

4. **Required Frontmatter**:
   ```yaml
   ---
   id: FEAT-025
   title: Your Specification Title
   type: FEAT
   status: backlog  # active, backlog, done, archived
   priority: P2     # P0, P1, P2, P3
   ---
   ```

### When Referencing Other Specifications

1. **Validate References Before Use**:
   ```bash
   # Check that target specifications exist
   npm run validate-specs
   ```

2. **Use Proper Reference Fields**:
   ```yaml
   dependencies: [FEAT-001, FEAT-002]  # This spec depends on these
   blocking: [FEAT-010]                # This spec blocks these  
   related: [BUG-005, SPEC-003]        # Related specifications
   ```

3. **Cross-spec Task Dependencies**:
   ```yaml
   tasks:
     - id: TASK-001
       depends_on: [FEAT-001-TASK-002]  # Reference specific tasks
   ```

### When Moving or Renaming Specifications

1. **Update All References**:
   ```bash
   # Find all references to the old ID
   grep -r "OLD-ID" docs/specs/
   
   # Validate after updates
   npm run validate-specs
   ```

2. **Use Git for Tracking**:
   ```bash
   # Proper way to rename specs
   git mv old-spec.md new-spec.md
   # Update references in content
   # Commit with clear message about the rename
   ```

### Development Workflow Integration

1. **Daily Development**:
   ```bash
   # Start monitoring during development
   npm run monitor-specs-dashboard
   ```

2. **Before Committing**:
   ```bash
   # Pre-commit hook runs automatically, but you can test manually:
   npm run validate-specs
   ```

3. **CI/CD Integration**:
   ```bash
   # Add to CI pipeline
   npm run validate-specs
   ```

## 🚨 Issue Resolution Guide

### Duplicate ID Conflicts

**Symptoms**:
```
❌ Duplicate spec ID found: FEAT-025 (appears 2 times)
```

**Resolution**:
1. Identify the duplicate specifications
2. Determine which should keep the ID (usually the older/more complete one)
3. Assign new ID to the duplicate:
   ```bash
   # Find next available ID
   ls docs/specs/*/FEAT-*.md | grep -o 'FEAT-[0-9]\+' | sort -V | tail -1
   ```
4. Update all references to the renamed specification
5. Update filename and frontmatter
6. Re-validate: `npm run validate-specs`

### Broken References

**Symptoms**:
```
❌ Invalid dependency reference in FEAT-025: 'FEAT-999' does not exist
```

**Resolution**:
1. Check if the target specification exists:
   ```bash
   find docs/specs/ -name "*FEAT-999*"
   ```
2. If it doesn't exist:
   - Remove the invalid reference, OR
   - Create the missing specification, OR
   - Update to reference the correct specification
3. Re-validate: `npm run validate-specs`

### Structural Issues

**Symptoms**:
```
❌ Missing required field: priority
❌ Invalid status: in_progress. Valid statuses: active, backlog, done, archived
```

**Resolution**:
1. Add missing required fields to frontmatter
2. Fix invalid field values to match allowed formats
3. Ensure file location matches status field
4. Re-validate: `npm run validate-specs`

## 📊 Monitoring & Reporting

### Real-time Monitoring Dashboard

The monitoring system provides real-time visibility into specification health:

```bash
npm run monitor-specs-dashboard
```

**Dashboard displays**:
- ✅ Overall health status
- 📊 Summary metrics (total specs, errors, warnings)
- 🔍 Issue breakdown by type
- ⏱️ Validation performance metrics
- 📈 Session statistics

### Report Generation

**Automated Reports**:
- Generated on every validation run
- Stored in `.asd/integrity-reports/`
- JSON format for programmatic analysis
- Automatic cleanup (keeps latest 50 reports)

**Manual Report Generation**:
```bash
# Generate detailed JSON report
npm run validate-specs-json
```

### Integration with ASD CLI

The validation system integrates with the existing ASD validation manager:

```javascript
// New validation rules are automatically registered
const ValidationManager = require('./lib/validation-manager');
const vm = new ValidationManager();

// Rules include:
// - reference-integrity
// - filename-consistency  
// - circular-reference
```

## 🔄 Maintenance Procedures

### Weekly Maintenance

1. **Review Integrity Reports**:
   ```bash
   # Check recent validation history
   ls -la .asd/integrity-reports/ | head -10
   ```

2. **Clean Up Old Reports** (automated but can be manual):
   ```bash
   # Monitor report storage
   du -sh .asd/integrity-reports/
   ```

3. **Validate Full Project**:
   ```bash
   npm run validate-specs
   ```

### Monthly Maintenance

1. **Review Validation Rules**:
   - Check if new validation rules are needed
   - Update validation thresholds if needed
   - Review team feedback on false positives

2. **Update Documentation**:
   - Keep this guide updated with new procedures
   - Document any new patterns or common issues
   - Update team training materials

### Emergency Procedures

**When Validation is Blocking Development**:

1. **Bypass Pre-commit Hook** (temporary):
   ```bash
   git commit --no-verify -m "Emergency commit - validation bypass"
   ```

2. **Disable Monitoring** (if causing performance issues):
   ```bash
   # Kill monitoring processes
   pkill -f spec-integrity-monitor
   ```

3. **Reset Validation State**:
   ```bash
   # Clear validation cache
   rm -rf .asd/integrity-reports/*
   
   # Restart validation
   npm run validate-specs
   ```

## 📚 Developer Training

### New Team Members

1. **Setup** (mandatory):
   ```bash
   npm run install-hooks
   npm run validate-specs
   ```

2. **Training Checklist**:
   - [ ] Understand ID conventions
   - [ ] Know how to validate before committing
   - [ ] Can interpret validation error messages
   - [ ] Understands reference formats
   - [ ] Knows how to resolve common conflicts

3. **Practice Exercise**:
   - Create a new specification
   - Add references to existing specs
   - Run validation
   - Fix any issues found
   - Successfully commit changes

### Advanced Usage

**Power Users can**:
- Extend validation rules in `lib/validation-rules.js`
- Customize monitoring settings
- Integrate with CI/CD systems
- Generate custom reports for analysis

## 🚀 Future Enhancements

### Planned Improvements

1. **Auto-fix Capabilities**:
   - Automatic ID conflict resolution
   - Reference update automation
   - Structural issue auto-correction

2. **Enhanced Monitoring**:
   - Web-based dashboard
   - Slack/email notifications
   - Trend analysis and predictions

3. **Team Collaboration**:
   - Conflict resolution workflows
   - Team notification system
   - Collaborative spec review process

### Extension Points

The system is designed for extensibility:

- **Custom Validation Rules**: Add new rules to `lib/validation-rules.js`
- **Monitoring Integrations**: Extend monitoring system for external tools
- **Report Formats**: Add new output formats (XML, CSV, etc.)
- **Notification Systems**: Add email, Slack, or webhook notifications

---

## 📞 Support & Troubleshooting

**Common Issues**:

1. **Hook not running**: Ensure hooks are installed (`npm run install-hooks`)
2. **Performance issues**: Adjust monitoring interval or disable file watching
3. **False positives**: Review validation rules and adjust thresholds
4. **Integration conflicts**: Check ASD CLI compatibility

**Getting Help**:
- Check validation output for specific error messages
- Review this guide for resolution procedures
- Check project issues for known problems
- Contact the development team for complex issues

**Emergency Contacts**:
- For urgent validation blocks: Disable hooks temporarily
- For system failures: Restart monitoring and re-validate
- For data corruption: Restore from backups and re-validate

---

*This guide is part of MAINT-003 TASK-004 implementation and should be kept updated as the system evolves.*