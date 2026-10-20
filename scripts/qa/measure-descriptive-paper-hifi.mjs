/** Local Next preview, real Chrome. No accounts, API fixtures or database.
 * DESCRIPTIVE_HIFI_URL=http://127.0.0.1:3034/dev/descriptive-paper-hifi node scripts/qa/measure-descriptive-paper-hifi.mjs
 * --quick: one screen width, no PDF exports. Full run checks six widths in color/grayscale and 60 print combinations.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const out = path.join(
  root,
  "docs/planning/tracks/reports/descriptive-paper-hifi-codex-20261020",
);
const pdfOut = path.join(root, "tmp/pdfs/descriptive-paper-hifi");
const url =
  process.env.DESCRIPTIVE_HIFI_URL ??
  "http://127.0.0.1:3034/dev/descriptive-paper-hifi";
const quick = process.argv.includes("--quick");
const widths = quick ? [1040] : [1440, 1040, 768, 760, 390, 320];
const expectedPages = {
  A: [4, 4, 2],
  B: [4, 4, 2],
  C: [4, 4, 2],
  D: [4, 4, 2],
  E: [4, 4, 2],
};
const options = Object.keys(expectedPages);
const papers = ["daily", "review", "past"];
const measurements = [];
const printMeasurements = [];
const errors = [];
const serverDiagnostics = [];
const baselineDiagnostics = [];
const knownAuthDiagnostic = (message) =>
  (message.includes("[auth][error]") && message.includes("MissingSecret")) ||
  (message.includes("at assertConfig") &&
    message.includes("@auth/core/lib/utils/assert.js"));
const forbiddenRequests = [];
const sourceHashes = {};
for (const file of [
  "DescriptivePaperHifi.tsx",
  "DescriptivePaperHifi.module.css",
  "fixtures.ts",
  "page.tsx",
]) {
  sourceHashes[file] = createHash("sha256")
    .update(
      await readFile(
        path.join(root, "src/app/dev/descriptive-paper-hifi", file),
      ),
    )
    .digest("hex");
}
await mkdir(out, { recursive: true });
if (!quick) await mkdir(pdfOut, { recursive: true });

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: [
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--no-first-run",
  ],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1040, height: 1000 },
  });
  async function choose(button, printing = false) {
    if (printing) await button.evaluate((e) => e.click());
    else await button.click();
    // A click receipt or two animation frames do not guarantee a React commit.
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      (knownAuthDiagnostic(message.text()) ? serverDiagnostics : errors).push(
        message.text(),
      );
    }
  });
  await page.route("**/*", (route) => {
    const request = route.request();
    const target = new URL(request.url());
    if (
      target.pathname.startsWith("/api/") ||
      target.origin !== new URL(url).origin
    ) {
      forbiddenRequests.push({ method: request.method(), url: request.url() });
      return route.abort();
    }
    return route.continue();
  });
  const response = await page.goto(url, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  await page.locator("[data-descriptive-hifi]").waitFor();
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });

  async function settle() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
  }

  async function geometry() {
    return page.evaluate(() => {
      const rect = (node) => node.getBoundingClientRect();
      const overflow = Math.max(
        0,
        document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      return {
        overflow,
        summary: document.querySelector("[data-page-summary]").textContent,
        questionNumbers: [...document.querySelectorAll("[data-question]")].map(
          (e) => Number(e.dataset.question),
        ),
        answerNumbers: [
          ...document.querySelectorAll("[data-answer-space]"),
        ].map((e) => Number(e.dataset.answerSpace)),
        scoreNumbers: [...document.querySelectorAll("[data-score-for]")].map(
          (e) => Number(e.dataset.scoreFor),
        ),
        normalAnswerNumbers: [
          ...document.querySelectorAll("[data-normal-answer]"),
        ].map((e) => Number(e.dataset.normalAnswer)),
        scratchNumbers: [...document.querySelectorAll("[data-scratch]")].map(
          (e) => Number(e.dataset.scratch),
        ),
        teacherPoints: [
          ...document.querySelectorAll("[data-criterion-points]"),
        ].map((e) => Number(e.dataset.criterionPoints)),
        pages: [...document.querySelectorAll("[data-paper]")].map((paper) => {
          const p = rect(paper);
          const scale = p.width / paper.offsetWidth;
          const body = paper.querySelector("[data-paper-body]");
          const footer = rect(paper.querySelector("[data-paper-footer]"));
          const items = [
            ...body.querySelectorAll(
              "[data-question], [data-answer-space], [data-rubric], [data-marking-notes]",
            ),
          ];
          const problems = [];
          for (const item of items) {
            const r = rect(item);
            if (r.bottom > footer.top + 1)
              problems.push(
                `footer collision: ${item.dataset.question ?? item.dataset.answerSpace ?? item.dataset.rubric}`,
              );
            if (r.left < p.left - 1 || r.right > p.right + 1)
              problems.push("item outside paper width");
            for (const descendant of item.querySelectorAll(
              "p, svg, table, [data-writing-area], [data-scratch]",
            )) {
              const d = rect(descendant);
              if (
                d.bottom > r.bottom + 1 ||
                d.right > r.right + 1 ||
                d.left < r.left - 1
              )
                problems.push(`child escapes item: ${descendant.tagName}`);
            }
            for (const scratch of item.querySelectorAll("[data-scratch]")) {
              const s = rect(scratch);
              for (const label of scratch.querySelectorAll(":scope > span")) {
                const l = rect(label);
                if (
                  l.left < s.left - 1 ||
                  l.right > s.right + 1 ||
                  l.top < s.top - 1 ||
                  l.bottom > s.bottom + 1
                )
                  problems.push("scratch label escapes writing space");
              }
            }
          }
          const writing = [...body.querySelectorAll("[data-writing-area]")].map(
            (e) => ({
              number: Number(
                e.closest("[data-answer-space]").dataset.answerSpace,
              ),
              heightMm: (rect(e).height / scale / 96) * 25.4,
              subHeightsMm: [...e.querySelectorAll("[data-sub-space]")].map(
                (sub) => (rect(sub).height / scale / 96) * 25.4,
              ),
            }),
          );
          return {
            kind: paper.dataset.pageKind,
            columns: paper.querySelectorAll("[data-column]").length,
            answerCount: paper.querySelectorAll("[data-answer-space]").length,
            filter: getComputedStyle(paper).filter,
            width: paper.offsetWidth,
            height: paper.offsetHeight,
            ratio: p.width / p.height,
            problems,
            writing,
          };
        }),
      };
    });
  }

  function validate(m, teacher, expected, label, paper = "daily") {
    assert.equal(m.overflow, 0, `${label}: document overflow`);
    assert.equal(
      m.pages.length,
      teacher ? 1 : expected,
      `${label}: page count`,
    );
    assert.deepEqual(
      m.questionNumbers,
      teacher ? [] : [1, 2, 3, 4, 5, 6, 7],
      `${label}: all questions exactly once, in order`,
    );
    assert.deepEqual(
      m.answerNumbers,
      teacher ? [] : [5, 6, 7],
      `${label}: three answer spaces`,
    );
    assert.deepEqual(
      m.scoreNumbers,
      teacher ? [] : [5, 6, 7],
      `${label}: scores only on descriptive items`,
    );
    assert.deepEqual(
      m.normalAnswerNumbers,
      teacher || paper === "past" ? [] : [1, 2, 3, 4],
      `${label}: normal answer fields only on daily/review papers`,
    );
    assert.deepEqual(
      m.scratchNumbers,
      teacher || paper === "past" ? [] : [1, 2, 3, 4],
      `${label}: scratch spaces only on daily/review student papers`,
    );
    assert.equal(
      m.teacherPoints.reduce((a, b) => a + b, 0),
      teacher ? 20 : 0,
      `${label}: teacher total`,
    );
    for (const [index, p] of m.pages.entries()) {
      assert.equal(p.filter, "none", `${label}: vector-preserving print`);
      if (paper === "past" && !teacher && p.kind === "questions") {
        assert.equal(p.columns, 2, `${label}: explicit two columns`);
        assert.equal(
          p.answerCount,
          0,
          `${label}: no answer spaces on past questions`,
        );
      }
      assert.ok(Math.abs(p.ratio - 210 / 297) < 0.001, `${label}: A4 ratio`);
      assert.ok(
        Math.abs(p.width - 794) <= 1 && Math.abs(p.height - 1123) <= 1,
        `${label}: fixed physical canvas`,
      );
      assert.deepEqual(
        p.problems,
        [],
        `${label} page ${index + 1}: ${p.problems.join(", ")}`,
      );
      for (const area of p.writing) {
        assert.ok(
          Math.abs(area.heightMm - (area.number === 6 ? 72 : 48)) < 0.1,
          `${label}: 48/72mm answer area`,
        );
        for (const [index, h] of area.subHeightsMm.entries())
          assert.ok(
            Math.abs(h - [16, 24, 32][index]) < 0.1,
            `${label}: growing sub-areas`,
          );
      }
    }
  }

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mono of [false, true]) {
      await choose(page.locator(`[data-color="${mono ? "mono" : "color"}"]`));
      for (const option of options) {
        await choose(page.locator(`[data-option-button="${option}"]`));
        for (const [paperIndex, paper] of papers.entries()) {
          await choose(page.locator(`[data-paper-button="${paper}"]`));
          for (const teacher of [false, true]) {
            await choose(
              page.locator(
                `[data-audience="${teacher ? "teacher" : "student"}"]`,
              ),
            );
            await settle();
            const m = await geometry();
            const label = `${width}-${option}-${paper}-${teacher ? "teacher" : "student"}`;
            validate(
              m,
              teacher,
              expectedPages[option][paperIndex],
              label,
              paper,
            );
            measurements.push({ width, option, paper, teacher, mono, ...m });
            if (width === 1040 && mono && !teacher && paper === "past")
              await page
                .locator("[data-paper]")
                .last()
                .screenshot({
                  path: path.join(out, `${option}-mono-answer.png`),
                });
            if (width === 1040 && !mono) {
              if (!teacher && paper === "daily") {
                await page
                  .locator("[data-paper]")
                  .filter({ has: page.locator('[data-answer-space="6"]') })
                  .screenshot({
                    path: path.join(out, `${option}-daily-writing.png`),
                  });
              }
              if (!teacher && paper === "past") {
                await page
                  .locator("[data-paper]")
                  .first()
                  .screenshot({
                    path: path.join(out, `${option}-past-first.png`),
                  });
                await page
                  .locator("[data-paper]")
                  .last()
                  .screenshot({
                    path: path.join(out, `${option}-past-last.png`),
                  });
              }
              if (teacher && paper === "daily")
                await page.locator("[data-paper]").screenshot({
                  path: path.join(out, `${option}-teacher.png`),
                });
            }
          }
        }
      }
    }
    await choose(page.locator('[data-color="color"]'));
    await choose(page.locator('[data-audience="student"]'));
    await choose(page.locator('[data-option-button="A"]'));
    await choose(page.locator('[data-paper-button="daily"]'));
    await page.evaluate(() => window.scrollTo(0, 0));
    if ([1040, 390, 320].includes(width))
      await page.screenshot({
        path: path.join(out, `overview-${width}.png`),
        fullPage: width !== 1040,
      });
    process.stdout.write(`screen ${width}: 60 combinations passed\n`);
  }

  // Keyboard focus and real controls; no clickable paper or mark boxes.
  await page.setViewportSize({ width: 1040, height: 700 });
  await page.locator('[data-option-button="B"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator('[data-option-button="B"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator("[data-paper] button, [data-paper] input").count(),
    0,
  );
  await choose(page.locator('[data-audience="student"]'));
  assert.equal(
    await page
      .getByText("3x = 8,700 → x = 2,900의 과정", { exact: true })
      .count(),
    0,
  );

  if (!quick) {
    await page.emulateMedia({ media: "print" });
    for (const mono of [false, true]) {
      await choose(
        page.locator(`[data-color="${mono ? "mono" : "color"}"]`),
        true,
      );
      for (const option of options) {
        // Print hides controls; state changes use the native button's actual click handler.
        await choose(page.locator(`[data-option-button="${option}"]`), true);
        for (const [paperIndex, paper] of papers.entries()) {
          await choose(page.locator(`[data-paper-button="${paper}"]`), true);
          for (const teacher of [false, true]) {
            await choose(
              page.locator(
                `[data-audience="${teacher ? "teacher" : "student"}"]`,
              ),
              true,
            );
            await settle();
            const name = `${option}-${paper}-${teacher ? "teacher" : "student"}-${mono ? "mono" : "color"}`;
            const expected = teacher ? 1 : expectedPages[option][paperIndex];
            const m = await geometry();
            // A print document is 210mm wide even when the screen viewport is narrower.
            assert.equal(m.pages.length, expected);
            for (const p of m.pages)
              assert.deepEqual(p.problems, [], `${name}: print collision`);
            const bytes = await page.pdf({
              path: path.join(pdfOut, `${name}.pdf`),
              preferCSSPageSize: true,
              printBackground: true,
              displayHeaderFooter: false,
            });
            const pdf = await PDFDocument.load(bytes);
            const pdfText = execFileSync(
              "pdftotext",
              [path.join(pdfOut, `${name}.pdf`), "-"],
              { encoding: "utf8" },
            );
            assert.ok(
              pdfText.includes("서술형"),
              `${name}: Korean remains PDF text`,
            );
            assert.ok(
              pdfText.includes("9,900"),
              `${name}: math content remains PDF text`,
            );
            assert.ok(
              !pdfText.includes("모양 5안"),
              `${name}: no screen controls in print`,
            );
            assert.equal(
              pdf.getPageCount(),
              expected,
              `${name}: actual PDF pagination`,
            );
            const sizes = pdf.getPages().map((p) => p.getSize());
            for (const size of sizes) {
              assert.ok(
                Math.abs(size.width - 595.28) < 1 &&
                  Math.abs(size.height - 841.89) < 1,
                `${name}: A4 PDF media box`,
              );
            }
            printMeasurements.push({
              option,
              mono,
              paper,
              teacher,
              pages: pdf.getPageCount(),
              textExtractable: true,
              sizes,
            });
          }
        }
        process.stdout.write(
          `print ${option} ${mono ? "mono" : "color"}: 6 PDF combinations passed\n`,
        );
      }
    }
  }

  // The already-running server lacks AUTH_SECRET. Verify the exact same
  // framework diagnostic on the pre-existing Wire before classifying it.
  if (serverDiagnostics.length) {
    const baseline = await browser.newPage();
    baseline.on("console", (message) => {
      if (message.type() === "error" && knownAuthDiagnostic(message.text()))
        baselineDiagnostics.push(message.text());
    });
    await baseline.goto(new URL("/dev/descriptive-paper-wire", url).href, {
      waitUntil: "networkidle",
    });
    await baseline.close();
    assert.ok(
      baselineDiagnostics.some((message) => message.includes("MissingSecret")),
      "Auth diagnostic must also exist on the unchanged Wire baseline",
    );
  }
  assert.deepEqual(errors, [], "unexpected browser errors");
  assert.deepEqual(
    forbiddenRequests,
    [],
    "API/external requests are forbidden",
  );
  const result = {
    measuredAt: new Date().toISOString(),
    sourceHashes,
    url,
    quick,
    widths,
    measurements,
    printMeasurements,
    errors,
    serverDiagnostics,
    baselineDiagnostics,
    forbiddenRequests,
  };
  await writeFile(
    path.join(out, quick ? "quick-measurements.json" : "measurements.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  process.stdout.write(
    `PASS: ${measurements.length} screen cases; ${printMeasurements.length} print cases; API/external requests 0; unexpected errors 0; baseline Auth diagnostics ${serverDiagnostics.length}\n`,
  );
} finally {
  await browser.close();
}
