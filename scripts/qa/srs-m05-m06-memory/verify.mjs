import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { startServer } from "./server.mjs";

if (!process.argv.includes("--lead-approved"))
  throw new Error("Wait for the lead's explicit Chromium turn before running.");
const output =
  "/Users/pss/Desktop/creative/display-survey/srs-m05-m06-20261021";
await mkdir(output, { recursive: true });
const rows = [],
  errors = [],
  forbidden = [],
  layoutIssues = [];
const server = await startServer();
let browser;
let browserVersion;
try {
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
  });
  browserVersion = browser.version();
  const page = await browser.newPage();
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (!url.startsWith(base) || new URL(url).pathname.startsWith("/api/")) {
      forbidden.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  async function open(width, query) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(`${base}?${new URLSearchParams(query)}`, {
      waitUntil: "networkidle",
    });
    await page.locator("[data-fading-session]").waitFor();
  }
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() =>
      [...document.querySelectorAll("[data-fading-math-ready]")].every(
        (node) => node.getAttribute("data-fading-math-ready") === "true",
      ),
    );
    const evidence = await page.evaluate(() => {
      const header = document.querySelector("[data-fading-session] > header");
      const fill = header.querySelector("[style]");
      return {
        width: innerWidth,
        overflow: Math.max(
          0,
          document.documentElement.scrollWidth - innerWidth,
        ),
        overflowElements: [...document.querySelectorAll("body *")]
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width > 0 && rect.right > innerWidth + 1;
          })
          .slice(0, 12)
          .map((node) => ({
            tag: node.tagName,
            className: node.className,
            right: node.getBoundingClientRect().right,
          })),
        header: header.textContent,
        progressWidth: fill?.style.width,
        progressPercent: fill
          ? (100 * fill.getBoundingClientRect().width) /
            fill.parentElement.getBoundingClientRect().width
          : undefined,
        inputs: document.querySelectorAll("input").length,
        mathmlHidden: [...document.querySelectorAll(".katex-mathml")].every(
          (node) => getComputedStyle(node).position === "absolute",
        ),
        sentence: document
          .querySelector("[data-fading-sentence]")
          ?.getAttribute("data-fading-sentence"),
      };
    });
    await page.screenshot({
      path: path.join(output, `${name}.png`),
      fullPage: true,
    });
    rows.push({ name, ...evidence });
    // Layout observations are reported separately from M-05/M-06 assertions.
    if (evidence.overflow > 0) layoutIssues.push({ name, ...evidence });
    check(evidence.mathmlHidden, `${name}: KaTeX stylesheet missing`);
    check(
      Math.abs(evidence.progressPercent - parseFloat(evidence.progressWidth)) <
        1,
      `${name}: progress bar does not match its count`,
    );
  }
  const input = () => page.getByRole("textbox", { name: /빈칸 답 입력/ });
  async function answerAll(cards, count, name) {
    const answers = {
      "memory-0#1": "3",
      "memory-1#1": "포함",
      "memory-2#1": "큰",
      "memory-3#1": "작은",
    };
    for (let n = 0; n < 4; n++) {
      if (await page.getByRole("button", { name: /확실해요/ }).count())
        await page.getByRole("button", { name: /확실해요/ }).click();
      if (!(await input().count())) break;
      const target = await page
        .locator("[data-fading-blank][data-pending=true]")
        .getAttribute("data-fading-blank");
      check(answers[target], `Unknown pending target ${target}`);
      await input().fill(answers[target]);
      await input().press("Enter");
      if (n === 0) {
        await page.waitForFunction(
          (total) =>
            document
              .querySelector("[data-fading-session] > header")
              ?.textContent.includes(`1 / ${total} 완료`),
          count,
        );
        await capture(`${name}-in-progress`);
      }
      if (await page.getByRole("heading", { name: "4단계를 마쳤어요" }).count())
        break;
      if (
        !cards &&
        (await page.getByRole("button", { name: /단계 마치기/ }).isEnabled())
      )
        break;
    }
    if (!cards) await page.getByRole("button", { name: /단계 마치기/ }).click();
  }
  async function compare(cards, count) {
    if (cards) {
      for (let i = 0; i < count - 1; i++)
        await page
          .getByRole("button", { name: "다음 문장 보기", exact: true })
          .click();
      await page.getByRole("button", { name: "살펴보기 마치기" }).click();
    } else
      await page
        .getByRole("button", { name: /느낌 고르기|연습 마치기/ })
        .click();
  }
  for (const width of [390, 1440]) {
    for (const step of [2, 3]) {
      await open(width, { step: String(step) });
      check((await input().count()) === 0, "M-05 no-blank input remains");
      await capture(`m05-${width}-step${step}-no-blank`);
      // Native Enter on the existing pager, then normal Tab navigation in a real input.
      while (!(await input().count())) {
        await page
          .getByRole("button", { name: "다음 문장", exact: true })
          .focus();
        await page.keyboard.press("Enter");
      }
      await input().focus();
      await input().press("Tab");
      await capture(`m05-${width}-step${step}-blank`);
      await input().fill("오답");
      await input().press("Enter");
      await page.getByText(/다시 써 볼까요/).waitFor();
      await capture(`m05-${width}-step${step}-retry`);
      await input().press("Escape");
      await input().press("Tab");
      check(
        await input().evaluate((node) => node !== document.activeElement),
        "Escape did not restore native Tab",
      );
    }
    for (const [cards, count, giveUp, practice] of [
      [true, 3, false, false],
      [true, 4, false, false],
      [true, 4, true, false],
      [false, 3, false, false],
      [false, 4, true, false],
      [true, 4, false, true],
    ]) {
      const name = `m06-${width}-${cards ? "cards" : "chips"}-${count}-${practice ? "practice" : giveUp ? "give-up" : "answer"}`;
      await open(width, {
        step: "4",
        cards: cards ? "1" : "0",
        count: String(count),
        practice: practice ? "1" : "0",
      });
      check(
        (
          await page
            .locator("[data-fading-session] > header")
            .first()
            .innerText()
        ).includes(`0 / ${count} 완료`),
        `${name}: started with completed count`,
      );
      await capture(`${name}-start`);
      if (giveUp) {
        for (let i = 0; i < (cards ? count : 1); i++)
          await page
            .getByRole("button", { name: "아직 모르겠어요", exact: true })
            .click();
      } else await answerAll(cards, count, name);
      await compare(cards, count);
      await capture(`${name}-rating`);
      if (practice)
        await page.getByRole("button", { name: "연습 마치기" }).click();
      else
        await page
          .getByRole("button", { name: giveUp ? /^다시/ : /^쉬움/ })
          .click();
      await page
        .getByRole("heading", {
          name: practice ? "연습을 마쳤어요" : "풀이를 마쳤어요",
        })
        .waitFor();
      check(
        (
          await page
            .locator("[data-fading-session] > header")
            .first()
            .innerText()
        ).includes(`${count} / ${count} 완료`),
        `${name}: completed count reset`,
      );
      await capture(`${name}-done`);
    }
  }
  check(errors.length === 0, `Page errors: ${errors.join("; ")}`);
  check(forbidden.length === 0, "Non-local/API request attempted");
} finally {
  const shutdown = { browserClosed: false, serverClosed: false };
  try {
    await browser?.close();
    shutdown.browserClosed = true;
  } finally {
    try {
      await server.close();
      shutdown.serverClosed = true;
    } finally {
      await writeFile(
        path.join(output, "browser.json"),
        JSON.stringify(
          { rows, errors, forbidden, layoutIssues, browserVersion, shutdown },
          null,
          2,
        ),
      );
      console.info(JSON.stringify({ screenshots: rows.length, shutdown }));
    }
  }
}
