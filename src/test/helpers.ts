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
