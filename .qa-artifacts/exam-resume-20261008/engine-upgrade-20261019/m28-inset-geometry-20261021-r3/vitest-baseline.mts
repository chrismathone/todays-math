import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ envDir: false,
  cacheDir: path.resolve(".qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m28-inset-geometry-20261021-r3/.vite-private"),
  resolve: { alias: { "@": path.resolve("src") } },
  test: { include: [".qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m28-inset-geometry-20261021-r3/capture_baseline.test.ts"],
    environment: "node", globals: false, css: false, setupFiles: ["./vitest.setup.ts"], testTimeout: 60000,
    env: { DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test", DIRECT_URL: "postgresql://test:test@127.0.0.1:1/test" } } });
