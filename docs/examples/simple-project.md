# Simple Project Setup Example

This example demonstrates a basic ASD setup for a small software project.

## Project Structure

```
my-app/
├── asd.config.js
├── package.json
└── docs/
    └── specs/
        ├── template/
        │   └── spec-template.md
        ├── active/
        │   ├── SPEC-001-user-auth.md
        │   └── FEAT-002-dashboard.md
        ├── backlog/
        │   ├── SPEC-003-api-docs.md
        │   └── FEAT-004-mobile-app.md
        └── done/
            └── SPEC-000-project-setup.md
```

## Configuration

**asd.config.js**

```javascript
module.exports = {
  // Basic setup
  featuresPath: "docs/specs",
  templatePath: "docs/specs/template",

  // Simple workflow
  statusFolders: ["active", "backlog", "done"],

  // Basic types for a web application
  supportedTypes: ["SPEC", "FEAT", "BUG"],

  // Standard priorities
  priorities: ["P0", "P1", "P2", "P3"],

  // Reasonable defaults
  defaultPriority: "P2",
  defaultStatus: "backlog",

  // Enable auto-refresh for development
  autoRefresh: true,
  refreshDebounce: 500,

  // Custom branding
  appName: "My App Specifications",
  appIcon: "🚀",
};
```

## Package.json Integration

**package.json**

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "description": "My awesome application",
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

## Specification Templates

**docs/specs/template/spec-template.md**

```markdown
# SPEC-XXX: [Title]

**Priority:** P2  
**Status:** backlog  
**Type:** SPEC  
**Created:** YYYY-MM-DD  
**Owner:** @username

## Overview

Brief description of what this specification covers.

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Tasks

### TASK-001: Task Title

**Status:** ready  
**Assignee:** @username  
**Estimated:** X days

Task description and details.

## Acceptance Criteria

- Criteria 1
- Criteria 2
- Criteria 3

## Notes

Additional notes and considerations.
```

## Example Specifications

**docs/specs/active/SPEC-001-user-auth.md**

```markdown
# SPEC-001: User Authentication System

**Priority:** P1  
**Status:** active  
**Type:** SPEC  
**Created:** 2024-01-15  
**Owner:** @alice

## Overview

Implement comprehensive user authentication with OAuth2 and JWT tokens.

## Requirements

- [x] User registration and login
- [x] JWT token management
- [ ] OAuth2 integration (Google, GitHub)
- [ ] Password reset functionality
- [ ] Account email verification

## Tasks

### TASK-001: Basic Auth Implementation

**Status:** done  
**Assignee:** @alice  
**Estimated:** 3 days

Implement basic email/password authentication with JWT tokens.

### TASK-002: OAuth2 Integration

**Status:** in_progress  
**Assignee:** @bob  
**Estimated:** 4 days

Add OAuth2 providers (Google, GitHub) for social login.

### TASK-003: Password Reset

**Status:** ready  
**Assignee:** @alice  
**Estimated:** 2 days

Implement secure password reset via email tokens.

## Acceptance Criteria

- Users can register with email/password
- Users can login with OAuth2 providers
- JWT tokens expire and refresh properly
- Password reset works via email
- All authentication is secure and tested

## Notes

- Use bcrypt for password hashing
- Implement rate limiting for login attempts
- Consider 2FA for future enhancement
```

**docs/specs/active/FEAT-002-dashboard.md**

```markdown
# FEAT-002: User Dashboard

**Priority:** P2  
**Status:** active  
**Type:** FEAT  
**Created:** 2024-01-16  
**Owner:** @charlie

## Overview

Create a user dashboard showing key metrics and recent activity.

## Requirements

- [ ] Dashboard layout and navigation
- [ ] User profile section
- [ ] Activity timeline
- [ ] Quick action buttons
- [ ] Responsive design

## Tasks

### TASK-001: Dashboard Layout

**Status:** in_progress  
**Assignee:** @charlie  
**Estimated:** 2 days

Create the main dashboard layout with navigation and sections.

### TASK-002: Profile Section

**Status:** ready  
**Assignee:** @david  
**Estimated:** 1 day

Add user profile display with avatar and basic info.

## Acceptance Criteria

- Dashboard loads quickly (<2s)
- All sections are responsive
- Navigation is intuitive
- Matches design mockups

## Notes

- Use Material-UI components
- Implement lazy loading for performance
- Add loading states for all sections
```

**docs/specs/backlog/SPEC-003-api-docs.md**

```markdown
# SPEC-003: API Documentation System

**Priority:** P3  
**Status:** backlog  
**Type:** SPEC  
**Created:** 2024-01-17  
**Owner:** @eve

## Overview

Implement comprehensive API documentation with interactive examples.

## Requirements

- [ ] OpenAPI/Swagger integration
- [ ] Interactive API explorer
- [ ] Code examples in multiple languages
- [ ] Authentication documentation
- [ ] Versioning support

## Tasks

### TASK-001: OpenAPI Setup

**Status:** ready  
**Assignee:** @eve  
**Estimated:** 3 days

Set up OpenAPI specification and documentation generation.

### TASK-002: Interactive Explorer

**Status:** ready  
**Estimated:** 4 days

Create interactive API explorer with test functionality.

## Acceptance Criteria

- All endpoints are documented
- Examples work correctly
- Documentation is always up-to-date
- Multiple programming languages supported

## Notes

- Use Swagger UI for the explorer
- Auto-generate from code comments
- Include rate limiting information
```

