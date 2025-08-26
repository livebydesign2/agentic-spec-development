const BaseDataAdapter = require("./base-adapter");
const fs = require("fs").promises;

/**
 * JSON data adapter for specification files
 * Simple, modern JSON parsing for structured specs
 */
class JSONDataAdapter extends BaseDataAdapter {
  constructor(config = {}) {
    super(config);
    this.format = "json";
  }

  async loadDocument(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const metadata = this.extractMetadata(filePath);
      return this.parseContent(content, metadata);
    } catch (error) {
      throw new Error(
        `Failed to load JSON document ${filePath}: ${error.message}`
      );
    }
  }

  parseContent(content, metadata = {}) {
    try {
      const data = JSON.parse(content);

      // Ensure required fields with sensible defaults
      return {
        id: data.id || metadata.id,
        type: data.type || metadata.type,
        status: data.status || metadata.status,
        title: data.title || "Untitled",
        description: data.description || "",
        priority: data.priority || "P2",
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        completedDate: data.completedDate || null,
        filePath: metadata.filePath,
        ...metadata,
        ...data,
      };
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
  }

  canParse(content) {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  getSupportedExtensions() {
    return ["json"];
  }

  serialize(spec) {
    // Clean up the spec object for JSON serialization
    const cleanSpec = {
      id: spec.id,
      type: spec.type,
      status: spec.status,
      title: spec.title,
      description: spec.description || "",
      priority: spec.priority || "P2",
      tasks: spec.tasks || [],
      completedDate: spec.completedDate || null,
    };

    return JSON.stringify(cleanSpec, null, 2);
  }
}

module.exports = JSONDataAdapter;
