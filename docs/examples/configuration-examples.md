# Configuration Examples

This document provides practical configuration examples for different use cases and project types.

## Basic Configurations

### Minimal Configuration

**asd.config.js**

```javascript
module.exports = {
  featuresPath: 'docs/specs',
};
```

This minimal configuration uses all defaults and is perfect for getting started quickly.

### Standard Project Configuration

**asd.config.js**

```javascript
module.exports = {
  featuresPath: 'docs/specifications',
  templatePath: 'docs/specifications/templates',

  appName: 'Project Specifications',
  appIcon: '📋',

  autoRefresh: true,
  refreshDebounce: 500,

  supportedTypes: ['SPEC', 'FEAT', 'BUG', 'EPIC'],
  statusFolders: ['active', 'backlog', 'done'],
  priorities: ['P0', 'P1', 'P2', 'P3'],

  defaultPriority: 'P2',
  defaultStatus: 'backlog',
};
```

## Package.json Configuration

### Simple Package.json Setup

**package.json**

```json
{
  "name": "my-project",
  "asd": {
    "featuresPath": "specifications",
    "autoRefresh": true,
    "supportedTypes": ["SPEC", "FEAT", "BUG"]
  },
  "scripts": {
    "specs": "asd",
    "specs:init": "asd init",
    "specs:check": "asd doctor"
  },
  "devDependencies": {
    "agentic-spec-development": "^1.0.0"
  }
}
```

### Advanced Package.json Configuration

**package.json**

```json
{
  "name": "enterprise-app",
  "asd": {
    "featuresPath": "docs/specifications",
    "templatePath": "docs/templates",
    "appName": "Enterprise App Specs",
    "appIcon": "🏢",
    "autoRefresh": true,
    "refreshDebounce": 1000,
    "supportedTypes": ["SPEC", "FEAT", "EPIC", "STORY", "BUG", "TASK"],
    "statusFolders": ["proposed", "approved", "active", "testing", "done"],
    "priorities": ["critical", "high", "medium", "low"],
    "defaultPriority": "medium",
    "defaultStatus": "proposed",
    "enforceSpec": true
  }
}
```

## Environment-Specific Configurations

### Development Environment

**asd.config.dev.js**

```javascript
module.exports = {
  featuresPath: 'dev-specs',

  // Fast refresh for development
  autoRefresh: true,
  refreshDebounce: 100,

  // Development branding
  appName: 'Dev Specifications',
  appIcon: '🔧',

  // Relaxed validation
  enforceSpec: false,

  // Development-specific types
  supportedTypes: [
    'SPEC',
    'FEAT',
    'BUG',
    'EXPERIMENT', // Development experiments
    'POC', // Proof of concepts
    'SPIKE', // Research spikes
    'TEMP', // Temporary specs
  ],

  // Simple workflow for development
  statusFolders: ['todo', 'doing', 'done'],

  // Development priorities
  priorities: ['urgent', 'normal', 'later'],

  defaultPriority: 'normal',
  defaultStatus: 'todo',
};
```

### Production Environment

**asd.config.prod.js**

```javascript
module.exports = {
  featuresPath: 'specifications',

  // Disable auto-refresh in production
  autoRefresh: false,

  // Production branding
  appName: 'Production Specifications',
  appIcon: '🚀',

  // Strict validation
  enforceSpec: true,

  // Production-ready types only
  supportedTypes: ['SPEC', 'FEAT', 'BUG', 'RELEASE'],

  // Formal workflow
  statusFolders: [
    'proposed',
    'approved',
    'active',
    'testing',
    'staging',
    'deployed',
  ],

  // Business priorities
  priorities: ['P0', 'P1', 'P2', 'P3'],

  defaultPriority: 'P2',
  defaultStatus: 'proposed',
};
```

### Testing Environment

**asd.config.test.js**

