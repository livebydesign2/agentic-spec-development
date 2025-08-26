#!/usr/bin/env node

const termkit = require("terminal-kit");
const term = termkit.terminal;
const chalk = require("chalk");
const path = require("path");

const SpecParser = require("./feature-parser");
const ProgressCalculator = require("./progress-calc");
const UIComponents = require("./ui-components");
const ConfigManager = require("./config-manager");
const WorkflowStateManager = require("./workflow-state-manager");

class ASDClient {
  constructor(options = {}) {
    // Configuration management
    this.configManager =
      options.configManager || new ConfigManager(options.cwd || process.cwd());
    this.config = this.configManager.loadConfig();

    // Initialize components with configuration
    this.specParser = new SpecParser(this.configManager);
    this.featureParser = this.specParser; // Legacy support
    this.progressCalc = new ProgressCalculator();
    this.ui = new UIComponents();
    this.workflowStateManager = new WorkflowStateManager(
      this.configManager,
      this.specParser
    );

    // Application state
    this.currentView = "active"; // Start with active features view
    this.selectedIndex = 0;
    this.processHandlersSetup = false; // Flag to prevent duplicate process listeners
    this.focusedPanel = "main"; // 'main', 'side', 'bottom'
    this.cachedContent = {}; // Cache content for scroll bar detection

    // Recommended panel view state
    this.recommendedView = "current"; // 'current' or 'next'

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
    this.maxCacheSize = 100; // Limit cached content entries

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
    this.appName = options.appName || "Agentic Spec Development";
    this.appVersion = options.appVersion || "0.1.0-alpha";
    this.appIcon = options.appIcon || "🤖";
  }

