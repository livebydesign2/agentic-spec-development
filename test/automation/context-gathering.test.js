const fs = require('fs').promises;
const path = require('path'); // eslint-disable-line no-unused-vars
const sinon = require('sinon');
const ContextGatherer = require('../../lib/automation/context-gatherer');
const ContextInjector = require('../../lib/context-injector');

describe('FEAT-028: Enhanced Context Gathering', function () {
  let contextGatherer;
  let contextInjector;
  let configManager;
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    // Mock config manager
    configManager = {
      getProjectRoot: () => '/test/project',
      getConfig: () => ({}),
    };

    contextGatherer = new ContextGatherer(configManager);
    contextInjector = new ContextInjector(configManager);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('ContextGatherer', function () {
    describe('gatherTaskContext()', function () {
      it('should gather comprehensive task context for automation', async function () {
        // Mock specification file
        const mockSpec = `---
title: Test Feature
priority: P1
---
# Test Feature

## Implementation Tasks

**TASK-001** 🤖 **Enhanced Context Injector** ⏳ **← READY FOR PICKUP** | Agent: software-architect

- [ ] Enhance existing ContextInjector with automatic context gathering triggers
- [ ] Build task-specific context collection
- **Files**: lib/context-injector.js, lib/automation/context-gatherer.js
`;

        sandbox.stub(fs, 'readFile').resolves(mockSpec);
        sandbox.stub(fs, 'access').resolves();
        sandbox.stub(contextGatherer, 'findAllSpecifications').resolves([]);

        const context = await contextGatherer.gatherTaskContext({
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          agentType: 'software-architect',
          includeFiles: false,
        });

        expect(context).toHaveProperty('metadata');
        expect(context.metadata).toHaveProperty('specId', 'FEAT-028');
        expect(context.metadata).toHaveProperty('taskId', 'TASK-001');
        expect(context.metadata).toHaveProperty(
          'agentType',
          'software-architect'
        );

        expect(context).toHaveProperty('taskSpecific');
        expect(context.taskSpecific).toHaveProperty('specification');
        expect(context.taskSpecific).toHaveProperty('task');

        expect(context).toHaveProperty('validation');
        expect(context.validation).toHaveProperty('relevanceScore');
        expect(context.validation).toHaveProperty('completeness');
      });

      it('should extract task details correctly from specification', async function () {
        const mockSpec = `**TASK-001** 🤖 **Enhanced Context Injector** ⏳

- [ ] Enhance existing ContextInjector
- [ ] Build task-specific context collection
- **Files**: lib/context-injector.js
- **Agent**: software-architect`;

        sandbox
          .stub(fs, 'readFile')
          .resolves(`---\ntitle: Test\n---\n\n${mockSpec}`);
        sandbox.stub(fs, 'access').resolves();
        sandbox.stub(contextGatherer, 'findAllSpecifications').resolves([]);

        const context = await contextGatherer.gatherTaskContext({
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          agentType: 'software-architect',
        });

        const task = context.taskSpecific.task;
        expect(task.id).toBe('TASK-001');
        expect(task.title).toBe('Enhanced Context Injector');
        expect(task.status).toBe('ready');
        expect(task.agent).toBe('software-architect');
        expect(task.files).toContain('lib/context-injector.js');
        expect(task.checklist).toHaveLength(2);
      });

      it('should calculate relevance scores based on agent type', async function () {
        const mockSpec =
          '---\ntitle: CLI Enhancement\n---\n**TASK-001** CLI Development Task';

        sandbox.stub(fs, 'readFile').resolves(mockSpec);
        sandbox.stub(fs, 'access').resolves();
        sandbox.stub(contextGatherer, 'findAllSpecifications').resolves([]);

        // Test with matching agent
        const contextMatching = await contextGatherer.gatherTaskContext({
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          agentType: 'cli-specialist',
        });

        // Test with non-matching agent
        const contextNonMatching = await contextGatherer.gatherTaskContext({
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          agentType: 'backend-developer',
        });

        expect(contextMatching.validation.relevanceScore).toBeGreaterThan(
          contextNonMatching.validation.relevanceScore
        );
      });

      it('should use caching for performance', async function () {
        const mockSpec = '---\ntitle: Test\n---\n**TASK-001** Test Task';

        sandbox.stub(fs, 'readFile').resolves(mockSpec);
        sandbox.stub(fs, 'access').resolves();
        sandbox.stub(contextGatherer, 'findAllSpecifications').resolves([]);

        // First call
        await contextGatherer.gatherTaskContext({
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          agentType: 'software-architect',
          useCache: true,
        });

        // Second call should use cache
        const context2 = await contextGatherer.gatherTaskContext({
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          agentType: 'software-architect',
          useCache: true,
        });

        expect(context2.metadata.performance.cacheHit).toBe(true);
      });

      it('should handle missing specifications gracefully', async function () {
        sandbox.stub(fs, 'access').rejects(new Error('File not found'));

        try {
          await contextGatherer.gatherTaskContext({
            specId: 'NONEXISTENT',
            taskId: 'TASK-001',
            agentType: 'software-architect',
          });
          expect(true).toBe(false); // Should have thrown an error
        } catch (error) {
          expect(error.message).toContain(
            'Specification NONEXISTENT not found'
          );
        }
      });

      it('should complete context gathering within performance targets', async function () {
        const mockSpec = '---\ntitle: Test\n---\n**TASK-001** Test Task';

        sandbox.stub(fs, 'readFile').resolves(mockSpec);
        sandbox.stub(fs, 'access').resolves();
        sandbox.stub(contextGatherer, 'findAllSpecifications').resolves([]);

        const startTime = Date.now();
        const context = await contextGatherer.gatherTaskContext({
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          agentType: 'software-architect',
        });
        const totalTime = Date.now() - startTime;

        // Should complete within reasonable time for automation
        expect(totalTime).toBeLessThan(5000);
        expect(context.metadata.performance.gatheringTimeMs).toBeLessThan(
          5000
        );
      });
    });

    describe('dependency gathering', function () {
      it('should gather related specifications', async function () {
        const mockSpec = `---
title: Test Feature
dependencies:
  - FEAT-026
  - FEAT-027
---
**TASK-001** Test Task`;

        const mockDepSpec = `---
title: Dependency Feature
status: done
---
Dependency content`;

        sandbox
          .stub(fs, 'readFile')
          .onFirstCall()
          .resolves(mockSpec)
          .onSecondCall()
          .resolves(mockDepSpec);
        sandbox.stub(fs, 'access').resolves();
        sandbox.stub(contextGatherer, 'findAllSpecifications').resolves([]);

        const context = await contextGatherer.gatherTaskContext({
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          agentType: 'software-architect',
        });

        expect(context.dependencies.required.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Enhanced ContextInjector', function () {
    describe('injectContextForTask()', function () {
      it('should perform automated context injection', async function () {
        // Mock the context gatherer
        const mockTaskContext = {
          metadata: { specId: 'FEAT-028', taskId: 'TASK-001' },
          validation: { relevanceScore: 0.8, isSufficient: true },
          taskSpecific: {
            specification: { title: 'Test' },
            task: { id: 'TASK-001', checklist: [] },
          },
        };

        sandbox
          .stub(contextInjector.contextGatherer, 'gatherTaskContext')
          .resolves(mockTaskContext);

        sandbox.stub(contextInjector, 'injectContext').resolves({
          layers: { critical: {}, taskSpecific: {} },
          metadata: { performance: {} },
          validation: { isValid: true },
        });

        const context = await contextInjector.injectContextForTask({
          agentType: 'software-architect',
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          automated: true,
        });

        expect(context).toHaveProperty('automation');
        expect(context.automation.enabled).toBe(true);
        expect(context.automation.taskSpecific).toEqual(mockTaskContext);
        expect(context.automation.validation).toHaveProperty('isReady');
      });

      it('should validate automated context quality', async function () {
        const mockTaskContext = {
          validation: { relevanceScore: 0.9, isSufficient: true },
          taskSpecific: {
            specification: { title: 'Test' },
            task: { id: 'TASK-001', checklist: [] },
          },
        };

        sandbox
          .stub(contextInjector.contextGatherer, 'gatherTaskContext')
          .resolves(mockTaskContext);

        sandbox.stub(contextInjector, 'injectContext').resolves({
          layers: { critical: {}, taskSpecific: {} },
          metadata: { performance: {} },
          validation: { isValid: true },
        });

        const context = await contextInjector.injectContextForTask({
          agentType: 'software-architect',
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          automated: true,
        });

        expect(context.automation.validation.score).toBeGreaterThan(0.7);
        expect(context.automation.validation.isReady).toBe(true);
        expect(context.automation.validation.issues).toHaveLength(0);
      });

      it('should fallback to standard injection when not automated', async function () {
        sandbox.stub(contextInjector, 'injectContext').resolves({
          layers: { critical: {} },
          metadata: { performance: {} },
        });

        const context = await contextInjector.injectContextForTask({
          agentType: 'software-architect',
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          automated: false,
        });

        expect(context).not.toHaveProperty('automation');
        expect(context).toHaveProperty('layers');
      });

      it('should meet automation performance targets', async function () {
        const mockTaskContext = {
          metadata: { performance: { gatheringTimeMs: 500 } },
          validation: { relevanceScore: 0.8, isSufficient: true },
          taskSpecific: {
            specification: { title: 'Test' },
            task: { id: 'TASK-001', checklist: [] },
          },
        };

        sandbox
          .stub(contextInjector.contextGatherer, 'gatherTaskContext')
          .resolves(mockTaskContext);

        sandbox.stub(contextInjector, 'injectContext').resolves({
          layers: { critical: {} },
          metadata: { performance: {} },
          validation: { isValid: true },
        });

        const startTime = Date.now();
        const context = await contextInjector.injectContextForTask({
          agentType: 'software-architect',
          specId: 'FEAT-028',
          taskId: 'TASK-001',
          automated: true,
        });
        const totalTime = Date.now() - startTime;

        // Should complete within 3 seconds for automation
        expect(totalTime).toBeLessThan(3000);
        expect(context.metadata.performance.automatedInjection).toBeLessThan(
          3000
        );
      });
    });

    describe('getContextualTaskRecommendations()', function () {
      it('should provide task recommendations with context relevance', async function () {
        // Mock TaskRouter
        const TaskRouter = require('../../lib/task-router');
        const mockRecommendations = [
          { specId: 'FEAT-028', taskId: 'TASK-001', priority: 'P1' },
          { specId: 'FEAT-029', taskId: 'TASK-001', priority: 'P2' },
        ];

        sandbox
          .stub(TaskRouter.prototype, 'getNextTask')
          .resolves(mockRecommendations);

        const mockContextPreview = {
          validation: {
            relevanceScore: 0.8,
            completeness: 0.9,
            isSufficient: true,
          },
          metadata: { performance: { gatheringTimeMs: 200 } },
        };

        sandbox
          .stub(contextInjector.contextGatherer, 'gatherTaskContext')
          .resolves(mockContextPreview);

        const recommendations =
          await contextInjector.getContextualTaskRecommendations(
            'software-architect'
          );

        expect(recommendations.recommendations).toHaveLength(2);
        expect(recommendations.recommendations[0]).toHaveProperty(
          'contextPreview'
        );
        expect(
          recommendations.recommendations[0].contextPreview.relevanceScore
        ).toBe(0.8);
        expect(
          recommendations.recommendations[0].contextPreview.hasRequiredContext
        ).toBe(true);
      });

      it('should sort recommendations by relevance score', async function () {
        const TaskRouter = require('../../lib/task-router');
        const mockRecommendations = [
          { specId: 'FEAT-028', taskId: 'TASK-001' },
          { specId: 'FEAT-029', taskId: 'TASK-001' },
        ];

        sandbox
          .stub(TaskRouter.prototype, 'getNextTask')
          .resolves(mockRecommendations);

        sandbox
          .stub(contextInjector.contextGatherer, 'gatherTaskContext')
          .onFirstCall()
          .resolves({
            validation: {
              relevanceScore: 0.6,
              completeness: 0.7,
              isSufficient: true,
            },
            metadata: { performance: { gatheringTimeMs: 200 } },
          })
          .onSecondCall()
          .resolves({
            validation: {
              relevanceScore: 0.9,
              completeness: 0.8,
              isSufficient: true,
            },
            metadata: { performance: { gatheringTimeMs: 150 } },
          });

        const recommendations =
          await contextInjector.getContextualTaskRecommendations(
            'software-architect'
          );

        // Second recommendation should be first due to higher relevance
        expect(recommendations.recommendations[0].specId).toBe('FEAT-029');
        expect(recommendations.recommendations[1].specId).toBe('FEAT-028');
      });
    });
  });

  describe('Integration Tests', function () {
    it('should integrate with existing TaskRouter for automated workflows', async function () {
      // This would test the full integration with FEAT-026 automation commands
      const mockSpec =
        '---\ntitle: Test\n---\n**TASK-001** Test Task | Agent: software-architect';

      sandbox.stub(fs, 'readFile').resolves(mockSpec);
      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(contextGatherer, 'findAllSpecifications').resolves([]);

      const context = await contextInjector.injectContextForTask({
        agentType: 'software-architect',
        specId: 'FEAT-028',
        taskId: 'TASK-001',
        automated: true,
      });

      expect(context.automation).toBeDefined();
      expect(context.automation.triggers.taskAssignment).toBe(true);
    });

    it('should maintain performance under load', async function () {
      // Performance test with multiple concurrent context injections
      const promises = [];

      for (let i = 0; i < 10; i++) {
        const mockSpec = `---\ntitle: Test ${i}\n---\n**TASK-001** Test Task ${i}`;
        sandbox.stub(fs, 'readFile').onCall(i).resolves(mockSpec);
      }

      sandbox.stub(fs, 'access').resolves();
      sandbox.stub(contextGatherer, 'findAllSpecifications').resolves([]);

      for (let i = 0; i < 10; i++) {
        promises.push(
          contextGatherer.gatherTaskContext({
            specId: `FEAT-${i}`,
            taskId: 'TASK-001',
            agentType: 'software-architect',
          })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All should complete within reasonable time
      expect(totalTime).toBeLessThan(10000);
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.metadata.performance.gatheringTimeMs).toBeLessThan(
          5000
        );
      });
    });
  });
});
