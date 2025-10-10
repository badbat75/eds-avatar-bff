import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.config.ts',
        '**/*.d.ts',
        'src/types/**',
        'src/index.ts', // Server startup file
        'src/utils/logger.ts', // Logger utility (tested via integration)
        'src/config/environment.ts', // Environment configuration (complex initialization testing)
        'prompts/**',
        'test/**', // Legacy test files
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'prompts'],
    setupFiles: ['./src/test/setup.ts'],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
});
