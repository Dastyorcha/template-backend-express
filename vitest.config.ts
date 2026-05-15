import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "tests/**",
        "dist/**",
        "eslint.config.js",
        "vitest.config.ts",
        "index.ts",
        "src/types/**",
        "src/config/db.ts",
        "src/config/env.ts",
        "src/config/redis.ts",
        "src/utils/generatetoken.ts",
        "src/utils/send-email.ts",
      ],
      thresholds: {
        lines: 74,
        functions: 90,
        branches: 70,
        statements: 74,
      },
    },
    testTimeout: 30000,
  },
});
