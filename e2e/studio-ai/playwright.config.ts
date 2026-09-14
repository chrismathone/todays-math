import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  outputDir: "../../test-results/studio-ai-browser",
  use: {
    baseURL: "http://127.0.0.1:4187",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --config e2e/studio-ai/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4187",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
