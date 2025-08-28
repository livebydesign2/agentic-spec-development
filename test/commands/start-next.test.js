const StartNextCommand = require('../../lib/commands/start-next');
const ConfigManager = require('../../lib/config-manager');

describe('StartNextCommand', () => {
  let command;
  let configManager;
  let mockTaskAPI;
  let mockWorkflowStateManager;
  let mockAssignmentValidator;

  beforeEach(() => {
    // Create mocks
    configManager = new ConfigManager();
    
    mockTaskAPI = {
      initialize: sinon.stub().resolves(true),
      getNextTask: sinon.stub()
    };

    mockWorkflowStateManager = {
      initialize: sinon.stub().resolves(),
      assignTask: sinon.stub()
    };

    mockAssignmentValidator = {
      validateAssignment: sinon.stub(),
      getActionableErrors: sinon.stub()
    };

    // Create command with mocked dependencies
    command = new StartNextCommand(configManager);
    
    // Stub the initialization of dependencies
    sinon.stub(command, 'initialize').callsFake(async function() {
      this.taskAPI = mockTaskAPI;
      this.workflowStateManager = mockWorkflowStateManager;
      this.assignmentValidator = mockAssignmentValidator;
      return true;
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('execute', function() {
    it('should require agent parameter', async function() {
      await command.initialize();
      
      const result = await command.execute({});
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Agent type is required');
    });

    it('should successfully find and assign a task', async function() {
      await command.initialize();

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        title: 'Test Task',
        priority: 'P1'
      };

      const mockRecommendation = {
        success: true,
        task: mockTask,
        reasoning: { summary: 'Good match' }
      };

      const mockValidation = {
        success: true,
        isValid: true,
        canProceed: true,
        confidence: 0.9,
        violations: [],
        warnings: []
      };

      const mockAssignment = {
        success: true,
        assignment: {
          started_at: new Date().toISOString()
        }
      };

      mockTaskAPI.getNextTask.resolves(mockRecommendation);
      mockAssignmentValidator.validateAssignment.resolves(mockValidation);
      mockWorkflowStateManager.assignTask.resolves(mockAssignment);

      const result = await command.execute({
        agent: 'cli-specialist',
        dryRun: false
      });

      expect(result.success).to.be.true;
      expect(result.assigned).to.be.true;
      expect(result.task.id).to.equal('TASK-001');
      expect(result.task.specId).to.equal('FEAT-026');
    });

    it('should handle no tasks available', async function() {
      await command.initialize();

      const mockRecommendation = {
        success: true,
        task: null,
        metadata: { totalAvailable: 0, agentMatches: 0 }
      };

      mockTaskAPI.getNextTask.resolves(mockRecommendation);

      const result = await command.execute({
        agent: 'cli-specialist'
      });

      expect(result.success).to.be.true;
      expect(result.assigned).to.be.false;
      expect(result.message).to.include('No suitable tasks found');
      expect(result.suggestions).to.be.an('array');
    });

    it('should handle validation failures', async function() {
      await command.initialize();

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        title: 'Test Task'
      };

      const mockRecommendation = {
        success: true,
        task: mockTask
      };

      const mockValidation = {
        success: false,
        isValid: false,
        canProceed: false,
        violations: ['Task is already assigned'],
        warnings: []
      };

      mockTaskAPI.getNextTask.resolves(mockRecommendation);
      mockAssignmentValidator.validateAssignment.resolves(mockValidation);
      mockAssignmentValidator.getActionableErrors.returns(['Task is already assigned. Check current assignments.']);

      const result = await command.execute({
        agent: 'cli-specialist'
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Assignment validation failed');
    });

    it('should support dry run mode', async function() {
      await command.initialize();

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        title: 'Test Task'
      };

      const mockRecommendation = {
        success: true,
        task: mockTask
      };

      const mockValidation = {
        success: true,
        isValid: true,
        canProceed: true,
        confidence: 0.9,
        violations: [],
        warnings: []
      };

      mockTaskAPI.getNextTask.resolves(mockRecommendation);
      mockAssignmentValidator.validateAssignment.resolves(mockValidation);

      const result = await command.execute({
        agent: 'cli-specialist',
        dryRun: true
      });

      expect(result.success).to.be.true;
      expect(result.assigned).to.be.false;
      expect(result.dryRun).to.be.true;
      expect(result.wouldAssign).to.be.an('object');
      expect(mockWorkflowStateManager.assignTask.called).to.be.false;
    });

    it('should handle recommendation failures', async function() {
      await command.initialize();

      const mockRecommendation = {
        success: false,
        error: 'Task router failed'
      };

      mockTaskAPI.getNextTask.resolves(mockRecommendation);

      const result = await command.execute({
        agent: 'cli-specialist'
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Task recommendation failed');
    });

    it('should handle assignment failures', async function() {
      await command.initialize();

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        title: 'Test Task'
      };

      const mockRecommendation = {
        success: true,
        task: mockTask
      };

      const mockValidation = {
        success: true,
        isValid: true,
        canProceed: true,
        confidence: 0.9,
        violations: [],
        warnings: []
      };

      const mockAssignment = {
        success: false,
        error: 'Database connection failed'
      };

      mockTaskAPI.getNextTask.resolves(mockRecommendation);
      mockAssignmentValidator.validateAssignment.resolves(mockValidation);
      mockWorkflowStateManager.assignTask.resolves(mockAssignment);

      const result = await command.execute({
        agent: 'cli-specialist',
        dryRun: false
      });

      expect(result.success).to.be.false;
      expect(result.error).to.include('Task assignment failed');
    });
  });

  describe('generateNoTaskSuggestions', function() {
    it('should generate appropriate suggestions when no tasks available', function() {
      const suggestions = command.generateNoTaskSuggestions('cli-specialist', {
        metadata: { totalAvailable: 0, agentMatches: 0 }
      });

      expect(suggestions).to.include('No tasks available in the project');
      expect(suggestions).to.include('Check if new specifications need to be created');
    });

    it('should generate suggestions when no agent matches', function() {
      const suggestions = command.generateNoTaskSuggestions('unknown-agent', {
        metadata: { totalAvailable: 10, agentMatches: 0 }
      });

      expect(suggestions).to.include('No tasks match unknown-agent agent capabilities');
      expect(suggestions.some(s => s.includes('Try broadening agent specializations'))).to.be.true;
    });

    it('should generate filter suggestions when tasks exist but filtered out', function() {
      const suggestions = command.generateNoTaskSuggestions('cli-specialist', {
        metadata: { totalAvailable: 5, agentMatches: 2 }
      });

      expect(suggestions.some(s => s.includes('Try broadening filter criteria'))).to.be.true;
      expect(suggestions.some(s => s.includes('Remove priority filters'))).to.be.true;
    });
  });

  describe('audit logging', function() {
    it('should log all major events', async function() {
      await command.initialize();

      const mockTask = {
        id: 'TASK-001',
        specId: 'FEAT-026',
        title: 'Test Task'
      };

      const mockRecommendation = {
        success: true,
        task: mockTask
      };

      const mockValidation = {
        success: true,
        isValid: true,
        canProceed: true,
        violations: [],
        warnings: []
      };

      const mockAssignment = {
        success: true,
        assignment: { started_at: new Date().toISOString() }
      };

      mockTaskAPI.getNextTask.resolves(mockRecommendation);
      mockAssignmentValidator.validateAssignment.resolves(mockValidation);
      mockWorkflowStateManager.assignTask.resolves(mockAssignment);

      await command.execute({
        agent: 'cli-specialist'
      });

      const auditLog = command.getAuditLog();
      expect(auditLog).to.be.an('array');
      expect(auditLog.length).to.be.greaterThan(0);
      
      const events = auditLog.map(entry => entry.event);
      expect(events).to.include('command_started');
      expect(events).to.include('recommendation_retrieved');
      expect(events).to.include('assignment_validated');
      expect(events).to.include('task_assigned');
      expect(events).to.include('command_completed_successfully');
    });
  });
});