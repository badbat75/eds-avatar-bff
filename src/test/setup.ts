import { afterAll, afterEach, vi } from 'vitest';

// Set at module scope, not in beforeAll: vitest evaluates setup files before the test
// files' imports, and `config` validates itself the moment environment.ts is imported.
// dotenv does not override variables that are already set, so this also keeps the
// suite independent of the developer's own .env.
process.env.NODE_ENV = 'test';
process.env.DEEPGRAM_API_KEY = 'test-deepgram-api-key';
process.env.DEEPGRAM_TOKEN_TTL_MINUTES = '15';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
// validateConfig rejects a non-loopback bind: the gate identity header is only
// trustworthy while the reverse proxy is the sole reachable path
process.env.HOST = '127.0.0.1';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
