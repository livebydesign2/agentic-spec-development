const UIComponents = require('../lib/ui-components');

describe('UIComponents', () => {
  let ui;

  beforeEach(() => {
    ui = new UIComponents();
  });

  describe('colorize', () => {
    it('should wrap text with color tags', () => {
      const result = ui.colorize('test text', 'red');
      expect(result).toBe('{red-fg}test text{/}');
    });

    it('should handle empty text', () => {
      const result = ui.colorize('', 'blue');
      expect(result).toBe('{blue-fg}{/}');
    });
  });

  describe('createProgressBar', () => {
    it('should create progress bar for 0%', () => {
      const result = ui.createProgressBar(0, 10);
      expect(result).toBe('[░░░░░░░░░░] {gray-fg}0%{/}');
    });

    it('should create progress bar for 50%', () => {
      const result = ui.createProgressBar(50, 10);
      expect(result).toBe('[█████░░░░░] {yellow-fg}50%{/}');
    });

    it('should create progress bar for 100%', () => {
      const result = ui.createProgressBar(100, 10);
      expect(result).toBe('[██████████] {green-fg}100%{/}');
    });

    it('should use red color for low percentages', () => {
      const result = ui.createProgressBar(25, 10);
      expect(result).toContain('{red-fg}25%{/}');
    });

    it('should use yellow color for medium percentages', () => {
      const result = ui.createProgressBar(60, 10);
      expect(result).toContain('{yellow-fg}60%{/}');
    });

    it('should use green color for high percentages', () => {
      const result = ui.createProgressBar(85, 10);
      expect(result).toContain('{green-fg}85%{/}');
    });

    it('should handle custom width', () => {
      const result = ui.createProgressBar(50, 5);
      expect(result).toBe('[██░░░] {yellow-fg}50%{/}');
    });

    it('should handle edge case percentages', () => {
      expect(ui.createProgressBar(-5, 10)).toBe('[░░░░░░░░░░] {gray-fg}-5%{/}');
      expect(ui.createProgressBar(150, 10)).toBe('[██████████] {green-fg}150%{/}');
    });
  });

  describe('createColoredProgressBar', () => {
    it('should create colored progress bar with consistent width', () => {
      const result = ui.createColoredProgressBar(75, 8);
      expect(result).toContain('█'.repeat(6)); // 75% of 8 = 6
      expect(result).toContain('░'.repeat(2)); // Remaining 2
      expect(result).toContain('{green-fg}75%{/}');
    });

    it('should maintain total width even at 0%', () => {
      const result = ui.createColoredProgressBar(0, 5);
      expect(result).toContain('░'.repeat(5));
      expect(result).toContain('{gray-fg}0%{/}');
    });
  });

  describe('getStatusIcon', () => {
    it('should return correct icons for each status', () => {
      expect(ui.getStatusIcon('active')).toBe('🔄');
      expect(ui.getStatusIcon('backlog')).toBe('📋');
      expect(ui.getStatusIcon('done')).toBe('✅');
      expect(ui.getStatusIcon('blocked')).toBe('⏸️');
    });

    it('should return question mark for unknown status', () => {
      expect(ui.getStatusIcon('unknown')).toBe('❓');
    });
  });

  describe('getPriorityIcon', () => {
    it('should return correct icons for each priority', () => {
      expect(ui.getPriorityIcon('P0')).toBe('🔥');
      expect(ui.getPriorityIcon('P1')).toBe('⚡');
      expect(ui.getPriorityIcon('P2')).toBe('📋');
      expect(ui.getPriorityIcon('P3')).toBe('💭');
    });

    it('should return question mark for unknown priority', () => {
      expect(ui.getPriorityIcon('P99')).toBe('❓');
    });
  });

  describe('getColoredPriority', () => {
    it('should return colored priority with icon', () => {
      const result = ui.getColoredPriority('P0');
      expect(result).toBe('🔥 {red-fg}P0{/}');
    });

    it('should handle all priority levels', () => {
      expect(ui.getColoredPriority('P0')).toContain('{red-fg}P0{/}');
      expect(ui.getColoredPriority('P1')).toContain('{yellow-fg}P1{/}');
      expect(ui.getColoredPriority('P2')).toContain('{blue-fg}P2{/}');
      expect(ui.getColoredPriority('P3')).toContain('{gray-fg}P3{/}');
    });

    it('should default to white for unknown priorities', () => {
      const result = ui.getColoredPriority('UNKNOWN');
      expect(result).toContain('{white-fg}UNKNOWN{/}');
    });
  });

  describe('getTaskStatusIcon', () => {
    it('should return correct icons for task statuses', () => {
      expect(ui.getTaskStatusIcon('complete')).toBe('✅');
      expect(ui.getTaskStatusIcon('ready')).toBe('⏳');
      expect(ui.getTaskStatusIcon('in_progress')).toBe('🔄');
      expect(ui.getTaskStatusIcon('blocked')).toBe('⏸️');
    });
  });

  describe('getColoredTaskStatus', () => {
    it('should return colored task status with icon', () => {
      expect(ui.getColoredTaskStatus('complete')).toBe('✅ {green-fg}COMPLETE{/}');
      expect(ui.getColoredTaskStatus('ready')).toBe('⏳ {cyan-fg}READY{/}');
      expect(ui.getColoredTaskStatus('in_progress')).toBe('🔄 {yellow-fg}IN_PROGRESS{/}');
      expect(ui.getColoredTaskStatus('blocked')).toBe('⏸️ {red-fg}BLOCKED{/}');
    });
  });

  describe('getHumanReadableTaskStatus', () => {
    it('should return human-readable status names', () => {
      expect(ui.getHumanReadableTaskStatus('complete')).toBe('COMPLETE');
      expect(ui.getHumanReadableTaskStatus('ready')).toBe('READY FOR PICKUP');
      expect(ui.getHumanReadableTaskStatus('in_progress')).toBe('IN PROGRESS');
      expect(ui.getHumanReadableTaskStatus('blocked')).toBe('BLOCKED');
    });

    it('should uppercase unknown statuses', () => {
      expect(ui.getHumanReadableTaskStatus('custom')).toBe('CUSTOM');
    });
  });

  describe('getColoredHumanTaskStatus', () => {
    it('should combine icon and colored human-readable status', () => {
      const result = ui.getColoredHumanTaskStatus('ready');
      expect(result).toBe('⏳ {cyan-fg}READY FOR PICKUP{/}');
    });
  });

  describe('getSubtaskCheckbox', () => {
    it('should return green checkmark for completed subtasks', () => {
      const result = ui.getSubtaskCheckbox(true);
      expect(result).toBe('{green-fg}✅{/}');
    });

    it('should return gray empty checkbox for incomplete subtasks', () => {
      const result = ui.getSubtaskCheckbox(false);
      expect(result).toBe('{gray-fg}☐{/}');
    });
  });

  describe('getColoredFeatureId', () => {
    it('should color feature IDs by type', () => {
      expect(ui.getColoredFeatureId('FEAT-001', 'FEAT')).toBe('{cyan-fg}FEAT-001{/}');
      expect(ui.getColoredFeatureId('BUG-002', 'BUG')).toBe('{red-fg}BUG-002{/}');
      expect(ui.getColoredFeatureId('SPIKE-003', 'SPIKE')).toBe('{magenta-fg}SPIKE-003{/}');
      expect(ui.getColoredFeatureId('MAINT-004', 'MAINT')).toBe('{yellow-fg}MAINT-004{/}');
    });

    it('should default to blue for unknown types', () => {
      const result = ui.getColoredFeatureId('CUSTOM-001', 'CUSTOM');
      expect(result).toBe('{blue-fg}CUSTOM-001{/}');
    });
  });

  describe('formatFeatureTitle', () => {
    it('should return title as-is if within max length', () => {
      const title = 'Short Title';
      const result = ui.formatFeatureTitle(title, 30);
      expect(result).toBe('Short Title');
    });

    it('should truncate long titles with ellipsis', () => {
      const title = 'This is a very long title that exceeds the maximum length';
      const result = ui.formatFeatureTitle(title, 20);
      expect(result).toBe('This is a very l...');
      expect(result.length).toBe(20);
    });

    it('should use default max length of 30', () => {
      const title = 'This is a title that is longer than thirty characters and should be truncated';
      const result = ui.formatFeatureTitle(title);
      expect(result).toBe('This is a title that is lo...');
      expect(result.length).toBe(30);
    });
  });

  describe('formatText', () => {
    it('should wrap text to specified width', () => {
      const text = 'This is a long sentence that should be wrapped at a specific width to ensure proper formatting.';
      const result = ui.formatText(text, 20);

      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.every(line => line.length <= 20)).toBe(true);
    });

    it('should handle empty text', () => {
      const result = ui.formatText('', 50);
      expect(result).toBe('');
    });

    it('should handle null/undefined text', () => {
      expect(ui.formatText(null)).toBe('');
      expect(ui.formatText(undefined)).toBe('');
    });

    it('should use default width of 76', () => {
      const longText = 'a'.repeat(100);
      const result = ui.formatText(longText);

      const lines = result.split('\n');
      expect(lines[0].length).toBeLessThanOrEqual(76);
    });

    it('should preserve words when wrapping', () => {
      const text = 'word1 word2 word3 word4';
      const result = ui.formatText(text, 10);

      expect(result).not.toContain('word1 w'); // Should not break words
    });
  });

  describe('createSelectedPrefix', () => {
    it('should return cyan arrow for selected items', () => {
      const result = ui.createSelectedPrefix(true);
      expect(result).toBe('{cyan-fg}► {/}');
    });

    it('should return spaces for unselected items', () => {
      const result = ui.createSelectedPrefix(false);
      expect(result).toBe('  ');
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-31T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "Today" for same day', () => {
      const result = ui.formatDate('2024-01-31');
      expect(result).toBe('Today');
    });

    it('should return "Yesterday" for previous day', () => {
      const result = ui.formatDate('2024-01-30');
      expect(result).toBe('Yesterday');
    });

    it('should return days ago for recent dates', () => {
      const result = ui.formatDate('2024-01-28');
      expect(result).toBe('3 days ago');
    });

    it('should return weeks ago for older dates', () => {
      const result = ui.formatDate('2024-01-17');
      expect(result).toBe('2 weeks ago');
    });

    it('should return formatted date for very old dates', () => {
      const result = ui.formatDate('2023-12-01');
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should return "N/A" for invalid dates', () => {
      expect(ui.formatDate(null)).toBe('N/A');
      expect(ui.formatDate(undefined)).toBe('N/A');
      expect(ui.formatDate('')).toBe('N/A');
    });
  });

  describe('createSummaryStats', () => {
    it('should create formatted summary statistics', () => {
      const stats = {
        total: 10,
        active: 3,
        backlog: 5,
        done: 2,
        p0: 1
      };

      const result = ui.createSummaryStats(stats);

      expect(result).toContain('📊 SUMMARY: 10 total features');
      expect(result).toContain('🔄 Active: 3 (30%)');
      expect(result).toContain('📋 Backlog: 5');
      expect(result).toContain('✅ Done: 2 (20%)');
      expect(result).toContain('🔥 Critical (P0): 1');
    });

    it('should handle zero stats', () => {
      const stats = {
        total: 0,
        active: 0,
        backlog: 0,
        done: 0,
        p0: 0
      };

      const result = ui.createSummaryStats(stats);

      expect(result).toContain('📊 SUMMARY: 0 total features');
      expect(result).toContain('🔄 Active: 0 (0%)');
      expect(result).toContain('✅ Done: 0 (0%)');
    });
  });

  describe('createFeatureListItem', () => {
    it('should create formatted feature list item', () => {
      const feature = {
        id: 'SPEC-001',
        title: 'Test Feature',
        status: 'active',
        priority: 'P1'
      };

      const progress = {
        completed: 2,
        total: 5,
        percentage: 40
      };

      const result = ui.createFeatureListItem(feature, progress, false);

      expect(result).toContain('SPEC-001');
      expect(result).toContain('Test Feature');
      expect(result).toContain('2/5 tasks');
      expect(result).toContain('🔄'); // Active status icon
      expect(result).toContain('⚡'); // P1 priority icon
    });

    it('should show selected prefix for selected items', () => {
      const feature = {
        id: 'SPEC-001',
        title: 'Test',
        status: 'active',
        priority: 'P1'
      };

      const progress = { completed: 0, total: 1, percentage: 0 };

      const result = ui.createFeatureListItem(feature, progress, true);

      expect(result).toContain('► ');
    });

    it('should include completion date for done features', () => {
      const feature = {
        id: 'SPEC-001',
        title: 'Test',
        status: 'done',
        priority: 'P1',
        completedDate: '2024-01-30'
      };

      const progress = { completed: 1, total: 1, percentage: 100 };

      const result = ui.createFeatureListItem(feature, progress, false);

      expect(result).toContain('Completed:');
    });
  });

  describe('createTaskList', () => {
    it('should create formatted task list', () => {
      const tasks = [
        {
          id: 'TASK-001',
          title: 'First Task',
          status: 'complete'
        },
        {
          id: 'TASK-002',
          title: 'Second Task',
          status: 'ready',
          assigneeRole: 'Developer'
        }
      ];

      const result = ui.createTaskList(tasks);

      expect(result).toContain('✅ TASK-001 First Task');
      expect(result).toContain('⏳ TASK-002 Second Task');
      expect(result).toContain('[Developer]');
    });

    it('should handle empty task list', () => {
      const result = ui.createTaskList([]);
      expect(result).toBe('');
    });

    it('should handle null/undefined tasks', () => {
      expect(ui.createTaskList(null)).toBe('');
      expect(ui.createTaskList(undefined)).toBe('');
    });

    it('should use custom indentation', () => {
      const tasks = [{ id: 'TASK-001', title: 'Test', status: 'ready' }];
      const result = ui.createTaskList(tasks, '    ');

      expect(result).toMatch(/^ {4}/);
    });
  });

  describe('createTabbedHeader', () => {
    it('should create tabbed header with active tab highlighted', () => {
      const result = ui.createTabbedHeader('active', 'main', 50);

      expect(result).toContain('[1]');
      expect(result).toContain('Active');
      expect(result).toContain('Backlog');
      expect(result).toContain('Done');
    });

    it('should highlight focused panel differently', () => {
      const focused = ui.createTabbedHeader('active', 'main', 50);
      const unfocused = ui.createTabbedHeader('active', 'other', 50);

      expect(focused).toContain('{brightBlue-fg}');
      expect(unfocused).toContain('{blue-fg}');
    });

    it('should handle dashboard view', () => {
      const result = ui.createTabbedHeader('dashboard', 'main', 50);

      // Dashboard should default to active tab
      expect(result).toContain('{brightBlue-fg}Active{/}');
    });
  });

  describe('createRecommendedTabbedHeader', () => {
    it('should create recommended panel header', () => {
      const result = ui.createRecommendedTabbedHeader('current', false, 'recommended', 50);

      expect(result).toContain('[4]');
      expect(result).toContain('Current Task');
      expect(result).toContain('Next Task');
    });

    it('should highlight active tab when panel is focused', () => {
      const focused = ui.createRecommendedTabbedHeader('current', false, 'recommended', 50);
      const unfocused = ui.createRecommendedTabbedHeader('current', false, 'other', 50);

      expect(focused).toContain('{brightBlue-fg}Current Task{/}');
      expect(unfocused).toContain('{blue-fg}Current Task{/}');
    });
  });

  describe('createWelcomeMessage', () => {
    it('should create complete welcome message', () => {
      const result = ui.createWelcomeMessage();

      expect(result).toContain('Welcome to Agentic Spec Development');
      expect(result).toContain('Navigation:');
      expect(result).toContain('Views:');
      expect(result).toContain('Dashboard');
      expect(result).toContain('Active');
      expect(result).toContain('Backlog');
      expect(result).toContain('Done');
    });
  });

  describe('createHelpText', () => {
    it('should create comprehensive help text', () => {
      const result = ui.createHelpText();

      expect(result).toContain('AGENTIC SPEC DEVELOPMENT (ASD) HELP');
      expect(result).toContain('KEYBOARD SHORTCUTS:');
      expect(result).toContain('VIEWS:');
      expect(result).toContain('SPECIFICATION TYPES:');
      expect(result).toContain('PRIORITY LEVELS:');
      expect(result).toContain('TASK STATUS:');
      expect(result).toContain('AUTO-REFRESH:');
    });

    it('should include all keyboard shortcuts', () => {
      const result = ui.createHelpText();

      expect(result).toContain('q, Ctrl+C');
      expect(result).toContain('↑/↓, j/k');
      expect(result).toContain('Tab');
      expect(result).toContain('Enter');
      expect(result).toContain('r');
    });

    it('should include all specification types', () => {
      const result = ui.createHelpText();

      expect(result).toContain('SPEC-XXX');
      expect(result).toContain('FEAT-XXX');
      expect(result).toContain('BUG-XXX');
      expect(result).toContain('SPIKE-XXX');
      expect(result).toContain('MAINT-XXX');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => ui.getStatusIcon(null)).not.toThrow();
      expect(() => ui.getPriorityIcon(undefined)).not.toThrow();
      expect(() => ui.formatFeatureTitle(null)).not.toThrow();
      expect(() => ui.createTaskList(null)).not.toThrow();
    });

    it('should handle empty strings', () => {
      expect(ui.getStatusIcon('')).toBe('❓');
      expect(ui.getPriorityIcon('')).toBe('❓');
      expect(ui.formatFeatureTitle('')).toBe('');
    });

    it('should handle extreme values in progress bars', () => {
      expect(() => ui.createProgressBar(1000, 10)).not.toThrow();
      expect(() => ui.createProgressBar(-100, 5)).not.toThrow();
      expect(() => ui.createProgressBar(50, 0)).not.toThrow();
    });
  });
});