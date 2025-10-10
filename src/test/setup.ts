import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Setup environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-32-characters-minimum';
  process.env.JWT_ISSUER = 'https://test.auth0.com/';
  process.env.JWT_AUDIENCE = 'test-audience';
  process.env.JWT_ALGORITHM = 'RS256';
  process.env.JWT_VERIFY_ALGORITHMS = 'RS256,HS256';
  process.env.DEEPGRAM_API_KEY = 'test-deepgram-api-key';
  process.env.DEEPGRAM_TOKEN_TTL_MINUTES = '15';
  process.env.ALLOWED_ORIGINS = 'http://localhost:8080';
  process.env.RATE_LIMIT_WINDOW_MS = '900000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  process.env.HOST = '0.0.0.0';
  process.env.PORT = '3001';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
