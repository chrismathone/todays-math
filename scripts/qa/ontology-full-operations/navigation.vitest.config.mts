import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    server: { deps: { inline: ["next-auth"] } },
    maxWorkers: 3,
    fileParallelism: false,
    testTimeout: 30000,
    include: ["src/__tests__/components/UnifiedWorkspace.{access,loading,cart}.test.tsx", "src/__tests__/unit/mathOntologyOperationsNavigation.test.tsx"],
  },
});
