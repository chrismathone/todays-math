/** Reuse the original engine drill's independent angle/leader ownership probe. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import {
  arithmeticAngleAssets,
  arithmeticGeometryCatalogSvg,
} from "../../src/lib/arithmetic-v2/geometry";
import {
  arithmeticGeometryDisplaySize,
  presentArithmeticGeometrySvg,
} from "../../src/lib/arithmetic-v2/presentation";
import {
  figureSvgUrlPrintMm,
  figureWidthStyle,
} from "../../src/lib/figurePrintSize";
import {
  geometryDrillFailures,
  measureGeometryDrills,
} from "./geometryDrillProof";
import { output, hash } from "./arithmetic-full-figure-audit";

async function main() {
  const rows = arithmeticAngleAssets.map((entry) => {
    const svg = presentArithmeticGeometrySvg(
        entry.id,
        arithmeticGeometryCatalogSvg(entry.id),
      ),
      screen = arithmeticGeometryDisplaySize(svg),
      print = figureSvgUrlPrintMm(
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
      )!,
      pw = figureWidthStyle(print.widthMm, print.maxWidthMm)!.width;
    return {
      ...entry,
      svg,
      screen,
      print: {
        width: pw,
        height: `${(parseFloat(pw) * print.height) / print.width}mm`,
      },
    };
  });
  const browser = await chromium.launch({ headless: true }),
    checks: unknown[] = [],
    failures: unknown[] = [];
  try {
    const page = await browser.newPage();
    await page.route("**/*", (r) => r.abort());
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      await page.setContent(
        rows
          .map(
            (r) =>
              `<article>${r.svg.replace("<svg ", `<svg style="width:${media === "screen" ? r.screen.width + "px" : r.print.width};height:${media === "screen" ? r.screen.height + "px" : r.print.height}" `)}</article>`,
          )
          .join(""),
      );
      const measured = await measureGeometryDrills(page);
      measured.forEach((proof, i) => {
        const row = rows[i];
        const reasons =
          row.kind === "triangle"
            ? geometryDrillFailures(proof, row.given as [number, number])
            : [
                ...(proof.labels.length === 1 &&
                proof.labels[0].text === `${row.given[0]}°`
                  ? []
                  : ["wrong given label"]),
                ...(proof.sideCount === 3 && proof.arcCount === 2
                  ? []
                  : ["wrong side/arc count"]),
                ...(proof.angles.every(
                  (a, j) =>
                    Math.abs(a - [row.given[0], 90, 90 - row.given[0]][j]) <
                    0.01,
                )
                  ? []
                  : ["wrong angle geometry"]),
                ...[
                  "geometryHits",
                  "labelHits",
                  "clipped",
                  "outsideWithoutLeader",
                  "ambiguousInside",
                ].filter((k) => proof[k as "geometryHits"].length),
              ];
        checks.push({
          id: row.id,
          media,
          svgSha256: hash(row.svg),
          proof,
          reasons,
        });
        if (reasons.length) failures.push({ id: row.id, media, reasons });
      });
    }
    writeFileSync(
      `${output}/frozen-angle-proof.json`,
      JSON.stringify({
        figures: rows.length,
        renders: checks.length,
        checks,
        failures,
      }) + "\n",
    );
    console.log(
      JSON.stringify(
        { figures: rows.length, renders: checks.length, failures },
        null,
        2,
      ),
    );
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
