import { defineConfig } from "@playwright/test";

// Synthetic React harness only: no live workspace, database, storage or AI.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "../../test-results/export-condition",
  use: {
    baseURL: "http://127.0.0.1:4193",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --config e2e/export-condition/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4193",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
