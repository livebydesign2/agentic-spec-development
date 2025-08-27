/**
 * Context Filter for agent-specific context filtering and relevance scoring
 * Handles pattern matching, requirements filtering, and content prioritization
 */
class ContextFilter {
  constructor(configManager) {
    this.configManager = configManager;
  }

  /**
   * Filter context based on agent-specific requirements and patterns
   * @param {Object} context - Full context object
   * @param {Object} agentDefinition - Agent definition with requirements
   * @param {Object} filteringConfig - Context filtering configuration
   * @returns {Promise<Object>} Filtered and scored context
   */
  async filterContextForAgent(context, agentDefinition, filteringConfig = {}) {
    const agentType = agentDefinition.frontmatter?.agent_type || 'unknown';
    const contextRequirements =
      agentDefinition.frontmatter?.context_requirements || [];

    // Get agent-specific filtering patterns
    const agentFilter = filteringConfig[agentType] || {};
    const includePatterns = agentFilter.include_patterns || [];
    const excludePatterns = agentFilter.exclude_patterns || [];

    // Create filtered context structure
    const filteredContext = {
      ...context,
      filtering: {
        applied: true,
        agentType,
        contextRequirements,
        includePatterns,
        excludePatterns,
        relevanceScores: {},
        filteredContent: {},
      },
    };

    // Filter each context layer
    filteredContext.layers = await this.filterContextLayers(
      context.layers,
      contextRequirements,
      includePatterns,
      excludePatterns
    );

    // Calculate relevance scores for each layer
    filteredContext.filtering.relevanceScores =
      await this.calculateLayerRelevanceScores(
        filteredContext.layers,
        contextRequirements
      );

    // Prioritize content based on relevance and agent needs
    filteredContext.prioritizedContent = await this.prioritizeContent(
      filteredContext.layers,
      filteredContext.filtering.relevanceScores,
      contextRequirements
    );

    return filteredContext;
  }

  /**
   * Filter individual context layers based on patterns and requirements
   * @param {Object} layers - Context layers object
   * @param {Array} contextRequirements - Agent context requirements
   * @param {Array} includePatterns - Patterns to include
   * @param {Array} excludePatterns - Patterns to exclude
   * @returns {Promise<Object>} Filtered layers
   */
  async filterContextLayers(
    layers,
    contextRequirements,
    includePatterns,
    excludePatterns
  ) {
    const filteredLayers = {};

    for (const [layerName, layerContent] of Object.entries(layers)) {
      filteredLayers[layerName] = await this.filterLayerContent(
        layerContent,
        contextRequirements,
        includePatterns,
        excludePatterns,
        layerName
      );
    }

    return filteredLayers;
  }

  /**
   * Filter content within a specific layer
   * @param {*} layerContent - Content of the layer
   * @param {Array} contextRequirements - Agent context requirements
   * @param {Array} includePatterns - Patterns to include
   * @param {Array} excludePatterns - Patterns to exclude
   * @param {string} layerName - Name of the layer
   * @returns {Promise<Object>} Filtered layer content
   */
  async filterLayerContent(
    layerContent,
    contextRequirements,
    includePatterns,
    excludePatterns,
    layerName
  ) {
    if (!layerContent || typeof layerContent !== 'object') {
      return layerContent;
    }

    const filteredContent = {
      ...layerContent,
      filtering: {
        layerName,
        matchedRequirements: [],
        matchedIncludes: [],
        excludedContent: [],
      },
    };

    // Convert content to searchable text
    const contentText = this.extractSearchableText(layerContent);

    // Check context requirements matches
    for (const requirement of contextRequirements) {
      if (this.matchesPattern(contentText, requirement)) {
        filteredContent.filtering.matchedRequirements.push(requirement);
      }
    }

    // Apply include patterns
    for (const pattern of includePatterns) {
      if (this.matchesPattern(contentText, pattern)) {
        filteredContent.filtering.matchedIncludes.push(pattern);
      }
    }

    // Apply exclude patterns
    const shouldExclude = excludePatterns.some((pattern) =>
      this.matchesPattern(contentText, pattern)
    );

    if (shouldExclude) {
      filteredContent.filtering.excluded = true;
      filteredContent.filtering.excludedContent = excludePatterns.filter(
        (pattern) => this.matchesPattern(contentText, pattern)
      );
    }

    // Filter nested objects recursively
    if (typeof layerContent === 'object' && layerContent !== null) {
      for (const [key, value] of Object.entries(layerContent)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          key !== 'filtering'
        ) {
          filteredContent[key] = await this.filterLayerContent(
            value,
            contextRequirements,
            includePatterns,
            excludePatterns,
            `${layerName}.${key}`
          );
        }
      }
    }

