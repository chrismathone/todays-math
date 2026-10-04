import { defineConfig } from "vitest/config";
// Extraction proof (plan §6): deterministic Node runs against frozen manifests.
// Run: npx vitest run --config scripts/qa/textbook/extraction-proof/vitest.config.mts
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["scripts/qa/textbook/extraction-proof/*.proof.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    fileParallelism: false,
  },
});
