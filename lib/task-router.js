const fs = require("fs").promises;
const path = require("path");
const SpecParser = require("./feature-parser");
const ConfigManager = require("./config-manager");

/**
 * TaskRouter - Core Task Routing Engine for ASD CLI
 * 
 * Provides intelligent task routing with dependency validation,
 * agent capability matching, and priority-based recommendations.
 * 
 * Features:
 * - Task discovery from spec files via SpecParser
 * - Dependency resolution and blocking validation
 * - Agent capability matching based on specializations
 * - Priority weighting (P0 > P1 > P2 > P3)
 * - Performance optimization with caching
 */
class TaskRouter {
  constructor(configManager = null, specParser = null) {
    this.configManager = configManager || new ConfigManager();
    this.specParser = specParser || new SpecParser(this.configManager);
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.performanceTimeout = 200; // 200ms requirement from spec
    
    // Priority weights for task scoring
    this.priorityWeights = {
      'P0': 1000,  // Critical - always prioritized
      'P1': 100,   // High - important work  
      'P2': 10,    // Medium - normal priority
      'P3': 1      // Low - background tasks
    };
    
    // Agent capabilities loaded from config
    this.agentCapabilities = null;
    this.taskMatchingKeywords = null;
  }

  /**
   * Initialize TaskRouter by loading agent capabilities and specs
   */
  async initialize() {
    const startTime = Date.now();
    
    try {
      // Load agent capabilities configuration
      await this.loadAgentCapabilities();
      
      // Load all specs to cache tasks
      await this.specParser.loadSpecs();
      
      const initTime = Date.now() - startTime;
      if (initTime > 100) {
        console.warn(`TaskRouter initialization took ${initTime}ms`);
      }
      
      return true;
    } catch (error) {
      throw new Error(`TaskRouter initialization failed: ${error.message}`);
    }
  }

