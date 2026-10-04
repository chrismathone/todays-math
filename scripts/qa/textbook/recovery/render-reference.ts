/** Local production export-path proof of ORIGINAL U01 input; no DB/API/UI writes.
 * OUT_DIR [base|semantic] [student|answers|both]
 * Base mode is explicit compatibility evidence and can never pass G0 semantics.
 */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import { textbookExchangeSchema, type TextbookExchange } from "../../../../src/contracts/textbookExchange.contract";
import { renderTextbookChunk, mergeTextbookPdfs } from "../../../../src/lib/textbook/render/server";
import { createTextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import type { TextbookPage } from "../../../../src/lib/textbook/layout/paginate";

async function main() {
  const [outDir, mode = "semantic", variants = "both"] = process.argv.slice(2);
  assert(outDir && ["base", "semantic"].includes(mode) && ["student", "answers", "both"].includes(variants));
  const out = path.resolve(outDir);
  const fixtureBytes = await readFile(path.join(out, `exchange-${mode}.json`));
  const exchange = textbookExchangeSchema.parse(JSON.parse(fixtureBytes.toString("utf8")));
  const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
  const sourceMap = JSON.parse(await readFile(path.join(out, "source-map.json"), "utf8"));
  const studentModel = createTextbookRenderModel(exchange, "student");
  const selected = studentModel.sections.map((s, i) => ({ s, i })).filter(x => x.s.unitKey === "U01").map(x => x.i);
  assert.equal(selected.length, 36);
  const browser = await launchExportBrowser();
  const results: unknown[] = [];
  const studentPages: TextbookPage[] = [];
  const studentChunks = new Map<number, TextbookPage[]>();
  const studentPageMap: TextbookExchange["pageMap"] = [];
  const chunkSize = mode === "base" ? 1 : 4;
  if (variants === "answers") {
    const evidence = JSON.parse(await readFile(path.join(out, `new-u01-${mode}-student-chunks.json`), "utf8"));
    assert.equal(evidence.fixtureSha256, fixtureSha256, "Student evidence uses a different fixture");
    assert.equal(evidence.chunkSize, chunkSize);
    assert.equal(createHash("sha256").update(await readFile(path.join(out, `new-u01-${mode}-student.pdf`))).digest("hex"), evidence.pdfSha256);
    for (const [offset, pages] of evidence.chunks as [number, TextbookPage[]][]) { studentChunks.set(offset, pages); studentPages.push(...pages); }
    studentPageMap.push(...evidence.pageMap);
  }
  try {
    for (const variant of variants === "both" ? ["student", "answers"] as const : [variants] as ("student" | "answers")[]) {
      const variantOut = path.join(out, `new-u01-${mode}-${variant}`);
      await mkdir(variantOut, { recursive: true });
      const chunks = [];
      const witnessPages: unknown[] = [];
      let physicalPage = variant === "student" ? 8 : 1;
      for (let offset = 0; offset < selected.length; offset += chunkSize) {
        const sectionIndices = selected.slice(offset, offset+chunkSize);
        // The old renderer treats all 'continue' sections in a unit as one
        // indivisible chain (36 source pages exceeds its eight-section bound).
        // Base-mode compatibility proof scopes each original page explicitly;
        // semantic mode requires the integrated source-page isolation policy.
        const chunkExchange = mode === "base" ? { ...exchange, units: exchange.units.filter(u => u.unitKey === "U01").map(u => ({ ...u, sections: u.sections.slice(offset, offset+chunkSize) })),
          items: exchange.items.filter(i => sectionIndices.some(n => studentModel.sections[n].sectionKey === i.sectionKey)) } : exchange;
        const chunk = await renderTextbookChunk({ exchange: chunkExchange, officialOrigin: "https://reference-qa.invalid", readAsset: async id => new Uint8Array(await readFile(path.join(out, sourceMap.assetFiles[id]))),
          sectionIndices: mode === "base" ? sectionIndices.map((_, i) => i) : sectionIndices,
          firstPhysicalPageIndex: physicalPage, variant, browser, mode: "draft", ...(variant === "answers" && studentPages.length ? { studentPages: studentChunks.get(offset)! } : {}) });
        chunks.push(chunk); physicalPage = chunk.nextPhysicalPageIndex;
        if (variant === "student") { studentPages.push(...chunk.pages); studentChunks.set(offset, chunk.pages); studentPageMap.push(...chunk.pageMap); }
        await writeFile(path.join(variantOut, `chunk-${offset/chunkSize}.html`), chunk.html);
        const page = await browser.newPage();
        // tsx/esbuild preserves nested function names using this pure helper.
        await page.evaluate("globalThis.__name = (fn) => fn");
        await page.setContent(chunk.html, { waitUntil: "load" });
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map(i => i.decode())); });
        const captured = await page.evaluate(() => {
          const mm = 25.4 / 96;
          return Array.from(document.querySelectorAll<HTMLElement>("[data-textbook-page]")).map(paper => {
            const pr = paper.getBoundingClientRect();
            const rect = (el: Element) => { const r = el.getBoundingClientRect(); return [(r.left-pr.left)*mm, (r.top-pr.top)*mm, (r.right-pr.left)*mm, (r.bottom-pr.top)*mm]; };
            const blocks = Array.from(paper.querySelectorAll<HTMLElement>("[data-block-id]"));
            const clips = blocks.flatMap(block => Array.from(block.querySelectorAll(".katex,.tb-dialogue,.tb-prose p,.tb-prose img,.tb-image,img.tb-figure")).map((el, i) => ({ id: `${block.dataset.blockId}.clip${i}`, boxMm: rect(el), clipBoxMm: rect(block) })));
            const writeBoxes = Array.from(paper.querySelectorAll<HTMLElement>(".tb-work-lines,.tb-blank")).map((el, i) => ({ id: `${paper.dataset.textbookPage}.write${i}`, boxMm: rect(el), written: !!el.closest(".tb-problem-wide"), columnWidthMm: el.getBoundingClientRect().width*mm }));
            const rows = Array.from(paper.querySelectorAll<HTMLElement>("[data-row-key]")).map(el => ({ rowKey: el.dataset.rowKey, conceptId: el.dataset.conceptId, phase: el.dataset.phase ?? el.closest<HTMLElement>("[data-phase]")?.dataset.phase,
              relativePageIndex: Number(el.dataset.relativePageIndex ?? 0), boxMm: rect(el) }));
            const qrs = Array.from(paper.querySelectorAll<HTMLElement>(".tb-qr")).map((el, i) => ({ id: `${paper.dataset.textbookPage}.qr${i}`, boxMm: rect(el) }));
            return { physicalPageIndex: Number(paper.dataset.textbookPage), widthMm: pr.width*mm, heightMm: pr.height*mm, sectionKey: paper.dataset.sectionKey,
              anchors: [], rows, writeBoxes, qrs, clips, nodes: blocks.map(el => ({ id: el.dataset.blockId, itemId: el.dataset.itemId, role: "content" })) };
          });
        });
        await page.close();
        for (const p of captured) witnessPages.push({ ...p, pdfPageIndex: witnessPages.length+1 });
        console.info(JSON.stringify({ variant, chunk: offset/chunkSize, pages: chunk.pages.length, nextPhysicalPage: physicalPage }));
      }
      const merged = await mergeTextbookPdfs(chunks);
      const pdf = path.join(out, `new-u01-${mode}-${variant}.pdf`);
      await writeFile(pdf, merged.pdf);
      const pdfSha256 = createHash("sha256").update(merged.pdf).digest("hex");
      const model = createTextbookRenderModel({ ...exchange, pageMap: studentPageMap }, variant);
      const witness = { version: 1, pdfSha256, fixtureSha256, variant, requiredFonts: ["NotoSansKR|Nanum"], requireEmbeddedFonts: true, pages: witnessPages,
        coverage: { anchors: false, rows: mode === "semantic" && witnessPages.some(p => (p as { rows: unknown[] }).rows.length > 0), writeBoxes: true, qrs: true, nodes: false, clips: true },
        disabledActivities: [], publicExampleItemIds: sourceMap.publicExampleItemIds,
        projectedModel: { ...model, sections: model.sections.filter(s => s.unitKey === "U01") },
        expectedRows: Object.fromEntries(["study", "keywords", "sentences"].map(phase => [phase,
          sourceMap.provenance.filter((p: { semantic: { source: { unit: string }; node?: { kind: string } } }) => p.semantic.source.unit === "U01" && p.semantic.node?.kind === "concept")
            .slice(0, 4).flatMap((p: { semantic: { node: { conceptId: string; rows: { rowKey: string }[] } } }) => p.semantic.node.rows.map(r => [p.semantic.node.conceptId, r.rowKey]))])),
        limits: ["Anchors and semantic DOM roles require renderer integration; their coverage remains false.", "This uses the production export path, never the ZIP standalone print renderer."] };
      await writeFile(path.join(out, `new-u01-${mode}-${variant}-witness.json`), JSON.stringify(witness, null, 2));
      if (variant === "student") await writeFile(path.join(out, `new-u01-${mode}-student-chunks.json`), JSON.stringify({ fixtureSha256, pdfSha256, chunkSize, chunks: Array.from(studentChunks), pageMap: studentPageMap }, null, 2));
      const result = { variant, mode, pageCount: merged.pageCount, pdfSha256, fixtureSha256, chunks: chunks.length, pdf,
        pageMapCount: chunks.flatMap(c => c.pageMap).length, originalStudentVisualEquality: "pending", answerOriginalVisualEquality: "not asserted",
        compatibilityChunkScoping: mode === "base" ? "One original section per standalone export call; continuous source-page policy pending" : null };
      results.push(result);
      await writeFile(path.join(out, `new-u01-${mode}-${variant}-export.json`), JSON.stringify(result, null, 2));
    }
  } finally { await browser.close(); }
  console.info(JSON.stringify(results));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
