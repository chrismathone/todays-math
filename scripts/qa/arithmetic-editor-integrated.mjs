import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const scope = process.env.ARITHMETIC_EDITOR_SCOPE ?? "all";
const output = `C:/Creative/testautocreator/.qa-artifacts/arithmetic-editor-integrated-20261015/${scope}`;
const allTitles = [
  "각도의 합",
  "직사각형의 둘레",
  "원기둥의 옆면 넓이에서 밑면의 반지름",
  "내접원 반지름과 둘레에서 넓이",
  "사다리꼴의 평행한 단면 선분",
  "외각 이등분선의 바깥 선분",
  "외각 이등분선에서 밑변",
  "현과 중심 사이의 거리",
  "특수각의 삼각비로 변의 길이",
];
const titles =
  scope === "segments"
    ? allTitles.slice(4, 7)
    : scope === "elementary"
      ? allTitles.slice(0, 3)
      : allTitles;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true }),
  results = [];
try {
  for (const width of [1440, 390]) {
    const result = {
      width,
      errors: [],
      blockedApi: [],
      review: [],
      output: [],
      passed: false,
    };
    results.push(result);
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1000 },
      isMobile: width === 390,
      hasTouch: width === 390,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => result.errors.push(e.message));
    await context.route("**/api/**", (route) => {
      result.blockedApi.push({
        url: route.request().url(),
        method: route.request().method(),
      });
      return route.abort("blockedbyclient");
    });
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
        const card = catalog.getByRole("button").filter({
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
        .fill("도형 편집기 통합 확인");
      await make.click();
      const review = page.getByRole("region", {
        name: "생성한 문항 검토",
        exact: true,
      });
      await expect(review).toBeVisible();
      await expect(review.getByRole("listitem")).toHaveCount(titles.length);
      await expect(review.locator("img")).toHaveCount(titles.length);
      await expect(review.locator(".katex-error")).toHaveCount(0);
      result.review = await review.locator("img").evaluateAll((imgs) =>
        imgs.map((img) => ({
          loaded: img.complete && img.naturalWidth > 0,
          rect: {
            width: img.getBoundingClientRect().width,
            height: img.getBoundingClientRect().height,
          },
          src: img.src,
        })),
      );
      assert(
        result.review.every(
          (i) =>
            i.loaded &&
            Math.abs(Math.max(i.rect.width, i.rect.height) - 280) < 1,
        ),
      );
      for (let i = 0; i < titles.length; i++) {
        const item = review.getByRole("listitem").nth(i);
        await item.scrollIntoViewIfNeeded();
        await item.screenshot({
          path: `${output}/${width}-review-${i + 1}.png`,
        });
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
      await expect(
        page.getByRole("button", { name: "내 시험지에 저장", exact: true }),
      ).toBeDisabled();
      const pages = page.locator('[data-page-kind="questions"]');
      await expect(pages.first()).toBeAttached();
      result.output = await pages.evaluateAll((nodes) =>
        nodes.map((n) => ({
          text: n.textContent,
          images: [...n.querySelectorAll("img")].map((i) => ({
            loaded: i.complete && i.naturalWidth > 0,
            src: i.src,
          })),
        })),
      );
      assert.equal(
        result.output.reduce((n, p) => n + p.images.length, 0),
        titles.length,
      );
      assert(result.output.every((p) => p.images.every((i) => i.loaded)));
      await expect(pages.locator(".katex-error")).toHaveCount(0);
      const dialog = page.getByRole("dialog", {
        name: "지면 확대 보기",
        exact: true,
      });
      for (let i = 0; i < result.output.length; i++) {
        await page
          .getByRole("button", { name: `${i + 1}쪽 확대`, exact: true })
          .click();
        await expect(dialog).toBeVisible();
        await dialog.screenshot({
          path: `${output}/${width}-paper-${i + 1}.png`,
        });
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
      }
      const displayed = result.output.flatMap((p) =>
        p.images.map((i) => i.src),
      );
      assert.deepEqual(
        displayed,
        result.review.map((i) => i.src),
        "review/output must use the same accepted presentation",
      );
      if (scope === "all") {
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
        await expect(
          page.locator('[data-arithmetic-step="output"] [data-studio-band]'),
        ).toBeHidden();
        result.printPages = await page
          .locator("[data-mathgen-document] [data-unified-paper]")
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const box = node.getBoundingClientRect();
              return {
                kind: node.getAttribute("data-page-kind"),
                width: box.width,
                height: box.height,
                images: [...node.querySelectorAll("img")].map((image) => {
                  const rect = image.getBoundingClientRect();
                  return {
                    loaded: image.complete && image.naturalWidth > 0,
                    inside:
                      rect.left >= box.left - 1 &&
                      rect.right <= box.right + 1 &&
                      rect.top >= box.top - 1 &&
                      rect.bottom <= box.bottom + 1,
                  };
                }),
              };
            }),
          );
        assert(result.printPages.length > 0);
        assert(
          result.printPages.every(
            (p) =>
              p.width > 700 &&
              p.height > 1000 &&
              p.images.every((i) => i.loaded && i.inside),
          ),
        );
        const pdfBytes = await page.pdf({
          path: `${output}/${width}-print.pdf`,
          preferCSSPageSize: true,
          printBackground: true,
        });
        const pdf = await PDFDocument.load(pdfBytes);
        result.pdfPages = pdf.getPageCount();
        assert.equal(
          result.pdfPages,
          result.printPages.length,
          "native print must contain exactly the paginated question/answer sheets",
        );
        await page.emulateMedia({ media: "screen" });
      }
      result.overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      assert.equal(result.overflow, 0);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.blockedApi, []);
      result.passed = true;
      console.log(
        `${width}: PASS ${titles.length} figures in actual review/output, zero API requests`,
      );
    } catch (error) {
      result.failure = String(error);
      await page.screenshot({
        path: `${output}/${width}-failure.png`,
        fullPage: true,
      });
      await writeFile(
        `${output}/${width}-failure.txt`,
        await page.locator("body").innerText(),
      );
      throw error;
    } finally {
      await context.close();
      await writeFile(`${output}/proof.json`, JSON.stringify(results, null, 2));
    }
  }
} finally {
  await browser.close();
}
