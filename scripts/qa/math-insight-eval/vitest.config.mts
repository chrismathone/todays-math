import path from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: false,
  cacheDir: path.join(process.env.INSIGHT_AUDIT_EVIDENCE ?? "/tmp/math-insight-audit", "cache"),
  resolve: { alias: { "@": path.resolve("src"), "server-only": path.resolve("scripts/qa/math-insight-eval/serverOnly.ts") } },
  test: {
    environment: "node", include: ["scripts/qa/math-insight-eval/*.test.ts"],
    maxWorkers: 1, fileParallelism: false, testTimeout: 45_000,
  },
});
