import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    environment: "node",
    server: { deps: { inline: ["next-auth"] } },
    maxWorkers: 3,
    // DB files intentionally share the one active global release pointer.
    // Product races are exercised with explicit concurrent Prisma clients;
    // unrelated fixture publications must not invalidate another file's seed.
    fileParallelism: false,
    testTimeout: 30000,
    include: [
      "src/__tests__/{unit,integration}/mathOntologyOperations*.test.{ts,tsx}",
      "src/__tests__/api/authDirectorUnchanged.test.ts",
      "src/__tests__/unit/mathOntologySourceDatabase.test.ts",
      "scripts/qa/ontology-full-operations/*.postgres.test.ts",
    ],
  },
});
