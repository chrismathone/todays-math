/** Product render path, offline fixture, actual Chromium PDF + Poppler pixels.
 * DESCRIPTIVE_PAPER_URL=http://127.0.0.1:3043/dev/descriptive-paper node scripts/qa/measure-descriptive-paper.mjs
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp, cp, rm } from "node:fs/promises";
import os from "node:os";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
const runFile = promisify(execFile);
import { createHash } from "node:crypto";
import path from "node:path";
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const finalOut = path.resolve(
  "docs/planning/tracks/reports/descriptive-paper-impl-codex-20261020",
);
const finalPdfOut = path.resolve("output/pdf/descriptive-paper");
// Keep artifacts outside the watched source tree until the browser is closed.
// Tailwind/Next dev otherwise rebuild while the next specimen is hydrating.
const temporary = await mkdtemp(path.join(os.tmpdir(), "descriptive-qa-"));
const out = path.join(temporary, "renders");
const pdfOut = path.join(temporary, "pdf");
const base =
  process.env.DESCRIPTIVE_PAPER_URL ??
  "http://127.0.0.1:3043/dev/descriptive-paper";
await mkdir(out, { recursive: true });
await mkdir(pdfOut, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
});
const records = [];
const screenRecords = [];
const unifiedRecords = [];
const errors = [];
const authDiagnostics = [];
const requests = [];
const recoveredLoads = [];
const sourceFiles = [
  ...new Set([
    ...execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" })
      .trim()
      .split("\n"),
    ...execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
      encoding: "utf8",
    })
      .trim()
      .split("\n"),
  ]),
].filter((file) =>
  /^(src\/.*\.(tsx?|css|json)|scripts\/qa\/measure-descriptive-paper\.mjs)$/.test(
    file,
  ),
);
async function sourceHashes() {
  return Object.fromEntries(
    await Promise.all(
      sourceFiles.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(file))
          .digest("hex"),
      ]),
    ),
  );
}
const hashes = await sourceHashes();
let activePage;
try {
  // Each specimen gets its own browser context, so a previous print emulation,
  // navigation or dev hot-reload cannot carry state into the next specimen.
  async function freshPage(width = 1100) {
    await activePage?.close();
    const next = await browser.newPage({
      viewport: { width, height: width === 1100 ? 1100 : 800 },
    });
    activePage = next;
    next.on("pageerror", (error) => errors.push(error.stack || error.message));
    next.on("console", (message) => {
      if (message.type() !== "error") return;
      if (
        message.text().includes("MissingSecret") ||
        message.text().includes("at assertConfig")
      )
        authDiagnostics.push(message.text());
      else errors.push(message.text());
    });
    next.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.pathname.startsWith("/api/") ||
        !["127.0.0.1", "localhost"].includes(url.hostname)
      )
        requests.push(request.url());
    });
    return next;
  }
  async function loadReady(url, width = 1100) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const start = errors.length;
      const next = await freshPage(width);
      try {
        await next.goto(url, { waitUntil: "networkidle" });
        await next.waitForSelector('[data-descriptive-ready="true"]', {
          state: "attached",
          timeout: 10000,
        });
        return next;
      } catch (error) {
        const diagnostics = errors.slice(start);
        // Preserve and disclose the intermittent dev-loader syntax failure.
        // Geometry/readiness failures without that diagnostic still fail QA.
        if (
          attempt === 3 ||
          !diagnostics.some((message) =>
            message.includes("Invalid or unexpected token"),
          ) ||
          diagnostics.some(
            (message) =>
              !message.includes("Invalid or unexpected token") &&
              !message.includes("component that hasn't mounted yet"),
          )
        )
          throw error;
        recoveredLoads.push({ url, attempt, diagnostics });
        errors.splice(start);
      }
    }
    throw new Error("Unreachable load state");
  }
  let page;
  for (const paper of ["daily", "review", "past"]) {
    for (const audience of ["student", "teacher"]) {
      for (const mono of [false, true]) {
        const name = `${paper}-${audience}-${mono ? "mono" : "color"}`;
        page = await loadReady(
          `${base}?paper=${paper}&audience=${audience}&mono=${mono ? 1 : 0}`,
        );
        await page.emulateMedia({ media: "print" });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images].map((img) => img.decode().catch(() => {})),
          );
        });
        const geometry = await page.evaluate(() => {
          const pages = [...document.querySelectorAll("[data-print-page]")];
          const violations = [];
          const areas = [];
          pages.forEach((sheet, i) => {
            const box = sheet.getBoundingClientRect();
            const footer = sheet
              .querySelector("footer")
              ?.getBoundingClientRect();
            sheet
              .querySelectorAll(
                "[data-writing-area], [data-writing-section], table, [data-descriptive-rubrics], [data-problem-number]",
              )
              .forEach((node) => {
                const r = node.getBoundingClientRect();
                if (
                  r.left < box.left - 1 ||
                  r.right > box.right + 1 ||
                  r.top < box.top - 1 ||
                  r.bottom > box.bottom + 1
                )
                  violations.push({
                    page: i + 1,
                    node: node.tagName,
                    edge: "page",
                  });
                if (footer && r.bottom > footer.top + 1)
                  violations.push({
                    page: i + 1,
                    node: node.tagName,
                    edge: "footer",
                  });
                if (node.hasAttribute("data-writing-section"))
                  areas.push({
                    page: i + 1,
                    x: r.x - box.x,
                    y: r.y - box.y,
                    width: r.width,
                    height: r.height,
                    heightMm: Number(node.getAttribute("data-height-mm")),
                  });
              });
          });
          return {
            pageCount: pages.length,
            violations,
            areas,
            pages: pages.map((node) => {
              const r = node.getBoundingClientRect();
              return {
                width: r.width,
                height: r.height,
                text: node.textContent,
              };
            }),
            criteria: document.querySelectorAll("[data-criterion]").length,
            writing: document.querySelectorAll("[data-writing-area]").length,
          };
        });
        assert.deepEqual(geometry.violations, [], name);
        const expected = paper === "past" && audience === "student" ? 2 : 1;
        assert.equal(geometry.pageCount, expected, name);
        assert.equal(geometry.criteria, audience === "teacher" ? 3 : 0, name);
        assert.equal(geometry.writing, audience === "student" ? 1 : 0, name);
        if (audience === "student") {
          assert.deepEqual(
            geometry.areas.map((a) => a.heightMm),
            [16, 24, 32],
          );
          for (const area of geometry.areas)
            assert.ok(
              Math.abs((area.height * 25.4) / 96 - area.heightMm) < 0.1,
            );
          assert.ok(
            !geometry.pages.some(
              (p) =>
                p.text.includes("선행 오류") ||
                p.text.includes("허용 다른 풀이"),
            ),
          );
        }
        const pdfFile = path.join(pdfOut, `${name}.pdf`);
        await page.pdf({
          path: pdfFile,
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });
        const pdf = await PDFDocument.load(await readFile(pdfFile));
        assert.equal(pdf.getPageCount(), expected, `${name} PDF pages`);
        for (const p of pdf.getPages()) {
          assert.ok(Math.abs(p.getWidth() - 595.28) < 1);
          assert.ok(Math.abs(p.getHeight() - 841.89) < 1);
        }
        const { stdout: text } = await runFile("pdftotext", [pdfFile, "-"], {
          encoding: "utf8",
          maxBuffer: 8 * 1024 * 1024,
        });
        assert.ok(text.includes("서술형"));
        assert.ok(!text.includes("견본 보기"));
        const { stdout: bbox } = await runFile(
          "pdftotext",
          ["-bbox", pdfFile, "-"],
          { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
        );
        let textBounds = 0;
        for (const match of bbox.matchAll(
          /<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)"/g,
        )) {
          const [, x1, y1, x2, y2] = match.map(Number);
          assert.ok(
            x1 >= 0 && y1 >= 0 && x2 <= 596.3 && y2 <= 842.9,
            `${name} text bounds`,
          );
          textBounds++;
        }
        const rasterPrefix = path.join(out, name);
        await runFile(
          "pdftoppm",
          ["-r", "144", "-png", pdfFile, rasterPrefix],
          {
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let coloredPixels = 0;
        const grids = [];
        for (let n = 1; n <= expected; n++) {
          const png = `${rasterPrefix}-${n}.png`;
          const { data, info } = await sharp(png)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          if (mono) {
            for (let i = 0; i < data.length; i += info.channels)
              if (
                Math.max(...data.subarray(i, i + 3)) -
                  Math.min(...data.subarray(i, i + 3)) >
                1
              )
                coloredPixels++;
          }
          for (const [index, area] of geometry.areas.entries()) {
            if (area.page !== n) continue;
            // Interior excludes label, outer border and subdivision line.
            const crop = {
              left: Math.ceil((area.x + 50) * 1.5),
              top: Math.ceil((area.y + 10) * 1.5),
              width: 180,
              height: Math.floor((area.height - 20) * 1.5),
            };
            const pixels = await sharp(png)
              .extract(crop)
              .removeAlpha()
              .raw()
              .toBuffer({ resolveWithObject: true });
            function peaks(axis) {
              const span =
                axis === "x" ? pixels.info.width : pixels.info.height;
              const cross =
                axis === "x" ? pixels.info.height : pixels.info.width;
              const hits = [];
              for (let pos = 0; pos < span; pos++) {
                let count = 0;
                for (let j = 0; j < cross; j++) {
                  const x = axis === "x" ? pos : j;
                  const y = axis === "x" ? j : pos;
                  const offset =
                    (y * pixels.info.width + x) * pixels.info.channels;
                  if (pixels.data[offset] < 250) count++;
                }
                if (
                  count / cross > 0.65 &&
                  (hits.length === 0 || pos > hits.at(-1) + 2)
                )
                  hits.push(pos);
              }
              return hits;
            }
            const xs = peaks("x"),
              ys = peaks("y");
            assert.ok(
              xs.length >= 5 && ys.length >= 2,
              `${name} split ${index + 1} grid missing`,
            );
            const gaps = [
              ...xs.slice(1).map((x, i) => x - xs[i]),
              ...ys.slice(1).map((y, i) => y - ys[i]),
            ];
            for (const gap of gaps)
              assert.ok(gap >= 21 && gap <= 24, `${name} grid ${gap}px`);
            grids.push({
              section: index + 1,
              xLines: xs.length,
              yLines: ys.length,
              gapsMm: gaps.map((gap) => (gap * 25.4) / 144),
            });
            await sharp(png)
              .extract(crop)
              .toFile(path.join(out, `${name}-grid-${index + 1}.png`));
          }
        }
        if (mono) assert.equal(coloredPixels, 0, `${name} grayscale`);
        records.push({
          name,
          pdfFile: path.relative(
            process.cwd(),
            path.join(finalPdfOut, path.basename(pdfFile)),
          ),
          geometry,
          textBounds,
          coloredPixels,
          grids,
        });
        console.log(
          `${name}: ${expected} A4 pages, overflow 0, grids ${grids.length}`,
        );
      }
    }
  }
  // Exercise the same authored rectangle through every current unified template.
  for (const template of [
    "jaseup",
    "jeongtong",
    "modern",
    "workbook",
    "yuhyung",
    "pyeongga",
  ]) {
    for (const columns of [1, 2]) {
      for (const audience of ["student", "teacher"]) {
        const name = `unified-${template}-${columns}-${audience}`;
        page = await loadReady(
          `${base}?renderer=unified&template=${template}&columns=${columns}&audience=${audience}`,
        );
        await page.emulateMedia({ media: "print" });
        const geometry = await page.evaluate(() => {
          const pages = [
            ...document.querySelectorAll(
              "[data-mathgen-document] [data-unified-paper]",
            ),
          ];
          return pages.map((sheet) => {
            const bounds = sheet.getBoundingClientRect();
            const sections = [
              ...sheet.querySelectorAll("[data-writing-section]"),
            ].map((node) => {
              const r = node.getBoundingClientRect();
              return {
                expectedMm: Number(node.getAttribute("data-height-mm")),
                actualMm: (r.height * 25.4) / 96,
              };
            });
            const outside = [
              ...sheet.querySelectorAll(
                "[data-writing-area], [data-descriptive-rubrics], table, [data-problem-body]",
              ),
            ].filter((node) => {
              const r = node.getBoundingClientRect();
              return (
                r.left < bounds.left - 1 ||
                r.right > bounds.right + 1 ||
                r.top < bounds.top - 1 ||
                r.bottom > bounds.bottom + 1
              );
            }).length;
            return {
              kind: sheet.getAttribute("data-page-kind"),
              width: bounds.width,
              height: bounds.height,
              outside,
              sections,
              criteria: sheet.querySelectorAll("[data-criterion]").length,
              text: sheet.textContent,
            };
          });
        });
        const expected =
          1 +
          (template === "pyeongga" ? 1 : 0) +
          (audience === "teacher" ? 1 : 0);
        assert.equal(geometry.length, expected, name);
        assert.equal(
          geometry.reduce((sum, p) => sum + p.outside, 0),
          0,
          name,
        );
        const sections = geometry.flatMap((p) => p.sections);
        assert.deepEqual(
          sections.map((s) => s.expectedMm),
          [16, 24, 32],
          name,
        );
        sections.forEach((s) =>
          assert.ok(
            Math.abs(s.actualMm - s.expectedMm) < 0.1,
            `${name} fixed height`,
          ),
        );
        assert.equal(
          geometry.reduce((sum, p) => sum + p.criteria, 0),
          audience === "teacher" ? 3 : 0,
          name,
        );
        if (audience === "student") {
          assert.ok(
            !geometry.some(
              (p) =>
                p.text.includes("선행 오류") ||
                p.text.includes("허용 다른 풀이"),
            ),
            name,
          );
        }
        const pdfFile = path.join(pdfOut, `${name}.pdf`);
        await page.pdf({
          path: pdfFile,
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });
        const pdf = await PDFDocument.load(await readFile(pdfFile));
        assert.equal(pdf.getPageCount(), expected, `${name} PDF pages`);
        pdf.getPages().forEach((p) => {
          assert.ok(Math.abs(p.getWidth() - 595.28) < 1);
          assert.ok(Math.abs(p.getHeight() - 841.89) < 1);
        });
        const { stdout: bbox } = await runFile(
          "pdftotext",
          ["-bbox", pdfFile, "-"],
          { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
        );
        for (const match of bbox.matchAll(
          /<word xMin="([\d.-]+)" yMin="([\d.-]+)" xMax="([\d.-]+)" yMax="([\d.-]+)"/g,
        )) {
          const [, x1, y1, x2, y2] = match.map(Number);
          assert.ok(
            x1 >= 0 && y1 >= 0 && x2 <= 596.3 && y2 <= 842.9,
            `${name} text bounds`,
          );
        }
        await runFile(
          "pdftoppm",
          ["-r", "72", "-png", pdfFile, path.join(out, name)],
          { stdio: ["ignore", "pipe", "pipe"] },
        );
        unifiedRecords.push({
          name,
          pdfFile: path.relative(
            process.cwd(),
            path.join(finalPdfOut, path.basename(pdfFile)),
          ),
          geometry,
        });
        console.log(`${name}: ${expected} A4 pages, overflow 0`);
      }
    }
  }
  for (const width of [1440, 1040, 768, 760, 390, 320]) {
    for (const paper of ["daily", "review", "past"]) {
      for (const audience of ["student", "teacher"]) {
        page = await loadReady(
          `${base}?paper=${paper}&audience=${audience}`,
          width,
        );
        const overflow = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        );
        assert.equal(overflow, 0, `screen ${width} ${paper} ${audience}`);
        screenRecords.push({ width, paper, audience, overflow });
        if (
          [1040, 390, 320].includes(width) &&
          paper === "daily" &&
          audience === "student"
        )
          await page.screenshot({
            path: path.join(out, `screen-${width}.png`),
          });
      }
    }
  }
  // Native browser controls remain keyboard-operable; form navigation is a real GET.
  await page.getByLabel("지면", { exact: true }).selectOption("review");
  await page.getByRole("button", { name: "견본 보기" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/paper=review/);
  await page.waitForSelector('[data-descriptive-ready="true"]');
  assert.deepEqual(errors, [], "browser errors");
  assert.deepEqual(requests, [], "API/external requests");
  assert.deepEqual(
    await sourceHashes(),
    hashes,
    "sources changed during QA; rerun",
  );
  await writeFile(
    path.join(out, "measurements.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment: "Next dev route",
        records,
        screenRecords,
        unifiedRecords,
        sourceHashes: hashes,
        errors,
        recoveredLoads,
        requests,
        authDiagnostics,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await writeFile(
    path.join(out, "failed-run.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        error: String(error),
        records,
        screenRecords,
        unifiedRecords,
        errors,
        recoveredLoads,
        requests,
        currentPage: activePage
          ? await activePage.evaluate(() => ({
              url: location.href,
              ready: document
                .querySelector("[data-descriptive-ready]")
                ?.getAttribute("data-descriptive-ready"),
              fonts: document.fonts.status,
              alerts: [...document.querySelectorAll('[role="alert"]')].map(
                (node) => node.textContent,
              ),
            }))
          : null,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
  await cp(out, finalOut, { recursive: true });
  await cp(pdfOut, finalPdfOut, { recursive: true });
  await rm(temporary, { recursive: true, force: true });
}
