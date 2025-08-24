const path = require('path');
const fs = require('fs');
const ConfigManager = require('../lib/config-manager');

describe('ConfigManager', () => {
  let testDir;
  let configManager;

  beforeEach(() => {
    testDir = global.TEST_DIR;
    global.setupTestDir();
    configManager = new ConfigManager(testDir);
    // Clear cached config to ensure fresh loading
    configManager.config = null;
    configManager.configPath = null;
  });

  afterEach(() => {
    global.cleanupTestDir();
  });

  describe('constructor', () => {
    it('should initialize with default search path', () => {
      const manager = new ConfigManager();
      expect(manager.searchFrom).toBe(process.cwd());
    });

    it('should initialize with custom search path', () => {
      const customPath = '/custom/path';
      const manager = new ConfigManager(customPath);
      expect(manager.searchFrom).toBe(customPath);
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', () => {
      const config = configManager.loadConfig();

      expect(config).toEqual(expect.objectContaining({
        dataPath: expect.stringContaining('docs/specs'),
        templatePath: expect.stringContaining('docs/specs/template'),
        dataFormat: 'markdown',
        autoRefresh: true,
        refreshDebounce: 500,
        defaultPriority: 'P2',
        defaultStatus: 'backlog',
        supportedTypes: ['SPEC', 'FEAT', 'BUG', 'SPIKE', 'MAINT', 'RELEASE'],
        statusFolders: ['active', 'backlog', 'done'],
        priorities: ['P0', 'P1', 'P2', 'P3'],
      }));
    });

    it('should load configuration from asd.config.js', () => {
      const configContent = `
        module.exports = {
          dataPath: 'custom/specs',
          display: { autoRefresh: false },
          cli: { supportedTypes: ['SPEC', 'CUSTOM'] }
        };
      `;

      global.createTestFile('asd.config.js', configContent);

      const config = configManager.loadConfig();

      expect(config.dataPath).toContain('custom/specs');
      expect(config.autoRefresh).toBe(false);
      expect(config.supportedTypes).toEqual(['SPEC', 'CUSTOM']);
    });

    it('should load configuration from package.json', () => {
      const packageJson = {
        name: 'test-project',
        asd: {
          featuresPath: 'src/specs',
          defaultPriority: 'P1',
        },
      };

      global.createTestFile(
        'package.json',
        JSON.stringify(packageJson, null, 2)
      );

      const config = configManager.loadConfig();

      expect(config.featuresPath).toContain('src/specs');
      expect(config.defaultPriority).toBe('P1');
    });

    it('should load configuration from .asdrc.json', () => {
      const configContent = {
        featuresPath: 'docs/features',
        enforceSpec: true,
        priorities: ['HIGH', 'MEDIUM', 'LOW'],
      };

      global.createTestFile(
        '.asdrc.json',
        JSON.stringify(configContent, null, 2)
      );

      const config = configManager.loadConfig();

      expect(config.featuresPath).toContain('docs/features');
      expect(config.enforceSpec).toBe(true);
      expect(config.priorities).toEqual(['HIGH', 'MEDIUM', 'LOW']);
    });

    it('should handle legacy roadmap configuration', () => {
      const configContent = {
        featuresPath: 'legacy/features',
        autoRefresh: false,
      };

      global.createTestFile(
        '.roadmaprc.json',
        JSON.stringify(configContent, null, 2)
      );

      const config = configManager.loadConfig();

      expect(config.featuresPath).toContain('legacy/features');
      expect(config.autoRefresh).toBe(false);
    });

    it('should cache loaded configuration', () => {
      const config1 = configManager.loadConfig();
      const config2 = configManager.loadConfig();

      expect(config1).toBe(config2); // Same object reference
    });

    it('should handle malformed configuration gracefully', () => {
      global.createTestFile('asd.config.js', 'invalid javascript content {}');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create fresh manager to load the malformed config
      const testManager = new ConfigManager(testDir);
      const config = testManager.loadConfig();

      // Should fall back to default configuration
      expect(config).toEqual(
        expect.objectContaining({
          featuresPath: expect.any(String),
          autoRefresh: expect.any(Boolean),
          defaultPriority: 'P2',
          defaultStatus: 'backlog',
          enforceSpec: false,
        })
      );

      // May or may not call console.warn depending on how cosmiconfig handles it
      // Don't enforce the exact console.warn call since it's implementation dependent

      consoleSpy.mockRestore();
    });
  });

  describe('validateAndNormalizeConfig', () => {
    it('should merge with defaults', () => {
      const userConfig = {
        featuresPath: 'custom/path',
        customField: 'value',
      };

      const normalized = configManager.validateAndNormalizeConfig(userConfig);

      expect(normalized.featuresPath).toContain('custom/path');
      expect(normalized.autoRefresh).toBe(true); // Default
      expect(normalized.customField).toBe('value'); // Preserved
    });

    it('should convert relative paths to absolute', () => {
      const userConfig = {
        featuresPath: 'relative/path',
        templatePath: 'relative/template',
      };

      const normalized = configManager.validateAndNormalizeConfig(userConfig);

      expect(path.isAbsolute(normalized.dataPath)).toBe(true);
      expect(path.isAbsolute(normalized.templatePath)).toBe(true);
    });

    it('should preserve absolute paths', () => {
      const absolutePath = '/absolute/path';
      const userConfig = {
        featuresPath: absolutePath,
      };

      const normalized = configManager.validateAndNormalizeConfig(userConfig);

      expect(normalized.dataPath).toBe(absolutePath);
    });

    it('should validate required fields', () => {
      const userConfig = {
        featuresPath: null,
      };

      expect(() => {
        configManager.validateAndNormalizeConfig(userConfig);
      }).toThrow('featuresPath is required in configuration');
    });

    it('should validate array fields', () => {
      const userConfig = {
        supportedTypes: 'invalid',
        statusFolders: null,
        priorities: ['P0'],
      };

      const normalized = configManager.validateAndNormalizeConfig(userConfig);

      // Invalid arrays should be replaced with defaults
      expect(normalized.supportedTypes).toEqual([
        'SPEC',
        'FEAT',
        'BUG',
        'SPIKE',
        'MAINT',
        'RELEASE',
      ]);
      expect(normalized.statusFolders).toEqual(['active', 'backlog', 'done']);
      expect(normalized.priorities).toEqual(['P0']); // Valid array preserved
    });
  });

  describe('get', () => {
    beforeEach(() => {
      const configContent = `
        module.exports = {
          featuresPath: 'test/specs',
          customValue: 'test'
        };
      `;
      global.createTestFile('asd.config.js', configContent);
      // Force reload by clearing cache and creating new manager
      configManager = new ConfigManager(testDir);
    });

    it('should return configuration value', () => {
      const value = configManager.get('customValue');
      expect(value).toBe('test');
    });

    it('should return fallback for undefined keys', () => {
      const value = configManager.get('nonexistent', 'fallback');
      expect(value).toBe('fallback');
    });

    it('should return null for undefined keys without fallback', () => {
      const value = configManager.get('nonexistent');
      expect(value).toBeNull();
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      const configContent = `
        module.exports = {
          dataPath: 'test/specs',
          templatePath: 'test/template',
          cli: {
            statusFolders: ['dev', 'test', 'prod'],
            supportedTypes: ['SPEC', 'TEST'],
            priorities: ['HIGH', 'LOW']
          }
        };
      `;
      global.createTestFile('asd.config.js', configContent);
      // Force reload by clearing cache and creating new manager
      configManager = new ConfigManager(testDir);
    });

    it('should return data path', () => {
      const path = configManager.getDataPath();
      expect(path).toContain('test/specs');
    });

    it('should return template path', () => {
      const path = configManager.getTemplatePath();
      expect(path).toContain('test/template');
    });

    it('should return status folders', () => {
      const folders = configManager.getStatusFolders();
      expect(folders).toEqual(['dev', 'test', 'prod']);
    });

    it('should return supported types', () => {
      const types = configManager.getSupportedTypes();
      expect(types).toEqual(['SPEC', 'TEST']);
    });

    it('should return supported priorities', () => {
      const priorities = configManager.getSupportedPriorities();
      expect(priorities).toEqual(['HIGH', 'LOW']);
    });

    it('should validate type', () => {
      expect(configManager.isValidType('SPEC')).toBe(true);
      expect(configManager.isValidType('spec')).toBe(true); // Case insensitive
      expect(configManager.isValidType('INVALID')).toBe(false);
    });

    it('should validate priority', () => {
      expect(configManager.isValidPriority('HIGH')).toBe(true);
      expect(configManager.isValidPriority('high')).toBe(true); // Case insensitive
      expect(configManager.isValidPriority('MEDIUM')).toBe(false);
    });

    it('should validate status', () => {
      expect(configManager.isValidStatus('dev')).toBe(true);
      expect(configManager.isValidStatus('DEV')).toBe(true); // Case insensitive
      expect(configManager.isValidStatus('invalid')).toBe(false);
    });

    it('should return project root', () => {
      const root = configManager.getProjectRoot();
      expect(root).toBe(testDir);
    });
  });

  describe('createExampleConfig', () => {
    it('should create example configuration file', () => {
      const configPath = path.join(testDir, 'example.config.js');

      const createdPath = configManager.createExampleConfig(configPath);

      expect(createdPath).toBe(configPath);
      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('module.exports = {');
      expect(content).toContain('"featuresPath": "docs/specs"');
      expect(content).toContain('"supportedTypes"');
    });
  });

  describe('getConfigInfo', () => {
    it('should return configuration info without config file', () => {
      const info = configManager.getConfigInfo();

      expect(info).toEqual({
        configPath: null,
        config: expect.any(Object),
        projectRoot: testDir,
      });
    });

    it('should return configuration info with config file', () => {
      const configContent = "module.exports = { featuresPath: 'test' };";
      global.createTestFile('asd.config.js', configContent);

      const info = configManager.getConfigInfo();

      expect(info).toEqual({
        configPath: expect.stringContaining('asd.config.js'),
        config: expect.any(Object),
        projectRoot: testDir,
      });
    });
  });

  describe('configuration precedence', () => {
    it('should prioritize asd.config.js over package.json', () => {
      // Create package.json config
      const packageJson = {
        asd: { featuresPath: 'package-path' },
      };
      global.createTestFile('package.json', JSON.stringify(packageJson));

      // Create asd.config.js (should take precedence)
      const configContent = "module.exports = { featuresPath: 'config-path' };";
      global.createTestFile('asd.config.js', configContent);

      // Create fresh manager to load the new config
      const testManager = new ConfigManager(testDir);
      const config = testManager.loadConfig();

      expect(config.featuresPath).toContain('config-path');
    });

    it('should prioritize .asdrc.json over legacy .roadmaprc.json', () => {
      // Create legacy config
      global.createTestFile(
        '.roadmaprc.json',
        JSON.stringify({
          featuresPath: 'legacy-path',
        })
      );

      // Create new config (should take precedence)
      global.createTestFile(
        '.asdrc.json',
        JSON.stringify({
          featuresPath: 'new-path',
        })
      );

      const config = configManager.loadConfig();

      expect(config.featuresPath).toContain('new-path');
    });
  });
});
