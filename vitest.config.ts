/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'build', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'build/',
        'dist/',
        'tests/',
        '*.config.ts',
        'src/options.tsx',
        'src/popup.tsx',
        'src/content.ts',
        'src/background/index.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});