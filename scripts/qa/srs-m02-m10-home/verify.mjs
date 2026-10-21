import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { startServer } from "./server.mjs";
if (!process.argv.includes("--browser-granted"))
  throw Error("Wait for the lead to grant browser/server use.");
const output = process.env.QA_OUTPUT;
assert.ok(output, "Set QA_OUTPUT to the external evidence directory.");
await mkdir(output, { recursive: true });
let server, browser;
const rows = [],
  errors = [],
  rejected = [];
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    font: getComputedStyle(document.querySelector("h1")).fontFamily,
    loaded: document.fonts.check("18px HomePretendard"),
    katexCss: [...document.styleSheets].some((sheet) => {
      try {
        return [...sheet.cssRules].some((rule) =>
          rule.cssText.includes(".katex"),
        );
      } catch {
        return false;
      }
    }),
    brokenImages: [...document.images]
      .filter((i) => !i.complete || !i.naturalWidth)
      .map((i) => i.src),
  }));
  assert.equal(metrics.overflow, 0, name);
  assert.ok(
    metrics.loaded && metrics.font.includes("HomePretendard"),
    JSON.stringify(metrics),
  );
  assert.ok(metrics.katexCss, "Root KaTeX stylesheet is present");
  assert.deepEqual(metrics.brokenImages, []);
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: true,
  });
  rows.push({ name, ...metrics });
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
    for (const scene of ["done", "mixed", "recall", "short", "next"]) {
      await page.goto(`${origin}/?scene=${scene}`);
      await page
        .getByRole("heading", {
          name:
            scene === "next" ? "오늘도 한 칸씩 배워요" : "오늘 공부를 마쳤어요",
        })
        .waitFor();
      if (scene !== "next")
        await page.getByText("이상과 이하", { exact: false }).first().waitFor();
      await page.getByRole("button", { name: "길잡이 바꾸기: 담비" }).waitFor();
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete),
      );
      await capture(page, `${width}-${scene}`);
    }
    for (const failed of [false, true]) {
      await page.goto(`${origin}/?save=${failed ? "fail" : "ok"}`);
      const change = page.getByRole("button", { name: "길잡이 바꾸기: 담비" });
      await change.waitFor();
      await change.focus();
      await page.keyboard.press("Enter");
      await page
        .getByRole("heading", { name: "함께할 길잡이를 골라요" })
        .waitFor();
      assert.equal(
        await page
          .getByRole("heading", { name: "함께할 길잡이를 골라요" })
          .evaluate((n) => n === document.activeElement),
        true,
      );
      for (const name of [
        "또래 기록가",
        "담비",
        "종이 제비",
        "책갈피 정령",
        "나무 조각 친구",
      ])
        assert.equal(
          await page.getByRole("button", { name, exact: true }).count(),
          1,
        );
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete),
      );
      await capture(page, `${width}-${failed ? "failure" : "success"}-picker`);
      await page
        .getByRole("button", { name: "종이 제비", exact: true })
        .click();
      await page.getByRole("button", { name: "이 친구와 시작" }).click();
      await page
        .getByRole("button", { name: "길잡이 바꾸기: 종이 제비" })
        .waitFor();
      await page.getByAltText("종이 제비의 축하").waitFor();
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete),
      );
      await capture(
        page,
        `${width}-${failed ? "failure" : "success"}-returned`,
      );
      // The same choice takes the existing confirmation path and returns home.
      await page
        .getByRole("button", { name: "길잡이 바꾸기: 종이 제비" })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "종이 제비", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page.getByRole("button", { name: "이 친구와 시작" }).click();
      await page
        .getByRole("heading", { name: "오늘 공부를 마쳤어요" })
        .waitFor();
      // A fresh provider visit reads only the in-memory persisted selection.
      await page.locator("[data-qa-visit]").click();
      await page.locator("[data-qa-visit]").click();
      await page
        .getByRole("button", {
          name: failed ? "길잡이 바꾸기: 담비" : "길잡이 바꾸기: 종이 제비",
        })
        .waitFor();
    }
    await page.goto(`${origin}/?guide=new`);
    await page
      .getByRole("heading", { name: "함께할 길잡이를 골라요" })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "이 친구와 시작" }).isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "나무 조각 친구", exact: true })
      .click();
    await page.getByRole("button", { name: "이 친구와 시작" }).click();
    await page
      .getByRole("button", { name: "길잡이 바꾸기: 나무 조각 친구" })
      .waitFor();
    await page.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(rejected, []);
} finally {
  const version = browser?.version();
  try {
    await browser?.close();
  } finally {
    await server?.close();
  }
  await writeFile(
    path.join(output, "browser-results.json"),
    JSON.stringify({ version, rows, errors, rejected, closed: true }, null, 2),
  );
  console.log("finally: browser and server closed");
}
console.log(
  `${rows.length} captures; keyboard, picker, save success/failure, repeat choice and revisit passed`,
);
