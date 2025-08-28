// Using Jest assertions instead of Chai
// const { expect } = require('chai');
const GitWorkflowOrchestrator = require('../../lib/automation/git-workflow-orchestrator');
const ConfigManager = require('../../lib/config/config-manager');

describe('GitWorkflowOrchestrator', () => {
  let orchestrator;
  let configManager;

  beforeEach(() => {
    configManager = new ConfigManager();
    orchestrator = new GitWorkflowOrchestrator(configManager, {
      enableFileTracking: false, // Disable for testing
      enableLinting: false,
      enableTesting: false
    });
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      expect(orchestrator).toBeInstanceOf(GitWorkflowOrchestrator);
      expect(orchestrator.options).toEqual(expect.any(Object));
      expect(orchestrator.isRunning).toBe(false);
    });

    it('should have correct subsystem initialization status', () => {
      const status = orchestrator.getInitializationStatus();
      expect(status).to.be.an('array');
      expect(status).to.include('GitIntegration');
    });
  });

  describe('workflow execution', () => {
    it('should reject execution when already running', async () => {
      orchestrator.isRunning = true;
      const result = await orchestrator.executeWorkflow();
      expect(result.success).to.be.false;
      expect(result.error).to.include('already running');
    });

    it('should execute minimal workflow with dry run', async () => {
      const result = await orchestrator.executeWorkflow({
        dryRun: true,
        skipLinting: true,
        skipTesting: true,
        skipCommit: true
      });
      expect(result).to.be.an('object');
      expect(result).to.have.property('success');
    });
  });

  describe('error handling', () => {
    it('should handle invalid configuration gracefully', () => {
      expect(() => {
        new GitWorkflowOrchestrator(null);
      }).to.throw();
    });
  });
});
