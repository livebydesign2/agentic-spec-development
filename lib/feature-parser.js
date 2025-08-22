const fs = require('fs').promises;
const path = require('path');
const ConfigManager = require('./config-manager');

class SpecParser {
  constructor(configManager = null) {
    this.specs = [];
    this.features = []; // Legacy support
    this.configManager = configManager || new ConfigManager();

    // Load configuration
    const config = this.configManager.loadConfig();
    this.featuresPath = config.featuresPath;
    this.enforceSpec = config.enforceSpec;
    this.statusFolders = config.statusFolders;
    this.supportedTypes = config.supportedTypes;
  }

  async loadFeatures() {
    this.specs = [];
    this.features = []; // Legacy support

    for (const folder of this.statusFolders) {
      const folderPath = path.join(this.featuresPath, folder);

      try {
        const files = await fs.readdir(folderPath);
        const mdFiles = files.filter((file) => file.endsWith('.md'));

        for (const file of mdFiles) {
          const filePath = path.join(folderPath, file);
          const spec = await this.parseSpecFile(filePath, folder);
          if (spec) {
            this.specs.push(spec);
            this.features.push(spec); // Legacy support
          }
        }
      } catch (error) {
        console.warn(
          `Warning: Could not read folder ${folder}:`,
          error.message,
        );
      }
    }

    // Sort specs: P0 first, then by ID
    this.specs.sort((a, b) => {
      if (a.priority === 'P0' && b.priority !== 'P0') return -1;
      if (b.priority === 'P0' && a.priority !== 'P0') return 1;
      return a.id.localeCompare(b.id);
    });

    // Legacy features support
    this.features.sort((a, b) => {
      if (a.priority === 'P0' && b.priority !== 'P0') return -1;
      if (b.priority === 'P0' && a.priority !== 'P0') return 1;
      return a.id.localeCompare(b.id);
    });
  }

  async parseSpecFile(filePath, status) {
    return this.parseFeatureFile(filePath, status);
  }

  // Legacy method name for backwards compatibility
  async parseFeatureFile(filePath, status) {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const filename = path.basename(filePath, '.md');

      // Extract spec/feature ID from filename using supported types
      const typePattern = this.supportedTypes.join('|');
      const idMatch = filename.match(
        new RegExp(`^(${typePattern}|TEST|REFRESH-TEST|CLI-TEST)-(\\d+)`)
      );

      if (!idMatch) {
        // Skip files that don't match expected pattern
        return null;
      }

      // Skip report documents that don't define actual specs/features/tasks
      const isReportDocument = filename.match(
        /-(?:report|audit-report|REAL-audit-report|analysis|findings|summary)$/i,
      );
      if (isReportDocument) {
        return null;
      }

      // Parse optional YAML front matter
      const { frontMatter, body } = this.parseFrontMatter(content);
      if (body) {
        content = body;
      }

      const spec = {
        id: idMatch[0],
        type: idMatch[1],
        number: parseInt(idMatch[2]),
        filename,
        status,
        filePath,
        title: '',
        description: '',
        priority: null,
        tasks: [],
        completedDate: null,
        rawContent: content,
        requiredDocs: [],
        warnings: [],
        // Additional metadata for different spec/feature types
        researchType: null,
        researchQuestion: null,
        researchFindings: [],
        bugSeverity: null,
        reproductionSteps: [],
        rootCause: null,
        proposedSolution: null,
        environment: null,
      };

      // Apply front matter values if present
      if (frontMatter) {
        if (frontMatter.priority && /^P[0-3]$/.test(frontMatter.priority)) {
          spec.priority = frontMatter.priority;
        }
        if (Array.isArray(frontMatter.required_docs)) {
          spec.requiredDocs = frontMatter.required_docs.map(String);
        }
      }

      // Parse markdown content
      const lines = content.split('\n');
      let currentSection = '';
      let inTaskSection = false;
      let inRequiredDocs = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Extract title from first # heading
        if (line.startsWith('# ') && !spec.title) {
          spec.title = line.substring(2).trim();
          continue;
        }

        // Extract priority - handle multiple formats
        const priorityMatch = line.match(
          /\*\*Priority\*\*:\s*(P[0-3])|Priority:\s*(P[0-3])/,
        );
        if (priorityMatch) {
          spec.priority = priorityMatch[1] || priorityMatch[2];
          continue;
        }

        // Also check for the exact format we're using
        if (line.includes('**Priority:**') && line.includes('P')) {
          const simpleMatch = line.match(/P[0-3]/);
          if (simpleMatch) {
            spec.priority = simpleMatch[0];
            continue;
          }
        }

        // Extract spike-specific metadata
        if (spec.type === 'SPIKE') {
          const researchTypeMatch = line.match(/\*\*Research Type\*\*:\s*(.+)/);
          if (researchTypeMatch) {
            spec.researchType = researchTypeMatch[1].trim();
            continue;
          }
        }

        // Extract bug-specific metadata
        if (spec.type === 'BUG') {
          const severityMatch = line.match(/\*\*Severity\*\*:\s*(.+)/);
          if (severityMatch) {
            spec.bugSeverity = severityMatch[1].trim();
            continue;
          }
        }

        // Extract description from ## Description section
        if (line.startsWith('## Description')) {
          currentSection = 'description';
          continue;
        }

        // Capture Required Reading block
        if (/Required\s+Reading/i.test(line)) {
          inRequiredDocs = true;
          currentSection = 'required_docs';
          continue;
        }
        if (inRequiredDocs) {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            const docPath = line.replace(/^[-*]\s+/, '').trim();
            if (docPath) spec.requiredDocs.push(docPath);
            continue;
          }
          // End of block on blank line or next header
          if (!line || line.startsWith('##') || line.startsWith('#')) {
            inRequiredDocs = false;
          }
        }