  /**
   * Load agent capabilities from configuration file
   */
  async loadAgentCapabilities() {
    try {
      const projectRoot = this.configManager.getProjectRoot();
      const agentCapabilitiesPath = path.join(
        projectRoot, 
        ".asd", 
        "config", 
        "agent-capabilities.json"
      );
      
      const configContent = await fs.readFile(agentCapabilitiesPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      this.agentCapabilities = config.agent_capabilities;
      this.taskMatchingKeywords = config.task_matching?.capability_keywords || {};
      
      return true;
    } catch (error) {
      console.warn(`Failed to load agent capabilities: ${error.message}`);
      // Continue with default/fallback behavior
      this.agentCapabilities = { agents: {} };
      this.taskMatchingKeywords = {};
      return false;
    }
  }

  /**
   * Get next recommended task for an agent
   * @param {string} agentType - Type of agent (e.g., 'backend-developer')
   * @param {Object} constraints - Optional constraints for filtering
   * @returns {Promise<Object|null>} Recommended task with reasoning
   */
  async getNextTask(agentType, constraints = {}) {
    const startTime = Date.now();
    
    try {
      if (!agentType) {
        throw new Error("Agent type is required for task routing");
      }

      // Check cache first
      const cacheKey = `nextTask-${agentType}-${JSON.stringify(constraints)}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.task;
        }
        this.cache.delete(cacheKey);
      }

      // Get all available tasks
      const availableTasks = await this.getAvailableTasks(constraints);
      
      if (availableTasks.length === 0) {
        return {
          task: null,
          reason: "No available tasks found",
          recommendations: []
        };
      }

      // Score and rank tasks for this agent
      const scoredTasks = availableTasks
        .map(task => ({
          ...task,
          score: this.calculateTaskScore(task, agentType, constraints),
          reasoning: this.getTaskRecommendationReasoning(task, agentType)
        }))
        .sort((a, b) => b.score - a.score);

      // Filter tasks that match agent capabilities
      const capableAgentTasks = scoredTasks.filter(task => 
        this.validateAgentCapability(task, agentType)
      );

      const recommendedTask = capableAgentTasks[0] || null;
      const alternativeTasks = capableAgentTasks.slice(1, 4); // Top 3 alternatives

      const result = {
        task: recommendedTask,
        reason: recommendedTask 
          ? `Best match: ${recommendedTask.reasoning}` 
          : "No tasks match agent capabilities",
        alternatives: alternativeTasks,
        totalAvailable: availableTasks.length,
        agentMatches: capableAgentTasks.length
      };

      // Cache the result
      this.cache.set(cacheKey, {
        task: result,
        timestamp: Date.now()
      });

      // Performance check
      const routingTime = Date.now() - startTime;
      if (routingTime > this.performanceTimeout) {
        console.warn(
          `Task routing took ${routingTime}ms, exceeding ${this.performanceTimeout}ms target`
        );
      }

      return result;
    } catch (error) {
      throw new Error(`Task routing failed: ${error.message}`);
    }
  }

  /**
   * Get multiple next tasks for an agent (batch recommendations)
   * @param {string} agentType - Type of agent
   * @param {number} limit - Maximum number of tasks to return
   * @param {Object} constraints - Optional constraints
   * @returns {Promise<Array>} Array of recommended tasks
   */
  async getNextTasks(agentType, limit = 5, constraints = {}) {
    const result = await this.getNextTask(agentType, constraints);
    
    if (!result.task) {
      return [];
    }

    const tasks = [result.task, ...(result.alternatives || [])];
    return tasks.slice(0, limit);
  }

  /**
   * Get all available tasks that can be worked on
   * @param {Object} constraints - Filtering constraints
   * @returns {Promise<Array>} Array of available tasks
   */
  async getAvailableTasks(constraints = {}) {
    const startTime = Date.now();
    
    try {
      // Get all specs and extract tasks
      const allSpecs = this.specParser.getSpecs();
      const allTasks = [];

      // Extract tasks from all specs
      for (const spec of allSpecs) {
        if (spec.tasks && spec.tasks.length > 0) {
          for (const task of spec.tasks) {
            // Enrich task with spec context
            const enrichedTask = {
              ...task,
              specId: spec.id,
              specTitle: spec.title,
              specPriority: spec.priority,
              specStatus: spec.status,
              phase: spec.phase,
              context_requirements: task.context_requirements || []
            };
            
            allTasks.push(enrichedTask);
          }
        }
      }

      // Filter tasks based on availability and constraints
      const availableTasks = allTasks.filter(task => {
        // Must be in ready or unassigned status
        if (!this.isTaskAvailable(task)) {
          return false;
        }

        // Must not be blocked by dependencies
        if (this.isTaskBlocked(task, allTasks)) {
          return false;
        }

        // Apply constraint filters
        if (!this.matchesConstraints(task, constraints)) {
          return false;
        }

        return true;
      });

      const filterTime = Date.now() - startTime;
      if (filterTime > 50) {
        console.debug(`Task filtering took ${filterTime}ms for ${allTasks.length} tasks`);
      }

      return availableTasks;
    } catch (error) {
      throw new Error(`Failed to get available tasks: ${error.message}`);
    }
  }

  /**
   * Check if a task is available for assignment
   * @param {Object} task - Task object
   * @returns {boolean} Whether task is available
   */
  isTaskAvailable(task) {
    // Task must be in ready status or pending
    const availableStatuses = ['ready', 'pending', undefined];
    return availableStatuses.includes(task.status);
  }

  /**
   * Check if a task is blocked by dependencies
   * @param {Object} task - Task to check
   * @param {Array} allTasks - All tasks in the system
   * @returns {boolean} Whether task is blocked
   */
  isTaskBlocked(task, allTasks) {
    // Check if task has dependencies defined
    if (!task.depends_on || task.depends_on.length === 0) {
      return false; // No dependencies, not blocked
    }

    // Check each dependency
    for (const dependencyId of task.depends_on) {
      const dependencyTask = allTasks.find(t => 
        t.id === dependencyId || t.specId === dependencyId
      );
      
      if (!dependencyTask) {
        // Dependency not found - might be external, treat as blocking
        return true;
      }
      
      // Dependency must be completed
      if (dependencyTask.status !== 'complete' && dependencyTask.status !== 'done') {
        return true;
      }
    }

    return false; // All dependencies met
  }

  /**
   * Check if task matches the given constraints
   * @param {Object} task - Task to check
   * @param {Object} constraints - Filtering constraints
   * @returns {boolean} Whether task matches constraints
   */
  matchesConstraints(task, constraints) {
    // Priority filtering
    if (constraints.priority) {
      const allowedPriorities = Array.isArray(constraints.priority)
        ? constraints.priority
        : [constraints.priority];
      
      const taskPriority = task.specPriority || task.priority || 'P2';
      if (!allowedPriorities.includes(taskPriority)) {
        return false;
      }
    }

    // Phase filtering
    if (constraints.phase) {
      const allowedPhases = Array.isArray(constraints.phase)
        ? constraints.phase
        : [constraints.phase];
      
      if (task.phase && !allowedPhases.includes(task.phase)) {
        return false;
      }
    }

    // Agent type filtering
    if (constraints.agentType && task.agent_type) {
      if (task.agent_type !== constraints.agentType) {
        return false;
      }
    }

    // Status filtering (for specs)
    if (constraints.specStatus) {
      const allowedStatuses = Array.isArray(constraints.specStatus)
        ? constraints.specStatus
        : [constraints.specStatus];
      
      if (!allowedStatuses.includes(task.specStatus)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate if an agent can handle a specific task
   * @param {Object} task - Task to validate
   * @param {string} agentType - Type of agent
   * @returns {boolean} Whether agent can handle task
   */
  validateAgentCapability(task, agentType) {
    // If task specifies a required agent type, it must match
    if (task.agent_type && task.agent_type !== agentType) {
      return false;
    }

    // Get agent definition
    const agentDef = this.agentCapabilities?.agents?.[agentType];
    if (!agentDef) {
      // No agent definition found, allow by default
      return true;
    }

    // Check if agent has required context capabilities
    const taskContextReqs = task.context_requirements || [];
    const agentContextCaps = agentDef.context_requirements || [];
    
    // Agent must support all required contexts for the task
    const hasRequiredContexts = taskContextReqs.every(req => 
      agentContextCaps.some(cap => 
        cap.includes(req) || req.includes(cap) || this.isRelatedContext(req, cap)
      )
    );

    if (!hasRequiredContexts && taskContextReqs.length > 0) {
      return false;
    }

    // Check keyword matching for task content
    const taskKeywords = this.extractTaskKeywords(task);
    const agentSpecializations = agentDef.specialization_areas || [];
    
    // Agent should have some relevant specialization for the task
    const hasRelevantSpecialization = agentSpecializations.some(spec =>
      taskKeywords.some(keyword => 
        this.isKeywordMatch(keyword, spec) || this.isRelatedSpecialization(keyword, spec)
      )
    );

    // For tasks without clear keywords, allow if agent contexts match
    if (taskKeywords.length === 0) {
      return hasRequiredContexts || taskContextReqs.length === 0;
    }

    return hasRelevantSpecialization || hasRequiredContexts;
  }

  /**
   * Calculate priority score for task recommendation
   * @param {Object} task - Task to score
   * @param {string} agentType - Type of agent
   * @param {Object} constraints - Additional constraints
   * @returns {number} Task score for ranking
   */
  calculateTaskScore(task, agentType, constraints = {}) {
    let score = 0;

    // Base priority weight
    const priority = task.specPriority || task.priority || 'P2';
    score += this.priorityWeights[priority] || this.priorityWeights.P2;

    // Perfect agent match bonus
    if (task.agent_type === agentType) {
      score *= 2.0;
    }

    // Phase alignment bonus
    if (constraints.phase && task.phase === constraints.phase) {
      score *= 1.5;
    }

    // Context capability match bonus
    const agentDef = this.agentCapabilities?.agents?.[agentType];
    if (agentDef) {
      const taskContextReqs = task.context_requirements || [];
      const agentContextCaps = agentDef.context_requirements || [];
      
      const contextMatchScore = taskContextReqs.length > 0
        ? taskContextReqs.filter(req => 
            agentContextCaps.some(cap => cap.includes(req) || req.includes(cap))
          ).length / taskContextReqs.length
        : 1.0;
      
      score *= (0.5 + contextMatchScore * 0.5); // 0.5 to 1.0 multiplier
    }

    // Estimated hours penalty for very large tasks
    if (task.estimated_hours && task.estimated_hours > 8) {
      score *= 0.8; // Slight penalty for very large tasks
    }

    // Boost for tasks in active specs
    if (task.specStatus === 'active') {
      score *= 1.3;
    }

    return Math.round(score);
  }

  /**
   * Get recommendation reasoning for a task
   * @param {Object} task - Task being recommended
   * @param {string} agentType - Type of agent
   * @returns {string} Human-readable reasoning
   */
  getTaskRecommendationReasoning(task, agentType) {
    const reasons = [];

    // Priority reasoning
    const priority = task.specPriority || task.priority || 'P2';
    if (priority === 'P0') {
      reasons.push('Critical priority');
    } else if (priority === 'P1') {
      reasons.push('High priority');
    }

    // Agent match reasoning
    if (task.agent_type === agentType) {
      reasons.push('Perfect agent match');
    }

    // Spec status reasoning
    if (task.specStatus === 'active') {
      reasons.push('Active feature');
    }

    // Context capability reasoning
    const agentDef = this.agentCapabilities?.agents?.[agentType];
    if (agentDef && task.context_requirements && task.context_requirements.length > 0) {
      const matchingContexts = task.context_requirements.filter(req =>
        agentDef.context_requirements?.some(cap => cap.includes(req) || req.includes(cap))
      );
      
      if (matchingContexts.length > 0) {
        reasons.push(`Context match: ${matchingContexts.join(', ')}`);
      }
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Available task';
  }

  /**
   * Extract keywords from task for matching
   * @param {Object} task - Task to analyze
   * @returns {Array<string>} Extracted keywords
   */
  extractTaskKeywords(task) {
    const text = `${task.title} ${task.id}`.toLowerCase();
    const keywords = [];

    // Check against known capability keywords
    for (const [keyword, agents] of Object.entries(this.taskMatchingKeywords)) {
      if (text.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    }

    // Extract from task ID and title
    const commonKeywords = [
      'api', 'cli', 'ui', 'database', 'test', 'performance', 'integration',
      'architecture', 'deployment', 'monitoring', 'validation', 'automation'
    ];

    commonKeywords.forEach(keyword => {
      if (text.includes(keyword) && !keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return keywords;
  }

  /**
   * Check if keyword matches specialization
   * @param {string} keyword - Task keyword
   * @param {string} specialization - Agent specialization
   * @returns {boolean} Whether they match
   */
  isKeywordMatch(keyword, specialization) {
    const keywordLower = keyword.toLowerCase();
    const specLower = specialization.toLowerCase();
    
    return specLower.includes(keywordLower) || keywordLower.includes(specLower);
  }

  /**
   * Check if contexts are related
   * @param {string} context1 - First context
   * @param {string} context2 - Second context  
   * @returns {boolean} Whether contexts are related
   */
  isRelatedContext(context1, context2) {
    const relatedContexts = {
      'api': ['integration', 'data-models'],
      'database': ['data-models', 'performance'],
      'cli': ['user-workflows', 'automation'],
      'ui': ['user-experience', 'interaction-patterns'],
      'testing': ['validation', 'quality-standards'],
      'architecture': ['system-design', 'technical-constraints']
    };

    const c1Lower = context1.toLowerCase();
    const c2Lower = context2.toLowerCase();

    for (const [key, related] of Object.entries(relatedContexts)) {
      if ((c1Lower.includes(key) || c2Lower.includes(key)) &&
          (related.some(r => c1Lower.includes(r)) || related.some(r => c2Lower.includes(r)))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if keyword is related to specialization
   * @param {string} keyword - Task keyword
   * @param {string} specialization - Agent specialization
   * @returns {boolean} Whether they're related
   */
  isRelatedSpecialization(keyword, specialization) {
    const relatedSpecs = {
      'api': ['backend', 'integration', 'server'],
      'cli': ['terminal', 'command', 'automation'],
      'ui': ['interface', 'user-experience', 'design'],
      'database': ['data', 'storage', 'backend'],
      'test': ['quality', 'validation', 'qa'],
      'performance': ['optimization', 'monitoring']
    };

    const keywordLower = keyword.toLowerCase();
    const specLower = specialization.toLowerCase();

    for (const [key, related] of Object.entries(relatedSpecs)) {
      if (keywordLower.includes(key) || specLower.includes(key)) {
        return related.some(r => specLower.includes(r) || keywordLower.includes(r));
      }
    }

    return false;
  }

  /**
   * Get dependency chain for a task
   * @param {string} taskId - Task ID to analyze
   * @returns {Promise<Object>} Dependency chain information
   */
  async getDependencyChain(taskId) {
    const allTasks = await this.getAllTasks();
    const task = allTasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const chain = {
      taskId,
      dependencies: [],
      dependents: [],
      blockedBy: [],
      blocking: []
    };

    // Find direct dependencies
    if (task.depends_on && task.depends_on.length > 0) {
      chain.dependencies = task.depends_on.map(depId => {
        const depTask = allTasks.find(t => t.id === depId || t.specId === depId);
        return {
          id: depId,
          found: !!depTask,
          status: depTask?.status || 'unknown',
          completed: depTask?.status === 'complete' || depTask?.status === 'done'
        };
      });
      
      // Find what's blocking this task
      chain.blockedBy = chain.dependencies
        .filter(dep => !dep.completed)
        .map(dep => dep.id);
    }

    // Find tasks that depend on this task
    const dependentTasks = allTasks.filter(t => 
      t.depends_on && t.depends_on.some(depId => depId === taskId || depId === task.specId)
    );
    
    chain.dependents = dependentTasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status
    }));

    // Find what this task is blocking
    if (task.status !== 'complete' && task.status !== 'done') {
      chain.blocking = dependentTasks
        .filter(t => t.status === 'ready' || !t.status)
        .map(t => t.id);
    }

    return chain;
  }

  /**
   * Get all tasks from all specs
   * @returns {Promise<Array>} All tasks in system
   */
  async getAllTasks() {
    const allSpecs = this.specParser.getSpecs();
    const allTasks = [];

    for (const spec of allSpecs) {
      if (spec.tasks && spec.tasks.length > 0) {
        for (const task of spec.tasks) {
          allTasks.push({
            ...task,
            specId: spec.id,
            specTitle: spec.title,
            specPriority: spec.priority,
            specStatus: spec.status,
            phase: spec.phase
          });
        }
      }
    }

    return allTasks;
  }

  /**
   * Get ready tasks with filtering
   * @param {Object} filters - Filtering options
   * @returns {Promise<Array>} Filtered ready tasks
   */
  async getReadyTasks(filters = {}) {
    const availableTasks = await this.getAvailableTasks(filters);
    return availableTasks.filter(task => task.status === 'ready' || !task.status);
  }

  /**
   * Get blocked tasks
   * @returns {Promise<Array>} Tasks that are blocked by dependencies
   */
  async getBlockedTasks() {
    const allTasks = await this.getAllTasks();
    const blockedTasks = [];

    for (const task of allTasks) {
      if (this.isTaskBlocked(task, allTasks)) {
        const chain = await this.getDependencyChain(task.id);
        blockedTasks.push({
          ...task,
          blockedBy: chain.blockedBy,
          blockedReason: `Waiting for: ${chain.blockedBy.join(', ')}`
        });
      }
    }

    return blockedTasks;
  }

  /**
   * Clear router cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = TaskRouter;