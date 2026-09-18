import { defineConfig } from "@playwright/test";

/**
 * 작업실 MathLive 칸의 한글 수식 «작은 판» — 실제 작업실 화면(StudioView)에서 친다.
 *
 *     npx playwright test --config e2e/hwp-math-input/playwright.config.ts
 */
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  outputDir: "../../test-results/hwp-math-input",
  use: {
    baseURL: "http://127.0.0.1:4197",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --config e2e/hwp-math-input/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4197",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
