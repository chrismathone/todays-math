import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const base = process.env.BASE ?? "http://localhost:3000";
const output = resolve(".qa-artifacts/answer-frame");
await mkdir(output, { recursive: true });
let cases = 0;
for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  for (const [width, height] of [
    [320, 600],
    [390, 700],
    [430, 780],
  ]) {
    for (const kind of [
      "choice",
      "embedded",
      "fraction4",
      "fraction12",
      "long",
    ].filter(
      (kind) =>
        !process.env.QA_KINDS || process.env.QA_KINDS.split(",").includes(kind),
    )) {
      const page = await browser.newPage({
        viewport: { width, height },
        isMobile: true,
        hasTouch: true,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}/dev/mobile-practice-qa?kind=${kind}`);
      await page.locator('[data-qa-ready="true"]').waitFor();
      await page.addStyleTag({
        content: "nextjs-portal {display:none!important}",
      });
      await page.getByRole("region", { name: "문제 내용" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const fractional = kind.startsWith("fraction");
      const denominator = kind === "fraction12" ? 12 : 4;
      const group = page.getByRole("group", {
        name: fractional ? `${denominator}칸 중 칠할 칸 선택` : "답 고르기",
      });
      const nav = page.getByRole("navigation", { name: "학생 학습 메뉴" });
      const box = await group.boundingBox();
      const navBox = await nav.boundingBox();
      const question = page.getByRole("region", { name: "문제 내용" });
      const questionBox = await question.boundingBox();
      assert.ok(
        questionBox.height > 60,
        `${name} ${kind} ${width}: problem viewport too small`,
      );
      assert.ok(
        questionBox.y + questionBox.height <= box.y + 1,
        "problem overlaps choices",
      );
      assert.ok(box.y + box.height <= navBox.y, "answers overlap tabs");
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollHeight),
        height,
        "document scrolls",
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        "horizontal overflow",
      );
      if (!fractional) {
        assert.ok(
          navBox.y - (box.y + box.height) <= 22,
          "choices not immediately above tabs",
        );
        assert.equal(
          await page.getByRole("button", { name: /정답 확인/ }).count(),
          0,
        );
        const boxes = await group.getByRole("button").evaluateAll((nodes) =>
          nodes.map((n) => {
            const r = n.getBoundingClientRect();
            return { y: r.y, h: r.height };
          }),
        );
        assert.equal(boxes.length, 4);
        assert.equal(boxes[0].y, boxes[1].y);
        assert.equal(boxes[2].y, boxes[3].y);
        assert.ok(boxes.every((b) => b.h >= 44));
        await group
          .getByRole("button")
          .nth(kind === "embedded" ? 2 : 0)
          .click();
      } else {
        for (let n = 0; n < (denominator === 12 ? 5 : 2); n++)
          await group.getByRole("button").nth(n).click();
        await page.getByRole("button", { name: "완성했어요" }).click();
      }
      const effect = page.locator('[data-answer-feedback="correct"]');
      await effect.waitFor();
      assert.equal(
        await effect.evaluate((n) => getComputedStyle(n).position),
        "absolute",
      );
      assert.equal(
        await effect.evaluate((n) => getComputedStyle(n).pointerEvents),
        "none",
      );
      assert.deepEqual(
        await group.boundingBox(),
        box,
        "answer feedback moves choices",
      );
      assert.equal(
        await page.getByRole("button", { name: "풀이 보기" }).count(),
        0,
      );
      if (width === 390 && !fractional) await page.waitForTimeout(250);
      if (width === 390 && !fractional)
        await page.screenshot({
          path: resolve(output, `${name}-${kind}-effect.png`),
        });
      await page.waitForFunction(
        () => !document.querySelector("[data-answer-feedback]"),
      );
      const nextChoices = page.getByRole("group", { name: "답 고르기" });
      await nextChoices.waitFor();
      const turning = page.locator('[data-page-turn="true"]');
      assert.equal(
        await turning.count(),
        1,
        "next problem must have page-turn effect",
      );
      if (width === 390 && kind === "long")
        await page.screenshot({
          path: resolve(output, `${name}-page-turn.png`),
        });
      await page.waitForTimeout(550);
      if (!fractional)
        assert.deepEqual(
          await nextChoices.boundingBox(),
          box,
          "next question moves choices",
        );
      if (kind === "long") {
        assert.ok(
          await question.evaluate((n) => n.scrollHeight > n.clientHeight + 100),
          "long problem not internally scrollable",
        );
        await question.evaluate((n) => (n.scrollTop = n.scrollHeight));
        assert.deepEqual(
          await nextChoices.boundingBox(),
          box,
          "scrolling problem moves choices",
        );
        assert.equal(await page.evaluate(() => scrollY), 0);
        await page.screenshot({
          path: resolve(output, `${name}-long-${width}.png`),
        });
        await nextChoices.getByRole("button").nth(1).click();
        await page.locator('[data-answer-feedback="incorrect"]').waitFor();
        assert.deepEqual(await nextChoices.boundingBox(), box);
        assert.equal(
          await page.locator('[data-result="correct"]').count(),
          0,
          "wrong answer reveals correct option",
        );
        await page.screenshot({
          path: resolve(output, `${name}-wrong-${width}.png`),
        });
        await page.waitForFunction(
          () => !document.querySelector("[data-answer-feedback]"),
        );
        await page.waitForTimeout(550);
        assert.deepEqual(
          await nextChoices.boundingBox(),
          box,
          "short question after long moves choices",
        );
        assert.equal(
          await question.evaluate((n) => n.scrollTop),
          0,
          "next page retains old scroll",
        );
      }
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ name, kind, width, height, choices: box }));
      cases++;
      await page.close();
    }
  }
  const page = await browser.newPage({
    viewport: { width: 390, height: 700 },
    reducedMotion: "reduce",
  });
  await page.goto(`${base}/dev/mobile-practice-qa`);
  await page.locator('[data-qa-ready="true"]').waitFor();
  await page
    .getByRole("group", { name: "답 고르기" })
    .getByRole("button")
    .first()
    .click();
  await page.waitForFunction(() =>
    document.querySelector('[data-page-turn="true"]'),
  );
  assert.equal(
    await page
      .locator('[data-page-turn="true"]')
      .evaluate((n) => getComputedStyle(n).animationName),
    "none",
  );
  await page.close();
  await browser.close();
}
console.log(
  `PASS ${cases} frame/feedback transitions + 2 reduced-motion checks`,
);
