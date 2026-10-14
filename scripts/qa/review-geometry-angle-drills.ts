/**
 * Offline regeneration and actual-browser proof of the owner's twelve drills.
 * Run from the checkout containing the new code (input/output may be shared):
 * node node_modules/tsx/dist/cli.mjs scripts/qa/review-geometry-angle-drills.ts <evidence-directory>
 * No AI, database, server or network. Writes only inside the supplied directory.
 */
import assert from "node:assert/strict";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  createTriangleAngleDrillSpec,
  renderTriangleAngleDrill,
} from "../../src/lib/figure/triangleAngleDrill";
import {
  geometryDrillFailures,
  measureGeometryDrills,
  type GeometryDrillProof,
} from "./geometryDrillProof";

type Sample = { seed: number; given: [number, number]; answer: number };

async function main() {
  const directory = process.argv[2];
  assert.ok(directory, "Pass the directory containing evidence.json");
  const out = path.resolve(directory);
  globalThis.fetch = (() => {
    throw new Error("Network disabled for geometry drill review");
  }) as typeof fetch;
  // Force the existing local Python transport even in a configured developer shell.
  delete process.env.STUDIO_ENGINE_URL;
  process.env.VERCEL = "0";
  const evidence = JSON.parse(
    await readFile(path.join(out, "evidence.json"), "utf8"),
  ) as {
    samples: Sample[];
  };
  assert.equal(evidence.samples.length, 12);
  try {
    await copyFile(
      path.join(out, "v2-triangle-6.svg"),
      path.join(out, "baseline-v2-triangle-6.svg"),
      constants.COPYFILE_EXCL,
    );
  } catch (error) {
    if (
      !["EEXIST", "ENOENT"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      throw error;
  }
  const rows: (Sample & {
    v2spec: ReturnType<typeof createTriangleAngleDrillSpec>;
    v2svg: string;
  })[] = [];
  for (const [i, sample] of evidence.samples.entries()) {
    assert.equal(sample.answer, 180 - sample.given[0] - sample.given[1]);
    const result = await renderTriangleAngleDrill(sample.given);
    assert.ok(result.ok, result.ok ? "" : result.error);
    await writeFile(
      path.join(out, `v2-triangle-${i + 1}.svg`),
      result.svg,
      "utf8",
    );
    rows.push({
      ...sample,
      v2spec: createTriangleAngleDrillSpec(sample.given),
      v2svg: result.svg,
    });
  }
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>도형 연산 · 각도 검토</title>
<style>body{margin:30px;font-family:Arial,sans-serif;color:#172b4d}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(4,240px);gap:16px}article{box-sizing:border-box;border:1px solid #b8c5d6;border-radius:8px;padding:11px;break-inside:avoid}b{font-size:13px}svg{display:block;width:216px;height:216px;margin:auto}article div,p{font-size:14px}@media print{body{margin:0}main{grid-template-columns:repeat(2,240px)}svg{width:57.15mm;height:57.15mm}}@page{size:A4;margin:10mm}</style>
<h1>도형 연산 · 각도 검토</h1><p>빈 각의 크기를 구하세요.</p><main>${rows.map((row, i) => `<article><b>${i + 1}. 빈 각의 크기를 구하세요.</b>${row.v2svg}<div>답: ______ °</div></article>`).join("")}</main>
<p>정답: ${rows.map((row, i) => `${i + 1}) ${row.answer}°`).join("　")}</p></html>`;
  await writeFile(
    path.join(out, "v2-evidence.json"),
    JSON.stringify(rows, null, 2),
    "utf8",
  );
  await writeFile(path.join(out, "preview-v2.html"), html, "utf8");
  const browser = await chromium.launch();
  const allProofs = [];
  let baselineSample6: GeometryDrillProof | undefined;
  try {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 900 },
      deviceScaleFactor: 1,
    });
    await page.route("**/*", (route) => route.abort());
    await page.setContent(html);
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      const measurements = await measureGeometryDrills(page);
      const proofs = measurements.map((measurement, i) => ({
        sample: i + 1,
        given: rows[i].given,
        answer: rows[i].answer,
        ...measurement,
        failures: geometryDrillFailures(measurement, rows[i].given),
      }));
      allProofs.push({ media, proofs });
      await page.screenshot({
        path: path.join(out, `preview-v2-${media}-216px.png`),
        fullPage: true,
      });
      await page
        .locator("article")
        .nth(5)
        .screenshot({ path: path.join(out, `sample6-${media}-216px.png`) });
    }
    const baseline = await readFile(
      path.join(out, "baseline-v2-triangle-6.svg"),
      "utf8",
    ).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (baseline) {
      await page.emulateMedia({ media: "screen" });
      await page.setContent(
        `<style>body{font-family:Arial}main{display:flex;gap:24px;width:max-content}article{padding:12px;border:1px solid #ccc}svg{display:block;width:216px;height:216px}</style><main><article>Before · sample 6${baseline}</article><article>After · sample 6${rows[5].v2svg}</article></main>`,
      );
      baselineSample6 = (await measureGeometryDrills(page))[0];
      await page
        .locator("main")
        .screenshot({ path: path.join(out, "sample6-before-after-216px.png") });
    }
  } finally {
    await browser.close();
  }
  const failures = allProofs.flatMap(({ media, proofs }) =>
    proofs.flatMap((p) =>
      p.failures.map((failure) => ({ media, sample: p.sample, failure })),
    ),
  );
  const summary = {
    samples: rows.length,
    networkDisabled: true,
    sizePx: 216,
    printSizeMm: 57.15,
    baselineSample6FontPx: baselineSample6?.labels[0]?.fontPx,
    baselineSample6InkHeightPx: baselineSample6?.labels[0]?.inkHeightPx,
    minFontPx: Math.min(
      ...allProofs.flatMap((p) =>
        p.proofs.flatMap((x) => x.labels.map((l) => l.fontPx)),
      ),
    ),
    maxAngleErrorDegrees: Math.max(
      ...allProofs.flatMap((p) =>
        p.proofs.flatMap((x) =>
          x.angles.map((a, i) => Math.abs(a - [...x.given, x.answer][i])),
        ),
      ),
    ),
    failures,
  };
  await writeFile(
    path.join(out, "legibility-proof.json"),
    JSON.stringify({ summary, baselineSample6, allProofs }, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(summary, null, 2));
  assert.deepEqual(failures, [], "Geometry drill browser proof failed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
