# Contributing to Agentic Spec Development (ASD)

Thank you for your interest in contributing to ASD! This document provides guidelines and information for contributors.

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager
- Git

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/agentic-spec-development.git
   cd agentic-spec-development
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run tests to make sure everything works:
   ```bash
   npm test
   ```

5. Try the CLI locally:
   ```bash
   ./bin/asd --help
   ```

## 🔄 Development Workflow

### Making Changes

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. Make your changes following our coding standards
3. Add/update tests as needed
4. Run the test suite:
   ```bash
   npm run test
   npm run lint
   npm run format:check
   ```

5. Commit your changes with a descriptive message:
   ```bash
   git commit -m "feat: add support for custom spec templates"
   ```

6. Push to your fork and create a Pull Request

### Commit Message Convention

We use [Conventional Commits](https://conventionalcommits.org/) for our commit messages:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
- `feat: add YAML configuration support`
- `fix: resolve CLI argument parsing issue`
- `docs: update installation instructions`

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in the `test/` directory
- Use descriptive test names
- Test both happy paths and error conditions
- Aim for high test coverage

## 📝 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions/classes
- Update CHANGELOG.md is handled automatically by semantic-release

## 🎯 Project Structure

```
agentic-spec-development/
├── bin/                 # CLI executables
├── lib/                 # Core library modules
├── config/              # Default configuration files
├── templates/           # Spec file templates
├── test/                # Test files
├── docs/                # Documentation
└── .github/             # GitHub workflows and templates
```

## 💡 Contributing Ideas

### Good First Issues

Look for issues labeled `good first issue` - these are perfect for new contributors.

### Areas for Contribution

- **CLI enhancements**: New commands, improved UX
- **Configuration**: Support for new config formats
- **Templates**: New spec file templates
- **Integrations**: GitHub, Jira, other tools
- **Documentation**: Tutorials, examples, guides
- **Testing**: Improve test coverage

## 🐛 Reporting Issues

Before creating an issue:

1. **Search existing issues** to avoid duplicates
2. **Use the issue templates** provided
3. **Provide minimal reproduction** steps
4. **Include version information** and system details

## 📋 Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New/updated tests for changes
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention

### PR Requirements

1. **Clear description** of what the PR does
2. **Link to relevant issues** (fixes #123)
3. **Screenshots** for UI changes
4. **Breaking changes** clearly documented

### Review Process

1. Automated checks must pass
2. At least one maintainer review required
3. Address any feedback
4. Squash commits before merge if requested

## 🏗️ Architecture Guidelines

### Core Principles

- **Configuration-driven**: Support multiple project structures
- **Backwards compatible**: Don't break existing workflows
- **Terminal-first**: Optimize for CLI/TUI experience
- **Extensible**: Easy to add new features

### Code Style

- Use ESLint and Prettier configurations
- Follow existing patterns and conventions
- Write self-documenting code
- Add comments for complex logic

## 🚀 Release Process

Releases are automated using semantic-release:

1. Merge PR to main branch
2. Semantic-release analyzes commits
3. Generates changelog and version bump
4. Publishes to npm automatically

## 🆘 Getting Help

- **GitHub Discussions**: For questions and ideas
- **Issues**: For bugs and feature requests
- **Email**: For security issues (security@campfireapp.dev)

## 📜 License

By contributing to ASD, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Agentic Spec Development! 🎉