import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "admin.spec.ts",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  reporter: "list",
  outputDir: "../../test-results/admin-accounts",
  use: {
    baseURL: "http://127.0.0.1:4318",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "node e2e/admin-accounts/serve.mjs",
    url: "http://127.0.0.1:4318/e2e/admin-accounts/index.html",
    reuseExistingServer: false,
    timeout: 180000,
    cwd: "../..",
  },
});
