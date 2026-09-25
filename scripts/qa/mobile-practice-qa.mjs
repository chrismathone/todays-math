import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".qa-artifacts/mobile-practice-20260925");
const base = process.env.BASE ?? "http://localhost:4310";
await mkdir(root, { recursive: true });
for (const [browserName, browserType] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await browserType.launch({ headless: true });
  for (const kind of ["choice", "embedded", "fraction4", "fraction12"]) {
    for (const width of [320, 390, 430]) {
      const page = await browser.newPage({
        viewport: { width, height: 700 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      });
      await page.goto(`${base}/dev/mobile-practice-qa?kind=${kind}`);
      await page.addStyleTag({
        content: "nextjs-portal { display: none !important; }",
      });
      if (kind === "embedded") {
        const question = page.getByRole("region", { name: "문제 내용" });
        await question.waitFor();
        assert.match(await question.innerText(), /28/);
        assert.match(await question.innerText(), /약수가 아닌 수/);
      } else {
        await page
          .getByText(
            kind === "choice"
              ? "36의 약수 중에서 두 번째로 작은 수를 구하시오."
              : /아래 막대에서 전체의/,
          )
          .waitFor();
      }
      const group = page.getByRole("group", {
        name:
          kind === "choice" || kind === "embedded"
            ? "답 고르기"
            : `${kind === "fraction12" ? 12 : 4}칸 중 칠할 칸 선택`,
      });
      await group.waitFor();
      const submit = page.getByRole("button", { name: /정답 확인/ });
      assert.equal(
        await page.getByRole("group", { name: "학습 화면" }).count(),
        0,
      );
      assert.equal(
        await group.getByRole("button").count(),
        kind === "choice" || kind === "embedded"
          ? 4
          : kind === "fraction12"
            ? 12
            : 4,
      );
      const boxes = {
        question: await page
          .getByRole("region", { name: "문제 내용" })
          .boundingBox(),
        answers: await group.boundingBox(),
        submit: await submit.boundingBox(),
      };
      const metrics = await page.evaluate(() => ({
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
      }));
      assert.equal(
        metrics.documentWidth,
        metrics.viewportWidth,
        `${kind} ${width}: horizontal overflow`,
      );
      assert.ok(boxes.question && boxes.answers && boxes.submit);
      assert.ok(
        boxes.question.y + boxes.question.height < boxes.answers.y,
        `${kind} ${width}: question/answer overlap`,
      );
      assert.ok(
        boxes.submit.y + boxes.submit.height <= metrics.viewportHeight,
        `${kind} ${width}: submit below initial viewport`,
      );
      console.log(JSON.stringify({ browserName, kind, width, boxes, metrics }));
      await page.screenshot({
        path: resolve(root, `${browserName}-${kind}-${width}.png`),
        fullPage: true,
      });
      if (kind === "embedded") {
        assert.equal(
          await page.getByRole("textbox", { name: "나의 답" }).count(),
          0,
        );
        assert.deepEqual(await group.locator(".katex-html").allTextContents(), [
          "2",
          "7",
          "23",
          "14",
        ]);
        assert.match(await page.getByRole("main").innerText(), /3\s*\/\s*5/);
        assert.equal(
          await page.getByRole("button", { name: "풀이 보기" }).count(),
          0,
        );
        await group.getByRole("button").nth(2).click();
        assert.equal(
          await group.getByRole("button").nth(2).getAttribute("aria-pressed"),
          "true",
        );
        await submit.click();
        await page.getByText("정확하게 풀었어요!").waitFor();
        const renderedAnswer = group.getByRole("button").nth(2);
        assert.equal(
          await renderedAnswer.locator(".katex-html").innerText(),
          "23",
        );
        assert.equal(
          await renderedAnswer.getAttribute("data-result"),
          "correct",
        );
        assert.doesNotMatch(await renderedAnswer.innerText(), /\$23\$/);
        const digits = await renderedAnswer
          .locator(".katex-html .mord")
          .boundingBox();
        assert.ok(digits && digits.width >= 12 && digits.height <= 25);
        await page.screenshot({
          path: resolve(root, `${browserName}-embedded-result-${width}.png`),
          fullPage: true,
        });
      }
      if (kind === "choice" && width === 320) {
        await group.getByRole("button").first().click();
        await page.screenshot({
          path: resolve(root, `${browserName}-choice-selected-320.png`),
          fullPage: true,
        });
        await submit.click();
        await page.getByText("정확하게 풀었어요!").waitFor();
        const card = page.locator(
          'section[aria-labelledby="course-question-title"]',
        );
        assert.ok(
          await card.isVisible(),
          "feedback replaced the question card",
        );
        assert.equal(
          await page.getByRole("button", { name: "풀이 보기" }).count(),
          0,
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth),
          width,
        );
        await page.screenshot({
          path: resolve(root, `${browserName}-inline-feedback-320.png`),
          fullPage: true,
        });
      }
      if (kind === "fraction12" && width === 320) {
        for (const index of [0, 1, 2, 3, 4])
          await group.getByRole("button").nth(index).click();
        await page.screenshot({
          path: resolve(root, `${browserName}-fraction12-selected-320.png`),
          fullPage: true,
        });
      }
      await page.close();
    }
  }
  await browser.close();
}