        // Extract spike-specific sections
        if (spec.type === 'SPIKE') {
          if (
            line.startsWith('### **Research Question**') ||
            line.includes('Research Question')
          ) {
            currentSection = 'research_question';
            continue;
          }
          if (
            line.startsWith('### **Success Criteria**') ||
            line.includes('Success Criteria')
          ) {
            currentSection = 'research_findings';
            continue;
          }
        }

        // Extract bug-specific sections
        if (spec.type === 'BUG') {
          if (
            line.startsWith('### **Reproduction Steps**') ||
            line.includes('Reproduction Steps')
          ) {
            currentSection = 'reproduction_steps';
            continue;
          }
          if (
            line.startsWith('### **Root Cause Analysis**') ||
            line.includes('Root Cause Analysis')
          ) {
            currentSection = 'root_cause';
            continue;
          }
          if (
            line.startsWith('### **Proposed Solution**') ||
            line.includes('Proposed Solution')
          ) {
            currentSection = 'proposed_solution';
            continue;
          }
          if (
            line.startsWith('### **Environment**') ||
            line.includes('Environment')
          ) {
            currentSection = 'environment';
            continue;
          }
        }

        // Extract tasks - handle multiple task section formats
        if (
          line.startsWith('## Tasks') ||
          line.startsWith('## Implementation Tasks') ||
          line.startsWith('## Fix Tasks') ||
          line.startsWith('## Bugfix Tasks') ||
          line.startsWith('## Maintenance Tasks') ||
          line.startsWith('## Repair Tasks') ||
          line.includes('Implementation Tasks') ||
          line.includes('**Implementation Tasks**') ||
          line.startsWith('## 🎯 ACCEPTANCE CRITERIA') ||
          line.startsWith('## 🧪 TESTING CHECKLIST') ||
          line.includes('COMPLETED TASKS') ||
          line.includes('TASK STATUS') ||
          line.startsWith('## 📋')
        ) {
          inTaskSection = true;
          currentSection = 'tasks';
          continue;
        }

