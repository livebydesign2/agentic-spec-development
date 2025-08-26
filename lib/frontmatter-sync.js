const fs = require("fs").promises;
const path = require("path");
const yaml = require("js-yaml");

/**
 * FrontmatterSync - Enhanced frontmatter update system for ASD workflow
 * 
 * Provides robust inline documentation updates with atomic operations,
 * validation, error recovery, and integration with WorkflowStateManager.
 * 
 * Features:
 * - Atomic file operations with backup/restore
 * - YAML frontmatter preservation and validation
 * - Deep nested property updates via dot notation
 * - Concurrent update protection
 * - Error recovery and rollback capabilities
 * - Performance tracking for <200ms target
 */
class FrontmatterSync {
  constructor(configManager = null) {
    this.configManager = configManager;
    this.performanceTarget = 200; // 200ms requirement for frontmatter updates
    
    // Track active operations to prevent concurrent updates
    this.activeOperations = new Set();
    
    // Backup directory for recovery
    this.backupDir = null;
    if (configManager) {
      this.backupDir = path.join(configManager.getProjectRoot(), ".asd", "backups");
    }
  }

  /**
   * Initialize the FrontmatterSync system
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    try {
      if (this.backupDir) {
        await fs.mkdir(this.backupDir, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error(`FrontmatterSync initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Update spec frontmatter with enhanced safety and validation
   * @param {string} specFilePath - Full path to spec file
   * @param {Object} updates - Updates to apply using dot notation
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Update result with performance metrics
   */
  async updateSpecFrontmatter(specFilePath, updates, options = {}) {
    const startTime = Date.now();
    const operationId = `${specFilePath}-${Date.now()}`;
    
    // Prevent concurrent updates to same file
    if (this.activeOperations.has(specFilePath)) {
      return {
        success: false,
        error: `Concurrent update prevented for ${specFilePath}`,
        performance: { total: Date.now() - startTime }
      };
    }

    this.activeOperations.add(specFilePath);

    try {
      // Validate file exists and is accessible
      await fs.access(specFilePath);
      
      // Read and parse current file
      const { frontmatter, content, originalContent } = await this.parseSpecFile(specFilePath);
      
      if (!frontmatter) {
        return {
          success: false,
          error: "No YAML frontmatter found in spec file",
          performance: { total: Date.now() - startTime }
        };
      }

      // Create backup before making changes
      const backupPath = await this.createBackup(specFilePath, originalContent, operationId);
      
      // Apply updates with validation
      const updatedFrontmatter = await this.applyUpdates(frontmatter, updates, options);
      
      // Validate updated frontmatter structure
      const validation = await this.validateFrontmatter(updatedFrontmatter, specFilePath);
      if (!validation.isValid) {
        await this.restoreFromBackup(specFilePath, backupPath);
        return {
          success: false,
          error: `Frontmatter validation failed: ${validation.errors.join(", ")}`,
          performance: { total: Date.now() - startTime }
        };
      }

      // Reconstruct file content with updated frontmatter
      const newContent = await this.reconstructFileContent(content, updatedFrontmatter);
      
      // Atomic write with validation
      await this.atomicWrite(specFilePath, newContent);
      
      // Cleanup backup on success
      if (backupPath && !options.keepBackup) {
        await this.cleanupBackup(backupPath);
      }

      const totalTime = Date.now() - startTime;
      if (totalTime > this.performanceTarget) {
        console.warn(`Frontmatter update took ${totalTime}ms, exceeding ${this.performanceTarget}ms target`);
      }

      return {
        success: true,
        updated_properties: Object.keys(updates),
        backup_path: backupPath,
        performance: { 
          total: totalTime,
          target: this.performanceTarget,
          within_target: totalTime <= this.performanceTarget
        }
      };

    } catch (error) {
      // Attempt recovery if backup exists
      const backupPath = this.getBackupPath(specFilePath, operationId);
      try {
        if (backupPath && await this.fileExists(backupPath)) {
          await this.restoreFromBackup(specFilePath, backupPath);
        }
      } catch (recoveryError) {
        console.error(`Recovery failed: ${recoveryError.message}`);
      }

      return {
        success: false,
        error: `Frontmatter update failed: ${error.message}`,
        performance: { total: Date.now() - startTime }
      };
    } finally {
      this.activeOperations.delete(specFilePath);
    }
  }

