# Changelog

All notable changes to the Agentic Spec Development (ASD) CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Enhanced documentation and examples
- VS Code integration examples
- GitHub Actions workflow examples

### Changed

- Improved error handling and user feedback
- Enhanced terminal compatibility detection

### Fixed

- Terminal size detection issues on some platforms
- File watching stability improvements

## [1.0.0] - 2024-01-22

### Added

- 🎉 **Initial release of Agentic Spec Development CLI**
- Beautiful terminal user interface (TUI) for specification management
- Multi-panel layout with real-time updates
- Support for SPEC and FEAT file formats
- Flexible configuration system using cosmiconfig
- Backwards compatibility with existing roadmap tools
- File watching with automatic refresh
- Progress tracking and statistics
- Keyboard navigation and shortcuts
- Multiple view modes (Active, Backlog, Done)
- Task status tracking and management
- CLI commands: `init`, `config`, `doctor`, `start`
- Library mode for programmatic usage
- Memory management and performance optimizations
- Terminal resize handling
- Customizable branding and themes

### CLI Features

- `asd init` - Initialize ASD in any project
- `asd config` - View current configuration
- `asd doctor` - Health check and diagnostics
- `asd` - Start interactive terminal interface

### Configuration Support

- Multiple config file formats (.asdrc, asd.config.js, package.json)
- Legacy roadmap config compatibility
- Flexible directory structures
- Custom status folders and priority levels
- Specification type customization

### Terminal Interface

- Four-panel layout (Main, Overview, Details, Recommended)
- Keyboard navigation (Vim-style keys supported)
- Real-time file watching and updates
- Panel focus management with Tab cycling
- View switching with arrow keys
- Help system (F1 or ?)

### File Format Support

- Standard SPEC-XXX specification format
- Legacy FEAT-XXX feature format
- Markdown-based with frontmatter support
- Task tracking with checkboxes
- Status and priority management
- Owner and timeline tracking

### Developer Features

- Library mode for integration
- Event system for custom handlers
- Memory management and cleanup
- Debug mode with detailed logging
- Performance monitoring
- Terminal compatibility detection

### Documentation

- Comprehensive README with examples
- Configuration guides and best practices
- API documentation for library usage
- Troubleshooting guides
- Integration examples

## [0.9.0] - 2024-01-15 (Internal Release)

### Added

- Core terminal UI framework
- Basic specification parsing
- Configuration management foundation
- File system abstraction layer

### Internal

- Project abstraction from Campfire roadmap tool
- Architecture redesign for standalone usage
- Package structure and build system
- Testing framework setup

---

## Release Notes

### v1.0.0 - The Foundation Release

This initial release establishes ASD as a powerful, standalone tool for AI-first specification development. Key highlights:

**🎯 AI-First Design**: Built specifically for teams using AI to generate and manage specifications, with workflows optimized for AI collaboration.

**🖥️ Beautiful Terminal UI**: A modern, responsive terminal interface that makes specification management enjoyable and efficient.

**🔧 Zero-Config Setup**: Works immediately with `asd init`, while offering extensive customization for complex projects.

**🔄 Real-Time Updates**: File watching ensures your interface always reflects the latest changes, perfect for collaborative environments.

**📊 Progress Tracking**: Visual indicators and statistics help teams understand project status at a glance.

**🔗 Backwards Compatible**: Seamlessly works with existing roadmap and feature management tools.

### Migration from Internal Roadmap Tool

If you're migrating from the Campfire internal roadmap tool:

1. Install ASD globally: `npm install -g agentic-spec-development`
2. Run health check: `asd doctor`
3. Start using: `asd`

Your existing configuration and file structure should work without changes.

### Future Roadmap

The ASD project aims to become the standard tool for AI-first specification development. Upcoming features include:

- **v1.1.0**: Enhanced AI integration (ChatGPT, Claude API)
- **v1.2.0**: Web interface for remote teams
- **v1.3.0**: Git integration and version tracking
- **v1.4.0**: Team collaboration features
- **v1.5.0**: Plugin system and extensions

### Feedback and Contributions

This is just the beginning! We're actively seeking feedback from the community to shape the future of ASD. Please:

- 🐛 Report bugs on [GitHub Issues](https://github.com/livebydesign2/agentic-spec-development/issues)
- 💡 Share feature ideas in [Discussions](https://github.com/livebydesign2/agentic-spec-development/discussions)
- 🤝 Contribute code via [Pull Requests](https://github.com/livebydesign2/agentic-spec-development/pulls)
- ⭐ Star the project if you find it useful!

---

**[Full Changelog](https://github.com/livebydesign2/agentic-spec-development/compare/v0.9.0...v1.0.0)**