        // Stop task parsing at next section (but continue for testing checklist)
        if (
          inTaskSection &&
          line.startsWith('## ') &&
          !line.includes('Task') &&
          !line.startsWith('## 🧪 TESTING CHECKLIST') &&
          !line.startsWith('## 🎯 ACCEPTANCE CRITERIA')
        ) {
          inTaskSection = false;
        }

        // Parse tasks - look for task headers and subtasks
        if (inTaskSection) {
          // Handle multiple TASK formats:
          if (
            line.includes('TASK-') &&
            // Standard format with robot emoji: **TASK-001** 🤖 **title**
            (line.match(/\*\*TASK-\d+\*\*\s*🤖/) ||
              // Emoji prefix format: **✅ TASK-001** 🤖 **title**
              line.match(
                /\*\*[\u2705\ud83d\udd34\u23f3\ud83d\udd04\u23f8].*TASK-\d+\*\*\s*🤖/,
              ) ||
              // MAINT format: ### **✅ TASK-001**: title
              line.match(
                /###\s*\*\*[\u2705\ud83d\udd34\u23f3\ud83d\udd04\u23f8].*TASK-\d+\*\*:/,
              ) ||
              // Status-based format: **TASK-001** ... **← STATUS**
              line.match(/\*\*TASK-\d+\*\*.*\*\*←.*\*\*/))
          ) {
            const task = this.parseTask(line);
            if (task) {
              spec.tasks.push(task);
            }
            continue;
          }

          // Parse subtasks and add to the last task
          if (line.match(/^\s*-\s*\[/)) {
            const subtask = this.parseTask(line);
            if (
              subtask &&
              subtask.type === 'subtask' &&
              spec.tasks.length > 0
            ) {
              const lastTask = spec.tasks[spec.tasks.length - 1];
              if (!lastTask.subtasks) lastTask.subtasks = [];
              lastTask.subtasks.push(subtask);
            }
            continue;
          }
        }

        // Collect description content
        if (
          currentSection === 'description' &&
          line &&
          !line.startsWith('##')
        ) {
          spec.description += line + ' ';
        }

        // Collect spike-specific content
        if (spec.type === 'SPIKE') {
          if (
            currentSection === 'research_question' &&
            line &&
            !line.startsWith('##') &&
            !line.startsWith('###')
          ) {
            if (!spec.researchQuestion) spec.researchQuestion = '';
            spec.researchQuestion += line + ' ';
          }
          if (
            currentSection === 'research_findings' &&
            line &&
            !line.startsWith('##') &&
            !line.startsWith('###')
          ) {
            if (line.startsWith('- [') || line.startsWith('  - [')) {
              spec.researchFindings.push(line.trim());
            }
          }
        }

        // Collect bug-specific content
        if (spec.type === 'BUG') {
          if (
            currentSection === 'reproduction_steps' &&
            line &&
            !line.startsWith('##') &&
            !line.startsWith('###')
          ) {
            if (line.match(/^\d+\./) || line.startsWith('   -')) {
              spec.reproductionSteps.push(line.trim());
            }
          }
          if (
            currentSection === 'root_cause' &&
            line &&
            !line.startsWith('##') &&
            !line.startsWith('###')
          ) {
            if (!spec.rootCause) spec.rootCause = '';
            spec.rootCause += line + ' ';
          }
          if (
            currentSection === 'proposed_solution' &&
            line &&
            !line.startsWith('##') &&
            !line.startsWith('###')
          ) {
            if (!spec.proposedSolution) spec.proposedSolution = '';
            spec.proposedSolution += line + ' ';
          }
          if (
            currentSection === 'environment' &&
            line &&
            !line.startsWith('##') &&
            !line.startsWith('###')
          ) {
            if (!spec.environment) spec.environment = '';
            spec.environment += line + ' ';
          }
        }
      }

      // Clean up description
      spec.description = spec.description.trim();
      if (!spec.description) {
        const fallback = this.computeFallbackDescription(lines);
        if (fallback) {
          spec.description = fallback;
          spec.warnings.push('Missing Description; used fallback');
        }
      }

