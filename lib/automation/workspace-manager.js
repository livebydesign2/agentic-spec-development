const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Workspace Manager for FEAT-028
 * Manages automatic work environment configuration for task assignments
 */
class WorkspaceManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.workspaceTemplates = new Map();
    this.activeWorkspaces = new Map();
  }

  /**
   * Set up work environment for a task assignment
   * @param {Object} options - Setup options
   * @param {string} options.specId - Specification ID
   * @param {string} options.taskId - Task ID
   * @param {string} options.agentType - Agent type
   * @param {Object} options.taskContext - Task context from ContextGatherer
   * @param {Object} options.baseContext - Base context from ContextInjector
   * @returns {Promise<Object>} Workspace configuration
   */
  async setupWorkspace(options) {
    const { specId, taskId, agentType, taskContext, baseContext } = options;

    if (!specId || !taskId || !agentType) {
      throw new Error(
        'specId, taskId, and agentType are required for workspace setup'
      );
    }

    const workspaceId = `${specId}-${taskId}`;
    const startTime = Date.now();

    try {
      // Step 1: Create workspace configuration
      const config = await this.createWorkspaceConfiguration({
        workspaceId,
        specId,
        taskId,
        agentType,
        taskContext,
        baseContext,
      });

      // Step 2: Initialize file paths and directories
      await this.initializeFilePaths(config);

      // Step 3: Validate dependencies and tools
      await this.validateEnvironment(config);

      // Step 4: Set up agent-specific resources
      await this.setupAgentResources(config, agentType);

      // Step 5: Create workspace state tracking
      await this.initializeWorkspaceState(config);

      // Record workspace as active
      this.activeWorkspaces.set(workspaceId, {
        config,
        createdAt: new Date().toISOString(),
        status: 'active',
      });

      const setupTime = Date.now() - startTime;
      config.performance.setupTimeMs = setupTime;

      console.log(
        `[WORKSPACE] Setup complete for ${workspaceId} in ${setupTime}ms`
      );

      return config;
    } catch (error) {
      const setupTime = Date.now() - startTime;
      throw new Error(
        `Workspace setup failed for ${workspaceId} after ${setupTime}ms: ${error.message}`
      );
    }
  }

  /**
   * Create workspace configuration based on task context
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Workspace configuration
   */
  async createWorkspaceConfiguration(options) {
    const { workspaceId, specId, taskId, agentType, taskContext } = options;
    const projectRoot = this.configManager.getProjectRoot();

    const config = {
      metadata: {
        workspaceId,
        specId,
        taskId,
        agentType,
        projectRoot,
        createdAt: new Date().toISOString(),
        nodeVersion: process.version,
        platform: os.platform(),
      },

      paths: {
        project: projectRoot,
        workspace: path.join(projectRoot, '.asd', 'workspaces', workspaceId),
        temp: path.join(os.tmpdir(), 'asd-workspace', workspaceId),
        logs: path.join(projectRoot, '.asd', 'logs', workspaceId),
      },

      files: {
        primary: [],
        related: [],
        tests: [],
        documentation: [],
        backup: [],
      },

      dependencies: {
        required: [],
        optional: [],
        missing: [],
      },

      tools: {
        available: [],
        required: [],
        missing: [],
      },

      environment: {
        variables: {},
        settings: {},
        validation: {
          passed: false,
          issues: [],
          warnings: [],
        },
      },

      automation: {
        triggers: [],
        hooks: [],
        cleanup: [],
      },

      performance: {
        setupTimeMs: 0,
        validationTimeMs: 0,
        resourceLoadTimeMs: 0,
      },
    };

    // Extract file paths from task context
    if (taskContext?.taskSpecific?.task?.files) {
      for (const file of taskContext.taskSpecific.task.files) {
        const fullPath = path.resolve(projectRoot, file);
        config.files.primary.push({
          relativePath: file,
          absolutePath: fullPath,
          exists: await this.fileExists(fullPath),
          category: this.categorizeFile(file),
        });
      }
    }

    // Add related files from context
    if (taskContext?.relatedFiles) {
      for (const [category, files] of Object.entries(
        taskContext.relatedFiles
      )) {
        for (const file of files) {
          config.files[category] = config.files[category] || [];
          config.files[category].push({
            relativePath: file.path,
            absolutePath: path.resolve(projectRoot, file.path),
            relevance: file.relevance,
            size: file.size,
          });
        }
      }
    }

    return config;
  }

  /**
   * Initialize file paths and create necessary directories
   * @param {Object} config - Workspace configuration
   */
  async initializeFilePaths(config) {
    const startTime = Date.now();

    try {
      // Create workspace directories
      await fs.mkdir(config.paths.workspace, { recursive: true });
      await fs.mkdir(config.paths.temp, { recursive: true });
      await fs.mkdir(config.paths.logs, { recursive: true });

      // Verify primary files exist
      for (const file of config.files.primary) {
        if (!file.exists) {
          config.environment.validation.issues.push(
            `Primary file not found: ${file.relativePath}`
          );
        }
      }

      // Create backup directory for modified files
      const backupDir = path.join(config.paths.workspace, 'backups');
      await fs.mkdir(backupDir, { recursive: true });

      config.paths.backup = backupDir;
      config.performance.resourceLoadTimeMs = Date.now() - startTime;
    } catch (error) {
      throw new Error(`Failed to initialize file paths: ${error.message}`);
    }
  }

  /**
   * Validate environment dependencies and tools
   * @param {Object} config - Workspace configuration
   */
  async validateEnvironment(config) {
    const startTime = Date.now();

    try {
      // Check Node.js tools
      const nodeTools = ['npm', 'node'];
      for (const tool of nodeTools) {
        const available = await this.isToolAvailable(tool);
        if (available) {
          config.tools.available.push(tool);
        } else {
          config.tools.missing.push(tool);
          config.environment.validation.issues.push(
            `Required tool not available: ${tool}`
          );
        }
      }

      // Check development tools
      const devTools = ['git', 'eslint'];
      for (const tool of devTools) {
        const available = await this.isToolAvailable(tool);
        if (available) {
          config.tools.available.push(tool);
        } else {
          config.tools.optional.push(tool);
          config.environment.validation.warnings.push(
            `Optional tool not available: ${tool}`
          );
        }
      }

      // Validate project dependencies
      const packageJsonPath = path.join(config.paths.project, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8')
        );

        // Check if node_modules exists
        const nodeModulesPath = path.join(config.paths.project, 'node_modules');
        if (!(await this.fileExists(nodeModulesPath))) {
          config.environment.validation.warnings.push(
            'node_modules not found - may need npm install'
          );
        }

        config.dependencies.required = Object.keys(
          packageJson.dependencies || {}
        );
        config.dependencies.optional = Object.keys(
          packageJson.devDependencies || {}
        );
      }

      // Validate file system permissions
      await this.validateFilePermissions(config);

      // Overall validation status
      config.environment.validation.passed =
        config.environment.validation.issues.length === 0;
      config.performance.validationTimeMs = Date.now() - startTime;
    } catch (error) {
      config.environment.validation.issues.push(
        `Environment validation failed: ${error.message}`
      );
      config.environment.validation.passed = false;
    }
  }

  /**
   * Set up agent-specific resources and configurations
   * @param {Object} config - Workspace configuration
   * @param {string} agentType - Agent type
   */
  async setupAgentResources(config, agentType) {
    const agentResources = await this.getAgentSpecificResources(agentType);

    // Add agent-specific tools
    config.tools.required.push(...agentResources.tools);

    // Set agent-specific environment variables
    config.environment.variables = {
      ...config.environment.variables,
      ...agentResources.environmentVariables,
    };

    // Add agent-specific automation hooks
    config.automation.hooks.push(...agentResources.hooks);

    // Create agent-specific workspace files
    if (agentResources.workspaceFiles) {
      for (const [filename, content] of Object.entries(
        agentResources.workspaceFiles
      )) {
        const filePath = path.join(config.paths.workspace, filename);
        await fs.writeFile(filePath, content, 'utf-8');
      }
    }
  }

  /**
   * Initialize workspace state tracking
   * @param {Object} config - Workspace configuration
   */
  async initializeWorkspaceState(config) {
    const stateFile = path.join(config.paths.workspace, 'state.json');

    const initialState = {
      workspaceId: config.metadata.workspaceId,
      status: 'initialized',
      createdAt: config.metadata.createdAt,
      lastModified: new Date().toISOString(),
      taskProgress: {
        started: false,
        completed: false,
        checklistItems: [],
      },
      fileChanges: [],
      performance: {
        setupTime: config.performance.setupTimeMs,
        validationTime: config.performance.validationTimeMs,
      },
      validation: config.environment.validation,
    };

    await fs.writeFile(
      stateFile,
      JSON.stringify(initialState, null, 2),
      'utf-8'
    );
    config.paths.stateFile = stateFile;
  }

  /**
   * Clean up workspace and reset for task transitions
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} [options] - Cleanup options
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupWorkspace(workspaceId, options = {}) {
    const { preserveBackups = true, preserveLogs = true } = options;

    if (!this.activeWorkspaces.has(workspaceId)) {
      throw new Error(`Workspace ${workspaceId} is not active`);
    }

    const workspace = this.activeWorkspaces.get(workspaceId);
    const config = workspace.config;
    const results = {
      cleaned: [],
      preserved: [],
      errors: [],
    };

    try {
      // Clean temporary files
      if (await this.fileExists(config.paths.temp)) {
        await fs.rm(config.paths.temp, { recursive: true, force: true });
        results.cleaned.push('temporary files');
      }

      // Handle backups
      if (!preserveBackups && (await this.fileExists(config.paths.backup))) {
        await fs.rm(config.paths.backup, { recursive: true, force: true });
        results.cleaned.push('backup files');
      } else if (preserveBackups) {
        results.preserved.push('backup files');
      }

      // Handle logs
      if (!preserveLogs && (await this.fileExists(config.paths.logs))) {
        await fs.rm(config.paths.logs, { recursive: true, force: true });
        results.cleaned.push('log files');
      } else if (preserveLogs) {
        results.preserved.push('log files');
      }

      // Update workspace state
      workspace.status = 'cleaned';
      workspace.cleanedAt = new Date().toISOString();

      // Remove from active workspaces
      this.activeWorkspaces.delete(workspaceId);

      console.log(
        `[WORKSPACE] Cleaned ${workspaceId}: ${results.cleaned.length} categories cleaned`
      );

      return results;
    } catch (error) {
      results.errors.push(`Cleanup failed: ${error.message}`);
      return results;
    }
  }

  /**
   * Get workspace status and performance metrics
   * @param {string} workspaceId - Workspace identifier
   * @returns {Promise<Object>} Workspace status
   */
  async getWorkspaceStatus(workspaceId) {
    if (!this.activeWorkspaces.has(workspaceId)) {
      return {
        exists: false,
        status: 'not_found',
      };
    }

    const workspace = this.activeWorkspaces.get(workspaceId);
    const config = workspace.config;

    try {
      // Read current state from file
      const stateFile = config.paths.stateFile;
      let currentState = {};

      if (await this.fileExists(stateFile)) {
        const stateContent = await fs.readFile(stateFile, 'utf-8');
        currentState = JSON.parse(stateContent);
      }

      return {
        exists: true,
        workspaceId,
        status: workspace.status,
        createdAt: workspace.createdAt,
        agentType: config.metadata.agentType,
        taskProgress: currentState.taskProgress || {},
        validation: currentState.validation || config.environment.validation,
        performance: currentState.performance || config.performance,
        paths: {
          workspace: config.paths.workspace,
          logs: config.paths.logs,
        },
      };
    } catch (error) {
      return {
        exists: true,
        status: 'error',
        error: error.message,
      };
    }
  }

  // Utility methods

  categorizeFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath).toLowerCase();

    if (
      baseName.includes('test') ||
      baseName.includes('spec') ||
      ext === '.test.js'
    ) {
      return 'test';
    }
    if (
      ext === '.md' ||
      baseName.includes('readme') ||
      baseName.includes('doc')
    ) {
      return 'documentation';
    }
    if (
      baseName.includes('config') ||
      ext === '.json' ||
      ext === '.yml' ||
      ext === '.yaml'
    ) {
      return 'configuration';
    }
    return 'implementation';
  }

  async getAgentSpecificResources(agentType) {
    const resources = {
      'software-architect': {
        tools: ['eslint', 'prettier'],
        environmentVariables: {
          ASD_AGENT_TYPE: 'software-architect',
          ASD_FOCUS: 'architecture',
        },
        hooks: ['pre-commit', 'post-implementation'],
        workspaceFiles: {
          'ARCHITECTURE_NOTES.md':
            '# Architecture Notes\n\nDocument architectural decisions and patterns here.\n',
          'INTEGRATION_CHECKLIST.md':
            '# Integration Checklist\n\n- [ ] System compatibility verified\n- [ ] Performance requirements met\n- [ ] Security considerations addressed\n',
        },
      },
      'cli-specialist': {
        tools: ['eslint'],
        environmentVariables: {
          ASD_AGENT_TYPE: 'cli-specialist',
          ASD_FOCUS: 'cli-interface',
        },
        hooks: ['ui-validation'],
        workspaceFiles: {
          'CLI_TESTING.md':
            '# CLI Testing Notes\n\nDocument CLI testing approaches and results.\n',
        },
      },
      'testing-specialist': {
        tools: ['eslint', 'mocha', 'nyc'],
        environmentVariables: {
          ASD_AGENT_TYPE: 'testing-specialist',
          ASD_FOCUS: 'testing',
        },
        hooks: ['test-validation', 'coverage-check'],
        workspaceFiles: {
          'TEST_PLAN.md':
            '# Test Plan\n\nDocument test strategy and coverage goals.\n',
        },
      },
    };

    return (
      resources[agentType] || {
        tools: [],
        environmentVariables: { ASD_AGENT_TYPE: agentType },
        hooks: [],
        workspaceFiles: {},
      }
    );
  }

  async validateFilePermissions(config) {
    try {
      // Test write permissions in project directory
      const testFile = path.join(config.paths.project, '.asd-permission-test');
      await fs.writeFile(testFile, 'test', 'utf-8');
      await fs.unlink(testFile);
    } catch (error) {
      config.environment.validation.issues.push(
        `Insufficient write permissions in project directory: ${error.message}`
      );
    }

    try {
      // Test write permissions in workspace directory
      const testFile = path.join(config.paths.workspace, '.permission-test');
      await fs.writeFile(testFile, 'test', 'utf-8');
      await fs.unlink(testFile);
    } catch (error) {
      config.environment.validation.issues.push(
        `Insufficient write permissions in workspace directory: ${error.message}`
      );
    }
  }

  async isToolAvailable(toolName) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      await execAsync(`which ${toolName}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all active workspaces
   * @returns {Array} Array of active workspace information
   */
  listActiveWorkspaces() {
    return Array.from(this.activeWorkspaces.entries()).map(
      ([id, workspace]) => ({
        workspaceId: id,
        agentType: workspace.config.metadata.agentType,
        specId: workspace.config.metadata.specId,
        taskId: workspace.config.metadata.taskId,
        status: workspace.status,
        createdAt: workspace.createdAt,
      })
    );
  }

  /**
   * Clean up all inactive workspaces
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupAllInactive() {
    const results = {
      cleaned: 0,
      errors: [],
    };

    const inactive = Array.from(this.activeWorkspaces.entries()).filter(
      ([_, workspace]) =>
        workspace.status === 'completed' || workspace.status === 'failed'
    );

    for (const [workspaceId] of inactive) {
      try {
        await this.cleanupWorkspace(workspaceId);
        results.cleaned++;
      } catch (error) {
        results.errors.push(
          `Failed to cleanup ${workspaceId}: ${error.message}`
        );
      }
    }

    return results;
  }
}

module.exports = WorkspaceManager;
