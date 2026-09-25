import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const baseUrl = process.env.BASE ?? "http://localhost:3000";
const output = resolve(
  process.env.QA_OUTPUT ?? ".qa-artifacts/mobile-middle-practice",
);
await mkdir(output, { recursive: true });
const ids = [
  "balance",
  "two-step",
  "distribute",
  "both-sides",
  "fractions",
  "word",
];
const id = "44444444-4444-4444-8444-444444444444";
const problems = Array.from({ length: 12 }, (_, index) => ({
  id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
  templateId: "m1-equation",
  conceptId: "balance",
  conceptWeights: [{ conceptId: "balance", weight: 1 }],
  difficulty: 1,
  kind: "warmup",
  prompt:
    index === 1
      ? "2번. 다음 이야기를 읽고 물음에 답하세요.\n\n" +
        Array(20)
          .fill(
            "수학 모임에서 친구들이 같은 수의 카드를 나누어 갖고 남은 카드를 세어 보았습니다.",
          )
          .join("\n\n") +
        "\n\n마지막 조건은 $3x=1$입니다. $x$를 구하시오."
      : `${index + 1}번. $3x=1$을 풀어라.`,
  equation: "",
  answerChoices: ["$\\frac{1}{3}$", "$\\frac{2}{3}$", "$-1$", "$3$"],
  hint: null,
  feedback: null,
  expectedSeconds: 30,
}));
const base = {
  student: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "test_s",
    classId: "22222222-2222-4222-8222-222222222222",
    className: "테스트반",
  },
  revision: 0,
  memories: ids.map((conceptId) => ({
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
const fresh = () => ({
  id,
  date: "2026-09-25",
  startedAt: "2026-09-25T01:00:00Z",
  completedAt: null,
  problems: structuredClone(problems),
  attempts: [],
});
let checked = 0;
for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [320, 390, 430]) {
      const page = await browser.newPage({
        viewport: { width, height: 600 },
        isMobile: true,
        hasTouch: true,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let mission = null;
      let calls = 0;
      await page.route("**/api/learn/math-srs**", async (route) => {
        const req = route.request();
        if (req.method() === "POST" && req.url().endsWith("/attempts")) {
          calls++;
          const data = req.postDataJSON();
          const p = mission.problems[mission.attempts.length];
          mission.attempts.push({
            problemId: p.id,
            templateId: p.templateId,
            conceptId: p.conceptId,
            kind: p.kind,
            submittedAnswer: data.submittedAnswer,
            correct: data.submittedAnswer === p.answerChoices[0],
            rating: "good",
            usedHint: false,
            elapsedSeconds: data.elapsedSeconds,
            answeredAt: "2026-09-25T01:01:00Z",
          });
          await new Promise((resolve) => setTimeout(resolve, 180));
        } else if (req.method() === "POST") mission = fresh();
        await route.fulfill({ json: { data: { ...base, mission } } });
      });
      await page.goto(`${baseUrl}/dev/mobile-middle-review-qa`);
      await page
        .getByRole("button", { name: "오늘의 복습 시작", exact: true })
        .click();
      const choices = page.getByRole("group", { name: "답 고르기" });
      await choices.getByRole("button").first().waitFor();
      await page.waitForTimeout(700);
      assert.equal(await choices.getByRole("button").count(), 4);
      assert.equal(await page.locator("input").count(), 0);
      const box = await choices.boundingBox();
      const nav = await page
        .getByRole("navigation", { name: "학생 학습 메뉴" })
        .boundingBox();
      assert.ok(
        box.y + box.height <= nav.y,
        `answers must stay above nav: ${JSON.stringify({ box, nav })}`,
      );
      assert.ok(nav.y - (box.y + box.height) < 30);
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        innerWidth,
        innerHeight,
        scrollY,
        body: document.body.getBoundingClientRect().toJSON(),
      }));
      assert.ok(
        dimensions.width <= dimensions.innerWidth &&
          dimensions.height <= dimensions.innerHeight,
        JSON.stringify(dimensions),
      );
      await page.screenshot({
        path: resolve(output, `${name}-middle-${width}-ready.png`),
      });
      await choices.getByRole("button").first().click();
      assert.equal(calls, 1);
      await page.locator('[data-answer-feedback="correct"]').waitFor();
      assert.deepEqual(await choices.boundingBox(), box);
      await page.waitForTimeout(350);
      await page.screenshot({
        path: resolve(output, `${name}-middle-${width}-correct.png`),
      });
      await page.waitForTimeout(1800);
      assert.deepEqual(await choices.boundingBox(), box);
      const scroll = page.locator('[data-page-turn="true"]');
      assert.equal(
        await scroll.evaluate((el) => el.scrollHeight > el.clientHeight),
        true,
        "long problem must scroll internally",
      );
      await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
      assert.deepEqual(await choices.boundingBox(), box);
      assert.equal(await page.evaluate(() => scrollY), 0);
      await page.screenshot({
        path: resolve(output, `${name}-middle-${width}-long.png`),
      });
      await choices.getByRole("button").nth(3).click();
      await page.locator('[data-answer-feedback="incorrect"]').waitFor();
      assert.deepEqual(await choices.boundingBox(), box);
      await page.waitForTimeout(350);
      await page.screenshot({
        path: resolve(output, `${name}-middle-${width}-incorrect.png`),
      });
      await page.waitForTimeout(1800);
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await scroll.evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
      assert.equal(errors.length, 0, errors.join("\n"));
      checked++;
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
console.log(
  `${checked} middle student mobile cases passed: immediate grading, feedback, automatic next, long-text scrolling, fixed dock and reduced motion.`,
);
