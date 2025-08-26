const BaseDataAdapter = require("./base-adapter");
const fs = require("fs").promises;
const yaml = require("js-yaml");

/**
 * YAML data adapter for specification files
 * Simple YAML parsing with robust error handling
 */
class YAMLDataAdapter extends BaseDataAdapter {
  constructor(config = {}) {
    super(config);
    this.format = "yaml";
  }

  async loadDocument(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const metadata = this.extractMetadata(filePath);
      return this.parseContent(content, metadata);
    } catch (error) {
      throw new Error(
        `Failed to load YAML document ${filePath}: ${error.message}`
      );
    }
  }

  parseContent(content, metadata = {}) {
    try {
      const data = yaml.load(content, { safeLoad: true });

      // Handle empty or null YAML
      if (!data || typeof data !== "object") {
        throw new Error("YAML must contain an object");
      }

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
      throw new Error(`Invalid YAML format: ${error.message}`);
    }
  }

  canParse(content) {
    try {
      const data = yaml.load(content, { safeLoad: true });
      return data && typeof data === "object";
    } catch {
      return false;
    }
  }

  getSupportedExtensions() {
    return ["yaml", "yml"];
  }

  serialize(spec) {
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

    return yaml.dump(cleanSpec, {
      sortKeys: true,
      lineWidth: 80,
      noRefs: true,
    });
  }
}

module.exports = YAMLDataAdapter;
