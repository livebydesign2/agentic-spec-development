# Architecture Documentation

This document describes the technical architecture of the Agentic Spec Development (ASD) CLI tool.

## Overview

ASD is designed as a modular, terminal-based application with a clear separation of concerns. The architecture supports both CLI usage and library integration, making it suitable for standalone use and embedding in larger applications.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ASD CLI                              │
├─────────────────────────────────────────────────────────────┤
│  CLI Layer (bin/asd)                                       │
│  ├── Command Parser (commander.js)                         │
│  ├── Command Handlers (init, config, doctor, start)       │
│  └── Options Processing                                    │
├─────────────────────────────────────────────────────────────┤
│  Core Application Layer (lib/index.js)                     │
│  ├── ASDClient - Main application controller               │
│  ├── Terminal Management - Screen handling & events        │
│  ├── Panel System - Multi-panel layout engine             │
│  └── Memory Management - Performance optimization          │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                      │
│  ├── ConfigManager - Configuration loading & validation    │
│  ├── SpecParser - File parsing & data extraction          │
│  ├── ProgressCalculator - Progress tracking               │
│  └── UIComponents - Reusable UI elements                  │
├─────────────────────────────────────────────────────────────┤
│  External Dependencies                                     │
│  ├── terminal-kit - Terminal UI framework                  │
│  ├── cosmiconfig - Configuration management               │
│  ├── chokidar - File system watching                      │
│  └── commander - CLI argument parsing                     │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. ASDClient (Main Controller)

**Location**: `lib/index.js`  
**Purpose**: Central application controller that orchestrates all other components.

**Key Responsibilities**:
- Application lifecycle management (init, render, cleanup)
- Terminal setup and event handling
- Panel coordination and layout management
- State management and data flow
- Memory management and performance optimization

**Key Methods**:
```javascript
class ASDClient {
  async init()                    // Initialize application
  async render()                  // Render UI panels
  setupKeyBindings()              // Configure keyboard shortcuts
  calculateLayout()               // Compute panel dimensions
  cleanup()                       // Clean shutdown
}
```

**Design Patterns**:
- **Controller Pattern**: Coordinates between UI, data, and business logic
- **Observer Pattern**: Listens to keyboard events and file changes
- **Command Pattern**: Key bindings map to specific actions

### 2. ConfigManager

**Location**: `lib/config-manager.js`  
**Purpose**: Handles configuration loading, validation, and access.

**Key Features**:
- Multi-format configuration support (JS, JSON, YAML)
- Hierarchical configuration merging
- Path resolution and validation
- Backwards compatibility with legacy formats

**Configuration Flow**:
```
Search Order:
1. asd.config.js
2. .asdrc.js
3. .asdrc.json
4. .asdrc
5. package.json (asd property)
6. Legacy roadmap configs
↓
Validation & Normalization
↓
Cached Configuration Object
```

**Key Methods**:
```javascript
class ConfigManager {
  loadConfig()                    // Load and cache configuration
  validateAndNormalizeConfig()    // Ensure config integrity
  getFeaturesPath()              // Get specs directory path
  isValidType(type)              // Validate specification type
}
```

### 3. SpecParser (Data Layer)

**Location**: `lib/feature-parser.js` (legacy naming for compatibility)  
**Purpose**: Parses specification files and extracts structured data.

**Parsing Pipeline**:
```
Markdown Files
↓
Frontmatter Extraction
↓
Content Parsing
↓
Task Extraction
↓
Status & Priority Resolution
↓
Structured Data Objects
```

**Data Structures**:
```javascript
// Specification Object
{
  id: 'SPEC-001',
  title: 'User Authentication System',
  type: 'SPEC',
  status: 'active',
  priority: 'P1',
  description: '...',
  tasks: [
    {
      id: 'TASK-001',
      title: 'Setup OAuth2',
      status: 'done',
      assignee: '@alice'
    }
  ],
  metadata: { ... }
}
```

### 4. UIComponents (Presentation Layer)

**Location**: `lib/ui-components.js`  
**Purpose**: Reusable UI elements and visual helpers.

**Component Types**:
- **Status Icons**: Visual indicators for specification states
- **Progress Bars**: Task completion visualization
- **Tabbed Headers**: Panel navigation elements
- **Summary Stats**: Project overview widgets

**Design Principles**:
- **Atomic Design**: Small, reusable components
- **Consistency**: Unified visual language
- **Accessibility**: Keyboard navigation support

### 5. Terminal Management

**Framework**: `terminal-kit`  
**Features**:
- Cross-platform terminal compatibility
- Keyboard event handling
- Mouse support (future)
- Screen buffering and optimization

**Layout System**:
```javascript
// Four-panel layout
const layout = {
  recommended: { x, y, width, height },  // Top panel
  main: { x, y, width, height },         // Left panel
  side: { x, y, width, height },         // Right panel
  bottom: { x, y, width, height }        // Bottom panel
}
```

## Data Flow

### 1. Application Startup

```
CLI Entry Point (bin/asd)
↓
Parse Command Line Arguments
↓
Initialize ConfigManager
↓
Create ASDClient Instance
↓
Load Specifications
↓
Setup Terminal Interface
↓
Initial Render
```

### 2. User Interaction Flow

```
Keyboard Event
↓
Event Handler (ASDClient)
↓
State Update
↓
Re-render Affected Panels
↓
Terminal Update
```

### 3. File Change Detection

```
File System Change
↓
Chokidar Watcher
↓
Debounced Refresh
↓
Re-parse Specifications
↓
Update State
↓
Re-render UI
```

## Performance Considerations

### 1. Memory Management

