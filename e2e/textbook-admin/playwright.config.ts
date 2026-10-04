import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["textbook.spec.ts"],
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  reporter: "list",
  outputDir: "../../test-results/textbook-admin",
  use: {
    baseURL: "http://127.0.0.1:4322",
    browserName: "chromium",
    ...(process.env.TEXTBOOK_UI_CHANNEL
      ? { channel: process.env.TEXTBOOK_UI_CHANNEL }
      : {}),
    headless: true,
  },
  webServer: {
    command: "node e2e/textbook-admin/serve.mjs",
    url: "http://127.0.0.1:4322/e2e/textbook-admin/index.html",
    reuseExistingServer: process.env.TEXTBOOK_UI_REUSE_SERVER === "1",
    timeout: 180000,
    cwd: "../..",
  },
});
