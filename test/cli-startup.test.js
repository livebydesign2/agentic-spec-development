const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('CLI Startup Integration', () => {
  let tempDir;
  let originalCwd;

  // Helper function to execute ASD CLI commands
  const execASD = (args = [], options = {}) => {
    return new Promise((resolve, reject) => {
      const cliPath = path.join(__dirname, '..', 'bin', 'asd');
      const child = spawn('node', [cliPath, ...args], {
        stdio: 'pipe',
        timeout: 10000, // 10 second timeout
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Kill process after timeout
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
          reject(new Error('Process timeout'));
        }
      }, options.timeout || 10000);
    });
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = path.join(__dirname, 'temp', `cli-startup-test-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup ${tempDir}:`, error.message);
      }
    }
  });

  describe('Basic CLI Commands', () => {
    test('displays help information', async () => {
      const result = await execASD(['--help']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('asd');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('Commands:');
    });

    test('displays version information', async () => {
      const result = await execASD(['--version']);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    test('handles invalid commands gracefully', async () => {
      const result = await execASD(['invalid-command'], { timeout: 5000 });

      expect(result.success).toBe(false);
      expect(result.stderr || result.stdout).toMatch(/Unknown command|error|invalid/i);
    });
  });

  describe('Doctor Command', () => {
    test('runs doctor command successfully', async () => {
      const result = await execASD(['doctor'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Environment validation');
    });

    test('doctor command with verbose flag', async () => {
      const result = await execASD(['doctor', '--verbose'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Environment validation');
    });

    test('doctor command with performance flag', async () => {
      const result = await execASD(['doctor', '--performance'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Environment validation');
    });

    test('doctor command with report flag', async () => {
      const result = await execASD(['doctor', '--report'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Environment validation');
    });
  });

  describe('Validate-Startup Command', () => {
    test('runs validate-startup successfully', async () => {
      const result = await execASD(['validate-startup'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/validation|environment|ready/i);
    });

    test('validate-startup with debug flag', async () => {
      const result = await execASD(['validate-startup', '--debug'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/validation|environment|ready/i);
    });

    test('validate-startup with performance flag', async () => {
      const result = await execASD(['validate-startup', '--performance'], { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/validation|environment|ready|performance/i);
    });
  });

  describe('Startup Performance', () => {
    test('CLI startup completes within performance requirements', async () => {
      const startTime = Date.now();
      const result = await execASD(['--version']);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // Under 2 seconds requirement
    });

    test('help command performance', async () => {
      const startTime = Date.now();
      const result = await execASD(['--help']);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // Under 2 seconds
    });

    test('doctor command performance', async () => {
      const startTime = Date.now();
      const result = await execASD(['doctor'], { cwd: tempDir });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Doctor can take a bit longer
    });
  });

  describe('Environment Scenarios', () => {
    test('works in empty directory', async () => {
      const result = await execASD(['--version'], { cwd: tempDir });

      expect(result.success).toBe(true);
    });

    test('works with limited terminal size', async () => {
      const result = await execASD(['--version'], {
        cwd: tempDir,
        env: { COLUMNS: '40', LINES: '10' }
      });

      expect(result.success).toBe(true);
    });

    test('works in non-TTY environment', async () => {
      // This test simulates running in CI/automation
      const result = await execASD(['--version'], {
        cwd: tempDir,
        env: { CI: 'true' }
      });

      expect(result.success).toBe(true);
    });

    test('handles missing config gracefully', async () => {
      const result = await execASD(['doctor'], { cwd: tempDir });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    test('handles corrupted config file', async () => {
      // Create corrupted config
      const configPath = path.join(tempDir, 'asd.config.js');
      fs.writeFileSync(configPath, 'invalid javascript syntax {');

      const result = await execASD(['doctor'], { cwd: tempDir });

      // Should complete but may show warnings
      expect(result.success).toBe(true);
    });

    test('handles permission issues gracefully', async () => {
      // Skip on Windows due to different permission model
      if (process.platform === 'win32') {
        expect(true).toBe(true); // Skip test on Windows
        return;
      }

      // Create read-only directory
      const readOnlyDir = path.join(tempDir, 'readonly');
      fs.mkdirSync(readOnlyDir, { recursive: true });

      try {
        fs.chmodSync(readOnlyDir, 0o444); // Read-only

        const result = await execASD(['--version'], { cwd: readOnlyDir });

        // Should still work for simple commands
        expect(result.success).toBe(true);
      } finally {
        // Restore permissions for cleanup
        fs.chmodSync(readOnlyDir, 0o755);
      }
    });
  });

  describe('Global Installation Simulation', () => {
    test('handles missing global installation gracefully', async () => {
      try {
        const result = await execASD(['--version'], {
          cwd: tempDir,
          env: { ...process.env, PATH: '/usr/bin:/bin' } // Minimal PATH without npm global
        });

        expect(result.success).toBe(true);
      } catch (error) {
        // If the command fails due to missing node/npm in PATH, that's expected
        expect(error.message).toMatch(/ENOENT|PATH/);
      }
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('detects platform correctly', async () => {
      const result = await execASD(['doctor', '--verbose'], { cwd: tempDir });

      expect(result.success).toBe(true);
      // Platform should be mentioned somewhere in the output
      expect(result.stdout).toMatch(/platform|darwin|linux|win32|system/i);
    });

    test('handles platform-specific terminal features', async () => {
      const result = await execASD(['validate-startup'], { cwd: tempDir });

      expect(result.success).toBe(true);
    });
  });

  describe('Regression Tests', () => {
    test('all basic commands still work after startup improvements', async () => {
      const commands = [
        ['--help'],
        ['--version'],
        ['doctor'],
        ['validate-startup']
      ];

      for (const command of commands) {
        const result = await execASD(command, { cwd: tempDir });
        expect(result.success).toBe(true);
      }
    });

    test('startup validation does not break existing functionality', async () => {
      // Create a basic ASD project structure
      const dirs = ['docs/specs/active', 'docs/specs/backlog', 'docs/specs/done'];
      dirs.forEach(dir => {
        fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
      });

      // Create a sample spec file
      const specContent = `---
id: TEST-001
title: Test Specification
type: SPEC
status: active
---

# Test Specification

This is a test specification.`;
      fs.writeFileSync(path.join(tempDir, 'docs/specs/active/TEST-001.md'), specContent);

      const result = await execASD(['doctor'], { cwd: tempDir });
      expect(result.success).toBe(true);
    });
  });

  describe('Startup Logging Validation', () => {
    test('creates startup logs when possible', async () => {
      // Create project structure that allows logging
      fs.mkdirSync(path.join(tempDir, '.asd', 'logs'), { recursive: true });

      const result = await execASD(['doctor'], { cwd: tempDir });
      expect(result.success).toBe(true);

      // Check if log file was created (may not exist if logging is disabled in tests)
      const logFile = path.join(tempDir, '.asd', 'logs', 'startup.log');
      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf-8');
        expect(logContent).toBeTruthy();
      }
    });
  });
});
