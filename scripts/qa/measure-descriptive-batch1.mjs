/** 50 offline specimens × daily / past+answer sheet / teacher, actual product renderers.
 * Start a local next dev, then set DESCRIPTIVE_PAPER_URL if its port differs.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const run = promisify(execFile);
const out = path.resolve(
  process.env.DESCRIPTIVE_BATCH1_OUT ??
    "/Volumes/새 볼륨/today-worktrees/desc-batch1-out",
);
const base =
  process.env.DESCRIPTIVE_PAPER_URL ??
  "http://127.0.0.1:3049/dev/descriptive-paper";
const fixturePath = "src/app/dev/descriptive-paper/batch1Fixtures.json";
const reviewInputs =
  process.env.DESCRIPTIVE_BATCH1_REVIEW_INPUT ??
  path.join(out, "review", "inputs");
const fixtureBytes = await readFile(fixturePath);
const fixture = JSON.parse(fixtureBytes);
const only = process.env.DESCRIPTIVE_BATCH1_CANDIDATES?.split(",");
const entries = fixture.definitions.filter(
  (entry) => !only || only.includes(entry.candidateId),
);
const suffix = only ? "-probe" : "";
if (!only) assert.equal(entries.length, 10);
const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
for (const dir of ["pdf/items", "renders"])
  await mkdir(path.join(out, dir), { recursive: true });
await mkdir(reviewInputs, { recursive: true });
const collections = {
  daily: await PDFDocument.create(),
  past: await PDFDocument.create(),
  teacher: await PDFDocument.create(),
};
const browser = await chromium.launch({ channel: "chrome" });
const records = [];
const errors = [];
const forbiddenRequests = [];
const failedRequests = [];
let current;
let activePage;
try {
  for (const entry of entries) {
    for (let index = 0; index < entry.specimens.length; index++) {
      const specimen = entry.specimens[index];
      const reviewId = `${entry.candidateId}-${index + 1}`;
      for (const mode of ["daily", "past", "teacher"]) {
        const audience = mode === "teacher" ? "teacher" : "student";
        const name = `${reviewId}-${mode}`;
        const context = await browser.newContext({
          viewport: { width: 1100, height: 1200 },
        });
        await context.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (
            url.pathname.startsWith("/api/") ||
            (["http:", "https:"].includes(url.protocol) &&
              !["127.0.0.1", "localhost"].includes(url.hostname))
          ) {
            forbiddenRequests.push(route.request().url());
            return route.abort();
          }
          return route.continue();
        });
        const page = await context.newPage();
        activePage = page;
        current = name;
        page.on("requestfailed", (request) =>
          failedRequests.push({
            name,
            url: request.url(),
            failure: request.failure(),
          }),
        );
        page.on("pageerror", (error) =>
          errors.push({ name, message: error.message }),
        );
        await page.goto(
          `${base}?candidate=${entry.candidateId}&sample=${index}&paper=${mode === "past" ? "past" : "daily"}&audience=${audience}`,
          { waitUntil: "networkidle" },
        );
        await page.waitForSelector('[data-descriptive-ready="true"]', {
          state: "attached",
          timeout: 30000,
        });
        await page.emulateMedia({ media: "print" });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images].map((image) => image.decode()),
          );
        });
        const geometry = await page.evaluate(() => {
          const sheets = [...document.querySelectorAll("[data-print-page]")];
          const violations = [];
          let textFragments = 0;
          let rawMath = 0;
          for (const [index, sheet] of sheets.entries()) {
            const boundary = sheet.getBoundingClientRect();
            const footer = sheet
              .querySelector("footer")
              ?.getBoundingClientRect();
            for (const element of sheet.querySelectorAll(
              "[data-writing-area], table, [data-descriptive-rubrics], [data-problem-number]",
            )) {
              const box = element.getBoundingClientRect();
              if (
                box.left < boundary.left - 1 ||
                box.right > boundary.right + 1 ||
                box.top < boundary.top - 1 ||
                box.bottom > boundary.bottom + 1
              )
                violations.push({
                  page: index + 1,
                  kind: "page",
                  element: element.tagName,
                });
              if (footer && box.bottom > footer.top + 1)
                violations.push({
                  page: index + 1,
                  kind: "footer",
                  element: element.tagName,
                });
            }
            // Measure actual visible text fragments, including the inside of clipping boxes.
            const walker = document.createTreeWalker(
              sheet,
              NodeFilter.SHOW_TEXT,
            );
            while (walker.nextNode()) {
              const node = walker.currentNode;
              const parent = node.parentElement;
              if (
                !parent ||
                !node.textContent?.trim() ||
                parent.closest(
                  "svg, math, annotation, .katex-mathml, [aria-hidden=true]",
                )
              )
                continue;
              if (getComputedStyle(parent).visibility === "hidden") continue;
              if (
                !parent.closest(".katex") &&
                /\\(?:frac|sqrt|times|leq|geq)\b|\$\S/.test(node.textContent)
              )
                rawMath++;
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const rect of range.getClientRects()) {
                if (rect.width < 0.1 || rect.height < 0.1) continue;
                textFragments++;
                if (
                  rect.left < boundary.left - 1 ||
                  rect.right > boundary.right + 1 ||
                  rect.top < boundary.top - 1 ||
                  rect.bottom > boundary.bottom + 1
                )
                  violations.push({
                    page: index + 1,
                    kind: "text-page",
                    text: node.textContent.slice(0, 45),
                  });
                if (
                  footer &&
                  !parent.closest("footer") &&
                  rect.bottom > footer.top + 1
                )
                  violations.push({
                    page: index + 1,
                    kind: "text-footer",
                    text: node.textContent.slice(0, 45),
                  });
                let ancestor = parent;
                while (ancestor && ancestor !== sheet) {
                  const style = getComputedStyle(ancestor);
                  const box = ancestor.getBoundingClientRect();
                  if (
                    (["hidden", "clip"].includes(style.overflowY) &&
                      rect.bottom > box.bottom + 1) ||
                    (["hidden", "clip"].includes(style.overflowX) &&
                      rect.right > box.right + 1)
                  )
                    violations.push({
                      page: index + 1,
                      kind: "clipped-text",
                      text: node.textContent.slice(0, 45),
                    });
                  ancestor = ancestor.parentElement;
                }
              }
            }
          }
          return {
            pageCount: sheets.length,
            violations,
            textFragments,
            rawMath,
            mathErrors: document.querySelectorAll(
              "[data-print-page] .katex-error, [data-print-page] .math-raw",
            ).length,
            criteria: document.querySelectorAll(
              "[data-print-page] [data-criterion]",
            ).length,
            writing: document.querySelectorAll(
              "[data-print-page] [data-writing-area]",
            ).length,
            figures: [
              ...document.querySelectorAll(
                "[data-print-page] [data-paper-view] svg",
              ),
            ].map((svg) => {
              const box = svg.getBoundingClientRect();
              return {
                width: box.width,
                height: box.height,
                paths: svg.querySelectorAll("path, line, polygon, rect").length,
              };
            }),
            text: sheets.map((s) => s.textContent).join("\n"),
          };
        });
        const expectedPages = mode === "past" ? 2 : 1;
        assert.equal(geometry.pageCount, expectedPages, `${name} pages`);
        assert.deepEqual(geometry.violations, [], `${name} clipping/overflow`);
        assert.equal(geometry.mathErrors + geometry.rawMath, 0, `${name} math`);
        assert.equal(
          geometry.criteria,
          audience === "teacher" ? specimen.problem.rubric.criteria.length : 0,
          `${name} rubric`,
        );
        assert.equal(
          geometry.writing,
          audience === "student" ? 1 : 0,
          `${name} writing space`,
        );
        if (audience === "student") {
          assert.ok(
            !/선행 오류|허용 다른 풀이|만점:|채점표/.test(geometry.text),
            `${name} teacher leakage`,
          );
          if (specimen.figureKey) {
            assert.ok(
              geometry.figures.some(
                (figure) =>
                  figure.width > 10 && figure.height > 10 && figure.paths > 0,
              ),
              `${name} missing diagram`,
            );
            if (mode === "daily") {
              const svg = page
                .locator("[data-print-page] [data-paper-view] svg")
                .first();
              await svg.screenshot({
                path: path.join(reviewInputs, `${reviewId}-figure.png`),
              });
            }
          }
        }
        const file = path.join(out, "pdf", "items", `${name}.pdf`);
        await page.pdf({
          path: file,
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });
        const pdf = await PDFDocument.load(await readFile(file));
        assert.equal(
          pdf.getPageCount(),
          expectedPages,
          `${name} PDF pagination`,
        );
        for (const sheet of pdf.getPages()) {
          assert.ok(
            Math.abs(sheet.getWidth() - 595.28) < 1 &&
              Math.abs(sheet.getHeight() - 841.89) < 1,
            `${name} A4`,
          );
        }
        const { stdout: bbox } = await run("pdftotext", ["-bbox", file, "-"], {
          maxBuffer: 8 * 1024 * 1024,
        });
        let pdfWords = 0;
        for (const match of bbox.matchAll(
          /<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)"/g,
        )) {
          const [, x1, y1, x2, y2] = match.map(Number);
          assert.ok(
            x1 >= 0 && y1 >= 0 && x2 <= 596.3 && y2 <= 842.9,
            `${name} PDF text bounds`,
          );
          pdfWords++;
        }
        assert.ok(pdfWords > 0);
        const combined = collections[mode];
        const pages = await combined.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((p) => combined.addPage(p));
        // Every specimen has a raster evidence page; inspect representative and longest sheets.
        await run("pdftoppm", [
          "-r",
          "96",
          "-png",
          file,
          path.join(out, "renders", name),
        ]);
        const { text: _text, ...measurements } = geometry;
        void _text;
        records.push({
          name,
          file,
          fixtureSha256,
          ...measurements,
          pdfWords,
          answerLeakage: 0,
        });
        await context.close();
        console.log(`${name}: ${expectedPages} A4쪽 · 넘침/잘림/노출 0`);
      }
    }
  }
  assert.equal(records.length, entries.length * 15);
  assert.deepEqual(errors, []);
  assert.deepEqual(forbiddenRequests, []);
  assert.equal(
    createHash("sha256")
      .update(await readFile(fixturePath))
      .digest("hex"),
    fixtureSha256,
  );
  for (const [mode, pdf] of Object.entries(collections))
    await writeFile(
      path.join(out, "pdf", `batch1-${mode}${suffix}.pdf`),
      await pdf.save(),
    );
  await writeFile(
    path.join(out, `measurements${suffix}.json`),
    JSON.stringify(
      { fixtureSha256, records, errors, forbiddenRequests, failedRequests },
      null,
      2,
    ),
  );
} catch (error) {
  await writeFile(
    path.join(out, "measurement-failure.json"),
    JSON.stringify(
      {
        current,
        error: String(error),
        records,
        errors,
        forbiddenRequests,
        failedRequests,
        browserState:
          activePage && !activePage.isClosed()
            ? await activePage
                .evaluate(() => ({
                  url: location.href,
                  ready: document
                    .querySelector("[data-descriptive-ready]")
                    ?.getAttribute("data-descriptive-ready"),
                  fonts: document.fonts.status,
                  title: document.title,
                  text: document.body.innerText.slice(0, 1000),
                }))
                .catch(String)
            : null,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
