import { defineConfig } from "@playwright/test";

/**
 * 개념 백지 A4 지면(D-150) — 인쇄 매체로 장마다 넘침(px)을 재고 캡처한다(jsdom 은 CSS 를 안 돈다).
 * Next · DB · .env 없이 `ConceptBlankPaper` 를 Vite 로 그대로 띄운다.
 *
 *     npx playwright test --config e2e/concept-blank-paper/playwright.config.ts
 *
 * 브라우저가 설치된 판과 안 맞으면 `CB_CHANNEL=msedge`(이 PC 의 Edge)로 돌린다.
 * 캡처와 넘침 표는 `test-results/concept-blank-paper/` 에 떨어진다.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  workers: 1,
  // 첫 적재에서 Vite 가 의존을 묶고 Tailwind(globals.css)가 저장소를 훑느라 1~2분 걸린다
  timeout: 300_000,
  reporter: "list",
  outputDir: "../../test-results/concept-blank-paper/runs",
  use: {
    baseURL: "http://127.0.0.1:4233",
    headless: true,
    trace: "retain-on-failure",
    ...(process.env.CB_CHANNEL ? { channel: process.env.CB_CHANNEL } : {}),
  },
  webServer: {
    command: "npx vite --config e2e/concept-blank-paper/vite.config.mts",
    cwd: "../..",
    url: "http://127.0.0.1:4233",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
