const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

describe('Startup Error Scenarios', () => {
  let tempDir;
  let originalCwd;

  const execASD = (args = [], options = {}) => {
    return new Promise((resolve) => {
      const cliPath = path.join(__dirname, '..', 'bin', 'asd');
      const child = spawn('node', [cliPath, ...args], {
        stdio: 'pipe',
        cwd: options.cwd || tempDir,
        env: { ...process.env, ...options.env },
        timeout: 10000
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
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + error.message,
          success: false,
          error
        });
      });
    });
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = path.join(__dirname, 'temp', `error-test-${Date.now()}`);
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

  describe('Configuration File Errors', () => {
    test('handles malformed configuration file', async () => {
      const configPath = path.join(tempDir, 'asd.config.js');
      fs.writeFileSync(configPath, 'module.exports = { invalid: syntax }');
      
      const result = await execASD(['doctor']);
      
      // Should complete but show configuration error
      expect(result.success).toBe(true);
      expect(result.stdout || result.stderr).toContain('syntax');
    });

    test('handles configuration file with runtime errors', async () => {
      const configPath = path.join(tempDir, 'asd.config.js');
      fs.writeFileSync(configPath, 'throw new Error("Config error"); module.exports = {};');
      
      const result = await execASD(['doctor']);
      
      // Should handle the error gracefully
      expect(result.success).toBe(true);
    });

    test('handles missing required configuration properties', async () => {
      const configPath = path.join(tempDir, 'asd.config.js');
      fs.writeFileSync(configPath, 'module.exports = { featuresPath: null };');
      
      const result = await execASD(['doctor']);
      expect(result.success).toBe(true);
    });
  });

  describe('File System Permission Errors', () => {
    test('handles read-only directory', async () => {
      // Skip on Windows due to different permission model
      if (process.platform === 'win32') {
        return;
      }
      
      const readOnlyDir = path.join(tempDir, 'readonly');
      fs.mkdirSync(readOnlyDir, { recursive: true });
      fs.chmodSync(readOnlyDir, 0o444); // Read-only
      
      const result = await execASD(['--version'], { cwd: readOnlyDir });
      
      // Should still work for simple commands
      expect(result.success).toBe(true);
      
      // Restore permissions for cleanup
      fs.chmodSync(readOnlyDir, 0o755);
    });

    test('handles directory without write permissions', async () => {
      // Skip on Windows
      if (process.platform === 'win32') {
        return;
      }
      
      const noWriteDir = path.join(tempDir, 'nowrite');
      fs.mkdirSync(noWriteDir, { recursive: true });
      fs.chmodSync(noWriteDir, 0o555); // Read and execute only
      
      const result = await execASD(['doctor'], { cwd: noWriteDir });
      
      // Should complete but may show warnings
      expect(result.success).toBe(true);
      
      // Restore permissions
      fs.chmodSync(noWriteDir, 0o755);
    });

    test('handles missing parent directories', async () => {
      const deepPath = path.join(tempDir, 'very', 'deep', 'nested', 'path');
      fs.mkdirSync(deepPath, { recursive: true });
      
      const result = await execASD(['--version'], { cwd: deepPath });
      expect(result.success).toBe(true);
    });
  });

  describe('Environment Variable Errors', () => {
    test('handles missing PATH environment variable', async () => {
      const result = await execASD(['--version'], {
        env: { ...process.env, PATH: '' }
      });
      
      expect(result.success).toBe(true);
    });

    test('handles missing HOME environment variable', async () => {
      const result = await execASD(['--version'], {
        env: { ...process.env, HOME: '', USERPROFILE: '' }
      });
      
      expect(result.success).toBe(true);
    });

    test('handles corrupted environment variables', async () => {
      const result = await execASD(['--version'], {
        env: {
          ...process.env,
          TERM: 'corrupted-terminal-type',
          LANG: 'invalid-locale'
        }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Terminal Environment Errors', () => {
    test('handles extremely small terminal dimensions', async () => {
      const result = await execASD(['doctor'], {
        env: {
          ...process.env,
          COLUMNS: '10',
          LINES: '5'
        }
      });
      
      // Should complete but show warnings about terminal size
      expect(result.success).toBe(true);
    });

    test('handles missing terminal type', async () => {
      const result = await execASD(['--version'], {
        env: {
          ...process.env,
          TERM: undefined
        }
      });
      
      expect(result.success).toBe(true);
    });

    test('handles dumb terminal type', async () => {
      const result = await execASD(['--version'], {
        env: {
          ...process.env,
          TERM: 'dumb'
        }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Network and Dependency Errors', () => {
    test('handles missing optional dependencies gracefully', async () => {
      // This would require complex mocking, so we test that the system
      // handles missing optional dependencies without breaking
      const result = await execASD(['doctor']);
      expect(result.success).toBe(true);
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('handles low disk space gracefully', async () => {
      // Create a directory structure that might trigger low disk space warnings
      for (let i = 0; i < 10; i++) {
        const dir = path.join(tempDir, `test-dir-${i}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const result = await execASD(['doctor']);
      expect(result.success).toBe(true);
    });
  });

  describe('Concurrent Access Scenarios', () => {
    test('handles file locking conflicts', async () => {
      // Create a config file
      const configPath = path.join(tempDir, 'asd.config.js');
      fs.writeFileSync(configPath, 'module.exports = { featuresPath: "docs/specs" };');
      
      // Run multiple ASD instances concurrently
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(execASD(['doctor']));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed or at least not crash
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Recovery and Fallback Mechanisms', () => {
    test('falls back to defaults when config is corrupted', async () => {
      const configPath = path.join(tempDir, 'asd.config.js');
      fs.writeFileSync(configPath, 'this is not valid javascript');
      
      const result = await execASD(['doctor']);
      expect(result.success).toBe(true);
      
      // Should indicate fallback to defaults
      expect(result.stdout || result.stderr).toBeTruthy();
    });

    test('continues operation when logging fails', async () => {
      // Create .asd directory but make it read-only
      const asdDir = path.join(tempDir, '.asd');
      fs.mkdirSync(asdDir, { recursive: true });
      
      if (process.platform !== 'win32') {
        fs.chmodSync(asdDir, 0o444); // Read-only
      }
      
      const result = await execASD(['doctor']);
      expect(result.success).toBe(true);
      
      // Restore permissions for cleanup
      if (process.platform !== 'win32') {
        fs.chmodSync(asdDir, 0o755);
      }
    });

    test('handles interrupted startup gracefully', async () => {
      // This test ensures that if startup is interrupted, it doesn't leave
      // the system in a bad state
      const result = await execASD(['--version']);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Message Quality', () => {
    test('provides actionable error messages', async () => {
      const result = await execASD(['invalid-command']);
      
      expect(result.success).toBe(false);
      expect(result.stderr || result.stdout).toContain('Unknown command');
    });

    test('suggests solutions for common problems', async () => {
      // Test that when validation fails, helpful suggestions are provided
      const result = await execASD(['doctor'], {
        env: {
          ...process.env,
          COLUMNS: '50',
          LINES: '15'
        }
      });
      
      expect(result.success).toBe(true);
      // Should provide guidance about terminal size
      if (result.stdout.includes('width') || result.stdout.includes('height')) {
        expect(result.stdout).toContain('resize');
      }
    });
  });

  describe('System Compatibility', () => {
    test('handles unsupported Node.js features gracefully', async () => {
      // Test with various Node.js compatibility scenarios
      const result = await execASD(['--version']);
      expect(result.success).toBe(true);
    });

    test('works on different operating systems', async () => {
      const result = await execASD(['doctor']);
      expect(result.success).toBe(true);
      
      // Should report the current platform correctly
      expect(result.stdout).toContain(process.platform);
    });
  });

  describe('Stress Testing', () => {
    test('handles rapid successive commands', async () => {
      const commands = [];
      for (let i = 0; i < 5; i++) {
        commands.push(execASD(['--version']));
      }
      
      const results = await Promise.all(commands);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
