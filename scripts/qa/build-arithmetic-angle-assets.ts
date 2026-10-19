/** Offline, local-engine-only asset build. No AI, database or runtime engine calls.
 * Run with tsx from this checkout. The checked v1 domain and SVG pack are immutable
 * once shipped: geometry/layout changes must create v2 assets and new type IDs.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { deflateSync, strToU8 } from "fflate";
import { chromium } from "playwright";
import {
  renderTriangleAngleDrill,
  renderRightTriangleAngleDrill,
} from "../../src/lib/figure/triangleAngleDrill";
import {
  geometryDrillFailures,
  measureGeometryDrills,
} from "./geometryDrillProof";

async function main() {
  globalThis.fetch = (() => {
    throw new Error("Network disabled for asset build");
  }) as typeof fetch;
  delete process.env.STUDIO_ENGINE_URL;
  process.env.VERCEL = "0";
  const out = path.resolve("tmp/arithmetic-angle-assets-v1");
  await mkdir(out, { recursive: true });
  const entries: {
    id: string;
    kind: "triangle" | "right-triangle";
    given: [number, number];
  }[] = [];
  for (let a = 25; a <= 80; a += 5)
    for (let b = a; b <= 80; b += 5) {
      const c = 180 - a - b;
      if (c >= 25 && c <= 120 && c !== 90)
        entries.push({
          id: `angle-v1-${a}-${b}`,
          kind: "triangle",
          given: [a, b],
        });
    }
  for (let acute = 20; acute <= 70; acute += 5)
    entries.push({
      id: `right-angle-v1-${acute}`,
      kind: "right-triangle",
      given: [acute, 90],
    });
  const svgs: Record<string, string> = {};
  for (const entry of entries) {
    const result =
      entry.kind === "triangle"
        ? await renderTriangleAngleDrill(entry.given)
        : await renderRightTriangleAngleDrill(entry.given[0]);
    assert.ok(result.ok, `${entry.id}: ${result.ok ? "" : result.error}`);
    assert.ok(!result.svg.includes("?"));
    // Lossless whitespace compaction only: preserve paths, metrics and engine layout.
    svgs[entry.id] = result.svg
      .replace(/>\s+</g, "><")
      .trim()
      .replace(/(<svg[^>]+>)/, "$1<desc>arithmetic-angle-drill-v1</desc>");
  }
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><style>body{font:14px Arial}main{display:grid;grid-template-columns:repeat(4,240px);gap:12px}article{padding:12px;border:1px solid #bbb}svg{display:block;width:216px;height:216px}@media print{svg{width:57.15mm;height:57.15mm}}</style><h1>각도 연산 전체 도메인 검증</h1><main>${entries.map((e) => `<article><b>${e.id}</b>${svgs[e.id]}</article>`).join("")}</main></html>`;
  await writeFile(path.join(out, "gallery.html"), html);
  const browser = await chromium.launch({ headless: true });
  const proofs: Record<string, unknown> = {};
  try {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 1000 },
    });
    await page.setContent(html);
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      const measured = await measureGeometryDrills(page);
      proofs[media] = measured;
      measured.forEach((proof, i) => {
        const entry = entries[i];
        if (entry.kind === "triangle")
          assert.deepEqual(
            geometryDrillFailures(proof, entry.given),
            [],
            entry.id,
          );
        else {
          assert.equal(proof.labels.length, 1, entry.id);
          assert.equal(proof.labels[0].text, `${entry.given[0]}°`);
          assert.ok(
            proof.labels[0].fontPx >= 16 && proof.labels[0].inkHeightPx >= 10,
          );
          assert.equal(proof.sideCount, 3);
          assert.equal(proof.arcCount, 2);
          proof.angles.forEach((angle, j) =>
            assert.ok(
              Math.abs(angle - [...entry.given, 90 - entry.given[0]][j]) < 0.01,
            ),
          );
          for (const key of [
            "geometryHits",
            "labelHits",
            "clipped",
            "outsideWithoutLeader",
            "ambiguousInside",
          ] as const)
            assert.deepEqual(proof[key], [], `${entry.id}: ${key}`);
          assert.match(svgs[entry.id], /d="M [^"]+ L [^"]+ L [^"]+"/); // square mark
        }
      });
    }
    await page.emulateMedia({ media: "screen" });
    await page.screenshot({
      path: path.join(out, "gallery.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
  await writeFile(
    path.join(out, "proof.json"),
    JSON.stringify(proofs, null, 2),
  );
  const json = JSON.stringify(svgs);
  const svgPack = Buffer.from(
    deflateSync(strToU8(json), { level: 9 }),
  ).toString("base64");
  assert.ok(
    svgPack.length < 80000,
    "Pack must leave room for 200 item snapshots",
  );
  const artifact = {
    version: 1,
    codec: "deflate-base64",
    sha256: createHash("sha256").update(json).digest("hex"),
    entries,
    svgPack,
  };
  const file = "src/lib/arithmetic-v2/families/geometry-angle-assets-v1.json";
  const serialized = JSON.stringify(artifact, null, 2) + "\n";
  const existing = await readFile(file, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return null;
    },
  );
  if (existing !== null)
    assert.equal(
      existing.replace(/\r\n/g, "\n"),
      serialized,
      "Published v1 assets are immutable; create a new version instead",
    );
  else await writeFile(file, serialized, { flag: "wx" });
  console.log(
    JSON.stringify({
      entries: entries.length,
      triangle: entries.filter((e) => e.kind === "triangle").length,
      rawBytes: Buffer.byteLength(json),
      packedBytes: svgPack.length,
      sha256: artifact.sha256,
      proof: out,
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
