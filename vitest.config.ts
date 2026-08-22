import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      // The generated data modules are megabytes of literals with no logic to
      // exercise; measuring them would only dilute the real figure.
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/types.ts'],
      // Set just below the current figures so a real regression fails the
      // build, without the suite breaking on incidental one-line changes.
      // The README coverage badge states this floor, so CI keeps it honest.
      thresholds: {
        statements: 95,
        branches: 88,
        functions: 100,
        lines: 95,
      },
    },
  },
})
