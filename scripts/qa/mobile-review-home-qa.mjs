import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.BASE ?? "http://localhost:3000";
const output = resolve(process.env.QA_OUTPUT ?? ".qa-artifacts/mobile-review-home");
await mkdir(output, { recursive: true });

const student = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "test_s",
  classId: "22222222-2222-4222-8222-222222222222",
  className: "테스트반",
};
const sectionId = "5-1-2-1";
const elementary = {
  student,
  revision: 7,
  plan: {
    startSectionId: sectionId,
    dailyQuestionCount: 10,
    enabled: true,
    configuredAt: "2026-09-25T01:00:00.000Z",
  },
  summary: {
    status: "ready",
    currentSectionId: sectionId,
    dueCount: 0,
    todayAnswered: 2,
    todayCorrect: 2,
    todayGoal: 10,
    completedSections: 0,
    lastPracticedAt: "2026-09-25T01:00:00.000Z",
    nextReviewAt: null,
    recommendation: {
      sectionId,
      mode: "learn",
      reason: "풀던 문제부터 이어서 학습해요.",
    },
  },
  session: null,
};
const concepts = ["balance", "two-step", "distribute", "both-sides", "fractions", "word"];
const middle = {
  student,
  revision: 0,
  memories: concepts.map((conceptId) => ({
    conceptId,
    mastery: 0,
    stabilityDays: 1,
    lastReviewedAt: null,
    nextReviewAt: null,
    attempts: 0,
    successes: 0,
  })),
  mission: null,
  recentMissions: [],
  currentProgress: null,
  lectures: [],
  available: true,
};

async function capture(browser, browserName, width, kind, state) {
  const page = await browser.newPage({
    viewport: { width, height: 780 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await page.route("**/api/learn/math-srs**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: state }),
    }),
  );
  await page.goto(`${base}/dev/mobile-${kind}-review-qa`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "매일 쌓이는 수학" }).waitFor();
  await page.getByRole("heading", { name: "오늘의 학습" }).waitFor();
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const result = await page.evaluate(() => {
    const main = document.querySelector("main");
    const heading = document.querySelector("main header");
    const card = document.querySelector("main section[aria-labelledby]");
    const summary = document.querySelector("main aside[aria-label]");
    const style = (element, properties) => {
      const computed = getComputedStyle(element);
      return Object.fromEntries(properties.map((property) => [property, computed[property]]));
    };
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      main: style(main, ["paddingLeft", "paddingRight", "fontFamily"]),
      heading: style(heading.querySelector("h1"), ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "marginBottom"]),
      eyebrow: style(card.querySelector("p"), ["fontSize", "fontWeight", "color", "marginBottom"]),
      reason: style(card.querySelector("p:nth-of-type(3)"), ["fontSize", "fontWeight", "lineHeight", "marginTop", "marginBottom"]),
      card: style(card, ["paddingTop", "paddingLeft", "borderRadius", "backgroundColor"]),
      cardTitle: style(card.querySelector("h2"), ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "marginBottom"]),
      button: style(card.querySelector("button"), ["fontSize", "fontWeight", "height", "borderRadius", "backgroundColor"]),
      summary: style(summary, ["paddingTop", "paddingLeft", "borderRadius", "backgroundColor"]),
      summaryTitle: style(summary.querySelector("h2"), ["fontSize", "fontWeight", "lineHeight"]),
      summaryCount: style(summary.querySelector("p strong"), ["fontSize", "fontWeight", "color"]),
      boxes: { heading: box(heading), card: box(card), summary: box(summary) },
    };
  });
  assert.equal(result.scrollWidth, result.viewport, `${browserName}/${width}/${kind}: horizontal overflow`);
  await page.screenshot({ path: resolve(output, `${browserName}-${kind}-${width}.png`), fullPage: true });
  await page.close();
  return result;
}

for (const [browserName, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch();
  for (const width of [320, 390, 430]) {
    const elementaryResult = await capture(browser, browserName, width, "elementary", elementary);
    const middleResult = await capture(browser, browserName, width, "middle", middle);
    for (const key of ["main", "heading", "eyebrow", "reason", "card", "cardTitle", "button", "summary", "summaryTitle", "summaryCount"])
      assert.deepEqual(middleResult[key], elementaryResult[key], `${browserName}/${width}: ${key} differs`);
    for (const key of ["heading", "card", "summary"]) {
      assert.equal(middleResult.boxes[key].x, elementaryResult.boxes[key].x, `${browserName}/${width}: ${key} alignment differs`);
      assert.equal(middleResult.boxes[key].width, elementaryResult.boxes[key].width, `${browserName}/${width}: ${key} width differs`);
    }
    console.log(`${browserName} ${width}: shared typography, cards and alignment match`);
  }
  await browser.close();
}
