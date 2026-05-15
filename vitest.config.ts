import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["tests/**", "dist/**", "eslint.config.js", "vitest.config.ts"],
    },
    testTimeout: 30000,
  },
});
