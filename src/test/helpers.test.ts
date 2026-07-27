import { describe, it, expect } from 'vitest';
import { mockDeepgramResponse, mockPromptContent } from './helpers';

describe('Test Helpers', () => {
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