  /**
   * Batch update multiple spec files with transaction-like behavior
   * @param {Array} updates - Array of {filePath, updates} objects
   * @param {Object} options - Batch operation options
   * @returns {Promise<Object>} Batch update results
   */
  async batchUpdateSpecs(updates, options = {}) {
    const startTime = Date.now();
    const results = [];
    const backups = [];
    let allSuccessful = true;

    try {
      // Create backups for all files first
      for (const update of updates) {
        const { filePath } = update;
        const originalContent = await fs.readFile(filePath, "utf-8");
        const backupPath = await this.createBackup(filePath, originalContent, `batch-${Date.now()}`);
        backups.push({ filePath, backupPath });
      }

      // Apply updates
      for (let i = 0; i < updates.length; i++) {
        const { filePath, updates: fileUpdates } = updates[i];
        const result = await this.updateSpecFrontmatter(filePath, fileUpdates, { 
          ...options, 
          keepBackup: true // Keep backups until batch is complete
        });
        
        results.push({
          filePath,
          ...result
        });

        if (!result.success) {
          allSuccessful = false;
          if (options.stopOnFirstError) {
            break;
          }
        }
      }

      // If any failed and rollbackOnError is true, restore all from backups
      if (!allSuccessful && options.rollbackOnError) {
        for (const { filePath, backupPath } of backups) {
          try {
            await this.restoreFromBackup(filePath, backupPath);
          } catch (error) {
            console.error(`Failed to restore ${filePath} from backup: ${error.message}`);
          }
        }
      }

      // Cleanup backups if successful or rollback is not requested
      if (allSuccessful || !options.rollbackOnError) {
        for (const { backupPath } of backups) {
          await this.cleanupBackup(backupPath);
        }
      }

      return {
        success: allSuccessful,
        total_files: updates.length,
        successful_updates: results.filter(r => r.success).length,
        failed_updates: results.filter(r => !r.success).length,
        results,
        performance: { 
          total: Date.now() - startTime,
          average_per_file: (Date.now() - startTime) / updates.length
        }
      };

    } catch (error) {
      // Restore all files from backups
      for (const { filePath, backupPath } of backups) {
        try {
          await this.restoreFromBackup(filePath, backupPath);
        } catch (recoveryError) {
          console.error(`Failed to restore ${filePath}: ${recoveryError.message}`);
        }
      }

      return {
        success: false,
        error: `Batch update failed: ${error.message}`,
        results,
        performance: { total: Date.now() - startTime }
      };
    }
  }

  /**
   * Parse spec file and extract frontmatter and content
   * @param {string} filePath - Path to spec file
   * @returns {Promise<Object>} Parsed frontmatter and content
   */
  async parseSpecFile(filePath) {
    const originalContent = await fs.readFile(filePath, "utf-8");
    
    // Match YAML frontmatter
    const frontmatterMatch = originalContent.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      return {
        frontmatter: null,
        content: originalContent,
        originalContent
      };
    }