```javascript
module.exports = {
  featuresPath: 'test/fixtures/specs',

  // No auto-refresh in tests
  autoRefresh: false,

  // Test branding
  appName: 'Test Specifications',
  appIcon: '🧪',

  // Minimal types for testing
  supportedTypes: ['SPEC', 'FEAT'],
  statusFolders: ['active', 'done'],
  priorities: ['high', 'low'],

  defaultPriority: 'low',
  defaultStatus: 'active',
};
```

## Team-Specific Configurations

### Frontend Team

**frontend.config.js**

```javascript
module.exports = {
  featuresPath: 'frontend-specs',
  templatePath: 'templates/frontend',

  appName: 'Frontend Specifications',
  appIcon: '🎨',

  // Frontend-specific types
  supportedTypes: [
    'COMP', // Component specifications
    'PAGE', // Page specifications
    'FLOW', // User flow specifications
    'DESIGN', // Design system updates
    'A11Y', // Accessibility improvements
    'PERF', // Performance optimizations
    'BUG', // Bug fixes
  ],

  // Frontend workflow
  statusFolders: [
    'design',
    'approved',
    'development',
    'review',
    'testing',
    'deployed',
  ],

  // Frontend priorities
  priorities: ['blocking', 'critical', 'high', 'medium', 'low', 'polish'],

  defaultPriority: 'medium',
  defaultStatus: 'design',
};
```

### Backend Team

**backend.config.js**

```javascript
module.exports = {
  featuresPath: 'backend-specs',
  templatePath: 'templates/backend',

  appName: 'Backend Specifications',
  appIcon: '⚙️',

  // Backend-specific types
  supportedTypes: [
    'API', // API specifications
    'SERVICE', // Service specifications
    'DB', // Database changes
    'SECURITY', // Security implementations
    'PERF', // Performance optimizations
    'INFRA', // Infrastructure changes
    'MIGRATION', // Data migrations
    'BUG', // Bug fixes
  ],

  // Backend workflow
  statusFolders: [
    'design',
    'api-review',
    'approved',
    'development',
    'testing',
    'deployed',
  ],

  // Backend priorities
  priorities: ['outage', 'critical', 'high', 'medium', 'low', 'tech-debt'],

  defaultPriority: 'medium',
  defaultStatus: 'design',
};
```

### DevOps Team

**devops.config.js**

```javascript
module.exports = {
  featuresPath: 'infrastructure-specs',
  templatePath: 'templates/infrastructure',

  appName: 'Infrastructure Specifications',
  appIcon: '🔧',

  // DevOps-specific types
  supportedTypes: [
    'INFRA', // Infrastructure changes
    'DEPLOY', // Deployment specifications
    'MONITOR', // Monitoring & observability
    'SECURITY', // Security implementations
    'BACKUP', // Backup & recovery
    'SCALE', // Scaling specifications
    'DISASTER', // Disaster recovery
    'AUTOMATION', // Automation improvements
  ],

  // DevOps workflow
  statusFolders: [
    'planning',
    'security-review',
    'approved',
    'implementation',
    'testing',
    'staging',
    'production',
  ],

  // Infrastructure priorities
  priorities: [
    'outage',
    'security',
    'critical',
    'high',
    'medium',
    'maintenance',
  ],

  defaultPriority: 'medium',
  defaultStatus: 'planning',
};
```

## Project Type Configurations

### Startup Configuration

**startup.config.js**

```javascript
module.exports = {
  featuresPath: 'specs',

  appName: 'Startup Specs',
  appIcon: '🚀',

  // Fast iteration
  autoRefresh: true,
  refreshDebounce: 200,

  // Lean types
  supportedTypes: [
    'FEAT', // Feature specifications
    'MVP', // MVP features
    'EXPERIMENT', // Experiments
    'BUG', // Bug fixes
  ],

  // Simple workflow
  statusFolders: ['backlog', 'sprint', 'done'],

  // Startup priorities
  priorities: ['must-have', 'should-have', 'nice-to-have'],

  defaultPriority: 'should-have',
  defaultStatus: 'backlog',

  // Relaxed validation for speed
  enforceSpec: false,
};
```

