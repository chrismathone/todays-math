import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { startServer } from "./server.mjs";

if (!process.argv.includes("--browser-granted"))
  throw Error(
    "Wait for the lead to grant Chromium, then pass --browser-granted.",
  );
const output = process.env.QA_OUTPUT;
assert.ok(output, "Set QA_OUTPUT to the external evidence directory.");
const before = process.argv.includes("--before");
if (before)
  assert.ok(
    process.env.QA_BASELINE_DIR,
    "Set QA_BASELINE_DIR for the starting SHA's components.",
  );
await mkdir(output, { recursive: true });
const server = await startServer();
const base = server.resolvedUrls.local[0];
const rows = [],
  errors = [],
  rejectedRequests = [];
let browser;
async function open(
  mode,
  { app = false, os = false, width = 390, extra = "" } = {},
) {
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    reducedMotion: os ? "reduce" : "no-preference",
  });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
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
  await page.addInitScript(
    ({ app }) =>
      localStorage.setItem(
        "todays-math:learning-motion:v1",
        app ? "reduce" : "full",
      ),
    { app },
  );
  await page.goto(`${base}?mode=${mode}${extra}`);
  const first =
    mode === "course"
      ? page.getByText("문제 1: 12 이상인 수를 고르세요.", { exact: true })
      : page.getByRole("heading", { name: /약수예요/ });
  if (mode === "explorer" && extra.includes("first"))
    await page.getByRole("button", { name: "오늘의 탐험 시작" }).click();
  await first.waitFor();
  await page.evaluate((mode) => {
    window.__motionTimeline = [];
    new MutationObserver(() => {
      for (const [kind, found] of [
        [
          "feedback",
          document.querySelector('[data-answer-feedback="correct"]'),
        ],
        [
          "next",
          document.body.textContent.includes(
            mode === "course"
              ? "문제 2: 12 이상인 수를 고르세요."
              : "다음 문항이에요.",
          ),
        ],
      ])
        if (
          found &&
          !window.__motionTimeline.some((event) => event.kind === kind)
        )
          window.__motionTimeline.push({ kind, at: performance.now() });
    }).observe(document.body, { childList: true, subtree: true });
  }, mode);
  return page;
}
const nextButton = (page) => page.getByRole("button", { name: /다음 문제/ });
const nextQuestion = (page, mode) =>
  mode === "course"
    ? page.getByText("문제 2: 12 이상인 수를 고르세요.", { exact: true })
    : page.getByRole("heading", { name: "다음 문항이에요." });
