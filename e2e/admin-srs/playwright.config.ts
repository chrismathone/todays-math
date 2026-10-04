import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "srs.spec.ts",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  reporter: "list",
  outputDir: "../../test-results/admin-srs",
  use: {
    baseURL: "http://127.0.0.1:4326",
    browserName: "chromium",
    channel: "msedge",
    headless: true,
  },
  webServer: {
    command: "node e2e/admin-srs/serve.mjs",
    url: "http://127.0.0.1:4326/e2e/admin-srs/index.html",
    reuseExistingServer: true,
    timeout: 360000,
    cwd: "../..",
  },
});
