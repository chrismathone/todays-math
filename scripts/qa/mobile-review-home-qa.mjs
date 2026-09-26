import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.BASE ?? "http://localhost:3000";
const output = resolve(
  process.env.QA_OUTPUT ?? ".qa-artifacts/mobile-review-home",
);
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
const concepts = [
  "balance",
  "two-step",
  "distribute",
  "both-sides",
  "fractions",
  "word",
];
const middleProblems = Array.from({ length: 12 }, (_, index) => ({
  id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
  templateId: "replay-qa",
  conceptId: "balance",
  conceptWeights: [{ conceptId: "balance", weight: 1 }],
  difficulty: 1,
  kind: "warmup",
  prompt: "방정식을 풀어 보세요.",
  equation: "$x+1=3$",
  expectedSeconds: 30,
  hint: null,
  feedback: null,
}));
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
  mission: {
    id: "44444444-4444-4444-8444-444444444444",
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
      new Date(),
    ),
    startedAt: new Date().toISOString(),
    completedAt: null,
    problems: middleProblems,
    attempts: middleProblems.slice(0, 2).map((problem) => ({
      problemId: problem.id,
      templateId: problem.templateId,
      conceptId: problem.conceptId,
      kind: problem.kind,
      submittedAnswer: "2",
      correct: true,
      rating: "good",
      usedHint: false,
      elapsedSeconds: 20,
      answeredAt: new Date().toISOString(),
    })),
  },
  recentMissions: [],
  currentProgress: null,
  lectures: [],
  available: true,
};

