// Jest configuration specifically for startup testing
module.exports = {
  // Basic configuration
  testEnvironment: "node",

  // Test matching patterns for startup tests
  testMatch: ["**/test/startup*.test.js", "**/test/cli-startup.test.js"],

  // Test setup
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],

  // Coverage configuration
  collectCoverageFrom: [
    "lib/startup-validator.js",
    "!**/node_modules/**",
    "!**/test/**",
  ],

  // Coverage thresholds for startup-related code
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    "./lib/startup-validator.js": {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Timeout configuration for startup tests
  testTimeout: 30000,

  // Performance and reliability settings
  maxWorkers: 2, // Limit workers to avoid resource contention during startup tests

  // Verbose output for CI
  verbose: process.env.CI === "true",

  // Reporter configuration
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "test-results",
        outputName: "startup-test-results.xml",
      },
    ],
  ],

  // Module resolution for startup tests
  moduleDirectories: ["node_modules", "lib"],

  // Transform configuration
  transform: {},

  // Global variables for startup tests
  globals: {
    STARTUP_TEST_MODE: true,
  },

  // Test result processor for performance monitoring
  testResultsProcessor: "<rootDir>/test/startup-results-processor.js",
};
