import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  outputDir: "../../test-results/source-math-accessibility",
  use: {
    baseURL: "http://127.0.0.1:4249",
    headless: true,
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --config e2e/source-math-accessibility/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4249",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
