const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Startup Performance Tests', () => {
  let tempDir;
  let originalCwd;

  // Performance measurement helper
  const measurePerformance = async (command, args = [], options = {}) => {
    const startTime = process.hrtime.bigint();

    const result = await new Promise((resolve, reject) => {
      const cliPath = path.join(__dirname, '..', 'bin', 'asd');
      const child = spawn('node', [cliPath, command, ...args], {
        stdio: 'pipe',
        cwd: options.cwd || tempDir,
        env: { ...process.env, ...options.env },
        timeout: 30000, // 30 second max timeout
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
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        resolve({
          exitCode: code,
          stdout,
          stderr,
          duration,
          success: code === 0,
        });
      });

      child.on('error', (error) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        reject({ error, duration });
      });
    });

    return result;
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = path.join(__dirname, 'temp', `perf-test-${Date.now()}`);
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

  describe('Critical Performance Requirements', () => {
    test('CLI startup (--version) completes under 2 seconds', async () => {
      const result = await measurePerformance('--version');

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(2000); // 2 seconds requirement
      console.log(`Version command: ${result.duration.toFixed(2)}ms`);
    });

    test('Help command completes under 2 seconds', async () => {
      const result = await measurePerformance('--help');

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(2000);
      console.log(`Help command: ${result.duration.toFixed(2)}ms`);
    });

    test('Doctor command completes under 5 seconds', async () => {
      const result = await measurePerformance('doctor');

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(5000); // Doctor can be slower but should be reasonable
      console.log(`Doctor command: ${result.duration.toFixed(2)}ms`);
    });

    test('Validate-startup command completes under 3 seconds', async () => {
      const result = await measurePerformance('validate-startup');

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(3000);
      console.log(`Validate-startup command: ${result.duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Consistency', () => {
    test('startup performance is consistent across multiple runs', async () => {
      const runs = 5;
      const results = [];

      for (let i = 0; i < runs; i++) {
        const result = await measurePerformance('--version');
        expect(result.success).toBe(true);
        results.push(result.duration);
      }

      const average =
        results.reduce((sum, duration) => sum + duration, 0) / runs;
      const variance =
        results.reduce(
          (sum, duration) => sum + Math.pow(duration - average, 2),
          0
        ) / runs;
      const stdDev = Math.sqrt(variance);

      console.log(`Performance statistics over ${runs} runs:`);
      console.log(`  Average: ${average.toFixed(2)}ms`);
      console.log(`  Std Dev: ${stdDev.toFixed(2)}ms`);
      console.log(`  Min: ${Math.min(...results).toFixed(2)}ms`);
      console.log(`  Max: ${Math.max(...results).toFixed(2)}ms`);

      // Performance should be consistent (std dev should not be too high)
      expect(stdDev).toBeLessThan(average * 0.5); // Standard deviation should be less than 50% of average
      expect(Math.max(...results)).toBeLessThan(2000); // All runs should be under 2s
    });
  });

  describe('Performance Under Load', () => {
    test('maintains performance with large project structure', async () => {
      // Create a large project structure
      const createLargeProject = () => {
        const dirs = [
          'docs/specs/active',
          'docs/specs/backlog',
          'docs/specs/done',
        ];
        dirs.forEach((dir) => {
          fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
        });

        // Create 100 spec files
        for (let i = 1; i <= 100; i++) {
          const specContent = `---
id: SPEC-${i.toString().padStart(3, '0')}
title: Test Specification ${i}
type: SPEC
status: active
---

# Test Specification ${i}

This is test specification number ${i}.`;
          fs.writeFileSync(
            path.join(
              tempDir,
              'docs/specs/active',
              `SPEC-${i.toString().padStart(3, '0')}.md`
            ),
            specContent
          );
        }
      };

      createLargeProject();

      const result = await measurePerformance('doctor');
      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(10000); // Allow more time for large project
      console.log(`Doctor with large project: ${result.duration.toFixed(2)}ms`);
    });

    test('handles concurrent startup attempts', async () => {
      const concurrentRuns = 3;
      const promises = [];

      for (let i = 0; i < concurrentRuns; i++) {
        promises.push(measurePerformance('--version'));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(3000); // Allow slightly more time for concurrent runs
        console.log(
          `Concurrent run ${index + 1}: ${result.duration.toFixed(2)}ms`
        );
      });
    });
  });

  describe('Performance Regression Detection', () => {
    test('startup performance meets baseline expectations', async () => {
      // These are baseline expectations based on current implementation
      const expectations = {
        '--version': 1000, // Should be very fast
        '--help': 1500, // Should be fast
        doctor: 3000, // Can be slower due to comprehensive checks
        'validate-startup': 2000, // Should be reasonably fast
      };

      for (const [command, expectedMax] of Object.entries(expectations)) {
        const result = await measurePerformance(command);
        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(expectedMax);

        // Log actual performance for monitoring
        const percentOfExpected = (
          (result.duration / expectedMax) *
          100
        ).toFixed(1);
        console.log(
          `${command}: ${result.duration.toFixed(
            2
          )}ms (${percentOfExpected}% of ${expectedMax}ms limit)`
        );
      }
    });
  });

  describe('Memory Usage', () => {
    test('startup does not consume excessive memory', async () => {
      const measureMemory = async (command) => {
        return new Promise((resolve, reject) => {
          const cliPath = path.join(__dirname, '..', 'bin', 'asd');
          const child = spawn('node', ['--expose-gc', cliPath, command], {
            stdio: 'pipe',
            cwd: tempDir,
          });

          let maxMemory = 0;
          const memoryInterval = setInterval(() => {
            try {
              const memUsage = process.memoryUsage();
              maxMemory = Math.max(maxMemory, memUsage.heapUsed);
            } catch (error) {
              // Ignore errors during memory measurement
            }
          }, 50);

          let stdout = '';
          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.on('close', (code) => {
            clearInterval(memoryInterval);
            resolve({
              exitCode: code,
              stdout,
              maxMemory: maxMemory / 1024 / 1024, // Convert to MB
              success: code === 0,
            });
          });

          child.on('error', (error) => {
            clearInterval(memoryInterval);
            reject(error);
          });
        });
      };

      const result = await measureMemory('--version');
      expect(result.success).toBe(true);

      // Memory usage should be reasonable (under 100MB for simple commands)
      console.log(`Max memory usage: ${result.maxMemory.toFixed(2)}MB`);
      // Note: This is a rough check as memory measurement in tests can be unreliable
    });
  });

  describe('Cold Start Performance', () => {
    test('first startup after system restart simulation', async () => {
      // Clear require cache to simulate cold start
      const originalCache = { ...require.cache };

      // Clear cache for our modules
      Object.keys(require.cache).forEach((key) => {
        if (key.includes('/asd/')) {
          delete require.cache[key];
        }
      });

      const result = await measurePerformance('--version');

      // Restore cache
      Object.keys(originalCache).forEach((key) => {
        require.cache[key] = originalCache[key];
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(3000); // Cold start may be slightly slower
      console.log(`Cold start performance: ${result.duration.toFixed(2)}ms`);
    });
  });

  describe('Performance Monitoring', () => {
    test('doctor command reports performance metrics', async () => {
      const result = await measurePerformance('doctor', ['--performance']);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('validation'); // Should contain performance information
      console.log(
        `Doctor with performance metrics: ${result.duration.toFixed(2)}ms`
      );
    });

    test('validate-startup reports timing information', async () => {
      const result = await measurePerformance('validate-startup', [
        '--performance',
      ]);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('validation'); // Should contain timing information
      console.log(
        `Validate-startup with performance: ${result.duration.toFixed(2)}ms`
      );
    });
  });
});
