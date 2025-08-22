const path = require('path');
const ConfigManager = require('../../lib/config-manager');
const SpecParser = require('../../lib/feature-parser');

describe('Backwards Compatibility Tests', () => {
  let testDir;
  let configManager;
  let specParser;

  beforeEach(() => {
    testDir = global.TEST_DIR;
    global.setupTestDir();

    configManager = new ConfigManager(testDir);
    specParser = new SpecParser(configManager);
  });

  afterEach(() => {
    global.cleanupTestDir();
  });

  describe('Campfire Feature Format Support', () => {
    beforeEach(async () => {
      // Create legacy Campfire project structure
      await createCampfireProjectStructure();
    });

    async function createCampfireProjectStructure() {
      // Legacy roadmap configuration
      const legacyConfig = {
        featuresPath: 'docs/product/features',
        templatePath: 'docs/product/features/template',
        enforceSpec: false,
        supportedTypes: ['FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE']
      };

      global.createTestFile('.roadmaprc.json', JSON.stringify(legacyConfig, null, 2));

      // Create legacy feature files in Campfire format
      const legacyFeatures = [
        {
          path: 'docs/product/features/active/FEAT-040-attachments.md',
          content: `# FEAT-040: Universal Attachment System

**Priority:** P1

## Description

Implement a universal attachment system that allows users to attach files to any entity in the system (setups, trips, gear reviews, etc.).

## Problem Statement

Currently, file attachments are scattered across different parts of the system with no unified approach. This creates inconsistencies and makes it difficult to manage file uploads.

## Solution Approach

Create a unified attachment service with consistent APIs, storage management, and security policies.

## Implementation Tasks

### **TASK-001** 🤖 **Database Schema Design** | Agent: Database-Engineer

Create database tables for universal attachments:
- attachments table with polymorphic relationships
- file metadata and versioning support
- proper indexing for performance

### **✅ TASK-002** 🤖 **Storage Service Implementation** | Agent: Backend-Developer

Completed storage service with:
- Multi-provider support (local, S3, etc.)
- File type validation
- Size limits and compression

### **🔄 TASK-003** 🤖 **API Endpoints** | Agent: Backend-Developer

- [x] Upload endpoint with progress tracking
- [x] Download endpoint with access control  
- [ ] Batch operations API
- [ ] Metadata management API

### **⏳ TASK-004** 🤖 **Frontend Components** | Agent: Frontend-Developer

Universal attachment components for all entities.

## Required Reading

- docs/architecture/storage-design.md
- docs/security/file-upload-policies.md

## Testing Checklist

- [ ] Unit tests for attachment service
- [ ] Integration tests with all entity types
- [ ] Security testing for file uploads
- [ ] Performance testing with large files`
        },
        {
          path: 'docs/product/features/backlog/FEAT-041-social-features.md',
          content: `# FEAT-041: Social Features and Community

**Priority:** P2

## Description

Add social features to enable community interaction around outdoor gear and trip sharing.

## Implementation Tasks

### **TASK-001** 🤖 **User Following System** | Agent: Backend-Developer

Implement user-to-user following relationships.

### **TASK-002** 🤖 **Activity Feed** | Agent: Backend-Developer

Create activity feed showing followed users' activities.

### **TASK-003** 🤖 **Comments and Reactions** | Agent: Frontend-Developer

Add commenting and reaction system to setups and trips.`
        },
        {
          path: 'docs/product/features/done/FEAT-039-gear-database.md',
          content: `# FEAT-039: Comprehensive Gear Database

**Priority:** P1

## Description

Build a comprehensive gear database with specifications, reviews, and pricing information.

## Implementation Tasks

### **✅ TASK-001** 🤖 **Database Schema**

Completed gear catalog schema with:
- Hierarchical categories
- Technical specifications
- Manufacturer information

### **✅ TASK-002** 🤖 **API Development**

Completed gear search and filtering APIs.

### **✅ TASK-003** 🤖 **Admin Interface**

Completed gear management interface for administrators.`
        },
        {
          path: 'docs/product/features/active/BUG-020-performance-issues.md',
          content: `# BUG-020: Database Performance Issues

**Priority:** P0
**Severity:** High

## Description

Database queries are becoming slow as data volume grows, affecting user experience.

## Reproduction Steps

1. Navigate to gear search page
2. Apply multiple filters
3. Observe slow response times (>5 seconds)

## Root Cause Analysis

Missing database indexes on frequently queried columns, especially in gear_items and setups tables.

## Proposed Solution

Add strategic indexes and optimize query patterns.

## Environment

- Database: PostgreSQL 14
- Node.js: 18.x
- Production load: 10k+ users

## Bugfix Tasks

### **🔴 TASK-001** 🤖 **Index Analysis** | Agent: Database-Engineer

Analyze query patterns and identify missing indexes.

### **⏳ TASK-002** 🤖 **Index Implementation** | Agent: Database-Engineer

Create database migration with optimized indexes.

### **TASK-003** 🤖 **Query Optimization** | Agent: Backend-Developer

Optimize application-level queries and add caching.`
        },
        {
          path: 'docs/product/features/backlog/SPIKE-010-mobile-strategy.md',
          content: `# SPIKE-010: Mobile Application Strategy

**Priority:** P2
**Research Type:** Strategic Analysis

## Description

Research and recommend mobile application strategy for Campfire platform.

### **Research Question**

Should we build native mobile apps, use React Native, or focus on progressive web app (PWA) approach?

### **Success Criteria**

- [ ] Analyze user mobile usage patterns
- [ ] Compare development approaches
- [ ] Estimate development costs and timelines
- [ ] Recommend optimal strategy

## Tasks

### **TASK-001** 🤖 **User Research** | Agent: Product-Manager

Conduct user research on mobile usage patterns.

### **TASK-002** 🤖 **Technical Analysis** | Agent: Mobile-Developer

Compare native vs React Native vs PWA approaches.

### **TASK-003** 🤖 **Strategic Recommendation** | Agent: Product-Manager

Synthesize findings into strategic recommendation.`
        },
        {
          path: 'docs/product/features/active/MAINT-005-security-updates.md',
          content: `# MAINT-005: Q1 Security Updates and Hardening

**Priority:** P1

## Description

Quarterly security maintenance including dependency updates, vulnerability patches, and security hardening.

## Maintenance Tasks

### **✅ TASK-001** 🤖 **Dependency Audit** | Agent: DevOps-Engineer

Completed security audit of all dependencies:
- Updated 15 packages with security vulnerabilities
- Resolved 3 critical and 7 high-severity issues

### **🔄 TASK-002** 🤖 **Authentication Hardening** | Agent: Security-Engineer

- [x] Implement rate limiting on auth endpoints
- [x] Add MFA support for admin accounts
- [ ] Update password policies
- [ ] Add session timeout configuration

### **⏳ TASK-003** 🤖 **Infrastructure Security** | Agent: DevOps-Engineer

Harden production infrastructure configuration.

### **TASK-004** 🤖 **Security Documentation** | Agent: Security-Engineer

Update security policies and incident response procedures.`
        }
      ];

      for (const feature of legacyFeatures) {
        global.createTestFile(feature.path, feature.content);
      }
    }

    it('should load legacy Campfire features using legacy configuration', async () => {
      await specParser.loadFeatures();

      const features = specParser.getFeatures(); // Use legacy method name

      expect(features.length).toBe(6);

      // Verify feature IDs
      const featureIds = features.map(f => f.id);
      expect(featureIds).toContain('FEAT-040');
      expect(featureIds).toContain('FEAT-041');
      expect(featureIds).toContain('FEAT-039');
      expect(featureIds).toContain('BUG-020');
      expect(featureIds).toContain('SPIKE-010');
      expect(featureIds).toContain('MAINT-005');
    });

    it('should parse legacy task formats correctly', async () => {
      await specParser.loadFeatures();

      const features = specParser.getFeatures();
      const feat040 = features.find(f => f.id === 'FEAT-040');

      expect(feat040).toBeDefined();
      expect(feat040.tasks).toHaveLength(4);

      // Check different task status formats
      expect(feat040.tasks[0].status).toBe('ready'); // No emoji prefix
      expect(feat040.tasks[1].status).toBe('complete'); // ✅ prefix
      expect(feat040.tasks[2].status).toBe('in_progress'); // 🔄 prefix
      expect(feat040.tasks[3].status).toBe('ready'); // ⏳ prefix

      // Check agent assignments
      expect(feat040.tasks[0].assigneeRole).toBe('Database-Engineer');
      expect(feat040.tasks[1].assigneeRole).toBe('Backend-Developer');
    });

    it('should handle legacy subtask formats', async () => {
      await specParser.loadFeatures();

      const features = specParser.getFeatures();
      const feat040 = features.find(f => f.id === 'FEAT-040');

      // Check subtasks in TASK-003
      const task003 = feat040.tasks.find(t => t.id === 'TASK-003');
      expect(task003.subtasks).toHaveLength(4);

      // Check completion status
      expect(task003.subtasks[0].completed).toBe(true);
      expect(task003.subtasks[1].completed).toBe(true);
      expect(task003.subtasks[2].completed).toBe(false);
      expect(task003.subtasks[3].completed).toBe(false);
    });

    it('should parse legacy bug format with specific fields', async () => {
      await specParser.loadFeatures();

      const features = specParser.getFeatures();
      const bug020 = features.find(f => f.id === 'BUG-020');

      expect(bug020.type).toBe('BUG');
      expect(bug020.bugSeverity).toBe('High');
      expect(bug020.reproductionSteps).toHaveLength(3);
      expect(bug020.rootCause).toContain('Missing database indexes');
      expect(bug020.proposedSolution).toContain('Add strategic indexes');
      expect(bug020.environment).toContain('PostgreSQL 14');
    });

    it('should parse legacy spike format with research fields', async () => {
      await specParser.loadFeatures();

      const features = specParser.getFeatures();
      const spike010 = features.find(f => f.id === 'SPIKE-010');

      expect(spike010.type).toBe('SPIKE');
      expect(spike010.researchType).toBe('Strategic Analysis');
      expect(spike010.researchQuestion).toContain('mobile application strategy');
      expect(spike010.researchFindings).toHaveLength(4);
    });

    it('should handle maintenance task format', async () => {
      await specParser.loadFeatures();

      const features = specParser.getFeatures();
      const maint005 = features.find(f => f.id === 'MAINT-005');

      expect(maint005.type).toBe('MAINT');
      expect(maint005.title).toContain('Security Updates');
      expect(maint005.tasks).toHaveLength(4);

      // Check mixed task status in maintenance tasks
      const taskStatuses = maint005.tasks.map(t => t.status);
      expect(taskStatuses).toContain('complete');
      expect(taskStatuses).toContain('in_progress');
      expect(taskStatuses).toContain('ready');
    });

    it('should support both new and legacy method names', async () => {
      await specParser.loadFeatures();

      // New method names
      const specs = specParser.getSpecs();
      const specsByStatus = specParser.getSpecsByStatus('active');
      const specsByPriority = specParser.getSpecsByPriority('P1');

      // Legacy method names (should return same data)
      const features = specParser.getFeatures();
      const featuresByStatus = specParser.getFeaturesByStatus('active');
      const featuresByPriority = specParser.getFeaturesByPriority('P1');

      expect(specs).toEqual(features);
      expect(specsByStatus).toEqual(featuresByStatus);
      expect(specsByPriority).toEqual(featuresByPriority);
    });

    it('should parse required reading sections', async () => {
      await specParser.loadFeatures();

      const features = specParser.getFeatures();
      const feat040 = features.find(f => f.id === 'FEAT-040');

      expect(feat040.requiredDocs).toHaveLength(2);
      expect(feat040.requiredDocs).toContain('docs/architecture/storage-design.md');
      expect(feat040.requiredDocs).toContain('docs/security/file-upload-policies.md');
    });
  });

  describe('Legacy Configuration Support', () => {
    it('should load configuration from .roadmaprc.json', async () => {
      const legacyConfig = {
        featuresPath: 'legacy/features',
        templatePath: 'legacy/template',
        autoRefresh: false,
        supportedTypes: ['FEAT', 'BUG', 'EPIC']
      };

      global.createTestFile('.roadmaprc.json', JSON.stringify(legacyConfig, null, 2));

      const config = configManager.loadConfig();

      expect(config.featuresPath).toContain('legacy/features');
      expect(config.templatePath).toContain('legacy/template');
      expect(config.autoRefresh).toBe(false);
      expect(config.supportedTypes).toEqual(['FEAT', 'BUG', 'EPIC']);
    });

    it('should load configuration from .roadmaprc.js', async () => {
      const legacyConfigContent = `
        module.exports = {
          featuresPath: 'roadmap/features',
          enforceSpec: true,
          priorities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        };
      `;

      global.createTestFile('.roadmaprc.js', legacyConfigContent);

      const config = configManager.loadConfig();

      expect(config.featuresPath).toContain('roadmap/features');
      expect(config.enforceSpec).toBe(true);
      expect(config.priorities).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    });

    it('should load configuration from roadmap.config.js', async () => {
      const legacyConfigContent = `
        module.exports = {
          featuresPath: 'src/features',
          statusFolders: ['todo', 'doing', 'done'],
          defaultPriority: 'MEDIUM'
        };
      `;

      global.createTestFile('roadmap.config.js', legacyConfigContent);

      const config = configManager.loadConfig();

      expect(config.featuresPath).toContain('src/features');
      expect(config.statusFolders).toEqual(['todo', 'doing', 'done']);
      expect(config.defaultPriority).toBe('MEDIUM');
    });

    it('should prioritize new ASD config over legacy roadmap config', async () => {
      // Create both legacy and new configs
      const legacyConfig = {
        featuresPath: 'legacy/path',
        autoRefresh: false
      };

      const newConfig = `
        module.exports = {
          featuresPath: 'new/path',
          autoRefresh: true
        };
      `;

      global.createTestFile('.roadmaprc.json', JSON.stringify(legacyConfig, null, 2));
      global.createTestFile('asd.config.js', newConfig);

      const config = configManager.loadConfig();

      // Should use new config
      expect(config.featuresPath).toContain('new/path');
      expect(config.autoRefresh).toBe(true);
    });
  });

  describe('Mixed Format Support', () => {
    it('should handle projects with both SPEC and FEAT formats', async () => {
      // Create mixed format project
      const mixedFeatures = [
        {
          path: 'docs/specs/active/SPEC-001-new-format.md',
          content: `# New Specification Format
**Priority:** P1

## Description
This uses the new SPEC format.

## Tasks
### **TASK-001** 🤖 **Implementation**
New format task.`
        },
        {
          path: 'docs/specs/active/FEAT-100-legacy-format.md',
          content: `# FEAT-100: Legacy Feature Format
**Priority:** P1

## Description
This uses the legacy FEAT format.

## Implementation Tasks
### **TASK-001** 🤖 **Implementation** | Agent: Developer
Legacy format task.`
        }
      ];

      for (const feature of mixedFeatures) {
        global.createTestFile(feature.path, feature.content);
      }

      await specParser.loadFeatures();

      const specs = specParser.getSpecs();

      expect(specs).toHaveLength(2);

      const spec001 = specs.find(s => s.id === 'SPEC-001');
      const feat100 = specs.find(s => s.id === 'FEAT-100');

      expect(spec001.type).toBe('SPEC');
      expect(feat100.type).toBe('FEAT');

      // Both should have tasks parsed correctly
      expect(spec001.tasks).toHaveLength(1);
      expect(feat100.tasks).toHaveLength(1);
    });

    it('should handle different task section headers', async () => {
      const features = [
        {
          path: 'docs/specs/active/SPEC-010-tasks.md',
          content: `# Tasks Section Test
## Tasks
### **TASK-001** 🤖 **Standard Tasks Header**`
        },
        {
          path: 'docs/specs/active/FEAT-010-impl-tasks.md',
          content: `# Implementation Tasks Test
## Implementation Tasks
### **TASK-001** 🤖 **Implementation Tasks Header**`
        },
        {
          path: 'docs/specs/active/BUG-010-fix-tasks.md',
          content: `# Fix Tasks Test
## Fix Tasks
### **TASK-001** 🤖 **Fix Tasks Header**`
        },
        {
          path: 'docs/specs/active/MAINT-010-maint-tasks.md',
          content: `# Maintenance Tasks Test
## Maintenance Tasks
### **TASK-001** 🤖 **Maintenance Tasks Header**`
        }
      ];

      for (const feature of features) {
        global.createTestFile(feature.path, feature.content);
      }

      await specParser.loadFeatures();

      const specs = specParser.getSpecs();

      expect(specs).toHaveLength(4);

      // All should have tasks parsed despite different headers
      specs.forEach(spec => {
        expect(spec.tasks).toHaveLength(1);
        expect(spec.tasks[0].id).toBe('TASK-001');
      });
    });
  });

  describe('Configuration Migration Support', () => {
    it('should provide migration path from legacy to new format', async () => {
      // Create legacy configuration
      const legacyConfig = {
        featuresPath: 'docs/product/features',
        templatePath: 'docs/product/features/template',
        supportedTypes: ['FEAT', 'BUG', 'SPIKE'],
        priorities: ['P0', 'P1', 'P2', 'P3']
      };

      global.createTestFile('.roadmaprc.json', JSON.stringify(legacyConfig, null, 2));

      const config = configManager.loadConfig();

      // Create example ASD config that would migrate from legacy
      const migratedConfigPath = path.join(testDir, 'asd.config.js');
      configManager.createExampleConfig(migratedConfigPath);

      const migratedConfigContent = require('fs').readFileSync(migratedConfigPath, 'utf-8');

      // Should include all standard ASD options
      expect(migratedConfigContent).toContain('featuresPath: \'docs/specs\'');
      expect(migratedConfigContent).toContain('legacyFeaturesPath: \'docs/product/features\'');
      expect(migratedConfigContent).toContain('supportedTypes: [\'SPEC\', \'FEAT\', \'BUG\', \'SPIKE\', \'MAINT\', \'RELEASE\']');
    });

    it('should maintain backwards compatibility for existing Campfire projects', async () => {
      // Simulate existing Campfire project structure
      const campfireFeatures = [
        {
          path: 'docs/product/features/active/FEAT-001-existing.md',
          content: `# FEAT-001: Existing Campfire Feature
**Priority:** P1
## Description
Existing feature in Campfire format.
## Implementation Tasks
### **TASK-001** 🤖 **Task**
Existing task.`
        }
      ];

      for (const feature of campfireFeatures) {
        global.createTestFile(feature.path, feature.content);
      }

      // Use default configuration (no explicit config file)
      await specParser.loadFeatures();

      const specs = specParser.getSpecs();

      // Should find the feature even with default config
      // (because default includes legacyFeaturesPath)
      expect(specs.length).toBeGreaterThan(0);

      const existingFeature = specs.find(s => s.id === 'FEAT-001');
      expect(existingFeature).toBeDefined();
      expect(existingFeature.title).toContain('Existing Campfire Feature');
    });
  });
});