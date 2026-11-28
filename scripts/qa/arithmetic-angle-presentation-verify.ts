import "./init-arithmetic-packs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { presentArithmeticAngleSvg } from "../../src/lib/arithmetic-v2/presentation/angles";
import { angleEntries } from "./arithmetic-angle-presentation-specs";
import { checkAnglePresentation } from "./arithmetic-angle-presentation-proof";
import { measureGeometryDrills } from "./geometryDrillProof";

async function main() {
  const entries = angleEntries(),
    out = path.resolve("scripts/qa/arithmetic-angle-presentation-evidence");
  await mkdir(out, { recursive: true });
  const rows = entries.map((entry) => {
    const svg = presentArithmeticAngleSvg(entry.id, entry.original);
    assert.ok(svg, entry.id);
    return { ...entry, svg, proof: checkAnglePresentation(entry, svg) };
  });
  console.log(
    `Coordinate/given/target/label ownership checks: ${rows.length} passed`,
  );
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1000 },
  });
  await page.route("**/*", (route) => route.abort());
  const failures: unknown[] = [],
    metrics: unknown[] = [];
  const html = (items: typeof rows, width: number) =>
    `<!doctype html><meta charset="utf-8"><style>body{margin:20px;font:12px Arial}main{display:grid;grid-template-columns:repeat(3,${width + 16}px);gap:12px}article{padding:8px;border:1px solid #ccc}small{display:block;height:30px;overflow-wrap:anywhere}svg{display:block;width:${width}px;height:${width}px}</style><main>${items.map((r) => `<article><small>${r.id}</small>${r.svg}</article>`).join("")}</main>`;
  try {
    for (const width of [280, 320]) {
      for (let offset = 0; offset < rows.length; offset += 48) {
        const batch = rows.slice(offset, offset + 48);
        await page.setContent(html(batch, width));
        const proofs = await measureGeometryDrills(page);
        proofs.forEach((p, i) => {
          const id = batch[i].id;
          for (const key of ["geometryHits", "labelHits", "clipped"] as const)
            if (p[key].length) failures.push({ id, width, key, value: p[key] });
          for (const label of p.labels)
            if (
              label.fontPx < 15.9 ||
              label.fontPx > 18.4 ||
              label.inkHeightPx < 10
            )
              failures.push({ id, width, key: "font", label });
          metrics.push({
            id,
            width,
            fontPx: p.labels.map((l) => l.fontPx),
            inkHeightPx: p.labels.map((l) => l.inkHeightPx),
          });
        });
      }
      const representative = rows.filter(
        (r, i) =>
          i === 0 ||
          r.family !== rows[i - 1]?.family ||
          r.family !== rows[i + 1]?.family ||
          r.params.join("-") === "60-20" ||
          r.params.join("-") === "120-60" ||
          r.params.join("-") === "90-90-90" ||
          r.params.join("-") === "180",
      );
      for (let offset = 0; offset < representative.length; offset += 12) {
        await page.setContent(
          html(representative.slice(offset, offset + 12), width),
        );
        await page.screenshot({
          path: path.join(
            out,
            `representatives-${width}-${offset / 12 + 1}.png`,
          ),
          fullPage: true,
        });
      }
    }
    const report = {
      families: [...new Set(rows.map((r) => r.family))],
      count: rows.length,
      sizes: [280, 320],
      coordinates: rows.map((r) => r.proof),
      metrics,
      failures,
    };
    await writeFile(
      path.join(out, "checks.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        count: rows.length,
        browserChecks: metrics.length,
        failures: failures.slice(0, 15),
        totalFailures: failures.length,
        out,
      }),
    );
    assert.equal(
      failures.length,
      0,
      "All browser stroke/label/font/frame checks must pass",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
