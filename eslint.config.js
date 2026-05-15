import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import nPlugin from "eslint-plugin-n";
import promisePlugin from "eslint-plugin-promise";
import securityPlugin from "eslint-plugin-security";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module", project: "./tsconfig.json" },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      n: nPlugin,
      promise: promisePlugin,
      security: securityPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...promisePlugin.configs.recommended.rules,
      ...securityPlugin.configs.recommended.rules,

      // TypeScript handles undefined-variable checking better than no-undef
      "no-undef": "off",

      // Catch floating promises (a classic Express async footgun)
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

      // Force env access through src/config/env.ts only
      "n/no-process-env": "error",

      "promise/always-return": "off",
      "no-console": ["warn", { allow: ["error", "warn", "log"] }],
    },
  },
  {
    // Allow process.env only in env.ts (the single authorised access point)
    files: ["src/config/env.ts"],
    rules: { "n/no-process-env": "off" },
  },
  {
    // Relax rules in tests
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "n/no-process-env": "off",
      "security/detect-object-injection": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "eslint.config.js"],
  },
];