    try {
      const frontmatter = yaml.load(frontmatterMatch[1]) || {};
      return {
        frontmatter,
        content: originalContent,
        originalContent
      };
    } catch (error) {
      throw new Error(`Invalid YAML frontmatter in ${filePath}: ${error.message}`);
    }
  }

  /**
   * Apply updates to frontmatter with dot notation support
   * @param {Object} frontmatter - Current frontmatter object
   * @param {Object} updates - Updates to apply
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated frontmatter
   */
  async applyUpdates(frontmatter, updates, options = {}) {
    const updatedFrontmatter = JSON.parse(JSON.stringify(frontmatter)); // Deep clone

    for (const [updatePath, value] of Object.entries(updates)) {
      this.setNestedProperty(updatedFrontmatter, updatePath, value);
    }

    // Always update last_updated timestamp unless explicitly disabled
    if (options.updateTimestamp !== false) {
      updatedFrontmatter.last_updated = new Date().toISOString();
    }

    return updatedFrontmatter;
  }

  /**
   * Validate frontmatter structure and required fields
   * @param {Object} frontmatter - Frontmatter to validate
   * @param {string} filePath - File path for context
   * @returns {Promise<Object>} Validation result
   */
  async validateFrontmatter(frontmatter, filePath) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Required fields validation
    const requiredFields = ["id", "title", "type", "status"];
    for (const field of requiredFields) {
      if (!frontmatter[field]) {
        validation.errors.push(`Missing required field: ${field}`);
        validation.isValid = false;
      }
    }

    // Type validation
    if (frontmatter.type && !["FEAT", "BUG", "SPIKE", "MAINT", "RELEASE"].includes(frontmatter.type)) {
      validation.warnings.push(`Unusual type: ${frontmatter.type}`);
    }

    // Status validation
    if (frontmatter.status && !["active", "backlog", "done", "blocked"].includes(frontmatter.status)) {
      validation.warnings.push(`Unusual status: ${frontmatter.status}`);
    }

    // Priority validation
    if (frontmatter.priority && !["P0", "P1", "P2", "P3"].includes(frontmatter.priority)) {
      validation.warnings.push(`Unusual priority: ${frontmatter.priority}`);
    }

    // Tasks structure validation
    if (frontmatter.tasks && Array.isArray(frontmatter.tasks)) {
      for (let i = 0; i < frontmatter.tasks.length; i++) {
        const task = frontmatter.tasks[i];
        if (!task.id || !task.title) {
          validation.errors.push(`Task ${i} missing required fields (id, title)`);
          validation.isValid = false;
        }
      }
    }

    return validation;
  }

  /**
   * Reconstruct file content with updated frontmatter
   * @param {string} originalContent - Original file content
   * @param {Object} frontmatter - Updated frontmatter
   * @returns {Promise<string>} New file content
   */
  async reconstructFileContent(originalContent, frontmatter) {
    // Generate updated YAML frontmatter
    const yamlContent = yaml.dump(frontmatter, { 
      indent: 2,
      lineWidth: -1, // Disable line wrapping
      quotingType: '"',
      forceQuotes: false
    });

    // Replace the frontmatter section
    const newContent = originalContent.replace(
      /^---\n[\s\S]*?\n---/,
      `---\n${yamlContent}---`
    );

    return newContent;
  }

  /**
   * Create backup of file before making changes
   * @param {string} filePath - Original file path
   * @param {string} content - File content to backup
   * @param {string} operationId - Unique operation identifier
   * @returns {Promise<string>} Backup file path
   */
  async createBackup(filePath, content, operationId) {
    if (!this.backupDir) {
      return null;
    }

    const filename = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // Clean operation ID to avoid path issues
    const cleanOperationId = operationId.replace(/[^a-zA-Z0-9-]/g, "");
    const backupFilename = `${filename}.${timestamp}.${cleanOperationId}.backup`;
    const backupPath = path.join(this.backupDir, backupFilename);

    await fs.writeFile(backupPath, content, "utf-8");
    return backupPath;
  }

  /**
   * Restore file from backup
   * @param {string} filePath - Target file path
   * @param {string} backupPath - Backup file path
   * @returns {Promise<void>}
   */
  async restoreFromBackup(filePath, backupPath) {
    if (await this.fileExists(backupPath)) {
      const backupContent = await fs.readFile(backupPath, "utf-8");
      await fs.writeFile(filePath, backupContent, "utf-8");
    }
  }

  /**
   * Get backup path for operation
   * @param {string} filePath - Original file path
   * @param {string} operationId - Operation identifier
   * @returns {string} Backup path
   */
  getBackupPath(filePath, operationId) {
    if (!this.backupDir) {
      return null;
    }
    const filename = path.basename(filePath);
    const cleanOperationId = operationId.replace(/[^a-zA-Z0-9-]/g, "");
    return path.join(this.backupDir, `${filename}.${cleanOperationId}.backup`);
  }

  /**
   * Cleanup backup file
   * @param {string} backupPath - Backup file path
   * @returns {Promise<void>}
   */
  async cleanupBackup(backupPath) {
    try {
      if (backupPath && await this.fileExists(backupPath)) {
        await fs.unlink(backupPath);
      }
    } catch (error) {
      console.warn(`Failed to cleanup backup ${backupPath}: ${error.message}`);
    }
  }

  /**
   * Atomic write operation to prevent file corruption
   * @param {string} filePath - Target file path
   * @param {string} content - Content to write
   * @returns {Promise<void>}
   */
  async atomicWrite(filePath, content) {
    const tempPath = `${filePath}.tmp`;
    
    try {
      await fs.writeFile(tempPath, content, "utf-8");
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw error;
    }
  }

  /**
   * Set nested property using dot notation
   * @param {Object} obj - Target object
   * @param {string} path - Property path (e.g., "tasks.0.status")
   * @param {*} value - Value to set
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split(".");
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
        // Handle array indices
        if (!isNaN(parseInt(keys[i + 1]))) {
          current[key] = [];
        } else {
          current[key] = {};
        }
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>}
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
   * Get active operations count for monitoring
   * @returns {number} Number of active operations
   */
  getActiveOperationsCount() {
    return this.activeOperations.size;
  }

  /**
   * Clear all active operations (use with caution)
   */
  clearActiveOperations() {
    this.activeOperations.clear();
  }
}

module.exports = FrontmatterSync;