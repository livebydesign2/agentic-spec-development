const fs = require('fs').promises;
const path = require('path');
const ConfigManager = require('./config-manager');
const { DataAdapterFactory } = require('./data-adapters');

class SpecParser {
  constructor(configManager = null) {
    this.specs = [];
    this.configManager = configManager || new ConfigManager();

    // Load configuration
    const config = this.configManager.loadConfig();
    this.dataPath = config.dataPath;
    this.enforceSpec = config.enforceSpec;
    this.statusFolders = config.statusFolders;
    this.supportedTypes = config.supportedTypes;
    this.dataFormat = config.dataFormat || 'markdown';

    // Initialize data adapter factory
    this.adapterFactory = new DataAdapterFactory();
  }

  async loadSpecs() {
    this.specs = [];

    for (const folder of this.statusFolders) {
      const folderPath = path.join(this.dataPath, folder);

      try {
        const files = await fs.readdir(folderPath);

        // Get all supported extensions from adapters
        const supportedExts = ['md', 'json', 'yaml', 'yml'];
        const specFiles = files.filter((file) => {
          const ext = path.extname(file).slice(1).toLowerCase();
          return supportedExts.includes(ext);
        });

        for (const file of specFiles) {
          const filePath = path.join(folderPath, file);
          const spec = await this.parseSpecFile(filePath, folder);
          if (spec) {
            this.specs.push(spec);
          }
        }
      } catch (error) {
        console.warn(
          `Warning: Could not read folder ${folder}:`,
          error.message
        );
      }
    }

    // Sort specs: P0 first, then by ID
    this.specs.sort((a, b) => {
      if (a.priority === 'P0' && b.priority !== 'P0') return -1;
      if (b.priority === 'P0' && a.priority !== 'P0') return 1;
      return a.id.localeCompare(b.id);
    });
  }

  async parseSpecFile(filePath, _status) {
    try {
      // Use data adapter factory to get appropriate adapter
      const adapter = this.adapterFactory.createFromFile(filePath);
      const spec = await adapter.loadDocument(filePath);

      // Validate the spec ID matches supported types
      if (spec.id) {
        const typePattern = this.supportedTypes.join('|');
        const idMatch = spec.id.match(
          new RegExp(`^(${typePattern})-(\\d+)`)
        );

        if (!idMatch) {
          // Skip files that don't match expected pattern
          return null;
        }

        // Skip report documents
        const isReportDocument = spec.id.match(
          /-(?:report|audit-report|analysis|findings|summary)$/i
        );
        if (isReportDocument) {
          return null;
        }
      }

      // Ensure required structure for ASD specs
      return {
        ...spec,
        filename: path.basename(filePath, path.extname(filePath)),
        number: spec.id ? parseInt(spec.id.split('-')[1]) : 0,
        warnings: [],
        requiredDocs: spec.requiredDocs || [],
      };
    } catch (error) {
      console.warn(`Warning: Could not parse spec file ${filePath}:`, error.message);
      return null;
    }
  }

  // Modern getter methods
  getSpecs() {
    return this.specs;
  }

  getSpecById(id) {
    return this.specs.find((spec) => spec.id === id);
  }

  getSpecsByStatus(status) {
    return this.specs.filter((spec) => spec.status === status);
  }

  getSpecsByType(type) {
    return this.specs.filter((spec) => spec.type === type);
  }

  getSpecsByPriority(priority) {
    return this.specs.filter((spec) => spec.priority === priority);
  }
}

module.exports = SpecParser;