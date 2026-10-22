import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startServer } from "./server.mjs";

if (!process.argv.includes("--browser-granted"))
  throw Error("Coordinator browser/server lease is required.");
const output = process.env.QA_OUTPUT;
assert.ok(output, "QA_OUTPUT must name the external evidence directory.");
await mkdir(output, { recursive: true });
let server, browser, currentPage;
const captures = [],
  errors = [],
  rejected = [],
  checks = [];
let failure;
async function capture(page, name, hasMath = false) {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    font: getComputedStyle(document.querySelector("h1")).fontFamily,
    pretendard: [...document.fonts].some(
      (font) => font.family === "InsightPretendard" && font.status === "loaded",
    ),
    katex: [...document.fonts]
      .filter((font) => font.family.startsWith("KaTeX"))
      .map((font) => ({ family: font.family, status: font.status })),
    katexErrors: document.querySelectorAll(".katex-error").length,
    brokenImages: [...document.images]
      .filter((image) => !image.complete || !image.naturalWidth)
      .map((image) => image.src),
  }));
  assert.equal(metrics.overflow, 0, `${name}: document overflow`);
  assert.ok(
    metrics.pretendard && metrics.font.includes("InsightPretendard"),
    `${name}: product font`,
  );
  assert.equal(metrics.katexErrors, 0);
  assert.deepEqual(metrics.brokenImages, []);
  if (hasMath)
    assert.ok(
      metrics.katex.some(
        (font) => font.family === "KaTeX_Main" && font.status === "loaded",
      ),
      "actual KaTeX font loaded",
    );
  assert.ok(
    metrics.katex.every((font) => font.status !== "error"),
    "no failed KaTeX font",
  );
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: true,
  });
  captures.push({ name, ...metrics });
}
try {
  server = await startServer();
  const origin = new URL(server.resolvedUrls.local[0]).origin;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
  });
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    currentPage = page;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || url.pathname.startsWith("/api/")) {
        rejected.push(url.href);
        return route.abort();
      }
      return route.continue();
    });
    const open = async (scene) => {
      await page.goto(`${origin}/?scene=${scene}`);
      await page.getByRole("button", { name: /^예시 가람 상세 보기$/ }).click();
      await page
        .getByRole("heading", { name: "다시 살펴볼 학습 근거" })
        .waitFor();
    };
    for (const scene of [
      "ready",
      "loading",
      "empty",
      "outside",
      "error",
      "inconsistent",
    ]) {
      await open(scene);
      if (scene === "loading")
        await expect(page.getByText("학습 근거를 불러오는 중…")).toBeVisible();
      else if (["error", "inconsistent"].includes(scene))
        await expect(page.getByRole("alert")).toBeVisible();
      else
        await expect(
          page.getByRole("textbox", { name: "학습 근거에 관해 질문하기" }),
        ).toBeVisible();
      assert.equal(
        await page.evaluate(
          () =>
            window.insightQa.calls.filter((call) => call.method === "POST")
              .length,
        ),
        0,
        `${scene}: no automatic POST`,
      );
      await capture(
        page,
        `${width}-${scene}`,
        ["ready", "outside"].includes(scene),
      );
    }
    for (const scene of [
      "ready",
      "unavailable",
      "ai-error",
      "ai-inconsistent",
      "insufficient",
    ]) {
      await open(scene);
      const question = page.getByRole("textbox", {
        name: "학습 근거에 관해 질문하기",
      });
      await question.fill("어떤 기록과 다음 확인 후보를 볼까요?");
      await question.focus();
      await page.keyboard.press("Tab");
      const submit = page.getByRole("button", { name: "AI에 근거 질문하기" });
      await expect(submit).toBeFocused();
      const control = await submit.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        outline: getComputedStyle(element).outlineColor,
        width: getComputedStyle(element).outlineWidth,
      }));
      assert.ok(
        control.height >= 44 && control.width === "3px",
        "44px button with visible keyboard focus",
      );
      await page.keyboard.press("Enter");
      if (["unavailable", "ai-error", "ai-inconsistent"].includes(scene)) {
        await expect(page.getByRole("alert")).toContainText(
          "위 학습 근거는 계속 확인",
        );
        await expect(question).toHaveValue(
          "어떤 기록과 다음 확인 후보를 볼까요?",
        );
      } else
        await expect(
          page.getByText(
            scene === "insufficient"
              ? "질문에 답할 근거가 부족합니다"
              : "질문에 연결된 근거",
            { exact: true },
          ),
        ).toBeVisible();
      await expect(
        page.getByText("분수의 뺄셈", { exact: true }).first(),
      ).toBeVisible();
      assert.equal(
        await page.evaluate(
          () =>
            window.insightQa.calls.filter((call) => call.method === "POST")
              .length,
        ),
        1,
      );
      if (scene === "ready") {
        const link = page
          .getByRole("link", { name: "기록 1", exact: true })
          .first();
        await link.focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("details[open]")).toBeVisible();
        await expect(
          page.getByText("관찰에서 제외", { exact: false }),
        ).toBeVisible();
      }
      await capture(page, `${width}-${scene}-question`, true);
      checks.push({ width, scene, ...control });
    }
    for (const scene of ["late-get", "late-post"]) {
      await open(scene);
      if (scene === "late-post") {
        await page.getByRole("textbox").fill("늦게 도착하는 질문");
        await page.getByRole("button", { name: "AI에 근거 질문하기" }).click();
        await expect(
          page.getByText("질문에 맞는 근거를 확인하는 중…"),
        ).toBeVisible();
      }
      await page.getByRole("button", { name: /^예시 나래 상세 보기$/ }).click();
      await expect(
        page.getByRole("heading", { name: "예시 나래 · 학습 상세" }),
      ).toBeVisible();
      await expect(page.getByRole("textbox")).toHaveValue("");
      await page.evaluate(() => window.insightQa.release());
      await expect(
        page.getByText("질문에 연결된 근거", { exact: true }),
      ).toHaveCount(0);
      assert.ok(
        await page.evaluate(() =>
          window.insightQa.calls.some(
            (call) =>
              call.aborted &&
              call.url.includes("11111111-1111-4111-8111-111111111111") &&
              call.method ===
                (new URLSearchParams(location.search).get("scene") ===
                "late-get"
                  ? "GET"
                  : "POST"),
          ),
        ),
        "old context aborted",
      );
      await capture(page, `${width}-${scene}-switched`, true);
    }
    await open("late-post");
    await page.getByRole("textbox").fill("새로고침 전 질문");
    await page.getByRole("button", { name: "AI에 근거 질문하기" }).click();
    await page
      .getByRole("button", { name: "학습 근거 새로고침", exact: true })
      .click();
    await expect(page.getByRole("textbox")).toBeVisible();
    await page.evaluate(() => window.insightQa.release());
    await expect(
      page.getByText("질문에 연결된 근거", { exact: true }),
    ).toHaveCount(0);
    assert.deepEqual(await page.evaluate(() => window.insightQa.blocked), []);
    checks.push({ width, reloadRejectsLatePost: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(rejected, []);
} catch (error) {
  failure = error instanceof Error ? error.stack : String(error);
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({
      path: path.join(output, "failure.png"),
      fullPage: true,
    });
    await writeFile(
      path.join(output, "failure-page.txt"),
      await currentPage.locator("body").innerText(),
    );
    await writeFile(
      path.join(output, "failure-calls.json"),
      JSON.stringify(
        await currentPage.evaluate(() => window.insightQa),
        null,
        2,
      ),
    );
  }
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        captures,
        checks,
        errors,
        rejected,
        failure: failure ?? null,
        resourcesClosed: true,
      },
      null,
      2,
    ),
  );
}
if (failure) throw Error(failure);
console.log(
  JSON.stringify({
    captures: captures.length,
    checks: checks.length,
    errors: errors.length,
    rejected: rejected.length,
    resourcesClosed: true,
  }),
);
