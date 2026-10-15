import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const output =
  "C:/Creative/testautocreator/.qa-artifacts/arithmetic-notation-20261015";
const titles = [
  "이등변삼각형의 높이 (근호)",
  "평행선과 엇갈린 각의 계산",
  "세 평행선 사이의 선분비",
  "같은 호의 원주각",
  "접선과 현이 이루는 각",
  "주어진 사인값으로 삼각형 넓이",
  "호의 길이에서 중심각",
  "같은 밑의 나눗셈 지수",
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

async function inspect(locator) {
  return locator.evaluateAll((nodes) =>
    nodes.map((node) => {
      const bounds = node.getBoundingClientRect();
      const math = [
        ...node.querySelectorAll('annotation[encoding="application/x-tex"]'),
      ].map((n) => n.textContent);
      const raw = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (
          !n.parentElement.closest(".katex,script,style") &&
          /[A-Za-z0-9∠⊥∥π%]/.test(n.textContent)
        )
          raw.push(n.textContent);
      }
      const overflow = [...node.querySelectorAll(".katex-html")]
        .filter((n) => {
          const b = n.getBoundingClientRect();
          return b.left < bounds.left - 2 || b.right > bounds.right + 2;
        })
        .map((n) => n.textContent);
      return {
        math,
        raw,
        overflow,
        arcs: node.querySelectorAll(".geom-arc-wrap").length,
        bars: node.querySelectorAll(".overline-line").length,
        errors: node.querySelectorAll(".katex-error").length,
      };
    }),
  );
}

try {
  for (const width of [1440, 390]) {
    const result = { width, errors: [], blockedApi: [], passed: false };
    results.push(result);
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1000 },
      isMobile: width === 390,
      hasTouch: width === 390,
    });
    await context.route("**/api/**", (route) => {
      result.blockedApi.push(route.request().url());
      return route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => result.errors.push(e.message));
    try {
      await page.goto(
        "http://127.0.0.1:3000/dev/workspace-alignment#arithmetic",
        { waitUntil: "domcontentloaded" },
      );
      const make = page.getByRole("button", {
        name: "연습지 만들기",
        exact: true,
      });
      await expect(make).toBeEnabled();
      await page
        .getByRole("checkbox", { name: "담은 유형 전체 선택", exact: true })
        .check();
      await page
        .getByRole("button", { name: "선택한 유형 빼기", exact: true })
        .click();
      const catalog = page.getByLabel("학년별 연산 유형", { exact: true });
      for (const title of titles) {
        await page.getByRole("searchbox", { name: "유형 찾기" }).fill(title);
        const card = catalog
          .getByRole("button")
          .filter({
            has: page.locator("strong").getByText(title, { exact: true }),
          });
        await expect(card).toHaveCount(1);
        await card.click();
        await page
          .getByRole("spinbutton", { name: title + " 문항 수", exact: true })
          .fill("1");
      }
      await page
        .getByRole("textbox", { name: "학습지 제목", exact: true })
        .fill("수학 표기 검수");
      await make.click();
      const review = page.getByRole("region", {
        name: "생성한 문항 검토",
        exact: true,
      });
      const bodies = review.locator("[data-native-problem]");
      await expect(bodies).toHaveCount(titles.length);
      result.review = await inspect(bodies);
      assert(
        result.review.every(
          (r) => !r.raw.length && !r.overflow.length && r.errors === 0,
        ),
        JSON.stringify(result.review),
      );
      const formulas = result.review.flatMap((r) => r.math).join("\n");
      assert.match(
        formulas,
        /\\overline\{\\mathrm\{AB\}\}.*=.*\\overline\{\\mathrm\{AC\}\}/,
      );
      assert.match(
        formulas,
        /\\overline\{\\mathrm\{AD\}\}.*\\perp.*\\overline\{\\mathrm\{BC\}\}/,
      );
      assert.match(formulas, /\\overleftrightarrow\{\\mathrm\{AD\}\}/);
      assert.match(formulas, /\\ell.*\\parallel m/);
      assert.match(formulas, /x.*\\ne 0/);
      assert(result.review.reduce((n, r) => n + r.arcs, 0) > 0);
      for (let i = 0; i < titles.length; i++) {
        await bodies.nth(i).scrollIntoViewIfNeeded();
        await review
          .getByRole("listitem")
          .nth(i)
          .screenshot({ path: `${output}/${width}-review-${i + 1}.png` });
      }
      await page
        .getByRole("button", { name: "정답 보기", exact: true })
        .click();
      await expect(review.getByLabel("정답", { exact: true })).toHaveCount(
        titles.length,
      );
      await page
        .getByRole("button", { name: "양식 구성·출력으로", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "인쇄 / PDF 저장", exact: true }),
      ).toBeEnabled();
      const paperBodies = page.locator(
        '[data-page-kind="questions"] [data-native-problem]',
      );
      await expect(paperBodies).toHaveCount(titles.length);
      result.paper = await inspect(paperBodies);
      assert(
        result.paper.every(
          (r) => !r.raw.length && !r.overflow.length && r.errors === 0,
        ),
        JSON.stringify(result.paper),
      );
      assert.deepEqual(
        result.paper.map((r) => r.math),
        result.review.map((r) => r.math),
      );
      await page
        .getByRole("checkbox", { name: "정답지 포함", exact: true })
        .check();
      await expect(
        page.locator('[data-page-kind="answers"]').first(),
      ).toBeAttached();
      await expect(
        page.getByRole("button", { name: "인쇄 / PDF 저장", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "인쇄 / PDF 저장", exact: true })
        .click();
      await page.emulateMedia({ media: "print" });
      result.print = await inspect(
        page.locator(
          '[data-mathgen-document] [data-page-kind="questions"] [data-native-problem]',
        ),
      );
      assert(
        result.print.every(
          (r) => !r.raw.length && !r.overflow.length && r.errors === 0,
        ),
        JSON.stringify(result.print),
      );
      result.domPages = await page
        .locator("[data-mathgen-document] [data-unified-paper]")
        .count();
      const bytes = await page.pdf({
        path: `${output}/${width}-print.pdf`,
        preferCSSPageSize: true,
        printBackground: true,
      });
      result.pdfPages = (await PDFDocument.load(bytes)).getPageCount();
      assert.equal(result.pdfPages, result.domPages);
      await page.emulateMedia({ media: "screen" });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        0,
      );
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.blockedApi, []);
      result.passed = true;
      console.log(
        `${width}: PASS actual review, output and ${result.pdfPages} PDF pages`,
      );
    } catch (error) {
      result.failure = String(error);
      await page.screenshot({
        path: `${output}/${width}-failure.png`,
        fullPage: true,
      });
      throw error;
    } finally {
      await context.close();
      await writeFile(
        `${output}/integrated.json`,
        JSON.stringify(results, null, 2),
      );
    }
  }
} finally {
  await browser.close();
}