**docs/specs/done/SPEC-000-project-setup.md**

```markdown
# SPEC-000: Project Setup and Infrastructure

**Priority:** P1  
**Status:** done  
**Type:** SPEC  
**Created:** 2024-01-10  
**Owner:** @alice  
**Completed:** 2024-01-14

## Overview

Set up the basic project infrastructure, development environment, and CI/CD pipeline.

## Requirements

- [x] Repository structure and configuration
- [x] Development environment setup
- [x] CI/CD pipeline configuration
- [x] Code quality tools (linting, testing)
- [x] Documentation framework

## Tasks

### TASK-001: Repository Setup

**Status:** done  
**Assignee:** @alice  
**Estimated:** 1 day  
**Completed:** 2024-01-11

Initialize Git repository with proper structure and configuration.

### TASK-002: Development Environment

**Status:** done  
**Assignee:** @alice  
**Estimated:** 2 days  
**Completed:** 2024-01-13

Set up Node.js environment with package.json and development scripts.

### TASK-003: CI/CD Pipeline

**Status:** done  
**Assignee:** @bob  
**Estimated:** 2 days  
**Completed:** 2024-01-14

Configure GitHub Actions for testing and deployment.

## Acceptance Criteria

- [x] Clean repository structure
- [x] Consistent code formatting
- [x] Automated testing on PRs
- [x] Deployment pipeline working
- [x] Documentation accessible

## Notes

Project successfully set up and ready for development. All team members have access and development environment is working.
```

## Usage Instructions

### 1. Initialize the Project

```bash
cd my-app
npm install agentic-spec-development
asd init
```

### 2. Customize Configuration

Edit `asd.config.js` to match your project needs:

```javascript
module.exports = {
  featuresPath: "docs/specs",
  appName: "My App Specifications",
  appIcon: "🚀",

  // Customize for your workflow
  statusFolders: ["active", "backlog", "done"],
  supportedTypes: ["SPEC", "FEAT", "BUG"],
  priorities: ["P0", "P1", "P2", "P3"],
};
```

### 3. Create Templates

Create specification templates in `docs/specs/template/`:

```bash
mkdir -p docs/specs/template
cp spec-template.md docs/specs/template/
```

### 4. Start Using ASD

```bash
# Start the terminal interface
npm run specs

# Or directly
asd
```

### 5. Add Specifications

Create new specification files in the appropriate status folders:

```bash
# New active specification
touch docs/specs/active/SPEC-004-new-feature.md

# New backlog feature
touch docs/specs/backlog/FEAT-005-enhancement.md
```

## Workflow

### Daily Usage

1. **Start ASD**: `npm run specs`
2. **Navigate**: Use arrow keys to browse specifications
3. **Switch views**: Left/right arrows to switch between Active/Backlog/Done
4. **Focus panels**: Tab to cycle through panels
5. **Get details**: Select a specification to see tasks and details
6. **Refresh**: Press 'r' to reload (or auto-refresh will handle it)

### Creating New Specifications

1. Copy template: `cp docs/specs/template/spec-template.md docs/specs/backlog/SPEC-XXX-name.md`
2. Edit the file with your content
3. ASD will automatically detect and display the new specification

### Moving Specifications

Move files between status folders to change their status:

```bash
# Move from backlog to active
mv docs/specs/backlog/SPEC-003-api-docs.md docs/specs/active/

# Move from active to done
mv docs/specs/active/SPEC-001-user-auth.md docs/specs/done/
```

ASD will automatically update the display.

## Keyboard Shortcuts

| Key   | Action                             |
| ----- | ---------------------------------- |
| `↑/↓` | Navigate specifications            |
| `←/→` | Switch views (Active/Backlog/Done) |
| `Tab` | Cycle through panels               |
| `1-4` | Jump to specific panel             |
| `r`   | Refresh manually                   |
| `?`   | Show help                          |
| `q`   | Quit                               |

## Tips and Best Practices

### 1. Consistent Naming

Use consistent specification naming:

- `SPEC-001-user-authentication.md`
- `FEAT-002-dashboard-ui.md`
- `BUG-003-login-error.md`

### 2. Status Management

Keep status folders organized:

- **active**: Currently being worked on (limit to 3-5)
- **backlog**: Planned for future work
- **done**: Completed specifications (archive periodically)

### 3. Task Tracking

Use checkbox tasks for granular progress tracking:

```markdown
## Tasks

- [x] Completed task
- [ ] Pending task
- [ ] Future task
```

### 4. Regular Reviews

Schedule regular specification reviews:

- Weekly active specification review
- Monthly backlog prioritization
- Quarterly done specification archival

### 5. Team Collaboration

Establish team conventions:

- Always assign owners to specifications
- Use consistent priority levels
- Regular status updates in task descriptions
- Link to relevant code commits/PRs

This simple setup provides a solid foundation for specification management while remaining easy to understand and maintain.
