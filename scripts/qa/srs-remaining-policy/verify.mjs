import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startServer } from "./server.mjs";
if (!process.argv.includes("--browser-granted"))
  throw Error("Explicit coordinator browser/server grant required");
const output =
  "/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/policy";
const remainingOnly = process.argv.includes("--remaining-only");
const evidenceName = remainingOnly ? "browser-remaining" : "browser";
await mkdir(output, { recursive: true });
const checks = [],
  errors = [],
  rejectedRequests = [];
let activePage;
let phase = "starting";
const pendingRequests = new Set();
async function waitForFont(page) {
  await page.waitForFunction(
    () =>
      document.fonts.status === "loaded" &&
      document.fonts.check("16px PolicyPretendard"),
  );
}
async function capture(page, name) {
  await waitForFont(page);
  await page.screenshot({ path: path.join(output, name), fullPage: false });
}
let browser,
  server,
  browserClosed = false,
  serverClosed = false;
try {
  server = await startServer();
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Users/pss/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  });
  const modesArg = process.argv.find((value) => value.startsWith("--modes="));
  const modes = remainingOnly
    ? ["explorer-denied", "student", "relearn"]
    : modesArg
      ? modesArg.slice(8).split(",")
      : [
          "mixed",
          "explorer-only",
          "course-only",
          "textbook-denied",
          "textbook-empty",
          "explorer-denied",
          "student",
          "relearn",
        ];
  for (const width of remainingOnly ? [1440] : [390, 1440]) {
    for (const mode of modes) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      activePage = page;
      page.setDefaultTimeout(25000);
      pendingRequests.clear();
      page.on("request", (request) => pendingRequests.add(request.url()));
      page.on("requestfinished", (request) =>
        pendingRequests.delete(request.url()),
      );
      page.on("requestfailed", (request) =>
        pendingRequests.delete(request.url()),
      );
      page.on("pageerror", (error) => errors.push(`${mode}:${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error")
          errors.push(`${mode}:${message.text()}`);
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
      phase = `${width}:${mode}:dom`;
      await page.goto(`${base}?mode=${mode}`, {
        waitUntil: "domcontentloaded",
      });
      phase = `${width}:${mode}:target-ui`;
      if (mode === "student") {
        await page.getByRole("button", { name: "도감", exact: true }).click();
        const collection = page.getByRole("dialog", { name: "나의 개념 도감" });
        await expect(collection).toContainText("내일 복습");
        await expect(collection).not.toContainText("1 → 3 → 7");
        await capture(page, `collection-${width}.png`);
        await collection.locator('button[data-level="1"]').first().focus();
        await page.keyboard.press("Enter");
        const card = page.locator("dialog").filter({
          has: page.getByRole("button", { name: "개념 카드 닫기" }),
        });
        await expect(card).toContainText("내일 복습");
        await capture(page, `card-${width}.png`);
        await page.keyboard.press("Escape");
        await expect(card).toHaveCount(0);
        await page.keyboard.press("Escape");
      } else if (mode === "relearn") {
        const manual = page.getByRole("button", { name: "한 번 더 확인하기" });
        await manual.focus();
        await page.keyboard.press("Enter");
        await page.getByRole("button", { name: "확인 닫기" }).waitFor();
        await page.locator("dialog .katex").first().waitFor();
        await capture(page, `relearn-open-${width}.png`);
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "다음 제출 경계 (검증)" })
          .click();
        await expect(
          page.getByRole("button", { name: "확인 닫기" }),
        ).toHaveCount(0);
        await expect(page.locator("html")).toHaveAttribute(
          "data-memory-unchanged",
          "true",
        );
        await manual.focus();
        await page.keyboard.press("Enter");
        await page.getByRole("button", { name: "확인 닫기" }).waitFor();
        await page.keyboard.press("Escape");
      } else {
        await page.getByRole("button", { name: "로컬 검증 상세 보기" }).click();
        if (mode === "mixed") {
          await page
            .getByRole("button", { name: "학습 설정", exact: true })
            .click();
          await expect(page.getByLabel("코스 하루 목표")).toHaveValue("5");
          await expect(
            page.getByText(/독립 코스에서 적용되는 목표/),
          ).toContainText("기본 15칸");
          await page.getByLabel("코스 하루 목표").focus();
          await page.keyboard.press("ArrowDown");
          await page.keyboard.press("ArrowUp");
          await page.screenshot({
            path: path.join(output, `plan-${width}.png`),
            fullPage: true,
          });
        }
        if (mode === "textbook-denied" || mode === "textbook-empty") {
          await page
            .getByRole("button", { name: "교재·백지", exact: true })
            .click();
          if (mode === "textbook-denied") {
            await expect(page.getByRole("alert")).toContainText(
              "교재 담당 권한",
            );
            await expect(page.getByRole("alert")).not.toContainText(
              "학생을(를) 찾을 수 없습니다",
            );
          } else {
            await expect(
              page.getByText(/아직 기록된 교재 활동이 없습니다/),
            ).toBeVisible();
            await expect(page.getByRole("alert")).toHaveCount(0);
          }
        } else {
          await page
            .getByRole("button", { name: "일별 활동", exact: true })
            .click();
          const history = page.getByRole("region", {
            name: "탐험 활동 기록",
            exact: true,
          });
          if (mode === "explorer-denied") {
            await expect(history.getByRole("alert")).toContainText(
              "이 학생 탐험 기록을 열 수 없습니다.",
            );
            await expect(history).not.toContainText(
              "아직 완료한 개념 카드 탐험 기록이 없습니다.",
            );
          } else if (mode === "course-only")
            await expect(history).toContainText(
              "아직 완료한 개념 카드 탐험 기록이 없습니다.",
            );
          else await expect(history).toContainText("15 / 15");
          if (mode === "explorer-only")
            await expect(
              page.getByText("표시할 일별 활동 기록이 없습니다."),
            ).toBeVisible();
          await history.scrollIntoViewIfNeeded();
          if (mode === "mixed") {
            await page.screenshot({
              path: path.join(output, `mixed-records-${width}.png`),
              fullPage: true,
            });
            await page
              .getByRole("button", { name: "다음 학생 상세 보기" })
              .click();
            await page
              .getByRole("region", { name: "다음 학생 · 학습 상세" })
              .waitFor();
            await page
              .getByRole("button", { name: "일별 활동", exact: true })
              .click();
            await expect(
              page.getByRole("region", { name: "탐험 활동 기록", exact: true }),
            ).toContainText("아직 완료한 개념 카드 탐험 기록이 없습니다.");
            await expect(
              page.getByRole("region", { name: "탐험 활동 기록", exact: true }),
            ).not.toContainText("15 / 15");
          }
        }
      }
      phase = `${width}:${mode}:font`;
      await waitForFont(page);
      const metrics = await page.evaluate(() => ({
        forbiddenPath: document.documentElement.dataset.forbiddenPath,
        fontLoaded: document.fonts.check("16px PolicyPretendard"),
        fontFamily: getComputedStyle(document.body).fontFamily,
        overflow: document.documentElement.scrollWidth > innerWidth,
        forbiddenRequests: Number(
          document.documentElement.dataset.forbiddenRequests,
        ),
      }));
      checks.push({ width, mode, ...metrics });
      assert.equal(metrics.fontLoaded, true);
      assert.ok(metrics.fontFamily.includes("PolicyPretendard"));
      assert.equal(metrics.overflow, false);
      assert.equal(metrics.forbiddenRequests, 0);
      await capture(page, `${mode}-${width}.png`);
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(rejectedRequests, []);
  phase = "complete";
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage
      .screenshot({
        path: path.join(output, `${evidenceName}-failure.png`),
        fullPage: false,
      })
      .catch(() => {});
    await writeFile(
      path.join(output, `${evidenceName}-failure.html`),
      await activePage.content(),
    );
  }
  throw error;
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
      path.join(output, `${evidenceName}.json`),
      JSON.stringify(
        {
          phase,
          pendingRequests: [...pendingRequests],
          checks,
          errors,
          rejectedRequests,
          browserClosed,
          serverClosed,
        },
        null,
        2,
      ),
    );
  }
}
