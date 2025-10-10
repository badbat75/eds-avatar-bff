import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { DeepgramTokenService } from './deepgram';
import { createClient } from '@deepgram/sdk';
import { AppError } from '../middleware/errorHandler';

// Mock the Deepgram SDK
vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn(),
}));

// Mock the logger
vi.mock('./logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  LOG_CONTEXTS: {
    DEEPGRAM: 'deepgram',
  },
}));

describe('DeepgramTokenService', () => {
  let service: DeepgramTokenService;
  let mockDeepgramClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Deepgram client
    mockDeepgramClient = {
      manage: {
        getProjects: vi.fn(),
        createProjectKey: vi.fn(),
        getTokenDetails: vi.fn(),
      },
      auth: {
        grantToken: vi.fn(),
      },
    };

    // Mock createClient to return our mock client
    (createClient as Mock).mockReturnValue(mockDeepgramClient);

    // Create service instance
    service = new DeepgramTokenService();
  });

  describe('generateProjectToken', () => {
    it('should successfully generate a project token', async () => {
      const mockProjects = {
        projects: [{ project_id: 'test-project-id' }],
      };

      const mockKeyResponse = {
        key: 'test-deepgram-key',
        key_id: 'test-key-id',
        member_id: 'test-member-id',
      };

      mockDeepgramClient.manage.getProjects.mockResolvedValue({
        result: mockProjects,
        error: null,
      });

      mockDeepgramClient.manage.createProjectKey.mockResolvedValue({
        result: mockKeyResponse,
        error: null,
      });

      const result = await service.generateProjectToken('test-user-123', 'session-abc');

      expect(result).toHaveProperty('token', 'test-deepgram-key');
      expect(result).toHaveProperty('expiresIn', 900); // 15 minutes in seconds
      expect(result).toHaveProperty('expiresAt');
      expect(mockDeepgramClient.manage.getProjects).toHaveBeenCalled();
      expect(mockDeepgramClient.manage.createProjectKey).toHaveBeenCalledWith(
        'test-project-id',
        expect.objectContaining({
          scopes: ['usage:read', 'usage:write'],
          time_to_live_in_seconds: 900,
        }),
      );
    });

    it('should throw AppError if no projects are found', async () => {
      mockDeepgramClient.manage.getProjects.mockResolvedValue({
        result: { projects: [] },
        error: null,
      });

      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(AppError);
      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(
        'Failed to access Deepgram projects',
      );
    });

    it('should throw AppError if projects API fails', async () => {
      mockDeepgramClient.manage.getProjects.mockResolvedValue({
        result: null,
        error: new Error('API Error'),
      });

      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(AppError);
    });

    it('should throw AppError if key creation fails', async () => {
      mockDeepgramClient.manage.getProjects.mockResolvedValue({
        result: { projects: [{ project_id: 'test-project-id' }] },
        error: null,
      });

      mockDeepgramClient.manage.createProjectKey.mockResolvedValue({
        result: null,
        error: new Error('Key creation failed'),
      });

      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(AppError);
      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(
        'Failed to generate Deepgram token',
      );
    });

    it('should handle 401 unauthorized error', async () => {
      mockDeepgramClient.manage.getProjects.mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(
        'Invalid Deepgram API key',
      );
    });

    it('should handle 429 rate limit error', async () => {
      mockDeepgramClient.manage.getProjects.mockRejectedValue({
        status: 429,
        message: 'Too Many Requests',
      });

      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(
        'Deepgram rate limit exceeded',
      );
    });

    it('should handle 4xx client errors', async () => {
      mockDeepgramClient.manage.getProjects.mockRejectedValue({
        status: 400,
        message: 'Bad request',
      });

      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(
        'External service error (Deepgram): Bad request',
      );
    });

    it('should handle generic errors without status', async () => {
      mockDeepgramClient.manage.getProjects.mockRejectedValue(new Error('Network error'));

      await expect(service.generateProjectToken('test-user-123')).rejects.toThrow(AppError);
    });
  });

  describe('generateAccessToken', () => {
    it('should successfully generate an access token', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        expires_in: 30,
      };

      mockDeepgramClient.auth.grantToken.mockResolvedValue({
        result: mockTokenResponse,
        error: null,
      });

      const result = await service.generateAccessToken();

      expect(result).toHaveProperty('token', 'test-access-token');
      expect(result).toHaveProperty('expiresIn', 30);
      expect(result).toHaveProperty('expiresAt');
      expect(mockDeepgramClient.auth.grantToken).toHaveBeenCalled();
    });

    it('should throw AppError if token generation fails', async () => {
      mockDeepgramClient.auth.grantToken.mockResolvedValue({
        result: null,
        error: new Error('Grant failed'),
      });

      await expect(service.generateAccessToken()).rejects.toThrow(AppError);
      await expect(service.generateAccessToken()).rejects.toThrow('Failed to generate access token');
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      mockDeepgramClient.manage.getTokenDetails.mockResolvedValue({
        result: { token_id: 'valid-token-id' },
        error: null,
      });

      const result = await service.validateToken('valid-token');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockDeepgramClient.manage.getTokenDetails.mockResolvedValue({
        result: null,
        error: new Error('Invalid token'),
      });

      const result = await service.validateToken('invalid-token');

      expect(result).toBe(false);
    });

    it('should return false when validation throws error', async () => {
      mockDeepgramClient.manage.getTokenDetails.mockRejectedValue(new Error('Network error'));

      const result = await service.validateToken('error-token');

      expect(result).toBe(false);
    });
  });

  describe('getTokenTtlMinutes', () => {
    it('should return the configured TTL in minutes', () => {
      const ttl = service.getTokenTtlMinutes();

      expect(ttl).toBe(15);
      expect(typeof ttl).toBe('number');
    });
  });
});
