import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  envDir: false,
  resolve: { alias: [{ find: "@", replacement: path.resolve("src") }, { find: "server-only", replacement: path.resolve("node_modules/server-only/empty.js") }] },
  test: { environment: "node", maxWorkers: 3, fileParallelism: false, testTimeout: 60000, include: ["src/__tests__/unit/mathOntologyRetrieval*.test.ts", "src/__tests__/unit/mathOntologyAssist.test.ts", "src/__tests__/unit/mathOntologyAssistBoundaries.test.ts", "src/__tests__/unit/mathOntologyAssistIntent.test.ts", "src/__tests__/unit/mathOntologyModelSelection.test.ts", "src/__tests__/unit/mathOntologyPlanIdentity.test.ts", "src/__tests__/unit/mathOntologyPrivateJoin.test.ts", "src/__tests__/unit/mathOntologyProductionContext.test.ts"] },
});
