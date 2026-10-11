import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    setupFiles: ["scripts/import/textbook/codex-retry-20261011/test-safety.ts"],
    include: ["scripts/import/textbook/codex-retry-20261011/*.test.ts"],
    testTimeout: 20000,
  },
});
