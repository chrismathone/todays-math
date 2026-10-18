/** Browser verification of exact private fixtures; screenshots/PDFs remain private. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
const label = process.argv[2] ?? "repair";
if (!/^[a-z0-9-]+$/.test(label)) throw new Error("Invalid evidence label");
const base = resolve(".qa-artifacts/math-question-formats-20261018");
const folder = resolve(base, `${label}-paper-evidence`);
mkdirSync(folder, { recursive: true });
const fixture = resolve(base, "paper/public/candidate-batch.json");
const input = readFileSync(fixture);
const batch = JSON.parse(input);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  "src/components/print/TestPrint.tsx",
  "src/components/print/PrintAnswerKeyPage.tsx",
  "src/components/print/templates/JaseupTemplate.tsx",
  "src/components/print/PaperProblemView.tsx",
  "src/components/print/TestPrint.module.css",
  "src/components/print/tokens.ts",
  "src/app/fonts.ts",
  "src/app/globals.css",
  "scripts/qa/bank/question-content-paper.tsx",
];
const sourceDigests = Object.fromEntries(
  sourceFiles.map((file) => [file, sha(readFileSync(file))]),
);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 1200 },
  deviceScaleFactor: 1.5,
});
page.setDefaultTimeout(60_000);
const errors = [],
  failedResponses = [],
  summary = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().endsWith("favicon.ico"))
    failedResponses.push({ url: response.url(), status: response.status() });
});
try {
  for (const group of [...new Set(batch.rows.map((row) => row.unitId))]) {
    const dir = resolve(folder, group);
    mkdirSync(dir, { recursive: true });
    const expected = batch.rows.filter((row) => row.unitId === group);
    for (const mode of ["questions", "answers"]) {
      await page.goto(
        `http://127.0.0.1:4268/?group=${encodeURIComponent(group)}&mode=${mode}`,
        { waitUntil: "networkidle" },
      );
      await page.waitForFunction(
        () => window.__QUESTION_CONTENT_PAPER_QA__?.status === "ready",
      );
      await page.waitForSelector('[data-print-page="true"]');
      await page.evaluate(() => document.fonts.ready);
      if (mode === "answers")
        await page.waitForSelector('[data-answer-layout-ready="true"]');
      await page.emulateMedia({ media: "print" });
      const measurement = await page.evaluate(() => {
        const qa = window.__QUESTION_CONTENT_PAPER_QA__;
        const pages = [
          ...document.querySelectorAll('[data-print-page="true"]'),
        ].map((node) => {
          const r = node.getBoundingClientRect();
          return { width: r.width, height: r.height };
        });
        const clippedQuestions = [],
          clippedSolutions = [],
          clippedSvgs = [];
        for (const article of document.querySelectorAll(
          "article[data-problem-number]",
        )) {
          const outer = article.getBoundingClientRect(),
            inner = article
              .querySelector('[class*="questionArea"]')
              ?.getBoundingClientRect();
          if (
            inner &&
            (inner.right > outer.right + 1 || inner.bottom > outer.bottom + 1)
          )
            clippedQuestions.push(article.getAttribute("data-problem-number"));
        }
        let solutionItems = 0;
        for (const box of document.querySelectorAll(
          '[data-testid="answer-solutions"]',
        )) {
          const outer = box.getBoundingClientRect();
          for (const article of box.querySelectorAll("article")) {
            solutionItems++;
            const inner = article.getBoundingClientRect();
            if (
              inner.left >= outer.right - 1 ||
              inner.bottom > outer.bottom + 1 ||
              inner.top < outer.top - 1
            )
              clippedSolutions.push(
                article.querySelector('[data-testid^="answer-heading-"]')
                  ?.textContent,
              );
          }
        }
        const svgs = [
          ...document.querySelectorAll("article[data-problem-number] svg"),
        ].filter((svg) => !svg.closest(".katex"));
        for (const [i, svg] of svgs.entries()) {
          const view = svg.viewBox.baseVal,
            b = svg.getBBox();
          if (
            !view ||
            view.width <= 0 ||
            view.height <= 0 ||
            b.x < view.x - 2 ||
            b.y < view.y - 2 ||
            b.x + b.width > view.x + view.width + 2 ||
            b.y + b.height > view.y + view.height + 2
          )
            clippedSvgs.push(i);
        }
        return {
          ...qa,
          pages,
          renderedQuestions: document.querySelectorAll(
            "article[data-problem-number]",
          ).length,
          solutionItems,
          figureSvgs: svgs.length,
          clippedQuestions,
          clippedSolutions,
          clippedSvgs,
          renderErrors: document.querySelectorAll(
            ".math-raw,.katex-error,merror",
          ).length,
          studentRubricLeak:
            qa.mode === "questions" &&
            /채점 기준|QUESTION_CONTENT_PRIVATE_/.test(document.body.innerText),
          fonts: [...document.fonts]
            .filter((face) => face.family.includes("bank-qa-"))
            .map((face) => ({ family: face.family, status: face.status })),
        };
      });
      summary.push(measurement);
      if (
        errors.length ||
        failedResponses.length ||
        measurement.renderErrors ||
        measurement.clippedQuestions.length ||
        measurement.clippedSolutions.length ||
        measurement.clippedSvgs.length ||
        measurement.studentRubricLeak
      )
        throw new Error(`Paper boundary failed: ${group}/${mode}`);
      if (
        mode === "questions" &&
        (measurement.renderedQuestions !== expected.length ||
          measurement.figureSvgs < measurement.expectedSvgRows)
      )
        throw new Error("Actual student row/figure correspondence failed");
      if (mode === "answers" && measurement.solutionItems !== expected.length)
        throw new Error("Actual teacher solution correspondence failed");
      if (
        measurement.pages.some(
          (p) =>
            Math.abs(p.width - 793.7) > 3 || Math.abs(p.height - 1122.5) > 3,
        )
      )
        throw new Error("Canonical A4 boundary failed");
      if (
        !measurement.fonts.some(
          (font) =>
            font.family.includes("font-noto-serif-kr") &&
            font.status === "loaded",
        )
      )
        throw new Error("Canonical paper font not loaded");
      const pages = page.locator('[data-print-page="true"]');
      for (let i = 0; i < (await pages.count()); i++)
        await pages
          .nth(i)
          .screenshot({ path: resolve(dir, `${mode}-p${i + 1}.png`) });
      await page.pdf({
        path: resolve(dir, `${mode}.pdf`),
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      await page.emulateMedia({ media: "screen" });
    }
    for (const mode of ["questions", "answers"]) {
      await page.goto(
        `http://127.0.0.1:4268/?group=${encodeURIComponent(group)}&mode=${mode}&sentinel=1`,
        { waitUntil: "networkidle" },
      );
      await page.waitForFunction(
        () => window.__QUESTION_CONTENT_PAPER_QA__?.status === "ready",
      );
      await page.waitForSelector('[data-print-page="true"]');
      if (mode === "answers")
        await page.waitForSelector('[data-answer-layout-ready="true"]');
      const text = await page.locator("body").innerText();
      const markers = (text.match(/QUESTION_CONTENT_PRIVATE_\d+/g) ?? [])
        .length;
      if (markers !== (mode === "questions" ? 0 : expected.length))
        throw new Error(
          `Teacher-only solution marker failed: ${group}/${mode}/${markers}`,
        );
      summary.push({
        test: "teacher-only-solution-marker",
        group,
        mode,
        markers,
      });
    }
    console.log(
      JSON.stringify({
        group,
        rows: expected.length,
        studentTeacherAndLeakChecks: "passed",
      }),
    );
  }
  if (sha(readFileSync(fixture)) !== sha(input))
    throw new Error("Private fixture changed during capture");
  for (const [file, expected] of Object.entries(sourceDigests))
    if (sha(readFileSync(file)) !== expected)
      throw new Error(`Source changed: ${file}`);
} finally {
  writeFileSync(
    resolve(folder, "capture-summary.json"),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        privateFixtureSha256: sha(input),
        sourceDigests,
        summary,
        errors,
        failedResponses,
        physicalPrinterVerified: false,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  await browser.close();
}
