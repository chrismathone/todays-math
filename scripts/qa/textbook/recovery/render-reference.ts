/** Local production export-path proof of ORIGINAL U01 input; no DB/API/UI writes.
 * OUT_DIR [base|semantic] [student|answers|both]
 * Base mode is explicit compatibility evidence and can never pass G0 semantics.
 */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import {
  textbookExchangeSchema,
  type TextbookExchange,
} from "../../../../src/contracts/textbookExchange.contract";
import {
  renderTextbookChunk,
  mergeTextbookPdfs,
} from "../../../../src/lib/textbook/render/server";
import { createTextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import type { TextbookPage } from "../../../../src/lib/textbook/layout/paginate";
import {
  captureDomWitness,
  computedCoverage,
  normalizeRowPages,
  expectedRenderedRows,
  type SourceGeometry,
} from "./dom-witness";
import { loadFinalDom } from "./load-final-dom";
import { execFileSync } from "node:child_process";

async function main() {
  const [
    outDir,
    mode = "semantic",
    variants = "both",
    diagnostic = "",
    focusedPageList = "",
  ] = process.argv.slice(2);
  const preflight = diagnostic === "preflight";
  const focused = diagnostic === "focused";
  assert(["", "preflight", "focused"].includes(diagnostic));
  const focusedGroups = focusedPageList
    .split(",")
    .filter(Boolean)
    .map((group) => group.split("+").map(Number));
  const focusedPages = focusedGroups.flat();
  assert(
    !focused ||
      (mode === "semantic" &&
        variants === "student" &&
        focusedPages.length &&
        focusedPages.every(
          (page) => Number.isInteger(page) && page >= 8 && page <= 43,
        )),
  );
  const outputPrefix = focused ? "focused" : "new";
  assert(
    outDir &&
      ["base", "semantic"].includes(mode) &&
      ["student", "answers", "both"].includes(variants),
  );
  const out = path.resolve(outDir);
  const rendererGitCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const productGitCommit = execFileSync(
    "git",
    ["rev-parse", process.env.TEXTBOOK_RECOVERY_PRODUCT_COMMIT ?? "HEAD"],
    {
      encoding: "utf8",
    },
  ).trim();
  const productionIdentityPaths = [
    "src",
    "public",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "next.config.ts",
    ":(exclude)src/__tests__/unit/textbookRecoveryAnswerCheckHeading.integration.test.ts",
  ];
  // A QA-only HEAD must not silently relabel a different production implementation.
  execFileSync(
    "git",
    ["diff", "--exit-code", productGitCommit, "--", ...productionIdentityPaths],
    { stdio: "pipe" },
  );
  const fixtureBytes = await readFile(path.join(out, `exchange-${mode}.json`));
  const exchange = textbookExchangeSchema.parse(
    JSON.parse(fixtureBytes.toString("utf8")),
  );
  const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
  const sourceMap = JSON.parse(
    await readFile(path.join(out, "source-map.json"), "utf8"),
  );
  const studentModel = createTextbookRenderModel(exchange, "student");
  const sourceGeometryBytes = await readFile(
    path.join(out, "source-computed-geometry.json"),
  );
  const sourceGeometry: SourceGeometry = JSON.parse(
    sourceGeometryBytes.toString("utf8"),
  );
  const sourceGeometrySha256 = createHash("sha256")
    .update(sourceGeometryBytes)
    .digest("hex");
  const selected = studentModel.sections
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s.unitKey === "U01")
    .filter(
      (x) =>
        !focused ||
        focusedPages.includes(
          Number(x.s.sectionKey.replace("reference-p", "")),
        ),
    )
    .map((x) => x.i);
  assert.equal(selected.length, focused ? new Set(focusedPages).size : 36);
  const browser = await launchExportBrowser();
  const results: unknown[] = [];
  const studentPages: TextbookPage[] = [];
  const studentChunks = new Map<number, TextbookPage[]>();
  const studentPageMap: TextbookExchange["pageMap"] = [];
  const chunkSize = mode === "base" || focused ? 1 : 4;
  const chunkSpecs = focused
    ? focusedGroups.map((group, offset) => ({
        offset,
        sectionIndices: group.map((nativePage) => {
          const index = selected.find(
            (n) =>
              studentModel.sections[n].sectionKey ===
              `reference-p${String(nativePage).padStart(3, "0")}`,
          );
          assert(index !== undefined);
          return index;
        }),
      }))
    : Array.from(
        { length: Math.ceil(selected.length / chunkSize) },
        (_, index) => ({
          offset: index * chunkSize,
          sectionIndices: selected.slice(
            index * chunkSize,
            (index + 1) * chunkSize,
          ),
        }),
      );
  assert(chunkSpecs.every(({ sectionIndices }) => sectionIndices.length <= 8));
  assert(
    !focused ||
      focusedGroups.every((group) =>
        group.every(
          (nativePage, i) => i === 0 || nativePage === group[i - 1] + 1,
        ),
      ),
  );
  if (variants === "answers") {
    const evidence = JSON.parse(
      await readFile(
        path.join(out, `new-u01-${mode}-student-chunks.json`),
        "utf8",
      ),
    );
    assert.equal(
      evidence.fixtureSha256,
      fixtureSha256,
      "Student evidence uses a different fixture",
    );
    assert.equal(evidence.chunkSize, chunkSize);
    assert.equal(
      createHash("sha256")
        .update(await readFile(path.join(out, `new-u01-${mode}-student.pdf`)))
        .digest("hex"),
      evidence.pdfSha256,
    );
    for (const [offset, pages] of evidence.chunks as [
      number,
      TextbookPage[],
    ][]) {
      studentChunks.set(offset, pages);
      studentPages.push(...pages);
    }
    studentPageMap.push(...evidence.pageMap);
  }
  try {
    for (const variant of variants === "both"
      ? (["student", "answers"] as const)
      : ([variants] as ("student" | "answers")[])) {
      const variantOut = path.join(
        out,
        `${preflight ? "preflight" : outputPrefix}-u01-${mode}-${variant}`,
      );
      await mkdir(variantOut, { recursive: true });
      const chunks = [];
      const witnessPages: Awaited<ReturnType<typeof captureDomWitness>> = [];
      let failedChunks = 0;
      let physicalPage = variant === "student" ? 8 : 1;
      for (const [
        chunkIndex,
        { offset, sectionIndices },
      ] of chunkSpecs.entries()) {
        if (focused)
          physicalPage = Number(
            studentModel.sections[sectionIndices[0]].sectionKey.replace(
              "reference-p",
              "",
            ),
          );
        // The old renderer treats all 'continue' sections in a unit as one
        // indivisible chain (36 source pages exceeds its eight-section bound).
        // Base-mode compatibility proof scopes each original page explicitly;
        // semantic mode requires the integrated source-page isolation policy.
        const chunkExchange =
          mode === "base"
            ? {
                ...exchange,
                units: exchange.units
                  .filter((u) => u.unitKey === "U01")
                  .map((u) => ({
                    ...u,
                    sections: u.sections.slice(offset, offset + chunkSize),
                  })),
                items: exchange.items.filter((i) =>
                  sectionIndices.some(
                    (n) => studentModel.sections[n].sectionKey === i.sectionKey,
                  ),
                ),
              }
            : exchange;
        const chunkInput = {
          exchange: chunkExchange,
          officialOrigin: "https://reference-qa.invalid",
          readAsset: async (id) =>
            new Uint8Array(
              await readFile(path.join(out, sourceMap.assetFiles[id])),
            ),
          sectionIndices:
            mode === "base" ? sectionIndices.map((_, i) => i) : sectionIndices,
          firstPhysicalPageIndex: physicalPage,
          variant,
          browser,
          mode: "draft",
          ...(variant === "answers" && studentPages.length
            ? { studentPages: studentChunks.get(offset)! }
            : {}),
        } satisfies Parameters<typeof renderTextbookChunk>[0];
        const chunk = await renderTextbookChunk(chunkInput).catch(
          async (error) => {
            const failure = {
              variant,
              mode,
              fixtureSha256,
              rendererGitCommit,
              chunkIndex,
              sectionIndices,
              sections: sectionIndices.map((n) => ({
                sectionKey: studentModel.sections[n].sectionKey,
                blockIds: studentModel.sections[n].blocks.map((b) => b.id),
              })),
              errorClass: error instanceof Error ? error.name : "unknown",
              message: error instanceof Error ? error.message : String(error),
              details:
                (error as { issues?: unknown; details?: unknown }).issues ??
                (error as { details?: unknown }).details ??
                null,
            };
            await writeFile(
              path.join(variantOut, `chunk-${chunkIndex}-failure.json`),
              JSON.stringify(failure, null, 2),
            );
            console.error(JSON.stringify(failure));
            if (!preflight) throw error;
            return null;
          },
        );
        if (!chunk) {
          failedChunks++;
          continue;
        }
        if (preflight)
          await writeFile(
            path.join(variantOut, `chunk-${chunkIndex}.pdf`),
            chunk.pdf,
          );
        chunks.push({ ...chunk, html: "" });
        await writeFile(
          path.join(variantOut, `chunk-${chunkIndex}.pdf`),
          chunk.pdf,
        );
        await writeFile(
          path.join(variantOut, `chunk-${chunkIndex}-placements.json`),
          JSON.stringify(
            {
              artifactHash: chunk.artifactHash,
              pages: chunk.pages,
              qrPlacements: chunk.qrPlacements,
            },
            null,
            2,
          ),
        );
        physicalPage = chunk.nextPhysicalPageIndex;
        if (variant === "student") {
          studentPages.push(...chunk.pages);
          studentChunks.set(offset, chunk.pages);
          studentPageMap.push(...chunk.pageMap);
        }
        await writeFile(
          path.join(variantOut, `chunk-${chunkIndex}.html`),
          chunk.html,
        );
        const page = await browser.newPage();
        await loadFinalDom(
          page,
          chunk.html,
          path.join(variantOut, `chunk-${chunkIndex}-dom-resources.json`),
        );
        const chunkModel = createTextbookRenderModel(
          { ...chunkExchange, pageMap: studentPageMap },
          variant,
        );
        const captured = await captureDomWitness(
          page,
          chunkModel,
          chunk.pages,
          mode === "semantic" ? sourceGeometry : undefined,
        );
        await page.close();
        witnessPages.push(...captured);
        console.info(
          JSON.stringify({
            variant,
            chunk: chunkIndex,
            pages: chunk.pages.length,
            nextPhysicalPage: physicalPage,
          }),
        );
      }
      if (focused) {
        const model = createTextbookRenderModel(exchange, "student");
        const exports = [];
        for (const [index, chunk] of chunks.entries()) {
          const sectionKeys = new Set(
            chunk.pages.map((page) => page.sectionKey),
          );
          const projectedModel = {
            ...model,
            sections: model.sections.filter((section) =>
              sectionKeys.has(section.sectionKey),
            ),
          };
          const pages = witnessPages.filter((page) =>
            chunk.pages.some(
              (placement) =>
                placement.physicalPageIndex === page.physicalPageIndex,
            ),
          );
          normalizeRowPages(pages);
          const expectedRows = expectedRenderedRows(projectedModel);
          const pdfSha256 = createHash("sha256")
            .update(chunk.pdf)
            .digest("hex");
          const witness = {
            version: 2,
            variant: "student",
            pdfSha256,
            fixtureSha256,
            sourceComparisonRequired: true,
            sourceGeometrySha256,
            projectedModel,
            expectedRows,
            pages: pages.map((page, i) => ({ ...page, pdfPageIndex: i + 1 })),
            coverage: computedCoverage(pages, chunk.pages, expectedRows, true),
            coverageEvidence: {
              pdfSha256,
              expectedPages: chunk.pages.length,
              observedPages: pages.length,
              expectedPlacedBlocks: chunk.pages.reduce(
                (n, page) => n + page.blocks.length,
                0,
              ),
              observedBlocks: pages.reduce(
                (n, page) => n + page.accounting.actualBlocks,
                0,
              ),
            },
            requiredFonts: ["NotoSansKR|Nanum"],
            requireEmbeddedFonts: true,
            publicExampleItemIds: sourceMap.publicExampleItemIds,
            disabledActivities: [],
            limits: [
              "Focused native physical-page diagnostic; not whole-U01 pagination or visual approval.",
            ],
          };
          const file = path.join(variantOut, `chunk-${index}-witness.json`);
          await writeFile(file, JSON.stringify(witness, null, 2));
          exports.push({
            sourceSectionKeys: [...sectionKeys],
            pdfSha256,
            pages: chunk.pages.length,
            witness: file,
          });
        }
        results.push({
          scope: "focused-diagnostic-only",
          rendererGitCommit,
          exports,
        });
        await writeFile(
          path.join(out, `focused-u01-${mode}-${variant}-export.json`),
          JSON.stringify(results.at(-1), null, 2),
        );
        continue;
      }
      if (preflight) {
        normalizeRowPages(witnessPages);
        await writeFile(
          path.join(variantOut, "partial-dom-witness.json"),
          JSON.stringify(
            {
              status: "diagnostic-only",
              failedChunks,
              fixtureSha256,
              pages: witnessPages,
            },
            null,
            2,
          ),
        );
        results.push({
          status: "diagnostic-only",
          variant,
          failedChunks,
          successfulChunks: chunks.length,
          pages: witnessPages.length,
        });
        continue;
      }
      const merged = await mergeTextbookPdfs(
        chunks,
        128 * 1024 * 1024,
        browser,
      );
      const pdf = path.join(out, `${outputPrefix}-u01-${mode}-${variant}.pdf`);
      await writeFile(pdf, merged.pdf);
      const pdfSha256 = createHash("sha256").update(merged.pdf).digest("hex");
      const model = createTextbookRenderModel(
        { ...exchange, pageMap: studentPageMap },
        variant,
      );
      const selectedModel = {
        ...model,
        sections: model.sections.filter(
          (s, i) => s.unitKey === "U01" && (!focused || selected.includes(i)),
        ),
      };
      const expectedRows = expectedRenderedRows(selectedModel);
      const allPages = chunks.flatMap((c) => c.pages);
      normalizeRowPages(witnessPages);
      const witness = {
        version: 2,
        pdfSha256,
        fixtureSha256,
        sourceComparisonRequired: mode === "semantic" && variant === "student",
        sourceGeometrySha256,
        variant,
        requiredFonts: ["NotoSansKR|Nanum"],
        requireEmbeddedFonts: true,
        pages: witnessPages.map((p, i) => ({ ...p, pdfPageIndex: i + 1 })),
        coverage: computedCoverage(
          witnessPages,
          allPages,
          expectedRows,
          mode === "semantic" && variant === "student",
        ),
        coverageEvidence: {
          expectedPages: allPages.length,
          observedPages: witnessPages.length,
          expectedPlacedBlocks: allPages.reduce(
            (n, p) => n + p.blocks.length,
            0,
          ),
          observedBlocks: witnessPages.reduce(
            (n, p) => n + p.accounting.actualBlocks,
            0,
          ),
          expectedRows,
          pdfSha256,
        },
        disabledActivities: [],
        publicExampleItemIds: sourceMap.publicExampleItemIds,
        projectedModel: selectedModel,
        expectedRows,
        limits: [
          ...(focused
            ? [
                "Focused diagnostic sections rendered at their native physical page indices; this does not prove whole-U01 pagination.",
              ]
            : []),
          "Coverage is computed from actual final DOM populations, matching placements and PDF hash; failed geometry stays failed.",
          "Original CSS DOM measurements do not replace the pinned 259-page PDF.",
          "AI image reading is not human approval or physical printing.",
        ],
      };
      await writeFile(
        path.join(out, `${outputPrefix}-u01-${mode}-${variant}-witness.json`),
        JSON.stringify(witness, null, 2),
      );
      if (variant === "student")
        await writeFile(
          path.join(out, `${outputPrefix}-u01-${mode}-student-chunks.json`),
          JSON.stringify(
            {
              fixtureSha256,
              pdfSha256,
              chunkSize,
              chunks: Array.from(studentChunks),
              pageMap: studentPageMap,
            },
            null,
            2,
          ),
        );
      const result = {
        scope: focused ? "focused-diagnostic-only" : "whole-U01",
        rendererGitCommit,
        productGitCommit,
        productionIdentityPaths,
        sourceVersion: "v15-original",
        sourceManuscriptSha256: sourceMap.manuscriptSha256,
        variant,
        mode,
        pageCount: merged.pageCount,
        pdfSha256,
        fixtureSha256,
        chunks: chunks.length,
        pdf,
        pageMapCount: chunks.flatMap((c) => c.pageMap).length,
        originalStudentVisualEquality: "pending",
        answerOriginalVisualEquality: "not asserted",
        compatibilityChunkScoping:
          mode === "base"
            ? "One original section per standalone export call; continuous source-page policy pending"
            : null,
      };
      results.push(result);
      await writeFile(
        path.join(out, `${outputPrefix}-u01-${mode}-${variant}-export.json`),
        JSON.stringify(result, null, 2),
      );
    }
  } finally {
    await browser.close().catch(async (error) => {
      browser.process()?.kill();
      await browser.disconnect();
      console.error(
        JSON.stringify({
          phase: "browser-cleanup",
          errorClass: error instanceof Error ? error.name : "unknown",
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    });
  }
  console.info(JSON.stringify(results));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
