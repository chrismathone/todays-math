import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: [
      "src/__tests__/lib/textbookPublish.test.ts",
      "src/__tests__/lib/textbookPublishArtifacts.test.ts",
      "src/__tests__/unit/textbookPageReferences.test.ts",
    ],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
