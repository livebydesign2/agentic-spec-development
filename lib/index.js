#!/usr/bin/env node

const termkit = require('terminal-kit');
const term = termkit.terminal;
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const SpecParser = require('./feature-parser');
const ProgressCalculator = require('./progress-calc');
const UIComponents = require('./ui-components');
const ConfigManager = require('./config-manager');

class ASDClient {
  constructor(options = {}) {
    // Configuration management
    this.configManager = options.configManager || new ConfigManager(options.cwd || process.cwd());
    this.config = this.configManager.loadConfig();

    // Initialize components with configuration
    this.specParser = new SpecParser(this.configManager);
    this.featureParser = this.specParser; // Legacy support
    this.progressCalc = new ProgressCalculator();
    this.ui = new UIComponents();

    // Application state
    this.currentView = 'active'; // Start with active features view
    this.selectedIndex = 0;
    this.processHandlersSetup = false; // Flag to prevent duplicate process listeners
    this.focusedPanel = 'main'; // 'main', 'side', 'bottom'
    this.cachedContent = {}; // Cache content for scroll bar detection

    // Recommended panel view state
    this.recommendedView = 'current'; // 'current' or 'next'

    // Current task tracking - simple and instant
    this.currentTask = null;

    // Layout constants for consistent spacing
    this.LAYOUT = {
      PADDING: 2, // Standard padding for all panels (left/right/top/bottom)
      GAP: 1, // Standard gap between panels
      HEADER_HEIGHT: 1, // Header line
      FOOTER_HEIGHT: 1, // Footer line
      RECOMMENDED_HEIGHT: 9, // Fixed height for recommended panel (fits Next Task content with 7 lines + padding)
      LEFT_WIDTH_RATIO: 0.5, // 50% for main panel (equal width with roadmap)
      MIN_PANEL_WIDTH: 10, // Minimum panel width
      MIN_PANEL_HEIGHT: 3, // Minimum panel height
    };

    this.watchers = []; // File system watchers
    this.refreshTimeout = null; // Debounce timer for auto-refresh
    this.lastTerminalSize = { width: 0, height: 0 }; // Track terminal dimensions
    this.isRendering = false; // Prevent simultaneous renders
    this.renderQueue = []; // Queue renders to prevent conflicts

    // Memory management
    this.renderCount = 0;
    this.lastGC = Date.now();
    this.memoryCleanupInterval = null;

    // Terminal-kit specific
    this.termWidth = term.width;
    this.termHeight = term.height;
    this.dashboardFeatures = [];

    // Scrolling support
    this.scrollOffsets = {
      main: 0,
      side: 0,
      bottom: 0,
    };

    // Track whether auto-scroll is active for each panel
    // When user manually scrolls, we disable auto-scroll until they switch features or panels
    this.autoScrollActive = {
      bottom: true, // Auto-scroll is initially active for bottom panel
      side: true, // Auto-scroll is initially active for side panel (roadmap)
    };

    // Customizable branding
    this.appName = options.appName || 'Agentic Spec Development';
    this.appVersion = options.appVersion || '1.0.0';
    this.appIcon = options.appIcon || '🗺️';
  }

  async init() {
    console.log(chalk.cyan(`${this.appIcon} ${this.appName} - Loading...`));

    try {
      // Parse all spec/feature files
      await this.specParser.loadFeatures();
      const specs = this.specParser.getSpecs();
      const features = this.specParser.getFeatures(); // Legacy support

      console.log(chalk.green(`✅ Loaded ${specs.length} specifications`));

      // Setup terminal-kit with proper size detection
      term.clear();
      term.grabInput({ mouse: 'button' });
      term.fullscreen(true);
      term.windowTitle(`${this.appName} v${this.appVersion}`);
      term.hideCursor();

      // Force terminal size detection or use fallbacks
      await this.initializeTerminalSize();

      // Setup components
      this.setupKeyBindings();
      this.setupProcessHandlers(); // Setup process event handlers (once)
      if (this.config.autoRefresh) {
        this.setupFileWatching(); // Setup automatic refresh on file changes
      }
      this.setupTerminalResize(); // Setup terminal resize handling
      this.setupMemoryManagement();
      this.findCurrentTask(); // Find currently active task

      // Initial render
      await this.render();
    } catch (error) {
      console.error(
        chalk.red('❌ Failed to initialize ASD:'),
        error.message,
      );
      process.exit(1);
    }
  }

