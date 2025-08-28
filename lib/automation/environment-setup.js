const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Environment Setup Manager for FEAT-028
 * Handles dependency checking, environment validation, and automated setup
 */
class EnvironmentSetup {
  constructor(configManager) {
    this.configManager = configManager;
    this.setupResults = new Map();
  }

  /**
   * Set up complete environment for task execution
   * @param {Object} workspaceConfig - Workspace configuration
   * @param {string} agentType - Agent type
   * @returns {Promise<Object>} Setup results
   */
  async setupEnvironment(workspaceConfig, agentType) {
    const setupId = `${workspaceConfig.metadata.workspaceId}-${Date.now()}`;
    const startTime = Date.now();

    const results = {
      setupId,
      success: false,
      environment: {
        node: {},
        npm: {},
        git: {},
        tools: {}
      },
      dependencies: {
        installed: [],
        missing: [],
        optional: []
      },
      validation: {
        passed: false,
        issues: [],
        warnings: []
      },
      performance: {
        setupTimeMs: 0,
        validationTimeMs: 0,
        installTimeMs: 0
      }
    };

    try {
      // Step 1: Validate Node.js environment
      await this.validateNodeEnvironment(results);

      // Step 2: Validate project dependencies
      await this.validateProjectDependencies(workspaceConfig, results);

      // Step 3: Set up agent-specific tools
      await this.setupAgentTools(agentType, results);

      // Step 4: Validate git environment
      await this.validateGitEnvironment(workspaceConfig, results);

      // Step 5: Set up environment variables
      await this.setupEnvironmentVariables(workspaceConfig, agentType, results);

      // Step 6: Run final validation
      await this.runFinalValidation(results);

      // Determine overall success
      results.success = results.validation.passed;
      results.performance.setupTimeMs = Date.now() - startTime;

      // Cache results
      this.setupResults.set(setupId, results);

      console.log(`[ENVIRONMENT] Setup ${results.success ? 'successful' : 'failed'} for ${workspaceConfig.metadata.workspaceId} in ${results.performance.setupTimeMs}ms`);

      return results;
    } catch (error) {
      results.success = false;
      results.validation.issues.push(`Environment setup failed: ${error.message}`);
      results.performance.setupTimeMs = Date.now() - startTime;
      
      return results;
    }
  }

  /**
   * Validate Node.js environment
   * @param {Object} results - Setup results object
   */
  async validateNodeEnvironment(results) {
    const startTime = Date.now();

    try {
      // Check Node.js version
      const nodeResult = await execAsync('node --version');
      const nodeVersion = nodeResult.stdout.trim();
      results.environment.node = {
        version: nodeVersion,
        available: true,
        compatible: this.isNodeVersionCompatible(nodeVersion)
      };

      if (!results.environment.node.compatible) {
        results.validation.warnings.push(`Node.js version ${nodeVersion} may not be compatible. Recommended: 16.x or higher`);
      }

      // Check npm version
      const npmResult = await execAsync('npm --version');
      const npmVersion = npmResult.stdout.trim();
      results.environment.npm = {
        version: npmVersion,
        available: true
      };

    } catch (error) {
      results.environment.node = { available: false, error: error.message };
      results.validation.issues.push(`Node.js environment validation failed: ${error.message}`);
    }

    results.performance.validationTimeMs += Date.now() - startTime;
  }

