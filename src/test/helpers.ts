import jwt from 'jsonwebtoken';

/**
 * Create a mock JWT token for testing
 */
export function createMockToken(payload: Record<string, unknown> = {}): string {
  const defaultPayload = {
    sub: 'test-user-123',
    aud: process.env.JWT_AUDIENCE,
    iss: process.env.JWT_ISSUER,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    ...payload,
  };

  return jwt.sign(defaultPayload, process.env.JWT_SECRET as string);
}

/**
 * Create an expired mock JWT token for testing
 */
export function createExpiredToken(): string {
  return createMockToken({
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  });
}

/**
 * Create a mock token with invalid signature
 */
export function createInvalidToken(): string {
  return jwt.sign(
    {
      sub: 'test-user-123',
      aud: process.env.JWT_AUDIENCE,
      iss: process.env.JWT_ISSUER,
    },
    'wrong-secret',
  );
}

/**
 * Mock Deepgram SDK response
 */
export function mockDeepgramResponse(success = true) {
  if (success) {
    return {
      key: 'mock-deepgram-temporary-key',
      key_id: 'mock-key-id',
      member_id: 'mock-member-id',
      scopes: ['usage:write'],
      created: new Date().toISOString(),
      expiration_date: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      time_to_live_in_seconds: 900,
    };
  } else {
    throw new Error('Deepgram API error');
  }
}

/**
 * Mock file content for prompt service testing
 */
export const mockPromptContent = `You are a helpful AI assistant.
Be concise and friendly.
Always provide accurate information.`;
