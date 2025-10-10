import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import promptRoutes from './prompt';
import { promptService } from '../services/promptService';
import { createMockToken, mockPromptContent } from '../test/helpers';

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    req.user = { sub: 'test-user-123' };
    next();
  }),
}));

// Mock prompt service
vi.mock('../services/promptService', () => ({
  promptService: {
    getPrompt: vi.fn(),
    reloadPrompt: vi.fn(),
    getPromptFilePath: vi.fn(() => '/path/to/prompts/ai-assistant.txt'),
  },
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  LOG_CONTEXTS: {
    PROMPT: 'prompt',
  },
}));

describe('Prompt Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/prompt', promptRoutes);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/prompt/assistant', () => {
    it('should return 200 with prompt data', async () => {
      const mockPromptData = {
        prompt: mockPromptContent,
        lastModified: '2025-10-10T10:00:00.000Z',
        version: '1.0.0',
      };

      vi.mocked(promptService.getPrompt).mockResolvedValue(mockPromptData);

      const token = createMockToken();
      const response = await request(app)
        .get('/api/prompt/assistant')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('prompt', mockPromptContent);
      expect(response.body.data).toHaveProperty('lastModified');
      expect(response.body.data).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should call promptService.getPrompt', async () => {
      const mockPromptData = {
        prompt: 'Test prompt',
        lastModified: new Date().toISOString(),
        version: '1.0.0',
      };

      vi.mocked(promptService.getPrompt).mockResolvedValue(mockPromptData);

      const token = createMockToken();
      await request(app).get('/api/prompt/assistant').set('Authorization', `Bearer ${token}`);

      expect(promptService.getPrompt).toHaveBeenCalled();
    });

    it('should return 500 if prompt loading fails', async () => {
      vi.mocked(promptService.getPrompt).mockRejectedValue(new Error('Failed to load prompt'));

      const token = createMockToken();
      const response = await request(app)
        .get('/api/prompt/assistant')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/prompt/info', () => {
    it('should return 200 with prompt metadata', async () => {
      const mockPromptData = {
        prompt: mockPromptContent,
        lastModified: '2025-10-10T10:00:00.000Z',
        version: '1.0.0',
      };

      vi.mocked(promptService.getPrompt).mockResolvedValue(mockPromptData);

      const token = createMockToken();
      const response = await request(app).get('/api/prompt/info').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('filePath', '/path/to/prompts/ai-assistant.txt');
      expect(response.body.data).toHaveProperty('lastModified');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('promptLength');
      expect(response.body.data).toHaveProperty('message');
    });

    it('should include prompt length', async () => {
      const mockPromptData = {
        prompt: 'Short prompt',
        lastModified: new Date().toISOString(),
        version: '1.0.0',
      };

      vi.mocked(promptService.getPrompt).mockResolvedValue(mockPromptData);

      const token = createMockToken();
      const response = await request(app).get('/api/prompt/info').set('Authorization', `Bearer ${token}`);

      expect(response.body.data.promptLength).toBe(12); // length of "Short prompt"
    });
  });

  // Note: The /reload endpoint doesn't exist in the current implementation
  // Prompts are automatically reloaded via file watcher
});
