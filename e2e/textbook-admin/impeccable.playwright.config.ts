import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "keyboard.spec.ts",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: "list",
  outputDir: "../../test-results/impeccable-textbook",
  use: {
    baseURL: "http://127.0.0.1:4335",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node e2e/textbook-admin/impeccable.serve.mjs",
    cwd: "../..",
    url: "http://127.0.0.1:4335/e2e/textbook-admin/index.html",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
