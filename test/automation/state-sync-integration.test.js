const path = require('path');
const fs = require('fs').promises;

const AutomatedStateSync = require('../../lib/automation/automated-state-sync');
const ConfigManager = require('../../lib/config-manager');

describe('State Synchronization Integration Tests', () => {
  let automatedStateSync;
  let configManager;
  let mockWorkflowStateManager;
  let mockFrontmatterSync;

  beforeAll(async () => {
    // Create test configuration
    configManager = new ConfigManager(path.join(__dirname, '../'));
    
    // Mock WorkflowStateManager
    mockWorkflowStateManager = {
      initialize: jest.fn().mockResolvedValue(true),
      loadState: jest.fn().mockResolvedValue({}),
      saveState: jest.fn().mockResolvedValue(true),
      assignTask: jest.fn().mockResolvedValue({ success: true }),
      completeTask: jest.fn().mockResolvedValue({ success: true }),
      updateSpecFrontmatter: jest.fn().mockResolvedValue({ success: true }),
      syncSpecState: jest.fn().mockResolvedValue({ success: true }),
      updateProjectProgress: jest.fn().mockResolvedValue({})
    };

    // Mock FrontmatterSync
    mockFrontmatterSync = {
      initialize: jest.fn().mockResolvedValue(true),
      updateSpecFrontmatter: jest.fn().mockResolvedValue({ success: true }),
      batchUpdateSpecs: jest.fn().mockResolvedValue({ success: true })
    };

    // Create AutomatedStateSync instance
    automatedStateSync = new AutomatedStateSync(
      configManager,
      mockWorkflowStateManager,
      mockFrontmatterSync
    );
  });

  afterAll(async () => {
    if (automatedStateSync && automatedStateSync.isRunning) {
      await automatedStateSync.shutdown();
    }
  });

  describe('System Initialization', () => {
    test('should initialize all components successfully', async () => {
      const result = await automatedStateSync.initialize();
      
      expect(result).toBe(true);
      expect(automatedStateSync.isInitialized).toBe(true);
      expect(automatedStateSync.systemHealth.overall).toBe('healthy');
      
      // Check that all components are initialized
      expect(automatedStateSync.components.eventBus).not.toBeNull();
      expect(automatedStateSync.components.fileWatchers).not.toBeNull();
      expect(automatedStateSync.components.changeDetector).not.toBeNull();
      expect(automatedStateSync.components.stateValidator).not.toBeNull();
      expect(automatedStateSync.components.syncEngine).not.toBeNull();
      expect(automatedStateSync.components.conflictResolver).not.toBeNull();
    }, 15000); // Allow extra time for initialization

    test('should provide system status information', () => {
      const status = automatedStateSync.getSystemStatus();
      
      expect(status).toHaveProperty('system');
      expect(status).toHaveProperty('components');
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('performance');
      
      expect(status.system.initialized).toBe(true);
      expect(status.system.health).toBe('healthy');
    });
  });

  describe('System Control', () => {
    test('should start and stop successfully', async () => {
      // Start the system
      const startResult = await automatedStateSync.start();
      expect(startResult).toBe(true);
      expect(automatedStateSync.isRunning).toBe(true);
      expect(automatedStateSync.systemHealth.overall).toBe('running');
      
      // Stop the system
      const stopResult = await automatedStateSync.stop();
      expect(stopResult).toBe(true);
      expect(automatedStateSync.isRunning).toBe(false);
      expect(automatedStateSync.systemHealth.overall).toBe('stopped');
    }, 10000);

    test('should handle multiple start calls gracefully', async () => {
      await automatedStateSync.start();
      const result = await automatedStateSync.start(); // Second start call
      
      expect(result).toBe(true);
      expect(automatedStateSync.isRunning).toBe(true);
      
      await automatedStateSync.stop();
    });
  });

  describe('Performance Metrics', () => {
    test('should provide performance metrics with correct targets', () => {
      const performanceMetrics = automatedStateSync.getPerformanceMetrics();
      
      expect(performanceMetrics).toHaveProperty('targets');
      expect(performanceMetrics).toHaveProperty('current');
      expect(performanceMetrics).toHaveProperty('withinTargets');
      
      expect(performanceMetrics.targets.changeDetection).toBe(1000); // <1s requirement
      expect(performanceMetrics.targets.syncOperations).toBe(2000);  // <2s requirement
      expect(performanceMetrics.targets.validation).toBe(100);       // <100ms requirement
    });

    test('should track system uptime', () => {
      const stats = automatedStateSync.getSystemStatistics();
      
      expect(stats).toHaveProperty('system');
      expect(stats.system).toHaveProperty('uptime');
      expect(stats.system).toHaveProperty('startTime');
      expect(stats.system).toHaveProperty('totalEvents');
      expect(stats.system).toHaveProperty('successfulOperations');
      expect(stats.system).toHaveProperty('failedOperations');
    });
  });

  describe('Component Integration', () => {
    test('should have all components properly integrated', async () => {
      // Ensure system is running
      await automatedStateSync.start();
      
      // Check that components are properly wired
      expect(automatedStateSync.components.eventBus).not.toBeNull();
      expect(automatedStateSync.components.fileWatchers).not.toBeNull();
      expect(automatedStateSync.components.syncEngine).not.toBeNull();

      // Check that EventBus has registered handlers
      const eventBusStats = automatedStateSync.components.eventBus.getStatistics();
      expect(eventBusStats.handlers.registered).toBeGreaterThan(0);
      
      await automatedStateSync.stop();
    });

    test('should determine validation triggers correctly', () => {
      // High impact change should trigger validation
      const highImpactChange = {
        analysis: {
          impact: 'high',
          semanticChanges: {
            statusChange: { isWorkflowChange: true }
          }
        }
      };
      
      expect(automatedStateSync.shouldTriggerValidation(highImpactChange)).toBe(true);

      // Low impact change should not trigger validation
      const lowImpactChange = {
        analysis: {
          impact: 'low',
          semanticChanges: {}
        }
      };
      
      expect(automatedStateSync.shouldTriggerValidation(lowImpactChange)).toBe(false);

      // Medium impact with semantic changes should trigger validation
      const mediumImpactChange = {
        analysis: {
          impact: 'medium',
          changeType: 'yaml',
          semanticChanges: {
            assignmentChange: { isHandoff: true }
          }
        }
      };
      
      expect(automatedStateSync.shouldTriggerValidation(mediumImpactChange)).toBe(true);
    });
  });

  describe('Manual Operations', () => {
    test('should trigger manual sync successfully', async () => {
      await automatedStateSync.start();
      
      const result = await automatedStateSync.triggerManualSync('TEST-001');
      
      expect(result.success).toBe(true);
      expect(result.triggered).toBe('manual_sync');
      expect(result.specId).toBe('TEST-001');
      expect(result).toHaveProperty('timestamp');
      
      await automatedStateSync.stop();
    });

    test('should fail manual sync when system is not running', async () => {
      // Ensure system is stopped
      await automatedStateSync.stop();
      
      const result = await automatedStateSync.triggerManualSync('TEST-001');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be running');
    });
  });

  describe('Error Handling', () => {
    test('should handle component errors gracefully', () => {
      const testError = new Error('Test component error');
      automatedStateSync.handleComponentError('testComponent', testError);

      expect(automatedStateSync.systemHealth.components.testComponent).toBe('error');
      expect(automatedStateSync.systemHealth.issues.length).toBeGreaterThan(0);
      
      const lastIssue = automatedStateSync.systemHealth.issues[automatedStateSync.systemHealth.issues.length - 1];
      expect(lastIssue.type).toBe('component_error');
      expect(lastIssue.component).toBe('testComponent');
      expect(lastIssue.message).toBe('Test component error');
    });

    test('should handle system degradation based on component health', () => {
      // Simulate multiple component errors to test degradation
      automatedStateSync.handleComponentError('component1', new Error('Error 1'));
      automatedStateSync.handleComponentError('component2', new Error('Error 2'));
      automatedStateSync.handleComponentError('component3', new Error('Error 3'));
      
      // System should detect degraded state
      const status = automatedStateSync.getSystemStatus();
      expect(['degraded', 'critical', 'error', 'stopped']).toContain(status.health.overall);
    });
  });

  describe('Health Monitoring', () => {
    test('should perform health checks', async () => {
      let healthCheckCompleted = false;
      
      automatedStateSync.once('health_check_complete', (data) => {
        healthCheckCompleted = true;
        expect(data).toHaveProperty('overall');
        expect(data).toHaveProperty('componentHealth');
        expect(data).toHaveProperty('checkDuration');
      });

      // Manually trigger a health check
      await automatedStateSync.performHealthCheck();
      
      expect(healthCheckCompleted).toBe(true);
    });

    test('should provide component status', () => {
      const componentStatus = automatedStateSync.getComponentStatus();
      
      expect(componentStatus).toHaveProperty('eventBus');
      expect(componentStatus).toHaveProperty('fileWatchers');
      expect(componentStatus).toHaveProperty('changeDetector');
      expect(componentStatus).toHaveProperty('stateValidator');
      expect(componentStatus).toHaveProperty('syncEngine');
      expect(componentStatus).toHaveProperty('conflictResolver');
    });
  });
});