import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.tsx', 'plugins/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'e2e/**', 'android/**', 'ios/**'],
  },
});
