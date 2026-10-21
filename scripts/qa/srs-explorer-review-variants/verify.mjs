import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { startServer } from "./server.mjs";
if (!process.argv.includes("--browser-granted"))
  throw Error("Coordinator browser/server grant required");
const output = process.env.QA_OUTPUT;
assert.ok(output);
await mkdir(output, { recursive: true });
let server, browser, context, page;
const rows = [],
  errors = [],
  rejected = [];
const ids = [
  "g5-decimal-multiply",
  "g5-at-least",
  "g5-more-than",
  "g5-round",
  "g5-round-up",
];
try {
  server = await startServer();
  const origin = new URL(server.resolvedUrls.local[0]).origin;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
  });
  context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith("/api/")) {
      rejected.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  async function enter(query) {
    if (page.url().startsWith(origin))
      await page.evaluate(() => sessionStorage.clear());
    await page.goto(`${origin}/?${query}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.locator("[data-expedition-start]").click();
    await page
      .getByRole("button", { name: "아직 모르겠어요", exact: true })
      .waitFor();
  }
  async function capture(name) {
    // Next's dynamic MathText is lazy; a blank Suspense fallback is not evidence.
    await page.waitForFunction(
      () =>
        !!document.querySelector(".katex") &&
        [...document.querySelectorAll("[data-choice-text]")].every(
          (node) => node.textContent.trim().length > 0,
        ),
    );
    await page.evaluate(() => document.fonts.ready);
    const info = await page.evaluate(() => ({
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      font: document.fonts.check("16px HomePretendard"),
      katexErrors: document.querySelectorAll(".katex-error").length,
      view: window.__qaView(),
      actions: window.__qaActions,
      identity: window.__qaStored().profile.definitions.session.reviewVariant,
    }));
    assert.equal(info.documentWidth, info.width, name);
    assert.equal(info.font, true, name);
    assert.equal(info.katexErrors, 0, name);
    await page.screenshot({
      path: path.join(output, `${name}.png`),
      fullPage: true,
    });
    rows.push({ name, ...info });
    return info;
  }
  async function submit(correct) {
    const choices = await page.evaluate((right) => {
      const accepted = window.__qaAnswers();
      return window
        .__qaView()
        .currentActivity.choices.filter(
          (choice) => accepted.includes(choice.id) === right,
        )
        .map((choice) => choice.label);
    }, correct);
    const kind = await page.evaluate(
      () => window.__qaView().currentActivity.kind,
    );
    for (const label of choices) {
      const buttons = page.locator("button[data-answer-control][aria-pressed]");
      const labels = await buttons.evaluateAll((nodes) =>
        nodes.map((node) =>
          node
            .getAttribute("aria-label")
            .replace(/^\d+ /, "")
            .replace(/ 앞에서 고른 답$/, ""),
        ),
      );
      const position = labels.indexOf(label);
      assert.ok(position >= 0, `Missing rendered answer ${label}`);
      await buttons.nth(position).click();
    }
    if (kind === "examples")
      await page
        .getByRole("button", { name: "선택한 예 확인하기", exact: true })
        .click();
  }
  const examples = new Map();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ids) {
      await enter(`card=${id}&kind=1&run=1`);
      const first = await capture(`${width}-${id}-examples-1`);
      const labels = first.view.currentActivity.choices
        .map((choice) => choice.label)
        .sort();
      await submit(false);
      await page.waitForFunction(
        () => window.__qaView().currentActivity.followUp?.state === "again",
      );
      const retry = await capture(`${width}-${id}-retry`);
      assert.deepEqual(
        retry.view.currentActivity.choices,
        first.view.currentActivity.choices,
      );
      await page.reload({ waitUntil: "networkidle" });
      assert.deepEqual(
        await page.evaluate(() => window.__qaView().currentActivity.choices),
        first.view.currentActivity.choices,
      );
      await submit(false);
      await page
        .getByRole("button", { name: "알겠어요", exact: true })
        .waitFor();
      const solution = await capture(`${width}-${id}-solution`);
      assert.deepEqual(
        solution.view.currentActivity.solution.examples
          .map((example) => example.label)
          .sort(),
        labels,
      );
      await page.reload({ waitUntil: "networkidle" });
      assert.deepEqual(
        await page.evaluate(() => window.__qaView().currentActivity.solution),
        solution.view.currentActivity.solution,
      );
      await page.getByRole("button", { name: "알겠어요", exact: true }).click();
      await page.waitForFunction(
        (qid) => window.__qaView().currentActivity?.questionId !== qid,
        first.view.currentActivity.questionId,
      );
      await enter(`card=${id}&kind=1&run=2`);
      const next = await capture(`${width}-${id}-examples-2`);
      assert.notDeepEqual(
        next.view.currentActivity.choices.map((choice) => choice.label).sort(),
        labels,
      );
      examples.set(
        `${width}-${id}`,
        next.view.currentActivity.choices.map((choice) => choice.label).sort(),
      );
      await submit(true);
      await page.waitForFunction(
        () => window.__qaActions.at(-1)?.feedback.correct === true,
      );
      await enter(`card=${id}&kind=2&run=2`);
      await capture(`${width}-${id}-truth`);
      await submit(false);
      await page.waitForFunction(
        () => window.__qaView().currentActivity.followUp?.state === "again",
      );
      await page.locator('[data-previous="true"]').first().waitFor();
      await submit(true);
      await page.waitForFunction(
        () => window.__qaActions.at(-1)?.feedback.correct === true,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  for (const id of ids) {
    await enter(`card=${id}&kind=1&run=2&replay=1`);
    const replay = await capture(`390-${id}-variant-replay`);
    assert.deepEqual(
      replay.view.currentActivity.choices.map((choice) => choice.label).sort(),
      examples.get(`390-${id}`),
    );
    await submit(true);
    await page.waitForFunction(
      () => window.__qaActions.at(-1)?.feedback.correct === true,
    );
    await enter(`card=${id}&kind=1&run=1&static=1`);
    const old = await capture(`390-${id}-old-static`);
    await enter(`card=${id}&kind=1&run=2&static=1&replay=1`);
    const oldReplay = await capture(`390-${id}-old-replay`);
    assert.deepEqual(
      oldReplay.view.currentActivity.choices
        .map((choice) => choice.label)
        .sort(),
      old.view.currentActivity.choices.map((choice) => choice.label).sort(),
    );
    assert.equal(oldReplay.identity, undefined);
    await submit(true);
    await page.waitForFunction(
      () => window.__qaActions.at(-1)?.feedback.correct === true,
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(rejected, []);
} catch (error) {
  if (page) {
    await page
      .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
      .catch(() => {});
    console.error(
      await page
        .locator("body")
        .innerText()
        .catch(() => ""),
    );
  }
  throw error;
} finally {
  await context?.close();
  await browser?.close();
  await server?.close();
  await writeFile(
    path.join(output, "visual-results.json"),
    JSON.stringify(
      { rows, errors, rejected, cleanup: "context/browser/server awaited" },
      null,
      2,
    ),
  );
}
console.log(
  JSON.stringify({
    captures: rows.length,
    errors,
    rejected,
    cleanup: "context/browser/server awaited",
  }),
);
