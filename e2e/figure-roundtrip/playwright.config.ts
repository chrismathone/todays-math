import { defineConfig } from "@playwright/test";

// Isolated component browser: no app server, database, credentials or AI calls.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: "list",
  outputDir: "../../test-results/figure-roundtrip-browser",
  use: {
    baseURL: "http://127.0.0.1:4193",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --config e2e/figure-roundtrip/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4193",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
