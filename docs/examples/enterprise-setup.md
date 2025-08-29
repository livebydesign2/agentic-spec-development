# Enterprise Project Setup Example

This example demonstrates an advanced ASD setup for large enterprise projects with multiple teams and complex workflows.

## Project Structure

```
enterprise-platform/
├── .asdrc.js                           # Main configuration
├── configs/
│   ├── asd.development.js              # Development config
│   ├── asd.production.js               # Production config
│   └── asd.team-configs/
│       ├── backend-team.js             # Backend team config
│       ├── frontend-team.js            # Frontend team config
│       └── platform-team.js            # Platform team config
├── specifications/
│   ├── architecture/                   # Architecture specifications
│   │   ├── active/
│   │   │   ├── ARCH-001-microservices.md
│   │   │   └── ARCH-002-data-pipeline.md
│   │   ├── proposed/
│   │   │   └── ARCH-003-ml-platform.md
│   │   └── approved/
│   │       └── ARCH-000-system-design.md
│   ├── features/                       # Feature specifications
│   │   ├── backend/
│   │   │   ├── active/
│   │   │   │   ├── FEAT-101-user-service.md
│   │   │   │   └── FEAT-102-auth-service.md
│   │   │   ├── backlog/
│   │   │   │   ├── FEAT-103-notification-service.md
│   │   │   │   └── FEAT-104-payment-service.md
│   │   │   └── done/
│   │   │       └── FEAT-100-base-infrastructure.md
│   │   ├── frontend/
│   │   │   ├── active/
│   │   │   │   ├── FEAT-201-admin-dashboard.md
│   │   │   │   └── FEAT-202-user-portal.md
│   │   │   ├── backlog/
│   │   │   │   └── FEAT-203-mobile-app.md
│   │   │   └── done/
│   │   │       └── FEAT-200-ui-framework.md
│   │   └── platform/
│   │       ├── active/
│   │       │   ├── FEAT-301-monitoring.md
│   │       │   └── FEAT-302-logging.md
│   │       └── backlog/
│   │           └── FEAT-303-alerting.md
│   ├── apis/                           # API specifications
│   │   ├── active/
│   │   │   ├── API-001-user-api-v2.md
│   │   │   └── API-002-payment-api.md
│   │   └── backlog/
│   │       └── API-003-analytics-api.md
│   ├── compliance/                     # Compliance specifications
│   │   ├── active/
│   │   │   ├── COMP-001-gdpr-compliance.md
│   │   │   └── COMP-002-sox-compliance.md
│   │   └── backlog/
│   │       └── COMP-003-iso27001.md
│   └── templates/                      # Specification templates
│       ├── architecture-template.md
│       ├── feature-template.md
│       ├── api-template.md
│       └── compliance-template.md
└── tools/
    ├── spec-validator.js               # Custom validation
    ├── spec-generator.js               # AI-powered generation
    └── team-dashboard.js               # Team metrics
```

## Main Configuration

**.asdrc.js**

