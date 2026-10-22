import path from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: false,
  cacheDir: path.join(process.env.OCR_EVIDENCE!, "cache"),
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
    include: ["scripts/qa/ocr-quality-20261022/*.test.ts"],
    setupFiles: ["scripts/qa/claude-api-evaluation/features/offline.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 120000,
  },
});
