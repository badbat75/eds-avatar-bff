import { describe, it, expect } from 'vitest';
import {
  createMockToken,
  createExpiredToken,
  createInvalidToken,
  mockDeepgramResponse,
  mockPromptContent,
} from './helpers';
import jwt from 'jsonwebtoken';

describe('Test Helpers', () => {
  describe('createMockToken', () => {
    it('should create a valid JWT token with default payload', () => {
      const token = createMockToken();

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token) as any;
      expect(decoded).toHaveProperty('sub', 'test-user-123');
      expect(decoded).toHaveProperty('aud', process.env.JWT_AUDIENCE);
      expect(decoded).toHaveProperty('iss', process.env.JWT_ISSUER);
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');
    });

    it('should create a token with custom payload', () => {
      const token = createMockToken({ email: 'custom@example.com', role: 'admin' });

      const decoded = jwt.decode(token) as any;
      expect(decoded).toHaveProperty('email', 'custom@example.com');
      expect(decoded).toHaveProperty('role', 'admin');
      expect(decoded).toHaveProperty('sub', 'test-user-123');
    });

    it('should create a token that can be verified', () => {
      const token = createMockToken();

      const verified = jwt.verify(token, process.env.JWT_SECRET as string);
      expect(verified).toBeTruthy();
    });
  });

  describe('createExpiredToken', () => {
    it('should create an expired JWT token', () => {
      const token = createExpiredToken();

      expect(token).toBeTruthy();

      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeLessThan(Math.floor(Date.now() / 1000));
    });

    it('should throw TokenExpiredError when verified', () => {
      const token = createExpiredToken();

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET as string);
      }).toThrow('jwt expired');
    });
  });

  describe('createInvalidToken', () => {
    it('should create a token with invalid signature', () => {
      const token = createInvalidToken();

      expect(token).toBeTruthy();

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET as string);
      }).toThrow();
    });
  });

  describe('mockDeepgramResponse', () => {
    it('should return successful response by default', () => {
      const response = mockDeepgramResponse();

      expect(response).toHaveProperty('key');
      expect(response).toHaveProperty('key_id');
      expect(response).toHaveProperty('member_id');
      expect(response).toHaveProperty('scopes');
      expect(response).toHaveProperty('created');
      expect(response).toHaveProperty('expiration_date');
      expect(response).toHaveProperty('time_to_live_in_seconds', 900);
    });

    it('should return successful response when success=true', () => {
      const response = mockDeepgramResponse(true);

      expect(response).toHaveProperty('key', 'mock-deepgram-temporary-key');
      expect(response.scopes).toContain('usage:write');
    });

    it('should throw error when success=false', () => {
      expect(() => mockDeepgramResponse(false)).toThrow('Deepgram API error');
    });
  });

  describe('mockPromptContent', () => {
    it('should export a mock prompt string', () => {
      expect(mockPromptContent).toBeTruthy();
      expect(typeof mockPromptContent).toBe('string');
      expect(mockPromptContent.length).toBeGreaterThan(0);
    });

    it('should contain expected content', () => {
      expect(mockPromptContent).toContain('AI assistant');
    });
  });
});
