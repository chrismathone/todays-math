import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "readability.spec.ts",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: "list",
  outputDir: "../../test-results/impeccable-paper",
  use: {
    baseURL: "http://127.0.0.1:4334",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --config e2e/worksheet-figure/impeccable.vite.config.mts --port 4334",
    cwd: "../..",
    url: "http://127.0.0.1:4334",
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
