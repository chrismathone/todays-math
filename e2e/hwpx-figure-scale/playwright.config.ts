import { defineConfig } from "@playwright/test";

// 합성 React 하네스뿐 — 앱 서버·DB·자격증명·AI 를 쓰지 않는다.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "../../test-results/hwpx-figure-scale",
  use: {
    baseURL: "http://127.0.0.1:4199",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --config e2e/hwpx-figure-scale/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4199",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
