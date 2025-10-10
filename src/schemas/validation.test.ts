import { describe, it, expect } from 'vitest';
import { deepgramTokenRequestSchema } from './validation';

describe('Validation Schemas', () => {
  describe('deepgramTokenRequestSchema', () => {
    it('should accept valid sessionId', () => {
      const validData = { sessionId: 'session-123' };
      const result = deepgramTokenRequestSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should accept empty body', () => {
      const result = deepgramTokenRequestSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept missing sessionId', () => {
      const result = deepgramTokenRequestSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept sessionId with max length', () => {
      const longSessionId = 'a'.repeat(100);
      const result = deepgramTokenRequestSchema.parse({ sessionId: longSessionId });
      expect(result.sessionId).toBe(longSessionId);
    });

    it('should reject sessionId over 100 characters', () => {
      const tooLongSessionId = 'a'.repeat(101);
      expect(() => {
        deepgramTokenRequestSchema.parse({ sessionId: tooLongSessionId });
      }).toThrow();
    });

    it('should strip unknown fields', () => {
      const dataWithUnknownFields = {
        sessionId: 'session-123',
        unknownField: 'value',
      };
      const result = deepgramTokenRequestSchema.parse(dataWithUnknownFields);
      expect(result).toEqual({ sessionId: 'session-123' });
    });

    it('should reject non-string sessionId', () => {
      expect(() => {
        deepgramTokenRequestSchema.parse({ sessionId: 123 });
      }).toThrow();
    });
  });
});
