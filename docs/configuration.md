# Configuration Guide

This guide covers all aspects of configuring the Agentic Spec Development (ASD) CLI tool.

## Overview

ASD uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) for flexible configuration management. This allows you to configure ASD in multiple ways, from simple JSON files to complex JavaScript configurations.

## Quick Setup

### Automatic Configuration

```bash
# Initialize with default configuration
asd init

# Check current configuration
asd config

# Validate setup
asd doctor
```

### Manual Configuration

Create an `asd.config.js` file in your project root:

```javascript
module.exports = {
  featuresPath: "docs/specs",
  autoRefresh: true,
  supportedTypes: ["SPEC", "FEAT", "BUG"],
  statusFolders: ["active", "backlog", "done"],
};
```

## Configuration File Formats

ASD searches for configuration files in the following order:

### 1. JavaScript Configuration (Recommended)

**File**: `asd.config.js`

```javascript
module.exports = {
  featuresPath: "docs/specifications",
  templatePath: "templates/specs",
  autoRefresh: true,
  refreshDebounce: 1000,

  // Custom application branding
  appName: "Product Specifications",
  appIcon: "📋",

  // File type configuration
  supportedTypes: [
    "SPEC", // Specifications
    "EPIC", // Large features
    "STORY", // User stories
    "TASK", // Technical tasks
    "BUG", // Bug reports
    "SPIKE", // Research tasks
  ],

  // Directory structure
  statusFolders: [
    "todo", // Not started
    "doing", // In progress
    "review", // Under review
    "done", // Completed
  ],

  // Priority levels
  priorities: ["critical", "high", "medium", "low"],

  // Default values for new specifications
  defaultPriority: "medium",
  defaultStatus: "todo",

  // Advanced options
  enforceSpec: true,
  legacyFeaturesPath: "docs/product/features",
};
```

### 2. JSON Configuration

**File**: `.asdrc.json` or `.asdrc`

```json
{
  "featuresPath": "docs/specs",
  "autoRefresh": true,
  "supportedTypes": ["SPEC", "FEAT", "BUG"],
  "statusFolders": ["active", "backlog", "done"],
  "priorities": ["P0", "P1", "P2", "P3"]
}
```

### 3. Package.json Configuration

**File**: `package.json`

```json
{
  "name": "my-project",
  "asd": {
    "featuresPath": "specifications",
    "autoRefresh": false,
    "appName": "My Project Specs",
    "supportedTypes": ["SPEC", "EPIC", "STORY"]
  }
}
```

### 4. YAML Configuration

**File**: `.asdrc.yaml` or `.asdrc.yml`

```yaml
featuresPath: docs/specs
autoRefresh: true
supportedTypes:
  - SPEC
  - FEAT
  - BUG
statusFolders:
  - active
  - backlog
  - done
priorities:
  - P0
  - P1
  - P2
  - P3
```

## Configuration Options

### Core Settings

#### `featuresPath` (required)

**Type**: `string`  
**Default**: `'docs/specs'`  
**Description**: Path to the directory containing specification files.

```javascript
// Relative path
featuresPath: "docs/specifications";

// Absolute path
featuresPath: "/project/specs";

// Nested structure
featuresPath: "docs/product/specifications";
```

#### `templatePath`

**Type**: `string`  
**Default**: `'docs/specs/template'`  
**Description**: Path to specification templates.

```javascript
templatePath: "templates/specifications";
```

#### `autoRefresh`

**Type**: `boolean`  
**Default**: `true`  
**Description**: Enable automatic file watching and refresh.

```javascript
autoRefresh: true; // Watch files and auto-refresh
autoRefresh: false; // Manual refresh only (press 'r')
```

#### `refreshDebounce`

**Type**: `number`  
**Default**: `500`  
**Description**: Debounce delay in milliseconds for file watching.

```javascript
refreshDebounce: 1000; // Wait 1 second before refreshing
refreshDebounce: 250; // Quick refresh (may be resource intensive)
```

### File Type Configuration

#### `supportedTypes`

**Type**: `string[]`  
**Default**: `['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE']`  
**Description**: Supported specification types.