**Strategies**:
- Periodic garbage collection hints
- Cached content cleanup
- Render queuing to prevent conflicts
- Memory usage monitoring

**Implementation**:
```javascript
// Render queue prevents simultaneous renders
if (this.isRendering) {
  this.renderQueue.push(() => this.render());
  return;
}

// Periodic cleanup
if (this.renderCount % 50 === 0) {
  this.performMemoryCleanup();
}
```

### 2. Rendering Optimization

**Techniques**:
- Incremental rendering (only changed panels)
- Content caching for static data
- Debounced file watching
- Efficient terminal operations

### 3. File System Efficiency

**Optimizations**:
- Intelligent file watching patterns
- Debounced refresh (500ms default)
- Selective file parsing
- Path normalization caching

## Configuration System

### 1. Configuration Schema

```javascript
const defaultConfig = {
  featuresPath: 'docs/specs',
  templatePath: 'docs/specs/template',
  autoRefresh: true,
  refreshDebounce: 500,
  supportedTypes: ['SPEC', 'FEAT', 'BUG', 'SPIKE'],
  statusFolders: ['active', 'backlog', 'done'],
  priorities: ['P0', 'P1', 'P2', 'P3']
};
```

### 2. Configuration Validation

**Validation Rules**:
- Required fields presence
- Path existence and accessibility
- Array type validation
- Priority/status value validation

**Error Handling**:
- Graceful fallback to defaults
- User-friendly error messages
- Configuration health checks

### 3. Backwards Compatibility

**Legacy Support**:
- Roadmap config format detection
- Legacy directory structure support
- FEAT-XXX file format parsing
- Automatic migration hints

## Extension Points

### 1. Plugin Architecture (Future)

**Planned Extension Points**:
- Custom file parsers
- UI theme plugins
- External integrations
- Command extensions

### 2. Configuration Hooks

**Current Hooks**:
- Custom status folders
- Priority level definitions
- File type extensions
- Directory structure customization

### 3. Library Integration

**Public API**:
```javascript
const ASDClient = require('agentic-spec-development');

const asd = new ASDClient({
  configManager: customConfigManager,
  appName: 'Custom App',
  appIcon: '🎯'
});

// Access parsed data
const specs = asd.specParser.getSpecs();
const stats = asd.specParser.getStats();
```

## Error Handling

### 1. Error Categories

**System Errors**:
- Terminal initialization failures
- Configuration loading errors
- File system access issues

**User Errors**:
- Invalid configuration values
- Missing directories
- Malformed specification files

**Runtime Errors**:
- Rendering failures
- Memory allocation issues
- File watching errors

### 2. Error Recovery

**Strategies**:
- Graceful degradation (disable features vs. crash)
- Automatic fallbacks (default config, alternative paths)
- User-friendly error messages
- Debug mode for troubleshooting

### 3. Logging and Debugging

**Debug Levels**:
- Startup debugging (`DEBUG_STARTUP`)
- Layout debugging (`DEBUG_LAYOUT`)
- Performance monitoring
- Error stack traces

## Testing Strategy

### 1. Test Structure

```
test/
├── unit/                    # Component unit tests
│   ├── config-manager.test.js
│   ├── spec-parser.test.js
│   └── ui-components.test.js
├── integration/             # Integration tests
│   ├── cli-commands.test.js
│   └── file-watching.test.js
└── performance/             # Performance tests
    └── memory-usage.test.js
```

### 2. Testing Tools

**Framework**: Jest  
**Assertion Library**: Built-in Jest matchers  
**Mocking**: Jest mocks for file system and terminal operations

### 3. Test Categories

**Unit Tests**:
- Individual component behavior
- Configuration validation
- Data parsing accuracy
- UI component rendering

**Integration Tests**:
- CLI command execution
- File system interaction
- Configuration loading
- End-to-end workflows

**Performance Tests**:
- Memory usage monitoring
- Render performance
- File watching efficiency
- Large dataset handling

## Security Considerations

### 1. File System Access

**Safety Measures**:
- Path traversal prevention
- Sandboxed file operations
- Input validation for file paths
- Permission checking

### 2. Configuration Security

**Protections**:
- Configuration file validation
- Script execution prevention in config
- Path sanitization
- Safe eval practices (none currently used)

### 3. Terminal Security

**Considerations**:
- Terminal escape sequence sanitization
- Input validation for keyboard events
- Safe terminal operations
- Resource limit enforcement

## Deployment and Distribution

### 1. Package Structure

```
agentic-spec-development/
├── bin/asd                  # CLI entry point
├── lib/                     # Core library code
├── config/                  # Default configurations
├── templates/               # Specification templates
├── docs/                    # Documentation
└── package.json             # Package metadata
```

### 2. Distribution Strategy

**NPM Package**:
- Global installation support
- Library mode availability
- Semantic versioning
- Dependency management

### 3. Platform Support

**Supported Platforms**:
- Node.js >= 16.0.0
- Windows, macOS, Linux
- Terminal compatibility layer
- CI/CD environment support

## Future Architecture Plans

### 1. Microservices Transition

**Planned Components**:
- Specification service (parsing/storage)
- UI service (terminal interface)
- Configuration service
- File watching service

### 2. Web Interface

**Architecture**:
- Shared core library
- Web frontend (React/Vue)
- REST API layer
- Real-time synchronization

### 3. Plugin Ecosystem

**Extension Points**:
- File format plugins
- UI theme plugins
- Integration plugins (GitHub, Jira, etc.)
- Custom command plugins

This architecture provides a solid foundation for current functionality while maintaining flexibility for future enhancements and integrations.