  async initializeTerminalSize() {
    // Wait a moment for terminal-kit to detect size
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check if terminal size was detected properly
    if (
      !isFinite(term.width) ||
      !isFinite(term.height) ||
      term.width < 20 ||
      term.height < 10
    ) {
      // Use process.stdout as fallback
      this.termWidth = process.stdout.columns || 80;
      this.termHeight = process.stdout.rows || 24;

      // Override term properties
      Object.defineProperty(term, 'width', {
        value: this.termWidth,
        writable: true,
      });
      Object.defineProperty(term, 'height', {
        value: this.termHeight,
        writable: true,
      });
    } else {
      this.termWidth = term.width;
      this.termHeight = term.height;
    }

    // Debug output only if explicitly requested
    if (process.env.DEBUG_STARTUP) {
      console.log('\n=== INITIAL STARTUP TERMINAL SIZE DEBUG ===');
      console.log(
        `term.width: ${term.width} (finite: ${isFinite(term.width)})`,
      );
      console.log(
        `term.height: ${term.height} (finite: ${isFinite(term.height)})`,
      );
      console.log(`process.stdout.columns: ${process.stdout.columns}`);
      console.log(`process.stdout.rows: ${process.stdout.rows}`);
      console.log(`Final terminal size: ${this.termWidth}x${this.termHeight}`);
      console.log('===========================================\n');
    }
  }

  calculateLayout() {
    const width = this.termWidth;
    const height = this.termHeight;

    // Header section
    const headerY = 1;

    // Recommended panel section
    const recommendedY = headerY + this.LAYOUT.HEADER_HEIGHT + this.LAYOUT.GAP;

    // Top panels section (main + side)
    const topPanelsY = recommendedY + this.LAYOUT.RECOMMENDED_HEIGHT + this.LAYOUT.GAP;
    const availableHeightAfterRecommended = height - topPanelsY - this.LAYOUT.GAP;

    // Bottom panel takes 1/3 of remaining space, minimum 8 lines
    const bottomHeight = Math.max(
      this.LAYOUT.MIN_PANEL_HEIGHT + 5,
      Math.floor(availableHeightAfterRecommended * 0.33),
    );

    // Top panels get the rest
    const topHeight = availableHeightAfterRecommended - bottomHeight - this.LAYOUT.GAP;

    // Bottom panel position
    const bottomPanelY = topPanelsY + topHeight + this.LAYOUT.GAP;

    // Left and right panel widths (equal split)
    const totalPanelWidth = width - this.LAYOUT.GAP;
    const leftWidth = Math.floor(totalPanelWidth * this.LAYOUT.LEFT_WIDTH_RATIO);
    const rightWidth = totalPanelWidth - leftWidth - this.LAYOUT.GAP;

    return {
      width,
      height,
      headerY,
      recommendedY,
      topPanelsY,
      bottomPanelY,
      leftWidth: Math.max(this.LAYOUT.MIN_PANEL_WIDTH, leftWidth),
      rightWidth: Math.max(this.LAYOUT.MIN_PANEL_WIDTH, rightWidth),
      topHeight: Math.max(this.LAYOUT.MIN_PANEL_HEIGHT, topHeight),
      bottomHeight: Math.max(this.LAYOUT.MIN_PANEL_HEIGHT, bottomHeight),
    };
  }

  drawUI() {
    // Terminal-kit uses direct drawing instead of component setup
    term.clear();

    // Use centralized layout calculations
    const layout = this.calculateLayout();
    const { leftWidth, rightWidth, topHeight, bottomHeight } = layout;

    // Debug layout calculations
    if (process.env.DEBUG_LAYOUT) {
      console.log(
        `Layout: ${layout.width}x${layout.height}, left=${leftWidth}, right=${rightWidth}, top=${topHeight}, bottom=${bottomHeight}`,
      );
    }

    // Draw borders and panels, passing layout to ensure coordinate consistency
    this.drawPanelBorders(layout);
  }

