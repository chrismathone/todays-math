import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const out = resolve(
  process.env.QA_OUTPUT ?? ".qa-artifacts/math-atelier-reflow",
);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const findings = [];
for (const [width, height] of [
  [320, 568],
  [640, 400],
])
  for (const kind of [
    "choice",
    "embedded",
    "fraction4",
    "fraction12",
    "long",
    "selfcheck",
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `${process.env.BASE ?? "http://127.0.0.1:4338"}/dev/mobile-practice-qa?kind=${kind}`,
    );
    await page.locator("[data-qa-ready=true]").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const question = page.getByRole("region", { name: "문제 내용" });
    assert.ok(
      (await question.boundingBox()).height >= 80,
      "paper remains readable",
    );
    const fractional = kind.startsWith("fraction");
    const group = page.getByRole("group", {
      name: fractional
        ? `${kind === "fraction12" ? 12 : 4}칸 중 칠할 칸 선택`
        : "답 고르기",
    });
    let target;
    if (fractional) {
      for (let i = 0; i < (kind === "fraction12" ? 5 : 2); i++)
        await group.getByRole("button").nth(i).click();
      target = page.getByRole("button", { name: "완성했어요" });
    } else if (kind === "selfcheck") {
      await page.getByRole("button", { name: "다 풀었어요" }).click();
      target = page.getByRole("button", { name: "혼자 풀었다고 생각해요" });
    } else target = group.getByRole("button").nth(kind === "embedded" ? 2 : 0);
    await target.scrollIntoViewIfNeeded();
    const hit = await target.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const node = document.elementFromPoint(
        b.x + b.width / 2,
        b.y + b.height / 2,
      );
      return { hit: el.contains(node), width: b.width, height: b.height };
    });
    assert.ok(
      hit.hit && hit.height >= 44 && hit.width >= 44,
      "answer centre is reachable",
    );
    await target.click();
    const result = page.locator("[data-answer-feedback=correct]");
    await result.waitFor();
    await result.scrollIntoViewIfNeeded();
    const geometry = await result.evaluate((el) => {
      const card = el.closest("section");
      const paper = card
        .querySelector("[data-page-turn=true]")
        .getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const choice = card
        .querySelector("[role=group]")
        ?.getBoundingClientRect();
      return {
        position: getComputedStyle(el).position,
        overlapPaper:
          Math.min(b.right, paper.right) > Math.max(b.left, paper.left) + 1 &&
          Math.min(b.bottom, paper.bottom) > Math.max(b.top, paper.top) + 1,
        overlapChoice:
          !!choice &&
          Math.min(b.right, choice.right) > Math.max(b.left, choice.left) + 1 &&
          Math.min(b.bottom, choice.bottom) > Math.max(b.top, choice.top) + 1,
        scrollWidth: document.documentElement.scrollWidth,
        text: el.textContent,
      };
    });
    assert.equal(geometry.position, "static");
    assert.equal(geometry.overlapPaper, false);
    assert.equal(geometry.overlapChoice, false);
    assert.ok(geometry.scrollWidth <= width);
    if (kind === "selfcheck") {
      assert.match(geometry.text, /記録|기록/);
      await page.waitForTimeout(1500);
      assert.equal(
        await result.count(),
        1,
        "self-assessment result remains until manual next",
      );
    }
    await page.screenshot({
      path: resolve(out, `${width}x${height}-${kind}.png`),
    });
    assert.deepEqual(errors, []);
    findings.push({ width, height, kind, hit, geometry });
    await page.close();
  }
await writeFile(resolve(out, "report.json"), JSON.stringify(findings, null, 2));
await browser.close();
console.log(
  `PASS ${findings.length} short/reflow choice, fraction, self-assessment cases`,
);
