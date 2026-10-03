import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const stage = process.argv[2] ?? "after";
const dir = "docs/planning/tracks/reports/bank-decide-render";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1250 },
  });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const measurements = [];
  for (const [media, view] of [
    ["screen", "student"],
    ["print", "teacher"],
  ]) {
    await page.emulateMedia({ media });
    await page.goto(`http://127.0.0.1:4217/choice-figures.html?view=${view}`);
    await page.locator("[data-problem]").first().waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    measurements.push({
      media,
      view,
      problems: await page.locator("[data-problem]").evaluateAll((problems) =>
        problems.map((problem) => {
          const grid = problem.querySelector("[data-hwpx-grid]");
          return {
            id: problem.getAttribute("data-problem"),
            columns: getComputedStyle(grid).gridTemplateColumns,
            placeholders: problem.textContent.split("[그림]").length - 1,
            choiceImages: grid.querySelectorAll("img").length,
            images: [...problem.querySelectorAll("img")].map((image) => ({
              width: image.width,
              height: image.height,
              complete: image.complete,
            })),
          };
        }),
      ),
    });
    await page.screenshot({
      path: `${dir}/${stage}-${media}.png`,
      fullPage: true,
    });
    if (media === "print")
      await page.pdf({
        path: `${dir}/${stage}-print.pdf`,
        preferCSSPageSize: true,
        printBackground: true,
      });
  }
  assert.deepEqual(pageErrors, []);
  if (stage === "after") {
    for (const measured of measurements) {
      assert.equal(measured.problems.length, 2);
      for (const problem of measured.problems) {
        assert.equal(problem.choiceImages, 5);
        assert.equal(problem.placeholders, 0);
        assert.equal(problem.columns.split(" ").length, 2);
        assert.equal(
          new Set(problem.images.slice(1).map((image) => image.width)).size,
          1,
        );
      }
    }
    await page.emulateMedia({ media: "screen" });
    await page.setViewportSize({ width: 375, height: 900 });
    const small = await page.locator("[data-hwpx-grid]").evaluateAll((grids) =>
      grids.map((grid) => ({
        columns: getComputedStyle(grid).gridTemplateColumns,
        cells: [...grid.children].map((cell) => {
          const image = cell.querySelector("img");
          const mark = cell.firstElementChild;
          const bounds = image.getBoundingClientRect();
          return {
            width: bounds.width,
            ratio: bounds.height / bounds.width,
            naturalRatio: image.naturalHeight / image.naturalWidth,
            aligned:
              Math.abs(bounds.top - mark.getBoundingClientRect().top) < 1,
            inside: bounds.right <= cell.getBoundingClientRect().right + 1,
          };
        }),
      })),
    );
    for (const grid of small) {
      assert.equal(grid.columns.split(" ").length, 2);
      for (const cell of grid.cells) {
        assert(cell.aligned && cell.inside);
        assert(Math.abs(cell.ratio - cell.naturalRatio) < 0.001);
      }
    }
  }
  await writeFile(
    `${dir}/${stage}-measurements.json`,
    JSON.stringify(measurements, null, 2),
  );
  console.log(JSON.stringify(measurements));
} finally {
  await browser.close();
}