async function capture(browser, browserName, width, kind, state, phase) {
  const title = kind === "elementary" ? "약수와 배수" : "등식의 성질";
  const subtitle = kind === "elementary" ? "초5 · 1학기" : "중1 · 일차방정식";
  const journey = {
    completedDays: 2,
    todayComplete: false,
    todayAnswered: 2,
    todayGoal: kind === "elementary" ? 10 : 12,
    days: ["2026-09-23", "2026-09-24"].map((date) => ({
      id: `${kind}:${date}`,
      date,
      completedAt: `${date}T01:00:00.000Z`,
      title,
      subtitle,
      reviewCount: 2,
    })),
    upcoming: Array.from({ length: 12 }, () => ({ title, subtitle })),
  };
  const page = await browser.newPage({
    viewport: { width, height: 780 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  let release;
  const responseGate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/learn/math-srs**", async (route) => {
    if (route.request().url().includes("/replay")) {
      const submitted =
        route.request().method() === "POST"
          ? route.request().postDataJSON()
          : null;
      assert.equal(
        submitted?.dayId ??
          new URL(route.request().url()).searchParams.get("dayId"),
        `${kind}:2026-09-23`,
      );
      assert.ok(!submitted?.recordRetry, "past-day review must be read-only");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            kind,
            step: 1,
            problemId: middleProblems[0].id,
            title: kind === "elementary" ? "약수와 배수" : "등식의 성질",
            subtitle:
              kind === "elementary" ? "초5 · 1학기" : "중1 · 일차방정식",
            content: "다음 식을 계산하세요. $1+1$",
            figureUrl: null,
            answerChoices: ["$2$", "$3$", "$4$", "$5$"],
            interactive: null,
            correct: submitted ? submitted.submittedAnswer === "$2$" : null,
            canRevealSolution: false,
            solution: null,
          },
        }),
      });
      return;
    }
    if (phase === "loading") await responseGate;
    await route.fulfill({
      status: phase === "error" ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        phase === "error"
          ? { error: { message: "저장소 준비 중" } }
          : { data: { ...state, journey } },
      ),
    });
  });
  await page.goto(`${base}/dev/mobile-${kind}-review-qa`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "매일 쌓이는 수학" }).waitFor();
  if (phase === "ready")
    await page.getByRole("heading", { name: "전체 학습 진도" }).waitFor();
  else
    await page
      .getByRole("main")
      .getByRole(phase === "loading" ? "status" : "alert")
      .waitFor();
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  const result = await page.evaluate((phase) => {
    const main = document.querySelector("main");
    const heading = document.querySelector("main header");
    const card =
      phase === "ready"
        ? document.querySelector('section[aria-label="전체 학습 진도판"]')
        : document.querySelector(
            phase === "loading"
              ? 'main [role="status"]'
              : 'main [role="alert"]',
          );
    const style = (element, properties) => {
      const computed = getComputedStyle(element);
      return Object.fromEntries(
        properties.map((property) => [property, computed[property]]),
      );
    };
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      main: style(main, ["paddingLeft", "paddingRight", "fontFamily"]),
      heading: style(heading.querySelector("h1"), [
        "fontSize",
        "fontWeight",
        "lineHeight",
        "letterSpacing",
        "marginBottom",
      ]),
      card: style(card, [
        "paddingTop",
        "paddingLeft",
        "borderRadius",
        "backgroundColor",
        "fontSize",
        "lineHeight",
        "color",
      ]),
      className: card.className,
      boxes: { heading: box(heading), card: box(card) },
    };
  }, phase);
  assert.equal(
    result.scrollWidth,
    result.viewport,
    `${browserName}/${width}/${kind}: horizontal overflow`,
  );
  if (phase === "loading")
    assert.equal(
      await page.getByRole("main").getByRole("status").innerText(),
      "학습 기록을 불러오는 중…",
    );
  if (phase === "ready") {
    const board = page.getByLabel("전체 학습 진도", { exact: true });
    await board.waitFor();
    assert.ok(
      await board
        .getByText(kind === "elementary" ? "약수와 배수" : "등식의 성질", {
          exact: true,
        })
        .count(),
    );
    assert.equal(
      await page.evaluate(() => scrollY),
      0,
      "home must not hide the unit by auto-scrolling",
    );
  }
  await page.screenshot({
    path: resolve(output, `${browserName}-${kind}-${phase}-${width}.png`),
    fullPage: true,
  });
  if (phase === "ready") {
    const opener = page.getByRole("button", { name: /^1일차,.*다시 풀기/ });
    await opener.click();
    const replay = page.getByRole("dialog", { name: "1번 문제 다시 풀기" });
    const choices = replay
      .getByRole("group", { name: "복습 답 고르기" })
      .getByRole("button");
    await choices.nth(1).click();
    await replay.getByText("다시 풀 문제로 모았어요").waitFor();
    assert.equal(
      await replay.getByRole("button", { name: "풀이 보기" }).count(),
      0,
    );
    await choices.first().waitFor({ state: "visible" });
    await page.waitForFunction(
      () => !document.querySelector('[data-answer-feedback="incorrect"]'),
    );
    await choices.first().click();
    await replay.getByText("정확하게 풀었어요").waitFor();
    assert.equal(
      await replay.getByRole("button", { name: "다음 복습 문제" }).count(),
      1,
    );
    await replay.getByRole("button", { name: "복습 닫기" }).click();
    assert.equal(
      await page.locator('li[data-state="complete"]').count(),
      2,
      "replay must not advance another daily stage",
    );
    assert.equal(
      await opener.evaluate((node) => document.activeElement === node),
      true,
      "closing replay must return focus to its tile",
    );
  }
  release();
  await page.unrouteAll({ behavior: "wait" });
  await page.close();
  return result;
}

for (const [browserName, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  for (const width of [320, 390, 430]) {
    for (const phase of ["loading", "error", "ready"]) {
      const elementaryResult = await capture(
        browser,
        browserName,
        width,
        "elementary",
        elementary,
        phase,
      );
      const middleResult = await capture(
        browser,
        browserName,
        width,
        "middle",
        middle,
        phase,
      );
      for (const key of ["main", "heading", "card", "className"])
        assert.deepEqual(
          middleResult[key],
          elementaryResult[key],
          `${browserName}/${width}: ${key} differs`,
        );
      for (const key of ["heading", "card"]) {
        assert.equal(
          middleResult.boxes[key].x,
          elementaryResult.boxes[key].x,
          `${browserName}/${width}: ${key} alignment differs`,
        );
        assert.equal(
          middleResult.boxes[key].width,
          elementaryResult.boxes[key].width,
          `${browserName}/${width}: ${key} width differs`,
        );
      }
      console.log(
        `${browserName} ${width} ${phase}: shared layout, typography and alignment match`,
      );
    }
  }
  await browser.close();
}
