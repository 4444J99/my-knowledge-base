import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'tests/**/*.test.ts',
      'web-react/src/**/*.test.ts',
      'web-react/src/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Evaluation-to-Growth baseline gate.
      thresholds: {
        lines: 65,
        statements: 65,
        functions: 68,
        branches: 55,
      },
      exclude: [
        'node_modules/',
        'apps/**',
        'scripts/**',
        'packages/**',
        'src/**/*.test.ts',
        'tests/**/*.test.ts',
        'web-react/src/**/*.test.ts',
        'web-react/src/**/*.test.tsx',
      ]
    },
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