```javascript
// Standard types
supportedTypes: ["SPEC", "FEAT", "BUG"];

// Custom types
supportedTypes: ["EPIC", "STORY", "TASK", "DEFECT"];

// Extended types
supportedTypes: [
  "SPEC", // Technical specifications
  "REQ", // Requirements
  "ARCH", // Architecture documents
  "API", // API specifications
  "TEST", // Test plans
  "DOC", // Documentation
];
```

#### `statusFolders`

**Type**: `string[]`  
**Default**: `['active', 'backlog', 'done']`  
**Description**: Status-based directory structure.

```javascript
// Standard workflow
statusFolders: ["active", "backlog", "done"];

// Agile workflow
statusFolders: ["todo", "doing", "review", "done"];

// Extended workflow
statusFolders: [
  "proposed", // Initial proposals
  "approved", // Approved specifications
  "active", // Currently being implemented
  "testing", // Under testing
  "completed", // Finished work
  "archived", // Old specifications
];
```

#### `priorities`

**Type**: `string[]`  
**Default**: `['P0', 'P1', 'P2', 'P3']`  
**Description**: Supported priority levels.

```javascript
// Numeric priorities
priorities: ["P0", "P1", "P2", "P3"];

// Named priorities
priorities: ["critical", "high", "medium", "low"];

// Extended priorities
priorities: [
  "blocker", // Must fix immediately
  "critical", // High impact
  "major", // Significant impact
  "minor", // Low impact
  "trivial", // Cosmetic changes
];
```

### Default Values

#### `defaultPriority`

**Type**: `string`  
**Default**: `'P2'`  
**Description**: Default priority for new specifications.

```javascript
defaultPriority: "P2"; // Standard priority
defaultPriority: "medium"; // Named priority
defaultPriority: "low"; // Conservative default
```

#### `defaultStatus`

**Type**: `string`  
**Default**: `'backlog'`  
**Description**: Default status for new specifications.

```javascript
defaultStatus: "backlog"; // Standard default
defaultStatus: "proposed"; // Requires approval
defaultStatus: "todo"; // Ready to start
```

### UI Customization

#### `appName`

**Type**: `string`  
**Default**: `'Agentic Spec Development'`  
**Description**: Custom application name displayed in the UI.

```javascript
appName: "Product Specifications";
appName: "Technical Requirements";
appName: "Project Roadmap";
```

#### `appIcon`

**Type**: `string`  
**Default**: `'🗺️'`  
**Description**: Icon displayed in the terminal header.

```javascript
appIcon: "📋"; // Clipboard
appIcon: "🎯"; // Target
appIcon: "⚡"; // Lightning
appIcon: "🚀"; // Rocket
```

### Advanced Settings

#### `enforceSpec`

**Type**: `boolean`  
**Default**: `false`  
**Description**: Require strict specification format compliance.

```javascript
enforceSpec: true; // Strict format validation
enforceSpec: false; // Lenient parsing
```

#### `legacyFeaturesPath`

**Type**: `string`  
**Default**: `null`  
**Description**: Path to legacy feature files for backwards compatibility.

```javascript
legacyFeaturesPath: "docs/product/features";
legacyFeaturesPath: "legacy/roadmap";
```

## Environment-Specific Configuration

### Development Configuration

**File**: `asd.config.dev.js`

```javascript
module.exports = {
  featuresPath: "docs/specs",
  autoRefresh: true,
  refreshDebounce: 100, // Fast refresh for development
  appName: "Dev Specs",
  appIcon: "🔧",

  // Development-specific settings
  statusFolders: ["wip", "review", "done"],
  priorities: ["urgent", "normal", "later"],
};
```

### Production Configuration

**File**: `asd.config.prod.js`

```javascript
module.exports = {
  featuresPath: "specifications",
  autoRefresh: false, // Disable file watching in production
  appName: "Product Specifications",
  appIcon: "📋",

  // Production-specific settings
  enforceSpec: true,
  statusFolders: ["active", "backlog", "done"],
  priorities: ["P0", "P1", "P2", "P3"],
};
```

### Team-Specific Configuration

**File**: `asd.config.team.js`