```javascript
const path = require('path');
const os = require('os');

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isCI = process.env.CI === 'true';
const username = os.userInfo().username;

// Team detection based on username or environment
const teamConfigs = {
  backend: require('./configs/asd.team-configs/backend-team'),
  frontend: require('./configs/asd.team-configs/frontend-team'),
  platform: require('./configs/asd.team-configs/platform-team'),
};

const userTeam = process.env.TEAM || detectTeamFromUsername(username);

module.exports = {
  // Base paths
  featuresPath: 'specifications',
  templatePath: 'specifications/templates',

  // Enterprise branding
  appName: 'Enterprise Platform Specifications',
  appIcon: '🏢',

  // Advanced file organization
  supportedTypes: [
    'ARCH', // Architecture specifications
    'FEAT', // Feature specifications
    'API', // API specifications
    'COMP', // Compliance specifications
    'SECURITY', // Security specifications
    'PERF', // Performance specifications
    'DOC', // Documentation
    'EPIC', // Large initiatives
    'STORY', // User stories
    'TASK', // Technical tasks
    'BUG', // Bug reports
    'SPIKE', // Research spikes
    'RELEASE', // Release specifications
  ],

  // Enterprise workflow stages
  statusFolders: [
    'proposed', // Initial proposal
    'reviewing', // Under review
    'approved', // Approved for development
    'active', // Currently being developed
    'testing', // In testing phase
    'staging', // In staging environment
    'deployed', // Deployed to production
    'maintained', // In maintenance mode
    'deprecated', // Deprecated/archived
  ],

  // Enterprise priority system
  priorities: [
    'CRITICAL', // Business critical
    'HIGH', // High business impact
    'MEDIUM', // Standard priority
    'LOW', // Nice to have
    'RESEARCH', // Research/spike work
  ],

  // Team-specific defaults
  defaultPriority: 'MEDIUM',
  defaultStatus: 'proposed',

  // Performance settings for large projects
  autoRefresh: !isCI,
  refreshDebounce: isDevelopment ? 250 : 1000,

  // Enterprise features
  enforceSpec: !isDevelopment,
  validateOnSave: true,
  requireApproval: true,

  // Team-specific overrides
  ...(userTeam && teamConfigs[userTeam]),

  // Advanced settings
  maxFileSize: '10MB',
  indexing: {
    enabled: true,
    includeContent: true,
    searchDepth: 5,
  },

  // Integration settings
  integrations: {
    jira: {
      enabled: true,
      projectKey: 'PLAT',
      linkPattern: 'https://company.atlassian.net/browse/{{key}}',
    },
    github: {
      enabled: true,
      repository: 'enterprise-platform',
      linkPattern:
        'https://github.com/company/enterprise-platform/issues/{{number}}',
    },
    confluence: {
      enabled: true,
      spaceKey: 'PLATFORM',
      linkPattern:
        'https://company.atlassian.net/wiki/spaces/PLATFORM/pages/{{id}}',
    },
  },

  // Reporting configuration
  reporting: {
    enabled: true,
    metrics: ['progress', 'velocity', 'quality'],
    schedule: 'weekly',
    recipients: ['platform-leads@company.com'],
  },

  // Custom validation rules
  validation: {
    required: ['title', 'owner', 'priority', 'epic'],
    patterns: {
      epic: /^(EPIC-\d+|none)$/,
      owner: /^@[a-zA-Z0-9_-]+$/,
      estimatedDays: /^\d+(\.\d)?d?$/,
    },
  },
};

function detectTeamFromUsername(username) {
  const teamMappings = {
    backend: ['john.doe', 'jane.smith', 'backend-*'],
    frontend: ['alex.jones', 'frontend-*'],
    platform: ['platform-*', 'devops-*'],
  };

  for (const [team, patterns] of Object.entries(teamMappings)) {
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        if (regex.test(username)) return team;
      } else if (pattern === username) {
        return team;
      }
    }
  }

  return null;
}
```

## Team-Specific Configurations

**configs/asd.team-configs/backend-team.js**

```javascript
module.exports = {
  // Backend team specific settings
  appName: 'Backend Team Specifications',
  appIcon: '⚙️',

  // Focus on backend specifications
  featuresPath: 'specifications/features/backend',

  // Backend-specific types
  supportedTypes: [
    'FEAT', // Feature specifications
    'API', // API designs
    'SERVICE', // Microservice specifications
    'DB', // Database changes
    'SECURITY', // Security implementations
    'PERF', // Performance optimizations
    'INFRA', // Infrastructure changes
    'MIGRATION', // Data migrations
    'BUG', // Bug fixes
  ],

  // Backend workflow
  statusFolders: [
    'proposed',
    'api-review',
    'approved',
    'active',
    'code-review',
    'testing',
    'deployed',
  ],

  // Backend priorities
  priorities: [
    'P0-OUTAGE', // Production outage
    'P1-CRITICAL', // Critical business impact
    'P2-HIGH', // High priority
    'P3-MEDIUM', // Standard priority
    'P4-LOW', // Low priority
    'P5-TECH-DEBT', // Technical debt
  ],

  defaultPriority: 'P3-MEDIUM',
  defaultStatus: 'proposed',

  // Backend team validation
  validation: {
    required: ['title', 'owner', 'epic', 'apiImpact', 'dbImpact'],
    patterns: {
      owner: /^@(backend-|platform-|devops-)/,
      epic: /^EPIC-(BACKEND|PLATFORM)-\d+$/,
    },
  },
};
```

**configs/asd.team-configs/frontend-team.js**

