const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

/**
 * Agent Session Manager for FEAT-028
 * Manages sub-agent session state, performance tracking, and result processing
 */
class AgentSessionManager extends EventEmitter {
  constructor(configManager) {
    super();
    this.configManager = configManager;
    this.activeSessions = new Map();
    this.sessionHistory = new Map();
    this.maxHistorySize = 100;
    this.sessionTimeout = 600000; // 10 minutes

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Check every minute
  }

  /**
   * Create new agent session for task execution
   * @param {Object} options - Session options
   * @param {string} options.workspaceId - Workspace identifier
   * @param {string} options.agentType - Agent type
   * @param {Object} options.taskContext - Task context
   * @param {Object} options.workspaceConfig - Workspace configuration
   * @returns {Promise<Object>} Session information
   */
  async createSession(options) {
    const { workspaceId, agentType, taskContext, workspaceConfig } = options;

    if (!workspaceId || !agentType) {
      throw new Error('workspaceId and agentType are required for session creation');
    }

    const sessionId = `${workspaceId}-${agentType}-${Date.now()}`;
    const startTime = Date.now();

    const session = {
      sessionId,
      workspaceId,
      agentType,
      status: 'initializing',

      metadata: {
        createdAt: new Date().toISOString(),
        specId: taskContext?.metadata?.specId,
        taskId: taskContext?.metadata?.taskId,
        agentVersion: this.getAgentVersion(agentType),
        contextRelevance: taskContext?.validation?.relevanceScore || 0
      },

      state: {
        currentPhase: 'context_preparation',
        completedPhases: [],
        progress: 0,
        lastActivity: new Date().toISOString()
      },

      context: {
        task: taskContext,
        workspace: workspaceConfig,
        environment: workspaceConfig?.environment || {}
      },

      performance: {
        startTime,
        phases: {},
        metrics: {
          contextPreparationMs: 0,
          promptGenerationMs: 0,
          claudeExecutionMs: 0,
          resultProcessingMs: 0,
          totalExecutionMs: 0
        }
      },

      communication: {
        requests: [],
        responses: [],
        errors: []
      },

      results: {
        artifacts: [],
        fileChanges: [],
        validationResults: {},
        nextSteps: []
      }
    };

    // Store session
    this.activeSessions.set(sessionId, session);

    // Create session directory for artifacts
    await this.createSessionDirectory(session);

    // Emit session created event
    this.emit('sessionCreated', session);

    console.log(`[SESSION] Created ${sessionId} for ${agentType} on ${workspaceId}`);

    return {
      sessionId,
      status: session.status,
      createdAt: session.metadata.createdAt,
      agentType,
      workspaceId
    };
  }

  /**
   * Update session state and progress
   * @param {string} sessionId - Session identifier
   * @param {Object} updates - State updates
   * @returns {Promise<Object>} Updated session state
   */
  async updateSessionState(sessionId, updates) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const previousPhase = session.state.currentPhase;

    // Update session state
    Object.assign(session.state, updates, {
      lastActivity: new Date().toISOString()
    });

    // Track phase transitions
    if (updates.currentPhase && updates.currentPhase !== previousPhase) {
      session.state.completedPhases.push(previousPhase);
      session.performance.phases[previousPhase] = {
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - session.performance.startTime
      };

      this.emit('phaseTransition', {
        sessionId,
        from: previousPhase,
        to: updates.currentPhase,
        session
      });
    }

    // Update progress
    if (updates.progress !== undefined) {
      session.state.progress = Math.max(0, Math.min(100, updates.progress));
    }

    // Save session state
    await this.saveSessionState(session);

