import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    environment: "node",
    maxWorkers: 3,
    testTimeout: 30000,
    include: [
      "src/__tests__/{unit,integration}/mathOntologyOperations*.test.ts",
    ],
  },
});
