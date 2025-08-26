const fs = require("fs").promises;
const path = require("path");
const SpecParser = require("./feature-parser");
const ConfigManager = require("./config-manager");

/**
 * PriorityConstraintEngine - Advanced constraint solving for task routing
 * 
 * Handles complex multi-constraint scenarios including:
 * - Agent workload balancing and capacity limits
 * - Resource allocation and availability
 * - Time-based constraints and deadlines  
 * - Skill requirement validation
 * - Cross-agent dependency management
 */
class PriorityConstraintEngine {
  constructor(configManager) {
    this.configManager = configManager;
    this.constraints = new Map();
    this.agentWorkloads = new Map();
    this.resourceAllocations = new Map();
  }

  /**
   * Validate all constraints for a task assignment
   * @param {Object} task - Task to validate
   * @param {string} agentType - Agent type for assignment
   * @param {Object} constraints - Constraint parameters
   * @returns {Promise<Object>} Validation result with details
   */
  async validateConstraints(task, agentType, constraints = {}) {
    const validation = {
      isValid: true,
      violations: [],
      warnings: [],
      score: 1.0,
      details: {}
    };

    // Agent workload constraint validation
    const workloadValidation = await this.validateWorkloadConstraints(task, agentType, constraints);
    validation.details.workload = workloadValidation;
    if (!workloadValidation.isValid) {
      validation.isValid = false;
      validation.violations.push(...workloadValidation.violations);
    }
    if (workloadValidation.warnings.length > 0) {
      validation.warnings.push(...workloadValidation.warnings);
    }
    validation.score *= workloadValidation.scoreMultiplier;

    // Skill requirement constraint validation
    const skillValidation = await this.validateSkillConstraints(task, agentType);
    validation.details.skills = skillValidation;
    if (!skillValidation.isValid) {
      validation.isValid = false;
      validation.violations.push(...skillValidation.violations);
    }
    validation.score *= skillValidation.scoreMultiplier;

    // Time constraint validation (deadlines, availability)
    const timeValidation = await this.validateTimeConstraints(task, agentType, constraints);
    validation.details.time = timeValidation;
    if (!timeValidation.isValid) {
      validation.isValid = false;
      validation.violations.push(...timeValidation.violations);
    }
    validation.score *= timeValidation.scoreMultiplier;

    // Resource allocation constraint validation
    const resourceValidation = await this.validateResourceConstraints(task, agentType, constraints);
    validation.details.resources = resourceValidation;
    if (!resourceValidation.isValid) {
      validation.isValid = false;
      validation.violations.push(...resourceValidation.violations);
    }
    validation.score *= resourceValidation.scoreMultiplier;

    // Capacity planning constraint validation
    const capacityValidation = await this.validateCapacityConstraints(task, agentType, constraints);
    validation.details.capacity = capacityValidation;
    if (!capacityValidation.isValid) {
      validation.isValid = false;
      validation.violations.push(...capacityValidation.violations);
    }
    validation.score *= capacityValidation.scoreMultiplier;

    return validation;
  }

  /**
   * Validate agent workload constraints
   * @param {Object} task - Task to validate
   * @param {string} agentType - Agent type
   * @param {Object} constraints - Constraint parameters
   * @returns {Promise<Object>} Workload validation result
   */
  async validateWorkloadConstraints(task, agentType, constraints) {
    const validation = {
      isValid: true,
      violations: [],
      warnings: [],
      scoreMultiplier: 1.0,
      currentWorkload: 0,
      maxWorkload: 40,
      projectedWorkload: 0
    };

    // Get current agent workload
    const currentWorkload = this.agentWorkloads.get(agentType) || 0;
    const maxWorkload = constraints.maxWorkloadPerAgent || 40; // Default 40 hours per week
    const taskHours = task.estimated_hours || 2;

    validation.currentWorkload = currentWorkload;
    validation.maxWorkload = maxWorkload;
    validation.projectedWorkload = currentWorkload + taskHours;

    // Check if assignment would exceed capacity
    if (validation.projectedWorkload > maxWorkload) {
      validation.isValid = false;
      validation.violations.push(
        `Assignment would exceed agent capacity: ${validation.projectedWorkload}h > ${maxWorkload}h limit`
      );
      validation.scoreMultiplier = 0.1; // Heavy penalty
    } else if (validation.projectedWorkload > maxWorkload * 0.9) {
      validation.warnings.push(
        `Assignment approaches capacity limit: ${validation.projectedWorkload}h (${maxWorkload}h max)`
      );
      validation.scoreMultiplier = 0.7; // Moderate penalty
    } else if (validation.projectedWorkload > maxWorkload * 0.8) {
      validation.warnings.push(
        `High utilization after assignment: ${validation.projectedWorkload}h (${maxWorkload}h max)`
      );
      validation.scoreMultiplier = 0.9; // Small penalty
    } else if (currentWorkload < maxWorkload * 0.5) {
      // Bonus for underutilized agents
      validation.scoreMultiplier = 1.2;
    }

    return validation;
  }

