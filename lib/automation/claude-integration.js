const https = require('https');
const fs = require('fs').promises;
const path = require('path');

/**
 * Claude Sub-agent Integration for FEAT-028
 * Handles Claude API communication for sub-agent workflows
 */
class ClaudeIntegration {
  constructor(configManager) {
    this.configManager = configManager;
    this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
    this.apiVersion = '2023-06-01';
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.requestTimeout = 120000; // 2 minutes
    this.rateLimitDelay = 1000;
    this.lastRequestTime = 0;
  }

  /**
   * Send task to Claude sub-agent with full context and automation support
   * @param {Object} options - Integration options
   * @param {string} options.agentType - Agent type for Claude
   * @param {Object} options.generatedPrompt - Generated prompt from PromptGenerator
   * @param {Object} options.workspaceConfig - Workspace configuration
   * @param {string} [options.apiKey] - Claude API key (if not in env)
   * @returns {Promise<Object>} Claude response with metadata
   */
  async sendTaskToAgent(options) {
    const { agentType, generatedPrompt, workspaceConfig, apiKey } = options;
    
    if (!generatedPrompt || !workspaceConfig) {
      throw new Error('Generated prompt and workspace configuration are required');
    }

    const startTime = Date.now();
    const requestId = `${workspaceConfig.metadata.workspaceId}-${Date.now()}`;

    try {
      // Step 1: Prepare Claude request
      const claudeRequest = await this.prepareClaudeRequest({
        agentType,
        prompt: generatedPrompt.prompt,
        workspaceId: workspaceConfig.metadata.workspaceId,
        taskId: workspaceConfig.metadata.taskId,
        specId: workspaceConfig.metadata.specId
      });

      // Step 2: Send request to Claude with retry logic
      const claudeResponse = await this.sendClaudeRequest(claudeRequest, apiKey, requestId);

      // Step 3: Process and validate response
      const processedResponse = await this.processClaudeResponse(claudeResponse, generatedPrompt);

      // Step 4: Extract and format results
      const formattedResults = await this.formatAgentResults(processedResponse, workspaceConfig);

      // Step 5: Log interaction for audit trail
      await this.logAgentInteraction({
        requestId,
        agentType,
        request: claudeRequest,
        response: formattedResults,
        performance: {
          requestTimeMs: Date.now() - startTime,
          promptLength: generatedPrompt.prompt.length,
          responseLength: formattedResults.content.length
        }
      });

      return {
        success: true,
        requestId,
        agentType,
        results: formattedResults,
        metadata: {
          workspaceId: workspaceConfig.metadata.workspaceId,
          taskId: workspaceConfig.metadata.taskId,
          completedAt: new Date().toISOString(),
          performance: {
            totalTimeMs: Date.now() - startTime,
            claudeResponseTimeMs: processedResponse.usage?.responseTimeMs || 0
          }
        }
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      // Log error for debugging
      await this.logAgentInteraction({
        requestId,
        agentType,
        error: error.message,
        performance: { requestTimeMs: totalTime }
      });

      throw new Error(`Claude sub-agent integration failed after ${totalTime}ms: ${error.message}`);
    }
  }

  /**
   * Prepare Claude API request with proper formatting
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Claude API request
   */
  async prepareClaudeRequest(options) {
    const { agentType, prompt, workspaceId, taskId, specId } = options;
    
    const claudeRequest = {
      model: this.getModelForAgent(agentType),
      max_tokens: this.getMaxTokensForAgent(agentType),
      temperature: this.getTemperatureForAgent(agentType),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      metadata: {
        user_id: 'asd-automation',
        workspace_id: workspaceId,
        task_id: taskId,
        spec_id: specId,
        agent_type: agentType
      },
      stop_sequences: this.getStopSequencesForAgent(agentType)
    };

    return claudeRequest;
  }

  /**
   * Send request to Claude API with error handling and retries
   * @param {Object} claudeRequest - Claude API request
   * @param {string} apiKey - API key
   * @param {string} requestId - Request identifier
   * @returns {Promise<Object>} Claude API response
   */
  async sendClaudeRequest(claudeRequest, apiKey, requestId) {
    const requestApiKey = apiKey || process.env.CLAUDE_API_KEY;
    
    if (!requestApiKey) {
      throw new Error('Claude API key not provided and CLAUDE_API_KEY environment variable not set');
    }

    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Rate limiting
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.rateLimitDelay) {
          await this.sleep(this.rateLimitDelay - timeSinceLastRequest);
        }
        
        this.lastRequestTime = Date.now();

        const response = await this.makeHttpRequest({
          method: 'POST',
          url: this.apiEndpoint,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': requestApiKey,
            'anthropic-version': this.apiVersion,
            'x-request-id': requestId
          },
          body: JSON.stringify(claudeRequest),
          timeout: this.requestTimeout
        });

