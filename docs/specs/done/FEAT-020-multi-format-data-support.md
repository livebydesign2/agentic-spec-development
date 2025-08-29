# Multi-Format Data Support (JSON/YAML)

**Status**: Backlog  
**Priority**: P1 (High) - Score: 14.0  
**Type**: Data Architecture  
**Effort**: 8 hours  
**Phase**: PHASE-1B  
**Assignee**: Software Architect → Backend Specialist  
**Dependencies**: FEAT-012 (Context Injection), FEAT-013 (Task Router)

---

id: "FEAT-020"
title: "Multi-Format Data Support"
type: "FEAT"
phase: "PHASE-1B"
priority: "P1"
status: "backlog"

## Summary

Extend the ASD CLI to support multiple data formats beyond markdown, enabling structured data storage in JSON and YAML formats for enhanced programmatic access and integration with external tools.

## Background

While markdown provides excellent human readability, many development workflows benefit from structured data formats that enable easier parsing, validation, and integration with external systems. Supporting JSON and YAML formats allows the ASD CLI to serve diverse project needs.

**Current State**: Markdown-only feature and task storage  
**Target State**: Multi-format support with automatic format detection and conversion utilities

## Business Value

### Strategic Benefits

- **Integration Flexibility**: Enable integration with tools expecting structured data
- **Validation Enhancement**: Structured formats support schema validation
- **Automation Friendly**: JSON/YAML easier for automated parsing and generation
- **Data Export**: Seamless export to various external project management tools

### Success Metrics

- **Format Adoption**: 25%+ of new users choose JSON/YAML formats
- **Integration Usage**: 3+ external tool integrations utilizing structured formats
- **Performance**: No degradation in CLI performance with multiple format support
- **Migration**: Successful bidirectional conversion between all formats

## Technical Architecture

### Multi-Format Data Structure

#### JSON Format

```json
{
  "id": "FEAT-045",
  "type": "feature",
  "title": "Enhanced Search System",
  "status": "active",
  "priority": "P1",
  "effort": "5-8 hours",
  "assignee": "Search-Engineer",
  "created": "2025-01-15T10:00:00Z",
  "updated": "2025-01-16T14:30:00Z",
  "description": "Implement full-text search across all content types",
  "tags": ["search", "performance", "user-experience"],
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Design search architecture",
      "status": "completed",
      "agent": "Software-Architect",
      "effort": "2 hours",
      "completion_date": "2025-01-15T16:00:00Z",
      "subtasks": [
        { "description": "Research search engines", "completed": true },
        { "description": "Design API interface", "completed": true }
      ]
    },
    {
      "id": "TASK-002",
      "title": "Implement search indexing",
      "status": "in_progress",
      "agent": "Backend-Developer",
      "progress": 60,
      "started": "2025-01-16T09:00:00Z",
      "estimated_completion": "2025-01-17T17:00:00Z"
    }
  ],
  "dependencies": ["FEAT-044"],
  "blocking": ["FEAT-046", "FEAT-047"],
  "acceptance_criteria": [
    "Search returns results within 200ms",
    "Full-text search across all content types",
    "Search relevance scoring implemented"
  ],
  "technical_notes": "Consider Elasticsearch for advanced search features"
}
```

#### YAML Format

```yaml
id: FEAT-XXX
type: feature
title: Enhanced Search System
status: active
priority: P1
effort: 5-8 hours
assignee: Search-Engineer
created: 2025-01-15T10:00:00Z
updated: 2025-01-16T14:30:00Z

description: |
  Implement full-text search across all content types with 
  advanced filtering and relevance scoring.

tags:
  - search
  - performance
  - user-experience

tasks:
  - id: TASK-001
    title: Design search architecture
    status: completed
    agent: Software-Architect
    effort: 2 hours
    completion_date: 2025-01-15T16:00:00Z
    subtasks:
      - description: Research search engines
        completed: true
      - description: Design API interface
        completed: true

  - id: TASK-002
    title: Implement search indexing
    status: in_progress
    agent: Backend-Developer
    progress: 60
    started: 2025-01-16T09:00:00Z
    estimated_completion: 2025-01-17T17:00:00Z

dependencies:
  - FEAT-044

blocking:
  - FEAT-046
  - FEAT-047

acceptance_criteria:
  - Search returns results within 200ms
  - Full-text search across all content types
  - Search relevance scoring implemented

technical_notes: >
  Consider Elasticsearch for advanced search features.
  Evaluate performance impact of real-time indexing.
```