### Open Source Project

**opensource.config.js**

```javascript
module.exports = {
  featuresPath: 'docs/features',
  templatePath: 'docs/templates',

  appName: 'Project Features',
  appIcon: '🌍',

  // Community-friendly types
  supportedTypes: [
    'FEAT', // Feature requests
    'ENHANCEMENT', // Enhancements
    'BUG', // Bug reports
    'DOCS', // Documentation
    'REFACTOR', // Code refactoring
    'BREAKING', // Breaking changes
  ],

  // Open source workflow
  statusFolders: [
    'proposed', // Community proposals
    'discussion', // Under discussion
    'accepted', // Accepted for development
    'in-progress', // Being developed
    'review', // Under review
    'merged', // Merged to main
  ],

  // Community priorities
  priorities: [
    'critical', // Critical bugs
    'high', // High impact
    'medium', // Standard priority
    'low', // Nice to have
    'help-wanted', // Community help wanted
  ],

  defaultPriority: 'medium',
  defaultStatus: 'proposed',

  // Community features
  requireApproval: false,
  allowCommunityEdit: true,
};
```

### Enterprise SaaS

**enterprise-saas.config.js**

```javascript
module.exports = {
  featuresPath: 'product-specs',
  templatePath: 'product-specs/templates',

  appName: 'SaaS Product Specifications',
  appIcon: '💼',

  // Enterprise types
  supportedTypes: [
    'EPIC', // Large initiatives
    'FEAT', // Feature specifications
    'INTEGRATION', // Third-party integrations
    'COMPLIANCE', // Compliance requirements
    'SECURITY', // Security features
    'ANALYTICS', // Analytics features
    'API', // API specifications
    'BILLING', // Billing features
    'TENANT', // Multi-tenancy features
  ],

  // Enterprise workflow
  statusFolders: [
    'product-review',
    'engineering-review',
    'security-review',
    'approved',
    'active',
    'beta',
    'production',
    'deprecated',
  ],

  // Business priorities
  priorities: [
    'P0-REVENUE', // Revenue impact
    'P1-CUSTOMER', // Customer impact
    'P2-GROWTH', // Growth impact
    'P3-EFFICIENCY', // Efficiency improvement
    'P4-TECH-DEBT', // Technical debt
  ],

  defaultPriority: 'P3-EFFICIENCY',
  defaultStatus: 'product-review',

  // Enterprise requirements
  enforceSpec: true,
  requireApproval: true,
  complianceTracking: true,
};
```

## Framework-Specific Configurations

### React Project

**react.config.js**

```javascript
module.exports = {
  featuresPath: 'src/specs',
  templatePath: 'src/specs/templates',

  appName: 'React App Specs',
  appIcon: '⚛️',

  // React-specific types
  supportedTypes: [
    'COMPONENT', // React component specs
    'HOOK', // Custom hook specs
    'PAGE', // Page component specs
    'FEATURE', // Feature specifications
    'STATE', // State management specs
    'PERF', // Performance optimizations
    'BUG', // Bug fixes
  ],

  statusFolders: ['design', 'development', 'testing', 'deployed'],

  priorities: ['critical', 'high', 'medium', 'low'],

  defaultPriority: 'medium',
  defaultStatus: 'design',
};
```

### Node.js API Project

**nodejs-api.config.js**

