import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: [
    "admin.spec.ts",
    "audit.spec.ts",
    "relations.spec.ts",
    "branch-learning.spec.ts",
    "workbench.spec.ts",
  ],
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  reporter: "list",
  outputDir: "../../test-results/admin-accounts",
  use: {
    baseURL: "http://127.0.0.1:4318",
    browserName: "chromium",
    ...(process.env.ADMIN_UI_CHANNEL
      ? { channel: process.env.ADMIN_UI_CHANNEL }
      : {}),
    headless: true,
  },
  webServer: {
    command: "node e2e/admin-accounts/serve.mjs",
    url: "http://127.0.0.1:4318/e2e/admin-accounts/index.html",
    reuseExistingServer: process.env.ADMIN_UI_REUSE_SERVER === "1",
    timeout: 180000,
    cwd: "../..",
  },
});