### Data Adapter Architecture

```
lib/data-adapters/
├── base-adapter.js           # Abstract base adapter
├── markdown-adapter.js       # Existing markdown support
├── json-adapter.js           # JSON format support
├── yaml-adapter.js           # YAML format support
├── format-detector.js        # Auto-detect data format
├── schema-validator.js       # Format validation
└── converter.js              # Cross-format conversion
```

### Configuration Schema

```json
{
  "asd": {
    "dataFormat": "auto|markdown|json|yaml",
    "formatOptions": {
      "json": {
        "indent": 2,
        "sortKeys": true,
        "dateFormat": "iso"
      },
      "yaml": {
        "indent": 2,
        "lineWidth": 120,
        "noRefs": false
      },
      "markdown": {
        "taskFormat": "asd|standard|custom",
        "frontMatter": true
      }
    },
    "validation": {
      "schema": "strict|loose|none",
      "required_fields": ["id", "title", "status", "priority"],
      "custom_schema_path": "./schema.json"
    }
  }
}
```

## Core Features

### Format Detection & Selection

```bash
# Auto-detect format from existing files
asd init --auto-detect

# Force specific format
asd init --format json --schema-validation strict
asd init --format yaml --indent 2

# Mixed format support (auto-detect per file)
asd config set dataFormat auto
```

### Format Conversion

```bash
# Convert between formats
asd convert --from markdown --to json --output ./features.json
asd convert --from yaml --to markdown --preserve-metadata

# Batch conversion
asd convert --source ./features/*.md --to json --output-dir ./json-features/

# Validation during conversion
asd convert --validate-schema --fix-errors --report conversion-report.json
```

### Schema Validation

```bash
# Validate against schema
asd validate --schema asd-v1 --format json --fix-violations

# Custom schema validation
asd validate --schema ./custom-schema.json --report validation-report.json

# Auto-fix common issues
asd validate --auto-fix --backup --dry-run
```

### Enhanced Data Operations

```bash
# Query structured data
asd query --format json --filter 'status=="active" && priority in ["P0","P1"]'
asd query --format yaml --select 'id,title,assignee' --where 'effort > "4 hours"'

# Bulk updates with structured data
asd update --format json --set 'assignee="New-Agent"' --where 'status=="ready"'

# Advanced filtering
asd list --format yaml --progress-range 50:80 --created-after 2025-01-01
```

## Implementation Tasks

**FEAT-R03** ✅ **Multi-Format Data Support (JSON/YAML)**

**TASK-001** ⏳ **READY** - Data Adapter Architecture | Agent: Software Architect

- [ ] Design abstract base adapter interface for all formats
- [ ] Implement format detection logic based on file extensions and content
- [ ] Create configuration system for format-specific options
- [ ] Build format validation framework with schema support
- [ ] Add error handling for malformed data files

**TASK-002** ⏳ **READY** - JSON Format Support | Agent: Data Engineer

- [ ] Implement JSON data adapter with full CRUD operations
- [ ] Add JSON schema validation and auto-completion
- [ ] Create JSON-specific formatting and optimization
- [ ] Build JSON query and filtering capabilities
- [ ] Add JSON import/export utilities

**TASK-003** ⏳ **READY** - YAML Format Support | Agent: Data Engineer

- [ ] Implement YAML data adapter with comment preservation
- [ ] Add YAML schema validation and linting
- [ ] Create YAML-specific formatting with customizable indentation
- [ ] Build YAML query and update operations
- [ ] Add YAML import/export with metadata preservation

**TASK-004** ⏳ **READY** - Format Conversion System | Agent: Backend Developer

- [ ] Build bidirectional conversion between all formats (MD ↔ JSON ↔ YAML)
- [ ] Implement metadata preservation during conversion
- [ ] Add batch conversion capabilities with progress reporting
- [ ] Create conversion validation and rollback mechanisms
- [ ] Build migration utilities for existing projects

**TASK-005** ⏳ **READY** - CLI Integration & Testing | Agent: QA Engineer

- [ ] Integrate multi-format support into existing CLI commands
- [ ] Add format-specific command options and flags
- [ ] Create comprehensive test suite for all format combinations
- [ ] Build performance benchmarks for large datasets
- [ ] Add documentation and examples for each format

