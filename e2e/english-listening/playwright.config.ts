import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  outputDir: join(tmpdir(), "english-listening-playwright"),
  projects: [
    { name: "desktop1440", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile390", use: { viewport: { width: 390, height: 844 } } },
  ],
  use: {
    baseURL: "http://127.0.0.1:4198",
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --config e2e/english-listening/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4198",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
