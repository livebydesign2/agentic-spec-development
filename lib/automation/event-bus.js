const EventEmitter = require('events');

/**
 * EventBus - Central event coordination system for automated state synchronization
 *
 * Provides decoupled event-driven architecture for coordinating file system changes,
 * state validation, synchronization operations, and conflict resolution across the
 * entire ASD automation system.
 *
 * Key Features:
 * - Event routing with priority and filtering capabilities
 * - Async event handling with error isolation
 * - Event history and audit logging
 * - Performance monitoring and metrics
 * - Plugin-style event handler registration
 * - Dead letter queue for failed events
 * - Circuit breaker pattern for handler failures
 */
class EventBus extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration options
    this.options = {
      maxListeners: options.maxListeners || 20,
      eventHistorySize: options.eventHistorySize || 1000,
      deadLetterQueueSize: options.deadLetterQueueSize || 100,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerResetTime: options.circuitBreakerResetTime || 30000, // 30 seconds
      performanceTarget: options.performanceTarget || 50, // 50ms per event
      ...options
    };

    // Set max listeners to prevent warnings
    this.setMaxListeners(this.options.maxListeners);

    // Event tracking and history
    this.eventHistory = [];
    this.deadLetterQueue = [];
    this.handlerRegistry = new Map();

    // Performance monitoring
    this.metrics = {
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      averageProcessingTime: 0,
      lastProcessedEvent: null,
      handlerPerformance: new Map()
    };

    // Circuit breaker state for handlers
    this.circuitBreakers = new Map();

    // Event priorities (higher number = higher priority)
    this.eventPriorities = {
      'file_change': 1,
      'validation_complete': 2,
      'sync_required': 3,
      'conflict_detected': 4,
      'manual_intervention': 5,
      'system_error': 6
    };

    // Event processing queue with priority support
    this.eventQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the EventBus system
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      console.log('✅ EventBus initialized successfully');

      // Set up error handling for the EventEmitter
      this.on('error', this.handleEventBusError.bind(this));

      // Start event processing loop
      this.startEventProcessing();

      this.emit('initialized', {
        maxListeners: this.options.maxListeners,
        eventHistorySize: this.options.eventHistorySize,
        performanceTarget: this.options.performanceTarget,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error(`❌ EventBus initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Register an event handler with metadata and circuit breaker protection
   * @param {string} eventType - Type of event to handle
   * @param {Function} handler - Event handler function
   * @param {Object} options - Handler options (priority, timeout, etc.)
   * @returns {string} Handler ID for later removal
   */
  registerHandler(eventType, handler, options = {}) {
    const handlerId = `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const handlerMetadata = {
      id: handlerId,
      eventType,
      handler,
      priority: options.priority || 0,
      timeout: options.timeout || 5000,
      retries: options.retries || 3,
      enabled: true,
      registeredAt: new Date().toISOString(),
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    };

    // Store handler metadata
    this.handlerRegistry.set(handlerId, handlerMetadata);

    // Initialize circuit breaker for this handler
    this.circuitBreakers.set(handlerId, {
      failures: 0,
      lastFailureTime: null,
      state: 'closed', // closed, open, half-open
      nextAttemptTime: null
    });

    // Register the wrapped handler
    const wrappedHandler = this.createWrappedHandler(handlerMetadata);
    this.on(eventType, wrappedHandler);

    console.log(`📝 Registered handler ${handlerId} for event type: ${eventType}`);
    return handlerId;
  }

  /**
   * Unregister an event handler
   * @param {string} handlerId - Handler ID returned from registerHandler
   * @returns {boolean} Whether handler was successfully removed
   */
  unregisterHandler(handlerId) {
    const handlerMetadata = this.handlerRegistry.get(handlerId);
    if (!handlerMetadata) {
      console.warn(`Handler ${handlerId} not found for removal`);
      return false;
    }

    // Remove event listener
    this.removeListener(handlerMetadata.eventType, handlerMetadata.wrappedHandler);

    // Clean up metadata
    this.handlerRegistry.delete(handlerId);
    this.circuitBreakers.delete(handlerId);

    console.log(`🗑️ Unregistered handler ${handlerId}`);
    return true;
  }

  /**
   * Emit event with enhanced features (priority, history, metrics)
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data payload
   * @param {Object} options - Event options (priority, timeout, etc.)
   * @returns {Promise<boolean>} Whether event was successfully queued
   */
  async emitEnhanced(eventType, eventData = {}, options = {}) {
    const __startTime = Date.now();

    try {
      // Create enhanced event object
      const enhancedEvent = {
        type: eventType,
        data: eventData,
        metadata: {
          id: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          priority: options.priority || this.eventPriorities[eventType] || 1,
          timestamp: new Date().toISOString(),
          source: options.source || 'unknown',
          timeout: options.timeout || 10000,
          retries: options.retries || 3,
          attempt: 1,
          maxAttempts: (options.retries || 3) + 1
        }
      };

      // Add to event history
      this.addToEventHistory(enhancedEvent);

      // Update metrics
      this.metrics.totalEvents++;

      // Add to processing queue
      this.eventQueue.push(enhancedEvent);
      this.eventQueue.sort((a, b) => b.metadata.priority - a.metadata.priority);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.startEventProcessing();
      }

      console.log(`📤 Queued event: ${eventType} (priority: ${enhancedEvent.metadata.priority})`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to emit event ${eventType}: ${error.message}`);
      this.metrics.failedEvents++;
      return false;
    }
  }

  /**
   * Start the event processing loop
   */
  startEventProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processEventQueue();
  }

  /**
   * Process events from the queue
   */
  async processEventQueue() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      await this.processEvent(event);
    }

    this.isProcessing = false;

    // Schedule next processing cycle if there are new events
    setTimeout(() => {
      if (this.eventQueue.length > 0 && !this.isProcessing) {
        this.startEventProcessing();
      }
    }, 10); // 10ms delay to prevent tight loop
  }

  /**
   * Process a single event
   * @param {Object} event - Event to process
   */
  async processEvent(event) {
    const startTime = Date.now();

    try {
      // Check timeout
      const eventAge = Date.now() - new Date(event.metadata.timestamp).getTime();
      if (eventAge > event.metadata.timeout) {
        this.moveToDeadLetterQueue(event, 'timeout');
        return;
      }

      // Emit the event to registered handlers
      this.emit(event.type, event.data, event.metadata);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metrics.processedEvents++;
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime * (this.metrics.processedEvents - 1) + processingTime) /
        this.metrics.processedEvents;
      this.metrics.lastProcessedEvent = new Date().toISOString();

      // Log performance warning if processing took too long
      if (processingTime > this.options.performanceTarget) {
        console.warn(`⚠️ Event processing took ${processingTime}ms, exceeding ${this.options.performanceTarget}ms target`);
      }

      console.log(`✅ Processed event: ${event.type} (${processingTime}ms)`);

    } catch (error) {
      console.error(`❌ Error processing event ${event.type}: ${error.message}`);
      this.handleEventProcessingError(event, error);
    }
  }

  /**
   * Create wrapped handler with circuit breaker and performance monitoring
   * @param {Object} handlerMetadata - Handler metadata
   * @returns {Function} Wrapped handler function
   */
  createWrappedHandler(handlerMetadata) {
    const wrappedHandler = async (eventData, eventMetadata) => {
      const circuitBreaker = this.circuitBreakers.get(handlerMetadata.id);

      // Check circuit breaker state
      if (circuitBreaker.state === 'open') {
        const now = Date.now();
        if (now < circuitBreaker.nextAttemptTime) {
          console.warn(`🔴 Handler ${handlerMetadata.id} circuit breaker is OPEN, skipping execution`);
          return;
        } else {
          // Try to close circuit breaker
          circuitBreaker.state = 'half-open';
          console.log(`🟡 Handler ${handlerMetadata.id} circuit breaker is HALF-OPEN, attempting execution`);
        }
      }

      const startTime = Date.now();

      try {
        // Execute the handler with timeout
        const handlerPromise = Promise.resolve(handlerMetadata.handler(eventData, eventMetadata));
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Handler timeout')), handlerMetadata.timeout);
        });

        await Promise.race([handlerPromise, timeoutPromise]);

        // Update success metrics
        const executionTime = Date.now() - startTime;
        handlerMetadata.totalExecutions++;
        handlerMetadata.successfulExecutions++;
        handlerMetadata.averageExecutionTime =
          (handlerMetadata.averageExecutionTime * (handlerMetadata.totalExecutions - 1) + executionTime) /
          handlerMetadata.totalExecutions;

        // Reset circuit breaker on success
        if (circuitBreaker.state === 'half-open') {
          circuitBreaker.state = 'closed';
          circuitBreaker.failures = 0;
          console.log(`🟢 Handler ${handlerMetadata.id} circuit breaker is CLOSED`);
        }

        // Update metrics
        if (!this.metrics.handlerPerformance.has(handlerMetadata.id)) {
          this.metrics.handlerPerformance.set(handlerMetadata.id, {
            totalExecutions: 0,
            totalTime: 0,
            averageTime: 0
          });
        }

        const handlerMetrics = this.metrics.handlerPerformance.get(handlerMetadata.id);
        handlerMetrics.totalExecutions++;
        handlerMetrics.totalTime += executionTime;
        handlerMetrics.averageTime = handlerMetrics.totalTime / handlerMetrics.totalExecutions;

      } catch (error) {
        console.error(`❌ Handler ${handlerMetadata.id} failed: ${error.message}`);

        // Update failure metrics
        handlerMetadata.totalExecutions++;
        handlerMetadata.failedExecutions++;

        // Update circuit breaker
        circuitBreaker.failures++;
        circuitBreaker.lastFailureTime = Date.now();

        if (circuitBreaker.failures >= this.options.circuitBreakerThreshold) {
          circuitBreaker.state = 'open';
          circuitBreaker.nextAttemptTime = Date.now() + this.options.circuitBreakerResetTime;
          console.warn(`🔴 Handler ${handlerMetadata.id} circuit breaker is OPEN due to ${circuitBreaker.failures} failures`);
        }

        throw error;
      }
    };

    // Store reference to wrapped handler for removal
    handlerMetadata.wrappedHandler = wrappedHandler;
    return wrappedHandler;
  }

  /**
   * Handle event processing errors with retry logic
   * @param {Object} event - Failed event
   * @param {Error} error - Error that occurred
   */
  handleEventProcessingError(event, error) {
    this.metrics.failedEvents++;

    // Check if we should retry
    if (event.metadata.attempt < event.metadata.maxAttempts) {
      event.metadata.attempt++;
      console.log(`🔄 Retrying event ${event.type} (attempt ${event.metadata.attempt}/${event.metadata.maxAttempts})`);

      // Add back to queue with delay
      setTimeout(() => {
        this.eventQueue.unshift(event); // Add to front for priority
      }, 1000 * event.metadata.attempt); // Exponential backoff
    } else {
      // Move to dead letter queue
      this.moveToDeadLetterQueue(event, error.message);
    }
  }

  /**
   * Move event to dead letter queue
   * @param {Object} event - Event to move
   * @param {string} reason - Reason for moving to DLQ
   */
  moveToDeadLetterQueue(event, reason) {
    const dlqEntry = {
      ...event,
      deadLetterReason: reason,
      deadLetterTime: new Date().toISOString()
    };

    this.deadLetterQueue.push(dlqEntry);

    // Limit dead letter queue size
    if (this.deadLetterQueue.length > this.options.deadLetterQueueSize) {
      this.deadLetterQueue.shift();
    }

    console.warn(`💀 Moved event to dead letter queue: ${event.type} (reason: ${reason})`);
    this.emit('dead_letter', dlqEntry);
  }

  /**
   * Add event to history
   * @param {Object} event - Event to add to history
   */
  addToEventHistory(event) {
    this.eventHistory.push({
      ...event,
      processedAt: new Date().toISOString()
    });

    // Limit history size
    if (this.eventHistory.length > this.options.eventHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Handle EventBus internal errors
   * @param {Error} error - Error that occurred
   */
  handleEventBusError(error) {
    console.error(`🚨 EventBus internal error: ${error.message}`);

    // Emit system error event
    this.emitEnhanced('system_error', {
      component: 'EventBus',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { priority: 10 }); // Highest priority
  }

  /**
   * Get comprehensive EventBus statistics and metrics
   * @returns {Object} EventBus statistics
   */
  getStatistics() {
    return {
      events: {
        total: this.metrics.totalEvents,
        processed: this.metrics.processedEvents,
        failed: this.metrics.failedEvents,
        inQueue: this.eventQueue.length,
        averageProcessingTime: this.metrics.averageProcessingTime,
        lastProcessed: this.metrics.lastProcessedEvent
      },
      handlers: {
        registered: this.handlerRegistry.size,
        performance: Object.fromEntries(this.metrics.handlerPerformance.entries()),
        circuitBreakers: Object.fromEntries(
          Array.from(this.circuitBreakers.entries()).map(([id, cb]) => [
            id,
            { state: cb.state, failures: cb.failures, lastFailure: cb.lastFailureTime }
          ])
        )
      },
      queues: {
        eventQueue: this.eventQueue.length,
        deadLetterQueue: this.deadLetterQueue.length,
        eventHistory: this.eventHistory.length
      },
      configuration: {
        maxListeners: this.options.maxListeners,
        performanceTarget: this.options.performanceTarget,
        circuitBreakerThreshold: this.options.circuitBreakerThreshold,
        circuitBreakerResetTime: this.options.circuitBreakerResetTime
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get event history with optional filtering
   * @param {Object} filters - Filters to apply (eventType, timeRange, etc.)
   * @returns {Array} Filtered event history
   */
  getEventHistory(filters = {}) {
    let history = [...this.eventHistory];

    if (filters.eventType) {
      history = history.filter(event => event.type === filters.eventType);
    }

    if (filters.since) {
      const sinceTime = new Date(filters.since);
      history = history.filter(event => new Date(event.metadata.timestamp) >= sinceTime);
    }

    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * Get dead letter queue entries
   * @returns {Array} Dead letter queue entries
   */
  getDeadLetterQueue() {
    return [...this.deadLetterQueue];
  }

  /**
   * Replay events from dead letter queue
   * @param {Array} eventIds - Optional array of specific event IDs to replay
   * @returns {Promise<number>} Number of events replayed
   */
  async replayDeadLetterEvents(eventIds = null) {
    let eventsToReplay = [];

    if (eventIds) {
      eventsToReplay = this.deadLetterQueue.filter(event =>
        eventIds.includes(event.metadata.id)
      );
    } else {
      eventsToReplay = [...this.deadLetterQueue];
    }

    let replayedCount = 0;
    for (const dlqEvent of eventsToReplay) {
      // Reset event metadata for replay
      const replayEvent = {
        type: dlqEvent.type,
        data: dlqEvent.data,
        metadata: {
          ...dlqEvent.metadata,
          timestamp: new Date().toISOString(),
          attempt: 1,
          isReplay: true,
          originalDeadLetterReason: dlqEvent.deadLetterReason,
          originalDeadLetterTime: dlqEvent.deadLetterTime
        }
      };

      // Remove from dead letter queue
      const dlqIndex = this.deadLetterQueue.findIndex(e => e.metadata.id === dlqEvent.metadata.id);
      if (dlqIndex !== -1) {
        this.deadLetterQueue.splice(dlqIndex, 1);
      }

      // Re-emit the event
      await this.emitEnhanced(replayEvent.type, replayEvent.data, {
        priority: replayEvent.metadata.priority,
        timeout: replayEvent.metadata.timeout,
        retries: replayEvent.metadata.maxAttempts - 1
      });

      replayedCount++;
    }

    console.log(`🔄 Replayed ${replayedCount} events from dead letter queue`);
    return replayedCount;
  }

  /**
   * Enable or disable a specific handler
   * @param {string} handlerId - Handler ID
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {boolean} Success status
   */
  setHandlerEnabled(handlerId, enabled) {
    const handlerMetadata = this.handlerRegistry.get(handlerId);
    if (!handlerMetadata) {
      console.warn(`Handler ${handlerId} not found`);
      return false;
    }

    handlerMetadata.enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} Handler ${handlerId} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Clear event history
   */
  clearEventHistory() {
    this.eventHistory.length = 0;
    console.log('🗑️ Event history cleared');
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue() {
    this.deadLetterQueue.length = 0;
    console.log('🗑️ Dead letter queue cleared');
  }

  /**
   * Shutdown the EventBus gracefully
   */
  async shutdown() {
    console.log('🔄 Shutting down EventBus...');

    // Process remaining events
    if (this.eventQueue.length > 0) {
      console.log(`📤 Processing ${this.eventQueue.length} remaining events...`);
      await this.processEventQueue();
    }

    // Remove all listeners
    this.removeAllListeners();

    // Clear all data structures
    this.handlerRegistry.clear();
    this.circuitBreakers.clear();
    this.eventQueue.length = 0;

    console.log('✅ EventBus shutdown complete');
    this.emit('shutdown_complete', {
      finalStats: this.getStatistics(),
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = EventBus;