  calculatePanelBorderCoordinates(layout) {
    const {
      width,
      leftWidth,
      rightWidth,
      topHeight,
      bottomHeight,
      recommendedY,
      topPanelsY,
      bottomPanelY,
    } = layout;

    // Return the exact border coordinates that BOTH drawPanelBorders and highlightFocusedPanel will use
    return {
      recommended: {
        x: 1,
        y: recommendedY,
        width: width - 1,
        height: this.LAYOUT.RECOMMENDED_HEIGHT,
      },
      main: {
        x: 1,
        y: topPanelsY,
        width: leftWidth,
        height: topHeight,
      },
      side: {
        x: leftWidth + this.LAYOUT.GAP + 1,
        y: topPanelsY,
        width: rightWidth,
        height: topHeight,
      },
      bottom: {
        x: 1,
        y: bottomPanelY,
        width: width - 1,
        height: bottomHeight,
      },
    };
  }

  drawPanelBorders(layout) {
    const {
      width,
      height,
      leftWidth,
      rightWidth,
      topHeight,
      bottomHeight,
      headerY,
      recommendedY,
      topPanelsY,
      bottomPanelY,
    } = layout;

    // Draw header
    term.moveTo(1, headerY);
    term.cyan(`${this.appIcon} ${this.appName.toUpperCase()} v${this.appVersion}`);

    // Get unified panel border coordinates
    const panelCoords = this.calculatePanelBorderCoordinates(layout);

    // Draw recommended task panel using unified coordinates
    const recommendedHeader = this.ui.createRecommendedTabbedHeader(
      this.recommendedView,
      false,
      this.focusedPanel,
      panelCoords.recommended.width - 2,
    );
    const recommendedColor =
      this.focusedPanel === 'recommended' ? 'brightGreen' : 'brightBlue';
    this.drawBox(
      panelCoords.recommended.x,
      panelCoords.recommended.y,
      panelCoords.recommended.width,
      panelCoords.recommended.height,
      recommendedHeader,
      recommendedColor,
    );

    // Draw main panel using unified coordinates
    const tabbedHeader = this.ui.createTabbedHeader(
      this.currentView,
      this.focusedPanel,
      panelCoords.main.width - 2,
    );
    this.drawBox(
      panelCoords.main.x,
      panelCoords.main.y,
      panelCoords.main.width,
      panelCoords.main.height,
      tabbedHeader,
    );

    // Draw side panel using unified coordinates
    this.drawBox(
      panelCoords.side.x,
      panelCoords.side.y,
      panelCoords.side.width,
      panelCoords.side.height,
      '[2] Overview',
    );

    // Draw bottom panel using unified coordinates
    this.drawBox(
      panelCoords.bottom.x,
      panelCoords.bottom.y,
      panelCoords.bottom.width,
      panelCoords.bottom.height,
      '[3] Task Details',
    );
  }

  drawBox(x, y, width, height, title, borderColor = 'brightBlue') {
    // Draw top border with title
    term.moveTo(x, y);
    term[borderColor]('┌');

    // Title with padding
    const titleText = ` ${title} `;
    const titleLen = titleText.length;
    const availableWidth = width - 2; // Subtract corners

    if (titleLen <= availableWidth) {
      term[borderColor](titleText);
      term[borderColor]('─'.repeat(availableWidth - titleLen));
    } else {
      // Truncate title if too long
      const truncated = titleText.substring(0, availableWidth - 3) + '...';
      term[borderColor](truncated);
    }

    term[borderColor]('┐');

    // Draw side borders
    for (let i = 1; i < height - 1; i++) {
      term.moveTo(x, y + i);
      term[borderColor]('│');
      term.moveTo(x + width - 1, y + i);
      term[borderColor]('│');
    }

    // Draw bottom border
    term.moveTo(x, y + height - 1);
    term[borderColor]('└');
    term[borderColor]('─'.repeat(width - 2));
    term[borderColor]('┘');
  }

