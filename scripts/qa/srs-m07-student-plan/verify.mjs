import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startServer } from "./server.mjs";

if (!process.argv.includes("--browser-granted"))
  throw Error("Wait for the lead to grant the browser/server turn.");
const executablePath =
  "/Users/pss/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell";
await access(executablePath);
const output = path.join(
  "/Users/pss/Desktop/creative/display-survey/srs-m07-20261021",
  process.argv.includes("--study-only") ? "study-complete" : ".",
);
await mkdir(output, { recursive: true });
const errors = [],
  rejectedRequests = [],
  checks = [];
let browser, server;
let browserClosed = false,
  serverClosed = false;
try {
  server = await startServer();
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true, executablePath });
  for (const width of [390, 1440]) {
    for (const mode of process.argv.includes("--study-only")
      ? ["ready"]
      : ["explorer", "book", "ready", "paused", "setup"]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "no-preference",
      });
      page.setDefaultTimeout(15_000);
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (
          url.origin !== new URL(base).origin ||
          url.pathname.startsWith("/api/")
        ) {
          rejectedRequests.push(url.href);
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(`${base}?mode=${mode}`);
      await page.locator("[data-student-shell]").waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (mode === "explorer" || mode === "book") {
        const label = mode === "book" ? "이 기기 설정" : "학습 설정";
        await page.getByRole("button", { name: label, exact: true }).click();
        const settings = page.getByRole("dialog", { name: label, exact: true });
        await expect(
          settings.getByText("목표 단원", { exact: true }),
        ).toHaveCount(0);
        await expect(settings.getByLabel("학년 선택")).toHaveCount(0);
        await expect(settings.getByRole("switch").first()).toBeEnabled();
        await settings.getByRole("switch").first().focus();
        await page.keyboard.press("Space");
        await page.screenshot({
          path: path.join(output, `${mode}-settings-${width}.png`),
          fullPage: true,
        });
        await page.keyboard.press("Escape");
        await expect(settings).toHaveCount(0);
        await page.getByRole("button", { name: /도감/, exact: false }).click();
        const collection = page.getByRole("dialog", { name: "나의 개념 도감" });
        await collection.locator('button[data-level="1"]').click();
        const detail = page.locator("dialog").filter({
          has: page.getByRole("button", { name: "개념 카드 닫기" }),
        });
        await expect(
          detail.getByRole("button", { name: /목표 단원|탐험 목표/ }),
        ).toHaveCount(0);
        await expect(
          detail.getByRole("heading", { name: "연결된 앞개념" }),
        ).toBeVisible();
        await detail.getByRole("button", { name: "뜻과 해설 보기" }).click();
        await expect(
          detail.getByText("필요할 때 뜻과 해설을 열어 확인해 보세요."),
        ).toHaveCount(0);
        await detail.locator(".katex").first().waitFor();
        await page.screenshot({
          path: path.join(output, `${mode}-card-${width}.png`),
          fullPage: true,
        });
        const prerequisite = detail
          .locator("section")
          .filter({ has: page.getByRole("heading", { name: "연결된 앞개념" }) })
          .getByRole("button")
          .first();
        await prerequisite.focus();
        await page.keyboard.press("Enter");
        await expect(
          detail.getByRole("button", { name: /목표 단원|탐험 목표/ }),
        ).toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(detail).toHaveCount(0);
        await collection
          .getByRole("button", { name: "나의 개념 도감 닫기" })
          .click();
      } else {
        await expect(
          page.getByRole("progressbar", { name: "오늘 목표 진행" }),
        ).toHaveAttribute("max", "15");
        await expect(
          page.getByRole("button", { name: /학습 설정|시작 진도|저장/ }),
        ).toHaveCount(0);
        await expect(page.getByLabel("학년", { exact: true })).toHaveCount(0);
        if (mode === "ready") {
          await page
            .getByRole("button", { name: "오늘의 추천 학습 시작" })
            .click();
          await page.screenshot({
            path: path.join(output, `study-start-${width}.png`),
            fullPage: true,
          });
          const practice = page.getByRole("button", {
            name: "문제 풀기",
            exact: true,
          });
          const previewNext = page.getByRole("button", {
            name: "예와 연습 보기",
            exact: true,
          });
          await practice
            .or(previewNext)
            .or(
              page.getByRole("button", {
                name: "아직 모르겠어요",
                exact: true,
              }),
            )
            .first()
            .waitFor();
          if (await previewNext.isVisible()) await previewNext.click();
          if (await practice.isVisible()) await practice.click();
          await page
            .getByRole("button", { name: "아직 모르겠어요", exact: true })
            .click();
          await page
            .getByRole("button", { name: "알겠어요", exact: true })
            .waitFor();
          const solution = page.getByRole("region", {
            name: "정답과 풀이",
            exact: true,
          });
          await solution.locator(".katex").first().waitFor();
          await expect(solution).toContainText("24");
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({
            animations: "disabled",
            path: path.join(output, `study-solution-${width}.png`),
            fullPage: true,
          });
          await page
            .getByRole("button", { name: "알겠어요", exact: true })
            .click();
          await expect(page.locator("html")).toHaveAttribute(
            "data-study-writes",
            "3",
          );
          await expect(
            page.getByRole("button", { name: "아직 모르겠어요", exact: true }),
          ).toBeEnabled();
        }
        await page.keyboard.press("Tab");
      }
      if (mode === "ready")
        await page.locator("#course-question-title").waitFor();
      const metrics = await page.evaluate(() => ({
        studyWrites: Number(document.documentElement.dataset.studyWrites ?? 0),
        planUnchanged:
          document.documentElement.dataset.planUnchanged === "true",
        fontLoaded: document.fonts.check("16px M07Pretendard"),
        overflow: document.documentElement.scrollWidth > innerWidth,
        forbiddenRequests: Number(
          document.documentElement.dataset.forbiddenRequests,
        ),
        solutionReads: Number(
          document.documentElement.dataset.solutionReads ?? 0,
        ),
      }));
      assert.equal(metrics.overflow, false);
      assert.equal(metrics.planUnchanged, true);
      assert.equal(metrics.fontLoaded, true);
      assert.equal(metrics.forbiddenRequests, 0);
      await page.screenshot({
        animations: "disabled",
        path: path.join(output, `${mode}-home-${width}.png`),
        fullPage: true,
      });
      checks.push({ mode, width, ...metrics });
      await page.close();
    }
  }
  assert.deepEqual(rejectedRequests, []);
  assert.deepEqual(errors, []);
} finally {
  try {
    if (browser) {
      await browser.close();
      browserClosed = true;
    }
  } finally {
    if (server) {
      await server.close();
      serverClosed = true;
    }
    await writeFile(
      path.join(output, "browser.json"),
      JSON.stringify(
        { checks, errors, rejectedRequests, browserClosed, serverClosed },
        null,
        2,
      ),
    );
  }
}
