#!/usr/bin/env node

/**
 * Specification Integrity Validator
 * Ensures no duplicate IDs exist and all references are valid
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SPEC_DIRS = [
  'docs/specs/active',
  'docs/specs/backlog',
  'docs/specs/done',
];

class SpecificationValidator {
  constructor() {
    this.specs = new Map();
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Main validation entry point
   */
  async validate() {
    console.log('🔍 Validating specification integrity...\n');

    // Load all specifications
    await this.loadSpecifications();

    // Run validation checks
    this.checkDuplicateIDs();
    this.checkReferences();
    this.checkNamingConventions();
    this.checkFrontmatter();

    // Report results
    this.reportResults();

    // Exit with error if validation failed
    if (this.errors.length > 0) {
      process.exit(1);
    }
  }

  /**
   * Parse frontmatter from markdown file
   */
  parseFrontmatter(content) {
    const lines = content.split('\n');
    if (lines[0] !== '---') {
      return { data: {}, body: content };
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return { data: {}, body: content };
    }

    const frontmatterText = lines.slice(1, endIndex).join('\n');
    const body = lines.slice(endIndex + 1).join('\n');

    try {
      const data = yaml.load(frontmatterText) || {};
      return { data, body };
    } catch (error) {
      console.error(`Failed to parse YAML frontmatter: ${error.message}`);
      return { data: {}, body };
    }
  }

  /**
   * Load all specification files
   */
  async loadSpecifications() {
    for (const dir of SPEC_DIRS) {
      const fullDir = path.join(process.cwd(), dir);

      if (!fs.existsSync(fullDir)) {
        console.warn(`Directory not found: ${dir}`);
        continue;
      }

      const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.md'));

      for (const file of files) {
        const filePath = path.join(fullDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { data, body } = this.parseFrontmatter(content);

        if (!data.id) {
          // Try to extract ID from filename
          const match = file.match(/^(FEAT|BUG|MAINT|SPIKE|PERF|DOC)-\d{3}/);
          if (match) {
            data.id = match[0];
            this.warnings.push(
              `Missing ID in frontmatter, using filename: ${file}`
            );
          } else {
            this.errors.push(`Missing ID in frontmatter and filename: ${file}`);
            continue;
          }
        }

        if (this.specs.has(data.id)) {
          const existing = this.specs.get(data.id);
          this.errors.push(
            `Duplicate ID '${data.id}' found:\n` +
              `  - ${existing.file}\n` +
              `  - ${filePath}`
          );
        } else {
          this.specs.set(data.id, {
            file: filePath,
            data,
            body,
            dir: path.dirname(filePath),
          });
        }
      }
    }

    console.log(`📚 Loaded ${this.specs.size} specifications\n`);
  }

  /**
   * Check for duplicate specification IDs
   */
  checkDuplicateIDs() {
    // Already handled during loading
    // This method is for additional ID format validation

    const idPattern = /^(FEAT|BUG|MAINT|SPIKE|PERF|DOC)-\d{3}$/;

    for (const [id, spec] of this.specs) {
      if (!idPattern.test(id)) {
        this.warnings.push(
          `Non-standard ID format '${id}' in ${spec.file}\n` +
            `  Expected format: TYPE-XXX (e.g., FEAT-001)`
        );
      }
    }
  }

  /**
   * Check all inter-specification references
   */
  checkReferences() {
    const refPattern = /\b(FEAT|BUG|MAINT|SPIKE|PERF|DOC)-\d{3}\b/g;

    for (const [id, spec] of this.specs) {
      const matches = spec.body.match(refPattern) || [];

      for (const ref of matches) {
        if (ref === id) continue; // Skip self-references

        if (!this.specs.has(ref)) {
          this.errors.push(
            `Invalid reference '${ref}' in ${spec.file}\n` +
              `  Referenced specification does not exist`
          );
        }
      }

      // Check task dependencies
      if (spec.data.tasks) {
        for (const task of spec.data.tasks) {
          if (task.depends_on) {
            for (const dep of task.depends_on) {
              // Validate task dependencies exist within same spec
              const depTask = spec.data.tasks.find((t) => t.id === dep);
              if (!depTask) {
                this.errors.push(
                  `Invalid task dependency '${dep}' in ${spec.file}\n` +
                    `  Task ${task.id} depends on non-existent task`
                );
              }
            }
          }
        }
      }
    }
  }

  /**
   * Check file naming conventions match IDs
   */
  checkNamingConventions() {
    for (const [id, spec] of this.specs) {
      const actualFileName = path.basename(spec.file);

      // Check if filename starts with the ID
      if (!actualFileName.toLowerCase().startsWith(id.toLowerCase())) {
        this.errors.push(
          `File naming mismatch for ${id}:\n` +
            `  File: ${actualFileName}\n` +
            `  Expected to start with: ${id.toLowerCase()}`
        );
      }
    }
  }

  /**
   * Check required frontmatter fields
   */
  checkFrontmatter() {
    const requiredFields = ['id', 'title', 'type', 'status', 'priority'];
    const validStatuses = ['draft', 'active', 'done', 'blocked', 'archived'];
    const validPriorities = ['P0', 'P1', 'P2', 'P3'];
    const validTypes = ['FEAT', 'BUG', 'MAINT', 'SPIKE', 'PERF', 'DOC'];

    for (const [id, spec] of this.specs) {
      // Check required fields
      for (const field of requiredFields) {
        if (!spec.data[field]) {
          this.errors.push(`Missing required field '${field}' in ${spec.file}`);
        }
      }

      // Validate status
      if (spec.data.status && !validStatuses.includes(spec.data.status)) {
        this.warnings.push(
          `Invalid status '${spec.data.status}' in ${spec.file}\n` +
            `  Valid statuses: ${validStatuses.join(', ')}`
        );
      }

      // Validate priority
      if (spec.data.priority && !validPriorities.includes(spec.data.priority)) {
        this.warnings.push(
          `Invalid priority '${spec.data.priority}' in ${spec.file}\n` +
            `  Valid priorities: ${validPriorities.join(', ')}`
        );
      }

      // Validate type
      if (spec.data.type && !validTypes.includes(spec.data.type)) {
        this.warnings.push(
          `Invalid type '${spec.data.type}' in ${spec.file}\n` +
            `  Valid types: ${validTypes.join(', ')}`
        );
      }

      // Check status matches directory
      const dir = path.basename(spec.dir);
      if (dir === 'active' && spec.data.status === 'done') {
        this.errors.push(
          `Status mismatch in ${spec.file}:\n` +
            `  Status is 'done' but file is in 'active' directory`
        );
      }
      if (dir === 'done' && spec.data.status === 'active') {
        this.errors.push(
          `Status mismatch in ${spec.file}:\n` +
            `  Status is 'active' but file is in 'done' directory`
        );
      }
    }
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('═'.repeat(60));
    console.log('VALIDATION RESULTS');
    console.log('═'.repeat(60));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All specifications valid!\n');
      console.log('Summary:');
      console.log(`  • ${this.specs.size} specifications validated`);
      console.log('  • No duplicate IDs found');
      console.log('  • All references valid');
      console.log('  • Naming conventions followed');
      console.log('  • Frontmatter complete\n');
    } else {
      if (this.errors.length > 0) {
        console.log('\n❌ ERRORS FOUND:\n');
        this.errors.forEach((error, i) => {
          console.log(`${i + 1}. ${error}\n`);
        });
      }

      if (this.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:\n');
        this.warnings.forEach((warning, i) => {
          console.log(`${i + 1}. ${warning}\n`);
        });
      }

      console.log('Summary:');
      console.log(`  • ${this.specs.size} specifications checked`);
      console.log(`  • ${this.errors.length} errors found`);
      console.log(`  • ${this.warnings.length} warnings found\n`);
    }
  }
}

// Run validator if called directly
if (require.main === module) {
  const validator = new SpecificationValidator();
  validator.validate().catch((error) => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = SpecificationValidator;