  async init() {
    console.log(chalk.cyan(`${this.appIcon} ${this.appName} - Loading...`));

    try {
      // Parse all spec files
      await this.specParser.loadSpecs();
      const specs = this.specParser.getSpecs();

      console.log(chalk.green(`✅ Loaded ${specs.length} specifications`));

      // Initialize workflow state manager
      await this.workflowStateManager.initialize();
      console.log(chalk.green("✅ Workflow state manager initialized"));

      // Setup terminal-kit with proper size detection
      term.clear();
      term.grabInput({ mouse: "button" });
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
      console.error(chalk.red("❌ Failed to initialize ASD:"), error.message);
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
      Object.defineProperty(term, "width", {
        value: this.termWidth,
        writable: true,
      });
      Object.defineProperty(term, "height", {
        value: this.termHeight,
        writable: true,
      });
    } else {
      this.termWidth = term.width;
      this.termHeight = term.height;
    }

    // Debug output only if explicitly requested
    if (process.env.DEBUG_STARTUP) {
      console.log("\n=== INITIAL STARTUP TERMINAL SIZE DEBUG ===");
      console.log(
        `term.width: ${term.width} (finite: ${isFinite(term.width)})`
      );
      console.log(
        `term.height: ${term.height} (finite: ${isFinite(term.height)})`
      );
      console.log(`process.stdout.columns: ${process.stdout.columns}`);
      console.log(`process.stdout.rows: ${process.stdout.rows}`);
      console.log(`Final terminal size: ${this.termWidth}x${this.termHeight}`);
      console.log("===========================================\n");
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
    const topPanelsY =
      recommendedY + this.LAYOUT.RECOMMENDED_HEIGHT + this.LAYOUT.GAP;
    const availableHeightAfterRecommended =
      height -
      topPanelsY -
      this.LAYOUT.GAP -
      this.LAYOUT.FOOTER_HEIGHT -
      this.LAYOUT.GAP;

    // Bottom panel takes 1/3 of remaining space, minimum 8 lines
    const bottomHeight = Math.max(
      this.LAYOUT.MIN_PANEL_HEIGHT + 5,
      Math.floor(availableHeightAfterRecommended * 0.33)
    );

    // Top panels get the rest
    const topHeight =
      availableHeightAfterRecommended - bottomHeight - this.LAYOUT.GAP;

    // Bottom panel position
    const bottomPanelY = topPanelsY + topHeight + this.LAYOUT.GAP;

    // Left and right panel widths (equal split)
    const totalPanelWidth = width - this.LAYOUT.GAP;
    const leftWidth = Math.floor(
      totalPanelWidth * this.LAYOUT.LEFT_WIDTH_RATIO
    );
    const rightWidth = totalPanelWidth - leftWidth - this.LAYOUT.GAP;

    // Footer position
    const footerY = bottomPanelY + bottomHeight + this.LAYOUT.GAP;

    return {
      width,
      height,
      headerY,
      recommendedY,
      topPanelsY,
      bottomPanelY,
      footerY,
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
        `Layout: ${layout.width}x${layout.height}, left=${leftWidth}, right=${rightWidth}, top=${topHeight}, bottom=${bottomHeight}`
      );
    }

    // Draw borders and panels, passing layout to ensure coordinate consistency
    this.drawPanelBorders(layout);

    // Draw footer
    this.renderFooter(layout);
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
    const { headerY } = layout;

    // Draw header
    term.moveTo(1, headerY);
    term.cyan(
      `${this.appIcon} ${this.appName.toUpperCase()} v${this.appVersion}`
    );

    // Get unified panel border coordinates
    const panelCoords = this.calculatePanelBorderCoordinates(layout);

    // Draw recommended task panel using unified coordinates
    const recommendedHeader = this.ui.createRecommendedTabbedHeader(
      this.recommendedView,
      false,
      this.focusedPanel,
      panelCoords.recommended.width - 2
    );
    const recommendedColor =
      this.focusedPanel === "recommended" ? "brightGreen" : "brightBlue";
    this.drawBox(
      panelCoords.recommended.x,
      panelCoords.recommended.y,
      panelCoords.recommended.width,
      panelCoords.recommended.height,
      recommendedHeader,
      recommendedColor
    );

    // Draw main panel using unified coordinates
    const tabbedHeader = this.ui.createTabbedHeader(
      this.currentView,
      this.focusedPanel,
      panelCoords.main.width - 2
    );
    const mainColor =
      this.focusedPanel === "main" ? "brightGreen" : "brightBlue";
    this.drawBox(
      panelCoords.main.x,
      panelCoords.main.y,
      panelCoords.main.width,
      panelCoords.main.height,
      tabbedHeader,
      mainColor
    );

    // Draw side panel using unified coordinates
    const sideColor =
      this.focusedPanel === "side" ? "brightGreen" : "brightBlue";
    this.drawBox(
      panelCoords.side.x,
      panelCoords.side.y,
      panelCoords.side.width,
      panelCoords.side.height,
      "[2] Overview",
      sideColor
    );

    // Draw bottom panel using unified coordinates
    const bottomColor =
      this.focusedPanel === "bottom" ? "brightGreen" : "brightBlue";
    this.drawBox(
      panelCoords.bottom.x,
      panelCoords.bottom.y,
      panelCoords.bottom.width,
      panelCoords.bottom.height,
      "[3] Task Details",
      bottomColor
    );
  }

  drawBox(x, y, width, height, title, borderColor = "brightBlue") {
    // Draw top border with title
    term.moveTo(x, y);
    term[borderColor]("┌");

    // Handle simple string title
    const titleText = ` ${title} `;
    const titleLen = titleText.length;
    const availableWidth = width - 2; // Subtract corners

    if (titleLen <= availableWidth) {
      term[borderColor](titleText);
      term[borderColor]("─".repeat(availableWidth - titleLen));
    } else {
      // Truncate title if too long
      const truncated = titleText.substring(0, availableWidth - 3) + "...";
      term[borderColor](truncated);
    }

    term[borderColor]("┐");

    // Draw side borders
    for (let i = 1; i < height - 1; i++) {
      term.moveTo(x, y + i);
      term[borderColor]("│");
      term.moveTo(x + width - 1, y + i);
      term[borderColor]("│");
    }

    // Draw bottom border
    term.moveTo(x, y + height - 1);
    term[borderColor]("└");
    term[borderColor]("─".repeat(width - 2));
    term[borderColor]("┘");
  }

