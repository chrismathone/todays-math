import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const folder = resolve(".qa-artifacts/math-bank-reinforcement-20261018/paper-evidence");
mkdirSync(folder, { recursive: true });
const fixture = resolve(".qa-artifacts/math-bank-reinforcement-20261018/paper/public/candidate-batch.json");
const input = readFileSync(fixture);
const batch = JSON.parse(input);
const sha = value => createHash("sha256").update(value).digest("hex");
const sourceFiles = ["src/components/print/TestPrint.tsx", "src/components/print/PrintAnswerKeyPage.tsx", "src/components/print/templates/JaseupTemplate.tsx", "src/components/print/PaperProblemView.tsx", "src/components/print/TestPrint.module.css", "src/components/print/tokens.ts", "src/app/fonts.ts", "src/app/globals.css"];
const sourceDigests = Object.fromEntries(sourceFiles.map(file => [file, sha(readFileSync(file))]));
const groups = [...new Set(batch.rows.map(row => row.unitId)), "native"];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 }, deviceScaleFactor: 1.5 });
page.setDefaultTimeout(60000);
const errors = [];
const requests = [];
page.on("pageerror", error => errors.push(String(error)));
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
page.on("response", response => {
  if (response.status() >= 400 && !response.url().endsWith("favicon.ico")) requests.push({ url: response.url(), status: response.status() });
});
const summary = [];
try {
  for (const group of groups) {
    const dir = resolve(folder, group);
    mkdirSync(dir, { recursive: true });
    for (const mode of ["questions", "answers"]) {
      await page.goto(`http://127.0.0.1:4258/?group=${encodeURIComponent(group)}&mode=${mode}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.__BANK_PAPER_QA__?.status === "ready");
      await page.waitForSelector('[data-print-page="true"]');
      await page.evaluate(() => document.fonts.ready);
      if (mode === "answers") await page.waitForSelector('[data-answer-layout-ready="true"]');
      await page.emulateMedia({ media: "print" });
      const measurement = await page.evaluate(() => {
        const qa = window.__BANK_PAPER_QA__;
        const errorNodes = document.querySelectorAll('.math-raw,.katex-error,merror,[style*="#cc0000"],[style*="rgb(204, 0, 0)"]');
        const pages = [...document.querySelectorAll('[data-print-page="true"]')].map(node => {
          const r = node.getBoundingClientRect();
          return { width: r.width, height: r.height };
        });
        const clippedQuestions = [];
        for (const article of document.querySelectorAll("article[data-problem-number]")) {
          const parent = article.getBoundingClientRect();
          const area = article.querySelector('[class*="questionArea"]');
          const content = area?.getBoundingClientRect();
          if (content && (content.right > parent.right + 1 || content.bottom > parent.bottom + 1))
            clippedQuestions.push(article.getAttribute("data-problem-number"));
        }
        const clippedSolutions = [];
        let solutionItems = 0;
        for (const box of document.querySelectorAll('[data-testid="answer-solutions"]')) {
          const r = box.getBoundingClientRect();
          for (const article of box.querySelectorAll("article")) {
            solutionItems++;
            const q = article.getBoundingClientRect();
            if (q.left >= r.right - 1 || q.bottom > r.bottom + 1 || q.top < r.top - 1)
              clippedSolutions.push(article.querySelector('[data-testid^="answer-heading-"]')?.textContent);
          }
        }
        const figureSvgs = [...document.querySelectorAll("article[data-problem-number] svg")].filter(svg => !svg.closest(".katex"));
        const clippedSvgs = [];
        for (const [index, svg] of figureSvgs.entries()) {
          const view = svg.viewBox.baseVal;
          if (!view || view.width <= 0 || view.height <= 0) { clippedSvgs.push(index); continue; }
          const b = svg.getBBox();
          if (b.x < view.x - 2 || b.y < view.y - 2 || b.x + b.width > view.x + view.width + 2 || b.y + b.height > view.y + view.height + 2)
            clippedSvgs.push(index);
        }
        return {
          ...qa, pages, renderErrors: errorNodes.length,
          renderedQuestions: document.querySelectorAll("article[data-problem-number]").length,
          solutionItems, clippedQuestions, clippedSolutions, figureSvgs: figureSvgs.length, clippedSvgs,
          studentRubricLeak: qa.mode === "questions" && /채점 기준|BANK_RUBRIC_PRIVATE_/.test(document.body.innerText),
          fonts: [...document.fonts].filter(face => face.family.includes("bank-qa-")).map(face => ({ family: face.family, weight: face.weight, status: face.status })),
        };
      });
      summary.push(measurement);
      if (errors.length || requests.length || measurement.renderErrors || measurement.clippedQuestions.length || measurement.clippedSolutions.length || measurement.clippedSvgs.length || measurement.studentRubricLeak)
        throw new Error(`Paper boundary failed: ${group}/${mode}; see capture-summary.json`);
      if (mode === "questions" && (measurement.renderedQuestions !== measurement.rows || measurement.figureSvgs < measurement.expectedSvgRows))
        throw new Error(`Question/figure correspondence failed: ${group}`);
      if (mode === "answers" && measurement.solutionItems !== measurement.rows)
        throw new Error(`Teacher solution correspondence failed: ${group}`);
      if (measurement.pages.some(p => Math.abs(p.width - 793.7) > 3 || Math.abs(p.height - 1122.5) > 3))
        throw new Error(`Paper CSS did not produce A4: ${group}/${mode}`);
      if (!measurement.fonts.some(font => font.family.includes("font-noto-serif-kr") && font.status === "loaded"))
        throw new Error(`Canonical paper font did not load: ${group}/${mode}`);
      const pages = page.locator('[data-print-page="true"]');
      for (let i = 0; i < await pages.count(); i++)
        await pages.nth(i).screenshot({ path: resolve(dir, `${mode}-p${i + 1}.png`) });
      await page.pdf({ path: resolve(dir, `${mode}.pdf`), format: "A4", printBackground: true, preferCSSPageSize: true });
      console.log(JSON.stringify({ group, mode, rows: measurement.rows, pages: measurement.pages.length, errors: 0 }));
      await page.emulateMedia({ media: "screen" });
    }
  }
  for (const mode of ["questions", "answers"]) {
    await page.goto(`http://127.0.0.1:4258/?group=native&mode=${mode}&sentinel=1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__BANK_PAPER_QA__?.status === "ready");
    await page.waitForSelector('[data-print-page="true"]');
    if (mode === "answers") await page.waitForSelector('[data-answer-layout-ready="true"]');
    const sentinels = await page.locator("body").innerText();
    const count = (sentinels.match(/BANK_RUBRIC_PRIVATE_\d+/g) ?? []).length;
    if ((mode === "questions" && count !== 0) || (mode === "answers" && count !== 12))
      throw new Error(`Private solution marker mismatch: ${mode}/${count}`);
    summary.push({ test: "private-solution-marker", mode, markers: count });
  }
  if (sha(readFileSync(fixture)) !== sha(input)) throw new Error("Candidate bytes changed during capture");
  for (const [file, digest] of Object.entries(sourceDigests))
    if (sha(readFileSync(file)) !== digest) throw new Error(`Paper source changed during capture: ${file}`);
} finally {
  writeFileSync(resolve(folder, "capture-summary.json"), JSON.stringify({ checkedAt: new Date().toISOString(), fixtureSha256: sha(input), sourceDigests, summary, errors, failedResponses: requests, physicalPrinterVerified: false }, null, 2) + "\n");
  await browser.close();
}
