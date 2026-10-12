import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  resolve: { alias: { "@": resolve(process.cwd(), "src") } },
  test: {
    environment: "node",
    setupFiles: ["scripts/import/textbook/codex-retry-20261011/test-safety.ts"],
    include: ["scripts/qa/textbook/codex-batch-adopt-20261011.test.ts"],
  },
});
