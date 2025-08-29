const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { performance } = require('perf_hooks');

/**
 * Enhanced Context Gatherer for FEAT-028
 * Provides intelligent task-specific context collection with relevance scoring
 * and automatic triggering for sub-agent workflows
 */
class ContextGatherer {
  constructor(configManager) {
    this.configManager = configManager;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.maxCacheSize = 100;
    this.relevanceThreshold = 0.6;
  }

  /**
   * Main entry point - gather task-specific context for automation workflows
   * @param {Object} options - Context gathering options
   * @param {string} options.specId - Specification ID (e.g., 'FEAT-028')
   * @param {string} options.taskId - Task ID (e.g., 'TASK-001')
   * @param {string} options.agentType - Agent type for context filtering
   * @param {boolean} options.includeFiles - Whether to include related file contents
   * @param {boolean} options.useCache - Whether to use cached context
   * @returns {Promise<Object>} Gathered context with relevance scoring
   */
  async gatherTaskContext(options) {
    const startTime = performance.now();
    const { specId, taskId, agentType, includeFiles = true, useCache = true } = options;

    if (!specId || !taskId) {
      throw new Error('Both specId and taskId are required for task context gathering');
    }

    // Check cache first
    const cacheKey = `${specId}-${taskId}-${agentType}-${includeFiles}`;
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        cached.context.performance.cacheHit = true;
        return cached.context;
      }
      this.cache.delete(cacheKey);
    }

    const context = {
      metadata: {
        specId,
        taskId,
        agentType,
        gatheringTime: new Date().toISOString(),
        performance: {
          cacheHit: false,
          gatheringTimeMs: 0,
          sections: {}
        }
      },
      taskSpecific: {},
      dependencies: {},
      relatedFiles: {},
      validation: {
        completeness: 0,
        relevanceScore: 0,
        missingComponents: []
      }
    };

    try {
      // 1. Load specification document
      const specStart = performance.now();
      context.taskSpecific.specification = await this.loadSpecification(specId);
      context.metadata.performance.sections.specification = performance.now() - specStart;

      // 2. Extract task details from specification
      const taskStart = performance.now();
      context.taskSpecific.task = await this.extractTaskDetails(context.taskSpecific.specification, taskId);
      context.metadata.performance.sections.taskExtraction = performance.now() - taskStart;

      // 3. Gather dependencies and related specifications
      const depsStart = performance.now();
      context.dependencies = await this.gatherDependencies(context.taskSpecific.specification);
      context.metadata.performance.sections.dependencies = performance.now() - depsStart;

      // 4. Find and include related files if requested
      if (includeFiles) {
        const filesStart = performance.now();
        context.relatedFiles = await this.gatherRelatedFiles(context.taskSpecific.task, agentType);
        context.metadata.performance.sections.relatedFiles = performance.now() - filesStart;
      }

      // 5. Calculate context validation and relevance
      const validationStart = performance.now();
      await this.validateAndScoreContext(context, agentType);
      context.metadata.performance.sections.validation = performance.now() - validationStart;

      // 6. Apply agent-specific filtering
      const filteringStart = performance.now();
      const filteredContext = await this.applyAgentFiltering(context, agentType);
      filteredContext.metadata.performance.sections.filtering = performance.now() - filteringStart;

      // Record total performance
      const totalTime = performance.now() - startTime;
      filteredContext.metadata.performance.gatheringTimeMs = Math.round(totalTime);

      // Cache the result if under size limit
      if (useCache) {
        this.maintainCacheSize();
        this.cache.set(cacheKey, {
          context: filteredContext,
          timestamp: Date.now()
        });
      }

      return filteredContext;
    } catch (error) {
      const totalTime = performance.now() - startTime;
      throw new Error(`Context gathering failed after ${Math.round(totalTime)}ms: ${error.message}`);
    }
  }

  /**
   * Load specification document from docs/specs/ directory
   * @param {string} specId - Specification ID
   * @returns {Promise<Object>} Parsed specification with metadata
   */
  async loadSpecification(specId) {
    const projectRoot = this.configManager.getProjectRoot();

    // Try different locations (active, done, backlog)
    const possiblePaths = [
      path.join(projectRoot, 'docs', 'specs', 'active', `${specId}.md`),
      path.join(projectRoot, 'docs', 'specs', 'done', `${specId}.md`),
      path.join(projectRoot, 'docs', 'specs', 'backlog', `${specId}.md`)
    ];

    for (const specPath of possiblePaths) {
      try {
        if (await this.fileExists(specPath)) {
          const content = await fs.readFile(specPath, 'utf-8');
          const parsed = this.parseMarkdownWithFrontmatter(content);

          return {
            filePath: specPath,
            status: this.inferStatusFromPath(specPath),
            frontmatter: parsed.frontmatter,
            content: parsed.content,
            tasks: this.extractTasks(parsed.content),
            requirements: this.extractRequirements(parsed.content),
            dependencies: this.extractDependencies(parsed.content),
            loadedAt: new Date().toISOString()
          };
        }
      } catch (error) {
        console.warn(`Failed to load specification from ${specPath}: ${error.message}`);
      }
    }

    throw new Error(`Specification ${specId} not found in any specs directory`);
  }

  /**
   * Extract specific task details from specification content
   * @param {Object} specification - Parsed specification
   * @param {string} taskId - Task ID to extract
   * @returns {Promise<Object>} Task details with context
   */
  async extractTaskDetails(specification, taskId) {
    const taskPattern = new RegExp(`\\*\\*${taskId}\\*\\*([\\s\\S]*?)(?=\\*\\*TASK-|$)`, 'i');
    const match = specification.content.match(taskPattern);

    if (!match) {
      throw new Error(`Task ${taskId} not found in specification ${specification.filePath}`);
    }

    const taskContent = match[1].trim();

    return {
      id: taskId,
      content: taskContent,
      title: this.extractTaskTitle(taskContent),
      status: this.extractTaskStatus(taskContent),
      checklist: this.extractTaskChecklist(taskContent),
      dependencies: this.extractTaskDependencies(taskContent),
      files: this.extractTaskFiles(taskContent),
      agent: this.extractTaskAgent(taskContent),
      estimatedHours: this.extractTaskHours(taskContent)
    };
  }

  /**
   * Gather dependency specifications and their context
   * @param {Object} specification - Current specification
   * @returns {Promise<Object>} Dependencies with their context
   */
  async gatherDependencies(specification) {
    const dependencies = {
      required: [],
      enables: [],
      relatedSpecs: []
    };

    // Extract dependencies from specification metadata
    const specDependencies = specification.dependencies || [];

    for (const depId of specDependencies) {
      try {
        const depSpec = await this.loadSpecification(depId);
        dependencies.required.push({
          specId: depId,
          status: depSpec.status,
          title: depSpec.frontmatter?.title || 'Unknown',
          summary: this.extractSpecSummary(depSpec.content)
        });
      } catch (error) {
        console.warn(`Failed to load dependency ${depId}: ${error.message}`);
        dependencies.required.push({
          specId: depId,
          status: 'unknown',
          error: error.message
        });
      }
    }

    // Find specifications that depend on this one (enables)
    const projectRoot = this.configManager.getProjectRoot();
    const allSpecs = await this.findAllSpecifications(projectRoot);

    for (const specPath of allSpecs) {
      try {
        const content = await fs.readFile(specPath, 'utf-8');
        if (content.includes(specification.frontmatter?.id || '')) {
          const parsed = this.parseMarkdownWithFrontmatter(content);
          dependencies.enables.push({
            specId: parsed.frontmatter?.id || path.basename(specPath, '.md'),
            title: parsed.frontmatter?.title || 'Unknown',
            summary: this.extractSpecSummary(parsed.content)
          });
        }
      } catch (error) {
        console.warn(`Failed to check dependency relationship for ${specPath}: ${error.message}`);
      }
    }

    return dependencies;
  }

  /**
   * Gather related files based on task requirements and agent type
   * @param {Object} task - Task details
   * @param {string} agentType - Agent type for relevance filtering
   * @returns {Promise<Object>} Related files with content
   */
  async gatherRelatedFiles(task, agentType) {
    const relatedFiles = {
      implementation: [],
      tests: [],
      documentation: [],
      configuration: []
    };

    const projectRoot = this.configManager.getProjectRoot();

    // Get files mentioned in task
    const taskFiles = task.files || [];

    for (const file of taskFiles) {
      try {
        const filePath = path.resolve(projectRoot, file);
        if (await this.fileExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          const category = this.categorizeFile(file);

          relatedFiles[category].push({
            path: file,
            relativePath: path.relative(projectRoot, filePath),
            content: content.length > 5000 ? content.substring(0, 5000) + '...' : content,
            size: content.length,
            relevance: await this.calculateFileRelevance(file, content, task, agentType)
          });
        }
      } catch (error) {
        console.warn(`Failed to load related file ${file}: ${error.message}`);
      }
    }

    // Find additional relevant files based on task content
    const additionalFiles = await this.findAdditionalRelevantFiles(task, agentType, projectRoot);

    for (const [category, files] of Object.entries(additionalFiles)) {
      relatedFiles[category].push(...files);
    }

    // Sort files by relevance score
    for (const category of Object.keys(relatedFiles)) {
      relatedFiles[category].sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
      // Keep only top 5 most relevant files per category
      relatedFiles[category] = relatedFiles[category].slice(0, 5);
    }

    return relatedFiles;
  }

  /**
   * Validate context completeness and calculate relevance score
   * @param {Object} context - Context object to validate
   * @param {string} agentType - Agent type for relevance calculation
   */
  async validateAndScoreContext(context, agentType) {
    const validation = context.validation;
    const required = ['specification', 'task'];
    const optional = ['dependencies', 'relatedFiles'];

    let completenessScore = 0;
    const maxScore = required.length + optional.length;

    // Check required components
    for (const component of required) {
      if (context.taskSpecific[component] || context[component]) {
        completenessScore += 1;
      } else {
        validation.missingComponents.push(component);
      }
    }

    // Check optional components
    for (const component of optional) {
      if (context[component] && Object.keys(context[component]).length > 0) {
        completenessScore += 1;
      }
    }

    validation.completeness = completenessScore / maxScore;

    // Calculate relevance score based on agent type
    validation.relevanceScore = await this.calculateContextRelevance(context, agentType);

    // Determine if context is sufficient
    validation.isSufficient = validation.completeness >= 0.7 && validation.relevanceScore >= this.relevanceThreshold;
  }

  /**
   * Apply agent-specific filtering to reduce context overload
   * @param {Object} context - Full context object
   * @param {string} agentType - Agent type for filtering
   * @returns {Promise<Object>} Filtered context
   */
  async applyAgentFiltering(context, agentType) {
    const filtered = { ...context };

    // Load agent definition for filtering rules
    try {
      const agentDef = await this.loadAgentDefinition(agentType);

      // Filter based on agent capabilities and specializations
      if (agentDef?.frontmatter?.specialization_areas) {
        filtered.agentSpecific = {
          capabilities: agentDef.frontmatter.capabilities || [],
          specializations: agentDef.frontmatter.specialization_areas,
          contextRequirements: agentDef.frontmatter.context_requirements || [],
          workflowSteps: agentDef.frontmatter.workflow_steps || []
        };
      }

      // Filter related files based on agent focus
      if (filtered.relatedFiles) {
        filtered.relatedFiles = this.filterFilesByAgentType(filtered.relatedFiles, agentType);
      }

    } catch (error) {
      console.warn(`Failed to load agent definition for filtering: ${error.message}`);
    }

    return filtered;
  }

  /**
   * Calculate relevance score for context based on agent type and task
   * @param {Object} context - Context object
   * @param {string} agentType - Agent type
   * @returns {Promise<number>} Relevance score (0-1)
   */
  async calculateContextRelevance(context, agentType) {
    let relevanceScore = 0;
    let factors = 0;

    // Factor 1: Task-agent alignment (40% weight)
    const taskAgent = context.taskSpecific.task?.agent;
    if (taskAgent === agentType) {
      relevanceScore += 0.4;
    } else if (taskAgent && this.areAgentsCompatible(taskAgent, agentType)) {
      relevanceScore += 0.2;
    }
    factors += 0.4;

    // Factor 2: Content relevance (30% weight)
    const contentRelevance = await this.calculateContentRelevance(context, agentType);
    relevanceScore += contentRelevance * 0.3;
    factors += 0.3;

    // Factor 3: File relevance (20% weight)
    const fileRelevance = this.calculateRelatedFilesRelevance(context.relatedFiles, agentType);
    relevanceScore += fileRelevance * 0.2;
    factors += 0.2;

    // Factor 4: Dependencies relevance (10% weight)
    const depRelevance = this.calculateDependencyRelevance(context.dependencies, agentType);
    relevanceScore += depRelevance * 0.1;
    factors += 0.1;

    return relevanceScore;
  }

  // Utility methods for parsing and extraction

  parseMarkdownWithFrontmatter(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (frontmatterMatch) {
      return {
        frontmatter: yaml.load(frontmatterMatch[1]),
        content: frontmatterMatch[2]
      };
    }

    return {
      frontmatter: {},
      content: content
    };
  }

  extractTasks(content) {
    const taskPattern = /\*\*TASK-\d+\*\*[^*]*?\*\*([^*]+)\*\*/g;
    const tasks = [];
    let match;

    while ((match = taskPattern.exec(content)) !== null) {
      tasks.push({
        id: match[0].match(/TASK-\d+/)[0],
        title: match[1].trim(),
        content: match[0]
      });
    }

    return tasks;
  }

  extractRequirements(content) {
    const reqPattern = /### \*\*REQ-\d+[^#]*?(?=### |$)/gs;
    const requirements = [];
    let match;

    while ((match = reqPattern.exec(content)) !== null) {
      const reqId = match[0].match(/REQ-\d+/)[0];
      requirements.push({
        id: reqId,
        content: match[0].trim()
      });
    }

    return requirements;
  }

  extractDependencies(content) {
    const depPattern = /- \*\*Requires\*\*: ([^-\n]+)/i;
    const match = content.match(depPattern);

    if (match) {
      return match[1].split(',').map(dep => dep.trim().replace(/[()]/g, ''));
    }

    return [];
  }

  extractTaskTitle(taskContent) {
    const titleMatch = taskContent.match(/\*\*([^*]+)\*\*/);
    return titleMatch ? titleMatch[1].trim() : 'Unknown Task';
  }

  extractTaskStatus(taskContent) {
    if (taskContent.includes('← READY FOR PICKUP') || taskContent.includes('⏳')) return 'ready';
    if (taskContent.includes('🔄') || taskContent.includes('In progress')) return 'in_progress';
    if (taskContent.includes('✅') || taskContent.includes('Complete')) return 'complete';
    if (taskContent.includes('⏸️') || taskContent.includes('BLOCKED')) return 'blocked';
    return 'pending';
  }

  extractTaskChecklist(taskContent) {
    const checklistPattern = /- \[ \] ([^\n]+)/g;
    const checklist = [];
    let match;

    while ((match = checklistPattern.exec(taskContent)) !== null) {
      checklist.push({
        item: match[1].trim(),
        completed: false
      });
    }

    return checklist;
  }

  extractTaskFiles(taskContent) {
    const filesMatch = taskContent.match(/\*\*Files\*\*: ([^\n]+)/);
    if (filesMatch) {
      return filesMatch[1].split(',').map(file => file.trim().replace(/[()]/g, ''));
    }
    return [];
  }

  extractTaskDependencies(taskContent) {
    const depsMatch = taskContent.match(/\*\*Dependencies\*\*: ([^\n]+)/);
    if (depsMatch) {
      return depsMatch[1].split(',').map(dep => dep.trim());
    }
    return [];
  }

  extractTaskAgent(taskContent) {
    const agentMatch = taskContent.match(/Agent: ([^\n]+)/);
    return agentMatch ? agentMatch[1].trim() : null;
  }

  extractTaskHours(taskContent) {
    const hoursMatch = taskContent.match(/(\d+)\s*hours?/i);
    return hoursMatch ? parseInt(hoursMatch[1]) : null;
  }

  extractSpecSummary(content) {
    const summaryMatch = content.match(/## \*\*Description\*\*([\s\S]*?)(?=## |$)/);
    if (summaryMatch) {
      return summaryMatch[1].trim().substring(0, 200) + '...';
    }
    return 'No description available';
  }

  categorizeFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath).toLowerCase();

    if (baseName.includes('test') || baseName.includes('spec') || ext === '.test.js') {
      return 'tests';
    }
    if (ext === '.md' || baseName.includes('readme') || baseName.includes('doc')) {
      return 'documentation';
    }
    if (baseName.includes('config') || baseName.includes('.json') || baseName.includes('.yml')) {
      return 'configuration';
    }
    return 'implementation';
  }

  async calculateFileRelevance(filePath, content, task, agentType) {
    let relevance = 0;

    // Check if file is explicitly mentioned in task
    if (task.files && task.files.includes(filePath)) {
      relevance += 0.5;
    }

    // Check content relevance to task
    const taskContent = task.content.toLowerCase();
    const fileContentLower = content.toLowerCase();

    const keywords = this.extractKeywords(taskContent);
    for (const keyword of keywords) {
      if (fileContentLower.includes(keyword.toLowerCase())) {
        relevance += 0.1;
      }
    }

    // Agent-specific relevance
    relevance += await this.calculateAgentFileRelevance(filePath, agentType);

    return Math.min(relevance, 1.0);
  }

  async findAdditionalRelevantFiles(_task, _agentType, _projectRoot) {
    const additionalFiles = {
      implementation: [],
      tests: [],
      documentation: [],
      configuration: []
    };

    // This would implement intelligent file discovery
    // For now, return empty structure
    return additionalFiles;
  }

  async loadAgentDefinition(agentType) {
    const projectRoot = this.configManager.getProjectRoot();
    const agentPath = path.join(projectRoot, '.claude', 'agents', `${agentType}.md`);

    try {
      const content = await fs.readFile(agentPath, 'utf-8');
      return this.parseMarkdownWithFrontmatter(content);
    } catch (error) {
      throw new Error(`Failed to load agent definition for ${agentType}: ${error.message}`);
    }
  }

  filterFilesByAgentType(relatedFiles, agentType) {
    // Agent-specific file filtering logic
    const filtered = { ...relatedFiles };

    // Software architects care more about implementation and architecture files
    if (agentType === 'software-architect') {
      filtered.implementation = filtered.implementation.filter(file =>
        file.relevance > 0.3 ||
        file.path.includes('lib/') ||
        file.path.includes('architecture')
      );
    }

    // CLI specialists care about CLI and UI files
    if (agentType === 'cli-specialist') {
      filtered.implementation = filtered.implementation.filter(file =>
        file.relevance > 0.3 ||
        file.path.includes('bin/') ||
        file.path.includes('cli') ||
        file.path.includes('index.js')
      );
    }

    return filtered;
  }

  async calculateContentRelevance(context, agentType) {
    // Analyze content for agent-specific keywords and concepts
    const content = JSON.stringify(context).toLowerCase();
    const agentKeywords = await this.getAgentKeywords(agentType);

    let matches = 0;
    for (const keyword of agentKeywords) {
      if (content.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    return agentKeywords.length > 0 ? matches / agentKeywords.length : 0.5;
  }

  calculateRelatedFilesRelevance(relatedFiles, _agentType) {
    if (!relatedFiles || Object.keys(relatedFiles).length === 0) return 0;

    let totalRelevance = 0;
    let fileCount = 0;

    for (const category of Object.values(relatedFiles)) {
      for (const file of category) {
        totalRelevance += file.relevance || 0;
        fileCount++;
      }
    }

    return fileCount > 0 ? totalRelevance / fileCount : 0;
  }

  calculateDependencyRelevance(dependencies, _agentType) {
    if (!dependencies || dependencies.required.length === 0) return 0.5;

    // Dependencies are generally relevant for context
    return 0.7;
  }

  async calculateAgentFileRelevance(filePath, agentType) {
    // Calculate how relevant a file is to a specific agent type
    let relevance = 0;

    if (agentType === 'software-architect') {
      if (filePath.includes('lib/') || filePath.includes('architecture') || filePath.includes('design')) {
        relevance += 0.3;
      }
    }

    if (agentType === 'cli-specialist') {
      if (filePath.includes('bin/') || filePath.includes('cli') || filePath.includes('index.js')) {
        relevance += 0.3;
      }
    }

    return relevance;
  }

  async getAgentKeywords(agentType) {
    // Return relevant keywords for each agent type
    const keywordMap = {
      'software-architect': ['architecture', 'design', 'system', 'integration', 'scalability', 'pattern'],
      'cli-specialist': ['cli', 'terminal', 'command', 'interface', 'tui', 'keyboard'],
      'testing-specialist': ['test', 'spec', 'validation', 'coverage', 'assertion', 'mock']
    };

    return keywordMap[agentType] || [];
  }

  areAgentsCompatible(taskAgent, currentAgent) {
    // Define agent compatibility matrix
    const compatibility = {
      'software-architect': ['cli-specialist', 'testing-specialist'],
      'cli-specialist': ['software-architect'],
      'testing-specialist': ['software-architect', 'cli-specialist']
    };

    return compatibility[taskAgent]?.includes(currentAgent) || false;
  }

  extractKeywords(content) {
    // Extract important keywords from content
    const words = content.match(/\b\w{4,}\b/g) || [];
    const stopWords = new Set(['this', 'that', 'with', 'from', 'they', 'them', 'will', 'have', 'been']);

    return words.filter(word => !stopWords.has(word.toLowerCase()));
  }

  inferStatusFromPath(filePath) {
    if (filePath.includes('/active/')) return 'active';
    if (filePath.includes('/done/')) return 'done';
    if (filePath.includes('/backlog/')) return 'backlog';
    return 'unknown';
  }

  async findAllSpecifications(projectRoot) {
    const specDirs = [
      path.join(projectRoot, 'docs', 'specs', 'active'),
      path.join(projectRoot, 'docs', 'specs', 'done'),
      path.join(projectRoot, 'docs', 'specs', 'backlog')
    ];

    const allSpecs = [];

    for (const dir of specDirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            allSpecs.push(path.join(dir, file));
          }
        }
      } catch (error) {
        // Directory might not exist, continue
      }
    }

    return allSpecs;
  }

  maintainCacheSize() {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest 20% of entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = Math.floor(this.maxCacheSize * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
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
   * Clear the context cache
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
      maxSize: this.maxCacheSize,
      timeout: this.cacheTimeout,
      hitRate: this.calculateHitRate()
    };
  }

  calculateHitRate() {
    // This would be implemented with proper metrics tracking
    return 0;
  }
}

module.exports = ContextGatherer;