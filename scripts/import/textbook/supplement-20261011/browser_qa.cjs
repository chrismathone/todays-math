/** Inspect the standalone product-rendered packet in Chromium; no network/app writes. */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async () => {
  const [html, out] = process.argv.slice(2);
  if (!html || !out) throw new Error("HTML path and output directory required");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const checks = [];
  try {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.goto(pathToFileURL(path.resolve(html)).href);
      await page.evaluate(() => document.fonts.ready);
      checks.push(await page.evaluate((width) => ({
        width, rows: document.querySelectorAll("article").length,
        paperViews: document.querySelectorAll("[data-paper-view]").length,
        mathErrors: document.querySelectorAll(".katex-error,.math-error,.math-render-error").length,
        documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        contentOverflow: [...document.querySelectorAll("section[data-kind=content]")]
          .filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.closest("article").id),
        brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length,
        adjacentInlineDelimiters: [...document.querySelectorAll("article")].filter((element) => element.innerText.includes("$$")).map((element) => element.id),
      }), width));
      await page.screenshot({ path: path.join(out, `packet-${width}.png`), fullPage: false });
    }
    const failed = checks.some((row) => row.rows !== 20 || row.paperViews !== 60 || row.mathErrors || row.documentOverflow
      || row.contentOverflow.length || row.brokenImages || row.adjacentInlineDelimiters.length);
    fs.writeFileSync(path.join(out, "browser-qa.json"), JSON.stringify({ passed: !failed, checks,
      scope: "standalone PaperProblemView and production CSS; no full app or human approval" }, null, 2)+"\n");
    console.log(JSON.stringify({ passed: !failed, checks }));
    if (failed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
