const fs = require('fs').promises;
const path = require('path');
const MarkdownAdapter = require('./markdown');
const JSONAdapter = require('./json');
const YAMLAdapter = require('./yaml');
const FormatDetector = require('./format-detector');
const SchemaValidator = require('./schema-validator');

/**
 * Format conversion utility for specification documents
 * Provides bidirectional conversion between JSON, YAML, and Markdown formats
 */
class FormatConverter {
  constructor(config = {}) {
    this.config = config;
    this.adapters = new Map([
      ['markdown', MarkdownAdapter],
      ['json', JSONAdapter],
      ['yaml', YAMLAdapter],
    ]);
    this.formatDetector = new FormatDetector();
    this.schemaValidator = new SchemaValidator(config.validation || {});
    this.conversionMap = this.initializeConversionMap();
  }

  /**
   * Initialize conversion mapping between formats
   * @private
   */
  initializeConversionMap() {
    return new Map([
      ['markdown->json', this.convertMarkdownToJson.bind(this)],
      ['markdown->yaml', this.convertMarkdownToYaml.bind(this)],
      ['json->markdown', this.convertJsonToMarkdown.bind(this)],
      ['json->yaml', this.convertJsonToYaml.bind(this)],
      ['yaml->markdown', this.convertYamlToMarkdown.bind(this)],
      ['yaml->json', this.convertYamlToJson.bind(this)],
    ]);
  }

  /**
   * Convert specification file from one format to another
   * @param {string} inputPath - Path to input file
   * @param {string} outputPath - Path for output file
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Conversion result
   */
  async convertFile(inputPath, outputPath, options = {}) {
    const {
      sourceFormat = null,
      targetFormat = null,
      validate = true,
      preserveMetadata = true,
      backup = false
    } = options;

    try {
      // Read input file
      const inputContent = await fs.readFile(inputPath, 'utf-8');

      // Detect source format
      const detectedSourceFormat = sourceFormat ||
        await this.formatDetector.detectFormat(inputPath, inputContent);

      // Determine target format
      const detectedTargetFormat = targetFormat ||
        this.getFormatFromExtension(outputPath);

      // Create backup if requested
      if (backup && await this.fileExists(outputPath)) {
        const backupPath = `${outputPath}.backup.${Date.now()}`;
        await fs.copyFile(outputPath, backupPath);
      }

      // Perform conversion
      const result = await this.convert(
        inputContent,
        detectedSourceFormat,
        detectedTargetFormat,
        {
          ...options,
          filePath: inputPath,
          outputPath
        }
      );

      // Write output file
      await this.ensureDirectoryExists(path.dirname(outputPath));
      await fs.writeFile(outputPath, result.convertedContent, 'utf-8');

      return {
        success: true,
        sourcePath: inputPath,
        targetPath: outputPath,
        sourceFormat: detectedSourceFormat,
        targetFormat: detectedTargetFormat,
        validation: result.validation,
        metadata: result.metadata,
        warnings: result.warnings || []
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        sourcePath: inputPath,
        targetPath: outputPath
      };
    }
  }

