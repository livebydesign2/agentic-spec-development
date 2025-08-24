class UIComponents {
  // Color helpers - return terminal-kit compatible object or text
  colorize(text, color) {
    if (!color) return text;

    // Return object that can be rendered by terminal-kit
    return {
      text: text,
      color: color,
      type: 'colored'
    };
  }

  // Helper method for when we need plain text (for concatenation)
  colorizeText(text, _color) {
    // For now, return plain text to maintain compatibility
    // This can be enhanced later with ANSI codes if needed
    return text;
  }

  // Helper to render colored text parts for terminal-kit
  renderColoredText(term, coloredText) {
    if (typeof coloredText === 'string') {
      term(coloredText);
    } else if (coloredText && coloredText.type === 'colored') {
      term[coloredText.color](coloredText.text);
    } else {
      term(String(coloredText));
    }
  }

  // Process a string that may contain colored parts
  processColoredString(parts) {
    return parts.map(part => {
      if (typeof part === 'string') return part;
      if (part && part.type === 'colored') return part.text;
      return String(part);
    }).join('');
  }

  createProgressBar(percentage, width = 10) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    // Use Unicode blocks like Campfire for better visual appeal
    const filledBar = '█'.repeat(Math.max(0, filled));
    const emptyBar = '░'.repeat(Math.max(0, empty));
    const percentText = `${percentage}%`;

    // Return object with color info for terminal-kit rendering
    return {
      filled: filledBar,
      empty: emptyBar,
      percentage: percentText,
      percentageColor: this.getProgressColor(percentage),
      barColor: this.getProgressColor(percentage),
      hasColor: true
    };
  }

  // Get color based on progress percentage
  getProgressColor(percentage) {
    if (percentage >= 75) return 'green';
    if (percentage >= 40) return 'yellow';
    if (percentage === 0) return 'gray';
    return 'red';
  }

  // Render colored progress bar for terminal-kit
  renderProgressBar(term, progressInfo) {
    if (!progressInfo.hasColor) {
      // Fallback for plain text
      term(`[${progressInfo.filled}${progressInfo.empty}] ${progressInfo.percentage}`);
      return;
    }

    term('[');
    // Use proper terminal-kit color methods
    if (progressInfo.filled.length > 0) {
      term[progressInfo.barColor](progressInfo.filled);
    }
    if (progressInfo.empty.length > 0) {
      term.gray(progressInfo.empty);
    }
    term('] ');
    term[progressInfo.percentageColor](progressInfo.percentage);
  }

  createColoredProgressBar(percentage, width = 10) {
    const filled = Math.round((percentage / 100) * width);

    // Ensure we always show the full bar width
    const filledChars = Math.max(0, filled);
    const emptyChars = Math.max(0, width - filledChars);

    // Use Unicode blocks like Campfire
    const filledBar = '█'.repeat(filledChars);
    const emptyBar = '░'.repeat(emptyChars);
    const percentText = `${percentage}%`;

    return `[${filledBar}${emptyBar}] ${percentText}`;
  }

  getStatusIcon(status) {
    const icons = {
      active: '🔄',
      backlog: '📋',
      done: '✅',
      blocked: '⏸️',
    };

    return icons[status] || '❓';
  }

  getPriorityIcon(priority) {
    const icons = {
      P0: '🔥',
      P1: '⚡',
      P2: '📋',
      P3: '💭',
    };

    return icons[priority] || '❓';
  }

  getColoredPriority(priority) {
    const colors = {
      P0: 'red', // Critical - red like LazyGit branches
      P1: 'yellow', // High - yellow like LazyGit modified files
      P2: 'blue', // Medium - blue like LazyGit commit hashes
      P3: 'gray', // Low - gray for less important
    };

    const color = colors[priority] || 'white';
    const icon = this.getPriorityIcon(priority);

    // Return colored object for terminal-kit rendering
    return {
      text: `${icon} ${priority}`,
      color: color,
      type: 'colored'
    };
  }

  getTaskStatusIcon(status) {
    const icons = {
      complete: '✅',
      ready: '⏳',
      in_progress: '🔄',
      blocked: '⏸️',
    };

    return icons[status] || '❓';
  }

  getColoredTaskStatus(status) {
    const icons = this.getTaskStatusIcon(status);
    const colors = {
      complete: 'green', // Green for completed like LazyGit
      ready: 'cyan', // Cyan for available tasks
      in_progress: 'yellow', // Yellow for in-progress like LazyGit
      blocked: 'red', // Red for blocked/problems
    };

    const color = colors[status] || 'white';
    return {
      text: `${icons} ${status.toUpperCase()}`,
      color: color,
      type: 'colored'
    };
  }

  getHumanReadableTaskStatus(status) {
    const statusMap = {
      complete: 'COMPLETE',
      ready: 'READY FOR PICKUP',
      in_progress: 'IN PROGRESS',
      blocked: 'BLOCKED',
    };

    return statusMap[status] || status.toUpperCase();
  }

  getColoredHumanTaskStatus(status) {
    const icons = this.getTaskStatusIcon(status);
    const colors = {
      complete: 'green', // Green for completed like LazyGit
      ready: 'cyan', // Cyan for available tasks
      in_progress: 'yellow', // Yellow for in-progress like LazyGit
      blocked: 'red', // Red for blocked/problems
    };

    const color = colors[status] || 'white';
    const humanStatus = this.getHumanReadableTaskStatus(status);
    return {
      text: `${icons} ${humanStatus}`,
      color: color,
      type: 'colored'
    };
  }

  getSubtaskCheckbox(completed) {
    if (completed) {
      return this.colorize('✅', 'green');
    } else {
      // Use empty checkbox with gray color
      return this.colorize('☐', 'gray');
    }
  }

  getColoredFeatureId(id, type) {
    // Color feature IDs like LazyGit commit hashes - blue/cyan
    const colors = {
      FEAT: 'cyan',
      SPEC: 'blue',
      BUG: 'red',
      SPIKE: 'magenta',
      MAINT: 'yellow',
    };

    const color = colors[type] || 'blue';
    return this.colorize(id, color);
  }

  formatFeatureTitle(title, maxLength = 30) {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  }

  formatText(text, maxWidth = 76) {
    if (!text) return '';

    // Split text into words and wrap to maxWidth
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  // Enhanced text wrapping with proper overflow handling
  wrapText(text, maxWidth, maxLines = null) {
    if (!text) return [];

    const lines = this.formatText(text, maxWidth).split('\n');

    if (maxLines && lines.length > maxLines) {
      // Truncate and add ellipsis to last visible line
      const truncatedLines = lines.slice(0, maxLines);
      if (truncatedLines.length > 0) {
        const lastLine = truncatedLines[truncatedLines.length - 1];
        if (lastLine.length > maxWidth - 3) {
          truncatedLines[truncatedLines.length - 1] = lastLine.substring(0, maxWidth - 3) + '...';
        } else {
          truncatedLines[truncatedLines.length - 1] = lastLine + '...';
        }
      }
      return truncatedLines;
    }

    return lines;
  }

  // Create properly padded content area
  createContentArea(panelCoords, padding = 2) {
    return {
      x: panelCoords.x + padding,
      y: panelCoords.y + padding,
      width: panelCoords.width - (padding * 2),
      height: panelCoords.height - (padding * 2),
      maxWidth: panelCoords.width - (padding * 2),
      maxLines: panelCoords.height - (padding * 2)
    };
  }

  // Render multi-line text with proper spacing
  renderTextBlock(term, contentArea, text, startY = 0, color = null) {
    const lines = this.wrapText(text, contentArea.maxWidth, contentArea.maxLines - startY);
    let currentY = contentArea.y + startY;

    lines.forEach(line => {
      if (currentY >= contentArea.y + contentArea.height) return;

      term.moveTo(contentArea.x, currentY);
      if (color) {
        term[color](line);
      } else {
        term(line);
      }
      currentY++;
    });

    return currentY - contentArea.y; // Return lines used
  }

  // Create scroll indicators
  getScrollIndicator(currentIndex, totalItems, visibleItems) {
    if (totalItems <= visibleItems) return '';

    const hasMore = currentIndex + visibleItems < totalItems;
    const hasLess = currentIndex > 0;

    if (hasMore && hasLess) return ' ↕️';
    if (hasMore) return ' ↓';
    if (hasLess) return ' ↑';
    return '';
  }

  // Create a content area with scroll support
  createScrollableContentArea(panelCoords, padding = 2) {
    const contentArea = this.createContentArea(panelCoords, padding);

    // Reserve space for scroll indicator
    contentArea.scrollIndicatorX = contentArea.x + contentArea.width - 2;
    contentArea.scrollIndicatorY = contentArea.y + Math.floor(contentArea.height / 2);

    return contentArea;
  }

  createSelectedPrefix(selected) {
    // Highlight selected items like LazyGit
    if (selected) {
      return this.colorize('► ', 'cyan');
    }
    return '  ';
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString();
  }

  createSummaryStats(stats) {
    const total = stats.total;
    const activePercent =
      total > 0 ? Math.round((stats.active / total) * 100) : 0;
    const donePercent = total > 0 ? Math.round((stats.done / total) * 100) : 0;

    return [
      `📊 SUMMARY: ${total} total features`,
      `🔄 Active: ${stats.active} (${activePercent}%)`,
      `📋 Backlog: ${stats.backlog}`,
      `✅ Done: ${stats.done} (${donePercent}%)`,
      `🔥 Critical (P0): ${stats.p0}`,
    ].join(' | ');
  }


  createWelcomeMessage() {
    return [
      '🤖 Welcome to Agentic Spec Development (ASD)!',
      '',
      'Navigation:',
      '  ↑/↓ or j/k  - Navigate features',
      '  Tab         - Switch views (Dashboard/Active/Backlog/Done)',
      '  Enter       - View feature details',
      '  q           - Quit',
      '',
      'Views:',
      '  Dashboard   - Critical ready + active work + recent completions',
      '  Active      - Features currently being worked on',
      '  Backlog     - Features waiting to be started',
      '  Done        - Completed features',
      '',
      'Press any key to continue...',
    ].join('\n');
  }

  createTabbedHeader(currentView, _focusedPanel) {
    const tabs = [
      { name: 'active', label: 'Active' },
      { name: 'backlog', label: 'Backlog' },
      { name: 'done', label: 'Done' },
    ];

    let tabsText = '[1] ';

    // Handle dashboard view - default to active tab
    const displayView = currentView === 'dashboard' ? 'active' : currentView;

    tabs.forEach((tab, index) => {
      const isActive = displayView === tab.name;
      let tabText = tab.label;

      // Add brackets around active tab for visual distinction
      if (isActive) {
        tabText = `[${tabText}]`;
      }

      tabsText += tabText;

      // Add separator between tabs
      if (index < tabs.length - 1) {
        tabsText += ' - ';
      }
    });

    return tabsText;
  }

  createRecommendedTabbedHeader(
    currentView,
    _hasAlarmThresholdErrors,
    _focusedPanel
  ) {
    const tabs = [
      { name: 'current', label: 'Current Task' },
      { name: 'next', label: 'Next Task' },
    ];

    let tabsText = '[4] ';

    tabs.forEach((tab, index) => {
      const isActive = currentView === tab.name;
      let tabText = tab.label;

      // Add brackets around active tab for visual distinction
      if (isActive) {
        tabText = `[${tabText}]`;
      }

      tabsText += tabText;

      // Add separator between tabs
      if (index < tabs.length - 1) {
        tabsText += ' | ';
      }
    });

    return tabsText;
  }

  createFeatureListItem(feature, progress, selected = false) {
    const prefix = selected ? '► ' : '  ';
    const statusIcon = this.getStatusIcon(feature.status);
    const priorityIcon = this.getPriorityIcon(feature.priority);
    const progressBar = this.createProgressBar(progress.percentage);
    const title = this.formatFeatureTitle(feature.title);

    let line1 = `${prefix}${statusIcon} ${priorityIcon} ${feature.id} ${title}`;

    // Add description/subtitle line if available (like Campfire)
    let line2 = '';
    if (feature.description && feature.description.trim()) {
      // Format description as subtitle, truncated to fit
      const maxDescLength = 60; // Adjust based on typical panel width
      let desc = feature.description.trim();
      if (desc.length > maxDescLength) {
        desc = desc.substring(0, maxDescLength - 3) + '...';
      }
      line2 = `     ${desc}`;
    }

    // Progress bar line - store as object for special rendering
    const taskText = ` ${progress.completed}/${progress.total} tasks`;
    const completedText = feature.completedDate ? ` | Completed: ${this.formatDate(feature.completedDate)}` : '';

    const line3 = {
      type: 'progress-line',
      prefix: '     ',
      progressBar: progressBar,
      taskText: taskText,
      completedText: completedText
    };

    // Return 2 or 3 lines depending on whether description exists
    if (line2) {
      return { lines: [line1, line2, line3], hasProgressBar: true };
    } else {
      return { lines: [line1, line3], hasProgressBar: true };
    }
  }

  createTaskList(tasks, indent = '  ') {
    if (!tasks || tasks.length === 0) return '';

    return tasks
      .map((task) => {
        const icon = this.getTaskStatusIcon(task.status);
        const assignee = task.assigneeRole
          ? ` [${task.assigneeRole}]`
          : '';
        return `${indent}${icon} ${task.id} ${task.title}${assignee}`;
      })
      .join('\n');
  }

  createFooter(focusedPanel) {
    const shortcuts = [
      'q=Quit',
      'Tab=Cycle Panels',
      '1-4=Jump to Panel',
      '↑↓=Navigate',
      '←→=Switch Tabs',
      'r=Refresh'
    ];

    const focusHint = focusedPanel ? ` | Focus: ${focusedPanel.toUpperCase()}` : '';
    return shortcuts.join(' | ') + focusHint;
  }

  createHelpText() {
    return [
      'AGENTIC SPEC DEVELOPMENT (ASD) HELP',
      '═════════════════════════════════════',
      '',
      'KEYBOARD SHORTCUTS:',
      '  q, Ctrl+C     - Quit application',
      '  ↑/↓, j/k      - Navigate up/down',
      '  0, 4          - Focus current/next task panel',
      '  1-3           - Jump directly to panel (1=Main, 2=Overview, 3=Details)',
      '  Tab           - Cycle through panels',
      '  Shift+Tab     - Switch panel tabs (main: Active/Backlog/Done, [4]: Current/Next Task)',
      '  ←/→           - Navigate tabs (left/right arrows)',
      '  Mouse Click   - Click directly on tabs to switch them',
      '  Enter         - Show feature details',
      '  r             - Manual refresh',
      '  Escape        - Close detail view',
      '',
      'VIEWS:',
      '  Dashboard     - Overview with critical & active features',
      '  Active        - Currently in development',
      '  Backlog       - Waiting to be started',
      '  Done          - Completed features',
      '',
      'SPECIFICATION TYPES:',
      '  SPEC-XXX      - New specifications',
      '  FEAT-XXX      - New features',
      '  BUG-XXX       - Bug fixes',
      '  SPIKE-XXX     - Research spikes',
      '  MAINT-XXX     - Maintenance tasks',
      '  REAL-XXX      - Release management',
      '',
      'PRIORITY LEVELS:',
      '  🔥 P0         - Critical (must do now)',
      '  ⚡ P1         - High priority',
      '  📋 P2         - Medium priority',
      '  💭 P3         - Low priority',
      '',
      'TASK STATUS:',
      '  ✅ Complete   - Task finished',
      '  ⏳ Ready      - Available for pickup',
      '  🔄 Progress   - Currently being worked on',
      '  ⏸️ Blocked    - Waiting for dependencies',
      '',
      'AUTO-REFRESH:',
      '  📁 Watches    - Feature folders for changes',
      '  🔄 Auto       - Refreshes when .md files change',
      '  ⏱️  Debounced  - 500ms delay to batch changes',
      '  📺 Indicator  - Shows refresh status in header',
    ].join('\n');
  }
}

module.exports = UIComponents;