  setupKeyBindings() {
    term.on("key", (name, _matches, _data) => {
      // Exit handlers
      if (name === "CTRL_C" || name === "q") {
        this.cleanup();
        process.exit(0);
      }

      // Panel navigation
      if (name === "TAB") {
        this.cycleFocusedPanel();
        this.render();
      }

      // Panel shortcuts
      if (name >= "1" && name <= "4") {
        const panelMap = {
          1: "main",
          2: "side",
          3: "bottom",
          4: "recommended",
        };
        this.focusedPanel = panelMap[name];
        this.render();
      }

      // Navigation within panels
      if (name === "UP" || name === "k") {
        this.navigateUp();
        this.render();
      }

      if (name === "DOWN" || name === "j") {
        this.navigateDown();
        this.render();
      }

      // View switching
      if (name === "LEFT" || name === "h") {
        this.switchView(-1);
        this.render();
      }

      if (name === "RIGHT" || name === "l") {
        this.switchView(1);
        this.render();
      }

      // Refresh
      if (name === "r") {
        this.refresh();
      }

      // Help
      if (name === "F1" || name === "?") {
        this.showHelp();
      }
    });
  }

  cycleFocusedPanel() {
    const panels = ["main", "side", "bottom", "recommended"];
    const currentIndex = panels.indexOf(this.focusedPanel);
    this.focusedPanel = panels[(currentIndex + 1) % panels.length];
  }

