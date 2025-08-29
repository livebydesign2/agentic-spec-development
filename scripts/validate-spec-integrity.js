#!/usr/bin/env node

/**
 * Specification Integrity Validator - MAINT-003 TASK-004
 *
 * Comprehensive validation system for detecting and preventing:
 * - Duplicate specification IDs
 * - Invalid inter-specification references
 * - Broken dependency chains
 * - Inconsistent metadata
 * - File structure violations
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class SpecificationIntegrityValidator {
  constructor(projectPath = '.') {
    this.projectPath = path.resolve(projectPath);
    this.specsPath = path.join(this.projectPath, 'docs', 'specs');

    // Validation results tracking
    this.results = {
      duplicateIds: [],
      brokenReferences: [],
      invalidDependencies: [],
      structuralIssues: [],
      metadata: {
        totalSpecs: 0,
        uniqueIds: new Set(),
        duplicateCount: 0,
        brokenReferenceCount: 0,
        validSpecs: 0,
        errors: 0,
        warnings: 0,
      },
    };

    // Configuration
    this.validStatuses = ['active', 'backlog', 'done', 'archived'];
    this.validTypes = ['FEAT', 'BUG', 'SPEC', 'MAINT', 'SPIKE', 'RELEASE'];
    this.validPriorities = ['P0', 'P1', 'P2', 'P3'];

    // ID tracking for duplicate detection
    this.idRegistry = new Map(); // id -> [file paths...]
    this.specData = new Map(); // file path -> spec data
    this.references = new Map(); // spec id -> [referenced by specs...]
  }

  /**
   * Main validation entry point
   */
  async validateProject() {
    console.log(
      chalk.blue('🔍 Starting Specification Integrity Validation...\n')
    );

    try {
      // Phase 1: Scan and parse all specifications
      await this.scanSpecifications();

      // Phase 2: Detect duplicate IDs
      await this.detectDuplicateIds();

      // Phase 3: Validate references and dependencies
      await this.validateReferences();

      // Phase 4: Check structural integrity
      await this.validateStructure();

      // Phase 5: Generate comprehensive report
      this.generateReport();

      // Return exit code based on validation results
      return this.results.metadata.errors > 0 ? 1 : 0;
    } catch (error) {
      console.error(chalk.red(`❌ Validation failed: ${error.message}`));
      return 1;
    }
  }

  /**
   * Scan all specification files and parse frontmatter
   */
  async scanSpecifications() {
    console.log(chalk.blue('📁 Scanning specification files...'));

    const specFiles = await this.findSpecificationFiles();
    console.log(chalk.gray(`Found ${specFiles.length} specification files`));

    for (const filePath of specFiles) {
      try {
        const spec = await this.parseSpecification(filePath);
        if (spec) {
          this.specData.set(filePath, spec);
          this.results.metadata.totalSpecs++;

          // Register ID for duplicate detection
          if (spec.id) {
            if (!this.idRegistry.has(spec.id)) {
              this.idRegistry.set(spec.id, []);
            }
            this.idRegistry.get(spec.id).push(filePath);
            this.results.metadata.uniqueIds.add(spec.id);
          }
        }
      } catch (error) {
        this.addStructuralIssue(
          filePath,
          'parse_error',
          `Failed to parse: ${error.message}`
        );
      }
    }

    console.log(
      chalk.green(
        `✅ Scanned ${this.results.metadata.totalSpecs} specifications\n`
      )
    );
  }

  /**
   * Find all specification markdown files
   */
  async findSpecificationFiles() {
    const files = [];

    for (const status of this.validStatuses) {
      const statusDir = path.join(this.specsPath, status);

      try {
        const dirExists = await fs
          .access(statusDir)
          .then(() => true)
          .catch(() => false);
        if (dirExists) {
          const dirFiles = await fs.readdir(statusDir);
          for (const file of dirFiles) {
            if (file.endsWith('.md')) {
              files.push(path.join(statusDir, file));
            }
          }
        }
      } catch (error) {
        console.warn(
          chalk.yellow(`Warning: Cannot read directory ${statusDir}`)
        );
      }
    }

    return files;
  }

  /**
   * Parse specification file and extract metadata
   */
  async parseSpecification(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Extract frontmatter
    if (lines[0] !== '---') {
      throw new Error('Missing frontmatter delimiter');
    }

    let frontmatterEnd = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        frontmatterEnd = i;
        break;
      }
    }

    if (frontmatterEnd === -1) {
      throw new Error('Incomplete frontmatter');
    }

    const frontmatter = {};
    for (let i = 1; i < frontmatterEnd; i++) {
      const line = lines[i].trim();
      if (line && line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        // Handle different value types
        if (value.startsWith('[') && value.endsWith(']')) {
          // Array value
          frontmatter[key.trim()] = value
            .slice(1, -1)
            .split(',')
            .map((v) => v.trim().replace(/['"]/g, ''));
        } else if (value.startsWith('"') && value.endsWith('"')) {
          // String value
          frontmatter[key.trim()] = value.slice(1, -1);
        } else {
          // Plain value
          frontmatter[key.trim()] = value || null;
        }
      }
    }

    return {
      filePath,
      content,
      frontmatter,
      // Extract core fields for validation
      id: frontmatter.id,
      title: frontmatter.title,
      type: frontmatter.type,
      status: frontmatter.status,
      priority: frontmatter.priority,
      dependencies: frontmatter.dependencies || [],
      blocking: frontmatter.blocking || [],
      related: frontmatter.related || [],
      tasks: frontmatter.tasks || [],
    };
  }

  /**
   * Detect duplicate specification IDs
   */
  async detectDuplicateIds() {
    console.log(chalk.blue('🔍 Detecting duplicate IDs...'));

    for (const [id, files] of this.idRegistry) {
      if (files.length > 1) {
        this.results.duplicateIds.push({
          id,
          files: [...files],
          count: files.length,
        });
        this.results.metadata.duplicateCount++;
        this.addError(
          `Duplicate ID '${id}' found in ${files.length} files: ${files.join(
            ', '
          )}`
        );
      }
    }

    if (this.results.duplicateIds.length > 0) {
      console.log(
        chalk.red(
          `❌ Found ${this.results.duplicateIds.length} duplicate ID conflicts`
        )
      );
    } else {
      console.log(chalk.green('✅ No duplicate IDs found'));
    }
    console.log('');
  }

  /**
   * Validate all inter-specification references
   */
  async validateReferences() {
    console.log(chalk.blue('🔗 Validating inter-specification references...'));

    const allIds = new Set([...this.idRegistry.keys()]);

    for (const [filePath, spec] of this.specData) {
      // Validate dependencies
      if (spec.dependencies && Array.isArray(spec.dependencies)) {
        for (const depId of spec.dependencies) {
          if (!allIds.has(depId)) {
            this.addBrokenReference(filePath, spec.id, 'dependency', depId);
          } else {
            // Track reverse references
            if (!this.references.has(depId)) {
              this.references.set(depId, []);
            }
            this.references.get(depId).push(spec.id);
          }
        }
      }

      // Validate blocking references
      if (spec.blocking && Array.isArray(spec.blocking)) {
        for (const blockId of spec.blocking) {
          if (!allIds.has(blockId)) {
            this.addBrokenReference(filePath, spec.id, 'blocking', blockId);
          }
        }
      }

      // Validate related references
      if (spec.related && Array.isArray(spec.related)) {
        for (const relatedId of spec.related) {
          if (!allIds.has(relatedId)) {
            this.addBrokenReference(filePath, spec.id, 'related', relatedId);
          }
        }
      }

      // Validate task dependencies (if tasks have cross-spec dependencies)
      if (spec.tasks && Array.isArray(spec.tasks)) {
        for (const task of spec.tasks) {
          if (task.depends_on && Array.isArray(task.depends_on)) {
            for (const taskDep of task.depends_on) {
              // Check if it's a cross-spec dependency (contains spec ID)
              if (taskDep.includes('-') && !taskDep.startsWith('TASK-')) {
                const specId = taskDep.split('-').slice(0, 2).join('-');
                if (!allIds.has(specId)) {
                  this.addBrokenReference(
                    filePath,
                    spec.id,
                    'task_dependency',
                    taskDep
                  );
                }
              }
            }
          }
        }
      }
    }

    if (this.results.brokenReferences.length > 0) {
      console.log(
        chalk.red(
          `❌ Found ${this.results.brokenReferences.length} broken references`
        )
      );
    } else {
      console.log(chalk.green('✅ All references are valid'));
    }
    console.log('');
  }

  /**
   * Validate structural integrity
   */
  async validateStructure() {
    console.log(chalk.blue('🏗️  Validating structural integrity...'));

    for (const [filePath, spec] of this.specData) {
      // Validate required fields
      this.validateRequiredFields(filePath, spec);

      // Validate field formats
      this.validateFieldFormats(filePath, spec);

      // Validate file location matches status
      this.validateFileLocation(filePath, spec);

      // Validate ID matches filename
      this.validateIdFilenameMatch(filePath, spec);
    }

    if (this.results.structuralIssues.length > 0) {
      console.log(
        chalk.red(
          `❌ Found ${this.results.structuralIssues.length} structural issues`
        )
      );
    } else {
      console.log(chalk.green('✅ All specifications have valid structure'));
    }
    console.log('');
  }

  /**
   * Validate required fields are present
   */
  validateRequiredFields(filePath, spec) {
    const required = ['id', 'title', 'type', 'status', 'priority'];

    for (const field of required) {
      if (!spec[field]) {
        this.addStructuralIssue(
          filePath,
          'missing_required_field',
          `Missing required field: ${field}`
        );
      }
    }
  }

  /**
   * Validate field formats
   */
  validateFieldFormats(filePath, spec) {
    // Validate ID format
    if (spec.id) {
      const idPattern = new RegExp(`^(${this.validTypes.join('|')})-\\d{3}$`);
      if (!idPattern.test(spec.id)) {
        this.addStructuralIssue(
          filePath,
          'invalid_id_format',
          `Invalid ID format: ${spec.id}. Expected: TYPE-###`
        );
      }
    }

    // Validate type
    if (spec.type && !this.validTypes.includes(spec.type)) {
      this.addStructuralIssue(
        filePath,
        'invalid_type',
        `Invalid type: ${spec.type}. Valid types: ${this.validTypes.join(', ')}`
      );
    }

    // Validate status
    if (spec.status && !this.validStatuses.includes(spec.status)) {
      this.addStructuralIssue(
        filePath,
        'invalid_status',
        `Invalid status: ${
          spec.status
        }. Valid statuses: ${this.validStatuses.join(', ')}`
      );
    }

    // Validate priority
    if (spec.priority && !this.validPriorities.includes(spec.priority)) {
      this.addStructuralIssue(
        filePath,
        'invalid_priority',
        `Invalid priority: ${
          spec.priority
        }. Valid priorities: ${this.validPriorities.join(', ')}`
      );
    }
  }

  /**
   * Validate file location matches status
   */
  validateFileLocation(filePath, spec) {
    if (!spec.status) return;

    const expectedDir = path.join(this.specsPath, spec.status);
    const actualDir = path.dirname(filePath);

    if (actualDir !== expectedDir) {
      this.addStructuralIssue(
        filePath,
        'wrong_directory',
        `File is in ${path.basename(actualDir)} but status is '${spec.status}'`
      );
    }
  }

  /**
   * Validate ID matches filename
   */
  validateIdFilenameMatch(filePath, spec) {
    if (!spec.id) return;

    const filename = path.basename(filePath, '.md');
    const expectedPrefix = spec.id.toLowerCase();

    if (!filename.toLowerCase().startsWith(expectedPrefix)) {
      this.addStructuralIssue(
        filePath,
        'filename_mismatch',
        `Filename should start with '${expectedPrefix}' but is '${filename}'`
      );
    }
  }

  /**
   * Helper methods for tracking issues
   */
  addError(message) {
    this.results.metadata.errors++;
    console.error(chalk.red(`❌ ${message}`));
  }

  addWarning(message) {
    this.results.metadata.warnings++;
    console.warn(chalk.yellow(`⚠️  ${message}`));
  }

  addBrokenReference(filePath, specId, referenceType, targetId) {
    this.results.brokenReferences.push({
      filePath,
      specId,
      referenceType,
      targetId,
    });
    this.results.metadata.brokenReferenceCount++;
    this.addError(
      `Broken ${referenceType} reference in ${specId}: '${targetId}' does not exist`
    );
  }

  addStructuralIssue(filePath, issueType, message) {
    this.results.structuralIssues.push({
      filePath,
      issueType,
      message,
    });

    if (issueType.includes('missing') || issueType.includes('invalid')) {
      this.addError(`${path.basename(filePath)}: ${message}`);
    } else {
      this.addWarning(`${path.basename(filePath)}: ${message}`);
    }
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport() {
    console.log(chalk.blue('\n📊 SPECIFICATION INTEGRITY REPORT'));
    console.log(chalk.blue('===================================\n'));

    // Summary statistics
    console.log(chalk.bold('Summary Statistics:'));
    console.log(`  Total specifications: ${this.results.metadata.totalSpecs}`);
    console.log(`  Unique IDs: ${this.results.metadata.uniqueIds.size}`);
    console.log(
      `  Duplicate ID conflicts: ${this.results.metadata.duplicateCount}`
    );
    console.log(
      `  Broken references: ${this.results.metadata.brokenReferenceCount}`
    );
    console.log(`  Structural issues: ${this.results.structuralIssues.length}`);
    console.log(`  Errors: ${chalk.red(this.results.metadata.errors)}`);
    console.log(
      `  Warnings: ${chalk.yellow(this.results.metadata.warnings)}\n`
    );

    // Duplicate ID details
    if (this.results.duplicateIds.length > 0) {
      console.log(chalk.red('🚫 DUPLICATE ID CONFLICTS:'));
      for (const duplicate of this.results.duplicateIds) {
        console.log(
          chalk.red(`  ID: ${duplicate.id} (${duplicate.count} files)`)
        );
        for (const filePath of duplicate.files) {
          console.log(
            chalk.gray(`    - ${path.relative(this.projectPath, filePath)}`)
          );
        }
      }
      console.log('');
    }

    // Broken reference details
    if (this.results.brokenReferences.length > 0) {
      console.log(chalk.red('🔗 BROKEN REFERENCES:'));
      const groupedByType = {};
      for (const ref of this.results.brokenReferences) {
        if (!groupedByType[ref.referenceType]) {
          groupedByType[ref.referenceType] = [];
        }
        groupedByType[ref.referenceType].push(ref);
      }

      for (const [type, refs] of Object.entries(groupedByType)) {
        console.log(chalk.red(`  ${type.toUpperCase()} references:`));
        for (const ref of refs) {
          console.log(
            chalk.gray(
              `    ${ref.specId} → ${ref.targetId} (${path.basename(
                ref.filePath
              )})`
            )
          );
        }
      }
      console.log('');
    }

    // Overall result
    if (this.results.metadata.errors > 0) {
      console.log(chalk.red('❌ VALIDATION FAILED'));
      console.log(
        chalk.red(
          `Found ${this.results.metadata.errors} critical issues that must be resolved.`
        )
      );
    } else {
      console.log(chalk.green('✅ VALIDATION PASSED'));
      console.log(
        chalk.green('All specifications have valid structure and references.')
      );
    }

    if (this.results.metadata.warnings > 0) {
      console.log(
        chalk.yellow(
          `\n⚠️  ${this.results.metadata.warnings} warnings should be addressed.`
        )
      );
    }
  }

  /**
   * Generate JSON report for programmatic use
   */
  async generateJsonReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.metadata,
      issues: {
        duplicateIds: this.results.duplicateIds,
        brokenReferences: this.results.brokenReferences,
        structuralIssues: this.results.structuralIssues,
      },
      recommendations: this.generateRecommendations(),
    };

    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(chalk.blue(`📄 JSON report written to: ${outputPath}`));
  }

  /**
   * Generate fix recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Duplicate ID recommendations
    for (const duplicate of this.results.duplicateIds) {
      recommendations.push({
        type: 'duplicate_id',
        priority: 'critical',
        description: `Resolve duplicate ID conflict for '${duplicate.id}'`,
        action: `Renumber conflicting specifications to ensure unique IDs`,
        affectedFiles: duplicate.files,
      });
    }

    // Broken reference recommendations
    const brokenByType = {};
    for (const ref of this.results.brokenReferences) {
      if (!brokenByType[ref.referenceType]) {
        brokenByType[ref.referenceType] = [];
      }
      brokenByType[ref.referenceType].push(ref);
    }

    for (const [type, refs] of Object.entries(brokenByType)) {
      recommendations.push({
        type: 'broken_reference',
        priority: 'high',
        description: `Fix ${refs.length} broken ${type} reference(s)`,
        action: `Update or remove invalid ${type} references`,
        affectedSpecs: [...new Set(refs.map((r) => r.specId))],
      });
    }

    return recommendations;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const projectPath = args[0] || '.';
  const jsonOutput = args.includes('--json')
    ? args[args.indexOf('--json') + 1]
    : null;
  const fixMode = args.includes('--fix');

  console.log(chalk.blue('ASD Specification Integrity Validator'));
  console.log(
    chalk.gray('MAINT-003 TASK-004 - Preventing specification conflicts\n')
  );

  const validator = new SpecificationIntegrityValidator(projectPath);
  const exitCode = await validator.validateProject();

  // Generate JSON report if requested
  if (jsonOutput) {
    await validator.generateJsonReport(jsonOutput);
  }

  // Auto-fix mode (future implementation)
  if (fixMode) {
    console.log(chalk.yellow('\n🔧 Auto-fix mode is not yet implemented'));
    console.log(chalk.gray('Manual resolution required for detected issues'));
  }

  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}

module.exports = SpecificationIntegrityValidator;
