import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    environment: "node",
    server: { deps: { inline: ["next-auth"] } },
    maxWorkers: 3,
    testTimeout: 30000,
    include: [
      "src/__tests__/{unit,integration}/mathOntologyOperations*.test.{ts,tsx}",
      "src/__tests__/api/authDirectorUnchanged.test.ts",
      "scripts/qa/ontology-full-operations/*.postgres.test.ts",
    ],
  },
});