  setupKeyBindings() {
    term.on('key', (name, matches, data) => {
      // Exit handlers
      if (name === 'CTRL_C' || name === 'q') {
        this.cleanup();
        process.exit(0);
      }

      // Panel navigation
      if (name === 'TAB') {
        this.cycleFocusedPanel();
        this.render();
      }

      // Panel shortcuts
      if (name >= '1' && name <= '4') {
        const panelMap = { '1': 'main', '2': 'side', '3': 'bottom', '4': 'recommended' };
        this.focusedPanel = panelMap[name];
        this.render();
      }

      // Navigation within panels
      if (name === 'UP' || name === 'k') {
        this.navigateUp();
        this.render();
      }

      if (name === 'DOWN' || name === 'j') {
        this.navigateDown();
        this.render();
      }

      // View switching
      if (name === 'LEFT' || name === 'h') {
        this.switchView(-1);
        this.render();
      }

      if (name === 'RIGHT' || name === 'l') {
        this.switchView(1);
        this.render();
      }

      // Refresh
      if (name === 'r') {
        this.refresh();
      }

      // Help
      if (name === 'F1' || name === '?') {
        this.showHelp();
      }
    });
  }

  cycleFocusedPanel() {
    const panels = ['main', 'side', 'bottom', 'recommended'];
    const currentIndex = panels.indexOf(this.focusedPanel);
    this.focusedPanel = panels[(currentIndex + 1) % panels.length];
  }