```javascript
module.exports = {
  featuresPath: 'api-specs',
  templatePath: 'api-specs/templates',

  appName: 'Node.js API Specs',
  appIcon: '🟢',

  // API-specific types
  supportedTypes: [
    'ENDPOINT', // API endpoint specs
    'MIDDLEWARE', // Middleware specifications
    'AUTH', // Authentication specs
    'VALIDATION', // Validation specifications
    'DATABASE', // Database specifications
    'PERF', // Performance optimizations
    'SECURITY', // Security implementations
    'BUG', // Bug fixes
  ],

  statusFolders: ['design', 'implementation', 'testing', 'deployed'],

  priorities: ['security', 'critical', 'high', 'medium', 'low'],

  defaultPriority: 'medium',
  defaultStatus: 'design',
};
```

## Advanced Configuration Patterns

### Dynamic Configuration

**dynamic.config.js**

```javascript
const os = require('os');
const path = require('path');

// Detect environment
const isDev = process.env.NODE_ENV === 'development';
const isCI = process.env.CI === 'true';
const username = os.userInfo().username;

// Team detection
const teamMapping = {
  'frontend-': 'frontend',
  'backend-': 'backend',
  'devops-': 'devops',
};

function detectTeam(username) {
  for (const [prefix, team] of Object.entries(teamMapping)) {
    if (username.startsWith(prefix)) {
      return team;
    }
  }
  return 'general';
}

const team = process.env.TEAM || detectTeam(username);

module.exports = {
  // Dynamic paths based on team
  featuresPath: `specs/${team}`,
  templatePath: `specs/templates/${team}`,

  // Dynamic branding
  appName: `${team.charAt(0).toUpperCase() + team.slice(1)} Specifications`,
  appIcon:
    team === 'frontend'
      ? '🎨'
      : team === 'backend'
      ? '⚙️'
      : team === 'devops'
      ? '🔧'
      : '📋',

  // Environment-specific settings
  autoRefresh: !isCI,
  refreshDebounce: isDev ? 100 : 500,
  enforceSpec: !isDev,

  // Dynamic types based on team
  supportedTypes:
    team === 'frontend'
      ? ['COMPONENT', 'PAGE', 'FEATURE', 'BUG']
      : team === 'backend'
      ? ['API', 'SERVICE', 'DATABASE', 'BUG']
      : team === 'devops'
      ? ['INFRA', 'DEPLOY', 'MONITOR', 'BUG']
      : ['SPEC', 'FEAT', 'BUG'],

  // Conditional features
  ...(isDev && {
    showDebugInfo: true,
    experimentalFeatures: true,
  }),

  ...(team === 'security' && {
    requireSecurityReview: true,
    securityTemplates: true,
  }),
};
```

### Modular Configuration

**base.config.js**

```javascript
module.exports = {
  // Base configuration shared across all environments
  appIcon: '📋',
  autoRefresh: true,
  refreshDebounce: 500,

  supportedTypes: ['SPEC', 'FEAT', 'BUG'],
  statusFolders: ['active', 'backlog', 'done'],
  priorities: ['P0', 'P1', 'P2', 'P3'],

  defaultPriority: 'P2',
  defaultStatus: 'backlog',
};
```

**project.config.js**

```javascript
const base = require('./base.config');

module.exports = {
  ...base,

  // Project-specific overrides
  featuresPath: 'product-specs',
  appName: 'Product Specifications',

  // Extended types
  supportedTypes: [...base.supportedTypes, 'EPIC', 'STORY', 'TASK'],

  // Extended workflow
  statusFolders: ['proposed', ...base.statusFolders, 'deployed'],
};
```

### Conditional Configuration

**conditional.config.js**

