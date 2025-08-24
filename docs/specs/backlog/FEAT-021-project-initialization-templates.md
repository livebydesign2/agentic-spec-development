# Project Initialization & Templates

**Status**: Backlog  
**Priority**: P2 (Medium) - Score: 13.0  
**Type**: Developer Experience  
**Effort**: 4-5 hours  
**Assignee**: Developer Experience Engineer → Technical Writer  
**Dependencies**: FEAT-R01 (Repository Abstraction), FEAT-R03 (Multi-Format Support)

## Summary

Implement comprehensive project initialization system with templates, configuration wizards, and best-practice setups to enable rapid adoption of the ASD CLI in new projects.

## Background

New users need an easy path to get started with the ASD CLI. Currently, users must manually create directory structures, configuration files, and understand the expected data formats. A comprehensive initialization system removes barriers to adoption and ensures consistent project setup.

**Current State**: Manual setup required with limited guidance  
**Target State**: One-command project initialization with templates, configuration wizards, and automated setup

## Business Value

### Strategic Benefits

- **Adoption Acceleration**: Remove setup friction for new users
- **Best Practice Distribution**: Embed proven workflows and structures
- **Template Ecosystem**: Enable community-contributed templates
- **Onboarding Experience**: Smooth developer onboarding reduces abandonment

### Success Metrics

- **Setup Time**: <2 minutes from install to first roadmap view
- **Template Usage**: 80%+ of new projects use provided templates
- **Community Templates**: 3+ community-contributed templates within 6 months
- **Documentation Quality**: Complete setup guide with video walkthrough

## Technical Architecture

### Project Templates

```
templates/
├── basic/                    # Minimal setup for small projects
│   ├── template.json        # Template configuration
│   ├── README.md            # Getting started guide
│   ├── .asdrc               # CLI configuration
│   └── features/            # Sample features
│       ├── FEAT-001-example.md
│       └── FEAT-002-template.md
├── asd-standard/            # ASD-compatible template
│   ├── template.json
│   ├── docs/
│   │   └── roadmap/
│   │       └── features/
│   └── config/
│       └── asd-config.json
├── agile/                   # Agile/sprint-focused template
│   ├── template.json
│   ├── README.md
│   ├── sprints/
│   └── backlog/
├── enterprise/              # Large organization template
│   ├── template.json
│   ├── README.md
│   ├── governance/
│   ├── templates/
│   └── workflows/
└── custom/                  # User customization examples
    ├── hooks/               # Git hook examples
    ├── scripts/             # Automation scripts
    └── integrations/        # Integration examples
```

### Template Configuration Schema

```json
{
  "template": {
    "id": "asd-standard",
    "name": "ASD Standard Template",
    "version": "1.0.0",
    "description": "Standard ASD project setup with AI-first workflows",
    "author": "ASD Team <team@asd.dev>",
    "tags": ["ai-first", "product-management", "asd"],
    "requirements": {
      "node_version": ">=18.0.0",
      "git": true,
      "optional_tools": ["gh", "jq"]
    }
  },
  "structure": {
    "dataPath": "./docs/roadmap/features",
    "configPath": "./.asdrc",
    "directories": [
      "docs/roadmap/features/active",
      "docs/roadmap/features/backlog",
      "docs/roadmap/features/done",
      "docs/roadmap/features/template"
    ]
  },
  "configuration": {
    "dataFormat": "markdown",
    "priorityLevels": ["P0", "P1", "P2", "P3"],
    "statusTypes": ["active", "backlog", "done", "blocked"],
    "taskStatuses": ["ready", "in_progress", "completed", "blocked"],
    "agents": [
      "Product-Manager",
      "Software-Architect",
      "UI-Developer",
      "Database-Engineer"
    ]
  },
  "files": [
    {
      "source": "README.md",
      "destination": "README.md",
      "template": true,
      "variables": ["project_name", "author", "description"]
    },
    {
      "source": "config/asd.json",
      "destination": ".asdrc",
      "template": true,
      "merge_strategy": "deep"
    }
  ],
  "hooks": {
    "post_init": ["git init", "git add .", "git commit -m 'Initial ASD setup'"],
    "pre_commit": ["asd lint --fix", "asd validate --auto-fix"]
  }
}
```

### Initialization Commands