  /**
   * Validate project dependencies
   * @param {Object} workspaceConfig - Workspace configuration
   * @param {Object} results - Setup results object
   */
  async validateProjectDependencies(workspaceConfig, results) {
    const startTime = Date.now();
    const projectRoot = workspaceConfig.paths.project;

    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const nodeModulesPath = path.join(projectRoot, 'node_modules');
        
        // Check if dependencies are installed
        if (await this.fileExists(nodeModulesPath)) {
          results.dependencies.installed = Object.keys(packageJson.dependencies || {});
        } else {
          results.dependencies.missing = Object.keys(packageJson.dependencies || {});
          results.validation.issues.push('Project dependencies not installed - run npm install');
        }

        // Check for dev dependencies
        results.dependencies.optional = Object.keys(packageJson.devDependencies || {});

        // Attempt to install missing dependencies if npm is available
        if (results.dependencies.missing.length > 0 && results.environment.npm.available) {
          await this.installDependencies(projectRoot, results);
        }
      } else {
        results.validation.warnings.push('No package.json found in project root');
      }
    } catch (error) {
      results.validation.issues.push(`Dependency validation failed: ${error.message}`);
    }

    results.performance.validationTimeMs += Date.now() - startTime;
  }

  /**
   * Set up agent-specific tools
   * @param {string} agentType - Agent type
   * @param {Object} results - Setup results object
   */
  async setupAgentTools(agentType, results) {
    const agentTools = this.getAgentRequiredTools(agentType);
    
    for (const tool of agentTools) {
      try {
        const available = await this.isToolAvailable(tool);
        results.environment.tools[tool] = {
          available,
          required: true
        };

        if (!available) {
          results.validation.issues.push(`Required tool not available: ${tool}`);
        }
      } catch (error) {
        results.environment.tools[tool] = {
          available: false,
          required: true,
          error: error.message
        };
        results.validation.issues.push(`Tool validation failed for ${tool}: ${error.message}`);
      }
    }

    // Check optional tools
    const optionalTools = this.getAgentOptionalTools(agentType);
    for (const tool of optionalTools) {
      try {
        const available = await this.isToolAvailable(tool);
        results.environment.tools[tool] = {
          available,
          required: false
        };

        if (!available) {
          results.validation.warnings.push(`Optional tool not available: ${tool}`);
        }
      } catch (error) {
        results.environment.tools[tool] = {
          available: false,
          required: false,
          error: error.message
        };
      }
    }
  }

  /**
   * Validate git environment
   * @param {Object} workspaceConfig - Workspace configuration
   * @param {Object} results - Setup results object
   */
  async validateGitEnvironment(workspaceConfig, results) {
    try {
      // Check git availability
      const gitResult = await execAsync('git --version');
      results.environment.git = {
        version: gitResult.stdout.trim(),
        available: true
      };

      // Check if we're in a git repository
      const projectRoot = workspaceConfig.paths.project;
      const gitDir = path.join(projectRoot, '.git');
      
      if (await this.fileExists(gitDir)) {
        results.environment.git.repository = true;
        
        // Check git status
        const statusResult = await execAsync('git status --porcelain', { cwd: projectRoot });
        results.environment.git.cleanWorkingDirectory = statusResult.stdout.trim() === '';
        
        if (!results.environment.git.cleanWorkingDirectory) {
          results.validation.warnings.push('Git working directory has uncommitted changes');
        }
      } else {
        results.environment.git.repository = false;
        results.validation.warnings.push('Not in a git repository');
      }
    } catch (error) {
      results.environment.git = {
        available: false,
        error: error.message
      };
      results.validation.warnings.push(`Git validation failed: ${error.message}`);
    }
  }

  /**
   * Set up environment variables
   * @param {Object} workspaceConfig - Workspace configuration
   * @param {string} agentType - Agent type
   * @param {Object} results - Setup results object
   */
  async setupEnvironmentVariables(workspaceConfig, agentType, results) {
    try {
      const envVars = {
        ASD_WORKSPACE_ID: workspaceConfig.metadata.workspaceId,
        ASD_SPEC_ID: workspaceConfig.metadata.specId,
        ASD_TASK_ID: workspaceConfig.metadata.taskId,
        ASD_AGENT_TYPE: agentType,
        ASD_PROJECT_ROOT: workspaceConfig.paths.project,
        ASD_WORKSPACE_PATH: workspaceConfig.paths.workspace,
        ASD_LOG_PATH: workspaceConfig.paths.logs
      };

      // Set environment variables for current process
      Object.assign(process.env, envVars);

      // Create environment file for reference
      const envFile = path.join(workspaceConfig.paths.workspace, '.env');
      const envContent = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      await fs.writeFile(envFile, envContent, 'utf-8');

      results.environment.variables = envVars;
    } catch (error) {
      results.validation.warnings.push(`Environment variables setup failed: ${error.message}`);
    }
  }

  /**
   * Run final validation of environment setup
   * @param {Object} results - Setup results object
   */
  async runFinalValidation(results) {
    const startTime = Date.now();

    try {
      // Check critical requirements
      const criticalRequirements = [
        results.environment.node.available,
        results.environment.npm.available,
        results.dependencies.missing.length === 0
      ];

      const criticalPassed = criticalRequirements.every(req => req === true);
      
      if (!criticalPassed) {
        results.validation.issues.push('Critical environment requirements not met');
      }

      // Overall validation status
      results.validation.passed = criticalPassed && results.validation.issues.length === 0;

      // Add environment summary
      results.summary = {
        nodeReady: results.environment.node.available,
        dependenciesReady: results.dependencies.missing.length === 0,
        toolsReady: this.countAvailableTools(results.environment.tools),
        gitReady: results.environment.git.available,
        overallReady: results.validation.passed
      };

    } catch (error) {
      results.validation.issues.push(`Final validation failed: ${error.message}`);
    }

    results.performance.validationTimeMs += Date.now() - startTime;
  }

  /**
   * Install missing project dependencies
   * @param {string} projectRoot - Project root directory
   * @param {Object} results - Setup results object
   */
  async installDependencies(projectRoot, results) {
    const startTime = Date.now();
    
    try {
      console.log('[ENVIRONMENT] Installing missing dependencies...');
      
      const installResult = await execAsync('npm install', { 
        cwd: projectRoot,
        timeout: 60000 // 60 second timeout
      });
      
      results.dependencies.installed = results.dependencies.missing;
      results.dependencies.missing = [];
      
      console.log('[ENVIRONMENT] Dependencies installed successfully');
    } catch (error) {
      results.validation.issues.push(`Dependency installation failed: ${error.message}`);
      console.warn(`[ENVIRONMENT] Failed to install dependencies: ${error.message}`);
    }

    results.performance.installTimeMs = Date.now() - startTime;
  }

  /**
   * Create environment templates for different task types
   * @param {string} taskType - Type of task (implementation, testing, documentation)
   * @returns {Object} Environment template
   */
  createEnvironmentTemplate(taskType) {
    const templates = {
      implementation: {
        tools: ['eslint', 'prettier'],
        envVars: { NODE_ENV: 'development' },
        scripts: ['test', 'lint'],
        validation: ['syntax', 'formatting']
      },
      testing: {
        tools: ['mocha', 'nyc', 'chai'],
        envVars: { NODE_ENV: 'test' },
        scripts: ['test', 'coverage'],
        validation: ['test-execution', 'coverage-threshold']
      },
      documentation: {
        tools: ['markdown-lint'],
        envVars: { NODE_ENV: 'development' },
        scripts: ['docs'],
        validation: ['markdown-syntax', 'link-validation']
      }
    };

    return templates[taskType] || templates.implementation;
  }

  // Utility methods

  isNodeVersionCompatible(version) {
    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
    return majorVersion >= 16;
  }

  getAgentRequiredTools(agentType) {
    const tools = {
      'software-architect': ['eslint', 'git'],
      'cli-specialist': ['eslint', 'git'],
      'testing-specialist': ['eslint', 'mocha', 'git']
    };

    return tools[agentType] || ['eslint', 'git'];
  }

  getAgentOptionalTools(agentType) {
    const tools = {
      'software-architect': ['prettier', 'jsdoc'],
      'cli-specialist': ['prettier'],
      'testing-specialist': ['nyc', 'chai']
    };

    return tools[agentType] || ['prettier'];
  }

  async isToolAvailable(toolName) {
    try {
      await execAsync(`which ${toolName}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  countAvailableTools(tools) {
    const available = Object.values(tools).filter(tool => tool.available).length;
    const total = Object.keys(tools).length;
    return `${available}/${total}`;
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
   * Get setup results by ID
   * @param {string} setupId - Setup identifier
   * @returns {Object|null} Setup results
   */
  getSetupResults(setupId) {
    return this.setupResults.get(setupId) || null;
  }

  /**
   * List all setup results
   * @returns {Array} Array of setup results
   */
  listSetupResults() {
    return Array.from(this.setupResults.values());
  }

  /**
   * Clear old setup results (older than 1 hour)
   */
  clearOldResults() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [setupId, results] of this.setupResults.entries()) {
      const setupTime = Date.now() - results.performance.setupTimeMs;
      if (setupTime < oneHourAgo) {
        this.setupResults.delete(setupId);
      }
    }
  }
}

module.exports = EnvironmentSetup;