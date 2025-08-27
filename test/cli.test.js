const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Mock terminal-kit to prevent actual terminal operations during tests
jest.mock('terminal-kit', () => ({
  terminal: {
    width: 80,
    height: 24,
    clear: jest.fn(),
    moveTo: jest.fn().mockReturnThis(),
    grabInput: jest.fn(),
    fullscreen: jest.fn(),
    windowTitle: jest.fn(),
    hideCursor: jest.fn(),
    showCursor: jest.fn(),
    reset: jest.fn(),
    on: jest.fn(),
    cyan: jest.fn(),
    green: jest.fn(),
    red: jest.fn(),
    yellow: jest.fn(),
    gray: jest.fn(),
    brightBlue: jest.fn(),
    brightGreen: jest.fn(),
    brightCyan: jest.fn(),
    bgCyan: {
      black: jest.fn(),
    },
  },
}));

describe('CLI Commands', () => {
  let testDir;
  let cliPath;

  beforeAll(() => {
    cliPath = path.join(__dirname, '../bin/asd');
  });

  beforeEach(() => {
    testDir = global.TEST_DIR;
    global.setupTestDir();
  });

  afterEach(() => {
    global.cleanupTestDir();
  });

  describe('asd --help', () => {
    it('should display help information', () => {
      const result = execSync(`node "${cliPath}" --help`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('Agentic Spec Development');
      expect(result).toContain('Usage:');
      expect(result).toContain('Options:');
      expect(result).toContain('Commands:');
      expect(result).toContain('init');
      expect(result).toContain('config');
      expect(result).toContain('doctor');
    });
  });

  describe('asd --version', () => {
    it('should display version information', () => {
      const result = execSync(`node "${cliPath}" --version`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('asd init', () => {
    it('should initialize ASD project structure', () => {
      const result = execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('Initializing Agentic Spec Development');
      expect(result).toContain('Created configuration file');
      expect(result).toContain('Created directory structure');
      expect(result).toContain('ASD initialization complete');

      // Check that files and directories were created
      expect(fs.existsSync(path.join(testDir, 'asd.config.js'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'docs/specs/active'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'docs/specs/backlog'))).toBe(
        true
      );
      expect(fs.existsSync(path.join(testDir, 'docs/specs/done'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'docs/specs/template'))).toBe(
        true
      );
    });

    it('should create valid configuration file', () => {
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      const configPath = path.join(testDir, 'asd.config.js');
      const configContent = fs.readFileSync(configPath, 'utf-8');

      expect(configContent).toContain('module.exports = {');
      expect(configContent).toContain('featuresPath:');
      expect(configContent).toContain('supportedTypes:');
      expect(configContent).toContain('statusFolders:');

      // Verify the config can be loaded
      expect(() => require(configPath)).not.toThrow();
    });

    it('should handle init with custom type option', () => {
      const result = execSync(`node "${cliPath}" init --type spec`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('initialization complete');
    });

    it('should handle existing directory gracefully', () => {
      // Create directory first
      fs.mkdirSync(path.join(testDir, 'docs/specs/active'), {
        recursive: true,
      });

      const result = execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('initialization complete');
    });
  });

  describe('asd config', () => {
    it('should show default configuration when no config file exists', () => {
      const result = execSync(`node "${cliPath}" config`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('ASD Configuration');
      expect(result).toContain('Config file:');
      expect(result).toContain('Using defaults');
      expect(result).toContain('Project root:');
      expect(result).toContain('Specs path:');
      expect(result).toContain('Auto refresh:');
      expect(result).toContain('Supported types:');
      expect(result).toContain('Status folders:');
    });

    it('should show configuration from config file', () => {
      // Create config file first
      const configContent = `
        module.exports = {
          featuresPath: 'custom/specs',
          autoRefresh: false,
          supportedTypes: ['SPEC', 'CUSTOM']
        };
      `;
      fs.writeFileSync(path.join(testDir, 'asd.config.js'), configContent);

      const result = execSync(`node "${cliPath}" config`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('asd.config.js');
      expect(result).toContain('custom/specs');
      expect(result).toContain('disabled'); // autoRefresh: false
      expect(result).toContain('SPEC, CUSTOM');
    });

    it('should show project root correctly', () => {
      const result = execSync(`node "${cliPath}" config`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain(`Project root: ${testDir}`);
    });
  });

  describe('asd doctor', () => {
    it('should report missing directories', () => {
      const result = execSync(`node "${cliPath}" doctor`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('ASD Health Check');
      expect(result).toContain('Specs directory missing');
      expect(result).toContain('Status folder missing');
      expect(result).toContain('Some issues found');
    });

    it('should report healthy setup after init', () => {
      // Initialize first
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      const result = execSync(`node "${cliPath}" doctor`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('ASD Health Check');
      expect(result).toContain('Specs directory exists');
      expect(result).toContain('Status folder exists');
      expect(result).toContain('All checks passed');
    });

    it('should count specification files', () => {
      // Initialize and create some spec files
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      const specContent =
        '# Test Spec\n**Priority:** P1\n## Description\nTest spec.';
      fs.writeFileSync(
        path.join(testDir, 'docs/specs/active/SPEC-001-test.md'),
        specContent
      );
      fs.writeFileSync(
        path.join(testDir, 'docs/specs/backlog/BUG-001-test.md'),
        specContent
      );

      const result = execSync(`node "${cliPath}" doctor`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('Found 2 specification files');
    });

    it('should check dependencies', () => {
      // Initialize first to create directories
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      const result = execSync(`node "${cliPath}" doctor`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('terminal-kit dependency available');
    });

    it('should exit with error code when issues found', () => {
      try {
        execSync(`node "${cliPath}" doctor`, {
          encoding: 'utf-8',
          cwd: testDir,
        });
        expect(true).toBe(false); // Should have thrown an error
      } catch (error) {
        expect(error.status).toBe(1);
        expect(error.stdout.toString()).toContain('Some issues found');
      }
    });
  });

  describe('CLI options', () => {
    beforeEach(() => {
      // Initialize project for option tests
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });
    });

    it('should accept custom config path', () => {
      const customConfigContent = `
        module.exports = {
          featuresPath: 'custom/path',
          autoRefresh: false
        };
      `;
      fs.writeFileSync(
        path.join(testDir, 'custom.config.js'),
        customConfigContent
      );

      const result = execSync(
        `node "${cliPath}" config --config custom.config.js`,
        {
          encoding: 'utf-8',
          cwd: testDir,
        }
      );

      expect(result).toContain('custom.config.js');
      expect(result).toContain('custom/path');
    });

    it('should accept custom specs path', () => {
      const result = execSync(`node "${cliPath}" config --path custom/specs`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('custom/specs');
    });

    it('should accept no-auto-refresh option', () => {
      const result = execSync(`node "${cliPath}" config --no-auto-refresh`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('disabled');
    });

    it('should accept custom app name and icon', () => {
      const result = execSync(
        `node "${cliPath}" config --app-name "Custom ASD" --app-icon "🚀"`,
        {
          encoding: 'utf-8',
          cwd: testDir,
        }
      );

      // These options affect the application when started, not config output
      expect(result).toContain('ASD Configuration');
    });
  });

  describe('error handling', () => {
    it('should handle invalid commands gracefully', () => {
      try {
        execSync(`node "${cliPath}" invalid-command`, {
          encoding: 'utf-8',
          cwd: testDir,
        });
        expect(true).toBe(false); // Should have thrown an error
      } catch (error) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString() || error.stdout.toString()).toContain(
          'Unknown command'
        );
      }
    });

    it('should handle missing permissions gracefully', () => {
      // Create a read-only directory
      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444);

      try {
        execSync(`node "${cliPath}" init`, {
          encoding: 'utf-8',
          cwd: readOnlyDir,
        });
        expect(true).toBe(false); // Should have thrown an error
      } catch (error) {
        expect(error.status).toBe(1);
        expect(error.stdout.toString()).toContain('Initialization failed');
      } finally {
        // Cleanup: restore permissions
        fs.chmodSync(readOnlyDir, 0o755);
      }
    });

    it('should handle malformed config files', () => {
      // Create invalid config
      fs.writeFileSync(
        path.join(testDir, 'asd.config.js'),
        'invalid javascript'
      );

      const result = execSync(`node "${cliPath}" config`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('Using defaults');
    });
  });

  describe('integration with components', () => {
    beforeEach(() => {
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      // Create test spec files
      const specs = [
        {
          path: 'docs/specs/active/SPEC-001-auth.md',
          content:
            '# Authentication\n**Priority:** P0\n## Description\nAuth system.\n## Tasks\n### **TASK-001** 🤖 **Setup**',
        },
        {
          path: 'docs/specs/backlog/BUG-001-login.md',
          content:
            '# Login Bug\n**Priority:** P1\n**Severity:** High\n## Description\nLogin issue.',
        },
        {
          path: 'docs/specs/done/SPIKE-001-research.md',
          content:
            '# Research Spike\n**Priority:** P2\n**Research Type:** Performance\n## Description\nPerformance research.',
        },
      ];

      specs.forEach((spec) => {
        global.createTestFile(spec.path, spec.content);
      });
    });

    it('should work with ConfigManager', () => {
      const result = execSync(`node "${cliPath}" config`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('asd.config.js');
      expect(result).toContain('docs/specs');
    });

    it('should detect specs with doctor command', () => {
      const result = execSync(`node "${cliPath}" doctor`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('Found 3 specification files');
      expect(result).toContain('All checks passed');
    });
  });

  describe('start command and default behavior', () => {
    beforeEach(() => {
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });
    });

    it('should have start command in help', () => {
      const result = execSync(`node "${cliPath}" --help`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('start');
      expect(result).toContain('interactive ASD terminal interface');
    });

    // Note: We can't easily test the actual start command in unit tests
    // because it starts an interactive terminal session. This would be
    // better tested in integration tests with a headless terminal.
  });

  describe('debug mode', () => {
    beforeEach(() => {
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });
    });

    it('should accept debug flag', () => {
      // Debug flag should be accepted without error
      const result = execSync(`node "${cliPath}" config --debug`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      expect(result).toContain('ASD Configuration');
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple rapid command executions', () => {
      const commands = ['init', 'config', 'doctor'];

      // Run init first
      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      // Then run other commands rapidly
      const results = commands.slice(1).map((cmd) => {
        return execSync(`node "${cliPath}" ${cmd}`, {
          encoding: 'utf-8',
          cwd: testDir,
        });
      });

      expect(results.every((result) => result.includes('ASD'))).toBe(true);
    });

    it('should complete commands within reasonable time', () => {
      const start = Date.now();

      execSync(`node "${cliPath}" init`, {
        encoding: 'utf-8',
        cwd: testDir,
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