```bash
# Interactive initialization
asd init
asd init --interactive --template asd-standard

# Non-interactive with options
asd init --template basic --path ./docs/roadmap --format json
asd init --template agile --git-hooks --sample-data

# List available templates
asd init --list-templates --detailed
asd init --template asd-standard --preview

# Custom template support
asd init --template-url https://github.com/user/my-asd-template
asd init --template-path ./my-custom-template

# Project-specific initialization
asd init --detect-project-type --auto-configure
asd init --import-existing --source ./legacy-features/
```

## Core Features

### Interactive Configuration Wizard

```bash
asd init --interactive

# Wizard Flow:
? Project name: My Awesome Project
? Description: AI-first product management for modern teams
? Data format: (Use arrow keys)
  ❯ Markdown (Human-readable, git-friendly)
    JSON (Structured, API-friendly)
    YAML (Structured, readable)
    Auto-detect (Mixed formats)

? Directory structure: (Use arrow keys)
  ❯ Standard (./features/)
    ASD Standard (./docs/roadmap/features/)
    Custom (./roadmap/)
    Existing project (detect automatically)

? Priority levels: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
? Include sample data? Yes
? Setup git hooks? Yes
? Enable schema validation? Strict

Setting up project structure...
✓ Created directories
✓ Generated configuration
✓ Added sample features
✓ Configured git hooks
✓ Validated setup

🎉 Roadmap initialized! Try: asd status
```

### Template Management

```bash
# List available templates
asd template list --format table --include-description

# Template details
asd template show asd-standard --detailed --preview-files
asd template show agile --requirements --configuration

# Install custom templates
asd template install https://github.com/company/asd-template
asd template install ./local-template --name company-standard

# Create custom templates
asd template create --from-current --name my-template --description "Company standard setup"
asd template publish my-template --registry npm --public
```

### Project Migration & Import

```bash
# Import from existing systems
asd init --import-from github-issues --repo owner/repo --label roadmap
asd init --import-from jira --project KEY --query 'type=Epic'
asd init --import-from linear --team-key TEAM --filter 'status:backlog'

# Migrate existing files
asd init --migrate-existing --source ./features/ --backup
asd init --detect-format --migrate-to-standard

# Export current setup as template
asd template export --name my-project-template --include-config --include-samples
```

## Implementation Tasks

**FEAT-R04** ✅ **Project Initialization & Templates**

**TASK-001** ⏳ **READY** - Template System Architecture | Agent: Software Architect

- [ ] Design template configuration schema and validation
- [ ] Implement template loading and processing engine
- [ ] Create file templating system with variable substitution
- [ ] Build template validation and requirement checking
- [ ] Add template versioning and update mechanisms

**TASK-002** ⏳ **READY** - Interactive Initialization Wizard | Agent: UI/UX Developer

- [ ] Build interactive CLI wizard with inquirer.js
- [ ] Create smart defaults based on project detection
- [ ] Implement step-by-step configuration flow
- [ ] Add preview and confirmation steps
- [ ] Build rollback mechanisms for failed initialization

**TASK-003** ⏳ **READY** - Core Project Templates | Agent: Technical Writer

- [ ] Create "basic" template for simple projects
- [ ] Build "asd-standard" template matching current conventions
- [ ] Design "agile" template with sprint organization
- [ ] Create "enterprise" template with governance features
- [ ] Add comprehensive documentation and examples for each template

**TASK-004** ⏳ **READY** - Template Management System | Agent: DevOps Engineer

- [ ] Implement template discovery and listing
- [ ] Build template installation from URLs and registries
- [ ] Create template creation and publishing tools
- [ ] Add template validation and security scanning
- [ ] Build community template registry integration

**TASK-005** ⏳ **READY** - Import & Migration Tools | Agent: Data Engineer

- [ ] Build GitHub Issues import functionality
- [ ] Implement Jira project import with field mapping
- [ ] Create Linear integration for roadmap import
- [ ] Add file format detection and migration
- [ ] Build validation and rollback for import operations

## Advanced Features

### Smart Project Detection

```bash
# Auto-detect project type and suggest appropriate template
asd init --detect

# Detection logic:
# - package.json -> Node.js project (suggest basic/agile)
# - .git/config -> Check for specific repo patterns
# - Existing feature files -> Suggest migration template
# - README.md content analysis -> Suggest based on project description
```

### Configuration Validation

