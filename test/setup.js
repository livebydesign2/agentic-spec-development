// Global test setup for ASD CLI tests

const fs = require('fs');
const path = require('path');

// Suppress console output during tests unless DEBUG_TESTS is set
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };
}

// Create temporary test directory structure
global.TEST_DIR = path.join(__dirname, 'temp');
global.FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Cleanup function for tests
global.cleanupTestDir = () => {
  if (fs.existsSync(global.TEST_DIR)) {
    try {
      // Try to change to a safe directory first
      process.chdir('/tmp');
      fs.rmSync(global.TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // If that fails, try alternative cleanup
      try {
        const files = fs.readdirSync(global.TEST_DIR);
        for (const file of files) {
          const filePath = path.join(global.TEST_DIR, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
        fs.rmSync(global.TEST_DIR, { recursive: true, force: true });
      } catch (innerError) {
        console.warn('Could not cleanup test directory:', innerError.message);
      }
    }
  }
};

// Setup function for tests
global.setupTestDir = () => {
  global.cleanupTestDir();
  fs.mkdirSync(global.TEST_DIR, { recursive: true });

  // Create basic directory structure
  const dirs = [
    'docs/specs/active',
    'docs/specs/backlog',
    'docs/specs/done',
    'docs/specs/template',
  ];

  dirs.forEach((dir) => {
    fs.mkdirSync(path.join(global.TEST_DIR, dir), { recursive: true });
  });
};

// Utility function to create test files
global.createTestFile = (relativePath, content) => {
  const fullPath = path.join(global.TEST_DIR, relativePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
};

// Utility function to read fixture files
global.readFixture = (fixtureName) => {
  const fixturePath = path.join(global.FIXTURES_DIR, fixtureName);
  return fs.readFileSync(fixturePath, 'utf-8');
};

// Mock terminal-kit for tests
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

// Clean up after all tests
afterAll(() => {
  global.cleanupTestDir();
});