      // Clean up spike-specific fields
      if (spec.type === 'SPIKE') {
        if (spec.researchQuestion) {
          spec.researchQuestion = spec.researchQuestion.trim();
        }
      }

      // Clean up bug-specific fields
      if (spec.type === 'BUG') {
        if (spec.rootCause) {
          spec.rootCause = spec.rootCause.trim();
        }
        if (spec.proposedSolution) {
          spec.proposedSolution = spec.proposedSolution.trim();
        }
        if (spec.environment) {
          spec.environment = spec.environment.trim();
        }
      }

      // Extract completion date for done features
      if (status === 'done') {
        const stats = await fs.stat(filePath);
        spec.completedDate = stats.mtime.toISOString().split('T')[0];
      }

      return spec;
    } catch (error) {
      console.warn(`Warning: Could not parse ${filePath}:`, error.message);
      return null;
    }
  }

  parseTask(line) {
    // Parse different task line formats
    let mainTaskMatch = line.match(/\*\*.*?TASK-(\d+)\*\*/);
    if (!mainTaskMatch) {
      mainTaskMatch = line.match(/TASK-(\d+)/);
    }

    if (mainTaskMatch) {
      const number = mainTaskMatch[1] || mainTaskMatch[0].match(/\d+/)[0];

      // Extract title - handle multiple formats
      let title = `Task ${number}`;
      let titleMatch1 = null;

      // Format 1: **TASK-001** 🤖 **title** or **✅ TASK-001** 🤖 **title**
      titleMatch1 = line.match(/\*\*.*?TASK-\d+\*\*\s*🤖\s*\*\*([^*]+)\*\*/);

      // Format 2: ### **✅ TASK-001**: title (MAINT format)
      if (!titleMatch1) {
        titleMatch1 = line.match(/###\s*\*\*.*?TASK-\d+\*\*:\s*([^*()]+)/);
      }
      if (titleMatch1) {
        title = titleMatch1[1].trim();
        // Remove status prefixes like "COMPLETED - " or "READY FOR PICKUP - "
        title = title.replace(
          /^(COMPLETED|IN PROGRESS|READY FOR PICKUP|BLOCKED)\s*-\s*/,
          '',
        );
      }

      // Determine status from emoji prefix or content
      let taskStatus = 'ready';
      let icon = '⏳';

      // Check emoji prefix first - use includes for Unicode safety
      if (line.includes('✅') && line.includes('TASK-')) {
        taskStatus = 'complete';
        icon = '✅';
      } else if (line.includes('🔴') && line.includes('TASK-')) {
        taskStatus = 'ready';
        icon = '🔴';
      } else if (line.includes('🔄') && line.includes('TASK-')) {
        taskStatus = 'in_progress';
        icon = '🔄';
      } else if (
        (line.includes('⏸') || line.includes('⏸️')) &&
        line.includes('TASK-')
      ) {
        taskStatus = 'blocked';
        icon = '⏸️';
      } else if (line.includes('⏳') && line.includes('TASK-')) {
        taskStatus = 'ready';
        icon = '⏳';
      } else {
        // Fallback: Check for emojis anywhere in the line
        if (line.includes('✅')) {
          taskStatus = 'complete';
          icon = '✅';
        } else if (line.includes('🔄')) {
          taskStatus = 'in_progress';
          icon = '🔄';
        } else if (line.includes('⏸️') || line.includes('⏸')) {
          taskStatus = 'blocked';
          icon = '⏸️';
        } else if (line.includes('⏳')) {
          taskStatus = 'ready';
          icon = '⏳';
        }
      }

      // Extract Agent role tag if present
      let assigneeRole = null;
      const agentTagMatch = line.match(/\|\s*Agent\s*:\s*([^|]+)\s*$/);
      if (agentTagMatch) {
        assigneeRole = agentTagMatch[1].trim();
      }

      return {
        id: `TASK-${number.padStart(3, '0')}`,
        number: parseInt(number),
        status: taskStatus,
        title: title,
        icon,
        subtasks: [],
        assigneeRole,
      };
    }

    // Subtask checkbox format: - [ ] Create user_gear_collections table
    const subtaskMatch = line.match(/^\s*-\s*\[([ x])\]\s*(.+)/);
    if (subtaskMatch) {
      const [, checked, title] = subtaskMatch;
      return {
        type: 'subtask',
        completed: checked === 'x',
        title: title.trim(),
      };
    }

    return null;
  }

  parseFrontMatter(content) {
    const lines = content.split('\n');
    if (lines[0] && lines[0].trim() === '---') {
      let end = -1;
      for (let i = 1; i < Math.min(lines.length, 200); i++) {
        if (lines[i].trim() === '---') {
          end = i;
          break;
        }
      }
      if (end > 0) {
        const block = lines.slice(1, end);
        const frontMatter = {};
        for (let i = 0; i < block.length; i++) {
          const raw = block[i];
          if (!raw.trim()) continue;
          const kv = raw.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
          if (kv) {
            const key = kv[1];
            let val = kv[2];
            if (val === '[]') {
              frontMatter[key] = [];
              continue;
            }
            if (val) {
              // primitive value
              frontMatter[key] = val.trim().replace(/^"|"$/g, '');
            } else {
              // Possibly a list on following lines
              const items = [];
              let j = i + 1;
              while (j < block.length) {
                const line = block[j];
                if (line.match(/^\s*-\s+/)) {
                  items.push(line.replace(/^\s*-\s+/, '').trim());
                  j++;
                  continue;
                }
                break;
              }
              if (items.length > 0) {
                frontMatter[key] = items;
                i = j - 1;
              }
            }
          }
        }
        const body = lines.slice(end + 1).join('\n');
        return { frontMatter, body };
      }
    }
    return { frontMatter: null, body: content };
  }

  computeFallbackDescription(lines) {
    // Try Problem Statement then Solution Approach
    const grabAfter = (anchor) => {
      const idx = lines.findIndex((l) =>
        l.trim().toLowerCase().includes(anchor),
      );
      if (idx === -1) return '';
      const buf = [];
      for (let i = idx + 1; i < lines.length; i++) {
        const s = lines[i].trim();
        if (!s) {
          if (buf.length > 0) break;
          else continue;
        }
        if (s.startsWith('#')) break;
        if (s.startsWith('##')) break;
        if (s.startsWith('###')) break;
        buf.push(s);
        if (buf.join(' ').length > 220) break; // keep short
      }
      return buf.join(' ');
    };
    const problem = grabAfter('problem statement');
    const solution = grabAfter('solution approach');
    const combined = [problem, solution].filter(Boolean).join(' ');
    return combined || '';
  }

  getSpecs() {
    return this.specs;
  }

  // Legacy method name for backwards compatibility
  getFeatures() {
    return this.features;
  }

  getSpecsByStatus(status) {
    return this.specs.filter((f) => f.status === status);
  }

  // Legacy method name for backwards compatibility
  getFeaturesByStatus(status) {
    return this.features.filter((f) => f.status === status);
  }

  getSpecsByPriority(priority) {
    return this.specs.filter((f) => f.priority === priority);
  }

  // Legacy method name for backwards compatibility
  getFeaturesByPriority(priority) {
    return this.features.filter((f) => f.priority === priority);
  }

  getCriticalReady() {
    return this.specs.filter(
      (f) => f.status === 'backlog' && f.priority === 'P0',
    );
  }

  getStats() {
    const stats = {
      total: this.specs.length,
      active: this.specs.filter((f) => f.status === 'active').length,
      backlog: this.specs.filter((f) => f.status === 'backlog').length,
      done: this.specs.filter((f) => f.status === 'done').length,
      p0: this.specs.filter((f) => f.priority === 'P0').length,
    };

    return stats;
  }
}

module.exports = SpecParser;