```javascript
module.exports = {
  featuresPath: "team-specs",
  appName: "Team Alpha Specifications",
  appIcon: "👥",

  // Team workflow
  statusFolders: [
    "proposed",
    "approved",
    "in-progress",
    "code-review",
    "testing",
    "deployed",
  ],

  // Team priorities
  priorities: ["critical", "high", "medium", "low", "nice-to-have"],
};
```

## Dynamic Configuration

### Conditional Configuration

```javascript
const isDevelopment = process.env.NODE_ENV === "development";

module.exports = {
  featuresPath: isDevelopment ? "docs/dev-specs" : "docs/specs",
  autoRefresh: isDevelopment,
  refreshDebounce: isDevelopment ? 100 : 500,

  appName: isDevelopment ? "Dev Specs" : "Product Specs",

  // Environment-specific types
  supportedTypes: isDevelopment
    ? ["SPEC", "FEAT", "BUG", "EXPERIMENT", "POC"]
    : ["SPEC", "FEAT", "BUG"],
};
```

### User-Specific Configuration

```javascript
const os = require("os");
const username = os.userInfo().username;

module.exports = {
  featuresPath: "docs/specs",
  appName: `${username}'s Specifications`,

  // User-specific defaults
  defaultPriority: username === "alice" ? "P1" : "P2",

  // User workflow preferences
  statusFolders:
    username === "bob"
      ? ["todo", "doing", "review", "done"]
      : ["active", "backlog", "done"],
};
```

## Configuration Validation

### Built-in Validation

ASD automatically validates configuration and provides helpful error messages:

```bash
# Check configuration validity
asd config

# Health check with validation
asd doctor
```

### Custom Validation

```javascript
// asd.config.js
const config = {
  featuresPath: "docs/specs",
  supportedTypes: ["SPEC", "FEAT"],
  statusFolders: ["active", "backlog", "done"],
};

// Validate custom requirements
if (!config.featuresPath) {
  throw new Error("featuresPath is required");
}

if (config.supportedTypes.length === 0) {
  throw new Error("At least one supported type is required");
}

module.exports = config;
```

## Configuration Precedence

Configuration is loaded in this order (later values override earlier ones):

1. **Default configuration** (built-in)
2. **Configuration file** (asd.config.js, .asdrc, etc.)
3. **Environment variables** (future feature)
4. **Command line arguments** (`--path`, `--config`, etc.)

### Command Line Overrides

```bash
# Override specs path
asd --path ./custom-specs

# Use custom config file
asd --config ./custom.config.js

# Disable auto-refresh
asd --no-auto-refresh

# Custom branding
asd --app-name "My Specs" --app-icon "🎯"
```

## Configuration Patterns

### Multi-Project Setup

**Project A**: `projects/alpha/asd.config.js`

```javascript
module.exports = {
  featuresPath: "specs",
  appName: "Project Alpha",
  appIcon: "🅰️",
};
```

**Project B**: `projects/beta/asd.config.js`

```javascript
module.exports = {
  featuresPath: "specifications",
  appName: "Project Beta",
  appIcon: "🅱️",
};
```

### Shared Configuration

**Base**: `shared/asd.base.js`

```javascript
module.exports = {
  autoRefresh: true,
  refreshDebounce: 500,
  supportedTypes: ["SPEC", "FEAT", "BUG"],
  statusFolders: ["active", "backlog", "done"],
  priorities: ["P0", "P1", "P2", "P3"],
};
```

**Project**: `asd.config.js`

```javascript
const base = require("./shared/asd.base");

module.exports = {
  ...base,
  featuresPath: "docs/project-specs",
  appName: "Specific Project",
  appIcon: "🚀",
};
```

### Monorepo Configuration

**Root**: `asd.config.js`

```javascript
module.exports = {
  featuresPath: "docs/specs",
  appName: "Monorepo Specifications",

  // Support multiple project types
  supportedTypes: [
    "SPEC",
    "FEAT",
    "API", // API specifications
    "LIB", // Library features
    "APP", // Application features
    "INFRA", // Infrastructure changes
  ],

  // Extended workflow for large projects
  statusFolders: [
    "proposed",
    "approved",
    "in-progress",
    "review",
    "testing",
    "deployed",
    "archived",
  ],
};
```

## Troubleshooting Configuration

### Common Issues

**Configuration not found**:

```bash
# Check search paths
asd config

