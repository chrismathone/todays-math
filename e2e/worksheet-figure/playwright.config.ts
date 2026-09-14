import { defineConfig } from "@playwright/test";

// Isolated component browser: no app server, database, credentials or user profile.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "../../test-results/worksheet-figure-browser",
  use: {
    baseURL: "http://127.0.0.1:4191",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --config e2e/worksheet-figure/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4191",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
