class UIComponents {
  // Color helpers using blessed.js tags
  colorize(text, color) {
    return `{${color}-fg}${text}{/}`;
  }

  createProgressBar(percentage, width = 10) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    // Ensure we always show the full bar even at 0%
    const bar =
      '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
    const percentText = `${percentage}%`;

    // Color code progress: green for high completion, yellow for medium, red for low
    let color = 'red';
    if (percentage >= 75) color = 'green';
    else if (percentage >= 40) color = 'yellow';
    else if (percentage === 0) color = 'gray'; // Special case for 0%

    return `[${bar}] ${this.colorize(percentText, color)}`;
  }

  createColoredProgressBar(percentage, width = 10) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    // Ensure we always show the full bar width
    const filledChars = Math.max(0, filled);
    const emptyChars = Math.max(0, width - filledChars); // Ensure total width is maintained

    // Always show the bar structure, even for 0%
    const filledBar = '█'.repeat(filledChars);
    const emptyBar = '░'.repeat(emptyChars);

    // Color the progress bar itself
    let barColor = 'red';
    if (percentage >= 75) barColor = 'green';
    else if (percentage >= 40) barColor = 'yellow';
    else if (percentage === 0) barColor = 'gray'; // Special case for 0%

    const percentText = this.colorize(`${percentage}%`, barColor);

    return `[${this.colorize(filledBar + emptyBar, barColor === 'gray' ? 'gray' : barColor)}] ${percentText}`;
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

    return `${icon} ${this.colorize(priority, color)}`;
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
    return `${icons} ${this.colorize(status.toUpperCase(), color)}`;
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
    return `${icons} ${this.colorize(humanStatus, color)}`;
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

  createFeatureListItem(feature, progress, selected = false) {
    const prefix = selected ? '► ' : '  ';
    const statusIcon = this.getStatusIcon(feature.status);
    const priorityIcon = this.getPriorityIcon(feature.priority);
    const progressBar = this.createProgressBar(progress.percentage);
    const title = this.formatFeatureTitle(feature.title);

    let line1 = `${prefix}${statusIcon} ${priorityIcon} ${feature.id} ${title}`;
    let line2 = `     ${progressBar} ${progress.completed}/${progress.total} tasks`;

    if (feature.completedDate) {
      line2 += ` | Completed: ${this.formatDate(feature.completedDate)}`;
    }

    return `${line1}\n${line2}`;
  }

  createTaskList(tasks, indent = '  ') {
    if (!tasks || tasks.length === 0) return '';

    return tasks
      .map((task) => {
        const icon = this.getTaskStatusIcon(task.status);
        const assignee = task.assigneeRole
          ? this.colorize(` [${task.assigneeRole}]`, 'blue')
          : '';
        return `${indent}${icon} ${task.id} ${task.title}${assignee}`;
      })
      .join('\n');
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

  createTabbedHeader(currentView, focusedPanel, maxWidth = 50) {
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
      const tabText = tab.label;

      if (isActive && focusedPanel === 'main') {
        // Active tab with main panel focused - bright blue to match window borders
        tabsText += this.colorize(tabText, 'brightBlue');
      } else if (isActive) {
        // Active tab but main panel not focused - regular blue to match non-focused panel borders
        tabsText += this.colorize(tabText, 'blue');
      } else {
        // Inactive tab - gray like LazyGit
        tabsText += this.colorize(tabText, 'gray');
      }

      // Add separator between tabs like LazyGit (space-dash-space)
      if (index < tabs.length - 1) {
        tabsText += this.colorize(' - ', 'white');
      }
    });

    // Truncate if too long (check visible length, not raw length with color tags)
    const visibleLength = tabsText.replace(/\{[^}]*\}/g, '').length;
    if (visibleLength > maxWidth) {
      // For now, just don't truncate tabbed headers to ensure full display
      // TODO: Implement smart truncation that preserves color tags
    }

    return tabsText;
  }

  createRecommendedTabbedHeader(
    currentView,
    hasAlarmThresholdErrors,
    focusedPanel,
    maxWidth = 50,
  ) {
    const tabs = [
      { name: 'current', label: 'Current Task' },
      { name: 'next', label: 'Next Task' },
    ];

    let tabsText = '[4] ';

    tabs.forEach((tab, index) => {
      const isActive = currentView === tab.name;
      const tabText = tab.label;

      if (isActive && focusedPanel === 'recommended') {
        // Active tab with recommended panel focused - bright blue to match window borders
        tabsText += this.colorize(tabText, 'brightBlue');
      } else if (isActive) {
        // Active tab but recommended panel not focused - regular blue to match non-focused panel borders
        tabsText += this.colorize(tabText, 'blue');
      } else {
        // Inactive tab - gray like LazyGit
        tabsText += this.colorize(tabText, 'gray');
      }

      // Add separator between tabs like LazyGit (space-pipe-space for better visibility)
      if (index < tabs.length - 1) {
        tabsText += this.colorize(' | ', 'white');
      }
    });

    return tabsText;
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