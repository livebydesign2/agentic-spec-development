# ASD Context System

This directory contains the ASD Context Injection System files. **Do not modify directly** - files are managed by the ASD CLI system.

## Directory Structure

- **`agents/`** - Agent definitions (Claude-style MD + YAML frontmatter)
- **`processes/`** - Customizable workflow templates and validation checklists
- **`context/`** - Context storage for project, specs, and tasks
- **`state/`** - Dynamic state (current assignments, progress) - _auto-generated_
- **`config/`** - Context system configuration and agent capabilities
- **`logs/`** - Context system operation logs - _auto-generated_
- **`cache/`** - Performance optimization cache - _auto-generated_

## Management Commands

```bash
asd context validate    # Validate all context files
asd context clean       # Clean generated files
asd agent list          # List available agents
asd process update      # Update workflow processes
```

## File Format

All files use Claude's pattern: **Markdown content + YAML frontmatter**

- Human-readable markdown for context and instructions
- YAML frontmatter for structured metadata and configuration
