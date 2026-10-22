import path from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: false,
  cacheDir: path.join(process.env.FEATURES_EVIDENCE!, "cache/vite"),
  resolve: {
    alias: {
      "@": path.resolve("src"),
      "server-only": path.resolve(
        "scripts/qa/claude-api-evaluation/features/serverOnly.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include:
      process.env.FEATURES_MODE === "regression"
        ? [
            "src/__tests__/unit/devAiTasks.test.ts",
            "src/__tests__/unit/englishReadPhoto.test.ts",
          ]
        : ["scripts/qa/claude-api-evaluation/features/*.test.ts"],
    setupFiles: ["scripts/qa/claude-api-evaluation/features/offline.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 45000,
  },
});