async function correct(page, mode) {
  if (mode === "course")
    await page.getByRole("button", { name: "3 12", exact: true }).click();
  else
    await page.getByRole("button", { name: "2 맞아요", exact: true }).click();
  await page.locator('[data-answer-feedback="correct"]').waitFor();
}
async function reachable(button) {
  await button.scrollIntoViewIfNeeded();
  const geometry = await button.evaluate((node) => {
    const r = node.getBoundingClientRect();
    let left = Math.max(0, r.left),
      right = Math.min(innerWidth, r.right);
    let top = Math.max(0, r.top),
      bottom = Math.min(innerHeight, r.bottom);
    for (
      let parent = node.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      const style = getComputedStyle(parent),
        box = parent.getBoundingClientRect();
      if (style.overflowX !== "visible") {
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
      }
      if (style.overflowY !== "visible") {
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
      }
    }
    const hit = document.elementFromPoint(
      (left + right) / 2,
      (top + bottom) / 2,
    );
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      visibleWidth: right - left,
      visibleHeight: bottom - top,
      visible:
        right - left >= Math.min(44, r.width) &&
        bottom - top >= Math.min(44, r.height) &&
        (node === hit || node.contains(hit)),
    };
  });
  assert.ok(geometry.visible, JSON.stringify(geometry));
  return geometry;
}
async function snapshot(page, name) {
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: true,
  });
}
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
  });
  if (before) {
    for (const mode of ["course", "explorer"])
      for (const app of [false, true]) {
        const page = await open(mode, { app });
        await correct(page, mode);
        await nextQuestion(page, mode).waitFor();
        const timeline = await page.evaluate(() => window.__motionTimeline);
        const elapsed =
          timeline.find((event) => event.kind === "next").at -
          timeline.find((event) => event.kind === "feedback").at;
        const expected = mode === "explorer" ? 1200 : 2000;
        assert.ok(
          elapsed >= expected - 100 && elapsed < expected + 1000,
          `${mode} baseline ${elapsed}ms`,
        );
        rows.push({
          mode,
          scenario: app ? "app-reduce-still-auto-before" : "full-auto-before",
          elapsed,
          timeline,
        });
        await snapshot(page, `before-${mode}-${app ? "reduce" : "full"}`);
        await page.close();
      }
  } else {
    for (const mode of process.env.QA_MODE
      ? [process.env.QA_MODE]
      : ["course", "explorer"]) {
      {
        const page = await open(mode);
        await correct(page, mode);
        await nextQuestion(page, mode).waitFor();
        const timeline = await page.evaluate(() => window.__motionTimeline);
        const elapsed =
          timeline.find((event) => event.kind === "next").at -
          timeline.find((event) => event.kind === "feedback").at;
        assert.ok(elapsed >= 1900 && elapsed <= 5000, `${mode}: ${elapsed}ms`);
        await page.waitForTimeout(2300);
        await expect(nextQuestion(page, mode)).toBeVisible();
        if (mode === "course")
          assert.equal(
            await page.locator("html").getAttribute("data-advances"),
            "1",
          );
        rows.push({ mode, scenario: "full-auto", elapsed, timeline });
        await snapshot(page, `${mode}-auto-next`);
        await page.close();
      }
      for (const source of ["app", "os"]) {
        for (const width of source === "app" ? [390, 1280] : [390]) {
          const page = await open(mode, { [source]: true, width });
          await correct(page, mode);
          await page.waitForTimeout(2500);
          await expect(nextQuestion(page, mode)).toHaveCount(0);
          const geometry = await reachable(nextButton(page));
          await snapshot(page, `${mode}-${source}-reduce-${width}`);
          // Real keyboard default activation of the focused next button.
          await nextButton(page).focus();
          await page.keyboard.press("Enter");
          await expect(nextQuestion(page, mode)).toBeVisible();
          await page.waitForTimeout(2300);
          await expect(nextQuestion(page, mode)).toBeVisible();
          rows.push({
            mode,
            scenario: `${source}-reduce-manual`,
            width,
            geometry,
          });
          await page.close();
        }
      }
      for (const source of ["app", "os"]) {
        const page = await open(mode);
        await correct(page, mode);
        await page.waitForTimeout(600);
        if (source === "app")
          await page
            .getByRole("button", { name: "기기 움직임 줄이기" })
            .click();
        else await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForTimeout(2500);
        await expect(nextQuestion(page, mode)).toHaveCount(0);
        await reachable(nextButton(page));
        // Switching back must retain an immediate manual way forward.
        if (source === "app")
          await page
            .getByRole("button", { name: "기기 움직임 줄이기" })
            .click();
        else await page.emulateMedia({ reducedMotion: "no-preference" });
        await nextButton(page).click();
        await expect(nextQuestion(page, mode)).toBeVisible();
        await page.waitForTimeout(2300);
        await expect(nextQuestion(page, mode)).toBeVisible();
        rows.push({ mode, scenario: `${source}-changed-while-waiting` });
        await page.close();
      }
      {
        const page = await open(mode);
        await correct(page, mode);
        await page.waitForTimeout(500);
        await page
          .getByRole("button", {
            name: mode === "course" ? "학습 홈" : "진도판",
            exact: true,
          })
          .click();
        await page.waitForTimeout(2500);
        await expect(nextQuestion(page, mode)).toHaveCount(0);
        rows.push({ mode, scenario: "exit-cancels" });
        await snapshot(page, `${mode}-exit`);
        await page.close();
      }
      {
        const page = await open(mode, {
          extra: mode === "explorer" ? "&first=1" : "",
        });
        await page
          .getByRole("button", {
            name: mode === "course" ? "1 10" : "2 아니에요",
            exact: true,
          })
          .click();
        await page.getByText("다시 해 볼까요", { exact: true }).waitFor();
        await page.waitForTimeout(2500);
        await expect(nextQuestion(page, mode)).toHaveCount(0);
        await snapshot(page, `${mode}-first-wrong`);
        await page
          .getByRole("button", {
            name: mode === "course" ? "1 11" : /1 아니에요/,
          })
          .click();
        await page.getByRole("heading", { name: "정답과 풀이" }).waitFor();
        await page.waitForTimeout(2500);
        await expect(nextQuestion(page, mode)).toHaveCount(0);
        const geometry = await reachable(
          page.getByRole("button", { name: "알겠어요" }),
        );
        await snapshot(page, `${mode}-second-wrong-solution`);
        await page.getByRole("button", { name: "알겠어요" }).click();
        await expect(nextQuestion(page, mode)).toBeVisible();
        rows.push({
          mode,
          scenario: "first-second-wrong-solution-manual",
          geometry,
        });
        await page.close();
      }
    }
    {
      const page = await open("course", { extra: "&manual=1" });
      await page.getByRole("textbox", { name: "나의 답" }).fill("12");
      await page.getByRole("button", { name: /답 확인/ }).click();
      await page.locator('[data-answer-feedback="correct"]').waitFor();
      await page.waitForTimeout(2500);
      await expect(nextQuestion(page, "course")).toHaveCount(0);
      await nextButton(page).click();
      await expect(nextQuestion(page, "course")).toBeVisible();
      rows.push({ mode: "course", scenario: "existing-manual-input" });
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(rejectedRequests, []);
} finally {
  try {
    await writeFile(
      path.join(
        output,
        before
          ? "browser-before-results.json"
          : process.env.QA_MODE
            ? `browser-${process.env.QA_MODE}-results.json`
            : "browser-results.json",
      ),
      JSON.stringify({ rows, errors, rejectedRequests }, null, 2),
    );
  } finally {
    try {
      await browser?.close();
    } finally {
      await server.close();
    }
  }
}
console.log(JSON.stringify({ passed: rows.length, errors, rejectedRequests }));
