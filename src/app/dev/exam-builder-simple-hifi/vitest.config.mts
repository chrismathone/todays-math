import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** 루트의 loadEnv·DB/MSW 셋업을 읽지 않는 독립 렌더 검증이다. */
export default defineConfig({
  envDir: false,
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: [
      "src/app/dev/exam-builder-simple-hifi/*.test.{ts,tsx}",
      "src/__tests__/unit/devPageGuardCoverage.test.ts",
    ],
    setupFiles: ["src/app/dev/exam-builder-simple-hifi/test.setup.ts"],
    css: false,
    testTimeout: 20_000,
    maxWorkers: 1,
  },
});
