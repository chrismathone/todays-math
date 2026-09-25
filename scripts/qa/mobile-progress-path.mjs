import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.BASE ?? "http://localhost:4311";
const output = resolve(".qa-artifacts/mobile-progress-path");
await mkdir(output, { recursive: true });

for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch({ headless: true });
  for (const [width, height] of [
    [320, 600],
    [390, 600],
    [430, 600],
    [320, 700],
    [390, 700],
    [430, 700],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
    });
    await page.route("**/api/learn/math-srs/replay**", (route) => {
      const input =
        route.request().method() === "POST"
          ? route.request().postDataJSON()
          : null;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            kind: "elementary",
            step: 5,
            problemId: "55555555-5555-4555-8555-555555555555",
            title: "약수와 배수",
            subtitle: "초5 · 1학기 · 약수와 배수",
            content: "36의 약수 중에서 두 번째로 작은 수를 구하시오.",
            figureUrl: null,
            answerChoices: ["$2$", "$3$", "$4$", "$6$"],
            interactive: null,
            correct: input ? true : null,
            canRevealSolution: true,
            solution: input?.revealSolution
              ? {
                  answer: "$2$",
                  solution:
                    "36의 약수를 작은 수부터 쓰면 $1, 2, 3, 4, 6, 9, 12, 18, 36$입니다.",
                }
              : null,
          },
        }),
      });
    });
    await page.goto(`${base}/dev/mobile-practice-qa?kind=path`);
    await page
      .locator("nextjs-portal")
      .evaluateAll((items) => items.forEach((item) => item.remove()));
    const path = page.getByLabel("오늘의 학습 보드", { exact: true });
    await path.waitFor();
    assert.equal(await path.locator("li[data-step]").count(), 10);
    assert.equal(
      await path.getByRole("button", { name: /다시 풀기/ }).count(),
      5,
    );
    const current = path.getByRole("button", {
      name: "6번부터 다음 5문제 시작",
    });
    await current.waitFor();
    await page.waitForTimeout(700);
    const ring = path.getByRole("list", {
      name: "시계 방향으로 이동하는 문제 칸",
    });
    const pathBox = await ring.boundingBox();
    const currentBox = await current.boundingBox();
    assert.ok(pathBox && currentBox);
    assert.ok(
      Math.abs(pathBox.width - pathBox.height) < 2,
      "board perimeter must be square",
    );
    const cells = await ring.locator("li[data-step]").evaluateAll((items) =>
      items.map((item) => ({
        row: Number(item.style.gridRow),
        column: Number(item.style.gridColumn),
      })),
    );
    assert.ok(
      cells.every(
        ({ row, column }) =>
          row === 1 || row === 4 || column === 1 || column === 4,
      ),
      "problem tiles must follow the outer four edges",
    );
    assert.ok(
      currentBox.y >= pathBox.y - 2 &&
        currentBox.y + currentBox.height <= pathBox.y + pathBox.height + 2,
      `${name} ${width}x${height}: current step outside path viewport`,
    );
    assert.ok(
      currentBox.y + currentBox.height <= height,
      `${name} ${width}x${height}: next tile below initial viewport`,
    );
    const metrics = await page.evaluate(() => ({
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    assert.equal(
      metrics.documentWidth,
      metrics.viewportWidth,
      `${name} ${width}x${height}: horizontal overflow`,
    );
    await page.screenshot({
      path: resolve(output, `${name}-path-${width}x${height}.png`),
      fullPage: true,
    });
    await path.getByRole("button", { name: "5번 완료, 다시 풀기" }).click();
    const replay = page.getByRole("dialog", { name: "5번 문제 다시 풀기" });
    await replay.waitFor();
    const choices = replay
      .getByRole("group", { name: "복습 답 고르기" })
      .getByRole("button");
    await choices.first().waitFor();
    assert.equal(await choices.count(), 4);
    assert.equal(await replay.getByRole("textbox").count(), 0);
    const replaySubmit = await replay
      .getByRole("button", { name: "정답 확인" })
      .boundingBox();
    assert.ok(
      replaySubmit && replaySubmit.y + replaySubmit.height <= height - 5,
      "replay submit must fit on screen",
    );
    const choiceBoxes = await Promise.all(
      [0, 1, 2, 3].map((index) => choices.nth(index).boundingBox()),
    );
    assert.equal(choiceBoxes[0].y, choiceBoxes[1].y);
    assert.equal(choiceBoxes[2].y, choiceBoxes[3].y);
    assert.ok(choiceBoxes.every((box) => box.height >= 44));
    if (height === 600)
      await page.screenshot({
        path: resolve(output, `${name}-replay-${width}x${height}.png`),
      });
    await choices.first().click();
    await replay.getByRole("button", { name: "정답 확인" }).click();
    await replay.getByText("✓ 정확하게 풀었어요!").waitFor();
    await replay.getByRole("button", { name: "풀이 보기" }).click();
    const solution = page.getByRole("dialog", { name: "복습 풀이" });
    await solution.waitFor();
    await solution.locator(".katex").first().waitFor();
    assert.equal(
      (await solution.innerText()).includes("$"),
      false,
      "answer must render as math",
    );
    assert.deepEqual(
      await ring.boundingBox(),
      pathBox,
      "solution modal must not reflow the board",
    );
    await page.getByRole("button", { name: "풀이 닫기" }).click();
    await replay.getByRole("button", { name: "진도판으로" }).click();
    assert.equal(
      await path.locator('[data-state="complete"]').count(),
      5,
      "replay must preserve board progress",
    );
    await current.click();
    await page.getByRole("group", { name: "답 고르기" }).waitFor();
    await page.close();
  }

  for (const [answerIndex, expected] of [
    [0, "정확하게 풀었어요!"],
    [1, "다시 풀 문제로 모았어요"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 600 },
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(`${base}/dev/mobile-practice-qa?kind=choice`);
    await page
      .locator("nextjs-portal")
      .evaluateAll((items) => items.forEach((item) => item.remove()));
    const group = page.getByRole("group", { name: "답 고르기" });
    const choice = group.getByRole("button").nth(answerIndex);
    for (let attempt = 0; attempt < 5; attempt++) {
      await choice.click();
      if ((await choice.getAttribute("aria-pressed")) === "true") break;
      await page.waitForTimeout(300);
    }
    assert.equal(await choice.getAttribute("aria-pressed"), "true");
    await page.screenshot({
      path: resolve(
        output,
        `${name}-${answerIndex === 0 ? "correct" : "incorrect"}-before-390x600.png`,
      ),
      fullPage: true,
    });
    const submitBox = await page
      .getByRole("button", { name: /정답 확인/ })
      .boundingBox();
    assert.ok(
      submitBox && submitBox.y + submitBox.height <= 600,
      `${name}: submit below 600px viewport`,
    );
    await page.getByRole("button", { name: /정답 확인/ }).click();
    await page.getByText(expected).waitFor();
    await page.waitForTimeout(450);
    const nextBox = await page
      .getByRole("button", { name: /다음 문제/ })
      .boundingBox();
    assert.ok(
      nextBox && nextBox.y + nextBox.height <= 600,
      `${name}: next button below 390x600 viewport`,
    );
    assert.equal(await group.getByRole("button").count(), 4);
    assert.equal(
      await page.getByRole("button", { name: "풀이 보기" }).count(),
      0,
    );
    assert.equal(await page.getByText("나의 답").count(), 0);
    if (answerIndex === 1) {
      assert.equal(
        await group.getByRole("button").first().getAttribute("data-result"),
        null,
        "wrong answer must not reveal the correct choice",
      );
    }
    await page.screenshot({
      path: resolve(
        output,
        `${name}-${answerIndex === 0 ? "correct" : "incorrect"}-after-390x600.png`,
      ),
      fullPage: true,
    });
    await page.close();
  }
  for (const [kind, width] of [
    ["choice", 320],
    ["embedded", 320],
    ["fraction12", 320],
    ["embedded", 390],
    ["fraction12", 390],
  ]) {
    const compact = await browser.newPage({
      viewport: { width, height: 600 },
      isMobile: true,
      hasTouch: true,
    });
    await compact.goto(`${base}/dev/mobile-practice-qa?kind=${kind}`);
    const submit = compact.getByRole("button", { name: /정답 확인/ });
    await submit.waitFor();
    const box = await submit.boundingBox();
    assert.ok(
      box && box.y + box.height <= 600,
      `${name} ${kind}: submit below ${width}x600 viewport`,
    );
    await compact.close();
  }
  const selfCheck = await browser.newPage({
    viewport: { width: 390, height: 600 },
    isMobile: true,
    hasTouch: true,
  });
  await selfCheck.goto(`${base}/dev/mobile-practice-qa?kind=selfcheck`);
  await selfCheck.getByRole("button", { name: "다 풀었어요" }).waitFor();
  await selfCheck.waitForTimeout(300);
  assert.equal(
    await selfCheck.getByRole("button", { name: "풀이 보기" }).count(),
    0,
  );
  await selfCheck.getByRole("button", { name: "다 풀었어요" }).click();
  await selfCheck.getByRole("button", { name: "다시 연습할래요" }).waitFor();
  assert.equal(
    await selfCheck.getByRole("dialog", { name: "풀이" }).isVisible(),
    false,
  );
  assert.equal(await selfCheck.getByText("정답", { exact: true }).count(), 0);
  await selfCheck.getByRole("button", { name: "다시 연습할래요" }).click();
  await selfCheck.getByText("다시 풀 문제로 모았어요").waitFor();
  assert.equal(
    await selfCheck.getByRole("button", { name: "풀이 보기" }).count(),
    0,
  );
  await selfCheck.close();
  const home = await browser.newPage({
    viewport: { width: 390, height: 600 },
    isMobile: true,
    hasTouch: true,
  });
  const now = new Date().toISOString();
  const sectionId = "5-1-2-1";
  await home.route("**/api/learn/math-srs/course", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          student: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "test_s",
            classId: "22222222-2222-4222-8222-222222222222",
            className: "테스트반",
          },
          revision: 1,
          plan: {
            startSectionId: sectionId,
            dailyQuestionCount: 10,
            enabled: true,
            configuredAt: now,
          },
          summary: {
            status: "learning",
            currentSectionId: sectionId,
            dueCount: 0,
            todayAnswered: 5,
            todayCorrect: 5,
            todayGoal: 10,
            completedSections: 0,
            lastPracticedAt: now,
            nextReviewAt: null,
            recommendation: {
              sectionId,
              mode: "learn",
              reason: "다음 학습을 이어가요.",
            },
          },
          session: null,
        },
      }),
    }),
  );
  await home.goto(`${base}/dev/mobile-elementary-review-qa`);
  await home
    .locator("nextjs-portal")
    .evaluateAll((items) => items.forEach((item) => item.remove()));
  const homePath = home.getByLabel("오늘의 학습 보드", { exact: true });
  await homePath.waitFor();
  await home.waitForTimeout(700);
  assert.equal(await homePath.locator("li[data-step]").count(), 10);
  assert.equal(
    await homePath
      .getByRole("button", { name: "오늘의 추천 학습 시작" })
      .count(),
    1,
  );
  assert.equal(await home.evaluate(() => scrollY), 0);
  assert.equal(
    await home.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  const homeCurrent = await homePath
    .getByRole("button", { name: "오늘의 추천 학습 시작" })
    .boundingBox();
  assert.ok(
    homeCurrent &&
      homeCurrent.y >= 0 &&
      homeCurrent.y + homeCurrent.height <= 600,
    `${name}: home next tile below initial viewport`,
  );
  await home.screenshot({
    path: resolve(output, `${name}-home-initial-390x600.png`),
  });
  await home.screenshot({
    path: resolve(output, `${name}-home-390x600.png`),
    fullPage: true,
  });
  await home.close();
  if (name === "webkit") {
    const reduced = await browser.newPage({
      viewport: { width: 390, height: 600 },
      reducedMotion: "reduce",
    });
    await reduced.goto(`${base}/dev/mobile-practice-qa?kind=path`);
    await reduced.getByLabel("오늘의 학습 보드", { exact: true }).waitFor();
    const animation = await reduced
      .getByLabel("내 말, 5번까지 완료", { exact: true })
      .evaluate((node) => node.getAnimations().length);
    assert.equal(animation, 0, "reduced motion must disable piece movement");
    await reduced.close();
  }
  await browser.close();
}
console.log(`Mobile progress path and inline feedback passed: ${output}`);