```javascript
module.exports = {
  // Frontend team specific settings
  appName: 'Frontend Team Specifications',
  appIcon: '🎨',

  // Focus on frontend specifications
  featuresPath: 'specifications/features/frontend',

  // Frontend-specific types
  supportedTypes: [
    'FEAT', // Feature specifications
    'COMP', // Component specifications
    'PAGE', // Page specifications
    'FLOW', // User flow specifications
    'DESIGN', // Design system updates
    'A11Y', // Accessibility improvements
    'PERF', // Performance optimizations
    'TEST', // Testing specifications
    'BUG', // Bug fixes
  ],

  // Frontend workflow
  statusFolders: [
    'proposed',
    'design-review',
    'approved',
    'active',
    'design-complete',
    'development',
    'testing',
    'deployed',
  ],

  // Frontend priorities
  priorities: [
    'P0-BLOCKING', // Blocks other work
    'P1-CRITICAL', // Critical user impact
    'P2-HIGH', // High user impact
    'P3-MEDIUM', // Standard priority
    'P4-LOW', // Nice to have
    'P5-POLISH', // Polish/refinement
  ],

  defaultPriority: 'P3-MEDIUM',
  defaultStatus: 'proposed',

  // Frontend team validation
  validation: {
    required: ['title', 'owner', 'epic', 'designRequired', 'userImpact'],
    patterns: {
      owner: /^@(frontend-|ui-|ux-)/,
      epic: /^EPIC-FRONTEND-\d+$/,
    },
  },
};
```

**configs/asd.team-configs/platform-team.js**

```javascript
module.exports = {
  // Platform team specific settings
  appName: 'Platform Team Specifications',
  appIcon: '🔧',

  // Focus on platform specifications
  featuresPath: 'specifications/features/platform',

  // Platform-specific types
  supportedTypes: [
    'FEAT', // Feature specifications
    'INFRA', // Infrastructure changes
    'SECURITY', // Security implementations
    'MONITOR', // Monitoring & observability
    'DEPLOY', // Deployment specifications
    'SCALE', // Scaling specifications
    'BACKUP', // Backup & recovery
    'DISASTER', // Disaster recovery
    'COMPLIANCE', // Compliance requirements
    'AUDIT', // Audit specifications
    'BUG', // Bug fixes
  ],

  // Platform workflow
  statusFolders: [
    'proposed',
    'security-review',
    'approved',
    'active',
    'testing',
    'staging',
    'production',
    'monitoring',
  ],

  // Platform priorities
  priorities: [
    'P0-OUTAGE', // Production outage
    'P1-SECURITY', // Security critical
    'P2-CRITICAL', // Critical infrastructure
    'P3-HIGH', // High priority
    'P4-MEDIUM', // Standard priority
    'P5-MAINTENANCE', // Maintenance work
  ],

  defaultPriority: 'P4-MEDIUM',
  defaultStatus: 'proposed',

  // Platform team validation
  validation: {
    required: ['title', 'owner', 'epic', 'securityImpact', 'infraImpact'],
    patterns: {
      owner: /^@(platform-|devops-|security-|sre-)/,
      epic: /^EPIC-PLATFORM-\d+$/,
    },
  },
};
```

## Environment-Specific Configurations

**configs/asd.development.js**

```javascript
module.exports = {
  // Development environment settings
  autoRefresh: true,
  refreshDebounce: 100,

  // Relaxed validation for development
  enforceSpec: false,
  validateOnSave: false,
  requireApproval: false,

  // Development-specific features
  enableExperiments: true,
  showDebugInfo: true,

  // Additional types for development
  supportedTypes: [
    'EXPERIMENT', // Development experiments
    'POC', // Proof of concepts
    'LEARNING', // Learning exercises
    'TEMP', // Temporary specifications
  ],

  // Faster development workflow
  statusFolders: ['idea', 'active', 'testing', 'done'],
};
```

**configs/asd.production.js**

```javascript
module.exports = {
  // Production environment settings
  autoRefresh: false,

  // Strict validation for production
  enforceSpec: true,
  validateOnSave: true,
  requireApproval: true,

  // Production security
  enableExperiments: false,
  showDebugInfo: false,

  // Audit logging
  auditLog: {
    enabled: true,
    file: 'logs/asd-audit.log',
    level: 'INFO',
  },

  // Compliance features
  compliance: {
    required: true,
    frameworks: ['SOX', 'GDPR', 'ISO27001'],
    approvalRequired: true,
  },
};
```

## Specification Templates

**specifications/templates/architecture-template.md**