```javascript
const baseConfig = {
  featuresPath: 'specs',
  appName: 'Specifications',
  supportedTypes: ['SPEC', 'FEAT', 'BUG'],
  statusFolders: ['active', 'backlog', 'done'],
};

// Environment-specific additions
const environmentConfig = {
  development: {
    autoRefresh: true,
    refreshDebounce: 100,
    enforceSpec: false,
    supportedTypes: [...baseConfig.supportedTypes, 'EXPERIMENT', 'POC'],
  },

  production: {
    autoRefresh: false,
    enforceSpec: true,
    requireApproval: true,
  },

  testing: {
    featuresPath: 'test/fixtures/specs',
    autoRefresh: false,
  },
};

// Feature flags
const featureFlags = {
  enableAdvancedReporting: process.env.FEATURE_ADVANCED_REPORTING === 'true',
  enableIntegrations: process.env.FEATURE_INTEGRATIONS === 'true',
  enableCompliance: process.env.FEATURE_COMPLIANCE === 'true',
};

const env = process.env.NODE_ENV || 'development';

module.exports = {
  ...baseConfig,
  ...environmentConfig[env],

  // Conditional features
  ...(featureFlags.enableAdvancedReporting && {
    reporting: {
      enabled: true,
      schedule: 'weekly',
    },
  }),

  ...(featureFlags.enableIntegrations && {
    integrations: {
      jira: { enabled: true },
      github: { enabled: true },
    },
  }),

  ...(featureFlags.enableCompliance && {
    compliance: {
      required: true,
      frameworks: ['SOX', 'GDPR'],
    },
  }),
};
```

## Configuration Validation Examples

### Custom Validation

**validated.config.js**

```javascript
const config = {
  featuresPath: 'specs',
  appName: 'Project Specifications',
  supportedTypes: ['SPEC', 'FEAT', 'BUG'],
  statusFolders: ['active', 'backlog', 'done'],
  priorities: ['P0', 'P1', 'P2', 'P3'],
};

// Validation functions
function validateConfig(config) {
  // Required fields
  if (!config.featuresPath) {
    throw new Error('featuresPath is required');
  }

  // Array validations
  if (
    !Array.isArray(config.supportedTypes) ||
    config.supportedTypes.length === 0
  ) {
    throw new Error('supportedTypes must be a non-empty array');
  }

  if (
    !Array.isArray(config.statusFolders) ||
    config.statusFolders.length === 0
  ) {
    throw new Error('statusFolders must be a non-empty array');
  }

  // Priority validation
  if (
    config.defaultPriority &&
    !config.priorities.includes(config.defaultPriority)
  ) {
    throw new Error('defaultPriority must be one of the defined priorities');
  }

  // Status validation
  if (
    config.defaultStatus &&
    !config.statusFolders.includes(config.defaultStatus)
  ) {
    throw new Error('defaultStatus must be one of the defined statusFolders');
  }

  return true;
}

// Validate configuration
validateConfig(config);

module.exports = config;
```

### Schema Validation

**schema-validated.config.js**

```javascript
const Joi = require('joi');

const configSchema = Joi.object({
  featuresPath: Joi.string().required(),
  templatePath: Joi.string().optional(),
  appName: Joi.string().optional(),
  appIcon: Joi.string().optional(),

  autoRefresh: Joi.boolean().default(true),
  refreshDebounce: Joi.number().min(50).max(5000).default(500),

  supportedTypes: Joi.array().items(Joi.string()).min(1).required(),
  statusFolders: Joi.array().items(Joi.string()).min(1).required(),
  priorities: Joi.array().items(Joi.string()).min(1).required(),

  defaultPriority: Joi.string().optional(),
  defaultStatus: Joi.string().optional(),

  enforceSpec: Joi.boolean().default(false),
});

const config = {
  featuresPath: 'specifications',
  appName: 'Project Specs',
  supportedTypes: ['SPEC', 'FEAT', 'BUG'],
  statusFolders: ['active', 'backlog', 'done'],
  priorities: ['P0', 'P1', 'P2', 'P3'],
  defaultPriority: 'P2',
  defaultStatus: 'backlog',
};

// Validate configuration
const { error, value } = configSchema.validate(config);

if (error) {
  throw new Error(`Configuration validation failed: ${error.message}`);
}

module.exports = value;
```

These configuration examples provide a comprehensive foundation for setting up ASD in various project environments and use cases. Choose the pattern that best fits your project's needs and customize as necessary.
