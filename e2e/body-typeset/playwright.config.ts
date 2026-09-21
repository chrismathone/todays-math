import { defineConfig } from "@playwright/test";

/**
 * 문제 본문 조판 — 편집기(내용 수정) · 검수 카드 · 지면이 **같은 원문**을 어떻게 그리나.
 * 실제 Chromium 에서 글자 사이 간격과 수식 상자 자리를 잰다(jsdom 은 CSS 를 안 돈다).
 *
 *     npx playwright test --config e2e/body-typeset/playwright.config.ts
 */
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  outputDir: "../../test-results/body-typeset",
  use: {
    baseURL: "http://127.0.0.1:4211",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx vite --config e2e/body-typeset/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4211",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
