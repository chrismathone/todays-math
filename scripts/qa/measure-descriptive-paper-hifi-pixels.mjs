/**
 * Actual Chrome pixels + Poppler pixels from Chrome's PDFs, not CSS assertions.
 * Run measure-descriptive-paper-hifi.mjs first to regenerate all 60 PDFs.
 * This script covers all 60 states at 1040px and every existing writing surface.
 * No answers/scratch are expected on a teacher sheet or past-paper question page.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const evidence = path.join(
  root,
  "docs/planning/tracks/reports/descriptive-paper-hifi-codex-20261020",
);
const out = path.join(evidence, "fix");
const pdfDir = path.join(root, "tmp/pdfs/descriptive-paper-hifi");
const renderDir = path.join(root, "tmp/pdfs/descriptive-paper-hifi-fix-render");
const url =
  process.env.DESCRIPTIVE_HIFI_URL ??
  "http://127.0.0.1:3034/dev/descriptive-paper-hifi";
const options = ["A", "B", "C", "D", "E"];
const results = [];
const differences = [];
const teacherStates = [];
const pdfBounds = [];
const errors = [];
const forbiddenRequests = [];
const serverDiagnostics = [];
const comparisonImages = new Map();
const contactImages = new Map();
const knownAuthDiagnostic = (text) =>
  (text.includes("[auth][error]") && text.includes("MissingSecret")) ||
  (text.includes("at assertConfig") &&
    text.includes("@auth/core/lib/utils/assert.js"));
await mkdir(out, { recursive: true });
await mkdir(renderDir, { recursive: true });

// Require a full, successful geometry/PDF run; never consume a quick run.
const geometry = JSON.parse(
  await readFile(path.join(evidence, "measurements.json"), "utf8"),
);
assert.equal(geometry.quick, false);
assert.equal(geometry.printMeasurements.length, 60);
assert.equal(geometry.measurements.length, 360);
async function getSourceHashes() {
  const hashes = {};
  for (const file of [
    "DescriptivePaperHifi.tsx",
    "DescriptivePaperHifi.module.css",
    "fixtures.ts",
    "page.tsx",
  ])
    hashes[file] = createHash("sha256")
      .update(
        await readFile(
          path.join(root, "src/app/dev/descriptive-paper-hifi", file),
        ),
      )
      .digest("hex");
  return hashes;
}
const sourceHashes = await getSourceHashes();
assert.deepEqual(
  sourceHashes,
  geometry.sourceHashes,
  "Regenerate PDFs for the current source",
);

async function raw(input) {
  return sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function groups(values, threshold) {
  const found = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] <= threshold) continue;
    const start = i;
    while (i + 1 < values.length && values[i + 1] > threshold) i++;
    found.push((start + i) / 2);
  }
  return found;
}

function meanGapMm(positions, pixelsPerMm) {
  if (positions.length < 2) return null;
  return (
    (positions.at(-1) - positions[0]) / (positions.length - 1) / pixelsPerMm
  );
}

async function inspectPattern(input, surface, option, pixelsPerMm, label) {
  const { data, info } = await raw(input);
  const { width, height, channels } = info;
  // Exclude the left number/label, all outer edges, and scratch's top-right label.
  // These pixels contain ONLY the writing pattern, not identifying text.
  const x0 = Math.ceil(11 * pixelsPerMm);
  const x1 = Math.min(
    width - Math.ceil(3 * pixelsPerMm),
    x0 + (180 * pixelsPerMm) / (96 / 25.4),
  );
  const y0 = Math.ceil(3 * pixelsPerMm);
  const y1 = height - Math.ceil(2 * pixelsPerMm);
  const rows = [];
  const cols = Array(Math.floor(x1) - x0).fill(0);
  let ink = 0;
  for (let y = y0; y < y1; y++) {
    let rowInk = 0;
    for (let x = x0; x < Math.floor(x1); x++) {
      const offset = (y * width + x) * channels;
      const dark =
        Math.min(data[offset], data[offset + 1], data[offset + 2]) < 247;
      if (dark) {
        rowInk++;
        cols[x - x0]++;
        ink++;
      }
    }
    rows.push(rowInk / cols.length);
  }
  const horizontal = groups(rows, option === "C" ? 0.15 : 0.55);
  const vertical = groups(
    cols.map((n) => n / rows.length),
    0.55,
  );
  const spacingMm = meanGapMm(horizontal, pixelsPerMm);
  const verticalSpacingMm = meanGapMm(vertical, pixelsPerMm);
  const density = ink / (rows.length * cols.length);
  const peakRowCoverage = Math.max(...rows);
  const metric = {
    surface,
    width,
    height,
    horizontalLines: horizontal.length,
    verticalLines: vertical.length,
    spacingMm,
    verticalSpacingMm,
    density,
    peakRowCoverage,
  };
  if (option === "D") {
    assert.equal(ink, 0, `${label}: D interior must be blank`);
    let bottomInk = 0;
    const bottomHeight = Math.ceil(1.2 * pixelsPerMm);
    for (let y = height - bottomHeight; y < height; y++) {
      for (let x = x0; x < Math.floor(x1); x++) {
        const i = (y * width + x) * channels;
        if (Math.min(data[i], data[i + 1], data[i + 2]) < 247) bottomInk++;
      }
    }
    assert.ok(
      bottomInk >= cols.length / 2,
      `${label}: D bottom baseline missing`,
    );
    metric.baselineInk = bottomInk;
  } else {
    assert.ok(horizontal.length >= 1, `${label}: no horizontal pattern pixels`);
    if (spacingMm !== null)
      assert.ok(
        Math.abs(spacingMm - (option === "B" ? 4 : 8)) < 0.6,
        `${label}: wrong physical spacing ${spacingMm}mm; rows ${horizontal}; scale ${pixelsPerMm}`,
      );
    if (option === "B") {
      assert.ok(vertical.length >= 8, `${label}: grid verticals missing`);
      assert.ok(Math.abs(verticalSpacingMm - 4) < 0.3, `${label}: grid width`);
    } else {
      assert.equal(vertical.length, 0, `${label}: unexpected grid verticals`);
      if (option === "C")
        assert.ok(peakRowCoverage < 0.85, `${label}: dots became solid lines`);
      else
        assert.ok(peakRowCoverage > 0.9, `${label}: solid rule is incomplete`);
    }
  }
  if (option === "E") {
    // Bottom half of the number gutter, clear of the numeral.
    let filled = 0;
    let total = 0;
    for (let y = Math.floor(height * 0.6); y < height - 3; y++) {
      for (let x = Math.ceil(pixelsPerMm); x < 6 * pixelsPerMm; x++) {
        const i = (y * width + x) * channels;
        if (Math.min(data[i], data[i + 1], data[i + 2]) < 250) filled++;
        total++;
      }
    }
    metric.gutterFill = filled / total;
    assert.ok(metric.gutterFill > 0.9, `${label}: E number gutter missing`);
  }
  return metric;
}

async function keepComparison(input, key, option, pixelsPerMm) {
  // Same local position and physical dimensions for A–E, including E's gutter.
  // Ignore text at the top, and never compare encoded PNG file bytes.
  const crop = await sharp(input)
    .extract({
      left: Math.round(pixelsPerMm),
      top: Math.round(5 * pixelsPerMm),
      width: Math.round(62 * pixelsPerMm),
      height: Math.round(8 * pixelsPerMm),
    })
    .resize(248, 32)
    .png()
    .toBuffer();
  const group = comparisonImages.get(key) ?? {};
  group[option] = (await raw(crop)).data;
  comparisonImages.set(key, group);
}

function compareAll() {
  for (const [key, group] of comparisonImages) {
    assert.equal(Object.keys(group).length, 5, `${key}: missing option`);
    for (let a = 0; a < options.length; a++) {
      for (let b = a + 1; b < options.length; b++) {
        const left = group[options[a]];
        const right = group[options[b]];
        let changed = 0;
        for (let i = 0; i < left.length; i += 3)
          if (
            Math.max(
              Math.abs(left[i] - right[i]),
              Math.abs(left[i + 1] - right[i + 1]),
              Math.abs(left[i + 2] - right[i + 2]),
            ) > 4
          )
            changed++;
        const changedPercent = (changed / (left.length / 3)) * 100;
        assert.ok(
          changedPercent > 0.5,
          `${key}: ${options[a]}/${options[b]} same pixels`,
        );
        differences.push({
          key,
          pair: `${options[a]}-${options[b]}`,
          changedPercent,
        });
      }
    }
  }
}

function checkPdfBounds(file, name) {
  const xml = execFileSync("pdftotext", ["-bbox", file, "-"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let words = 0;
  let pages = 0;
  for (const match of xml.matchAll(
    /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g,
  )) {
    pages++;
    const width = Number(match[1]);
    const height = Number(match[2]);
    for (const word of match[3].matchAll(
      /<word xMin="([-\d.]+)" yMin="([-\d.]+)" xMax="([-\d.]+)" yMax="([-\d.]+)"/g,
    )) {
      words++;
      const [x0, y0, x1, y1] = word.slice(1).map(Number);
      assert.ok(
        x0 >= 0 && y0 >= 0 && x1 <= width && y1 <= height,
        `${name}: PDF text outside A4`,
      );
    }
  }
  assert.ok(words > 0 && pages > 0, `${name}: PDF text missing`);
  pdfBounds.push({ name, pages, words, outside: 0 });
}

const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1040, height: 1000 },
    deviceScaleFactor: 1,
  });
  async function choose(button, printing = false) {
    if (printing) await button.evaluate((e) => e.click());
    else await button.click();
    // A click receipt or two animation frames do not guarantee a React commit.
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error")
      (knownAuthDiagnostic(m.text()) ? serverDiagnostics : errors).push(
        m.text(),
      );
  });
  await page.route("**/*", (route) => {
    const target = new URL(route.request().url());
    if (
      target.origin !== new URL(url).origin ||
      target.pathname.startsWith("/api/")
    ) {
      forbiddenRequests.push(target.href);
      return route.abort();
    }
    return route.continue();
  });
  assert.equal(
    (await page.goto(url, { waitUntil: "networkidle" })).status(),
    200,
  );
  await page.addStyleTag({
    content: "nextjs-portal { display:none !important }",
  });
  const settle = () =>
    page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
    });

  for (const mono of [false, true]) {
    await choose(page.locator(`[data-color="${mono ? "mono" : "color"}"]`));
    for (const paper of ["daily", "review", "past"]) {
      await choose(page.locator(`[data-paper-button="${paper}"]`));
      for (const teacher of [false, true]) {
        await choose(
          page.locator(`[data-audience="${teacher ? "teacher" : "student"}"]`),
        );
        for (const option of options) {
          await choose(page.locator(`[data-option-button="${option}"]`));
          await settle();
          const name = `${option}-${paper}-${teacher ? "teacher" : "student"}-${mono ? "mono" : "color"}`;
          const pdfFile = path.join(pdfDir, `${name}.pdf`);
          checkPdfBounds(pdfFile, name);
          const prefix = path.join(renderDir, name);
          execFileSync("pdftoppm", ["-r", "144", "-png", pdfFile, prefix], {
            stdio: ["ignore", "ignore", "pipe"],
          });
          const papers = await page.locator("[data-paper]").count();
          // Check every full PDF page, not only the selected crops, for gray pixels.
          if (mono)
            for (let n = 1; n <= papers; n++) {
              const { data, info } = await raw(`${prefix}-${n}.png`);
              for (let i = 0; i < data.length; i += info.channels)
                assert.ok(
                  data[i] === data[i + 1] && data[i + 1] === data[i + 2],
                  `${name}/${n}: colored pixel in monochrome PDF`,
                );
            }
          const surfaces = await page
            .locator(
              "[data-scratch], [data-answer-split='false'] [data-writing-area], [data-sub-space]",
            )
            .evaluateAll((nodes) =>
              nodes.map((e) => {
                const parent = e.closest("[data-answer-space]");
                const sub = e.hasAttribute("data-sub-space");
                return {
                  key: e.hasAttribute("data-scratch")
                    ? `scratch-${e.dataset.scratch}`
                    : sub
                      ? `split-${[...e.parentElement.children].indexOf(e) + 1}`
                      : `answer-${parent.dataset.answerSpace}`,
                  selector: e.hasAttribute("data-scratch")
                    ? `[data-scratch="${e.dataset.scratch}"]`
                    : sub
                      ? `[data-answer-space="6"] [data-sub-space]:nth-child(${[...e.parentElement.children].indexOf(e) + 1})`
                      : `[data-answer-space="${parent.dataset.answerSpace}"] [data-writing-area]`,
                };
              }),
            );
          assert.equal(surfaces.length, teacher ? 0 : paper === "past" ? 5 : 9);
          if (teacher) {
            assert.equal(await page.locator("[data-rubric]").count(), 3);
            await page.locator("[data-paper]").screenshot({
              path: path.join(out, `${name}-screen.png`),
            });
            teacherStates.push({
              option,
              paper,
              mono,
              answerSurfaces: 0,
              rubrics: 3,
            });
          }
          for (const surface of surfaces) {
            const target = page.locator(surface.selector);
            await target.scrollIntoViewIfNeeded();
            await settle();
            const buffer = await target.screenshot();
            await writeFile(
              path.join(out, `${name}-${surface.key}-screen.png`),
              buffer,
            );
            const box = await target.boundingBox();
            const screenScale = await target.evaluate((e) => {
              const p = e.closest("[data-paper]");
              return p.getBoundingClientRect().width / p.offsetWidth;
            });
            const pixelsPerMm = (96 / 25.4) * screenScale;
            const label = `${name}/${surface.key}`;
            const screen = await inspectPattern(
              buffer,
              surface.key,
              option,
              pixelsPerMm,
              `screen/${label}`,
            );
            if (mono) {
              const { data, info } = await raw(buffer);
              // Locator screenshots round fractional outer edges to whole
              // pixels; the surrounding screen is intentionally blue-gray.
              for (let y = 1; y < info.height - 1; y++)
                for (let x = 1; x < info.width - 1; x++) {
                  const i = (y * info.width + x) * info.channels;
                  assert.ok(
                    data[i] === data[i + 1] && data[i] === data[i + 2],
                    `${label}: screen grayscale`,
                  );
                }
            }
            await keepComparison(
              buffer,
              `screen/${paper}/${mono}/${surface.key}`,
              option,
              pixelsPerMm,
            );
            results.push({ option, paper, mono, medium: "screen", ...screen });
            assert.ok(box.width > 0);
          }
          await page.emulateMedia({ media: "print" });
          await settle();
          for (const surface of surfaces) {
            const coords = await page
              .locator(surface.selector)
              .evaluate((e) => {
                const p = e.closest("[data-paper]");
                const r = e.getBoundingClientRect();
                const pr = p.getBoundingClientRect();
                return {
                  page:
                    [...document.querySelectorAll("[data-paper]")].indexOf(p) +
                    1,
                  left: r.left - pr.left,
                  top: r.top - pr.top,
                  width: r.width,
                  height: r.height,
                };
              });
            const crop = await sharp(`${prefix}-${coords.page}.png`)
              .extract({
                left: Math.round(coords.left * 1.5),
                top: Math.round(coords.top * 1.5),
                width: Math.floor(coords.width * 1.5),
                // PDF rasterization can put a bottom border on the next pixel.
                // Include that edge rather than truncating it with floor().
                height: Math.ceil(coords.height * 1.5) + 1,
              })
              .png()
              .toBuffer();
            await writeFile(
              path.join(out, `${name}-${surface.key}-pdf.png`),
              crop,
            );
            const label = `${name}/${surface.key}`;
            const pdf = await inspectPattern(
              crop,
              surface.key,
              option,
              144 / 25.4,
              `pdf/${label}`,
            );
            await keepComparison(
              crop,
              `pdf/${paper}/${mono}/${surface.key}`,
              option,
              144 / 25.4,
            );
            results.push({ option, paper, mono, medium: "pdf", ...pdf });
            if (
              mono &&
              paper === "daily" &&
              ["scratch-1", "answer-5", "split-3"].includes(surface.key)
            )
              contactImages.set(`${option}-${surface.key}`, crop);
          }
          await page.emulateMedia({ media: "screen" });
          await settle();
        }
        process.stdout.write(
          `pixels ${paper}/${teacher ? "teacher" : "student"}/${mono ? "mono" : "color"}: passed\n`,
        );
      }
    }
  }
  compareAll();
  assert.deepEqual(
    await getSourceHashes(),
    sourceHashes,
    "Source changed during pixel QA",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(forbiddenRequests, []);
  // This existing server diagnostic must also occur on the unchanged Wire.
  if (serverDiagnostics.length) {
    const baseline = await browser.newPage();
    const diagnostics = [];
    baseline.on("console", (m) => {
      if (knownAuthDiagnostic(m.text())) diagnostics.push(m.text());
    });
    await baseline.goto(new URL("/dev/descriptive-paper-wire", url).href, {
      waitUntil: "networkidle",
    });
    assert.ok(diagnostics.some((s) => s.includes("MissingSecret")));
    await baseline.close();
  }
  // A compact, unaltered-pixel contact sheet for visual review: rows A–E,
  // columns normal scratch / whole answer / third split cell.
  const tiles = [];
  for (const [row, option] of options.entries())
    for (const [col, surface] of [
      "scratch-1",
      "answer-5",
      "split-3",
    ].entries()) {
      const crop = contactImages.get(`${option}-${surface}`);
      const tile = await sharp(crop)
        .extract({ left: 0, top: 0, width: 420, height: 140 })
        .png()
        .toBuffer();
      tiles.push({ input: tile, left: col * 440, top: row * 160 });
    }
  await sharp({
    create: { width: 1300, height: 780, channels: 3, background: "#cccccc" },
  })
    .composite(tiles)
    .png()
    .toFile(path.join(out, "mono-pdf-pattern-contact.png"));
  const result = {
    measuredAt: new Date().toISOString(),
    geometryMeasuredAt: geometry.measuredAt,
    sourceHashes,
    url,
    methodology:
      "Chrome screenshots and 144dpi Poppler-rendered Chrome PDFs. Interior raster line/dot/grid/baseline detection, physical pitch, E gutter fill; identical local crop pairwise RGB diff >4.",
    surfaces: results,
    differences,
    teacherStates,
    pdfBounds,
    errors,
    forbiddenRequests,
    serverDiagnostics,
  };
  await writeFile(
    path.join(out, "pixels.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    `PASS: ${results.length} pattern surfaces, ${differences.length} pairwise differences, ${teacherStates.length} teacher states, ${pdfBounds.length} PDFs`,
  );
} finally {
  await browser.close();
}
