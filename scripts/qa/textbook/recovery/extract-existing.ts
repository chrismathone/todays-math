/** Re-extract a final stored PDF/HTML pair without replacing its failed original witness. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { readFinalHtml } from "./load-final-dom";
import path from "node:path";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import type { TextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import type { TextbookPage } from "../../../../src/lib/textbook/layout/paginate";
import {
  captureDomWitness,
  computedCoverage,
  type SourceGeometry,
} from "./dom-witness";

async function main() {
  const [outputDirectory, variant = "student"] = process.argv.slice(2);
  assert(outputDirectory && ["student", "answers"].includes(variant));
  const out = path.resolve(outputDirectory),
    stem = `new-u01-base-${variant}`;
  const previous = JSON.parse(
    await readFile(path.join(out, `${stem}-witness.json`), "utf8"),
  );
  const pdf = await readFile(path.join(out, `${stem}.pdf`)),
    pdfSha256 = createHash("sha256").update(pdf).digest("hex");
  assert.equal(pdfSha256, previous.pdfSha256);

  const geometry: SourceGeometry = JSON.parse(
    await readFile(path.join(out, "source-computed-geometry.json"), "utf8"),
  );
  const model: TextbookRenderModel = previous.projectedModel;
  const names = (await readdir(path.join(out, stem)))
    .filter((n) => /^chunk-\d+\.html(?:\.gz)?$/.test(n))
    .map((n) => n.replace(/\.gz$/, ""))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const browser = await launchExportBrowser(),
    captured: Awaited<ReturnType<typeof captureDomWitness>> = [],
    placements: TextbookPage[] = [];
  try {
    for (const name of names) {
      const html = await readFinalHtml(path.join(out, stem, name)),
        page = await browser.newPage();
      await page.emulateMediaType("print");
      await page.setContent(html, { waitUntil: "load" });
      const actual = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>("[data-textbook-page]"),
        ).map((e) => ({
          physicalPageIndex: Number(e.dataset.textbookPage),
          sectionKey: e.dataset.sectionKey!,
        })),
      );
      const pages: TextbookPage[] = actual.map((p) => {
        const old = previous.pages.find(
          (q: { physicalPageIndex: number }) =>
            q.physicalPageIndex === p.physicalPageIndex,
        );
        assert(old, "Stored DOM witness lacks this physical page");
        const blocks = old.nodes
          .filter((n: { role: string }) => n.role === "content")
          .map((n: { id: string; itemId?: string }) => {
            const bounds = old.clips.find((c: { id: string }) =>
              c.id.startsWith(`${n.id}.clip`),
            )?.clipBoxMm;
            return {
              blockId: n.id,
              itemId: n.itemId,
              column: 1 as const,
              xMm: bounds?.[0] ?? NaN,
              yMm: bounds?.[1] ?? NaN,
              widthMm: bounds ? bounds[2] - bounds[0] : NaN,
              heightMm: bounds ? bounds[3] - bounds[1] : NaN,
            };
          });
        return {
          ...p,
          kind: "content" as const,
          printedPageLabel: String(p.physicalPageIndex),
          unitKey: "U01",
          unitTitle: "",
          sectionTitle: "",
          blocks,
        };
      });
      placements.push(...pages);
      captured.push(
        ...(await captureDomWitness(
          page,
          model,
          pages,
          variant === "student" ? geometry : undefined,
        )),
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const coverage = computedCoverage(
    captured,
    placements,
    previous.expectedRows ?? {},
    variant === "student",
  );

  const witness = {
    ...previous,
    version: 2,
    pdfSha256,
    pages: captured.map((p, i) => ({ ...p, pdfPageIndex: i + 1 })),
    coverage,
    coverageEvidence: {
      pdfSha256,
      expectedPages: previous.pages.length,
      observedPages: captured.length,
      expectedPlacedBlocks: placements.reduce((n, p) => n + p.blocks.length, 0),
      observedBlocks: captured.reduce(
        (n, p) => n + p.accounting.actualBlocks,
        0,
      ),
    },
    limits: [
      "Failed 55/60-page baseline is preserved; this independently extracts actual final DOM and does not declare acceptance.",
      "Original production placements were not persisted; stored prior DOM clipping containers provide only partial geometry, and unavailable coordinates stay null/failed.",
    ],
  };
  await writeFile(
    path.join(out, `${stem}-final-dom-witness.json`),
    JSON.stringify(witness, null, 2) + "\n",
  );
  console.info(
    JSON.stringify({ variant, pdfSha256, pages: captured.length, coverage }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