  /**
   * Convert content string between formats
   * @param {string} content - Source content
   * @param {string} sourceFormat - Source format (json, yaml, markdown)
   * @param {string} targetFormat - Target format (json, yaml, markdown)
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Conversion result
   */
  async convert(content, sourceFormat, targetFormat, options = {}) {
    const {
      validate = true,
      preserveMetadata = true,
      filePath = null
    } = options;

    if (sourceFormat === targetFormat) {
      return {
        convertedContent: content,
        sourceFormat,
        targetFormat,
        validation: { isValid: true, errors: [], warnings: [] },
        metadata: {},
        unchanged: true
      };
    }

    try {
      // Parse source content into specification object
      const SourceAdapterClass = this.adapters.get(sourceFormat);
      if (!SourceAdapterClass) {
        throw new Error(`Unsupported source format: ${sourceFormat}`);
      }

      const sourceAdapter = new SourceAdapterClass(this.config[sourceFormat] || {});
      const metadata = filePath ? sourceAdapter.extractMetadata(filePath) : {};
      const spec = sourceAdapter.parseContent(content, metadata);

      // Validate specification if requested
      let validation = { isValid: true, errors: [], warnings: [] };
      if (validate) {
        validation = await this.schemaValidator.validate(spec, {
          autoFix: true,
          strict: false
        });
      }

      // Use validated/fixed spec for conversion
      const specToConvert = validation.fixedSpec || validation.spec || spec;

      // Convert to target format
      const TargetAdapterClass = this.adapters.get(targetFormat);
      if (!TargetAdapterClass) {
        throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      const targetAdapter = new TargetAdapterClass(this.config[targetFormat] || {});
      const convertedContent = targetAdapter.serialize(specToConvert);

      return {
        convertedContent,
        sourceFormat,
        targetFormat,
        validation,
        metadata: preserveMetadata ? metadata : {},
        spec: specToConvert,
        warnings: this.gatherConversionWarnings(sourceFormat, targetFormat, spec)
      };

    } catch (error) {
      throw new Error(`Conversion failed from ${sourceFormat} to ${targetFormat}: ${error.message}`);
    }
  }

  /**
   * Batch convert multiple files
   * @param {Array} filePaths - Array of input file paths
   * @param {Object} options - Batch conversion options
   * @returns {Promise<Array>} Array of conversion results
   */
  async convertBatch(filePaths, options = {}) {
    const {
      targetFormat,
      outputDir = null,
      outputExtension = null,
      parallel = true,
      progressCallback = null
    } = options;

    const conversions = filePaths.map((filePath, index) => {
      const outputPath = this.generateOutputPath(filePath, {
        targetFormat,
        outputDir,
        outputExtension
      });

      const conversionOptions = {
        ...options,
        sourceFormat: null, // Auto-detect
        targetFormat
      };

      if (parallel) {
        return this.convertFile(filePath, outputPath, conversionOptions)
          .then(result => {
            if (progressCallback) {
              progressCallback(index + 1, filePaths.length, result);
            }
            return result;
          });
      } else {
        return { filePath, outputPath, options: conversionOptions };
      }
    });

    if (parallel) {
      return Promise.all(conversions);
    } else {
      // Sequential processing for better error handling
      const results = [];
      for (let i = 0; i < conversions.length; i++) {
        const { filePath, outputPath, options: conversionOptions } = conversions[i];
        try {
          const result = await this.convertFile(filePath, outputPath, conversionOptions);
          results.push(result);
          if (progressCallback) {
            progressCallback(i + 1, filePaths.length, result);
          }
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            sourcePath: filePath,
            targetPath: outputPath
          });
        }
      }
      return results;
    }
  }

  /**
   * Validate conversion by roundtrip test
   * @param {string} content - Original content
   * @param {string} sourceFormat - Source format
   * @param {string} targetFormat - Target format
   * @returns {Promise<Object>} Validation result
   */
  async validateConversion(content, sourceFormat, targetFormat) {
    try {
      // Forward conversion
      const forward = await this.convert(content, sourceFormat, targetFormat, {
        validate: false,
        preserveMetadata: true
      });

      // Backward conversion
      const backward = await this.convert(
        forward.convertedContent,
        targetFormat,
        sourceFormat,
        { validate: false, preserveMetadata: true }
      );

      // Compare original and roundtrip result
      const originalSpec = forward.spec;
      const roundtripSpec = backward.spec;

      const differences = this.compareSpecs(originalSpec, roundtripSpec);

      return {
        isValid: differences.length === 0,
        differences,
        originalSpec,
        roundtripSpec,
        forwardConversion: forward,
        backwardConversion: backward
      };

    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        differences: [`Conversion failed: ${error.message}`]
      };
    }
  }

  /**
   * Compare two specification objects for differences
   * @private
   */
  compareSpecs(spec1, spec2, path = '') {
    const differences = [];
    const keys = new Set([...Object.keys(spec1), ...Object.keys(spec2)]);

    for (const key of keys) {
      const currentPath = path ? `${path}.${key}` : key;

      if (!(key in spec1)) {
        differences.push(`Missing in original: ${currentPath} = ${JSON.stringify(spec2[key])}`);
      } else if (!(key in spec2)) {
        differences.push(`Missing in converted: ${currentPath} = ${JSON.stringify(spec1[key])}`);
      } else if (typeof spec1[key] !== typeof spec2[key]) {
        differences.push(`Type difference at ${currentPath}: ${typeof spec1[key]} vs ${typeof spec2[key]}`);
      } else if (typeof spec1[key] === 'object' && spec1[key] !== null) {
        if (Array.isArray(spec1[key]) && Array.isArray(spec2[key])) {
          if (spec1[key].length !== spec2[key].length) {
            differences.push(`Array length difference at ${currentPath}: ${spec1[key].length} vs ${spec2[key].length}`);
          } else {
            for (let i = 0; i < spec1[key].length; i++) {
              differences.push(...this.compareSpecs(spec1[key][i], spec2[key][i], `${currentPath}[${i}]`));
            }
          }
        } else {
          differences.push(...this.compareSpecs(spec1[key], spec2[key], currentPath));
        }
      } else if (spec1[key] !== spec2[key]) {
        differences.push(`Value difference at ${currentPath}: ${JSON.stringify(spec1[key])} vs ${JSON.stringify(spec2[key])}`);
      }
    }

    return differences;
  }

  /**
   * Generate output path for converted file
   * @private
   */
  generateOutputPath(inputPath, options) {
    const { targetFormat, outputDir, outputExtension } = options;

    const inputDir = path.dirname(inputPath);
    const inputName = path.basename(inputPath, path.extname(inputPath));

    // Determine output directory
    const outputDirectory = outputDir || inputDir;

    // Determine output extension
    let extension = outputExtension;
    if (!extension) {
      const extensionMap = {
        json: 'json',
        yaml: 'yaml',
        markdown: 'md'
      };
      extension = extensionMap[targetFormat] || 'txt';
    }

    return path.join(outputDirectory, `${inputName}.${extension}`);
  }

  /**
   * Get format from file extension
   * @private
   */
  getFormatFromExtension(filePath) {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const extensionMap = {
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      markdown: 'markdown'
    };
    return extensionMap[ext] || 'markdown';
  }

  /**
   * Gather format-specific conversion warnings
   * @private
   */
  gatherConversionWarnings(sourceFormat, targetFormat, spec) {
    const warnings = [];

    // Warn about potential data loss
    if (sourceFormat === 'markdown' && (targetFormat === 'json' || targetFormat === 'yaml')) {
      if (spec.warnings && spec.warnings.length > 0) {
        warnings.push('Some markdown parsing warnings may affect structured format conversion');
      }
    }

    if ((sourceFormat === 'json' || sourceFormat === 'yaml') && targetFormat === 'markdown') {
      warnings.push('Complex nested structures may be simplified in markdown format');
    }

    return warnings;
  }

  /**
   * Check if file exists
   * @private
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   * @private
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // Specific conversion methods (can be customized for format-specific logic)

  async convertMarkdownToJson(content, options) {
    return this.convert(content, 'markdown', 'json', options);
  }

  async convertMarkdownToYaml(content, options) {
    return this.convert(content, 'markdown', 'yaml', options);
  }

  async convertJsonToMarkdown(content, options) {
    return this.convert(content, 'json', 'markdown', options);
  }

  async convertJsonToYaml(content, options) {
    return this.convert(content, 'json', 'yaml', options);
  }

  async convertYamlToMarkdown(content, options) {
    return this.convert(content, 'yaml', 'markdown', options);
  }

  async convertYamlToJson(content, options) {
    return this.convert(content, 'yaml', 'json', options);
  }

  /**
   * Get supported conversion paths
   * @returns {Object} Available conversion paths
   */
  getSupportedConversions() {
    return {
      markdown: ['json', 'yaml'],
      json: ['markdown', 'yaml'],
      yaml: ['markdown', 'json']
    };
  }

  /**
   * Get conversion statistics
   * @param {Array} results - Array of conversion results
   * @returns {Object} Conversion statistics
   */
  getConversionStats(results) {
    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      withWarnings: results.filter(r => r.warnings && r.warnings.length > 0).length,
      formats: {
        sources: [...new Set(results.map(r => r.sourceFormat))],
        targets: [...new Set(results.map(r => r.targetFormat))]
      }
    };
  }
}

module.exports = FormatConverter;