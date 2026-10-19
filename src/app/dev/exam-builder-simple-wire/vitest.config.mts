import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** 이 Wire 검증에서는 루트의 loadEnv 설정과 DB/MSW 셋업을 사용하지 않는다. */
export default defineConfig({
  envDir: false,
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: [
      "src/app/dev/exam-builder-simple-wire/*.test.{ts,tsx}",
      "src/__tests__/unit/devPageGuardCoverage.test.ts",
    ],
    setupFiles: ["src/app/dev/exam-builder-simple-wire/test.setup.ts"],
    css: false,
    testTimeout: 20_000,
    maxWorkers: 1,
  },
});