```markdown
# ARCH-XXX: [Architecture Title]

**Priority:** MEDIUM  
**Status:** proposed  
**Type:** ARCH  
**Created:** YYYY-MM-DD  
**Owner:** @architecture-team  
**Epic:** EPIC-PLATFORM-XXX  
**Stakeholders:** @backend-team, @frontend-team, @platform-team

## Executive Summary

Brief executive summary of the architectural change and its business impact.

## Architecture Overview

High-level architecture description with diagrams.

## Components Affected

### Services

- [ ] User Service
- [ ] Payment Service
- [ ] Notification Service

### Infrastructure

- [ ] Load Balancers
- [ ] Databases
- [ ] Caching Layer

## Technical Requirements

### Performance Requirements

- Response time: < 200ms p95
- Throughput: 10,000 RPS
- Availability: 99.9%

### Security Requirements

- [ ] Authentication required
- [ ] Authorization implemented
- [ ] Data encryption at rest
- [ ] Data encryption in transit

### Scalability Requirements

- Horizontal scaling support
- Auto-scaling configuration
- Resource limits defined

## Implementation Plan

### Phase 1: Foundation (2 weeks)

- [ ] TASK-001: Core infrastructure setup
- [ ] TASK-002: Database schema updates
- [ ] TASK-003: Service interface definitions

### Phase 2: Core Implementation (4 weeks)

- [ ] TASK-004: Service implementation
- [ ] TASK-005: Integration points
- [ ] TASK-006: Testing framework

### Phase 3: Integration (2 weeks)

- [ ] TASK-007: End-to-end testing
- [ ] TASK-008: Performance testing
- [ ] TASK-009: Security testing

## Risk Assessment

### High Risks

- Database migration complexity
- Service dependency changes
- Performance impact during migration

### Mitigation Strategies

- Staged rollout approach
- Comprehensive testing
- Rollback procedures

## Acceptance Criteria

- [ ] All performance requirements met
- [ ] Security requirements implemented
- [ ] Documentation complete
- [ ] Team training completed
- [ ] Monitoring and alerting configured

## Dependencies

- ARCH-002: Data Pipeline Architecture
- FEAT-101: User Service Update
- INFRA-005: Kubernetes Upgrade

## References

- [System Design Document](link)
- [Performance Requirements](link)
- [Security Guidelines](link)
```

**specifications/templates/feature-template.md**

```markdown
# FEAT-XXX: [Feature Title]

**Priority:** MEDIUM  
**Status:** proposed  
**Type:** FEAT  
**Created:** YYYY-MM-DD  
**Owner:** @team-member  
**Epic:** EPIC-TEAM-XXX  
**Team:** @team-name  
**Estimated:** X days

## User Story

As a [user type], I want [functionality] so that [benefit].

## Business Context

### Business Value

Quantified business value and impact.

### Success Metrics

- Metric 1: Target value
- Metric 2: Target value
- Metric 3: Target value

## Functional Requirements

### Core Functionality

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Edge Cases

- [ ] Error handling
- [ ] Validation rules
- [ ] Boundary conditions

## Technical Requirements

### API Changes

- [ ] New endpoints required
- [ ] Existing endpoints modified
- [ ] Breaking changes (Y/N)

### Database Changes

- [ ] New tables/collections
- [ ] Schema modifications
- [ ] Data migration required

### Frontend Changes

- [ ] New components
- [ ] Design system updates
- [ ] Responsive design

## Implementation Tasks

### Backend Tasks

- [ ] TASK-001: API endpoint implementation
- [ ] TASK-002: Business logic
- [ ] TASK-003: Database integration
- [ ] TASK-004: Unit tests
- [ ] TASK-005: Integration tests

### Frontend Tasks

- [ ] TASK-006: Component development
- [ ] TASK-007: State management
- [ ] TASK-008: API integration
- [ ] TASK-009: UI tests
- [ ] TASK-010: E2E tests

### Infrastructure Tasks

- [ ] TASK-011: Deployment configuration
- [ ] TASK-012: Monitoring setup
- [ ] TASK-013: Performance testing

## Design Considerations

### UX/UI Requirements

- Design mockups: [link]
- User flow: [link]
- Accessibility requirements

### Performance Requirements

- Response time: < XXXms
- Throughput: XXX requests/second
- Resource usage: XXX MB memory

### Security Considerations

- [ ] Authentication required
- [ ] Authorization rules
- [ ] Data validation
- [ ] Security testing

## Testing Strategy

### Unit Testing

- Backend coverage: 90%+
- Frontend coverage: 85%+

### Integration Testing

- API testing
- Database testing
- Service integration

### E2E Testing

- User journey testing
- Cross-browser testing
- Mobile testing

## Acceptance Criteria

- [ ] All functional requirements implemented
- [ ] Performance requirements met
- [ ] Security requirements satisfied
- [ ] Tests passing (unit, integration, E2E)
- [ ] Documentation updated
- [ ] Code review completed
- [ ] QA sign-off received

## Dependencies

- FEAT-XXX: Dependency description
- API-XXX: API requirement
- INFRA-XXX: Infrastructure need

## Rollout Plan

### Phase 1: Feature Flag (10% users)

- Monitor key metrics
- Gather user feedback
- Performance validation

### Phase 2: Gradual Rollout (50% users)

- Continued monitoring
- Support readiness
- Documentation updates

### Phase 3: Full Rollout (100% users)

- Complete monitoring
- Success metrics tracking
- Post-launch review

## References

- [Product Requirements](link)
- [Design Mockups](link)
- [Technical Specification](link)
- [API Documentation](link)
```

