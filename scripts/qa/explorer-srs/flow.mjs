import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.EXPLORER_QA_URL ?? "http://localhost:4310";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
  throw new Error("Use the isolated local explorer preview.");
const output = resolve(".qa-artifacts/explorer-srs");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(90_000);
const errors = [];
const api = [];
const rows = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (/\/api\//.test(request.url()))
    api.push({ method: request.method(), url: request.url().split("?")[0] });
});
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
async function capture(name) {
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    cards: document.querySelectorAll("[data-fading-sentence]").length,
    exposedChips: document.querySelectorAll("[data-fading-chip]").length,
    oldHome: !!document.querySelector("[data-explorer-home]"),
  }));
  assert(geometry.overflow === 0, `${name}: horizontal overflow`);
  assert(geometry.cards <= 1, `${name}: multiple learning prompts`);
  assert(geometry.exposedChips === 0, `${name}: visible answer tray`);
  rows.push({ name, ...geometry });
  await page.screenshot({
    path: resolve(output, `${name}.png`),
    fullPage: true,
  });
}
try {
  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
    await page.goto(`${base}/dev/explorer-srs`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator("[data-explorer-home]").waitFor();
    await page.waitForFunction(() => !!window.__EXPLORER_SRS_PREVIEW__);
    await page
      .getByRole("button", { name: "배울 개념 고르기", exact: true })
      .waitFor();
    await capture(`${width}-home`);
    await page
      .getByRole("button", { name: "배울 개념 고르기", exact: true })
      .click();
    await page.getByRole("combobox", { name: "개념 학년" }).waitFor();
    await capture(`${width}-catalog`);
    const starts = page.getByRole("button", { name: /선택하고 시작$/ });
    await starts.first().click();
    const session = page.locator(
      '[data-fading-session][data-fading-mode="cards"]',
    );
    await session.waitFor();
    await page.locator('[data-card-side="front"]').waitFor();
    await capture(`${width}-read-front`);
    await session.focus();
    await page.keyboard.press("Space");
    await page.locator('[data-card-side="back"]').waitFor();
    await capture(`${width}-read-back`);
    for (
      let guard = 0;
      guard < 8 && (await session.getAttribute("data-step")) === "1";
      guard++
    ) {
      const front = page.locator('[data-card-side="front"]');
      if (await front.count()) {
        await session.focus();
        await page.keyboard.press("Enter");
      }
      await page.getByRole("button", { name: /처음 봄$/ }).click();
    }
    await page.getByRole("textbox", { name: /빈칸 답 입력/ }).waitFor();
    await capture(`${width}-typed`);
    const pending = page.locator("[data-fading-blank][data-pending=true]");
    const targetId = await pending.getAttribute("data-fading-blank");
    const answer = await page.evaluate(async (id) => {
      const fixture = window.__EXPLORER_SRS_PREVIEW__;
      const state = await fixture.source.state();
      const concept = state.opened.concept;
      return concept.propositions
        .flatMap((item) => item.pieces)
        .find((piece) => piece.kind === "target" && piece.target.id === id)
        .target.text;
    }, targetId);
    const input = page.getByRole("textbox", { name: /빈칸 답 입력/ });
    await input.fill(answer);
    await input.press("Enter");
    await page.waitForFunction(
      (id) => !document.querySelector(`[data-fading-blank="${id}"]`),
      targetId,
    );
    await capture(`${width}-typed-filled`);
    await page
      .getByRole("button", { name: "풀이 나가기", exact: true })
      .click();
    await page
      .getByRole("button", { name: "나가기", exact: true })
      .last()
      .click();
    await page.locator("[data-explorer-home]").waitFor();
    await page
      .getByRole("button", { name: "개념 풀이 이어하기", exact: true })
      .waitFor();
    await capture(`${width}-resume`);
  }
  assert(errors.length === 0, `Browser errors: ${errors.join(" | ")}`);
  assert(api.length === 0, `Preview called API: ${JSON.stringify(api)}`);
  await writeFile(
    resolve(output, "report.json"),
    JSON.stringify({ rows, errors, api }, null, 2),
  );
  console.log(
    `Explorer preview: ${rows.length} states, ${errors.length} page errors, ${api.length} API calls.`,
  );
} catch (error) {
  await writeFile(
    resolve(output, "failure.json"),
    JSON.stringify({ message: String(error), rows, errors, api }, null, 2),
  );
  await page.screenshot({
    path: resolve(output, "failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
