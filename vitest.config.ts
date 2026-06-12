import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^\.\.\/\.\.\/\.\.\/\.\.\/shared\//,
        replacement: '/src/shared/'
      }
    ]
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'server/**/*.ts', 'scripts/**/*.ts'],
      thresholds: {
        lines: 35,
        functions: 60,
        branches: 50,
        statements: 35
      }
    }
  }
});