## Usage Workflows

### Enterprise Development Workflow

1. **Specification Proposal**

   ```bash
   # Team member creates specification
   cp specifications/templates/feature-template.md specifications/features/backend/proposed/FEAT-105-new-feature.md

   # Edit and commit
   git add . && git commit -m "feat: add FEAT-105 specification"
   git push origin feature/FEAT-105-specification
   ```

2. **Review Process**

   ```bash
   # Architecture review for ARCH specs
   # Security review for security-related specs
   # Technical review by team leads

   # Move to approved after review
   mv specifications/features/backend/proposed/FEAT-105-new-feature.md specifications/features/backend/approved/
   ```

3. **Development**

   ```bash
   # Move to active when development starts
   mv specifications/features/backend/approved/FEAT-105-new-feature.md specifications/features/backend/active/

   # Track progress in ASD terminal
   asd
   ```

4. **Deployment**
   ```bash
   # Move through stages
   mv specifications/features/backend/active/FEAT-105-new-feature.md specifications/features/backend/testing/
   mv specifications/features/backend/testing/FEAT-105-new-feature.md specifications/features/backend/staging/
   mv specifications/features/backend/staging/FEAT-105-new-feature.md specifications/features/backend/deployed/
   ```

### Team Commands

**Backend Team**

```bash
# Backend team view
TEAM=backend asd

# Backend specifications only
asd --path specifications/features/backend
```

**Frontend Team**

```bash
# Frontend team view
TEAM=frontend asd

# Frontend specifications only
asd --path specifications/features/frontend
```

**Platform Team**

```bash
# Platform team view
TEAM=platform asd

# Platform specifications only
asd --path specifications/features/platform
```

### Multi-Team Dashboard

**tools/team-dashboard.js**

```javascript
const ASDClient = require('agentic-spec-development');

async function generateTeamDashboard() {
  const teams = ['backend', 'frontend', 'platform'];
  const dashboard = {};

  for (const team of teams) {
    const asd = new ASDClient({
      configPath: `./configs/asd.team-configs/${team}-team.js`,
    });

    await asd.init();
    const stats = asd.specParser.getStats();

    dashboard[team] = {
      active: stats.activeSpecs,
      backlog: stats.backlogSpecs,
      completed: stats.completedSpecs,
      progress: stats.overallProgress,
    };
  }

  console.log('Enterprise Platform Dashboard');
  console.log('============================');

  for (const [team, stats] of Object.entries(dashboard)) {
    console.log(`\n${team.toUpperCase()} Team:`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Backlog: ${stats.backlog}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Progress: ${stats.progress}%`);
  }
}

generateTeamDashboard().catch(console.error);
```

## Integration Examples

### Jira Integration

**tools/jira-sync.js**

```javascript
const JiraApi = require('jira-client');
const ASDClient = require('agentic-spec-development');

async function syncWithJira() {
  const jira = new JiraApi({
    protocol: 'https',
    host: 'company.atlassian.net',
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_API_TOKEN,
    apiVersion: '2',
    strictSSL: true,
  });

  const asd = new ASDClient();
  await asd.init();

  const specs = asd.specParser.getSpecs();

  for (const spec of specs) {
    if (spec.jiraKey) {
      // Update Jira ticket with spec progress
      await jira.updateIssue(spec.jiraKey, {
        fields: {
          description: spec.description,
          customfield_10001: spec.progress, // Progress field
        },
      });
    }
  }
}
```

### GitHub Integration

**tools/github-sync.js**

```javascript
const { Octokit } = require('@octokit/rest');
const ASDClient = require('agentic-spec-development');

async function syncWithGitHub() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const asd = new ASDClient();
  await asd.init();

  const specs = asd.specParser.getSpecs();

  for (const spec of specs.filter((s) => s.status === 'active')) {
    // Create GitHub issues for active specifications
    const issue = await octokit.issues.create({
      owner: 'company',
      repo: 'enterprise-platform',
      title: spec.title,
      body: spec.description,
      labels: [spec.type.toLowerCase(), spec.priority.toLowerCase()],
      assignees: spec.owner ? [spec.owner.replace('@', '')] : [],
    });

    console.log(`Created GitHub issue #${issue.data.number} for ${spec.id}`);
  }
}
```

This enterprise setup provides a comprehensive foundation for large-scale specification management with team-specific workflows, advanced validation, and integration capabilities.