# Initialize default configuration
asd init
```

**Invalid configuration**:

```bash
# Validate configuration
asd doctor

# Check specific setting
node -e "console.log(require('./asd.config.js'))"
```

**Path resolution issues**:

```javascript
const path = require("path");

module.exports = {
  // Use absolute paths to avoid confusion
  featuresPath: path.resolve(__dirname, "docs/specs"),
  templatePath: path.resolve(__dirname, "templates"),
};
```

### Debug Configuration Loading

```bash
# Enable debug output
DEBUG=asd:config asd

# Or use debug flag
asd --debug
```

### Validation Errors

Common validation errors and solutions:

**Missing required fields**:

```javascript
// ❌ Invalid
module.exports = {};

// ✅ Valid
module.exports = {
  featuresPath: "docs/specs", // Required field
};
```

**Invalid types**:

```javascript
// ❌ Invalid
module.exports = {
  featuresPath: "docs/specs",
  statusFolders: "active,backlog,done", // Should be array
};

// ✅ Valid
module.exports = {
  featuresPath: "docs/specs",
  statusFolders: ["active", "backlog", "done"],
};
```

**Path issues**:

```javascript
// ❌ Problematic
module.exports = {
  featuresPath: "../../../specs", // Relative paths can be confusing
};

// ✅ Better
const path = require("path");
module.exports = {
  featuresPath: path.join(__dirname, "..", "specs"),
};
```

## Configuration Best Practices

### 1. Use JavaScript Configuration

JavaScript configuration files offer the most flexibility:

```javascript
// asd.config.js
const isDev = process.env.NODE_ENV === "development";

module.exports = {
  featuresPath: "docs/specs",
  autoRefresh: isDev,
  appName: isDev ? "Dev Specs" : "Product Specs",

  // Computed values
  refreshDebounce: isDev ? 100 : 500,

  // Conditional features
  ...(isDev && {
    supportedTypes: ["SPEC", "FEAT", "BUG", "EXPERIMENT"],
  }),
};
```

### 2. Document Your Configuration

```javascript
// asd.config.js
module.exports = {
  // Core paths
  featuresPath: "docs/specs", // Main specs directory
  templatePath: "docs/specs/template", // Templates for new specs

  // UI settings
  appName: "Product Specifications", // Displayed in terminal
  appIcon: "📋", // Terminal icon

  // File watching
  autoRefresh: true, // Watch files for changes
  refreshDebounce: 500, // Debounce delay (ms)

  // Workflow configuration
  supportedTypes: [
    "SPEC", // Technical specifications
    "FEAT", // Feature descriptions
    "BUG", // Bug reports
  ],

  statusFolders: [
    "active", // Currently being worked on
    "backlog", // Planned for future
    "done", // Completed work
  ],
};
```

### 3. Environment-Specific Configs

```javascript
// asd.config.js
const env = process.env.NODE_ENV || "development";

const configs = {
  development: {
    featuresPath: "docs/dev-specs",
    autoRefresh: true,
    refreshDebounce: 100,
  },

  production: {
    featuresPath: "docs/specs",
    autoRefresh: false,
    enforceSpec: true,
  },

  test: {
    featuresPath: "test/fixtures/specs",
    autoRefresh: false,
  },
};

module.exports = {
  // Base configuration
  appName: "Specifications",
  supportedTypes: ["SPEC", "FEAT", "BUG"],
  statusFolders: ["active", "backlog", "done"],

  // Environment-specific overrides
  ...configs[env],
};
```

### 4. Team Consistency

Create a shared configuration and document team conventions:

```javascript
// team-asd.config.js (shared)
module.exports = {
  // Team standards
  supportedTypes: ["SPEC", "FEAT", "BUG", "EPIC"],
  statusFolders: ["proposed", "approved", "active", "review", "done"],
  priorities: ["critical", "high", "medium", "low"],

  // Team defaults
  defaultPriority: "medium",
  defaultStatus: "proposed",

  // Team workflow
  autoRefresh: true,
  refreshDebounce: 500,
};
```

This configuration guide should help you set up ASD to match your team's workflow and project structure perfectly.
