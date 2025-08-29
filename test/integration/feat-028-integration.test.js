const _fs = require('_fs').promises;
const _path = require('_path');

// Mock fs operations for testing
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    appendFile: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn(),
    rm: jest.fn()
  }
}));

describe('FEAT-028: Context Injection & Sub-agent Integration', () => {
  let ContextGatherer;
  let ContextInjector;
  let PromptGenerator;
  let WorkspaceManager;
  let configManager;

  beforeAll(() => {
    // Setup mock config manager
    configManager = {
      getProjectRoot: () => '/test/project',
      getConfig: () => ({})
    };
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock file system operations
    require('fs').promises.access.mockResolvedValue();
    require('fs').promises.mkdir.mockResolvedValue();
    require('fs').promises.writeFile.mockResolvedValue();
    require('fs').promises.appendFile.mockResolvedValue();
    require('fs').promises.readdir.mockResolvedValue([]);
    require('fs').promises.unlink.mockResolvedValue();
    require('fs').promises.rm.mockResolvedValue();
  });

  describe('ContextGatherer', () => {
    beforeEach(() => {
      ContextGatherer = require('../../lib/automation/context-gatherer');
    });

    test('should create ContextGatherer instance', () => {
      const gatherer = new ContextGatherer(configManager);
      expect(gatherer).toBeInstanceOf(ContextGatherer);
      expect(gatherer.configManager).toBe(configManager);
      expect(gatherer.cache).toBeInstanceOf(Map);
    });

    test('should throw error for missing required parameters', async () => {
      const gatherer = new ContextGatherer(configManager);

      await expect(gatherer.gatherTaskContext({})).rejects.toThrow(
        'Both specId and taskId are required'
      );
    });

    test('should gather context with proper structure', async () => {
      const gatherer = new ContextGatherer(configManager);

      // Mock specification file
      const mockSpec = `---
title: Test Feature
priority: P1
---
**TASK-001** Test Task | Agent: software-architect
- [ ] Test checklist item`;

      require('fs').promises.readFile.mockResolvedValue(mockSpec);

      const context = await gatherer.gatherTaskContext({
        specId: 'FEAT-028',
        taskId: 'TASK-001',
        agentType: 'software-architect'
      });

      expect(context).toHaveProperty('metadata');
      expect(context.metadata.specId).toBe('FEAT-028');
      expect(context.metadata.taskId).toBe('TASK-001');
      expect(context.metadata.agentType).toBe('software-architect');

      expect(context).toHaveProperty('taskSpecific');
      expect(context).toHaveProperty('validation');
      expect(context.validation).toHaveProperty('relevanceScore');
    });
  });

  describe('Enhanced ContextInjector', () => {
    beforeEach(() => {
      ContextInjector = require('../../lib/context-injector');
    });

    test('should create enhanced ContextInjector with ContextGatherer', () => {
      const injector = new ContextInjector(configManager);
      expect(injector).toBeInstanceOf(ContextInjector);
      expect(injector.contextGatherer).toBeDefined();
    });

    test('should provide automated context injection method', () => {
      const injector = new ContextInjector(configManager);
      expect(typeof injector.injectContextForTask).toBe('function');
      expect(typeof injector.performAutomatedContextInjection).toBe('function');
    });

    test('should validate required parameters for automated injection', async () => {
      const injector = new ContextInjector(configManager);

      await expect(injector.injectContextForTask({
        agentType: 'software-architect'
        // Missing specId and taskId
      })).rejects.toThrow('agentType, specId, and taskId are required');
    });
  });

  describe('PromptGenerator', () => {
    beforeEach(() => {
      PromptGenerator = require('../../lib/automation/prompt-generator');
    });

    test('should create PromptGenerator instance', () => {
      const generator = new PromptGenerator(configManager);
      expect(generator).toBeInstanceOf(PromptGenerator);
      expect(generator.templateCache).toBeInstanceOf(Map);
    });

    test('should validate required parameters', async () => {
      const generator = new PromptGenerator(configManager);

      await expect(generator.generateTaskPrompt({})).rejects.toThrow(
        'agentType and taskContext are required'
      );
    });

    test('should generate prompt with proper structure', async () => {
      const generator = new PromptGenerator(configManager);

      const mockTaskContext = {
        metadata: { taskId: 'TASK-001', specId: 'FEAT-028' },
        taskSpecific: {
          task: {
            title: 'Test Task',
            content: 'Test content',
            checklist: [{ item: 'Test item' }]
          },
          specification: {
            frontmatter: { title: 'Test Spec', priority: 'P1' },
            content: 'Test spec content'
          }
        },
        validation: { relevanceScore: 0.8, isSufficient: true }
      };

      const result = await generator.generateTaskPrompt({
        agentType: 'software-architect',
        taskContext: mockTaskContext
      });

      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.agentType).toBe('software-architect');
      expect(result.prompt).toContain('Test Task');
      expect(result.prompt).toContain('software-architect');
    });
  });

  describe('WorkspaceManager', () => {
    beforeEach(() => {
      WorkspaceManager = require('../../lib/automation/workspace-manager');
    });

    test('should create WorkspaceManager instance', () => {
      const manager = new WorkspaceManager(configManager);
      expect(manager).toBeInstanceOf(WorkspaceManager);
      expect(manager.activeWorkspaces).toBeInstanceOf(Map);
    });

    test('should validate required parameters for workspace setup', async () => {
      const manager = new WorkspaceManager(configManager);

      await expect(manager.setupWorkspace({})).rejects.toThrow(
        'specId, taskId, and agentType are required'
      );
    });

    test('should set up workspace with proper structure', async () => {
      const manager = new WorkspaceManager(configManager);

      const mockTaskContext = {
        metadata: { taskId: 'TASK-001', specId: 'FEAT-028' },
        taskSpecific: {
          task: { files: ['lib/test.js'] }
        }
      };

      const config = await manager.setupWorkspace({
        specId: 'FEAT-028',
        taskId: 'TASK-001',
        agentType: 'software-architect',
        taskContext: mockTaskContext
      });

      expect(config).toHaveProperty('metadata');
      expect(config.metadata.workspaceId).toContain('FEAT-028-TASK-001');
      expect(config).toHaveProperty('paths');
      expect(config).toHaveProperty('files');
      expect(config).toHaveProperty('environment');
    });
  });

  describe('Integration Tests', () => {
    test('should integrate ContextGatherer with ContextInjector', async () => {
      const ContextInjector = require('../../lib/context-injector');
      const injector = new ContextInjector(configManager);

      // Mock the context gatherer response
      const mockTaskContext = {
        metadata: { taskId: 'TASK-001', specId: 'FEAT-028' },
        validation: { relevanceScore: 0.8, isSufficient: true },
        taskSpecific: {
          specification: { title: 'Test' },
          task: { id: 'TASK-001', checklist: [] }
        }
      };

      // Mock the methods to avoid file system calls
      injector.contextGatherer.gatherTaskContext = jest.fn().mockResolvedValue(mockTaskContext);
      injector.injectContext = jest.fn().mockResolvedValue({
        layers: { critical: {}, taskSpecific: {} },
        metadata: { performance: {} },
        validation: { isValid: true }
      });

      const result = await injector.injectContextForTask({
        agentType: 'software-architect',
        specId: 'FEAT-028',
        taskId: 'TASK-001',
        automated: true
      });

      expect(result).toHaveProperty('automation');
      expect(result.automation.enabled).toBe(true);
      expect(result.automation.taskSpecific).toEqual(mockTaskContext);
    });

    test('should handle performance requirements', () => {
      const ContextGatherer = require('../../lib/automation/context-gatherer');
      const gatherer = new ContextGatherer(configManager);

      // Check performance-related properties
      expect(gatherer.cacheTimeout).toBe(300000); // 5 minutes
      expect(gatherer.maxCacheSize).toBe(100);
      expect(gatherer.relevanceThreshold).toBe(0.6);
    });

    test('should provide caching functionality', () => {
      const ContextGatherer = require('../../lib/automation/context-gatherer');
      const gatherer = new ContextGatherer(configManager);

      expect(typeof gatherer.clearCache).toBe('function');
      expect(typeof gatherer.getCacheStats).toBe('function');

      const stats = gatherer.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
    });

    test('should handle agent-specific optimizations', () => {
      const PromptGenerator = require('../../lib/automation/prompt-generator');
      const generator = new PromptGenerator(configManager);

      // Test that the instance has required properties
      expect(generator.templateCache).toBeInstanceOf(Map);
      expect(generator.maxPromptLength).toBe(32000);
      expect(typeof generator.generateTaskPrompt).toBe('function');
      expect(typeof generator.loadPromptTemplate).toBe('function');
    });
  });

  describe('Performance Validation', () => {
    test('should meet automation performance targets', () => {
      const ContextGatherer = require('../../lib/automation/context-gatherer');
      const ContextInjector = require('../../lib/context-injector');

      const _gatherer = new ContextGatherer(configManager);
      const injector = new ContextInjector(configManager);

      // Verify performance timeout settings
      expect(injector.performanceTimeout).toBe(500); // 500ms for standard injection
      // Context gathering should target <3 seconds for automation
    });

    test('should provide audit logging capabilities', () => {
      const ContextInjector = require('../../lib/context-injector');
      const injector = new ContextInjector(configManager);

      expect(typeof injector.auditLogContextOperation).toBe('function');
    });

    test('should support task recommendations', () => {
      const ContextInjector = require('../../lib/context-injector');
      const injector = new ContextInjector(configManager);

      expect(typeof injector.getContextualTaskRecommendations).toBe('function');
    });
  });
});