```bash
# Validate project setup
asd doctor --fix-issues --report health-check.json
asd validate-setup --template asd-standard --strict

# Health checks:
# - Required directories exist
# - Configuration files valid
# - Sample data loadable
# - Git hooks functional
# - Dependencies available
```

### Template Development Kit

```bash
# Template development helpers
asd template scaffold --name my-template --based-on basic
asd template test --template ./my-template --validate-all
asd template lint --template ./my-template --fix-issues

# Template preview
asd template preview --template ./my-template --dry-run --verbose
```

## Pre-Built Templates

### 1. Basic Template

- **Use Case**: Small projects, personal roadmaps
- **Structure**: Simple `./features/` directory
- **Format**: Markdown with minimal configuration
- **Features**: Essential commands, basic templates

### 2. ASD Standard Template

- **Use Case**: Projects following ASD conventions
- **Structure**: `./docs/roadmap/features/` with full hierarchy
- **Format**: Markdown with YAML frontmatter
- **Features**: AI agent assignments, priority scoring, task management

### 3. Agile Template

- **Use Case**: Sprint-based development teams
- **Structure**: Sprint-organized with backlog management
- **Format**: JSON for structured data
- **Features**: Sprint planning, velocity tracking, story points

### 4. Enterprise Template

- **Use Case**: Large organizations with governance needs
- **Structure**: Multi-level hierarchy with approvals
- **Format**: YAML with extensive metadata
- **Features**: Compliance tracking, stakeholder management, audit trails

## Acceptance Criteria

### Initialization Experience

- [ ] `asd init` completes project setup in under 2 minutes
- [ ] Interactive wizard guides users through all key decisions
- [ ] Non-interactive mode supports automation and scripting
- [ ] Error handling provides clear guidance for resolution
- [ ] Generated projects pass validation and work immediately

### Template System

- [ ] At least 4 high-quality templates provided out-of-the-box
- [ ] Template installation works from URLs and registries
- [ ] Custom template creation documented and functional
- [ ] Template validation catches common configuration errors
- [ ] Template versioning and updates work seamlessly

### Import & Migration

- [ ] Import from GitHub Issues preserves all relevant data
- [ ] Existing file migration works without data loss
- [ ] Import validation prevents data corruption
- [ ] Migration rollback available for failed operations
- [ ] Import performance suitable for large datasets (100+ items)

### Documentation & Onboarding

- [ ] Complete setup documentation with examples
- [ ] Video walkthrough available for common templates
- [ ] Troubleshooting guide covers common initialization issues
- [ ] Template documentation includes usage patterns and examples
- [ ] Community contribution guidelines for templates

## Success Validation

### User Testing

```bash
# Test complete onboarding flow
npm install -g asd-cli
mkdir test-project && cd test-project
asd init --template asd-standard --interactive=false
asd status
asd create feature "Test Feature" --priority P1
```

### Template Testing

- [ ] All provided templates initialize without errors
- [ ] Generated projects pass validation
- [ ] Sample data loads and displays correctly
- [ ] All CLI commands work in initialized projects
- [ ] Git hooks function as expected

## Dependencies & Risks

### Dependencies

- **FEAT-R01**: Repository abstraction for configuration system
- **FEAT-R03**: Multi-format support for template flexibility
- **Technical Writer**: Template creation and documentation
- **DevOps Engineer**: Template publishing and registry integration

### Risks & Mitigation

- **Risk**: Template complexity overwhelming new users
  - **Mitigation**: Progressive disclosure, smart defaults, clear documentation
- **Risk**: Template maintenance burden
  - **Mitigation**: Community contributions, automated testing, version management
- **Risk**: Import data loss from external systems
  - **Mitigation**: Validation, backups, rollback mechanisms, comprehensive testing

## Future Enhancements

### Advanced Template Features

- Template inheritance and composition
- Dynamic template generation based on project analysis
- Integration with package managers and project scaffolding tools
- Template marketplace with ratings and reviews

### Enhanced Import Capabilities

- Notion database import support
- Azure DevOps and Monday.com integration
- CSV/Excel import with field mapping
- Real-time synchronization with external systems

---

**Priority**: P2 - Critical for user adoption and onboarding  
**Effort**: 4-5 hours across template creation, wizard implementation, and documentation
**Impact**: Significantly reduces barriers to adoption and ensures consistent project setup across diverse use cases
