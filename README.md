# 🤖 Agentic Spec Development (ASD)

> AI-first terminal tool for agentic specification development and project management

[![npm version](https://badge.fury.io/js/agentic-spec-development.svg)](https://badge.fury.io/js/agentic-spec-development)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

**ASD** is a powerful terminal user interface (TUI) designed for teams adopting AI-first specification development workflows. It provides a beautiful, interactive dashboard for managing specifications, features, and tasks through an intuitive terminal interface.

![ASD Terminal Interface](https://via.placeholder.com/800x400/2d3748/cbd5e0?text=ASD%20Terminal%20Interface)

## ✨ Key Features

- 🎯 **AI-First Workflow** - Designed for teams using AI to generate and manage specifications
- 🖥️ **Beautiful Terminal UI** - Intuitive, keyboard-driven interface with live updates
- 📁 **Flexible Organization** - Support for multiple project structures and naming conventions
- ⚙️ **Zero-Config Setup** - Works out of the box, highly configurable when needed
- 🔄 **Live Updates** - Real-time file watching with automatic refresh
- 📊 **Progress Tracking** - Visual progress indicators and status management
- 🎨 **Customizable** - Themes, layouts, and branding options
- 🔗 **Backwards Compatible** - Works with existing roadmap and feature file formats

## 🚀 Quick Start

### Installation

```bash
# Install globally for CLI usage
npm install -g agentic-spec-development

# Or use without installation
npx agentic-spec-development init
npx agentic-spec-development
```

### Initialize a Project

```bash
# Set up ASD in your project
asd init

# Or with custom project type
asd init --type spec
```

This creates:
```
docs/specs/
├── active/     # Currently active specifications
├── backlog/    # Planned specifications
├── done/       # Completed specifications
└── template/   # Specification templates
```

### Start the Terminal Interface

```bash
# Launch the interactive TUI
asd

# With custom configuration
asd --config my-config.js

# With debug information
asd --debug
```

## 📋 How It Works

ASD transforms your specification files into an interactive dashboard:

```
┌─ [1] Active Specifications ─────────────┐ ┌─ [2] Overview ─────────────────────┐
│ ► SPEC-001 User Authentication System   │ │ 📊 Project Status                  │
│   SPEC-002 API Rate Limiting           │ │ Active: 3 specs                   │
│   FEAT-003 Dashboard UI Components     │ │ Backlog: 8 specs                  │
│   SPEC-004 Database Migration System   │ │ Done: 12 specs                    │
│                                        │ │                                    │
│                                        │ │ 🎯 Progress                       │
│                                        │ │ Total Tasks: 45                   │
│                                        │ │ Completed: 28 (62%)               │
└────────────────────────────────────────┘ └────────────────────────────────────┘
┌─ [3] Task Details ──────────────────────────────────────────────────────────────┐
│ SPEC-001: User Authentication System                                           │
│ Implement comprehensive authentication system with OAuth2, 2FA, and RBAC      │
│                                                                                │
│ Tasks:                                                                         │
│   ✅ Setup OAuth2 provider integration                                        │
│   🔄 Implement 2FA with TOTP                                                  │
│   📋 Design role-based access control                                         │
│   📋 Add session management                                                   │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 🎮 Navigation & Controls

| Key | Action |
|-----|--------|
| `↑/↓` or `j/k` | Navigate items |
| `←/→` or `h/l` | Switch views (Active/Backlog/Done) |
| `Tab` | Cycle through panels |
| `1-4` | Jump to specific panel |
| `r` | Refresh data |
| `?` or `F1` | Show help |
| `q` or `Ctrl+C` | Quit |

## ⚙️ Configuration

ASD uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) for flexible configuration loading.

### Configuration Files (Supported Formats)

ASD will search for configuration in the following order:

1. `asd.config.js` (recommended)
2. `.asdrc.js`
3. `.asdrc.json`
4. `.asdrc`
5. `package.json` (in `asd` property)
6. Legacy roadmap configs (backwards compatibility)

### Basic Configuration

**asd.config.js**
```javascript
module.exports = {
  // Path to specifications directory
  featuresPath: 'docs/specs',
  
  // Template directory for new specs
  templatePath: 'docs/specs/template',
  
  // Enable automatic file watching
  autoRefresh: true,
  
  // Supported specification types
  supportedTypes: ['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE'],
  
  // Status folders (subdirectories)
  statusFolders: ['active', 'backlog', 'done'],
  
  // Priority levels
  priorities: ['P0', 'P1', 'P2', 'P3']
};
```

### Advanced Configuration

```javascript
module.exports = {
  featuresPath: 'docs/specifications',
  templatePath: 'templates/specs',
  legacyFeaturesPath: 'docs/product/features', // Backwards compatibility
  
  // UI Customization
  appName: 'My Project Specs',
  appIcon: '🎯',
  
  // File watching
  autoRefresh: true,
  refreshDebounce: 500,
  
  // Defaults for new specs
  defaultPriority: 'P2',
  defaultStatus: 'backlog',
  
  // Enforce specification format
  enforceSpec: true,
  
  // Custom types and statuses
  supportedTypes: ['SPEC', 'EPIC', 'STORY', 'TASK', 'BUG'],
  statusFolders: ['todo', 'doing', 'review', 'done'],
  priorities: ['critical', 'high', 'medium', 'low']
};
```

### Package.json Configuration

```json
{
  "asd": {
    "featuresPath": "specifications",
    "autoRefresh": false,
    "supportedTypes": ["SPEC", "FEAT"]
  }
}
```

## 📄 Specification Format

ASD supports multiple specification formats and is backwards compatible with existing roadmap tools.

### Standard Specification Format

```markdown
# SPEC-001: User Authentication System

**Priority:** P1  
**Status:** active  
**Type:** SPEC  
**Created:** 2024-01-15  
**Owner:** @alice

## Overview
Implement comprehensive authentication system with OAuth2, 2FA, and RBAC.

## Requirements
- [ ] OAuth2 provider integration
- [x] JWT token management  
- [ ] Two-factor authentication
- [ ] Role-based access control

## Tasks
### TASK-001: Setup OAuth2 Integration
**Status:** done  
**Assignee:** @bob  
**Estimated:** 5 days  

Configure OAuth2 providers (Google, GitHub, Microsoft).

### TASK-002: Implement 2FA
**Status:** in_progress  
**Assignee:** @alice  
**Estimated:** 3 days  

Add TOTP-based two-factor authentication.

## Acceptance Criteria
- Users can authenticate via OAuth2 providers
- 2FA is required for admin users
- Role permissions are enforced
```

### Legacy Format Support

ASD also supports existing FEAT-XXX formats:

```markdown
# FEAT-001: Dashboard UI Components

**Priority:** P2  
**Status:** backlog  
**Epic:** User Interface  

## Description
Create reusable UI components for the admin dashboard.

## Requirements
- Component library setup
- Storybook documentation
- Accessibility compliance

## Tasks
- [ ] Setup component library
- [ ] Create base components
- [ ] Add accessibility tests
```

## 🔧 CLI Commands

### `asd` (default)
Start the interactive terminal interface.

```bash
asd                          # Start with default config
asd --config custom.js       # Use custom config file
asd --path ./specifications  # Override specs directory
asd --no-auto-refresh       # Disable file watching
asd --debug                 # Enable debug output
```

### `asd init`
Initialize ASD in the current directory.

```bash
asd init                    # Initialize with defaults
asd init --type spec       # Create spec-focused structure
asd init --type feature    # Create feature-focused structure
asd init --type mixed      # Create mixed structure (default)
```

### `asd config`
Show current configuration.

```bash
asd config
```
```
🤖 ASD Configuration
==================================================
Config file: /project/asd.config.js
Project root: /project
Specs path: /project/docs/specs
Auto refresh: enabled
Supported types: SPEC, FEAT, BUG, SPIKE, MAINT, RELEASE
Status folders: active, backlog, done
```

### `asd doctor`
Check ASD setup and configuration health.

```bash
asd doctor
```
```
🔍 ASD Health Check
==================================================
✅ Specs directory exists: /project/docs/specs
✅ Status folder exists: active
✅ Status folder exists: backlog
✅ Status folder exists: done
✅ Found 15 specification files
✅ terminal-kit dependency available
==================================================
🎉 All checks passed! ASD is ready to use.
```

## 📚 Library Usage

Use ASD programmatically in your applications:

### Basic Usage

```javascript
const ASDClient = require('agentic-spec-development');

const asd = new ASDClient({
  cwd: '/path/to/project',
  appName: 'My Project Specs',
  appIcon: '🎯'
});

await asd.init();
```

### Custom Configuration

```javascript
const { ConfigManager } = require('agentic-spec-development');

const configManager = new ConfigManager('/project/root');
const config = configManager.loadConfig();

const asd = new ASDClient({
  configManager,
  appName: 'Custom App',
  appVersion: '2.0.0'
});

await asd.init();
```

### Programmatic Access

```javascript
const asd = new ASDClient({ cwd: process.cwd() });
await asd.init();

// Access parsed specifications
const specs = asd.specParser.getSpecs();
const features = asd.specParser.getFeatures(); // Legacy support
const stats = asd.specParser.getStats();

console.log(`Found ${specs.length} specifications`);
console.log(`Progress: ${stats.completedTasks}/${stats.totalTasks} tasks`);
```

## 📂 Directory Structure Examples

### Simple Project
```
my-project/
├── asd.config.js
└── docs/specs/
    ├── active/
    │   ├── SPEC-001-auth-system.md
    │   └── SPEC-002-api-gateway.md
    ├── backlog/
    │   ├── SPEC-003-analytics.md
    │   └── FEAT-004-dashboard.md
    └── done/
        └── SPEC-000-project-setup.md
```

### Enterprise Project
```
enterprise-project/
├── .asdrc.js
├── specifications/
│   ├── active/
│   │   ├── core/
│   │   │   ├── SPEC-001-auth.md
│   │   │   └── SPEC-002-data.md
│   │   └── features/
│   │       ├── FEAT-101-dashboard.md
│   │       └── FEAT-102-reports.md
│   ├── backlog/
│   │   ├── epics/
│   │   └── stories/
│   └── completed/
└── templates/
    ├── spec-template.md
    └── feature-template.md
```

### Legacy Project (Backwards Compatible)
```
legacy-project/
├── .roadmaprc.json
├── docs/product/features/
│   ├── active/
│   │   ├── FEAT-001-user-auth.md
│   │   └── FEAT-002-dashboard.md
│   └── backlog/
│       └── FEAT-003-analytics.md
└── roadmap.config.js
```

## 🎨 Customization

### Themes and Branding

```javascript
// asd.config.js
module.exports = {
  // Custom branding
  appName: 'Product Specifications',
  appIcon: '📋',
  
  // UI customization
  theme: {
    primaryColor: 'brightBlue',
    accentColor: 'brightGreen',
    backgroundColor: 'bgBlack'
  }
};
```

### Custom Commands

```bash
# Start with custom branding
asd --app-name "Product Specs" --app-icon "📋"
```

## 🔗 Integration Examples

### GitHub Actions
```yaml
name: Spec Validation
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install ASD
        run: npm install -g agentic-spec-development
      - name: Validate specs
        run: asd doctor
```

### VS Code Integration
```json
{
  "tasks": [
    {
      "label": "Open ASD",
      "type": "shell",
      "command": "asd",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": true,
        "panel": "new"
      }
    }
  ]
}
```

## 🚀 Best Practices

### File Organization
- Use descriptive file names: `SPEC-001-user-authentication.md`
- Keep status folders organized: `active/`, `backlog/`, `done/`
- Use templates for consistency
- Add dates and owners to specifications

### AI-First Workflow
1. **Generate specifications** using AI tools (ChatGPT, Claude, etc.)
2. **Save to appropriate status folder** (usually `backlog/`)
3. **Review and refine** in ASD terminal interface
4. **Move to active** when ready to implement
5. **Track progress** with task checklists
6. **Move to done** when completed

### Team Collaboration
- Use consistent naming conventions
- Define clear status transitions
- Regular spec reviews using ASD interface
- Link specifications to code commits
- Maintain specification history

## 🛠️ Troubleshooting

### Common Issues

**ASD won't start**
```bash
# Check system requirements
node --version  # Should be >= 16.0.0

# Verify installation
asd doctor

# Check configuration
asd config
```

**No specifications found**
```bash
# Check directory structure
asd doctor

# Initialize missing directories
asd init

# Verify config path
asd config
```

**Terminal display issues**
```bash
# Force terminal size detection
asd --debug

# Check terminal compatibility
echo $TERM
```

**File watching not working**
```bash
# Check if auto-refresh is enabled
asd config

# Disable and re-enable
asd --no-auto-refresh
```

### Performance Tips

- Keep specification files under 1MB for best performance
- Use `.asdignore` for large directories (coming soon)
- Limit deep directory nesting
- Regular cleanup of completed specifications

### Debug Mode

Enable debug output for troubleshooting:

```bash
asd --debug
```

This provides:
- Terminal size detection details
- Layout calculations
- Configuration loading steps
- File system operations
- Memory usage information

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/livebydesign2/agentic-spec-development.git
cd agentic-spec-development
npm install
npm test
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration # Integration tests
npm run test:coverage # Coverage report
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by modern AI-first development workflows
- Built with [terminal-kit](https://github.com/cronvel/terminal-kit) for beautiful terminal UIs
- Configuration powered by [cosmiconfig](https://github.com/davidtheclark/cosmiconfig)
- Originally developed for the [Campfire](https://github.com/livebydesign2/campfire) project

## 📞 Support

- 📚 **Documentation**: [Full docs](docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/livebydesign2/agentic-spec-development/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/livebydesign2/agentic-spec-development/discussions)
- 📧 **Email**: [support@agentic-spec-development.dev](mailto:support@agentic-spec-development.dev)

---

> **"Streamline your AI-first specification development workflow with ASD"**

⭐ If you find ASD useful, please consider giving it a star on GitHub!