  navigateUp() {
    if (this.focusedPanel === 'main') {
      const features = this.getFilteredFeatures();
      if (features.length > 0) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      }
    }
  }

  navigateDown() {
    if (this.focusedPanel === 'main') {
      const features = this.getFilteredFeatures();
      if (features.length > 0) {
        this.selectedIndex = Math.min(features.length - 1, this.selectedIndex + 1);
      }
    }
  }

  switchView(direction) {
    if (this.focusedPanel === 'main') {
      const views = ['active', 'backlog', 'done'];
      const currentIndex = views.indexOf(this.currentView);
      let newIndex = currentIndex + direction;

      if (newIndex < 0) newIndex = views.length - 1;
      if (newIndex >= views.length) newIndex = 0;

      this.currentView = views[newIndex];
      this.selectedIndex = 0; // Reset selection when switching views
    } else if (this.focusedPanel === 'recommended') {
      const views = ['current', 'next'];
      const currentIndex = views.indexOf(this.recommendedView);
      this.recommendedView = views[(currentIndex + 1) % views.length];
    }
  }

  getFilteredFeatures() {
    const allFeatures = this.specParser.getFeatures(); // Uses legacy method for compatibility

    if (this.currentView === 'dashboard') {
      // Dashboard view: combine critical + active + recent done
      const critical = allFeatures.filter(f => f.status === 'backlog' && f.priority === 'P0');
      const active = allFeatures.filter(f => f.status === 'active');
      const recentDone = allFeatures
        .filter(f => f.status === 'done')
        .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))
        .slice(0, 5);

      return [...critical, ...active, ...recentDone];
    }

    return allFeatures.filter(f => f.status === this.currentView);
  }

  async render() {
    if (this.isRendering) {
      this.renderQueue.push(() => this.render());
      return;
    }

    this.isRendering = true;

    try {
      // Draw UI structure
      this.drawUI();

      // Render content in panels
      await this.renderMainPanel();
      await this.renderSidePanel();
      await this.renderBottomPanel();
      await this.renderRecommendedPanel();

      // Update memory management
      this.renderCount++;
      if (this.renderCount % 50 === 0) {
        this.performMemoryCleanup();
      }

    } catch (error) {
      console.error('Render error:', error);
    } finally {
      this.isRendering = false;

      // Process queued renders
      if (this.renderQueue.length > 0) {
        const nextRender = this.renderQueue.shift();
        setTimeout(nextRender, 16); // ~60fps
      }
    }
  }

  async renderMainPanel() {
    const layout = this.calculateLayout();
    const panelCoords = this.calculatePanelBorderCoordinates(layout);
    const { x, y, width, height } = panelCoords.main;

    const features = this.getFilteredFeatures();
    const contentArea = {
      x: x + 1,
      y: y + 1,
      width: width - 2,
      height: height - 2,
    };

    if (features.length === 0) {
      term.moveTo(contentArea.x, contentArea.y);
      term.gray('No features found');
      return;
    }

    // Render feature list with selection
    let lineY = contentArea.y;
    const maxLines = contentArea.height;

    for (let i = 0; i < Math.min(features.length, maxLines); i++) {
      const feature = features[i];
      const isSelected = i === this.selectedIndex;
      const progress = this.progressCalc.calculateProgress(feature);

      term.moveTo(contentArea.x, lineY);

      if (isSelected && this.focusedPanel === 'main') {
        term.bgCyan.black(`► ${feature.id} ${feature.title.substring(0, contentArea.width - 10)}`);
      } else {
        const statusIcon = this.ui.getStatusIcon(feature.status);
        const priorityIcon = this.ui.getPriorityIcon(feature.priority);
        const title = feature.title.substring(0, contentArea.width - 15);
        term(`  ${statusIcon} ${priorityIcon} ${feature.id} ${title}`);
      }

      lineY++;

      if (lineY >= contentArea.y + contentArea.height) break;
    }
  }

  async renderSidePanel() {
    const layout = this.calculateLayout();
    const panelCoords = this.calculatePanelBorderCoordinates(layout);
    const { x, y, width, height } = panelCoords.side;

    const contentArea = {
      x: x + 1,
      y: y + 1,
      width: width - 2,
      height: height - 2,
    };

    // Show project/progress summary
    const stats = this.specParser.getStats();
    const summary = this.ui.createSummaryStats(stats);

    term.moveTo(contentArea.x, contentArea.y);
    term(summary.substring(0, contentArea.width));
  }

  async renderBottomPanel() {
    const layout = this.calculateLayout();
    const panelCoords = this.calculatePanelBorderCoordinates(layout);
    const { x, y, width, height } = panelCoords.bottom;

    const contentArea = {
      x: x + 1,
      y: y + 1,
      width: width - 2,
      height: height - 2,
    };

    const features = this.getFilteredFeatures();
    if (features.length === 0 || this.selectedIndex >= features.length) {
      term.moveTo(contentArea.x, contentArea.y);
      term.gray('No feature selected');
      return;
    }

    const selectedFeature = features[this.selectedIndex];

    // Show feature details
    let lineY = contentArea.y;

    term.moveTo(contentArea.x, lineY++);
    term.brightCyan(`${selectedFeature.id}: ${selectedFeature.title}`);

    if (selectedFeature.description && lineY < contentArea.y + contentArea.height) {
      term.moveTo(contentArea.x, lineY++);
      const description = selectedFeature.description.substring(0, contentArea.width);
      term.gray(description);
    }

    // Show tasks if any
    if (selectedFeature.tasks && selectedFeature.tasks.length > 0 && lineY < contentArea.y + contentArea.height) {
      term.moveTo(contentArea.x, lineY++);
      term.yellow('Tasks:');

      for (const task of selectedFeature.tasks.slice(0, contentArea.height - 3)) {
        if (lineY >= contentArea.y + contentArea.height) break;

        term.moveTo(contentArea.x, lineY++);
        const icon = this.ui.getTaskStatusIcon(task.status);
        const title = task.title.substring(0, contentArea.width - 5);
        term(`  ${icon} ${title}`);
      }
    }
  }

  async renderRecommendedPanel() {
    const layout = this.calculateLayout();
    const panelCoords = this.calculatePanelBorderCoordinates(layout);
    const { x, y, width, height } = panelCoords.recommended;

    const contentArea = {
      x: x + 1,
      y: y + 1,
      width: width - 2,
      height: height - 2,
    };

    if (this.recommendedView === 'current') {
      if (this.currentTask) {
        term.moveTo(contentArea.x, contentArea.y);
        term.brightGreen(`Current: ${this.currentTask.id} ${this.currentTask.title}`);
      } else {
        term.moveTo(contentArea.x, contentArea.y);
        term.gray('No current task');
      }
    } else {
      // Show next available tasks
      const nextTasks = this.findNextTasks();
      if (nextTasks.length > 0) {
        term.moveTo(contentArea.x, contentArea.y);
        term.brightCyan(`Next: ${nextTasks[0].id} ${nextTasks[0].title}`);
      } else {
        term.moveTo(contentArea.x, contentArea.y);
        term.gray('No next tasks');
      }
    }
  }

  findCurrentTask() {
    const allFeatures = this.specParser.getFeatures(); // Uses legacy method for compatibility

    for (const feature of allFeatures) {
      if (feature.tasks) {
        const inProgressTask = feature.tasks.find(task => task.status === 'in_progress');
        if (inProgressTask) {
          this.currentTask = { ...inProgressTask, feature: feature.id };
          return;
        }
      }
    }

    this.currentTask = null;
  }

  findNextTasks() {
    const allFeatures = this.specParser.getFeatures(); // Uses legacy method for compatibility
    const nextTasks = [];

    for (const feature of allFeatures) {
      if (feature.tasks) {
        const readyTasks = feature.tasks.filter(task => task.status === 'ready');
        nextTasks.push(...readyTasks.map(task => ({ ...task, feature: feature.id })));
      }
    }

    return nextTasks.sort((a, b) => {
      // Prioritize by feature priority, then by task number
      const featureA = allFeatures.find(f => f.id === a.feature);
      const featureB = allFeatures.find(f => f.id === b.feature);

      if (featureA.priority !== featureB.priority) {
        return featureA.priority.localeCompare(featureB.priority);
      }

      return a.number - b.number;
    });
  }

  setupProcessHandlers() {
    if (this.processHandlersSetup) return;

    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('beforeExit', () => this.cleanup());

    this.processHandlersSetup = true;
  }

  setupFileWatching() {
    if (!this.config.autoRefresh) return;

    try {
      const chokidar = require('chokidar');
      const featuresPath = this.configManager.getFeaturesPath();

      const watcher = chokidar.watch(path.join(featuresPath, '**/*.md'), {
        ignored: /node_modules/,
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('change', () => this.debouncedRefresh());
      watcher.on('add', () => this.debouncedRefresh());
      watcher.on('unlink', () => this.debouncedRefresh());

      this.watchers.push(watcher);
    } catch (error) {
      // File watching is optional, continue without it
      console.warn('File watching disabled:', error.message);
    }
  }

  debouncedRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setTimeout(() => {
      this.refresh();
    }, this.config.refreshDebounce || 500);
  }

  async refresh() {
    try {
      await this.specParser.loadFeatures();
      this.findCurrentTask();
      await this.render();
    } catch (error) {
      console.error('Refresh failed:', error.message);
    }
  }

  setupTerminalResize() {
    term.on('resize', (width, height) => {
      this.termWidth = width;
      this.termHeight = height;
      this.render();
    });
  }

  setupMemoryManagement() {
    this.memoryCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, 30000); // Every 30 seconds
  }

  performMemoryCleanup() {
    // Clear cached content
    this.cachedContent = {};

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.lastGC = Date.now();
  }

  showHelp() {
    term.clear();
    term.moveTo(1, 1);
    term(this.ui.createHelpText());

    term.on('key', () => {
      this.render();
    });
  }

  cleanup() {
    // Clear any timeouts
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
    }

    // Close file watchers
    this.watchers.forEach(watcher => {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    });

    // Reset terminal
    try {
      term.fullscreen(false);
      term.showCursor();
      term.clear();
      term.moveTo(1, 1);
      term.reset();
    } catch (error) {
      // Ignore terminal reset errors during cleanup
    }
  }
}

module.exports = ASDClient;