  /**
   * Validate skill requirement constraints
   * @param {Object} task - Task to validate
   * @param {string} agentType - Agent type
   * @returns {Promise<Object>} Skill validation result
   */
  async validateSkillConstraints(task, agentType) {
    const validation = {
      isValid: true,
      violations: [],
      warnings: [],
      scoreMultiplier: 1.0,
      requiredSkills: [],
      agentSkills: [],
      matchingSkills: [],
      missingSkills: []
    };

    // Load agent capabilities
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
      const agentDef = config.agent_capabilities?.agents?.[agentType];

      if (!agentDef) {
        validation.warnings.push(`No capability definition found for agent type: ${agentType}`);
        return validation;
      }

      // Extract skill requirements from task
      const taskContextReqs = task.context_requirements || [];
      const taskSpecializations = task.specialization_requirements || [];
      validation.requiredSkills = [...taskContextReqs, ...taskSpecializations];

      // Extract agent skills
      const agentContextCaps = agentDef.context_requirements || [];
      const agentSpecializations = agentDef.specialization_areas || [];
      validation.agentSkills = [...agentContextCaps, ...agentSpecializations];

      // Find matching skills
      validation.matchingSkills = validation.requiredSkills.filter(reqSkill =>
        validation.agentSkills.some(agentSkill =>
          agentSkill.includes(reqSkill) || reqSkill.includes(agentSkill)
        )
      );

      // Find missing skills
      validation.missingSkills = validation.requiredSkills.filter(reqSkill =>
        !validation.matchingSkills.includes(reqSkill)
      );

      // Calculate skill match score
      if (validation.requiredSkills.length > 0) {
        const skillMatchRatio = validation.matchingSkills.length / validation.requiredSkills.length;
        
        if (skillMatchRatio < 0.5) {
          validation.isValid = false;
          validation.violations.push(
            `Insufficient skill match: ${validation.matchingSkills.length}/${validation.requiredSkills.length} required skills`
          );
          validation.scoreMultiplier = 0.2;
        } else if (skillMatchRatio < 0.7) {
          validation.warnings.push(
            `Partial skill match: missing ${validation.missingSkills.join(', ')}`
          );
          validation.scoreMultiplier = 0.8;
        } else {
          validation.scoreMultiplier = 1.0 + (skillMatchRatio - 0.7) * 0.5; // Bonus for good matches
        }
      }

    } catch (error) {
      validation.warnings.push(`Failed to load agent capabilities: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate time-based constraints (deadlines, availability)
   * @param {Object} task - Task to validate
   * @param {string} agentType - Agent type
   * @param {Object} constraints - Constraint parameters
   * @returns {Promise<Object>} Time validation result
   */
  async validateTimeConstraints(task, agentType, constraints) {
    const validation = {
      isValid: true,
      violations: [],
      warnings: [],
      scoreMultiplier: 1.0,
      deadline: null,
      daysUntilDeadline: null,
      estimatedDuration: task.estimated_hours || 2
    };

    // Check deadline constraints
    const taskDeadline = task.deadline || constraints.deadline;
    if (taskDeadline) {
      const now = new Date();
      const deadline = new Date(taskDeadline);
      const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      
      validation.deadline = taskDeadline;
      validation.daysUntilDeadline = daysUntilDeadline;

      // Estimate if task can be completed before deadline
      const workingDaysNeeded = Math.ceil(validation.estimatedDuration / 8); // Assuming 8 hour work days
      
      if (daysUntilDeadline < 0) {
        validation.isValid = false;
        validation.violations.push(`Task deadline has passed: ${Math.abs(daysUntilDeadline)} days ago`);
        validation.scoreMultiplier = 0.0;
      } else if (daysUntilDeadline < workingDaysNeeded) {
        validation.isValid = false;
        validation.violations.push(
          `Insufficient time: need ${workingDaysNeeded} days, only ${daysUntilDeadline} available`
        );
        validation.scoreMultiplier = 0.1;
      } else if (daysUntilDeadline === workingDaysNeeded) {
        validation.warnings.push(
          `Tight deadline: exactly ${workingDaysNeeded} days needed`
        );
        validation.scoreMultiplier = 0.8;
      } else if (daysUntilDeadline <= 3) {
        // Urgent deadline bonus
        validation.scoreMultiplier = 1.5;
      }
    }

    // Check agent availability constraints
    if (constraints.agentAvailability && constraints.agentAvailability[agentType]) {
      const availability = constraints.agentAvailability[agentType];
      
      if (!availability.available) {
        validation.isValid = false;
        validation.violations.push(
          `Agent ${agentType} is not available: ${availability.reason || 'No reason specified'}`
        );
        validation.scoreMultiplier = 0.0;
      } else if (availability.limitedHours) {
        const availableHours = availability.limitedHours;
        if (validation.estimatedDuration > availableHours) {
          validation.isValid = false;
          validation.violations.push(
            `Task requires ${validation.estimatedDuration}h but agent only has ${availableHours}h available`
          );
          validation.scoreMultiplier = 0.1;
        }
      }
    }

    return validation;
  }

  /**
   * Validate resource allocation constraints
   * @param {Object} task - Task to validate
   * @param {string} agentType - Agent type
   * @param {Object} constraints - Constraint parameters
   * @returns {Promise<Object>} Resource validation result
   */
  async validateResourceConstraints(task, agentType, constraints) {
    const validation = {
      isValid: true,
      violations: [],
      warnings: [],
      scoreMultiplier: 1.0,
      requiredResources: [],
      availableResources: [],
      resourceConflicts: []
    };

    // Check for required resources in task
    const requiredResources = task.required_resources || [];
    validation.requiredResources = requiredResources;

    if (requiredResources.length === 0) {
      return validation; // No resource requirements
    }

    // Check resource availability
    if (constraints.resourceAvailability) {
      for (const resource of requiredResources) {
        const availability = constraints.resourceAvailability[resource];
        
        if (!availability || !availability.available) {
          validation.resourceConflicts.push(resource);
          validation.violations.push(
            `Required resource unavailable: ${resource}`
          );
        } else if (availability.limited) {
          validation.warnings.push(
            `Limited resource availability: ${resource} (${availability.reason || 'Limited capacity'})`
          );
          validation.scoreMultiplier *= 0.9;
        }
      }

      if (validation.resourceConflicts.length > 0) {
        validation.isValid = false;
        validation.scoreMultiplier = 0.1;
      }
    }

    return validation;
  }

  /**
   * Validate capacity planning constraints
   * @param {Object} task - Task to validate
   * @param {string} agentType - Agent type
   * @param {Object} constraints - Constraint parameters
   * @returns {Promise<Object>} Capacity validation result
   */
  async validateCapacityConstraints(task, agentType, constraints) {
    const validation = {
      isValid: true,
      violations: [],
      warnings: [],
      scoreMultiplier: 1.0,
      totalSystemCapacity: 0,
      currentUtilization: 0,
      projectedUtilization: 0
    };

    if (constraints.capacityPlanning) {
      const capacity = constraints.capacityPlanning;
      const taskHours = task.estimated_hours || 2;
      
      validation.totalSystemCapacity = capacity.totalCapacity || 200; // Default 200h system capacity
      validation.currentUtilization = capacity.currentUtilization || 0;
      validation.projectedUtilization = validation.currentUtilization + taskHours;

      const utilizationRatio = validation.projectedUtilization / validation.totalSystemCapacity;

      if (utilizationRatio > 1.0) {
        validation.isValid = false;
        validation.violations.push(
          `System capacity exceeded: ${validation.projectedUtilization}h > ${validation.totalSystemCapacity}h`
        );
        validation.scoreMultiplier = 0.1;
      } else if (utilizationRatio > 0.9) {
        validation.warnings.push(
          `High system utilization: ${Math.round(utilizationRatio * 100)}%`
        );
        validation.scoreMultiplier = 0.8;
      } else if (utilizationRatio > 0.8) {
        validation.warnings.push(
          `Moderate system utilization: ${Math.round(utilizationRatio * 100)}%`
        );
        validation.scoreMultiplier = 0.9;
      }
    }

    return validation;
  }

  /**
   * Update agent workload tracking
   * @param {string} agentType - Agent type
   * @param {number} hours - Hours to add/subtract
   */
  updateAgentWorkload(agentType, hours) {
    const currentWorkload = this.agentWorkloads.get(agentType) || 0;
    this.agentWorkloads.set(agentType, Math.max(0, currentWorkload + hours));
  }

  /**
   * Get current agent workload
   * @param {string} agentType - Agent type
   * @returns {number} Current workload in hours
   */
  getAgentWorkload(agentType) {
    return this.agentWorkloads.get(agentType) || 0;
  }

  /**
   * Reset all workload tracking
   */
  resetWorkloads() {
    this.agentWorkloads.clear();
  }

  /**
   * Get workload statistics
   * @returns {Object} Workload statistics
   */
  getWorkloadStats() {
    const stats = {
      totalAgents: this.agentWorkloads.size,
      totalHours: 0,
      averageWorkload: 0,
      agentWorkloads: {}
    };

    for (const [agentType, hours] of this.agentWorkloads) {
      stats.agentWorkloads[agentType] = hours;
      stats.totalHours += hours;
    }

    stats.averageWorkload = stats.totalAgents > 0 ? stats.totalHours / stats.totalAgents : 0;

    return stats;
  }
}

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
    this.constraintEngine = new PriorityConstraintEngine(this.configManager);
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

      // Score and rank tasks for this agent with enhanced scoring
      const scoredTasks = availableTasks
        .map(task => {
          const scoreResult = this.calculateTaskScore(task, agentType, constraints);
          return {
            ...task,
            score: typeof scoreResult === 'object' ? scoreResult.score : scoreResult,
            scoreBreakdown: typeof scoreResult === 'object' ? scoreResult.breakdown : undefined,
            reasoning: this.getTaskRecommendationReasoning(task, agentType)
          };
        })
        .sort((a, b) => b.score - a.score);

      // Filter tasks that match agent capabilities and constraints
      const capableAgentTasks = [];
      
      for (const task of scoredTasks) {
        // Basic capability validation
        if (!this.validateAgentCapability(task, agentType)) {
          continue;
        }

        // Advanced constraint validation
        const constraintValidation = await this.constraintEngine.validateConstraints(
          task, 
          agentType, 
          constraints
        );
        
        // Add constraint validation results to task
        task.constraintValidation = constraintValidation;
        
        // Apply constraint score multiplier to final score
        if (constraintValidation.score !== 1.0) {
          task.score = Math.round(task.score * constraintValidation.score);
        }
        
        // Only include tasks that pass basic constraint validation
        if (constraintValidation.isValid || constraints.allowViolations) {
          capableAgentTasks.push(task);
        }
      }
      
      // Re-sort after constraint scoring
      capableAgentTasks.sort((a, b) => b.score - a.score);

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
   * Calculate priority score for task recommendation with advanced weighting
   * @param {Object} task - Task to score
   * @param {string} agentType - Type of agent
   * @param {Object} constraints - Additional constraints including workload limits
   * @returns {number} Task score for ranking
   */
  calculateTaskScore(task, agentType, constraints = {}) {
    let score = 0;
    const scoringFactors = {};

    // Base priority weight - enhanced with more granular scoring
    const priority = task.specPriority || task.priority || 'P2';
    const baseScore = this.priorityWeights[priority] || this.priorityWeights.P2;
    score += baseScore;
    scoringFactors.baseScore = baseScore;

    // Perfect agent match bonus - enhanced with capability depth
    if (task.agent_type === agentType) {
      const agentMatchMultiplier = 2.0;
      score *= agentMatchMultiplier;
      scoringFactors.agentMatch = agentMatchMultiplier;
    }

    // Phase alignment bonus with urgency consideration
    if (constraints.phase && task.phase === constraints.phase) {
      const phaseAlignmentMultiplier = 1.5;
      score *= phaseAlignmentMultiplier;
      scoringFactors.phaseAlignment = phaseAlignmentMultiplier;
    }

    // Context capability match with weighted scoring
    const agentDef = this.agentCapabilities?.agents?.[agentType];
    if (agentDef) {
      const contextScore = this.calculateContextMatchScore(task, agentDef);
      score *= contextScore.multiplier;
      scoringFactors.contextMatch = contextScore;
    }

    // Task size and complexity scoring
    const sizeComplexityScore = this.calculateSizeComplexityScore(task);
    score *= sizeComplexityScore.multiplier;
    scoringFactors.sizeComplexity = sizeComplexityScore;

    // Spec status and urgency weighting
    const specUrgencyScore = this.calculateSpecUrgencyScore(task);
    score *= specUrgencyScore.multiplier;
    scoringFactors.specUrgency = specUrgencyScore;

    // Dependency readiness bonus
    const dependencyScore = this.calculateDependencyReadinessScore(task);
    score *= dependencyScore.multiplier;
    scoringFactors.dependencyReadiness = dependencyScore;

    // Agent workload balancing (if constraints provided)
    if (constraints.agentWorkload) {
      const workloadScore = this.calculateWorkloadBalancingScore(agentType, constraints.agentWorkload);
      score *= workloadScore.multiplier;
      scoringFactors.workloadBalancing = workloadScore;
    }

    // Time-based urgency (if deadline constraints provided)
    if (task.deadline || constraints.deadline) {
      const timeUrgencyScore = this.calculateTimeUrgencyScore(task, constraints);
      score *= timeUrgencyScore.multiplier;
      scoringFactors.timeUrgency = timeUrgencyScore;
    }

    // Store scoring breakdown for transparency
    const finalScore = Math.round(score);
    return {
      score: finalScore,
      breakdown: scoringFactors,
      priority,
      agentType,
      taskId: task.id
    };
  }

  /**
   * Calculate context match score with weighted evaluation
   * @param {Object} task - Task to evaluate
   * @param {Object} agentDef - Agent definition
   * @returns {Object} Context match score with details
   */
  calculateContextMatchScore(task, agentDef) {
    const taskContextReqs = task.context_requirements || [];
    const agentContextCaps = agentDef.context_requirements || [];
    
    if (taskContextReqs.length === 0) {
      return { multiplier: 1.0, details: 'No specific context requirements' };
    }

    const matchingContexts = taskContextReqs.filter(req =>
      agentContextCaps.some(cap => cap.includes(req) || req.includes(cap) || this.isRelatedContext(req, cap))
    );
    
    const matchRatio = matchingContexts.length / taskContextReqs.length;
    
    // Enhanced multiplier based on match quality
    let multiplier;
    if (matchRatio >= 0.9) {
      multiplier = 1.2; // Excellent match
    } else if (matchRatio >= 0.7) {
      multiplier = 1.0; // Good match
    } else if (matchRatio >= 0.5) {
      multiplier = 0.8; // Partial match
    } else {
      multiplier = 0.6; // Poor match
    }

    return {
      multiplier,
      matchRatio,
      matchingContexts,
      missingContexts: taskContextReqs.filter(req => !matchingContexts.includes(req)),
      details: `Context match: ${matchingContexts.length}/${taskContextReqs.length}`
    };
  }

  /**
   * Calculate size and complexity score
   * @param {Object} task - Task to evaluate
   * @returns {Object} Size complexity score with details
   */
  calculateSizeComplexityScore(task) {
    const estimatedHours = task.estimated_hours || 2; // Default assumption
    const subtaskCount = task.subtasks ? task.subtasks.length : 0;
    
    let sizeMultiplier = 1.0;
    let complexityDetails = [];

    // Hours-based scoring
    if (estimatedHours <= 2) {
      sizeMultiplier *= 1.1; // Slight bonus for quick wins
      complexityDetails.push(`Quick task (${estimatedHours}h)`);
    } else if (estimatedHours <= 4) {
      sizeMultiplier *= 1.0; // Ideal size
      complexityDetails.push(`Normal size (${estimatedHours}h)`);
    } else if (estimatedHours <= 8) {
      sizeMultiplier *= 0.9; // Slight penalty for larger tasks
      complexityDetails.push(`Large task (${estimatedHours}h)`);
    } else {
      sizeMultiplier *= 0.7; // Significant penalty for very large tasks
      complexityDetails.push(`Very large task (${estimatedHours}h)`);
    }

    // Subtask complexity
    if (subtaskCount > 0) {
      if (subtaskCount <= 3) {
        sizeMultiplier *= 1.05; // Well-broken down
        complexityDetails.push(`Well-structured (${subtaskCount} subtasks)`);
      } else if (subtaskCount <= 6) {
        sizeMultiplier *= 1.0; // Reasonable complexity
        complexityDetails.push(`Moderate complexity (${subtaskCount} subtasks)`);
      } else {
        sizeMultiplier *= 0.95; // High complexity
        complexityDetails.push(`High complexity (${subtaskCount} subtasks)`);
      }
    }

    return {
      multiplier: sizeMultiplier,
      estimatedHours,
      subtaskCount,
      details: complexityDetails.join(', ')
    };
  }

  /**
   * Calculate spec urgency score based on spec status and phase
   * @param {Object} task - Task to evaluate
   * @returns {Object} Spec urgency score with details
   */
  calculateSpecUrgencyScore(task) {
    let urgencyMultiplier = 1.0;
    const urgencyFactors = [];

    // Spec status urgency
    if (task.specStatus === 'active') {
      urgencyMultiplier *= 1.3;
      urgencyFactors.push('Active spec');
    } else if (task.specStatus === 'ready') {
      urgencyMultiplier *= 1.1;
      urgencyFactors.push('Ready spec');
    } else if (task.specStatus === 'backlog') {
      urgencyMultiplier *= 0.8;
      urgencyFactors.push('Backlog spec');
    }

    // Phase urgency - PHASE-1A gets priority
    if (task.phase === 'PHASE-1A') {
      urgencyMultiplier *= 1.2;
      urgencyFactors.push('Current phase (1A)');
    } else if (task.phase === 'PHASE-1B') {
      urgencyMultiplier *= 0.9;
      urgencyFactors.push('Next phase (1B)');
    } else if (task.phase && task.phase.startsWith('PHASE-2')) {
      urgencyMultiplier *= 0.7;
      urgencyFactors.push('Future phase');
    }

    return {
      multiplier: urgencyMultiplier,
      specStatus: task.specStatus,
      phase: task.phase,
      details: urgencyFactors.join(', ') || 'Standard urgency'
    };
  }

  /**
   * Calculate dependency readiness score
   * @param {Object} task - Task to evaluate
   * @returns {Object} Dependency readiness score with details
   */
  calculateDependencyReadinessScore(task) {
    const dependsOn = task.depends_on || [];
    
    if (dependsOn.length === 0) {
      return {
        multiplier: 1.1, // Bonus for no dependencies (ready to start)
        dependencies: 0,
        details: 'No dependencies - ready to start'
      };
    }

    // For now, assume all dependencies in ready tasks are met
    // In a real implementation, this would check dependency status
    return {
      multiplier: 1.0,
      dependencies: dependsOn.length,
      details: `${dependsOn.length} dependencies (assumed met)`
    };
  }

  /**
   * Calculate workload balancing score
   * @param {string} agentType - Agent type
   * @param {Object} workloadData - Current workload information
   * @returns {Object} Workload balancing score with details
   */
  calculateWorkloadBalancingScore(agentType, workloadData) {
    const currentWorkload = workloadData[agentType] || 0;
    const maxWorkload = workloadData.maxPerAgent || 40; // Default 40 hours per week
    
    const workloadRatio = currentWorkload / maxWorkload;
    
    let balancingMultiplier;
    let workloadStatus;
    
    if (workloadRatio < 0.5) {
      balancingMultiplier = 1.2; // Underutilized - bonus
      workloadStatus = 'Underutilized';
    } else if (workloadRatio < 0.8) {
      balancingMultiplier = 1.0; // Optimal load
      workloadStatus = 'Optimal load';
    } else if (workloadRatio < 1.0) {
      balancingMultiplier = 0.8; // Near capacity
      workloadStatus = 'Near capacity';
    } else {
      balancingMultiplier = 0.5; // Overloaded
      workloadStatus = 'Overloaded';
    }

    return {
      multiplier: balancingMultiplier,
      currentWorkload,
      maxWorkload,
      workloadRatio,
      workloadStatus,
      details: `${workloadStatus} (${currentWorkload}h/${maxWorkload}h)`
    };
  }

  /**
   * Calculate time urgency score based on deadlines
   * @param {Object} task - Task to evaluate
   * @param {Object} constraints - Constraint object with deadline info
   * @returns {Object} Time urgency score with details
   */
  calculateTimeUrgencyScore(task, constraints) {
    const taskDeadline = task.deadline || constraints.deadline;
    
    if (!taskDeadline) {
      return {
        multiplier: 1.0,
        details: 'No deadline specified'
      };
    }

    const now = new Date();
    const deadline = new Date(taskDeadline);
    const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    let urgencyMultiplier;
    let urgencyLevel;
    
    if (daysUntilDeadline <= 1) {
      urgencyMultiplier = 2.0; // Critical urgency
      urgencyLevel = 'Critical';
    } else if (daysUntilDeadline <= 3) {
      urgencyMultiplier = 1.5; // High urgency
      urgencyLevel = 'High';
    } else if (daysUntilDeadline <= 7) {
      urgencyMultiplier = 1.2; // Medium urgency
      urgencyLevel = 'Medium';
    } else if (daysUntilDeadline <= 14) {
      urgencyMultiplier = 1.0; // Normal urgency
      urgencyLevel = 'Normal';
    } else {
      urgencyMultiplier = 0.9; // Low urgency
      urgencyLevel = 'Low';
    }

    return {
      multiplier: urgencyMultiplier,
      deadline: taskDeadline,
      daysUntilDeadline,
      urgencyLevel,
      details: `${urgencyLevel} urgency (${daysUntilDeadline} days until deadline)`
    };
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
   * Advanced task filtering with multiple constraint types
   * @param {Array} tasks - Tasks to filter
   * @param {Object} filters - Advanced filter options
   * @returns {Promise<Array>} Filtered tasks
   */
  async applyAdvancedFiltering(tasks, filters = {}) {
    let filteredTasks = [...tasks];

    // Workload-based filtering
    if (filters.workloadBalancing) {
      filteredTasks = await this.filterByWorkloadBalance(filteredTasks, filters.workloadBalancing);
    }

    // Deadline-based filtering
    if (filters.deadlineUrgency) {
      filteredTasks = this.filterByDeadlineUrgency(filteredTasks, filters.deadlineUrgency);
    }

    // Skill gap filtering
    if (filters.skillGapAnalysis) {
      filteredTasks = await this.filterBySkillGaps(filteredTasks, filters.skillGapAnalysis);
    }

    // Resource availability filtering
    if (filters.resourceConstraints) {
      filteredTasks = this.filterByResourceAvailability(filteredTasks, filters.resourceConstraints);
    }

    // Dependency chain filtering
    if (filters.dependencyOptimization) {
      filteredTasks = await this.filterByDependencyOptimization(filteredTasks, filters.dependencyOptimization);
    }

    return filteredTasks;
  }

  /**
   * Filter tasks by workload balance across agents
   * @param {Array} tasks - Tasks to filter
   * @param {Object} workloadConfig - Workload balancing configuration
   * @returns {Promise<Array>} Workload-balanced tasks
   */
  async filterByWorkloadBalance(tasks, workloadConfig) {
    const { maxImbalanceRatio = 1.5, preferUnderutilized = true } = workloadConfig;
    const workloadStats = this.constraintEngine.getWorkloadStats();
    
    // Calculate workload imbalance threshold
    const avgWorkload = workloadStats.averageWorkload;
    const maxAcceptableWorkload = avgWorkload * maxImbalanceRatio;

    return tasks.filter(task => {
      const agentType = task.agent_type;
      const currentWorkload = this.constraintEngine.getAgentWorkload(agentType);
      const projectedWorkload = currentWorkload + (task.estimated_hours || 2);

      // Filter out tasks that would create excessive imbalance
      if (projectedWorkload > maxAcceptableWorkload) {
        return false;
      }

      // Prefer tasks for underutilized agents if configured
      if (preferUnderutilized && currentWorkload > avgWorkload) {
        return projectedWorkload <= avgWorkload + (task.estimated_hours || 2);
      }

      return true;
    });
  }

  /**
   * Filter tasks by deadline urgency
   * @param {Array} tasks - Tasks to filter
   * @param {Object} urgencyConfig - Deadline urgency configuration
   * @returns {Array} Urgency-filtered tasks
   */
  filterByDeadlineUrgency(tasks, urgencyConfig) {
    const { minDaysUntilDeadline = 0, maxDaysUntilDeadline = 365, urgencyThreshold = 7 } = urgencyConfig;

    return tasks.filter(task => {
      const taskDeadline = task.deadline;
      if (!taskDeadline) {
        return true; // Include tasks without deadlines
      }

      const now = new Date();
      const deadline = new Date(taskDeadline);
      const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

      // Filter by deadline range
      if (daysUntilDeadline < minDaysUntilDeadline || daysUntilDeadline > maxDaysUntilDeadline) {
        return false;
      }

      // Apply urgency threshold if configured
      if (urgencyConfig.urgentOnly && daysUntilDeadline > urgencyThreshold) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filter tasks by skill gap analysis
   * @param {Array} tasks - Tasks to filter
   * @param {Object} skillConfig - Skill gap configuration
   * @returns {Promise<Array>} Skill-filtered tasks
   */
  async filterBySkillGaps(tasks, skillConfig) {
    const { minSkillMatch = 0.5, allowSkillDevelopment = true, skillGapPenalty = 0.3 } = skillConfig;

    const filteredTasks = [];

    for (const task of tasks) {
      const skillAnalysis = await this.analyzeSkillRequirements(task);
      
      // Calculate skill match ratio
      const skillMatchRatio = skillAnalysis.matchingSkills.length / 
        Math.max(skillAnalysis.requiredSkills.length, 1);

      // Apply minimum skill match threshold
      if (skillMatchRatio < minSkillMatch) {
        if (!allowSkillDevelopment) {
          continue; // Skip task if skill development not allowed
        }
        
        // Apply penalty for skill gap
        task.score = Math.round(task.score * (1 - skillGapPenalty));
        task.skillGapPenalty = skillGapPenalty;
      }

      task.skillAnalysis = skillAnalysis;
      filteredTasks.push(task);
    }

    return filteredTasks;
  }

  /**
   * Filter tasks by resource availability
   * @param {Array} tasks - Tasks to filter
   * @param {Object} resourceConfig - Resource constraint configuration
   * @returns {Array} Resource-filtered tasks
   */
  filterByResourceAvailability(tasks, resourceConfig) {
    const { requiredResources = [], availableResources = {}, allowPartialResources = false } = resourceConfig;

    return tasks.filter(task => {
      const taskResources = task.required_resources || [];
      
      if (taskResources.length === 0) {
        return true; // No resource requirements
      }

      const availableTaskResources = taskResources.filter(resource => 
        availableResources[resource] && availableResources[resource].available
      );

      // Check if all required resources are available
      if (taskResources.length === availableTaskResources.length) {
        return true;
      }

      // Check if partial resources are acceptable
      if (allowPartialResources && availableTaskResources.length > 0) {
        const resourceRatio = availableTaskResources.length / taskResources.length;
        if (resourceRatio >= 0.7) { // At least 70% of resources available
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Filter tasks by dependency optimization
   * @param {Array} tasks - Tasks to filter
   * @param {Object} dependencyConfig - Dependency optimization configuration
   * @returns {Promise<Array>} Dependency-optimized tasks
   */
  async filterByDependencyOptimization(tasks, dependencyConfig) {
    const { prioritizeIndependent = true, maxDependencyDepth = 3, avoidLongChains = true } = dependencyConfig;

    const filteredTasks = [];
    const allTasks = await this.getAllTasks();

    for (const task of tasks) {
      const dependencyChain = await this.getDependencyChain(task.id);
      const dependencyDepth = dependencyChain.dependencies.length;

      // Filter by maximum dependency depth
      if (dependencyDepth > maxDependencyDepth) {
        continue;
      }

      // Prioritize independent tasks if configured
      if (prioritizeIndependent && dependencyDepth === 0) {
        task.score = Math.round(task.score * 1.2); // 20% bonus for independent tasks
        task.independentTaskBonus = true;
      }

      // Avoid long dependency chains if configured
      if (avoidLongChains && dependencyDepth > 1) {
        const chainPenalty = Math.pow(0.9, dependencyDepth - 1); // Exponential penalty
        task.score = Math.round(task.score * chainPenalty);
        task.dependencyChainPenalty = chainPenalty;
      }

      task.dependencyInfo = {
        depth: dependencyDepth,
        dependencies: dependencyChain.dependencies,
        blocked: dependencyChain.blockedBy.length > 0
      };

      filteredTasks.push(task);
    }

    return filteredTasks;
  }

  /**
   * Analyze skill requirements for a task
   * @param {Object} task - Task to analyze
   * @returns {Promise<Object>} Skill analysis results
   */
  async analyzeSkillRequirements(task) {
    const analysis = {
      requiredSkills: [],
      matchingSkills: [],
      missingSkills: [],
      skillGaps: []
    };

    // Extract required skills from task
    const contextReqs = task.context_requirements || [];
    const specializationReqs = task.specialization_requirements || [];
    analysis.requiredSkills = [...contextReqs, ...specializationReqs];

    // Get available skills from agent capabilities
    if (this.agentCapabilities) {
      for (const [agentType, agentDef] of Object.entries(this.agentCapabilities.agents || {})) {
        const agentSkills = [
          ...(agentDef.context_requirements || []),
          ...(agentDef.specialization_areas || [])
        ];

        const matchingSkills = analysis.requiredSkills.filter(reqSkill =>
          agentSkills.some(agentSkill =>
            agentSkill.includes(reqSkill) || reqSkill.includes(agentSkill)
          )
        );

        if (matchingSkills.length > analysis.matchingSkills.length) {
          analysis.matchingSkills = matchingSkills;
          analysis.bestMatchAgent = agentType;
        }
      }
    }

    // Identify skill gaps
    analysis.missingSkills = analysis.requiredSkills.filter(
      reqSkill => !analysis.matchingSkills.includes(reqSkill)
    );

    // Analyze skill gaps
    for (const missingSkill of analysis.missingSkills) {
      analysis.skillGaps.push({
        skill: missingSkill,
        severity: this.assessSkillGapSeverity(missingSkill, task),
        alternatives: this.findSkillAlternatives(missingSkill)
      });
    }

    return analysis;
  }

  /**
   * Assess severity of skill gap
   * @param {string} skill - Missing skill
   * @param {Object} task - Task context
   * @returns {string} Severity level
   */
  assessSkillGapSeverity(skill, task) {
    // High severity for critical skills
    const criticalSkills = ['system-architecture', 'security-compliance', 'performance-optimization'];
    if (criticalSkills.some(critical => skill.includes(critical))) {
      return 'high';
    }

    // Medium severity for specialized skills
    const specializedSkills = ['api-design', 'database-optimization', 'deployment-automation'];
    if (specializedSkills.some(specialized => skill.includes(specialized))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Find alternative skills that could substitute for missing skill
   * @param {string} missingSkill - The missing skill
   * @returns {Array} Alternative skills
   */
  findSkillAlternatives(missingSkill) {
    const alternatives = {
      'api-design': ['integration-development', 'system-architecture'],
      'database-design': ['data-processing', 'system-architecture'],
      'ui-design': ['user-experience', 'interaction-patterns'],
      'performance-optimization': ['system-architecture', 'monitoring-observability']
    };

    return alternatives[missingSkill] || [];
  }

  /**
   * Get constraint engine for external access
   * @returns {PriorityConstraintEngine} Constraint engine instance
   */
  getConstraintEngine() {
    return this.constraintEngine;
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