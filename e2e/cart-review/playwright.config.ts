import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 90_000,
  reporter: "list",
  outputDir: "../../test-results/cart-review-browser",
  use: {
    baseURL: "http://127.0.0.1:4193",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --config e2e/cart-review/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4193",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
