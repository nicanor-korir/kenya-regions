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
      // 100 across the board. Anything that cannot be reached by a test is
      // either dead code, which should be deleted, or a guard against a state
      // the data build already refuses to emit, which carries a `v8 ignore`
      // and a comment naming the invariant and the test that enforces it.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
