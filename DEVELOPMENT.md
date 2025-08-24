# Development Setup

> **Note**: ASD is currently in pre-production development and not published to npm.

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- Git

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/livebydesign2/agentic-spec-development.git
   cd agentic-spec-development
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Link for global development (optional)**
   ```bash
   npm link
   # Now you can use `asd` command globally
   ```

## Running ASD

### From Source

```bash
# Direct execution
node bin/asd

# With options
node bin/asd --debug
node bin/asd init --type spec
```

### Linked Globally

```bash
# If you ran `npm link`
asd
asd init
asd --help
```

### Development Scripts

```bash
# Start ASD
npm start
npm run dev  # Same as start

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Code quality
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Validation
npm run validate  # lint + format + unit tests
```

## Project Structure

```
asd/
├── bin/asd              # CLI executable entry point
├── lib/                 # Core application modules
│   ├── index.js         # Main ASD client class
│   ├── config-manager.js# Configuration management
│   ├── feature-parser.js# Markdown parsing
│   ├── progress-calc.js # Progress calculation
│   └── ui-components.js # Terminal UI components
├── templates/           # Specification templates
├── test/               # Test suites
├── docs/               # Documentation
└── .claude/            # AI agents for development
```

## Development Workflow

1. **Make changes** to code
2. **Test locally** with `node bin/asd`
3. **Run tests** with `npm test`
4. **Lint code** with `npm run lint:fix`
5. **Commit changes** following conventional commit format
6. **Push to repository** (do not publish to npm yet)

## Testing Your Changes

1. **Create a test project** in a separate directory:

   ```bash
   mkdir ../test-asd
   cd ../test-asd
   /path/to/asd/bin/asd init
   /path/to/asd/bin/asd
   ```

2. **Test with sample specifications**:
   - Create markdown files in `docs/specs/active/`
   - Test navigation, rendering, and functionality
   - Verify file watching and updates work

## Pre-Production Status

- **Version**: 0.1.0-alpha
- **Status**: Active development, not published
- **API Stability**: APIs may change before 1.0.0 release
- **Publishing**: Will be published to npm when stable

## Release Process (Future)

When ready for publication:

1. Update version in `package.json`
2. Remove `"private": true` from `package.json`
3. Update README.md to remove pre-production warnings
4. Run `npm publish`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.
