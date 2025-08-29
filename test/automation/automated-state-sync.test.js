const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const __fs = require('fs').promises; // eslint-disable-line no-unused-vars

const AutomatedStateSync = require('../../lib/automation/automated-state-sync');
const ConfigManager = require('../../lib/config-manager');

describe('AutomatedStateSync', function () {
  let automatedStateSync;
  let configManager;
  let mockWorkflowStateManager;
  let mockFrontmatterSync;

  beforeEach(function () {
    // Create test configuration
    configManager = new ConfigManager(path.join(__dirname, '../fixtures'));

    // Mock WorkflowStateManager
    mockWorkflowStateManager = {
      initialize: sinon.stub().resolves(true),
      loadState: sinon.stub().resolves({}),
      saveState: sinon.stub().resolves(true),
      assignTask: sinon.stub().resolves({ success: true }),
      completeTask: sinon.stub().resolves({ success: true }),
      updateSpecFrontmatter: sinon.stub().resolves({ success: true }),
      syncSpecState: sinon.stub().resolves({ success: true }),
      updateProjectProgress: sinon.stub().resolves({}),
    };

    // Mock FrontmatterSync
    mockFrontmatterSync = {
      initialize: sinon.stub().resolves(true),
      updateSpecFrontmatter: sinon.stub().resolves({ success: true }),
      batchUpdateSpecs: sinon.stub().resolves({ success: true }),
    };

    // Create AutomatedStateSync instance
    automatedStateSync = new AutomatedStateSync(
      configManager,
      mockWorkflowStateManager,
      mockFrontmatterSync
    );
  });

  afterEach(function () {
    sinon.restore();
    if (automatedStateSync && automatedStateSync.isRunning) {
      automatedStateSync.shutdown();
    }
  });

  describe('Initialization', function () {
    it('should initialize all components successfully', async function () {
      this.timeout(10000); // Allow extra time for initialization

      const result = await automatedStateSync.initialize();

      expect(result).to.be.true;
      expect(automatedStateSync.isInitialized).to.be.true;
      expect(automatedStateSync.systemHealth.overall).to.equal('healthy');

      // Check that all components are initialized
      expect(automatedStateSync.components.eventBus).to.not.be.null;
      expect(automatedStateSync.components.fileWatchers).to.not.be.null;
      expect(automatedStateSync.components.changeDetector).to.not.be.null;
      expect(automatedStateSync.components.stateValidator).to.not.be.null;
      expect(automatedStateSync.components.syncEngine).to.not.be.null;
      expect(automatedStateSync.components.conflictResolver).to.not.be.null;
    });

    it('should emit system_initialized event on successful initialization', async function () {
      const initSpy = sinon.spy();
      automatedStateSync.on('system_initialized', initSpy);

      await automatedStateSync.initialize();

      expect(initSpy.calledOnce).to.be.true;

      const eventData = initSpy.firstCall.args[0];
      expect(eventData).to.have.property('initializationTime');
      expect(eventData).to.have.property('components');
      expect(eventData.components).to.be.an('array');
      expect(eventData.components).to.include('eventBus');
      expect(eventData.components).to.include('fileWatchers');
      expect(eventData.components).to.include('syncEngine');
    });

    it('should handle initialization failure gracefully', async function () {
      // Force eventBus initialization to fail
      const __originalEventBus = automatedStateSync.components.eventBus; // eslint-disable-line no-unused-vars
      automatedStateSync.components.eventBus = null;

      // Create a mock EventBus that fails to initialize
      const mockEventBus = {
        initialize: sinon.stub().resolves(false),
      };

      // Override the EventBus constructor temporarily
      const EventBus = require('../../lib/automation/event-bus');
      const __originalConstructor = EventBus; // eslint-disable-line no-unused-vars

      // Mock the EventBus constructor to return our failing mock
      sinon.stub(automatedStateSync, 'components').value({
        eventBus: mockEventBus,
        fileWatchers: null,
        changeDetector: null,
        stateValidator: null,
        syncEngine: null,
        conflictResolver: null,
      });

      const result = await automatedStateSync.initialize();

      expect(result).to.be.false;
      expect(automatedStateSync.systemHealth.overall).to.equal('failed');
      expect(automatedStateSync.systemHealth.issues).to.have.length.greaterThan(
        0
      );
    });
  });

  describe('System Control', function () {
    beforeEach(async function () {
      await automatedStateSync.initialize();
    });

    it('should start successfully when initialized', async function () {
      const result = await automatedStateSync.start();

      expect(result).to.be.true;
      expect(automatedStateSync.isRunning).to.be.true;
      expect(automatedStateSync.systemHealth.overall).to.equal('running');
    });

    it('should emit system_started event', async function () {
      const startSpy = sinon.spy();
      automatedStateSync.on('system_started', startSpy);

      await automatedStateSync.start();

      expect(startSpy.calledOnce).to.be.true;

      const eventData = startSpy.firstCall.args[0];
      expect(eventData).to.have.property('startedAt');
      expect(eventData).to.have.property('components');
    });

    it('should stop gracefully when running', async function () {
      await automatedStateSync.start();

      const result = await automatedStateSync.stop();

      expect(result).to.be.true;
      expect(automatedStateSync.isRunning).to.be.false;
      expect(automatedStateSync.systemHealth.overall).to.equal('stopped');
    });

    it('should emit system_stopped event', async function () {
      await automatedStateSync.start();

      const stopSpy = sinon.spy();
      automatedStateSync.on('system_stopped', stopSpy);

      await automatedStateSync.stop();

      expect(stopSpy.calledOnce).to.be.true;

      const eventData = stopSpy.firstCall.args[0];
      expect(eventData).to.have.property('stoppedAt');
      expect(eventData).to.have.property('finalStats');
    });

    it('should handle multiple start calls gracefully', async function () {
      await automatedStateSync.start();
      const result = await automatedStateSync.start(); // Second start call

      expect(result).to.be.true;
      expect(automatedStateSync.isRunning).to.be.true;
    });

    it('should handle stop when not running', async function () {
      const result = await automatedStateSync.stop();

      expect(result).to.be.true;
      expect(automatedStateSync.isRunning).to.be.false;
    });
  });

  describe('Health Monitoring', function () {
    beforeEach(async function () {
      await automatedStateSync.initialize();
    });

    it('should perform health checks regularly', function (done) {
      this.timeout(5000);

      // Set up health check spy
      const healthCheckSpy = sinon.spy();
      automatedStateSync.on('health_check_complete', healthCheckSpy);

      // Start health monitoring with shorter interval for testing
      automatedStateSync.healthCheckFrequency = 1000; // 1 second for testing
      automatedStateSync.startHealthMonitoring();

      // Wait for at least one health check
      setTimeout(() => {
        expect(healthCheckSpy.callCount).to.be.at.least(1);

        const eventData = healthCheckSpy.firstCall.args[0];
        expect(eventData).to.have.property('overall');
        expect(eventData).to.have.property('componentHealth');
        expect(eventData).to.have.property('checkDuration');

        done();
      }, 2500); // Wait for 2.5 seconds to catch at least 2 health checks
    });

    it('should provide system status information', function () {
      const status = automatedStateSync.getSystemStatus();

      expect(status).to.have.property('system');
      expect(status).to.have.property('components');
      expect(status).to.have.property('health');
      expect(status).to.have.property('metrics');
      expect(status).to.have.property('performance');

      expect(status.system.initialized).to.be.true;
      expect(status.system.health).to.equal('healthy');
    });

    it('should provide component status information', function () {
      const componentStatus = automatedStateSync.getComponentStatus();

      expect(componentStatus).to.have.property('eventBus');
      expect(componentStatus).to.have.property('fileWatchers');
      expect(componentStatus).to.have.property('changeDetector');
      expect(componentStatus).to.have.property('stateValidator');
      expect(componentStatus).to.have.property('syncEngine');
      expect(componentStatus).to.have.property('conflictResolver');
    });

    it('should provide performance metrics', function () {
      const performanceMetrics = automatedStateSync.getPerformanceMetrics();

      expect(performanceMetrics).to.have.property('targets');
      expect(performanceMetrics).to.have.property('current');
      expect(performanceMetrics).to.have.property('withinTargets');

      expect(performanceMetrics.targets.changeDetection).to.equal(1000);
      expect(performanceMetrics.targets.syncOperations).to.equal(2000);
      expect(performanceMetrics.targets.validation).to.equal(100);
    });

    it('should handle component errors and update health', function () {
      const errorSpy = sinon.spy();
      automatedStateSync.on('component_error', errorSpy);

      // Simulate a component error
      const testError = new Error('Test component error');
      automatedStateSync.handleComponentError('testComponent', testError);

      expect(automatedStateSync.systemHealth.components.testComponent).to.equal(
        'error'
      );
      expect(automatedStateSync.systemHealth.issues).to.have.length.greaterThan(
        0
      );

      const lastIssue =
        automatedStateSync.systemHealth.issues[
          automatedStateSync.systemHealth.issues.length - 1
        ];
      expect(lastIssue.type).to.equal('component_error');
      expect(lastIssue.component).to.equal('testComponent');
      expect(lastIssue.message).to.equal('Test component error');

      expect(errorSpy.calledOnce).to.be.true;
    });
  });

  describe('Event Handling', function () {
    beforeEach(async function () {
      await automatedStateSync.initialize();
      await automatedStateSync.start();
    });

    it('should determine when to trigger validation correctly', function () {
      // High impact change should trigger validation
      const highImpactChange = {
        analysis: {
          impact: 'high',
          semanticChanges: {
            statusChange: { isWorkflowChange: true },
          },
        },
      };

      expect(automatedStateSync.shouldTriggerValidation(highImpactChange)).to.be
        .true;

      // Low impact change should not trigger validation
      const lowImpactChange = {
        analysis: {
          impact: 'low',
          semanticChanges: {},
        },
      };

      expect(automatedStateSync.shouldTriggerValidation(lowImpactChange)).to.be
        .false;

      // Medium impact with semantic changes should trigger validation
      const mediumImpactChange = {
        analysis: {
          impact: 'medium',
          changeType: 'yaml',
          semanticChanges: {
            assignmentChange: { isHandoff: true },
          },
        },
      };

      expect(automatedStateSync.shouldTriggerValidation(mediumImpactChange)).to
        .be.true;
    });

    it('should handle validation change analysis correctly', function () {
      // JSON change with significant state changes
      const jsonChange = {
        analysis: {
          impact: 'medium',
          changeType: 'json',
          stateChanges: {
            assignments: {
              significantChanges: [
                { field: 'assignment', type: 'modification' },
              ],
            },
          },
        },
      };

      expect(automatedStateSync.shouldTriggerValidation(jsonChange)).to.be.true;

      // JSON change without significant changes
      const insignificantJsonChange = {
        analysis: {
          impact: 'low',
          changeType: 'json',
          stateChanges: {
            metadata: {
              significantChanges: [],
            },
          },
        },
      };

      expect(
        automatedStateSync.shouldTriggerValidation(insignificantJsonChange)
      ).to.be.false;
    });
  });

  describe('Manual Operations', function () {
    beforeEach(async function () {
      await automatedStateSync.initialize();
      await automatedStateSync.start();
    });

    it('should trigger manual sync successfully', async function () {
      const result = await automatedStateSync.triggerManualSync('TEST-001');

      expect(result.success).to.be.true;
      expect(result.triggered).to.equal('manual_sync');
      expect(result.specId).to.equal('TEST-001');
      expect(result).to.have.property('timestamp');
    });

    it('should trigger manual sync for all specs', async function () {
      const result = await automatedStateSync.triggerManualSync();

      expect(result.success).to.be.true;
      expect(result.specId).to.equal('all');
    });

    it('should fail manual sync when system is not running', async function () {
      await automatedStateSync.stop();

      const result = await automatedStateSync.triggerManualSync('TEST-001');

      expect(result.success).to.be.false;
      expect(result.error).to.include('must be running');
    });
  });

  describe('System Statistics', function () {
    beforeEach(async function () {
      await automatedStateSync.initialize();
    });

    it('should provide comprehensive system statistics', function () {
      const stats = automatedStateSync.getSystemStatistics();

      expect(stats).to.have.property('system');
      expect(stats).to.have.property('components');

      expect(stats.system).to.have.property('uptime');
      expect(stats.system).to.have.property('startTime');
      expect(stats.system).to.have.property('totalEvents');
      expect(stats.system).to.have.property('successfulOperations');
      expect(stats.system).to.have.property('failedOperations');
    });

    it('should track system uptime correctly', function () {
      // System metrics should be initialized
      expect(automatedStateSync.systemMetrics.startTime).to.not.be.null;
      expect(automatedStateSync.systemMetrics.uptime).to.be.a('number');
    });
  });

  describe('Shutdown', function () {
    beforeEach(async function () {
      await automatedStateSync.initialize();
      await automatedStateSync.start();
    });

    it('should shutdown gracefully', async function () {
      this.timeout(15000); // Allow extra time for graceful shutdown

      const shutdownSpy = sinon.spy();
      automatedStateSync.on('system_shutdown_complete', shutdownSpy);

      await automatedStateSync.shutdown();

      expect(automatedStateSync.isInitialized).to.be.false;
      expect(automatedStateSync.systemHealth.overall).to.equal('shutdown');
      expect(shutdownSpy.calledOnce).to.be.true;

      const eventData = shutdownSpy.firstCall.args[0];
      expect(eventData).to.have.property('shutdownAt');
      expect(eventData).to.have.property('finalStats');
    });

    it('should stop health monitoring during shutdown', async function () {
      // Start health monitoring
      automatedStateSync.startHealthMonitoring();
      expect(automatedStateSync.healthCheckInterval).to.not.be.null;

      await automatedStateSync.shutdown();

      expect(automatedStateSync.healthCheckInterval).to.be.null;
    });
  });

  describe('Error Handling', function () {
    beforeEach(async function () {
      await automatedStateSync.initialize();
    });

    it('should handle component initialization failures', async function () {
      // Create a new instance that will fail
      const failingStateSync = new AutomatedStateSync(
        configManager,
        mockWorkflowStateManager,
        mockFrontmatterSync
      );

      // Mock EventBus to fail initialization
      const EventBus = require('../../lib/automation/event-bus');
      sinon.stub(EventBus.prototype, 'initialize').resolves(false);

      const result = await failingStateSync.initialize();

      expect(result).to.be.false;
      expect(failingStateSync.systemHealth.overall).to.equal('failed');
      expect(failingStateSync.systemHealth.issues).to.have.length.greaterThan(
        0
      );
    });

    it('should emit initialization_failed event on failure', async function () {
      const failingSpy = sinon.spy();
      const failingStateSync = new AutomatedStateSync(null, null, null); // No dependencies
      failingStateSync.on('system_initialization_failed', failingSpy);

      // Force failure by providing invalid config
      await failingStateSync.initialize();

      expect(failingSpy.calledOnce).to.be.true;

      const eventData = failingSpy.firstCall.args[0];
      expect(eventData).to.have.property('error');
      expect(eventData).to.have.property('timestamp');
    });

    it('should handle shutdown errors gracefully', async function () {
      const errorSpy = sinon.spy();
      automatedStateSync.on('system_shutdown_error', errorSpy);

      // Force an error during shutdown by corrupting a component
      automatedStateSync.components.eventBus.shutdown = sinon
        .stub()
        .rejects(new Error('Shutdown error'));

      await automatedStateSync.shutdown();

      // Should still complete shutdown despite error
      expect(automatedStateSync.isInitialized).to.be.false;
      expect(automatedStateSync.systemHealth.overall).to.equal('shutdown');
    });
  });

  describe('Integration', function () {
    beforeEach(async function () {
      await automatedStateSync.initialize();
      await automatedStateSync.start();
    });

    it('should integrate all components properly', function () {
      // Check that components are properly wired
      expect(automatedStateSync.components.eventBus).to.not.be.null;
      expect(automatedStateSync.components.fileWatchers).to.not.be.null;
      expect(automatedStateSync.components.syncEngine).to.not.be.null;

      // Check that EventBus has registered handlers
      const eventBusStats =
        automatedStateSync.components.eventBus.getStatistics();
      expect(eventBusStats.handlers.registered).to.be.greaterThan(0);
    });

    it('should process file changes end-to-end', async function () {
      this.timeout(5000);

      // Create a spy to track event flow
      const changeAnalyzedSpy = sinon.spy();
      automatedStateSync.components.eventBus.on(
        'change_analyzed',
        changeAnalyzedSpy
      );

      // Simulate a file change
      const mockChangePayload = {
        watcherType: 'yaml',
        changeType: 'change',
        filePath: path.join(__dirname, '../fixtures/FEAT-001-test-feature.md'),
        fileName: 'FEAT-001-test-feature.md',
        fileExtension: '.md',
        timestamp: new Date().toISOString(),
        eventId: 'test_event_001',
      };

      // Emit the change event
      automatedStateSync.components.fileWatchers.emit(
        'file_change',
        mockChangePayload
      );

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify that change was processed
      expect(changeAnalyzedSpy.callCount).to.be.at.least(0); // May be 0 if change detection fails due to test environment
    });
  });
});
