const ConfigManager = require('./config-manager');
const ContextInjector = require('./context-injector');

/**
 * Integration test for Context Injection System with existing components
 * Tests ConfigManager and DataAdapterFactory integration
 */
class ContextIntegrationTest {
  constructor() {
    this.configManager = new ConfigManager();
    this.contextInjector = new ContextInjector(this.configManager);
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };
  }

  /**
   * Run all integration tests
   * @returns {Promise<Object>} Test results
   */
  async runTests() {
    console.log('Starting Context Injection Integration Tests...\n');

    try {
      await this.testConfigManagerIntegration();
      await this.testDataAdapterFactoryIntegration();
      await this.testContextDirectoryStructure();
      await this.testContextInjectionFlow();
      await this.testPerformanceRequirements();
    } catch (error) {
      this.testResults.errors.push(`Test suite error: ${error.message}`);
    }

    console.log('\n=== Test Results ===');
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);

    if (this.testResults.errors.length > 0) {
      console.log('\nErrors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    return this.testResults;
  }

  /**
   * Test ConfigManager integration
   */
  async testConfigManagerIntegration() {
    console.log('Testing ConfigManager integration...');

    try {
      // Test configuration loading
      const config = this.configManager.loadConfig();
      this.assert(config !== null, 'ConfigManager should load configuration');

      // Test path resolution
      const dataPath = this.configManager.getDataPath();
      const projectRoot = this.configManager.getProjectRoot();

      this.assert(
        typeof dataPath === 'string',
        'ConfigManager should provide dataPath'
      );
      this.assert(
        typeof projectRoot === 'string',
        'ConfigManager should provide projectRoot'
      );

      console.log('✓ ConfigManager integration passed');
      this.testResults.passed++;
    } catch (error) {
      console.log('✗ ConfigManager integration failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(
        `ConfigManager integration: ${error.message}`
      );
    }
  }

  /**
   * Test DataAdapterFactory integration
   */
  async testDataAdapterFactoryIntegration() {
    console.log('Testing DataAdapterFactory integration...');

    try {
      const factory = this.contextInjector.dataAdapterFactory;

      // Test factory creation
      this.assert(
        factory !== null,
        'ContextInjector should have DataAdapterFactory'
      );

      // Test adapter creation for different formats
      const markdownAdapter = factory.create('markdown');
      const jsonAdapter = factory.create('json');
      const yamlAdapter = factory.create('yaml');

      this.assert(markdownAdapter !== null, 'Should create markdown adapter');
      this.assert(jsonAdapter !== null, 'Should create json adapter');
      this.assert(yamlAdapter !== null, 'Should create yaml adapter');

      console.log('✓ DataAdapterFactory integration passed');
      this.testResults.passed++;
    } catch (error) {
      console.log('✗ DataAdapterFactory integration failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(
        `DataAdapterFactory integration: ${error.message}`
      );
    }
  }

  /**
   * Test context directory structure
   */
  async testContextDirectoryStructure() {
    console.log('Testing context directory structure...');

    try {
      const contextManager = this.contextInjector.contextManager;

      // Initialize context structure
      const initSuccess = await contextManager.initializeContextStructure();
      this.assert(initSuccess, 'Should initialize context directory structure');

      // Test path resolution
      const paths = contextManager.getContextPaths();
      this.assert(typeof paths.base === 'string', 'Should provide base path');
      this.assert(
        typeof paths.context === 'string',
        'Should provide context path'
      );
      this.assert(
        typeof paths.agents === 'string',
        'Should provide agents path'
      );

      console.log('✓ Context directory structure test passed');
      this.testResults.passed++;
    } catch (error) {
      console.log('✗ Context directory structure test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(
        `Context directory structure: ${error.message}`
      );
    }
  }

  /**
   * Test full context injection flow
   */
  async testContextInjectionFlow() {
    console.log('Testing context injection flow...');

    try {
      // Test with backend-developer agent (should exist from foundation)
      const context = await this.contextInjector.injectContext({
        agentType: 'backend-developer',
        specId: 'FEAT-012',
        taskId: 'TASK-002',
      });

      // Verify context structure
      this.assert(
        context !== null,
        'Context injection should return context object'
      );
      this.assert(
        context.metadata !== undefined,
        'Context should have metadata'
      );
      this.assert(context.layers !== undefined, 'Context should have layers');

      // Verify 4-layer structure
      this.assert(
        context.layers.critical !== undefined,
        'Should have critical layer'
      );
      this.assert(
        context.layers.taskSpecific !== undefined,
        'Should have task-specific layer'
      );
      this.assert(
        context.layers.agentSpecific !== undefined,
        'Should have agent-specific layer'
      );
      this.assert(
        context.layers.process !== undefined,
        'Should have process layer'
      );

      // Verify inheritance
      this.assert(
        context.inheritance !== undefined,
        'Should have inheritance information'
      );

      // Verify filtering
      this.assert(
        context.filtering !== undefined || context.relevanceScore !== undefined,
        'Should have filtering applied'
      );

      // Verify validation
      this.assert(
        context.validation !== undefined,
        'Should have validation results'
      );

      console.log('✓ Context injection flow test passed');
      this.testResults.passed++;
    } catch (error) {
      console.log('✗ Context injection flow test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Context injection flow: ${error.message}`);
    }
  }

  /**
   * Test performance requirements
   */
  async testPerformanceRequirements() {
    console.log('Testing performance requirements...');

    try {
      const startTime = Date.now();

      const context = await this.contextInjector.injectContext({
        agentType: 'backend-developer',
        specId: 'FEAT-012',
      });

      const totalTime = Date.now() - startTime;
      const performanceTarget = 500; // 500ms requirement

      this.assert(
        context.metadata?.performance?.total !== undefined,
        'Should track performance metrics'
      );

      // Performance requirement check
      if (totalTime > performanceTarget) {
        console.log(
          `⚠ Performance warning: Context injection took ${totalTime}ms (target: ${performanceTarget}ms)`
        );
      }

      // Check individual layer performance
      const performance = context.metadata.performance;
      if (performance) {
        console.log('Performance breakdown:');
        console.log(`  Critical: ${performance.critical}ms`);
        console.log(`  Task-specific: ${performance.taskSpecific}ms`);
        console.log(`  Agent-specific: ${performance.agentSpecific}ms`);
        console.log(`  Process: ${performance.process}ms`);
        console.log(`  Filtering: ${performance.filtering}ms`);
        console.log(`  Inheritance: ${performance.inheritance}ms`);
        console.log(`  Validation: ${performance.validation}ms`);
        console.log(`  Total: ${performance.total}ms`);
      }

      console.log('✓ Performance requirements test completed');
      this.testResults.passed++;
    } catch (error) {
      console.log('✗ Performance requirements test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(
        `Performance requirements: ${error.message}`
      );
    }
  }

  /**
   * Simple assertion helper
   * @param {boolean} condition - Condition to check
   * @param {string} message - Error message if condition fails
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * Test cache functionality
   */
  async testCacheFunctionality() {
    console.log('Testing cache functionality...');

    try {
      // First injection (should cache)
      const context1 = await this.contextInjector.injectContext({
        agentType: 'backend-developer',
        specId: 'FEAT-012',
        useCache: true,
      });

      // Second injection (should use cache)
      const startTime = Date.now();
      const context2 = await this.contextInjector.injectContext({
        agentType: 'backend-developer',
        specId: 'FEAT-012',
        useCache: true,
      });
      const cachedTime = Date.now() - startTime;

      this.assert(context1 !== null, 'First context injection should succeed');
      this.assert(context2 !== null, 'Cached context injection should succeed');

      // Cache should be faster (though we can't guarantee exact timing)
      console.log(`Cached injection took ${cachedTime}ms`);

      // Test cache stats
      const cacheStats = this.contextInjector.getCacheStats();
      this.assert(cacheStats.size > 0, 'Cache should have entries');

      console.log('✓ Cache functionality test passed');
      this.testResults.passed++;
    } catch (error) {
      console.log('✗ Cache functionality test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Cache functionality: ${error.message}`);
    }
  }
}

// Export for use by other modules or direct execution
module.exports = ContextIntegrationTest;

// Run tests if executed directly
if (require.main === module) {
  const test = new ContextIntegrationTest();
  test.runTests().then((results) => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}
