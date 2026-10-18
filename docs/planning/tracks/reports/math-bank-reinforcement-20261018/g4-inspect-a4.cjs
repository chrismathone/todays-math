/** Inspect only the static, locally rendered A4 artifact. No server, DB or API. */
const { chromium } = require("@playwright/test");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

async function main() {
  const artifacts = ".qa-artifacts/math-bank-reinforcement-20261018/g4";
  const htmlPath = `${artifacts}/a4.html`;
  let katexCss = readFileSync("node_modules/katex/dist/katex.css", "utf8");
  katexCss = katexCss.replace(/url\(([^)]+)\)/g, (_, raw) => {
    const file = raw.replace(/["']/g, "");
    const font = readFileSync(resolve("node_modules/katex/dist", file));
    return `url(data:font/woff2;base64,${font.toString("base64")})`;
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 1200 },
    });
    // The HTML and all fonts are supplied from local bytes; forbid requests.
    await page.route("**/*", (route) => route.abort());
    await page.setContent(readFileSync(htmlPath, "utf8"));
    await page.addStyleTag({ content: katexCss });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const pages = [...document.querySelectorAll("[data-print-page]")];
      const failures = [];
      const measurements = [];
      let count = 0;
      for (const [index, node] of pages.entries()) {
        const sheet = node.getBoundingClientRect();
        const bodies = [...node.querySelectorAll("[data-problem-number]")];
        for (const body of bodies) {
          count += 1;
          const paperBody = body.querySelector("[data-paper-view]");
          const rect = paperBody.getBoundingClientRect();
          const number = body.getAttribute("data-problem-number");
          if (
            rect.left < sheet.left - 1 ||
            rect.right > sheet.right + 1 ||
            rect.top < sheet.top - 1 ||
            rect.bottom > sheet.bottom + 1
          )
            failures.push({ number, reason: "problem body outside A4" });
          const walker = document.createTreeWalker(
            paperBody,
            NodeFilter.SHOW_TEXT,
          );
          let text;
          while ((text = walker.nextNode())) {
            // MathML is accessibility content, not a visible duplicate of KaTeX.
            if (text.parentElement.closest(".katex-mathml,annotation,style"))
              continue;
            const range = document.createRange();
            range.selectNodeContents(text);
            for (const box of range.getClientRects()) {
              if (box.width === 0 || box.height === 0) continue;
              if (
                box.left < sheet.left - 1 ||
                box.right > sheet.right + 1 ||
                box.top < sheet.top - 1 ||
                box.bottom > sheet.bottom + 1
              )
                failures.push({ number, reason: "visible text outside A4" });
            }
          }
          measurements.push({
            number: Number(number),
            page: index + 1,
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
          });
        }
      }
      return {
        pages: pages.length,
        problems: count,
        raw: document.body.innerText.includes("$") ? 1 : 0,
        red: document.querySelectorAll(".katex-error").length,
        merror: document.querySelectorAll("merror").length,
        teacherMarkerLeak: document.body.innerText.includes("TEACHER_ONLY"),
        failures,
        measurements,
      };
    });
    if (
      result.pages !== 14 ||
      result.problems !== 27 ||
      result.raw ||
      result.red ||
      result.merror ||
      result.teacherMarkerLeak ||
      result.failures.length
    )
      throw new Error(JSON.stringify(result));
    for (let index = 0; index < result.pages; index += 1) {
      await page
        .locator("[data-print-page]")
        .nth(index)
        .screenshot({
          path: `${artifacts}/a4-${String(index + 1).padStart(2, "0")}.png`,
        });
    }
    const sheet = await browser.newPage({
      viewport: { width: 1050, height: 1800 },
    });
    await sheet.route("**/*", (route) => route.abort());
    const thumbnails = Array.from({ length: result.pages }, (_, index) => {
      const png = readFileSync(
        `${artifacts}/a4-${String(index + 1).padStart(2, "0")}.png`,
      ).toString("base64");
      return `<figure><figcaption>${index + 1}쪽</figcaption><img src="data:image/png;base64,${png}" /></figure>`;
    }).join("");
    await sheet.setContent(
      `<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{margin:0;display:grid;grid-template-columns:repeat(4,250px);gap:10px;font:14px sans-serif;background:#ddd}figure{margin:0}img{width:250px;display:block}</style><body>${thumbnails}</body></html>`,
    );
    await sheet.screenshot({
      path: "docs/planning/tracks/reports/math-bank-reinforcement-20261018/g4-a4-contact.png",
      fullPage: true,
    });
    const report = {
      template: "existing JaseupTemplate / A4Page / ProblemBody",
      network: "blocked; static HTML and local embedded fonts only",
      layoutChanged: false,
      physicalPrint: "대기",
      screenshotDirectory: artifacts,
      ...result,
    };
    writeFileSync(
      "docs/planning/tracks/reports/math-bank-reinforcement-20261018/g4-a4-layout.json",
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(
      JSON.stringify({
        pages: result.pages,
        problems: result.problems,
        failures: result.failures.length,
      }),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