    return filteredContent;
  }

  /**
   * Calculate relevance scores for each context layer
   * @param {Object} layers - Filtered context layers
   * @param {Array} contextRequirements - Agent context requirements
   * @returns {Promise<Object>} Relevance scores by layer
   */
  async calculateLayerRelevanceScores(layers, contextRequirements) {
    const relevanceScores = {};

    for (const [layerName, layerContent] of Object.entries(layers)) {
      relevanceScores[layerName] = await this.calculateContentRelevance(
        layerContent,
        contextRequirements,
        layerName
      );
    }

    return relevanceScores;
  }

  /**
   * Calculate relevance score for specific content
   * @param {*} content - Content to score
   * @param {Array} contextRequirements - Agent context requirements
   * @param {string} contentType - Type of content being scored
   * @returns {Promise<Object>} Relevance score details
   */
  async calculateContentRelevance(content, contextRequirements, contentType) {
    const scoreDetails = {
      contentType,
      overallScore: 0,
      requirementScores: {},
      matchedTerms: [],
      totalRequirements: contextRequirements.length,
      hasContent: !!content,
    };

    if (!content || contextRequirements.length === 0) {
      return scoreDetails;
    }

    const contentText = this.extractSearchableText(content);
    let totalScore = 0;

    // Score against each requirement
    for (const requirement of contextRequirements) {
      const requirementScore = this.calculateRequirementScore(
        contentText,
        requirement
      );
      scoreDetails.requirementScores[requirement] = requirementScore;
      totalScore += requirementScore.score;

      if (requirementScore.matches.length > 0) {
        scoreDetails.matchedTerms.push(...requirementScore.matches);
      }
    }

    // Calculate overall score (0-1)
    scoreDetails.overallScore =
      contextRequirements.length > 0
        ? totalScore / contextRequirements.length
        : 0;

    // Add bonus for critical content types
    if (contentType === 'critical') {
      scoreDetails.overallScore *= 1.2; // 20% bonus for critical content
    } else if (contentType === 'agentSpecific') {
      scoreDetails.overallScore *= 1.1; // 10% bonus for agent-specific content
    }

    // Ensure score doesn't exceed 1
    scoreDetails.overallScore = Math.min(scoreDetails.overallScore, 1);

    return scoreDetails;
  }

  /**
   * Calculate how well content matches a specific requirement
   * @param {string} contentText - Searchable content text
   * @param {string} requirement - Context requirement pattern
   * @returns {Object} Requirement score details
   */
  calculateRequirementScore(contentText, requirement) {
    const scoreDetails = {
      requirement,
      score: 0,
      matches: [],
      patterns: [],
    };

    // Convert requirement to search patterns
    const patterns = this.generateSearchPatterns(requirement);
    scoreDetails.patterns = patterns;

    for (const pattern of patterns) {
      const matches = this.findPatternMatches(contentText, pattern);
      if (matches.length > 0) {
        scoreDetails.matches.push(...matches);
        // Score based on pattern strength and match count
        scoreDetails.score += Math.min(matches.length * 0.1, 0.5);
      }
    }

    // Bonus for exact phrase matches
    if (contentText.toLowerCase().includes(requirement.toLowerCase())) {
      scoreDetails.score += 0.3;
      scoreDetails.matches.push(requirement);
    }

    // Normalize score to 0-1 range
    scoreDetails.score = Math.min(scoreDetails.score, 1);

    return scoreDetails;
  }

  /**
   * Generate search patterns from a requirement string
   * @param {string} requirement - Context requirement
   * @returns {Array} Array of search patterns
   */
  generateSearchPatterns(requirement) {
    const patterns = [];

    // Original requirement
    patterns.push(requirement);

    // Convert hyphens to word boundaries
    patterns.push(requirement.replace(/-/g, '\\s+'));

    // Individual words
    const words = requirement.split(/[-\s]+/).filter((word) => word.length > 2);
    patterns.push(...words);

    // Partial matches (for compound terms)
    if (requirement.includes('-')) {
      patterns.push(...requirement.split('-'));
    }

    return patterns;
  }

  /**
   * Find matches for a specific pattern in text
   * @param {string} text - Text to search
   * @param {string} pattern - Pattern to find
   * @returns {Array} Array of matches
   */
  findPatternMatches(text, pattern) {
    const matches = [];
    const regex = new RegExp(
      pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'gi'
    );
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push(match[0]);
    }

    return matches;
  }

  /**
   * Prioritize content based on relevance scores and agent requirements
   * @param {Object} layers - Context layers
   * @param {Object} relevanceScores - Calculated relevance scores
   * @param {Array} contextRequirements - Agent context requirements
   * @returns {Promise<Object>} Prioritized content structure
   */
  async prioritizeContent(layers, relevanceScores, _contextRequirements) {
    const prioritizedContent = {
      highPriority: {},
      mediumPriority: {},
      lowPriority: {},
      scores: relevanceScores,
    };

    for (const [layerName, layerScore] of Object.entries(relevanceScores)) {
      const content = layers[layerName];
      const score = layerScore.overallScore;

      if (score >= 0.7) {
        prioritizedContent.highPriority[layerName] = content;
      } else if (score >= 0.3) {
        prioritizedContent.mediumPriority[layerName] = content;
      } else {
        prioritizedContent.lowPriority[layerName] = content;
      }
    }

    return prioritizedContent;
  }

  /**
   * Check if text matches a pattern (case-insensitive, flexible matching)
   * @param {string} text - Text to search
   * @param {string} pattern - Pattern to match
   * @returns {boolean} Whether pattern matches
   */
  matchesPattern(text, pattern) {
    if (!text || !pattern) return false;

    const normalizedText = text.toLowerCase();
    const normalizedPattern = pattern.toLowerCase();

    // Direct substring match
    if (normalizedText.includes(normalizedPattern)) {
      return true;
    }

    // Regex pattern match (convert pattern to regex-friendly format)
    try {
      const regexPattern = normalizedPattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\\\*/g, '.*') // Convert * to .*
        .replace(/-/g, '.*'); // Convert - to .*

      const regex = new RegExp(regexPattern, 'i');
      return regex.test(normalizedText);
    } catch (error) {
      // If regex fails, fall back to word boundary matching
      const words = normalizedPattern.split(/[-\s]+/);
      return words.some((word) => normalizedText.includes(word));
    }
  }

  /**
   * Extract searchable text from complex objects
   * @param {*} obj - Object to extract text from
   * @returns {string} Extracted searchable text
   */
  extractSearchableText(obj) {
    if (typeof obj === 'string') {
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.extractSearchableText(item)).join(' ');
    }

    if (typeof obj === 'object' && obj !== null) {
      const textParts = [];

      for (const [key, value] of Object.entries(obj)) {
        // Skip metadata and filtering objects to avoid noise
        if (key === 'filtering' || key === 'metadata' || key === '__internal') {
          continue;
        }

        textParts.push(key);
        textParts.push(this.extractSearchableText(value));
      }

      return textParts.join(' ');
    }

    return '';
  }

  /**
   * Get filtering statistics for debugging and optimization
   * @param {Object} filteredContext - Filtered context object
   * @returns {Object} Filtering statistics
   */
  getFilteringStats(filteredContext) {
    const stats = {
      totalLayers: Object.keys(filteredContext.layers || {}).length,
      filteredLayers: 0,
      excludedContent: 0,
      averageRelevance: 0,
      highRelevanceContent: 0,
      matchedRequirements: new Set(),
      appliedPatterns: new Set(),
    };

    if (!filteredContext.filtering) {
      return stats;
    }

    // Calculate relevance statistics
    const scores = Object.values(
      filteredContext.filtering.relevanceScores || {}
    );
    if (scores.length > 0) {
      const totalScore = scores.reduce(
        (sum, score) => sum + score.overallScore,
        0
      );
      stats.averageRelevance = totalScore / scores.length;
      stats.highRelevanceContent = scores.filter(
        (score) => score.overallScore >= 0.7
      ).length;

      // Collect matched requirements
      scores.forEach((score) => {
        if (score.matchedTerms) {
          score.matchedTerms.forEach((term) =>
            stats.matchedRequirements.add(term)
          );
        }
      });
    }

    return stats;
  }
}

module.exports = ContextFilter;
