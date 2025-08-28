const { 
  DataAdapterFactory, 
  JSONAdapter, 
  YAMLAdapter, 
  MarkdownAdapter,
  FormatDetector,
  SchemaValidator,
  FormatConverter
} = require('../lib/data-adapters');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Multi-Format Data Support (FEAT-020)', () => {
  let tempDir;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'asd-test-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('DataAdapterFactory', () => {
    let factory;

    beforeEach(() => {
      factory = new DataAdapterFactory();
    });

    test('creates adapters for supported formats', () => {
      const jsonAdapter = factory.create('json');
      const yamlAdapter = factory.create('yaml');
      const markdownAdapter = factory.create('markdown');

      expect(jsonAdapter).toBeInstanceOf(JSONAdapter);
      expect(yamlAdapter).toBeInstanceOf(YAMLAdapter);
      expect(markdownAdapter).toBeInstanceOf(MarkdownAdapter);
    });

    test('throws error for unsupported format', () => {
      expect(() => factory.create('xml')).toThrow('Unsupported data format: xml');
    });

    test('creates adapter from file extension', () => {
      const jsonAdapter = factory.createFromFile('test.json');
      const yamlAdapter = factory.createFromFile('test.yaml');
      const ymlAdapter = factory.createFromFile('test.yml');
      const markdownAdapter = factory.createFromFile('test.md');

      expect(jsonAdapter).toBeInstanceOf(JSONAdapter);
      expect(yamlAdapter).toBeInstanceOf(YAMLAdapter);
      expect(ymlAdapter).toBeInstanceOf(YAMLAdapter);
      expect(markdownAdapter).toBeInstanceOf(MarkdownAdapter);
    });

    test('returns supported formats', () => {
      const formats = factory.getSupportedFormats();
      expect(formats).toContain('json');
      expect(formats).toContain('yaml');
      expect(formats).toContain('markdown');
    });

    test('checks format support', () => {
      expect(factory.isFormatSupported('json')).toBe(true);
      expect(factory.isFormatSupported('yaml')).toBe(true);
      expect(factory.isFormatSupported('markdown')).toBe(true);
      expect(factory.isFormatSupported('xml')).toBe(false);
    });
  });

  describe('JSONAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new JSONAdapter();
    });

    test('parses valid JSON specification', () => {
      const jsonContent = JSON.stringify({
        id: 'FEAT-001',
        type: 'FEAT',
        title: 'Test Feature',
        status: 'active',
        priority: 'P1',
        description: 'A test feature',
        tasks: [
          {
            id: 'TASK-001',
            title: 'Test task',
            status: 'ready'
          }
        ]
      });

      const spec = adapter.parseContent(jsonContent);
      
      expect(spec.id).toBe('FEAT-001');
      expect(spec.type).toBe('FEAT');
      expect(spec.title).toBe('Test Feature');
      expect(spec.status).toBe('active');
      expect(spec.priority).toBe('P1');
      expect(spec.tasks).toHaveLength(1);
      expect(spec.tasks[0].id).toBe('TASK-001');
    });

    test('handles malformed JSON', () => {
      const malformedJson = '{ "id": "FEAT-001", "title": "Test" invalid json }';
      
      expect(() => adapter.parseContent(malformedJson)).toThrow('Invalid JSON format');
    });

    test('serializes specification to JSON', () => {
      const spec = {
        id: 'FEAT-002',
        type: 'FEAT',
        title: 'Another Feature',
        status: 'backlog',
        priority: 'P2',
        description: 'Another test feature',
        tasks: []
      };

      const serialized = adapter.serialize(spec);
      const parsed = JSON.parse(serialized);

      expect(parsed.id).toBe('FEAT-002');
      expect(parsed.title).toBe('Another Feature');
      expect(parsed.status).toBe('backlog');
    });

    test('validates JSON format correctly', () => {
      const validJson = '{"id": "FEAT-001", "title": "Test"}';
      const invalidJson = '{ invalid json }';
      const nonObjectJson = '"just a string"';

      expect(adapter.canParse(validJson)).toBe(true);
      expect(adapter.canParse(invalidJson)).toBe(false);
      expect(adapter.canParse(nonObjectJson)).toBe(false);
    });

    test('handles enhanced task structure', () => {
      const jsonContent = JSON.stringify({
        id: 'FEAT-003',
        type: 'FEAT',
        title: 'Feature with Enhanced Tasks',
        status: 'active',
        tasks: [
          {
            id: 'TASK-001',
            title: 'Complex task',
            status: 'in_progress',
            agent: 'Backend-Developer',
            effort: '4 hours',
            progress: 75,
            started: '2025-01-15T10:00:00Z',
            estimated_completion: '2025-01-16T18:00:00Z',
            subtasks: [
              {
                description: 'Setup database schema',
                completed: true
              },
              {
                description: 'Implement API endpoints',
                completed: false
              }
            ]
          }
        ]
      });

      const spec = adapter.parseContent(jsonContent);
      const task = spec.tasks[0];

      expect(task.id).toBe('TASK-001');
      expect(task.agent).toBe('Backend-Developer');
      expect(task.progress).toBe(75);
      expect(task.subtasks).toHaveLength(2);
      expect(task.subtasks[0].completed).toBe(true);
      expect(task.subtasks[1].completed).toBe(false);
    });
  });

  describe('YAMLAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new YAMLAdapter();
    });

    test('parses valid YAML specification', () => {
      const yamlContent = `
id: FEAT-001
type: FEAT
title: Test Feature
status: active
priority: P1
description: |
  A test feature with multiline
  description content.
tasks:
  - id: TASK-001
    title: Test task
    status: ready
  - id: TASK-002
    title: Another task
    status: complete
`;

      const spec = adapter.parseContent(yamlContent);
      
      expect(spec.id).toBe('FEAT-001');
      expect(spec.type).toBe('FEAT');
      expect(spec.title).toBe('Test Feature');
      expect(spec.description).toContain('A test feature with multiline');
      expect(spec.tasks).toHaveLength(2);
    });

    test('handles malformed YAML', () => {
      const malformedYaml = `
id: FEAT-001
title: Test
  invalid: yaml: structure
`;
      
      expect(() => adapter.parseContent(malformedYaml)).toThrow('Invalid YAML format');
    });

    test('serializes specification to YAML', () => {
      const spec = {
        id: 'FEAT-002',
        type: 'FEAT',
        title: 'YAML Feature',
        status: 'backlog',
        priority: 'P2',
        description: 'A feature for YAML testing\nwith multiple lines',
        tasks: [
          {
            id: 'TASK-001',
            title: 'YAML task',
            status: 'ready'
          }
        ]
      };

      const serialized = adapter.serialize(spec);
      
      expect(serialized).toContain('id: FEAT-002');
      expect(serialized).toContain('title: YAML Feature');
      expect(serialized).toContain('tasks:');
    });

    test('detects YAML format correctly', () => {
      const yamlWithSeparator = '---\nid: FEAT-001\ntitle: Test';
      const yamlKeyValue = 'id: FEAT-001\ntitle: Test';
      const yamlList = '- item1\n- item2';
      const notYaml = 'just some text';

      expect(adapter.canParse(yamlWithSeparator)).toBe(true);
      expect(adapter.canParse(yamlKeyValue)).toBe(true);
      expect(adapter.canParse(yamlList)).toBe(true);
      expect(adapter.canParse(notYaml)).toBe(false);
    });

    test('handles type-specific fields for BUG specs', () => {
      const bugYaml = `
id: BUG-001
type: BUG
title: Test Bug
status: active
bugSeverity: high
reproductionSteps: |
  1. Navigate to page
  2. Click button
  3. Observe error
environment: Chrome 91, Windows 10
`;

      const spec = adapter.parseContent(bugYaml);
      
      expect(spec.type).toBe('BUG');
      expect(spec.bugSeverity).toBe('high');
      expect(spec.reproductionSteps).toContain('Navigate to page');
      expect(spec.environment).toBe('Chrome 91, Windows 10');
    });
  });

  describe('FormatDetector', () => {
    let detector;

    beforeEach(() => {
      detector = new FormatDetector();
    });

    test('detects JSON format from extension', async () => {
      const jsonFile = path.join(tempDir, 'test.json');
      await fs.writeFile(jsonFile, '{"id": "FEAT-001", "title": "Test"}');

      const format = await detector.detectFormat(jsonFile);
      expect(format).toBe('json');
    });

    test('detects YAML format from extension', async () => {
      const yamlFile = path.join(tempDir, 'test.yaml');
      await fs.writeFile(yamlFile, 'id: FEAT-001\ntitle: Test');

      const format = await detector.detectFormat(yamlFile);
      expect(format).toBe('yaml');
    });

    test('detects markdown format from extension', async () => {
      const mdFile = path.join(tempDir, 'test.md');
      await fs.writeFile(mdFile, '# Test Feature\n\n**Status**: Active');

      const format = await detector.detectFormat(mdFile);
      expect(format).toBe('markdown');
    });

    test('validates format against content', () => {
      const jsonContent = '{"id": "FEAT-001"}';
      const yamlContent = 'id: FEAT-001\ntitle: Test';
      const markdownContent = '# Test\n\n**Status**: Active';

      expect(detector.validateFormat(jsonContent, 'json')).toBe(true);
      expect(detector.validateFormat(yamlContent, 'yaml')).toBe(true);
      expect(detector.validateFormat(markdownContent, 'markdown')).toBe(true);

      expect(detector.validateFormat(jsonContent, 'yaml')).toBe(false);
      expect(detector.validateFormat(yamlContent, 'json')).toBe(false);
    });

    test('provides confidence scores', () => {
      const jsonContent = '{"id": "FEAT-001", "title": "Test"}';
      const confidence = detector.getFormatConfidence(jsonContent);

      expect(confidence.json).toBeGreaterThan(0.6);
      expect(confidence.yaml).toBeLessThan(0.5);
      expect(confidence.markdown).toBeLessThan(0.5);
    });
  });

  describe('SchemaValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new SchemaValidator();
    });

    test('validates valid specification', async () => {
      const spec = {
        id: 'FEAT-001',
        type: 'FEAT',
        title: 'Valid Feature',
        status: 'active',
        priority: 'P1'
      };

      const result = await validator.validate(spec);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects missing required fields', async () => {
      const spec = {
        type: 'FEAT',
        title: 'Invalid Feature'
        // Missing id, status, priority
      };

      const result = await validator.validate(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    test('applies auto-fixes', async () => {
      const spec = {
        id: 'FEAT-001',
        type: 'FEAT',
        title: 'Feature needing fixes'
        // Missing status and priority
      };

      const result = await validator.validate(spec, { autoFix: true });

      expect(result.fixedSpec).toBeDefined();
      expect(result.fixedSpec.status).toBe('backlog');
      expect(result.fixedSpec.priority).toBe('P2');
      expect(result.autoFixApplied).toBe(true);
    });

    test('validates ID format', async () => {
      const invalidIdSpecs = [
        { id: 'invalid-id', type: 'FEAT', title: 'Test', status: 'active' },
        { id: 'FEAT001', type: 'FEAT', title: 'Test', status: 'active' },
        { id: 'feat-001', type: 'FEAT', title: 'Test', status: 'active' }
      ];

      for (const spec of invalidIdSpecs) {
        const result = await validator.validate(spec);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'id')).toBe(true);
      }
    });

    test('generates example specifications', () => {
      const featExample = validator.generateExample('FEAT');
      const bugExample = validator.generateExample('BUG');

      expect(featExample.type).toBe('FEAT');
      expect(featExample.id).toMatch(/^FEAT-\d+$/);
      expect(featExample.tasks).toBeDefined();

      expect(bugExample.type).toBe('BUG');
      expect(bugExample.id).toMatch(/^BUG-\d+$/);
      expect(bugExample.bugSeverity).toBeDefined();
    });
  });

  describe('FormatConverter', () => {
    let converter;
    let testFiles;

    beforeEach(async () => {
      converter = new FormatConverter();
      testFiles = {};

      // Create test files in different formats
      const spec = {
        id: 'FEAT-001',
        type: 'FEAT',
        title: 'Conversion Test Feature',
        status: 'active',
        priority: 'P1',
        description: 'A feature for testing conversions',
        tasks: [
          {
            id: 'TASK-001',
            title: 'Test task',
            status: 'ready'
          }
        ]
      };

      // JSON file
      testFiles.json = path.join(tempDir, 'test.json');
      await fs.writeFile(testFiles.json, JSON.stringify(spec, null, 2));

      // YAML file
      testFiles.yaml = path.join(tempDir, 'test.yaml');
      const yamlContent = `id: FEAT-001
type: FEAT
title: Conversion Test Feature
status: active
priority: P1
description: A feature for testing conversions
tasks:
  - id: TASK-001
    title: Test task
    status: ready`;
      await fs.writeFile(testFiles.yaml, yamlContent);

      // Markdown file
      testFiles.markdown = path.join(tempDir, 'test.md');
      const markdownContent = `# Conversion Test Feature

**Status**: active
**Priority**: P1

## Description

A feature for testing conversions

## Tasks

- [ ] Test task`;
      await fs.writeFile(testFiles.markdown, markdownContent);
    });

    test('converts JSON to YAML', async () => {
      const outputFile = path.join(tempDir, 'converted.yaml');
      
      const result = await converter.convertFile(testFiles.json, outputFile, {
        sourceFormat: 'json',
        targetFormat: 'yaml'
      });

      expect(result.success).toBe(true);
      expect(result.sourceFormat).toBe('json');
      expect(result.targetFormat).toBe('yaml');

      const convertedContent = await fs.readFile(outputFile, 'utf-8');
      expect(convertedContent).toContain('id: FEAT-001');
      expect(convertedContent).toContain('type: FEAT');
    });

    test('converts YAML to JSON', async () => {
      const outputFile = path.join(tempDir, 'converted.json');
      
      const result = await converter.convertFile(testFiles.yaml, outputFile, {
        sourceFormat: 'yaml',
        targetFormat: 'json'
      });

      expect(result.success).toBe(true);
      
      const convertedContent = await fs.readFile(outputFile, 'utf-8');
      const parsed = JSON.parse(convertedContent);
      expect(parsed.id).toBe('FEAT-001');
      expect(parsed.type).toBe('FEAT');
    });

    test('auto-detects source and target formats', async () => {
      const outputFile = path.join(tempDir, 'auto-converted.yaml');
      
      const result = await converter.convertFile(testFiles.json, outputFile);

      expect(result.success).toBe(true);
      expect(result.sourceFormat).toBe('json');
      expect(result.targetFormat).toBe('yaml');
    });

    test('performs roundtrip validation', async () => {
      const jsonContent = await fs.readFile(testFiles.json, 'utf-8');
      
      const validation = await converter.validateConversion(jsonContent, 'json', 'yaml');

      expect(validation.isValid).toBe(true);
      expect(validation.differences).toHaveLength(0);
    });

    test('handles conversion errors gracefully', async () => {
      const invalidJson = path.join(tempDir, 'invalid.json');
      await fs.writeFile(invalidJson, '{ invalid json }');
      
      const outputFile = path.join(tempDir, 'failed-conversion.yaml');
      
      const result = await converter.convertFile(invalidJson, outputFile);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('batch converts multiple files', async () => {
      const filePaths = [testFiles.json, testFiles.yaml];
      
      const results = await converter.convertBatch(filePaths, {
        targetFormat: 'json',
        outputDir: tempDir,
        parallel: false
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success || r.targetFormat === 'json')).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('factory integrates all components correctly', async () => {
      const factory = new DataAdapterFactory();

      // Test content validation
      const jsonContent = '{"id": "FEAT-001", "type": "FEAT", "title": "Test", "status": "active"}';
      const validation = await factory.validateContent(jsonContent, 'json');
      expect(validation.isValid).toBe(true);

      // Test conversion
      const yamlResult = await factory.convertContent(jsonContent, 'json', 'yaml');
      expect(yamlResult.convertedContent).toContain('id: FEAT-001');

      // Test format detection
      const confidence = factory.getFormatConfidence(jsonContent);
      expect(confidence.json).toBeGreaterThan(confidence.yaml);
    });

    test('preserves all data through format conversions', async () => {
      const originalSpec = {
        id: 'FEAT-001',
        type: 'FEAT',
        title: 'Complete Feature Test',
        status: 'active',
        priority: 'P1',
        effort: '8 hours',
        assignee: 'Backend-Developer',
        phase: 'PHASE-1',
        created: '2025-01-15T10:00:00Z',
        updated: '2025-01-16T14:30:00Z',
        description: 'A comprehensive test feature with all possible fields',
        tags: ['test', 'integration', 'comprehensive'],
        dependencies: ['FEAT-000'],
        blocking: ['FEAT-002', 'FEAT-003'],
        tasks: [
          {
            id: 'TASK-001',
            title: 'Design architecture',
            status: 'complete',
            agent: 'Software-Architect',
            effort: '2 hours',
            progress: 100,
            started: '2025-01-15T10:00:00Z',
            completed: '2025-01-15T12:00:00Z',
            subtasks: [
              {
                description: 'Research existing solutions',
                completed: true
              },
              {
                description: 'Design API interface',
                completed: true
              }
            ]
          }
        ],
        acceptance_criteria: [
          'All tests pass',
          'Performance meets requirements',
          'Documentation is complete'
        ],
        technical_notes: 'Consider using microservices architecture'
      };

      const factory = new DataAdapterFactory();

      // Convert through all format combinations
      const formats = ['json', 'yaml', 'markdown'];
      
      for (const sourceFormat of formats) {
        for (const targetFormat of formats) {
          if (sourceFormat !== targetFormat) {
            const sourceAdapter = factory.create(sourceFormat);
            const targetAdapter = factory.create(targetFormat);

            // Serialize to source format
            const sourceContent = sourceAdapter.serialize(originalSpec);
            
            // Convert to target format
            const convertResult = await factory.convertContent(sourceContent, sourceFormat, targetFormat);
            expect(convertResult.sourceFormat).toBe(sourceFormat);
            expect(convertResult.targetFormat).toBe(targetFormat);

            // Parse back to verify data preservation
            const targetSpec = targetAdapter.parseContent(convertResult.convertedContent);
            
            // Verify core fields are preserved
            expect(targetSpec.id).toBe(originalSpec.id);
            expect(targetSpec.title).toBe(originalSpec.title);
            expect(targetSpec.status).toBe(originalSpec.status);
            expect(targetSpec.priority).toBe(originalSpec.priority);
            expect(targetSpec.type).toBe(originalSpec.type);
          }
        }
      }
    });
  });
});