## Advanced Features

### Schema Management

```bash
# Schema operations
asd schema init --format json --version v1.0
asd schema validate --all-files --report schema-report.json
asd schema migrate --from v1.0 --to v1.1 --backup

# Custom schema
asd schema import ./custom-schema.json --name my-project
asd schema export --format json-schema --output ./schema.json
```

### Advanced Queries

```bash
# Complex filtering with structured data
asd query --sql-like "SELECT id, title FROM features WHERE priority = 'P0' AND progress > 50"
asd query --json-path '$.features[?(@.status=="active")].tasks[?(@.agent=="Database-Engineer")]'

# Aggregations and analytics
asd stats --group-by priority,status --format json
asd progress --timeline --format csv --date-range 2025-01-01:2025-02-01
```

### External Integration

```bash
# Import from external tools
asd import --from jira --format json --mapping ./jira-mapping.json
asd import --from github-issues --format yaml --filter 'label:roadmap'

# Export to external tools
asd export --to linear --format json --include-tasks --include-progress
asd export --to csv --columns id,title,assignee,progress --filter 'status==active'
```

## Acceptance Criteria

### Core Multi-Format Support

- [ ] CLI automatically detects and handles JSON, YAML, and Markdown files
- [ ] All CLI commands work consistently across all supported formats
- [ ] Format-specific options (indentation, schema validation) are configurable
- [ ] Performance remains consistent regardless of chosen format
- [ ] Error messages are clear and format-specific

### Conversion & Migration

- [ ] Bidirectional conversion preserves all data and metadata
- [ ] Batch conversion handles large numbers of files efficiently
- [ ] Conversion validation prevents data loss
- [ ] Migration utilities help existing projects adopt new formats
- [ ] Rollback mechanisms available for failed conversions

### Validation & Schema

- [ ] Schema validation works for JSON and YAML formats
- [ ] Custom schemas supported for project-specific requirements
- [ ] Auto-fix capabilities repair common validation issues
- [ ] Validation reports provide actionable error information
- [ ] Schema evolution supported with migration utilities

### Integration & Querying

- [ ] Advanced querying works across all structured formats
- [ ] Filtering and sorting maintain performance with large datasets
- [ ] Import/export utilities work with common external tools
- [ ] CLI output formatting supports all data formats
- [ ] API access available for programmatic integration

## Success Validation

### Format Testing Matrix

```bash
# Test all format combinations
for source in markdown json yaml; do
  for target in markdown json yaml; do
    asd convert --from $source --to $target --validate
  done
done

# Performance benchmarks
asd benchmark --format json --features 1000 --operations create,read,update
asd benchmark --format yaml --features 1000 --operations convert,validate
```

### Integration Testing

- [ ] External tool import/export works without data loss
- [ ] Schema validation catches real-world issues
- [ ] Performance meets requirements for large datasets (1000+ features)
- [ ] Conversion preserves all metadata and relationships
- [ ] Error handling guides users to successful resolution

## Dependencies & Risks

### Dependencies

- **FEAT-R01**: Repository abstraction provides configuration foundation
- **FEAT-R02**: CLI commands provide interface for multi-format operations
- **Software Architect**: Data architecture and adapter pattern design
- **Data Engineer**: Implementation of parsing and validation logic

### Risks & Mitigation

- **Risk**: Data loss during format conversion
  - **Mitigation**: Comprehensive testing, validation, and backup mechanisms
- **Risk**: Performance degradation with multiple formats
  - **Mitigation**: Lazy loading, caching, and format-specific optimizations
- **Risk**: Schema complexity overwhelming users
  - **Mitigation**: Sensible defaults, progressive disclosure, clear documentation

## Future Enhancements

### Advanced Schema Features

- Schema versioning and automatic migration
- Custom validation rules and business logic
- Schema inheritance and composition
- Real-time validation during editing

### External Format Support

- XML format support for enterprise integration
- TOML format for configuration-focused projects
- Database backends (SQLite, PostgreSQL) for large teams
- Cloud storage integration (GitHub, GitLab, Notion)

---

**Priority**: P2 - Enhances flexibility and integration capabilities  
**Effort**: 4-6 hours across adapter implementation and testing
**Impact**: Enables broader adoption by supporting diverse project needs and external tool integration