  navigateUp() {
    if (this.focusedPanel === "main") {
      const features = this.getFilteredFeatures();
      if (features.length > 0) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      }
    }
  }

  navigateDown() {
    if (this.focusedPanel === "main") {
      const features = this.getFilteredFeatures();
      if (features.length > 0) {
        this.selectedIndex = Math.min(
          features.length - 1,
          this.selectedIndex + 1
        );
      }
    }
  }

  switchView(direction) {
    if (this.focusedPanel === "main") {
      const views = ["active", "backlog", "done"];
      const currentIndex = views.indexOf(this.currentView);
      let newIndex = currentIndex + direction;

      if (newIndex < 0) newIndex = views.length - 1;
      if (newIndex >= views.length) newIndex = 0;

      this.currentView = views[newIndex];
      this.selectedIndex = 0; // Reset selection when switching views
    } else if (this.focusedPanel === "recommended") {
      const views = ["current", "next"];
      const currentIndex = views.indexOf(this.recommendedView);
      this.recommendedView = views[(currentIndex + 1) % views.length];
    }
  }

  getFilteredFeatures() {
    const allSpecs = this.specParser.getSpecs();

    if (this.currentView === "dashboard") {
      // Dashboard view: combine critical + active + recent done
      const critical = allSpecs.filter(
        (f) => f.status === "backlog" && f.priority === "P0"
      );
      const active = allSpecs.filter((f) => f.status === "active");
      const recentDone = allSpecs
        .filter((f) => f.status === "done")
        .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))
        .slice(0, 5);

      return [...critical, ...active, ...recentDone];
    }

    return allSpecs.filter((f) => f.status === this.currentView);
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

      // Update memory management - more frequent cleanup under heavy load
      this.renderCount++;
      if (this.renderCount % 25 === 0) {
        // More frequent cleanup
        this.performMemoryCleanup();
      }

      // Emergency cleanup if memory usage seems high
      if (this.renderCount % 100 === 0) {
        const memUsage = process.memoryUsage();
        const rssInMB = memUsage.rss / 1024 / 1024;
        if (rssInMB > 200) {
          // If using more than 200MB, force cleanup
          this.performMemoryCleanup();
          if (process.env.DEBUG_MEMORY) {
            console.warn(
              `High memory usage detected: ${Math.round(
                rssInMB
              )}MB, forcing cleanup`
            );
          }
        }
      }
    } catch (error) {
      console.error("Render error:", error);
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
    const features = this.getFilteredFeatures();

    // Use proper content area with padding like Campfire
    const contentArea = this.ui.createContentArea(panelCoords.main, 2);

    if (features.length === 0) {
      term.moveTo(contentArea.x, contentArea.y);
      term.gray("No features found");
      return;
    }

    // Render feature list with multi-line format like Campfire
    // Features can be 2-3 lines + spacing, so we need to calculate dynamically
    const avgLinesPerFeature = 4; // Estimate: title + desc + progress + spacing
    const maxVisibleFeatures = Math.max(
      1,
      Math.floor(contentArea.height / avgLinesPerFeature)
    );

    // Calculate scroll offset to keep selected item visible
    let scrollOffset = this.scrollOffsets.main || 0;

    // Adjust scroll to keep selected item visible
    if (this.selectedIndex < scrollOffset) {
      scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= scrollOffset + maxVisibleFeatures) {
      scrollOffset = this.selectedIndex - maxVisibleFeatures + 1;
    }

    this.scrollOffsets.main = Math.max(
      0,
      Math.min(scrollOffset, features.length - maxVisibleFeatures)
    );

    // Render visible features
    let lineY = contentArea.y;
    const visibleFeatures = features.slice(
      this.scrollOffsets.main,
      this.scrollOffsets.main + maxVisibleFeatures
    );

    for (let i = 0; i < visibleFeatures.length; i++) {
      const featureIndex = this.scrollOffsets.main + i;
      const feature = visibleFeatures[i];
      const isSelected = featureIndex === this.selectedIndex;
      const progress = this.progressCalc.calculateProgress(feature);

      // Use the Campfire-style multi-line format
      const featureDisplay = this.ui.createFeatureListItem(
        feature,
        progress,
        isSelected
      );
      const lines = featureDisplay.hasProgressBar
        ? featureDisplay.lines
        : featureDisplay.split("\n");

      // Render each line of the feature item
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        if (lineY >= contentArea.y + contentArea.height) break;

        term.moveTo(contentArea.x, lineY);

        const line = lines[lineIndex];

        // Handle special progress bar line
        if (typeof line === "object" && line.type === "progress-line") {
          term(line.prefix);
          this.ui.renderProgressBar(term, line.progressBar);
          term(line.taskText);
          if (line.completedText) {
            term.gray(line.completedText);
          }
        }
        // Apply selection highlighting - only highlight the arrow, not the entire line
        else if (
          isSelected &&
          this.focusedPanel === "main" &&
          lineIndex === 0
        ) {
          const lineText =
            typeof line === "string"
              ? line.substring(0, contentArea.width - 2)
              : line;
          // Highlight just the arrow part
          term.bgCyan.black("►");
          term(" " + lineText.substring(2)); // Show rest of line normally
        } else {
          const lineText =
            typeof line === "string"
              ? line.substring(0, contentArea.width - 2)
              : line;
          term(lineText);
        }

        lineY++;
      }

      // Add spacing between features (skip if we're at the end or running out of space)
      if (
        i < visibleFeatures.length - 1 &&
        lineY < contentArea.y + contentArea.height - 1
      ) {
        lineY++; // Empty line between features
      }
    }

    // Show scroll indicator if needed
    if (features.length > maxVisibleFeatures) {
      const scrollIndicator = this.ui.getScrollIndicator(
        this.scrollOffsets.main,
        features.length,
        maxVisibleFeatures
      );
      if (scrollIndicator) {
        term.moveTo(
          contentArea.x + contentArea.width - 1,
          contentArea.y + Math.floor(contentArea.height / 2)
        );
        term.gray(scrollIndicator);
      }
    }
  }

  async renderSidePanel() {
    const layout = this.calculateLayout();
    const panelCoords = this.calculatePanelBorderCoordinates(layout);
    const contentArea = this.ui.createContentArea(panelCoords.side, 2);

    // Show project/progress summary with proper formatting
    const stats = this.specParser.getStats();
    const allSpecs = this.specParser.getSpecs();

    let currentY = 0;

    // Summary header
    term.moveTo(contentArea.x, contentArea.y + currentY++);
    term.brightCyan("📊 PROJECT OVERVIEW");

    currentY++; // Empty line

    // Stats with proper formatting and icons
    const statsLines = [
      `📊 Total Features: ${stats.total}`,
      `🔄 Active: ${stats.active} (${
        stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0
      }%)`,
      `📋 Backlog: ${stats.backlog}`,
      `✅ Done: ${stats.done} (${
        stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
      }%)`,
      `🔥 Critical (P0): ${stats.p0}`,
    ];

    statsLines.forEach((line) => {
      if (currentY < contentArea.height) {
        term.moveTo(contentArea.x, contentArea.y + currentY++);
        term(line.substring(0, contentArea.maxWidth));
      }
    });

    currentY++; // Empty line

    // Show some featured/critical items if space allows
    if (currentY < contentArea.height - 3) {
      term.moveTo(contentArea.x, contentArea.y + currentY++);
      term.yellow("🔥 CRITICAL ITEMS:");

      const criticalFeatures = allSpecs
        .filter((f) => f.priority === "P0")
        .slice(0, 3);

      criticalFeatures.forEach((feature) => {
        if (currentY < contentArea.height) {
          term.moveTo(contentArea.x, contentArea.y + currentY++);
          const statusIcon = this.ui.getStatusIcon(feature.status);
          const title = feature.title.substring(0, contentArea.maxWidth - 10);
          term(`  ${statusIcon} ${feature.id}`);

          if (currentY < contentArea.height) {
            term.moveTo(contentArea.x, contentArea.y + currentY++);
            term.gray(`    ${title}`);
          }
        }
      });

      if (criticalFeatures.length === 0 && currentY < contentArea.height) {
        term.moveTo(contentArea.x, contentArea.y + currentY++);
        term.gray("  No critical items");
      }
    }
  }

  async renderBottomPanel() {
    const layout = this.calculateLayout();
    const panelCoords = this.calculatePanelBorderCoordinates(layout);
    const contentArea = this.ui.createContentArea(panelCoords.bottom, 2);

    const features = this.getFilteredFeatures();
    if (features.length === 0 || this.selectedIndex >= features.length) {
      term.moveTo(contentArea.x, contentArea.y);
      term.gray("No feature selected");
      return;
    }

    const selectedFeature = features[this.selectedIndex];

    // Show feature details with Campfire-style formatting
    let lineY = contentArea.y;

    // Feature title with status and priority
    term.moveTo(contentArea.x, lineY++);
    const statusIcon = this.ui.getStatusIcon(selectedFeature.status);
    const progress = this.progressCalc.calculateProgress(selectedFeature);

    term.brightCyan(
      `${statusIcon} ${selectedFeature.id}: ${selectedFeature.title}`
    );

    // Progress line
    if (lineY < contentArea.y + contentArea.height) {
      term.moveTo(contentArea.x, lineY++);
      term(
        `Progress: ${progress.completed}/${progress.total} subtasks complete`
      );
    }

    // Add empty line
    if (lineY < contentArea.y + contentArea.height) {
      lineY++;
    }

    // Show tasks with Campfire-style formatting
    if (
      selectedFeature.tasks &&
      selectedFeature.tasks.length > 0 &&
      lineY < contentArea.y + contentArea.height
    ) {
      // Render task list using Campfire format
      const taskList = this.ui.createTaskList(
        selectedFeature.tasks.slice(0, contentArea.height - 5)
      );
      const taskLines = taskList.split("\n");

      for (const taskLine of taskLines) {
        if (lineY >= contentArea.y + contentArea.height) break;

        term.moveTo(contentArea.x, lineY++);
        term(taskLine.substring(0, contentArea.width));
      }
    }
  }

  async renderRecommendedPanel() {
    const layout = this.calculateLayout();
    const panelCoords = this.calculatePanelBorderCoordinates(layout);
    const contentArea = this.ui.createContentArea(panelCoords.recommended, 2);

    let currentY = 0;

    if (this.recommendedView === "current") {
      if (this.currentTask) {
        // Current task header
        term.moveTo(contentArea.x, contentArea.y + currentY++);
        term.brightGreen("🔄 CURRENT TASK");

        currentY++; // Empty line

        // Task details
        term.moveTo(contentArea.x, contentArea.y + currentY++);
        const taskIcon = this.ui.getTaskStatusIcon(this.currentTask.status);
        term.brightCyan(`${taskIcon} ${this.currentTask.id}`);

        // Task title with wrapping
        const titleLines = this.ui.wrapText(
          this.currentTask.title,
          contentArea.maxWidth,
          2
        );
        titleLines.forEach((line) => {
          if (currentY < contentArea.height) {
            term.moveTo(contentArea.x, contentArea.y + currentY++);
            term.white(line);
          }
        });

        currentY++; // Empty line

        // Feature context
        if (this.currentTask.feature && currentY < contentArea.height) {
          term.moveTo(contentArea.x, contentArea.y + currentY++);
          term.gray(`Feature: ${this.currentTask.feature}`);
        }
      } else {
        // No current task - show helpful message
        term.moveTo(contentArea.x, contentArea.y + currentY++);
        term.brightRed("⚠️ NO CURRENT TASK");

        currentY++; // Empty line

        const messageLines = [
          "All tasks are completed or none are in progress.",
          "",
          "Use the roadmap to select a task to start working on.",
        ];

        messageLines.forEach((line) => {
          if (currentY < contentArea.height && line) {
            term.moveTo(contentArea.x, contentArea.y + currentY++);
            term.gray(line);
          } else if (!line) {
            currentY++; // Empty line
          }
        });
      }
    } else {
      // Show next available tasks
      const nextTasks = this.findNextTasks();

      term.moveTo(contentArea.x, contentArea.y + currentY++);
      term.brightCyan("⏳ NEXT TASKS");

      currentY++; // Empty line

      if (nextTasks.length > 0) {
        // Show top 3-4 next tasks
        const tasksToShow = nextTasks.slice(
          0,
          Math.min(4, Math.floor((contentArea.height - 2) / 2))
        );

        tasksToShow.forEach((task) => {
          if (currentY < contentArea.height) {
            term.moveTo(contentArea.x, contentArea.y + currentY++);
            const taskIcon = this.ui.getTaskStatusIcon(task.status);
            const priorityIcon = this.ui.getPriorityIcon(task.priority || "P2");
            term.cyan(`${taskIcon} ${priorityIcon} ${task.id}`);

            if (currentY < contentArea.height) {
              term.moveTo(contentArea.x, contentArea.y + currentY++);
              const title = task.title.substring(0, contentArea.maxWidth - 2);
              term.gray(`  ${title}`);
            }
          }
        });

        if (
          nextTasks.length > tasksToShow.length &&
          currentY < contentArea.height
        ) {
          term.moveTo(contentArea.x, contentArea.y + currentY++);
          term.gray(`  ... and ${nextTasks.length - tasksToShow.length} more`);
        }
      } else {
        term.moveTo(contentArea.x, contentArea.y + currentY++);
        term.gray("No next tasks available");
      }
    }
  }

  renderFooter(layout) {
    const { footerY, width } = layout;
    const footerText = this.ui.createFooter(this.focusedPanel);

    // Center the footer text
    const textLength = footerText.length;
    const startX = Math.max(1, Math.floor((width - textLength) / 2));

    term.moveTo(startX, footerY);
    term.gray(footerText);
  }

  findCurrentTask() {
    const allSpecs = this.specParser.getSpecs();

    for (const feature of allSpecs) {
      if (feature.tasks) {
        const inProgressTask = feature.tasks.find(
          (task) => task.status === "in_progress"
        );
        if (inProgressTask) {
          this.currentTask = { ...inProgressTask, feature: feature.id };
          return;
        }
      }
    }

    this.currentTask = null;
  }

  findNextTasks() {
    const allSpecs = this.specParser.getSpecs();
    const nextTasks = [];

    for (const feature of allSpecs) {
      if (feature.tasks) {
        const readyTasks = feature.tasks.filter(
          (task) => task.status === "ready"
        );
        nextTasks.push(
          ...readyTasks.map((task) => ({ ...task, feature: feature.id }))
        );
      }
    }

    return nextTasks.sort((a, b) => {
      // Prioritize by feature priority, then by task number
      const featureA = allSpecs.find((f) => f.id === a.feature);
      const featureB = allSpecs.find((f) => f.id === b.feature);

      if (featureA.priority !== featureB.priority) {
        return featureA.priority.localeCompare(featureB.priority);
      }

      return a.number - b.number;
    });
  }

  setupProcessHandlers() {
    if (this.processHandlersSetup) return;

    process.on("SIGINT", () => this.cleanup());
    process.on("SIGTERM", () => this.cleanup());
    process.on("beforeExit", () => this.cleanup());

    this.processHandlersSetup = true;
  }

  setupFileWatching() {
    if (!this.config.autoRefresh) return;

    // Clean up existing watchers first to prevent accumulation
    this.cleanupWatchers();

    try {
      const chokidar = require("chokidar");
      const dataPath = this.configManager.getDataPath();

      const watcher = chokidar.watch(path.join(dataPath, "**/*.md"), {
        ignored: /node_modules/,
        persistent: true,
        ignoreInitial: true,
        // Prevent excessive file system events
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100,
        },
      });

      // Use bound methods to prevent memory leaks
      const boundRefresh = () => this.debouncedRefresh();

      watcher.on("change", boundRefresh);
      watcher.on("add", boundRefresh);
      watcher.on("unlink", boundRefresh);

      // Store watcher with cleanup info
      this.watchers.push({
        watcher: watcher,
        cleanup: () => {
          watcher.removeListener("change", boundRefresh);
          watcher.removeListener("add", boundRefresh);
          watcher.removeListener("unlink", boundRefresh);
          watcher.close();
        },
      });
    } catch (error) {
      // File watching is optional, continue without it
      console.warn("File watching disabled:", error.message);
    }
  }

  cleanupWatchers() {
    // Properly clean up all watchers to prevent memory leaks
    this.watchers.forEach((watcherInfo) => {
      if (watcherInfo && typeof watcherInfo.cleanup === "function") {
        try {
          watcherInfo.cleanup();
        } catch (error) {
          // Ignore cleanup errors
        }
      } else if (watcherInfo && typeof watcherInfo.close === "function") {
        // Handle legacy watcher format
        try {
          watcherInfo.close();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
    this.watchers = [];
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
      await this.specParser.loadSpecs();
      this.findCurrentTask();
      await this.render();
    } catch (error) {
      console.error("Refresh failed:", error.message);
    }
  }

  setupTerminalResize() {
    term.on("resize", (width, height) => {
      this.termWidth = width;
      this.termHeight = height;
      this.render();
    });
  }

  setupMemoryManagement() {
    // More frequent cleanup to prevent memory leaks
    this.memoryCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, 15000); // Every 15 seconds instead of 30
  }

  performMemoryCleanup() {
    // Implement LRU cache with size limits to prevent unbounded growth
    const cacheKeys = Object.keys(this.cachedContent);
    if (cacheKeys.length > this.maxCacheSize) {
      // Keep only the most recent entries
      const sortedKeys = cacheKeys.sort((a, b) => {
        const aTime = this.cachedContent[a]?.lastAccess || 0;
        const bTime = this.cachedContent[b]?.lastAccess || 0;
        return bTime - aTime; // Sort by last access time, newest first
      });

      // Remove oldest entries
      const toRemove = sortedKeys.slice(this.maxCacheSize);
      toRemove.forEach((key) => {
        delete this.cachedContent[key];
      });
    }

    // Clear render queue to prevent memory buildup
    if (this.renderQueue.length > 10) {
      this.renderQueue = this.renderQueue.slice(-5); // Keep only last 5 items
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.lastGC = Date.now();

    // Log memory cleanup for debugging (only if DEBUG_MEMORY env var is set)
    if (process.env.DEBUG_MEMORY) {
      const memUsage = process.memoryUsage();
      console.log(
        `Memory cleanup: RSS=${Math.round(
          memUsage.rss / 1024 / 1024
        )}MB, Cache size=${Object.keys(this.cachedContent).length}`
      );
    }
  }

  showHelp() {
    term.clear();
    term.moveTo(1, 1);
    term(this.ui.createHelpText());

    term.on("key", () => {
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

    // Close file watchers using proper cleanup
    this.cleanupWatchers();

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
