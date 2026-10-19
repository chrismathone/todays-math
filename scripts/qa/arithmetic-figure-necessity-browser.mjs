import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  getArithmeticV2Definition,
} = require("../../src/lib/arithmetic-v2/registry.ts");
const {
  MIDDLE_FIGURE_POLICY,
} = require("../../src/lib/arithmetic-v2/presentation/figurePolicyMiddle.ts");

// Run with: node --import tsx scripts/qa/arithmetic-figure-necessity-browser.mjs
const output =
  "C:/Creative/testautocreator/.qa-artifacts/arithmetic-figure-necessity-20261015";
const samples = [
  "e6-cuboid-base-volume",
  "e5-trapezoid-area-bottom",
  "e4-angle-sum",
  "m1-prism-base-area-surface",
  "m2-right-triangle-height",
  "m3-circle-chord-length",
  "m1-parallel-angle",
  "m1-triangle-exterior",
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

async function metrics(bodies) {
  return bodies.evaluateAll((nodes) =>
    nodes.map((node) => {
      const bounds = node.getBoundingClientRect();
      const images = [...node.querySelectorAll("img")];
      const ink = [...node.querySelectorAll(".katex-html,img")].map((n) =>
        n.getBoundingClientRect(),
      );
      return {
        text: node.textContent,
        math: [...node.querySelectorAll("annotation")].map(
          (n) => n.textContent,
        ),
        images: images.length,
        svg: images.map((n) => decodeURIComponent(n.src.split(",")[1])),
        overflow: ink.some(
          (b) => b.left < bounds.left - 2 || b.right > bounds.right + 2,
        ),
        errors: node.querySelectorAll(".katex-error").length,
      };
    }),
  );
}

function check(rows) {
  for (const row of rows) {
    assert(!row.overflow && !row.errors, JSON.stringify(row));
    assert(!/겨냥도|\[그림\d+\]/.test(row.text), row.text);
    assert(
      row.svg.every((svg) => !/data-segment-(?:dimension|number)=/.test(svg)),
    );
  }
}

try {
  for (const width of [1440, 390]) {
    const result = { mode: "integrated", width, errors: [], blockedApi: [] };
    results.push(result);
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      isMobile: width === 390,
      hasTouch: width === 390,
    });
    await context.route("**/api/**", (route) => {
      result.blockedApi.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => result.errors.push(e.message));
    try {
      await page.goto(
        "http://127.0.0.1:3000/dev/workspace-alignment#arithmetic",
      );
      await expect(
        page.getByRole("button", { name: "연습지 만들기", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("checkbox", { name: "담은 유형 전체 선택", exact: true })
        .check();
      await page
        .getByRole("button", { name: "선택한 유형 빼기", exact: true })
        .click();
      const catalog = page.getByLabel("학년별 연산 유형", { exact: true });
      for (const id of samples) {
        const { title } = getArithmeticV2Definition(id);
        await page.getByRole("searchbox", { name: "유형 찾기" }).fill(title);
        await catalog
          .getByRole("button")
          .filter({
            has: page.locator("strong").getByText(title, { exact: true }),
          })
          .click();
        await page
          .getByRole("spinbutton", { name: title + " 문항 수", exact: true })
          .fill("1");
      }
      await page
        .getByRole("button", { name: "연습지 만들기", exact: true })
        .click();
      const review = page.getByRole("region", {
        name: "생성한 문항 검토",
        exact: true,
      });
      const bodies = review.locator("[data-native-problem]");
      await expect(bodies).toHaveCount(samples.length);
      result.review = await metrics(bodies);
      check(result.review);
      assert.deepEqual(
        result.review.map((row) => row.images),
        [0, 0, 0, 0, 1, 1, 1, 0],
      );
      assert(result.review[0].text.includes("밑넓이"));
      assert(
        result.review[1].text.includes("윗변") &&
          result.review[1].text.includes("아랫변"),
      );
      assert(result.review[3].text.includes("옆면은 모두 직사각형입니다."));
      assert(!result.review[7].text.includes("표시된"));
      for (let i = 0; i < samples.length; i++)
        await review
          .getByRole("listitem")
          .nth(i)
          .screenshot({ path: `${output}/${width}-${samples[i]}.png` });
      await page
        .getByRole("button", { name: "양식 구성·출력으로", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "인쇄 / PDF 저장", exact: true }),
      ).toBeEnabled();
      const printBodies = page.locator(
        '[data-page-kind="questions"] [data-native-problem]',
      );
      await expect(printBodies).toHaveCount(samples.length);
      result.paper = await metrics(printBodies);
      check(result.paper);
      assert.deepEqual(
        result.paper.map((row) => row.math),
        result.review.map((row) => row.math),
      );
      assert.deepEqual(
        result.paper.map((row) => row.images),
        result.review.map((row) => row.images),
      );
      await page
        .getByRole("button", { name: "인쇄 / PDF 저장", exact: true })
        .click();
      await page.emulateMedia({ media: "print" });
      await page
        .locator('[data-mathgen-document] [data-page-kind="questions"]')
        .first()
        .screenshot({ path: `${output}/${width}-print.png` });
      result.print = await metrics(
        page.locator(
          '[data-mathgen-document] [data-page-kind="questions"] [data-native-problem]',
        ),
      );
      check(result.print);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.blockedApi, []);
    } finally {
      await context.close();
    }
  }
  for (const policy of MIDDLE_FIGURE_POLICY.filter((row) => row.showFigure)) {
    const definition = getArithmeticV2Definition(policy.typeId);
    assert(definition.domainSize <= 100);
    const result = {
      mode: "all-retained",
      typeId: policy.typeId,
      count: definition.domainSize,
      errors: [],
      blockedApi: [],
    };
    results.push(result);
    const context = await browser.newContext({
      viewport: { width: 1100, height: 1200 },
    });
    await context.route("**/api/**", (route) => {
      result.blockedApi.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => result.errors.push(e.message));
    try {
      await page.goto(
        `http://127.0.0.1:3000/dev/arithmetic/grade-print?type=${policy.typeId}&count=${definition.domainSize}`,
      );
      await page.evaluate(() => document.fonts.ready);
      const bodies = page.locator(
        '[data-page-kind="questions"] [data-native-problem]',
      );
      await expect(bodies).toHaveCount(definition.domainSize);
      result.screen = await metrics(bodies);
      check(result.screen);
      assert(result.screen.every((row) => row.images === 1));
      await page
        .locator('[data-page-kind="questions"]')
        .first()
        .screenshot({ path: `${output}/retained-${policy.typeId}.png` });
      await page.emulateMedia({ media: "print" });
      result.print = await metrics(bodies);
      check(result.print);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.blockedApi, []);
    } finally {
      await context.close();
    }
  }
  console.log("PASS", results.length, "actual-route flows");
} finally {
  await browser.close();
  await writeFile(`${output}/browser.json`, JSON.stringify(results, null, 2));
}