        return JSON.parse(response);
      } catch (error) {
        lastError = error;
        
        console.warn(`[CLAUDE] Attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Claude API request failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Process Claude response and extract relevant information
   * @param {Object} claudeResponse - Raw Claude response
   * @param {Object} originalPrompt - Original prompt metadata
   * @returns {Promise<Object>} Processed response
   */
  async processClaudeResponse(claudeResponse, originalPrompt) {
    if (!claudeResponse.content || claudeResponse.content.length === 0) {
      throw new Error('Empty response received from Claude');
    }

    const processedResponse = {
      content: claudeResponse.content[0]?.text || '',
      usage: {
        inputTokens: claudeResponse.usage?.input_tokens || 0,
        outputTokens: claudeResponse.usage?.output_tokens || 0,
        totalTokens: (claudeResponse.usage?.input_tokens || 0) + (claudeResponse.usage?.output_tokens || 0)
      },
      model: claudeResponse.model,
      stopReason: claudeResponse.stop_reason,
      originalPromptMetadata: originalPrompt.metadata
    };

    // Validate response quality
    const validation = await this.validateAgentResponse(processedResponse);
    processedResponse.validation = validation;

    return processedResponse;
  }

  /**
   * Format agent results for consumption by ASD workflows
   * @param {Object} processedResponse - Processed Claude response
   * @param {Object} workspaceConfig - Workspace configuration
   * @returns {Promise<Object>} Formatted results
   */
  async formatAgentResults(processedResponse, workspaceConfig) {
    const results = {
      content: processedResponse.content,
      
      // Extract action items and next steps
      actionItems: this.extractActionItems(processedResponse.content),
      
      // Extract file changes mentioned
      fileChanges: this.extractFileChanges(processedResponse.content),
      
      // Extract validation requirements
      validationNeeded: this.extractValidationRequirements(processedResponse.content),
      
      // Extract any issues or blockers mentioned
      issues: this.extractIssues(processedResponse.content),
      
      // Performance and metadata
      performance: {
        tokenUsage: processedResponse.usage,
        responseQuality: processedResponse.validation.score,
        completeness: processedResponse.validation.completeness
      },
      
      // Workspace context
      workspace: {
        workspaceId: workspaceConfig.metadata.workspaceId,
        paths: workspaceConfig.paths,
        environment: workspaceConfig.environment
      }
    };

    return results;
  }

  /**
   * Validate agent response quality and completeness
   * @param {Object} response - Processed response
   * @returns {Promise<Object>} Validation results
   */
  async validateAgentResponse(response) {
    const validation = {
      isValid: true,
      score: 0,
      completeness: 0,
      issues: [],
      warnings: []
    };

    // Check response length
    if (response.content.length < 100) {
      validation.issues.push('Response too short - may be incomplete');
      validation.isValid = false;
    } else {
      validation.score += 0.2;
    }

    // Check for actionable content
    const actionableWords = ['implement', 'create', 'modify', 'update', 'fix', 'add', 'remove'];
    const hasActionableContent = actionableWords.some(word => 
      response.content.toLowerCase().includes(word)
    );
    
    if (hasActionableContent) {
      validation.score += 0.3;
    } else {
      validation.warnings.push('Response may lack actionable instructions');
    }

    // Check for code or technical content
    const hasCode = response.content.includes('```') || response.content.includes('const ') || response.content.includes('function ');
    if (hasCode) {
      validation.score += 0.2;
    }

    // Check for task completion indicators
    const completionIndicators = ['complete', 'done', 'finished', 'implemented'];
    const hasCompletion = completionIndicators.some(word => 
      response.content.toLowerCase().includes(word)
    );
    
    if (hasCompletion) {
      validation.completeness += 0.5;
    }

    // Check for validation mentions
    const validationKeywords = ['test', 'validate', 'verify', 'check'];
    const hasValidation = validationKeywords.some(word => 
      response.content.toLowerCase().includes(word)
    );
    
    if (hasValidation) {
      validation.completeness += 0.3;
    }

    // Check token usage efficiency
    if (response.usage.totalTokens > 0) {
      const efficiency = Math.min(response.usage.outputTokens / response.usage.totalTokens, 0.5);
      validation.score += efficiency * 0.3;
    }

    validation.isValid = validation.score >= 0.5 && validation.issues.length === 0;

    return validation;
  }

  /**
   * Log agent interaction for audit and debugging
   * @param {Object} interaction - Interaction details
   */
  async logAgentInteraction(interaction) {
    try {
      const projectRoot = this.configManager.getProjectRoot();
      const logsDir = path.join(projectRoot, '.asd', 'logs', 'claude-integration');
      
      await fs.mkdir(logsDir, { recursive: true });
      
      const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.jsonl`);
      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...interaction
      }) + '\n';
      
      await fs.appendFile(logFile, logEntry, 'utf-8');
    } catch (error) {
      console.warn(`[CLAUDE] Failed to log interaction: ${error.message}`);
    }
  }

  // Utility methods for response processing

  extractActionItems(content) {
    const actionItems = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [ ]') || trimmed.startsWith('□')) {
        actionItems.push(trimmed.replace(/^- \[ \]|□/, '').trim());
      }
    }
    
    return actionItems;
  }

  extractFileChanges(content) {
    const fileChanges = [];
    const filePathPattern = /`([^`]+\.(?:js|md|json|yml|yaml))`/g;
    let match;
    
    while ((match = filePathPattern.exec(content)) !== null) {
      if (!fileChanges.includes(match[1])) {
        fileChanges.push(match[1]);
      }
    }
    
    return fileChanges;
  }

  extractValidationRequirements(content) {
    const requirements = [];
    const validationKeywords = ['test', 'validate', 'verify', 'check', 'lint'];
    
    for (const keyword of validationKeywords) {
      const pattern = new RegExp(`\\b${keyword}\\b.*`, 'gi');
      const matches = content.match(pattern);
      if (matches) {
        requirements.push(...matches.slice(0, 3)); // Limit to 3 per keyword
      }
    }
    
    return requirements.slice(0, 10); // Max 10 requirements
  }

  extractIssues(content) {
    const issues = [];
    const issuePatterns = [
      /error:?\s+(.+)/gi,
      /issue:?\s+(.+)/gi,
      /problem:?\s+(.+)/gi,
      /blocker:?\s+(.+)/gi
    ];
    
    for (const pattern of issuePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        issues.push(...matches.slice(0, 2)); // Limit to 2 per pattern
      }
    }
    
    return issues.slice(0, 5); // Max 5 issues
  }

  // Agent-specific configuration methods

  getModelForAgent(agentType) {
    const models = {
      'software-architect': 'claude-3-5-sonnet-20241022',
      'cli-specialist': 'claude-3-5-sonnet-20241022', 
      'testing-specialist': 'claude-3-5-sonnet-20241022'
    };
    
    return models[agentType] || 'claude-3-5-sonnet-20241022';
  }

  getMaxTokensForAgent(agentType) {
    const maxTokens = {
      'software-architect': 4096,
      'cli-specialist': 3072,
      'testing-specialist': 3072
    };
    
    return maxTokens[agentType] || 3072;
  }

  getTemperatureForAgent(agentType) {
    const temperatures = {
      'software-architect': 0.1, // More deterministic for architecture
      'cli-specialist': 0.2,
      'testing-specialist': 0.1 // More deterministic for tests
    };
    
    return temperatures[agentType] || 0.2;
  }

  getStopSequencesForAgent(agentType) {
    const stopSequences = {
      'software-architect': ['---END-ARCHITECTURE---'],
      'cli-specialist': ['---END-CLI---'],
      'testing-specialist': ['---END-TESTS---']
    };
    
    return stopSequences[agentType] || [];
  }

  // HTTP utility methods

  async makeHttpRequest(options) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(options.url);
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname,
        method: options.method,
        headers: options.headers,
        timeout: options.timeout
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${options.timeout}ms`));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test Claude API connectivity
   * @param {string} [apiKey] - API key to test
   * @returns {Promise<Object>} Test results
   */
  async testApiConnectivity(apiKey) {
    const testKey = apiKey || process.env.CLAUDE_API_KEY;
    
    if (!testKey) {
      return {
        success: false,
        error: 'No API key provided'
      };
    }

    try {
      const testRequest = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connectivity test. Please respond with "Connected successfully".'
          }
        ]
      };

      const response = await this.makeHttpRequest({
        method: 'POST',
        url: this.apiEndpoint,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': testKey,
          'anthropic-version': this.apiVersion
        },
        body: JSON.stringify(testRequest),
        timeout: 10000
      });

      const parsed = JSON.parse(response);
      
      return {
        success: true,
        response: parsed.content[0]?.text || '',
        model: parsed.model,
        usage: parsed.usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ClaudeIntegration;