import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Exercise the real card UI against the same in-memory rules as the server.
// No student records, credentials, external services or integration adapters.
const base = process.env.FADING_QA_URL ?? "http://127.0.0.1:4310";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
  throw new Error("A local dev URL is required.");
const output = resolve(".qa-artifacts/fading-cards");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(120_000);
const rows = [];
const errors = [];
const writes = [];
const external = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" || /hydration|In HTML/i.test(message.text()))
    errors.push(message.text());
});
page.on("request", (request) => {
  if (!request.url().startsWith(base)) external.push(request.url());
  if (request.method() !== "GET" && /\/api\//.test(request.url()))
    writes.push({ method: request.method(), url: request.url() });
});
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const session = () =>
  page.locator('[data-fading-session][data-fading-mode="cards"]');
async function readyMath() {
  await page.waitForFunction(() =>
    [
      ...document.querySelectorAll(
        "[data-fading-root] [data-fading-math-ready]",
      ),
    ].every((node) => node.dataset.fadingMathReady === "true"),
  );
  await page.evaluate(() => document.fonts.ready);
}
async function open(scene, width, concept) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
  const query = new URLSearchParams({ scene, cards: "1" });
  if (concept) query.set("concept", concept);
  await page.goto(`${base}/dev/fading?${query}`, {
    waitUntil: "domcontentloaded",
  });
  await session().waitFor();
  await readyMath();
}
async function capture(name) {
  await readyMath();
  const row = await page.locator("[data-fading-root]").evaluate((root) => {
    const visible = (node) =>
      node.getClientRects().length &&
      getComputedStyle(node).visibility !== "hidden";
    const controls = [...root.querySelectorAll("button,input,select,a")].filter(
      visible,
    );
    const smallControls = controls
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width < 43.5 || rect.height < 43.5;
      })
      .map((node) => node.getAttribute("aria-label") || node.textContent);
    return {
      width: innerWidth,
      step: root.querySelector("[data-fading-session]")?.dataset.step,
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      cards: root.querySelectorAll("[data-fading-sentence]").length,
      comparisonCards: root.querySelectorAll(
        "[data-fading-comparison-sentence]",
      ).length,
      chips: root.querySelectorAll("[data-fading-chip]").length,
      smallControls,
    };
  });
  rows.push({ name, ...row });
  check(row.overflow === 0, `${name}: horizontal overflow ${row.overflow}`);
  check(
    row.smallControls.length === 0,
    `${name}: small controls ${row.smallControls}`,
  );
  check(
    row.cards <= 1 && row.comparisonCards <= 1,
    `${name}: multiple concept cards`,
  );
  await page.screenshot({
    path: resolve(output, `${name}.png`),
    fullPage: true,
  });
  console.log(
    `${name}: step=${row.step}, cards=${row.cards}, overflow=${row.overflow}`,
  );
}
async function focusSession() {
  await session().focus();
}
async function finishComparison(different = false) {
  let usedDifferent = false;
  for (let guard = 0; guard < 12; guard++) {
    const region = page.getByRole("region", { name: "내 답과 기준안 대조" });
    check((await region.count()) === 1, "Missing full-bundle comparison");
    for (const field of await region.locator("fieldset").all()) {
      const name = different && !usedDifferent ? "다름" : "같은 뜻";
      await field.getByRole("button", { name, exact: true }).click();
      if (name === "다름") usedDifferent = true;
    }
    const next = page.getByRole("button", {
      name: "다음 문장 대조",
      exact: true,
    });
    if (await next.count()) await next.click();
    else {
      await page
        .getByRole("button", { name: "대조 마치기", exact: true })
        .click();
      return;
    }
  }
  throw new Error("Comparison did not end");
}
async function typeUnknowns() {
  for (let guard = 0; guard < 25; guard++) {
    const input = page.getByRole("textbox", { name: /핵심 답 입력/ });
    if (!(await input.count())) return;
    const label = await input.getAttribute("id");
    const before = await page.locator(`label[for="${label}"]`).innerText();
    await input.fill(`검증용 표현 ${guard + 1}`);
    await input.press("Enter");
    await page.waitForFunction(
      ({ label, before }) => {
        const current = document.querySelector(`label[for="${label}"]`);
        return !current || current.textContent !== before;
      },
      { label, before },
    );
  }
  throw new Error("Typed stage did not end");
}
try {
  let mathSample;
  for (const width of [320, 390, 768, 1280]) {
    await open("step1", width);
    mathSample ??= await page
      .locator('select[name="concept"] option')
      .filter({ hasText: "수식 표적 최다" })
      .first()
      .getAttribute("value");
    await capture(`${width}-anki-front`);
    for (
      let guard = 0;
      guard < 12 && (await session().getAttribute("data-step")) === "1";
      guard++
    ) {
      check(
        (await page.locator('[data-card-side="front"]').count()) === 1,
        "Anki front missing",
      );
      check(
        (await session().locator('[class*="sentence_"]').count()) === 0,
        "Front revealed the sentence",
      );
      await focusSession();
      await page.keyboard.press("Space");
      await page.locator('[data-card-side="back"]').waitFor();
      if (guard === 0) await capture(`${width}-anki-back`);
      const cardId = await page
        .locator("[data-fading-sentence]")
        .getAttribute("data-fading-sentence");
      await page.keyboard.press("1");
      await page.waitForFunction((cardId) => {
        const card = document.querySelector("[data-fading-sentence]");
        return (
          !card ||
          card.getAttribute("data-fading-sentence") !== cardId ||
          document
            .querySelector("[data-fading-session]")
            ?.getAttribute("data-step") !== "1"
        );
      }, cardId);
    }
    for (const step of [2, 3]) {
      check(
        (await session().getAttribute("data-step")) === String(step),
        `Missing step ${step}`,
      );
      check(
        (await session().locator("[data-fading-chip]").count()) > 0,
        `No chips in ${step}`,
      );
      await capture(`${width}-step${step}-chips`);
      await page
        .getByRole("button", { name: "아직 모르겠어요", exact: true })
        .click();
      await page
        .getByRole("heading", { name: `${step}단계를 마쳤어요`, exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "다음 단계", exact: true })
        .click();
    }
    check(
      (await session().locator("[data-fading-chip]").count()) === 0,
      "Typed stage showed chips",
    );
    await capture(`${width}-step4-typed`);
    const input = page.getByRole("textbox", { name: /핵심 답 입력/ });
    await input.fill("띄어쓰기");
    await input.press("Space");
    check(
      (await input.inputValue()) === "띄어쓰기 ",
      "Space did not stay inside input",
    );
    await input.press("Tab");
    check(
      await input.evaluate((node) => document.activeElement === node),
      "Tab lost typing focus",
    );
    await input.press("Shift+Tab");
    await typeUnknowns();
    await page
      .getByRole("heading", { name: "4단계를 마쳤어요", exact: true })
      .waitFor();
    await capture(`${width}-typed-comparison`);
    check(
      (await page.getByRole("button", { name: /^알맞음/ }).count()) === 0,
      "Rating before comparison",
    );
    await finishComparison(width === 320);
    await capture(`${width}-rating`);
    await page
      .getByRole("button", { name: width === 320 ? /^다시/ : /^알맞음/ })
      .click();
    await page
      .getByRole("heading", { name: "풀이를 마쳤어요", exact: true })
      .waitFor();
    await capture(`${width}-done`);

    await open("step4", width, mathSample);
    await capture(`${width}-cold-math-before-input`);
    check(
      (await page.getByRole("textbox", { name: /핵심 답 입력/ }).count()) === 0,
      "Cold review skipped confidence",
    );
    await focusSession();
    await page.keyboard.press("3");
    await page.getByRole("textbox", { name: /핵심 답 입력/ }).waitFor();
    check(
      (await session().locator("[data-fading-chip]").count()) === 0,
      "Math received a chip exception",
    );
    await capture(`${width}-cold-math-input`);
  }
  check(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  check(writes.length === 0, "Dev card verification wrote through an API");
  check(external.length === 0, `External requests: ${external.join("; ")}`);
} finally {
  await writeFile(
    resolve(output, "results.json"),
    JSON.stringify({ rows, errors, writes, external }, null, 2),
  );
  await browser.close();
}
console.log(
  `${rows.length} card screens passed; external requests=${external.length}; API writes=${writes.length}`,
);
