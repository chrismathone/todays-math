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
    await page.goto(`${base}/dev/mobile-practice-qa?kind=path`);
    await page
      .locator("nextjs-portal")
      .evaluateAll((items) => items.forEach((item) => item.remove()));
    const path = page.getByRole("list", { name: "오늘의 세로 진도 길" });
    await path.waitFor();
    assert.equal(await path.locator("li").count(), 10);
    assert.equal(
      await path.getByRole("button", { name: /풀이 보기/ }).count(),
      5,
    );
    const current = path.getByRole("button", {
      name: "6번부터 다음 5문제 시작",
    });
    await current.waitFor();
    await page.waitForFunction(() => {
      const board = document.querySelector(
        'ol[aria-label="오늘의 세로 진도 길"]',
      );
      return board && board.scrollTop > 100;
    });
    await page.waitForTimeout(700);
    const pathBox = await path.boundingBox();
    const currentBox = await current.boundingBox();
    console.log(
      JSON.stringify({
        name,
        width,
        pathBox,
        currentBox,
        scroll: await path.evaluate((node) => ({
          top: node.scrollTop,
          height: node.clientHeight,
          full: node.scrollHeight,
        })),
      }),
    );
    assert.ok(pathBox && currentBox);
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
    await path.getByRole("button", { name: "5번 완료, 풀이 보기" }).click();
    await page.getByRole("dialog", { name: "풀이" }).waitFor();
    await page.getByRole("button", { name: "풀이 닫기" }).click();
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
  const homePath = home.getByRole("list", { name: "오늘의 세로 진도 길" });
  await homePath.waitFor();
  await home.waitForFunction(() => window.scrollY > 100);
  await home.waitForTimeout(700);
  assert.equal(await homePath.locator("li").count(), 10);
  assert.equal(
    await homePath
      .getByRole("button", { name: "6번부터 다음 5문제 시작" })
      .count(),
    1,
  );
  assert.equal(await homePath.evaluate((node) => node.scrollTop), 0);
  assert.equal(
    await home.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  const homeCurrent = await homePath
    .getByRole("button", { name: "6번부터 다음 5문제 시작" })
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
    await reduced.getByRole("list", { name: "오늘의 세로 진도 길" }).waitFor();
    const animation = await reduced
      .locator('[class*="playerPiece"]')
      .evaluate((node) => getComputedStyle(node).animationName);
    assert.equal(
      animation,
      "none",
      "reduced motion must disable piece movement",
    );
    await reduced.close();
  }
  await browser.close();
}
console.log(`Mobile progress path and inline feedback passed: ${output}`);
