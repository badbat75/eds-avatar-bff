import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger first
vi.mock('../utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  LOG_CONTEXTS: {
    PROMPT: 'prompt',
  },
}));

// Mock fs module with synchronous mocks
vi.mock('fs', () => {
  return {
    default: {
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
      statSync: vi.fn(() => ({ mtime: new Date('2025-10-10T10:00:00Z') })),
      watch: vi.fn(() => ({ close: vi.fn() })),
      readFile: vi.fn((path: string, encoding: string, callback: (err: Error | null, data: string) => void) => {
        // Simulate async callback
        setImmediate(() => callback(null, 'Test prompt content'));
      }),
      writeFile: vi.fn((path: string, data: string, encoding: string, callback: (err: Error | null) => void) => {
        // Simulate async callback
        setImmediate(() => callback(null));
      }),
    },
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    statSync: vi.fn(() => ({ mtime: new Date('2025-10-10T10:00:00Z') })),
    watch: vi.fn(() => ({ close: vi.fn() })),
    readFile: vi.fn((path: string, encoding: string, callback: (err: Error | null, data: string) => void) => {
      // Simulate async callback
      setImmediate(() => callback(null, 'Test prompt content'));
    }),
    writeFile: vi.fn((path: string, data: string, encoding: string, callback: (err: Error | null) => void) => {
      // Simulate async callback
      setImmediate(() => callback(null));
    }),
  };
});

// Import after mocks are set up
import { PromptService } from './promptService';

describe('PromptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for each test
    (PromptService as any).instance = null;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PromptService.getInstance();
      const instance2 = PromptService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('getPrompt', () => {
    it('should return prompt data with correct structure', async () => {
      const service = PromptService.getInstance();
      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await service.getPrompt();

      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('lastModified');
      expect(result).toHaveProperty('version');
      expect(result.prompt).toBe('Test prompt content');
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('reloadPrompt', () => {
    it('should reload prompt data', async () => {
      const service = PromptService.getInstance();
      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await service.reloadPrompt();

      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('lastModified');
      expect(result).toHaveProperty('version');
      expect(result.prompt).toBe('Test prompt content');
    });
  });

  describe('getPromptFilePath', () => {
    it('should return a valid file path', () => {
      const service = PromptService.getInstance();
      const filePath = service.getPromptFilePath();

      expect(filePath).toContain('prompts');
      expect(filePath).toContain('ai-assistant.txt');
    });
  });

  describe('dispose', () => {
    it('should cleanup resources', () => {
      const service = PromptService.getInstance();

      expect(() => service.dispose()).not.toThrow();
    });

    it('should handle dispose when file watcher is null', () => {
      const service = PromptService.getInstance();
      // Dispose once to close watcher
      service.dispose();
      // Dispose again when watcher is null
      expect(() => service.dispose()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle getPrompt when cache is null', async () => {
      // Reset singleton
      (PromptService as any).instance = null;

      const service = PromptService.getInstance();
      // Clear cache manually
      (service as any).promptCache = null;

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await service.getPrompt();
      expect(result).toHaveProperty('prompt');
    });
  });
});
