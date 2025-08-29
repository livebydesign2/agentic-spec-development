const fs = require('fs');
const path = require('path');
const StartupValidator = require('../lib/startup-validator');

describe('Startup Validation System', () => {
  let tempDir;
  let originalCwd;
  let originalEnv;

  beforeEach(() => {
    // Save original state
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Create temporary test directory
    tempDir = path.join(__dirname, 'temp', `startup-test-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Restore original state
    process.chdir(originalCwd);
    process.env = originalEnv;

    // Cleanup test directory
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup ${tempDir}:`, error.message);
      }
    }
  });

  describe('StartupValidator Class', () => {
    describe('Node.js Version Validation', () => {
      test('validates current Node.js version correctly', async () => {
        const validator = new StartupValidator();
        const result = validator.validateNodeVersion();

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);

        // Should pass for current Node version (>=16)
        expect(result.valid).toBe(true);
      });

      test('handles version parsing errors gracefully', () => {
        const validator = new StartupValidator();
        const originalVersion = process.version;

        try {
          // Mock invalid version
          Object.defineProperty(process, 'version', {
            value: 'invalid-version',
            configurable: true
          });

          const result = validator.validateNodeVersion();
          // The validator should handle parsing errors gracefully
          expect(result).toHaveProperty('valid');
          expect(result).toHaveProperty('errors');
          expect(result).toHaveProperty('warnings');

          // Should either fail validation or handle gracefully
          if (!result.valid) {
            expect(result.errors.length).toBeGreaterThan(0);
          }
        } finally {
          // Restore original version
          Object.defineProperty(process, 'version', {
            value: originalVersion,
            configurable: true
          });
        }
      });
    });

    describe('Terminal Capabilities Validation', () => {
      test('validates terminal capabilities', async () => {
        const validator = new StartupValidator();
        const result = await validator.validateTerminalCapabilities();

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(result.valid).toBe(true);
      });

      test('handles non-TTY environment', async () => {
        const validator = new StartupValidator();
        const originalIsTTY = process.stdout.isTTY;

        // Mock non-TTY environment
        process.stdout.isTTY = false;

        const result = await validator.validateTerminalCapabilities();
        expect(result.warnings.some(w => w.includes('TTY'))).toBe(true);

        // Restore original
        process.stdout.isTTY = originalIsTTY;
      });

      test('validates terminal dimensions', async () => {
        const validator = new StartupValidator();
        const originalColumns = process.stdout.columns;
        const originalRows = process.stdout.rows;

        // Mock small terminal
        process.stdout.columns = 40;
        process.stdout.rows = 10;

        const result = await validator.validateTerminalCapabilities();
        expect(result.warnings.some(w => w.includes('width'))).toBe(true);
        expect(result.warnings.some(w => w.includes('height'))).toBe(true);

        // Restore original
        process.stdout.columns = originalColumns;
        process.stdout.rows = originalRows;
      });
    });

    describe('Dependencies Validation', () => {
      test('validates critical dependencies are available', async () => {
        const validator = new StartupValidator();
        const result = await validator.validateDependencies();

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');

        // Should pass in normal environment
        expect(result.valid).toBe(true);
      });

      test('handles missing dependencies gracefully', async () => {
        const validator = new StartupValidator();
        const originalResolve = require.resolve;

        try {
          // Mock missing dependency
          require.resolve = jest.fn().mockImplementation((id) => {
            if (id === 'terminal-kit') {
              const error = new Error('Cannot resolve module');
              error.code = 'MODULE_NOT_FOUND';
              throw error;
            }
            return originalResolve.call(require, id);
          });

          const result = await validator.validateDependencies();
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('terminal-kit'))).toBe(true);
        } finally {
          // Restore original
          require.resolve = originalResolve;
        }
      });
    });

    describe('Project Structure Validation', () => {
      test('validates ASD project structure', () => {
        const validator = new StartupValidator({ cwd: tempDir });

        // Create ASD project structure
        const dirs = ['docs/specs/active', 'docs/specs/backlog', 'docs/specs/done'];
        dirs.forEach(dir => {
          fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
        });

        const result = validator.validateProjectStructure();
        expect(result.valid).toBe(true);
      });

      test('handles missing project structure gracefully', () => {
        const validator = new StartupValidator({ cwd: tempDir });
        const result = validator.validateProjectStructure();

        expect(result.warnings.some(w => w.includes('No ASD project structure'))).toBe(true);
      });

      test('validates configuration file', () => {
        const validator = new StartupValidator({ cwd: tempDir });

        // Create valid config
        const configPath = path.join(tempDir, 'asd.config.js');
        fs.writeFileSync(configPath, 'module.exports = { featuresPath: "docs/specs" };');

        const result = validator.validateProjectStructure();
        expect(result.valid).toBe(true);
      });

      test('handles corrupted configuration file', () => {
        const validator = new StartupValidator({ cwd: tempDir });

        // Create invalid config
        const configPath = path.join(tempDir, 'asd.config.js');
        fs.writeFileSync(configPath, 'invalid javascript syntax {');

        const result = validator.validateProjectStructure();
        // Should detect syntax errors in config file
        expect(result.errors.length > 0 || result.warnings.some(w => w.includes('syntax'))).toBe(true);
      });
    });

    describe('File System Permissions Validation', () => {
      test('validates file system permissions', async () => {
        const validator = new StartupValidator({ cwd: tempDir });
        const result = await validator.validateFileSystemPermissions();

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
      });

      test('handles permission errors gracefully', async () => {
        // Skip on Windows due to different permission model
        if (process.platform === 'win32') {
          return;
        }

        const validator = new StartupValidator({ cwd: '/root' });
        const result = await validator.validateFileSystemPermissions();

        // May have permission warnings/errors for restricted directories
        expect(result).toHaveProperty('valid');
      });
    });

    describe('Terminal Size Validation', () => {
      test('validates minimum terminal size requirements', () => {
        const validator = new StartupValidator();
        const originalColumns = process.stdout.columns;
        const originalRows = process.stdout.rows;

        // Mock adequate terminal size
        process.stdout.columns = 120;
        process.stdout.rows = 30;

        const result = validator.validateTerminalSize();
        expect(result.valid).toBe(true);

        // Restore original
        process.stdout.columns = originalColumns;
        process.stdout.rows = originalRows;
      });

      test('fails validation for too small terminal', () => {
        const validator = new StartupValidator();
        const originalColumns = process.stdout.columns;
        const originalRows = process.stdout.rows;

        // Mock too small terminal
        process.stdout.columns = 50;
        process.stdout.rows = 15;

        const result = validator.validateTerminalSize();
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('width'))).toBe(true);
        expect(result.errors.some(e => e.includes('height'))).toBe(true);

        // Restore original
        process.stdout.columns = originalColumns;
        process.stdout.rows = originalRows;
      });
    });

    describe('CLI Environment Validation', () => {
      test('validates CLI environment', () => {
        const validator = new StartupValidator();
        const result = validator.validateCLIEnvironment();

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
      });
    });

    describe('Comprehensive Environment Validation', () => {
      test('performs full environment validation', async () => {
        const validator = new StartupValidator({ cwd: tempDir });
        const result = await validator.validateEnvironment();

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('metrics');

        expect(result.metrics).toHaveProperty('validationTime');
        expect(result.metrics).toHaveProperty('phases');
        expect(typeof result.metrics.validationTime).toBe('number');
        expect(result.metrics.validationTime).toBeLessThan(2000); // Under 2 seconds

        // Should pass in clean test environment
        expect(result.valid).toBe(true);
      });

      test('measures validation performance', async () => {
        const validator = new StartupValidator({ cwd: tempDir });
        const startTime = Date.now();
        const result = await validator.validateEnvironment();
        const endTime = Date.now();

        expect(result.metrics.validationTime).toBeLessThan(500); // Should be fast
        expect(endTime - startTime).toBeLessThan(1000); // Total time under 1 second

        // Check individual phase performance
        Object.values(result.metrics.phases).forEach(phaseTime => {
          expect(phaseTime).toBeLessThan(200); // Each phase should be fast
        });
      });
    });

    describe('Performance Analysis', () => {
      test('analyzes startup performance', () => {
        const validator = new StartupValidator();
        const mockMetrics = {
          validationTime: 100,
          phases: {
            nodeValidation: 5,
            terminalValidation: 10,
            dependencyValidation: 25,
            projectValidation: 15,
            permissionsValidation: 30,
            terminalSizeValidation: 5,
            cliEnvironmentValidation: 10
          }
        };

        const analysis = validator.analyzePerformance(mockMetrics);

        expect(analysis).toHaveProperty('overall');
        expect(analysis).toHaveProperty('slowPhases');
        expect(analysis).toHaveProperty('recommendations');
        expect(analysis.overall).toBe('good');
      });

      test('identifies slow phases', () => {
        const validator = new StartupValidator();
        const mockMetrics = {
          validationTime: 600,
          phases: {
            nodeValidation: 5,
            terminalValidation: 10,
            dependencyValidation: 200, // Slow phase
            projectValidation: 15,
            permissionsValidation: 300, // Slow phase
            terminalSizeValidation: 5,
            cliEnvironmentValidation: 10
          }
        };

        const analysis = validator.analyzePerformance(mockMetrics);

        expect(analysis.overall).toBe('slow');
        expect(analysis.slowPhases.length).toBe(2);
        expect(analysis.recommendations.length).toBeGreaterThan(0);
      });
    });

    describe('Startup Logging', () => {
      test('logs startup attempts', async () => {
        const validator = new StartupValidator({ cwd: tempDir });
        const result = await validator.validateEnvironment();

        // Create .asd/logs directory for logging test
        fs.mkdirSync(path.join(tempDir, '.asd', 'logs'), { recursive: true });

        // Manually call logStartupAttempt to test logging
        validator.logStartupAttempt(result);

        // Give it a moment for async logging
        await new Promise(resolve => setTimeout(resolve, 100));

        const logFile = path.join(tempDir, '.asd', 'logs', 'startup.log');
        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, 'utf-8');
          expect(logContent).toContain('timestamp');
          expect(logContent).toContain('success');
        }
      });

      test('handles logging failures gracefully', async () => {
        // Use a directory we can't write to
        const validator = new StartupValidator({ cwd: '/root' });
        const result = await validator.validateEnvironment();

        // This should not throw even if logging fails
        expect(() => validator.logStartupAttempt(result)).not.toThrow();
      });
    });

    describe('Report Generation', () => {
      test('generates comprehensive startup report', async () => {
        const validator = new StartupValidator({ cwd: tempDir });
        const result = await validator.validateEnvironment();
        const report = validator.generateStartupReport(result);

        expect(report).toHaveProperty('status');
        expect(report).toHaveProperty('validationTime');
        expect(report).toHaveProperty('errorCount');
        expect(report).toHaveProperty('warningCount');
        expect(report).toHaveProperty('performance');
        expect(report).toHaveProperty('environment');

        expect(report.status).toBe('SUCCESS');
        expect(typeof report.validationTime).toBe('number');
        expect(report.environment.nodeVersion).toBe(process.version);
      });
    });
  });
});