    return session.state;
  }

  /**
   * Record Claude communication for session
   * @param {string} sessionId - Session identifier
   * @param {Object} communication - Communication details
   * @returns {Promise<void>}
   */
  async recordCommunication(sessionId, communication) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { type, data, timestamp = new Date().toISOString() } = communication;

    if (type === 'request') {
      session.communication.requests.push({
        timestamp,
        ...data
      });
    } else if (type === 'response') {
      session.communication.responses.push({
        timestamp,
        ...data
      });
    } else if (type === 'error') {
      session.communication.errors.push({
        timestamp,
        ...data
      });
    }

    // Update performance metrics
    if (data.performanceMetrics) {
      Object.assign(session.performance.metrics, data.performanceMetrics);
    }

    // Update last activity
    session.state.lastActivity = timestamp;

    this.emit('communicationRecorded', {
      sessionId,
      type,
      data,
      session
    });
  }

  /**
   * Process and store session results
   * @param {string} sessionId - Session identifier
   * @param {Object} results - Agent execution results
   * @returns {Promise<Object>} Processed results
   */
  async processSessionResults(sessionId, results) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const startTime = Date.now();

    try {
      // Process different types of results
      const processedResults = {
        artifacts: await this.processArtifacts(results.artifacts || [], session),
        fileChanges: await this.processFileChanges(results.fileChanges || [], session),
        validationResults: await this.processValidationResults(results.validationNeeded || [], session),
        nextSteps: await this.processNextSteps(results.actionItems || [], session),
        performance: results.performance || {}
      };

      // Store processed results
      session.results = processedResults;

      // Update session metrics
      session.performance.metrics.resultProcessingMs = Date.now() - startTime;
      session.performance.metrics.totalExecutionMs = Date.now() - session.performance.startTime;

      // Update session state
      await this.updateSessionState(sessionId, {
        currentPhase: 'results_processed',
        progress: 90
      });

      // Save artifacts to session directory
      await this.saveSessionArtifacts(session, processedResults);

      this.emit('resultsProcessed', {
        sessionId,
        results: processedResults,
        session
      });

      return processedResults;
    } catch (error) {
      session.communication.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        phase: 'result_processing'
      });

      throw new Error(`Results processing failed for session ${sessionId}: ${error.message}`);
    }
  }

  /**
   * Complete session and generate final report
   * @param {string} sessionId - Session identifier
   * @param {Object} [completionData] - Additional completion data
   * @returns {Promise<Object>} Session completion report
   */
  async completeSession(sessionId, completionData = {}) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const completionTime = Date.now();

    // Update final session state
    await this.updateSessionState(sessionId, {
      status: 'completed',
      currentPhase: 'completed',
      progress: 100,
      completedAt: new Date().toISOString()
    });

    // Generate completion report
    const report = {
      sessionId,
      success: true,
      completedAt: new Date().toISOString(),

      summary: {
        agentType: session.agentType,
        workspaceId: session.workspaceId,
        taskId: session.metadata.taskId,
        specId: session.metadata.specId,
        totalDurationMs: completionTime - session.performance.startTime,
        phasesCompleted: session.state.completedPhases.length + 1
      },

      performance: {
        ...session.performance.metrics,
        efficiency: this.calculateEfficiencyScore(session),
        quality: this.calculateQualityScore(session)
      },

      results: {
        artifactsCreated: session.results.artifacts.length,
        filesChanged: session.results.fileChanges.length,
        validationsPassed: this.countPassedValidations(session.results.validationResults),
        nextStepsIdentified: session.results.nextSteps.length
      },

      recommendations: this.generateRecommendations(session),

      ...completionData
    };

    // Move session to history
    this.moveToHistory(sessionId, session, report);

    // Generate final session report file
    await this.generateSessionReport(session, report);

    this.emit('sessionCompleted', {
      sessionId,
      report,
      session
    });

    console.log(`[SESSION] Completed ${sessionId} in ${report.summary.totalDurationMs}ms`);

    return report;
  }

  /**
   * Handle session errors and cleanup
   * @param {string} sessionId - Session identifier
   * @param {Object} error - Error information
   * @returns {Promise<Object>} Error report
   */
  async handleSessionError(sessionId, error) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const errorTime = Date.now();

    // Record error
    session.communication.errors.push({
      timestamp: new Date().toISOString(),
      error: error.message || error,
      stack: error.stack,
      phase: session.state.currentPhase
    });

    // Update session state
    await this.updateSessionState(sessionId, {
      status: 'failed',
      currentPhase: 'error',
      failedAt: new Date().toISOString()
    });

    const errorReport = {
      sessionId,
      success: false,
      error: error.message || error,
      failedAt: new Date().toISOString(),

      summary: {
        agentType: session.agentType,
        workspaceId: session.workspaceId,
        totalDurationMs: errorTime - session.performance.startTime,
        failedInPhase: session.state.currentPhase
      },

      performance: session.performance.metrics,

      diagnostics: {
        communicationErrors: session.communication.errors.length,
        lastActivity: session.state.lastActivity,
        progress: session.state.progress
      }
    };

    // Move failed session to history
    this.moveToHistory(sessionId, session, errorReport);

    this.emit('sessionFailed', {
      sessionId,
      error: errorReport,
      session
    });

    console.error(`[SESSION] Failed ${sessionId}: ${error.message}`);

    return errorReport;
  }

  /**
   * Get session status and progress
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session status
   */
  getSessionStatus(sessionId) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      const historical = this.sessionHistory.get(sessionId);
      if (historical) {
        return {
          sessionId,
          status: historical.session.status,
          found: true,
          historical: true,
          completedAt: historical.completedAt,
          summary: historical.report.summary
        };
      }

      return {
        sessionId,
        found: false
      };
    }

    return {
      sessionId,
      found: true,
      status: session.status,
      progress: session.state.progress,
      currentPhase: session.state.currentPhase,
      agentType: session.agentType,
      workspaceId: session.workspaceId,
      createdAt: session.metadata.createdAt,
      lastActivity: session.state.lastActivity,
      performance: {
        durationMs: Date.now() - session.performance.startTime,
        currentMetrics: session.performance.metrics
      }
    };
  }

  // Utility methods for result processing

  async processArtifacts(artifacts, _session) {
    const processed = [];

    for (const artifact of artifacts) {
      processed.push({
        type: artifact.type || 'code',
        content: artifact.content || artifact,
        filename: artifact.filename,
        language: artifact.language || 'javascript',
        size: (artifact.content || artifact).length,
        createdAt: new Date().toISOString()
      });
    }

    return processed;
  }

  async processFileChanges(fileChanges, _session) {
    const processed = [];

    for (const change of fileChanges) {
      processed.push({
        path: change.path || change,
        action: change.action || 'modified',
        size: change.size || 0,
        backup: change.backup || false,
        validated: false
      });
    }

    return processed;
  }

  async processValidationResults(validationNeeded, _session) {
    const results = {
      tests: [],
      lint: [],
      functionality: [],
      performance: []
    };

    for (const validation of validationNeeded) {
      const category = this.categorizeValidation(validation);
      results[category].push({
        description: validation,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
    }

    return results;
  }

  async processNextSteps(actionItems, _session) {
    return actionItems.map((item, index) => ({
      id: index + 1,
      description: item,
      priority: this.inferPriority(item),
      category: this.categorizeActionItem(item),
      createdAt: new Date().toISOString()
    }));
  }

  // Session management utilities

  async createSessionDirectory(session) {
    const projectRoot = this.configManager.getProjectRoot();
    const sessionDir = path.join(projectRoot, '.asd', 'sessions', session.sessionId);

    await fs.mkdir(sessionDir, { recursive: true });
    session.sessionDirectory = sessionDir;
  }

  async saveSessionState(session) {
    if (!session.sessionDirectory) return;

    const stateFile = path.join(session.sessionDirectory, 'state.json');
    await fs.writeFile(stateFile, JSON.stringify(session, null, 2), 'utf-8');
  }

  async saveSessionArtifacts(session, results) {
    if (!session.sessionDirectory) return;

    // Save artifacts
    for (let i = 0; i < results.artifacts.length; i++) {
      const artifact = results.artifacts[i];
      const filename = artifact.filename || `artifact_${i + 1}.js`;
      const filepath = path.join(session.sessionDirectory, filename);
      await fs.writeFile(filepath, artifact.content, 'utf-8');
    }

    // Save results summary
    const summaryFile = path.join(session.sessionDirectory, 'results.json');
    await fs.writeFile(summaryFile, JSON.stringify(results, null, 2), 'utf-8');
  }

  async generateSessionReport(session, report) {
    if (!session.sessionDirectory) return;

    const reportFile = path.join(session.sessionDirectory, 'report.json');
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2), 'utf-8');
  }

  moveToHistory(sessionId, session, report) {
    this.sessionHistory.set(sessionId, {
      session: { ...session, status: session.state?.status || 'unknown' },
      report,
      completedAt: new Date().toISOString()
    });

    this.activeSessions.delete(sessionId);

    // Maintain history size limit
    if (this.sessionHistory.size > this.maxHistorySize) {
      const oldestKey = this.sessionHistory.keys().next().value;
      this.sessionHistory.delete(oldestKey);
    }
  }

  cleanupExpiredSessions() {
    const now = Date.now();

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const lastActivity = new Date(session.state.lastActivity).getTime();
      if (now - lastActivity > this.sessionTimeout) {
        console.warn(`[SESSION] Cleaning up expired session ${sessionId}`);
        this.handleSessionError(sessionId, new Error('Session expired due to inactivity'));
      }
    }
  }

  // Scoring and analysis utilities

  calculateEfficiencyScore(session) {
    const totalTime = session.performance.metrics.totalExecutionMs;
    const contextTime = session.performance.metrics.contextPreparationMs || 0;
    const claudeTime = session.performance.metrics.claudeExecutionMs || 0;

    if (totalTime === 0) return 0;

    const activeTime = contextTime + claudeTime;
    return Math.min(1.0, activeTime / totalTime);
  }

  calculateQualityScore(session) {
    let score = 0.5; // Base score

    // Bonus for artifacts created
    if (session.results.artifacts.length > 0) score += 0.2;

    // Bonus for file changes
    if (session.results.fileChanges.length > 0) score += 0.1;

    // Bonus for validation coverage
    const validationCount = Object.values(session.results.validationResults || {})
      .reduce((sum, arr) => sum + arr.length, 0);
    if (validationCount > 0) score += 0.1;

    // Penalty for errors
    if (session.communication.errors.length > 0) score -= 0.2;

    return Math.max(0, Math.min(1.0, score));
  }

  countPassedValidations(validationResults) {
    return Object.values(validationResults || {})
      .flat()
      .filter(v => v.status === 'passed').length;
  }

  generateRecommendations(session) {
    const recommendations = [];

    if (session.performance.metrics.totalExecutionMs > 300000) {
      recommendations.push('Consider breaking down large tasks for better performance');
    }

    if (session.communication.errors.length > 2) {
      recommendations.push('Review error patterns to improve reliability');
    }

    if (session.results.validationResults && this.countPassedValidations(session.results.validationResults) === 0) {
      recommendations.push('Add validation steps to ensure quality');
    }

    return recommendations;
  }

  categorizeValidation(validation) {
    const lower = validation.toLowerCase();
    if (lower.includes('test')) return 'tests';
    if (lower.includes('lint')) return 'lint';
    if (lower.includes('performance')) return 'performance';
    return 'functionality';
  }

  inferPriority(actionItem) {
    const lower = actionItem.toLowerCase();
    if (lower.includes('critical') || lower.includes('urgent')) return 'high';
    if (lower.includes('optional') || lower.includes('nice')) return 'low';
    return 'medium';
  }

  categorizeActionItem(actionItem) {
    const lower = actionItem.toLowerCase();
    if (lower.includes('test')) return 'testing';
    if (lower.includes('doc')) return 'documentation';
    if (lower.includes('fix') || lower.includes('bug')) return 'bugfix';
    return 'feature';
  }

  getAgentVersion(_agentType) {
    return '1.0.0'; // Would be dynamically determined in production
  }

  /**
   * List all active sessions
   * @returns {Array} Active session summaries
   */
  listActiveSessions() {
    return Array.from(this.activeSessions.values()).map(session => ({
      sessionId: session.sessionId,
      agentType: session.agentType,
      workspaceId: session.workspaceId,
      status: session.status,
      progress: session.state.progress,
      currentPhase: session.state.currentPhase,
      createdAt: session.metadata.createdAt,
      durationMs: Date.now() - session.performance.startTime
    }));
  }

  /**
   * Get session history
   * @param {number} [limit=10] - Maximum number of historical sessions to return
   * @returns {Array} Historical session summaries
   */
  getSessionHistory(limit = 10) {
    return Array.from(this.sessionHistory.values())
      .slice(-limit)
      .map(entry => ({
        sessionId: entry.session.sessionId,
        agentType: entry.session.agentType,
        workspaceId: entry.session.workspaceId,
        success: entry.report.success,
        completedAt: entry.completedAt,
        durationMs: entry.report.summary.totalDurationMs
      }));
  }

  /**
   * Clean up all resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.activeSessions.clear();
    this.sessionHistory.clear();
    this.removeAllListeners();
  }
}

module.exports = AgentSessionManager;