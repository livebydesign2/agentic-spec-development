const BaseDataAdapter = require("./base-adapter");
const fs = require("fs").promises;

/**
 * Markdown data adapter for specification files
 * Handles parsing and serialization of markdown-based specs
 */
class MarkdownDataAdapter extends BaseDataAdapter {
  constructor(config = {}) {
    super(config);
    this.format = "markdown";
  }

  async loadDocument(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const metadata = this.extractMetadata(filePath);
      return this.parseContent(content, metadata);
    } catch (error) {
      throw new Error(
        `Failed to load markdown document ${filePath}: ${error.message}`
      );
    }
  }

  parseContent(content, metadata = {}) {
    const spec = {
      id: metadata.id,
      type: metadata.type,
      status: metadata.status,
      filePath: metadata.filePath,
      title: this.extractTitle(content),
      description: this.extractDescription(content),
      priority: this.extractPriority(content),
      tasks: this.extractTasks(content),
      completedDate: this.extractCompletedDate(content),
      ...metadata,
    };

    return spec;
  }

  canParse(content) {
    // Simple check for markdown content
    return (
      typeof content === "string" &&
      (content.includes("#") ||
        content.includes("**") ||
        content.includes("- "))
    );
  }

  getSupportedExtensions() {
    return ["md", "markdown"];
  }

  extractTitle(content) {
    // Extract first heading as title, removing spec ID if present
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (!titleMatch) return "Untitled";

    let title = titleMatch[1].trim();

    // Remove spec ID prefix if present (e.g., "FEAT-001: Title" -> "Title")
    const cleanTitle = title.replace(/^[A-Z]+-\d+:\s*/, "");
    return cleanTitle || title;
  }

  extractDescription(content) {
    // Look for Description section or first paragraph after title
    const descMatch = content.match(
      /##\s+Description\s*\n([\s\S]*?)(?=\n##|\n#|$)/i
    );
    if (descMatch) {
      return descMatch[1].trim();
    }

    // Fallback: first paragraph after title
    const lines = content.split("\n");
    let foundTitle = false;
    const descLines = [];

    for (const line of lines) {
      if (line.startsWith("#")) {
        foundTitle = true;
        continue;
      }

      if (foundTitle && line.trim() && !line.startsWith("**")) {
        descLines.push(line.trim());
      } else if (foundTitle && descLines.length > 0) {
        break;
      }
    }

    return (
      descLines.join(" ").substring(0, 200) +
      (descLines.join(" ").length > 200 ? "..." : "")
    );
  }

  extractPriority(content) {
    // Look for Priority field in various formats
    const priorityMatch = content.match(/\*\*Priority\*\*:?\s*(P[0-3])/i);
    return priorityMatch ? priorityMatch[1] : "P2";
  }

  extractTasks(content) {
    const tasks = [];

    // Look for Tasks section
    const tasksMatch = content.match(
      /##\s+Tasks?\s*\n([\s\S]*?)(?=\n##|\n#|$)/i
    );
    if (!tasksMatch) return tasks;

    const taskContent = tasksMatch[1];
    const taskLines = taskContent.split("\n");

    let currentTask = null;
    let taskCounter = 1;

    for (const line of taskLines) {
      const trimmed = line.trim();

      // Main task (starts with - [ ] or - [x] or bullet point)
      if (trimmed.match(/^[-*]\s*\[[ x]\]/)) {
        // Save previous task if exists
        if (currentTask) {
          tasks.push(currentTask);
        }

        const completed = trimmed.includes("[x]");
        const title = trimmed.replace(/^[-*]\s*\[[ x]\]\s*/, "");

        currentTask = {
          id: `TASK-${String(taskCounter).padStart(3, "0")}`,
          title,
          status: completed ? "complete" : "ready",
          subtasks: [],
        };
        taskCounter++;
      }
      // Subtask (indented task)
      else if (currentTask && trimmed.match(/^\s+[-*]\s*\[[ x]\]/)) {
        const completed = trimmed.includes("[x]");
        const title = trimmed.replace(/^\s*[-*]\s*\[[ x]\]\s*/, "");

        currentTask.subtasks.push({
          title,
          completed,
        });
      }
    }

    // Add final task
    if (currentTask) {
      tasks.push(currentTask);
    }

    return tasks;
  }

  extractCompletedDate(content) {
    // Look for completed date in various formats
    const patterns = [
      /Completed:\s*([^\n]+)/i,
      /Completion Date:\s*([^\n]+)/i,
      /Done:\s*([^\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
    }

    return null;
  }

  serialize(spec) {
    // Convert spec object back to markdown format
    const lines = [];

    // Title
    lines.push(`# ${spec.title}`);
    lines.push("");

    // Metadata
    lines.push(`**Status**: ${spec.status}`);
    lines.push(`**Priority**: ${spec.priority}`);
    lines.push("");

    // Description
    if (spec.description) {
      lines.push("## Description");
      lines.push(spec.description);
      lines.push("");
    }

    // Tasks
    if (spec.tasks && spec.tasks.length > 0) {
      lines.push("## Tasks");
      lines.push("");

      spec.tasks.forEach((task) => {
        const checkbox = task.status === "complete" ? "[x]" : "[ ]";
        lines.push(`- ${checkbox} ${task.title}`);

        // Subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask) => {
            const subCheckbox = subtask.completed ? "[x]" : "[ ]";
            lines.push(`  - ${subCheckbox} ${subtask.title}`);
          });
        }
      });
    }

    return lines.join("\n");
  }
}

module.exports = MarkdownDataAdapter;
